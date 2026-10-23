import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";
import { computeBillDiff } from "@/lib/audit-diff";

/* ======================================================
   GET → View / Resume bill OR order
====================================================== */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Fetch from both tables concurrently since it's a primary key lookup. 
    // ID will only exist in one of the tables.
    const [billManagerRes, orderRes] = await Promise.all([
      prisma.billManager.findUnique({
        where: { id },
        include: { party: true }
      }),
      prisma.order.findUnique({
        where: { id },
        include: { table: true }
      })
    ]);

    let bill: any = null;

    if (billManagerRes && billManagerRes.clerkUserId === effectiveId && !billManagerRes.isDeleted) {
      bill = {
        ...billManagerRes,
        recordType: "BILL"
      };
    } else if (orderRes && orderRes.clerkUserId === effectiveId && !orderRes.isDeleted) {
      // Map Order to Bill-like structure
      bill = {
        ...orderRes,
        recordType: "ORDER",
        billNumber: `ORD-${orderRes.id.slice(-4).toUpperCase()}`,
        tableName: orderRes.table?.name || "Counter",
        items: (orderRes.items as any[]).map((it: any) => ({
          ...it,
          id: it.itemId || it.id,
          rate: it.rate ?? it.price ?? 0,
        })),
        auditNote: orderRes.notes || "",
        paymentMode: orderRes.paymentMode || "Cash",
        paymentStatus: orderRes.status === "COMPLETED" ? "Paid" : "Pending",
        // ✅ Preserve tokens
        kotNumbers: orderRes.kotNumbers || [],
        tokenNumber: orderRes.tokenNumber || null,
      };
    }

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const authUser = await getAuthUser();
    let canViewPhone = true;
    if (authUser && authUser.role !== 'ADMIN' && authUser.role !== 'SELLER' && authUser.role !== 'OWNER' && authUser.role !== 'USER') {
      canViewPhone = authUser.permissions?.includes("view-customer-phone") || false;
    }

    if (!canViewPhone && bill.customerPhone) {
      bill.customerPhone = "";
    }

    const business = await prisma.businessProfile.findFirst({
      where: { userId: effectiveId }
    });

    return NextResponse.json({ bill, business });
  } catch (err) {
    console.error("BILL MANAGER GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

/* ======================================================
   PUT → Update existing bill (RESUME / FINAL SAVE)
   SUPPORT: Now also supports converting an Order to a Bill
====================================================== */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const {
      items,
      subtotal,
      total,
      paymentMode,
      paymentStatus,
      upiTxnRef,
      customerName,
      customerPhone,
      customerAddress,
      tableName,
      discountCode,
      isKotPrinted,
      deliveryCharges,
      packagingCharges,
      serviceCharge,
      kotNumbers,
      tokenNumber,
      isTaxInclusive,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    /* ---------- PAYMENT MODE ---------- */
    const finalPaymentMode: "Cash" | "UPI" | "Card" | "Wallet" | "Pay on Counter" =
      ["Cash", "UPI", "Card", "Wallet", "Pay on Counter"].includes(paymentMode)
        ? paymentMode
        : "Cash";

    // ✅ FETCH PROFILE
    const profile = await prisma.businessProfile.findFirst({
      where: { userId: effectiveId },
    });
    
    const isTaxEnabled = profile?.taxEnabled ?? true;
    const globalGstRate = 0;
    const perProductEnabled = true;

    // ✅ FETCH DB ITEMS
    const itemIds = items
      .map((it: any) => it.id)
      .filter((id: any) => id && /^[0-9a-fA-F]{24}$/.test(id));
    const dbItems = await prisma.item.findMany({
      where: { 
        id: { in: itemIds },
        clerkId: effectiveId 
      }
    });

    let calcSubtotal = 0;
    let totalTax = 0;

    items.forEach((item: any) => {
      const dbItem = dbItems.find(it => it.id === item.id);
      const qty = Number(item.qty || item.quantity) || 0;
      const rate = item.isCustomRate 
        ? Number(item.rate) 
        : (dbItem ? Number(dbItem.sellingPrice ?? dbItem.price) : Number(item.rate || item.price || 0));
      const itemGstRate = (isTaxEnabled && perProductEnabled && item.gst !== undefined && item.gst !== null) ? Number(item.gst) : (isTaxEnabled ? globalGstRate : 0);
      const globalTaxInclusive = false;
      
      let isInclusive = false;
      if (isTaxEnabled && perProductEnabled && item.gst !== undefined && item.gst !== null) {
        isInclusive = (item.taxStatus || "Without Tax") === "With Tax";
      } else if (isTaxEnabled) {
        isInclusive = globalTaxInclusive;
      }

      const gross = qty * rate;

      if (isInclusive) {
        const base = gross / (1 + itemGstRate / 100);
        const gst = gross - base;
        calcSubtotal += base;
        totalTax += gst;
      } else {
        const gst = (gross * itemGstRate) / 100;
        calcSubtotal += gross;
        totalTax += gst;
      }
      item.rate = rate; 
    });

    const finalSubtotal = Number(calcSubtotal.toFixed(2));

    // DISCOUNT
    let serverDiscountAmt = 0;
    let validatedDiscountCode = null;
    if (discountCode) {
      const offer = await prisma.offer.findFirst({
        where: { code: discountCode.toUpperCase(), isActive: true, clerkUserId: effectiveId },
      });
      if (offer) {
        const { calculateDiscount } = require("@/lib/discount-utils");
        serverDiscountAmt = calculateDiscount(offer, finalSubtotal, items);
        validatedDiscountCode = offer.code;
      }
    } else if (body.discountAmount !== undefined && Number(body.discountAmount) > 0) {
      serverDiscountAmt = Number(body.discountAmount);
    }

    const discountRatio = finalSubtotal > 0 ? Math.max(0, 1 - (serverDiscountAmt / finalSubtotal)) : 1;
    const tax = Number((totalTax * discountRatio).toFixed(2));

    const finalDeliveryCharge = Number(deliveryCharges) || 0;
    const finalPackagingCharge = Number(packagingCharges) || 0;
    const finalServiceCharge = Number(serviceCharge) || 0;

    let serverDeliveryGst = (finalDeliveryCharge > 0 && profile?.deliveryGstEnabled) ? (finalDeliveryCharge * (profile.deliveryGstRate || 0)) / 100 : 0;
    let serverPackagingGst = (finalPackagingCharge > 0 && profile?.packagingGstEnabled) ? (finalPackagingCharge * (profile.packagingGstRate || 0)) / 100 : 0;

    const finalTotal = Number((finalSubtotal + tax - serverDiscountAmt + finalDeliveryCharge + serverDeliveryGst + finalPackagingCharge + serverPackagingGst + finalServiceCharge).toFixed(2));

    let finalPaymentStatus = (body.isHeld === true) ? "HELD" : (paymentStatus === "Paid" ? "Paid" : "Pending");

    // CUSTOMER
    let partyId = null;
    if (customerPhone && customerName && customerName !== "Walk-in Customer") {
      try {
        const cleanPhone = customerPhone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
        const party = await prisma.party.upsert({
          where: { phone_createdBy: { phone: cleanPhone, createdBy: effectiveId } },
          update: { name: customerName, address: customerAddress || null },
          create: { name: customerName, phone: cleanPhone, createdBy: effectiveId, address: customerAddress || null },
        });
        partyId = party.id;
      } catch (err) {}
    }

    /* ---------- PROCESS UPDATE OR CONVERT ORDER ---------- */
    let bill;
    let existingBill = await prisma.billManager.findUnique({ where: { id } });
    let isConversionRetry = false;
    let isOrderConversion = false;
    
    if (!existingBill) {
      existingBill = await prisma.billManager.findFirst({ where: { orderId: id } });
      if (existingBill) {
        isConversionRetry = true;
      }
    }
    const existingOrder = !existingBill ? await prisma.order.findUnique({ where: { id } }) : null;
    if (!existingBill && existingOrder) {
      isOrderConversion = true;
    }

    const finalToken = tokenNumber || (kotNumbers && Array.isArray(kotNumbers) && kotNumbers.length > 0 ? kotNumbers[kotNumbers.length - 1] : null) || existingBill?.tokenNumber || existingOrder?.tokenNumber || 1;
    const processedItems = items.map((it: any) => ({
      ...it,
      kotNumber: it.kotNumber || finalToken,
      addedAt: it.addedAt || new Date().toISOString()
    }));

    if (existingBill) {
      if (isConversionRetry) {
        console.log(`[IDEMPOTENCY] Returning existing converted bill for order ${id} without mutation.`);
        return NextResponse.json({ bill: existingBill });
      }
      // ✅ UPDATE BILL (OCC Transaction for Loyalty)
      const wasPaid = existingBill.paymentStatus === "Paid" || existingBill.paymentStatus === "PAID";
      const isNowPaid = finalPaymentStatus === "Paid" || finalPaymentStatus === "PAID";
      const isNotHeld = body.isHeld !== true;
      
      try {
          bill = await prisma.$transaction(async (tx) => {
              const whereCondition: any = { id: existingBill.id };
              if (!existingBill.isHeld) {
                  whereCondition.paymentStatus = existingBill.paymentStatus;
              }
              const finalAmountPaid = body.amountPaid !== undefined ? Number(body.amountPaid) : (finalPaymentStatus === "Paid" ? finalTotal : 0);
              const finalBalanceDue = Math.max(0, finalTotal - finalAmountPaid);
              const claim = await tx.billManager.updateMany({
                  where: whereCondition,
                  data: {
                      currencySymbol: profile?.currencySymbol || body.currencySymbol || "₹",
                      items: processedItems, subtotal: finalSubtotal, tax, total: finalTotal,
                      paymentMode: finalPaymentMode, paymentStatus: finalPaymentStatus,
                      amountPaid: finalAmountPaid, balanceDue: finalBalanceDue,
                      buyerGSTIN: body.buyerGSTIN || null,
                      placeOfSupply: body.placeOfSupply || null,
                      isHeld: body.isHeld === true, upiTxnRef: upiTxnRef || null,
                      customerName, customerPhone, customerAddress, partyId,
                      tableName, discountAmount: serverDiscountAmt, discountCode: validatedDiscountCode,
                      deliveryCharges: finalDeliveryCharge, deliveryGst: serverDeliveryGst,
                      packagingCharges: finalPackagingCharge, packagingGst: serverPackagingGst,
                      serviceCharge: finalServiceCharge,
                      isKotPrinted: isKotPrinted === true,
                      auditNote: body.auditNote || null,
                      kotNumbers: kotNumbers || existingBill.kotNumbers,
                      tokenNumber: tokenNumber || existingBill.tokenNumber,
                      isTaxInclusive: typeof isTaxInclusive === 'boolean' ? isTaxInclusive : null,
                  }
              });
              
              if (claim.count === 0) {
                  throw new Error("P2034");
              }
              
              const updatedBill = await tx.billManager.findUnique({ where: { id: existingBill.id } });
              
              if (!wasPaid && isNowPaid && isNotHeld && updatedBill?.partyId) {
                  const pointRatio = profile?.loyaltyPointRatio && profile.loyaltyPointRatio > 0 ? profile.loyaltyPointRatio : 0;
                  const minOrder = profile?.loyaltyMinOrderAmount || 0;
                  if (updatedBill.subtotal >= minOrder) {
                      const calculatedPoints = pointRatio > 0 ? Math.floor(updatedBill.subtotal / pointRatio) : 0;
                      const earnedPoints = (profile?.maxEarnPointsPerBill && profile.maxEarnPointsPerBill > 0) ? Math.min(calculatedPoints, profile.maxEarnPointsPerBill) : calculatedPoints;
                      if (earnedPoints > 0) {
                          await tx.party.update({
                              where: { id: updatedBill.partyId },
                              data: { loyaltyPoints: { increment: earnedPoints } }
                          });
                      }
                  }
              }

              // ✅ AUDIT TRAIL: Record BillEditLog for actual changes
              if (updatedBill) {
                  const changes = computeBillDiff(existingBill, {
                      items: processedItems, subtotal: finalSubtotal, tax, total: finalTotal,
                      paymentMode: finalPaymentMode, paymentStatus: finalPaymentStatus,
                      amountPaid: finalAmountPaid, balanceDue: finalBalanceDue,
                      customerName, customerPhone, customerAddress,
                      discountAmount: serverDiscountAmt, discountCode: validatedDiscountCode,
                      deliveryCharges: finalDeliveryCharge, packagingCharges: finalPackagingCharge,
                      serviceCharge: finalServiceCharge, isHeld: body.isHeld === true
                  });

                  if (changes.length > 0) {
                      const authUser = await getAuthUser();
                      const eventType = (wasPaid !== isNowPaid || existingBill.amountPaid !== finalAmountPaid)
                          ? "PAYMENT_UPDATE"
                          : (body.isHeld !== undefined && body.isHeld !== existingBill.isHeld)
                          ? "HOLD_STATUS"
                          : "BILL_EDIT";

                      await tx.billEditLog.create({
                          data: {
                              clerkUserId: effectiveId,
                              billId: updatedBill.id,
                              invoiceNo: updatedBill.billNumber,
                              actorId: authUser?.id || effectiveId,
                              actorName: authUser?.name || "Staff / Cashier",
                              actorRole: authUser?.role || authUser?.type || "STAFF",
                              eventType,
                              reason: body.auditNote || null,
                              changes: changes as any,
                          }
                      });
                  }
              }
              
              return updatedBill!;
          });
      } catch (err: any) {
          if (err.message?.includes("P2034")) {
              return NextResponse.json({ error: "Concurrent update detected. Please try again." }, { status: 409 });
          }
          throw err;
      }
    } else {
      // ✅ CONVERT ORDER TO BILL
      if (!existingOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // Generate Bill Number and Create Atomically
      const nowLocal = new Date();
      const yy = String(nowLocal.getFullYear()).slice(-2);
      const mm = String(nowLocal.getMonth() + 1).padStart(2, '0');
      const idempotencyKey = `order-conversion-${id}`;

      let attempts = 0;
      while (true) {
        try {
          const profile = body.profileId
            ? await prisma.businessProfile.findUnique({ where: { id: body.profileId } })
            : await prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'desc' } });

          bill = await prisma.$transaction(async (tx) => {
            let nextSerial = 1;
            if (profile?.id) {
              const updatedProfile = await tx.businessProfile.update({
                where: { id: profile.id },
                data: { billCounter: { increment: 1 } },
                select: { billCounter: true }
              });
              nextSerial = updatedProfile.billCounter;
            } else {
              nextSerial = Math.floor(Math.random() * 1000000);
            }

            const billNumber = `INV/${yy}${mm}/${String(nextSerial).padStart(4, '0')}`;

            // ✅ EXACTLY-ONCE EARNING ON CONVERSION
            const isNowPaid = finalPaymentStatus === "Paid" || finalPaymentStatus === "PAID";
            let earnedPoints = 0;
            if (isNowPaid && body.isHeld !== true && partyId) {
                const pointRatio = profile?.loyaltyPointRatio && profile.loyaltyPointRatio > 0 ? profile.loyaltyPointRatio : 0;
                const minOrder = profile?.loyaltyMinOrderAmount || 0;
                if (finalSubtotal >= minOrder) {
                    const calculatedPoints = pointRatio > 0 ? Math.floor(finalSubtotal / pointRatio) : 0;
                    earnedPoints = (profile?.maxEarnPointsPerBill && profile.maxEarnPointsPerBill > 0) ? Math.min(calculatedPoints, profile.maxEarnPointsPerBill) : calculatedPoints;
                    if (earnedPoints > 0) {
                        await tx.party.update({
                            where: { id: partyId },
                            data: { loyaltyPoints: { increment: earnedPoints } }
                        });
                    }
                }
            }

            const createdBill = await tx.billManager.create({
              data: {
                idempotencyKey,
                orderId: id,
                currencySymbol: profile?.currencySymbol || body.currencySymbol || "₹",
                clerkUserId: effectiveId, billNumber, items: processedItems, subtotal: finalSubtotal, tax, total: finalTotal,
                paymentMode: finalPaymentMode, paymentStatus: finalPaymentStatus,
                isHeld: body.isHeld === true, upiTxnRef: upiTxnRef || null,
                customerName: customerName || existingOrder.customerName,
                customerPhone: customerPhone || existingOrder.customerPhone,
                customerAddress: customerAddress || existingOrder.customerAddress,
                partyId, tableName: tableName || "POS",
                discountAmount: serverDiscountAmt, discountCode: validatedDiscountCode,
                deliveryCharges: finalDeliveryCharge, deliveryGst: serverDeliveryGst,
                packagingCharges: finalPackagingCharge, packagingGst: serverPackagingGst,
                serviceCharge: finalServiceCharge,
                isKotPrinted: isKotPrinted === true,
                auditNote: body.auditNote || "Finalized from Online Order",
                kotNumbers: kotNumbers || existingOrder.kotNumbers,
                tokenNumber: tokenNumber || existingOrder.tokenNumber,
                isTaxInclusive: typeof isTaxInclusive === 'boolean' ? isTaxInclusive : null,
                isTaxEnabled: profile?.taxEnabled ?? false,
                loyaltyEarned: earnedPoints,
              },
            });

            await tx.order.update({
              where: { id },
              data: { status: "COMPLETED", isBillPrinted: true }
            });
            

            return createdBill;
          });
          break; // Success! Break out of the retry loop
        } catch (err: any) {
          if (isOrderConversion && (err.code === 'P2002' || err.code === 'P2034')) {
            // Check if this was a SAME-ORDER idempotency race
            const raceBill = await prisma.billManager.findUnique({ where: { idempotencyKey } });
            if (raceBill) {
              console.log(`[IDEMPOTENCY] Race caught in PUT order-to-bill, returning existing bill for order ${id}`);
              return NextResponse.json({ bill: raceBill });
            }
            
            // If not same-order, it's a DIFFERENT-ORDER write conflict on the atomic counter
            if (err.code === 'P2034' && attempts < 25) {
              attempts++;
              console.log(`[CONCURRENCY] Write conflict (P2034) on atomic counter for order ${id}. Retrying attempt ${attempts}...`);
              // Use random jitter between 100ms and 400ms to perfectly break the convoy effect
              const jitter = 100 + Math.random() * 300;
              await new Promise(res => setTimeout(res, attempts * 50 + jitter));
              continue;
            }
          }
          throw err;
        }
      }
    }

    const { getInventorySettings } = await import("@/lib/inventory-utils");
    const invSettings = getInventorySettings(profile);

    let didDeductPutInventory = false;
    if (bill && !bill.isHeld && body.skipInventoryDeduction !== true && invSettings.enabled !== false) {
      try {
        const { withTransactionRetry, executeInventoryDeduction, calculateIncrementalItems } = await import("@/lib/inventory-utils");
        await withTransactionRetry(async (tx) => {
          let itemsToDeduct = (bill.items as any[]) || [];
          if (isOrderConversion && existingOrder) {
            const claim = await tx.billManager.updateMany({
              where: { id: bill.id, inventoryDeducted: false },
              data: { inventoryDeducted: true }
            });
            if (claim.count > 0) {
              if (existingOrder.inventoryDeducted) {
                itemsToDeduct = calculateIncrementalItems(itemsToDeduct, existingOrder.items as any[]);
              }
              if (itemsToDeduct.length > 0) {
                await executeInventoryDeduction(tx, itemsToDeduct, invSettings);
                didDeductPutInventory = true;
              }
            }
          } else if (existingBill) {
            if (!existingBill.inventoryDeducted) {
              const claim = await tx.billManager.updateMany({
                where: { id: bill.id, inventoryDeducted: false },
                data: { inventoryDeducted: true }
              });
              if (claim.count > 0) {
                if (bill.orderId) {
                  const linkedOrder = await tx.order.findUnique({ where: { id: bill.orderId } });
                  if (linkedOrder?.inventoryDeducted) {
                    itemsToDeduct = calculateIncrementalItems(itemsToDeduct, linkedOrder.items as any[]);
                  }
                }
                if (itemsToDeduct.length > 0) {
                  await executeInventoryDeduction(tx, itemsToDeduct, invSettings);
                  didDeductPutInventory = true;
                }
              }
            } else {
              // Existing bill was already deducted, but items might have been modified/added during PUT
              const incrementalItems = calculateIncrementalItems(itemsToDeduct, existingBill.items as any[]);
              if (incrementalItems.length > 0) {
                await executeInventoryDeduction(tx, incrementalItems, invSettings);
                didDeductPutInventory = true;
              }
            }
          }
        });
      } catch (invErr) {
        console.error(`[INVENTORY_PUT_DEDUCTION_ERROR] billId=${bill?.id}:`, invErr);
      }

      // Post-commit authoritative realtime broadcast for Inventory & connected screens
      if (didDeductPutInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: isOrderConversion ? "ORDER_CONVERTED_TO_BILL" : "BILL_UPDATED",
            billId: bill?.id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[BILL_PUT_SOCKET_ERROR]:", ioErr);
        }
      }
    }

    return NextResponse.json({ bill });
  } catch (err) {
    console.error("BILL MANAGER UPDATE ERROR:", err);
    return NextResponse.json({ error: "Failed to update bill" }, { status: 500 });
  }
}

/* ======================================================
   DELETE → Soft delete bill OR order
====================================================== */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    const deleteReason = req.headers.get("x-delete-reason") || "Deleted manually";
    const bill = await prisma.billManager.findFirst({ where: { id, clerkUserId: effectiveId } });
    if (bill) {
      if (bill.isDeleted) {
        return NextResponse.json({ success: true, type: "bill", alreadyDeleted: true });
      }
      let didRestoreInventory = false;
      await prisma.$transaction(async (tx) => {
        // Atomic claim: only one concurrent/repeated call can transition isDeleted from false to true
        const claim = await tx.billManager.updateMany({
          where: { id, clerkUserId: effectiveId, isDeleted: false },
          data: {
            isDeleted: true,
            isHeld: false,
            paymentStatus: "DELETED",
            inventoryDeducted: false,
            auditNote: `Reason: ${deleteReason}`,
            deletedSnapshot: bill as any,
            loyaltyEarned: 0,
            loyaltyRedeemed: 0,
          }
        });

        if (claim.count === 0) {
          // Lost race to another concurrent delete
          return;
        }

        // Loyalty Reversal if the bill is deleted
        if (bill.partyId) {
          const earnedToReverse = bill.loyaltyEarned || 0;
          const redeemedToReverse = bill.loyaltyRedeemed || 0;
          const netReversal = redeemedToReverse - earnedToReverse;
          if (netReversal !== 0) {
            await tx.party.update({
              where: { id: bill.partyId },
              data: { loyaltyPoints: { increment: netReversal } }
            });
          }
        }

        // Inventory Restoration on Bill deletion (only if inventory was actually deducted)
        let shouldRestoreBillStock = bill.inventoryDeducted && Array.isArray(bill.items) && bill.items.length > 0;

        // Cross-entity protection: If linked to an order, verify order didn't already restore stock
        if (bill.orderId) {
          const linkedOrder = await tx.order.findUnique({ where: { id: bill.orderId } });
          if (linkedOrder && linkedOrder.isDeleted && !linkedOrder.inventoryDeducted) {
            // Linked order was already deleted and previously restored stock; skip duplicate restoration
            shouldRestoreBillStock = false;
          }

          // Neutralize linked order so it cannot be restored subsequently
          await tx.order.updateMany({
            where: { id: bill.orderId },
            data: {
              isDeleted: true,
              status: "DELETED",
              inventoryDeducted: false,
            }
          });
        }

        if (shouldRestoreBillStock) {
          const { executeInventoryRestoration } = await import("@/lib/inventory-utils");
          await executeInventoryRestoration(tx, bill.items as any[]);
          didRestoreInventory = true;
        }
      });

      // Post-commit authoritative realtime broadcast for Inventory Hub & connected clients
      if (didRestoreInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: "BILL_DELETED",
            billId: id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[BILL_DELETE_SOCKET_ERROR]:", ioErr);
        }
      }

      return NextResponse.json({ success: true, type: "bill" });
    }

    const order = await prisma.order.findFirst({ 
      where: { id, clerkUserId: effectiveId },
      include: { table: true }
    });
    if (order) {
      if (order.isDeleted) {
        return NextResponse.json({ success: true, type: "order", alreadyDeleted: true });
      }
      let didRestoreOrderInventory = false;
      await prisma.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({
          where: { id, clerkUserId: effectiveId, isDeleted: false },
          data: {
            isDeleted: true,
            status: "DELETED",
            inventoryDeducted: false,
            notes: `Reason: ${deleteReason}`,
            deletedSnapshot: order as any
          }
        });

        if (claim.count === 0) {
          return;
        }

        // Cross-entity protection: check if any linked BillManager exists
        const linkedBills = await tx.billManager.findMany({
          where: { orderId: order.id, clerkUserId: effectiveId }
        });

        const anyLinkedBillAlreadyRestored = linkedBills.some(b => b.isDeleted && !b.inventoryDeducted);

        // Inventory Restoration on Order deletion (only if inventory was actually deducted and not already restored by bill)
        let shouldRestoreOrderStock = order.inventoryDeducted && Array.isArray(order.items) && order.items.length > 0;
        if (anyLinkedBillAlreadyRestored) {
          // A linked bill was already deleted and handled restoration; skip duplicate restoration
          shouldRestoreOrderStock = false;
        }

        if (shouldRestoreOrderStock) {
          const { executeInventoryRestoration } = await import("@/lib/inventory-utils");
          await executeInventoryRestoration(tx, order.items as any[]);
          didRestoreOrderInventory = true;
        }

        // Neutralize all linked bills so they cannot restore the same stock in the future
        if (linkedBills.length > 0) {
          await tx.billManager.updateMany({
            where: { orderId: order.id, clerkUserId: effectiveId },
            data: {
              isDeleted: true,
              paymentStatus: "DELETED",
              inventoryDeducted: false,
              auditNote: `Neutralized via Order deletion: ${deleteReason}`
            }
          });
        }

        if (order.tableId) {
          try {
            await tx.table.update({
              where: { id: order.tableId },
              data: { isOccupied: false, currentOrderId: null } as any
            });
          } catch (tErr) {
            console.error("Failed to free table on order delete:", tErr);
          }
        }
      });

      // Post-commit authoritative realtime broadcast for Inventory Hub & connected clients
      if (didRestoreOrderInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: "ORDER_DELETED",
            orderId: id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[ORDER_DELETE_SOCKET_ERROR]:", ioErr);
        }
      }

      return NextResponse.json({ success: true, type: "order" });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

/* ======================================================
   PATCH → Partial update (Change Status / Details)
====================================================== */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const body = await req.json();

    const allowedUpdates = ["paymentStatus", "paymentMode", "upiTxnRef", "isHeld", "customerName", "customerPhone", "customerAddress", "auditNote"];
    const data: any = {};
    allowedUpdates.forEach(key => {
      if (body[key] !== undefined) data[key] = body[key];
    });

    if (data.isHeld === false && !data.paymentStatus) {
      data.paymentStatus = "Paid";
    }

    // Party upsertion logic if customer name/phone/address are updated
    if (data.customerName !== undefined || data.customerPhone !== undefined || data.customerAddress !== undefined) {
      // Find current customer details in database to merge
      let existingName = data.customerName;
      let existingPhone = data.customerPhone;
      let existingAddress = data.customerAddress;

      if (existingName === undefined || existingPhone === undefined || existingAddress === undefined) {
        const existingBill = await prisma.billManager.findUnique({ where: { id } });
        if (existingBill) {
          if (existingName === undefined) existingName = existingBill.customerName || "";
          if (existingPhone === undefined) existingPhone = existingBill.customerPhone || "";
          if (existingAddress === undefined) existingAddress = existingBill.customerAddress || "";
        } else {
          const existingOrder = await prisma.order.findUnique({ where: { id } });
          if (existingOrder) {
            if (existingName === undefined) existingName = existingOrder.customerName || "";
            if (existingPhone === undefined) existingPhone = existingOrder.customerPhone || "";
            if (existingAddress === undefined) existingAddress = existingOrder.customerAddress || "";
          }
        }
      }

      if (existingPhone && existingName && existingName !== "Walk-in Customer") {
        try {
          const cleanPhone = existingPhone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
          const party = await prisma.party.upsert({
            where: { phone_createdBy: { phone: cleanPhone, createdBy: effectiveId } },
            update: { name: existingName, address: existingAddress || null },
            create: { name: existingName, phone: cleanPhone, createdBy: effectiveId, address: existingAddress || null },
          });
          data.partyId = party.id;
        } catch (err) {
          console.error("Party upsert error in PATCH:", err);
        }
      }
    }

    // 1. Try finding and updating in BillManager
    const existingBill = await prisma.billManager.findUnique({ where: { id } });
    if (existingBill) {
      const isNowPaid = data.paymentStatus === "Paid" || data.paymentStatus === "PAID";
      const isNotHeld = data.isHeld === false || (!("isHeld" in data) && !existingBill.isHeld);
      const wasPaid = existingBill.paymentStatus === "Paid" || existingBill.paymentStatus === "PAID";

      let bill;
      let didRestoreInventory = false;
      try {
          bill = await prisma.$transaction(async (tx) => {
              // 1. ATOMIC OCC (Optimistic Concurrency Control) UPDATE
              // We only update if the paymentStatus hasn't changed since we read it.
              const claim = await tx.billManager.updateMany({
                  where: { id, paymentStatus: existingBill.paymentStatus },
                  data
              });
              
              if (claim.count === 0) {
                  throw new Error("P2034: Concurrency collision during bill update.");
              }
              
              const updatedBill = await tx.billManager.findUnique({ where: { id } });
              
              // 2. EXACTLY-ONCE LOYALTY EARNING OR REVERSAL
              if (!wasPaid && isNowPaid && isNotHeld && updatedBill?.partyId) {
                  // EARNING: The bill just became PAID
                  const profile = await tx.businessProfile.findFirst({ where: { userId: effectiveId } });
                  const pointRatio = profile?.loyaltyPointRatio && profile.loyaltyPointRatio > 0 ? profile.loyaltyPointRatio : 0;
                  const minOrder = profile?.loyaltyMinOrderAmount || 0;
                  if (updatedBill.subtotal >= minOrder) {
                      const calculatedPoints = pointRatio > 0 ? Math.floor(updatedBill.subtotal / pointRatio) : 0;
                      const earnedPoints = (profile?.maxEarnPointsPerBill && profile.maxEarnPointsPerBill > 0) ? Math.min(calculatedPoints, profile.maxEarnPointsPerBill) : calculatedPoints;
                      
                      if (earnedPoints > 0) {
                          await tx.party.update({
                              where: { id: updatedBill.partyId },
                              data: { loyaltyPoints: { increment: earnedPoints } }
                          });
                          // Record that this bill earned points!
                          await tx.billManager.update({
                              where: { id },
                              data: { loyaltyEarned: earnedPoints }
                          });
                      }
                  }
              } else if (wasPaid && !isNowPaid && updatedBill?.partyId) {
                  // REVERSAL: The bill was Paid, but now it is Pending, Refunded, etc.
                  const earnedToReverse = existingBill.loyaltyEarned || 0;
                  const redeemedToReverse = existingBill.loyaltyRedeemed || 0;
                  const netReversal = redeemedToReverse - earnedToReverse; // Add back redeemed, subtract earned
                  if (netReversal !== 0) {
                      await tx.party.update({
                          where: { id: updatedBill.partyId },
                          data: { loyaltyPoints: { increment: netReversal } }
                      });
                      // Reset the points on the bill so they don't get reversed twice
                      await tx.billManager.update({
                          where: { id },
                          data: { loyaltyEarned: 0, loyaltyRedeemed: 0 }
                      });
                  }
              }

              // 2b. EXACTLY-ONCE INVENTORY RESTORATION ON CANCELLATION / REFUND
              if ((data.paymentStatus === "CANCELLED" || data.paymentStatus === "REFUNDED" || data.paymentStatus === "DELETED") && existingBill.inventoryDeducted) {
                  const invClaim = await tx.billManager.updateMany({
                      where: { id, inventoryDeducted: true },
                      data: { inventoryDeducted: false }
                  });
                  if (invClaim.count > 0 && Array.isArray(existingBill.items) && existingBill.items.length > 0) {
                      const { executeInventoryRestoration } = await import("@/lib/inventory-utils");
                      await executeInventoryRestoration(tx, existingBill.items);
                      didRestoreInventory = true;
                  }
              }

              // ✅ AUDIT TRAIL: Record BillEditLog for PATCH changes
              if (updatedBill) {
                  const changes = computeBillDiff(existingBill, data);
                  if (changes.length > 0) {
                      const authUser = await getAuthUser();
                      let eventType = "BILL_EDIT";
                      if (data.paymentStatus !== undefined || data.paymentMode !== undefined) {
                          eventType = "STATUS_CHANGE";
                      } else if (data.customerName !== undefined || data.customerPhone !== undefined || data.customerAddress !== undefined) {
                          eventType = "CUSTOMER_UPDATE";
                      } else if (data.isHeld !== undefined) {
                          eventType = "HOLD_STATUS";
                      }

                      await tx.billEditLog.create({
                          data: {
                              clerkUserId: effectiveId,
                              billId: updatedBill.id,
                              invoiceNo: updatedBill.billNumber,
                              actorId: authUser?.id || effectiveId,
                              actorName: authUser?.name || "Staff / Cashier",
                              actorRole: authUser?.role || authUser?.type || "STAFF",
                              eventType,
                              reason: data.auditNote || null,
                              changes: changes as any,
                          }
                      });
                  }
              }
              
              return updatedBill!;
          });
      } catch (err: any) {
          if (err.message?.includes("P2034")) {
              return NextResponse.json({ error: "Concurrent update detected. Please try again." }, { status: 409 });
          }
          throw err;
      }

      // Post-commit authoritative realtime broadcast on successful cancellation/refund
      if (didRestoreInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: data.paymentStatus === "CANCELLED" ? "BILL_CANCELLED" : "BILL_REFUNDED",
            billId: id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[BILL_PATCH_SOCKET_ERROR]:", ioErr);
        }
      }

      // ✅ AUTO-DEDUCT INVENTORY WHEN SETTLING A HELD BILL (ATOMIC)
      const currentProfile = await prisma.businessProfile.findFirst({
        where: { userId: effectiveId },
        orderBy: { createdAt: 'desc' }
      });
      const { getInventorySettings } = await import("@/lib/inventory-utils");
      const invSettings = getInventorySettings(currentProfile);

      let didDeductHeldInventory = false;
      if (existingBill.isHeld && data.isHeld === false && !existingBill.inventoryDeducted && invSettings.enabled !== false) {
        console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} settled from HELD state. Awaiting background inventory deduction.`);
        
        const { withTransactionRetry, executeInventoryDeduction } = await import("@/lib/inventory-utils");
        const tInvStart = Date.now();
        
        try {
            await withTransactionRetry(async (tx) => {
                const claim = await tx.billManager.updateMany({
                    where: { id: bill.id, inventoryDeducted: false },
                    data: { inventoryDeducted: true }
                });
                
                if (claim.count > 0) {
                    console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} won claim. Checking Order for cross-entity semantics.`);
                    let itemsToDeduct = bill.items as any[];
                    
                    if (bill.orderId) {
                        const orderLock = await tx.order.findUnique({ where: { id: bill.orderId } });
                        if (orderLock?.inventoryDeducted) {
                            const orderItems = (orderLock.items as any[]) || [];
                            const orderItemQuantities = new Map<string, number>();
                            for (const oi of orderItems) {
                                const id = oi.itemId || oi.id;
                                if (id) orderItemQuantities.set(id, (orderItemQuantities.get(id) || 0) + Number(oi.qty || oi.quantity || 1));
                            }
                            
                            const newItemsToDeduct = [];
                            for (const bi of itemsToDeduct) {
                                const id = bi.itemId || bi.id;
                                if (!id) continue;
                                const billQty = Number(bi.qty || bi.quantity || 1);
                                const orderQty = orderItemQuantities.get(id) || 0;
                                if (billQty > orderQty) {
                                    const diff = billQty - orderQty;
                                    newItemsToDeduct.push({ ...bi, qty: diff, quantity: diff });
                                    orderItemQuantities.set(id, orderQty + diff);
                                }
                            }
                            itemsToDeduct = newItemsToDeduct;
                        }
                    }
                    
                    if (itemsToDeduct.length > 0) {
                        await executeInventoryDeduction(tx, itemsToDeduct, invSettings);
                        didDeductHeldInventory = true;
                        console.log(`[INVENTORY_PERF] source=bill_manager_put billId=${bill.id} durationMs=${Date.now() - tInvStart} status=success`);
                    }
                }
            });
        } catch (err) {
            console.error(`[INVENTORY_PERF] source=bill_manager_put billId=${bill.id} durationMs=${Date.now() - tInvStart} status=failed error=`, err);
            // We DO NOT throw the error here to preserve the business contract. The bill was successfully updated.
            // The `inventoryDeducted` flag safely rolls back to `false` automatically via transaction abort.
        }
      }

      // Post-commit authoritative realtime broadcast if held bill settlement deducted inventory
      if (didDeductHeldInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: "HELD_BILL_SETTLED",
            billId: bill.id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[HELD_BILL_SETTLE_SOCKET_ERROR]:", ioErr);
        }
      }

      return NextResponse.json({ bill });
    }

    // 2. Try finding and updating in Order
    const existingOrder = await prisma.order.findUnique({ where: { id }, include: { table: true } });
    if (existingOrder) {
      if (existingOrder.clerkUserId !== effectiveId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      let didRestoreOrderInventory = false;
      const orderData: any = {};
      if (data.customerName !== undefined) orderData.customerName = data.customerName;
      if (data.customerPhone !== undefined) orderData.customerPhone = data.customerPhone;
      if (data.paymentMode !== undefined) orderData.paymentMode = data.paymentMode;
      if (data.auditNote !== undefined) orderData.notes = data.auditNote;

      const isCancelOrRefund = data.paymentStatus === "CANCELLED" || data.paymentStatus === "REFUNDED" || data.paymentStatus === "DELETED";
      if (data.paymentStatus === "Paid") {
        orderData.status = "COMPLETED";
      } else if (isCancelOrRefund) {
        orderData.status = "CANCELLED";
      }

      let updatedOrder: any = null;

      try {
        await prisma.$transaction(async (tx) => {
          if (isCancelOrRefund && existingOrder.inventoryDeducted) {
            // ATOMIC CLAIM: Only one concurrent or repeated call can claim inventory restoration
            const claim = await tx.order.updateMany({
              where: {
                id,
                clerkUserId: effectiveId,
                inventoryDeducted: true,
              },
              data: {
                ...orderData,
                inventoryDeducted: false,
              }
            });

            if (claim.count > 0) {
              // Successfully claimed inventory restoration responsibility
              if (Array.isArray(existingOrder.items) && existingOrder.items.length > 0) {
                const { executeInventoryRestoration } = await import("@/lib/inventory-utils");
                await executeInventoryRestoration(tx, existingOrder.items as any[]);
              }
              didRestoreOrderInventory = true;
            } else {
              // Lost claim (already claimed concurrently or already cancelled/restored)
              // Update remaining fields if needed without double restoration
              await tx.order.updateMany({
                where: { id, clerkUserId: effectiveId },
                data: orderData
              });
            }
          } else {
            // Standard update (payment status change, customer details, or order with inventoryDeducted: false)
            await tx.order.updateMany({
              where: { id, clerkUserId: effectiveId },
              data: orderData
            });
          }

          updatedOrder = await tx.order.findUnique({
            where: { id },
            include: { table: true }
          });
        });
      } catch (err: any) {
        console.error("[ORDER_PATCH_TX_ERROR]:", err);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
      }

      if (!updatedOrder) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }

      // Post-commit authoritative realtime broadcast on successful order cancellation/refund
      if (didRestoreOrderInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: data.paymentStatus === "CANCELLED" ? "ORDER_CANCELLED" : (data.paymentStatus === "REFUNDED" ? "ORDER_REFUNDED" : "ORDER_DELETED"),
            orderId: updatedOrder.id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[ORDER_PATCH_SOCKET_ERROR]:", ioErr);
        }
      }

      // Map Order back to Bill-like structure
      const mappedOrder = {
        ...updatedOrder,
        billNumber: `ORD-${updatedOrder.id.slice(-4).toUpperCase()}`,
        tableName: updatedOrder.table?.name || existingOrder.table?.name || "Counter",
        items: (updatedOrder.items as any[]).map(it => ({
          ...it,
          id: it.itemId || it.id,
          rate: it.rate ?? it.price ?? 0,
        })),
        auditNote: updatedOrder.notes || "",
        paymentMode: updatedOrder.paymentMode || "Cash",
        paymentStatus: updatedOrder.status === "COMPLETED" ? "Paid" : "Pending",
        kotNumbers: updatedOrder.kotNumbers || [],
        tokenNumber: updatedOrder.tokenNumber || null,
      };

      return NextResponse.json({ bill: mappedOrder });
    }

    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  } catch (err) {
    console.error("PATCH ERROR:", err);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

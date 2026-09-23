import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { calculateDiscount } from "@/lib/discount-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → List bills
 */
export async function GET(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isHeld = searchParams.get("isHeld");

    // Implement Option B: Cap the limit at 100 to prevent unbounded queries
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    const take = Math.min(Number(limitParam) || 100, 100);
    const page = Math.max(Number(pageParam) || 1, 1);
    const skip = (page - 1) * take;

    const whereClause: any = {
      clerkUserId: effectiveId,
      isDeleted: false,
    };

    if (isHeld === "true") {
      whereClause.isHeld = true;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        start.setMinutes(start.getMinutes() - 330); // IST 00:00:00
        whereClause.createdAt.gte = start;
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
        end.setMinutes(end.getMinutes() - 330); // IST 23:59:59
        whereClause.createdAt.lte = end;
      }
    }

    const bills = await prisma.billManager.findMany({
      where: whereClause,
      include: {
        party: true
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json({ bills, clerkUserId: effectiveId, pagination: { take, skip, page } });
  } catch (err) {
    console.error("BILL MANAGER LIST ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

/* POST → Create bill */

export async function POST(req: NextRequest) {
  try {
    const _tTotalStart = Date.now();
    let _tAuth=0, _tBody=0, _tIdemp=0, _tPreTx=0, _tTxWait=0, _tProfileReadUpdate=0, _tBillInsert=0, _tCommitStart=0, _tCommit=0, _tResponseStart=0;
    const _t0 = Date.now();
    const effectiveId = await getEffectiveClerkId();
    _tAuth = Date.now() - _t0;


    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const _t1 = Date.now();
    const body = await req.json();
    _tBody = Date.now() - _t1;

    const {
      items,
      subtotal,
      total,
      paymentMode,
      paymentStatus,
      isHeld,
      upiTxnRef,
      customerName,
      customerPhone,
      customerAddress,
      tableName,
      zoneName,
      discountCode,
      discountAmount,
      isKotPrinted,
      deliveryCharges,
      serviceCharge,
      kotNumbers,
      skipInventoryDeduction,
      amountPaid,
      packagingCharges,
      loyaltyPointsRedeemed,
      idempotencyKey,
    } = body;

    // 🚀 0. IDEMPOTENCY FAST-PATH CHECK
    const _t2 = Date.now();
    if (idempotencyKey) {
      const existingBill = await prisma.billManager.findUnique({
        where: { idempotencyKey },
        include: { party: true }
      });
      if (existingBill) {
         console.log(`[IDEMPOTENCY] Fast-path returned existing bill for key ${idempotencyKey}`);
         return NextResponse.json({ bill: existingBill, orderForDeduction: null });
      }
    }
    _tIdemp = Date.now() - _t2;
    const _t3 = Date.now();

    // 🛑 1. ROBUST VALIDATION (Critical Fix for UI Crashes)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "आइटम्स (Cart) खाली हैं। कृपया कम से कम एक आइटम जोड़ें।" }, { status: 400 });
    }

    if (total == null || isNaN(Number(total))) {
      return NextResponse.json({ error: "कुल राशि (Total) सही नहीं है।" }, { status: 400 });
    }

    // ✅ CONSTANTS & DATE PREP
    const nowLocal = new Date();
    const yy = String(nowLocal.getFullYear()).slice(-2);
    const mm = String(nowLocal.getMonth() + 1).padStart(2, '0');
    const monthStart = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1);

    // ✅ OPTIMIZED PARALLEL DATA FETCHING
    const itemIds = items
      .map((it: any) => it.id)
      .filter((id: any) => id && /^[0-9a-fA-F]{24}$/.test(id));

    const tFetchStart = Date.now();
    const [profile, dbItems, offer] = await Promise.all([
      body.profileId
        ? prisma.businessProfile.findUnique({ where: { id: body.profileId } })
        : prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'asc' } }),
      prisma.item.findMany({ where: { id: { in: itemIds }, clerkId: effectiveId } }),
      discountCode ? prisma.offer.findFirst({ where: { code: discountCode.toUpperCase(), isActive: true, clerkUserId: effectiveId } }) : Promise.resolve(null)
    ]);
    console.log(`[BILL_PERF_STEP] 0. Initial Parallel Fetch: ${Date.now() - tFetchStart}ms`);

    const isTaxEnabled = profile?.taxEnabled ?? true;
    const globalGstRate = isTaxEnabled ? (profile?.taxRate ?? 0) : 0;
    const perProductEnabled = profile?.perProductTaxEnabled ?? false;

    let calcSubtotal = 0;
    let totalTax = 0;

    items.forEach((item: any) => {
      const dbItem = dbItems.find(it => it.id === item.id);
      const qty = Number(item.qty || item.quantity) || 0;
      const rate = item.isCustomRate
        ? Number(item.rate)
        : (dbItem ? Number(dbItem.sellingPrice ?? dbItem.price) : Number(item.rate || item.price || 0));
      const itemGstRate = (perProductEnabled && item.gst !== undefined && item.gst !== null) ? Number(item.gst) : globalGstRate;
      const globalTaxInclusive = profile?.taxInclusive ?? false;

      let isInclusive = false;
      if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
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

    let serverDiscountAmt = 0;
    let validatedDiscountCode = null;
    let loyaltyPointsRedeemedAmt = Number(loyaltyPointsRedeemed) || 0;

    if (offer) {
      serverDiscountAmt = calculateDiscount(offer as any, finalSubtotal, items);
      validatedDiscountCode = offer.code;
    } else if (discountAmount > 0) {
      serverDiscountAmt = Number(discountAmount);
    }

    const discountRatio = finalSubtotal > 0 ? Math.max(0, 1 - ((serverDiscountAmt + loyaltyPointsRedeemedAmt) / finalSubtotal)) : 1;
    const calculatedTax = Number((totalTax * discountRatio).toFixed(2));

    const finalDeliveryCharge = Number(deliveryCharges) || 0;
    const finalPackagingCharge = Number(packagingCharges) || 0;
    const finalServiceCharge = Number(serviceCharge) || 0;

    let serverDeliveryGst = 0;
    if (finalDeliveryCharge > 0 && profile?.deliveryGstEnabled) {
      serverDeliveryGst = (finalDeliveryCharge * (profile.deliveryGstRate || 0)) / 100;
    }
    let serverPackagingGst = 0;
    if (finalPackagingCharge > 0 && profile?.packagingGstEnabled) {
      serverPackagingGst = (finalPackagingCharge * (profile.packagingGstRate || 0)) / 100;
    }

    const finalTotal = Number((finalSubtotal + calculatedTax - serverDiscountAmt - loyaltyPointsRedeemedAmt + finalDeliveryCharge + serverDeliveryGst + finalPackagingCharge + serverPackagingGst + finalServiceCharge).toFixed(2));

    // ✅ ATOMIC TRANSACTION FOR BILL CREATION, COUNTER ALLOCATION, & LEDGER
    _tPreTx = Date.now() - _t3;
    const startTime = Date.now();

    let result: any = null;
    let attempts = 0;
    while (true) {
      const _tTxAttemptStart = Date.now();
      try {
        result = await prisma.$transaction(async (tx) => {
          _tTxWait = Date.now() - _tTxAttemptStart;
          // 1 & 3. ATOMIC BILL COUNTER & TOKEN ALLOCATION
          const tProfileStart = Date.now();
          const _t4 = Date.now();
          let nextSerial = 1;
          let nextToken = body.tokenNumber || (kotNumbers && Array.isArray(kotNumbers) && kotNumbers.length > 0 ? kotNumbers[kotNumbers.length - 1] : null);
          if (profile?.id) {
            const txStartDate = new Date();

            let updatedProfile = await tx.businessProfile.update({
              where: { id: profile.id },
              data: {
                billCounter: { increment: 1 },
                ...(!nextToken ? {
                  lastTokenNumber: { increment: 1 },
                  lastTokenDate: txStartDate
                } : {})
              },
              select: { billCounter: true, lastTokenNumber: true }
            });

            nextSerial = updatedProfile.billCounter;
            if (!nextToken) nextToken = updatedProfile.lastTokenNumber;
          } else {
            nextSerial = Math.floor(Math.random() * 1000000);
            if (!nextToken) nextToken = 1;
          }

          const serialLabel = String(nextSerial).padStart(4, '0');
          let finalBillNumber = body.billNumber || `INV/${yy}${mm}/${serialLabel}`;
          console.log(`[BILL_PERF_STEP] 1/3. Profile Counter & Token Update: ${Date.now() - tProfileStart}ms`);
          _tProfileReadUpdate = Date.now() - _t4;

      let orderForDeduction = null;
      if (body.orderId) {
        const tOrderStart = Date.now();
        orderForDeduction = await tx.order.findUnique({ where: { id: body.orderId } });
        console.log(`[BILL_PERF_STEP] 1b. Order Lookup: ${Date.now() - tOrderStart}ms`);
      }

      // 2. ATOMIC PARTY UPSERT & LOYALTY
      const tPartyStart = Date.now();
      let partyId = null;
      let partyWalletBalance = 0;
      if (customerPhone && customerName && customerName !== "Walk-in Customer") {
        const cleanPhone = customerPhone.replace(/[\s\-\(\)\+]/g, "").slice(-10);
        const pointRatio = profile?.loyaltyPointRatio && profile.loyaltyPointRatio > 0 ? profile.loyaltyPointRatio : 0;
        const earnedPoints = pointRatio > 0 ? Math.floor(finalSubtotal / pointRatio) : 0;
        const redeemedPoints = Number(loyaltyPointsRedeemed) || 0;
        const netPointsChange = earnedPoints - redeemedPoints;

        const existingParty = await tx.party.findUnique({
          where: {
            phone_createdBy: {
              phone: cleanPhone,
              createdBy: effectiveId,
            }
          }
        });

        partyWalletBalance = existingParty?.walletBalance || 0;

        const party = await tx.party.upsert({
          where: {
            phone_createdBy: {
              phone: cleanPhone,
              createdBy: effectiveId,
            },
          },
          update: {
            name: customerName,
            address: customerAddress || null,
            loyaltyPoints: { increment: netPointsChange }
          },
          create: {
            name: customerName,
            phone: cleanPhone,
            createdBy: effectiveId,
            address: customerAddress || null,
            loyaltyPoints: Math.max(0, netPointsChange)
          },
        });
        partyId = party.id;
      }
      console.log(`[BILL_PERF_STEP] 2. Party Upsert & Loyalty: ${Date.now() - tPartyStart}ms`);

      // WALLET ADJUSTMENT LOGIC
      let initPaymentMode = paymentMode || "Cash";
      if (
        initPaymentMode !== "UPI" &&
        initPaymentMode !== "Card" &&
        initPaymentMode !== "Pay on Counter" &&
        initPaymentMode !== "Wallet" &&
        !initPaymentMode.startsWith("Split")
      ) {
        initPaymentMode = "Cash";
      }

      let finalAmountPaid = amountPaid !== undefined ? Number(amountPaid) : finalTotal;
      let finalBalanceDue = Math.max(0, finalTotal - finalAmountPaid);
      let walletUsed = 0;
      let calculatedPaymentMode = initPaymentMode;

      if (customerPhone && customerName && customerName !== "Walk-in Customer" && !isHeld && finalBalanceDue > 0 && partyWalletBalance > 0) {
        walletUsed = Math.min(partyWalletBalance, finalBalanceDue);
        const originalAmountPaid = finalAmountPaid;
        finalAmountPaid += walletUsed;
        finalBalanceDue -= walletUsed;
        if (originalAmountPaid > 0) {
          calculatedPaymentMode = `${calculatedPaymentMode} (₹${originalAmountPaid}) + Wallet (₹${walletUsed})`;
        } else {
          calculatedPaymentMode = `Wallet (₹${walletUsed})`;
        }
      }

      let calculatedPaymentStatus: string;
      if (isHeld === true) {
        calculatedPaymentStatus = "HELD";
      } else if (finalBalanceDue > 0 && finalBalanceDue < finalTotal) {
        calculatedPaymentStatus = "PARTIAL";
      } else if (finalBalanceDue === finalTotal && finalTotal > 0) {
        calculatedPaymentStatus = "PENDING";
      } else if (calculatedPaymentMode === "Cash" || calculatedPaymentMode === "Card" || calculatedPaymentMode === "Wallet" || calculatedPaymentMode.includes("Wallet") || calculatedPaymentMode.startsWith("Split")) {
        calculatedPaymentStatus = "PAID";
      } else {
        calculatedPaymentStatus = paymentStatus === "Paid" ? "PAID" : "PENDING";
      }



      const processedItems = items.map((it: any) => ({
        ...it,
        kotNumber: it.kotNumber || nextToken || 1,
        addedAt: it.addedAt || nowLocal.toISOString()
      }));

      // 4. CREATE BILL RECORD
      const tCreateStart = Date.now();
      const _t5 = Date.now();
      const createdBill = await tx.billManager.create({
        data: {
          idempotencyKey: idempotencyKey || `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          clerkUserId: effectiveId || "Unknown",
          orderId: body.orderId || null,
          billNumber: finalBillNumber,
          items: processedItems,
          subtotal: finalSubtotal,
          tax: calculatedTax,
          total: finalTotal,
          paymentMode: calculatedPaymentMode,
          paymentStatus: calculatedPaymentStatus,
          amountPaid: finalAmountPaid,
          balanceDue: finalBalanceDue,
          isHeld: isHeld === true,
          upiTxnRef: upiTxnRef || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          partyId: partyId,
          tableName: tableName || "POS",
          zoneName: zoneName || null,
          discountAmount: serverDiscountAmt,
          discountCode: validatedDiscountCode,
          deliveryCharges: finalDeliveryCharge,
          deliveryGst: serverDeliveryGst,
          packagingCharges: finalPackagingCharge,
          packagingGst: serverPackagingGst,
          serviceCharge: finalServiceCharge,
          auditNote: body.auditNote || null,
          isKotPrinted: isKotPrinted === true,
          tokenNumber: nextToken,
          kotNumbers: kotNumbers || [],
          inventoryDeducted: false, // Wait for transaction to set this to true!
        },
      });
      console.log(`[BILL_PERF_STEP] 4. BillManager Record Create: ${Date.now() - tCreateStart}ms`);
      _tBillInsert = Date.now() - _t5;
      _tCommitStart = Date.now();

      // 5. ATOMIC WALLET / LEDGER DEDUCTIONS
      const tWalletStart = Date.now();
      if (!createdBill.isHeld && partyId) {
        if (walletUsed > 0) {
          await tx.party.update({
            where: { id: partyId },
            data: { walletBalance: { decrement: walletUsed } }
          });
          await tx.walletTransaction.create({
            data: {
              partyId: partyId,
              clerkId: effectiveId || "Unknown",
              type: "DEBIT",
              amount: walletUsed,
              description: `Auto-Paid for Bill ${createdBill.billNumber} from Wallet`
            }
          });
        }

        if (finalBalanceDue > 0) {
          await tx.party.update({
            where: { id: partyId },
            data: { walletBalance: { decrement: finalBalanceDue } }
          });
          await tx.walletTransaction.create({
            data: {
              partyId: partyId,
              clerkId: effectiveId || "Unknown",
              type: "DEBIT",
              amount: finalBalanceDue,
              description: `Unpaid Balance (Udhar) for Bill ${createdBill.billNumber}`
            }
          });
        }
      }
      console.log(`[BILL_PERF_STEP] 5. Wallet Ledger Updates: ${Date.now() - tWalletStart}ms`);

      return { bill: createdBill, orderForDeduction };
    }, {
      timeout: 10000
    });
    _tCommit = Date.now() - _tCommitStart;

        break; // Success! Break out of the retry loop.
      } catch (err: any) {
        if (err.code === 'P2002' || err.code === 'P2034' || String(err.message).includes('WriteConflict') || String(err.message).includes('deadlock')) {
          if (err.code === 'P2002' && (err.meta?.target?.includes('idempotencyKey') || String(err.message).includes('idempotencyKey'))) {
            if (idempotencyKey) {
              const existingBill = await prisma.billManager.findUnique({ where: { idempotencyKey }, include: { party: true } });
              if (existingBill) {
                console.log(`[IDEMPOTENCY] Race caught, returning existing bill for key ${idempotencyKey}`);
                return NextResponse.json({ bill: existingBill });
              }
            }
          } else if (err.code === 'P2002' && (err.meta?.target?.includes('billNumber') || String(err.message).includes('billNumber'))) {
            if (body.billNumber) {
              console.log(`[BILL_MANAGER] Explicit billNumber ${body.billNumber} collided. Skipping retries.`);
              throw err;
            }
            console.log(`[BILL_MANAGER] billNumber collision detected. Advancing counter outside transaction to recover.`);
            if (profile?.id) {
              try {
                const prefix = `INV/${yy}${mm}/`;
                const maxBill = await prisma.billManager.findFirst({
                  where: { clerkUserId: effectiveId, billNumber: { startsWith: prefix } },
                  orderBy: { billNumber: 'desc' }
                });
                let nextCounter = 2;
                if (maxBill && maxBill.billNumber) {
                  const parts = maxBill.billNumber.split('/');
                  if (parts.length === 3) {
                    const lastNum = parseInt(parts[2], 10);
                    if (!isNaN(lastNum)) {
                      nextCounter = lastNum + 1;
                    }
                  }
                }
                const currentProfile = await prisma.businessProfile.findUnique({ where: { id: profile.id } });
                const currentCounter = currentProfile?.billCounter || 0;
                await prisma.businessProfile.update({
                  where: { id: profile.id },
                  data: { billCounter: Math.max(nextCounter, currentCounter + 1) }
                });
              } catch (recErr) {
                console.error("[BILL_MANAGER] Recovery query failed", recErr);
                await prisma.businessProfile.update({
                  where: { id: profile.id },
                  data: { billCounter: { increment: 1 } }
                });
              }
            }
          }
          if (attempts < 15) {
            attempts++;
            console.log(`[BILL_MANAGER] Retry ${attempts} due to ${err.code} / ${err.message.substring(0, 50)} | Duration: ${Date.now() - _tTxAttemptStart}ms`);
            // Exponential backoff jitter
            await new Promise(r => setTimeout(r, Math.random() * 200 * attempts));
            continue;
          }
        }
        throw err; // Re-throw if max attempts reached or unrelated error
      }
    }

    _tResponseStart = Date.now();
    const endTime = Date.now();
    const responseJson = NextResponse.json(
      {
        message: "Bill created successfully",
        bill: result.bill,
        orderForDeduction: result.orderForDeduction
      }
    );
    console.log(`BILL_PERF { auth: ${_tAuth}ms, body: ${_tBody}ms, idempotency: ${_tIdemp}ms, preTxCompute: ${_tPreTx}ms, txWait: ${_tTxWait}ms, profileReadUpdate: ${_tProfileReadUpdate}ms, billInsert: ${_tBillInsert}ms, txCommit: ${_tCommit}ms, responseSer: ${Date.now() - _tResponseStart}ms, total: ${Date.now() - _tTotalStart}ms, retries: ${attempts} }`);

    const bill = result.bill;
    const orderForDeduction = result.orderForDeduction;


    // ✅ AUTO-DEDUCT INVENTORY IN BACKGROUND (NON-BLOCKING)
    if (!bill.isHeld && skipInventoryDeduction !== true) {
      console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} created. Awaiting background inventory deduction.`);

      const { withTransactionRetry, executeInventoryDeduction } = await import("@/lib/inventory-utils");
      const tInvStart = Date.now();

      try {
          // ENTIRE OPERATION WRAPPED IN ACID TRANSACTION WITH RETRY
          await withTransactionRetry(async (tx) => {
              // 1. Claim BillManager Lock atomically FIRST
              const claim = await tx.billManager.updateMany({
                  where: { id: bill.id, inventoryDeducted: false },
                  data: { inventoryDeducted: true }
              });

              if (claim.count === 0) {
                  console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} already deducted or locked.`);
                  return; // Someone else handled it
              }

              let itemsToDeduct = bill.items as any[];

              // 2. Cross-Entity Semantics
              // Read the Order flag to know if we are FIRST or SECOND. We DO NOT claim it.
              if (body.orderId) {
                  const orderLock = await tx.order.findUnique({ where: { id: body.orderId } });

                  if (orderLock?.inventoryDeducted) {
                      // Order was already deducted (e.g. by concurrent Order PATCH).
                      // Only deduct the DIFFERENCE (newly added items).
                      const orderItems = (orderLock.items as any[]) || [];
                      const orderItemQuantities = new Map<string, number>();

                      for (const oi of orderItems) {
                          const id = oi.itemId || oi.id;
                          if (id) {
                              orderItemQuantities.set(id, (orderItemQuantities.get(id) || 0) + Number(oi.qty || oi.quantity || 1));
                          }
                      }

                      const newItemsToDeduct = [];
                      for (const bi of itemsToDeduct) {
                          const id = bi.itemId || bi.id;
                          if (!id) continue;

                          const billQty = Number(bi.qty || bi.quantity || 1);
                          const orderQty = orderItemQuantities.get(id) || 0;

                          if (billQty > orderQty) {
                              const difference = billQty - orderQty;
                              newItemsToDeduct.push({ ...bi, qty: difference, quantity: difference });
                              orderItemQuantities.set(id, orderQty + difference);
                          }
                      }

                      itemsToDeduct = newItemsToDeduct;
                      console.log(`[BILL_MANAGER_DEBUG] Order ${orderLock.id} already deducted. Filtered bill items to ${itemsToDeduct.length} new items.`);
                  }
              }

              // 3. Execute Deduction
              if (itemsToDeduct.length > 0) {
                  await executeInventoryDeduction(tx, itemsToDeduct);
                  console.log(`[INVENTORY_PERF] source=bill_manager_post billId=${bill.id} durationMs=${Date.now() - tInvStart} status=success`);
              } else {
                  console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} has no new items to deduct after cross-entity protection.`);
              }
          });
      } catch (deductErr) {
          console.error(`[INVENTORY_PERF] source=bill_manager_post billId=${bill.id} status=failed error=`, deductErr);
          // Transaction automatically rolled back!
          // `inventoryDeducted` is safely false again.
          // We DO NOT throw the error to preserve the business contract (bill is still created successfully).
      }
    } else if (skipInventoryDeduction === true) {
      console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} created. Inventory deduction skipped by caller.`);
    }

    return responseJson;
  } catch (err: any) {
    console.error("BILL MANAGER CREATE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to create bill: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

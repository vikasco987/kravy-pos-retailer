import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";
import { calculateDiscount } from "@/lib/discount-utils";
import { getInventorySettings, validateStockAvailability } from "@/lib/inventory-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function parseIstStart(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
}

function parseIstEnd(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);
}

/**
 * GET → List bills
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asUserIdParam = searchParams.get("asUserId");

    // Admin / Merchant Data Isolation:
    // Only ADMIN or MASTER can inspect another merchant via asUserId.
    // Normal merchants are strictly restricted to their own business data.
    const isPlatformAdmin = authUser.role === "ADMIN" || authUser.role === "MASTER" || authUser.type === "ADMIN";
    let targetClerkId: string;

    if (isPlatformAdmin && asUserIdParam) {
      targetClerkId = asUserIdParam;
    } else {
      const effId = await getEffectiveClerkId();
      if (!effId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      targetClerkId = effId;
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isHeld = searchParams.get("isHeld");
    const search = searchParams.get("search");
    const orderType = searchParams.get("orderType");
    const paymentMode = searchParams.get("paymentMode");
    const status = searchParams.get("status");

    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    const take = Math.min(Math.max(Number(limitParam) || 10, 1), 100);
    const page = Math.max(Number(pageParam) || 1, 1);
    const skip = (page - 1) * take;

    const andConditions: any[] = [
      { clerkUserId: targetClerkId },
      { isDeleted: false },
    ];

    if (isHeld === "true") {
      andConditions.push({ isHeld: true });
    }

    // 1. Date Filtering (pure deterministic IST parsing)
    if (startDate || endDate) {
      const createdAtFilter: any = {};
      if (startDate) {
        const start = parseIstStart(startDate);
        if (start) createdAtFilter.gte = start;
      }
      if (endDate) {
        const end = parseIstEnd(endDate);
        if (end) createdAtFilter.lte = end;
      }
      if (Object.keys(createdAtFilter).length > 0) {
        andConditions.push({ createdAt: createdAtFilter });
      }
    }

    // 2. Search Filter (Invoice No, Customer Name, Phone, Table)
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { billNumber: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerPhone: { contains: q, mode: "insensitive" } },
          { tableName: { contains: q, mode: "insensitive" } },
        ]
      });
    }

    // 3. Order Type Filter
    if (orderType && orderType !== "All Types") {
      if (orderType === "Counter") {
        andConditions.push({
          OR: [
            { tableName: "POS" },
            { tableName: "Counter" },
            { tableName: null },
          ]
        });
      } else if (orderType === "Takeaway") {
        andConditions.push({ tableName: { contains: "TAKEAWAY", mode: "insensitive" } });
      } else if (orderType === "Dine-in") {
        andConditions.push({ tableName: { startsWith: "Table", mode: "insensitive" } });
      }
    }

    // 4. Payment Mode Filter
    if (paymentMode && paymentMode !== "All Payments" && paymentMode !== "All Modes") {
      andConditions.push({
        paymentMode: { equals: paymentMode, mode: "insensitive" }
      });
    }

    // 5. Payment Status Filter
    if (status && status !== "All Status") {
      if (status.toLowerCase() === "pending") {
        andConditions.push({
          OR: [
            { paymentStatus: { equals: "Pending", mode: "insensitive" } },
            { isHeld: true }
          ]
        });
      } else {
        andConditions.push({
          paymentStatus: { equals: status, mode: "insensitive" }
        });
      }
    }

    const whereClause = { AND: andConditions };

    const [bills, totalRecords] = await Promise.all([
      prisma.billManager.findMany({
        where: whereClause,
        select: {
          id: true,
          createdAt: true,
          billNumber: true,
          orderId: true,
          paymentStatus: true,
          tableName: true,
          zoneName: true,
          customerName: true,
          customerPhone: true,
          subtotal: true,
          total: true,
          discountAmount: true,
          tax: true,
          paymentMode: true,
          amountPaid: true,
          balanceDue: true,
          tokenNumber: true,
          kotNumbers: true,
          items: true,
          isHeld: true,
          pdfUrl: true,
          auditNote: true,
          clerkUserId: true,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ],
        take,
        skip,
      }),
      prisma.billManager.count({ where: whereClause })
    ]);

    let canViewPhone = true;
    if (authUser && authUser.role !== 'ADMIN' && authUser.role !== 'SELLER' && authUser.role !== 'OWNER' && authUser.role !== 'USER') {
      canViewPhone = authUser.permissions?.includes("view-customer-phone") || false;
    }

    const modifiedBills = bills.map(bill => {
      const b: any = { ...bill };
      b.itemsCount = Array.isArray(bill.items) ? bill.items.length : 0;
      if (isHeld !== "true") {
        delete b.items; // Keeps payload small and fast for list views!
      }
      if (!canViewPhone) {
        b.customerPhone = "";
      }
      return b;
    });

    const totalPages = Math.ceil(totalRecords / take) || 1;

    return NextResponse.json({
      bills: modifiedBills,
      clerkUserId: targetClerkId,
      totalRecords,
      totalPages,
      pagination: {
        page,
        limit: take,
        take,
        skip,
        totalRecords,
        totalPages,
      }
    });
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
      serviceChargeName,
      kotNumbers,
      skipInventoryDeduction,
      amountPaid,
      packagingCharges,
      loyaltyPointsRedeemed,
      idempotencyKey,
      isTaxInclusive,
      placeOfSupply,
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
        : prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'desc' } }),
      prisma.item.findMany({ where: { id: { in: itemIds }, clerkId: effectiveId } }),
      discountCode ? prisma.offer.findFirst({ where: { code: discountCode.toUpperCase(), isActive: true, clerkUserId: effectiveId } }) : Promise.resolve(null)
    ]);
    console.log(`[BILL_PERF_STEP] 0. Initial Parallel Fetch: ${Date.now() - tFetchStart}ms`);

    const invSettings = getInventorySettings(profile);

    // 🛑 1b. INVENTORY STOCK VALIDATION (Warn / Block behavior)
    if (!isHeld && skipInventoryDeduction !== true && invSettings.enabled !== false && invSettings.insufficientStockBehavior !== "allow") {
      const authUser = await getAuthUser();
      const validation = await validateStockAvailability(
        prisma,
        items,
        invSettings,
        {
          isManagerOverride: body.isManagerOverride === true,
          confirmedWarning: body.confirmedWarning === true,
          userRole: authUser?.role || authUser?.type,
          userPermissions: authUser?.permissions || [],
        }
      );

      if (!validation.valid) {
        return NextResponse.json(
          {
            error: validation.message || "Insufficient stock for some items",
            code: validation.action === "warn" ? "INSUFFICIENT_STOCK_WARN" : "INSUFFICIENT_STOCK_BLOCK",
            insufficientItems: validation.insufficientItems,
          },
          { status: 400 }
        );
      }
    }

    const isFloor = body.source === "FloorManagement";
    const isTaxEnabled = profile?.taxEnabled ?? true;
    const globalGstRate = (profile as any)?.taxRate || 0;
    const perProductEnabled = (profile as any)?.perProductTaxEnabled ?? false;
    const globalTaxInclusive = (profile as any)?.taxInclusive ?? false;

    let calcSubtotal = 0;
    let totalTax = 0;

    items.forEach((item: any) => {
      const dbItem = dbItems.find(it => it.id === item.id);
      const qty = Number(item.qty || item.quantity) || 0;
      const rate = (item.isCustomRate || body.orderId)
        ? Number(item.rate || item.price || 0)
        : (dbItem ? Number(dbItem.sellingPrice ?? dbItem.price) : Number(item.rate || item.price || 0));
      
      // Trust the payload's gst snapshot if provided, otherwise fallback to business rules
      const payloadGst = (item.gst !== undefined && item.gst !== null) ? Number(item.gst) : null;
      const itemGstRate = isTaxEnabled 
        ? (payloadGst !== null ? payloadGst : (perProductEnabled ? Number(dbItem?.gst || 0) : globalGstRate))
        : 0;

      let isInclusive = false;
      if (isTaxEnabled) {
        if (item.taxStatus) {
           isInclusive = item.taxStatus === "With Tax";
        } else if (perProductEnabled && dbItem?.taxStatus) {
           isInclusive = dbItem.taxStatus === "With Tax";
        } else {
           isInclusive = globalTaxInclusive;
        }
      }

      const gross = qty * rate;

      const isInterState = placeOfSupply && profile?.state && 
        placeOfSupply.trim().toLowerCase() !== profile.state.trim().toLowerCase();

      let splitCgst = 0;
      let splitIgst = 0;

      if (isInclusive) {
        const exactGst = gross - (gross / (1 + itemGstRate / 100));
        if (isInterState) {
          splitIgst = Math.round(exactGst * 100) / 100;
          totalTax += splitIgst;
          calcSubtotal += (gross - splitIgst);
        } else {
          splitCgst = Math.round(exactGst * 50) / 100;
          totalTax += (splitCgst * 2);
          calcSubtotal += (gross - (splitCgst * 2));
        }
      } else {
        const exactGst = (gross * itemGstRate) / 100;
        if (isInterState) {
          splitIgst = Math.round(exactGst * 100) / 100;
          totalTax += splitIgst;
        } else {
          splitCgst = Math.round(exactGst * 50) / 100;
          totalTax += (splitCgst * 2);
        }
        calcSubtotal += gross;
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

    const discountRatio = finalSubtotal > 0 ? Math.max(0, 1 - (serverDiscountAmt / finalSubtotal)) : 1;
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

    const unroundedTotal = finalSubtotal + calculatedTax - serverDiscountAmt - loyaltyPointsRedeemedAmt + finalDeliveryCharge + serverDeliveryGst + finalPackagingCharge + serverPackagingGst + finalServiceCharge;
    const finalTotal = Number(unroundedTotal.toFixed(2));

    // ✅ ATOMIC TRANSACTION FOR BILL CREATION, COUNTER ALLOCATION, & LEDGER
    _tPreTx = Date.now() - _t3;
    const startTime = Date.now();

    let result: any = null;
    let attempts = 0;
    let counterOffset = 0;
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
            const todayStr = txStartDate.toISOString().split('T')[0];
            const currentMonthStr = yy + mm;
            
            const preFetchDateStr = profile.lastTokenDate ? new Date(profile.lastTokenDate).toISOString().split('T')[0] : "";
            const preFetchMonthStr = profile.lastBillMonth || "";
            
            console.log(`[DEBUG_MIDNIGHT] todayStr: ${todayStr}, preFetchDateStr: ${preFetchDateStr}, profile.lastTokenDate: ${profile.lastTokenDate}`);

            // Reliable path with exact read to prevent Prisma `$inc` silent type-casting failures on MongoDB
            const currentProfile = await tx.businessProfile.findUnique({ where: { id: profile.id } });
            const lastTokenDateStr = currentProfile?.lastTokenDate ? new Date(currentProfile.lastTokenDate).toISOString().split('T')[0] : "";
            const lastBillMonthStr = currentProfile?.lastBillMonth || "";
            
            const isNewDayTx = lastTokenDateStr !== todayStr;
            const isNewMonthTx = lastBillMonthStr !== currentMonthStr;
            const currentCounter = currentProfile?.billCounter || 0;

            const updatedProf = await tx.businessProfile.update({
              where: { id: profile.id },
              data: {
                // EXPLICIT SET: Bypasses Prisma's { increment } which silently fails if DB type is Float/String
                billCounter: isNewMonthTx ? (1 + counterOffset) : (currentCounter + 1 + counterOffset),
                ...(isNewMonthTx ? { lastBillMonth: currentMonthStr } : {}),
                ...(!nextToken ? {
                  lastTokenNumber: isNewDayTx ? 1 : { increment: 1 },
                  lastTokenDate: txStartDate
                } : {})
              },
              select: { billCounter: true, lastTokenNumber: true }
            });

            const updatedProfile = {
                ...currentProfile,
                billCounter: updatedProf.billCounter,
                lastTokenNumber: !nextToken ? updatedProf.lastTokenNumber : null
            };

            nextSerial = updatedProfile.billCounter;
            if (!nextToken) nextToken = updatedProfile.lastTokenNumber;
          } else {
            nextSerial = Math.floor(Math.random() * 1000000);
            if (!nextToken) nextToken = 1;
          }

          const serialLabel = String(nextSerial).padStart(4, '0');
          let finalBillNumber = body.billNumber || `INV/${yy}${mm}/${serialLabel}`;
          console.log(`[BILL_MANAGER_DEBUG] Attempt ${attempts}: nextSerial=${nextSerial}, counterOffset=${counterOffset}, finalBillNumber=${finalBillNumber}`);
          console.log(`[BILL_PERF_STEP] 1/3. Profile Counter & Token Update: ${Date.now() - tProfileStart}ms`);
          _tProfileReadUpdate = Date.now() - _t4;

      let orderForDeduction = null;
      if (body.orderId) {
        const tOrderStart = Date.now();
        orderForDeduction = await tx.order.findUnique({ where: { id: body.orderId } });
        console.log(`[BILL_PERF_STEP] 1b. Order Lookup: ${Date.now() - tOrderStart}ms`);
      }

      // WALLET ADJUSTMENT & PAYMENT STATUS LOGIC
      let initPaymentMode = paymentMode || "Cash";
      if (!["UPI", "Card", "Pay on Counter", "Wallet"].includes(initPaymentMode) && !initPaymentMode.startsWith("Split")) {
        initPaymentMode = "Cash";
      }

      let finalAmountPaid = amountPaid !== undefined ? Number(amountPaid) : finalTotal;
      let finalBalanceDue = Math.max(0, finalTotal - finalAmountPaid);
      let walletUsed = 0;
      let calculatedPaymentMode = initPaymentMode;
      
      // We don't have partyWalletBalance yet, so we fetch party early.
      let existingParty = null;
      const cleanPhone = customerPhone ? customerPhone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "") : null;
      if (cleanPhone) {
          existingParty = await tx.party.findUnique({
              where: { phone_createdBy: { phone: cleanPhone, createdBy: effectiveId } }
          });
      }
      const partyWalletBalance = existingParty?.walletBalance || 0;

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

      // 2. ATOMIC PARTY UPSERT & LOYALTY
      const tPartyStart = Date.now();
      let partyId = null;
      let earnedPoints = 0;
      let redeemedPoints = Number(loyaltyPointsRedeemed) || 0;

      if (cleanPhone && customerName && customerName !== "Walk-in Customer") {
        const pointRatio = profile?.loyaltyPointRatio && profile.loyaltyPointRatio > 0 ? profile.loyaltyPointRatio : 0;
        
        // ✨ CORE BUSINESS RULE: Earned points ONLY if Paid & Not Held ✨
        if (calculatedPaymentStatus === "PAID" && !isHeld) {
            const minOrder = profile?.loyaltyMinOrderAmount || 0;
            console.log(`[DEBUG LOYALTY] finalSubtotal=${finalSubtotal}, minOrder=${minOrder}, profile.id=${profile?.id}`);
            if (finalSubtotal >= minOrder) {
                const calculatedPoints = pointRatio > 0 ? Math.floor(finalSubtotal / pointRatio) : 0;
                earnedPoints = (profile?.maxEarnPointsPerBill && profile.maxEarnPointsPerBill > 0) ? Math.min(calculatedPoints, profile.maxEarnPointsPerBill) : calculatedPoints;
                console.log(`[DEBUG LOYALTY 2] calculatedPoints=${calculatedPoints}, earnedPoints=${earnedPoints}, maxEarnPointsPerBill=${profile?.maxEarnPointsPerBill}`);
            }
        }
        
        const netPointsChange = earnedPoints - redeemedPoints;

        let party;
        if (existingParty) {
          party = await tx.party.update({
            where: { id: existingParty.id },
            data: {
              name: customerName,
              address: customerAddress || null,
              loyaltyPoints: { increment: netPointsChange }
            }
          });
        } else {
          party = await tx.party.create({
            data: {
              name: customerName,
              phone: cleanPhone,
              createdBy: effectiveId,
              address: customerAddress || null,
              loyaltyPoints: Math.max(0, netPointsChange)
            }
          });
        }
        partyId = party.id;
      }
      console.log(`[BILL_PERF_STEP] 2. Party Upsert & Loyalty: ${Date.now() - tPartyStart}ms`);



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
          currencySymbol: profile?.currencySymbol || body.currencySymbol || "₹",
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
          isTaxInclusive: typeof isTaxInclusive === 'boolean' ? isTaxInclusive : null,
          isTaxEnabled: profile?.taxEnabled ?? false,
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
          loyaltyEarned: earnedPoints,
          loyaltyRedeemed: redeemedPoints,
          inventoryDeducted: false, // Wait for transaction to set this to true!
        } as any,
      });

      // Atomically complete linked Order so it moves out of active kitchen queue
      if (body.orderId) {
        try {
          await tx.order.updateMany({
            where: { id: body.orderId, clerkUserId: effectiveId },
            data: { status: "COMPLETED", isBillPrinted: true }
          });
        } catch (orderUpdateErr) {
          console.error("[BILL_MANAGER] Failed to mark linked order as completed:", orderUpdateErr);
        }
      }

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
            
            console.log(`[BILL_MANAGER] billNumber collision detected. Retrying transaction safely with offset.`);
            
            // If we collided, check the actual max bill number in the DB to skip massive gaps
            // (e.g. when lastBillMonth is missing and we incorrectly reset to 1)
            const now = new Date();
            const prefix = `INV/${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}/`;
            // Fetch recent bills to find the TRUE numeric max, avoiding string-sort anomalies (like "9" > "0223")
            const recentBills = await prisma.billManager.findMany({
                where: { clerkUserId: effectiveId, billNumber: { startsWith: prefix } },
                select: { billNumber: true },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            
            let trueMax = 0;
            for (const b of recentBills) {
                if (b.billNumber) {
                    const s = parseInt(b.billNumber.replace(prefix, ""), 10);
                    if (!isNaN(s) && s > trueMax) trueMax = s;
                }
            }

            console.log(`[BILL_MANAGER_DEBUG] Collision! trueMax in recent DB=${trueMax}, current counterOffset=${counterOffset}`);
            
            if (trueMax > 0 && counterOffset < trueMax) {
                counterOffset = trueMax;
            } else {
                // If we are still colliding, aggressive jump to bypass blocks
                counterOffset += (attempts > 3 ? 5 : 1);
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
    if (!bill.isHeld && skipInventoryDeduction !== true && invSettings.enabled !== false) {
      console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} created. Awaiting background inventory deduction.`);

      const { withTransactionRetry, executeInventoryDeduction } = await import("@/lib/inventory-utils");
      const tInvStart = Date.now();
      let didDeductInventory = false;

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
                  await executeInventoryDeduction(tx, itemsToDeduct, invSettings);
                  didDeductInventory = true;
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

      // Post-commit authoritative realtime broadcast for Inventory & connected screens
      if (didDeductInventory && (global as any).io) {
        try {
          (global as any).io.to(`business_${effectiveId}`).emit("dashboard_update", {
            businessId: effectiveId,
            type: "INVENTORY_UPDATE",
            action: "BILL_CREATED",
            billId: bill.id,
            timestamp: Date.now()
          });
        } catch (ioErr) {
          console.error("[BILL_CREATE_SOCKET_ERROR]:", ioErr);
        }
      }
    } else if (skipInventoryDeduction === true) {
      console.log(`[BILL_MANAGER_DEBUG] Bill ${bill.billNumber} created. Inventory deduction skipped by caller.`);
    }

    // ✅ AUTO-SEND WHATSAPP BILL IN BACKGROUND (NON-BLOCKING WITH WALLET CREDITS)
    if (bill && !bill.isHeld && bill.customerPhone) {
      (async () => {
        try {
          // 1. Check if merchant has enabled WhatsApp auto-bill
          if (profile?.whatsappAutoBillEnabled === false) {
            console.log(`[AUTO_WHATSAPP_BILL] ⏸️ Skipped: Auto-bill disabled in merchant settings for Bill ${bill.billNumber}`);
            return;
          }

          // 2. Check if merchant has remaining wallet message credits (No free messages for regular customers, Admin exempt)
          const isAdmin = authUser?.role === "ADMIN" || authUser?.type === "ADMIN";
          const currentCredits = isAdmin ? 9999 : (profile?.whatsappCredits ?? 0);
          if (currentCredits <= 0) {
            console.warn(`[AUTO_WHATSAPP_BILL] ⚠️ Paused: Insufficient WhatsApp credits (Credits: 0). Auto-send stopped for Bill ${bill.billNumber}. Merchant must recharge wallet.`);
            return;
          }

          const { sendWhatsAppBill } = await import("@/lib/whatsapp-bill");
          const itemsRaw = typeof bill.items === "string" ? JSON.parse(bill.items) : (bill.items as any[]);
          const printSettings = (profile?.printSettings as any) || {};
          const selectedTemplate = printSettings.whatsappSelectedTemplate || "delivery_confirmation_1";

          const waResult = await sendWhatsAppBill({
            billId: bill.id,
            templateId: selectedTemplate,
            invoiceNo: bill.billNumber,
            date: new Date(bill.createdAt).toLocaleString("en-IN"),
            restaurantName: profile?.businessName || "Store",
            restaurantAddress: profile?.businessAddress || "",
            gstin: profile?.gstNumber || "",
            customerPhone: bill.customerPhone,
            customerName: bill.customerName || undefined,
            items: (itemsRaw || []).map((it: any) => ({
              name: it.name || "Item",
              qty: it.qty || it.quantity || 1,
              price: it.rate || it.price || 0,
              gstRate: it.gst || 0,
            })),
            subtotal: bill.subtotal,
            discountCode: bill.discountCode || undefined,
            discountAmount: bill.discountAmount || 0,
            taxableAmount: bill.subtotal,
            cgst: (bill.tax || 0) / 2,
            sgst: (bill.tax || 0) / 2,
            grandTotal: bill.total,
            paymentMode: bill.paymentMode || "Cash",
            fssai: (profile?.fssaiEnabled && profile?.fssaiNumber) ? profile.fssaiNumber : undefined,
            currencySymbol: bill.currencySymbol || profile?.currencySymbol || "₹"
          });

          if (waResult.success) {
            // Deduct 1 credit & balance atomically
            const remaining = Math.max(0, currentCredits - 1);
            const costPerMsg = profile?.whatsappCostPerMessage || 0.50;
            const newBal = Math.max(0, (profile?.whatsappBalance || 0) - costPerMsg);

            if (profile?.id) {
              await prisma.businessProfile.update({
                where: { id: profile.id },
                data: {
                  whatsappCredits: remaining,
                  whatsappBalance: newBal,
                  whatsappTotalSent: { increment: 1 }
                }
              });

              await prisma.whatsAppWalletTransaction.create({
                data: {
                  clerkUserId: effectiveId || "Unknown",
                  type: "DEBIT",
                  amount: costPerMsg,
                  credits: -1,
                  balanceAfter: remaining,
                  description: `Auto-Bill ${bill.billNumber} sent to ${bill.customerPhone}`,
                  billNumber: bill.billNumber,
                  customerPhone: bill.customerPhone,
                }
              });
            }

            await prisma.billManager.update({
              where: { id: bill.id },
              data: {
                whatsappSent: true,
                whatsappSentAt: new Date(),
                whatsappSid: waResult.messageSid,
              }
            });
            console.log(`[AUTO_WHATSAPP_BILL] ✅ Bill ${bill.billNumber} sent to ${bill.customerPhone} (Remaining Credits: ${remaining})`);
          } else {
            console.warn(`[AUTO_WHATSAPP_BILL] ⚠️ Failed for Bill ${bill.billNumber}:`, waResult.error);
          }
        } catch (waErr: any) {
          console.error("[AUTO_WHATSAPP_BILL] Error:", waErr.message || waErr);
        }
      })();
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

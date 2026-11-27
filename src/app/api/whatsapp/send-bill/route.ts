import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppBill } from "@/lib/whatsapp-bill";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { billId, phone } = await req.json();

    if (!billId) {
      return NextResponse.json({ error: "billId required" }, { status: 400 });
    }

    // ── CASE 1: TEST SAMPLE BILL (From WhatsApp Wallet Settings) ────────────
    if (billId === "TEST_SAMPLE_BILL") {
      const clerkId = await getEffectiveClerkId();
      if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const authUser = await getAuthUser();
      const profile = await prisma.businessProfile.findFirst({
        where: { userId: clerkId }
      });

      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const isAdmin = authUser?.role === "ADMIN" || authUser?.type === "ADMIN";
      const currentCredits = isAdmin ? 9999 : (profile.whatsappCredits ?? 0);
      if (currentCredits <= 0) {
        return NextResponse.json(
          { 
            error: "WhatsApp Wallet Credits khatam ho gaye hain (0 Messages Left). Kripya wallet recharge karein.",
            creditsExhausted: true
          },
          { status: 402 }
        );
      }

      const customerPhone = phone || profile.contactPersonPhone || (profile as any).businessPhone || (profile as any).contactPhone;
      if (!customerPhone) {
        return NextResponse.json({ error: "Test phone number required" }, { status: 400 });
      }

      const testBillData = {
        billId: "TEST_SAMPLE_BILL",
        invoiceNo: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleString("en-IN"),
        restaurantName: profile.businessName || "Kravy Test Store",
        restaurantAddress: profile.businessAddress || "",
        gstin: profile.gstNumber || "",
        customerPhone,
        customerName: "Valued Customer",
        items: [
          { name: "Sample Item 1", qty: 2, price: 120, gstRate: 5 },
          { name: "Sample Special Item", qty: 1, price: 250, gstRate: 5 }
        ],
        subtotal: 490,
        discountAmount: 0,
        taxableAmount: 490,
        cgst: 12.25,
        sgst: 12.25,
        grandTotal: 514.50,
        paymentMode: "UPI",
        fssai: (profile.fssaiEnabled && profile.fssaiNumber) ? profile.fssaiNumber : undefined,
        currencySymbol: profile.currencySymbol || "₹"
      };

      const result = await sendWhatsAppBill(testBillData);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Send failed" },
          { status: 500 }
        );
      }

      // Deduct 1 credit
      const remaining = Math.max(0, currentCredits - 1);
      const costPerMsg = profile.whatsappCostPerMessage || 0.50;
      const newBal = Math.max(0, (profile.whatsappBalance || 0) - costPerMsg);

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
          clerkUserId: clerkId,
          type: "DEBIT",
          amount: costPerMsg,
          credits: -1,
          balanceAfter: remaining,
          description: `Test Bill sent to ${customerPhone}`,
          billNumber: testBillData.invoiceNo,
          customerPhone: customerPhone,
        }
      });

      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        sentTo: customerPhone,
        remainingCredits: remaining
      });
    }

    // ── CASE 2: REAL BILL BY DATABASE ID ──────────────────────────────────
    // DB se bill fetch karo
    const bill = await prisma.billManager.findUnique({
      where: { id: billId },
      include: {
        user: {
          include: {
            profiles: true
          }
        }
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const business = bill.user?.profiles?.[0];

    // ✅ WALLET CREDIT CHECK: Ensure merchant has remaining messages (No free messages for regular customers, Admin exempt)
    const isAdmin = bill.user?.role === "ADMIN";
    const currentCredits = isAdmin ? 9999 : (business?.whatsappCredits ?? 0);
    if (currentCredits <= 0) {
      return NextResponse.json(
        { 
          error: "WhatsApp Wallet Credits khatam ho gaye hain (0 Messages Left). Kripya wallet recharge karein.",
          creditsExhausted: true
        },
        { status: 402 }
      );
    }

    // Customer phone — parameter se ya bill se
    const customerPhone = phone || bill.customerPhone;

    if (!customerPhone) {
      return NextResponse.json(
        { error: "Customer phone number nahi mila" },
        { status: 400 }
      );
    }

    // items parse karo agar string hai
    const itemsRaw = typeof bill.items === "string" ? JSON.parse(bill.items) : (bill.items as any[]);

    // BillData format mein convert karo
    const billData = {
      billId: bill.id,
      invoiceNo: bill.billNumber,
      date: new Date(bill.createdAt).toLocaleString("en-IN"),
      restaurantName: business?.businessName || "Business",
      restaurantAddress: business?.businessAddress || "",
      gstin: business?.gstNumber || "",
      customerPhone,
      customerName: bill.customerName || undefined,
      items: (itemsRaw || []).map((item: any) => ({
        name: item.name || "Item",
        qty: item.qty || item.quantity || 1,
        price: item.rate || item.price || 0,
        gstRate: item.gst || 0,
      })),
      subtotal: bill.subtotal,
      discountCode: bill.discountCode || undefined,
      discountAmount: bill.discountAmount || 0,
      taxableAmount: bill.subtotal,
      cgst: (bill.tax || 0) / 2,
      sgst: (bill.tax || 0) / 2,
      grandTotal: bill.total,
      paymentMode: bill.paymentMode || "Cash",
      fssai: (business?.fssaiEnabled && business?.fssaiNumber) ? business.fssaiNumber : undefined,
      currencySymbol: bill.currencySymbol || business?.currencySymbol || "₹"
    };

    const result = await sendWhatsAppBill(billData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Send failed" },
        { status: 500 }
      );
    }

    // ✅ WALLET DEDUCTION & TRANSACTION LOGGING
    if (business?.id) {
      const remaining = Math.max(0, currentCredits - 1);
      const costPerMsg = business.whatsappCostPerMessage || 0.50;
      const newBal = Math.max(0, (business.whatsappBalance || 0) - costPerMsg);

      await prisma.businessProfile.update({
        where: { id: business.id },
        data: {
          whatsappCredits: remaining,
          whatsappBalance: newBal,
          whatsappTotalSent: { increment: 1 }
        }
      });

      await prisma.whatsAppWalletTransaction.create({
        data: {
          clerkUserId: bill.clerkUserId,
          type: "DEBIT",
          amount: costPerMsg,
          credits: -1,
          balanceAfter: remaining,
          description: `Bill ${bill.billNumber} sent to ${customerPhone}`,
          billNumber: bill.billNumber,
          customerPhone: customerPhone,
        }
      });
    }

    // DB mein whatsappSent mark karo
    await prisma.billManager.update({
      where: { id: billId },
      data: {
        whatsappSent: true,
        whatsappSentAt: new Date(),
        whatsappSid: result.messageSid,
      },
    });

    return NextResponse.json({
      success: true,
      messageSid: result.messageSid,
      sentTo: customerPhone,
      remainingCredits: Math.max(0, currentCredits - 1)
    });
  } catch (err: any) {
    console.error("[WHATSAPP_SEND_BILL_ERR]", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

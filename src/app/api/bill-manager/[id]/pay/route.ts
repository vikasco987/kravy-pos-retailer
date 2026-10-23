import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    const bill = await prisma.billManager.findFirst({
      where: { id, clerkUserId: effectiveId }
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.paymentStatus === "PAID" || bill.paymentStatus === "Paid") {
      return NextResponse.json({ error: "Bill is already paid" }, { status: 400 });
    }

    const dueAmount = bill.balanceDue || (bill.total - (bill.amountPaid || 0));
    const targetMode = bill.paymentMode.includes("Wallet") ? "Wallet (Auto) + Cash" : bill.paymentMode;

    await prisma.$transaction(async (tx) => {
      // 1. Update the bill
      const updatedBill = await tx.billManager.update({
        where: { id },
        data: {
          paymentStatus: "PAID",
          amountPaid: bill.total,
          balanceDue: 0,
          paymentMode: targetMode,
        }
      });

      // 2. If tied to a party, credit the wallet back the due amount
      if (bill.partyId && dueAmount > 0) {
        await tx.party.update({
          where: { id: bill.partyId },
          data: { walletBalance: { increment: dueAmount } }
        });

        await tx.walletTransaction.create({
          data: {
            partyId: bill.partyId,
            clerkId: effectiveId,
            type: "CREDIT",
            amount: dueAmount,
            description: `Cleared Udhar for Bill ${bill.billNumber} (Paid via History)`
          }
        });
      }

      // 3. Record Audit History for Payment Event
      const authUser = await getAuthUser();
      await tx.billEditLog.create({
        data: {
          clerkUserId: effectiveId,
          billId: updatedBill.id,
          invoiceNo: updatedBill.billNumber,
          actorId: authUser?.id || effectiveId,
          actorName: authUser?.name || "Staff / Cashier",
          actorRole: authUser?.role || authUser?.type || "STAFF",
          eventType: "PAYMENT_UPDATE",
          reason: "Marked full payment received",
          changes: [
            { field: "paymentStatus", label: "Payment Status", before: bill.paymentStatus, after: "PAID" },
            { field: "amountPaid", label: "Amount Paid", before: bill.amountPaid || 0, after: bill.total },
            { field: "balanceDue", label: "Balance Due", before: dueAmount, after: 0 }
          ] as any,
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("BILL PAY ERROR:", err);
    return NextResponse.json({ error: "Failed to pay bill" }, { status: 500 });
  }
}

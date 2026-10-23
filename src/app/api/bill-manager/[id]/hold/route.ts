import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";

export async function PATCH(
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

    const isTargetHeld = body.isHeld === true;
    const targetStatus = isTargetHeld ? "HELD" : "Pending";

    const authUser = await getAuthUser();

    const bill = await prisma.$transaction(async (tx) => {
      const existing = await tx.billManager.findUnique({
        where: { id, clerkUserId: effectiveId }
      });
      if (!existing) throw new Error("NOT_FOUND");

      const updated = await tx.billManager.update({
        where: { id, clerkUserId: effectiveId },
        data: {
          isHeld: isTargetHeld,
          paymentStatus: targetStatus,
        },
      });

      if (existing.isHeld !== isTargetHeld) {
        await tx.billEditLog.create({
          data: {
            clerkUserId: effectiveId,
            billId: updated.id,
            invoiceNo: updated.billNumber,
            actorId: authUser?.id || effectiveId,
            actorName: authUser?.name || "Staff / Cashier",
            actorRole: authUser?.role || authUser?.type || "STAFF",
            eventType: "HOLD_STATUS",
            reason: isTargetHeld ? "Bill placed on hold" : "Bill resumed from hold",
            changes: [
              { field: "isHeld", label: "Hold Status", before: existing.isHeld, after: isTargetHeld },
              { field: "paymentStatus", label: "Payment Status", before: existing.paymentStatus, after: targetStatus }
            ] as any,
          }
        });
      }

      return updated;
    });

    return NextResponse.json({ bill }); 
  } catch (err) {
    console.error("HOLD BILL ERROR:", err);
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    );
  }
}

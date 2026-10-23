import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // 1. Try finding in BillManager
    const bill = await prisma.billManager.findFirst({
      where: {
        id,
        clerkUserId: effectiveId,
        isDeleted: true,
      },
    });

    if (bill) {
      const wasDeducted = (bill.deletedSnapshot as any)?.inventoryDeducted ?? (!bill.isHeld);
      await prisma.$transaction(async (tx) => {
        await tx.billManager.update({
          where: { id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedSnapshot: null,
            paymentStatus: (bill.deletedSnapshot as any)?.paymentStatus || (bill.isHeld ? "HELD" : "Paid"),
            inventoryDeducted: wasDeducted,
          },
        });

        if (wasDeducted && Array.isArray(bill.items) && bill.items.length > 0) {
          const { executeInventoryDeduction } = await import("@/lib/inventory-utils");
          await executeInventoryDeduction(tx, bill.items);
        }
      });
      return NextResponse.json({ success: true, type: "bill" });
    }

    // 2. Try finding in Order
    const order = await prisma.order.findFirst({
      where: {
        id,
        clerkUserId: effectiveId,
        isDeleted: true,
      }
    });

    if (order) {
      const wasDeducted = (order.deletedSnapshot as any)?.inventoryDeducted ?? false;
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            isDeleted: false,
            status: (order.deletedSnapshot as any)?.status || "COMPLETED",
            inventoryDeducted: wasDeducted,
            updatedAt: new Date()
          }
        });

        if (wasDeducted && Array.isArray(order.items) && order.items.length > 0) {
          const { executeInventoryDeduction } = await import("@/lib/inventory-utils");
          await executeInventoryDeduction(tx, order.items);
        }
      });
      return NextResponse.json({ success: true, type: "order" });
    }

    return NextResponse.json(
      { error: "Deleted record not found" },
      { status: 404 }
    );
  } catch (err) {
    console.error("RESTORE BILL ERROR:", err);
    return NextResponse.json(
      { error: "Failed to restore bill" },
      { status: 500 }
    );
  }
}

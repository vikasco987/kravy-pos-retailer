import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [deletedBills, deletedOrders] = await Promise.all([
      prisma.billManager.findMany({
        where: { clerkUserId: effectiveId, isDeleted: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.order.findMany({
        where: { clerkUserId: effectiveId, isDeleted: true },
        orderBy: { deletedAt: "desc" },
      })
    ]);

    const formattedBills = deletedBills.map((b: any) => {
      // 1. Get snapshot (or raw data fallback)
      const rawSnap = b.deletedSnapshot || b;
      
      return {
        id: b.id,
        createdAt: b.deletedAt || b.updatedAt || b.createdAt,
        type: "bill",
        snapshot: {
          billNumber: rawSnap.billNumber,
          total: rawSnap.total,
          paymentMode: rawSnap.paymentMode,
          paymentStatus: rawSnap.paymentStatus,
          isHeld: rawSnap.isHeld,
          tableName: rawSnap.tableName,
          customer: { 
            name: rawSnap.customerName || (rawSnap.customer?.name) || "Walk-in Customer" 
          },
          items: rawSnap.items || []
        }
      };
    });

    const formattedOrders = deletedOrders.map((o: any) => {
      const rawSnap = o.deletedSnapshot || o;

      return {
        id: o.id,
        createdAt: o.deletedAt || o.updatedAt || o.createdAt,
        type: "order",
        snapshot: {
          billNumber: rawSnap.billNumber || `ORD-${o.id.slice(-4).toUpperCase()}`,
          total: rawSnap.total,
          paymentMode: rawSnap.paymentMode || "Pending",
          paymentStatus: rawSnap.status || rawSnap.paymentStatus || "Deleted",
          customer: { name: rawSnap.customerName || "Walk-in" },
          tableName: rawSnap.tableName || (rawSnap.table?.name) || "Counter",
          items: rawSnap.items || [],
          reason: rawSnap.reason || o.notes || ""
        }
      };
    });

    const combined = [...formattedBills, ...formattedOrders].sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );

    return NextResponse.json({ deleted: combined });
  } catch (err) {
    console.error("DELETED BILL LIST ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load deleted bills" },
      { status: 500 }
    );
  }
}

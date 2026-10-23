import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * GET /api/bill-manager/[id]/history
 * Cursor-based pagination, newest-first, maximum 10 records per page.
 * Strictly scoped to tenant (clerkUserId).
 */
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
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }

    // Verify bill ownership
    const bill = await prisma.billManager.findFirst({
      where: { id, clerkUserId: effectiveId },
      select: { id: true, billNumber: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 10), 10);
    const cursor = searchParams.get("cursor");

    const queryOptions: any = {
      where: {
        clerkUserId: effectiveId,
        billId: id,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch 1 extra to determine nextCursor
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const logs = await prisma.billEditLog.findMany(queryOptions);

    let nextCursor: string | null = null;
    let items = logs;
    if (logs.length > limit) {
      const nextItem = logs[limit];
      nextCursor = nextItem.id;
      items = logs.slice(0, limit);
    }

    return NextResponse.json({
      billId: bill.id,
      invoiceNo: bill.billNumber,
      logs: items,
      nextCursor,
    });
  } catch (err: any) {
    console.error("BILL HISTORY GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch bill history" },
      { status: 500 }
    );
  }
}

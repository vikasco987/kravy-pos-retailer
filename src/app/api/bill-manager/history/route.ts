import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * GET /api/bill-manager/history
 * Centralized audit trail across all bills for the authenticated tenant.
 * Supports cursor pagination, billNumber search, eventType filter, and date filtering.
 */
export async function GET(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 10), 20);
    const cursor = searchParams.get("cursor");
    const search = searchParams.get("search")?.trim() || "";
    const eventType = searchParams.get("eventType")?.trim() || "ALL";

    const whereClause: any = {
      clerkUserId: effectiveId,
    };

    if (search) {
      whereClause.invoiceNo = { contains: search, mode: "insensitive" };
    }

    if (eventType !== "ALL") {
      whereClause.eventType = eventType;
    }

    const queryOptions: any = {
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
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
      logs: items,
      nextCursor,
    });
  } catch (err: any) {
    console.error("CENTRAL BILL HISTORY GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to fetch central bill history" },
      { status: 500 }
    );
  }
}

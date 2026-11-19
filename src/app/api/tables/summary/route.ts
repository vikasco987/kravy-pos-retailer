import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * Phase 2.3: Lightweight tables endpoint for TerminalContext polling.
 * Returns only the fields needed by the POS dashboard: id, name, zone.
 * Excludes qrUrl, clerkUserId, createdAt, updatedAt to reduce payload.
 * 
 * The full /api/tables endpoint remains unchanged for table management,
 * QR management, and other pages that need complete table data.
 */
export async function GET(req: NextRequest) {
    try {
        const effectiveId = await getEffectiveClerkId();
        if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tables = await (prisma.table.findMany as any)({
            where: { clerkUserId: effectiveId },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                zone: true,
                floor: true,
                sortOrder: true,
            }
        });

        tables.sort((a: any, b: any) => {
            if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
            if (a.sortOrder != null) return -1;
            if (b.sortOrder != null) return 1;
            return (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' });
        });

        console.log(`[GET_TABLES_SUMMARY] EffectiveID: ${effectiveId}, Count: ${tables.length}`);
        return NextResponse.json(tables);
    } catch (error) {
        console.error("GET_TABLES_SUMMARY_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch tables summary" }, { status: 500 });
    }
}

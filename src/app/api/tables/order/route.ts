import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * PUT /api/tables/order
 * Persists custom table arrangement order for a merchant.
 * Body: { tableIds: string[] }
 */
export async function PUT(req: NextRequest) {
    try {
        const effectiveId = await getEffectiveClerkId();
        if (!effectiveId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        if (!body || !Array.isArray(body.tableIds)) {
            return NextResponse.json({ error: "Invalid payload. Expected tableIds array." }, { status: 400 });
        }

        const { tableIds } = body;

        // Perform transactional bulk update with 1-based sortOrder
        const updates = tableIds.map((id: string, index: number) => {
            return prisma.table.updateMany({
                where: { id, clerkUserId: effectiveId },
                data: { sortOrder: index + 1 },
            });
        });

        await prisma.$transaction(updates);

        return NextResponse.json({ success: true, message: "Table layout order saved successfully." });
    } catch (error) {
        console.error("PUT /api/tables/order error:", error);
        return NextResponse.json({ error: "Failed to reorder tables" }, { status: 500 });
    }
}

/**
 * DELETE /api/tables/order
 * Resets table arrangement back to default alphanumeric ordering.
 */
export async function DELETE() {
    try {
        const effectiveId = await getEffectiveClerkId();
        if (!effectiveId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.table.updateMany({
            where: { clerkUserId: effectiveId },
            data: { sortOrder: null },
        });

        return NextResponse.json({ success: true, message: "Table layout reset to default." });
    } catch (error) {
        console.error("DELETE /api/tables/order error:", error);
        return NextResponse.json({ error: "Failed to reset table layout" }, { status: 500 });
    }
}

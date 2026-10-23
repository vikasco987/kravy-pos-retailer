import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    try {
        const effectiveId = await getEffectiveClerkId();
        if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get("orderId");
        if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

        const bill = await prisma.billManager.findFirst({
            where: { clerkUserId: effectiveId, orderId: orderId, isDeleted: false },
            select: { billNumber: true }
        });

        if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(bill);
    } catch (error) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

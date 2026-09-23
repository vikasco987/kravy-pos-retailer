import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const tTotalStart = Date.now();
    try {
        const tAuthStart = Date.now();
        const effectiveId = await getEffectiveClerkId();
        console.log(`[RESERVE_TOKEN_PERF] 1. Auth & User lookup: ${Date.now() - tAuthStart}ms`);
        
        if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const profileId = searchParams.get("profileId");

        let targetProfileId = profileId;
        let lastTokenDateStr = "";

        const tProfileStart = Date.now();
        if (!targetProfileId) {
            const latestProfile = await prisma.businessProfile.findFirst({
                where: { userId: effectiveId },
                orderBy: { createdAt: 'asc' },
                select: { id: true, lastTokenDate: true }
            });
            if (!latestProfile) {
                return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
            }
            targetProfileId = latestProfile.id;
            lastTokenDateStr = latestProfile.lastTokenDate ? new Date(latestProfile.lastTokenDate).toISOString().split('T')[0] : "";
            console.log(`[RESERVE_TOKEN_PERF] 2. Business profile findFirst lookup: ${Date.now() - tProfileStart}ms`);
        } else {
            const prof = await prisma.businessProfile.findUnique({
                where: { id: targetProfileId },
                select: { id: true, lastTokenDate: true }
            });
            if (prof) {
                lastTokenDateStr = prof.lastTokenDate ? new Date(prof.lastTokenDate).toISOString().split('T')[0] : "";
            }
            console.log(`[RESERVE_TOKEN_PERF] 2. Business profile findUnique lookup: ${Date.now() - tProfileStart}ms`);
        }

        const updateData: any = {
            lastTokenNumber: { increment: 1 },
            lastTokenDate: new Date()
        };

        const tUpdateStart = Date.now();
        const updatedProfile = await prisma.businessProfile.update({
            where: { id: targetProfileId! },
            data: updateData,
            select: { lastTokenNumber: true }
        });
        console.log(`[RESERVE_TOKEN_PERF] 3. Token update in DB: ${Date.now() - tUpdateStart}ms`);
        console.log(`[RESERVE_TOKEN_PERF] TOTAL API Execution Time: ${Date.now() - tTotalStart}ms`);

        return NextResponse.json({ 
            tokenNumber: updatedProfile.lastTokenNumber
        }, { status: 200 });
        
    } catch (error) {
        console.error("RESERVE_TOKEN_ERROR:", error);
        return NextResponse.json({ error: "Failed to reserve token" }, { status: 500 });
    }
}

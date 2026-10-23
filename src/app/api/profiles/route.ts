import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await prisma.businessProfile.findMany({
      where: { userId: effectiveId },
      orderBy: { createdAt: 'desc' }
    });

    const user = await prisma.user.findUnique({
      where: { clerkId: effectiveId }
    });

    const cleanProfiles = profiles.map((p: any) => {
      const clean = { ...p };
      let ps = p.printSettings;
      if (typeof ps === 'string') {
        try { ps = JSON.parse(ps); } catch { ps = {}; }
      } else if (!ps || typeof ps !== 'object') {
        ps = {};
      }
      clean.printSettings = ps;
      clean.inventorySettings = ps?.inventorySettings || null;
      
      if (clean.posHtmlPrintEnabled === undefined) {
        clean.posHtmlPrintEnabled = ps.posHtmlPrintEnabled ?? true;
      }
      if (clean.posWebBtPrintEnabled === undefined) {
        clean.posWebBtPrintEnabled = ps.posWebBtPrintEnabled ?? true;
      }

      delete clean.taxRate;
      delete clean.gstType;
      delete clean.perProductTaxEnabled;
      delete clean.taxInclusive;
      delete clean.floorTaxEnabled;
      delete clean.floorTaxRate;
      delete clean.floorPerProductTaxEnabled;
      delete clean.floorTaxInclusive;
      return clean;
    });

    return NextResponse.json({
        profiles: cleanProfiles,
        enableMultipleProfiles: user?.enableMultipleProfiles || false
    }, { status: 200 });

  } catch (error) {
    console.error("GET /api/profiles error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}

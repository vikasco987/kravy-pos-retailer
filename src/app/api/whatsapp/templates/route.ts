import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMongoId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function resolvePossibleUserIds(initialId: string, authUser?: any): Promise<string[]> {
  const ids = new Set<string>();
  if (initialId) ids.add(initialId);
  if (authUser?.id) ids.add(authUser.id);
  if (authUser?.businessId) ids.add(authUser.businessId);

  try {
    const userRecord = await prisma.user.findFirst({
      where: isMongoId(initialId)
        ? { OR: [{ id: initialId }, { clerkId: initialId }] }
        : { clerkId: initialId },
      select: { id: true, clerkId: true, ownerId: true },
    });

    if (userRecord) {
      if (userRecord.id) ids.add(userRecord.id);
      if (userRecord.clerkId) ids.add(userRecord.clerkId);
      if (userRecord.ownerId) ids.add(userRecord.ownerId);
    }
  } catch (err) {
    console.error("[resolvePossibleUserIds] Error:", err);
  }

  return Array.from(ids);
}

// Available Meta Approved Templates with configuration
export const AVAILABLE_TEMPLATES = [
  {
    id: "delivery_confirmation_1",
    name: "Digital Bill with PDF Download",
    badge: "Recommended",
    category: "Utility",
    cost: "₹0.15 / msg",
    trigger: "POS Bill Settle & Print",
    description: "Sends an official tax invoice with customer name, restaurant name, total amount, and an interactive 'View Bill' button to download the live PDF invoice.",
    header: "ORDER DETAILS",
    body: "Hello {{1}},\n\nThank you for dining with us at {{2}}! 🍽️\nYour bill #{{3}} is ready.\n\n🧾 Total Amount: ₹{{4}}\n💳 Payment Status: {{5}}\n\nClick below to view or download your detailed tax invoice.",
    footer: "KRAVY BILLING SOFTWARE",
    button: {
      type: "URL",
      label: "View Bill",
      target: "Opens Official PDF Invoice Link"
    },
    sampleData: {
      "{{1}}": "Pavan Sharma",
      "{{2}}": "The Friends Cafe",
      "{{3}}": "INV/2611/0149",
      "{{4}}": "₹499.00",
      "{{5}}": "PAID (UPI)"
    }
  }
];

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    let clerkId = await getEffectiveClerkId();

    const searchParams = req.nextUrl.searchParams;
    const asUserIdParam = searchParams.get("asUserId");
    const isAdmin = authUser?.role === "ADMIN" || authUser?.type === "ADMIN";

    if (isAdmin && asUserIdParam) {
      clerkId = asUserIdParam;
    }

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const possibleUserIds = await resolvePossibleUserIds(clerkId, authUser);

    const profile = await prisma.businessProfile.findFirst({
      where: { userId: { in: possibleUserIds } },
      select: {
        id: true,
        businessName: true,
        whatsappAutoBillEnabled: true,
        printSettings: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    const ps = (profile.printSettings as any) || {};
    const selectedTemplateId = ps.whatsappSelectedTemplate || "delivery_confirmation_1";
    const autoSendOnSettle = profile.whatsappAutoBillEnabled === true;

    return NextResponse.json({
      success: true,
      selectedTemplateId,
      autoSendOnSettle,
      templates: AVAILABLE_TEMPLATES,
      businessName: profile.businessName || "My Restaurant",
    });
  } catch (error: any) {
    console.error("[WHATSAPP_TEMPLATES_GET]", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    let clerkId = await getEffectiveClerkId();

    const searchParams = req.nextUrl.searchParams;
    const asUserIdParam = searchParams.get("asUserId");
    const isAdmin = authUser?.role === "ADMIN" || authUser?.type === "ADMIN";

    if (isAdmin && asUserIdParam) {
      clerkId = asUserIdParam;
    }

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const possibleUserIds = await resolvePossibleUserIds(clerkId, authUser);
    const profile = await prisma.businessProfile.findFirst({
      where: { userId: { in: possibleUserIds } },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const { templateId, autoSendOnSettle } = body;

    const existingPs = (profile.printSettings as any) || {};
    const updatedPs = {
      ...existingPs,
      whatsappSelectedTemplate: templateId || existingPs.whatsappSelectedTemplate || "delivery_confirmation_1",
    };

    const updateData: any = {
      printSettings: updatedPs,
    };

    if (typeof autoSendOnSettle === "boolean") {
      const isAdmin = authUser?.role === "ADMIN" || authUser?.type === "ADMIN";
      if (!isAdmin && profile.whatsappAutoBillEnabled === false && autoSendOnSettle === true) {
        return NextResponse.json({
          error: "WhatsApp Auto-Messaging is disabled by Admin. Please contact support to enable it.",
          code: "AUTO_MESSAGING_DISABLED_BY_ADMIN"
        }, { status: 403 });
      }
      updateData.whatsappAutoBillEnabled = autoSendOnSettle;
    }

    await prisma.businessProfile.update({
      where: { id: profile.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp template preferences updated successfully!",
      selectedTemplateId: updatedPs.whatsappSelectedTemplate,
      autoSendOnSettle: updateData.whatsappAutoBillEnabled ?? profile.whatsappAutoBillEnabled,
    });
  } catch (error: any) {
    console.error("[WHATSAPP_TEMPLATES_POST]", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

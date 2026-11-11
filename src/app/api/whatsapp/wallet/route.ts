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
    console.error("[resolvePossibleUserIds] Error resolving user aliases:", err);
  }

  return Array.from(ids);
}

// ── GET: Fetch Wallet Balance, Settings & Recent Transactions ──────────────
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

    let profile = await prisma.businessProfile.findFirst({
      where: { userId: { in: possibleUserIds } },
      select: {
        id: true,
        userId: true,
        businessName: true,
        contactPersonPhone: true,
        contactPersonEmail: true,
        businessEmail: true,
        whatsappAutoBillEnabled: true,
        whatsappBalance: true,
        whatsappCredits: true,
        whatsappCostPerMessage: true,
        whatsappTotalSent: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business Profile not found" }, { status: 404 });
    }

    const defaultCredits = isAdmin ? 9999 : 0;
    const autoBillEnabled = profile.whatsappAutoBillEnabled === true;
    const credits = profile.whatsappCredits !== null && profile.whatsappCredits !== undefined 
      ? profile.whatsappCredits 
      : defaultCredits;
    const costPerMessage = profile.whatsappCostPerMessage || 0.50;
    const balance = profile.whatsappBalance !== null && profile.whatsappBalance !== undefined
      ? profile.whatsappBalance
      : (credits * costPerMessage);
    const totalSent = profile.whatsappTotalSent ?? 0;

    // Fetch recent 50 wallet transactions matching any of the user's aliases
    const transactions = await prisma.whatsAppWalletTransaction.findMany({
      where: { clerkUserId: { in: possibleUserIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      isAdmin,
      profile: {
        id: profile.id,
        businessName: profile.businessName,
        phone: profile.contactPersonPhone || "",
        email: profile.businessEmail || profile.contactPersonEmail || "",
        customerId: profile.userId || clerkId,
      },
      wallet: {
        autoBillEnabled,
        credits,
        balance,
        costPerMessage,
        totalSent,
      },
      transactions,
    });
  } catch (error: any) {
    console.error("[WHATSAPP_WALLET_GET]", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

// ── POST: Toggle Auto-Bill Enable/Disable OR Recharge Wallet ────────────────
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

    const body = await req.json();
    const { action } = body;

    const profile = await prisma.businessProfile.findFirst({
      where: { userId: { in: possibleUserIds } },
    });

    if (!profile) {
      return NextResponse.json({ error: "Business Profile not found" }, { status: 404 });
    }

    // 1. ACTION: TOGGLE AUTO-BILL
    if (action === "toggle") {
      // If disabled by Admin, merchant cannot re-enable themselves
      if (!isAdmin && profile.whatsappAutoBillEnabled === false) {
        return NextResponse.json({
          error: "WhatsApp Auto-Messaging is disabled by Admin. Please contact support to enable it.",
          code: "AUTO_MESSAGING_DISABLED_BY_ADMIN"
        }, { status: 403 });
      }

      const { enabled } = body;
      const updated = await prisma.businessProfile.update({
        where: { id: profile.id },
        data: {
          whatsappAutoBillEnabled: typeof enabled === "boolean" ? enabled : !profile.whatsappAutoBillEnabled,
        },
      });

      return NextResponse.json({
        success: true,
        autoBillEnabled: updated.whatsappAutoBillEnabled,
        message: updated.whatsappAutoBillEnabled 
          ? "WhatsApp Auto-Bill enabled successfully" 
          : "WhatsApp Auto-Bill paused",
      });
    }

    // 2. ACTION: RECHARGE WALLET
    if (action === "recharge") {
      const { amount, credits, description, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
      const rechargeAmount = Number(amount) || 0;
      const rechargeCredits = Number(credits) || Math.floor(rechargeAmount / (profile.whatsappCostPerMessage || 0.50));

      if (rechargeCredits <= 0) {
        return NextResponse.json({ error: "Invalid recharge amount or credits" }, { status: 400 });
      }

      // If Razorpay payment details are provided, verify signature
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      if (razorpay_payment_id && razorpay_order_id && razorpay_signature && key_secret) {
        const crypto = await import("crypto");
        const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generated_signature = crypto
          .createHmac("sha256", key_secret)
          .update(payload)
          .digest("hex");

        if (generated_signature !== razorpay_signature) {
          return NextResponse.json({ error: "Razorpay signature verification failed" }, { status: 400 });
        }
      }

      const currentCredits = profile.whatsappCredits ?? 0;
      const newCredits = currentCredits + rechargeCredits;
      const currentBalance = profile.whatsappBalance ?? 0;
      const newBalance = currentBalance + rechargeAmount;

      // Update Business Profile
      await prisma.businessProfile.update({
        where: { id: profile.id },
        data: {
          whatsappCredits: newCredits,
          whatsappBalance: newBalance,
        },
      });

      // Record Transaction under profile.userId / clerkId
      const targetUserId = profile.userId || clerkId;
      const refId = razorpay_payment_id || `REC_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const txn = await prisma.whatsAppWalletTransaction.create({
        data: {
          clerkUserId: targetUserId,
          type: "CREDIT",
          amount: rechargeAmount,
          credits: rechargeCredits,
          balanceAfter: newCredits,
          description: description || `Recharge ₹${rechargeAmount} (+${rechargeCredits} Messages)`,
          referenceId: refId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Wallet recharged with ${rechargeCredits} messages!`,
        wallet: {
          credits: newCredits,
          balance: newBalance,
        },
        transaction: txn,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[WHATSAPP_WALLET_POST]", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}


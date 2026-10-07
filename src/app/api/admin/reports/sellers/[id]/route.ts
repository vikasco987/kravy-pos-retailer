import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const seller = await prisma.user.findUnique({
      where: { clerkId: id },
      include: {
        profiles: true,
        bills: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 100, // Last 100 bills for performance
        },
      },
    });

    if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    const totalRevenue = seller.bills.reduce((sum, b) => sum + (b.total || 0), 0);
    const profile = seller.profiles[0];

    // Calculate daily activity for a small chart/timeline
    const activityMap: Record<string, number> = {};
    seller.bills.forEach(bill => {
      const date = bill.createdAt.toISOString().split('T')[0];
      activityMap[date] = (activityMap[date] || 0) + 1;
    });

    const timeline = Object.entries(activityMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      seller: {
        id: seller.clerkId,
        name: seller.name,
        email: seller.email,
        businessName: profile?.businessName || seller.name,
        businessAddress: profile?.businessAddress,
        contactPhone: profile?.contactPersonPhone || seller.phone,
        // SaaS Fields
        isPremium: profile?.isPremium,
        showPremiumPopup: profile?.showPremiumPopup,
        trialStartedAt: profile?.trialStartedAt,
        premiumEndDate: profile?.premiumEndDate,
        isFrozen: profile?.isFrozen,
        subscriptionAmountPaid: (seller.privateMetadata as any)?.subscriptionAmountPaid,
        secondaryEmails: seller.secondaryEmails || [],
        secondaryPhones: seller.secondaryPhones || [],
      },
      stats: {
        totalBills: seller.bills.length,
        totalRevenue,
      },
      bills: seller.bills,
      timeline,
    });
  } catch (err) {
    console.error("ADMIN SELLER DETAIL ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const updateData: any = {};
    if (body.isPremium !== undefined) {
      updateData.isPremium = body.isPremium;
      if (body.isPremium === true) {
        // Auto-unfreeze when upgrading to premium
        updateData.isFrozen = false;
        updateData.showPremiumPopup = false;
      }
    }
    if (body.showPremiumPopup !== undefined) updateData.showPremiumPopup = body.showPremiumPopup;
    if (body.isFrozen !== undefined) updateData.isFrozen = body.isFrozen;
    
    if (body.trialStartedAt) {
      const date = new Date(body.trialStartedAt);
      if (!isNaN(date.getTime())) {
        updateData.trialStartedAt = date;
      }
    }
    
    if (body.premiumEndDate !== undefined) {
      if (body.premiumEndDate === "") {
        updateData.premiumEndDate = null;
      } else {
        const date = new Date(body.premiumEndDate);
        if (!isNaN(date.getTime())) {
          updateData.premiumEndDate = date;
        }
      }
    }

    const result = await prisma.businessProfile.updateMany({
      where: { userId: id },
      data: updateData,
    });

    if (result.count === 0) {
      await prisma.businessProfile.create({
        data: {
          userId: id,
          ...updateData
        }
      });
    }
    
    if (body.subscriptionAmountPaid !== undefined) {
      const existingUser = await prisma.user.findUnique({ where: { clerkId: id }});
      if (existingUser) {
        const currentMeta = (existingUser.privateMetadata as any) || {};
        await prisma.user.update({
           where: { clerkId: id },
           data: {
              privateMetadata: {
                 ...currentMeta,
                 subscriptionAmountPaid: Number(body.subscriptionAmountPaid)
              }
           }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ADMIN SELLER UPDATE ERROR:", err);
    return NextResponse.json({ error: "Failed to update seller" }, { status: 500 });
  }
}

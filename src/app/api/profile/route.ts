import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =============================
   GET BUSINESS PROFILE
============================= */
async function ensureValidDates() {
  try {
    // We execute a raw MongoDB update command to fix null/missing fields directly in the DB
    // without fetching them to the client (which prevents type-conversion serialization crashes).
    await prisma.$runCommandRaw({
      update: "BusinessProfile",
      updates: [
        {
          q: { 
            $or: [ 
              { createdAt: null }, 
              { createdAt: { $exists: false } } 
            ] 
          },
          u: { 
            $set: { createdAt: { $date: new Date().toISOString() } } 
          },
          multi: true
        }
      ]
    });

    await prisma.$runCommandRaw({
      update: "BusinessProfile",
      updates: [
        {
          q: { 
            $or: [ 
              { updatedAt: null }, 
              { updatedAt: { $exists: false } } 
            ] 
          },
          u: { 
            $set: { updatedAt: { $date: new Date().toISOString() } } 
          },
          multi: true
        }
      ]
    });
    console.log("✨ Self-healed BusinessProfile dates.");
  } catch (err) {
    console.error("⚠️ Self-healing BusinessProfile dates failed:", err);
  }
}

export async function GET(request: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let profile = null;
    try {
      profile = await prisma.businessProfile.findFirst({
        where: { userId: effectiveId },
      });

      const user = await prisma.user.findUnique({
        where: { clerkId: effectiveId }
      });
      if (profile && user) {
        (profile as any).enableMultipleProfiles = user.enableMultipleProfiles;
        (profile as any).subscriptionAmountPaid = (user.privateMetadata as any)?.subscriptionAmountPaid || 4000;
      }
    } catch (e: any) {
      if (e.code === 'P2032' || e.message?.includes('createdAt') || e.message?.includes('updatedAt')) {
        console.log("⚠️ Prisma P2032 error detected. Running self-healing for missing dates...");
        await prisma.$runCommandRaw({
          update: "BusinessProfile",
          updates: [
            { q: { $or: [{ createdAt: null }, { createdAt: { $exists: false } }] }, u: { $set: { createdAt: { $date: new Date().toISOString() } } }, multi: true },
            { q: { $or: [{ updatedAt: null }, { updatedAt: { $exists: false } }] }, u: { $set: { updatedAt: { $date: new Date().toISOString() } } }, multi: true }
          ]
        });
        profile = await prisma.businessProfile.findFirst({
          where: { userId: effectiveId },
        });
        const user = await prisma.user.findUnique({
          where: { clerkId: effectiveId }
        });
        if (profile && user) {
          (profile as any).enableMultipleProfiles = user.enableMultipleProfiles;
          (profile as any).subscriptionAmountPaid = (user.privateMetadata as any)?.subscriptionAmountPaid || 4000;
        }
      } else {
        throw e;
      }
    }

    // SaaS Logic: Auto-trigger popup after trial period
    if (profile && !profile.isPremium && !profile.showPremiumPopup) {
      const settings = await prisma.systemSettings.findFirst();
      const trialDays = settings?.defaultTrialDays ?? 3;

      const trialStartedAt = profile.trialStartedAt || profile.createdAt;
      const trialEndsAt = new Date(trialStartedAt);
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      if (new Date() > trialEndsAt) {
        await prisma.businessProfile.update({
          where: { id: profile.id },
          data: { 
            showPremiumPopup: true,
            isFrozen: true 
          }
        });
        profile.showPremiumPopup = true;
        profile.isFrozen = true;
      }
    }

    if (profile) {
      const ps = (profile.printSettings as any) || {};
      if (profile.enableLoyaltyProgram === undefined || profile.enableLoyaltyProgram === null) {
        (profile as any).enableLoyaltyProgram = ps.enableLoyaltyProgram ?? true;
      }
      if (profile.loyaltyMinOrderAmount === undefined || profile.loyaltyMinOrderAmount === null) {
        (profile as any).loyaltyMinOrderAmount = ps.loyaltyMinOrderAmount ?? 0;
      }
      if (profile.loyaltyValueInRupees === undefined || profile.loyaltyValueInRupees === null) {
        (profile as any).loyaltyValueInRupees = ps.loyaltyValueInRupees ?? 1;
      }
      if (profile.maxRedeemPointsPerBill === undefined || profile.maxRedeemPointsPerBill === null) {
        (profile as any).maxRedeemPointsPerBill = ps.maxRedeemPointsPerBill ?? 500;
      }
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

/* =============================
   CREATE / UPDATE PROFILE
============================= */
export async function POST(request: Request) {
  console.log("API VERSION: 1.0.6 - Debug Status");
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try {
      const textBody = await request.text();
      if (textBody) {
        body = JSON.parse(textBody);
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // --- Data Sanitization ---
    const s = (val: any) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const trimmed = String(val).trim();
      return trimmed === "" ? null : trimmed;
    };
    const b = (val: any) => (typeof val === 'boolean' ? val : (val === 'true' ? true : (val === 'false' ? false : undefined)));
    const n = (val: any) => {
      if (val === undefined || val === null || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    };

    const updateData: any = {};
    
    // ✅ Global toggle for multiple profiles
    if (body.enableMultipleProfiles !== undefined) {
      await prisma.user.update({
        where: { clerkId: effectiveId },
        data: { enableMultipleProfiles: b(body.enableMultipleProfiles) }
      });
    }

    // ✅ QR Ordering Status & Timing (MOVE TO TOP FOR PRIORITY)
    console.log("SERVER DEBUG: body.isOnline =", body.isOnline, "Type =", typeof body.isOnline);
    if (body.isOnline !== undefined) updateData.isOnline = b(body.isOnline);
    if (body.openingTime !== undefined) updateData.openingTime = s(body.openingTime);
    if (body.closingTime !== undefined) updateData.closingTime = s(body.closingTime);
    if (body.offlineMessage !== undefined) updateData.offlineMessage = s(body.offlineMessage);

    // Basic Info
    if (body.businessType !== undefined) updateData.businessType = s(body.businessType);
    if (body.businessName !== undefined) updateData.businessName = s(body.businessName);
    if (body.businessTagline !== undefined || body.businessTagLine !== undefined) {
      updateData.businessTagLine = s(body.businessTagline ?? body.businessTagLine);
    }

    // Contact
    if (body.contactName !== undefined || body.contactPersonName !== undefined) {
      updateData.contactPersonName = s(body.contactName ?? body.contactPersonName);
    }
    if (body.contactPhone !== undefined || body.contactPersonPhone !== undefined) {
      updateData.contactPersonPhone = s(body.contactPhone ?? body.contactPersonPhone);
    }
    if (body.contactEmail !== undefined || body.contactPersonEmail !== undefined) {
      updateData.contactPersonEmail = s(body.contactEmail ?? body.contactPersonEmail);
    }
    // Only include businessEmail IF explicitly provided, otherwise let it be null/omit
    if (body.businessEmail !== undefined) updateData.businessEmail = s(body.businessEmail);
    if (body.upi !== undefined) updateData.upi = s(body.upi);

    // Images
    if (body.profileImage !== undefined || body.profileImageUrl !== undefined) {
      updateData.profileImageUrl = s(body.profileImage ?? body.profileImageUrl);
    }
    if (body.logo !== undefined || body.logoUrl !== undefined) {
      updateData.logoUrl = s(body.logo ?? body.logoUrl);
    }
    if (body.signature !== undefined || body.signatureUrl !== undefined) {
      updateData.signatureUrl = s(body.signature ?? body.signatureUrl);
    }

    // Address & Tax
    if (body.gstNumber !== undefined) updateData.gstNumber = s(body.gstNumber);
    if (body.businessAddress !== undefined) updateData.businessAddress = s(body.businessAddress);
    if (body.state !== undefined) updateData.state = s(body.state);
    if (body.district !== undefined) updateData.district = s(body.district);
    if (body.pinCode !== undefined) updateData.pinCode = s(body.pinCode);
    
    if (body.taxEnabled !== undefined) updateData.taxEnabled = b(body.taxEnabled);
    if (body.taxInclusive !== undefined) updateData.taxInclusive = b(body.taxInclusive);
    if (body.taxRate !== undefined) updateData.taxRate = n(body.taxRate);
    if (body.upiQrEnabled !== undefined) updateData.upiQrEnabled = b(body.upiQrEnabled);
    if (body.menuLinkEnabled !== undefined) updateData.menuLinkEnabled = b(body.menuLinkEnabled);
    if (body.greetingMessage !== undefined) updateData.greetingMessage = s(body.greetingMessage);
    if (body.businessNameSize !== undefined) updateData.businessNameSize = s(body.businessNameSize);
    if (body.fssaiNumber !== undefined) updateData.fssaiNumber = s(body.fssaiNumber);
    if (body.fssaiEnabled !== undefined) updateData.fssaiEnabled = b(body.fssaiEnabled);
    if (body.hsnEnabled !== undefined) updateData.hsnEnabled = b(body.hsnEnabled);
    if (body.enableMenuQRInBill !== undefined) updateData.enableMenuQRInBill = b(body.enableMenuQRInBill);

    // ✅ QR Menu Checkout Payment Visibility Settings
    if (body.qrPayCashEnabled !== undefined) updateData.qrPayCashEnabled = b(body.qrPayCashEnabled);
    if (body.qrPayUpiEnabled !== undefined) updateData.qrPayUpiEnabled = b(body.qrPayUpiEnabled);
    if (body.qrPayCardEnabled !== undefined) updateData.qrPayCardEnabled = b(body.qrPayCardEnabled);
    if (body.enableClerkAuth !== undefined) updateData.enableClerkAuth = b(body.enableClerkAuth);
    if (body.enableCustomAuth !== undefined) updateData.enableCustomAuth = b(body.enableCustomAuth);
    
    // Inventory Settings
    if (body.enableSerialNumber !== undefined) updateData.enableSerialNumber = b(body.enableSerialNumber);
    if (body.isStockCompulsory !== undefined) updateData.isStockCompulsory = b(body.isStockCompulsory);
    if (body.tokenNumberSize !== undefined) updateData.tokenNumberSize = n(body.tokenNumberSize);
    if (body.businessAddressSize !== undefined) updateData.businessAddressSize = n(body.businessAddressSize);

    // ✅ TAX & PRICING (MISSING FIELDS FIX)
    if (body.perProductTaxEnabled !== undefined) updateData.perProductTaxEnabled = b(body.perProductTaxEnabled);
    if (body.qrMenuPriceInclusive !== undefined) updateData.qrMenuPriceInclusive = b(body.qrMenuPriceInclusive);
    if (body.enableKOTWithBill !== undefined) updateData.enableKOTWithBill = b(body.enableKOTWithBill);
    if (body.syncQuickPosWithKitchen !== undefined) updateData.syncQuickPosWithKitchen = b(body.syncQuickPosWithKitchen);
    
    // ✅ ADDITIONAL CHARGES
    if (body.enableDeliveryCharges !== undefined) updateData.enableDeliveryCharges = b(body.enableDeliveryCharges);
    if (body.deliveryChargeAmount !== undefined) updateData.deliveryChargeAmount = n(body.deliveryChargeAmount);
    if (body.deliveryGstEnabled !== undefined) updateData.deliveryGstEnabled = b(body.deliveryGstEnabled);
    if (body.deliveryGstRate !== undefined) updateData.deliveryGstRate = n(body.deliveryGstRate);
    
    if (body.enablePackagingCharges !== undefined) updateData.enablePackagingCharges = b(body.enablePackagingCharges);
    if (body.packagingChargeAmount !== undefined) updateData.packagingChargeAmount = n(body.packagingChargeAmount);
    if (body.packagingGstEnabled !== undefined) updateData.packagingGstEnabled = b(body.packagingGstEnabled);
    if (body.packagingGstRate !== undefined) updateData.packagingGstRate = n(body.packagingGstRate);

    // ✅ QR SPECIFIC CHARGES
    if (body.qrDeliveryChargeEnabled !== undefined) updateData.qrDeliveryChargeEnabled = b(body.qrDeliveryChargeEnabled);
    if (body.qrDeliveryChargeAmount !== undefined) updateData.qrDeliveryChargeAmount = n(body.qrDeliveryChargeAmount);
    if (body.qrPackagingChargeEnabled !== undefined) updateData.qrPackagingChargeEnabled = b(body.qrPackagingChargeEnabled);
    if (body.qrPackagingChargeAmount !== undefined) updateData.qrPackagingChargeAmount = n(body.qrPackagingChargeAmount);

    // POS Checkout Visibility
    if (body.posCashEnabled !== undefined) updateData.posCashEnabled = b(body.posCashEnabled);
    if (body.posUpiEnabled !== undefined) updateData.posUpiEnabled = b(body.posUpiEnabled);
    if (body.posCardEnabled !== undefined) updateData.posCardEnabled = b(body.posCardEnabled);

    // ✅ SaaS Subscription & Premium Popups
    if (body.isPremium !== undefined) updateData.isPremium = b(body.isPremium);
    if (body.showPremiumPopup !== undefined) updateData.showPremiumPopup = b(body.showPremiumPopup);
    if (body.trialStartedAt !== undefined) updateData.trialStartedAt = new Date(body.trialStartedAt);
    if (body.posHoldEnabled !== undefined) updateData.posHoldEnabled = b(body.posHoldEnabled);
    if (body.posSaveEnabled !== undefined) updateData.posSaveEnabled = b(body.posSaveEnabled);
    if (body.posPreviewEnabled !== undefined) updateData.posPreviewEnabled = b(body.posPreviewEnabled);
    if (body.posKotEnabled !== undefined) updateData.posKotEnabled = b(body.posKotEnabled);
    if (body.enableFuelBilling !== undefined) updateData.enableFuelBilling = b(body.enableFuelBilling);

    // ✅ MISC SETTINGS
    if (body.gstType !== undefined) updateData.gstType = s(body.gstType);
    if (body.servedStatusLabel !== undefined) updateData.servedStatusLabel = s(body.servedStatusLabel);
    if (body.collectCustomerName !== undefined) updateData.collectCustomerName = b(body.collectCustomerName);
    if (body.requireCustomerName !== undefined) updateData.requireCustomerName = b(body.requireCustomerName);
    if (body.collectCustomerPhone !== undefined) updateData.collectCustomerPhone = b(body.collectCustomerPhone);
    if (body.requireCustomerPhone !== undefined) updateData.requireCustomerPhone = b(body.requireCustomerPhone);
    if (body.collectCustomerAddress !== undefined) updateData.collectCustomerAddress = b(body.collectCustomerAddress);
    if (body.requireCustomerAddress !== undefined) updateData.requireCustomerAddress = b(body.requireCustomerAddress);
    if (body.loyaltyPointRatio !== undefined) updateData.loyaltyPointRatio = n(body.loyaltyPointRatio);
    if (body.loyaltyMinRedeem !== undefined) updateData.loyaltyMinRedeem = n(body.loyaltyMinRedeem);
    if (body.enableFuelBilling !== undefined) updateData.enableFuelBilling = b(body.enableFuelBilling);

    if (body.enableLoyaltyProgram !== undefined) updateData.enableLoyaltyProgram = b(body.enableLoyaltyProgram);
    if (body.loyaltyMinOrderAmount !== undefined) updateData.loyaltyMinOrderAmount = n(body.loyaltyMinOrderAmount);
    if (body.loyaltyValueInRupees !== undefined) updateData.loyaltyValueInRupees = n(body.loyaltyValueInRupees);
    if (body.maxRedeemPointsPerBill !== undefined) updateData.maxRedeemPointsPerBill = n(body.maxRedeemPointsPerBill);
    if (body.aiScraperEnabled !== undefined) updateData.aiScraperEnabled = b(body.aiScraperEnabled);
    if (body.excelImportEnabled !== undefined) updateData.excelImportEnabled = b(body.excelImportEnabled);
    if (body.multiZoneMenuEnabled !== undefined) updateData.multiZoneMenuEnabled = b(body.multiZoneMenuEnabled);
    if (body.expiryTrackingEnabled !== undefined) updateData.expiryTrackingEnabled = b(body.expiryTrackingEnabled);
    if (body.phonePrefixType !== undefined) updateData.phonePrefixType = s(body.phonePrefixType);
    if (body.customUnits !== undefined) updateData.customUnits = body.customUnits;
    
    // ✅ QR Menu Settings
    if (body.qrMenuShowDetails !== undefined) updateData.qrMenuShowDetails = b(body.qrMenuShowDetails);
    if (body.qrMenuCuisines !== undefined) updateData.qrMenuCuisines = s(body.qrMenuCuisines);
    if (body.qrMenuRating !== undefined) updateData.qrMenuRating = s(body.qrMenuRating);
    if (body.qrMenuDeliveryTime !== undefined) updateData.qrMenuDeliveryTime = s(body.qrMenuDeliveryTime);
    if (body.qrMenuCostForTwo !== undefined) updateData.qrMenuCostForTwo = s(body.qrMenuCostForTwo);

    if (body.printSettings !== undefined) updateData.printSettings = body.printSettings;
    if (body.allowWalletEditDelete !== undefined || body.enableVirtualGroupVariants !== undefined || body.enableLoyaltyProgram !== undefined || body.loyaltyMinOrderAmount !== undefined || body.loyaltyValueInRupees !== undefined || body.maxRedeemPointsPerBill !== undefined) {
      updateData.printSettings = {
        ...((updateData.printSettings as any) || {}),
        ...(body.allowWalletEditDelete !== undefined ? { allowWalletEditDelete: b(body.allowWalletEditDelete) } : {}),
        ...(body.enableVirtualGroupVariants !== undefined ? { enableVirtualGroupVariants: b(body.enableVirtualGroupVariants) } : {}),
        ...(body.enableLoyaltyProgram !== undefined ? { enableLoyaltyProgram: b(body.enableLoyaltyProgram) } : {}),
        ...(body.loyaltyMinOrderAmount !== undefined ? { loyaltyMinOrderAmount: n(body.loyaltyMinOrderAmount) } : {}),
        ...(body.loyaltyValueInRupees !== undefined ? { loyaltyValueInRupees: n(body.loyaltyValueInRupees) } : {}),
        ...(body.maxRedeemPointsPerBill !== undefined ? { maxRedeemPointsPerBill: n(body.maxRedeemPointsPerBill) } : {})
      };
    }
    if (body.reviewUrl !== undefined) updateData.reviewUrl = s(body.reviewUrl);

    console.log("SERVER DEBUG: Final Update Data:", JSON.stringify(updateData, null, 2));

    // ✅ FIX: Find specific profile if body.id is provided, otherwise find the first one unless it's a new profile
    const existingProfile = body.id 
      ? await prisma.businessProfile.findFirst({ where: { id: body.id, userId: effectiveId } })
      : (body.isNewProfile ? null : await prisma.businessProfile.findFirst({ where: { userId: effectiveId } }));

    let profile;
    if (existingProfile) {
      const fieldCount = Object.keys(updateData).length;
      
      if (fieldCount > 40) {
        // Split updates to avoid MongoDB Atlas pipeline limit
        const keys = Object.keys(updateData);
        const half = Math.ceil(keys.length / 2);
        const chunk1: any = {};
        const chunk2: any = {};
        
        keys.forEach((key, idx) => {
          if (idx < half) chunk1[key] = updateData[key];
          else chunk2[key] = updateData[key];
        });

        // Update in two chunks
        await prisma.businessProfile.update({
          where: { id: existingProfile.id },
          data: chunk1
        });
        profile = await prisma.businessProfile.update({
          where: { id: existingProfile.id },
          data: chunk2
        });
      } else {
        profile = await prisma.businessProfile.update({
          where: { id: existingProfile.id },
          data: updateData
        });
      }
    } else {
      profile = await prisma.businessProfile.create({
        data: {
          ...updateData, // Use the fields we have in updateData
          userId: effectiveId,
          // Ensure mandatory fields have defaults if missing in updateData
          businessName: updateData.businessName ?? s(body.businessName) ?? "My Business",
          taxEnabled: updateData.taxEnabled ?? b(body.taxEnabled) ?? false,
          taxInclusive: updateData.taxInclusive ?? b(body.taxInclusive) ?? false,
          taxRate: updateData.taxRate ?? n(body.taxRate) ?? 5.0,
          upiQrEnabled: updateData.upiQrEnabled ?? b(body.upiQrEnabled) ?? true,
          menuLinkEnabled: updateData.menuLinkEnabled ?? b(body.menuLinkEnabled) ?? true,
          greetingMessage: updateData.greetingMessage ?? s(body.greetingMessage) ?? "Thank You 🙏 Visit Again!",
          businessNameSize: updateData.businessNameSize ?? s(body.businessNameSize) ?? "large",
          tokenNumberSize: updateData.tokenNumberSize ?? n(body.tokenNumberSize) ?? 22,
          gstType: updateData.gstType ?? s(body.gstType) ?? "PRODUCT",
        }
      });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/profile error DETAILS:", error);
    return NextResponse.json(
      { 
        error: "Failed to save profile", 
        details: error.message || String(error),
        code: error.code 
      },
      { status: 500 }
    );
  }
}

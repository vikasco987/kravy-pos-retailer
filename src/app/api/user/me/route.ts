import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // priority 1: Assigned Permissions from Auth object (User model or Staff model)
    let finalAllowed: string[] = authUser.permissions || [];

    // priority 2: If no individual permissions, check GLOBAL Role-based permissions
    if (finalAllowed.length === 0) {
      const globalPerms = await (prisma as any).rolePermission.findUnique({
        where: { role: authUser.role }
      });
      if (globalPerms) {
        finalAllowed = globalPerms.allowedPaths;
      }
    }

    // priority 3: Fallback Hardcoded Defaults (if still empty)
    const isPrivileged = authUser.type === "OWNER" || authUser.type === "ADMIN" || authUser.type === "SELLER" || authUser.type === "USER";
    
    if (finalAllowed.length === 0) {
      if (isPrivileged) {
        finalAllowed = [
          "/dashboard", 
          "/dashboard/billing/checkout", 
          "/dashboard/tables", 
          "/dashboard/billing", 
          "/dashboard/terminal",
          "/dashboard/kitchen",
          "/dashboard/menu/view", 
          "/dashboard/menu-editor",
          "/dashboard/menu/addons",
          "/dashboard/menu/upload", 
          "/dashboard/store-item-upload", 
          "/dashboard/menu/edit", 
          "/dashboard/parties",
          "/dashboard/staff",
          "/dashboard/inventory", 
          "/dashboard/qr-orders",
          "/dashboard/combos",
          "/dashboard/gallery",
          "/dashboard/profile",
          "/dashboard/settings", 
          "/dashboard/settings/tax",
          "/dashboard/billing/deleted",
          "/dashboard/reports/gst",
          "/dashboard/ai-scraper",
          "/dashboard/settings/advanced"
        ];
      } else {
        finalAllowed = [
          "/dashboard", 
          "/dashboard/billing/checkout", 
          "/dashboard/tables", 
          "/dashboard/billing", 
          "/dashboard/menu/view", 
          "/dashboard/qr-orders",
          "/dashboard/help"
        ];
      }
    }

    // priority 4: Expand mobile app group permissions into actual URL paths
    const PERMISSION_MAPPING: Record<string, string[]> = {
      "Dashboard Permissions": ["/dashboard"],
      "Order & Billing Permissions": ["/dashboard/billing/checkout", "/dashboard/terminal", "/dashboard/kitchen", "/dashboard/tables"],
      "Invoices & Receipts": ["/dashboard/billing", "/dashboard/billing/deleted"],
      "Customer Permissions": ["/dashboard/parties"],
      "Menu & Items Permissions": ["/dashboard/menu/view", "/dashboard/menu-editor", "/dashboard/menu/addons", "/dashboard/menu/upload", "/dashboard/store-item-upload", "/dashboard/menu/edit", "/dashboard/inventory"],
      "AI Intelligence Tools": ["/dashboard/ai-scraper"],
      "Report Permissions": ["/dashboard/reports/sales/daily", "/dashboard/reports/gst"],
      "Settings Permissions": ["/dashboard/profile", "/dashboard/settings", "/dashboard/settings/tax", "/dashboard/staff", "/dashboard/settings/advanced"]
    };

    // Include original permissions (for mobile app logic) AND expand them (for website sidebar)
    let expandedAllowed: string[] = [...finalAllowed]; 
    finalAllowed.forEach(p => {
      if (PERMISSION_MAPPING[p]) {
        expandedAllowed = [...expandedAllowed, ...PERMISSION_MAPPING[p]];
      }
    });

    // Ensure uniqueness, and include the expanded paths
    const finalPaths = [...new Set(expandedAllowed)];

    // Fetch full user details from DB to include new fields
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        imageUrl: true,
        secondaryEmails: true,
        secondaryPhones: true,
        phone: true,
        uiPreferences: true,
        privateMetadata: true,
      }
    });

    const staff = !user ? await prisma.staff.findUnique({
      where: { id: authUser.id },
      select: { privateMetadata: true }
    }) : null;

    const metadata: any = user?.privateMetadata || staff?.privateMetadata || {};
    const hiddenSidebarItems = metadata.hiddenSidebarItems || [];

    return NextResponse.json({ 
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: user?.phone || "",
        imageUrl: user?.imageUrl || null,
        secondaryEmails: user?.secondaryEmails || [],
        secondaryPhones: user?.secondaryPhones || [],
        role: authUser.type, // Maintain original role for frontend
        businessId: authUser.businessId,
        allowedPaths: finalPaths,
        uiPreferences: user?.uiPreferences || {},
        hiddenSidebarItems
    });

  } catch (error) {
    console.error("USER/ME ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch user: " + String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, phone, imageUrl, secondaryEmails, secondaryPhones, uiPreferences } = body;

    // Check uniqueness for any NEW identifiers
    if (secondaryEmails || secondaryPhones) {
       const allNew = [...(secondaryEmails || []), ...(secondaryPhones || [])];
       for (const ident of allNew) {
          const cleanIdent = ident.trim().toLowerCase();
          const existing = await prisma.user.findFirst({
            where: {
               OR: [
                 { email: cleanIdent },
                 { phone: cleanIdent },
                 { secondaryEmails: { has: cleanIdent } },
                 { secondaryPhones: { has: cleanIdent } }
               ],
               NOT: { id: authUser.id }
            }
          });
          if (existing) {
            return NextResponse.json({ error: `The identifier "${ident}" is already in use by another account.` }, { status: 400 });
          }
       }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone.replace(/\D/g, '') : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        secondaryEmails: secondaryEmails !== undefined ? secondaryEmails.map((e: string) => e.trim().toLowerCase()) : undefined,
        secondaryPhones: secondaryPhones !== undefined ? secondaryPhones.map((p: string) => p.replace(/\D/g, '')) : undefined,
        uiPreferences: uiPreferences !== undefined ? uiPreferences : undefined,
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        imageUrl: updatedUser.imageUrl,
        secondaryEmails: updatedUser.secondaryEmails,
        secondaryPhones: updatedUser.secondaryPhones,
        uiPreferences: updatedUser.uiPreferences
      }
    });
  } catch (error) {
    console.error("USER/ME PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}

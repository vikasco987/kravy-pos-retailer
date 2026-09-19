import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Get effective Clerk user
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2️⃣ Fetch menu items for this clerk
    const items = await prisma.item.findMany({
      where: {
        clerkId: effectiveId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        price: true,
        sellingPrice: true,
        gst: true,
        taxStatus: true,
        imageUrl: true,
        isActive: true,
        isVeg: true,
        isEgg: true,
        hsnCode: true,
        shortCode: true,
        inventoryCode: true,
        barcode: true,
        zones: true,
        variants: true,
        addonGroupIds: true,
        packagingCharges: true,
        category: {
          select: {
            id: true,
            name: true,
            sortOrder: true
          }
        }
      },
    });

    // 3️⃣ Return array directly (IMPORTANT)
    return NextResponse.json(items);
  } catch (error: any) {
  console.error("MENU VIEW ERROR:", error);
  return NextResponse.json(
    { 
      error: "Failed to fetch menu items",
      message: error?.message || "Unknown error"
    },
    { status: 500 }
  );
}
}

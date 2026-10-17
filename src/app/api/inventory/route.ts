import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export async function GET(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.item.findMany({
      where: { clerkId: effectiveId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        reorderLevel: true,
        openingStock: true,
        unit: true,
        price: true,
        sellingPrice: true,
        categoryId: true,
        barcode: true,
        inventoryCode: true,
        taxStatus: true,
        gst: true,
        hsnCode: true,
        zones: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("INVENTORY GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // 🟢 Dedicated Bulk Update Support for Inventory / Add-Stock
    if (body.items && Array.isArray(body.items)) {
      const updates = body.items;
      if (updates.length === 0) {
        return NextResponse.json({ error: "No items provided for update" }, { status: 400 });
      }

      if (updates.length > 500) {
        return NextResponse.json({ error: "Batch size exceeds limit of 500 items" }, { status: 400 });
      }

      const results: { id: string; success: boolean; currentStock?: number; reorderLevel?: number; error?: string }[] = [];

      // Deduplicate updates by ID, keeping the latest entry
      const seenMap = new Map<string, any>();
      for (const entry of updates) {
        if (entry && entry.id) {
          seenMap.set(String(entry.id), entry);
        } else {
          results.push({ id: "unknown", success: false, error: "Item ID missing" });
        }
      }

      for (const [id, entry] of seenMap.entries()) {
        const parsedStock = entry.currentStock !== undefined ? Number(entry.currentStock) : undefined;
        const parsedReorder = entry.reorderLevel !== undefined ? Number(entry.reorderLevel) : undefined;
        const parsedOpening = entry.openingStock !== undefined ? Number(entry.openingStock) : undefined;

        if (
          (parsedStock !== undefined && (isNaN(parsedStock) || parsedStock < 0)) ||
          (parsedReorder !== undefined && (isNaN(parsedReorder) || parsedReorder < 0)) ||
          (parsedOpening !== undefined && (isNaN(parsedOpening) || parsedOpening < 0))
        ) {
          results.push({ id, success: false, error: "Invalid numeric stock/reorder values" });
          continue;
        }

        try {
          // Ownership verification & update in one atomic query with clerkId check
          const updated = await prisma.item.update({
            where: { id, clerkId: effectiveId },
            data: {
              currentStock: parsedStock,
              reorderLevel: parsedReorder,
              openingStock: parsedOpening,
            },
            select: {
              id: true,
              currentStock: true,
              reorderLevel: true,
            },
          });

          results.push({
            id: updated.id,
            success: true,
            currentStock: updated.currentStock ?? 0,
            reorderLevel: updated.reorderLevel ?? 0,
          });
        } catch (err: any) {
          console.error(`Failed to bulk-update item ${id}:`, err);
          results.push({ id, success: false, error: err?.message || "Update failed" });
        }
      }

      try {
        revalidateTag(`menu-${effectiveId}`);
      } catch (e) {
        // Safe revalidation catch
      }

      const hasFailures = results.some((r) => !r.success);
      return NextResponse.json({
        success: !hasFailures,
        updatedCount: results.filter((r) => r.success).length,
        results,
      });
    }

    // Single item update
    const { id, currentStock, reorderLevel, openingStock } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const updated = await prisma.item.update({
      where: { id, clerkId: effectiveId },
      data: {
        currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
        reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : undefined,
        openingStock: openingStock !== undefined ? Number(openingStock) : undefined,
      },
      select: {
        id: true,
        currentStock: true,
        reorderLevel: true,
        openingStock: true,
      },
    });

    try {
      revalidateTag(`menu-${effectiveId}`);
    } catch (e) {}

    return NextResponse.json(updated);
  } catch (error) {
    console.error("INVENTORY UPDATE ERROR:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * POST /api/orders/merge
 * Merges multiple active orders on the same table (or specified target order) into a single unified order.
 * Combines all items, KOT numbers, and totals so a single bill can be printed.
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetOrderId, sourceOrderIds, tableId, note } = body;

    if (!targetOrderId) {
      return NextResponse.json(
        { error: "Target order ID is required" },
        { status: 400 }
      );
    }

    if (!sourceOrderIds || !Array.isArray(sourceOrderIds) || sourceOrderIds.length === 0) {
      return NextResponse.json(
        { error: "At least one source order must be selected to merge" },
        { status: 400 }
      );
    }

    // Filter out targetOrderId if accidentally included in sourceOrderIds
    const cleanedSourceIds = sourceOrderIds.filter((id: string) => id !== targetOrderId);
    if (cleanedSourceIds.length === 0) {
      return NextResponse.json(
        { error: "Source orders must be different from target order" },
        { status: 400 }
      );
    }

    // 1. Fetch Target Order
    const targetOrder = await prisma.order.findFirst({
      where: {
        id: targetOrderId,
        clerkUserId: effectiveId,
        isDeleted: false,
      },
      include: { table: true },
    });

    if (!targetOrder) {
      return NextResponse.json(
        { error: "Target order not found or already completed/deleted" },
        { status: 404 }
      );
    }

    // 2. Fetch Source Orders
    const sourceOrders = await prisma.order.findMany({
      where: {
        id: { in: cleanedSourceIds },
        clerkUserId: effectiveId,
        isDeleted: false,
      },
      include: { table: true },
      orderBy: { createdAt: "asc" },
    });

    if (sourceOrders.length === 0) {
      return NextResponse.json(
        { error: "No active source orders found to merge" },
        { status: 404 }
      );
    }

    // 3. Extract and combine items
    let combinedItems: any[] = Array.isArray(targetOrder.items)
      ? [...(targetOrder.items as any[])]
      : [];

    let combinedKotNumbers: number[] = Array.isArray(targetOrder.kotNumbers)
      ? [...targetOrder.kotNumbers]
      : [];

    if (targetOrder.tokenNumber) {
      const num = Number(targetOrder.tokenNumber);
      if (!isNaN(num)) combinedKotNumbers.push(num);
    }

    const mergedOrderIds: string[] = [targetOrder.id];

    // Combine items from each source order
    for (const srcOrder of sourceOrders) {
      mergedOrderIds.push(srcOrder.id);
      const srcItems = Array.isArray(srcOrder.items) ? (srcOrder.items as any[]) : [];
      const srcTokenLabel = srcOrder.tokenNumber ? `#${srcOrder.tokenNumber}` : srcOrder.id.slice(-4);

      for (const it of srcItems) {
        combinedItems.push({
          ...it,
          fromOrderToken: srcTokenLabel,
          addedInCase: "order_merge",
          mergedFromOrderId: srcOrder.id,
        });
      }

      if (Array.isArray(srcOrder.kotNumbers)) {
        combinedKotNumbers.push(...srcOrder.kotNumbers);
      } else if (srcOrder.tokenNumber) {
        const num = Number(srcOrder.tokenNumber);
        if (!isNaN(num)) combinedKotNumbers.push(num);
      }

      // Mark source order as completed & merged so it drops from active list
      await prisma.order.update({
        where: { id: srcOrder.id },
        data: {
          status: "COMPLETED",
          isMerged: true,
          mergedAt: new Date(),
          parentOrderId: targetOrder.id,
          isDeleted: true,
          deletedAt: new Date(),
          deletedSnapshot: {
            reason: "MERGED_INTO_ORDER",
            targetOrderId: targetOrder.id,
            targetTableId: targetOrder.tableId,
            tableId: srcOrder.tableId || tableId,
            mergedAt: new Date().toISOString(),
          },
        },
      });
    }

    // 4. Recalculate combined subtotal & total
    const newSubtotal = combinedItems.reduce((acc: number, it: any) => {
      const p = Number(it.price || it.rate || 0);
      const q = Number(it.quantity || it.qty || 1);
      return acc + (p * q);
    }, 0);

    // Combine KOT numbers deduplicated
    const uniqueKotNumbers: number[] = Array.from(
      new Set(combinedKotNumbers.filter((n) => typeof n === "number" && !isNaN(n)))
    );

    // Notes combination
    const mergeNote = `[Merged ${sourceOrders.length} order(s)]`;
    const finalNotes = note
      ? `${note} - ${mergeNote} ${targetOrder.notes || ""}`.trim()
      : `${mergeNote} ${targetOrder.notes || ""}`.trim();

    // 5. Update Target Order
    const updatedTargetOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        items: combinedItems,
        total: newSubtotal,
        notes: finalNotes,
        kotNumbers: uniqueKotNumbers,
        isMerged: true,
        mergedAt: new Date(),
        caseType: "order_merge",
        relatedOrders: mergedOrderIds,
      },
    });

    // 6. Log activity
    try {
      const user = await prisma.user.findUnique({ where: { clerkId: effectiveId } });
      if (user) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "MERGE_ORDERS",
            meta: JSON.stringify({
              tableName: targetOrder.table?.name || "Table",
              targetOrderId: targetOrder.id,
              sourceOrderIds: cleanedSourceIds,
              combinedItemsCount: combinedItems.length,
              newTotal: newSubtotal,
            }),
          },
        });
      }
    } catch (actErr) {
      console.warn("Failed to log order merge activity:", actErr);
    }

    return NextResponse.json({
      success: true,
      message: `${sourceOrders.length} order(s) successfully merged into Order #${targetOrder.tokenNumber || targetOrder.id.slice(-4)}!`,
      order: updatedTargetOrder,
      combinedItemsCount: combinedItems.length,
      grandTotal: newSubtotal,
    });
  } catch (error: any) {
    console.error("POST /api/orders/merge error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge orders" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

/**
 * POST /api/tables/merge
 * Merges one or more source tables into a primary table for Party Bookings.
 * Combines all active order items into a single unified bill on the primary table.
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { primaryTableId, sourceTableIds, partyNote } = body;

    if (!primaryTableId) {
      return NextResponse.json(
        { error: "Primary table ID is required" },
        { status: 400 }
      );
    }

    if (!sourceTableIds || !Array.isArray(sourceTableIds) || sourceTableIds.length === 0) {
      return NextResponse.json(
        { error: "At least one source table must be selected to merge" },
        { status: 400 }
      );
    }

    // Filter out primaryTableId from sourceTableIds if accidentally included
    const cleanedSourceIds = sourceTableIds.filter((id: string) => id !== primaryTableId);
    if (cleanedSourceIds.length === 0) {
      return NextResponse.json(
        { error: "Source tables must be different from primary table" },
        { status: 400 }
      );
    }

    // Fetch primary table
    const primaryTable = await prisma.table.findFirst({
      where: { id: primaryTableId, clerkUserId: effectiveId },
    });

    if (!primaryTable) {
      return NextResponse.json({ error: "Primary table not found" }, { status: 404 });
    }

    // Fetch source tables
    const sourceTables = await prisma.table.findMany({
      where: { id: { in: cleanedSourceIds }, clerkUserId: effectiveId },
    });

    if (sourceTables.length === 0) {
      return NextResponse.json({ error: "No valid source tables found" }, { status: 404 });
    }

    // Active orders criteria (matching terminal/active-summary, including SERVED orders)
    const activeOrderWhere = {
      clerkUserId: effectiveId,
      status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
      isDeleted: false,
    };

    // Fetch active order for primary table
    const primaryOrders = await prisma.order.findMany({
      where: {
        ...activeOrderWhere,
        tableId: primaryTableId,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch active orders for all source tables
    const sourceOrders = await prisma.order.findMany({
      where: {
        ...activeOrderWhere,
        tableId: { in: cleanedSourceIds },
      },
      orderBy: { createdAt: "asc" },
    });

    if (primaryOrders.length === 0 && sourceOrders.length === 0) {
      return NextResponse.json(
        { error: "No active running orders found on the selected primary or source tables." },
        { status: 400 }
      );
    }

    // If primary table has no active order, promote the first source order to primary table
    let targetOrder = primaryOrders[0];
    let ordersToMergeFrom = sourceOrders;

    if (!targetOrder) {
      const firstSource = sourceOrders[0];
      targetOrder = await prisma.order.update({
        where: { id: firstSource.id },
        data: {
          tableId: primaryTableId,
          notes: partyNote ? `Party: ${partyNote}` : firstSource.notes,
        },
      });
      ordersToMergeFrom = sourceOrders.slice(1);
    }

    // Extract existing items from target order
    let combinedItems: any[] = Array.isArray(targetOrder.items) ? [...(targetOrder.items as any[])] : [];
    let combinedKotNumbers: number[] = Array.isArray(targetOrder.kotNumbers) ? [...targetOrder.kotNumbers] : [];
    const mergedOrderIds: string[] = [targetOrder.id];
    const sourceTableNamesMap = new Map(sourceTables.map(t => [t.id, t.name]));

    // Loop through orders to merge into targetOrder
    for (const srcOrder of ordersToMergeFrom) {
      mergedOrderIds.push(srcOrder.id);
      const srcTableName = (srcOrder.tableId ? sourceTableNamesMap.get(srcOrder.tableId) : null) || "Other Table";
      const srcItems = Array.isArray(srcOrder.items) ? (srcOrder.items as any[]) : [];

      for (const it of srcItems) {
        combinedItems.push({
          ...it,
          fromTable: srcTableName,
          addedInCase: "table_merge",
          mergedFromOrderId: srcOrder.id,
        });
      }

      if (Array.isArray(srcOrder.kotNumbers)) {
        combinedKotNumbers.push(...srcOrder.kotNumbers);
      } else if (srcOrder.tokenNumber) {
        const num = Number(srcOrder.tokenNumber);
        if (!isNaN(num)) combinedKotNumbers.push(num);
      }

      // Mark source order as completed & merged so it no longer appears in active summary
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
            reason: "MERGED_INTO_TABLE",
            primaryTableId: primaryTable.id,
            primaryTableName: primaryTable.name,
            targetOrderId: targetOrder.id,
            mergedAt: new Date().toISOString(),
          },
        },
      });
    }

    // Recalculate grand total
    const newSubtotal = combinedItems.reduce((acc: number, it: any) => {
      const p = Number(it.price || it.rate || 0);
      const q = Number(it.quantity || it.qty || 1);
      return acc + (p * q);
    }, 0);

    // Notes combination
    const sourceNamesStr = sourceTables.map(t => t.name).join(", ");
    const mergeNote = `[Merged with Table ${sourceNamesStr} for Party Booking]`;
    const finalNotes = partyNote 
      ? `${partyNote} - ${mergeNote} ${targetOrder.notes || ""}`.trim()
      : `${mergeNote} ${targetOrder.notes || ""}`.trim();

    // Deduplicate KOT numbers
    const uniqueKotNumbers: number[] = Array.from(new Set(combinedKotNumbers.filter((n) => typeof n === "number" && !isNaN(n))));

    // Update target order with combined items and new total
    const updatedTargetOrder = await prisma.order.update({
      where: { id: targetOrder.id },
      data: {
        items: combinedItems,
        total: newSubtotal,
        notes: finalNotes,
        kotNumbers: uniqueKotNumbers,
        isMerged: true,
        mergedAt: new Date(),
        caseType: "table_merge",
        relatedOrders: mergedOrderIds,
      },
    });

    // Create Activity Log
    try {
      const user = await prisma.user.findUnique({ where: { clerkId: effectiveId } });
      if (user) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: "MERGE_TABLES",
            meta: JSON.stringify({
              primaryTable: primaryTable.name,
              sourceTables: sourceTables.map(t => t.name),
              targetOrderId: targetOrder.id,
              combinedItemsCount: combinedItems.length,
              newTotal: newSubtotal,
              partyNote: partyNote || null,
            }),
          },
        });
      }
    } catch (actErr) {
      console.warn("Failed to log merge activity:", actErr);
    }

    return NextResponse.json({
      success: true,
      message: `Table ${sourceNamesStr} successfully merged into ${primaryTable.name}!`,
      primaryTableId: primaryTable.id,
      primaryTableName: primaryTable.name,
      mergedOrderId: updatedTargetOrder.id,
      totalItems: combinedItems.length,
      grandTotal: newSubtotal,
      sourceTables: sourceTables.map(t => ({ id: t.id, name: t.name })),
    });

  } catch (error: any) {
    console.error("POST /api/tables/merge error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge tables" },
      { status: 500 }
    );
  }
}

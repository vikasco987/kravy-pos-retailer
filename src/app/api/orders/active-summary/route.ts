import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    try {
        const effectiveId = await getEffectiveClerkId();
        if (!effectiveId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tableId = searchParams.get("tableId");
        const rawLimit = searchParams.get("limit");
        const requestedLimit = Number(rawLimit);
        const limit = Math.min(
          Math.max(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100, 1),
          100
        );

        const pageParam = searchParams.get("page");
        const page = Math.max(Number(pageParam) || 1, 1);
        const skip = (page - 1) * limit;

        const now = new Date();
        const rolling24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sinceParam = searchParams.get("since");
        const sinceDate = sinceParam ? new Date(Number(sinceParam) || sinceParam) : null;

        const whereClause: any = {
            clerkUserId: effectiveId,
            ...(tableId ? { tableId } : {}),
            status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] },
            isDeleted: false,
            createdAt: {
                gte: rolling24HoursAgo
            },
            ...(sinceDate && !isNaN(sinceDate.getTime()) ? { updatedAt: { gte: sinceDate } } : {})
        };

        const orders = await prisma.order.findMany({
            where: whereClause,
            take: limit,
            skip: skip,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                orderNumber: true,
                items: true,
                total: true,
                status: true,
                tableId: true,
                table: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdAt: true,
                updatedAt: true,
                isDeleted: true,
                kotNumbers: true,
                tokenNumber: true,
                notes: true,
                preferences: true,
                isKotPrinted: true,
                isBillPrinted: true
            }
        });

        const authUser = await getAuthUser();
        let canViewPhone = true;
        if (authUser && authUser.role !== 'ADMIN' && authUser.role !== 'SELLER' && authUser.role !== 'OWNER' && authUser.role !== 'USER') {
          canViewPhone = authUser.permissions?.includes("view-customer-phone") || false;
        }

        const modifiedOrders = orders.map(order => {
            let mappedItems = order.items;
            if (Array.isArray(order.items)) {
                mappedItems = (order.items as any[]).map(item => {
                    const newItem: any = {};
                    if (item.id !== undefined) newItem.id = item.id;
                    if (item.itemId !== undefined) newItem.itemId = item.itemId;
                    if (item.name !== undefined) newItem.name = item.name;
                    if (item.quantity !== undefined) newItem.quantity = item.quantity;
                    if (item.qty !== undefined) newItem.qty = item.qty;
                    if (item.price !== undefined) newItem.price = item.price;
                    if (item.rate !== undefined) newItem.rate = item.rate;
                    if (item.taxStatus !== undefined) newItem.taxStatus = item.taxStatus;
                    if (item.gst !== undefined) newItem.gst = item.gst;
                    if (item.isVeg !== undefined) newItem.isVeg = item.isVeg;
                    if (item.kotNumber !== undefined) newItem.kotNumber = item.kotNumber;
                    if (item.isNew !== undefined) newItem.isNew = item.isNew;
                    if (item.variants !== undefined) newItem.variants = item.variants;
                    if (item.instruction !== undefined) newItem.instruction = item.instruction;
                    if (item.isPrepared !== undefined) newItem.isPrepared = item.isPrepared;
                    if (item.preparedAt !== undefined) newItem.preparedAt = item.preparedAt;
                    if (item.category !== undefined) newItem.category = item.category;
                    if (item.categoryName !== undefined) newItem.categoryName = item.categoryName;
                    return newItem;
                });
            }

            const finalOrder = { ...order, items: mappedItems };
            if (!canViewPhone) {
                finalOrder.customerPhone = "";
            }
            return finalOrder;
        });

        return NextResponse.json(modifiedOrders);
    } catch (error) {
        console.error("GET_ORDERS_SUMMARY_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch orders summary", details: String(error) }, { status: 500 });
    }
}

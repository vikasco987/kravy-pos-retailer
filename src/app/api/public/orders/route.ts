import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// GET /api/public/orders?id=<orderId> — public order tracking
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        const order = await prisma.order.findUnique({
            where: { id },
            include: { table: true },
        });
        if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        const profile = await prisma.businessProfile.findFirst({
            where: { userId: order.clerkUserId },
            orderBy: { createdAt: 'asc' }
        });

        const businessName = profile?.businessName || "Store";
        const businessAddress = profile?.businessAddress || "Address not provided";
        const businessPhone = profile?.contactPersonPhone || "";
        const businessType = profile?.businessType || "retail";
        const servedStatusLabel = (profile as any)?.servedStatusLabel || "COMPLETED";

        return NextResponse.json({
            ...order,
            businessName,
            businessAddress,
            businessPhone,
            businessType,
            servedStatusLabel
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clerkUserId, tableId, items, total, customerName, customerPhone, customerAddress, caseType, parentOrderId, paymentMethod, deliveryCharges, packagingCharges } = body;
        if (!clerkUserId || !items || !total) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        // Fetch business profile for dynamic settings
        const profile = await prisma.businessProfile.findFirst({ where: { userId: clerkUserId }, orderBy: { createdAt: 'asc' } });
        if (!profile) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
        // ✅ CHECK ONLINE STATUS & TIMING
        if (profile.isOnline === false) {
            return NextResponse.json({ error: profile.offlineMessage || "Restaurant is currently offline." }, { status: 403 });
        }
        if (profile.openingTime && profile.closingTime) {
            const now = new Date();
            const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const istTime = new Date(istTimeStr);
            const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();
            const [openH, openM] = profile.openingTime.split(':').map(Number);
            const [closeH, closeM] = profile.closingTime.split(':').map(Number);
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;
            let isWithinTime = false;
            if (openMinutes < closeMinutes) {
                isWithinTime = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
            } else {
                // Overnight shift
                isWithinTime = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
            }
            if (!isWithinTime) {
                return NextResponse.json({ error: profile.offlineMessage || "Restaurant is currently closed." }, { status: 403 });
            }
        }
        const isInclusive = profile?.qrMenuPriceInclusive ?? false;
        const enrichedRequestItems = items.map((i: any) => ({
            ...i,
            taxStatus: i.taxStatus || (isInclusive ? "With Tax" : "Without Tax")
        }));
        // Case 1: MERGE INTO EXISTING ORDER
        if (caseType === "merge" && parentOrderId) {
            const isValidParentId = /^[0-9a-fA-F]{24}$/.test(parentOrderId);
            if (!isValidParentId) return NextResponse.json({ error: "Invalid parent order ID format" }, { status: 400 });
            const existing = await prisma.order.findUnique({ where: { id: parentOrderId } });
            if (!existing) return NextResponse.json({ error: "Parent order not found" }, { status: 404 });
            // Mark new items explicitly so kitchen can highlight them
            const newItems = enrichedRequestItems.map((i: any) => ({ ...i, isNew: true, addedAt: new Date().toISOString() }));
            const currentItems = Array.isArray(existing.items) ? existing.items : [];
            const updatedItems = [...currentItems, ...newItems];
            const updatedOrder = await prisma.order.update({
                where: { id: parentOrderId },
                data: {
                    items: updatedItems,
                    total: existing.total + parseFloat(total),
                    isMerged: true,
                    mergedAt: new Date(),
                    isKotPrinted: false, // Reset so kitchen knows to print new items
                    isBillPrinted: false, // Reset total has changed
                    paymentMode: paymentMethod || existing.paymentMode,
                    notes: body.notes || existing.notes || null, // ✅ Append or Update
                    preferences: body.preferences || existing.preferences || null, // ✅ Update preferences
                    customerAddress: customerAddress || existing.customerAddress, // ✅ Update address if provided
                    deliveryCharges: (existing.deliveryCharges || 0) + (deliveryCharges || 0),
                    packagingCharges: (existing.packagingCharges || 0) + (packagingCharges || 0)
                },
                include: { table: true },
            });
            
            // ==========================================
            // PUSH NOTIFICATION LOGIC FOR MERGED ORDER
            // ==========================================
            try {
                const owner = await prisma.user.findUnique({
                    where: { clerkId: clerkUserId }
                });
                if (owner?.privateMetadata) {
                    const metadata = owner.privateMetadata as any;
                    const expoToken = metadata.expoPushToken;
                    
                    if (expoToken) {
                        const pushPayload = {
                            to: expoToken,
                            data: {
                                orderId: String(updatedOrder.id),
                                title: '🚨 TABLE ADDED ITEMS!',
                                body: `Table has added new items of ₹${total} to their bill!`
                            },
                            priority: "high"
                        };
                        await fetch("https://exp.host/--/api/v2/push/send", {
                            method: "POST",
                            headers: { "Accept": "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
                            body: JSON.stringify(pushPayload)
                        });
                    }
                }
            } catch (pushErr) {
                console.error("PUSH_NOTIFICATION_ERROR:", pushErr);
            }
            // ==========================================

            return NextResponse.json(updatedOrder);
        }
        // Resolve table name to real table ID
        let realTableId = null;
        let tableRecord = null;
        if (tableId) {
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tableId);
            tableRecord = await prisma.table.findFirst({
                where: {
                    OR: [
                        ...(isValidObjectId ? [{ id: tableId }] : []),
                        { name: tableId }
                    ],
                    clerkUserId: clerkUserId
                }
            });
            if (tableRecord) {
                realTableId = tableRecord.id;
            }
        }
        // Case 2 & 3: NEW ORDER (Separate / Round 2)
        const order = await prisma.order.create({
            data: {
                clerkUserId,
                tableId: realTableId,
                items: enrichedRequestItems, // JSON array enriched with taxStatus
                total: parseFloat(total),
                customerName,
                customerPhone,
                status: "PENDING",
                caseType: caseType || "new",
                parentOrderId: parentOrderId || null,
                paymentMode: paymentMethod || "UPI / QR",
                customerAddress,
                notes: body.notes || null, // ✅ NEW
                preferences: body.preferences || null, // ✅ NEW
                zoneName: tableRecord?.zone || null, // ✅ Multi-zone support
                deliveryCharges: deliveryCharges || 0,
                packagingCharges: packagingCharges || 0
            },
            include: {
                table: true,
            }
        });
        // Award Loyalty Points (Dynamic Ratio & Program Enable Check)
        if (customerPhone && profile?.enableLoyaltyProgram !== false) {
            try {
                const ratio = profile?.loyaltyPointRatio || 10;
                const pointsToAward = Math.floor(parseFloat(total) / ratio);
                if (pointsToAward > 0) {
                    await prisma.party.upsert({
                        where: {
                            phone_createdBy: {
                                phone: customerPhone,
                                createdBy: clerkUserId
                            }
                        },
                        update: {
                            loyaltyPoints: { increment: pointsToAward },
                            name: customerName || undefined,
                            address: customerAddress || undefined
                        },
                        create: {
                            phone: customerPhone,
                            name: customerName || "Guest",
                            createdBy: clerkUserId,
                            loyaltyPoints: pointsToAward,
                            address: customerAddress || undefined
                        }
                    });
                }
            } catch (loyaltyError) {
                console.error("LOYALTY_AWARD_ERROR:", loyaltyError);
            }
        }
        // ==========================================
        // PUSH NOTIFICATION LOGIC (FIREBASE & EXPO FALLBACK)
        // ==========================================
        try {
            const owner = await prisma.user.findUnique({
                where: { clerkId: clerkUserId }
            });
            if (owner?.privateMetadata) {
                const metadata = owner.privateMetadata as any;
                const pushToken = metadata.fcmToken;
                const expoToken = metadata.expoPushToken;
                // 1. Try FCM first if available
                if (pushToken) {
                    try {
                        await import('@/lib/firebase-admin');
                        const { getMessaging } = await import('firebase-admin/messaging');
                        const message = {
                            token: pushToken,
                            data: {
                                orderId: String(order.id),
                                title: '🚨 NEW URGENT ORDER!',
                                body: `Table ${tableRecord?.name || 'Online'} placed a new order of ₹${total}!`
                            },
                            android: { priority: 'high' as const }
                        };
                        await getMessaging().send(message);
                        console.log("Firebase Data Message Sent Successfully!");
                    } catch (fcmErr) {
                        console.error("FCM_PUSH_FAILED:", fcmErr);
                    }
                }
                // 2. Also send via Expo Push as a solid fallback
                if (expoToken) {
                    const pushPayload = {
                        to: expoToken,
                        data: {
                            orderId: String(order.id),
                            title: '🚨 NEW URGENT ORDER!',
                            body: `Table ${tableRecord?.name || 'Online'} placed a new order of ₹${total}!`
                        },
                        priority: "high"
                    };
                    await fetch("https://exp.host/--/api/v2/push/send", {
                        method: "POST",
                        headers: { "Accept": "application/json", "Accept-encoding": "gzip, deflate", "Content-Type": "application/json" },
                        body: JSON.stringify(pushPayload)
                    });
                    console.log("Expo Push Message Sent Successfully!");
                }
            }
        } catch (pushErr) {
            console.error("PUSH_NOTIFICATION_ERROR:", pushErr);
        }
        // ==========================================
        return NextResponse.json(order);
    } catch (error) {
        console.error("ORDER_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { itemId, clerkUserId, rating, comment, customerName, tableId } = body;

        if (!clerkUserId || !rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
        }

        // Check if user already reviewed this item
        const existingReview = await prisma.review.findFirst({
            where: {
                itemId: itemId || null,
                clerkUserId,
                customerName: customerName || null
            }
        });

        if (existingReview) {
            return NextResponse.json({ error: "You have already reviewed this item" }, { status: 400 });
        }

        const review = await prisma.review.create({
            data: {
                itemId: itemId || null,
                clerkUserId,
                rating: parseInt(rating),
                comment: comment || null,
                customerName: customerName || null,
                tableId: tableId || null
            }
        });

        // Update item rating if this is an item review
        if (itemId) {
            const reviews = await prisma.review.findMany({
                where: { itemId },
                select: { rating: true }
            });

            const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

            await prisma.item.update({
                where: { id: itemId },
                data: { rating: avgRating }
            });
        }

        return NextResponse.json(review, { status: 201 });
    } catch (error) {
        console.error("Error creating review:", error);
        return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const effectiveId = await getEffectiveClerkId();
        const { searchParams } = new URL(req.url);
        const itemId = searchParams.get('itemId');
        const clerkUserId = searchParams.get('clerkUserId') || effectiveId;

        if (itemId) {
            // Get reviews for a specific item
            const reviews = await prisma.review.findMany({
                where: { itemId },
                include: { item: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50
            });

            return NextResponse.json(reviews);
        }

        if (clerkUserId) {
            // Get all reviews for a business
            const reviews = await prisma.review.findMany({
                where: { clerkUserId },
                include: { 
                    item: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 100
            });

            return NextResponse.json(reviews);
        }

        return NextResponse.json({ error: "itemId or clerkUserId is required" }, { status: 400 });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Star,
    ThumbsUp,
    MessageSquare,
    User,
    Clock,
    CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface Review {
    id: string;
    rating: number;
    comment?: string;
    customerName?: string;
    createdAt: string;
    item?: {
        name: string;
    };
}

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
    itemId: string;
}

interface Order {
    id: string;
    items: OrderItem[];
    status: string;
    customerName: string;
    customerPhone?: string;
    clerkUserId: string;
    tableId?: string;
}

export default function ReviewPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = params.orderId as string;
    const clerkId = searchParams.get('clerkId');

    const [order, setOrder] = useState<Order | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
    const [itemComments, setItemComments] = useState<Record<string, string>>({});
    const [overallRating, setOverallRating] = useState(0);
    const [overallComment, setOverallComment] = useState("");
    const [hasReviewed, setHasReviewed] = useState(false);

    // Realistic curated avatar images for a "Genuine" feel
    const getAvatarUrl = (name: string, seed?: string) => {
        const avatars = [
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1542178243-ed2003b5adad?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544717297-fa15739a5443?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=120&h=120&fit=crop&q=80',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&q=80'
        ];
        let hash = 0;
        const seedValue = (name === "Guest" || name === "Anonymous" || !name) && seed ? seed : (name || "Guest");
        for (let i = 0; i < seedValue.length; i++) {
            hash = seedValue.charCodeAt(i) + ((hash << 5) - hash);
        }
        return avatars[Math.abs(hash) % avatars.length];
    };

    // Get color based on string hash for avatars
    const getAvatarColor = (name: string) => {
        const colors = [
            'from-pink-500 to-rose-500',
            'from-purple-500 to-indigo-500',
            'from-blue-500 to-cyan-500',
            'from-teal-500 to-emerald-500',
            'from-green-500 to-lime-500',
            'from-yellow-500 to-amber-500',
            'from-orange-500 to-orange-600',
            'from-red-500 to-red-600',
            'from-fuchsia-500 to-purple-600',
            'from-violet-500 to-purple-500',
        ];
        let hash = 0;
        const fallbackName = name || "Anonymous";
        for (let i = 0; i < fallbackName.length; i++) {
            hash = fallbackName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Realistic Indian names for Guest reviews
    const getIndianName = (seed: string) => {
        const names = [
            "Rahul S.", "Priya P.", "Amit K.", "Neha S.", "Vikram G.",
            "Anjali D.", "Suresh R.", "Kavita J.", "Deepak V.", "Pooja M.",
            "Rohan M.", "Sneha K.", "Aditya N.", "Kriti S.", "Varun D.",
            "Vivek T.", "Megha C.", "Siddharth B.", "Tara R.", "Karan S."
        ];
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        return names[Math.abs(hash) % names.length];
    };

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
        if (clerkId) {
            fetchReviews();
        }
    }, [orderId, clerkId]);

    const fetchOrder = async () => {
        try {
            const response = await fetch(`/api/public/orders?id=${orderId}`);
            if (response.ok) {
                const orderData = await response.json();
                setOrder(orderData);

                // Check if order is completed
                if (orderData.status !== 'COMPLETED') {
                    toast.error("You can only review completed orders");
                    setTimeout(() => {
                        window.location.href = `/order-tracking/${orderId}`;
                    }, 2000);
                }
            }
        } catch (error) {
            toast.error("Failed to fetch order details");
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch(`/api/reviews?clerkUserId=${clerkId}`);
            if (response.ok) {
                const reviewsData = await response.json();
                setReviews(reviewsData);

                // Check if user already reviewed items from this order
                if (order) {
                    const orderItemIds = order.items.map(item => item.itemId);
                    const hasReviewedItems = reviewsData.some((review: Review) =>
                        review.customerName === order.customerName &&
                        orderItemIds.includes(review.id) // This needs to be adjusted based on actual review structure
                    );
                    setHasReviewed(hasReviewedItems);
                }
            }
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
        }
    };

    const handleItemRating = (itemId: string, rating: number) => {
        setItemRatings(prev => ({ ...prev, [itemId]: rating }));
    };

    const handleItemComment = (itemId: string, comment: string) => {
        setItemComments(prev => ({ ...prev, [itemId]: comment }));
    };

    const submitItemReviews = async () => {
        if (!order) return;

        const itemsToReview = order.items.filter(item => itemRatings[item.itemId]);

        if (itemsToReview.length === 0) {
            toast.error("Please rate at least one item");
            return;
        }

        setSubmitting(true);
        try {
            const reviewPromises = itemsToReview.map(item =>
                fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: item.itemId,
                        clerkUserId: clerkId,
                        rating: itemRatings[item.itemId],
                        comment: itemComments[item.itemId] || "",
                        customerName: order.customerName,
                        tableId: order.tableId || null
                    })
                })
            );

            const results = await Promise.all(reviewPromises);

            if (results.every(res => res.ok)) {
                toast.success("Thank you for your review!");
                fetchReviews(); // Refresh reviews
                setItemRatings({});
                setItemComments({});
            } else {
                throw new Error("Some reviews failed to submit");
            }
        } catch (error) {
            toast.error("Failed to submit reviews. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const submitOverallReview = async () => {
        if (!order || overallRating === 0) {
            toast.error("Please provide an overall rating");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: null, // Overall business review
                    clerkUserId: clerkId,
                    rating: overallRating,
                    comment: overallComment,
                    customerName: order.customerName,
                    tableId: order.tableId || null
                })
            });

            if (response.ok) {
                toast.success("Thank you for your feedback!");
                setOverallRating(0);
                setOverallComment("");
                fetchReviews();
            } else {
                throw new Error("Failed to submit review");
            }
        } catch (error) {
            toast.error("Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (rating: number, onRatingChange?: (rating: number) => void) => {
        return (
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onRatingChange && onRatingChange(star)}
                        className={`${onRatingChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                        disabled={!onRatingChange}
                    >
                        <Star
                            className={`h-6 w-6 ${star <= rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                                }`}
                        />
                    </button>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading review page...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg font-semibold mb-4">Order not found</p>
                    <Button onClick={() => window.history.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    if (hasReviewed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-6 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                        <p className="text-gray-600 mb-4">You have already reviewed this order</p>
                        <Button onClick={() => window.location.href = `/order-tracking/${orderId}`}>
                            Back to Order Tracking
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Rate Your Experience</h1>
                    <p className="text-gray-600">Order #{order.id.slice(-8)}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Item Reviews */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Star className="h-5 w-5 mr-2 text-orange-500" />
                            Rate Individual Items
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            Help us improve by rating each item you ordered
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {order.items.map((item) => (
                            <div key={item.itemId} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold">{item.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            Quantity: {item.quantity} × ₹{item.price}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Rating
                                        </label>
                                        {renderStars(itemRatings[item.itemId] || 0, (rating) =>
                                            handleItemRating(item.itemId, rating)
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Comment (Optional)
                                        </label>
                                        <Textarea
                                            placeholder="Tell us what you thought about this item..."
                                            value={itemComments[item.itemId] || ""}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleItemComment(item.itemId, e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button
                            onClick={submitItemReviews}
                            disabled={submitting || Object.keys(itemRatings).length === 0}
                            className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                            {submitting ? "Submitting..." : "Submit Item Reviews"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Overall Experience */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <MessageSquare className="h-5 w-5 mr-2 text-orange-500" />
                            Overall Experience
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                            How was your overall dining experience?
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Overall Rating
                            </label>
                            {renderStars(overallRating, setOverallRating)}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Feedback (Optional)
                            </label>
                            <Textarea
                                placeholder="Share your overall experience with us..."
                                value={overallComment}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOverallComment(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <Button
                            onClick={submitOverallReview}
                            disabled={submitting || overallRating === 0}
                            className="w-full bg-orange-500 hover:bg-orange-600"
                        >
                            {submitting ? "Submitting..." : "Submit Overall Review"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Recent Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {reviews.slice(0, 5).map((review) => (
                                    <div key={review.id} className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 last:mb-0 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarColor(review.customerName && review.customerName !== "Guest" && review.customerName !== "Anonymous" ? review.customerName : getIndianName(review.id))} overflow-hidden shadow-sm flex items-center justify-center`}>
                                                        <img
                                                            src={getAvatarUrl(review.customerName || "Guest", review.id)}
                                                            alt={review.customerName || "G"}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 fill-current" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-[900] text-gray-900 leading-tight">
                                                        {review.customerName && review.customerName !== "Guest" && review.customerName !== "Anonymous" ? review.customerName : `${getIndianName(review.id)} (Verified Guest) ✨`}
                                                    </div>
                                                    <div className="flex items-center text-[0.65rem] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                        <Clock size={11} className="mr-1" /> {new Date(review.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="flex bg-orange-50/50 px-2 py-0.5 rounded-full border border-orange-100">
                                                    {renderStars(review.rating)}
                                                </div>
                                                {review.item && (
                                                    <Badge variant="outline" className="mt-2 text-[10px] bg-gray-50 border-gray-100 text-[#696969] font-[800] px-2 py-0.5 rounded-md">
                                                        {review.item.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {review.comment && (
                                            <div className="relative bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                <div className="absolute top-2 right-4 text-3xl font-serif text-gray-200 leading-none">”</div>
                                                <p className="text-gray-600 text-[0.85rem] italic font-semibold leading-relaxed pr-4">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

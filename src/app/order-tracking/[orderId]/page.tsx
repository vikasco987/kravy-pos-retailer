"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    CheckCircle,
    UtensilsCrossed,
    ChefHat,
    Truck,
    Star,
    IndianRupee,
    Phone,
    User,
    RefreshCw,
    Plus,
    ChevronLeft,
    Receipt,
    History,
    MapPin,
    ArrowLeft,
    MessageCircle,
    Package,
    ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import MenuQRAddMoreFlow from "@/components/MenuQRAddMoreFlow";
import { getBusinessMode, getOrderStatusDetails } from "@/config/business-mode";

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
    itemId: string;
    addedAt: string;
    addedInCase?: string;
    isNew?: boolean;
}

interface Order {
    id: string;
    items: OrderItem[];
    total: number;
    status: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    clerkUserId: string;
    table?: {
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessType?: string;
    deliveryCharges?: number;
    packagingCharges?: number;
    servedStatusLabel?: string;
}

const statusConfig = {
    PENDING: {
        icon: Clock,
        label: "Order Received",
        color: "bg-yellow-500",
        description: "We've received your order and it's being reviewed"
    },
    ACCEPTING: {
        icon: UtensilsCrossed,
        label: "Order Confirmed",
        color: "bg-blue-500",
        description: "Your order has been confirmed by the restaurant"
    },
    ACCEPTED: {
        icon: CheckCircle,
        label: "Preparing",
        color: "bg-orange-500",
        description: "The kitchen is preparing your delicious food"
    },
    PREPARING: {
        icon: ChefHat,
        label: "Cooking",
        color: "bg-purple-500",
        description: "Your food is being cooked with care"
    },
    READY: {
        icon: Truck,
        label: "Ready to Serve",
        color: "bg-green-500",
        description: "Your order is ready and will be served soon"
    },
    SERVED: {
        icon: CheckCircle,
        label: "Served",
        color: "bg-green-600",
        description: "Your order has been served"
    },
    COMPLETED: {
        icon: CheckCircle,
        label: "Completed",
        color: "bg-gray-500",
        description: "Order completed. Enjoy your meal!"
    }
};

export default function OrderTrackingPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddMore, setShowAddMore] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);

    useEffect(() => {
        if (orderId) {
            fetchOrder();
            // Set up auto-refresh every 15 seconds
            const interval = setInterval(fetchOrder, 15000);
            return () => clearInterval(interval);
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const response = await fetch(`/api/public/orders?id=${orderId}`);
            if (response.ok) {
                const orderData = await response.json();
                setOrder(orderData);

                // Also fetch combined session data for aggregate bill
                const sessionRes = await fetch(`/api/public/orders/${orderId}/combined-bill`);
                if (sessionRes.ok) {
                    const sData = await sessionRes.json();
                    setSessionData(sData);
                }
            } else {
                toast.error("Order not found");
            }
        } catch (error) {
            toast.error("Failed to fetch order status");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchOrder();
    };

    const getStatusStep = (currentStatus: string) => {
        const statusOrder = ['PENDING', 'ACCEPTING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
        return statusOrder.indexOf(currentStatus);
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E23744]"></div>
                    <p className="text-[#696969] font-bold text-sm tracking-widest uppercase">Fetching Order Status...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-red-50">
                    <div className="text-4xl mb-4">🏮</div>
                    <p className="text-gray-900 text-xl font-black mb-2">Order Not Found</p>
                    <p className="text-gray-500 text-sm mb-6">Seems like this table or order doesn't exist anymore.</p>
                    <Button
                        onClick={() => window.location.href = "/"}
                        className="w-full bg-[#E23744] hover:bg-[#c42f3a] rounded-xl h-12 font-bold"
                    >
                        Go to Home
                    </Button>
                </div>
            </div>
        );
    }

    const businessMode = getBusinessMode(order.businessType);
    const orderStatusDetails = getOrderStatusDetails(order.status, order.businessType);
    const StatusIcon = order.status === "COMPLETED" ? CheckCircle 
      : order.status === "READY" ? ShoppingBag 
      : order.status === "PREPARING" ? Package 
      : order.status === "ACCEPTED" ? CheckCircle 
      : Clock;

    const currentStep = getStatusStep(order.status);
    
    const calculatedSubtotal = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const difference = order.total - calculatedSubtotal;
    
    const deliveryFee = order.deliveryCharges || 0;
    const packagingFee = order.packagingCharges || 0;
    const remainingDifference = difference - deliveryFee - packagingFee;
    
    const isDiscount = difference < -0.01;
    const hasRemainingTaxes = remainingDifference > 0.01;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F8F8F8] to-[#FFFFFF] font-sans text-[#1C1C1C] overflow-x-hidden w-full" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
            <div className="max-w-[480px] mx-auto min-h-screen relative overflow-x-hidden w-full flex flex-col">

                {/* ── COMPACT TOP NAVIGATION ── */}
                <nav className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-[#EBEBEB] px-4 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.href = `/menu/${order.clerkUserId}`}
                            className="w-8 h-8 rounded-full bg-[#F8F8F8] flex items-center justify-center text-[#1C1C1C] hover:bg-[#EBEBEB] transition-colors"
                        >
                            <ArrowLeft size={16} strokeWidth={2.5} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="text-[0.9rem] font-[800] leading-none truncate tracking-tight flex items-center gap-1.5">
                                <span className="text-lg leading-none translate-y-[-1px]">🛍</span>
                                {order.table?.name ? `${businessMode.terminology.unitSingular} ${order.table.name}` : `${businessMode.label} Order`}
                            </div>
                            <div className="text-[0.6rem] text-[#696969] font-[700] mt-1 flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
                                <span className="truncate">Live • #{order.id.slice(-6).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                </nav>

                <main className="pb-40 p-4 flex-1 space-y-4">

                    {/* ── MAIN STATUS CARD ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#EBEBEB]"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm bg-[#EF4F5F]/10 text-[#EF4F5F] relative`}>
                                <StatusIcon size={28} strokeWidth={2.5} />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#22C55E] border-2 border-white flex items-center justify-center text-[10px]">⚡</div>
                            </div>
                            <div className="flex-1 text-left">
                                <h2 className="text-[1.35rem] font-[900] tracking-tight text-[#1C1C1C] leading-tight">
                                    {orderStatusDetails.customerHeading}
                                </h2>
                                <p className="text-[0.8rem] text-[#696969] font-[600] mt-0.5">
                                    {orderStatusDetails.customerDesc}
                                </p>
                            </div>
                        </div>

                        {/* Minimal Horizontal Stepper */}
                        <div className="relative pt-2 pb-2 w-full">
                            <div className="absolute top-[12px] left-4 right-4 h-[3px] bg-[#F4F4F4] rounded-full" />
                            <div className="flex items-start justify-between relative z-10">
                                {(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'] as const).map((status, index) => {
                                    const statusOrder = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
                                    const stepIndex = statusOrder.indexOf(status);
                                    const isActive = stepIndex <= currentStep;
                                    const isCurrent = status === order.status;
                                    const details = getOrderStatusDetails(status, order.businessType);

                                    return (
                                        <div key={status} className="flex flex-col items-center relative z-10 w-16 shrink-0">
                                            {/* Progress line overlay */}
                                            {index > 0 && index <= currentStep && (
                                                <div className="absolute top-[12px] right-[50%] w-full h-[3px] bg-[#EF4F5F]" />
                                            )}
                                            
                                            {/* Dot Container */}
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm relative z-20 ${
                                                isCurrent ? "bg-[#EF4F5F] border-2 border-white scale-110 shadow-md" : 
                                                isActive ? "bg-[#EF4F5F] border-2 border-white" : "bg-white border-2 border-[#EBEBEB]"
                                            }`}>
                                                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-[#ABABAB]"}`} />
                                                {isCurrent && (
                                                    <div className="absolute inset-0 rounded-full border-2 border-[#EF4F5F] animate-ping opacity-20" />
                                                )}
                                            </div>
                                            
                                            {/* Label */}
                                            <div className="mt-2 text-center w-full">
                                                <span className={`block text-[8px] leading-tight font-[800] uppercase tracking-tighter transition-all duration-500 whitespace-nowrap ${
                                                    isCurrent ? "text-[#EF4F5F]" : isActive ? "text-[#1C1C1C]" : "text-[#ABABAB]"
                                                }`}>
                                                    {details.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>



                    {/* ── LOYALTY PROGRESS (MASALA HOUSE SPECIAL) ── */}
                    <div className="mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-br from-[#1a0a00] to-[#2d1500] rounded-3xl p-6 shadow-[0_8px_30px_rgba(45,21,0,0.12)] relative overflow-hidden"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl bg-white/10 rounded-2xl p-2 border border-white/5 shadow-inner">👑</div>
                                    <div>
                                        <div className="text-[0.95rem] font-[800] text-[#F0EAD6] tracking-wide">Loyalty Member</div>
                                        <div className="text-[0.75rem] text-[#F0EAD6]/80 mt-1">🎉 You earned <strong className="text-[#D4A353]">{Math.floor(order.total / 10)} points</strong></div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,163,83,0.15),transparent)] pointer-events-none" />
                        </motion.div>
                        <div className="mt-4 px-3 text-center">
                            <p className="text-[0.75rem] font-[600] text-[#696969]">
                                Use these points on your next order to save money!
                            </p>
                        </div>
                    </div>

                    {/* ── ORDER ITEMS & BILL ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#EBEBEB] mb-6"
                    >
                        <div className="px-5 py-4 border-b border-dashed border-[#EBEBEB] flex items-center justify-between">
                            <h3 className="font-[800] text-[0.95rem] flex items-center gap-2 tracking-tight text-[#1C1C1C]">
                                <Receipt size={16} className="text-[#696969]" />
                                Bill Details
                            </h3>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* If there's a session (case 1/2), show combined summary */}
                            {sessionData && sessionData.orders.length > 1 ? (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                                    <div className="text-[0.7rem] font-[800] text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <History size={12} /> Combined Orders
                                    </div>
                                    <div className="space-y-2">
                                        {sessionData.orders.map((o: any, idx: number) => (
                                            <div key={o.id} className="flex justify-between items-center text-[0.8rem] font-[700]">
                                                <span className="text-[#696969]">Order #{idx + 1}</span>
                                                <span className="text-[#1C1C1C]">₹{o.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="space-y-3">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0 flex items-start gap-2.5">
                                            <div className={`mt-[3px] w-[13px] h-[13px] border-[1.5px] rounded-[3px] flex items-center justify-center shrink-0 ${item.quantity > 0 ? "border-[#22C55E]" : "border-[#EF4F5F]"}`}>
                                                <div className={`w-[7px] h-[7px] rounded-full ${item.quantity > 0 ? "bg-[#22C55E]" : "bg-[#EF4F5F]"}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-[600] text-[0.9rem] leading-snug text-[#1C1C1C] break-words">
                                                    {item.name} <span className="inline-block bg-[#F4F4F4] text-[#696969] text-[0.65rem] font-[800] px-1.5 py-0.5 rounded-md ml-1 translate-y-[-1px]">×{item.quantity}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-[800] text-[0.9rem] text-[#1C1C1C] shrink-0">₹{item.price * item.quantity}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-dashed border-[#EBEBEB] space-y-3">
                                <div className="flex justify-between items-center text-[0.8rem] font-[500] text-[#696969]">
                                    <span>Subtotal</span>
                                    <span className="text-[#1C1C1C] font-[600]">₹{calculatedSubtotal.toFixed(2)}</span>
                                </div>
                                {packagingFee > 0 && (
                                    <div className="flex justify-between items-center text-[0.8rem] font-[500] text-[#696969]">
                                        <span>Packaging Charge</span>
                                        <span className="text-[#1C1C1C] font-[600]">+₹{packagingFee.toFixed(2)}</span>
                                    </div>
                                )}
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between items-center text-[0.8rem] font-[500] text-[#696969]">
                                        <span>Delivery Charge</span>
                                        <span className="text-[#1C1C1C] font-[600]">+₹{deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}
                                {hasRemainingTaxes && (
                                    <div className="flex justify-between items-center text-[0.8rem] font-[500] text-[#696969]">
                                        <span>Taxes</span>
                                        <span className="text-[#1C1C1C] font-[600]">+₹{remainingDifference.toFixed(2)}</span>
                                    </div>
                                )}
                                {isDiscount && (
                                    <div className="flex justify-between items-center text-[0.8rem] font-[500] text-[#EF4F5F]">
                                        <span>Discount applied</span>
                                        <span className="font-[600]">-₹{Math.abs(difference).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-[#EBEBEB] flex justify-between items-center">
                                <span className="font-[800] text-[1.05rem] text-[#1C1C1C]">Total Payable</span>
                                <div className="bg-red-50 text-[#EF4F5F] rounded-xl px-3 py-1.5 font-[900] text-[1.15rem] shadow-inner border border-red-100/50">
                                    ₹{order.total.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── RESTAURANT DETAILS ── */}
                    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#EBEBEB] flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="font-[800] text-[#1C1C1C] text-[0.9rem]">{order.businessName || "Restaurant"}</div>
                                <div className="text-[0.7rem] text-[#696969] font-[500] mt-0.5">{order.businessAddress || "Address not provided"}</div>
                            </div>
                        </div>
                        {order.businessPhone && (
                            <a href={`tel:+91${order.businessPhone.replace(/\\D/g, "").slice(-10)}`} className="w-9 h-9 rounded-full bg-[#F8F8F8] border border-[#EBEBEB] flex items-center justify-center text-[#1C1C1C] hover:bg-[#EBEBEB] transition-colors">
                                <Phone size={14} />
                            </a>
                        )}
                    </div>

                    {/* ── CUSTOMER & ORDER INFO ── */}
                    <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#EBEBEB] flex divide-x divide-[#EBEBEB]">
                        <div className="flex-1 pr-4">
                            <div className="text-[0.65rem] font-[800] text-[#ABABAB] uppercase tracking-wider mb-1">Customer</div>
                            <div className="text-[0.85rem] font-[900] truncate text-[#1C1C1C]">{order.customerName || "Guest"}</div>
                            <div className="text-[0.7rem] font-[600] text-[#696969] mt-1">{(order as any).type === 'delivery' ? '🚚 Delivery' : '🍽 Dine-In'}</div>
                        </div>
                        <div className="flex-1 pl-4">
                            <div className="text-[0.65rem] font-[800] text-[#ABABAB] uppercase tracking-wider mb-1">Payment</div>
                            <div className="text-[0.85rem] font-[900] truncate text-[#1C1C1C]">{(order as any).paymentStatus === 'paid' ? 'Paid via UPI' : 'Pending'}</div>
                            <div className="text-[0.7rem] font-[600] text-[#696969] mt-1">{formatTime(order.createdAt)}</div>
                        </div>
                    </div>

                    {/* ── DELIVERY ADDRESS ── */}
                    {order.customerAddress && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2rem] p-5 shadow-sm border border-[#EBEBEB] flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                <MapPin size={20} className="text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[0.65rem] font-[800] text-[#ABABAB] uppercase tracking-wider mb-1 text-left">Delivery Address</div>
                                <div className="text-[0.85rem] font-[900] text-left leading-snug">{order.customerAddress}</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Finish Action */}
                    {order.status === 'COMPLETED' && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-3xl text-center">
                            <Star className="mx-auto mb-2 text-[#22C55E]" size={32} />
                            <h3 className="font-black text-lg text-[#166534]">Enjoyed your meal?</h3>
                            <p className="text-sm text-[#166534] mb-4">Rate us 5 stars to earn 50 bonus points!</p>
                            <Button className="w-full bg-[#22C55E] hover:bg-[#16a34a] rounded-xl font-bold h-12 shadow-lg shadow-green-100">Rate Now ⭐</Button>
                        </motion.div>
                    )}

                </main>

                {/* ── FLOATING SUPPORT ACTION ── */}
                <div className="fixed bottom-[90px] right-5 z-[90] pointer-events-none flex justify-end">
                    <motion.a
                        href={order.businessPhone ? `https://wa.me/91${order.businessPhone.replace(/\\D/g, "").slice(-10)}` : "#"}
                        onClick={(e) => { if (!order.businessPhone) { e.preventDefault(); toast.error("Business WhatsApp not available"); } }}
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(37,211,102,0.4)] pointer-events-auto border-2 border-white relative"
                    >
                        <div className="absolute inset-0 rounded-full border-2 border-[#25D366] animate-ping opacity-30" />
                        <MessageCircle size={26} strokeWidth={2.2} className="relative z-10" />
                    </motion.a>
                </div>

                {/* ── STICKY TOTAL & ADD MORE BAR ── */}
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/90 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-4 py-3.5 z-[100]">
                    <div className="flex items-center justify-between gap-5">
                        <div className="flex flex-col min-w-[100px]">
                            <span className="text-[0.6rem] font-[800] text-[#696969] uppercase tracking-widest">Total</span>
                            <span className="text-[1.25rem] font-[900] text-[#1C1C1C] leading-none mt-1">₹{order.total.toFixed(2)}</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-[#FC8019] flex-1 text-white h-[46px] rounded-[14px] shadow-[0_8px_25px_rgba(252,128,25,0.25)] flex items-center justify-center gap-2 font-[800] text-[0.95rem] tracking-tight"
                            onClick={() => setShowAddMore(true)}
                        >
                            <Plus size={18} strokeWidth={3} />
                            Order More
                        </motion.button>
                    </div>
                </div>

                {/* ── ADD MORE FLOW OVERLAY ── */}
                <AnimatePresence>
                    {showAddMore && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-end justify-center"
                        >
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white w-full max-w-[480px] rounded-t-[3rem] shadow-2xl relative overflow-hidden h-[92vh]"
                            >
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#EBEBEB] rounded-full z-[210]" />
                                <button
                                    onClick={() => setShowAddMore(false)}
                                    className="absolute top-6 right-6 z-[210] bg-[#F4F4F4]/80 backdrop-blur p-2 rounded-full text-[#1C1C1C]"
                                >
                                    <Plus className="h-6 w-6 rotate-45" />
                                </button>

                                <div className="h-full overflow-y-auto pt-4 no-scrollbar">
                                    <MenuQRAddMoreFlow
                                        clerkUserId={order.clerkUserId}
                                        onClose={() => {
                                            setShowAddMore(false);
                                            fetchOrder();
                                        }}
                                        orderData={{
                                            orderId: order.id,
                                            tableId: order.table?.name || "Counter",
                                            status: (order.status.toLowerCase() as any) || "received",
                                            items: order.items.map((i: any) => ({ name: i.name, qty: i.quantity, price: i.price })),
                                            createdAt: formatTime(order.createdAt),
                                            currentTotal: order.total,
                                            customerName: order.customerName,
                                            customerPhone: order.customerPhone || ""
                                        }}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <style dangerouslySetInnerHTML={{ __html: `
                    .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.95; transform: scale(1.02); } }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}} />
            </div>
        </div>
    );
}

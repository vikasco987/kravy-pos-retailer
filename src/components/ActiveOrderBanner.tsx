"use client";
import { useCurrency } from "@/lib/currency-context";
import { useEffect, useState } from "react";
import { getSavedOrders, removeSavedOrder } from "@/lib/orderStorage";
import {
    Clock,
    ArrowRight,
    Loader2,
    ChefHat,
    Coffee,
    CheckCircle2,
    Bell,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function CustomStatusIcon({ iconName, ...props }: { iconName: string, className?: string, size?: number }) {
    if (iconName === "Flame") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    return null;
}

type ActiveOrder = {
    id: string;
    status: string;
    total: number;
    tableId: string;
    createdAt: string;
    clerkUserId: string;
    items: any;
    table?: { name: string };
};

export default function ActiveOrderBanner({ tableId, clerkId }: { tableId: string, clerkId: string }) {
  const { currencySymbol: sym } = useCurrency();

    const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const checkActive = async () => {
            const saved = getSavedOrders();
            // Find recent orders for this specific table (within last 6 hours)
            const sixHoursAgo = new Date();
            sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

            const recentOnThisTable = saved.find(o =>
                o.tableId === tableId &&
                o.clerkUserId === clerkId &&
                new Date(o.savedAt) > sixHoursAgo
            );

            if (!recentOnThisTable) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/public/orders/track?orderId=${recentOnThisTable.orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && !["COMPLETED", "CANCELLED", "REJECTED"].includes(data.status) && !data.isDeleted) {
                        setActiveOrder(data);
                    } else if (data && (["COMPLETED", "CANCELLED", "REJECTED"].includes(data.status) || data.isDeleted)) {
                        removeSavedOrder(recentOnThisTable.orderId);
                    }
                }
            } catch (err) {
                console.error("Banner check failed", err);
            } finally {
                setLoading(false);
            }
        };

        checkActive();
    }, [tableId, clerkId]);

    const getStatusInfo = (status: string) => {
        const s = status.toUpperCase();
        if (s === "PENDING") return { icon: <Clock className="text-amber-500" size={16} />, text: "Awaiting Confirmation", bg: "bg-amber-50" };
        if (s === "ACCEPTED" || s === "PREPARING") return { icon: <ChefHat className="text-orange-500" size={16} />, text: "Kitchen is preparing (10-15m)", bg: "bg-orange-50" };
        if (s === "READY") return { icon: <Bell className="text-emerald-500" size={16} />, text: "Ready to Serve!", bg: "bg-emerald-50" };
        if (s === "SERVED") return { icon: <CheckCircle2 className="text-emerald-500" size={16} />, text: "Serving Enjoy!", bg: "bg-emerald-50" };
        return { icon: <Loader2 className="animate-spin text-blue-500" size={16} />, text: "Updating status...", bg: "bg-blue-50" };
    };

    if (loading || !activeOrder || dismissed) return null;

    const status = getStatusInfo(activeOrder.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mx-3.5 mt-3 mb-1"
        >
            <div className="bg-white rounded-[24px] overflow-hidden border border-amber-100 shadow-2xl shadow-amber-900/10 transition-all">
                {/* Header Strip */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <CustomStatusIcon iconName="Flame" className="text-white" size={18} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none">Order Status Live</div>
                            <div className="text-[13px] font-black text-white mt-1">Is table pe order chal raha hai!</div>
                        </div>
                    </div>
                    <button onClick={() => setDismissed(true)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-inner">
                            🥗
                        </div>
                        <div className="flex-1">
                            <div className="text-[14px] font-black text-slate-800">Order Tracking...</div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                Items: {typeof activeOrder.items === 'string' ? JSON.parse(activeOrder.items).length : Array.isArray(activeOrder.items) ? activeOrder.items.length : 'Multiple Items'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[15px] font-black text-slate-800">{sym}{activeOrder.total}</div>
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ongoing</div>
                        </div>
                    </div>

                    {/* Live Status Chip */}
                    <div className={`${status.bg} rounded-2xl p-3 flex items-center gap-3 border border-current/10`}>
                        <div className="relative">
                            {status.icon}
                            {activeOrder.status === "PENDING" && (
                                <div className="absolute inset-0 bg-current rounded-full blur-md opacity-20 animate-pulse" />
                            )}
                        </div>
                        <span className="text-[12px] font-black tracking-tight">{status.text}</span>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.location.href = `/order-tracking/${activeOrder.id}`}
                            className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95"
                        >
                            Track Live Progress <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

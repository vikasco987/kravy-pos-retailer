"use client";
import { useCurrency } from "@/lib/currency-context";
import { useEffect, useRef, useState } from "react";
import { useTerminalContext } from "@/components/TerminalContext";
import { kravy } from "@/lib/sounds";
import { ShoppingBag, Check, X, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ConfirmContext";

export default function IncomingOrderModal() {
  const { currencySymbol: sym } = useCurrency();

    const { confirm } = useConfirm();
    const { orders, setOrders, emitUpdate } = useTerminalContext();
    const [isAccepting, setIsAccepting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState("Item out of stock");
    const [customReason, setCustomReason] = useState("");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const QUICK_REASONS = [
        "Item out of stock",
        "Kitchen too busy / Long wait time",
        "Closing time / Kitchen closed",
        "Invalid order details",
        "Customer requested cancellation",
        "Other"
    ];

    // Get the oldest pending order
    const pendingOrders = orders
        .filter(o => o.status === "PENDING" && !o.isDeleted)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const currentOrder = pendingOrders.length > 0 ? pendingOrders[0] : null;

    useEffect(() => {
        if (currentOrder) {
            // Start looping alarm if not already started
            if (!intervalRef.current) {
                kravy.alertLoop();
                intervalRef.current = setInterval(() => {
                    kravy.alertLoop();
                }, 1800); // 1.8s loop
            }
        } else {
            // Stop looping if no pending orders
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentOrder?.id]);

    if (!currentOrder) return null;

    const handleAccept = async () => {
        setIsAccepting(true);
        kravy.click();
        
        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: currentOrder.id, status: "ACCEPTED" })
            });

            if (res.ok) {
                kravy.orderAccept();
                toast.success("Order Accepted 🧑‍🍳");
                // Optimistic local update
                setOrders(prev => prev.map(o => o.id === currentOrder.id ? { ...o, status: "ACCEPTED" } : o));
                emitUpdate();
            } else {
                throw new Error("Failed to accept");
            }
        } catch (err) {
            kravy.error();
            toast.error("Update failed");
        } finally {
            setIsAccepting(false);
        }
    };

    const handleRejectClick = () => {
        kravy.click();
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        const finalReason = selectedReason === "Other" 
            ? (customReason.trim() || "Rejected by restaurant") 
            : (customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason);

        setIsRejecting(true);
        kravy.click();
        
        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    orderId: currentOrder.id, 
                    isDeleted: true, 
                    status: "REJECTED",
                    reason: finalReason
                })
            });

            if (res.ok) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                kravy.orderCancel();
                toast.error("Order Rejected");
                setShowRejectModal(false);
                setOrders(prev => prev.filter(o => o.id !== currentOrder.id));
                emitUpdate();
            } else {
                throw new Error("Failed to reject");
            }
        } catch (err) {
            kravy.error();
            toast.error("Reject failed");
        } finally {
            setIsRejecting(false);
        }
    };

    const diffMins = Math.floor((Date.now() - new Date(currentOrder.createdAt).getTime()) / 60000);

    return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
            {/* Full screen backdrop blur */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-rose-500 overflow-hidden flex flex-col max-h-full">
                
                {/* Header */}
                <div className="bg-rose-500 text-white p-6 sm:p-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                            <AlertTriangle size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">New Order Received!</h2>
                            <p className="text-rose-100 font-bold text-sm sm:text-base mt-1 flex items-center gap-2">
                                <Clock size={16} /> 
                                {diffMins === 0 ? "Just now" : `${diffMins} min ago`}
                                {pendingOrders.length > 1 && (
                                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                        + {pendingOrders.length - 1} more waiting
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                                {currentOrder.customerName || "Walk-in Guest"}
                            </p>
                            {currentOrder.table?.name && (
                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                    📍 {currentOrder.table.name}
                                </p>
                            )}
                            {currentOrder.customerPhone && (
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
                                    📞 {currentOrder.customerPhone}
                                </p>
                            )}
                            {currentOrder.customerAddress && (
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 max-w-xs">
                                    🏠 {currentOrder.customerAddress}
                                </p>
                            )}
                            {((currentOrder.preferences as any)?.earnedPointsPreview ?? 0) > 0 && (
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-500 mt-1 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
                                    🎁 Earns ~{(currentOrder.preferences as any).earnedPointsPreview} pts
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-4xl font-black text-emerald-500">
                                {sym}{currentOrder.total}
                            </p>
                            {((currentOrder.deliveryCharges ?? 0) > 0 || (currentOrder.packagingCharges ?? 0) > 0) && (
                                <div className="mt-2 text-right">
                                    {(currentOrder.packagingCharges ?? 0) > 0 && (
                                        <p className="text-[10px] font-bold text-slate-500">
                                            +{sym}{currentOrder.packagingCharges} Packaging
                                        </p>
                                    )}
                                    {(currentOrder.deliveryCharges ?? 0) > 0 && (
                                        <p className="text-[10px] font-bold text-slate-500">
                                            +{sym}{currentOrder.deliveryCharges} Delivery
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShoppingBag size={14} /> 
                            Order Items ({currentOrder.items.length})
                        </p>
                        <div className="space-y-3">
                            {currentOrder.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-slate-300">
                                            {it.quantity}x
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{it.name}</p>
                                            {it.variants && it.variants.length > 0 && (
                                                <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                    {it.variants.map((v: any) => v.name).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="font-black text-slate-900 dark:text-white">
                                        {sym}{(it.price * it.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {currentOrder.notes && (
                        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                            <p className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Cooking Instructions</p>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{currentOrder.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 shrink-0">
                    <button 
                        onClick={handleRejectClick}
                        disabled={isAccepting || isRejecting}
                        className="flex-1 py-4 px-6 rounded-2xl border-2 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isRejecting ? "Rejecting..." : (
                            <>
                                <X size={20} strokeWidth={3} /> Reject
                            </>
                        )}
                    </button>
                    <button 
                        onClick={handleAccept}
                        disabled={isAccepting || isRejecting}
                        className="flex-[2] py-4 px-6 rounded-2xl bg-emerald-500 text-white font-black text-lg uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isAccepting ? "Accepting..." : (
                            <>
                                <Check size={24} strokeWidth={4} /> Accept Order
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Reject Reason / Remark Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-rose-200 dark:border-rose-900/40 flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                                    <X size={20} strokeWidth={3} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">Reject Order</h3>
                                    <p className="text-xs text-slate-500 font-medium">Select or enter a reason for rejection</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowRejectModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Quick Reason Options */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Common Reasons</label>
                            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                {QUICK_REASONS.map((r, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedReason(r)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${selectedReason === r ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm" : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                                    >
                                        <span>{r}</span>
                                        {selectedReason === r && <Check size={14} className="text-rose-600 dark:text-rose-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Remark / Note */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Additional Remark / Notes (Optional)</label>
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="E.g. Item out of stock: Paneer Butter Masala unavailable today"
                                rows={2}
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium resize-none"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                disabled={isRejecting}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReject}
                                disabled={isRejecting}
                                className="flex-[1.5] py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isRejecting ? "Rejecting..." : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

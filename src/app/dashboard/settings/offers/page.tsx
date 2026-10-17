"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft, Loader2, Tag, CheckCircle2, Info, ToggleLeft, ToggleRight,
    Gift, BadgePercent, Trash2, Plus, PackageOpen
} from "lucide-react";
import toast from "react-hot-toast";
import { kravy } from "@/lib/sounds";

type Offer = {
    id: string;
    title: string;
    description?: string;
    code?: string;
    discountType: string;
    discountValue: number;
    minOrderValue?: number;
    isActive: boolean;
};

export default function OffersSettingsPage() {
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [savingOffer, setSavingOffer] = useState(false);
    
    // New offer form
    const [showNewOffer, setShowNewOffer] = useState(false);
    const [newOffer, setNewOffer] = useState({
        title: "",
        code: "",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minOrderValue: 0,
    });

    useEffect(() => {
        console.log(`[KRAVY-PERF] PAGE_MOUNT: OffersPage mounted`);
        async function fetchOffers() {
            try {
                console.log(`[KRAVY-PERF] API_START: /api/admin/offers`);
                const startTime = performance.now();
                const offerRes = await fetch(`/api/admin/offers`, { cache: "no-store" });
                const offerData = await offerRes.json();
                const endTime = performance.now();
                console.log(`[KRAVY-PERF] API_END: /api/admin/offers`);
                console.log(`[KRAVY-PERF] API_DURATION: /api/admin/offers took ${(endTime - startTime).toFixed(2)}ms`);
                setOffers(Array.isArray(offerData) ? offerData : []);
            } catch {
                toast.error("Error loading offers");
            } finally {
                console.log(`[KRAVY-PERF] LOADING_STATE_END: OffersPage loading completed`);
                setOffersLoading(false);
            }
        }
        fetchOffers();
    }, []);

    async function handleCreateOffer() {
        kravy.error();
        if (!newOffer.title) { toast.error("Offer title required"); return; }
        kravy.error();
        if (newOffer.discountValue <= 0) { toast.error("Discount must be > 0"); return; }
        setSavingOffer(true);
        try {
            const res = await fetch(`/api/admin/offers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newOffer),
            });
            if (!res.ok) throw new Error();
            const created = await res.json();
            setOffers(prev => [created, ...prev]);
            setShowNewOffer(false);
            setNewOffer({ title: "", code: "", discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 0 });
            kravy.success();
            toast.success("Offer created! 🎉");
        } catch {
            kravy.error();
            toast.error("Failed to create offer");
        } finally {
            setSavingOffer(false);
        }
    }

    async function handleDeleteOffer(id: string) {
        try {
            const res = await fetch(`/api/admin/offers?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setOffers(prev => prev.filter(o => o.id !== id));
            kravy.success();
            toast.success("Offer deleted");
        } catch {
            kravy.error();
            toast.error("Failed to delete offer");
        }
    }

    async function handleToggleOffer(offer: Offer) {
        try {
            const res = await fetch(`/api/admin/offers`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: offer.id, isActive: !offer.isActive }),
            });
            if (!res.ok) throw new Error();
            setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, isActive: !o.isActive } : o));
        } catch {
            kravy.error();
            toast.error("Failed to update offer");
        }
    }

    return (
        <div className="w-full space-y-6 sm:space-y-8">
            {/* ── HEADER ── */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <button
                    onClick={() => router.back()}
                    className="p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)] hover:border-[var(--kravy-brand)]/50 transition-all shrink-0 active:scale-95 shadow-sm"
                >
                    <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">Offers & Coupons</h1>
                    <p className="text-[10px] sm:text-xs font-mono text-[var(--kravy-text-muted)] leading-snug">Manage discounts for your QR Menu</p>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Gift size={14} className="text-orange-500" />
                        </div>
                        <h2 className="text-[11px] font-black uppercase tracking-[2px] text-[var(--kravy-text-muted)]">Active Promotions</h2>
                    </div>
                    <button
                        onClick={() => setShowNewOffer(true)}
                        className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={14} /> New Offer
                    </button>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2.5 sm:gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-3.5 mb-4 text-xs font-[600] text-blue-700 leading-relaxed">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p>
                        Active offers appear on the customer{"'"}s <strong>QR Menu</strong> page and in the cart. Customers can copy the code and apply it at checkout.
                    </p>
                </div>

                {/* New Offer Form */}
                <AnimatePresence>
                    {showNewOffer && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[var(--kravy-surface)] border-2 border-orange-200 rounded-2xl p-5 mb-4 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Gift size={16} className="text-orange-500" />
                                <h3 className="font-black text-sm text-[var(--kravy-text-primary)]">Create New Offer</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1 block">Offer Title *</label>
                                    <input
                                        value={newOffer.title}
                                        onChange={e => setNewOffer(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Weekend Special"
                                        className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-400 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1 block">Coupon Code</label>
                                    <input
                                        value={newOffer.code}
                                        onChange={e => setNewOffer(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g. SAVE20"
                                        className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-4 py-2.5 text-sm font-bold font-mono outline-none focus:border-orange-400 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1 block">Discount Type</label>
                                    <div className="flex gap-2">
                                        {[{ v: "PERCENTAGE", l: "% Off" }, { v: "FLAT", l: "₹ Flat" }].map(opt => (
                                            <button
                                                key={opt.v}
                                                onClick={() => setNewOffer(p => ({ ...p, discountType: opt.v }))}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition ${newOffer.discountType === opt.v
                                                    ? 'bg-orange-500 text-white border-orange-500'
                                                    : 'bg-transparent text-[var(--kravy-text-muted)] border-[var(--kravy-border)]'
                                                    }`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1 block">
                                        Discount Value {newOffer.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
                                    </label>
                                    <input
                                        type="number"
                                        value={newOffer.discountValue}
                                        onChange={e => setNewOffer(p => ({ ...p, discountValue: Number(e.target.value) }))}
                                        min={1}
                                        className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-400 transition"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1 block">Min Order Value (₹) <span className="normal-case font-normal text-gray-400">— optional</span></label>
                                    <input
                                        type="number"
                                        value={newOffer.minOrderValue}
                                        onChange={e => setNewOffer(p => ({ ...p, minOrderValue: Number(e.target.value) }))}
                                        min={0}
                                        placeholder="0 = no minimum"
                                        className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-400 transition"
                                    />
                                </div>
                            </div>

                            {/* Preview chip */}
                            {newOffer.title && (
                                <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shrink-0">
                                        <Tag size={16} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm text-gray-800">
                                            {newOffer.discountType === "PERCENTAGE" ? `${newOffer.discountValue}% OFF` : `₹${newOffer.discountValue} OFF`}
                                        </div>
                                        {newOffer.code && <div className="text-[0.65rem] font-black text-orange-600 mt-0.5">CODE: {newOffer.code}</div>}
                                    </div>
                                    <div className="ml-auto text-[0.65rem] text-gray-400 font-bold italic">Preview on QR Menu</div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setShowNewOffer(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--kravy-border)] text-sm font-black text-[var(--kravy-text-muted)] hover:bg-gray-50 transition">Cancel</button>
                                <button
                                    onClick={handleCreateOffer}
                                    disabled={savingOffer}
                                    className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {savingOffer ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {savingOffer ? "Creating..." : "Create Offer"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Offers List */}
                {offersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[var(--kravy-brand)]" /></div>
                ) : offers.length === 0 ? (
                    <div className="text-center py-12 bg-[var(--kravy-surface)] border border-dashed border-[var(--kravy-border)] rounded-2xl">
                        <PackageOpen size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-[var(--kravy-text-muted)]">No offers yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click {"'"}New Offer{"'"} to create your first discount</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {offers.map((offer, i) => (
                            <motion.div
                                key={offer.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`bg-[var(--kravy-surface)] border rounded-2xl px-4 py-4 flex items-center gap-3 transition-all ${offer.isActive ? 'border-orange-200' : 'border-[var(--kravy-border)] opacity-60'}`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${offer.isActive ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
                                    <BadgePercent size={20} />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-black text-[0.88rem] text-[var(--kravy-text-primary)]">{offer.title}</span>
                                        {offer.isActive
                                            ? <span className="text-[0.55rem] font-black bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full uppercase">Live</span>
                                            : <span className="text-[0.55rem] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full uppercase">Paused</span>
                                        }
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[0.72rem] font-black text-orange-600">
                                            {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                                        </span>
                                        {offer.code && (
                                            <span className="text-[0.62rem] font-black bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md text-orange-700 font-mono">{offer.code}</span>
                                        )}
                                        {offer.minOrderValue && offer.minOrderValue > 0 && (
                                            <span className="text-[0.6rem] text-gray-400 font-bold">Min ₹{offer.minOrderValue}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleToggleOffer(offer)} title={offer.isActive ? "Pause offer" : "Activate offer"}>
                                        {offer.isActive
                                            ? <ToggleRight size={28} className="text-green-500" />
                                            : <ToggleLeft size={28} className="text-gray-300" />
                                        }
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOffer(offer.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

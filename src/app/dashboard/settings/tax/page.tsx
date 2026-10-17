"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Percent, ChevronLeft, Save, Loader2, Settings2,
    Tag, CheckCircle2, Circle, Info, ToggleLeft, ToggleRight,
    Gift, Flame, ShieldCheck, BadgePercent, Trash2, Plus,
    PackageOpen, ReceiptText, AlertTriangle, QrCode, UtensilsCrossed, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";



export default function PricingSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [taxEnabled, setTaxEnabled] = useState(true);
    const [qrMenuPriceInclusive, setQrMenuPriceInclusive] = useState(false);
    const [enableKOTWithBill, setEnableKOTWithBill] = useState(false);
    const [enableMenuQRInBill, setEnableMenuQRInBill] = useState(false);
    const [syncQuickPosWithKitchen, setSyncQuickPosWithKitchen] = useState(false);
    
    // Additional Charges
    const [enableDeliveryCharges, setEnableDeliveryCharges] = useState(false);
    const [deliveryChargeAmount, setDeliveryChargeAmount] = useState(0);
    const [enablePackagingCharges, setEnablePackagingCharges] = useState(false);
    const [packagingChargeAmount, setPackagingChargeAmount] = useState(0);

    const [deliveryGstEnabled, setDeliveryGstEnabled] = useState(false);
    const [deliveryGstRate, setDeliveryGstRate] = useState(0);
    const [packagingGstEnabled, setPackagingGstEnabled] = useState(false);
    const [packagingGstRate, setPackagingGstRate] = useState(0);

    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const { profile: cachedProfile, loading: profileLoading, updateProfile } = useProfileCache();
    useEffect(() => {
        console.log(`[KRAVY-PERF] PAGE_MOUNT: TaxPage mounted`);
    }, []);

    // Populate data quickly when cache is available
    useEffect(() => {
        if (!profileLoading) {
            console.log(`[KRAVY-PERF] LOADING_STATE_END: TaxPage loading completed`);
            setLoading(false);
        }
        
        if (cachedProfile) {
            setBusinessProfile(cachedProfile);
            setTaxEnabled(cachedProfile?.taxEnabled ?? true);
            setQrMenuPriceInclusive(cachedProfile?.qrMenuPriceInclusive ?? false);
            setEnableDeliveryCharges(cachedProfile?.enableDeliveryCharges ?? false);
            setDeliveryChargeAmount(cachedProfile?.deliveryChargeAmount ?? 0);
            setEnablePackagingCharges(cachedProfile?.enablePackagingCharges ?? false);
            setPackagingChargeAmount(cachedProfile?.packagingChargeAmount ?? 0);
            setDeliveryGstEnabled(cachedProfile?.deliveryGstEnabled ?? false);
            setDeliveryGstRate(cachedProfile?.deliveryGstRate ?? 0);
            setPackagingGstEnabled(cachedProfile?.packagingGstEnabled ?? false);
            setPackagingGstRate(cachedProfile?.packagingGstRate ?? 0);
            setSyncQuickPosWithKitchen(cachedProfile?.syncQuickPosWithKitchen ?? false);
            setEnableKOTWithBill(cachedProfile?.enableKOTWithBill ?? false);
            setEnableMenuQRInBill(cachedProfile?.enableMenuQRInBill ?? false);
        }
    }, [cachedProfile, profileLoading]);


    async function handleSaveTax() {
        setSaving(true);
        try {
            const payload = { 
                taxEnabled, 
                qrMenuPriceInclusive, 
                enableDeliveryCharges,
                deliveryChargeAmount: Number(deliveryChargeAmount),
                enablePackagingCharges,
                packagingChargeAmount: Number(packagingChargeAmount),
                deliveryGstEnabled,
                deliveryGstRate: Number(deliveryGstRate),
                packagingGstEnabled,
                packagingGstRate: Number(packagingGstRate),
                syncQuickPosWithKitchen,
                enableKOTWithBill,
                enableMenuQRInBill
            };
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                console.error("Save Tax Error Response:", data);
                throw new Error(data.error || data.message || "Failed to save settings");
            }
            
            updateProfile(data, false);
            kravy.success();
            toast.success("Tax settings saved! ✅");
        } catch (err: any) {
            console.error("Save Tax Error:", err);
            kravy.error();
            toast.error(`Error: ${err.message || "Failed to save tax settings"}`);
        } finally {
            setSaving(false);
        }
    }



    async function handleToggleKOT(newVal: boolean) {
        const oldVal = enableKOTWithBill;
        setEnableKOTWithBill(newVal);
        try {
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enableKOTWithBill: newVal }),
            });
            if (res.ok) {
                const data = await res.json();
                setBusinessProfile(data);
                updateProfile(data, false);
                kravy.success();
                toast.success(`Auto-KOT ${newVal ? 'Enabled' : 'Disabled'} ✅`);
            } else {
                throw new Error("Failed to save");
            }
        } catch {
            kravy.error();
            toast.error("Failed to save printing preference");
            setEnableKOTWithBill(oldVal);
        }
    }
    async function handleToggleMenuQR(val: boolean) {
        const oldVal = enableMenuQRInBill;
        setEnableMenuQRInBill(val);
        try {
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enableMenuQRInBill: val }),
            });
            if (res.ok) {
                const data = await res.json();
                setBusinessProfile(data);
                updateProfile(data, false);
                kravy.success();
                toast.success(`Menu QR ${val ? 'Enabled' : 'Disabled'} on Bills ✅`);
            } else {
                throw new Error("Failed to save");
            }
        } catch {
            kravy.error();
            toast.error("Failed to update setting");
            setEnableMenuQRInBill(oldVal);
        }
    }

    const PRESET_RATES = [5, 12, 18, 28];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-[var(--kravy-brand)] animate-spin" />
            </div>
        );
    }


    const copySchema = async () => {
        if (!cachedProfile) {
            toast.error("No profile data to copy");
            return;
        }

        const debugData = {
            apiUrls: [
                "/api/profile (GET/PUT)"
            ],
            profileSchema: cachedProfile
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
            kravy.success();
            toast.success("JSON Schema Copied! ✅");
        } catch (err) {
            console.error("Failed to copy", err);
            toast.error("Copy failed! See console.");
        }
    };

    return (
        <div className="w-full space-y-6 sm:space-y-8">

            {/* ── HEADER ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)] hover:border-[var(--kravy-brand)]/50 transition-all shrink-0 active:scale-95 shadow-sm"
                    >
                        <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">Pricing & Tax</h1>
                        <p className="text-[10px] sm:text-xs font-mono text-[var(--kravy-text-muted)] leading-snug">Control GST, discount offers · affects catalog & billing</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
                    <button
                        onClick={copySchema}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 md:px-3.5 py-1.5 sm:py-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs md:text-sm font-bold hover:border-[var(--kravy-brand)] transition-all active:scale-95 shadow-sm whitespace-nowrap"
                        title="Copy JSON Schema"
                    >
                        <Copy size={13} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[var(--kravy-text-muted)]" /> Schema
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/settings/tax-management')}
                        className="flex items-center gap-1.5 px-3 sm:px-3.5 md:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] sm:text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <PackageOpen size={13} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> Manage Item Taxes
                    </button>
                </div>
            </div>

            {/* ── SECTION 1: QUICK POS GST SETTINGS ── */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-[var(--kravy-brand)]/10 rounded-lg flex items-center justify-center">
                        <Percent size={14} className="text-[var(--kravy-brand)]" />
                    </div>
                    <h2 className="text-[11px] font-black uppercase tracking-[2px] text-[var(--kravy-text-muted)]">Quick POS Tax Settings</h2>
                </div>

                <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl overflow-hidden shadow-sm">

                    {/* Global GST Toggle Row */}
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] bg-[var(--kravy-brand)]/5 gap-3">
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${taxEnabled ? 'bg-[var(--kravy-brand)]/20 text-[var(--kravy-brand)]' : 'bg-gray-100 text-gray-400'}`}>
                                <Percent size={18} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Enable GST on Orders</div>
                                <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                    {taxEnabled 
                                        ? "GST will be calculated and printed on bills" 
                                        : "GST calculation disabled completely"}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setTaxEnabled(!taxEnabled)} className="shrink-0">
                            {taxEnabled
                                ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-[var(--kravy-brand)]" />
                                : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                            }
                        </button>
                    </div>
                    
                    {taxEnabled && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-3 border-b border-[var(--kravy-border)] bg-[var(--kravy-brand)]/5 sm:pl-[68px]">
                            <div className="text-xs sm:text-[0.8rem] text-[var(--kravy-text-muted)] font-medium">
                                Configure item-wise GST rates and HSN codes
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/settings/tax-management')}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] hover:bg-[var(--kravy-brand)] hover:text-white rounded-lg text-xs font-bold transition-all w-fit"
                            >
                                <PackageOpen size={14} /> Manage Item Taxes
                            </button>
                        </div>
                    )}

                    {/* KOT with Bill Toggle Row */}
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] gap-3">
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${enableKOTWithBill ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                <ReceiptText size={18} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Auto-Print KOT with Bill</div>
                                <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                    {enableKOTWithBill 
                                        ? "KOT will print automatically with bill" 
                                        : "Print KOT and Bill separately"}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleToggleKOT(!enableKOTWithBill)} className="shrink-0">
                            {enableKOTWithBill
                                ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-emerald-500" />
                                : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                            }
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] gap-3">
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${enableMenuQRInBill ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                <QrCode size={18} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Print Menu QR on Bill</div>
                                <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                    {enableMenuQRInBill 
                                        ? "Digital menu QR will print on bill" 
                                        : "No menu QR on bills"}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleToggleMenuQR(!enableMenuQRInBill)} className="shrink-0">
                            {enableMenuQRInBill
                                ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-indigo-500" />
                                : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                            }
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] gap-3">
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${syncQuickPosWithKitchen ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                <UtensilsCrossed size={18} className="sm:w-5 sm:h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Sync Quick POS with Kitchen</div>
                                <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                    {syncQuickPosWithKitchen 
                                        ? "POS orders auto-sent to Kitchen" 
                                        : "Standard POS (no kitchen sync)"}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSyncQuickPosWithKitchen(!syncQuickPosWithKitchen)} className="shrink-0">
                            {syncQuickPosWithKitchen
                                ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-orange-500" />
                                : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                            }
                        </button>
                    </div>

                    {/* Delivery Charges Toggle */}
                    <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${enableDeliveryCharges ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <ShieldCheck size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Enable Delivery Charges</div>
                                    <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                        Fixed charge added to delivery orders
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEnableDeliveryCharges(!enableDeliveryCharges)} className="shrink-0">
                                {enableDeliveryCharges
                                    ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-blue-500" />
                                    : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                                }
                            </button>
                        </div>
                        {enableDeliveryCharges && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="pl-2 sm:pl-[54px] pr-2 pb-2 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1.5 block">Charge Amount (₹)</label>
                                    <div className="relative max-w-[150px]">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={deliveryChargeAmount}
                                            onChange={e => setDeliveryChargeAmount(Number(e.target.value))}
                                            className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl pl-8 pr-4 py-2 text-sm font-black text-[var(--kravy-text-primary)] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setDeliveryGstEnabled(!deliveryGstEnabled)}
                                            className={`p-1.5 rounded-lg transition-all ${deliveryGstEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {deliveryGstEnabled ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                        </button>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-primary)]">GST on Delivery</div>
                                            <div className="text-[9px] text-[var(--kravy-text-muted)] font-bold">Calculate tax on charge</div>
                                        </div>
                                    </div>

                                    {deliveryGstEnabled && (
                                        <div className="relative w-28 sm:max-w-[100px]">
                                            <input
                                                type="number"
                                                placeholder="GST %"
                                                value={deliveryGstRate}
                                                onChange={e => setDeliveryGstRate(Number(e.target.value))}
                                                className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-3 py-1.5 text-xs font-black text-[var(--kravy-text-primary)] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--kravy-text-muted)]">%</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Packaging Charges Toggle */}
                    <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[var(--kravy-border)] space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${enablePackagingCharges ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <BadgePercent size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-black text-xs sm:text-[0.9rem] text-[var(--kravy-text-primary)] truncate">Enable Packaging Charges</div>
                                    <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-medium truncate">
                                        Fixed charge for takeaway/delivery orders
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEnablePackagingCharges(!enablePackagingCharges)} className="shrink-0">
                                {enablePackagingCharges
                                    ? <ToggleRight size={32} className="sm:w-9 sm:h-9 text-rose-500" />
                                    : <ToggleLeft size={32} className="sm:w-9 sm:h-9 text-gray-300" />
                                }
                            </button>
                        </div>
                        {enablePackagingCharges && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="pl-2 sm:pl-[54px] pr-2 pb-2 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-1.5 block">Charge Amount (₹)</label>
                                    <div className="relative max-w-[150px]">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={packagingChargeAmount}
                                            onChange={e => setPackagingChargeAmount(Number(e.target.value))}
                                            className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl pl-8 pr-4 py-2 text-sm font-black text-[var(--kravy-text-primary)] focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setPackagingGstEnabled(!packagingGstEnabled)}
                                            className={`p-1.5 rounded-lg transition-all ${packagingGstEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            {packagingGstEnabled ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                        </button>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-primary)]">GST on Packaging</div>
                                            <div className="text-[9px] text-[var(--kravy-text-muted)] font-bold">Calculate tax on charge</div>
                                        </div>
                                    </div>

                                    {packagingGstEnabled && (
                                        <div className="relative w-28 sm:max-w-[100px]">
                                            <input
                                                type="number"
                                                placeholder="GST %"
                                                value={packagingGstRate}
                                                onChange={e => setPackagingGstRate(Number(e.target.value))}
                                                className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl px-3 py-1.5 text-xs font-black text-[var(--kravy-text-primary)] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--kravy-text-muted)]">%</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Save Tax Button */}
                <button
                    onClick={handleSaveTax}
                    disabled={saving}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--kravy-brand)] text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[var(--kravy-brand)]/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Saving..." : "Save Tax Settings"}
                </button>
            </section>


            {/* ── SECTION 2: OFFERS & DISCOUNTS ── */}
            <section>
                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                            <Tag size={20} className="sm:w-6 sm:h-6 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate">Offers & Coupons</h2>
                            <p className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5 truncate">Manage discounts for your QR Menu</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/settings/offers')}
                        className="px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 whitespace-nowrap text-center"
                    >
                        Manage Offers
                    </button>
                </div>
            </section>

            {/* ── FOOTER NOTE ── */}
            <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-[0.72rem] font-[600] text-amber-700 leading-relaxed">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                    GST changes apply to new orders only.
                </span>
            </div>

        </div>
    );
}

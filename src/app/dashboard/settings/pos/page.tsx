"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    LayoutDashboard, Check, ArrowLeft, Save, 
    Banknote, Smartphone, CreditCard, Store, Wallet,
    PauseCircle, SaveAll, Eye, Printer, AlertCircle, Clock, Layers, Bluetooth
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function PosLayoutSettings() {
    const router = useRouter();
    const { profile: cachedProfile, loading: profileLoading, updateProfile } = useProfileCache();
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        posCashEnabled: true,
        posUpiEnabled: true,
        posCardEnabled: true,
        posCounterEnabled: true,
        posWalletEnabled: true,
        posHoldEnabled: true,
        posSaveEnabled: true,
        posPreviewEnabled: true,
        posKotEnabled: true,
        expiryTrackingEnabled: true,
        allowWalletEditDelete: true,
        enableVirtualGroupVariants: true,
        posHtmlPrintEnabled: true,
        posWebBtPrintEnabled: true,
    });
    const loading = profileLoading && !cachedProfile;

    useEffect(() => {
        if (cachedProfile) {
            setSettings({
                posCashEnabled: cachedProfile.posCashEnabled ?? true,
                posUpiEnabled: cachedProfile.posUpiEnabled ?? true,
                posCardEnabled: cachedProfile.posCardEnabled ?? true,
                posCounterEnabled: cachedProfile.posCounterEnabled ?? true,
                posWalletEnabled: cachedProfile.posWalletEnabled ?? true,
                posHoldEnabled: cachedProfile.posHoldEnabled ?? true,
                posSaveEnabled: cachedProfile.posSaveEnabled ?? true,
                posPreviewEnabled: cachedProfile.posPreviewEnabled ?? true,
                posKotEnabled: cachedProfile.posKotEnabled ?? true,
                expiryTrackingEnabled: cachedProfile.expiryTrackingEnabled ?? false,
                allowWalletEditDelete: cachedProfile.allowWalletEditDelete ?? cachedProfile.printSettings?.allowWalletEditDelete ?? true,
                enableVirtualGroupVariants: cachedProfile.enableVirtualGroupVariants ?? cachedProfile.printSettings?.enableVirtualGroupVariants ?? true,
                posHtmlPrintEnabled: cachedProfile.posHtmlPrintEnabled ?? cachedProfile.printSettings?.posHtmlPrintEnabled ?? true,
                posWebBtPrintEnabled: cachedProfile.posWebBtPrintEnabled ?? cachedProfile.printSettings?.posWebBtPrintEnabled ?? true,
            });
        }
    }, [cachedProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...settings,
                ...(cachedProfile?.id ? { id: cachedProfile.id } : {})
            };
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                updateProfile(settings, false);
                kravy.success();
                toast.success("POS layout updated");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const toggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div className="p-10 text-center opacity-50">Loading POS Controls...</div>;

    const VisibilityToggle = ({ 
        icon: Icon, 
        label, 
        sKey,
        desc
    }: { 
        icon: any, 
        label: string, 
        sKey: keyof typeof settings,
        desc: string
    }) => (
        <button 
            onClick={() => toggle(sKey)}
            className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all text-left group ${
                settings[sKey] 
                ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" 
                : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60"
            }`}
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                settings[sKey] 
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" 
                : "bg-slate-200 dark:bg-white/5 text-slate-400"
            }`}>
                <Icon size={22} />
            </div>
            
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className={`font-bold transition-all ${settings[sKey] ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{label}</h3>
                    {settings[sKey] && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest mt-0.5">{desc}</p>
            </div>

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                settings[sKey] 
                ? "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-400" 
                : "bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-300"
            }`}>
                {settings[sKey] ? <Check size={18} strokeWidth={3} /> : null}
            </div>
        </button>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8 kravy-page-fade pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-110 transition-all shadow-sm cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Quick POS Layout</h1>
                        <p className="text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Configure visible buttons & actions</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="h-14 px-10 rounded-[1.5rem] bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-2xl shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95"
                >
                    <Save size={18} />
                    {saving ? "Saving Config..." : "Update Layout"}
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-violet-600/5 border border-violet-500/20 p-8 rounded-[2.5rem] flex gap-6 items-start">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div className="space-y-2">
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">Smart Interface Control</p>
                    <p className="text-sm text-slate-500 dark:text-white/60 leading-relaxed font-medium">
                        Aap apne checkout screen ko customize kar sakte hain. Jo options aap nahi use karte, unhe yahan se <b>Disable</b> kar dein taaki interface saaf dikhe. Default saare options enabled rehte hain.
                    </p>
                </div>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Payment Methods */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Payment Gateways</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <VisibilityToggle icon={Banknote} label="Cash Payment" sKey="posCashEnabled" desc="Physical currency option" />
                        <VisibilityToggle icon={Smartphone} label="UPI Payment" sKey="posUpiEnabled" desc="Digital QR/VPA payments" />
                        <VisibilityToggle icon={CreditCard} label="Card Payment" sKey="posCardEnabled" desc="Visa, Master, Rupay" />
                        <VisibilityToggle icon={Store} label="Counter Pay" sKey="posCounterEnabled" desc="Pay at desk/reception" />
                        <VisibilityToggle icon={Wallet} label="Wallet Pay" sKey="posWalletEnabled" desc="Store credit/Wallets" />
                    </div>
                </div>

                {/* POS Actions */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">POS Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <VisibilityToggle icon={PauseCircle} label="Hold Order" sKey="posHoldEnabled" desc="Pause session for later" />
                        <VisibilityToggle icon={SaveAll} label="Save Bill" sKey="posSaveEnabled" desc="Store in history without print" />
                        <VisibilityToggle icon={Eye} label="Preview" sKey="posPreviewEnabled" desc="View layout before final" />
                        <VisibilityToggle icon={Printer} label="KOT Print" sKey="posKotEnabled" desc="Print tokens for kitchen" />
                        <VisibilityToggle icon={Clock} label="Expiry Tracking" sKey="expiryTrackingEnabled" desc="Show item expiration alerts" />
                        <VisibilityToggle icon={Wallet} label="Wallet Tx Edit & Delete" sKey="allowWalletEditDelete" desc="Allow staff to edit or delete past wallet history" />
                        <VisibilityToggle icon={Layers} label="Combine Variants / Addons" sKey="enableVirtualGroupVariants" desc="Group Half/Full/Size variants into 1 card with popup" />
                    </div>
                </div>

                {/* Printing Methods */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Print Button Visbility</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <VisibilityToggle icon={Printer} label="HTML Print (System Dialog)" sKey="posHtmlPrintEnabled" desc="Show the regular browser print button" />
                        <VisibilityToggle icon={Bluetooth} label="Direct BT Print" sKey="posWebBtPrintEnabled" desc="Show the fast Web Bluetooth direct print button" />
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-slate-100 dark:border-white/5 text-center">
                <p className="text-[10px] text-slate-300 dark:text-white/10 uppercase tracking-[6px] font-black italic">
                    Kravy POS · Visual Experience Engine
                </p>
            </div>
        </div>
    );
}

"use client";
import { useCurrency } from "@/lib/currency-context";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    Users, CheckCircle2, AlertCircle, Save, ArrowLeft, 
    User, Phone, MapPin, Check, Zap, Clock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function CustomerDataSettings() {
  const router = useRouter();
  const { currencySymbol: sym } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        collectCustomerName: true,
        requireCustomerName: false,
        collectCustomerPhone: true,
        requireCustomerPhone: false,
        collectCustomerAddress: false,
        requireCustomerAddress: false,
        isOnline: true,
        openingTime: "00:00",
        closingTime: "23:59",
        offlineMessage: "Restaurant is currently closed or not accepting orders.",
        servedStatusLabel: "SERVED",
        qrDeliveryChargeEnabled: false,
        qrDeliveryChargeAmount: 0,
        qrPackagingChargeEnabled: false,
        qrPackagingChargeAmount: 0,
        allowWalletEditDelete: true,
        qrPayCashEnabled: false,
        qrPayUpiEnabled: true,
        qrPayCardEnabled: false,
    });

    const { profile: data, updateProfile } = useProfileCache();
    const [hasInitProfile, setHasInitProfile] = useState(false);

    useEffect(() => {
        if (data && !hasInitProfile) {
            setSettings({
                collectCustomerName: data.collectCustomerName ?? true,
                requireCustomerName: data.requireCustomerName ?? false,
                collectCustomerPhone: data.collectCustomerPhone ?? true,
                requireCustomerPhone: data.requireCustomerPhone ?? false,
                collectCustomerAddress: data.collectCustomerAddress ?? false,
                requireCustomerAddress: data.requireCustomerAddress ?? false,
                isOnline: data.isOnline ?? true,
                openingTime: data.openingTime ?? "00:00",
                closingTime: data.closingTime ?? "23:59",
                offlineMessage: data.offlineMessage ?? "Restaurant is currently closed or not accepting orders.",
                servedStatusLabel: data.servedStatusLabel ?? "SERVED",
                qrDeliveryChargeEnabled: data.qrDeliveryChargeEnabled ?? false,
                qrDeliveryChargeAmount: data.qrDeliveryChargeAmount ?? 0,
                qrPackagingChargeEnabled: data.qrPackagingChargeEnabled ?? false,
                qrPackagingChargeAmount: data.qrPackagingChargeAmount ?? 0,
                allowWalletEditDelete: data.printSettings?.allowWalletEditDelete ?? data.allowWalletEditDelete ?? true,
                qrPayCashEnabled: data.qrPayCashEnabled ?? false,
                qrPayUpiEnabled: data.qrPayUpiEnabled ?? true,
                qrPayCardEnabled: data.qrPayCardEnabled ?? false,
            });
            setLoading(false);
            setHasInitProfile(true);
        }
    }, [data, hasInitProfile]);

    const handleSave = async () => {
        console.log("DEBUG: Saving Settings:", settings);
        setSaving(true);
        try {
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                updateProfile(settings, false);
                kravy.success();
                toast.success("Settings updated successfully");
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

    if (loading) return <div className="p-10 text-center opacity-50">Loading Configuration...</div>;

    const FieldOption = ({ 
        icon: Icon, 
        label, 
        collectKey, 
        requireKey 
    }: { 
        icon: any, 
        label: string, 
        collectKey: keyof typeof settings, 
        requireKey: keyof typeof settings 
    }) => (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 transition-all hover:border-blue-500/30 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 capitalize">{label}</h3>
                    <p className="text-xs text-slate-500 font-mono">Configure how you collect {label} from QR Menu</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Collect Toggle */}
                <button 
                    onClick={() => toggle(collectKey)}
                    className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all text-left ${
                        settings[collectKey] 
                        ? "bg-blue-600/10 border-blue-500/50 text-blue-600" 
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] uppercase font-black tracking-widest">Visibility</span>
                        {settings[collectKey] ? <Check size={14} /> : null}
                    </div>
                    <span className="text-sm font-bold">{settings[collectKey] ? "Visible (Enabled)" : "Hidden (Disabled)"}</span>
                </button>

                {/* Mandatory Toggle */}
                <button 
                    disabled={!settings[collectKey]}
                    onClick={() => toggle(requireKey)}
                    className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all text-left ${
                        !settings[collectKey] 
                        ? "opacity-30 cursor-not-allowed bg-slate-100 border-slate-200" 
                        : settings[requireKey] 
                            ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-600" 
                            : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] uppercase font-black tracking-widest">Requirement</span>
                        {settings[requireKey] ? <Check size={14} /> : null}
                    </div>
                    <span className="text-sm font-bold">{settings[requireKey] ? "Mandatory (Required)" : "Optional"}</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 kravy-page-fade">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-slate-600 cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Setup</h1>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">QR Menu Data Collection Rules</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50 transition-all active:scale-95"
                >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl flex gap-4 items-start">
                <AlertCircle size={20} className="text-blue-600 mt-1 shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">Why configure this?</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-mono">
                        Har restaurant ki zaroorat alag hoti hai. Agar aap chahte hain ki orders se pehle customers apna <b>Address</b> bhi dein, to niche toggles ka istemal karein. Mandatory karne pe customer bina detail bhare order nahi kar payega.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <FieldOption icon={User} label="Customer Name" collectKey="collectCustomerName" requireKey="requireCustomerName" />
                <FieldOption icon={Phone} label="Customer Phone" collectKey="collectCustomerPhone" requireKey="requireCustomerPhone" />
                <FieldOption icon={MapPin} label="Customer Address" collectKey="collectCustomerAddress" requireKey="requireCustomerAddress" />
            </div>

            {/* ✅ RESTAURANT TIMING & ONLINE STATUS */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Ordering Status & Timing</h3>
                            <p className="text-xs text-slate-500 font-mono">Set when customers can place orders via QR</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => toggle("isOnline")}
                        className={`h-12 px-6 rounded-2xl border transition-all font-bold flex items-center gap-2 ${
                            settings.isOnline 
                            ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-600" 
                            : "bg-rose-600/10 border-rose-500/50 text-rose-600"
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${settings.isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                        {settings.isOnline ? "ONLINE (Accepting Orders)" : "OFFLINE (Closed)"}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Operational Hours (24H Format)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="text-[10px] text-slate-400 font-black uppercase">Open At</span>
                                <input 
                                    type="time" 
                                    value={settings.openingTime}
                                    onChange={(e) => setSettings(prev => ({ ...prev, openingTime: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-black text-xl focus:border-orange-500/50 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] text-slate-400 font-black uppercase">Close At</span>
                                <input 
                                    type="time" 
                                    value={settings.closingTime}
                                    onChange={(e) => setSettings(prev => ({ ...prev, closingTime: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-black text-xl focus:border-orange-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Note: Customers can only order within these hours.</p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Offline Notice Message</label>
                        <textarea 
                            value={settings.offlineMessage}
                            onChange={(e) => setSettings(prev => ({ ...prev, offlineMessage: e.target.value }))}
                            rows={4}
                            placeholder="Restaurant is closed..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 focus:border-orange-500/50 outline-none transition-all resize-none"
                        />
                        <p className="text-[10px] text-slate-400 italic">Visible to customers when ordering is disabled.</p>
                    </div>
                </div>
            </div>

                {/* ── QR MENU PAYMENT OPTIONS ── */}
                <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] overflow-hidden shadow-2xl relative mb-8">
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-6 border-b border-[var(--kravy-border)] flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <Zap className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[var(--kravy-text-primary)]">QR Menu Payments</h2>
                                <p className="text-xs text-[var(--kravy-text-muted)] mt-1 font-medium">Select which payment methods customers can use on QR Menu</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {[
                            { id: 'qrPayUpiEnabled', label: 'Pay via UPI', desc: 'Allow customers to pay via UPI QR code before placing order' },
                            { id: 'qrPayCashEnabled', label: 'Pay via Cash', desc: 'Allow customers to select cash (Pay at Counter)' },
                            { id: 'qrPayCardEnabled', label: 'Pay via Card', desc: 'Allow customers to select card payment' },
                        ].map(opt => (
                            <div key={opt.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-[var(--kravy-border)]">
                                <div>
                                    <div className="text-sm font-bold text-[var(--kravy-text-primary)]">{opt.label}</div>
                                    <div className="text-xs text-[var(--kravy-text-muted)] mt-1">{opt.desc}</div>
                                </div>
                                <button
                                    onClick={() => toggle(opt.id as keyof typeof settings)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${settings[opt.id as keyof typeof settings] ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings[opt.id as keyof typeof settings] ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── CUSTOMER REQUIREMENT TOGGLES ── */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Custom Labels</h3>
                        <p className="text-xs text-slate-500 font-mono">Customize the text displayed on the order tracking page</p>
                    </div>
                </div>

                <div className="space-y-4 max-w-md">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Completed Status Label</label>
                    <input 
                        type="text" 
                        value={(settings as any).servedStatusLabel}
                        onChange={(e) => setSettings(prev => ({ ...prev, servedStatusLabel: e.target.value.toUpperCase() }))}
                        placeholder="e.g. DELIVERED, SERVED"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-black text-lg focus:border-indigo-500/50 outline-none transition-all uppercase"
                    />
                    <p className="text-[10px] text-slate-400 italic">This replaces "SERVED" on the tracking page.</p>
                </div>
            </div>

            {/* ✅ QR SPECIFIC ADDITIONAL CHARGES */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">QR Extra Charges</h3>
                        <p className="text-xs text-slate-500 font-mono">Automatically apply these charges on QR Code orders</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Delivery Charge */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-slate-900">QR Delivery Charge</h4>
                                <p className="text-[10px] text-slate-500 font-mono mt-1">Applied to all QR orders</p>
                            </div>
                            <button 
                                onClick={() => toggle("qrDeliveryChargeEnabled")}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.qrDeliveryChargeEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${settings.qrDeliveryChargeEnabled ? "left-7" : "left-1"}`} />
                            </button>
                        </div>
                        {settings.qrDeliveryChargeEnabled && (
                            <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Charge Amount ({sym})</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={settings.qrDeliveryChargeAmount}
                                    onChange={(e) => setSettings(prev => ({ ...prev, qrDeliveryChargeAmount: Number(e.target.value) }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black text-slate-900 outline-none focus:border-rose-500 transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Packaging Charge */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-slate-900">QR Packaging Charge</h4>
                                <p className="text-[10px] text-slate-500 font-mono mt-1">Applied to all QR orders</p>
                            </div>
                            <button 
                                onClick={() => toggle("qrPackagingChargeEnabled")}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.qrPackagingChargeEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${settings.qrPackagingChargeEnabled ? "left-7" : "left-1"}`} />
                            </button>
                        </div>
                        {settings.qrPackagingChargeEnabled && (
                            <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Charge Amount ({sym})</label>
                                <input 
                                    type="number"
                                    min="0"
                                    value={settings.qrPackagingChargeAmount}
                                    onChange={(e) => setSettings(prev => ({ ...prev, qrPackagingChargeAmount: Number(e.target.value) }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black text-slate-900 outline-none focus:border-rose-500 transition-all"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ WALLET SECURITY & TRANSACTION EDITING RULES */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Wallet History Controls</h3>
                            <p className="text-xs text-slate-500 font-mono">Control staff permissions for editing and deleting past transactions</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => toggle("allowWalletEditDelete")}
                        className={`h-12 px-6 rounded-2xl border transition-all font-bold flex items-center gap-2 ${
                            settings.allowWalletEditDelete 
                            ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-600" 
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${settings.allowWalletEditDelete ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {settings.allowWalletEditDelete ? "Enabled (Allow Edit & Delete)" : "Disabled (Hide Edit & Delete)"}
                    </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-mono">
                    When <b>Disabled</b>, the Edit (✏️) and Delete (🗑️) icons on customer wallet history will be hidden, preventing staff members from modifying past wallet deposits and withdrawals.
                </p>
            </div>

            <div className="pt-10 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-[4px] font-black italic">
                    Kravy POS · Customer Experience Configuration
                </p>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    Package, Save, ArrowLeft, Barcode, CheckCircle2, 
    AlertTriangle, ShieldCheck, ShieldAlert, Check, 
    Receipt, UtensilsCrossed, Bell, Sliders, Lock, Unlock, Power, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";
import { getInventorySettings } from "@/lib/inventory-utils";

type InsufficientStockBehavior = "allow" | "warn" | "block";
type DeductionTiming = "bill" | "kot";

export default function InventorySettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState<{
        enabled: boolean;
        insufficientStockBehavior: InsufficientStockBehavior;
        deductionTiming: DeductionTiming;
        lowStockAlerts: boolean;
        allowManagerOverride: boolean;
        enableSerialNumber: boolean;
        isStockCompulsory: boolean;
    }>({
        enabled: true,
        insufficientStockBehavior: "allow",
        deductionTiming: "bill",
        lowStockAlerts: true,
        allowManagerOverride: false,
        enableSerialNumber: false,
        isStockCompulsory: false,
    });

    const { profile: data, updateProfile } = useProfileCache();
    const [hasInitProfile, setHasInitProfile] = useState(false);

    useEffect(() => {
        if (data && !hasInitProfile) {
            const inv = getInventorySettings(data);

            setSettings({
                enabled: inv.enabled,
                insufficientStockBehavior: inv.insufficientStockBehavior || "allow",
                deductionTiming: inv.deductionTiming || "bill",
                lowStockAlerts: inv.lowStockAlerts !== undefined ? Boolean(inv.lowStockAlerts) : true,
                allowManagerOverride: inv.allowManagerOverride !== undefined ? Boolean(inv.allowManagerOverride) : false,
                enableSerialNumber: data.enableSerialNumber ?? inv.enableSerialNumber ?? false,
                isStockCompulsory: data.isStockCompulsory ?? inv.isStockCompulsory ?? false,
            });
            setLoading(false);
            setHasInitProfile(true);
        }
    }, [data, hasInitProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                id: data?.id,
                enableSerialNumber: settings.enableSerialNumber,
                isStockCompulsory: settings.isStockCompulsory,
                inventorySettings: {
                    enabled: settings.enabled,
                    insufficientStockBehavior: settings.insufficientStockBehavior,
                    deductionTiming: settings.deductionTiming,
                    lowStockAlerts: settings.lowStockAlerts,
                    allowManagerOverride: settings.allowManagerOverride,
                }
            };

            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                updateProfile(payload, false);
                kravy.success();
                toast.success("Inventory settings updated successfully");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const toggle = (key: "enabled" | "lowStockAlerts" | "allowManagerOverride" | "enableSerialNumber" | "isStockCompulsory") => {
        kravy.click();
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return (
        <div className="p-10 flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="w-8 h-8 border-3 border-[var(--kravy-brand)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-[var(--kravy-text-muted)]">Loading Inventory Settings...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--kravy-navbar-bg)] p-5 sm:p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-[var(--kravy-bg)] flex items-center justify-center hover:bg-[var(--kravy-bg-2)] transition-colors border border-[var(--kravy-border)] cursor-pointer shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2.5">
                            <Sliders className="text-[var(--kravy-brand)]" size={24} />
                            Inventory & Stock Rules
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-[var(--kravy-text-muted)] mt-0.5">
                            Configure stock validation, deduction timing, negative inventory, and tracking rules.
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-xl bg-[var(--kravy-brand)] text-white font-black uppercase tracking-widest text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[var(--kravy-brand)]/20 cursor-pointer"
                >
                    {saving ? "Saving..." : <><Save size={17} /> Save Changes</>}
                </button>
            </div>

            {/* MASTER SWITCH: Global Inventory Management */}
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all shadow-sm space-y-4 ${
                    settings.enabled 
                        ? "bg-[var(--kravy-surface)] border-[var(--kravy-brand)]/40 shadow-[var(--kravy-brand)]/5"
                        : "bg-[var(--kravy-bg)] border-[var(--kravy-border)]"
                }`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            settings.enabled 
                                ? "bg-[var(--kravy-brand)]/15 text-[var(--kravy-brand)]"
                                : "bg-neutral-500/10 text-neutral-400"
                        }`}>
                            <Package size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)]">
                                    Inventory Management
                                </h2>
                                <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                    settings.enabled 
                                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" 
                                        : "bg-neutral-500/15 text-neutral-500 border border-neutral-500/30"
                                }`}>
                                    {settings.enabled ? "Active" : "Disabled"}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-[var(--kravy-text-muted)] mt-0.5">
                                Enable stock tracking, low-stock alerts, and automated stock deductions.
                            </p>
                        </div>
                    </div>

                    {/* Master Switch Button */}
                    <button
                        type="button"
                        onClick={() => toggle("enabled")}
                        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.enabled ? "bg-[var(--kravy-brand)]" : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                        role="switch"
                        aria-checked={settings.enabled}
                    >
                        <span
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                settings.enabled ? "translate-x-8" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Explanation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        settings.enabled 
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400" 
                            : "border-[var(--kravy-border)] bg-[var(--kravy-surface)] text-[var(--kravy-text-muted)] opacity-60"
                    }`}>
                        <div className="font-black flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            When ON:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
                            <li>Stock quantity & Low Stock / Out of Stock indicators visible</li>
                            <li>Allow / Warn / Block inventory enforcement rules active</li>
                            <li>Automatic stock deduction on Bill / KOT and restoration on cancel</li>
                        </ul>
                    </div>

                    <div className={`p-3.5 rounded-2xl border transition-all ${
                        !settings.enabled 
                            ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400" 
                            : "border-[var(--kravy-border)] bg-[var(--kravy-surface)] text-[var(--kravy-text-muted)] opacity-60"
                    }`}>
                        <div className="font-black flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            When OFF:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
                            <li>Menu & item cards hide stock badges and inventory filters</li>
                            <li>Billing and KOT work smoothly without stock blocking or alerts</li>
                            <li>No stock deductions; all historical stock data safely preserved</li>
                        </ul>
                    </div>
                </div>
            </motion.div>

            {!settings.enabled && (
                <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Info size={18} className="shrink-0" />
                    <span>Inventory Management is currently OFF. The rules below will remain inactive until turned ON.</span>
                </div>
            )}

            {/* SECTION 1: Insufficient Stock Behavior */}
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--kravy-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Package size={20} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)]">
                            Insufficient Stock Behavior
                        </h3>
                        <p className="text-xs font-bold text-[var(--kravy-text-muted)]">
                            Choose how the billing and checkout systems react when an item has zero or less available stock than requested.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* Option A: Allow Sale */}
                    <div 
                        onClick={() => { kravy.click(); setSettings(prev => ({ ...prev, insufficientStockBehavior: "allow" })); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${settings.insufficientStockBehavior === "allow" ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/5" : "border-[var(--kravy-border)] hover:border-emerald-500/40 bg-[var(--kravy-bg)]"}`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600">
                                    Flexible
                                </span>
                                {settings.insufficientStockBehavior === "allow" && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h4 className="text-sm font-black text-[var(--kravy-text-primary)]">Allow Sale (Negative Stock)</h4>
                            <p className="text-xs text-[var(--kravy-text-muted)] mt-1 leading-relaxed">
                                Never block billing. Stock is deducted immediately and can go into negative numbers to capture real-world sales.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--kravy-border)] text-[11px] font-bold text-emerald-600">
                            Recommended for quick counters & fast-food.
                        </div>
                    </div>

                    {/* Option B: Warn Before Sale */}
                    <div 
                        onClick={() => { kravy.click(); setSettings(prev => ({ ...prev, insufficientStockBehavior: "warn" })); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${settings.insufficientStockBehavior === "warn" ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/5" : "border-[var(--kravy-border)] hover:border-amber-500/40 bg-[var(--kravy-bg)]"}`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600">
                                    Warn & Confirm
                                </span>
                                {settings.insufficientStockBehavior === "warn" && (
                                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h4 className="text-sm font-black text-[var(--kravy-text-primary)]">Warn Before Sale</h4>
                            <p className="text-xs text-[var(--kravy-text-muted)] mt-1 leading-relaxed">
                                Shows a confirmation dialog detailing which items have insufficient stock. The cashier can choose to proceed or modify the order.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--kravy-border)] text-[11px] font-bold text-amber-600">
                            Prevents accidental overselling while maintaining agility.
                        </div>
                    </div>

                    {/* Option C: Block Sale */}
                    <div 
                        onClick={() => { kravy.click(); setSettings(prev => ({ ...prev, insufficientStockBehavior: "block" })); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${settings.insufficientStockBehavior === "block" ? "border-rose-500 bg-rose-500/5 shadow-md shadow-rose-500/5" : "border-[var(--kravy-border)] hover:border-rose-500/40 bg-[var(--kravy-bg)]"}`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-600">
                                    Strict Block
                                </span>
                                {settings.insufficientStockBehavior === "block" && (
                                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h4 className="text-sm font-black text-[var(--kravy-text-primary)]">Block Sale</h4>
                            <p className="text-xs text-[var(--kravy-text-muted)] mt-1 leading-relaxed">
                                Strictly blocks the sale if available quantity is less than requested. Staff cannot proceed unless Manager Override is enabled.
                            </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--kravy-border)] text-[11px] font-bold text-rose-600">
                            Zero tolerance for inventory discrepancies.
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* SECTION 2: Stock Deduction Timing */}
            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-[var(--kravy-surface)] p-5 sm:p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Receipt size={20} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)]">
                            Stock Deduction Timing
                        </h3>
                        <p className="text-xs font-bold text-[var(--kravy-text-muted)]">
                            Select the operational moment when stock and recipe raw materials should be deducted.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Timing A: Final Bill / Settlement */}
                    <div 
                        onClick={() => { kravy.click(); setSettings(prev => ({ ...prev, deductionTiming: "bill" })); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${settings.deductionTiming === "bill" ? "border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/5" : "border-[var(--kravy-border)] hover:border-blue-500/40 bg-[var(--kravy-bg)]"}`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600">
                                    Standard POS
                                </span>
                                {settings.deductionTiming === "bill" && (
                                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h4 className="text-sm font-black text-[var(--kravy-text-primary)]">Final Bill / Settlement (Default)</h4>
                            <p className="text-xs text-[var(--kravy-text-muted)] mt-1 leading-relaxed">
                                Deduct inventory only upon final bill creation, checkout, or settlement. KOTs and open table orders remain in kitchen staging without deducting stock.
                            </p>
                        </div>
                    </div>

                    {/* Timing B: KOT / Order Submission */}
                    <div 
                        onClick={() => { kravy.click(); setSettings(prev => ({ ...prev, deductionTiming: "kot" })); }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${settings.deductionTiming === "kot" ? "border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/5" : "border-[var(--kravy-border)] hover:border-indigo-500/40 bg-[var(--kravy-bg)]"}`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-600">
                                    Real-time Kitchen
                                </span>
                                {settings.deductionTiming === "kot" && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            <h4 className="text-sm font-black text-[var(--kravy-text-primary)]">KOT / Order Submission</h4>
                            <p className="text-xs text-[var(--kravy-text-muted)] mt-1 leading-relaxed">
                                Deduct inventory immediately when an order or KOT is fired to the kitchen. When the final bill is settled, only newly added items are deducted to avoid double deduction.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* SECTION 3 & 4: Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Setting 3: Low Stock Alerts */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--kravy-surface)] p-5 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[var(--kravy-text-primary)]">Low Stock Alerts</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-muted)]">Reorder Level Notifications</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--kravy-text-muted)] mt-2 mb-4 leading-relaxed">
                            Highlight low-stock items in the POS menu and Inventory Hub when current quantity is at or below the item's configured reorder level.
                        </p>
                    </div>

                    <label className="flex items-center justify-between gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-3.5 rounded-xl border border-[var(--kravy-border)] hover:border-amber-500/50 transition-colors mt-auto">
                        <span className="text-xs font-bold text-[var(--kravy-text-primary)]">Enable Low Stock Indicators</span>
                        <input 
                            type="checkbox" 
                            checked={settings.lowStockAlerts}
                            onChange={() => toggle("lowStockAlerts")}
                            className="w-5 h-5 rounded min-w-[20px] accent-amber-500 cursor-pointer"
                        />
                    </label>
                </motion.div>

                {/* Setting 4: Manager Override */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-[var(--kravy-surface)] p-5 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[var(--kravy-text-primary)]">Manager Override</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-muted)]">Authorize Blocked Sales</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--kravy-text-muted)] mt-2 mb-4 leading-relaxed">
                            When "Block Sale" is enabled, allow staff with Manager or Admin credentials to authorize sales of items with insufficient stock.
                        </p>
                    </div>

                    <label className="flex items-center justify-between gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-3.5 rounded-xl border border-[var(--kravy-border)] hover:border-purple-500/50 transition-colors mt-auto">
                        <span className="text-xs font-bold text-[var(--kravy-text-primary)]">Allow Manager Override</span>
                        <input 
                            type="checkbox" 
                            checked={settings.allowManagerOverride}
                            onChange={() => toggle("allowManagerOverride")}
                            className="w-5 h-5 rounded min-w-[20px] accent-purple-500 cursor-pointer"
                        />
                    </label>
                </motion.div>

                {/* Setting 5: Serial Number Generation (Preserved) */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--kravy-surface)] p-5 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0">
                                <Barcode size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[var(--kravy-text-primary)]">Serial Number Generation</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-muted)]">Automatic Inventory Codes</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--kravy-text-muted)] mt-2 mb-4 leading-relaxed">
                            Automatically assign a sequential inventory code (e.g. 10500) to every new item added to the menu. If disabled, a random unique code is generated.
                        </p>
                    </div>

                    <label className="flex items-center justify-between gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-3.5 rounded-xl border border-[var(--kravy-border)] hover:border-teal-500/50 transition-colors mt-auto">
                        <span className="text-xs font-bold text-[var(--kravy-text-primary)]">Enable Serial Number (Inventory Code)</span>
                        <input 
                            type="checkbox" 
                            checked={settings.enableSerialNumber}
                            onChange={() => toggle("enableSerialNumber")}
                            className="w-5 h-5 rounded min-w-[20px] accent-teal-500 cursor-pointer"
                        />
                    </label>
                </motion.div>

                {/* Setting 6: Compulsory Stock Entry (Preserved) */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-[var(--kravy-surface)] p-5 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-[var(--kravy-text-primary)]">Stock Entry Rule</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-muted)]">Compulsory Quantity Logging</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--kravy-text-muted)] mt-2 mb-4 leading-relaxed">
                            Require staff to enter an opening stock quantity whenever a new product is added to the inventory to eliminate missing initial counts.
                        </p>
                    </div>

                    <label className="flex items-center justify-between gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-3.5 rounded-xl border border-[var(--kravy-border)] hover:border-emerald-500/50 transition-colors mt-auto">
                        <span className="text-xs font-bold text-[var(--kravy-text-primary)]">Make Stock Entry Compulsory</span>
                        <input 
                            type="checkbox" 
                            checked={settings.isStockCompulsory}
                            onChange={() => toggle("isStockCompulsory")}
                            className="w-5 h-5 rounded min-w-[20px] accent-emerald-500 cursor-pointer"
                        />
                    </label>
                </motion.div>
            </div>
        </div>
    );
}

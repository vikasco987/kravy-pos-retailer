"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    Package, Save, ArrowLeft, Barcode, CheckCircle2 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function InventorySettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        enableSerialNumber: false,
        isStockCompulsory: false,
    });

    const { profile: data, updateProfile } = useProfileCache();
    const [hasInitProfile, setHasInitProfile] = useState(false);

    useEffect(() => {
        if (data && !hasInitProfile) {
            setSettings({
                enableSerialNumber: data.enableSerialNumber ?? false,
                isStockCompulsory: data.isStockCompulsory ?? false,
            });
            setLoading(false);
            setHasInitProfile(true);
        }
    }, [data, hasInitProfile]);

    const handleSave = async () => {
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

    const toggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div className="p-10 text-center opacity-50">Loading Configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-[var(--kravy-navbar-bg)] p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-[var(--kravy-bg)] flex items-center justify-center hover:bg-[var(--kravy-bg-2)] transition-colors border border-[var(--kravy-border)] cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--kravy-text-primary)] flex items-center gap-3">
                            <Package className="text-indigo-500" />
                            Inventory & Stock Rules
                        </h1>
                        <p className="text-sm font-bold text-[var(--kravy-text-muted)] mt-1">
                            Manage inventory tracking, serial numbers, and stock entry rules.
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-12 px-6 rounded-xl bg-[var(--kravy-brand)] text-white font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[var(--kravy-brand)]/20"
                >
                    {saving ? "Saving..." : <><Save size={18} /> Save Settings</>}
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--kravy-surface)] p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Barcode size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Serial Number Generation</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-faint)]">Automatic Inventory Codes</p>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--kravy-text-muted)] mt-4 mb-6 leading-relaxed">
                            Automatically assign a smart, unique inventory code to every new item uploaded (e.g. 10500). If turned off, system generates a random unique ID (e.g. ITM-8291-K9X2).
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors mt-auto">
                        <input 
                            type="checkbox" 
                            checked={settings.enableSerialNumber}
                            onChange={() => toggle("enableSerialNumber")}
                            className="w-5 h-5 rounded min-w-[20px] accent-indigo-500 cursor-pointer"
                        />
                        <div>
                            <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable Serial Number (Inventory Code)</p>
                        </div>
                    </label>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--kravy-surface)] p-6 rounded-3xl border border-[var(--kravy-border)] shadow-sm flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Stock Entry Rule</h3>
                                <p className="text-xs font-bold text-[var(--kravy-text-faint)]">Compulsory Quantity Logging</p>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--kravy-text-muted)] mt-4 mb-6 leading-relaxed">
                            Require staff to manually enter an opening stock quantity whenever a new item is added to the inventory to prevent missing data.
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-emerald-500/50 transition-colors mt-auto">
                        <input 
                            type="checkbox" 
                            checked={settings.isStockCompulsory}
                            onChange={() => toggle("isStockCompulsory")}
                            className="w-5 h-5 rounded min-w-[20px] accent-emerald-500 cursor-pointer"
                        />
                        <div>
                            <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Make Stock Entry Compulsory</p>
                        </div>
                    </label>
                </motion.div>

            </div>
        </div>
    );
}

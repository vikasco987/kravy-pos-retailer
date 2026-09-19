"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Shield, 
  ChevronLeft, 
  Save, 
  Zap, 
  Upload, 
  AlertTriangle,
  Lock,
  Eye,
  Settings,
  Sparkles,
  Layers,
  Clock,
  Fuel,
  Smartphone,
  Check,
  Building
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function AdvancedSettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { profile, loading, updateProfile } = useProfileCache();

  const handleSave = async (updatedFields: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });

      if (res.ok) {
        toast.success("Permissions updated successfully");
        updateProfile(updatedFields);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <p className="text-[var(--kravy-text-muted)] font-bold">Failed to load profile data.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-20 kravy-page-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center hover:bg-[var(--kravy-surface-hover)] transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--kravy-text-primary)]">Advanced Visibility Controls</h1>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium">Control which high-level tools are visible to Seller accounts</p>
          </div>
        </div>
      </div>

      {/* Security Alert */}
      <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-[28px] p-6 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-600 shrink-0">
           <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 mb-1">Administrative Override</h4>
          <p className="text-[0.78rem] text-rose-800/70 dark:text-rose-200/60 leading-relaxed font-medium">
            Enabling these settings allows <strong>SELLER</strong> roles to access management-level tools. 
            By default, these items are restricted to <strong>ADMIN</strong> only.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* AI Scraper Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Zap size={40} fill="currentColor" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              AI Menu Scraper 
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Advanced</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Allow Sellers to use the AI-powered menu extractor to build catalogs from images or links.
            </p>
          </div>
          <button
            onClick={() => handleSave({ aiScraperEnabled: !profile.aiScraperEnabled })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.aiScraperEnabled 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.aiScraperEnabled ? 'Visible to Sellers' : 'Restricted to Admin'}
          </button>
        </div>

        {/* Excel Import Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Upload size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              Excel Bulk Import
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Import</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Allow Sellers to perform bulk data operations via Excel file uploads. Highly recommended to keep restricted.
            </p>
          </div>
          <button
            onClick={() => handleSave({ excelImportEnabled: !profile.excelImportEnabled })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.excelImportEnabled 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.excelImportEnabled ? 'Visible to Sellers' : 'Restricted to Admin'}
          </button>
        </div>

        {/* Sync Quick POS with Kitchen Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <Settings size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              Sync Quick POS with Kitchen
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Workflow</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Automatically send Quick POS orders to Kitchen Workflow (Live Tracking) when KOT is printed.
            </p>
          </div>
          <button
            onClick={() => handleSave({ syncQuickPosWithKitchen: !profile.syncQuickPosWithKitchen })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.syncQuickPosWithKitchen 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.syncQuickPosWithKitchen ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Multi-Zone Menu Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <Layers size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              Multi-Zone Menu
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">New</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Define multiple zones (e.g., Rooftop, Bar, Poolside) and show different menu items based on where the customer is sitting.
            </p>
          </div>
          <button
            onClick={() => handleSave({ multiZoneMenuEnabled: !profile.multiZoneMenuEnabled })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.multiZoneMenuEnabled 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.multiZoneMenuEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Expiry Tracking Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
            <Clock size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              Item Expiry Tracking
              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Inventory</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Enable expiry date tracking for items. Expired items will be highlighted in red, and items expiring within 7 days in yellow.
            </p>
          </div>
          <button
            onClick={() => handleSave({ expiryTrackingEnabled: !profile.expiryTrackingEnabled })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.expiryTrackingEnabled 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.expiryTrackingEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Fuel Station Billing Control */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8 group">
          <div className="w-20 h-20 rounded-3xl bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
            <Fuel size={40} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              Fuel Station Billing
              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">New</span>
            </h3>
            <p className="text-sm text-[var(--kravy-text-muted)] font-medium max-w-md leading-relaxed">
              Enable the dedicated Fuel Station billing module to generate receipts for Petrol/Diesel with Vehicle Number tracking.
            </p>
          </div>
          <button
            onClick={() => handleSave({ enableFuelBilling: !profile.enableFuelBilling })}
            disabled={saving}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
              profile.enableFuelBilling 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {profile.enableFuelBilling ? 'Enabled' : 'Disabled'}
          </button>
        </div>


        {/* Informational Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
           <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                 <Lock size={18} className="text-indigo-600" />
                 <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Default Sandbox</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                 KravyPOS follows the Principle of Least Privilege. High-impact tools are shielded by default to prevent data corruption.
              </p>
           </div>
           <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[28px] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                 <Eye size={18} className="text-indigo-600" />
                 <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Live Feedback</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                 Changes apply instantly to the sidebar of all active Seller sessions upon their next page navigation.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}

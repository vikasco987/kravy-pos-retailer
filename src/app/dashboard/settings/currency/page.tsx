"use client";
import { useCurrency } from "@/lib/currency-context";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { kravy } from "@/lib/sounds";
import { formatCurrency } from "@/lib/currency";
import { useProfileCache } from "@/hooks/useProfileCache";

const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

export default function CurrencySettingsPage() {
  const router = useRouter();
  const { currencySymbol: sym } = useCurrency();

  const [saving, setSaving] = useState(false);
  
  const { profile, updateProfile } = useProfileCache();
  const [hasInitProfile, setHasInitProfile] = useState(false);
  
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState(sym);

  useEffect(() => {
    if (profile && !hasInitProfile) {
      setCurrencyCode(profile.currencyCode || "INR");
      setCurrencySymbol(profile.currencySymbol || sym);
      setHasInitProfile(true);
    }
  }, [profile, hasInitProfile, sym]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode, currencySymbol }),
      });
      if (!res.ok) throw new Error("Failed to save");
      updateProfile({ currencyCode, currencySymbol }, false);
      toast.success("Currency updated successfully");
      kravy.success();
      router.refresh();
    } catch (err) {
      toast.error("Error saving currency settings");
      kravy.error();
    } finally {
      setSaving(false);
    }
  };


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];

  return (
    <div className="w-full pb-20 kravy-page-fade">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[var(--kravy-surface-hover)] rounded-full transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            title="Back"
          >
            <ArrowLeft size={22} className="text-[var(--kravy-text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">
              Currency & Localization
            </h1>
            <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] font-medium mt-0.5">
              Set base currency and formatting rules
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm sm:text-base shrink-0 shadow-sm"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
          Save Changes
        </motion.button>
      </div>

      <div className="w-full bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-[24px] p-4 sm:p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-[var(--kravy-text-primary)]">Base Currency</h2>
            <p className="text-xs text-[var(--kravy-text-muted)]">
              This will update the currency symbol displayed on bills, POS, and QR Menu.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Custom Anchored Dropdown */}
          <div className="relative w-full">
            <label className="block text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] mb-2">Select Currency</label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer box-border"
            >
              <span>{selectedCurrency.name} ({selectedCurrency.code}) — {selectedCurrency.symbol}</span>
              <span className={`transition-transform duration-200 text-xs text-[var(--kravy-text-muted)] ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isDropdownOpen && (
              <>
                {/* Backdrop to close dropdown on tap outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[var(--kravy-border)]">
                  {SUPPORTED_CURRENCIES.map(c => {
                    const isSelected = c.code === currencyCode;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrencyCode(c.code);
                          setCurrencySymbol(c.symbol);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors hover:bg-[var(--kravy-surface-hover)] cursor-pointer ${
                          isSelected ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" : "text-[var(--kravy-text-primary)]"
                        }`}
                      >
                        <span>{c.name} ({c.code})</span>
                        <span className="font-bold">{c.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl overflow-hidden">
            <p className="text-xs sm:text-sm font-medium text-[var(--kravy-text-muted)] mb-1.5">Display Preview</p>
            <p className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] break-all">
              {formatCurrency(1250, currencySymbol)}
            </p>
            <p className="text-[11px] sm:text-xs text-[var(--kravy-text-muted)] mt-2 leading-relaxed">
              Note: Existing underlying numeric calculations remain unchanged. This only affects the formatting layer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

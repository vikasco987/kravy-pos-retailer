"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCurrency } from "@/lib/currency-context";
import { TrendingUp, TrendingDown, Calendar, ChevronDown, Loader2, ArrowUpRight, AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface ItemSalesData {
  name: string;
  totalSold: number;
  totalRevenue: number;
}

interface Props {
  items?: ItemSalesData[];
  range?: number;
}

type TabType = "top" | "low";

interface DatePreset {
  label: string;
  value: number; // 1 = Today, 2 = Yesterday, 7 = Last 7 Days, 30 = Last 30 Days
}

const PRESETS: DatePreset[] = [
  { label: "Today", value: 1 },
  { label: "Yesterday", value: 2 },
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
];

export default function TopItems({ items: initialItems = [], range: initialRange = 30 }: Props) {
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();

  // Active Tab: "top" or "low"
  const [activeTab, setActiveTab] = useState<TabType>("top");

  // Date selection state
  const [currentRange, setCurrentRange] = useState<number>(initialRange);
  const [customDates, setCustomDates] = useState<{ from?: string; to?: string }>({});
  const [dateLabel, setDateLabel] = useState<string>(() => {
    const p = PRESETS.find((x) => x.value === initialRange);
    return p ? p.label : `Last ${initialRange} Days`;
  });

  // Dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFromInput, setCustomFromInput] = useState("");
  const [customToInput, setCustomToInput] = useState("");

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // In-memory cache by normalized key to ensure 0 network calls when switching tabs or reusing date ranges
  const cacheRef = useRef<Map<string, { items: ItemSalesData[]; label: string }>>(new Map());
  const activeRequestRef = useRef<string | null>(null);

  // Initialize cache with server-rendered initialItems
  useEffect(() => {
    if (initialItems.length > 0) {
      const initialKey = `range_${initialRange}`;
      const defaultLabel = PRESETS.find((x) => x.value === initialRange)?.label || `Last ${initialRange} Days`;
      if (!cacheRef.current.has(initialKey)) {
        cacheRef.current.set(initialKey, { items: initialItems, label: defaultLabel });
      }
    }
  }, [initialItems, initialRange]);

  // Current active raw dataset
  const [dataset, setDataset] = useState<ItemSalesData[]>(initialItems);

  // Format currency helper
  const formatMoney = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  // Fetch or retrieve from cache for a given range/custom date
  const loadPerformanceData = async (
    targetRange?: number,
    customFrom?: string,
    customTo?: string,
    customLabel?: string
  ) => {
    const cacheKey = customFrom && customTo ? `custom_${customFrom}_${customTo}` : `range_${targetRange || 30}`;

    // 1. Check local in-memory cache
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setDataset(cached.items);
      setDateLabel(cached.label);
      if (targetRange) setCurrentRange(targetRange);
      setFetchError(null);
      setIsLoading(false);
      return;
    }

    // 2. Prevent duplicate in-flight requests
    if (activeRequestRef.current === cacheKey) return;
    activeRequestRef.current = cacheKey;

    setIsLoading(true);
    setFetchError(null);

    try {
      let url = "/api/reports/items/performance";
      if (customFrom && customTo) {
        url += `?from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
      } else {
        url += `?range=${targetRange || 30}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const loadedItems: ItemSalesData[] = Array.isArray(data.items) ? data.items : [];
      const label = customLabel || data.range?.label || (targetRange ? `Last ${targetRange} Days` : "Custom Range");

      // Store in memory cache
      cacheRef.current.set(cacheKey, { items: loadedItems, label });

      // Update state if this request is still the active one
      if (activeRequestRef.current === cacheKey) {
        setDataset(loadedItems);
        setDateLabel(label);
        if (targetRange) setCurrentRange(targetRange);
      }
    } catch (err: any) {
      console.error("Failed to load item performance:", err);
      setFetchError(err.message || "Failed to load data");
    } finally {
      if (activeRequestRef.current === cacheKey) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: DatePreset) => {
    setIsDropdownOpen(false);
    setCurrentRange(preset.value);
    setCustomDates({});
    loadPerformanceData(preset.value, undefined, undefined, preset.label);
  };

  // Handle Custom Date Submit
  const handleApplyCustomDates = () => {
    if (!customFromInput || !customToInput) return;
    const fDate = new Date(customFromInput);
    const tDate = new Date(customToInput);
    if (fDate > tDate) {
      alert("From date cannot be after To date");
      return;
    }
    tDate.setHours(23, 59, 59, 999);

    const fIso = fDate.toISOString();
    const tIso = tDate.toISOString();
    const label = `${fDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} To ${tDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;

    setShowCustomModal(false);
    setIsDropdownOpen(false);
    setCustomDates({ from: fIso, to: tIso });
    loadPerformanceData(undefined, fIso, tIso, label);
  };

  // 0ms Client-Side Sorting without network calls
  const displayedItems = useMemo(() => {
    if (!dataset || dataset.length === 0) return [];

    const copy = [...dataset];

    if (activeTab === "top") {
      // Top Performing: Revenue descending, totalSold descending, Name ascending
      return copy
        .sort((a, b) => {
          if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
          if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 5);
    } else {
      // Low Performing: totalSold ascending, Revenue ascending, Name ascending
      return copy
        .sort((a, b) => {
          if (a.totalSold !== b.totalSold) return a.totalSold - b.totalSold;
          if (a.totalRevenue !== b.totalRevenue) return a.totalRevenue - b.totalRevenue;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 5);
    }
  }, [dataset, activeTab]);

  return (
    <div
      className="w-full bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[24px] p-5 sm:p-6 relative shadow-[var(--kravy-card-shadow)] flex flex-col justify-between"
      style={{ minHeight: "380px" }}
    >
      {/* ── Top Header: Title & Compact Date Selector ── */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)] tracking-tight">
            Item Performance
          </h3>
          <p className="text-[11px] font-bold text-[var(--kravy-text-muted)]">Sales volume & revenue insights</p>
        </div>

        {/* Inline Compact Date Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg-2)] hover:bg-[var(--kravy-surface-hover)] text-xs font-bold text-[var(--kravy-text-secondary)] transition-all active:scale-95 shadow-sm"
          >
            <span className="truncate max-w-[130px] sm:max-w-[160px]">{dateLabel}</span>
            <Calendar size={13} className="text-indigo-500 shrink-0" />
            <ChevronDown size={13} className="text-[var(--kravy-text-muted)] shrink-0" />
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-48 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between ${
                      currentRange === p.value && !customDates.from
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold"
                        : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg-2)]"
                    }`}
                  >
                    <span>{p.label}</span>
                    {currentRange === p.value && !customDates.from && <span className="text-[10px]">●</span>}
                  </button>
                ))}

                <div className="border-t border-[var(--kravy-border)] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setShowCustomModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-[var(--kravy-bg-2)] flex items-center justify-between"
                >
                  <span>Custom Range...</span>
                  <Calendar size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Segmented Control Tabs (0ms Tab Toggle) ── */}
      <div className="grid grid-cols-2 p-1 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl mb-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("top")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            activeTab === "top"
              ? "bg-[var(--kravy-surface)] text-[var(--kravy-text-primary)] shadow-sm font-extrabold border border-[var(--kravy-border)]"
              : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-secondary)]"
          }`}
        >
          <TrendingUp size={14} className={activeTab === "top" ? "text-indigo-600 dark:text-indigo-400" : ""} />
          <span>Top Performing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("low")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            activeTab === "low"
              ? "bg-[var(--kravy-surface)] text-[var(--kravy-text-primary)] shadow-sm font-extrabold border border-[var(--kravy-border)]"
              : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-secondary)]"
          }`}
        >
          <TrendingDown size={14} className={activeTab === "low" ? "text-blue-600 dark:text-blue-400" : ""} />
          <span>Low Performing</span>
        </button>
      </div>

      {/* ── Content Body: Loading, Error, Empty, or Items List ── */}
      <div className="flex-1 flex flex-col justify-start">
        {isLoading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-[var(--kravy-border)]/50 animate-pulse"
              >
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-[var(--kravy-border)] rounded w-28 sm:w-36" />
                  <div className="h-2.5 bg-[var(--kravy-border)]/60 rounded w-14" />
                </div>
                <div className="h-4 bg-[var(--kravy-border)] rounded w-14" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-rose-500">
            <AlertCircle size={28} className="mb-2 opacity-80" />
            <p className="text-xs font-bold mb-3">{fetchError}</p>
            <button
              type="button"
              onClick={() => loadPerformanceData(currentRange, customDates.from, customDates.to)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-800"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-[var(--kravy-text-muted)]">
            <div className="text-3xl mb-2 opacity-60">🍽️</div>
            <p className="text-xs font-bold">No sales data for {dateLabel}</p>
            <p className="text-[10px] text-[var(--kravy-text-faint)] mt-0.5">Try selecting a wider date range</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--kravy-border)]">
            {displayedItems.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-center justify-between py-2.5 hover:bg-[var(--kravy-bg-2)]/40 px-1 rounded-lg transition-colors group"
              >
                <div className="pr-2 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] truncate group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-medium text-[var(--kravy-text-muted)] mt-0.5">
                    ({item.totalSold} sold)
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">
                    {sym} {formatMoney(item.totalRevenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: View More Link & Context Note ── */}
      <div className="mt-4 pt-3 border-t border-[var(--kravy-border)]">
        <Link
          href={`/dashboard/reports/items?range=${currentRange}`}
          className="flex items-center justify-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 py-1 transition-colors group"
        >
          <span>View More</span>
          <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
        <p className="text-[10px] text-[var(--kravy-text-muted)] text-center mt-1">
          Note: Low performing reflects dishes with fewest units sold in this period.
        </p>
      </div>

      {/* ── Modal for Custom Date Range ── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150">
            <h4 className="text-sm font-black text-[var(--kravy-text-primary)] mb-3">Select Custom Date Range</h4>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--kravy-text-muted)] mb-1">From Date</label>
                <input
                  type="date"
                  value={customFromInput}
                  onChange={(e) => setCustomFromInput(e.target.value)}
                  className="w-full bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--kravy-text-primary)] outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--kravy-text-muted)] mb-1">To Date</label>
                <input
                  type="date"
                  value={customToInput}
                  onChange={(e) => setCustomToInput(e.target.value)}
                  className="w-full bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--kravy-text-primary)] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-2 text-xs font-bold text-[var(--kravy-text-secondary)] hover:bg-[var(--kravy-bg-2)] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                disabled={!customFromInput || !customToInput}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

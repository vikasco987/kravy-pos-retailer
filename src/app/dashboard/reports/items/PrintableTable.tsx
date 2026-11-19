"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Printer, Settings, Check, Search, X, ShoppingBag, TrendingUp, Sparkles, Award, BarChart2 } from "lucide-react";
import MobileReportExportOptions from "@/components/MobileReportExportOptions";

interface PrintableTableProps {
  filteredItems: any[];
  grandTotalRevenue: number;
  grandTotalSold?: number;
  dateRangeStr?: string;
  businessName?: string;
}

export default function PrintableTable({ 
  filteredItems, 
  grandTotalRevenue, 
  grandTotalSold,
  dateRangeStr,
  businessName = "Kravy POS"
}: PrintableTableProps) {
  const { currencySymbol: sym } = useCurrency();

  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Column preferences
  const [columns, setColumns] = useState({
    category: true,
    qty: true,
    revenue: true,
    share: true
  });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("kravy_item_report_columns");
    if (saved) {
      try {
        setColumns(JSON.parse(saved));
      } catch (e) {}
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (col: keyof typeof columns) => {
    const newCols = { ...columns, [col]: !columns[col] };
    setColumns(newCols);
    localStorage.setItem("kravy_item_report_columns", JSON.stringify(newCols));
  };

  // Filtered and searched items
  const displayItems = useMemo(() => {
    if (!searchQuery.trim()) return filteredItems;
    const q = searchQuery.toLowerCase().trim();
    return filteredItems.filter((i) =>
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.category && i.category.toLowerCase().includes(q))
    );
  }, [filteredItems, searchQuery]);

  // Count visible columns for proper spacing
  const visibleColCount = 2 + Object.values(columns).filter(Boolean).length; // Sr + Product + toggled ones

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num || 0));

  const totalUnits = grandTotalSold !== undefined 
    ? grandTotalSold 
    : filteredItems.reduce((s, i) => s + (i.totalSold || 0), 0);

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 2mm !important;
            size: auto !important;
          }
          body {
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            font-size: 10px !important;
            color: #000 !important;
            background: #fff !important;
          }
          table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          td, th {
            word-wrap: break-word !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: break-all !important;
          }
          .print\\:hidden, .print-hidden {
            display: none !important;
          }
        }
      `}} />

      {/* ── KPI Summary Micro-Cards (Mobile & Desktop) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 print:hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</span>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-800 dark:text-slate-100 mt-1">
            {sym}{format(grandTotalRevenue)}
          </div>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">● Generated Revenue</span>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Units Sold</span>
          <div className="text-lg sm:text-2xl font-black font-mono text-orange-600 dark:text-orange-400 mt-1">
            {format(totalUnits)} <span className="text-xs font-bold text-slate-400">pcs</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 mt-1">Across all orders</span>
        </div>

        {/* Top Product */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Top Selling Dish</span>
          <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate mt-1" title={filteredItems[0]?.name}>
            {filteredItems[0]?.name || "N/A"}
          </div>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
            {filteredItems[0] ? `${format(filteredItems[0].totalSold)} sold (${sym}${format(filteredItems[0].totalRevenue)})` : "No sales"}
          </span>
        </div>

        {/* Unique Dishes */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between col-span-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Dishes</span>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-800 dark:text-slate-100 mt-1">
            {filteredItems.length} <span className="text-xs font-bold text-slate-400">items</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 mt-1">In selected range</span>
        </div>
      </div>

      {/* ── Search & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-500 shadow-2xs placeholder:text-slate-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Action Buttons: Settings + PDF/XLS + Print */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          {/* Settings Dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              title="Column Preferences"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Columns</span>
            </button>

            {showSettings && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "white",
                border: "1px solid var(--kravy-border)",
                borderRadius: "16px",
                padding: "14px",
                minWidth: "210px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                zIndex: 100
              }}>
                <h4 style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--kravy-text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
                  Visible Columns
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { key: "category", label: "Category" },
                    { key: "qty", label: "Qty Sold" },
                    { key: "revenue", label: "Revenue" },
                    { key: "share", label: "Revenue Share" }
                  ].map(opt => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "6px", border: `2px solid ${columns[opt.key as keyof typeof columns] ? "var(--kravy-brand)" : "var(--kravy-border)"}`,
                        background: columns[opt.key as keyof typeof columns] ? "var(--kravy-brand)" : "white",
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s"
                      }}>
                        {columns[opt.key as keyof typeof columns] && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={columns[opt.key as keyof typeof columns]} 
                        onChange={() => toggleColumn(opt.key as keyof typeof columns)}
                        style={{ display: "none" }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile PDF & Excel Export Options (Matches user requested design) */}
          <MobileReportExportOptions
            items={displayItems}
            grandTotalRevenue={grandTotalRevenue}
            grandTotalSold={totalUnits}
            dateRangeStr={dateRangeStr}
            businessName={businessName}
            currencySymbol={sym}
          />

          {/* Print Button */}
          <button 
            onClick={(e) => {
              const btn = e.currentTarget;
              if (btn.disabled) return;
              btn.disabled = true;
              btn.style.opacity = "0.5";
              setShowSettings(false);
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  btn.disabled = false;
                  btn.style.opacity = "1";
                }, 1000);
              }, 300);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--kravy-brand)] text-white text-xs font-black shadow-md shadow-orange-500/25 hover:opacity-90 active:scale-95 transition-all"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── Print Header (Paper only) ── */}
      <div className="hidden print:block mb-2 mt-0 text-center">
        <h2 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: "4px" }} className="print:!text-sm print:!mb-1">Item-wise Sales Report</h2>
        <p style={{ fontSize: "0.95rem", color: "#555", fontWeight: 500 }} className="print:!text-[10px] print:!font-normal">Printed on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* ── Mobile App-Style Cards View (< md) ── */}
      <div className="md:hidden print:hidden flex flex-col gap-2.5 mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {displayItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-extrabold text-sm text-slate-700 dark:text-slate-200">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try another search or select "All" category</p>
          </div>
        ) : (
          displayItems.map((item, idx) => {
            const revenueShare = grandTotalRevenue > 0 ? (item.totalRevenue / grandTotalRevenue) * 100 : 0;
            const avgPrice = item.totalSold > 0 ? Math.round(item.totalRevenue / item.totalSold) : 0;
            const rankMedal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

            return (
              <div
                key={item.name}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col gap-2.5 relative overflow-hidden"
              >
                {/* Top Row: Rank + Name + Category + Total Revenue */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 shadow-2xs" 
                        : idx === 1 
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-300/60" 
                          : idx === 2 
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300/60" 
                            : "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200/60"
                    }`}>
                      {rankMedal ? <span className="text-sm">{rankMedal}</span> : `#${String(idx + 1).padStart(2, '0')}`}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug break-words">
                        {item.name}
                      </h4>
                      {columns.category && item.category && (
                        <span className="inline-block text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md mt-1">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Revenue */}
                  {columns.revenue && (
                    <div className="text-right shrink-0">
                      <div className="text-base font-black font-mono text-slate-900 dark:text-white leading-tight">
                        {sym}{format(item.totalRevenue)}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">
                        {sym}{format(avgPrice)}/unit
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Qty Sold + Share Percentage */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  {columns.qty ? (
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 text-[10px]">Qty Sold:</span>
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-extrabold font-mono text-[11px] border border-orange-200/60 dark:border-orange-900/40">
                        {format(item.totalSold)} pcs
                      </span>
                    </div>
                  ) : <div />}

                  {columns.share && (
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                        {revenueShare.toFixed(1)}% share
                      </span>
                    </div>
                  )}
                </div>

                {/* Share Progress Bar */}
                {columns.share && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(3, revenueShare))}%` }}
                    />
                  </div>
                )}

                {/* Mobile Analytics Shortcut Link */}
                {item.id && (
                  <div className="pt-1">
                    <Link
                      href={`/dashboard/reports/items/${item.id}`}
                      className="w-full py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-98 transition-all"
                    >
                      <BarChart2 size={13} />
                      <span>View Deep Analytics</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop & Print Table View (>= md and Paper Print) ── */}
      <div style={{
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
        borderRadius: "24px", overflow: "hidden", boxShadow: "var(--kravy-card-shadow)",
        marginTop: "16px"
      }} className="hidden md:block print:!block print:!shadow-none print:!border-none print:!rounded-none print:!m-0 print:!bg-transparent print:!overflow-visible">
        <div style={{ overflowX: "auto" }} className="print:!overflow-visible">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "auto" }} className="print:!w-full print:!border-collapse print:!table-fixed">
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }} className="print:!bg-transparent print:!border-b print:!border-black print:!border-dashed">
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", width: "60px", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Sr.</th>
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", width: "auto" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[50%]">Product</th>
                {columns.category && <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[15%]">Category</th>}
                {columns.qty && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Qty Sold</th>}
                {columns.revenue && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[15%]">Revenue</th>}
                {columns.share && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Share</th>}
                <th style={{ padding: "18px 24px", textAlign: "center", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} style={{ padding: "60px", textAlign: "center", color: "var(--kravy-text-muted)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📊</div>
                    <p>No sales data found for this period.</p>
                  </td>
                </tr>
              ) : (
                displayItems.map((item, idx) => {
                  const revenueShare = grandTotalRevenue > 0 ? (item.totalRevenue / grandTotalRevenue) * 100 : 0;
                  return (
                    <tr key={item.name} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }} className="print:!border-b print:!border-black print:!border-dashed">
                      <td style={{ padding: "18px 24px", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-faint)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">{String(idx + 1).padStart(2, '0')}</td>
                      <td style={{ padding: "18px 24px" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed print:!w-[50%]">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="print:!gap-1">
                          <span style={{ fontWeight: 700, color: "var(--kravy-text-primary)" }} className="print:!text-black print:!text-[10px] print:!leading-tight print:!whitespace-normal print:!break-all">{item.name}</span>
                        </div>
                      </td>
                      {columns.category && (
                        <td style={{ padding: "18px 24px" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed">
                          <span style={{
                            padding: "4px 10px", borderRadius: "8px", background: "var(--kravy-bg-2)",
                            fontSize: "0.7rem", fontWeight: 600, color: "var(--kravy-text-secondary)"
                          }} className="print:!bg-transparent print:!p-0 print:!text-black print:!text-[10px]">
                            {item.category}
                          </span>
                        </td>
                      )}
                      {columns.qty && (
                        <td style={{ padding: "18px 24px", textAlign: "right", fontWeight: 800, color: "var(--kravy-brand)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">
                          {format(item.totalSold)}
                        </td>
                      )}
                      {columns.revenue && (
                        <td style={{ padding: "18px 24px", textAlign: "right", fontWeight: 800, color: "var(--kravy-text-primary)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">
                          {sym}{format(item.totalRevenue)}
                        </td>
                      )}
                      {columns.share && (
                        <td style={{ padding: "18px 24px", textAlign: "right" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }} className="print:!gap-1">
                            <div style={{ width: "60px", height: "6px", background: "var(--kravy-bg-2)", borderRadius: "10px", overflow: "hidden" }} className="print:hidden">
                              <div style={{ width: `${revenueShare}%`, height: "100%", background: "var(--kravy-brand)", borderRadius: "10px" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-muted)", width: "40px" }} className="print:!text-black print:!text-[10px]">
                              {revenueShare.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      )}
                      <td style={{ padding: "18px 24px", textAlign: "center" }} className="print:hidden">
                        {item.id ? (
                          <Link
                            href={`/dashboard/reports/items/${item.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] hover:bg-[var(--kravy-brand)] hover:text-white transition-all text-xs font-bold"
                            title={`View deep analytics for ${item.name}`}
                          >
                            <BarChart2 size={13} />
                            <span>Analytics</span>
                          </Link>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

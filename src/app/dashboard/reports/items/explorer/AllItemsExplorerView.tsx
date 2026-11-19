"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/currency-context";
import {
  ChevronLeft,
  Search,
  ArrowUpDown,
  Download,
  ShoppingBag,
  BarChart2,
  Layers,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import ItemReportsNavTabs from "../ItemReportsNavTabs";

export default function AllItemsExplorerView() {
  const { currencySymbol: sym } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRange, setSelectedRange] = useState("30");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "zero">("all");
  const [sortBy, setSortBy] = useState<"revenue" | "qty" | "name" | "price">("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch catalog & analytics
  const fetchExplorerData = async (range: string, category: string = "All", search: string = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("range", range);
      if (category !== "All") params.set("category", category);
      if (search) params.set("search", search);

      const res = await fetch(`/api/reports/items/explorer?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load explorer data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorerData(selectedRange, selectedCategory, searchQuery);
  }, [selectedRange, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExplorerData(selectedRange, selectedCategory, searchQuery);
  };

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  // Filter & sort items on client
  const rawItems = (data?.items || []).filter((i: any) => {
    if (statusFilter === "active") return i.totalSold > 0;
    if (statusFilter === "zero") return i.totalSold === 0 || i.neverSold;
    return true;
  });

  const items = rawItems.slice().sort((a: any, b: any) => {
    let diff = 0;
    if (sortBy === "revenue") diff = b.totalRevenue - a.totalRevenue;
    if (sortBy === "qty") diff = b.totalSold - a.totalSold;
    if (sortBy === "name") diff = a.name.localeCompare(b.name);
    if (sortBy === "price") diff = b.currentPrice - a.currentPrice;
    return sortOrder === "desc" ? diff : -diff;
  });

  const categories = data?.categories || [];
  const grandTotals = data?.grandTotals || {
    totalCatalogItems: 0,
    activeSoldItems: 0,
    neverSoldItemsCount: 0,
    grandTotalSold: 0,
    grandTotalRevenue: 0,
  };

  const exportCSV = () => {
    if (!items.length) return;
    const headers = ["Item Name", "Category", "Current Menu Price", "Avg Selling Price", "Total Qty Sold", "Total Revenue", "Sales Share %", "Last Sold At"];
    const rows = items.map((i: any) => [
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.category}"`,
      i.currentPrice,
      i.avgSellingPrice,
      i.totalSold,
      i.totalRevenue,
      i.salesShare,
      i.lastSoldAt ? new Date(i.lastSoldAt).toLocaleDateString("en-IN") : "Never Sold",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `all_items_catalog_${selectedRange}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-6 pb-20 md:pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Top Header (Mobile Responsive) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link 
            href="/dashboard/reports/items" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:border-orange-500 active:scale-95 transition-all shadow-2xs shrink-0"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight truncate flex items-center gap-1.5 sm:gap-2">
              <span>All Items Explorer</span>
              <span className="text-[9px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-full font-black uppercase">
                Catalog
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold text-[var(--kravy-text-muted)] truncate mt-0.5">
              Live menu performance, active sellers & zero-sale dishes
            </p>
          </div>
        </div>

        {/* Date Filter & Export on Mobile / Desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="flex-1 sm:flex-initial h-8 sm:h-10 px-2 sm:px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider outline-none focus:border-[var(--kravy-brand)]"
          >
            <option value="1">Today</option>
            <option value="2">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_quarter">Last 90 Days</option>
            <option value="this_year">This Year (YTD)</option>
            <option value="last_year">Last Year</option>
            <option value="365">Past 365 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={exportCSV}
            className="h-8 sm:h-10 px-2.5 sm:px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:border-[var(--kravy-brand)] transition-all shadow-2xs shrink-0"
            title="Export CSV"
          >
            <Download size={13} className="sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <ItemReportsNavTabs currentRange={selectedRange} activeCategory={selectedCategory} />

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
            Total Menu Items
          </span>
          <div className="text-lg sm:text-2xl font-black text-[var(--kravy-text-primary)]">
            {grandTotals.totalCatalogItems}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
            {grandTotals.activeSoldItems} active sellers
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
            Total Revenue
          </span>
          <div className="text-lg sm:text-2xl font-black text-[var(--kravy-text-primary)] font-mono">
            {sym}{format(grandTotals.grandTotalRevenue)}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
            Net invoiced sales
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
            Total Units Sold
          </span>
          <div className="text-lg sm:text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
            {format(grandTotals.grandTotalSold)} <span className="text-xs font-normal">pcs</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
            Across fulfilled bills
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-0.5 sm:mb-1">
            Never Sold / Zero
          </span>
          <div className="text-lg sm:text-2xl font-black text-rose-500 font-mono">
            {grandTotals.neverSoldItemsCount}
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-rose-400 mt-0.5 block truncate">
            0 sales in period
          </span>
        </div>
      </div>

      {/* ── Main Layout: Categories + Controls + Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start">
        {/* ── Left Category Navigation: Horizontal Pills on Mobile, Sidebar on Desktop ── */}
        <div className="lg:col-span-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-2.5 sm:p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-[var(--kravy-border)]">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[var(--kravy-text-muted)] flex items-center gap-1.5">
              <Layers size={13} className="text-orange-500" /> Categories
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {categories.length} total
            </span>
          </div>

          <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar py-1">
            {categories.map((cat: any) => {
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2 shrink-0 ${
                    active
                      ? "bg-[var(--kravy-brand)] text-white font-extrabold shadow-sm scale-[1.02]"
                      : "bg-[var(--kravy-bg)] lg:bg-transparent hover:bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] font-semibold"
                  }`}
                >
                  <div className="min-w-0 truncate">
                    <div className="text-xs truncate">{cat.name}</div>
                    <div className={`text-[9px] sm:text-[10px] ${active ? "text-orange-100" : "text-[var(--kravy-text-muted)]"}`}>
                      {cat.totalItems} items · {sym}{format(cat.totalRevenue)}
                    </div>
                  </div>
                  <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                    active ? "bg-white/20 text-white" : "bg-[var(--kravy-surface)] text-[var(--kravy-text-muted)]"
                  }`}>
                    {cat.totalSold} sold
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Content: Controls & Items List/Table ── */}
        <div className="lg:col-span-9 space-y-3">
          {/* Controls Bar */}
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl pl-8 pr-3 py-2 text-xs font-semibold outline-none focus:border-[var(--kravy-brand)] text-[var(--kravy-text-primary)]"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
              </form>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-2 py-1.5 text-xs font-bold text-[var(--kravy-text-primary)] outline-none"
                >
                  <option value="revenue">Highest Revenue</option>
                  <option value="qty">Most Sold Qty</option>
                  <option value="name">Item Name (A-Z)</option>
                  <option value="price">Menu Price</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                  className="w-8 h-8 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)]"
                  title="Toggle Sort Order"
                >
                  <ArrowUpDown size={13} />
                </button>
              </div>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-[var(--kravy-bg)] p-1 rounded-xl border border-[var(--kravy-border)] text-xs font-bold overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex-1 py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] ${
                  statusFilter === "all"
                    ? "bg-[var(--kravy-surface)] text-[var(--kravy-text-primary)] shadow-2xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                All ({data?.items?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`flex-1 py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] ${
                  statusFilter === "active"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-2xs"
                    : "text-[var(--kravy-text-muted)] hover:text-emerald-500"
                }`}
              >
                Active ({grandTotals.activeSoldItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("zero")}
                className={`flex-1 py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap text-[11px] ${
                  statusFilter === "zero"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold shadow-2xs"
                    : "text-[var(--kravy-text-muted)] hover:text-rose-500"
                }`}
              >
                Zero Sales ({grandTotals.neverSoldItemsCount})
              </button>
            </div>
          </div>

          {/* ── MOBILE VIEW: App-Style Interactive Item Cards (< md) ── */}
          <div className="md:hidden flex flex-col gap-2.5">
            {loading ? (
              <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-8 text-center text-xs font-bold text-slate-400">
                Loading menu catalog...
              </div>
            ) : items.length === 0 ? (
              <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-8 text-center text-slate-400">
                <p className="text-2xl mb-1">🔍</p>
                <p className="font-extrabold text-xs text-[var(--kravy-text-primary)]">No items found</p>
                <p className="text-[10px] mt-0.5">Try changing filter or category</p>
              </div>
            ) : (
              items.map((item: any) => {
                return (
                  <div
                    key={item.id}
                    className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3 shadow-2xs flex flex-col gap-2 relative"
                  >
                    {/* Top Row: Image/Icon + Name + Category + Revenue */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/dashboard/reports/items/${item.id}?range=${selectedRange}`}
                            className="text-xs font-extrabold text-[var(--kravy-text-primary)] hover:text-[var(--kravy-brand)] transition-colors leading-tight block break-words"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[9px] font-bold text-[var(--kravy-text-secondary)] bg-[var(--kravy-bg)] px-1.5 py-0.5 rounded border border-[var(--kravy-border)]">
                              {item.category}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--kravy-text-muted)] font-semibold">
                              Menu: {sym}{format(item.currentPrice)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Revenue & Share */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black font-mono text-[var(--kravy-text-primary)]">
                          {sym}{format(item.totalRevenue)}
                        </div>
                        <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40 inline-block mt-0.5 font-mono">
                          {item.salesShare}% share
                        </span>
                      </div>
                    </div>

                    {/* Middle Stats Row */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--kravy-border)]/60 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--kravy-text-muted)]">Qty Sold:</span>
                        <span className={`font-mono font-black ${item.totalSold > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-400"}`}>
                          {format(item.totalSold)} pcs
                        </span>
                      </div>
                      <div className="text-[var(--kravy-text-muted)]">
                        {item.neverSold ? (
                          <span className="text-rose-500 font-bold">Never Sold</span>
                        ) : item.lastSoldAt ? (
                          `Last: ${new Date(item.lastSoldAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
                        ) : "Active"}
                      </div>
                    </div>

                    {/* Action Button: Deep Analytics */}
                    <Link
                      href={`/dashboard/reports/items/${item.id}?range=${selectedRange}`}
                      className="w-full py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white dark:text-orange-400 dark:hover:text-white border border-orange-500/20 flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-98"
                    >
                      <BarChart2 size={13} />
                      <span>View Peak Hours & Heatmap</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {/* ── DESKTOP VIEW: Professional Table (>= md) ── */}
          <div className="hidden md:block bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--kravy-border)] bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Product Name
                    </th>
                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Category
                    </th>
                    <th className="py-3 px-3 text-right text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Menu Price
                    </th>
                    <th className="py-3 px-3 text-right text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Qty Sold
                    </th>
                    <th className="py-3 px-3 text-right text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Revenue
                    </th>
                    <th className="py-3 px-3 text-right text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Share
                    </th>
                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                      Deep Analytics
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--kravy-border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-bold text-[var(--kravy-text-muted)]">
                        Loading complete menu performance...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-bold text-[var(--kravy-text-muted)]">
                        No menu items found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any) => {
                      return (
                        <tr key={item.id} className="hover:bg-[var(--kravy-bg-2)] transition-colors group">
                          {/* Item Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                  <ShoppingBag size={14} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`/dashboard/reports/items/${item.id}?range=${selectedRange}`}
                                  className="text-xs sm:text-sm font-extrabold text-[var(--kravy-text-primary)] hover:text-[var(--kravy-brand)] transition-colors truncate block"
                                >
                                  {item.name}
                                </Link>
                                <span className="text-[10px] text-[var(--kravy-text-muted)] font-semibold block">
                                  {item.neverSold ? (
                                    <span className="text-rose-500 font-bold">Never Sold</span>
                                  ) : item.lastSoldAt ? (
                                    `Last sold: ${new Date(item.lastSoldAt).toLocaleDateString("en-IN")}`
                                  ) : "Active"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)]">
                              {item.category}
                            </span>
                          </td>

                          {/* Menu Price */}
                          <td className="py-3 px-3 text-right text-xs font-mono font-bold text-[var(--kravy-text-primary)]">
                            {sym}{format(item.currentPrice)}
                          </td>

                          {/* Qty Sold */}
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-mono font-black ${item.totalSold > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-400"}`}>
                              {format(item.totalSold)}
                            </span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-mono font-black ${item.totalRevenue > 0 ? "text-[var(--kravy-text-primary)]" : "text-slate-400"}`}>
                              {sym}{format(item.totalRevenue)}
                            </span>
                          </td>

                          {/* Share % */}
                          <td className="py-3 px-3 text-right">
                            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40 font-mono">
                              {item.salesShare}%
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/dashboard/reports/items/${item.id}?range=${selectedRange}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] hover:bg-[var(--kravy-brand)] hover:text-white transition-all text-xs font-bold"
                            >
                              <BarChart2 size={13} />
                              <span>Analytics</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/currency-context";
import {
  ChevronLeft,
  Clock,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Award,
  Download,
  Receipt,
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";
import ItemPeakHoursHeatmapView from "./ItemPeakHoursHeatmapView";

export default function ItemDetailAnalyticsView({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { currencySymbol: sym } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedRange, setSelectedRange] = useState("30");
  const [activeTab, setActiveTab] = useState<"performance" | "heatmap" | "transactions">("heatmap");
  const [chartMetric, setChartMetric] = useState<"qty" | "rev">("qty");
  const [hourlyMetric, setHourlyMetric] = useState<"qty" | "rev">("qty");
  const [txSearch, setTxSearch] = useState("");
  const [txFilterType, setTxFilterType] = useState("All");

  const fetchAnalytics = async (range: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/items/${itemId}/analytics?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load item analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedRange);
  }, [itemId, selectedRange]);

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading item analytics...</p>
      </div>
    );
  }

  const item = data?.item || {};
  const kpis = data?.kpis || {};
  const comp = kpis.comparison || {};
  const hourlyData = data?.hourlyData || [];
  const dayOfWeekData = data?.dayOfWeekData || [];
  const salesTrend = data?.salesTrend || [];
  const catPerf = data?.categoryPerformance || {};
  const peak = data?.peakInsights || {};
  const peakHours = data?.peakHours || null;
  const transactions = data?.transactions || [];

  // Filter transactions
  const filteredTx = transactions.filter((tx: any) => {
    const matchesSearch = tx.billNumber.toLowerCase().includes(txSearch.toLowerCase());
    const matchesType = txFilterType === "All" || tx.orderType === txFilterType;
    return matchesSearch && matchesType;
  });

  const exportTxCSV = () => {
    if (!filteredTx.length) return;
    const headers = ["Invoice No", "Date", "Order Type", "Table/Zone", "Qty", "Unit Price", "Total Item Revenue", "Payment Mode", "Payment Status"];
    const rows = filteredTx.map((t: any) => [
      `"${t.billNumber}"`,
      `"${new Date(t.date).toLocaleString("en-IN")}"`,
      `"${t.orderType}"`,
      `"${t.tableName}"`,
      t.quantity,
      t.unitPrice,
      t.revenue,
      `"${t.paymentMode}"`,
      `"${t.paymentStatus}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${item.name.replace(/\s+/g, "_")}_transactions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-6 pb-20 md:pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/dashboard/reports/items/explorer"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:border-orange-500 active:scale-95 transition-all shadow-2xs shrink-0"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight truncate">
                {item.name}
              </h1>
              <span className="text-[9px] sm:text-[10px] bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900 px-1.5 sm:px-2 py-0.5 rounded-full font-black uppercase">
                {item.category}
              </span>
              <span className="text-[9px] sm:text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
                {sym}{format(item.currentPrice)}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold text-[var(--kravy-text-muted)] truncate mt-0.5">
              Performance intelligence, peak hours heatmap & transaction history
            </p>
          </div>
        </div>

        {/* Global Date Filter for this item */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 w-full sm:w-auto">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="w-full sm:w-auto h-8 sm:h-10 px-2 sm:px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider outline-none focus:border-[var(--kravy-brand)]"
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
        </div>
      </div>

      {/* ── Section Navigation Pills (Matching Kravy Top Tabs, scrollable on mobile) ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("heatmap")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 ${
            activeTab === "heatmap"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
          }`}
        >
          <Clock size={14} className="shrink-0" />
          <span>Peak Hours & Heatmap</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("performance")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 ${
            activeTab === "performance"
              ? "bg-[var(--kravy-brand)] text-white shadow-sm"
              : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
          }`}
        >
          <BarChart3 size={14} className="shrink-0" />
          <span>Sales & Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 ${
            activeTab === "transactions"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
          }`}
        >
          <Receipt size={14} className="shrink-0" />
          <span>Invoices ({filteredTx.length})</span>
        </button>
      </div>

      {/* ── TAB 1: PEAK HOURS & HEATMAP VIEW ── */}
      {activeTab === "heatmap" && (
        <ItemPeakHoursHeatmapView
          itemName={item.name}
          currencySym={sym}
          peakHours={peakHours}
          peakDay={peak?.peakDayName || peak?.peakDay || "N/A"}
          peakHour={peak?.peakHourStr || peak?.peakHourQty || "N/A"}
          dateLabel={data?.rangeLabel || "Selected Period"}
        />
      )}

      {/* ── TAB 2: PERFORMANCE & TREND CHARTS ── */}
      {activeTab === "performance" && (
        <div className="space-y-4 sm:space-y-5">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5">
            {/* Total Quantity */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Total Qty Sold
              </span>
              <div className="text-lg sm:text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                {format(kpis.totalSold || 0)} <span className="text-xs font-normal">pcs</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold mt-0.5">
                {comp.growthSold >= 0 ? (
                  <span className="text-emerald-500 flex items-center"><ArrowUpRight size={11} />+{comp.growthSold}%</span>
                ) : (
                  <span className="text-rose-500 flex items-center"><ArrowDownRight size={11} />{comp.growthSold}%</span>
                )}
                <span className="text-[var(--kravy-text-faint)]">vs prev</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Total Revenue
              </span>
              <div className="text-lg sm:text-2xl font-black text-[var(--kravy-text-primary)] font-mono">
                {sym}{format(kpis.totalRevenue || 0)}
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold mt-0.5">
                {comp.growthRevenue >= 0 ? (
                  <span className="text-emerald-500 flex items-center"><ArrowUpRight size={11} />+{comp.growthRevenue}%</span>
                ) : (
                  <span className="text-rose-500 flex items-center"><ArrowDownRight size={11} />{comp.growthRevenue}%</span>
                )}
                <span className="text-[var(--kravy-text-faint)]">vs prev</span>
              </div>
            </div>

            {/* Order Count */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Total Orders
              </span>
              <div className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {format(kpis.orderCount || 0)}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
                Unique bills
              </span>
            </div>

            {/* Avg Selling Price */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Avg Price
              </span>
              <div className="text-lg sm:text-2xl font-black text-[var(--kravy-text-primary)] font-mono">
                {sym}{format(kpis.avgSellingPrice || 0)}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
                Per unit realized
              </span>
            </div>

            {/* Avg Qty Per Order */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Avg Basket
              </span>
              <div className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {kpis.avgQtyPerOrder || 0}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
                Qty per order
              </span>
            </div>

            {/* Avg Daily Qty */}
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-0.5 sm:mb-1">
                Run Rate
              </span>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {kpis.avgDailyQty || 0} <span className="text-xs font-normal">/day</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5 block truncate">
                Average velocity
              </span>
            </div>
          </div>

          {/* Peak Performance Insights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-indigo-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block">Peak Rush Hour</span>
                <div className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate">{peak.peakHourQty}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block">Best Day for Dish</span>
                <div className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate">{peak.peakDay}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Award size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] block">Category Standing</span>
                <div className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate">
                  Rank #{catPerf.rank} in {catPerf.categoryName} ({catPerf.categoryRevenueShare}% share)
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Charts: Hourly Sales & Day-wise Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Hourly 24-Hour Distribution */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] flex items-center gap-1.5">
                    <Clock size={15} className="text-orange-500 shrink-0" /> 24-Hour Rush Breakdown
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--kravy-text-muted)]">Operating hours pattern</p>
                </div>
                <div className="flex bg-[var(--kravy-bg)] p-1 rounded-xl border border-[var(--kravy-border)]">
                  <button
                    type="button"
                    onClick={() => setHourlyMetric("qty")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${hourlyMetric === "qty" ? "bg-[var(--kravy-brand)] text-white shadow-xs" : "text-[var(--kravy-text-muted)]"}`}
                  >
                    Qty
                  </button>
                  <button
                    type="button"
                    onClick={() => setHourlyMetric("rev")}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${hourlyMetric === "rev" ? "bg-[var(--kravy-brand)] text-white shadow-xs" : "text-[var(--kravy-text-muted)]"}`}
                  >
                    {sym}
                  </button>
                </div>
              </div>

              <div className="h-52 sm:h-60 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={2} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip
                      formatter={(val: any) => [hourlyMetric === "qty" ? `${val} pcs` : `${sym}${val}`, hourlyMetric === "qty" ? "Quantity" : "Revenue"]}
                      contentStyle={{ backgroundColor: "var(--kravy-surface)", borderColor: "var(--kravy-border)", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Bar
                      dataKey={hourlyMetric === "qty" ? "quantity" : "revenue"}
                      fill="var(--kravy-brand)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day-of-Week Distribution */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] flex items-center gap-1.5">
                    <Calendar size={15} className="text-indigo-500 shrink-0" /> Weekday Sales Distribution
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--kravy-text-muted)]">Average qty per weekday</p>
                </div>
              </div>

              <div className="h-52 sm:h-60 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} pcs (Avg ${item.payload.avgPerOccurrence}/day)`, "Total Sold"]}
                      contentStyle={{ backgroundColor: "var(--kravy-surface)", borderColor: "var(--kravy-border)", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sales Trajectory Trend Chart (Timeline) */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-emerald-500 shrink-0" /> Daily Trajectory
                </h3>
                <p className="text-[9px] sm:text-[10px] font-semibold text-[var(--kravy-text-muted)]">Trend progression over time</p>
              </div>
              <div className="flex bg-[var(--kravy-bg)] p-1 rounded-xl border border-[var(--kravy-border)] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMetric("qty")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${chartMetric === "qty" ? "bg-emerald-600 text-white shadow-xs" : "text-[var(--kravy-text-muted)]"}`}
                >
                  Quantity
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("rev")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${chartMetric === "rev" ? "bg-emerald-600 text-white shadow-xs" : "text-[var(--kravy-text-muted)]"}`}
                >
                  Revenue
                </button>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full pt-1">
              {salesTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                  No trajectory data in period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <Tooltip
                      formatter={(val: any) => [chartMetric === "qty" ? `${val} pcs` : `${sym}${val}`, chartMetric === "qty" ? "Quantity" : "Revenue"]}
                      contentStyle={{ backgroundColor: "var(--kravy-surface)", borderColor: "var(--kravy-border)", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey={chartMetric === "qty" ? "quantity" : "revenue"} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BILL-LEVEL TRANSACTION AUDIT TRAIL ── */}
      {activeTab === "transactions" && (
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] flex items-center gap-1.5">
                <Receipt size={15} className="text-orange-500 shrink-0" /> Bill Transaction History
              </h3>
              <p className="text-[10px] font-semibold text-[var(--kravy-text-muted)]">
                Invoices containing {item.name} ({filteredTx.length} bills)
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-stretch sm:self-auto flex-wrap">
              {/* Invoice Search */}
              <div className="relative flex-1 sm:w-52">
                <input
                  type="text"
                  placeholder="Search invoice..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl pl-7 pr-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[var(--kravy-brand)] text-[var(--kravy-text-primary)]"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
              </div>

              {/* Order Type Filter */}
              <select
                value={txFilterType}
                onChange={(e) => setTxFilterType(e.target.value)}
                className="bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-2 py-1.5 text-xs font-bold text-[var(--kravy-text-primary)] outline-none"
              >
                <option value="All">All Types</option>
                <option value="Dine-In">Dine-In</option>
                <option value="Takeaway">Takeaway</option>
                <option value="Delivery">Delivery</option>
              </select>

              <button
                type="button"
                onClick={exportTxCSV}
                className="h-8 px-2.5 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-xs font-bold flex items-center gap-1 hover:border-[var(--kravy-brand)] shrink-0"
                title="Export Transactions"
              >
                <Download size={12} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* ── MOBILE: Transaction Card List (< md) ── */}
          <div className="md:hidden flex flex-col gap-2">
            {filteredTx.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400">
                No transactions recorded for this item.
              </div>
            ) : (
              filteredTx.map((tx: any) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-[var(--kravy-text-primary)]">
                      {tx.billNumber}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {tx.paymentMode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--kravy-text-muted)]">
                    <span>
                      {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{", "}
                      {new Date(tx.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--kravy-surface)] border border-[var(--kravy-border)]">
                      {tx.orderType} · {tx.tableName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--kravy-border)]/60 text-xs">
                    <span className="font-mono font-black text-orange-600 dark:text-orange-400">
                      {tx.quantity} pcs × {sym}{format(tx.unitPrice)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[var(--kravy-text-primary)]">
                        {sym}{format(tx.revenue)}
                      </span>
                      <Link
                        href={`/dashboard/billing/${tx.billId}`}
                        className="p-1 rounded-lg bg-[var(--kravy-surface)] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center"
                        target="_blank"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── DESKTOP: Traditional Table (>= md) ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--kravy-border)]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-[var(--kravy-border)] text-[10px] font-black uppercase text-[var(--kravy-text-muted)]">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Order Type</th>
                  <th className="py-2.5 px-3">Table / Zone</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Realized Rate</th>
                  <th className="py-2.5 px-3 text-right">Item Revenue</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kravy-border)]">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 font-bold text-xs">
                      No transactions recorded for this item in the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[var(--kravy-bg-2)] transition-colors">
                      {/* Invoice */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--kravy-text-primary)]">
                        {tx.billNumber}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-[var(--kravy-text-muted)] font-medium">
                        {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{", "}
                        {new Date(tx.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Order Type */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)]">
                          {tx.orderType}
                        </span>
                      </td>

                      {/* Table / Zone */}
                      <td className="py-2.5 px-3 text-[var(--kravy-text-secondary)] font-semibold">
                        {tx.tableName}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-orange-600 dark:text-orange-400">
                        {tx.quantity} pcs
                      </td>

                      {/* Rate */}
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--kravy-text-muted)]">
                        {sym}{format(tx.unitPrice)}
                      </td>

                      {/* Revenue */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[var(--kravy-text-primary)]">
                        {sym}{format(tx.revenue)}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {tx.paymentMode}
                        </span>
                      </td>

                      {/* View Original Bill */}
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/dashboard/billing/${tx.billId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          target="_blank"
                        >
                          <span>Bill</span>
                          <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

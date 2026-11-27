"use client";

import React, { useState, useMemo } from "react";
import { 
  Clock, 
  Calendar, 
  Flame, 
  TrendingUp, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  ShoppingBag
} from "lucide-react";

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  orders: number;
  revenue: number;
  quantity?: number;
}

interface PeriodMetrics {
  avgDailyRevenue: number;
  avgDailyOrders: number;
  aov: number;
  totalRevenue: number;
  totalOrders: number;
}

interface DailyBreakdownItem {
  date: string;
  dayName: string;
  displayDate: string;
  monthKey?: string;
  monthName?: string;
  totalOrders: number;
  totalRevenue: number;
  totalQuantity?: number;
  aov: number;
  hourly: { hour: number; orders: number; revenue: number; quantity?: number }[];
}

interface MonthlyBreakdownItem {
  monthKey: string;
  monthName: string;
  totalOrders: number;
  totalRevenue: number;
  totalQuantity?: number;
  aov: number;
  tradingDaysCount: number;
  dailyList: DailyBreakdownItem[];
}

interface PeakHoursData {
  matrix: HeatmapCell[][];
  dayNames: string[];
  dailyBreakdown?: DailyBreakdownItem[];
  monthlyBreakdown?: MonthlyBreakdownItem[];
  weekday: PeriodMetrics;
  weekend: PeriodMetrics;
}

interface Props {
  itemName: string;
  currencySym: string;
  peakHours: PeakHoursData;
  peakDay: string;
  peakHour: string;
  dateLabel: string;
}

// Display hours: 8 AM to 11 PM (16 active business hours)
const DISPLAY_HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8, 9, ..., 23

// Reorder day names so week starts on Monday: Mon, Tue, Wed, Thu, Fri, Sat, Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ItemPeakHoursHeatmapView({
  itemName,
  currencySym,
  peakHours,
  peakDay,
  peakHour,
  dateLabel,
}: Props) {
  const [metricMode, setMetricMode] = useState<"orders" | "revenue" | "qty">("orders");
  const [hoveredCell, setHoveredCell] = useState<{
    dayName: string;
    hourLabel: string;
    orders: number;
    revenue: number;
    quantity: number;
  } | null>(null);

  // View Mode: "daily" (Date-wise Hourly) | "monthly" (Month-wise Daily)
  const [breakdownViewMode, setBreakdownViewMode] = useState<"daily" | "monthly">("daily");

  const dailyList = peakHours?.dailyBreakdown || [];
  const monthlyList = peakHours?.monthlyBreakdown || [];
  const [expandedDateRows, setExpandedDateRows] = useState<Record<string, boolean>>({});
  const [expandedMonthRows, setExpandedMonthRows] = useState<Record<string, boolean>>({
    [monthlyList[0]?.monthKey || ""]: true,
  });

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  // Find max value in active hours for proportional color intensity
  const maxValue = useMemo(() => {
    let max = 0;
    if (!peakHours?.matrix) return 1;
    DAY_ORDER.forEach((d) => {
      DISPLAY_HOURS.forEach((h) => {
        const cell = peakHours.matrix[d]?.[h];
        if (cell) {
          const val = metricMode === "orders" ? cell.orders : metricMode === "revenue" ? cell.revenue : (cell.quantity || 0);
          if (val > max) max = val;
        }
      });
    });
    return max > 0 ? max : 1;
  }, [peakHours, metricMode]);

  // Heatmap Color Scale (Indigo-to-Violet gradient matching reference)
  const getCellBg = (val: number) => {
    if (val === 0) return "bg-[var(--kravy-bg-2)]/40 hover:bg-[var(--kravy-bg-2)]";
    const ratio = val / maxValue;
    if (ratio < 0.25) return "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/30";
    if (ratio < 0.5) return "bg-indigo-500/40 text-indigo-900 dark:text-indigo-100 font-bold hover:bg-indigo-500/50";
    if (ratio < 0.75) return "bg-indigo-600 text-white font-bold hover:bg-indigo-700";
    return "bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black shadow-xs hover:brightness-110";
  };

  const revDiffPct = (peakHours?.weekday?.avgDailyRevenue || 0) > 0
    ? Math.round((((peakHours?.weekend?.avgDailyRevenue || 0) - peakHours.weekday.avgDailyRevenue) / peakHours.weekday.avgDailyRevenue) * 1000) / 10
    : 0;

  const weekendAov = peakHours?.weekend?.aov || 0;
  const weekdayAov = peakHours?.weekday?.aov || 0;

  if (!peakHours || !peakHours.matrix) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Top Highlight Cards (2 columns on mobile, 4 on desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Peak Trading Hour */}
        <div className="bg-gradient-to-br from-indigo-800 to-indigo-950 rounded-2xl p-3 sm:p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
            <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">PEAK HOUR</span>
            <Clock size={14} className="text-indigo-300 sm:w-4 sm:h-4" />
          </div>
          <div className="my-1.5 sm:my-2 text-xl sm:text-3xl font-black">
            {peakHour || "N/A"}
          </div>
          <div className="text-[10px] sm:text-[11px] text-indigo-200/90 leading-tight truncate sm:whitespace-normal">
            Highest customer rush
          </div>
        </div>

        {/* Busiest Calendar Day */}
        <div className="bg-gradient-to-br from-purple-800 to-indigo-950 rounded-2xl p-3 sm:p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-purple-200">
            <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">BUSIEST DAY</span>
            <Flame size={14} className="text-purple-300 sm:w-4 sm:h-4" />
          </div>
          <div className="my-1.5 sm:my-2 text-xl sm:text-3xl font-black truncate">
            {peakDay || "N/A"}
          </div>
          <div className="text-[10px] sm:text-[11px] text-purple-200/90 leading-tight truncate sm:whitespace-normal">
            Greatest sales day
          </div>
        </div>

        {/* Weekend Ticket AOV */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--kravy-text-muted)]">
            <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">WEEKEND AOV</span>
            <span className="text-[8px] sm:text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-1 py-0.5 rounded font-black">
              SAT & SUN
            </span>
          </div>
          <div className="my-1.5 sm:my-2 text-xl sm:text-3xl font-black text-[var(--kravy-text-primary)] font-mono">
            {currencySym}{format(weekendAov)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)] truncate">
            vs {currencySym}{format(weekdayAov)} weekdays
          </div>
        </div>

        {/* Weekend Revenue Lift */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--kravy-text-muted)]">
            <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">WEEKEND LIFT</span>
            <TrendingUp size={14} className={revDiffPct >= 0 ? "text-emerald-500" : "text-rose-500"} />
          </div>
          <div className={`my-1.5 sm:my-2 text-xl sm:text-3xl font-black ${
            revDiffPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
          }`}>
            {revDiffPct >= 0 ? "+" : ""}{revDiffPct}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)] truncate">
            Weekend revenue lift
          </div>
        </div>
      </div>

      {/* ── Peak Hours Heatmap Matrix Card ── */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4">
        {/* Heatmap Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
              <h3 className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] truncate">
                Item Activity & Peak Hours Heatmap
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5">
              Traffic intensity by day & hour (8:00 AM – 11:00 PM IST)
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto no-scrollbar w-full sm:w-auto">
            <span className="text-[11px] text-[var(--kravy-text-muted)] font-semibold hidden md:inline">Metric:</span>
            <div className="inline-flex rounded-xl bg-[var(--kravy-bg-2)] p-1 border border-[var(--kravy-border)] text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMetricMode("orders")}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition text-[11px] sm:text-xs ${
                  metricMode === "orders"
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("revenue")}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition text-[11px] sm:text-xs ${
                  metricMode === "revenue"
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("qty")}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition text-[11px] sm:text-xs ${
                  metricMode === "qty"
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Qty (Pcs)
              </button>
            </div>
          </div>
        </div>

        {/* Heatmap Grid with horizontal scroll helper on mobile */}
        <div className="relative">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <div className="min-w-[620px] sm:min-w-[680px]">
              {/* Hour Header labels (8a, 9a ... 11p) */}
              <div className="grid grid-cols-[50px_repeat(16,1fr)] sm:grid-cols-[60px_repeat(16,1fr)] gap-1 mb-1.5 text-center">
                <div className="text-[9px] sm:text-[10px] font-black uppercase text-[var(--kravy-text-muted)] text-left pl-1">
                  Day
                </div>
                {DISPLAY_HOURS.map((h) => (
                  <div key={h} className="text-[9px] sm:text-[10px] font-black text-[var(--kravy-text-muted)] truncate">
                    {h % 12 || 12}{h >= 12 ? "p" : "a"}
                  </div>
                ))}
              </div>

              {/* Days Rows: Mon to Sun */}
              <div className="space-y-1">
                {DAY_ORDER.map((d, rowIdx) => {
                  const dayLabel = DAY_LABELS[rowIdx];
                  const fullDayName = peakHours.dayNames[d];

                  return (
                    <div key={d} className="grid grid-cols-[50px_repeat(16,1fr)] sm:grid-cols-[60px_repeat(16,1fr)] gap-1 items-center">
                      {/* Day Name */}
                      <div className="text-[11px] sm:text-xs font-black text-[var(--kravy-text-primary)] pl-1 flex items-center gap-1">
                        <span>{dayLabel}</span>
                        {(d === 0 || d === 6) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" title="Weekend" />
                        )}
                      </div>

                      {/* Hour Cells */}
                      {DISPLAY_HOURS.map((h) => {
                        const cell = peakHours.matrix[d]?.[h] || { orders: 0, revenue: 0, quantity: 0 };
                        const val = metricMode === "orders" ? cell.orders : metricMode === "revenue" ? cell.revenue : (cell.quantity || 0);
                        const hourLabel = `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;

                        return (
                          <div
                            key={h}
                            onClick={() =>
                              setHoveredCell({
                                dayName: fullDayName,
                                hourLabel,
                                orders: cell.orders,
                                revenue: cell.revenue,
                                quantity: cell.quantity || 0,
                              })
                            }
                            onMouseEnter={() =>
                              setHoveredCell({
                                dayName: fullDayName,
                                hourLabel,
                                orders: cell.orders,
                                revenue: cell.revenue,
                                quantity: cell.quantity || 0,
                              })
                            }
                            className={`h-7 sm:h-9 rounded-md sm:rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] transition-all cursor-pointer ${getCellBg(
                              val
                            )}`}
                          >
                            {val > 0 ? (
                              <span>
                                {metricMode === "orders"
                                  ? val
                                  : metricMode === "qty"
                                  ? `${val}p`
                                  : `${currencySym}${Math.round(val / 1000)}k`}
                              </span>
                            ) : (
                              <span className="opacity-20 text-[9px]">·</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected / Hovered Cell Info Pill / Bottom Legend */}
        <div className="pt-2 border-t border-[var(--kravy-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {hoveredCell ? (
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-indigo-700 dark:text-indigo-300 font-bold text-[11px] sm:text-xs">
                <Sparkles size={13} className="text-indigo-500 shrink-0" />
                <span>
                  {hoveredCell.dayName} {hoveredCell.hourLabel}:
                </span>
                <span className="text-[var(--kravy-text-primary)] font-black">
                  {hoveredCell.orders} Orders · {hoveredCell.quantity} pcs · {currencySym}{format(hoveredCell.revenue)}
                </span>
              </div>
            ) : (
              <span className="text-[var(--kravy-text-muted)] italic text-[10px] sm:text-[11px]">
                Tap/hover any cell to view detailed orders, pieces & revenue.
              </span>
            )}
          </div>

          {/* Intensity Legend */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)]">
            <span>Low</span>
            <div className="w-3 h-3 rounded bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)]" />
            <div className="w-3 h-3 rounded bg-indigo-500/20" />
            <div className="w-3 h-3 rounded bg-indigo-500/50" />
            <div className="w-3 h-3 rounded bg-indigo-600" />
            <div className="w-3 h-3 rounded bg-gradient-to-br from-indigo-600 to-purple-600" />
            <span>High</span>
          </div>
        </div>
      </div>

      {/* ── Weekday vs Weekend Comparison Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
        {/* Weekday Performance */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] uppercase tracking-wider">
                Weekday (Mon – Fri)
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)]">
              5 Days
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                Avg Rev
              </div>
              <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] font-mono mt-0.5">
                {currencySym}{format(peakHours.weekday.avgDailyRevenue)}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                Avg Orders
              </div>
              <div className="text-sm sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                {peakHours.weekday.avgDailyOrders}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                AOV
              </div>
              <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] font-mono mt-0.5">
                {currencySym}{format(peakHours.weekday.aov)}
              </div>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)] flex items-center justify-between pt-1 border-t border-[var(--kravy-border)]">
            <span>Total weekday:</span>
            <span className="font-extrabold text-[var(--kravy-text-primary)]">
              {currencySym}{format(peakHours.weekday.totalRevenue)} ({peakHours.weekday.totalOrders} bills)
            </span>
          </div>
        </div>

        {/* Weekend Performance */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-500" />
              <h4 className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] uppercase tracking-wider">
                Weekend (Sat – Sun)
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Weekend Spike
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                Avg Rev
              </div>
              <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] font-mono mt-0.5">
                {currencySym}{format(peakHours.weekend.avgDailyRevenue)}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                Avg Orders
              </div>
              <div className="text-sm sm:text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {peakHours.weekend.avgDailyOrders}
              </div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl bg-[var(--kravy-bg-2)]/60 text-center">
              <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                AOV
              </div>
              <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] font-mono mt-0.5">
                {currencySym}{format(peakHours.weekend.aov)}
              </div>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)] flex items-center justify-between pt-1 border-t border-[var(--kravy-border)]">
            <span>Total weekend:</span>
            <span className="font-extrabold text-[var(--kravy-text-primary)]">
              {currencySym}{format(peakHours.weekend.totalRevenue)} ({peakHours.weekend.totalOrders} bills)
            </span>
          </div>
        </div>
      </div>

      {/* ── Date-wise & Month-wise Drilldown Accordions ── */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-3.5 sm:p-6 shadow-2xs space-y-3.5 sm:space-y-4">
        {/* Header & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--kravy-border)]">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
              <h3 className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)]">
                {breakdownViewMode === "daily"
                  ? "Date-wise & Day-wise Breakdown"
                  : "Month-wise Daily Report"}
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5">
              Exact sales, pieces and orders per hour for every single date
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <div className="inline-flex rounded-xl bg-[var(--kravy-bg-2)] p-1 border border-[var(--kravy-border)] text-xs font-bold">
              <button
                type="button"
                onClick={() => setBreakdownViewMode("daily")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition text-[11px] sm:text-xs ${
                  breakdownViewMode === "daily"
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Date-wise
              </button>
              <button
                type="button"
                onClick={() => setBreakdownViewMode("monthly")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition text-[11px] sm:text-xs ${
                  breakdownViewMode === "monthly"
                    ? "bg-indigo-600 text-white shadow-xs font-extrabold"
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Month-wise
              </button>
            </div>
          </div>
        </div>

        {/* View Mode 1: Date-wise Hourly Drilldown */}
        {breakdownViewMode === "daily" && (
          dailyList.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400">
              No daily transactions recorded for {itemName} in this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {dailyList.map((day) => {
                const isExpanded = expandedDateRows[day.date] ?? false;
                const activeHours = day.hourly.filter((h) => DISPLAY_HOURS.includes(h.hour));

                return (
                  <div
                    key={day.date}
                    className="rounded-2xl border border-[var(--kravy-border)] bg-[var(--kravy-bg-2)]/30 overflow-hidden transition"
                  >
                    {/* Day Row Header */}
                    <div
                      onClick={() =>
                        setExpandedDateRows((prev) => ({
                          ...prev,
                          [day.date]: !isExpanded,
                        }))
                      }
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--kravy-bg-2)]/60 cursor-pointer select-none transition"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">
                              {day.displayDate}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black uppercase ${
                              day.dayName === "Sunday" || day.dayName === "Saturday"
                                ? "bg-purple-500/10 text-purple-600"
                                : "bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)]"
                            }`}>
                              {day.dayName}
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)] mt-0.5">
                            {day.totalOrders} orders · {day.totalQuantity || 0} pcs · AOV {currencySym}{format(day.aov)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-9 sm:pl-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-base font-black text-[var(--kravy-text-primary)]">
                            {currencySym}{format(day.totalRevenue)}
                          </div>
                          <div className="text-[9px] text-[var(--kravy-text-muted)]">Day Revenue</div>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 underline">
                          {isExpanded ? "Hide" : "Hourly"}
                        </span>
                      </div>
                    </div>

                    {/* Expanded 16h Hourly Breakdown Grid (2 cols mobile, 4 sm, 8 lg) */}
                    {isExpanded && (
                      <div className="p-3 sm:p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] space-y-2.5 animate-in fade-in">
                        <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                          Hourly Details for {day.displayDate} ({day.dayName}):
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          {activeHours.map((h) => {
                            const hourLabel = `${h.hour % 12 || 12}:00 ${h.hour >= 12 ? "PM" : "AM"}`;
                            const hasSales = h.revenue > 0 || h.orders > 0;

                            return (
                              <div
                                key={h.hour}
                                className={`p-2 rounded-xl border text-center transition ${
                                  hasSales
                                    ? "bg-indigo-500/5 border-indigo-500/20"
                                    : "bg-[var(--kravy-bg-2)]/30 border-[var(--kravy-border)]/50 opacity-60"
                                }`}
                              >
                                <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)]">
                                  {hourLabel}
                                </div>
                                <div className={`text-xs sm:text-sm font-black mt-0.5 ${
                                  hasSales ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--kravy-text-muted)]"
                                }`}>
                                  {currencySym}{format(h.revenue)}
                                </div>
                                <div className="text-[9px] sm:text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5">
                                  {h.orders} {h.orders === 1 ? "ord" : "ords"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* View Mode 2: Month-wise Daily Drilldown */}
        {breakdownViewMode === "monthly" && (
          monthlyList.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400">
              No monthly aggregation data available.
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyList.map((m) => {
                const isMonthExpanded = expandedMonthRows[m.monthKey] ?? false;

                return (
                  <div
                    key={m.monthKey}
                    className="rounded-2xl border border-[var(--kravy-border)] bg-[var(--kravy-bg-2)]/30 overflow-hidden transition"
                  >
                    {/* Month Header Banner */}
                    <div
                      onClick={() =>
                        setExpandedMonthRows((prev) => ({
                          ...prev,
                          [m.monthKey]: !isMonthExpanded,
                        }))
                      }
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gradient-to-r from-indigo-500/10 via-[var(--kravy-surface)] to-transparent hover:bg-[var(--kravy-bg-2)]/60 cursor-pointer select-none transition"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-md shadow-indigo-600/20">
                          {isMonthExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-base font-black text-[var(--kravy-text-primary)]">
                              {m.monthName}
                            </span>
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {m.tradingDaysCount} Days
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5">
                            {m.totalOrders} Orders · AOV {currencySym}{format(m.aov)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-10 sm:pl-0">
                        <div className="text-right">
                          <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)]">
                            {currencySym}{format(m.totalRevenue)}
                          </div>
                          <div className="text-[9px] text-[var(--kravy-text-muted)] uppercase tracking-wider">
                            Total
                          </div>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 underline">
                          {isMonthExpanded ? "Hide" : "Days"}
                        </span>
                      </div>
                    </div>

                    {/* Nested Daily Breakdown for this Month */}
                    {isMonthExpanded && (
                      <div className="p-3 sm:p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] space-y-2 animate-in fade-in">
                        <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] mb-2">
                          Daily Trading for {m.monthName}:
                        </div>

                        {m.dailyList.map((day) => {
                          const isDayHourlyExpanded = expandedDateRows[day.date] ?? false;
                          const activeHours = day.hourly.filter((h) => DISPLAY_HOURS.includes(h.hour));

                          return (
                            <div
                              key={day.date}
                              className="rounded-xl border border-[var(--kravy-border)]/80 bg-[var(--kravy-bg-2)]/40 overflow-hidden transition"
                            >
                              <div
                                onClick={() =>
                                  setExpandedDateRows((prev) => ({
                                    ...prev,
                                    [day.date]: !isDayHourlyExpanded,
                                  }))
                                }
                                className="p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--kravy-bg-2)]/80 cursor-pointer select-none transition"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                    {isDayHourlyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-[var(--kravy-text-primary)]">
                                        {day.displayDate}
                                      </span>
                                      <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase ${
                                        day.dayName === "Sunday" || day.dayName === "Saturday"
                                          ? "bg-purple-500/10 text-purple-600"
                                          : "bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)]"
                                      }`}>
                                        {day.dayName}
                                      </span>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-[var(--kravy-text-muted)]">
                                      {day.totalOrders} ords · AOV {currencySym}{format(day.aov)}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-8 sm:pl-0">
                                  <div className="text-right">
                                    <div className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">
                                      {currencySym}{format(day.totalRevenue)}
                                    </div>
                                  </div>
                                  <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 underline">
                                    {isDayHourlyExpanded ? "Hide" : "Hours"}
                                  </span>
                                </div>
                              </div>

                              {/* Nested Hourly Breakdown */}
                              {isDayHourlyExpanded && (
                                <div className="p-2.5 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] space-y-1.5 animate-in fade-in">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                                    {activeHours.map((h) => {
                                      const hourLabel = `${h.hour % 12 || 12}:00 ${h.hour >= 12 ? "PM" : "AM"}`;
                                      const hasSales = h.revenue > 0 || h.orders > 0;

                                      return (
                                        <div
                                          key={h.hour}
                                          className={`p-1.5 rounded-lg border text-center transition ${
                                            hasSales
                                              ? "bg-indigo-500/5 border-indigo-500/20"
                                              : "bg-[var(--kravy-bg-2)]/30 border-[var(--kravy-border)]/50 opacity-60"
                                          }`}
                                        >
                                          <div className="text-[9px] font-bold text-[var(--kravy-text-muted)]">
                                            {hourLabel}
                                          </div>
                                          <div className={`text-xs font-black ${
                                            hasSales ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--kravy-text-muted)]"
                                          }`}>
                                            {currencySym}{format(h.revenue)}
                                          </div>
                                          <div className="text-[8px] font-bold text-[var(--kravy-text-muted)]">
                                            {h.orders} ords
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

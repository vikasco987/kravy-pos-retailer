"use client";

import { useCurrency } from '@/lib/currency-context';
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, IndianRupee, TrendingUp, Sparkles, Filter, 
  Download, Calendar, BarChart3, Clock, Smartphone, Banknote, 
  CheckCircle, X, ShoppingBag, Eye, EyeOff, Printer, FileText, Share2, 
  ChevronRight, RefreshCw, Search, ArrowRight, User, Award, 
  MapPin, HelpCircle, AlertCircle, Percent
} from "lucide-react";
import { kravy } from "@/lib/sounds";
import { BillActionsReport } from "@/app/dashboard/reports/sales/daily/BillActionsReport";
import ReportExportDropdown from "@/components/ReportExportDropdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DrilldownClientProps {
  businessName: string;
}

type DrilldownLevel = "year" | "month" | "week" | "day" | "bill";

interface SummaryData {
  totalSales: number;
  netSales: number;
  grossSales: number;
  totalBills: number;
  cancelledBills: number;
  cancelledValue: number;
  refundAmount: number;
  avgBill: number;
  highestBill: number;
  lowestBill: number;
  uniqueCustomers: number;
  returningCustomers: number;
  peakSalesHour: number;
  paymentBreakdown: { CASH: number; UPI: number; CARD: number; WALLET: number; OTHER: number };
  orderTypeBreakdown: { DINEIN: number; TAKEAWAY: number; DELIVERY: number };
}

interface AggregatedItem {
  label: string;
  sales: number;
  count: number;
  rawKey: string;
}

interface BillItemDetail {
  id: string;
  billNumber: string;
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentMode: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  tax: number;
  amountPaid?: number;
  balanceDue?: number;
  tableName: string;
  items: any;
  auditNote: string | null;
}

export default function DrilldownClient({ businessName }: DrilldownClientProps) {
  const { currencySymbol: sym } = useCurrency();
  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState<"year" | "month" | "week" | "day">("month");
  
  // Drilldown stack state to keep track of breadcrumbs
  // e.g. [{ level: "year", key: "2026", label: "2026" }]
  const [drilldownStack, setDrilldownStack] = useState<{ level: DrilldownLevel; key: string; label: string }[]>([]);
  
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("ALL");
  const [orderType, setOrderType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [gstType, setGstType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Data States
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [items, setItems] = useState<any[]>([]); // Aggregated items or Bill list
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, totalItems: 0, totalPages: 1 });
  
  // Selected Bill details for invoice modal
  const [selectedBill, setSelectedBill] = useState<BillItemDetail | null>(null);

  const [showBalances, setShowBalances] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "table">("table");

  const mask = (value: string | number) => {
    if (showBalances) return value;
    return "••••";
  };

  // Compute current effective drill-down level
  const currentLevel: DrilldownLevel = useMemo(() => {
    if (drilldownStack.length === 0) {
      return activeTab;
    }
    const lastFilter = drilldownStack[drilldownStack.length - 1].level;
    if (lastFilter === "year") return "month";
    if (lastFilter === "month") return "week";
    if (lastFilter === "week") return "day";
    return "bill";
  }, [drilldownStack, activeTab]);

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Determine what to aggregate by next
      let nextLevel: DrilldownLevel = activeTab;
      if (drilldownStack.length > 0) {
        const lastFilter = drilldownStack[drilldownStack.length - 1].level;
        if (lastFilter === "year") nextLevel = "month";
        else if (lastFilter === "month") nextLevel = "week";
        else if (lastFilter === "week") nextLevel = "day";
        else if (lastFilter === "day") nextLevel = "bill";
      }
      
      queryParams.set("groupBy", nextLevel);

      // Inject parent filters based on the drilldown path
      drilldownStack.forEach((step) => {
        if (step.level === "year") queryParams.set("year", step.key);
        if (step.level === "month") queryParams.set("month", step.key);
        if (step.level === "week") queryParams.set("week", step.key);
        if (step.level === "day") queryParams.set("day", step.key);
      });

      // Inject filter UI parameters
      if (startDate) queryParams.set("startDate", startDate);
      if (endDate) queryParams.set("endDate", endDate);
      if (paymentMode !== "ALL") queryParams.set("paymentMode", paymentMode);
      if (orderType !== "ALL") queryParams.set("orderType", orderType);
      if (status !== "ALL") queryParams.set("status", status);
      if (gstType !== "ALL") queryParams.set("gstType", gstType);
      if (searchQuery) queryParams.set("customer", searchQuery);
      
      if (nextLevel === "bill") {
        queryParams.set("page", String(page));
        queryParams.set("pageSize", String(pageSize));
      }

      const res = await fetch(`/api/reports/sales/drilldown?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Error loading drilldown report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, drilldownStack, startDate, endDate, paymentMode, orderType, status, gstType, searchQuery, page, pageSize]);

  // Click handler for list rows / bars to drill down
  const handleItemClick = (item: AggregatedItem) => {
    kravy.click();
    
    let filterLevel: DrilldownLevel = activeTab;
    
    if (drilldownStack.length > 0) {
      const lastFilter = drilldownStack[drilldownStack.length - 1].level;
      if (lastFilter === "year") filterLevel = "month";
      else if (lastFilter === "month") filterLevel = "week";
      else if (lastFilter === "week") filterLevel = "day";
      else if (lastFilter === "day") filterLevel = "bill";
    }

    if (filterLevel === "bill") return;

    setDrilldownStack((prev) => [
      ...prev,
      { level: filterLevel, key: item.rawKey, label: item.label }
    ]);
    setPage(1); // Reset page on drill-down
  };

  // Navigating back to a specific breadcrumb level
  const handleBreadcrumbClick = (index: number) => {
    kravy.click();
    if (index === -1) {
      setDrilldownStack([]);
    } else {
      setDrilldownStack((prev) => prev.slice(0, index + 1));
    }
    setPage(1);
  };

  // Reset all filters
  const resetFilters = () => {
    kravy.click();
    setStartDate("");
    setEndDate("");
    setPaymentMode("ALL");
    setOrderType("ALL");
    setStatus("ALL");
    setGstType("ALL");
    setSearchQuery("");
    setPage(1);
  };

  // Helper formatting numbers to HSL format
  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  // Hourly display string format helper
  const getHourString = (hr: number) => {
    if (hr === -1) return "N/A";
    return `${hr % 12 || 12} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const isBillsView = items.length > 0 && "billNumber" in items[0];

  const periodStr = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `Since ${startDate}`;
    if (endDate) return `Until ${endDate}`;

    if (drilldownStack.length > 0) {
      const last = drilldownStack[drilldownStack.length - 1];
      if (last.level === "year") return `Year: ${last.label}`;
      if (last.level === "month") return `Month: ${last.label}`;
      if (last.level === "week") return `Week: ${last.label}`;
      if (last.level === "day") return `Date: ${last.label}`;
    }

    if (activeTab === "year") return "All Time";
    if (activeTab === "month") return "This Year";
    if (activeTab === "week") return "This Month";
    if (activeTab === "day") return "This Week";
    return "All Time";
  }, [startDate, endDate, drilldownStack, activeTab]);

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full pb-12">
      
      {/* ── Header Row ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link 
            href="/dashboard" 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg-2)] transition shrink-0"
          >
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight whitespace-nowrap">
              Sales Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <Sparkles size={14} className="text-[var(--kravy-brand)] shrink-0" />
              <span>Premium business drilldown dashboard</span>
            </p>
          </div>
        </div>

        {/* Tab Selector & Reset */}
        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
          {drilldownStack.length === 0 && (
            <div className="flex items-center bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-2xl p-1 shrink-0">
              {(["year", "month", "week", "day"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { kravy.click(); setActiveTab(tab); }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-[var(--kravy-brand)] text-white shadow-sm"
                      : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={() => { kravy.click(); setShowBalances(s => !s); }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl text-[var(--kravy-text-primary)] font-black text-xs flex items-center gap-2 hover:bg-[var(--kravy-bg-2)] transition shadow-xs whitespace-nowrap shrink-0"
          >
            {showBalances ? <EyeOff size={14} /> : <Eye size={14} />} {showBalances ? "Hide" : "Reveal"}
          </button>

          <button
            onClick={resetFilters}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] font-bold text-xs flex items-center gap-1.5 hover:bg-[var(--kravy-bg-2)] transition shadow-xs whitespace-nowrap shrink-0"
          >
            <RefreshCw size={12} /> Reset
          </button>
          
          {items && items.length > 0 && (
            <div className="shrink-0">
              <ReportExportDropdown
                data={items}
                columns={isBillsView 
                  ? [
                      { key: "billNumber", label: "Invoice ID" },
                      { key: "createdAt", label: "Date & Time", format: (v: any) => new Date(v).toLocaleString() },
                      { key: "customerName", label: "Customer Name" },
                      { key: "customerPhone", label: "Phone" },
                      { key: "paymentStatus", label: "Status" },
                      { key: "paymentMode", label: "Mode" },
                      { key: "tableName", label: "Source" },
                      { key: "total", label: "Value ({sym})", format: (v: any) => v.toString() }
                    ]
                  : [
                      { key: "label", label: "Period / Entity" },
                      { key: "sales", label: "Sales Volume ({sym})", format: (v: any) => v.toString() },
                      { key: "count", label: "Bill Count", format: (v: any) => v.toString() }
                    ]}
                filename={`Sales_Drilldown_${periodStr.replace(/[^a-zA-Z0-9]/g, "_")}`}
                title={`Sales Drilldown - ${periodStr}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Breadcrumbs ── */}
      <div className="flex items-center gap-2 flex-wrap bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-extrabold">
        <button 
          onClick={() => handleBreadcrumbClick(-1)}
          className={`border-none bg-transparent cursor-pointer transition ${drilldownStack.length === 0 ? "text-[var(--kravy-brand)]" : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"}`}
        >
          {activeTab.toUpperCase()}S
        </button>
        
        {drilldownStack.map((step, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className={`border-none bg-transparent cursor-pointer font-black transition ${idx === drilldownStack.length - 1 ? "text-[var(--kravy-brand)]" : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"}`}
            >
              {step.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--kravy-border)] pb-3">
          <Filter size={16} className="text-indigo-500" />
          <span className="text-xs font-black uppercase tracking-wider text-[var(--kravy-text-primary)]">Refinement Filters</span>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-end">
          {/* Custom Date Picker (From and To) */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider">DATE RANGE</span>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                onClick={(e) => (e.target as any).showPicker?.()}
                className="w-full sm:w-[145px] px-2.5 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-[var(--kravy-text-muted)] font-bold text-center shrink-0 px-0.5">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                onClick={(e) => (e.target as any).showPicker?.()}
                className="w-full sm:w-[145px] px-2.5 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 min-w-0">
            {/* Payment Method */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider truncate">PAYMENT MODE</span>
              <Select value={paymentMode} onValueChange={(val) => setPaymentMode(val)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:ring-1 focus:ring-indigo-500 shadow-none">
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" collisionPadding={12} className="w-[var(--radix-select-trigger-width)] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-xl z-[9999]">
                  <SelectItem value="ALL" className="text-xs font-bold py-2 cursor-pointer">All Payments</SelectItem>
                  <SelectItem value="CASH" className="text-xs font-bold py-2 cursor-pointer">Cash</SelectItem>
                  <SelectItem value="UPI" className="text-xs font-bold py-2 cursor-pointer">UPI</SelectItem>
                  <SelectItem value="CARD" className="text-xs font-bold py-2 cursor-pointer">Card</SelectItem>
                  <SelectItem value="WALLET" className="text-xs font-bold py-2 cursor-pointer">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Order Type */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider truncate">ORDER TYPE</span>
              <Select value={orderType} onValueChange={(val) => setOrderType(val)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:ring-1 focus:ring-indigo-500 shadow-none">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" collisionPadding={12} className="w-[var(--radix-select-trigger-width)] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-xl z-[9999]">
                  <SelectItem value="ALL" className="text-xs font-bold py-2 cursor-pointer">All Orders</SelectItem>
                  <SelectItem value="Dine In" className="text-xs font-bold py-2 cursor-pointer">Dine In / POS</SelectItem>
                  <SelectItem value="Takeaway" className="text-xs font-bold py-2 cursor-pointer">Takeaway</SelectItem>
                  <SelectItem value="Delivery" className="text-xs font-bold py-2 cursor-pointer">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bill Status */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider truncate">BILL STATUS</span>
              <Select value={status} onValueChange={(val) => setStatus(val)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:ring-1 focus:ring-indigo-500 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" collisionPadding={12} className="w-[var(--radix-select-trigger-width)] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-xl z-[9999]">
                  <SelectItem value="ALL" className="text-xs font-bold py-2 cursor-pointer">All Statuses</SelectItem>
                  <SelectItem value="Paid" className="text-xs font-bold py-2 cursor-pointer">Settle/Paid</SelectItem>
                  <SelectItem value="Pending" className="text-xs font-bold py-2 cursor-pointer">Pending/Partial</SelectItem>
                  <SelectItem value="Cancelled" className="text-xs font-bold py-2 cursor-pointer">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GST vs Non-GST */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider truncate">TAX CLASS</span>
              <Select value={gstType} onValueChange={(val) => setGstType(val)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:ring-1 focus:ring-indigo-500 shadow-none">
                  <SelectValue placeholder="All Bills" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" collisionPadding={12} className="w-[var(--radix-select-trigger-width)] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-xl z-[9999]">
                  <SelectItem value="ALL" className="text-xs font-bold py-2 cursor-pointer">All Bills</SelectItem>
                  <SelectItem value="GST" className="text-xs font-bold py-2 cursor-pointer">GST Only</SelectItem>
                  <SelectItem value="NON-GST" className="text-xs font-bold py-2 cursor-pointer">Non-GST Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
          <input
            type="text"
            placeholder="Search customer name, contact phone, or invoice identification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--kravy-border)] rounded-xl text-xs font-bold bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-[var(--kravy-text-muted)]"
          />
        </div>
      </div>

      {/* ── Loading Overlay ── */}
      {loading ? (
        <div style={{ padding: "100px", textAlign: "center", color: "var(--kravy-text-muted)", fontSize: "0.9rem", fontWeight: 800, display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <RefreshCw size={36} className="animate-spin text-indigo-500" />
          Analyzing Financial Records...
        </div>
      ) : (
        <>
          {/* Reveal button banner when cards are collapsed */}
          {!showBalances && (
            <div 
              onClick={() => { kravy.click(); setShowBalances(true); }}
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                border: "1px dashed var(--kravy-border)",
                borderRadius: "20px",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                color: "var(--kravy-brand)",
                fontWeight: 850,
                fontSize: "0.85rem",
                boxShadow: "var(--kravy-shadow-sm)",
                transition: "all 0.2s"
              }}
              className="hover:scale-[1.01]"
            >
              <Eye size={16} /> REVEAL SALES PERFORMANCE METRIC CARDS & BREAKDOWNS
            </div>
          )}

          {showBalances && (
            <>
              {/* ── KPI Matrix (Scrollable <= 1024px) ── */}
              {summary && (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Top 4 KPI Cards */}
                  <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
                    <div className="min-w-[210px] sm:min-w-[240px] lg:min-w-0 flex-1 bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 xl:p-6 text-white shadow-md relative shrink-0 lg:shrink">
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] lg:text-[11px] font-black opacity-80 uppercase tracking-wider sm:tracking-widest leading-tight">Total Volume (Sales)</span>
                        <span className="text-[8.5px] sm:text-[9px] font-bold bg-white/15 px-1.5 sm:px-2 py-0.5 rounded shrink-0">{periodStr}</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight mt-1.5 sm:mt-2">
                        {showBalances ? sym : ""}{mask(format(summary.totalSales))}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] lg:text-[11px] opacity-80 mt-1">
                        Gross: {showBalances ? sym : ""}{mask(format(summary.grossSales))}
                      </div>
                    </div>
                    
                    <div className="min-w-[210px] sm:min-w-[240px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 xl:p-6 shadow-sm shrink-0 lg:shrink">
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] lg:text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider sm:tracking-widest leading-tight">Net Assets (Excl. Tax)</span>
                        <span className="text-[8.5px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 sm:px-2 py-0.5 rounded shrink-0">{periodStr}</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight mt-1.5 sm:mt-2">
                        {showBalances ? sym : ""}{mask(format(summary.netSales))}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] lg:text-[11px] text-[var(--kravy-text-muted)] mt-1">
                        GST Value: {showBalances ? sym : ""}{mask(format(summary.grossSales - summary.netSales))}
                      </div>
                    </div>

                    <div className="min-w-[210px] sm:min-w-[240px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 xl:p-6 shadow-sm shrink-0 lg:shrink">
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] lg:text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider sm:tracking-widest leading-tight">Invoice Clearing Count</span>
                        <span className="text-[8.5px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 sm:px-2 py-0.5 rounded shrink-0">{periodStr}</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight mt-1.5 sm:mt-2">
                        {mask(summary.totalBills)}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] lg:text-[11px] text-[var(--kravy-text-muted)] mt-1">
                        Cancelled: {mask(summary.cancelledBills)} ({showBalances ? sym : ""}{mask(format(summary.cancelledValue))})
                      </div>
                    </div>

                    <div className="min-w-[210px] sm:min-w-[240px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5 xl:p-6 shadow-sm shrink-0 lg:shrink">
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] lg:text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider sm:tracking-widest leading-tight">Average Ticket Value</span>
                        <span className="text-[8.5px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 sm:px-2 py-0.5 rounded shrink-0">{periodStr}</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight mt-1.5 sm:mt-2">
                        {showBalances ? sym : ""}{mask(format(summary.avgBill))}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] lg:text-[11px] text-[var(--kravy-text-muted)] mt-1">
                        Max Ticket: {showBalances ? sym : ""}{mask(format(summary.highestBill))}
                      </div>
                    </div>
                  </div>

                  {/* Sub-matrix KPI details (Scrollable <= 1024px) */}
                  <div className="flex lg:grid lg:grid-cols-3 gap-2.5 sm:gap-3.5 lg:gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-thin">
                    <div className="min-w-[230px] sm:min-w-[250px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 lg:p-4 xl:p-5 flex justify-between items-center shadow-sm shrink-0 lg:shrink">
                      <div className="min-w-0 flex-1 pr-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] sm:text-[10px] font-black text-[var(--kravy-text-muted)] uppercase">Unique Customers</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 py-0.5 rounded">{periodStr}</span>
                        </div>
                        <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] mt-1">
                          {mask(summary.uniqueCustomers)}
                        </div>
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-[var(--kravy-brand)] bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl shrink-0">
                        {mask(summary.returningCustomers)} RETURNING ({summary.uniqueCustomers > 0 ? ((summary.returningCustomers / summary.uniqueCustomers) * 100).toFixed(0) : 0}%)
                      </div>
                    </div>

                    <div className="min-w-[230px] sm:min-w-[250px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 lg:p-4 xl:p-5 flex justify-between items-center shadow-sm shrink-0 lg:shrink">
                      <div className="min-w-0 flex-1 pr-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] sm:text-[10px] font-black text-[var(--kravy-text-muted)] uppercase">Peak Hour Activity</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 py-0.5 rounded">{periodStr}</span>
                        </div>
                        <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] mt-1">
                          {getHourString(summary.peakSalesHour)}
                        </div>
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl shrink-0">
                        MAX VOLUME HOUR
                      </div>
                    </div>

                    <div className="min-w-[230px] sm:min-w-[250px] lg:min-w-0 flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 lg:p-4 xl:p-5 flex justify-between items-center shadow-sm shrink-0 lg:shrink">
                      <div className="min-w-0 flex-1 pr-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] sm:text-[10px] font-black text-[var(--kravy-text-muted)] uppercase">Lowest Ticket</span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-1.5 py-0.5 rounded">{periodStr}</span>
                        </div>
                        <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] mt-1">
                          {showBalances ? sym : ""}{mask(format(summary.lowestBill))}
                        </div>
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl shrink-0">
                        MIN VALUE
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Graphical Insights & Breakdown ── */}
              {summary && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  {/* Payment & Order Type Distribution */}
                  <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 flex flex-col gap-5 sm:gap-6 shadow-sm">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--kravy-text-primary)]">
                      Payment Mode & Order Source Breakdown
                    </h3>
                    
                    {/* Payments */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider">PAYMENT MODES VOLUME</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        {Object.entries(summary.paymentBreakdown).map(([mode, sales]) => {
                          const pct = summary.totalSales > 0 ? (sales / summary.totalSales) * 100 : 0;
                          if (sales === 0) return null;
                          return (
                            <div key={mode} className="bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col gap-1 min-w-0">
                              <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] truncate">{mode}</span>
                              <span className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)] truncate">
                                {showBalances ? sym : ""}{mask(format(sales))}
                              </span>
                              <span className="text-[10px] font-black text-[var(--kravy-brand)]">{pct.toFixed(0)}% share</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Types */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider">ORDER SOURCES VOLUME</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                        {Object.entries(summary.orderTypeBreakdown).map(([type, sales]) => {
                          const pct = summary.totalSales > 0 ? (sales / summary.totalSales) * 100 : 0;
                          if (sales === 0) return null;
                          return (
                            <div key={type} className="bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col gap-1 min-w-0">
                              <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] truncate">{type}</span>
                              <span className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)] truncate">
                                {showBalances ? sym : ""}{mask(format(sales))}
                              </span>
                              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400">{pct.toFixed(0)}% share</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BI Operational Insights */}
                  <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 flex flex-col gap-4 sm:gap-5 shadow-sm">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--kravy-text-primary)]">
                      Smart Business Intelligence Insights
                    </h3>
                    
                    <div className="flex flex-col gap-3">
                      <div className="p-3.5 sm:p-4 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl">
                        <span className="text-[10px] font-black text-[var(--kravy-brand)] uppercase tracking-wider">Volume Yield Recommendation</span>
                        <p className="text-xs sm:text-sm text-[var(--kravy-text-primary)] font-bold mt-1.5 leading-relaxed">
                          Your average ticket is {sym}{format(summary.avgBill)}. Consider creating high-yield combo items valued around {sym}{format(summary.avgBill * 1.4)} to maximize order metrics.
                        </p>
                      </div>

                      <div className="p-3.5 sm:p-4 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl">
                        <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">Peak Staffing Recommendation</span>
                        <p className="text-xs sm:text-sm text-[var(--kravy-text-primary)] font-bold mt-1.5 leading-relaxed">
                          Peak hour detected at {getHourString(summary.peakSalesHour)}. Ensure high staffing presence during this window to reduce ticket turn-around times.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Main Data View (Drilldown List or Bills Table) ── */}
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[var(--kravy-shadow-md)]">
            <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--kravy-border)] flex flex-wrap gap-3 justify-between items-center bg-[var(--kravy-bg-2)]">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                <h3 className="text-sm sm:text-base md:text-lg font-black text-[var(--kravy-text-primary)]">
                  {isBillsView ? "Audited Bill Registry" : "Aggregated Sales Yield"}
                </h3>
                {!isBillsView && (
                  <div className="flex bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition ${viewMode === "table" ? "bg-[var(--kravy-brand)] text-white shadow-sm" : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"}`}
                    >
                      Table View
                    </button>
                    <button
                      onClick={() => setViewMode("visual")}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition ${viewMode === "visual" ? "bg-[var(--kravy-brand)] text-white shadow-sm" : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"}`}
                    >
                      Bar View
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-extrabold text-[var(--kravy-text-muted)] bg-[var(--kravy-surface)] px-2.5 sm:px-3 py-1 rounded-lg border border-[var(--kravy-border)] shrink-0">
                {items.length} records in view
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 sm:p-14 text-center text-[var(--kravy-text-muted)] text-xs sm:text-sm font-bold">
                No sales records found matching filter criteria.
              </div>
            ) : isBillsView ? (
              <div className="w-full overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[760px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-[var(--kravy-bg-2)]">
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">S.No</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Invoice ID</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Customer Name</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Payment</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Mode</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Source</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider text-right">Value</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--kravy-border)]">
                      {items.map((b: BillItemDetail, idx) => {
                        const actualIdx = (pagination.page - 1) * pagination.pageSize + idx + 1;
                        const isCancelled = (b.paymentStatus || "").toUpperCase() === "CANCELLED";
                        const isPending = (b.paymentStatus || "").toUpperCase() === "PENDING" || (b.paymentStatus || "").toUpperCase() === "HELD";
                        
                        return (
                          <tr key={b.id} className="hover:bg-[var(--kravy-bg-2)]/30 transition">
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs font-black text-[var(--kravy-text-muted)]">{String(actualIdx).padStart(2, "0")}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                              <div className="font-black text-[var(--kravy-brand)] font-mono text-sm">#{b.billNumber}</div>
                              <div className="text-[10px] text-[var(--kravy-text-muted)] mt-0.5">
                                {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                              <div className="font-extrabold text-[var(--kravy-text-primary)] text-xs sm:text-sm">{b.customerName || "Walk-in Guest"}</div>
                              <div className="text-[10px] font-mono text-[var(--kravy-text-muted)] mt-0.5">{b.customerPhone || "NO CONTACT"}</div>
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                              <div className={`inline-flex items-center gap-1 text-[11px] font-black ${isCancelled ? "text-rose-500" : isPending ? "text-amber-500" : "text-emerald-500"}`}>
                                {isCancelled ? <X size={12} /> : isPending ? <Clock size={12} /> : <CheckCircle size={12} />}
                                {(b.paymentStatus || "").toUpperCase()}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                              <span className="text-xs font-black text-[var(--kravy-text-primary)]">{(b.paymentMode || "").toUpperCase()}</span>
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                              <span className="text-xs font-bold text-[var(--kravy-text-muted)]">{b.tableName}</span>
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-right">
                              <div className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                                {sym}{format(b.total)}
                              </div>
                              {(b.paymentStatus || "").toUpperCase() === "PARTIAL" && (
                                <div className="flex flex-col gap-0.5 mt-1 text-[10px] font-extrabold">
                                  <span className="text-emerald-500">Paid: {sym}{format(b.amountPaid || 0)}</span>
                                  <span className="text-rose-500">Unpaid: {sym}{format(b.balanceDue || 0)}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-right">
                              <div className="flex justify-end">
                                <BillActionsReport 
                                  billId={b.id} 
                                  bill={b} 
                                  business={{ businessName }} 
                                  onPreview={() => { kravy.click(); setSelectedBill(b); }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            ) : viewMode === "table" ? (
                <div className="w-full overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[760px] whitespace-nowrap">
                    <thead>
                      <tr className="bg-[var(--kravy-bg-2)]">
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Period</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Bills</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Total Sales</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">MoM Growth</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Avg Bill</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Collected</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Outstanding</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">UPI %</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Cash %</th>
                        <th className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-[11px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Card %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--kravy-border)]">
                      {items.map((item: any) => {
                        const momGrowth = item.growth;
                        const upiPct = item.sales > 0 ? Math.round((item.upiSales / item.sales) * 100) : 0;
                        const cashPct = item.sales > 0 ? Math.round((item.cashSales / item.sales) * 100) : 0;
                        const cardPct = item.sales > 0 ? Math.round((item.cardSales / item.sales) * 100) : 0;
                        
                        return (
                          <tr 
                            key={item.rawKey} 
                            onClick={() => handleItemClick(item)}
                            className="hover:bg-[var(--kravy-bg-2)]/30 transition cursor-pointer"
                          >
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">{item.label}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-extrabold text-[var(--kravy-text-primary)]">{item.count}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">{sym}{format(item.sales)}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-extrabold">
                              {momGrowth !== null ? (
                                momGrowth > 0 ? (
                                  <span className="text-emerald-500">▲ {Math.round(momGrowth)}%</span>
                                ) : momGrowth < 0 ? (
                                  <span className="text-rose-500">▼ {Math.round(Math.abs(momGrowth))}%</span>
                                ) : (
                                  <span className="text-[var(--kravy-text-muted)]">0%</span>
                                )
                              ) : (
                                <span className="text-[var(--kravy-text-muted)]">▲ n/a</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--kravy-text-secondary)]">{sym}{format(item.sales / item.count)}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--kravy-green)]">{sym}{format(item.collected)}</td>
                            <td className={`px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold ${item.outstanding > 0 ? "text-rose-500" : "text-[var(--kravy-text-muted)]"}`}>{sym}{format(item.outstanding)}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--kravy-text-secondary)]">{upiPct > 0 ? `${upiPct}%` : "—"}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--kravy-text-secondary)]">{cashPct > 0 ? `${cashPct}%` : "—"}</td>
                            <td className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-[var(--kravy-text-secondary)]">{cardPct > 0 ? `${cardPct}%` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            ) : (
              /* ── Aggregated Drilldown Rows (Bar View) ── */
              <div className="flex flex-col divide-y divide-[var(--kravy-border)]">
                {items.map((item: AggregatedItem) => {
                  const maxVal = Math.max(...items.map((i) => i.sales), 1);
                  const barPct = (item.sales / maxVal) * 100;
                  
                  return (
                    <div
                      key={item.rawKey}
                      onClick={() => handleItemClick(item)}
                      className="px-4 py-3.5 sm:px-6 sm:py-4 flex justify-between items-center cursor-pointer transition hover:bg-[var(--kravy-bg-2)]/30 group"
                    >
                      {/* Left: Label & Graph bar */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:gap-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate">
                            {item.label}
                          </span>
                          <span className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-2 py-0.5 rounded-md shrink-0">
                            {item.count} bills
                          </span>
                        </div>
                        {/* HSL progress bar represent sales weight */}
                        <div className="w-full max-w-[420px] h-1.5 bg-[var(--kravy-bg-2)] rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${barPct}%` }}
                            className="h-full bg-[var(--kravy-brand)] rounded-full transition-all duration-500 ease-out"
                          />
                        </div>
                      </div>

                      {/* Right: Net Sales Volume */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm sm:text-lg font-black text-[var(--kravy-text-primary)] tracking-tight">
                            {sym}{format(item.sales)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] font-bold">
                            avg {sym}{format(item.sales / item.count)}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-[var(--kravy-text-muted)] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination for bills */}
            {isBillsView && pagination.totalPages > 1 && (
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-[var(--kravy-border)] flex flex-wrap gap-2 justify-between items-center bg-[var(--kravy-bg-2)]">
                <span className="text-xs text-[var(--kravy-text-muted)] font-bold">
                  Showing Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => { kravy.click(); setPage((p) => Math.max(1, p - 1)); }}
                    className={`px-3 py-1.5 border border-[var(--kravy-border)] rounded-lg text-xs font-black bg-[var(--kravy-surface)] text-[var(--kravy-text-primary)] transition ${pagination.page === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--kravy-bg-2)]"}`}
                  >
                    Prev
                  </button>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => { kravy.click(); setPage((p) => Math.min(pagination.totalPages, p + 1)); }}
                    className={`px-3 py-1.5 border border-[var(--kravy-border)] rounded-lg text-xs font-black bg-[var(--kravy-surface)] text-[var(--kravy-text-primary)] transition ${pagination.page === pagination.totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--kravy-bg-2)]"}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Invoice Detail Inspection Modal ── */}
      {selectedBill && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4">
          {/* Overlay */}
          <div 
            onClick={() => setSelectedBill(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4 sm:gap-5">
            <div className="flex justify-between items-center border-b border-[var(--kravy-border)] pb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">AUDITED FINANCIAL ASSET</span>
                <span className="text-base sm:text-lg font-black text-[var(--kravy-brand)] font-mono">#{selectedBill.billNumber}</span>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="p-2 border border-[var(--kravy-border)] rounded-xl bg-[var(--kravy-bg-2)] hover:bg-[var(--kravy-border)] transition text-[var(--kravy-text-muted)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer info */}
            <div className="flex flex-col gap-2 p-3 sm:p-4 bg-[var(--kravy-bg-2)] rounded-xl border border-[var(--kravy-border)]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[var(--kravy-text-primary)]">
                <User size={14} className="text-indigo-500 shrink-0" />
                <span className="truncate">{selectedBill.customerName || "Walk-in Guest"}</span>
              </div>
              {selectedBill.customerPhone && (
                <div className="flex items-center gap-2 text-xs text-[var(--kravy-text-muted)] font-mono">
                  <Smartphone size={14} className="shrink-0" />
                  <span>{selectedBill.customerPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[var(--kravy-text-muted)]">
                <Clock size={14} className="shrink-0" />
                <span>Cleared on {new Date(selectedBill.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">Item List Breakdown</span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {(typeof selectedBill.items === "string" ? JSON.parse(selectedBill.items) : selectedBill.items)?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-[var(--kravy-border)]/50 last:border-b-0">
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="font-extrabold text-[var(--kravy-text-primary)]">{it.name}</span>
                      <span className="text-[var(--kravy-brand)] font-black ml-1.5">×{it.qty || it.quantity}</span>
                    </div>
                    <span className="font-black text-[var(--kravy-text-primary)] font-mono shrink-0">{sym}{format((it.qty || it.quantity) * (it.price || it.rate || 0))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger Audit */}
            <div className="flex flex-col gap-1.5 border-t border-[var(--kravy-border)] pt-3 text-xs sm:text-sm">
              <div className="flex text-[var(--kravy-text-muted)] justify-between">
                <span>Subtotal (Net Assets)</span>
                <span className="font-mono">{sym}{format(selectedBill.subtotal)}</span>
              </div>
              {selectedBill.discountAmount > 0 && (
                <div className="flex text-rose-500 justify-between font-bold">
                  <span>Discounts Applied</span>
                  <span className="font-mono">-{sym}{format(selectedBill.discountAmount)}</span>
                </div>
              )}
              {selectedBill.tax > 0 && (
                <div className="flex text-[var(--kravy-text-muted)] justify-between">
                  <span>Tax (CGST + SGST)</span>
                  <span className="font-mono">{sym}{format(selectedBill.tax)}</span>
                </div>
              )}
              <div className="flex text-sm sm:text-base font-black text-[var(--kravy-text-primary)] border-t border-dashed border-[var(--kravy-border)] pt-2 justify-between">
                <span>Net Total Settled</span>
                <span className="font-mono text-[var(--kravy-brand)]">{sym}{format(selectedBill.total)}</span>
              </div>
            </div>

            {/* Clearing info */}
            <div className="flex flex-wrap gap-2 justify-between items-center border-t border-[var(--kravy-border)] pt-3 text-xs">
              <span className="font-extrabold text-[var(--kravy-text-muted)]">Payment Method: <span className="text-[var(--kravy-text-primary)]">{(selectedBill.paymentMode || "").toUpperCase()}</span></span>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                ✓ {(selectedBill.paymentStatus || "").toUpperCase()}
              </span>
            </div>
            
            {/* Audit log trail */}
            {selectedBill.auditNote && (
              <div className="text-xs italic text-[var(--kravy-text-muted)] border-t border-[var(--kravy-border)] pt-2.5">
                <strong>Audit Trail Log:</strong> {selectedBill.auditNote}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

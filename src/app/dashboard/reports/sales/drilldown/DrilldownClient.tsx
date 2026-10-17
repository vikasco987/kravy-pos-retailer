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
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", padding: "20px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      
      {/* ── Header Row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/dashboard" style={{
            width: "48px", height: "48px", borderRadius: "16px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-text-primary)",
            boxShadow: "var(--kravy-shadow-sm)"
          }}>
            <ChevronLeft size={24} style={{ marginTop: "11px" }} />
          </Link>
          <div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.8px", lineHeight: 1, marginBottom: "6px" }}>
              Sales Analytics
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={14} style={{ color: "var(--kravy-brand)" }} /> Premium business drilldown dashboard
            </p>
          </div>
        </div>

        {/* Tab Selector & Reset */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {drilldownStack.length === 0 && (
            <div style={{ display: "flex", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "4px" }}>
              {(["year", "month", "week", "day"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { kravy.click(); setActiveTab(tab); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 850,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === tab ? "var(--kravy-brand)" : "transparent",
                    color: activeTab === tab ? "white" : "var(--kravy-text-muted)",
                    transition: "all 0.2s"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={() => { kravy.click(); setShowBalances(s => !s); }}
            style={{
              padding: "10px 18px",
              background: "var(--kravy-surface)",
              border: "1px solid var(--kravy-border)",
              borderRadius: "14px",
              color: "var(--kravy-text-primary)",
              fontWeight: 850,
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer"
            }}
          >
            {showBalances ? <EyeOff size={14} /> : <Eye size={14} />} {showBalances ? "Hide" : "Reveal"}
          </button>

          <button
            onClick={resetFilters}
            style={{
              padding: "10px 18px",
              background: "var(--kravy-surface)",
              border: "1px solid var(--kravy-border)",
              borderRadius: "14px",
              color: "var(--kravy-text-muted)",
              fontWeight: 800,
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={12} /> Reset
          </button>
          
          {items && items.length > 0 && (
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
          )}
        </div>
      </div>

      {/* ── Breadcrumbs ── */}
      <div style={{ 
        display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", 
        background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", 
        borderRadius: "14px", padding: "12px 20px", fontSize: "0.8rem", fontWeight: 800 
      }}>
        <button 
          onClick={() => handleBreadcrumbClick(-1)}
          style={{ border: "none", background: "none", cursor: "pointer", color: drilldownStack.length === 0 ? "var(--kravy-brand)" : "var(--kravy-text-muted)" }}
        >
          {activeTab.toUpperCase()}S
        </button>
        
        {drilldownStack.map((step, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={14} className="text-slate-400" />
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: idx === drilldownStack.length - 1 ? "var(--kravy-brand)" : "var(--kravy-text-muted)",
                fontWeight: 900
              }}
            >
              {step.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ 
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
        borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px",
        boxShadow: "var(--kravy-shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--kravy-border)", paddingBottom: "12px" }}>
          <Filter size={16} className="text-indigo-500" />
          <span style={{ fontSize: "0.85rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "1px", color: "var(--kravy-text-primary)" }}>Refinement Filters</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          {/* Custom Date Picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>DATE RANGE</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)" }}>to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
              />
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>PAYMENT MODE</span>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              style={{ padding: "9px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="WALLET">Wallet</option>
            </select>
          </div>

          {/* Order Type */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>ORDER TYPE</span>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              style={{ padding: "9px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
            >
              <option value="ALL">All Orders</option>
              <option value="Dine In">Dine In / POS</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Delivery">Delivery</option>
            </select>
          </div>

          {/* Bill Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>BILL STATUS</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: "9px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Settle/Paid</option>
              <option value="Pending">Pending/Partial</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* GST vs Non-GST */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>TAX CLASS</span>
            <select
              value={gstType}
              onChange={(e) => setGstType(e.target.value)}
              style={{ padding: "9px 12px", border: "1px solid var(--kravy-border)", borderRadius: "10px", fontSize: "0.75rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
            >
              <option value="ALL">All Bills</option>
              <option value="GST">GST Only</option>
              <option value="NON-GST">Non-GST Only</option>
            </select>
          </div>
        </div>

        {/* Global Search */}
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "14px", top: "13px", color: "var(--kravy-text-muted)" }} />
            <input
              type="text"
              placeholder="Search customer name, contact phone, or invoice identification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 40px", border: "1px solid var(--kravy-border)", borderRadius: "12px", fontSize: "0.8rem", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)" }}
            />
          </div>
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
              {/* ── KPI Matrix ── */}
              {summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                  <div style={{ background: "linear-gradient(135deg, #065F46 0%, #064E3B 100%)", borderRadius: "24px", padding: "24px", color: "white", boxShadow: "var(--kravy-shadow-md)", position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, opacity: 0.7, textTransform: "uppercase", letterSpacing: "1.5px" }}>Total Volume (Sales)</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: "8px" }}>{periodStr}</span>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 950, letterSpacing: "-1.5px", marginTop: "8px" }}>
                      {showBalances ? sym : ""}{mask(format(summary.totalSales))}
                    </div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.8, marginTop: "6px" }}>
                      Gross: {showBalances ? sym : ""}{mask(format(summary.grossSales))}
                    </div>
                  </div>
                  
                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "24px", boxShadow: "var(--kravy-shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Net Assets (Excl. Tax)</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 8px", borderRadius: "8px" }}>{periodStr}</span>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.5px", marginTop: "8px" }}>
                      {showBalances ? sym : ""}{mask(format(summary.netSales))}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px" }}>
                      GST Value: {showBalances ? sym : ""}{mask(format(summary.grossSales - summary.netSales))}
                    </div>
                  </div>

                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "24px", boxShadow: "var(--kravy-shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Invoice Clearing Count</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 8px", borderRadius: "8px" }}>{periodStr}</span>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.5px", marginTop: "8px" }}>
                      {mask(summary.totalBills)}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px" }}>
                      Cancelled: {mask(summary.cancelledBills)} ({showBalances ? sym : ""}{mask(format(summary.cancelledValue))})
                    </div>
                  </div>

                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "24px", boxShadow: "var(--kravy-shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Average Ticket Value</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 8px", borderRadius: "8px" }}>{periodStr}</span>
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.5px", marginTop: "8px" }}>
                      {showBalances ? sym : ""}{mask(format(summary.avgBill))}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px" }}>
                      Max Ticket: {showBalances ? sym : ""}{mask(format(summary.highestBill))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sub-matrix KPI details ── */}
              {summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "20px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Unique Customers</div>
                        <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 6px", borderRadius: "6px" }}>{periodStr}</span>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", marginTop: "4px" }}>
                        {mask(summary.uniqueCustomers)}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 850, color: "var(--kravy-brand)", background: "rgba(99,102,241,0.1)", padding: "6px 12px", borderRadius: "8px" }}>
                      {mask(summary.returningCustomers)} RETURNING ({summary.uniqueCustomers > 0 ? ((summary.returningCustomers / summary.uniqueCustomers) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>

                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "20px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Peak Hour Activity</div>
                        <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 6px", borderRadius: "6px" }}>{periodStr}</span>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", marginTop: "4px" }}>{getHourString(summary.peakSalesHour)}</div>
                    </div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 850, color: "var(--kravy-green)", background: "rgba(16,185,129,0.1)", padding: "6px 12px", borderRadius: "8px" }}>
                      MAX VOLUME HOUR
                    </div>
                  </div>

                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "20px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Lowest clearing bill</div>
                        <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "2px 6px", borderRadius: "6px" }}>{periodStr}</span>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", marginTop: "4px" }}>
                        {showBalances ? sym : ""}{mask(format(summary.lowestBill))}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 850, color: "var(--kravy-purple)", background: "rgba(139,92,246,0.1)", padding: "6px 12px", borderRadius: "8px" }}>
                      MIN VALUE
                    </div>
                  </div>
                </div>
              )}

              {/* ── Graphical Insights & Breakdown ── */}
              {summary && (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "28px" }} className="grid-cols-1 lg:grid-cols-2">
                  {/* Payment & Order Type Distribution */}
                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "var(--kravy-text-primary)" }}>Payment Mode & Order Source Breakdown</h3>
                    
                    {/* Payments */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>PAYMENT MODES VOLUME</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {Object.entries(summary.paymentBreakdown).map(([mode, sales]) => {
                          const pct = summary.totalSales > 0 ? (sales / summary.totalSales) * 100 : 0;
                          if (sales === 0) return null;
                          return (
                            <div key={mode} style={{ flex: 1, minWidth: "100px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", padding: "12px", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>{mode}</span>
                              <span style={{ fontSize: "1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                                {showBalances ? sym : ""}{mask(format(sales))}
                              </span>
                              <span style={{ fontSize: "0.65rem", fontWeight: 850, color: "var(--kravy-brand)" }}>{pct.toFixed(0)}% share</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Types */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>ORDER SOURCES VOLUME</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {Object.entries(summary.orderTypeBreakdown).map(([type, sales]) => {
                          const pct = summary.totalSales > 0 ? (sales / summary.totalSales) * 100 : 0;
                          if (sales === 0) return null;
                          return (
                            <div key={type} style={{ flex: 1, minWidth: "100px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", padding: "12px", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>{type}</span>
                              <span style={{ fontSize: "1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                                {showBalances ? sym : ""}{mask(format(sales))}
                              </span>
                              <span style={{ fontSize: "0.65rem", fontWeight: 850, color: "var(--kravy-purple)" }}>{pct.toFixed(0)}% share</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BI Operational Insights */}
                  <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "var(--kravy-text-primary)" }}>Smart Business Intelligence Insights</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ padding: "16px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "16px" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 950, color: "var(--kravy-brand)", textTransform: "uppercase" }}>Volume Yield Recommendation</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--kravy-text-primary)", fontWeight: 700, marginTop: "6px" }}>
                          Your average ticket is {sym}{format(summary.avgBill)}. Consider creating high-yield combo items valued around {sym}{format(summary.avgBill * 1.4)} to maximize order metrics.
                        </p>
                      </div>

                      <div style={{ padding: "16px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "16px" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 950, color: "var(--kravy-purple)", textTransform: "uppercase" }}>Peak Staffing Recommendation</span>
                        <p style={{ fontSize: "0.85rem", color: "var(--kravy-text-primary)", fontWeight: 700, marginTop: "6px" }}>
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
          <div style={{ 
            background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
            borderRadius: "32px", overflow: "hidden", boxShadow: "var(--kravy-shadow-md)" 
          }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--kravy-bg-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                  {isBillsView ? "Audited Bill Registry" : "Aggregated Sales Yield"}
                </h3>
                {!isBillsView && (
                  <div style={{ display: "flex", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "10px", padding: "2px" }}>
                    <button
                      onClick={() => setViewMode("table")}
                      style={{ padding: "4px 10px", fontSize: "0.68rem", fontWeight: 800, border: "none", borderRadius: "8px", background: viewMode === "table" ? "var(--kravy-brand)" : "transparent", color: viewMode === "table" ? "white" : "var(--kravy-text-muted)", cursor: "pointer" }}
                    >
                      Table View
                    </button>
                    <button
                      onClick={() => setViewMode("visual")}
                      style={{ padding: "4px 10px", fontSize: "0.68rem", fontWeight: 800, border: "none", borderRadius: "8px", background: viewMode === "visual" ? "var(--kravy-brand)" : "transparent", color: viewMode === "visual" ? "white" : "var(--kravy-text-muted)", cursor: "pointer" }}
                    >
                      Bar View
                    </button>
                  </div>
                )}
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", background: "var(--kravy-surface)", padding: "6px 14px", borderRadius: "10px", border: "1px solid var(--kravy-border)" }}>
                {items.length} records in view
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", color: "var(--kravy-text-muted)", fontSize: "0.85rem", fontWeight: 800 }}>
                No sales records found matching filter criteria.
              </div>
            ) : isBillsView ? (
              /* ── Bills Grid Table ── */
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderSpacing: 0, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--kravy-bg-2)" }}>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>S.No</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Invoice ID</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Customer Name</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Payment</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Mode</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Source</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)", textAlign: "right" }}>Value</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b: BillItemDetail, idx) => {
                      const actualIdx = (pagination.page - 1) * pagination.pageSize + idx + 1;
                      const isCancelled = (b.paymentStatus || "").toUpperCase() === "CANCELLED";
                      const isPending = (b.paymentStatus || "").toUpperCase() === "PENDING" || (b.paymentStatus || "").toUpperCase() === "HELD";
                      
                      return (
                        <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }} className="hover:bg-[var(--kravy-bg-2)]/30">
                          <td style={{ padding: "20px 24px", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>{String(actualIdx).padStart(2, "0")}</td>
                          <td style={{ padding: "20px 24px" }}>
                            <div style={{ fontWeight: 950, color: "var(--kravy-brand)", fontFamily: "monospace", fontSize: "0.95rem" }}>#{b.billNumber}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--kravy-text-muted)", marginTop: "2px" }}>
                              {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td style={{ padding: "20px 24px" }}>
                            <div style={{ fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.85rem" }}>{b.customerName || "Walk-in Guest"}</div>
                            <div style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--kravy-text-muted)", marginTop: "2px" }}>{b.customerPhone || "NO CONTACT"}</div>
                          </td>
                          <td style={{ padding: "20px 24px" }}>
                            <div style={{ 
                              display: "inline-flex", alignItems: "center", gap: "4px", 
                              color: isCancelled ? "#EF4444" : isPending ? "#F59E0B" : "#10B981", 
                              fontSize: "0.68rem", fontWeight: 900 
                            }}>
                              {isCancelled ? <X size={12} /> : isPending ? <Clock size={12} /> : <CheckCircle size={12} />}
                              {(b.paymentStatus || "").toUpperCase()}
                            </div>
                          </td>
                          <td style={{ padding: "20px 24px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 850, color: "var(--kravy-text-primary)" }}>{(b.paymentMode || "").toUpperCase()}</span>
                          </td>
                          <td style={{ padding: "20px 24px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 850, color: "var(--kravy-text-muted)" }}>{b.tableName}</span>
                          </td>
                          <td style={{ padding: "20px 24px", textAlign: "right" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>
                              {sym}{format(b.total)}
                            </div>
                            {(b.paymentStatus || "").toUpperCase() === "PARTIAL" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px", fontSize: "0.65rem", fontWeight: 800 }}>
                                <span style={{ color: "#10B981" }}>Paid: {sym}{format(b.amountPaid || 0)}</span>
                                <span style={{ color: "#EF4444" }}>Unpaid: {sym}{format(b.balanceDue || 0)}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "20px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
              /* ── Comparison Table View ── */
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderSpacing: 0, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--kravy-bg-2)" }}>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Period</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Bills</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Total Sales</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>MoM Growth</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Avg Bill</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Collected</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Outstanding</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>UPI %</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Cash %</th>
                      <th style={{ padding: "16px 24px", fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)" }}>Card %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => {
                      const momGrowth = item.growth;
                      const upiPct = item.sales > 0 ? Math.round((item.upiSales / item.sales) * 100) : 0;
                      const cashPct = item.sales > 0 ? Math.round((item.cashSales / item.sales) * 100) : 0;
                      const cardPct = item.sales > 0 ? Math.round((item.cardSales / item.sales) * 100) : 0;
                      
                      return (
                        <tr 
                          key={item.rawKey} 
                          onClick={() => handleItemClick(item)}
                          style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s", cursor: "pointer" }} 
                          className="hover:bg-[var(--kravy-bg-2)]/30"
                        >
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{item.label}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{item.count}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{sym}{format(item.sales)}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 850 }}>
                            {momGrowth !== null ? (
                              momGrowth > 0 ? (
                                <span style={{ color: "#10B981" }}>▲ {Math.round(momGrowth)}%</span>
                              ) : momGrowth < 0 ? (
                                <span style={{ color: "#EF4444" }}>▼ {Math.round(Math.abs(momGrowth))}%</span>
                              ) : (
                                <span style={{ color: "var(--kravy-text-muted)" }}>0%</span>
                              )
                            ) : (
                              <span style={{ color: "var(--kravy-text-muted)" }}>▲ n/a</span>
                            )}
                          </td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{sym}{format(item.sales / item.count)}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-green)" }}>{sym}{format(item.collected)}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: item.outstanding > 0 ? "#EF4444" : "var(--kravy-text-muted)" }}>{sym}{format(item.outstanding)}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{upiPct > 0 ? `${upiPct}%` : "—"}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{cashPct > 0 ? `${cashPct}%` : "—"}</td>
                          <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{cardPct > 0 ? `${cardPct}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── Aggregated Drilldown Rows (Bar View) ── */
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.map((item: AggregatedItem) => {
                  const maxVal = Math.max(...items.map((i) => i.sales), 1);
                  const barPct = (item.sales / maxVal) * 100;
                  
                  return (
                    <div
                      key={item.rawKey}
                      onClick={() => handleItemClick(item)}
                      style={{
                        padding: "20px 32px",
                        borderBottom: "1px solid var(--kravy-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        position: "relative"
                      }}
                      className="hover:bg-[var(--kravy-bg-2)]/30 group"
                    >
                      {/* Left: Label & Graph bar */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)", padding: "3px 8px", borderRadius: "6px" }}>
                            {item.count} bills
                          </span>
                        </div>
                        {/* HSL progress bar represent sales weight */}
                        <div style={{ width: "80%", height: "6px", background: "var(--kravy-bg-2)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ 
                            width: `${barPct}%`, 
                            height: "100%", 
                            background: "var(--kravy-brand)", 
                            borderRadius: "4px",
                            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} />
                        </div>
                      </div>

                      {/* Right: Net Sales Volume */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.3rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>
                            {sym}{format(item.sales)}
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "var(--kravy-text-muted)" }}>
                            avg {sym}{format(item.sales / item.count)}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination for bills */}
            {isBillsView && pagination.totalPages > 1 && (
              <div style={{ padding: "20px 32px", borderTop: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--kravy-bg-2)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontWeight: 700 }}>
                  Showing Page {pagination.page} of {pagination.totalPages}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => { kravy.click(); setPage((p) => Math.max(1, p - 1)); }}
                    style={{ padding: "6px 14px", border: "1px solid var(--kravy-border)", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, background: "var(--kravy-surface)", color: "var(--kravy-text-primary)", cursor: pagination.page === 1 ? "not-allowed" : "pointer", opacity: pagination.page === 1 ? 0.5 : 1 }}
                  >
                    Prev
                  </button>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => { kravy.click(); setPage((p) => Math.min(pagination.totalPages, p + 1)); }}
                    style={{ padding: "6px 14px", border: "1px solid var(--kravy-border)", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, background: "var(--kravy-surface)", color: "var(--kravy-text-primary)", cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer", opacity: pagination.page === pagination.totalPages ? 0.5 : 1 }}
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
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Overlay */}
          <div 
            onClick={() => setSelectedBill(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} 
          />
          
          {/* Modal Content */}
          <div style={{ 
            position: "relative", zIndex: 1, width: "100%", maxWidth: "460px", 
            background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
            borderRadius: "28px", padding: "28px", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "var(--kravy-shadow-xl)", display: "flex", flexDirection: "column", gap: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--kravy-border)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>AUDITED FINANCIAL ASSET</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 950, color: "var(--kravy-brand)", fontFamily: "monospace" }}>#{selectedBill.billNumber}</span>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                style={{ padding: "8px", border: "1px solid var(--kravy-border)", borderRadius: "10px", background: "var(--kravy-bg-2)", cursor: "pointer", color: "var(--kravy-text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", background: "var(--kravy-bg-2)", borderRadius: "16px", border: "1px solid var(--kravy-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>
                <User size={14} className="text-indigo-500" />
                <span>{selectedBill.customerName || "Walk-in Guest"}</span>
              </div>
              {selectedBill.customerPhone && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.8rem", color: "var(--kravy-text-muted)" }}>
                  <Smartphone size={14} />
                  <span>{selectedBill.customerPhone}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.8rem", color: "var(--kravy-text-muted)" }}>
                <Clock size={14} />
                <span>Cleared on {new Date(selectedBill.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Item List Breakdown</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", paddingRight: "6px" }}>
                {(typeof selectedBill.items === "string" ? JSON.parse(selectedBill.items) : selectedBill.items)?.map((it: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "4px 0" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-primary)" }}>{it.name}</span>
                      <span style={{ color: "var(--kravy-brand)", fontWeight: 900, marginLeft: "8px" }}>×{it.qty || it.quantity}</span>
                    </div>
                    <span style={{ fontWeight: 850, color: "var(--kravy-text-primary)", fontFamily: "monospace" }}>{sym}{format((it.qty || it.quantity) * (it.price || it.rate || 0))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Ledger Audit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--kravy-border)", paddingTop: "14px" }}>
              <div style={{ display: "flex", fontSize: "0.8rem", color: "var(--kravy-text-muted)", justifyContent: "space-between" }}>
                <span>Subtotal (Net Assets)</span>
                <span style={{ fontFamily: "monospace" }}>{sym}{format(selectedBill.subtotal)}</span>
              </div>
              {selectedBill.discountAmount > 0 && (
                <div style={{ display: "flex", fontSize: "0.8rem", color: "#EF4444", justifyContent: "space-between" }}>
                  <span>Discounts Applied</span>
                  <span style={{ fontFamily: "monospace" }}>-{sym}{format(selectedBill.discountAmount)}</span>
                </div>
              )}
              {selectedBill.tax > 0 && (
                <div style={{ display: "flex", fontSize: "0.8rem", color: "var(--kravy-text-muted)", justifyContent: "space-between" }}>
                  <span>Tax (CGST + SGST)</span>
                  <span style={{ fontFamily: "monospace" }}>{sym}{format(selectedBill.tax)}</span>
                </div>
              )}
              <div style={{ display: "flex", fontSize: "1.1rem", fontWeight: 950, color: "var(--kravy-text-primary)", borderTop: "1px dashed var(--kravy-border)", paddingTop: "8px", justifyContent: "space-between" }}>
                <span>Net Total Settled</span>
                <span style={{ fontFamily: "monospace", color: "var(--kravy-brand)" }}>{sym}{format(selectedBill.total)}</span>
              </div>
            </div>

            {/* Clearing info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--kravy-border)", paddingTop: "14px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Payment Method: <span style={{ color: "var(--kravy-text-primary)" }}>{(selectedBill.paymentMode || "").toUpperCase()}</span></span>
              <span style={{ fontSize: "0.7rem", fontWeight: 950, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: "8px" }}>
                ✓ {(selectedBill.paymentStatus || "").toUpperCase()}
              </span>
            </div>
            
            {/* Audit log trail */}
            {selectedBill.auditNote && (
              <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--kravy-text-muted)", borderTop: "1px solid var(--kravy-border)", paddingTop: "10px" }}>
                <strong>Audit Trail Log:</strong> {selectedBill.auditNote}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

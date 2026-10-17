"use client";
import { useCurrency } from '@/lib/currency-context';

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { useSearch } from "@/components/SearchContext";
import {
  Receipt, Plus, Trash2, Eye, EyeOff, Printer, MessageCircle, FileText, Smartphone,
  Play, MoreVertical, IndianRupee, Calendar, User, Phone, Copy,
  ChevronLeft, ChevronRight, ChevronDown, Settings2, Check, LayoutGrid, Filter, Search, Wallet, X, ZoomIn, ZoomOut, XCircle, CheckCircle, CreditCard, CheckCircle2, UtensilsCrossed, Banknote, Clock, History
} from "lucide-react";
import { WhatsAppBillButton } from "@/components/WhatsAppBillButton";
import { useAuthContext } from "@/components/AuthContext";
import { kravy } from "@/lib/sounds";
import { toast } from "react-hot-toast";
import BillHistoryTable from "./BillHistoryTable";

type BillManager = {
  id: string;
  billNumber: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMode: string;
  paymentStatus: string;
  customerName?: string | null;
  customerPhone?: string | null;
  isHeld?: boolean;
  pdfUrl?: string | null;
  items?: any;
  clerkUserId?: string | null;
  tableName?: string | null;
  isOrder?: boolean;
  orderStatus?: string;
  tokenNumber?: number | null;
  kotNumbers?: number[] | null;
  zoneName?: string | null;
};

// --- Sub-components (Screenshot UI Style) ---

const TypeBadge = ({ type }: { type: string }) => {
  const t = type?.toUpperCase() || "POS";
  let color = "#64748B";
  let bg = "rgba(100, 116, 139, 0.1)";
  let label = "Counter";

  if (t.includes("DELIVERY")) { color = "#3B82F6"; bg = "rgba(59, 130, 246, 0.1)"; label = "Delivery"; }
  else if (t.includes("TAKEAWAY")) { color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.1)"; label = "Takeaway"; }
  else if (t === "COUNTER" || t !== "POS") { color = "#10B981"; bg = "rgba(16, 185, 129, 0.1)"; label = "Dine-in"; }

  return (
    <span style={{ 
      padding: "5px 12px", 
      borderRadius: "999px", 
      fontSize: "0.7rem", 
      fontWeight: 800, 
      background: bg, 
      color: color,
      display: "inline-block",
      border: `1px solid ${color}20`
    }}>
      {label}
    </span>
  );
};

const StatusIndicator = ({ status, isHeld }: { status: string, isHeld?: boolean }) => {
  const s = status?.toLowerCase();
  
  if (isHeld) return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontSize: "0.65rem", fontWeight: 800 }}>
      <Clock size={12} /> HELD
    </div>
  );

  if (s === "pending") return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontSize: "0.65rem", fontWeight: 800 }}>
      <Clock size={12} /> PENDING
    </div>
  );

  if (s === "accepted" || s === "preparing" || s === "ready") return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#3b82f6", fontSize: "0.65rem", fontWeight: 800 }}>
      <UtensilsCrossed size={12} /> {s.toUpperCase()}
    </div>
  );

  if (s === "cancelled") return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", fontSize: "0.65rem", fontWeight: 800 }}>
      <XCircle size={12} /> CANCELLED
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "0.65rem", fontWeight: 800 }}>
      <CheckCircle2 size={12} /> SETTLED
    </div>
  );
};

const PaymentBadge = ({ mode }: { mode: string }) => {
  const m = mode?.toLowerCase();
  let icon = <Banknote size={10} />;
  let color = "#6B7280";
  let bg = "#F3F4F6";

  if (m === "upi") { icon = <Smartphone size={10} />; color = "#4F46E5"; bg = "#EEF2FF"; }
  if (m === "card") { icon = <CreditCard size={10} />; color = "#2563EB"; bg = "#EFF6FF"; }
  if (m === "wallet") { icon = <Wallet size={10} />; color = "#7C3AED"; bg = "#F5F3FF"; }
  if (m === "cash") { icon = <Banknote size={10} />; color = "#059669"; bg = "#ECFDF5"; }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 8px", borderRadius: "6px", background: bg, color: color,
      fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase"
    }}>
      {icon} {mode || "Cash"}
    </div>
  );
};

// Removed redundant components as they are now in BillHistoryTable.tsx

// Helper functions for deterministic IST date handling
function getTodayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function getYesterdayIst(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function getStartOfMonthIst(): string {
  const todayStr = getTodayIst();
  const [y, m] = todayStr.split("-");
  return `${y}-${m}-01`;
}

function getLast30DaysIst(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// --- Main Component ---

export default function BillingPage() {
  const { currencySymbol: sym } = useCurrency();
  const [bills, setBills] = useState<BillManager[]>([]);
  const [clerkId, setClerkId] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: authUser } = useAuthContext();
  const userRole = authUser?.type || null;
  const userPermissions = authUser?.permissions || [];
  const [apiPage, setApiPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [totalServerPages, setTotalServerPages] = useState(1);
  const { query } = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [showColPicker, setShowColPicker] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    sno: true, billInfo: true, items: true, source: true, customer: true, customerPhone: true,
    subtotal: true, gst: true, discount: true, total: true, timeline: true, payment: true, token: true
  });
  const [colFilters, setColFilters] = useState({
    billNumber: "", tableName: "", customerName: "", customerPhone: "", paymentStatus: "", paymentMode: "All Payments",
    orderType: "All Types", paymentModeFilter: "All Payments", statusFilter: "All Status"
  });
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const searchParams = useSearchParams();
  const asUserId = searchParams.get("asUserId");

  const [dateRange, setDateRange] = useState(() => {
    const today = getTodayIst();
    return { start: today, end: today };
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    fetchBills(false, 1, itemsPerPage, dateRange, "", colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
    fetchProfile();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kravy_show_stats_cards");
      if (saved !== null) {
        setShowStats(saved === "true");
      }
    }
  }, []);

  // Debounced server search when typing in the billing search box
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setApiPage(1);
      fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Synchronize global navbar search if used
  useEffect(() => {
    if (query !== undefined && !isFirstRender.current) {
      setApiPage(1);
      fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
    }
  }, [query]);

  const toggleStats = () => {
    const next = !showStats;
    setShowStats(next);
    localStorage.setItem("kravy_show_stats_cards", String(next));
  };

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) setBusiness(await res.json());
    } catch (e) {}
  }

  async function fetchBills(
    silent = false,
    targetPage = apiPage,
    limit = itemsPerPage,
    customRange = dateRange,
    searchQuery = searchTerm,
    orderType = colFilters.orderType,
    paymentMode = colFilters.paymentModeFilter,
    status = colFilters.statusFilter
  ) {
    try {
      if (!silent) setLoading(true);
      setError("");

      const queryParams = new URLSearchParams();
      if (asUserId) queryParams.append("asUserId", asUserId);
      if (customRange.start) queryParams.append("startDate", customRange.start);
      if (customRange.end) queryParams.append("endDate", customRange.end);
      queryParams.append("page", targetPage.toString());
      queryParams.append("limit", limit.toString());

      const activeSearch = (searchQuery || "").trim() || (query || "").trim();
      if (activeSearch) queryParams.append("search", activeSearch);

      if (orderType && orderType !== "All Types") queryParams.append("orderType", orderType);
      if (paymentMode && paymentMode !== "All Payments" && paymentMode !== "All Modes") queryParams.append("paymentMode", paymentMode);
      if (status && status !== "All Status") queryParams.append("status", status);

      const querySuffix = `?${queryParams.toString()}`;

      // Only fetch active orders on page 1
      const fetchOrders = targetPage === 1;
      const [billsRes, ordersRes, profileRes] = await Promise.all([
        fetch(`/api/bill-manager${querySuffix}`, { cache: "no-store" }),
        fetchOrders ? fetch(`/api/orders${querySuffix}&summary=true`, { cache: "no-store" }) : Promise.resolve(new Response("[]")),
        fetch(`/api/profile${asUserId ? `?asUserId=${asUserId}` : ""}`, { cache: "no-store" })
      ]);

      const prof = profileRes.ok ? await profileRes.json() : business;
      if (prof) setBusiness(prof);

      if (!billsRes.ok) throw new Error("Failed");
      const bData = await billsRes.json();
      if (bData.totalRecords !== undefined) {
        setTotalServerRecords(bData.totalRecords);
      }
      if (bData.totalPages !== undefined) {
        setTotalServerPages(bData.totalPages);
      }
      let combined: BillManager[] = (bData.bills ?? []).map((b: any) => ({ ...b, isOrder: false }));

      if (fetchOrders && ordersRes.ok) {
        try {
          const oData = await ordersRes.json();
          if (Array.isArray(oData)) {
            const globalRate = 0;
            const taxActive = prof?.taxEnabled ?? true;

            const activeOrders = oData.filter((o: any) => o.status !== "COMPLETED" && !o.isDeleted).map((o: any) => {
              const items = Array.isArray(o.items) ? o.items : [];
              let calcTax = 0;
              let calcSubtotal = 0;

              items.forEach((it: any) => {
                const q = Number(it.quantity || it.qty || 0);
                const p = Number(it.price || it.rate || 0);
                const lineTotal = q * p;
                const rate = it.gst ?? (taxActive ? globalRate : 0);
                
                if (it.taxStatus === "With Tax") {
                  const taxable = lineTotal / (1 + rate / 100);
                  calcTax += (lineTotal - taxable);
                  calcSubtotal += taxable;
                } else {
                  calcTax += (lineTotal * rate / 100);
                  calcSubtotal += lineTotal;
                }
              });

              return {
                id: o.id, 
                billNumber: `ORD-${o.id.slice(-4).toUpperCase()}`, 
                createdAt: o.createdAt,
                total: o.total, 
                subtotal: calcSubtotal,
                tax: calcTax,
                paymentMode: "Pending", 
                paymentStatus: o.status === "DELETED" ? "DELETED" : o.status === "CANCELLED" ? "CANCELLED" : "Pending", 
                customerName: o.customerName || "Walk-in",
                customerPhone: o.customerPhone, 
                isHeld: false, 
                tableName: o.table?.name || "Counter",
                isOrder: true, 
                orderStatus: o.status,
                auditNote: o.notes,
                items: o.items, 
                tokenNumber: o.tokenNumber,
                kotNumbers: o.kotNumbers
              };
            });

            const filteredOrders = activeSearch ? activeOrders.filter((o: any) => 
              (o.billNumber?.toLowerCase() || "").includes(activeSearch.toLowerCase()) ||
              (o.customerName?.toLowerCase() || "").includes(activeSearch.toLowerCase()) ||
              (o.customerPhone || "").includes(activeSearch) ||
              (o.tableName?.toLowerCase() || "").includes(activeSearch.toLowerCase())
            ) : activeOrders;

            combined = [...combined, ...filteredOrders];
          }
        } catch (e) {}
      }

      combined.sort((a, b) => {
        const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        if (b.id && a.id) return b.id.localeCompare(a.id);
        return 0;
      });

      setBills(combined);
      setApiPage(targetPage);
      if (bData.clerkUserId) setClerkId(bData.clerkUserId);
    } catch (err) {
      setError("Failed to load records");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const isFilterActive = !!(
    searchTerm.trim() ||
    query ||
    colFilters.orderType !== "All Types" ||
    (colFilters.paymentModeFilter !== "All Payments" && colFilters.paymentModeFilter !== "All Modes") ||
    colFilters.statusFilter !== "All Status" ||
    dateRange.start !== getTodayIst() ||
    dateRange.end !== getTodayIst()
  );

  const clearFilters = () => {
    const today = getTodayIst();
    const defaultRange = { start: today, end: today };
    setDateRange(defaultRange);
    setSearchTerm("");
    setColFilters({
      billNumber: "", tableName: "", customerName: "", customerPhone: "", paymentStatus: "", paymentMode: "All Payments",
      orderType: "All Types", paymentModeFilter: "All Payments", statusFilter: "All Status"
    });
    setApiPage(1);
    fetchBills(false, 1, itemsPerPage, defaultRange, "", "All Types", "All Payments", "All Status");
  };

  const handleApplyFilters = () => {
    setApiPage(1);
    fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
  };

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  // Stats for currently loaded records
  const totalRevenue = bills.filter(b => !b.isOrder && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const paidBillsCount = bills.filter(b => !b.isOrder && b.paymentStatus?.toLowerCase() === "paid").length;
  const pendingBillsCount = bills.filter(b => b.paymentStatus?.toLowerCase() === "pending" || b.isHeld).length;
  const cancelledBillsCount = bills.filter(b => b.paymentStatus?.toLowerCase() === "cancelled").length;
  
  const cashRevenue = bills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "cash" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const upiRevenue = bills.filter(b => !b.isOrder && (b.paymentMode?.toLowerCase() === "upi" || b.paymentMode?.toLowerCase() === "phonepe" || b.paymentMode?.toLowerCase() === "gpay") && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const cardRevenue = bills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "card" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const walletRevenue = bills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "wallet" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);

  const counterCount = bills.filter(b => (b.tableName || "POS") === "POS").length;
  const takeawayCount = bills.filter(b => (b.tableName || "").includes("TAKEAWAY")).length;
  const dineInCount = bills.filter(b => (b.tableName || "").startsWith("Table")).length;
  const activeOrderCount = bills.filter(b => b.isOrder).length;

  return (
    <div className="flex flex-col gap-6 kravy-page-fade pb-28 md:pb-24 lg:pb-16">
      
      {/* --- Page Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 flex-wrap">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ width: "4px", height: "24px", background: "#8B5CF6", borderRadius: "10px" }} />
            <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-black text-[var(--kravy-text-primary)] tracking-tight">Bill Manager</h1>
          </div>
          <p className="text-xs sm:text-[0.78rem] text-[var(--kravy-text-muted)] ml-3.5 font-semibold">
            {isFilterActive ? `Showing ${bills.length} of ${totalServerRecords} records` : `All transactions · ${totalServerRecords} total records`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2 lg:gap-2.5 flex-wrap">
          {(userRole === "ADMIN" || userRole === "MASTER") && (
            <HeaderBtn 
              icon={<Copy size={15} />} 
              label="API JSON" 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({
                  endpoints: ["/api/bill-manager", "/api/orders"],
                  totalRecords: totalServerRecords,
                  data: bills
                }, null, 2));
                toast.success("API Data Copied!");
              }} 
            />
          )}
          <HeaderBtn 
            icon={showStats ? <EyeOff size={15} /> : <Eye size={15} />} 
            label={showStats ? "Hide Stats" : "Show Stats"} 
            onClick={toggleStats} 
          />
          <HeaderBtn icon={<Settings2 size={15} />} label="Columns" onClick={() => setShowColPicker(!showColPicker)} />
          <HeaderBtn icon={<FileText size={15} />} label="Export Excel" color="#10B981" onClick={() => {
             if (!dateRange.start || !dateRange.end) {
               toast.error("Please select a date range first");
               return;
             }
             const exportUrl = `/api/bill-manager/export?startDate=${dateRange.start}&endDate=${dateRange.end}`;
             window.location.href = exportUrl;
             toast.success("Download started!");
          }} />

          <Link href="/dashboard/billing/history">
            <HeaderBtn icon={<History size={15} />} label="Edit History" color="#6366F1" />
          </Link>

          <Link href="/dashboard/billing/deleted"><HeaderBtn icon={<Trash2 size={15} />} label="Deleted Bills" /></Link>
          <Link href="/dashboard/billing/checkout" className="shrink-0">
            <button className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-3 md:py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 rounded-xl md:rounded-2xl border-none bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs md:text-[13px] xl:text-sm font-extrabold cursor-pointer shadow-md shadow-indigo-500/25 transition-all whitespace-nowrap">
              <Plus size={16} /> New Order
            </button>
          </Link>
        </div>
      </div>

      {/* --- Grouped Stats Row --- */}
      <motion.div
        initial={false}
        animate={showStats ? { height: "auto", opacity: 1, scale: 1, marginBottom: 0 } : { height: 0, opacity: 0, scale: 0.95, marginBottom: -24 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: "hidden" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", paddingBottom: "4px" }}>
          
          {/* Revenue Card - Sleek & Modern */}
          <div style={{ background: "white", borderRadius: "24px", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #F1F5F9", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                   <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94A3B8", letterSpacing: "1px", marginBottom: "8px" }}>TOTAL REVENUE (PAGE)</div>
                   <div style={{ fontSize: "2.25rem", fontWeight: 1000, color: "#1E293B", letterSpacing: "-1px" }}>{sym}{format(totalRevenue)}</div>
                </div>
                <div style={{ width: "48px", height: "48px", background: "#F0F9FF", color: "#0369A1", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}><IndianRupee size={22} /></div>
             </div>
             <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94A3B8" }}>ACTIVE ORDERS</span>
                   <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#EF4444" }}>{activeOrderCount}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94A3B8" }}>MATCHING BILLS</span>
                   <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#6366F1" }}>{totalServerRecords}</span>
                </div>
             </div>
          </div>

          {/* Bill Summary Card */}
          <GroupedCard title="BILL STATUS" icon={<Receipt size={18} color="#6366F1" />} accent="#6366F1">
             <StatItem label="Paid" value={paidBillsCount} dot="#10B981" />
             <StatItem label="Pending" value={pendingBillsCount} dot="#F59E0B" />
             <StatItem label="Cancelled" value={cancelledBillsCount} dot="#EF4444" />
          </GroupedCard>

          {/* Payment Summary Card */}
          <GroupedCard title="PAYMENT MODES" icon={<CreditCard size={18} color="#8B5CF6" />} accent="#8B5CF6">
             <StatItem label="Cash" value={`${format(cashRevenue)}`} dot="#059669" />
             <StatItem label="UPI" value={`${format(upiRevenue)}`} dot="#4F46E5" />
             <StatItem label="Wallet" value={`${format(walletRevenue)}`} dot="#7C3AED" />
          </GroupedCard>

          {/* Order Nature Card */}
          <GroupedCard title="ORDER NATURE" icon={<UtensilsCrossed size={18} color="#F59E0B" />} accent="#F59E0B">
             <StatItem label="Dine-in" value={dineInCount} dot="#10B981" />
             <StatItem label="Takeaway" value={takeawayCount} dot="#F59E0B" />
             <StatItem label="Counter" value={counterCount} dot="#6366F1" />
          </GroupedCard>

        </div>
      </motion.div>

      {/* --- Filter Section --- */}
      <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-full relative">
        <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
          <div className="flex-1 min-w-[240px] sm:min-w-[280px] relative">
             <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
             <input 
               type="text" 
               placeholder="Search Bill No, Phone or Name..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === "Enter") {
                   e.preventDefault();
                   handleApplyFilters();
                 }
               }}
               className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
             />
             {searchTerm && (
               <button
                 type="button"
                 onClick={() => {
                   setSearchTerm("");
                   setApiPage(1);
                   fetchBills(false, 1, itemsPerPage, dateRange, "", colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
                 }}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
               >
                 <X size={15} />
               </button>
             )}
          </div>
          
          {/* Order Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTypeDropdownOpen(!isTypeDropdownOpen);
                setIsPaymentDropdownOpen(false);
                setShowColPicker(false);
              }}
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold min-w-[120px] sm:min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm"
            >
              <span>{colFilters.orderType}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isTypeDropdownOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setIsTypeDropdownOpen(false)} />
                <div className="absolute left-0 top-[calc(100%+6px)] w-40 sm:w-44 max-w-[calc(100vw-40px)] bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-2xl z-[1001] max-h-[240px] overflow-y-auto">
                  {["All Types", "Counter", "Takeaway", "Dine-in"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setColFilters({ ...colFilters, orderType: type });
                        setIsTypeDropdownOpen(false);
                        setApiPage(1);
                        fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, type, colFilters.paymentModeFilter, colFilters.statusFilter);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                        colFilters.orderType === type
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Payment Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsPaymentDropdownOpen(!isPaymentDropdownOpen);
                setIsTypeDropdownOpen(false);
                setShowColPicker(false);
              }}
              className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold min-w-[120px] sm:min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm"
            >
              <span>{colFilters.paymentModeFilter || colFilters.paymentMode || "All Payments"}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isPaymentDropdownOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setIsPaymentDropdownOpen(false)} />
                <div className="absolute left-0 top-[calc(100%+6px)] w-40 sm:w-44 max-w-[calc(100vw-40px)] bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-2xl z-[1001] max-h-[240px] overflow-y-auto">
                  {["All Payments", "Cash", "UPI", "Card", "Wallet"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setColFilters({ ...colFilters, paymentMode: mode, paymentModeFilter: mode });
                        setIsPaymentDropdownOpen(false);
                        setApiPage(1);
                        fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, colFilters.orderType, mode, colFilters.statusFilter);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                        (colFilters.paymentModeFilter === mode || colFilters.paymentMode === mode)
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Settings2 size={16} /> Columns
            </button>
            {showColPicker && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setShowColPicker(false)} />
                <div className="absolute left-0 top-[calc(100%+8px)] w-[260px] sm:w-[280px] max-w-[calc(100vw-40px)] bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-2xl z-[1001] max-h-[260px] sm:max-h-[320px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(visibleCols).map((key) => (
                      <label key={key} className={`flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold cursor-pointer p-1.5 rounded-lg transition-colors select-none ${visibleCols[key as keyof typeof visibleCols] ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}>
                        <input 
                          type="checkbox" 
                          checked={visibleCols[key as keyof typeof visibleCols]} 
                          onChange={() => setVisibleCols({...visibleCols, [key]: !visibleCols[key as keyof typeof visibleCols]})}
                          className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                        />
                        <span className="truncate">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={handleApplyFilters}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-none bg-slate-900 dark:bg-indigo-600 text-white text-xs sm:text-sm font-bold cursor-pointer hover:bg-slate-800 dark:hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            <Filter size={15} />
            <span>Filter Results</span>
          </button>
        </div>

        {/* Date Range Selector & Presets */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-3 sm:px-4 py-2 rounded-2xl w-fit max-w-full border border-indigo-100 dark:border-indigo-800/30">
           <Calendar size={16} className="text-indigo-500 shrink-0" />
           <input 
             type="date" 
             value={dateRange.start} 
             onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
             className="border-none bg-transparent font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none shrink-0" 
           />
           <span className="font-bold text-indigo-500 text-xs sm:text-sm">to</span>
           <input 
             type="date" 
             value={dateRange.end} 
             onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
             className="border-none bg-transparent font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none shrink-0" 
           />
           <button 
             onClick={() => { setApiPage(1); fetchBills(false, 1, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter); }}
             className="px-3 py-1.5 rounded-xl border-none bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-95 text-white text-xs font-black cursor-pointer transition-all shadow-sm shrink-0"
           >
             Apply
           </button>

           <div className="w-[1px] h-4 bg-indigo-200 dark:bg-indigo-700 mx-1 hidden sm:block shrink-0" />

           {/* Quick Date Presets */}
           <div className="flex items-center gap-1.5 flex-wrap">
             <button
               type="button"
               onClick={() => {
                 const today = getTodayIst();
                 const range = { start: today, end: today };
                 setDateRange(range);
                 setApiPage(1);
                 fetchBills(false, 1, itemsPerPage, range, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
               }}
               className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
             >
               Today
             </button>
             <button
               type="button"
               onClick={() => {
                 const yest = getYesterdayIst();
                 const range = { start: yest, end: yest };
                 setDateRange(range);
                 setApiPage(1);
                 fetchBills(false, 1, itemsPerPage, range, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
               }}
               className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
             >
               Yesterday
             </button>
             <button
               type="button"
               onClick={() => {
                 const start = getStartOfMonthIst();
                 const end = getTodayIst();
                 const range = { start, end };
                 setDateRange(range);
                 setApiPage(1);
                 fetchBills(false, 1, itemsPerPage, range, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
               }}
               className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
             >
               This Month
             </button>
             <button
               type="button"
               onClick={() => {
                 const start = getLast30DaysIst();
                 const end = getTodayIst();
                 const range = { start, end };
                 setDateRange(range);
                 setApiPage(1);
                 fetchBills(false, 1, itemsPerPage, range, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
               }}
               className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
             >
               Last 30 Days
             </button>
             <button
               type="button"
               onClick={() => {
                 const range = { start: "", end: "" };
                 setDateRange(range);
                 setApiPage(1);
                 fetchBills(false, 1, itemsPerPage, range, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
               }}
               className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
             >
               All Time
             </button>
           </div>
        </div>
      </div>

      {/* --- Desktop Table & Empty State --- */}
      {loading ? (
        <div style={{ height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "white", borderRadius: "24px", border: "1px solid #F1F5F9", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
           <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 mb-4"></div>
           <span className="font-bold text-slate-500 text-sm tracking-wide">Fetching & Applying Filters...</span>
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 mb-4">
            <Receipt size={32} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-1">No Bills Found</h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 max-w-sm mb-5">
            {searchTerm || dateRange.start || dateRange.end 
              ? "No bills matched your search query or selected date filter. Try clearing filters or selecting another date."
              : "No bills recorded yet."}
          </p>
          <button 
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-extrabold cursor-pointer hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <BillHistoryTable 
          bills={bills} 
          business={business} 
          userRole={userRole} 
          userPermissions={userPermissions} 
          refresh={() => fetchBills(false, apiPage, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter)}
          currentPage={apiPage}
          itemsPerPage={itemsPerPage}
          visibleCols={visibleCols}
        />
      )}

      {/* --- Server-Side Pagination --- */}
      {!loading && totalServerRecords > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          
          {/* Rows per page & Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rows per page:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setItemsPerPage(newLimit);
                setApiPage(1);
                fetchBills(false, 1, newLimit, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Showing <span className="font-bold text-slate-700 dark:text-slate-300">{(apiPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(apiPage * itemsPerPage, totalServerRecords)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{totalServerRecords}</span> bills
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const prev = Math.max(1, apiPage - 1);
                setApiPage(prev);
                fetchBills(false, prev, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
              }} 
              disabled={apiPage <= 1} 
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                apiPage <= 1
                  ? "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 cursor-pointer shadow-xs"
              }`}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-black select-none">
              Page {apiPage} of {totalServerPages}
            </div>

            <button 
              onClick={() => {
                const next = Math.min(totalServerPages, apiPage + 1);
                setApiPage(next);
                fetchBills(false, next, itemsPerPage, dateRange, searchTerm, colFilters.orderType, colFilters.paymentModeFilter, colFilters.statusFilter);
              }} 
              disabled={apiPage >= totalServerPages} 
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all ${
                apiPage >= totalServerPages
                  ? "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 cursor-pointer shadow-xs"
              }`}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

// --- Helpers ---
const GroupedCard = ({ title, icon, children, accent }: any) => (
  <div style={{ background: "white", borderRadius: "24px", padding: "24px", border: "1px solid #F1F5F9", boxShadow: "0 10px 30px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: "20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "32px", height: "32px", background: `${accent}08`, color: accent, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94A3B8", letterSpacing: "1px" }}>{title}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {children}
    </div>
  </div>
);

const StatItem = ({ label, value, dot }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot }} />
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748B" }}>{label}</span>
    </div>
    <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1E293B" }}>{value}</span>
  </div>
);

const HeaderBtn = ({ icon, label, onClick, color = "#6B7280" }: any) => (
  <button 
    onClick={onClick} 
    className="flex items-center gap-1.5 md:gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-3 md:py-2 lg:px-3.5 lg:py-2.5 xl:px-4 xl:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs md:text-[13px] xl:text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0"
    style={{ color }}
  >
    <span className="shrink-0">{icon}</span>
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div style={{ background: "white", borderRadius: "24px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", border: "1px solid #F3F4F6", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: `${color}08`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
    <div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#9CA3AF", fontWeight: 800 }}>{label}</div>
    </div>
  </div>
);

const Th = ({ label, isRight, color = "#9CA3AF", hasFilter, onFilter, width, minWidth }: any) => (
  <th style={{ padding: "16px 20px", textAlign: isRight ? "right" : "left", fontSize: "0.7rem", fontWeight: 900, color: color, letterSpacing: "1px", width, minWidth }}>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: isRight ? "flex-end" : "flex-start" }}>
      {label} {hasFilter && <Filter size={10} style={{ cursor: "pointer" }} onClick={onFilter} />}
    </div>
  </th>
);
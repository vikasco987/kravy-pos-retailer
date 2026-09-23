"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { useSearch } from "@/components/SearchContext";
import {
  Receipt, Plus, Trash2, Eye, EyeOff, Printer, MessageCircle, FileText, Smartphone,
  Play, MoreVertical, IndianRupee, Calendar, User, Phone,
  ChevronLeft, ChevronRight, Settings2, Check, LayoutGrid, Filter, Search, Wallet, X, ZoomIn, ZoomOut, XCircle, CheckCircle, CreditCard, CheckCircle2, UtensilsCrossed, Banknote, Clock
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

// --- Main Component ---

export default function BillingPage() {
  const [bills, setBills] = useState<BillManager[]>([]);
  const [clerkId, setClerkId] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: authUser } = useAuthContext();
  const userRole = authUser?.type || null;
  const userPermissions = authUser?.permissions || [];
  const [currentPage, setCurrentPage] = useState(1);
  const [apiPage, setApiPage] = useState(1);
  const itemsPerPage = 10;
  const { query } = useSearch();
  const [showColPicker, setShowColPicker] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    sno: true, billInfo: true, items: true, source: true, customer: false, customerPhone: false,
    subtotal: false, gst: false, discount: false, total: true, timeline: true, payment: true, token: true
  });
  const [colFilters, setColFilters] = useState({
    billNumber: "", tableName: "", customerName: "", customerPhone: "", paymentStatus: "", paymentMode: "",
    orderType: "All Types", paymentModeFilter: "All Payments", statusFilter: "All Status"
  });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const asUserId = searchParams.get("asUserId");

  const [dateRange, setDateRange] = useState(() => {
    const d = new Date();
    const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return { start: today, end: today };
  });

  useEffect(() => {
    fetchBills();
    fetchProfile();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kravy_show_stats_cards");
      if (saved !== null) {
        setShowStats(saved === "true");
      }
    }
  }, []);

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

  async function fetchBills(silent = false, targetPage = apiPage) {
    try {
      if (!silent) setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (asUserId) queryParams.append("asUserId", asUserId);
      if (dateRange.start) queryParams.append("startDate", dateRange.start);
      if (dateRange.end) queryParams.append("endDate", dateRange.end);
      queryParams.append("page", targetPage.toString());
      
      const querySuffix = `?${queryParams.toString()}`;

      const [billsRes, ordersRes, profileRes] = await Promise.all([
        fetch(`/api/bill-manager${querySuffix}`, { cache: "no-store" }),
        fetch(`/api/orders${querySuffix}`, { cache: "no-store" }),
        fetch(`/api/profile${asUserId ? `?asUserId=${asUserId}` : ""}`, { cache: "no-store" })
      ]);
      
      const prof = profileRes.ok ? await profileRes.json() : business;
      if (prof) setBusiness(prof);

      if (!billsRes.ok) throw new Error("Failed");
      const bData = await billsRes.json();
      let combined: BillManager[] = (bData.bills ?? []).map((b: any) => ({ ...b, isOrder: false }));
      
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        const globalRate = prof?.taxRate ?? 5;
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
        combined = [...combined, ...activeOrders];
      }
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBills(combined);
      if (bData.clerkUserId) setClerkId(bData.clerkUserId);
    } catch (err) { setError("Failed to load records"); } finally { if (!silent) setLoading(false); }
  }

  const isFilterActive = !!(query || colFilters.billNumber || colFilters.tableName || colFilters.customerName || colFilters.customerPhone || colFilters.paymentStatus || colFilters.paymentMode);
  const clearFilters = () => setColFilters({ billNumber: "", tableName: "", customerName: "", customerPhone: "", paymentStatus: "", paymentMode: "" });

  const filteredBills = bills.filter(b => {
    const mGlobal = !query || (
      (b.billNumber?.toLowerCase() || "").includes(query.toLowerCase()) ||
      (b.customerName?.toLowerCase() || "").includes(query.toLowerCase()) ||
      (b.customerPhone || "").includes(query) ||
      (b.tableName?.toLowerCase() || "").includes(query.toLowerCase())
    );

    // Dropdown filters
    const matchesType = colFilters.orderType === "All Types" || 
      (colFilters.orderType === "Counter" && (b.tableName || "POS") === "POS") ||
      (colFilters.orderType === "Takeaway" && (b.tableName || "").includes("TAKEAWAY")) ||
      (colFilters.orderType === "Dine-in" && (b.tableName || "").startsWith("Table"));

    const matchesPayment = colFilters.paymentModeFilter === "All Payments" || 
      (b.paymentMode?.toLowerCase() === colFilters.paymentModeFilter.toLowerCase());

    const matchesStatus = colFilters.statusFilter === "All Status" || 
      (b.paymentStatus?.toLowerCase() === colFilters.statusFilter.toLowerCase()) ||
      (colFilters.statusFilter === "Pending" && b.isHeld);

    // Date range filter
    const bDt = new Date(b.createdAt);
    const bDate = new Date(bDt.getTime() - bDt.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const matchesDate = (!dateRange.start || bDate >= dateRange.start) && (!dateRange.end || bDate <= dateRange.end);

    return mGlobal && matchesType && matchesPayment && matchesStatus && matchesDate;
  });

  const paginatedBills = filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  // Stats should reflect filtered data
  const totalRevenue = filteredBills.filter(b => !b.isOrder && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const paidBillsCount = filteredBills.filter(b => !b.isOrder && b.paymentStatus?.toLowerCase() === "paid").length;
  const pendingBillsCount = filteredBills.filter(b => b.paymentStatus?.toLowerCase() === "pending" || b.isHeld).length;
  const cancelledBillsCount = filteredBills.filter(b => b.paymentStatus?.toLowerCase() === "cancelled").length;
  
  const cashRevenue = filteredBills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "cash" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const upiRevenue = filteredBills.filter(b => !b.isOrder && (b.paymentMode?.toLowerCase() === "upi" || b.paymentMode?.toLowerCase() === "phonepe" || b.paymentMode?.toLowerCase() === "gpay") && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const cardRevenue = filteredBills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "card" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);
  const walletRevenue = filteredBills.filter(b => !b.isOrder && b.paymentMode?.toLowerCase() === "wallet" && b.paymentStatus?.toLowerCase() === "paid").reduce((s, b) => s + b.total, 0);

  const counterCount = filteredBills.filter(b => (b.tableName || "POS") === "POS").length;
  const takeawayCount = filteredBills.filter(b => (b.tableName || "").includes("TAKEAWAY")).length;
  const dineInCount = filteredBills.filter(b => (b.tableName || "").startsWith("Table")).length;
  const activeOrderCount = filteredBills.filter(b => b.isOrder).length;

  const handlePrint = (bill: any) => { /* logic */ };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="kravy-page-fade">
      
      {/* --- Page Header --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ width: "4px", height: "24px", background: "#8B5CF6", borderRadius: "10px" }} />
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>Bill Manager</h1>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--kravy-text-muted)", marginLeft: "14px", fontWeight: 600 }}>
            {isFilterActive ? `Showing ${filteredBills.length} records` : `All transactions · ${bills.length} total records`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <HeaderBtn 
            icon={showStats ? <EyeOff size={16} /> : <Eye size={16} />} 
            label={showStats ? "Hide Stats" : "Show Stats"} 
            onClick={toggleStats} 
          />
          <HeaderBtn icon={<Settings2 size={16} />} label="Columns" onClick={() => setShowColPicker(!showColPicker)} />
          <HeaderBtn icon={<FileText size={16} />} label="Export Excel" color="#10B981" onClick={() => {
             if (!dateRange.start || !dateRange.end) {
               toast.error("Please select a date range first");
               return;
             }
             const exportUrl = `/api/bill-manager/export?startDate=${dateRange.start}&endDate=${dateRange.end}`;
             window.location.href = exportUrl;
             toast.success("Download started!");
          }} />

          <Link href="/dashboard/billing/deleted"><HeaderBtn icon={<Trash2 size={16} />} label="Deleted Bills" /></Link>
          <Link href="/dashboard/billing/checkout">
            <button style={{ padding: "12px 24px", borderRadius: "16px", border: "none", background: "#8B5CF6", color: "white", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 10px 25px rgba(139, 92, 246, 0.3)" }}>
              <Plus size={18} /> New Order
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
                   <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94A3B8", letterSpacing: "1px", marginBottom: "8px" }}>TOTAL REVENUE</div>
                   <div style={{ fontSize: "2.25rem", fontWeight: 1000, color: "#1E293B", letterSpacing: "-1px" }}>₹{format(totalRevenue)}</div>
                </div>
                <div style={{ width: "48px", height: "48px", background: "#F0F9FF", color: "#0369A1", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}><IndianRupee size={22} /></div>
             </div>
             <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94A3B8" }}>ACTIVE ORDERS</span>
                   <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#EF4444" }}>{activeOrderCount}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94A3B8" }}>TOTAL BILLS</span>
                   <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#6366F1" }}>{filteredBills.length}</span>
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
             <StatItem label="Cash" value={`₹${format(cashRevenue)}`} dot="#059669" />
             <StatItem label="UPI" value={`₹${format(upiRevenue)}`} dot="#4F46E5" />
             <StatItem label="Wallet" value={`₹${format(walletRevenue)}`} dot="#7C3AED" />
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
      <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: "300px", position: "relative" }}>
             <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
             <input 
               type="text" 
               placeholder="Search Bill No, Phone or Name..." 
               value={colFilters.billNumber}
               onChange={(e) => setColFilters({...colFilters, billNumber: e.target.value})}
               className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
             />
          </div>
          
          <select 
            value={colFilters.orderType} 
            onChange={(e) => setColFilters({...colFilters, orderType: e.target.value})}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option>All Types</option>
            <option>Counter</option>
            <option>Takeaway</option>
            <option>Dine-in</option>
          </select>

          <select 
            value={colFilters.paymentMode} 
            onChange={(e) => setColFilters({...colFilters, paymentMode: e.target.value})}
            className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option>All Payments</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Wallet</option>
          </select>

          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Settings2 size={16} /> Columns
            </button>
            {showColPicker && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setShowColPicker(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white dark:bg-slate-800 rounded-[20px] p-4 border border-slate-200 dark:border-slate-700 shadow-xl z-[1001] grid grid-cols-2 gap-2.5">
                  {Object.keys(visibleCols).map((key) => (
                    <label key={key} className={`flex items-center gap-2 text-xs font-bold cursor-pointer p-1.5 rounded-lg ${visibleCols[key as keyof typeof visibleCols] ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "bg-transparent text-slate-700 dark:text-slate-300"}`}>
                      <input 
                        type="checkbox" 
                        checked={visibleCols[key as keyof typeof visibleCols]} 
                        onChange={() => setVisibleCols({...visibleCols, [key]: !visibleCols[key as keyof typeof visibleCols]})}
                        style={{ width: "14px", height: "14px" }}
                      />
                      {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="px-6 py-3 rounded-2xl border-none bg-slate-900 dark:bg-indigo-600 text-white text-sm font-bold cursor-pointer hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">
            Filter Results
          </button>
        </div>

        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-2.5 rounded-2xl w-fit border border-indigo-100 dark:border-indigo-800/30">
           <Calendar size={18} className="text-indigo-500" />
           <input 
             type="date" 
             value={dateRange.start} 
             onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
             className="border-none bg-transparent font-bold text-slate-900 dark:text-slate-100 text-sm focus:outline-none" 
           />
           <span className="font-bold text-indigo-500">to</span>
           <input 
             type="date" 
             value={dateRange.end} 
             onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
             className="border-none bg-transparent font-bold text-slate-900 dark:text-slate-100 text-sm focus:outline-none" 
           />
           <button 
             onClick={fetchBills}
             style={{ marginLeft: "10px", padding: "6px 16px", borderRadius: "10px", border: "none", background: "#8B5CF6", color: "white", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
           >
             Apply
           </button>
        </div>
      </div>

      {/* --- Desktop Table --- */}
      {loading ? (
        <div style={{ height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "white", borderRadius: "24px", border: "1px solid #F1F5F9", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
           <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 mb-4"></div>
           <span className="font-bold text-slate-500 text-sm tracking-wide">Fetching & Applying Filters...</span>
        </div>
      ) : (
        <BillHistoryTable 
          bills={paginatedBills} 
          business={business} 
          userRole={userRole} 
          userPermissions={userPermissions} 
          refresh={fetchBills}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          visibleCols={visibleCols}
        />
      )}

      {/* --- Pagination --- */}
      {!loading && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "16px" }}>
          
          {/* Server Side Pagination */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", marginRight: "4px" }}>Server Pagination:</span>
            <button 
              onClick={() => { const next = apiPage - 1; setApiPage(next); setCurrentPage(1); fetchBills(false, next); }} 
              disabled={apiPage === 1} 
              style={{ padding: "0 12px", height: "36px", borderRadius: "12px", border: "1px solid #E5E7EB", background: apiPage === 1 ? "#F3F4F6" : "white", cursor: apiPage === 1 ? "not-allowed" : "pointer", fontSize: "0.75rem", fontWeight: 700 }}
            >
              Older Bills
            </button>
            <div style={{ height: "36px", padding: "0 16px", background: "#F3F4F6", borderRadius: "12px", display: "flex", alignItems: "center", fontSize: "0.75rem", fontWeight: 900 }}>Page {apiPage}</div>
            <button 
              onClick={() => { const next = apiPage + 1; setApiPage(next); setCurrentPage(1); fetchBills(false, next); }} 
              disabled={filteredBills.length < 100} 
              style={{ padding: "0 12px", height: "36px", borderRadius: "12px", border: "1px solid #E5E7EB", background: filteredBills.length < 100 ? "#F3F4F6" : "white", cursor: filteredBills.length < 100 ? "not-allowed" : "pointer", fontSize: "0.75rem", fontWeight: 700 }}
            >
              Newer Bills
            </button>
          </div>

          {/* Client Side Pagination */}
          {filteredBills.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6B7280", marginRight: "4px" }}>Table View:</span>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ width: "36px", height: "36px", borderRadius: "12px", border: "1px solid #E5E7EB", background: "white", cursor: "pointer" }}><ChevronLeft size={18} /></button>
              <div style={{ height: "36px", padding: "0 16px", background: "#F3F4F6", borderRadius: "12px", display: "flex", alignItems: "center", fontSize: "0.75rem", fontWeight: 900 }}>{currentPage} / {totalPages}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ width: "36px", height: "36px", borderRadius: "12px", border: "1px solid #E5E7EB", background: "white", cursor: "pointer" }}><ChevronRight size={18} /></button>
            </div>
          )}

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
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "14px", border: "1px solid #E5E7EB", background: "white", color: color, fontSize: "0.85rem", fontWeight: 800, cursor: "pointer" }}>{icon} {label}</button>
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
import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { 
  ChevronLeft, TrendingUp, Clock, IndianRupee, Calendar, Zap, 
  Download, MoreVertical, Smartphone, Banknote, CheckCircle, 
  Search, Filter, X, Eye, Printer, FileText, ShoppingBag, 
  Trash2, MessageCircle, Wallet, CreditCard, Utensils
} from "lucide-react";
import Link from "next/link";
import { BillActionsReport } from "./BillActionsReport";
import CopyJsonButton from "./CopyJsonButton";

export const revalidate = 0;

// --- Sub-components (Premium Styling) ---

const TypeBadge = ({ type }: { type: string }) => {
  const t = type?.toUpperCase() || "POS";
  let color = "#64748B";
  let bg = "rgba(100, 116, 139, 0.1)";
  let label = "Counter";

  if (t.includes("DELIVERY")) { color = "#3B82F6"; bg = "rgba(59, 130, 246, 0.1)"; label = "Delivery"; }
  else if (t.includes("TAKEAWAY")) { color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.1)"; label = "Takeaway"; }
  else if (t !== "POS" && t !== "COUNTER") { color = "#10B981"; bg = "rgba(16, 185, 129, 0.1)"; label = "Dine-in"; }

  return (
    <span style={{ 
      padding: "5px 12px", borderRadius: "10px", fontSize: "0.68rem", fontWeight: 850, 
      background: bg, color: color, display: "inline-block", border: `1px solid ${color}20` 
    }}>
      {label}
    </span>
  );
};

const PaymentBadge = ({ mode }: { mode: string }) => {
  const m = mode?.toLowerCase();
  let color = "var(--kravy-text-muted)";
  let bg = "var(--kravy-bg-2)";
  if (m === "upi") { color = "var(--kravy-purple)"; bg = "rgba(139, 92, 246, 0.1)"; }
  if (m === "cash") { color = "var(--kravy-green)"; bg = "rgba(16, 185, 129, 0.1)"; }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "6px", background: bg, color: color, fontSize: "0.65rem", fontWeight: 900 }}>
      {m === "upi" ? <Smartphone size={10} /> : <Banknote size={10} />} {mode?.toUpperCase() || "CASH"}
    </div>
  );
};

const StatusIndicator = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() || "paid";
  const isCancelled = s === "cancelled";
  const isPending = s === "pending" || s === "held";
  
  return (
    <div style={{ 
      display: "flex", alignItems: "center", gap: "4px", 
      color: isCancelled ? "#EF4444" : isPending ? "#F59E0B" : "#10B981", 
      fontSize: "0.65rem", fontWeight: 850 
    }}>
      {isCancelled ? <X size={12} /> : isPending ? <Clock size={12} /> : <CheckCircle size={12} />}
      {s === "paid" ? "SETTLED" : s.toUpperCase()}
    </div>
  );
};

const StatsCard = ({ label, value, badge, subtext }: any) => (
  <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "20px", boxShadow: "var(--kravy-card-shadow)" }} className="p-3.5 sm:p-5 flex flex-col justify-between gap-1.5 sm:gap-2 min-w-0">
    <div style={{ color: "var(--kravy-text-muted)" }} className="text-xs sm:text-sm font-semibold truncate">{label}</div>
    <div style={{ color: "var(--kravy-text-primary)" }} className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate">{value}</div>
    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
      {badge && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--kravy-green)" }} className="text-[0.65rem] sm:text-xs font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">{badge}</span>}
      <span style={{ color: "var(--kravy-text-muted)" }} className="text-[0.7rem] sm:text-xs font-semibold">{subtext}</span>
    </div>
  </div>
);

const ChartBar = ({ label, height, isPeak }: any) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", height: "100%", justifyContent: "flex-end", minWidth: "16px" }}>
    <div style={{ width: "80%", background: isPeak ? "#3B82F6" : "rgba(59, 130, 246, 0.3)", height: `${height}%`, borderRadius: "4px", minHeight: "4px", transition: "height 1s" }} />
    <span style={{ fontSize: "0.65rem", color: "var(--kravy-text-muted)", fontWeight: 700 }} className="truncate">{label}</span>
  </div>
);

const BreakdownRow = ({ dotColor, label, count, revenue, sym }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }} className="min-w-0">
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--kravy-text-primary)" }} className="truncate">{label}</span>
    </div>
    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--kravy-text-primary)" }} className="text-right shrink-0">
      {count} <span className="hidden sm:inline">orders</span> — <span style={{ color: "var(--kravy-text-muted)" }}>{sym}{new Intl.NumberFormat("en-IN").format(Math.round(revenue))}</span>
    </div>
  </div>
);

const Th = ({ label, isRight }: { label: string; isRight?: boolean }) => (
  <th style={{ 
    padding: "16px 20px", textAlign: isRight ? "right" : "left", 
    fontSize: "0.7rem", fontWeight: 900, color: "var(--kravy-text-muted)", 
    textTransform: "uppercase", letterSpacing: "1px", background: "var(--kravy-table-header)"
  }}>
    {label}
  </th>
);

export default async function DailySalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    from?: string; 
    to?: string; 
    type?: string; 
    payment?: string; 
    status?: string;
    query?: string 
  }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const params = await searchParams;
  const fromDateStr = params.from || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const toDateStr = params.to || fromDateStr;
  const typeFilter = params.type || "ALL";
  const paymentFilter = params.payment || "ALL";
  const statusFilter = params.status || "ALL";
  const searchQuery = params.query || "";

  const [sY, sM, sD] = fromDateStr.split('-').map(Number);
  const startRange = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
  startRange.setMinutes(startRange.getMinutes() - 330);

  const [eY, eM, eD] = toDateStr.split('-').map(Number);
  const endRange = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
  endRange.setMinutes(endRange.getMinutes() - 330);

  // Profile data
  const profile = await prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'asc' } });
  const businessName = profile?.businessName || "Your Business";

  // Build where clause
  const whereClause: any = {
    clerkUserId: effectiveId,
    isDeleted: false,
    isHeld: false,
    createdAt: { gte: startRange, lte: endRange }
  };

  if (typeFilter !== "ALL") {
    if (typeFilter === "POS") whereClause.tableName = { in: ["POS", null, "Counter"] };
    else whereClause.tableName = { contains: typeFilter, mode: 'insensitive' };
  }
  if (paymentFilter !== "ALL") {
    whereClause.paymentMode = { contains: paymentFilter, mode: 'insensitive' };
  }
  if (statusFilter !== "ALL") {
    whereClause.paymentStatus = { equals: statusFilter, mode: 'insensitive' };
  }
  if (searchQuery) {
    whereClause.OR = [
      { billNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery } }
    ];
  }

  // Fetch Bills
  const bills = await prisma.billManager.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" }
  });

  // Fetch External (Swiggy/Zomato) Sales for the range
  const externalSales = await prisma.externalSales.findMany({
    where: {
      clerkUserId: effectiveId,
      date: { gte: startRange, lte: endRange }
    }
  });

  // Previous Range for Growth calculation
  const rangeDuration = endRange.getTime() - startRange.getTime();
  const prevStart = new Date(startRange.getTime() - rangeDuration - 1);
  const prevEnd = new Date(startRange.getTime() - 1);
  
  const prevBills = await prisma.billManager.findMany({
    where: { clerkUserId: effectiveId, isDeleted: false, isHeld: false, createdAt: { gte: prevStart, lte: prevEnd } },
    select: { total: true }
  });

  const prevExternalSales = await prisma.externalSales.findMany({
    where: {
      clerkUserId: effectiveId,
      date: { gte: prevStart, lte: prevEnd }
    }
  });

  // Combined metrics calculation
  const offlineRevenue = bills.reduce((s, b) => s + b.total, 0);
  const externalRevenue = externalSales.reduce((s, x) => s + x.totalRevenue, 0);
  const totalRevenue = offlineRevenue + externalRevenue;

  const prevOfflineRevenue = prevBills.reduce((s, b) => s + b.total, 0);
  const prevExternalRevenue = prevExternalSales.reduce((s, x) => s + x.totalRevenue, 0);
  const prevRevenue = prevOfflineRevenue + prevExternalRevenue;

  const growth = prevRevenue === 0 ? 100 : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
  const totalTax = bills.reduce((s, b) => s + (b.tax || 0), 0);

  const totalOfflineOrders = bills.length;
  const totalExternalOrders = externalSales.reduce((s, x) => s + x.totalOrders, 0);
  const combinedOrdersCount = totalOfflineOrders + totalExternalOrders;

  const prevOfflineOrders = prevBills.length;
  const prevExternalOrders = prevExternalSales.reduce((s, x) => s + x.totalOrders, 0);
  const prevOrdersCount = prevOfflineOrders + prevExternalOrders;

  const avgOrder = combinedOrdersCount > 0 ? totalRevenue / combinedOrdersCount : 0;

  const zomatoSales = externalSales.filter(s => s.platform === "zomato");
  const zomatoRevenue = zomatoSales.reduce((s, x) => s + x.totalRevenue, 0);
  const zomatoOrders = zomatoSales.reduce((s, x) => s + x.totalOrders, 0);

  const swiggySales = externalSales.filter(s => s.platform === "swiggy");
  const swiggyRevenue = swiggySales.reduce((s, x) => s + x.totalRevenue, 0);
  const swiggyOrders = swiggySales.reduce((s, x) => s + x.totalOrders, 0);

  // Analytics mapping
  const hourCounts = Array(24).fill(0);
  const itemMap: Record<string, { qty: number, revenue: number }> = {};
  const types = { DELIVERY: { c: 0, r: 0 }, DINEIN: { c: 0, r: 0 }, TAKEAWAY: { c: 0, r: 0 }, COUNTER: { c: 0, r: 0 } };
  const payments = { CASH: { c: 0, r: 0 }, UPI: { c: 0, r: 0 } };

  bills.forEach(b => {
    hourCounts[new Date(b.createdAt).getHours()]++;
    
    // Items
    let items: any = b.items;
    if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
    if (items && !Array.isArray(items) && items.items) items = items.items;
    if (Array.isArray(items)) {
      items.forEach((it: any) => {
        const name = it.name || "Unknown";
        const q = Number(it.quantity || it.qty || 0);
        const p = Number(it.price || it.sellingPrice || it.rate || 0);
        if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0 };
        itemMap[name].qty += q;
        itemMap[name].revenue += (q * p);
      });
    }

    // Type
    const t = (b.tableName || "POS").toUpperCase();
    if (t.includes("DELIVERY")) { types.DELIVERY.c++; types.DELIVERY.r += b.total; }
    else if (t.includes("TAKEAWAY")) { types.TAKEAWAY.c++; types.TAKEAWAY.r += b.total; }
    else if (t.includes("POS") || t.includes("COUNTER")) { types.COUNTER.c++; types.COUNTER.r += b.total; }
    else { types.DINEIN.c++; types.DINEIN.r += b.total; }

    // Payment
    const p = (b.paymentMode || "CASH").toUpperCase();
    if (p.includes("UPI")) { payments.UPI.c++; payments.UPI.r += b.total; }
    else { payments.CASH.c++; payments.CASH.r += b.total; }
  });

  const maxHourCount = Math.max(...hourCounts, 1);
  const topItems = Object.entries(itemMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 4);
  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10 p-3 sm:p-6 lg:p-8 pb-32 max-w-7xl mx-auto min-h-screen w-full" style={{ background: "var(--kravy-bg)" }}>
      
      {/* --- Header & Top Filters --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-[var(--kravy-text-primary)] tracking-tight">
            Sales Performance Report
          </h1>
          <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] font-medium mt-1">
            {fromDateStr === toDateStr ? new Date(fromDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long' }) : `${fromDateStr} to ${toDateStr}`} — {businessName}
          </p>
        </div>
        
        {/* Date Range Selector */}
        <form className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[var(--kravy-bg-2)] p-2 sm:px-4 sm:py-2 rounded-2xl border border-[var(--kravy-border)] shadow-sm w-full sm:w-auto">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-0">
            <Calendar size={16} className="text-[var(--kravy-text-muted)] shrink-0" />
            <input 
              name="from" 
              type="date" 
              defaultValue={fromDateStr} 
              className="bg-transparent border-none text-[var(--kravy-text-primary)] text-xs sm:text-sm font-bold outline-none cursor-pointer w-full" 
            />
          </div>
          <span className="text-[var(--kravy-text-muted)] text-xs font-bold px-1">to</span>
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-0">
            <input 
              name="to" 
              type="date" 
              defaultValue={toDateStr} 
              className="bg-transparent border-none text-[var(--kravy-text-primary)] text-xs sm:text-sm font-bold outline-none cursor-pointer w-full" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-[var(--kravy-purple)] text-white text-xs font-extrabold rounded-xl transition hover:opacity-90 active:scale-95 cursor-pointer"
          >
            Apply
          </button>
        </form>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard label="Net revenue (Combined)" value={`${sym}${format(totalRevenue)}`} badge={`${growth >= 0 ? "+" : ""}${Math.abs(growth).toFixed(0)}%`} subtext="vs prev period" />
        <StatsCard label="Total orders" value={combinedOrdersCount} badge={`${combinedOrdersCount >= prevOrdersCount ? "+" : ""}${combinedOrdersCount - prevOrdersCount}`} subtext="vs prev period" />
        <StatsCard label="Avg order value" value={`${sym}${format(avgOrder)}`} badge="+3%" subtext="this week" />
        <StatsCard label="Total tax collected" value={`${sym}${format(totalTax)}`} subtext="GST 5% + 18%" />
      </div>

      {/* --- Analytics Row --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "24px" }} className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-extrabold text-[var(--kravy-text-primary)]">Hourly distribution</h3>
            <span className="text-xs text-[var(--kravy-text-muted)] font-semibold hidden sm:inline">Orders per hour</span>
          </div>
          <div className="overflow-x-auto pb-2 no-scrollbar">
            <div className="flex items-end h-[140px] gap-2 min-w-[320px]">
              {[9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(h => (
                <ChartBar key={h} label={`${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`} height={(hourCounts[h] / maxHourCount) * 100} isPeak={hourCounts[h] === maxHourCount && maxHourCount > 0} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "24px" }} className="p-4 sm:p-6 lg:p-8">
          <h3 className="text-base sm:text-lg font-extrabold mb-4 sm:mb-6 text-[var(--kravy-text-primary)]">Summary breakdowns</h3>
          <BreakdownRow sym={sym} dotColor="#3B82F6" label="Counter / POS" count={types.COUNTER.c} revenue={types.COUNTER.r} />
          <BreakdownRow sym={sym} dotColor="#10B981" label="Dine-in" count={types.DINEIN.c} revenue={types.DINEIN.r} />
          <BreakdownRow sym={sym} dotColor="#F59E0B" label="Takeaway" count={types.TAKEAWAY.c} revenue={types.TAKEAWAY.r} />
          <BreakdownRow sym={sym} dotColor="#EF4444" label="Home Delivery" count={types.DELIVERY.c} revenue={types.DELIVERY.r} />
          <div style={{ height: "1px", background: "var(--kravy-border)", margin: "16px 0" }} />
          <h4 style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: "12px", color: "#FF6B35", textTransform: "uppercase", letterSpacing: "0.5px" }}>External Platforms (Gmail Synced)</h4>
          <BreakdownRow sym={sym} dotColor="#EA4335" label="Zomato" count={zomatoOrders} revenue={zomatoRevenue} />
          <BreakdownRow sym={sym} dotColor="#FC8019" label="Swiggy" count={swiggyOrders} revenue={swiggyRevenue} />
          <div style={{ height: "1px", background: "var(--kravy-border)", margin: "16px 0" }} />
          <BreakdownRow sym={sym} dotColor="#10B981" label="Cash Payments" count={payments.CASH.c} revenue={payments.CASH.r} />
          <BreakdownRow sym={sym} dotColor="#8B5CF6" label="UPI Payments" count={payments.UPI.c} revenue={payments.UPI.r} />
        </div>
      </div>

      {/* --- Top Selling Items --- */}
      <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "24px" }} className="p-4 sm:p-6 lg:p-8">
        <h3 className="text-base sm:text-lg font-extrabold mb-4 sm:mb-6 text-[var(--kravy-text-primary)]">Top Selling Items</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {topItems.map(([name, data]) => (
            <div key={name} style={{ background: "var(--kravy-bg-2)", border: `1px solid var(--kravy-border)`, boxShadow: "var(--kravy-card-shadow)" }} className="p-3 sm:p-4 rounded-xl flex flex-col justify-between gap-1 min-w-0">
              <div style={{ color: "var(--kravy-text-primary)" }} className="font-extrabold text-sm sm:text-base truncate" title={name}>{name}</div>
              <div style={{ color: "var(--kravy-text-muted)" }} className="text-xs">Qty: {data.qty}</div>
              <div style={{ color: "var(--kravy-text-primary)" }} className="text-sm sm:text-base font-extrabold mt-1">{sym}{format(data.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Transaction Ledger with Filters --- */}
      <div style={{ background: "var(--kravy-surface)", borderRadius: "24px", border: "1px solid var(--kravy-border)", boxShadow: "var(--kravy-card-shadow)" }} className="overflow-hidden">
        
        {/* Table Header & Local Filters */}
        <div style={{ borderBottom: "1px solid var(--kravy-border)" }} className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-row justify-between items-center gap-2">
            <div>
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">Transaction Ledger</h2>
              <p className="text-xs text-[var(--kravy-text-muted)] font-medium hidden sm:block">Detailed log of all customer bills</p>
            </div>
            <div style={{ color: "var(--kravy-text-muted)", background: "var(--kravy-bg-2)" }} className="text-xs sm:text-sm font-extrabold px-3 py-1.5 rounded-xl border border-[var(--kravy-border)] shrink-0">
              {bills.length} Bills
            </div>
          </div>

          {/* Filter Bar */}
          <form className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3 items-stretch sm:items-center">
            {/* Date Range Selectors */}
            <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)" }} className="flex items-center gap-2 px-3 py-2 rounded-xl w-full sm:w-auto">
              <span className="text-[0.7rem] font-extrabold text-[var(--kravy-text-muted)] uppercase">From</span>
              <input type="date" name="from" defaultValue={fromDateStr} className="bg-transparent border-none text-[var(--kravy-text-primary)] text-xs sm:text-sm font-bold outline-none flex-1 cursor-pointer" />
              <span className="text-[0.7rem] font-extrabold text-[var(--kravy-text-muted)] uppercase">To</span>
              <input type="date" name="to" defaultValue={toDateStr} className="bg-transparent border-none text-[var(--kravy-text-primary)] text-xs sm:text-sm font-bold outline-none flex-1 cursor-pointer" />
            </div>

            {/* Search */}
            <div className="w-full sm:flex-1 sm:min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
              <input 
                name="query" 
                placeholder="Search Bill No, Phone or Name..." 
                defaultValue={searchQuery}
                style={{ background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", border: "1px solid var(--kravy-border)" }} 
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm outline-none"
              />
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap">
              {/* Order Type Filter */}
              <select 
                name="type" 
                defaultValue={typeFilter}
                style={{ background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", border: "1px solid var(--kravy-border)" }}
                className="w-full sm:w-auto px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="DINE">Dine-in</option>
                <option value="DELIVERY">Delivery</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="POS">POS / Counter</option>
              </select>

              {/* Payment Filter */}
              <select 
                name="payment" 
                defaultValue={paymentFilter}
                style={{ background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", border: "1px solid var(--kravy-border)" }}
                className="w-full sm:w-auto px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Payments</option>
                <option value="CASH">Cash Only</option>
                <option value="UPI">UPI Only</option>
              </select>

              {/* Status Filter */}
              <select 
                name="status" 
                defaultValue={statusFilter}
                style={{ background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", border: "1px solid var(--kravy-border)" }}
                className="w-full sm:w-auto px-2 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Settled</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button 
                type="submit" 
                style={{ background: "var(--kravy-text-primary)", color: "var(--kravy-bg)" }} 
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-black cursor-pointer text-center hover:opacity-90 active:scale-95 transition border-none"
              >
                Filter
              </button>
              
              <a 
                href={`/api/bill-manager/export?from=${fromDateStr}&to=${toDateStr}&type=${typeFilter}&payment=${paymentFilter}&status=${statusFilter}&query=${searchQuery}`}
                target="_blank"
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition active:scale-95 no-underline"
              >
                <Download size={15} /> Export
              </a>

              <CopyJsonButton bills={bills} className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3.5" />
              
              {(searchQuery || typeFilter !== "ALL" || paymentFilter !== "ALL" || statusFilter !== "ALL") && (
                <Link 
                  href={`/dashboard/reports/sales/daily?from=${fromDateStr}&to=${toDateStr}`} 
                  style={{ color: "var(--kravy-red)" }} 
                  className="text-xs font-bold flex items-center justify-center gap-1 no-underline px-2 py-2"
                >
                  <X size={14} /> Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* --- Mobile Transaction Cards (block md:hidden) --- */}
        <div className="block md:hidden divide-y divide-[var(--kravy-border)]">
          {bills.length === 0 ? (
            <div className="p-12 text-center text-[var(--kravy-text-muted)] text-sm">
              No matching transactions found for this period.
            </div>
          ) : (
            bills.map((bill, idx) => {
              let items: any = bill.items;
              if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
              if (items && !Array.isArray(items) && items.items) items = items.items;
              return (
                <div key={bill.id} className="p-4 space-y-3 bg-[var(--kravy-surface)] hover:bg-[var(--kravy-bg-2)] transition">
                  {/* Row 1: Bill Number + Type + Status + Total */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[var(--kravy-purple)] font-mono">
                          #{bill.billNumber}
                        </span>
                        <TypeBadge type={bill.tableName || "POS"} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusIndicator status={bill.paymentStatus} />
                        <span className="text-xs text-[var(--kravy-text-muted)] font-medium">
                          • {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-[var(--kravy-text-primary)]">
                        {sym}{format(bill.total)}
                      </div>
                      <PaymentBadge mode={bill.paymentMode} />
                    </div>
                  </div>

                  {/* Row 2: Customer details & Token/Source */}
                  <div className="flex items-center justify-between text-xs text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-3 py-2 rounded-xl border border-[var(--kravy-border)]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-[var(--kravy-text-primary)]">{bill.customerName || "Walk-in"}</span>
                      {bill.customerPhone && (
                        <span className="font-mono text-[var(--kravy-text-muted)]">• {bill.customerPhone}</span>
                      )}
                    </div>
                    <div className="shrink-0 font-bold text-[var(--kravy-purple)] font-mono">
                      {bill.kotNumbers?.length > 0 ? (
                        `KOT: ${bill.kotNumbers.join(', ')}`
                      ) : bill.tokenNumber ? (
                        `Token #${String(bill.tokenNumber).padStart(2, '0')}`
                      ) : (
                        bill.tableName || "POS"
                      )}
                    </div>
                  </div>

                  {/* Row 3: Items list (pills) */}
                  {Array.isArray(items) && items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {items.map((it: any, i: number) => (
                        <span 
                          key={i} 
                          style={{ background: "var(--kravy-bg)", border: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)" }} 
                          className="text-[0.7rem] px-2 py-0.5 rounded-md font-bold"
                        >
                          {it.name} <span className="text-[var(--kravy-text-primary)] font-black">x{it.quantity || it.qty}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 4: S.No & Actions menu */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--kravy-border)]">
                    <span className="text-[0.7rem] text-[var(--kravy-text-faint)] font-bold">
                      #{idx + 1}
                    </span>
                    <BillActionsReport billId={bill.id} bill={bill} business={profile} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- Desktop Table View (hidden md:block) --- */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--kravy-table-header)" }}>
                <Th label="S.NO" />
                <Th label="DATE" />
                <Th label="TIME" />
                <Th label="BILL INFO" />
                <Th label="TYPE" />
                <Th label="ITEMS" />
                <Th label="SOURCE" />
                <Th label="CUSTOMER" />
                <Th label="PHONE" />
                <Th label="TOTAL" isRight />
                <Th label="PAYMENT" />
                <Th label="TOKEN" />
                <Th label="ACTIONS" isRight />
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: "80px", textAlign: "center", color: "var(--kravy-text-muted)", fontSize: "1rem" }}>No matching transactions found for this period.</td></tr>
              ) : (
                bills.map((bill, idx) => {
                  let items: any = bill.items;
                  if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
                  if (items && !Array.isArray(items) && items.items) items = items.items;
                  return (
                    <tr key={bill.id} style={{ borderBottom: "1px solid var(--kravy-border)", background: idx % 2 === 0 ? "transparent" : "var(--kravy-bg-2)" }}>
                      <td style={{ padding: "16px 20px", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-faint)" }}>{idx + 1}</td>
                      <td style={{ padding: "16px 20px", fontSize: "0.85rem", fontWeight: 800 }}>{new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td style={{ padding: "16px 20px", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>{new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-purple)", fontFamily: "monospace" }}>#{bill.billNumber}</span>
                          <StatusIndicator status={bill.paymentStatus} />
                        </div>
                      </td>
                      <td><TypeBadge type={bill.tableName || "POS"} /></td>
                      <td style={{ padding: "16px 10px", maxWidth: "250px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {items?.map((it: any, i: number) => (
                            <span key={i} style={{ fontSize: "0.65rem", padding: "3px 8px", background: "var(--kravy-bg)", border: "1px solid var(--kravy-border)", borderRadius: "6px", fontWeight: 800, color: "var(--kravy-text-muted)" }}>{it.name} x{it.quantity || it.qty}</span>
                          ))}
                        </div>
                      </td>
                      <td><span style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(99, 102, 241, 0.1)", color: "var(--kravy-purple)", fontSize: "0.65rem", fontWeight: 900 }}>{bill.tableName || "POS"}</span></td>
                      <td style={{ fontSize: "0.9rem", fontWeight: 800 }}>{bill.customerName || "Walk-in"}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontFamily: "monospace" }}>{bill.customerPhone || "—"}</td>
                      <td style={{ textAlign: "right", fontSize: "1.1rem", fontWeight: 950 }}>{sym}{format(bill.total)}</td>
                      <td><PaymentBadge mode={bill.paymentMode} /></td>
                      <td>
                        {bill.kotNumbers?.length > 0 ? (
                          <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-purple)", fontFamily: "monospace" }}>
                            {bill.kotNumbers.join(', ')}
                          </span>
                        ) : bill.tokenNumber ? (
                          <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "var(--kravy-purple)", fontFamily: "monospace" }}>
                            {String(bill.tokenNumber).padStart(2, '0')}
                          </span>
                        ) : (
                          <span style={{ color: "var(--kravy-text-faint)" }}>—</span>
                        )}
                      </td>
                      <td style={{ paddingRight: "20px", textAlign: "right" }}>
                         <BillActionsReport billId={bill.id} bill={bill} business={profile} />
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
  );
}

const ThStyle: React.CSSProperties = { padding: "20px 10px", textAlign: "left", fontSize: "0.7rem", fontWeight: 950, color: "var(--kravy-text-muted)", letterSpacing: "1.5px", textTransform: "uppercase" };

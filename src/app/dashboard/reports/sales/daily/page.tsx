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
  <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "20px", padding: "24px", flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "8px", boxShadow: "var(--kravy-card-shadow)" }}>
    <div style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>{value}</div>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
      {badge && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--kravy-green)", fontSize: "0.7rem", fontWeight: 900, padding: "4px 8px", borderRadius: "6px" }}>{badge}</span>}
      <span style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontWeight: 600 }}>{subtext}</span>
    </div>
  </div>
);

const ChartBar = ({ label, height, isPeak }: any) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", height: "100%", justifyContent: "flex-end" }}>
    <div style={{ width: "80%", background: isPeak ? "#3B82F6" : "rgba(59, 130, 246, 0.3)", height: `${height}%`, borderRadius: "4px", minHeight: "4px", transition: "height 1s" }} />
    <span style={{ fontSize: "0.65rem", color: "var(--kravy-text-muted)", fontWeight: 700 }}>{label}</span>
  </div>
);

const BreakdownRow = ({ dotColor, label, count, revenue }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor }} />
      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--kravy-text-primary)" }}>{label}</span>
    </div>
    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>
      {count} orders — <span style={{ color: "var(--kravy-text-muted)" }}>₹{new Intl.NumberFormat("en-IN").format(Math.round(revenue))}</span>
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
  const businessName = profile?.businessName || "Your Restaurant";

  // Build where clause
  const whereClause: any = {
    clerkUserId: effectiveId,
    isDeleted: false,
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
    where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: prevStart, lte: prevEnd } },
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
  const types = { DELIVERY: { c: 0, r: 0 }, DINEIN: { c: 0, r: 0 }, TAKEAWAY: { c: 0, r: 0 } };
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
    <div style={{ display: "flex", flexDirection: "column", gap: "40px", padding: "32px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      
      {/* --- Header & Top Filters --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "24px" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, marginBottom: "4px", color: "var(--kravy-text-primary)", letterSpacing: "-1.5px" }}>Sales Performance Report</h1>
          <p style={{ fontSize: "1rem", color: "var(--kravy-text-muted)", fontWeight: 500 }}>{fromDateStr === toDateStr ? new Date(fromDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long' }) : `${fromDateStr} to ${toDateStr}`} — {businessName}</p>
        </div>
        
        {/* Date Range Selector */}
        <form style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--kravy-bg-2)", padding: "8px 16px", borderRadius: "16px", border: "1px solid var(--kravy-border)" }}>
          <Calendar size={18} color="var(--kravy-text-muted)" />
          <input name="from" type="date" defaultValue={fromDateStr} style={{ background: "transparent", border: "none", color: "var(--kravy-text-primary)", fontSize: "0.85rem", fontWeight: 700, outline: "none" }} />
          <span style={{ color: "var(--kravy-text-muted)" }}>to</span>
          <input name="to" type="date" defaultValue={toDateStr} style={{ background: "transparent", border: "none", color: "var(--kravy-text-primary)", fontSize: "0.85rem", fontWeight: 700, outline: "none" }} />
          <button type="submit" style={{ padding: "6px 12px", background: "var(--kravy-purple)", color: "white", border: "none", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}>Apply</button>
        </form>
      </div>

      {/* --- Stats Cards --- */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        <StatsCard label="Net revenue (Combined)" value={`₹${format(totalRevenue)}`} badge={`${growth >= 0 ? "+" : ""}${Math.abs(growth).toFixed(0)}%`} subtext="vs prev period" />
        <StatsCard label="Total orders" value={combinedOrdersCount} badge={`${combinedOrdersCount >= prevOrdersCount ? "+" : ""}${combinedOrdersCount - prevOrdersCount}`} subtext="vs prev period" />
        <StatsCard label="Avg order value" value={`₹${format(avgOrder)}`} badge="+3%" subtext="this week" />
        <StatsCard label="Total tax collected" value={`₹${format(totalTax)}`} subtext="GST 5% + 18%" />
      </div>

      {/* --- Analytics Row --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="grid-cols-1 md:grid-cols-2">
        <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "32px", color: "var(--kravy-text-primary)" }}>Hourly distribution</h3>
          <div style={{ display: "flex", alignItems: "flex-end", height: "140px", gap: "10px" }}>
            {[9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(h => (
              <ChartBar key={h} label={`${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`} height={(hourCounts[h] / maxHourCount) * 100} isPeak={hourCounts[h] === maxHourCount && maxHourCount > 0} />
            ))}
          </div>
        </div>
        <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "24px", color: "var(--kravy-text-primary)" }}>Summary breakdowns</h3>
          <BreakdownRow dotColor="#3B82F6" label="Counter Delivery" count={types.DELIVERY.c} revenue={types.DELIVERY.r} />
          <BreakdownRow dotColor="#10B981" label="Dine-in" count={types.DINEIN.c} revenue={types.DINEIN.r} />
          <BreakdownRow dotColor="#F59E0B" label="Takeaway" count={types.TAKEAWAY.c} revenue={types.TAKEAWAY.r} />

          <BreakdownRow dotColor="#10B981" label="Cash Payments" count={payments.CASH.c} revenue={payments.CASH.r} />
          <BreakdownRow dotColor="#8B5CF6" label="UPI Payments" count={payments.UPI.c} revenue={payments.UPI.r} />
        </div>
      </div>
      {/* --- Top Selling Items --- */}
      <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", marginTop: "24px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "24px", color: "var(--kravy-text-primary)" }}>Top Selling Items</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {topItems.map(([name, data]) => (
            <div key={name} style={{ padding: "16px", background: "var(--kravy-bg-2)", borderRadius: "12px", border: `1px solid var(--kravy-border)`, boxShadow: "var(--kravy-card-shadow)" }}>
              <div style={{ fontWeight: 900, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Qty: {data.qty}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>₹{format(data.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Transaction Ledger with Filters --- */}
      <div style={{ background: "var(--kravy-surface)", borderRadius: "32px", border: "1px solid var(--kravy-border)", overflow: "hidden", boxShadow: "var(--kravy-card-shadow)" }}>
        
        {/* Table Header & Local Filters */}
        <div style={{ padding: "32px 40px", borderBottom: "1px solid var(--kravy-border)", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>Transaction Ledger</h2>
            <div style={{ color: "var(--kravy-text-muted)", fontSize: "0.85rem", fontWeight: 800, background: "var(--kravy-bg-2)", padding: "6px 16px", borderRadius: "10px" }}>
              {bills.length} Bills Found
            </div>
          </div>

          {/* New Filter Bar */}
          <form style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Preserve Dates */}
            <input type="hidden" name="from" value={fromDateStr} />
            <input type="hidden" name="to" value={toDateStr} />

            {/* Search */}
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--kravy-text-muted)" }} />
              <input 
                name="query" 
                placeholder="Search Bill No, Phone or Name..." 
                defaultValue={searchQuery}
                style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "12px", border: "1px solid var(--kravy-border)", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", fontSize: "0.85rem", outline: "none" }} 
              />
            </div>

            {/* Order Type Filter */}
            <select 
              name="type" 
              defaultValue={typeFilter}
              style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--kravy-border)", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", fontSize: "0.85rem", fontWeight: 700, outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Types</option>
              <option value="DINE">Dine-in Only</option>
              <option value="DELIVERY">Delivery Only</option>
              <option value="TAKEAWAY">Takeaway Only</option>
              <option value="POS">POS / Counter</option>
            </select>

            {/* Payment Filter */}
            <select 
              name="payment" 
              defaultValue={paymentFilter}
              style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--kravy-border)", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", fontSize: "0.85rem", fontWeight: 700, outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash Only</option>
              <option value="UPI">UPI Only</option>
            </select>

            {/* Status Filter */}
            <select 
              name="status" 
              defaultValue={statusFilter}
              style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--kravy-border)", background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", fontSize: "0.85rem", fontWeight: 700, outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Settled</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button type="submit" style={{ padding: "10px 24px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", border: "none", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 900, cursor: "pointer" }}>Filter Results</button>
            
            {(searchQuery || typeFilter !== "ALL" || paymentFilter !== "ALL") && (
              <Link href={`/dashboard/reports/sales/daily?from=${fromDateStr}&to=${toDateStr}`} style={{ color: "var(--kravy-red)", fontSize: "0.75rem", fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                <X size={14} /> Clear
              </Link>
            )}
          </form>
        </div>

        <div style={{ overflowX: "auto" }}>
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
                      <td style={{ textAlign: "right", fontSize: "1.1rem", fontWeight: 950 }}>₹{format(bill.total)}</td>
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

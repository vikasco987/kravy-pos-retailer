import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { 
  ChevronLeft, TrendingUp, Clock, IndianRupee, Calendar, Zap, 
  Download, MoreVertical, Smartphone, Banknote, CheckCircle, 
  Search, Filter, X, Eye, Printer, FileText, ShoppingBag, 
  Trash2, MessageCircle, Wallet, CreditCard, Utensils, Sparkles, Target, BarChart3
} from "lucide-react";
import Link from "next/link";
import { BillActionsReport } from "../daily/BillActionsReport";

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
  const m = mode?.toUpperCase() || "CASH";
  const isUPI = m.includes("UPI");
  const isWallet = m.includes("WALLET");
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "8px", 
        background: isUPI ? "#8B5CF615" : isWallet ? "#6366F115" : "#10B98115",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isUPI ? "#8B5CF6" : isWallet ? "#6366F1" : "#10B981"
      }}>
        {isUPI ? <Smartphone size={14} /> : isWallet ? <Wallet size={14} /> : <Banknote size={14} />}
      </div>
      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{m}</span>
    </div>
  );
};

const Th = ({ label, isRight }: any) => (
  <th style={{ 
    padding: "18px 24px", textAlign: isRight ? "right" : "left", 
    fontSize: "0.72rem", fontWeight: 900, color: "var(--kravy-text-muted)", 
    textTransform: "uppercase", letterSpacing: "1px", background: "var(--kravy-bg-2)"
  }}>
    {label}
  </th>
);

export default async function WeeklySalesReportPage() {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const bills = await prisma.billManager.findMany({
    where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: startOfWeek } },
    orderBy: { createdAt: "desc" }
  });

  const business = await prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'asc' } });

  const totalRevenue = bills.filter(b => b.paymentStatus !== "Cancelled" && b.paymentStatus !== "CANCELLED").reduce((s, b) => s + b.total, 0);
  const totalBills = bills.filter(b => b.paymentStatus !== "Cancelled" && b.paymentStatus !== "CANCELLED").length;
  
  // Analytics
  const topItemsMap: Record<string, { qty: number, revenue: number }> = {};
  const orderTypes = { DELIVERY: { c: 0, r: 0 }, DINEIN: { c: 0, r: 0 }, TAKEAWAY: { c: 0, r: 0 }, COUNTER: { c: 0, r: 0 } };
  const payments = { CASH: { c: 0, r: 0 }, UPI: { c: 0, r: 0 } };
  const gstDetails = { taxable: 0, tax: 0 };
  let cancelledCount = 0;
  let cancelledValue = 0;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyStats = Array(7).fill(0).map((_, i) => ({ day: dayNames[i], revenue: 0, orders: 0 })); 
  
  bills.forEach(b => {
    const isCancelled = b.paymentStatus === "Cancelled" || b.paymentStatus === "CANCELLED";
    if (isCancelled) {
      cancelledCount++;
      cancelledValue += b.total;
    }

    const d = new Date(b.createdAt).getDay(); // 0=Sun, 1=Mon
    const idx = d === 0 ? 6 : d - 1; // Map to 0=Mon... 6=Sun

    if (!isCancelled) {
      dailyStats[idx].revenue += b.total;
      dailyStats[idx].orders++;

      // Items
      let items: any = b.items;
      if (typeof items === "string") try { items = JSON.parse(items); } catch {}
      if (items && !Array.isArray(items) && items.items) items = items.items;
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const name = it.name || "Unknown";
          const q = Number(it.quantity || it.qty || 0);
          const p = Number(it.price || it.sellingPrice || it.rate || 0);
          if (!topItemsMap[name]) topItemsMap[name] = { qty: 0, revenue: 0 };
          topItemsMap[name].qty += q;
          topItemsMap[name].revenue += (q * p);
        });
      }

      // Type
      const t = (b.tableName || "POS").toUpperCase();
      if (t.includes("DELIVERY")) { orderTypes.DELIVERY.c++; orderTypes.DELIVERY.r += b.total; }
      else if (t.includes("TAKEAWAY")) { orderTypes.TAKEAWAY.c++; orderTypes.TAKEAWAY.r += b.total; }
      else if (t.includes("POS") || t.includes("COUNTER")) { orderTypes.COUNTER.c++; orderTypes.COUNTER.r += b.total; }
      else { orderTypes.DINEIN.c++; orderTypes.DINEIN.r += b.total; }

      // Payment
      const pm = (b.paymentMode || "CASH").toUpperCase();
      if (pm.includes("UPI")) { payments.UPI.c++; payments.UPI.r += b.total; }
      else { payments.CASH.c++; payments.CASH.r += b.total; }

      if (b.tax) {
         gstDetails.tax += b.tax;
         gstDetails.taxable += b.subtotal;
      }
    }
  });

  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);
  const maxOrders = Math.max(...dailyStats.map(d => d.orders), 1);
  const topItemsArray = Object.entries(topItemsMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 4);
  const maxTopItemQty = Math.max(...topItemsArray.map(t => t[1].qty), 1);
  
  const bestDayObj = dailyStats.reduce((max, obj) => obj.revenue > max.revenue ? obj : max, dailyStats[0]);
  const bestDay = bestDayObj.day;
  const bestDayRev = bestDayObj.revenue;

  const totalTypesRevenue = orderTypes.DELIVERY.r + orderTypes.DINEIN.r + orderTypes.TAKEAWAY.r + orderTypes.COUNTER.r;
  const delPct = totalTypesRevenue > 0 ? (orderTypes.DELIVERY.r / totalTypesRevenue) * 100 : 0;
  const dinePct = totalTypesRevenue > 0 ? (orderTypes.DINEIN.r / totalTypesRevenue) * 100 : 0;
  const takePct = totalTypesRevenue > 0 ? (orderTypes.TAKEAWAY.r / totalTypesRevenue) * 100 : 0;
  const counterPct = totalTypesRevenue > 0 ? (orderTypes.COUNTER.r / totalTypesRevenue) * 100 : 0;

  const totalPaymentsRevenue = payments.CASH.r + payments.UPI.r;
  const cashPct = totalPaymentsRevenue > 0 ? (payments.CASH.r / totalPaymentsRevenue) * 100 : 0;
  const upiPct = totalPaymentsRevenue > 0 ? (payments.UPI.r / totalPaymentsRevenue) * 100 : 0;

  const dayIndex = now.getDay() === 0 ? 7 : now.getDay(); 
  const avgDaily = totalRevenue / Math.max(dayIndex, 1);
  const avgOrderVal = totalBills > 0 ? totalRevenue / totalBills : 0;

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "16px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      
      {/* --- ELITE HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/dashboard" style={{
            width: "52px", height: "52px", borderRadius: "18px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", 
            color: "var(--kravy-text-primary)", boxShadow: "0 8px 16px rgba(0,0,0,0.06)"
          }}>
            <ChevronLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Weekly Pulse</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "var(--kravy-text-muted)" }}>
              <Calendar size={16} /> 
              <span>Performance Cycle: {startOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – Present</span>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--kravy-border)" }} />
              <span style={{ fontWeight: 800, color: "#8B5CF6" }}>7-DAY ANALYTICS WINDOW</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
           <button style={{ 
             padding: "14px 28px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
             borderRadius: "18px", color: "var(--kravy-text-primary)", fontWeight: 850, fontSize: "0.85rem", 
             display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", 
             boxShadow: "var(--kravy-shadow-sm)" 
           }}>
             <Download size={18} /> Download Weekly Report
           </button>
        </div>
      </div>

      {/* --- WEEKLY BANNER --- */}
      <div style={{ 
        background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246,0.2)", 
        borderRadius: "28px", padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px"
      }}>
         <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "#8B5CF6", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(139, 92, 246, 0.3)" }}><Sparkles size={24} /></div>
            <div>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "1.5px" }}>Current Run Rate</div>
               <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                  You are generating an average of <span style={{ color: "#8B5CF6" }}>{sym}{format(avgDaily)}</span> per day this week.
               </div>
            </div>
         </div>
         <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Volume</div>
               <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(totalRevenue)}</div>
            </div>
            <div style={{ width: "1px", height: "40px", background: "var(--kravy-border)" }} />
            <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Bill Count</div>
               <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{totalBills}</div>
            </div>
         </div>
      </div>

      {/* --- BAR CHART --- */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", boxShadow: "var(--kravy-shadow-md)" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "20px" }}>Daily revenue — Mon to Sun</h3>
        <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#3B82F6", borderRadius: "3px" }}/> Revenue ({sym})</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#10B981", borderRadius: "3px" }}/> Orders</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", height: "240px", gap: "12px", position: "relative" }}>
           <div style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: "30px", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 0 }}>
             {[5,4,3,2,1,0].map(n => (
                <div key={n} style={{ borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "100%" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--kravy-text-faint)", position: "relative", top: "10px" }}>{sym}{format((maxRevenue / 5) * n)}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--kravy-text-faint)", position: "relative", top: "10px" }}>{Math.round((maxOrders / 5) * n)}</span>
                </div>
             ))}
           </div>
           <div style={{ display: "flex", justifyContent: "space-around", width: "100%", paddingLeft: "40px", paddingRight: "40px", zIndex: 1, paddingBottom: "30px", height: "100%", alignItems: "flex-end" }}>
              {dailyStats.map((d, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "100%" }}>
                    <div style={{ width: "32px", background: "#3B82F6", height: `${(d.revenue / maxRevenue) * 100}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }} />
                    <div style={{ width: "32px", background: "#10B981", height: `${(d.orders / maxOrders) * 100}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }} />
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 700, marginTop: "8px" }}>{d.day}</div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* --- MIDDLE GRIDS --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="grid-cols-1 lg:grid-cols-2">
        {/* Top Selling */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", boxShadow: "var(--kravy-shadow-md)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "24px" }}>Top selling items</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {topItemsArray.map(([name, data]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)" }}>{data.qty} sold</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "60px", height: "6px", background: "var(--kravy-bg-2)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${(data.qty / maxTopItemQty) * 100}%`, height: "100%", background: "#3B82F6" }} />
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)", width: "70px", textAlign: "right" }}>{sym}{format(data.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Type Breakdown */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", boxShadow: "var(--kravy-shadow-md)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "32px" }}>Order type breakdown</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "40px" }}>
             {/* Fake Donut */}
             <div style={{ width: "160px", height: "160px", borderRadius: "50%", background: `conic-gradient(#EF4444 0% ${delPct}%, #10B981 ${delPct}% ${delPct + dinePct}%, #F59E0B ${delPct + dinePct}% ${delPct + dinePct + takePct}%, #3B82F6 ${delPct + dinePct + takePct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
               <div style={{ width: "110px", height: "110px", borderRadius: "50%", background: "var(--kravy-surface)" }} />
             </div>
             {/* Legends */}
             <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
               <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#3B82F6", borderRadius: "3px" }}/> Counter / POS {counterPct.toFixed(0)}%</div>
               <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#10B981", borderRadius: "3px" }}/> Dine-in {dinePct.toFixed(0)}%</div>
               <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#F59E0B", borderRadius: "3px" }}/> Takeaway {takePct.toFixed(0)}%</div>
               <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}><div style={{ width: "12px", height: "12px", background: "#EF4444", borderRadius: "3px" }}/> Home Delivery {delPct.toFixed(0)}%</div>
             </div>
          </div>
        </div>
      </div>

      {/* --- PAYMENT & CANCELLED --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="grid-cols-1 md:grid-cols-2">
        {/* Payment Methods */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", boxShadow: "var(--kravy-shadow-md)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "32px" }}>Payment method</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} /> Cash
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{cashPct.toFixed(0)}% — {sym}{format(payments.CASH.r)}</div>
            </div>
            <div style={{ height: "1px", background: "var(--kravy-border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8B5CF6" }} /> UPI
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{upiPct.toFixed(0)}% — {sym}{format(payments.UPI.r)}</div>
            </div>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", boxShadow: "var(--kravy-shadow-md)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "32px" }}>Cancelled orders</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Cancelled orders</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#EF4444", background: "rgba(239, 68, 68, 0.1)", padding: "4px 12px", borderRadius: "100px" }}>{cancelledCount} orders</div>
            </div>
            <div style={{ height: "1px", background: "var(--kravy-border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Cancelled value</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#EF4444" }}>-{sym}{format(cancelledValue)}</div>
            </div>
            <div style={{ height: "1px", background: "var(--kravy-border)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>Net revenue</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{sym}{format(totalRevenue)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- GST SUMMARY --- */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", boxShadow: "var(--kravy-shadow-md)", overflowX: "auto" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "24px" }}>GST summary</h3>
        <table style={{ width: "100%", borderSpacing: 0, textAlign: "left" }}>
          <thead>
            <tr>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>Rate</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>Taxable amt</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>CGST</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>SGST</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--kravy-border)", color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>Total tax</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "16px", fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>Computed GST</td>
              <td style={{ padding: "16px", fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{sym}{format(gstDetails.taxable)}</td>
              <td style={{ padding: "16px", fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{sym}{format(gstDetails.tax / 2)}</td>
              <td style={{ padding: "16px", fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{sym}{format(gstDetails.tax / 2)}</td>
              <td style={{ padding: "16px", fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{sym}{format(gstDetails.tax)}</td>
            </tr>
            <tr>
              <td style={{ padding: "16px", fontWeight: 950, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>Total</td>
              <td style={{ padding: "16px", fontWeight: 950, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>{sym}{format(gstDetails.taxable)}</td>
              <td style={{ padding: "16px", fontWeight: 950, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>{sym}{format(gstDetails.tax / 2)}</td>
              <td style={{ padding: "16px", fontWeight: 950, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>{sym}{format(gstDetails.tax / 2)}</td>
              <td style={{ padding: "16px", fontWeight: 950, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>{sym}{format(gstDetails.tax)}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

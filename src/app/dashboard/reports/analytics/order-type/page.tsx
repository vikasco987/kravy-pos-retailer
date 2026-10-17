import { getServerCurrency } from '@/lib/server-currency';
import React from "react";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import Link from "next/link";
import { 
  ChevronLeft, Download, Calendar, TrendingUp, Clock, 
  AlertTriangle, Filter, Smartphone, MapPin, Search, 
  Utensils, Bike, ShoppingBag, ArrowUpRight, ArrowDownRight,
  MoreVertical, Sparkles
} from "lucide-react";
import { BillActionsReport } from "../../sales/daily/BillActionsReport";
import OrderTypeCharts from "./OrderTypeCharts";
import CustomDateSelector from "./CustomDateSelector";
import BillTable from "./BillTable";

export default async function OrderTypeAnalyticsPage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const range = params.range || "week";

  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) return <div>Unauthorized</div>;

  const now = new Date();
  let dateFilter: any = {};
  
  if (range === "month") {
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
    startDate.setHours(0, 0, 0, 0);
    dateFilter = { gte: startDate };
  } else if (range === "custom" && params.from && params.to) {
    dateFilter = {
      gte: new Date(params.from + "T00:00:00"),
      lte: new Date(params.to + "T23:59:59")
    };
  } else {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    dateFilter = { gte: startDate };
  }

  const bills = await prisma.billManager.findMany({
    where: {
      clerkUserId: effectiveId,
      isDeleted: false,
      createdAt: dateFilter
    },
    orderBy: { createdAt: "desc" }
  });

  const business = await prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'asc' } });

  // --- ANALYTICS CALCULATIONS ---
  
  const stats = {
    "Dine-in": { revenue: 0, count: 0, cancelled: 0, items: 0 },
    "Delivery": { revenue: 0, count: 0, cancelled: 0, items: 0 },
    "Takeaway": { revenue: 0, count: 0, cancelled: 0, items: 0 }
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyTrends = Array(7).fill(0).map((_, i) => ({
    day: dayNames[i],
    "Dine-in": 0,
    "Delivery": 0,
    "Takeaway": 0
  }));

  const hourlyDistribution = Array(24).fill(0).map((_, i) => ({
    hour: i,
    "Dine-in": 0,
    "Delivery": 0,
    "Takeaway": 0
  }));

  let totalRevenue = 0;
  let totalBills = 0;

  bills.forEach(b => {
    const typeRaw = (b.tableName || "POS").toUpperCase();
    let type: "Dine-in" | "Delivery" | "Takeaway" = "Dine-in";
    if (typeRaw.includes("DELIVERY")) type = "Delivery";
    else if (typeRaw.includes("TAKEAWAY")) type = "Takeaway";

    const isCancelled = b.paymentStatus === "CANCELLED" || b.paymentStatus === "Cancelled";

    if (isCancelled) {
      stats[type].cancelled += b.total;
    } else {
      stats[type].revenue += b.total;
      stats[type].count++;
      totalRevenue += b.total;
      totalBills++;

      // Daily trend (Simplified for Month: showing day-of-week distribution)
      const d = new Date(b.createdAt).getDay();
      const idx = d === 0 ? 6 : d - 1; // Mon-Sun
      dailyTrends[idx][type] += b.total;

      // Hourly
      const h = new Date(b.createdAt).getHours();
      hourlyDistribution[h][type]++;
    }
  });

  const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;
  const peakTypeEntry = Object.entries(stats).reduce((max, [type, data]) => data.revenue > max.revenue ? { type, revenue: data.revenue } : max, { type: "Dine-in", revenue: 0 });

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      
      {/* --- ELITE HEADER --- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/dashboard" style={{
            width: "52px", height: "52px", borderRadius: "18px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", 
            color: "var(--kravy-text-primary)", boxShadow: "var(--kravy-shadow-sm)"
          }}>
            <ChevronLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Order Analytics</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "var(--kravy-text-muted)" }}>
              <Calendar size={16} /> 
              <span>Range: {range === "custom" ? (params.from && params.to ? `${params.from} to ${params.to}` : "Custom") : range === "month" ? "Last 30 Days" : "Last 7 Days"}</span>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--kravy-border)" }} />
              <span style={{ fontWeight: 800, color: "var(--kravy-purple)" }}>ORDER TYPE PULSE</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
           <button style={{ 
             padding: "12px 24px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
             borderRadius: "16px", color: "var(--kravy-text-primary)", fontWeight: 850, fontSize: "0.85rem", 
             display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", 
             boxShadow: "var(--kravy-shadow-sm)" 
           }}>
             <Download size={18} /> Export Data
           </button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div style={{ display: "flex", gap: "8px", background: "var(--kravy-surface)", padding: "6px", borderRadius: "20px", border: "1px solid var(--kravy-border)", width: "fit-content" }}>
         {[
           { label: "This Week", key: "week" },
           { label: "This Month", key: "month" },
           { label: "Custom Range", key: "custom" }
         ].map((t) => (
           <Link 
             key={t.key}
             href={`/dashboard/reports/analytics/order-type?range=${t.key}`}
             style={{
               padding: "10px 24px", borderRadius: "14px", textDecoration: "none",
               background: range === t.key ? "var(--kravy-purple)" : "transparent",
               color: range === t.key ? "white" : "var(--kravy-text-muted)",
               fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s"
             }}
           >
             {t.label}
           </Link>
         ))}
      </div>

      {/* --- CUSTOM DATE SELECTOR --- */}
      {range === "custom" && (
        <div style={{ animation: "slideDown 0.3s ease-out" }}>
           <CustomDateSelector />
        </div>
      )}

      {/* --- TOP METRICS --- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
        {[
          { label: "Total Type Revenue", val: `${sym}${format(totalRevenue)}`, icon: <TrendingUp size={20} color="#10B981" />, bg: "rgba(16, 185, 129, 0.1)" },
          { label: "Avg Order Value", val: `${sym}${format(avgOrderValue)}`, icon: <Sparkles size={20} color="#8B5CF6" />, bg: "rgba(139, 92, 246, 0.1)" },
          { label: "Peak Order Type", val: peakTypeEntry.type, icon: <Utensils size={20} color="#F59E0B" />, bg: "rgba(245, 158, 11, 0.1)" }
        ].map((m, i) => (
          <div key={i} style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "32px", boxShadow: "var(--kravy-shadow-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
               <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)", marginBottom: "8px" }}>{m.label}</div>
               <div style={{ fontSize: "1.8rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>{m.val}</div>
            </div>
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
               {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* --- REVENUE SPLIT & PROGRESS --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }} className="grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
         <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "40px", boxShadow: "var(--kravy-shadow-md)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "32px" }}>In-depth Revenue Split</h3>
            
            {/* Segment Bar */}
            <div style={{ height: "40px", width: "100%", borderRadius: "20px", background: "var(--kravy-bg-2)", display: "flex", overflow: "hidden", marginBottom: "40px" }}>
               <div style={{ width: `${(stats["Dine-in"].revenue / (totalRevenue || 1)) * 100}%`, background: "#10B981" }} />
               <div style={{ width: `${(stats["Delivery"].revenue / (totalRevenue || 1)) * 100}%`, background: "#3B82F6" }} />
               <div style={{ width: `${(stats["Takeaway"].revenue / (totalRevenue || 1)) * 100}%`, background: "#F59E0B" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {[
                  { label: "Dine-in", data: stats["Dine-in"], color: "#10B981", icon: <Utensils size={16} /> },
                  { label: "Delivery", data: stats["Delivery"], color: "#3B82F6", icon: <Bike size={16} /> },
                  { label: "Takeaway", data: stats["Takeaway"], color: "#F59E0B", icon: <ShoppingBag size={16} /> }
                ].map((item, i) => (
                  <div key={i}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                           <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: `${item.color}20`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--kravy-text-primary)" }}>{item.label}</span>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>{item.data.count} orders</span>
                           </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                           <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{sym}{format(item.data.revenue)}</div>
                           <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>{Math.round((item.data.revenue / (totalRevenue || 1)) * 100)}% of total</div>
                        </div>
                     </div>
                     <div style={{ height: "8px", width: "100%", background: "var(--kravy-bg-2)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(item.data.revenue / (totalRevenue || 1)) * 100}%`, background: item.color, borderRadius: "4px" }} />
                     </div>
                  </div>
                ))}
            </div>
         </div>

         <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "40px", boxShadow: "var(--kravy-shadow-md)", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "32px" }}>Average Order Value</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "40px", flex: 1, justifyContent: "center" }}>
               {[
                 { label: "Dine-in", val: stats["Dine-in"].revenue / (stats["Dine-in"].count || 1), color: "#10B981" },
                 { label: "Delivery", val: stats["Delivery"].revenue / (stats["Delivery"].count || 1), color: "#3B82F6" },
                 { label: "Takeaway", val: stats["Takeaway"].revenue / (stats["Takeaway"].count || 1), color: "#F59E0B" }
               ].map((item, i) => (
                 <div key={i} style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", border: `4px solid ${item.color}20`, borderTopColor: item.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 900, color: item.color }}>
                       {Math.round((item.val / (avgOrderValue || 1)) * 100)}%
                    </div>
                    <div>
                       <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)", marginBottom: "4px" }}>{item.label}</div>
                       <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(item.val)}</div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* --- CHARTS ROW --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }} className="grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
         <OrderTypeCharts dailyTrends={dailyTrends} hourlyDistribution={hourlyDistribution} />
      </div>

      {/* --- RECENT BILLS TABLE --- */}
      <BillTable bills={bills} business={business} />

    </div>
  );
}

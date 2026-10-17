import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, Calendar, BarChart3, TrendingUp, TrendingDown, Clock, ArrowRight, Download, Share2, Sparkles, Filter, ChevronRight, Activity, Zap, History } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function PerformanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { view = "daily" } = await searchParams;

  const now = new Date();
  let startOfHistory = new Date(now);
  let pipelineGroup: any;
  let limitCount: number;

  if (view === "daily") {
    startOfHistory.setDate(now.getDate() - 35); // Add a small buffer to ensure we get 30 distinct buckets
    pipelineGroup = {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
      revenue: { $sum: "$total" }
    };
    limitCount = 30;
  } else if (view === "weekly") {
    startOfHistory.setDate(now.getDate() - 90);
    pipelineGroup = {
      _id: {
        year: { $isoWeekYear: { date: "$createdAt", timezone: "Asia/Kolkata" } },
        week: { $isoWeek: { date: "$createdAt", timezone: "Asia/Kolkata" } }
      },
      revenue: { $sum: "$total" }
    };
    limitCount = 12;
  } else {
    // monthly
    startOfHistory.setDate(now.getDate() - 365);
    pipelineGroup = {
      _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } },
      revenue: { $sum: "$total" }
    };
    limitCount = 12;
  }

  const rawAggregation = await prisma.billManager.aggregateRaw({
    pipeline: [
      {
        $match: {
          clerkUserId: effectiveId,
          isDeleted: false,
          createdAt: { $gte: { $date: startOfHistory.toISOString() } }
        }
      },
      { $group: pipelineGroup },
      { $sort: { "_id": -1 } },
      { $limit: limitCount }
    ]
  });

  const parseVal = (v: any) => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "object") {
      if (v.$numberDouble) return Number(v.$numberDouble);
      if (v.$numberInt) return Number(v.$numberInt);
      if (v.$numberLong) return Number(v.$numberLong);
    }
    return Number(v);
  };

  const displayHistory: [string, number][] = [];
  const rawArr = Array.isArray(rawAggregation) ? rawAggregation : [];
  
  for (const obj of rawArr) {
     const revenue = parseVal((obj as any).revenue);
     const _id = (obj as any)._id;
     let label = String(_id);

     if (view === "daily" && typeof _id === "string" && _id.includes("-")) {
        const [y, m, d] = _id.split("-");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        label = `${d} ${months[parseInt(m, 10)-1]} ${y}`;
     } else if (view === "weekly" && typeof _id === "object" && _id !== null) {
        const y = parseVal(_id.year);
        const w = parseVal(_id.week);
        label = `Week ${w} (${y})`;
     } else if (view === "monthly" && typeof _id === "string" && _id.includes("-")) {
        const [y, m] = _id.split("-");
        const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        label = `${fullMonths[parseInt(m, 10)-1]} ${y}`;
     }
     displayHistory.push([label, revenue]);
  }

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/dashboard" style={{
            width: "52px", height: "52px", borderRadius: "18px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-text-primary)",
            boxShadow: "0 8px 16px rgba(0,0,0,0.06)"
          }}>
            <ChevronLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Historical Pulse</h1>
            <p style={{ fontSize: "0.95rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <History size={16} /> Comparative Performance Matrix (Day/Week/Month)
            </p>
          </div>
        </div>
      </div>

      {/* ── View Switcher Tab Hub ── */}
      <div style={{ 
        display: "flex", background: "var(--kravy-surface)", padding: "8px", borderRadius: "24px", 
        border: "1px solid var(--kravy-border)", width: "fit-content", gap: "8px" 
      }}>
        {[
          { label: "Day-wise", id: "daily", icon: <Calendar size={18} /> },
          { label: "Week-wise", id: "weekly", icon: <TrendingUp size={18} /> },
          { label: "Month-wise", id: "monthly", icon: <BarChart3 size={18} /> }
        ].map(tab => (
          <Link 
            key={tab.id}
            href={`/dashboard/reports/performance?view=${tab.id}`}
            style={{ 
              padding: "12px 24px", borderRadius: "18px", textDecoration: "none", fontSize: "0.9rem", fontWeight: 800,
              display: "flex", alignItems: "center", gap: "10px",
              background: view === tab.id ? "var(--kravy-brand)" : "transparent",
              color: view === tab.id ? "white" : "var(--kravy-text-muted)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            {tab.icon} {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Active History Ledger ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "48px", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.06)" }}>
         <div style={{ padding: "40px 52px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)" }}>
            <div>
               <h3 style={{ fontSize: "1.75rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>
                 {view === 'daily' ? 'Day-by-Day Audit' : view === 'weekly' ? 'Weekly Growth Ledger' : 'Monthly Performance Matrix'}
               </h3>
               <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", marginTop: "4px" }}>Verified historical revenue records for the selected cycle</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
               <div style={{ background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)", padding: "12px 24px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "10px" }}>
                  <Activity size={18} style={{ color: "var(--kravy-brand)" }} /> LOGGED EVENTS
               </div>
            </div>
         </div>

         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderSpacing: 0 }}>
               <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                     <th style={{ padding: "28px 24px 28px 52px", textAlign: "left", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px", width: "80px" }}>Sr.</th>
                     <th style={{ padding: "28px 52px", textAlign: "left", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Time Period</th>
                     <th style={{ padding: "28px 52px", textAlign: "left", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Yield Progress</th>
                     <th style={{ padding: "28px 52px", textAlign: "right", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Total Collection</th>
                  </tr>
               </thead>
               <tbody>
                  {displayHistory.map(([label, revenue], i, arr) => {
                     const maxInSet = Math.max(...arr.map(x => Number(x[1])), 1);
                     const percentage = (revenue / maxInSet) * 100;
                     
                     return (
                        <tr key={label} style={{ borderTop: "1px solid var(--kravy-border)", transition: "all 0.2s" }}>
                           <td style={{ padding: "32px 24px 32px 52px", fontSize: "0.9rem", fontWeight: 900, color: "var(--kravy-text-faint)" }}>{String(i + 1).padStart(2, '0')}</td>
                           <td style={{ padding: "32px 52px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                 <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "var(--kravy-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-brand)" }}>
                                    {view === 'daily' ? <Clock size={24} /> : view === 'weekly' ? <TrendingUp size={24} /> : <BarChart3 size={24} />}
                                 </div>
                                 <div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{label}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-faint)", marginTop: "4px" }}>REVENUE CYCLE VERIFIED</div>
                                 </div>
                              </div>
                           </td>
                           <td style={{ padding: "32px 52px" }}>
                              <div style={{ width: "100%", maxWidth: "240px", height: "10px", background: "var(--kravy-bg-2)", borderRadius: "10px", overflow: "hidden" }}>
                                 <div style={{ 
                                    width: `${percentage}%`, 
                                    height: "100%", 
                                    background: percentage === 100 ? "#8B5CF6" : "var(--kravy-brand)",
                                    borderRadius: "10px",
                                    boxShadow: percentage === 100 ? "0 0 15px rgba(139, 92, 246, 0.4)" : "none"
                                 }} />
                              </div>
                              <div style={{ fontSize: "0.75rem", fontWeight: 950, color: "var(--kravy-text-muted)", marginTop: "8px" }}>
                                 {percentage.toFixed(0)}% OF CYCLE PEAK
                              </div>
                           </td>
                           <td style={{ padding: "32px 52px", textAlign: "right" }}>
                              <div style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-3px", lineHeight: 1 }}>{sym}{format(revenue)}</div>
                              <div style={{ fontSize: "0.8rem", fontWeight: 900, color: "#10B981", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                                 <Zap size={14} /> FUNDS CLEARED
                              </div>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
         
         {/* ── Help Dynamic Summary ── */}
         <div style={{ padding: "40px 52px", background: "rgba(0,0,0,0.01)", borderTop: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={22} /></div>
               <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>
                  Historical analytics help you identify long-term scaling trends.
               </div>
            </div>
            <button style={{ padding: "12px 24px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", fontWeight: 900, fontSize: "0.8rem", color: "var(--kravy-text-primary)", cursor: "pointer" }}>
               EXPORT DATA SOURCE
            </button>
         </div>
      </div>
    </div>
  );
}

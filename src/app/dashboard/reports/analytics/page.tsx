import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, BarChart3, TrendingUp, TrendingDown, Clock, MousePointer2, IndianRupee, Zap, Calendar, Download, Info, Target, Sparkles, Filter, ChevronRight, Share2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import DateFilter from "../../components/date-filter";

export const revalidate = 0;

export default async function AdvancedAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam } = await searchParams;
  const rangeStr = rangeParam || "30";
  const range = Number(rangeStr);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - range);

  const allBills = await prisma.billManager.findMany({
    where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      billNumber: true,
      createdAt: true,
      total: true,
      items: true
    }
  });

  const totalRevenue = allBills.reduce((s, b) => s + b.total, 0);
  const totalBills = allBills.length;
  const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  // Hourly stats for today only to show peak hour
  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const todayBills = allBills.filter(b => b.createdAt >= startOfToday);
  
  const hourMap: Record<number, number> = {};
  todayBills.forEach(b => {
    const hour = new Date(b.createdAt).getHours();
    hourMap[hour] = (hourMap[hour] || 0) + 1;
  });
  
  let peakHour = -1;
  let maxOrders = 0;
  Object.entries(hourMap).forEach(([hour, count]) => {
    if (count > maxOrders) {
      maxOrders = count;
      peakHour = Number(hour);
    }
  });

  const peakHourStr = peakHour === -1 
    ? "N/A" 
    : `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`;

  // Category performance
  const categoryMap: Record<string, { revenue: number, count: number }> = {};
  allBills.forEach(bill => {
     let items: any = bill.items;
     if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
     if (items && !Array.isArray(items) && items.items) items = items.items;
     if (Array.isArray(items)) {
        items.forEach((it: any) => {
           const cat = it.category || "Uncategorized";
           const rev = (it.quantity || it.qty || 0) * (it.sellingPrice || it.price || 0);
           if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, count: 0 };
           categoryMap[cat].revenue += rev;
           categoryMap[cat].count += (it.quantity || it.qty || 0);
        });
     }
  });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6);

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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Operational Intelligence</h1>
            <p style={{ fontSize: "0.95rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Zap size={16} style={{ color: "#F59E0B" }} /> Yield Analysis & Business Velocity
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
           <DateFilter />
        </div>
      </div>

      {/* ── Big Metrics Matrix ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
         {/* Yield Card */}
         <div style={{ 
            background: "linear-gradient(135deg, #4338CA 0%, #312E81 100%)", 
            borderRadius: "44px", padding: "48px", color: "white", boxShadow: "0 25px 50px rgba(67, 56, 202, 0.15)",
            position: "relative", overflow: "hidden"
         }}>
            <div style={{ position: "absolute", bottom: "-30px", right: "-30px", opacity: 0.15 }}><BarChart3 size={200} /></div>
            <div style={{ position: "relative", zIndex: 1 }}>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "16px" }}>AVERAGE BILL YIELD</div>
               <div style={{ fontSize: "5rem", fontWeight: 950, letterSpacing: "-4px", lineHeight: 0.82, marginBottom: "24px" }}>{sym}{format(avgOrderValue)}</div>
               <p style={{ fontSize: "1rem", fontWeight: 700, opacity: 0.8 }}>Average revenue recognized per guest session in this {rangeStr}-day cycle.</p>
            </div>
         </div>

         {/* Velocity Card */}
         <div style={{ 
            background: "linear-gradient(135deg, #10B981 0%, #065F46 100%)", 
            borderRadius: "44px", padding: "48px", color: "white", boxShadow: "0 25px 50px rgba(16, 185, 129, 0.15)",
            position: "relative", overflow: "hidden"
         }}>
            <div style={{ position: "absolute", bottom: "-30px", right: "-30px", opacity: 0.15 }}><Clock size={200} /></div>
            <div style={{ position: "relative", zIndex: 1 }}>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "16px" }}>PEAK PERFORMANCE HOUR</div>
               <div style={{ fontSize: "4.5rem", fontWeight: 950, letterSpacing: "-3px", lineHeight: 0.82, marginBottom: "24px" }}>{peakHourStr}</div>
               <p style={{ fontSize: "1rem", fontWeight: 700, opacity: 0.8 }}>The specific hour window where your store detects maximum order frequency.</p>
            </div>
         </div>
      </div>

      {/* ── Mid Section: Insights & Categories ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px" }} className="grid-cols-1 lg:grid-cols-2">
         {/* Category Performance */}
         <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "48px", padding: "48px", boxShadow: "var(--kravy-card-shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
               <h3 style={{ fontSize: "1.5rem", fontWeight: 950, letterSpacing: "-1px", color: "var(--kravy-text-primary)" }}>Category Contribution</h3>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-brand)" }}>TOP REVENUE GENERATORS</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
               {topCategories.map(([cat, stats], i) => (
                  <div key={cat}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                           <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: `hsl(${i * 60}, 70%, 50%)` }} />
                           <span style={{ fontWeight: 850, fontSize: "1.1rem", color: "var(--kravy-text-primary)" }}>{cat}</span>
                        </div>
                        <div style={{ fontWeight: 900, color: "var(--kravy-text-primary)" }}>{sym}{format(stats.revenue)}</div>
                     </div>
                     <div style={{ width: "100%", height: "8px", background: "var(--kravy-bg-2)", borderRadius: "10px" }}>
                        <div style={{ 
                           width: `${(stats.revenue / (topCategories[0][1].revenue || 1)) * 100}%`, 
                           height: "100%", 
                           background: `hsl(${i * 60}, 70%, 50%)`,
                           borderRadius: "10px",
                           transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                        }} />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Smart Insights Stack */}
         <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "40px", padding: "40px", boxShadow: "var(--kravy-card-shadow)", flex: 1 }}>
               <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={24} /></div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>Business Logic Insights</h3>
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {[
                     { label: "Optimal Pricing", text: `Your AOV is ₹${format(avgOrderValue)}. Consider introducing premium combos at ₹${format(avgOrderValue * 1.5)} to boost yield.` },
                     { label: "Traffic Logic", text: `${peakHourStr} is your busiest window. Ensure staff inventory is at 100% capacity during this period.` },
                     { label: "Category Power", text: `${topCategories[0]?.[0] || 'Menu items'} are driving majority of your revenue. Feature them on your front menu.` }
                  ].map((inv, i) => (
                     <div key={i} style={{ padding: "24px", background: "var(--kravy-bg-2)", borderRadius: "24px", border: "1px solid var(--kravy-border)" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 950, color: "#8B5CF6", textTransform: "uppercase", marginBottom: "8px" }}>{inv.label}</div>
                        <div style={{ fontSize: "0.95rem", color: "var(--kravy-text-primary)", fontWeight: 700, lineHeight: 1.5 }}>{inv.text}</div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* ── Transaction Matrix ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "48px", overflow: "hidden", boxShadow: "var(--kravy-card-shadow)" }}>
         <div style={{ padding: "40px 52px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>Yield Ledger</h3>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>{allBills.length} DATA POINTS ANALYZED</div>
         </div>
         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderSpacing: 0 }}>
               <thead>
                  <tr style={{ background: "rgba(0,0,0,0.01)" }}>
                     <th style={{ padding: "24px 24px 24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", width: "80px" }}>Sr.</th>
                     <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Identification</th>
                     <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Yield Value</th>
                     <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Performance</th>
                  </tr>
               </thead>
               <tbody>
                  {allBills.slice(0, 10).map((b, idx) => (
                     <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "all 0.2s" }}>
                        <td style={{ padding: "28px 24px 28px 52px", fontSize: "0.9rem", fontWeight: 900, color: "var(--kravy-text-faint)" }}>{String(idx + 1).padStart(2, '0')}</td>
                        <td style={{ padding: "28px 52px" }}>
                           <div style={{ fontSize: "1.1rem", fontWeight: 950, color: "var(--kravy-text-primary)", fontFamily: "monospace" }}>#{b.billNumber}</div>
                           <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-faint)" }}>{new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                        </td>
                        <td style={{ padding: "28px 52px" }}>
                           <div style={{ fontSize: "1.5rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(b.total)}</div>
                        </td>
                        <td style={{ padding: "28px 52px", textAlign: "right" }}>
                           <span style={{ 
                              padding: "6px 16px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 950,
                              background: b.total >= avgOrderValue ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
                              color: b.total >= avgOrderValue ? "#10B981" : "#F43F5E",
                              border: "1.5px solid currentColor"
                           }}>
                              {b.total >= avgOrderValue ? "ABOVE AVERAGE" : "BELOW AVERAGE"}
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

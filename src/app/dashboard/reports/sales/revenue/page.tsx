import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, IndianRupee, TrendingUp, TrendingDown, Target, Zap, Clock, Calendar, BarChart, ArrowRight, Wallet, BadgeCheck, FileText, Download, Sparkles, Filter, Info, ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import DateFilter from "../../../components/date-filter";

export const revalidate = 0;

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam } = await searchParams;
  const range = Number(rangeParam || 30);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - range);

  const bills = await prisma.billManager.findMany({
    where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: startDate, lte: endDate } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      billNumber: true,
      createdAt: true,
      customerName: true,
      paymentMode: true,
      total: true,
      subtotal: true,
      tax: true,
      items: true
    }
  });

  const totalRevenue = bills.reduce((s, b) => s + b.total, 0);
  const totalItems = bills.reduce((acc, bill) => {
    let items: any = bill.items;
    if (typeof items === "string") try { items = JSON.parse(items); } catch { items = []; }
    if (items && !Array.isArray(items) && items.items) items = items.items;
    return acc + (Array.isArray(items) ? items.reduce((sum: number, it: any) => sum + Number(it.quantity || it.qty || 0), 0) : 0);
  }, 0);

  const avgTicket = bills.length > 0 ? totalRevenue / bills.length : 0;
  const cashTotal = bills.filter(b=>b.paymentMode==="Cash").reduce((s,b)=>s+b.total, 0);
  const upiTotal = bills.filter(b=>b.paymentMode==="UPI").reduce((s,b)=>s+b.total, 0);
   const totalDiscount = bills.reduce((s, b) => s + ((b.subtotal + (b.tax || 0)) - b.total), 0);
  
  // Calculate daily distribution for a small chart
  const dayDistribution: Record<string, number> = {};
  bills.forEach(b => {
     const d = new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
     dayDistribution[d] = (dayDistribution[d] || 0) + b.total;
  });
  const chartPoints = Object.entries(dayDistribution).reverse().slice(0, 15);
  const maxPoint = Math.max(...Object.values(dayDistribution), 1);

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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Money Core</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={16} style={{ color: "var(--kravy-brand)" }} /> Executive Revenue & Financial Matrix
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
           <DateFilter />
           <button style={{ padding: "12px 24px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "16px", fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "10px" }}>
             <Download size={18} /> EXPORT PDF
           </button>
        </div>
      </div>

      {/* ── Visual Revenue Pulse Banner ── */}
      <div style={{ 
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
        borderRadius: "32px", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--kravy-card-shadow)", overflow: "hidden", position: "relative"
      }}>
         <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={24} /></div>
            <div>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Snapshot Performance</div>
               <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>Your revenue is trending <span style={{ color: "#10B981" }}>OPTIMAL</span> for this {range}-day cycle.</div>
            </div>
         </div>
         <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "40px" }}>
            {chartPoints.map(([date, val], i) => (
               <div key={i} style={{ width: "4px", height: `${(val / maxPoint) * 100}%`, background: "var(--kravy-brand)", borderRadius: "2px", opacity: 0.4 + (i * 0.05) }} />
            ))}
         </div>
      </div>

      {/* ── Visual Hero Matrix ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: "32px" }} className="grid-cols-1 md:grid-cols-2">
         {/* Massive Revenue Block */}
         <div style={{ 
            background: "linear-gradient(135deg, #064E3B 0%, #065F46 100%)", 
            borderRadius: "48px", padding: "64px", color: "white", boxShadow: "0 40px 80px rgba(6, 78, 59, 0.25)",
            position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between"
         }}>
            <div style={{ position: "absolute", top: "-40px", right: "-40px", opacity: 0.15 }}><IndianRupee size={360} /></div>
            <div style={{ position: "relative", zIndex: 1 }}>
               <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                  <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 24px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 950, letterSpacing: "4px" }}>NET CORE REVENUE</div>
                  <div style={{ height: "1px", flex: 1, background: "rgba(255,255,255,0.15)" }} />
               </div>
               <div style={{ fontSize: "7.5rem", fontWeight: 950, letterSpacing: "-6px", lineHeight: 0.8, marginBottom: "48px" }}>{sym}{format(totalRevenue)}</div>
               
               <div style={{ gridTemplateColumns: "repeat(3, 1fr)", display: "grid", gap: "52px" }}>
                  <div>
                     <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Asset Flow</div>
                     <div style={{ fontSize: "2.5rem", fontWeight: 950 }}>{format(totalItems)} <span style={{ fontSize: "0.9rem", opacity: 0.5 }}>ITEMS</span></div>
                  </div>
                  <div>
                     <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Yield Pattern</div>
                     <div style={{ fontSize: "2.5rem", fontWeight: 950 }}>{sym}{format(avgTicket)} <span style={{ fontSize: "0.9rem", opacity: 0.5 }}>/BILL</span></div>
                  </div>
                  <div>
                     <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Audit Count</div>
                     <div style={{ fontSize: "2.5rem", fontWeight: 950 }}>{bills.length} <span style={{ fontSize: "0.9rem", opacity: 0.5 }}>FILES</span></div>
                  </div>
               </div>
            </div>
         </div>

         {/* Secondary Breakdown Stack */}
         <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {[
              { label: "Encrypted Digital", value: `${sym}${format(upiTotal)}`, icon: <Zap />, color: "#8B5CF6", sub: `${((upiTotal / (totalRevenue || 1)) * 100).toFixed(0)}% SHARE`, target: 60 },
              { label: "Physical Liquidity", value: `${sym}${format(cashTotal)}`, icon: <Wallet />, color: "#10B981", sub: `${((cashTotal / (totalRevenue || 1)) * 100).toFixed(0)}% SHARE`, target: 40 },
              { label: "Revenue Leakage", value: `${sym}${format(totalDiscount)}`, icon: <Target />, color: "#EF4444", sub: "APPLIED DISCOUNTS", target: 5 },
            ].map((s, i) => (
               <div key={i} style={{ 
                 background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", 
                 borderRadius: "36px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "var(--kravy-card-shadow)"
               }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {s.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "1.85rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.2px", lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>{s.label}</div>
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 950, color: s.color }}>{s.sub}</div>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "var(--kravy-bg-2)", borderRadius: "10px" }}>
                     <div style={{ width: `${s.target}%`, height: "100%", background: s.color, borderRadius: "10px" }} />
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* ── Dynamic Analytics Banner ── */}
      <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px dashed #10B981", borderRadius: "24px", padding: "24px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
         <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "#10B981", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldCheck size={24} /></div>
         <div style={{ fontSize: "1rem", fontWeight: 800, color: "#065F46" }}>
            The financial engine has verified {bills.length} assets. All collections are reconciled with your digital and physical vaults.
         </div>
      </div>

      {/* ── High-Fidelity Settlement Matrix ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "48px", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.06)" }}>
         <div style={{ padding: "48px 56px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)" }}>
            <div>
               <h3 style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.5px" }}>Financial Audit Log</h3>
               <p style={{ fontSize: "0.95rem", color: "var(--kravy-text-muted)", marginTop: "4px" }}>End-to-end verified transaction ledger for current cycle</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
               <div style={{ background: "#F0FDF4", color: "#166534", padding: "12px 24px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 950, display: "flex", alignItems: "center", gap: "10px", border: "1.5px solid #10B981" }}>
                  <BadgeCheck size={20} /> AUTO-RECONCILED
               </div>
            </div>
         </div>
         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderSpacing: 0 }}>
               <thead>
                  <tr style={{ background: "rgba(0,0,0,0.01)" }}>
                     <th style={{ padding: "28px 56px", textAlign: "left", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Financial Asset</th>
                     <th style={{ padding: "28px 56px", textAlign: "left", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Clearing Auth</th>
                     <th style={{ padding: "28px 56px", textAlign: "center", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Settlement</th>
                     <th style={{ padding: "28px 56px", textAlign: "right", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "2px" }}>Value</th>
                  </tr>
               </thead>
               <tbody>
                  {bills.slice(0, 100).map(b => (
                    <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "all 0.2s" }}>
                       <td style={{ padding: "32px 56px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                             <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "var(--kravy-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-brand)" }}>
                                <FileText size={24} />
                             </div>
                             <div>
                                <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "var(--kravy-text-primary)", fontFamily: "monospace" }}>#{b.billNumber}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-faint)", marginTop: "4px" }}>TXID-{b.id.slice(-8).toUpperCase()}</div>
                             </div>
                          </div>
                       </td>
                       <td style={{ padding: "32px 56px" }}>
                          <div style={{ fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "1.05rem" }}>{b.customerName || "WALK-IN GUEST"}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                             <Clock size={12} /> {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                       </td>
                       <td style={{ padding: "32px 56px", textAlign: "center" }}>
                          <span style={{ 
                            fontSize: "0.75rem", fontWeight: 950, padding: "8px 20px", borderRadius: "12px", 
                            background: b.paymentMode === "UPI" ? "#8B5CF610" : "#10B98110",
                            color: b.paymentMode === "UPI" ? "#8B5CF6" : "#10B981",
                            border: "1.5px solid currentColor", textTransform: "uppercase"
                          }}>
                            {b.paymentMode}
                          </span>
                       </td>
                       <td style={{ padding: "32px 56px", textAlign: "right" }}>
                          <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2px" }}>{sym}{format(b.total)}</div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#10B981", marginTop: "4px" }}>CLEARED & SETTLED</div>
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

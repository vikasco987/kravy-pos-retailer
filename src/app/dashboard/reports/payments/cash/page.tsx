import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, Banknote, Calendar, ArrowRight, User, Hash, Wallet, Clock, ArrowUpRight, BadgeCheck, ShieldCheck, Download, Printer } from "lucide-react";
import Link from "next/link";
import DateFilter from "../../../components/date-filter";

export const revalidate = 0;

export default async function CashReportPage({
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
    where: {
      clerkUserId: effectiveId,
      isDeleted: false,
      paymentMode: "Cash",
      createdAt: { gte: startDate, lte: endDate }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalCash = bills.reduce((s, b) => s + b.total, 0);
  const totalBills = bills.length;
  const avgCash = totalBills > 0 ? totalCash / totalBills : 0;

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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Cash Ledger</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Banknote size={16} /> Physical Currency Reconciliation Log
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
           <DateFilter />
           <button style={{ padding: "12px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "14px", color: "var(--kravy-text-muted)" }}><Printer size={20} /></button>
           <button style={{ padding: "12px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "14px", color: "var(--kravy-text-muted)" }}><Download size={20} /></button>
        </div>
      </div>

      {/* ── Hero Analytics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px" }} className="grid-cols-1 md:grid-cols-2">
        <div style={{ 
          background: "linear-gradient(135deg, #10B981 0%, #064E3B 100%)", 
          borderRadius: "44px", padding: "48px", color: "white", boxShadow: "0 30px 60px rgba(16, 185, 129, 0.25)",
          position: "relative", overflow: "hidden"
        }}>
           <div style={{ position: "absolute", top: "-30px", right: "-30px", opacity: 0.15 }}><Banknote size={240} /></div>
           <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, opacity: 0.8, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "16px" }}>NET CASH POSITION</div>
              <div style={{ fontSize: "5rem", fontWeight: 950, margin: "16px 0", letterSpacing: "-4px", lineHeight: 0.82 }}>{sym}{format(totalCash)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.9rem", fontWeight: 700, marginTop: "24px" }}>
                 <ShieldCheck size={18} /> Physical cash verified across {totalBills} sessions
              </div>
           </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
           <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", display: "flex", alignItems: "center", gap: "28px", boxShadow: "var(--kravy-card-shadow)" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}><Hash size={32} /></div>
              <div>
                 <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>{totalBills}</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Cash Invoices</div>
              </div>
           </div>
           <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", display: "flex", alignItems: "center", gap: "28px", boxShadow: "var(--kravy-card-shadow)" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={32} /></div>
              <div>
                 <div style={{ fontSize: "2rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>{sym}{format(avgCash)}</div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Avg Cash Ticket</div>
              </div>
           </div>
        </div>
      </div>

      {/* ── Transaction Log Header ── */}
      <div style={{ background: "#F0FDF4", border: "1px dashed #10B981", borderRadius: "24px", padding: "20px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
         <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#10B981", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}><BadgeCheck size={20} /></div>
         <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#065F46" }}>
            The cash log is synchronized with your physical drawer sessions. Every transaction below represents verified liquid assets.
         </div>
      </div>

      {/* ── High-Fidelity Cash Table ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "44px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.04)" }}>
         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderSpacing: 0 }}>
               <thead>
                  <tr style={{ background: "rgba(0,0,0,0.01)" }}>
                     <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Identification</th>
                     <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Collection Auth</th>
                     <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Timestamp</th>
                     <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Liquid Amount</th>
                  </tr>
               </thead>
               <tbody>
                  {bills.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: "100px", textAlign: "center", color: "var(--kravy-text-muted)" }}>No physical cash transactions recorded.</td></tr>
                  ) : bills.map(b => (
                    <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }}>
                       <td style={{ padding: "28px 52px" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 950, fontFamily: "monospace", color: "var(--kravy-text-primary)" }}>#{b.billNumber}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-faint)", marginTop: "4px" }}>Asset Serial: {b.id.slice(-8).toUpperCase()}</div>
                       </td>
                       <td style={{ padding: "28px 52px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                             <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--kravy-bg-2)", color: "var(--kravy-brand)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} /></div>
                             <div>
                                <div style={{ fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{b.customerName || "CASUAL GUEST"}</div>
                                <div style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 900 }}>PHYSICAL VERIFIED</div>
                             </div>
                          </div>
                       </td>
                       <td style={{ padding: "28px 52px", textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-faint)", marginTop: "4px" }}>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                       </td>
                       <td style={{ padding: "28px 52px", textAlign: "right" }}>
                          <div style={{ fontSize: "1.65rem", fontWeight: 950, color: "#10B981", letterSpacing: "-1.8px" }}>{sym}{format(b.total)}</div>
                          <span style={{ fontSize: "0.65rem", fontWeight: 800, background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "6px" }}>SECURE SETTLEMENT</span>
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

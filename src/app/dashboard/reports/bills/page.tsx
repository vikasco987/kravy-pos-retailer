import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, FileText, Calendar, Filter, Trash2, CheckCircle, IndianRupee, Clock, User, Hash, AlertCircle, ShieldAlert, BadgeCheck, Search, Download } from "lucide-react";
import Link from "next/link";
import DateFilter from "../../components/date-filter";

export const revalidate = 0;

export default async function BillsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam, status = "Active" } = await searchParams;
  const range = Number(rangeParam || 30);
  const isDeletedView = status === "Deleted";

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - range);

  const bills = await prisma.billManager.findMany({
    where: {
      clerkUserId: effectiveId,
      isDeleted: isDeletedView,
      createdAt: { gte: startDate, lte: endDate }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalAmount = bills.reduce((s, b) => s + b.total, 0);
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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Management Audit</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={16} /> Asset Lifecycle & Compliance Tracking
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
           <DateFilter />
           <button style={{ padding: "12px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "14px", color: "var(--kravy-text-muted)" }}><Search size={20} /></button>
           <button style={{ padding: "12px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "14px", color: "var(--kravy-text-muted)" }}><Download size={20} /></button>
        </div>
      </div>

      {/* ── Audit Status Hub ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px" }}>
         {/* Status Switcher Card */}
         <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", boxShadow: "var(--kravy-card-shadow)" }}>
            <h4 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Audit Perspective</h4>
            <div style={{ display: "flex", gap: "10px", background: "var(--kravy-bg-2)", padding: "10px", borderRadius: "20px" }}>
               {[
                 { label: "Active Pool", val: "Active", icon: <CheckCircle size={18} />, color: "var(--kravy-brand)" },
                 { label: "Archive Pool", val: "Deleted", icon: <Trash2 size={18} />, color: "#EF4444" }
               ].map(s => (
                 <Link key={s.val} href={`/dashboard/reports/bills?range=${range}&status=${s.val}`} style={{
                   flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px", borderRadius: "14px",
                   background: status === s.val ? (s.val === "Active" ? "var(--kravy-brand)" : "#EF4444") : "transparent", 
                   color: status === s.val ? "white" : "var(--kravy-text-muted)",
                   textDecoration: "none", fontSize: "0.95rem", fontWeight: 900, transition: "all 0.3s"
                 }}>
                   {s.icon} {s.label}
                 </Link>
               ))}
            </div>
         </div>

         {/* Volume summary */}
         <div style={{ background: isDeletedView ? "#FEF2F2" : "var(--kravy-surface)", border: isDeletedView ? "1px solid #FCA5A5" : "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", boxShadow: "var(--kravy-card-shadow)", display: "flex", alignItems: "center", gap: "32px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "24px", background: isDeletedView ? "#EF4444" : "var(--kravy-brand)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
               {isDeletedView ? <Trash2 size={32} /> : <FileText size={32} />}
            </div>
            <div>
               <div style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{bills.length}</div>
               <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>
                  {isDeletedView ? "Deleted Invoices" : "Live Transactions"}
               </div>
            </div>
         </div>

         {/* Value summary */}
         <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "32px", boxShadow: "var(--kravy-card-shadow)", display: "flex", alignItems: "center", gap: "32px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "24px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <IndianRupee size={32} />
            </div>
            <div>
               <div style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{sym}{format(totalAmount)}</div>
               <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>Combined Value</div>
            </div>
         </div>
      </div>

      {/* ── Analytical List ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "44px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.05)" }}>
         <div style={{ padding: "40px 52px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.01)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <div style={{ padding: "10px 20px", borderRadius: "14px", background: "white", border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertCircle size={20} style={{ color: isDeletedView ? "#EF4444" : "var(--kravy-brand)" }} />
                  <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>System Log Report</span>
               </div>
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>
               {bills.length} RECORDS FOUND IN {range} DAY CYCLE
            </div>
         </div>
         <div style={{ overflowX: "auto" }}>
           <table style={{ width: "100%", borderSpacing: 0 }}>
              <thead>
                 <tr style={{ background: "rgba(0,0,0,0.01)" }}>
                    <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Identification</th>
                    <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Lifecycle Info</th>
                    <th style={{ padding: "24px 52px", textAlign: "center", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Status</th>
                    <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Financial Impact</th>
                 </tr>
              </thead>
              <tbody>
                 {bills.length === 0 ? (
                   <tr><td colSpan={4} style={{ padding: "120px", textAlign: "center" }}>
                      <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--kravy-text-faint)" }}>
                         <Search size={40} />
                      </div>
                      <p style={{ color: "var(--kravy-text-muted)", fontWeight: 800, fontSize: "1.1rem" }}>No audited records found matching this pool.</p>
                      <p style={{ color: "var(--kravy-text-faint)", marginTop: "8px" }}>Try expanding the date range filter.</p>
                   </td></tr>
                 ) : bills.map(b => (
                    <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "all 0.2s" }}>
                       <td style={{ padding: "28px 52px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                             <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: isDeletedView ? "#FEE2E2" : "var(--kravy-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", color: isDeletedView ? "#EF4444" : "var(--kravy-brand)" }}>
                                <FileText size={24} />
                             </div>
                             <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 950, color: "var(--kravy-text-primary)", fontFamily: "monospace" }}>#{b.billNumber}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-faint)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                   <User size={12} /> {b.customerName || "Casual Guest"}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td style={{ padding: "28px 52px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem", fontWeight: 800, color: "var(--kravy-text-secondary)" }}>
                             <Calendar size={16} /> {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.75rem", color: "var(--kravy-text-faint)", marginTop: "6px" }}>
                             <Clock size={14} /> {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                       </td>
                       <td style={{ padding: "28px 52px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", flexDirection: "column", gap: "8px" }}>
                             <span style={{ 
                               fontSize: "0.7rem", fontWeight: 950, letterSpacing: "1px", padding: "6px 20px", 
                               borderRadius: "12px", border: "1.5px solid", 
                               borderColor: isDeletedView ? "#EF4444" : "#10B981",
                               background: isDeletedView ? "#FEF2F2" : "#F0FDF4",
                               color: isDeletedView ? "#EF4444" : "#10B981",
                               textTransform: "uppercase"
                             }}>
                                {isDeletedView ? "DELETED" : "SECURED"}
                             </span>
                             <span style={{ 
                               fontSize: "0.65rem", fontWeight: 900, 
                               padding: "4px 10px", borderRadius: "8px",
                               background: b.paymentMode === 'Wallet' ? '#6366F115' : b.paymentMode === 'UPI' ? '#8B5CF615' : '#10B98115',
                               color: b.paymentMode === 'Wallet' ? '#6366F1' : b.paymentMode === 'UPI' ? '#8B5CF6' : '#10B981',
                               border: '1px solid currentColor'
                             }}>
                               {b.paymentMode.toUpperCase()}
                             </span>
                          </div>
                       </td>
                       <td style={{ padding: "28px 52px", textAlign: "right" }}>
                          <div style={{ fontSize: "1.75rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.8px" }}>{sym}{format(b.total)}</div>
                          {isDeletedView && b.deletedAt && (
                             <div style={{ fontSize: "0.7rem", color: "#EF4444", fontWeight: 900, marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                <BadgeCheck size={12} /> AUDIT TIMESTAMP: {new Date(b.deletedAt).toLocaleDateString()}
                             </div>
                          )}
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

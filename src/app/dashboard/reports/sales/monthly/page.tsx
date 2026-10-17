import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { 
  ChevronLeft, TrendingUp, Clock, IndianRupee, Calendar, Zap, 
  Download, MoreVertical, Smartphone, Banknote, CheckCircle, 
  Search, Filter, X, Eye, Printer, FileText, ShoppingBag, 
  Trash2, MessageCircle, Wallet, CreditCard, Utensils, Sparkles, Target, BarChart3, Users
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

export default async function MonthlySalesReportPage() {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  // 🇮🇳 IST Timezone calculations
  const now = new Date();
  const nowIst = new Date(now.getTime() + 330 * 60000);
  const year = nowIst.getUTCFullYear();
  const month = nowIst.getUTCMonth();
  
  // Start of month in IST, shifted to actual UTC for DB query
  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  startOfMonth.setMinutes(startOfMonth.getMinutes() - 330);

  const currentDay = nowIst.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const bills = await prisma.billManager.findMany({
    where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" }
  });

  const business = await prisma.businessProfile.findFirst({ where: { userId: effectiveId }, orderBy: { createdAt: 'asc' } });

  const totalRevenue = bills.reduce((s, b) => s + b.total, 0);
  const totalBills = bills.length;
  const currentDailyAvg = totalRevenue / currentDay;
  const projectedRevenue = currentDailyAvg * daysInMonth;

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      
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
            <h1 style={{ fontSize: "2.4rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2px", lineHeight: 1, marginBottom: "8px" }}>Monthly Analytics</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "var(--kravy-text-muted)" }}>
              <Calendar size={16} /> 
              <span>Performance for {now.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--kravy-border)" }} />
              <span style={{ fontWeight: 800, color: "#0EA5E9" }}>MONTHLY CYCLE ACTIVE</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
           <button style={{ 
             padding: "14px 28px", background: "#0EA5E9", border: "none", 
             borderRadius: "18px", color: "white", fontWeight: 850, fontSize: "0.85rem", 
             display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", 
             boxShadow: "0 10px 25px rgba(14, 165, 233, 0.25)" 
           }}>
             <Download size={18} /> Export Monthly Ledger
           </button>
        </div>
      </div>

      {/* --- MONTHLY FORECAST BANNER --- */}
      <div style={{ 
        background: "linear-gradient(90deg, rgba(14, 165, 233, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)", 
        border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: "28px", padding: "28px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px"
      }}>
         <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "#0EA5E9", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(14, 165, 233, 0.3)" }}><Sparkles size={24} /></div>
            <div>
               <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0369A1", textTransform: "uppercase", letterSpacing: "1.5px" }}>Performance Forecast</div>
               <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>
                  Projected Revenue for {now.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })}: <span style={{ color: "#0EA5E9" }}>{sym}{format(projectedRevenue)}</span>
               </div>
            </div>
         </div>
         <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Accumulated</div>
               <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(totalRevenue)}</div>
            </div>
            <div style={{ width: "1px", height: "40px", background: "var(--kravy-border)" }} />
            <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Invoices</div>
               <div style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{totalBills}</div>
            </div>
         </div>
      </div>

      {/* --- PROFESSIONAL LEDGER --- */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "44px", overflow: "hidden", boxShadow: "var(--kravy-shadow-lg)" }}>
        <div style={{ padding: "32px 48px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--kravy-bg-2)" }}>
           <h3 style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-0.8px" }}>Elite Monthly Ledger</h3>
           <div style={{ fontSize: "0.8rem", fontWeight: 850, color: "var(--kravy-text-muted)", background: "var(--kravy-surface)", padding: "8px 18px", borderRadius: "12px", border: "1px solid var(--kravy-border)" }}>
             {totalBills} TRANSACTIONS AUDITED
           </div>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderSpacing: 0 }}>
            <thead>
              <tr>
                <Th label="S.No" />
                <Th label="Invoice Identification" />
                <Th label="Source Type" />
                <Th label="Line Items" />
                <Th label="Customer Identity" />
                <Th label="Net Asset Value" isRight />
                <Th label="Verification" />
                <Th label="Actions" isRight />
              </tr>
            </thead>
            <tbody>
              {bills.slice(0, 50).map((b, idx) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }} className="hover:bg-[var(--kravy-bg-2)]">
                  <td style={{ padding: "24px", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-faint)" }}>{String(idx + 1).padStart(2, '0')}</td>
                  <td style={{ padding: "24px" }}>
                    <div style={{ fontWeight: 950, fontFamily: "monospace", color: "#6366F1", fontSize: "1.1rem" }}>#{b.billNumber}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--kravy-text-muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={12} /> {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                      <Clock size={12} style={{ marginLeft: "6px" }} /> {new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </div>
                  </td>
                  <td style={{ padding: "24px" }}>
                    <TypeBadge type={b.tableName || "POS"} />
                  </td>
                  <td style={{ padding: "24px", maxWidth: "300px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {Array.isArray(b.items) && b.items.slice(0, 2).map((item: any, i: number) => (
                        <span key={i} style={{ 
                          fontSize: "0.68rem", fontWeight: 850, padding: "4px 10px", 
                          background: "var(--kravy-bg-2)", color: "var(--kravy-text-secondary)", 
                          borderRadius: "8px", border: "1px solid var(--kravy-border)" 
                        }}>
                          {item.name} <span style={{ color: "#8B5CF6" }}>×{item.qty || item.quantity}</span>
                        </span>
                      ))}
                      {Array.isArray(b.items) && b.items.length > 2 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 850, color: "var(--kravy-text-muted)" }}>+{b.items.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "24px" }}>
                    <div style={{ fontWeight: 850, color: "var(--kravy-text-primary)", fontSize: "0.95rem" }}>{b.customerName || "V.I.P. Guest"}</div>
                    <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--kravy-text-faint)", marginTop: "4px" }}>{b.customerPhone || "NO CONTACT"}</div>
                  </td>
                  <td style={{ padding: "24px", textAlign: "right" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.5px" }}>{sym}{format(b.total)}</div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 850, color: "#10B981", marginTop: "2px", textTransform: "uppercase" }}>Validated</div>
                  </td>
                  <td style={{ padding: "24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       <PaymentBadge mode={b.paymentMode} />
                       <div style={{ 
                         fontSize: "0.62rem", fontWeight: 900, color: b.paymentStatus === "Paid" ? "#10B981" : "#EF4444", 
                         border: `1px solid ${b.paymentStatus === "Paid" ? "#D1FAE5" : "#FEE2E2"}`, 
                         padding: "4px 10px", borderRadius: "8px", width: "fit-content", background: b.paymentStatus === "Paid" ? "#F0FDF4" : "#FEF2F2"
                       }}>
                         ✓ {b.paymentStatus.toUpperCase()}
                       </div>
                    </div>
                  </td>
                  <td style={{ padding: "24px", textAlign: "right" }}>
                     <BillActionsReport billId={b.id} bill={b} business={business} />
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

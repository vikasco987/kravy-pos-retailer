import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import DateFilter from "../../components/date-filter";
import { ChevronLeft, Wallet, CreditCard, Banknote, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function PaymentSplitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; mode?: string; status?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();

  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam, mode: selectedMode = "All", status: selectedStatus = "Active" } = await searchParams;
  const range = Number(rangeParam || 30);

  const endDate = new Date();
  const startDate = new Date();
  
  if (range === 1) {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 2) {
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate.setDate(endDate.getDate() - range);
  }

  const bills = await prisma.billManager.findMany({
    where: {
      clerkUserId: effectiveId,
      isDeleted: selectedStatus === "Deleted",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(selectedMode !== "All" ? { paymentMode: selectedMode } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  const getCollected = (b: any) => {
    const status = (b.paymentStatus || "").toUpperCase();
    if (status === "PAID") return (b.amountPaid != null && b.amountPaid > 0) ? b.amountPaid : (b.total || 0);
    if (["PENDING", "PARTIAL"].includes(status)) return b.amountPaid || 0;
    return 0;
  };

  const totalCollected = bills.reduce((sum, b) => sum + getCollected(b), 0);
  const cashTotal = bills.filter(b => (b.paymentMode || "").toLowerCase().includes("cash")).reduce((sum, b) => sum + getCollected(b), 0);
  const upiTotal = bills.filter(b => (b.paymentMode || "").toLowerCase().includes("upi")).reduce((sum, b) => sum + getCollected(b), 0);
  const cardTotal = bills.filter(b => (b.paymentMode || "").toLowerCase().includes("card")).reduce((sum, b) => sum + getCollected(b), 0);
  const counterTotal = bills.filter(b => (b.paymentMode || "").toLowerCase().includes("counter") || (b.paymentMode || "").toLowerCase().includes("pay on counter")).reduce((sum, b) => sum + getCollected(b), 0);

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/dashboard" style={{
            width: "40px", height: "40px", borderRadius: "12px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--kravy-text-primary)", textDecoration: "none"
          }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>
              {selectedStatus === "Deleted" ? "Deleted History" : (range === 1 ? "Today's Collections Report" : "Recent Sales & Payments Report")}
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontFamily: "monospace" }}>
              {selectedStatus === "Deleted" ? "Review removed or canceled transactions" : (range === 1 ? "Bills and payments recorded today" : "Detailed breakdown of your collections and sales")}
            </p>
          </div>
        </div>
        <DateFilter />
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        {[
          { label: selectedStatus === "Deleted" ? "Deleted Value" : (range === 1 ? "Today's Collection" : "Total Collections"), value: `${sym}${format(totalCollected)}`, icon: <Wallet size={20} />, color: selectedStatus === "Deleted" ? "#EF4444" : "var(--kravy-brand)" },
          { label: "Cash Income", value: `${sym}${format(cashTotal)}`, icon: <Banknote size={20} />, color: "#10B981" },
          { label: "UPI Payments", value: `${sym}${format(upiTotal)}`, icon: <CreditCard size={20} />, color: "#8B5CF6" },
          { label: "Card Sales", value: `${sym}${format(cardTotal)}`, icon: <CreditCard size={20} />, color: "#F59E0B" },
          { label: "Counter Pay", value: `${sym}${format(counterTotal)}`, icon: <Wallet size={20} />, color: "#3B82F6" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
            borderRadius: "20px", padding: "20px", display: "flex", alignItems: "center", gap: "16px",
            boxShadow: "var(--kravy-card-shadow)"
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: `${s.color}15`, border: `1px solid ${s.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center", color: s.color
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--kravy-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

       {/* ── Main Filters Row ── */}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          {/* Mode Tabs */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {["All", "Cash", "UPI", "Card", "Pay on Counter"].map((m) => (
              <Link
                key={m}
                href={`/dashboard/reports/payments?range=${range}&mode=${m}&status=${selectedStatus}`}
                style={{
                  padding: "10px 20px",
                  borderRadius: "14px",
                  background: selectedMode === m ? "var(--kravy-brand)" : "var(--kravy-surface)",
                  color: selectedMode === m ? "white" : "var(--kravy-text-secondary)",
                  border: `1px solid ${selectedMode === m ? "var(--kravy-brand)" : "var(--kravy-border)"}`,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "all 0.2s"
                }}
              >
                {m}
              </Link>
            ))}
          </div>

          {/* Status Toggle */}
          <div style={{ 
            display: "flex", background: "var(--kravy-surface)", padding: "4px", 
            borderRadius: "14px", border: "1px solid var(--kravy-border)" 
          }}>
            {[
              { label: "Active Sales", val: "Active" },
              { label: "Deleted History", val: "Deleted" }
            ].map((s) => (
              <Link
                key={s.val}
                href={`/dashboard/reports/payments?range=${range}&mode=${selectedMode}&status=${s.val}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: selectedStatus === s.val ? (s.val === "Deleted" ? "#EF4444" : "var(--kravy-brand)") : "transparent",
                  color: selectedStatus === s.val ? "white" : "var(--kravy-text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  textDecoration: "none",
                  transition: "all 0.2s"
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>
       </div>

      {/* ── Payments Table ── */}
      <div style={{
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
        borderRadius: "24px", overflow: "hidden", boxShadow: "var(--kravy-card-shadow)"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Bill Number</th>
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Customer</th>
                <th style={{ padding: "18px 24px", textAlign: "center", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Mode</th>
                <th style={{ padding: "18px 24px", textAlign: "center", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Collected / Total</th>
                <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--kravy-text-muted)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "12px" }}>💳</div>
                    <p>No transactions found for this selection.</p>
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }}>
                    <td style={{ padding: "18px 24px" }}>
                       <span style={{ fontWeight: 800, color: "var(--kravy-text-primary)", fontFamily: "monospace", fontSize: "0.85rem" }}>
                         {bill.billNumber}
                       </span>
                    </td>
                    <td style={{ padding: "18px 24px" }}>
                      <div style={{ fontWeight: 700, color: "var(--kravy-text-primary)" }}>{bill.customerName || "Walk-in"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)" }}>{bill.customerPhone || "--"}</div>
                    </td>
                    <td style={{ padding: "18px 24px", textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: "8px", 
                        background: bill.paymentMode === "UPI" ? "#8B5CF615" : bill.paymentMode === "Cash" ? "#10B98115" : "#F59E0B15",
                        color: bill.paymentMode === "UPI" ? "#8B5CF6" : bill.paymentMode === "Cash" ? "#10B981" : "#F59E0B",
                        fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px"
                      }}>
                        {bill.paymentMode}
                      </span>
                    </td>
                    <td style={{ padding: "18px 24px", textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px", borderRadius: "8px", 
                        background: bill.paymentStatus === "Paid" ? "#10B98115" : bill.paymentStatus === "Pending" ? "#F59E0B15" : "#EF444415",
                        color: bill.paymentStatus === "Paid" ? "#10B981" : bill.paymentStatus === "Pending" ? "#F59E0B" : "#EF4444",
                        fontSize: "0.7rem", fontWeight: 800
                      }}>
                        {bill.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: "18px 24px", textAlign: "right" }}>
                      <div style={{ fontWeight: 900, color: getCollected(bill) > 0 ? "#10B981" : "var(--kravy-text-muted)", fontSize: "1rem" }}>
                        {sym}{format(getCollected(bill))}
                      </div>
                      {bill.total !== getCollected(bill) && (
                        <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", fontWeight: 700 }}>
                          Bill Total: {sym}{format(bill.total)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "18px 24px", textAlign: "right", color: "var(--kravy-text-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {bill.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* ── Footer Insight ── */}
       <div style={{
        padding: "24px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
        borderRadius: "24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "var(--kravy-card-shadow)"
      }}>
        <div>
          <h4 style={{ fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "4px" }}>Need more details?</h4>
          <p style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)" }}>Download your complete account statement from settings.</p>
        </div>
        <Link href="/dashboard/billing" style={{
          padding: "12px 24px", background: "var(--kravy-brand)", color: "white", borderRadius: "14px",
          textDecoration: "none", fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px"
        }}>
          Go to Billing <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

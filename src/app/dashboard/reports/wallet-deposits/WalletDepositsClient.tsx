"use client";
import { useCurrency } from '@/lib/currency-context';

import { useState } from "react";
import { ChevronLeft, Search, Calendar, User, Phone, ArrowUpRight, ArrowDownLeft, Plus, Minus, Download, RefreshCw, FileText, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";
import ReportExportDropdown from "@/components/ReportExportDropdown";

interface Transaction {
  id: string;
  type: string; // CREDIT (Deposit), DEBIT (Payment/Withdrawal)
  amount: number;
  description: string | null;
  createdAt: string | Date;
}

interface CustomerLedger {
  id: string;
  name: string;
  phone: string;
  walletBalance: number;
  totalDeposited: number;
  totalUtilized: number;
  transactions: Transaction[];
}

interface TrendItem {
  date?: string;
  week?: string;
  month?: string;
  amount: number;
  count: number;
}

interface Props {
  businessName: string;
  customerLedgerList: CustomerLedger[];
  totalDeposited: number;
  totalUtilized: number;
  activeWalletAdvance: number;
  dailyTrend: TrendItem[];
  weeklyTrend: TrendItem[];
  monthlyTrend: TrendItem[];
  initStartDate: string;
  initEndDate: string;
}

export default function WalletDepositsClient({
  businessName,
  customerLedgerList,
  totalDeposited,
  totalUtilized,
  activeWalletAdvance,
  dailyTrend,
  weeklyTrend,
  monthlyTrend,
  initStartDate,
  initEndDate,
}: Props) {
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();
  const [ledgerList, setLedgerList] = useState<CustomerLedger[]>(customerLedgerList);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  
  // Tab states for trends
  const [trendTab, setTrendTab] = useState<"daily" | "weekly" | "monthly">("daily");

  // Date range filters
  const [startDate, setStartDate] = useState(initStartDate);
  const [endDate, setEndDate] = useState(initEndDate);

  // Manual Adjustment Form state
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdraw">("deposit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  // Compute metrics dynamically from the filtered/loaded list
  const currentTotalAdvance = ledgerList.reduce((sum, c) => sum + c.walletBalance, 0);
  const totalActiveAccounts = ledgerList.filter((c) => c.walletBalance > 0).length;

  const filteredLedger = ledgerList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  const applyDateRange = () => {
    kravy.click();
    const q = new URLSearchParams();
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", endDate);
    router.push(`/dashboard/reports/wallet-deposits?${q.toString()}`);
  };

  const clearDateRange = () => {
    kravy.click();
    setStartDate("");
    setEndDate("");
    router.push("/dashboard/reports/wallet-deposits");
  };

  // Manual Wallet Transaction Submission
  const handleAdjustmentSubmit = async (customerId: string) => {
    if (!adjustAmount || isNaN(Number(adjustAmount)) || Number(adjustAmount) <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    kravy.click();
    setIsSubmitting(true);
    
    const actionType = adjustType === "deposit" ? "deposit" : "withdraw";

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          partyId: customerId,
          amount: Number(adjustAmount),
          description: adjustDesc || (adjustType === "deposit" ? "Manual Deposit" : "Manual Withdrawal"),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        kravy.success();
        
        // Update local ledger view
        setLedgerList((prev) =>
          prev.map((item) => {
            if (item.id === customerId) {
              const updatedTransactions = [
                {
                  id: Math.random().toString(),
                  type: adjustType === "deposit" ? "CREDIT" : "DEBIT",
                  amount: Number(adjustAmount),
                  description: adjustDesc || (adjustType === "deposit" ? "Manual Deposit" : "Manual Withdrawal"),
                  createdAt: new Date().toISOString(),
                },
                ...item.transactions,
              ];
              return {
                ...item,
                walletBalance: data.balance,
                totalDeposited: adjustType === "deposit" ? item.totalDeposited + Number(adjustAmount) : item.totalDeposited,
                totalUtilized: adjustType === "withdraw" ? item.totalUtilized + Number(adjustAmount) : item.totalUtilized,
                transactions: updatedTransactions,
              };
            }
            return item;
          })
        );

        // Reset forms
        setAdjustAmount("");
        setAdjustDesc("");
        alert(`Successfully recorded manual ${adjustType}! New Balance: ₹${data.balance.toFixed(2)}`);
        router.refresh();
      } else {
        kravy.error();
        alert(data.error || "Adjustment failed");
      }
    } catch (e) {
      console.error(e);
      kravy.error();
      alert("Error occurred updating wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Customer List to CSV
  const handleExportCSV = () => {
    kravy.click();
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Customer Name,Phone Number,Wallet Balance,Total Loaded,Total Utilized\n";
      
      ledgerList.forEach((c) => {
        csvContent += `"${c.name}","${c.phone}",${c.walletBalance.toFixed(2)},${c.totalDeposited.toFixed(2)},${c.totalUtilized.toFixed(2)}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `wallet_advances_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export report.");
    }
  };

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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Wallet Deposits & Advance</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={16} style={{ color: "#8B5CF6" }} /> Manage advanced deposit liabilities & user wallets for {businessName}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ReportExportDropdown
            data={filteredLedger}
            columns={[
              { key: "name", label: "Customer Name" },
              { key: "phone", label: "Phone Number" },
              { key: "walletBalance", label: "Wallet Balance ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
              { key: "totalDeposited", label: "Total Loaded ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
              { key: "totalUtilized", label: "Total Utilized ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
            ]}
            filename={`Wallet_Advances_${new Date().toISOString().split("T")[0]}`}
            title="Wallet Deposits & Advances"
          />
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Active Advance Liability</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "#8B5CF6", lineHeight: 1 }}>{sym}{fmt(currentTotalAdvance)}</div>
          <p style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px", fontWeight: 700 }}>Total currently held in customer wallets</p>
        </div>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Total Deposited (Period)</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "#10B981", lineHeight: 1 }}>{sym}{fmt(totalDeposited)}</div>
          <p style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px", fontWeight: 700 }}>Advance loads recorded in date range</p>
        </div>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Total Utilized (Period)</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "#EF4444", lineHeight: 1 }}>{sym}{fmt(totalUtilized)}</div>
          <p style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px", fontWeight: 700 }}>Deducted for POS checkouts / orders</p>
        </div>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Active Customers</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{totalActiveAccounts}</div>
          <p style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", marginTop: "6px", fontWeight: 700 }}>Total customers with balance &gt; 0</p>
        </div>
      </div>

      {/* ── Inflow Trends Dashboard ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>Advance Inflow Analysis</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", marginTop: "4px" }}>Visual analysis of advance loaded into customer wallets</p>
          </div>
          <div style={{ display: "flex", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "4px", gap: "4px" }}>
            <button
              onClick={() => { kravy.click(); setTrendTab("daily"); }}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: trendTab === "daily" ? "var(--kravy-surface)" : "transparent", color: "var(--kravy-text-primary)", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
            >
              Day-on-Day
            </button>
            <button
              onClick={() => { kravy.click(); setTrendTab("weekly"); }}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: trendTab === "weekly" ? "var(--kravy-surface)" : "transparent", color: "var(--kravy-text-primary)", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
            >
              Week-on-Week
            </button>
            <button
              onClick={() => { kravy.click(); setTrendTab("monthly"); }}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: trendTab === "monthly" ? "var(--kravy-surface)" : "transparent", color: "var(--kravy-text-primary)", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
            >
              Month-on-Month
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "280px", overflowY: "auto" }}>
          {trendTab === "daily" && (
            dailyTrend.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "30px" }}>No daily deposits recorded.</div>
            ) : (
              dailyTrend.map((d, i) => {
                const maxVal = Math.max(...dailyTrend.map(x => x.amount), 1);
                const pct = (d.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>
                        {new Date(d.date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ fontWeight: 900, color: "#10B981" }}>{sym}{fmt(d.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({d.count} deposit{d.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #10B981 0%, #059669 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )
          )}

          {trendTab === "weekly" && (
            weeklyTrend.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "30px" }}>No weekly deposits recorded.</div>
            ) : (
              weeklyTrend.map((w, i) => {
                const maxVal = Math.max(...weeklyTrend.map(x => x.amount), 1);
                const pct = (w.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{w.week}</span>
                      <span style={{ fontWeight: 900, color: "#8B5CF6" }}>{sym}{fmt(w.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({w.count} deposit{w.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )
          )}

          {trendTab === "monthly" && (
            monthlyTrend.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "30px" }}>No monthly deposits recorded.</div>
            ) : (
              monthlyTrend.map((m, i) => {
                const maxVal = Math.max(...monthlyTrend.map(x => x.amount), 1);
                const pct = (m.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{m.month}</span>
                      <span style={{ fontWeight: 900, color: "#3B82F6" }}>{sym}{fmt(m.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({m.count} deposit{m.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
        borderRadius: "20px", padding: "16px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px"
      }}>
        <div style={{ position: "relative", flex: "2 1 300px" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--kravy-text-muted)" }} />
          <input
            type="text"
            placeholder="Search wallet ledger by customer name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px 12px 46px",
              borderRadius: "14px", border: "1px solid var(--kravy-border)",
              background: "var(--kravy-bg-2)", color: "var(--kravy-text-primary)",
              fontSize: "0.9rem", outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 auto", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "6px 12px", gap: "8px" }}>
            <Calendar size={14} style={{ color: "var(--kravy-text-muted)" }} />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)" }}
            />
            <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)" }}
            />
          </div>
          <button
            onClick={applyDateRange}
            style={{
              padding: "10px 18px", borderRadius: "14px", background: "var(--kravy-text-primary)", color: "var(--kravy-surface)",
              fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer"
            }}
          >
            Apply Filter
          </button>
          {(initStartDate || initEndDate) && (
            <button
              onClick={clearDateRange}
              style={{
                padding: "10px 18px", borderRadius: "14px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444",
                fontSize: "0.75rem", fontWeight: 850, cursor: "pointer"
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Customer Advances Ledger ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>Customer Wallet Advances Ledger</h2>
          <span style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontWeight: 700 }}>{filteredLedger.length} entries matching</span>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {filteredLedger.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--kravy-text-muted)" }}>
              <FileText size={48} style={{ margin: "0 auto 16px", color: "var(--kravy-text-muted)" }} />
              <p style={{ fontWeight: 800 }}>No matching customer wallet records found.</p>
            </div>
          ) : (
            filteredLedger.map((customer) => {
              const isExpanded = expandedCustomer === customer.id;
              return (
                <div key={customer.id} style={{
                  border: "1px solid var(--kravy-border)",
                  borderRadius: "24px",
                  background: isExpanded ? "var(--kravy-bg-2)" : "var(--kravy-surface)",
                  marginBottom: "16px",
                  overflow: "hidden",
                  transition: "all 0.25s ease"
                }}>
                  {/* Row Summary */}
                  <div 
                    onClick={() => { setExpandedCustomer(isExpanded ? null : customer.id); }}
                    style={{
                      padding: "20px 24px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "14px",
                        background: "rgba(139, 92, 246, 0.08)", color: "#8B5CF6",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <User size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>{customer.name}</h4>
                        <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace" }}><Phone size={12} /> {customer.phone}</span>
                          <span>•</span>
                          <span>Deposited: {sym}{fmt(customer.totalDeposited)}</span>
                          <span>•</span>
                          <span>Utilized: {sym}{fmt(customer.totalUtilized)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 950, color: "#10B981" }}>{sym}{customer.walletBalance.toFixed(2)}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Current Balance</div>
                      </div>
                      <span style={{ color: "var(--kravy-text-muted)", fontSize: "1.2rem", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                        →
                      </span>
                    </div>
                  </div>

                  {/* Expandable Wallet Details & Adjustment Form */}
                  {isExpanded && (
                    <div style={{
                      padding: "24px",
                      borderTop: "1px solid var(--kravy-border)",
                      background: "var(--kravy-surface)",
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
                        
                        {/* Quick Manual Adjustment Form */}
                        <div style={{ background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "20px", padding: "20px" }}>
                          <h5 style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: "0 0 12px 0" }}>Quick Wallet Adjustment</h5>
                          
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                            
                            <div style={{ display: "flex", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "10px", padding: "2px" }}>
                              <button
                                type="button"
                                onClick={() => setAdjustType("deposit")}
                                style={{
                                  padding: "6px 12px", borderRadius: "8px", border: "none",
                                  background: adjustType === "deposit" ? "#10B981" : "transparent",
                                  color: adjustType === "deposit" ? "white" : "var(--kravy-text-primary)",
                                  fontSize: "0.75rem", fontWeight: 800, cursor: "pointer"
                                }}
                              >
                                Deposit
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdjustType("withdraw")}
                                style={{
                                  padding: "6px 12px", borderRadius: "8px", border: "none",
                                  background: adjustType === "withdraw" ? "#EF4444" : "transparent",
                                  color: adjustType === "withdraw" ? "white" : "var(--kravy-text-primary)",
                                  fontSize: "0.75rem", fontWeight: 800, cursor: "pointer"
                                }}
                              >
                                Withdraw
                              </button>
                            </div>

                            <input
                              type="number"
                              placeholder="Amount ({sym})..."
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              style={{
                                width: "120px", padding: "8px 12px", borderRadius: "10px",
                                border: "1px solid var(--kravy-border)", background: "var(--kravy-surface)",
                                color: "var(--kravy-text-primary)", outline: "none", fontSize: "0.8rem", fontWeight: 700
                              }}
                            />

                            <input
                              type="text"
                              placeholder="Description / Remarks..."
                              value={adjustDesc}
                              onChange={(e) => setAdjustDesc(e.target.value)}
                              style={{
                                flex: "1 1 200px", padding: "8px 12px", borderRadius: "10px",
                                border: "1px solid var(--kravy-border)", background: "var(--kravy-surface)",
                                color: "var(--kravy-text-primary)", outline: "none", fontSize: "0.8rem"
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleAdjustmentSubmit(customer.id)}
                              disabled={isSubmitting}
                              style={{
                                padding: "8px 16px", borderRadius: "10px", border: "none",
                                background: "var(--kravy-text-primary)", color: "var(--kravy-surface)",
                                fontSize: "0.75rem", fontWeight: 850, cursor: "pointer"
                              }}
                            >
                              {isSubmitting ? "Updating..." : "Apply"}
                            </button>
                          </div>
                        </div>

                        {/* Customer Transaction Logs */}
                        <div>
                          <h5 style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: "0 0 12px 0" }}>Recent Wallet Logs</h5>
                          {customer.transactions.length === 0 ? (
                            <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontStyle: "italic" }}>No wallet logs recorded yet.</p>
                          ) : (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--kravy-border)" }}>
                                    <th style={{ padding: "8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Type</th>
                                    <th style={{ padding: "8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Amount</th>
                                    <th style={{ padding: "8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Remarks</th>
                                    <th style={{ padding: "8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Timestamp</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customer.transactions.map((tx) => {
                                    const isCredit = tx.type === "CREDIT";
                                    return (
                                      <tr key={tx.id} style={{ borderBottom: "1px solid var(--kravy-border)" }}>
                                        <td style={{ padding: "10px 8px", fontSize: "0.75rem", fontWeight: 800 }}>
                                          <span style={{
                                            padding: "2px 8px", borderRadius: "6px",
                                            background: isCredit ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                                            color: isCredit ? "#10B981" : "#EF4444"
                                          }}>
                                            {isCredit ? "Deposit" : "Payment"}
                                          </span>
                                        </td>
                                        <td style={{ padding: "10px 8px", fontSize: "0.75rem", fontWeight: 800, color: isCredit ? "#10B981" : "#EF4444" }}>
                                          {isCredit ? "+" : "-"} {sym}{tx.amount.toFixed(2)}
                                        </td>
                                        <td style={{ padding: "10px 8px", fontSize: "0.75rem", color: "var(--kravy-text-secondary)" }}>{tx.description || "N/A"}</td>
                                        <td style={{ padding: "10px 8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>
                                          {new Date(tx.createdAt).toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
    </div>
  );
}

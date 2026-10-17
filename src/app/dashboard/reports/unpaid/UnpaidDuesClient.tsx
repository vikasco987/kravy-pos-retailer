"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState, useMemo } from "react";
import { ChevronLeft, AlertCircle, Search, Check, Clock, User, Phone, Calendar, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";
import { useConfirm } from "@/components/ConfirmContext";
import ReportExportDropdown from "@/components/ReportExportDropdown";

interface Bill {
  id: string;
  billNumber: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  createdAt: string;
  tableName: string;
}

interface CustomerDue {
  customerName: string;
  customerPhone: string;
  totalUnpaid: number;
  billsCount: number;
  lastBillDate: Date;
  bills: Bill[];
}

interface TrendItem {
  date?: string;
  week?: string;
  month?: string;
  amount: number;
  count: number;
  startDate?: string;
}

interface Props {
  initialDuesList: CustomerDue[];
  businessName: string;
  dailyTrend: TrendItem[];
  weeklyTrend: TrendItem[];
  monthlyTrend: TrendItem[];
}

export default function UnpaidDuesClient({ 
  initialDuesList, 
  businessName,
  dailyTrend,
  weeklyTrend,
  monthlyTrend,
}: Props) {
  const { confirm } = useConfirm();
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();
  const [duesList, setDuesList] = useState<CustomerDue[]>(initialDuesList);
  const [searchQuery, setSearchQuery] = useState("");
  const [settlingBillId, setSettlingBillId] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Calculate min and max dates from data once
  const [minDateStr, maxDateStr] = useMemo(() => {
    const dts = initialDuesList.flatMap(c => c.bills.map(b => new Date(b.createdAt).getTime()));
    const minT = dts.length > 0 ? Math.min(...dts) : Date.now();
    const maxT = dts.length > 0 ? Math.max(...dts) : Date.now();
    return [new Date(minT).toISOString().split('T')[0], new Date(maxT).toISOString().split('T')[0]];
  }, [initialDuesList]);

  // Date states
  const [cardsStartDate, setCardsStartDate] = useState(minDateStr);
  const [cardsEndDate, setCardsEndDate] = useState(maxDateStr);
  const [tempCardsStartDate, setTempCardsStartDate] = useState(minDateStr);
  const [tempCardsEndDate, setTempCardsEndDate] = useState(maxDateStr);
  const [isCardsLoading, setIsCardsLoading] = useState(false);

  const [dailyStartDate, setDailyStartDate] = useState(minDateStr);
  const [dailyEndDate, setDailyEndDate] = useState(maxDateStr);
  const [tempDailyStartDate, setTempDailyStartDate] = useState(minDateStr);
  const [tempDailyEndDate, setTempDailyEndDate] = useState(maxDateStr);
  const [isDailyLoading, setIsDailyLoading] = useState(false);

  const [weeklyStartDate, setWeeklyStartDate] = useState(minDateStr);
  const [weeklyEndDate, setWeeklyEndDate] = useState(maxDateStr);
  const [tempWeeklyStartDate, setTempWeeklyStartDate] = useState(minDateStr);
  const [tempWeeklyEndDate, setTempWeeklyEndDate] = useState(maxDateStr);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);

  const [monthlyStartDate, setMonthlyStartDate] = useState(minDateStr);
  const [monthlyEndDate, setMonthlyEndDate] = useState(maxDateStr);
  const [tempMonthlyStartDate, setTempMonthlyStartDate] = useState(minDateStr);
  const [tempMonthlyEndDate, setTempMonthlyEndDate] = useState(maxDateStr);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  const [ledgerStartDate, setLedgerStartDate] = useState(minDateStr);
  const [ledgerEndDate, setLedgerEndDate] = useState(maxDateStr);
  const [tempLedgerStartDate, setTempLedgerStartDate] = useState(minDateStr);
  const [tempLedgerEndDate, setTempLedgerEndDate] = useState(maxDateStr);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  const applyFilterWithAnimation = (
    start: string, end: string,
    setStart: (v: string) => void, setEnd: (v: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    kravy.click();
    setLoading(true);
    setTimeout(() => {
      setStart(start);
      setEnd(end);
      setLoading(false);
      kravy.success?.();
    }, 800);
  };

  const renderLoadingOverlay = (isLoading: boolean) => {
    if (!isLoading) return null;
    return (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(10, 10, 10, 0.5)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "inherit", zIndex: 10,
        flexDirection: "column", gap: "12px", animation: "fadeIn 0.2s ease"
      }}>
        <div style={{ width: "36px", height: "36px", border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "#EF4444", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--kravy-surface)", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.5px", animation: "pulse 1.5s infinite" }}>Fetching Data...</span>
      </div>
    );
  };

  const isDateInRange = (dateStr: string | Date, start: string, end: string) => {
    if (!start && !end) return true;
    const d = new Date(dateStr).getTime();
    const s = start ? new Date(start).getTime() : -Infinity;
    const e = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
    return d >= s && d <= e;
  };

  // 1. Cards filtered data
  const cardsFilteredDues = duesList.map(c => {
    const validBills = c.bills.filter(b => isDateInRange(b.createdAt, cardsStartDate, cardsEndDate));
    return { ...c, validBills, billsCount: validBills.length, totalUnpaid: validBills.reduce((s,b)=>s+b.balanceDue, 0) };
  }).filter(c => c.billsCount > 0 && c.totalUnpaid > 0);
  
  const totalOutstanding = cardsFilteredDues.reduce((sum, c) => sum + c.totalUnpaid, 0);
  const totalDebtors = cardsFilteredDues.length;
  const totalPendingBills = cardsFilteredDues.reduce((sum, c) => sum + c.billsCount, 0);

  // 2. Day-on-Day Dues Created
  const filteredDailyTrend = dailyTrend.filter(d => isDateInRange(d.date!, dailyStartDate, dailyEndDate));

  // 3. Week-on-Week Dues Funnel
  const filteredWeeklyTrend = weeklyTrend.filter(w => isDateInRange(w.startDate!, weeklyStartDate, weeklyEndDate));

  // 4. Month-on-Month Dues Funnel
  const filteredMonthlyTrend = monthlyTrend.filter(m => isDateInRange(m.startDate!, monthlyStartDate, monthlyEndDate));

  // 5. Ledger filtered data
  const ledgerFilteredDuesList = duesList.map(c => {
    const validBills = c.bills.filter(b => isDateInRange(b.createdAt, ledgerStartDate, ledgerEndDate));
    return { ...c, bills: validBills, billsCount: validBills.length, totalUnpaid: validBills.reduce((s,b)=>s+b.balanceDue, 0) };
  }).filter(c => c.billsCount > 0 && c.totalUnpaid > 0);

  const filteredDues = ledgerFilteredDuesList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.customerPhone.toLowerCase().includes(q)
    );
  });

  const handleSettleBill = async (billId: string, customerKey: string) => {
    kravy.click();
    setSettlingBillId(billId);
    try {
      let res;
      if (billId.startsWith("wallet-")) {
        const partyId = billId.replace("wallet-", "");
        const customer = duesList.find((c) => {
          return (c.customerPhone && c.customerPhone === customerKey) ||
                 (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
                 (!c.customerPhone && `bill:${c.bills[0]?.id}` === customerKey) ||
                 (!c.customerPhone && `party:${partyId}` === customerKey);
        });
        const bill = customer?.bills.find(b => b.id === billId);
        
        res = await fetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deposit",
            partyId,
            amount: bill?.balanceDue || 0,
            description: "Udhar Cleared (Wallet Deposit)",
          }),
        });
      } else {
        res = await fetch(`/api/bill-manager/${billId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "Paid" }),
        });
      }

      if (res.ok) {
        kravy.success?.();
        // Update local state
        setDuesList((prev) => {
          return prev
            .map((c) => {
              const partyId = billId.startsWith("wallet-") ? billId.replace("wallet-", "") : "";
              const matches = (c.customerPhone && c.customerPhone === customerKey) ||
                (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
                (!c.customerPhone && `bill:${c.bills[0]?.id}` === customerKey) ||
                (!c.customerPhone && `party:${partyId}` === customerKey);
              if (matches) {
                const remainingBills = c.bills.filter((b) => b.id !== billId);
                const unpaidSum = remainingBills.reduce((s, b) => s + b.balanceDue, 0);
                return {
                  ...c,
                  bills: remainingBills,
                  totalUnpaid: unpaidSum,
                  billsCount: remainingBills.length,
                };
              }
              return c;
            })
            .filter((c) => c.billsCount > 0);
        });
        router.refresh();
      } else {
        alert("Failed to settle bill.");
      }
    } catch (e) {
      console.error(e);
      alert("Error settling bill.");
    } finally {
      setSettlingBillId(null);
    }
  };

  const handleSettleAllForCustomer = async (customer: CustomerDue, customerKey: string) => {
    if (!await confirm(`Mark all ${customer.billsCount} pending bills as Paid for ${customer.customerName}?`)) return;
    
    kravy.click();
    for (const b of customer.bills) {
      setSettlingBillId(b.id);
      try {
        if (b.id.startsWith("wallet-")) {
          const partyId = b.id.replace("wallet-", "");
          await fetch("/api/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "deposit",
              partyId,
              amount: b.balanceDue,
              description: "Udhar Cleared (Wallet Deposit)",
            }),
          });
        } else {
          await fetch(`/api/bill-manager/${b.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentStatus: "Paid" }),
          });
        }
      } catch (e) {
        console.error("Failed to settle bill", b.id, e);
      }
    }
    
    kravy.success?.();
    setDuesList((prev) => prev.filter((c) => {
      const matches = (c.customerPhone && c.customerPhone === customerKey) ||
        (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
        (!c.customerPhone && c.bills[0] && `bill:${c.bills[0].id}` === customerKey) ||
        (!c.customerPhone && c.bills[0] && c.bills[0].id.startsWith("wallet-") && `party:${c.bills[0].id.replace("wallet-", "")}` === customerKey);
      return !matches;
    }));
    setSettlingBillId(null);
    router.refresh();
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
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Outstanding Udhaar</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} style={{ color: "#EF4444" }} /> Customer dues ledger for {businessName}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ReportExportDropdown
            data={filteredDues}
            columns={[
              { key: "customerName", label: "Customer Name" },
              { key: "customerPhone", label: "Phone" },
              { key: "totalUnpaid", label: "Total Unpaid ({sym})", format: (val) => val ? val.toString() : "0" },
              { key: "billsCount", label: "Pending Bills" },
              { key: "lastBillDate", label: "Last Bill Date", format: (val) => new Date(val).toLocaleDateString() },
            ]}
            filename={`Unpaid_Dues_${new Date().toISOString().split("T")[0]}`}
            title="Unpaid Dues Report"
          />
          <div style={{ padding: "10px 20px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 800 }}>
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>Overview</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "6px 12px", gap: "8px" }}>
              <Calendar size={14} style={{ color: "var(--kravy-text-muted)" }} />
              <input type="date" value={tempCardsStartDate} onChange={(e) => setTempCardsStartDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
              <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
              <input type="date" value={tempCardsEndDate} onChange={(e) => setTempCardsEndDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
            </div>
            <button 
              onClick={() => applyFilterWithAnimation(tempCardsStartDate, tempCardsEndDate, setCardsStartDate, setCardsEndDate, setIsCardsLoading)}
              style={{ padding: "6px 16px", borderRadius: "10px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer" }}
            >
              Load
            </button>
            {(tempCardsStartDate || tempCardsEndDate || cardsStartDate || cardsEndDate) && <button onClick={() => { setTempCardsStartDate(minDateStr); setTempCardsEndDate(maxDateStr); applyFilterWithAnimation(minDateStr, maxDateStr, setCardsStartDate, setCardsEndDate, setIsCardsLoading); }} style={{ padding: "6px 12px", borderRadius: "10px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444", fontSize: "0.75rem", fontWeight: 850, cursor: "pointer" }}>Clear</button>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", position: "relative" }}>
        {renderLoadingOverlay(isCardsLoading)}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Total Outstanding dues</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "#EF4444", lineHeight: 1 }}>{sym}{fmt(totalOutstanding)}</div>
        </div>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Debtors Count</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{totalDebtors}</div>
        </div>
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "24px", padding: "28px" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Unpaid Bills</div>
          <div style={{ fontSize: "2.25rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{totalPendingBills}</div>
        </div>
      </div>

      {/* ── Dues Trend Funnel Dashboard ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Daily Trend */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px", position: "relative" }}>
          {renderLoadingOverlay(isDailyLoading)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "4px" }}>Day-on-Day Dues Created</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", margin: 0 }}>New outstanding balances generated daily</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "6px 12px", gap: "8px" }}>
                <Calendar size={14} style={{ color: "var(--kravy-text-muted)" }} />
                <input type="date" value={tempDailyStartDate} onChange={(e) => setTempDailyStartDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
                <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
                <input type="date" value={tempDailyEndDate} onChange={(e) => setTempDailyEndDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
              </div>
              <button 
                onClick={() => applyFilterWithAnimation(tempDailyStartDate, tempDailyEndDate, setDailyStartDate, setDailyEndDate, setIsDailyLoading)}
                style={{ padding: "6px 16px", borderRadius: "10px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer" }}
              >
                Load
              </button>
              {(tempDailyStartDate || tempDailyEndDate || dailyStartDate || dailyEndDate) && <button onClick={() => { setTempDailyStartDate(minDateStr); setTempDailyEndDate(maxDateStr); applyFilterWithAnimation(minDateStr, maxDateStr, setDailyStartDate, setDailyEndDate, setIsDailyLoading); }} style={{ padding: "6px 12px", borderRadius: "10px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444", fontSize: "0.75rem", fontWeight: 850, cursor: "pointer" }}>Clear</button>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "250px", overflowY: "auto" }} className="no-scrollbar">
            {filteredDailyTrend.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>No dues trend data in this period.</div>
            ) : (
              filteredDailyTrend.map((d, i) => {
                const maxVal = Math.max(...filteredDailyTrend.map(x => x.amount), 1);
                const pct = (d.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>
                        {new Date(d.date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ fontWeight: 900, color: "#EF4444" }}>{sym}{fmt(d.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({d.count} bill{d.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #EF4444 0%, #DC2626 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px", position: "relative" }}>
          {renderLoadingOverlay(isWeeklyLoading)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "4px" }}>Week-on-Week Dues Funnel</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", margin: 0 }}>Cumulative dues aggregated week-by-week</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "6px 12px", gap: "8px" }}>
                <Calendar size={14} style={{ color: "var(--kravy-text-muted)" }} />
                <input type="date" value={tempWeeklyStartDate} onChange={(e) => setTempWeeklyStartDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
                <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
                <input type="date" value={tempWeeklyEndDate} onChange={(e) => setTempWeeklyEndDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
              </div>
              <button 
                onClick={() => applyFilterWithAnimation(tempWeeklyStartDate, tempWeeklyEndDate, setWeeklyStartDate, setWeeklyEndDate, setIsWeeklyLoading)}
                style={{ padding: "6px 16px", borderRadius: "10px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer" }}
              >
                Load
              </button>
              {(tempWeeklyStartDate || tempWeeklyEndDate || weeklyStartDate || weeklyEndDate) && <button onClick={() => { setTempWeeklyStartDate(minDateStr); setTempWeeklyEndDate(maxDateStr); applyFilterWithAnimation(minDateStr, maxDateStr, setWeeklyStartDate, setWeeklyEndDate, setIsWeeklyLoading); }} style={{ padding: "6px 12px", borderRadius: "10px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444", fontSize: "0.75rem", fontWeight: 850, cursor: "pointer" }}>Clear</button>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "250px", overflowY: "auto" }} className="no-scrollbar">
            {filteredWeeklyTrend.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>No weekly trend data.</div>
            ) : (
              filteredWeeklyTrend.map((w, i) => {
                const maxVal = Math.max(...filteredWeeklyTrend.map(x => x.amount), 1);
                const pct = (w.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{w.week}</span>
                      <span style={{ fontWeight: 900, color: "#EF4444" }}>{sym}{fmt(w.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({w.count} bill{w.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "28px", padding: "28px", position: "relative" }}>
          {renderLoadingOverlay(isMonthlyLoading)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "4px" }}>Month-on-Month Dues</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", margin: 0 }}>Cumulative dues aggregated month-by-month</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", borderRadius: "14px", padding: "6px 12px", gap: "8px" }}>
                <Calendar size={14} style={{ color: "var(--kravy-text-muted)" }} />
                <input type="date" value={tempMonthlyStartDate} onChange={(e) => setTempMonthlyStartDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
                <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
                <input type="date" value={tempMonthlyEndDate} onChange={(e) => setTempMonthlyEndDate(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }} />
              </div>
              <button 
                onClick={() => applyFilterWithAnimation(tempMonthlyStartDate, tempMonthlyEndDate, setMonthlyStartDate, setMonthlyEndDate, setIsMonthlyLoading)}
                style={{ padding: "6px 16px", borderRadius: "10px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer" }}
              >
                Load
              </button>
              {(tempMonthlyStartDate || tempMonthlyEndDate || monthlyStartDate || monthlyEndDate) && <button onClick={() => { setTempMonthlyStartDate(minDateStr); setTempMonthlyEndDate(maxDateStr); applyFilterWithAnimation(minDateStr, maxDateStr, setMonthlyStartDate, setMonthlyEndDate, setIsMonthlyLoading); }} style={{ padding: "6px 12px", borderRadius: "10px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444", fontSize: "0.75rem", fontWeight: 850, cursor: "pointer" }}>Clear</button>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "250px", overflowY: "auto" }} className="no-scrollbar">
            {filteredMonthlyTrend.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>No monthly trend data.</div>
            ) : (
              filteredMonthlyTrend.map((m, i) => {
                const maxVal = Math.max(...filteredMonthlyTrend.map(x => x.amount), 1);
                const pct = (m.amount / maxVal) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "var(--kravy-text-secondary)" }}>{m.month}</span>
                      <span style={{ fontWeight: 900, color: "#EF4444" }}>{sym}{fmt(m.amount)} <span style={{ color: "var(--kravy-text-muted)", fontWeight: 500 }}>({m.count} bill{m.count > 1 ? "s" : ""})</span></span>
                    </div>
                    <div style={{ height: "8px", background: "var(--kravy-bg-2)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)", borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
            placeholder="Search debtors by name or phone number..."
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
              value={tempLedgerStartDate} 
              onChange={(e) => setTempLedgerStartDate(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }}
            />
            <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.75rem" }}>to</span>
            <input 
              type="date" 
              value={tempLedgerEndDate} 
              onChange={(e) => setTempLedgerEndDate(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-primary)", cursor: "pointer" }}
            />
          </div>
          <button 
            onClick={() => applyFilterWithAnimation(tempLedgerStartDate, tempLedgerEndDate, setLedgerStartDate, setLedgerEndDate, setIsLedgerLoading)}
            style={{ padding: "10px 18px", borderRadius: "14px", background: "var(--kravy-text-primary)", color: "var(--kravy-bg)", fontSize: "0.75rem", fontWeight: 850, border: "none", cursor: "pointer" }}
          >
            Load Data
          </button>
          {(tempLedgerStartDate || tempLedgerEndDate || ledgerStartDate || ledgerEndDate) && (
            <button
              onClick={() => { setTempLedgerStartDate(minDateStr); setTempLedgerEndDate(maxDateStr); applyFilterWithAnimation(minDateStr, maxDateStr, setLedgerStartDate, setLedgerEndDate, setIsLedgerLoading); }}
              style={{
                padding: "10px 18px", borderRadius: "14px", background: "transparent", border: "1px solid var(--kravy-border)", color: "#EF4444",
                fontSize: "0.75rem", fontWeight: 850, cursor: "pointer"
              }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* ── Ledger Section ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", position: "relative" }}>
        {renderLoadingOverlay(isLedgerLoading)}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>Debtor Accounts Ledger</h2>
          <span style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontWeight: 700 }}>{filteredDues.length} entries matching</span>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {filteredDues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--kravy-text-muted)" }}>
              <AlertCircle size={48} style={{ margin: "0 auto 16px", color: "var(--kravy-text-muted)" }} />
              <p style={{ fontWeight: 800 }}>No outstanding customer dues found matching search.</p>
            </div>
          ) : (
            filteredDues.map((customer) => {
              const cKey = customer.customerPhone || (customer.bills[0] ? `bill:${customer.bills[0].id}` : `name:${customer.customerName}`);
              const isExpanded = expandedCustomer === cKey;
              return (
                <div key={cKey} style={{
                  border: "1px solid var(--kravy-border)",
                  borderRadius: "24px",
                  background: isExpanded ? "var(--kravy-bg-2)" : "var(--kravy-surface)",
                  marginBottom: "16px",
                  overflow: "hidden",
                  transition: "all 0.25s ease"
                }}>
                  {/* Row Summary */}
                  <div 
                    onClick={() => setExpandedCustomer(isExpanded ? null : cKey)}
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
                        background: "rgba(239, 68, 68, 0.08)", color: "#EF4444",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <User size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--kravy-text-primary)", margin: 0 }}>{customer.customerName}</h4>
                        <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace" }}><Phone size={12} /> {customer.customerPhone || "Walk-in Guest"}</span>
                          <span>•</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> Last bill: {new Date(customer.lastBillDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 950, color: "#EF4444" }}>{sym}{fmt(customer.totalUnpaid)}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--kravy-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{customer.billsCount} unpaid bill{customer.billsCount > 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSettleAllForCustomer(customer, cKey);
                          }}
                          style={{
                            padding: "8px 16px", borderRadius: "10px",
                            background: "rgba(16, 185, 129, 0.12)", color: "#10B981",
                            border: "none", fontSize: "0.75rem", fontWeight: 900,
                            cursor: "pointer"
                          }}
                        >
                          Settle All
                        </button>
                        <span style={{ color: "var(--kravy-text-muted)", fontSize: "1.2rem", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                          →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Bills Details */}
                  {isExpanded && (
                    <div style={{
                      padding: "0 24px 24px",
                      borderTop: "1px solid var(--kravy-border)",
                      background: "var(--kravy-surface)",
                      animation: "slideDown 0.2s ease-out"
                    }}>
                      <div style={{ overflowX: "auto", marginTop: "16px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--kravy-border)" }}>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Bill No</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Date</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Table/Source</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Total</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Amount Paid</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>Balance Due</th>
                              <th style={{ padding: "12px 8px", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customer.bills.map((bill) => (
                              <tr key={bill.id} style={{ borderBottom: "1px solid var(--kravy-border)" }}>
                                <td style={{ padding: "14px 8px", fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace" }}>#{bill.billNumber}</td>
                                <td style={{ padding: "14px 8px", fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>
                                  {new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td style={{ padding: "14px 8px", fontSize: "0.75rem" }}>
                                  <span style={{ padding: "3px 8px", background: "var(--kravy-bg-2)", borderRadius: "6px" }}>{bill.tableName}</span>
                                </td>
                                <td style={{ padding: "14px 8px", fontSize: "0.8rem", fontWeight: 700 }}>{sym}{fmt(bill.total)}</td>
                                <td style={{ padding: "14px 8px", fontSize: "0.8rem", color: "#10B981" }}>{sym}{fmt(bill.amountPaid)}</td>
                                <td style={{ padding: "14px 8px", fontSize: "0.85rem", fontWeight: 900, color: "#EF4444" }}>{sym}{fmt(bill.balanceDue)}</td>
                                <td style={{ padding: "14px 8px", textAlign: "right" }}>
                                  <button
                                    onClick={() => handleSettleBill(bill.id, cKey)}
                                    disabled={settlingBillId === bill.id}
                                    style={{
                                      padding: "6px 12px", borderRadius: "8px",
                                      background: "#10B981", color: "white",
                                      border: "none", fontSize: "0.7rem", fontWeight: 850,
                                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                                      opacity: settlingBillId === bill.id ? 0.7 : 1
                                    }}
                                  >
                                    {settlingBillId === bill.id ? (
                                      <div style={{ width: "10px", height: "10px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                    ) : (
                                      <>
                                        <Check size={10} strokeWidth={3} />
                                        Mark Paid
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useCurrency } from "@/lib/currency-context";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  AlertCircle,
  Search,
  Check,
  User,
  Phone,
  Calendar,
  ArrowRight,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
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
    const dts = initialDuesList.flatMap((c) =>
      c.bills.map((b) => new Date(b.createdAt).getTime())
    );
    const minT = dts.length > 0 ? Math.min(...dts) : Date.now();
    const maxT = dts.length > 0 ? Math.max(...dts) : Date.now();
    return [
      new Date(minT).toISOString().split("T")[0],
      new Date(maxT).toISOString().split("T")[0],
    ];
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
    start: string,
    end: string,
    setStart: (v: string) => void,
    setEnd: (v: string) => void,
    setLoading: (v: boolean) => void
  ) => {
    kravy.click();
    setLoading(true);
    setTimeout(() => {
      setStart(start);
      setEnd(end);
      setLoading(false);
      kravy.success?.();
    }, 600);
  };

  const renderLoadingOverlay = (isLoading: boolean) => {
    if (!isLoading) return null;
    return (
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center rounded-2xl sm:rounded-3xl z-10 flex-col gap-2.5 animate-fadeIn">
        <div className="w-8 h-8 border-3 border-white/20 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-white font-black text-xs uppercase tracking-wider animate-pulse">
          Fetching Data...
        </span>
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
  const cardsFilteredDues = duesList
    .map((c) => {
      const validBills = c.bills.filter((b) =>
        isDateInRange(b.createdAt, cardsStartDate, cardsEndDate)
      );
      return {
        ...c,
        validBills,
        billsCount: validBills.length,
        totalUnpaid: validBills.reduce((s, b) => s + b.balanceDue, 0),
      };
    })
    .filter((c) => c.billsCount > 0 && c.totalUnpaid > 0);

  const totalOutstanding = cardsFilteredDues.reduce((sum, c) => sum + c.totalUnpaid, 0);
  const totalDebtors = cardsFilteredDues.length;
  const totalPendingBills = cardsFilteredDues.reduce((sum, c) => sum + c.billsCount, 0);

  // 2. Day-on-Day Dues Created
  const filteredDailyTrend = dailyTrend.filter((d) =>
    isDateInRange(d.date!, dailyStartDate, dailyEndDate)
  );

  // 3. Week-on-Week Dues Funnel
  const filteredWeeklyTrend = weeklyTrend.filter((w) =>
    isDateInRange(w.startDate!, weeklyStartDate, weeklyEndDate)
  );

  // 4. Month-on-Month Dues Funnel
  const filteredMonthlyTrend = monthlyTrend.filter((m) =>
    isDateInRange(m.startDate!, monthlyStartDate, monthlyEndDate)
  );

  // 5. Ledger filtered data
  const ledgerFilteredDuesList = duesList
    .map((c) => {
      const validBills = c.bills.filter((b) =>
        isDateInRange(b.createdAt, ledgerStartDate, ledgerEndDate)
      );
      return {
        ...c,
        bills: validBills,
        billsCount: validBills.length,
        totalUnpaid: validBills.reduce((s, b) => s + b.balanceDue, 0),
      };
    })
    .filter((c) => c.billsCount > 0 && c.totalUnpaid > 0);

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
          return (
            (c.customerPhone && c.customerPhone === customerKey) ||
            (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
            (!c.customerPhone && `bill:${c.bills[0]?.id}` === customerKey) ||
            (!c.customerPhone && `party:${partyId}` === customerKey)
          );
        });
        const bill = customer?.bills.find((b) => b.id === billId);

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
        setDuesList((prev) => {
          return prev
            .map((c) => {
              const partyId = billId.startsWith("wallet-")
                ? billId.replace("wallet-", "")
                : "";
              const matches =
                (c.customerPhone && c.customerPhone === customerKey) ||
                (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
                (!c.customerPhone && `bill:${c.bills[0]?.id}` === customerKey) ||
                (!c.customerPhone && `party:${partyId}` === customerKey);
              if (matches) {
                const remainingBills = c.bills.filter((b) => b.id !== billId);
                const unpaidSum = remainingBills.reduce(
                  (s, b) => s + b.balanceDue,
                  0
                );
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

  const handleSettleAllForCustomer = async (
    customer: CustomerDue,
    customerKey: string
  ) => {
    if (
      !(await confirm(
        `Mark all ${customer.billsCount} pending bills as Paid for ${customer.customerName}?`
      ))
    )
      return;

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
    setDuesList((prev) =>
      prev.filter((c) => {
        const matches =
          (c.customerPhone && c.customerPhone === customerKey) ||
          (!c.customerPhone && `name:${c.customerName}` === customerKey) ||
          (!c.customerPhone &&
            c.bills[0] &&
            `bill:${c.bills[0].id}` === customerKey) ||
          (!c.customerPhone &&
            c.bills[0] &&
            c.bills[0].id.startsWith("wallet-") &&
            `party:${c.bills[0].id.replace("wallet-", "")}` === customerKey);
        return !matches;
      })
    );
    setSettlingBillId(null);
    router.refresh();
  };

  // Responsive Date Filter Sub-Component
  const renderDateFilter = (
    tempStart: string,
    setTempStart: (v: string) => void,
    tempEnd: string,
    setTempEnd: (v: string) => void,
    curStart: string,
    setCurStart: (v: string) => void,
    curEnd: string,
    setCurEnd: (v: string) => void,
    setLoading: (v: boolean) => void,
    buttonText = "Load"
  ) => {
    const isFiltered =
      Boolean(tempStart || tempEnd || curStart || curEnd) &&
      (curStart !== minDateStr || curEnd !== maxDateStr);

    return (
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <div className="flex items-center bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl px-2.5 py-1.5 gap-1.5 flex-1 sm:flex-initial min-w-0 justify-between">
          <Calendar size={13} className="text-[var(--kravy-text-muted)] shrink-0" />
          <input
            type="date"
            value={tempStart}
            onChange={(e) => setTempStart(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] sm:text-xs font-bold text-[var(--kravy-text-primary)] w-[95px] sm:w-[110px] cursor-pointer"
          />
          <span className="text-[var(--kravy-text-muted)] text-[10px] sm:text-xs font-bold">to</span>
          <input
            type="date"
            value={tempEnd}
            onChange={(e) => setTempEnd(e.target.value)}
            className="bg-transparent border-none outline-none text-[11px] sm:text-xs font-bold text-[var(--kravy-text-primary)] w-[95px] sm:w-[110px] cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() =>
              applyFilterWithAnimation(tempStart, tempEnd, setCurStart, setCurEnd, setLoading)
            }
            className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-[var(--kravy-text-primary)] text-[var(--kravy-bg)] text-[11px] sm:text-xs font-black shadow-xs hover:opacity-90 active:scale-95 transition-all"
          >
            {buttonText}
          </button>
          {isFiltered && (
            <button
              onClick={() => {
                setTempStart(minDateStr);
                setTempEnd(maxDateStr);
                applyFilterWithAnimation(minDateStr, maxDateStr, setCurStart, setCurEnd, setLoading);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--kravy-border)] text-rose-500 hover:bg-rose-500/10 text-[11px] sm:text-xs font-black active:scale-95 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-7 w-full max-w-7xl mx-auto transition-colors pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--kravy-border)]/60">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] shadow-xs hover:bg-[var(--kravy-bg-2)] active:scale-95 transition-all shrink-0"
            title="Back to Dashboard"
          >
            <ChevronLeft size={22} className="sm:w-6 sm:h-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight leading-tight truncate">
              Outstanding Udhaar
            </h1>
            <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
              <AlertCircle size={14} className="text-rose-500 shrink-0" />
              <span className="truncate">Customer dues ledger for {businessName}</span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
          <ReportExportDropdown
            data={filteredDues}
            columns={[
              { key: "customerName", label: "Customer Name" },
              { key: "customerPhone", label: "Phone" },
              {
                key: "totalUnpaid",
                label: `Total Unpaid (${sym})`,
                format: (val) => (val ? val.toString() : "0"),
              },
              { key: "billsCount", label: "Pending Bills" },
              {
                key: "lastBillDate",
                label: "Last Bill Date",
                format: (val) => new Date(val).toLocaleDateString(),
              },
            ]}
            filename={`Unpaid_Dues_${new Date().toISOString().split("T")[0]}`}
            title="Unpaid Dues Report"
          />
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black text-[var(--kravy-text-primary)] shadow-xs whitespace-nowrap">
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* ── Overview Metrics Section ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h2 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)] tracking-tight">
            Overview
          </h2>
          {renderDateFilter(
            tempCardsStartDate,
            setTempCardsStartDate,
            tempCardsEndDate,
            setTempCardsEndDate,
            cardsStartDate,
            setCardsStartDate,
            cardsEndDate,
            setCardsEndDate,
            setIsCardsLoading,
            "Load"
          )}
        </div>

        {/* Metrics Cards Grid - Smart Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 relative">
          {renderLoadingOverlay(isCardsLoading)}

          {/* Card 1: Total Outstanding (Full width on mobile for big impact, col 1 on desktop) */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-1.5">
              Total Outstanding Dues
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-500 tracking-tight truncate">
              {sym}{fmt(totalOutstanding)}
            </div>
          </div>

          {/* Card 2 & 3: Mobile 2-column subgrid so they sit side-by-side on mobile screens! */}
          <div className="grid grid-cols-2 sm:contents gap-3">
            {/* Card 2: Debtors Count */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-1.5 truncate">
                Debtors Count
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                {totalDebtors}
              </div>
            </div>

            {/* Card 3: Unpaid Bills */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[var(--kravy-text-muted)] block mb-1.5 truncate">
                Unpaid Bills
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                {totalPendingBills}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dues Trend Funnel Section (Responsive Cards Grid) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Daily Trend */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs relative flex flex-col">
          {renderLoadingOverlay(isDailyLoading)}
          <div className="flex flex-col gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                Day-on-Day Dues
              </h3>
              <p className="text-[11px] text-[var(--kravy-text-muted)]">
                Outstanding balances generated daily
              </p>
            </div>
            {renderDateFilter(
              tempDailyStartDate,
              setTempDailyStartDate,
              tempDailyEndDate,
              setTempDailyEndDate,
              dailyStartDate,
              setDailyStartDate,
              dailyEndDate,
              setDailyEndDate,
              setIsDailyLoading,
              "Load"
            )}
          </div>
          <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar flex-1">
            {filteredDailyTrend.length === 0 ? (
              <div className="text-xs text-[var(--kravy-text-muted)] italic text-center py-8">
                No dues trend data in this period.
              </div>
            ) : (
              filteredDailyTrend.map((d, i) => {
                const maxVal = Math.max(...filteredDailyTrend.map((x) => x.amount), 1);
                const pct = (d.amount / maxVal) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--kravy-text-secondary)]">
                        {new Date(d.date!).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="font-black text-rose-500">
                        {sym}{fmt(d.amount)}{" "}
                        <span className="text-[var(--kravy-text-muted)] font-normal text-[10px]">
                          ({d.count})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--kravy-bg-2)] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs relative flex flex-col">
          {renderLoadingOverlay(isWeeklyLoading)}
          <div className="flex flex-col gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                Week-on-Week Dues
              </h3>
              <p className="text-[11px] text-[var(--kravy-text-muted)]">
                Cumulative dues aggregated weekly
              </p>
            </div>
            {renderDateFilter(
              tempWeeklyStartDate,
              setTempWeeklyStartDate,
              tempWeeklyEndDate,
              setTempWeeklyEndDate,
              weeklyStartDate,
              setWeeklyStartDate,
              weeklyEndDate,
              setWeeklyEndDate,
              setIsWeeklyLoading,
              "Load"
            )}
          </div>
          <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar flex-1">
            {filteredWeeklyTrend.length === 0 ? (
              <div className="text-xs text-[var(--kravy-text-muted)] italic text-center py-8">
                No weekly trend data.
              </div>
            ) : (
              filteredWeeklyTrend.map((w, i) => {
                const maxVal = Math.max(...filteredWeeklyTrend.map((x) => x.amount), 1);
                const pct = (w.amount / maxVal) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--kravy-text-secondary)]">
                        {w.week}
                      </span>
                      <span className="font-black text-violet-500">
                        {sym}{fmt(w.amount)}{" "}
                        <span className="text-[var(--kravy-text-muted)] font-normal text-[10px]">
                          ({w.count})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--kravy-bg-2)] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs relative flex flex-col md:col-span-2 lg:col-span-1">
          {renderLoadingOverlay(isMonthlyLoading)}
          <div className="flex flex-col gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                Month-on-Month Dues
              </h3>
              <p className="text-[11px] text-[var(--kravy-text-muted)]">
                Cumulative dues aggregated monthly
              </p>
            </div>
            {renderDateFilter(
              tempMonthlyStartDate,
              setTempMonthlyStartDate,
              tempMonthlyEndDate,
              setTempMonthlyEndDate,
              monthlyStartDate,
              setMonthlyStartDate,
              monthlyEndDate,
              setMonthlyEndDate,
              setIsMonthlyLoading,
              "Load"
            )}
          </div>
          <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar flex-1">
            {filteredMonthlyTrend.length === 0 ? (
              <div className="text-xs text-[var(--kravy-text-muted)] italic text-center py-8">
                No monthly trend data.
              </div>
            ) : (
              filteredMonthlyTrend.map((m, i) => {
                const maxVal = Math.max(...filteredMonthlyTrend.map((x) => x.amount), 1);
                const pct = (m.amount / maxVal) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--kravy-text-secondary)]">
                        {m.month}
                      </span>
                      <span className="font-black text-amber-500">
                        {sym}{fmt(m.amount)}{" "}
                        <span className="text-[var(--kravy-text-muted)] font-normal text-[10px]">
                          ({m.count})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--kravy-bg-2)] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]"
          />
          <input
            type="text"
            placeholder="Search debtors by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] text-xs sm:text-sm font-semibold outline-none focus:border-rose-500 transition-colors placeholder:text-[var(--kravy-text-muted)]"
          />
        </div>

        {renderDateFilter(
          tempLedgerStartDate,
          setTempLedgerStartDate,
          tempLedgerEndDate,
          setTempLedgerEndDate,
          ledgerStartDate,
          setLedgerStartDate,
          ledgerEndDate,
          setLedgerEndDate,
          setIsLedgerLoading,
          "Load Data"
        )}
      </div>

      {/* ── Debtor Accounts Ledger Section ── */}
      <div className="rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] overflow-hidden shadow-xs relative">
        {renderLoadingOverlay(isLedgerLoading)}

        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--kravy-border)] flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)]">
            Debtor Accounts Ledger
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-[var(--kravy-bg-2)] text-[11px] sm:text-xs font-extrabold text-[var(--kravy-text-muted)]">
            {filteredDues.length} {filteredDues.length === 1 ? "entry" : "entries"} matching
          </span>
        </div>

        {/* Ledger List */}
        <div className="p-3 sm:p-6 space-y-3">
          {filteredDues.length === 0 ? (
            <div className="text-center py-16 px-4">
              <AlertCircle size={40} className="mx-auto mb-3 text-[var(--kravy-text-muted)] opacity-60" />
              <p className="text-sm font-black text-[var(--kravy-text-muted)]">
                No outstanding customer dues found.
              </p>
            </div>
          ) : (
            filteredDues.map((customer) => {
              const cKey =
                customer.customerPhone ||
                (customer.bills[0]
                  ? `bill:${customer.bills[0].id}`
                  : `name:${customer.customerName}`);
              const isExpanded = expandedCustomer === cKey;

              return (
                <div
                  key={cKey}
                  className={`border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl transition-all duration-200 overflow-hidden shadow-xs ${
                    isExpanded
                      ? "bg-[var(--kravy-bg-2)] ring-1 ring-[var(--kravy-border-strong)]"
                      : "bg-[var(--kravy-surface)] hover:border-[var(--kravy-border-strong)]"
                  }`}
                >
                  {/* Customer Card Header Row */}
                  <div
                    onClick={() => setExpandedCustomer(isExpanded ? null : cKey)}
                    className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none"
                  >
                    {/* Left: Avatar & Customer info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                        <User size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)] truncate leading-tight">
                          {customer.customerName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] sm:text-xs text-[var(--kravy-text-muted)] font-semibold">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={11} className="shrink-0" />
                            <span className="truncate max-w-[130px] sm:max-w-none">
                              {customer.customerPhone || "Walk-in Guest"}
                            </span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar size={11} className="shrink-0" />
                            <span>
                              Last:{" "}
                              {new Date(customer.lastBillDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Outstanding Amount & Action Buttons (Flawlessly positioned on mobile) */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--kravy-border)]/70">
                      <div className="text-left sm:text-right min-w-0">
                        <div className="text-base sm:text-xl font-black text-rose-500 tracking-tight leading-none truncate">
                          {sym}{fmt(customer.totalUnpaid)}
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-extrabold text-[var(--kravy-text-muted)] uppercase tracking-wider mt-0.5">
                          {customer.billsCount} unpaid bill{customer.billsCount > 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSettleAllForCustomer(customer, cKey);
                          }}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black shadow-xs active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Check size={13} strokeWidth={3} />
                          <span>Settle All</span>
                        </button>
                        <span
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-muted)] transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        >
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Expandable Bills List ── */}
                  {isExpanded && (
                    <div className="p-3 sm:p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] animate-slideDown">
                      {/* Mobile View: Compact Cards (< 640px) */}
                      <div className="sm:hidden space-y-2.5">
                        {customer.bills.map((bill) => (
                          <div
                            key={bill.id}
                            className="p-3 rounded-xl bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs font-mono font-black">
                              <span className="text-[var(--kravy-text-primary)]">
                                #{bill.billNumber}
                              </span>
                              <span className="text-[10px] text-[var(--kravy-text-muted)] font-sans font-bold">
                                {new Date(bill.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="px-2 py-0.5 rounded bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[10px] font-bold text-[var(--kravy-text-muted)]">
                                {bill.tableName}
                              </span>
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--kravy-text-muted)] mr-1">
                                  Due:
                                </span>
                                <span className="font-black text-rose-500">
                                  {sym}{fmt(bill.balanceDue)}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-[var(--kravy-border)]/60 flex items-center justify-between text-xs">
                              <div className="text-[11px] text-[var(--kravy-text-muted)]">
                                Total: {sym}{fmt(bill.total)} • Paid: {sym}{fmt(bill.amountPaid)}
                              </div>
                              <button
                                onClick={() => handleSettleBill(bill.id, cKey)}
                                disabled={settlingBillId === bill.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                              >
                                {settlingBillId === bill.id ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Check size={11} strokeWidth={3} />
                                    <span>Mark Paid</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop View: Full Data Table (>= 640px) */}
                      <div className="hidden sm:block overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--kravy-border)] text-[11px] font-extrabold uppercase text-[var(--kravy-text-muted)]">
                              <th className="py-2.5 px-3">Bill No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Table/Source</th>
                              <th className="py-2.5 px-3">Total</th>
                              <th className="py-2.5 px-3">Amount Paid</th>
                              <th className="py-2.5 px-3">Balance Due</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--kravy-border)]/60 text-xs">
                            {customer.bills.map((bill) => (
                              <tr key={bill.id} className="hover:bg-[var(--kravy-bg-2)]/40 transition-colors">
                                <td className="py-3 px-3 font-mono font-black text-[var(--kravy-text-primary)]">
                                  #{bill.billNumber}
                                </td>
                                <td className="py-3 px-3 text-[var(--kravy-text-muted)] font-medium">
                                  {new Date(bill.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-[var(--kravy-bg-2)] text-[11px] font-bold text-[var(--kravy-text-secondary)]">
                                    {bill.tableName}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-bold text-[var(--kravy-text-primary)]">
                                  {sym}{fmt(bill.total)}
                                </td>
                                <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                  {sym}{fmt(bill.amountPaid)}
                                </td>
                                <td className="py-3 px-3 font-black text-rose-500">
                                  {sym}{fmt(bill.balanceDue)}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleSettleBill(bill.id, cKey)}
                                    disabled={settlingBillId === bill.id}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                                  >
                                    {settlingBillId === bill.id ? (
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        <Check size={11} strokeWidth={3} />
                                        <span>Mark Paid</span>
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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}

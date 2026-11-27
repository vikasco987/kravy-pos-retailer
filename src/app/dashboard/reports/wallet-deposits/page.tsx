import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import WalletDepositsClient from "./WalletDepositsClient";

export const revalidate = 0;

export default async function WalletDepositsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) redirect("/auth/custom");

  const params = await searchParams;
  const { startDate, endDate } = params;

  // Build date-range query filters
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const dateQuery = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  // 1. Fetch Business Profile
  const profile = await prisma.businessProfile.findFirst({
    where: { userId: effectiveId },
    orderBy: { createdAt: 'asc' }
  });
  const businessName = profile?.businessName || "Your Business";

  // 2. Fetch all parties (customers) created by this merchant
  const parties = await prisma.party.findMany({
    where: { createdBy: effectiveId },
    orderBy: { name: "asc" },
  });

  // 3. Fetch all Wallet Transactions for this merchant (both deposits & payments)
  const walletTransactions = await prisma.walletTransaction.findMany({
    where: {
      clerkId: effectiveId,
      ...dateQuery,
    },
    include: {
      party: {
        select: {
          name: true,
          phone: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Calculate stats
  // We sum manual deposits or refunds loaded (type === "CREDIT") vs payments/debits (type === "DEBIT")
  let totalDeposited = 0;
  let totalUtilized = 0;

  walletTransactions.forEach((tx) => {
    if (tx.type === "CREDIT") {
      totalDeposited += tx.amount;
    } else if (tx.type === "DEBIT") {
      totalUtilized += tx.amount;
    }
  });

  const activeWalletAdvance = parties.reduce((sum, p) => sum + (p.walletBalance || 0), 0);

  // 5. Aggregate trends (for CREDIT/deposits only, or overall)
  // The user asked for "week-on-week kitna advance aaya tha, month-on-month kitna aaya, day-on-day kitna aaya" -> deposit inflows!
  const dailyInflowMap = new Map<string, { date: string; amount: number; count: number }>();
  const weeklyInflowMap = new Map<string, { week: string; amount: number; count: number }>();
  const monthlyInflowMap = new Map<string, { month: string; amount: number; count: number }>();

  const getWeekRangeString = (date: Date) => {
    const temp = new Date(date);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(temp.setDate(diff));
    return `Week of ${startOfWeek.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
  };

  const getMonthString = (date: Date) => {
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  walletTransactions.forEach((tx) => {
    if (tx.type !== "CREDIT") return; // Inflow only

    const amount = tx.amount;

    // Daily Inflow
    const dateStr = tx.createdAt.toISOString().split("T")[0];
    const daily = dailyInflowMap.get(dateStr);
    if (daily) {
      daily.amount += amount;
      daily.count += 1;
    } else {
      dailyInflowMap.set(dateStr, { date: dateStr, amount, count: 1 });
    }

    // Weekly Inflow
    const weekStr = getWeekRangeString(tx.createdAt);
    const weekly = weeklyInflowMap.get(weekStr);
    if (weekly) {
      weekly.amount += amount;
      weekly.count += 1;
    } else {
      weeklyInflowMap.set(weekStr, { week: weekStr, amount, count: 1 });
    }

    // Monthly Inflow
    const monthStr = getMonthString(tx.createdAt);
    const monthly = monthlyInflowMap.get(monthStr);
    if (monthly) {
      monthly.amount += amount;
      monthly.count += 1;
    } else {
      monthlyInflowMap.set(monthStr, { month: monthStr, amount, count: 1 });
    }
  });

  const dailyTrend = Array.from(dailyInflowMap.values())
    .sort((a, b) => b.date.localeCompare(a.date));

  const weeklyTrend = Array.from(weeklyInflowMap.values())
    .sort((a, b) => b.week.localeCompare(a.week));

  const monthlyTrend = Array.from(monthlyInflowMap.values())
    .sort((a, b) => b.month.localeCompare(a.month)); // chronological sorting roughly

  // Group transactions by customer/party for display
  const customerLedgerMap = new Map<string, {
    id: string;
    name: string;
    phone: string;
    walletBalance: number;
    totalDeposited: number;
    totalUtilized: number;
    transactions: typeof walletTransactions;
  }>();

  // Initialize map with all parties
  parties.forEach((p) => {
    customerLedgerMap.set(p.id, {
      id: p.id,
      name: p.name,
      phone: p.phone,
      walletBalance: p.walletBalance || 0,
      totalDeposited: 0,
      totalUtilized: 0,
      transactions: [],
    });
  });

  // Fill in transaction details
  walletTransactions.forEach((tx) => {
    const existing = customerLedgerMap.get(tx.partyId);
    if (existing) {
      existing.transactions.push(tx);
      if (tx.type === "CREDIT") {
        existing.totalDeposited += tx.amount;
      } else if (tx.type === "DEBIT") {
        existing.totalUtilized += tx.amount;
      }
    }
  });

  const customerLedgerList = Array.from(customerLedgerMap.values())
    .sort((a, b) => b.walletBalance - a.walletBalance);

  return (
    <WalletDepositsClient
      businessName={businessName}
      customerLedgerList={customerLedgerList}
      totalDeposited={totalDeposited}
      totalUtilized={totalUtilized}
      activeWalletAdvance={activeWalletAdvance}
      dailyTrend={dailyTrend}
      weeklyTrend={weeklyTrend}
      monthlyTrend={monthlyTrend}
      initStartDate={startDate || ""}
      initEndDate={endDate || ""}
    />
  );
}

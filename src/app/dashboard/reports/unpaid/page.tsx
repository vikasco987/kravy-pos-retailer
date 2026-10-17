import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import UnpaidDuesClient from "./UnpaidDuesClient";

export const revalidate = 0;

export default async function UnpaidDuesReportPage() {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) redirect("/auth/custom");

  // Fetch all active unpaid/pending bills
  const unpaidBills = await prisma.billManager.findMany({
    where: {
      clerkUserId: effectiveId,
      isDeleted: false,
      paymentStatus: { notIn: ["PAID", "Paid", "CANCELLED", "Cancelled"] },
    },
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      customerPhone: true,
      total: true,
      amountPaid: true,
      balanceDue: true,
      paymentStatus: true,
      paymentMode: true,
      createdAt: true,
      tableName: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch profile for business name
  const profile = await prisma.businessProfile.findFirst({
    where: { userId: effectiveId },
    orderBy: { createdAt: 'asc' }
  });
  const businessName = profile?.businessName || "Your Restaurant";

  // Fetch all customers with negative wallet balance (Udhar)
  // Since wallet updates don't easily map to the same `createdAt` filter as bills,
  // we typically consider current wallet balance regardless of date range, 
  // or use the date filter on party.updatedAt. For simplicity and accuracy of "current dues", we fetch all negative balances.
  const negativeWalletParties = await prisma.party.findMany({
    where: {
      createdBy: effectiveId,
      walletBalance: { lt: 0 },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      walletBalance: true,
      createdAt: true,
    }
  });

  // Group by customer
  const customerUnpaidMap = new Map<string, {
    customerName: string;
    customerPhone: string;
    totalUnpaid: number;
    billsCount: number;
    lastBillDate: Date;
    bills: Array<{
      id: string;
      billNumber: string;
      total: number;
      amountPaid: number;
      balanceDue: number;
      paymentStatus: string;
      createdAt: string;
      tableName: string;
    }>;
  }>();

  // Helper structures for trends
  const dailyDuesMap = new Map<string, { date: string; amount: number; count: number }>();
  const weeklyDuesMap = new Map<string, { week: string; amount: number; count: number; startDate: string }>();
  const monthlyDuesMap = new Map<string, { month: string; amount: number; count: number; startDate: string }>();

  const getWeekRangeData = (date: Date) => {
    const temp = new Date(date);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(temp.setDate(diff));
    return {
      label: `Week of ${startOfWeek.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
      startDate: startOfWeek.toISOString()
    };
  };

  const getMonthRangeData = (date: Date) => {
    const temp = new Date(date);
    const month = temp.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const startDate = new Date(temp.getFullYear(), temp.getMonth(), 1).toISOString();
    return {
      label: month,
      startDate
    };
  };

  unpaidBills.forEach((b) => {
    const phone = b.customerPhone?.trim() || "";
    const name = b.customerName?.trim() || "";

    const due = (b.balanceDue && b.balanceDue > 0) ? b.balanceDue : (b.total - (b.amountPaid || 0));
    const pendingAmt = Math.max(0, due);
    if (pendingAmt <= 0) return; // Skip bills with zero remaining balance

    // Dynamic key: registered customers grouped by phone, unregistered/walk-ins listed as unique entries
    let key = "";
    let displayName = "";
    if (phone) {
      key = phone;
      displayName = name || "Registered Customer";
    } else {
      key = `bill:${b.id}`;
      displayName = name ? `${name} (Bill #${b.billNumber})` : `Walk-in Guest (Bill #${b.billNumber})`;
    }

    const billObj = {
      id: b.id,
      billNumber: b.billNumber,
      total: b.total,
      amountPaid: b.amountPaid || 0,
      balanceDue: pendingAmt,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt.toISOString(),
      tableName: b.tableName || "POS",
    };

    // 1. Grouping into debtor list
    const existing = customerUnpaidMap.get(key);
    if (existing) {
      existing.totalUnpaid += pendingAmt;
      existing.billsCount += 1;
      existing.bills.push(billObj);
      if (b.createdAt > existing.lastBillDate) {
        existing.lastBillDate = b.createdAt;
      }
    } else {
      customerUnpaidMap.set(key, {
        customerName: displayName,
        customerPhone: phone,
        totalUnpaid: pendingAmt,
        billsCount: 1,
        lastBillDate: b.createdAt,
        bills: [billObj],
      });
    }

    // 2. Accumulate daily trend
    const dateStr = b.createdAt.toISOString().split("T")[0];
    const daily = dailyDuesMap.get(dateStr);
    if (daily) {
      daily.amount += pendingAmt;
      daily.count += 1;
    } else {
      dailyDuesMap.set(dateStr, { date: dateStr, amount: pendingAmt, count: 1 });
    }

    // 3. Accumulate weekly trend
    const weekInfo = getWeekRangeData(b.createdAt);
    const weekly = weeklyDuesMap.get(weekInfo.label);
    if (weekly) {
      weekly.amount += pendingAmt;
      weekly.count += 1;
    } else {
      weeklyDuesMap.set(weekInfo.label, { week: weekInfo.label, amount: pendingAmt, count: 1, startDate: weekInfo.startDate });
    }

    // 4. Accumulate monthly trend
    const monthInfo = getMonthRangeData(b.createdAt);
    const monthly = monthlyDuesMap.get(monthInfo.label);
    if (monthly) {
      monthly.amount += pendingAmt;
      monthly.count += 1;
    } else {
      monthlyDuesMap.set(monthInfo.label, { month: monthInfo.label, amount: pendingAmt, count: 1, startDate: monthInfo.startDate });
    }
  });

  // 4. Process negative wallet balances
  negativeWalletParties.forEach((party) => {
    if (party.walletBalance === null || party.walletBalance >= 0) return;

    const phone = party.phone?.trim() || "";
    const name = party.name?.trim() || "";
    const pendingAmt = Math.abs(party.walletBalance);
    
    const key = phone || `party:${party.id}`;
    const displayName = name || "Registered Customer";

    const mockBill = {
      id: `wallet-${party.id}`,
      billNumber: "WALLET",
      total: pendingAmt,
      amountPaid: 0,
      balanceDue: pendingAmt,
      paymentStatus: "Unpaid",
      createdAt: party.createdAt.toISOString(),
      tableName: "Wallet Advance",
    };

    const existing = customerUnpaidMap.get(key);
    if (existing) {
      existing.totalUnpaid += pendingAmt;
      existing.billsCount += 1;
      existing.bills.push(mockBill);
      if (party.createdAt > existing.lastBillDate) {
        existing.lastBillDate = party.createdAt;
      }
    } else {
      customerUnpaidMap.set(key, {
        customerName: displayName,
        customerPhone: phone,
        totalUnpaid: pendingAmt,
        billsCount: 1,
        lastBillDate: party.createdAt,
        bills: [mockBill],
      });
    }

    // Accumulate daily trend for wallet udhar
    const dateStr = party.createdAt.toISOString().split("T")[0];
    const daily = dailyDuesMap.get(dateStr);
    if (daily) {
      daily.amount += pendingAmt;
      daily.count += 1;
    } else {
      dailyDuesMap.set(dateStr, { date: dateStr, amount: pendingAmt, count: 1 });
    }

    // Accumulate weekly trend for wallet udhar
    const weekInfo = getWeekRangeData(party.createdAt);
    const weekly = weeklyDuesMap.get(weekInfo.label);
    if (weekly) {
      weekly.amount += pendingAmt;
      weekly.count += 1;
    } else {
      weeklyDuesMap.set(weekInfo.label, { week: weekInfo.label, amount: pendingAmt, count: 1, startDate: weekInfo.startDate });
    }

    // Accumulate monthly trend for wallet udhar
    const monthInfo = getMonthRangeData(party.createdAt);
    const monthly = monthlyDuesMap.get(monthInfo.label);
    if (monthly) {
      monthly.amount += pendingAmt;
      monthly.count += 1;
    } else {
      monthlyDuesMap.set(monthInfo.label, { month: monthInfo.label, amount: pendingAmt, count: 1, startDate: monthInfo.startDate });
    }
  });

  const customerUnpaidList = Array.from(customerUnpaidMap.values())
    .filter((c) => c.totalUnpaid > 0)
    .sort((a, b) => b.totalUnpaid - a.totalUnpaid);

  const dailyTrend = Array.from(dailyDuesMap.values())
    .sort((a, b) => b.date.localeCompare(a.date));

  const weeklyTrend = Array.from(weeklyDuesMap.values())
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const monthlyTrend = Array.from(monthlyDuesMap.values())
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <UnpaidDuesClient 
      initialDuesList={customerUnpaidList} 
      businessName={businessName}
      dailyTrend={dailyTrend}
      weeklyTrend={weeklyTrend}
      monthlyTrend={monthlyTrend}
    />
  );
}

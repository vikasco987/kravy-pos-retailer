import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";

import StatsGrid from "./components/stats-grid";
import RevenueChart from "./components/revenue-chart";
import RecentBills from "./components/recent-bills";
import TopItems from "./components/top-items";
import DateFilter from "./components/date-filter";
import PaymentModeChart from "./components/payment-mode-chart";
import OrderTypeChart from "./components/order-type-chart";
import PeakHoursChart from "./components/peak-hours-chart";
import WeeklyRevenueChart from "./components/weekly-revenue-chart";
import DashboardSoundAlerts from "./components/dashboard-sound-alerts";
import { Sparkles, Tag, Fingerprint, Copy, ShieldCheck, Zap, Smartphone, Ticket, ArrowRight, FileText, Grid, BarChart3 } from "lucide-react";
import CopyButton from "./components/copy-button";
import ManualRefresh from "./components/manual-refresh";

export const revalidate = 0;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; type?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();

  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam, from, to, type } = await searchParams;
  let range = Number(rangeParam || 1);

  const endDate = new Date();
  const startDate = new Date();
  
  if (from && to) {
    startDate.setTime(new Date(from).getTime());
    endDate.setTime(new Date(to).getTime());
    range = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (type === "this_month") {
    startDate.setDate(1);
    startDate.setHours(0,0,0,0);
    range = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (type === "last_month") {
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(1);
    startDate.setHours(0,0,0,0);
    endDate.setDate(0);
    endDate.setHours(23,59,59,999);
    range = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (range === 1) {
    // Today: From 00:00 AM to Now
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 2) {
    // Yesterday: From 00:00 AM yesterday to 11:59 PM yesterday
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Last X days
    startDate.setDate(endDate.getDate() - range);
    startDate.setHours(0,0,0,0);
  }

  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - range);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0,0,0,0);
    return d;
  });

  const last7Start = last7Days[0];

  const [
    bills,
    previousStats,
    deletedBillsData,
    activeCombosCount,
    activeOffersCount,
    daySaleStats,
    weekSaleStats,
    monthSaleStats,
    weeklyBills,
    preRangeCustomerBills,
    activeOrderCount,
    completedTodayCount,
    allUnpaidBills,
    walletStats,
    walletUsersCount
  ] = await Promise.all([
    prisma.billManager.findMany({
      where: {
        clerkUserId: effectiveId,
        isDeleted: false,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        billNumber: true,
        customerName: true,
        customerPhone: true,
        paymentMode: true,
        paymentStatus: true,
        amountPaid: true,
        balanceDue: true,
        total: true,
        createdAt: true,
        items: true,
        tokenNumber: true,
        tableName: true,
      },
    }),
    prisma.billManager.findMany({
      where: {
        clerkUserId: effectiveId,
        isDeleted: false,
        paymentStatus: { in: ["PAID", "Paid", "PENDING", "Pending", "PARTIAL", "Partial"] },
        createdAt: {
          gte: previousStart,
          lt: startDate,
        },
      },
      select: { total: true, amountPaid: true, paymentStatus: true },
    }),
    prisma.billManager.findMany({
      where: { clerkUserId: effectiveId, isDeleted: true },
      orderBy: { deletedAt: "desc" },
      take: 5,
      select: {
        id: true,
        billNumber: true,
        customerName: true,
        paymentMode: true,
        total: true,
        createdAt: true,
        items: true,
      },
    }),
    prisma.combo.count({ where: { clerkUserId: effectiveId, isActive: true } }),
    prisma.offer.count({ where: { clerkUserId: effectiveId, isActive: true } }),
    prisma.billManager.findMany({
      where: { clerkUserId: effectiveId, isDeleted: false, paymentStatus: { in: ["PAID", "Paid", "PENDING", "Pending", "PARTIAL", "Partial"] }, createdAt: { gte: startOfDay } },
      select: { total: true, amountPaid: true, paymentStatus: true },
    }),
    prisma.billManager.findMany({
      where: { clerkUserId: effectiveId, isDeleted: false, paymentStatus: { in: ["PAID", "Paid", "PENDING", "Pending", "PARTIAL", "Partial"] }, createdAt: { gte: startOfWeek } },
      select: { total: true, amountPaid: true, paymentStatus: true },
    }),
    prisma.billManager.findMany({
      where: { clerkUserId: effectiveId, isDeleted: false, paymentStatus: { in: ["PAID", "Paid", "PENDING", "Pending", "PARTIAL", "Partial"] }, createdAt: { gte: startOfMonth } },
      select: { total: true, amountPaid: true, paymentStatus: true },
    }),
    prisma.billManager.findMany({
      where: { clerkUserId: effectiveId, isDeleted: false, paymentStatus: { in: ["PAID", "Paid"] }, createdAt: { gte: last7Start } },
      select: { total: true, createdAt: true },
    }),
    prisma.billManager.findMany({
      where: {
        clerkUserId: effectiveId,
        isDeleted: false,
        createdAt: { lt: startDate },
        customerPhone: { not: null },
      },
      distinct: ['customerPhone'],
      select: { customerPhone: true },
    }),
    prisma.order.count({
      where: { clerkUserId: effectiveId, status: { not: "COMPLETED" } }
    }),
    prisma.billManager.count({
      where: { clerkUserId: effectiveId, isDeleted: false, paymentStatus: { in: ["PAID", "Paid"] }, createdAt: { gte: startOfDay } }
    }),
    prisma.billManager.findMany({
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
    }),
    prisma.party.aggregate({
      where: { createdBy: effectiveId, status: "ACTIVE" },
      _sum: { walletBalance: true },
    }),
    prisma.party.count({
      where: { createdBy: effectiveId, status: "ACTIVE", walletBalance: { gt: 0 } },
    }),
  ]);

  const calculateSale = (billList: any[]) => billList.reduce((sum, b) => {
    if (b.paymentStatus?.toUpperCase() === "PAID") return sum + b.total;
    if (["PENDING", "PARTIAL"].includes(b.paymentStatus?.toUpperCase() || "")) return sum + (b.amountPaid || 0);
    return sum;
  }, 0);

  // Use the same fetched bills for current stats to save a duplicate query
  const currentStats = bills.filter(b => ["PAID", "PENDING", "PARTIAL"].includes(b.paymentStatus?.toUpperCase() || ""));
  const totalRevenue = calculateSale(currentStats);
  const totalBills = bills.length;

  // Filter bills to only include paid and partially paid bills for revenue/breakdown computations
  const revenueBills = bills.filter((b: any) => ["paid", "partial", "pending"].includes(b.paymentStatus?.toLowerCase() || ""));

  let cash = 0;
  let upi = 0;

  revenueBills.forEach((bill: any) => {
    const amountToAdd = bill.paymentStatus?.toLowerCase() === "paid" ? bill.total : (bill.amountPaid || 0);
    const mode = (bill.paymentMode || "").toLowerCase();
    
    if (mode.startsWith("split (")) {
      const cashMatch = mode.match(/cash:\s*₹?\s*([\d.]+)/);
      if (cashMatch && cashMatch[1]) {
        cash += parseFloat(cashMatch[1]);
      }
      
      const upiMatch = mode.match(/upi:\s*₹?\s*([\d.]+)/);
      if (upiMatch && upiMatch[1]) {
        upi += parseFloat(upiMatch[1]);
      }
    } else {
      if (mode.includes("cash")) cash += amountToAdd;
      if (mode.includes("upi")) upi += amountToAdd;
    }
  });

  // Compute Store Unpaid Udhaar Dues
  const totalUnpaidAmount = allUnpaidBills.reduce((sum: number, b: any) => {
    const due = (b.balanceDue && b.balanceDue > 0) ? b.balanceDue : (b.total - (b.amountPaid || 0));
    return sum + Math.max(0, due);
  }, 0);

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
    }>;
  }>();

  allUnpaidBills.forEach((b: any) => {
    const phone = b.customerPhone?.trim() || "";
    const name = b.customerName?.trim() || "Walk-in Guest";
    const key = phone || `name:${name}`;

    const due = (b.balanceDue && b.balanceDue > 0) ? b.balanceDue : (b.total - (b.amountPaid || 0));
    const pendingAmt = Math.max(0, due);

    const existing = customerUnpaidMap.get(key);
    const billObj = {
      id: b.id,
      billNumber: b.billNumber,
      total: b.total,
      amountPaid: b.amountPaid || 0,
      balanceDue: pendingAmt,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt.toISOString(),
    };

    if (existing) {
      existing.totalUnpaid += pendingAmt;
      existing.billsCount += 1;
      existing.bills.push(billObj);
      if (b.createdAt > existing.lastBillDate) {
        existing.lastBillDate = b.createdAt;
      }
    } else {
      customerUnpaidMap.set(key, {
        customerName: name,
        customerPhone: phone,
        totalUnpaid: pendingAmt,
        billsCount: 1,
        lastBillDate: b.createdAt,
        bills: [billObj],
      });
    }
  });

  const customerUnpaidList = Array.from(customerUnpaidMap.values())
    .sort((a, b) => b.totalUnpaid - a.totalUnpaid);

  // Compute Store Wallet Advance
  const totalWalletAdvance = walletStats._sum.walletBalance || 0;
  const walletCustomersCount = walletUsersCount || 0;

  const previousRevenue = calculateSale(previousStats);
  const growth = previousRevenue === 0 ? 100 : ((totalRevenue - previousRevenue) / previousRevenue) * 100;

  // Chart Mapping (Paid and partially paid bills)
  const chartMap: Record<string, { revenue: number; bills: number }> = {};
  revenueBills.forEach((bill: any) => {
    const amountToAdd = bill.paymentStatus?.toLowerCase() === "paid" ? bill.total : (bill.amountPaid || 0);
    const date = bill.createdAt.toISOString().split("T")[0];
    if (!chartMap[date]) chartMap[date] = { revenue: 0, bills: 0 };
    chartMap[date].revenue += amountToAdd;
    chartMap[date].bills += 1;
  });

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue: chartMap[date].revenue,
      bills: chartMap[date].bills,
    }));

  const recentBills = bills.slice(0, 10).map((bill: any) => ({
    id: bill.id,
    billNumber: bill.billNumber,
    customerName: bill.customerName ?? undefined,
    customerPhone: bill.customerPhone ?? undefined,
    paymentMode: bill.paymentMode,
    total: bill.total,
    createdAt: bill.createdAt.toISOString(),
    items: bill.items,
    tokenNumber: bill.tokenNumber,
    tableName: bill.tableName,
    isOrder: bill.isOrder,
    orderStatus: bill.orderStatus,
  }));

  const deletedBills = deletedBillsData.map((bill: any) => ({
    id: bill.id,
    billNumber: bill.billNumber,
    customerName: bill.customerName,
    paymentMode: bill.paymentMode,
    total: bill.total,
    createdAt: bill.createdAt.toISOString(),
    items: bill.items,
  }));

  const itemMap: Record<string, { totalSold: number; totalRevenue: number }> = {};
  bills.forEach((bill: any) => {
    let items: any = bill.items;
    if (typeof items === "string") {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    if (items && !Array.isArray(items) && items.items) items = items.items;

    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        const name = item?.name || "Unknown";
        const quantity = Number(item?.quantity ?? item?.qty ?? 0);
        
        // Robust price detection to match Quick POS logic
        const sPrice = Number(item?.sellingPrice);
        const bPrice = Number(item?.price);
        const rPrice = Number(item?.rate);
        
        const price = !isNaN(sPrice) && item.sellingPrice !== null ? sPrice 
                   : !isNaN(rPrice) && item.rate !== null ? rPrice
                   : !isNaN(bPrice) ? bPrice : 0;

        if (!itemMap[name]) itemMap[name] = { totalSold: 0, totalRevenue: 0 };
        itemMap[name].totalSold += quantity;
        itemMap[name].totalRevenue += (quantity * price);
      });
    }
  });

  const topItems = Object.keys(itemMap)
    .map((name) => ({
      name,
      totalSold: itemMap[name].totalSold,
      totalRevenue: itemMap[name].totalRevenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 8);

  const isGrowthPositive = growth > 0;
  const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;
  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  // ── Calculate Day, Week, and Month Sales ──
  const daySale = calculateSale(daySaleStats);
  const weekSale = calculateSale(weekSaleStats);
  const monthSale = calculateSale(monthSaleStats);

  // ── Calculate Dynamic Customer Stats (New vs Repeat for the selected RANGE) ──
  const currentRangeBills = bills;

  const preRangePhones = new Set(preRangeCustomerBills.map(b => b.customerPhone).filter(Boolean));
  const currentRangeIdentifiableBills = currentRangeBills.filter(b => b.customerPhone);
  const currentRangeUniquePhones = new Set(currentRangeIdentifiableBills.map(b => b.customerPhone));
  const currentRangeAnonymousCount = currentRangeBills.filter(b => !b.customerPhone).length;

  let rangeRepeatCount = 0;
  let rangeNewCount = 0;

  currentRangeUniquePhones.forEach(phone => {
    if (preRangePhones.has(phone)) {
      rangeRepeatCount++;
    } else {
      rangeNewCount++;
    }
  });

  const totalRangeCustomers = currentRangeUniquePhones.size + currentRangeAnonymousCount;

  // ── Calculate Peak Hour Today (Keep this for Today specifically or for the Range) ──
  // User asked for "today" specifically in previous step, but let's make it for the range if needed? 
  // Usually Peak Hour is most useful for 'Today'. I'll keep it for the selected 'bills'.
  const hourMap: Record<number, number> = {};
  currentRangeBills.forEach(b => {
    const hour = new Date(b.createdAt).getHours();
    hourMap[hour] = (hourMap[hour] || 0) + 1;
  });
  
  let peakHour = -1;
  let maxOrders = 0;
  Object.entries(hourMap).forEach(([hour, count]) => {
    if (count > maxOrders) {
      maxOrders = count;
      peakHour = Number(hour);
    }
  });

  const peakHourStr = peakHour === -1 
    ? "No data" 
    : `${peakHour % 12 || 12} ${peakHour >= 12 ? 'PM' : 'AM'}`;

  // ── Calculate Peak Day Matrix (Weekly Distribution) ──
  const dayNameMap: Record<string, number> = { 
    'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0 
  };
  
  bills.forEach(b => {
    const dayName = new Date(b.createdAt).toLocaleDateString('en-IN', { weekday: 'long' });
    dayNameMap[dayName] = (dayNameMap[dayName] || 0) + b.total;
  });

  const peakDayEntry = Object.entries(dayNameMap).sort((a,b) => b[1] - a[1])[0];
  const peakDayName = peakDayEntry[1] > 0 ? peakDayEntry[0] : "No data";

  // ── Calculate Order Type Breakdown ──
  const orderTypeBreakdown = {
    DELIVERY: { count: 0, total: 0 },
    TAKEAWAY: { count: 0, total: 0 },
    DINEIN: { count: 0, total: 0 },
  };

  bills.forEach((bill: any) => {
    const type = bill.tableName || "POS";
    if (type === "DELIVERY") {
      orderTypeBreakdown.DELIVERY.count++;
      orderTypeBreakdown.DELIVERY.total += bill.total;
    } else if (type === "TAKEAWAY") {
      orderTypeBreakdown.TAKEAWAY.count++;
      orderTypeBreakdown.TAKEAWAY.total += bill.total;
    } else {
      orderTypeBreakdown.DINEIN.count++;
      orderTypeBreakdown.DINEIN.total += bill.total;
    }
  });

  // ── Calculate Peak Hours Time Series ──
  const peakHoursData = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 9; // 9 AM to 11 PM
    const count = hourMap[hour] || 0;
    return {
      hour,
      count,
      label: `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}`
    };
  });

  const weeklyData = last7Days.map(date => {
    const dayBills = weeklyBills.filter(b => {
      const bDate = new Date(b.createdAt);
      return bDate.getDate() === date.getDate() && 
             bDate.getMonth() === date.getMonth() && 
             bDate.getFullYear() === date.getFullYear();
    });
    return {
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      revenue: dayBills.reduce((s, b) => s + b.total, 0),
      orders: dayBills.length
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <DashboardSoundAlerts activeOrders={activeOrderCount} />

      {/* ── Header Row ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        {/* ... existing header code ... */}
        <div className="flex flex-col gap-2">
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              background: "linear-gradient(135deg, #FF6B35, #F59E0B)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 10px 15px -3px rgba(245, 158, 11, 0.3)"
            }}>
              <Zap size={20} fill="white" />
            </div>
            <div>
              <h1 style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "var(--kravy-text-primary)",
                letterSpacing: "-1.2px",
                lineHeight: 1
              }}>
                Performance Dashboard
              </h1>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "6px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  background: "var(--kravy-surface)",
                  border: "1px solid var(--kravy-border)",
                  borderRadius: "8px",
                  fontSize: "0.65rem",
                  color: "var(--kravy-text-muted)",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  textTransform: "uppercase"
                }}>
                  <Fingerprint size={10} className="text-orange-500" />
                  ID: <span style={{ color: "var(--kravy-text-primary)" }}>{effectiveId}</span>
                  <CopyButton text={effectiveId} />
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "8px",
                  fontSize: "0.6rem",
                  color: "#10B981",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  <ShieldCheck size={10} />
                  Admin Verified
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ManualRefresh />
          <DateFilter />
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <StatsGrid
        data={{
          monthlyRevenue: chartData,
          totalBills: totalBills,
          growth: growth,
          paymentSplit: { Cash: cash, UPI: upi },
          daySale,
          weekSale,
          monthSale,
          todayCustomers: totalRangeCustomers,
          newCustomers: rangeNewCount,
          repeatCustomers: rangeRepeatCount,
          walkInCustomers: currentRangeAnonymousCount,
          peakHour: peakHourStr,
          peakDay: peakDayName,
          activeOrders: activeOrderCount,
          completedOrders: completedTodayCount,
          avgOrderValue: avgOrderValue,
          totalUnpaidAmount: totalUnpaidAmount,
          unpaidCustomerCount: customerUnpaidList.length,
          customerDuesList: customerUnpaidList,
          totalWalletAdvance: totalWalletAdvance,
          walletCustomersCount: walletCustomersCount,
        }}
        range={range}
      />

      {/* ── Advanced Analytics Link ── */}
      <div className="mb-2">
        <a 
          href="/dashboard/reports/sales/drilldown"
          className="group relative overflow-hidden flex items-center justify-between p-6 rounded-[24px] bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] border border-indigo-700/50"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <BarChart3 size={28} className="text-indigo-300" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Advanced Sales Drilldown <span className="bg-indigo-500/40 text-indigo-100 text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold">New</span>
              </h3>
              <p className="text-indigo-200 text-sm font-medium mt-1">Deep-dive into Month, Week, and Day level analytics with interactive charts.</p>
            </div>
          </div>
          <div className="relative z-10 bg-white text-indigo-900 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 group-hover:bg-indigo-50 transition-colors shadow-lg">
            Open Report <ArrowRight size={16} />
          </div>
        </a>
      </div>

      {/* ── Store Management & Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a 
          href="/dashboard/reports/tokens"
          className="kravy-card p-6 flex flex-col gap-4 hover:shadow-xl transition-all hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Ticket size={24} />
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-2 py-1 rounded-md uppercase">Daily Logs</div>
          </div>
          <div>
            <h3 className="font-black text-[var(--kravy-text-primary)] text-lg">Token History</h3>
            <p className="text-[11px] text-[var(--kravy-text-muted)] font-bold uppercase mt-1">Check daily token printing count</p>
          </div>
          <div className="mt-2 flex items-center text-emerald-600 dark:text-emerald-400 font-black text-xs gap-2">
            View Reports <ArrowRight size={14} />
          </div>
        </a>

        <a 
          href="/dashboard/reports/gst"
          className="kravy-card p-6 flex flex-col gap-4 hover:shadow-xl transition-all hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText size={24} />
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-1 rounded-md uppercase">Tax Center</div>
          </div>
          <div>
            <h3 className="font-black text-[var(--kravy-text-primary)] text-lg">GST Reports</h3>
            <p className="text-[11px] text-[var(--kravy-text-muted)] font-bold uppercase mt-1">GSTR-1, 3B and HSN Summaries</p>
          </div>
          <div className="mt-2 flex items-center text-indigo-600 dark:text-indigo-400 font-black text-xs gap-2">
            Audit Center <ArrowRight size={14} />
          </div>
        </a>

        <a 
          href="/dashboard/parties"
          className="kravy-card p-6 flex flex-col gap-4 hover:shadow-xl transition-all hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Fingerprint size={24} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black px-2 py-1 rounded-md uppercase">CRM</div>
          </div>
          <div>
            <h3 className="font-black text-[var(--kravy-text-primary)] text-lg">Customers</h3>
            <p className="text-[11px] text-[var(--kravy-text-muted)] font-bold uppercase mt-1">Manage parties and wallet balances</p>
          </div>
          <div className="mt-2 flex items-center text-amber-600 dark:text-amber-400 font-black text-xs gap-2">
            Open CRM <ArrowRight size={14} />
          </div>
        </a>

        <a 
          href="/dashboard/tables"
          className="kravy-card p-6 flex flex-col gap-4 hover:shadow-xl transition-all hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Grid size={24} />
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black px-2 py-1 rounded-md uppercase">Layout</div>
          </div>
          <div>
            <h3 className="font-black text-[var(--kravy-text-primary)] text-lg">Tables & Area</h3>
            <p className="text-[11px] text-[var(--kravy-text-muted)] font-bold uppercase mt-1">Manage your dining table layout</p>
          </div>
          <div className="mt-2 flex items-center text-rose-600 dark:text-rose-400 font-black text-xs gap-2">
            Manage Tables <ArrowRight size={14} />
          </div>
        </a>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <PaymentModeChart 
          paymentSplit={{ Cash: cash, UPI: upi }} 
          range={range}
        />
      </div>

      {/* ── New Breakdown Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OrderTypeChart data={orderTypeBreakdown} />
        <PeakHoursChart data={peakHoursData} />
      </div>

      {/* ── Weekly Revenue Chart Row ── */}
      <div className="grid grid-cols-1 gap-5">
        <WeeklyRevenueChart data={weeklyData} />
      </div>

      {/* ── Bills Row ── */}
      <RecentBills 
        recentBills={recentBills} 
        deletedBills={deletedBills} 
        range={range}
      />

      {/* ── Marketing Hub Section ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <a href="/dashboard/combos" className="group p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[32px] text-white shadow-xl shadow-indigo-200 block transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
              Live Preview Active
            </div>
          </div>
          <h3 className="text-2xl font-black mb-1">Combo Deals</h3>
          <p className="text-white/70 text-sm font-medium mb-4">Create & edit meal bundles with real-time customer view preview</p>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider">
              {activeCombosCount} Active Deals
            </div>
            <div className="text-white/40 font-black">→</div>
          </div>
        </a>

        <a href="/dashboard/offers" className="group p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[32px] text-white shadow-xl shadow-amber-200 block transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Tag size={24} className="text-white" />
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
              Campaigns
            </div>
          </div>
          <h3 className="text-2xl font-black mb-1">Offers & Coupons</h3>
          <p className="text-white/70 text-sm font-medium mb-4">Manage discount codes and seasonal promotions logic</p>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider">
              {activeOffersCount} Active Coupons
            </div>
            <div className="text-white/40 font-black">→</div>
          </div>
        </a>
      </div>

      {/* ── Bottom Row: Top Items + Insight Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <TopItems items={topItems} range={range} />
        </div>

        {/* Business Insight Card */}
        <div className="lg:col-span-2" style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "24px",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          {/* Background decoration */}
          <div style={{
            position: "absolute",
            bottom: "-60px",
            right: "-60px",
            width: "240px",
            height: "240px",
            background: isGrowthPositive
              ? "radial-gradient(circle, rgba(16,185,129,0.12), transparent)"
              : "radial-gradient(circle, rgba(239,68,68,0.1), transparent)",
            borderRadius: "50%",
            filter: "blur(40px)",
            pointerEvents: "none"
          }} />

          <div>
            {/* Insight Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "16px",
                background: isGrowthPositive
                  ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))"
                  : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))",
                border: `1px solid ${isGrowthPositive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem"
              }}>
                {isGrowthPositive ? "📈" : "📊"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Business Insights</h3>
                <p style={{ fontSize: "0.72rem", color: "var(--kravy-text-muted)", fontFamily: "monospace" }}>
                  AI-powered analysis for your store
                </p>
              </div>
            </div>

            {/* Insight Text */}
            <p style={{
              fontSize: "0.9rem",
              color: "var(--kravy-text-muted)",
              lineHeight: "1.7",
              marginBottom: "24px"
            }}>
              {isGrowthPositive
                ? `🎉 Excellent! Your revenue grew by ${growth.toFixed(1)}% compared to last period. Focus on your top-selling items to maintain this momentum. Consider expanding your menu with similar dishes.`
                : `Track your sales patterns to identify peak hours and popular items. Promoting top-selling dishes and offering combos can help boost your average order value significantly.`}
            </p>

            {/* Mini Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {[
                {
                  label: "Avg. Order",
                  value: `₹${format(avgOrderValue)}`,
                  color: "#8B5CF6"
                },
                {
                  label: "Revenue Growth",
                  value: `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`,
                  color: isGrowthPositive ? "#10B981" : "#EF4444"
                },
                {
                  label: "UPI Ratio",
                  value: totalRevenue > 0 ? `${Math.round((upi / totalRevenue) * 100)}%` : "0%",
                  color: "#F59E0B"
                }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "var(--kravy-bg-2)",
                  border: "1px solid var(--kravy-border)",
                  borderRadius: "14px",
                  padding: "14px",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "1.1rem",
                    fontWeight: 900,
                    color: stat.color,
                    letterSpacing: "-0.5px"
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: "var(--kravy-text-muted)",
                    fontFamily: "monospace",
                    marginTop: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["#KravyPOS", "#SalesAnalytics", isGrowthPositive ? "#GrowthMode" : "#StaySteady", "#BusinessInsight"].map(tag => (
              <span key={tag} style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "5px 12px",
                background: "var(--kravy-bg-2)",
                border: "1px solid var(--kravy-border)",
                borderRadius: "20px",
                color: "var(--kravy-text-muted)",
                fontFamily: "monospace"
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

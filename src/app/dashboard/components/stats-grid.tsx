"use client";
import { useCurrency } from '@/lib/currency-context';

import { TrendingUp, TrendingDown, IndianRupee, FileText, Banknote, Smartphone, Maximize2, Users, UserPlus, UserCheck, Clock, BarChart3, History, Activity, AlertCircle, Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";
import { useState } from "react";

interface Props {
  data: {
    monthlyRevenue?: { revenue: number }[];
    totalBills?: number;
    growth?: number;
    paymentSplit?: { Cash?: number; UPI?: number };
    daySale?: number;
    dayCollection?: number;
    weekSale?: number;
    monthSale?: number;
    todayCustomers?: number;
    newCustomers?: number;
    repeatCustomers?: number;
    walkInCustomers?: number;
    avgOrderValue?: number;
    peakHour?: string;
    peakDay?: string;
    activeOrders?: number;
    completedOrders?: number;
    outstandingDue?: number;
    totalCustomerUdhaar?: number;
    totalUnpaidAmount?: number;
    unpaidCustomerCount?: number;
    customerDuesList?: Array<{
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
    }>;
    totalWalletAdvance?: number;
    walletCustomersCount?: number;
  };
  range?: number;
}

export default function StatsGrid({ data, range = 30 }: Props) {
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();
  const [localDuesList] = useState(data.customerDuesList || []);

  const totalRevenue = data.monthlyRevenue?.reduce((s, m) => s + (m.revenue || 0), 0) || 0;
  const growth = data.growth || 0;
  const isPositive = growth >= 0;
  
  const daySale = data.daySale || 0;
  const dayCollection = data.dayCollection || 0;
  const weekSale = data.weekSale || 0;
  const monthSale = data.monthSale || 0;
  const totalBills = data.totalBills || 0;
  const cash = data.paymentSplit?.Cash || 0;
  const upi = data.paymentSplit?.UPI || 0;

  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  const totalUnpaidAmount = localDuesList.reduce((sum, c) => sum + c.totalUnpaid, 0);
  const outstandingDue = data.outstandingDue !== undefined ? data.outstandingDue : totalUnpaidAmount;
  const totalCustomerUdhaar = data.totalCustomerUdhaar !== undefined ? data.totalCustomerUdhaar : totalUnpaidAmount;
  const unpaidCustomerCount = localDuesList.length;

  const totalWalletAdvance = data.totalWalletAdvance || 0;
  const walletCustomersCount = data.walletCustomersCount || 0;

  const rangeShort = range === 1 ? "Today" : range === 2 ? "Yesterday" : `${range} Days`;
  const rangeSub = range === 1 ? "today" : range === 2 ? "yesterday" : `in last ${range} days`;

  const stats = [
    {
      label: "Today's Sale",
      value: `${sym}${fmt(daySale)}`,
      sub: "Net sales invoiced today",
      icon: <Banknote size={20} strokeWidth={2.5} />,
      accent: "#FF6B35",
      path: `/dashboard/reports/sales/daily`,
      gradient: "linear-gradient(135deg, #FF6B35 0%, #F59E0B 100%)",
      glow: "rgba(255,107,53,0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Today's Collection",
      value: `${sym}${fmt(dayCollection)}`,
      sub: "Payments recorded on today's bills",
      icon: <IndianRupee size={20} strokeWidth={2.5} />,
      accent: "#10B981",
      path: `/dashboard/reports/payments?range=1`,
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      glow: "rgba(16,185,129,0.35)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Outstanding Due",
      value: `${sym}${fmt(outstandingDue)}`,
      sub: "Unpaid balance on today's bills",
      icon: <Clock size={20} strokeWidth={2.5} />,
      accent: "#F59E0B",
      path: `/dashboard/reports/unpaid`,
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      glow: "rgba(245, 158, 11, 0.35)",
      trend: false,
      showTrend: false,
    },
    {
      label: "Total Customer Udhaar",
      value: `${sym}${fmt(totalCustomerUdhaar)}`,
      sub: `${unpaidCustomerCount} debtors pending`,
      icon: <AlertCircle size={20} strokeWidth={2.5} />,
      accent: "#EF4444",
      path: `/dashboard/reports/unpaid`,
      gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
      glow: "rgba(239, 68, 68, 0.35)",
      trend: false,
      showTrend: false,
    },
    {
      label: "Total Revenue",
      value: `${sym}${fmt(totalRevenue)}`,
      sub: `${isPositive ? "+" : ""}${growth.toFixed(1)}% vs last period`,
      icon: <IndianRupee size={20} strokeWidth={2.5} />,
      accent: "#10B981",
      path: `/dashboard/reports/sales/revenue?range=${range}`,
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      glow: "rgba(16,185,129,0.35)",
      trend: isPositive,
      showTrend: true,
    },
    {
      label: "Total Wallet Advance",
      value: `${sym}${fmt(totalWalletAdvance)}`,
      sub: `${walletCustomersCount} active deposits`,
      icon: <Smartphone size={20} strokeWidth={2.5} />,
      accent: "#8B5CF6",
      path: `/dashboard/reports/wallet-deposits`,
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      glow: "rgba(139, 92, 246, 0.35)",
      trend: false,
      showTrend: false,
    },
    {
      label: "This Week",
      value: `${sym}${fmt(weekSale)}`,
      sub: "Sales since Sunday",
      icon: <FileText size={20} strokeWidth={2.5} />,
      accent: "#8B5CF6",
      path: `/dashboard/reports/sales/weekly`,
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      glow: "rgba(139, 92, 246, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "This Month",
      value: `${sym}${fmt(monthSale)}`,
      sub: `Sales in ${new Date().toLocaleString('default', { month: 'long' })}`,
      icon: <Smartphone size={20} strokeWidth={2.5} />,
      accent: "#0EA5E9",
      path: `/dashboard/reports/sales/monthly`,
      gradient: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
      glow: "rgba(14, 165, 233, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Total Bills",
      value: fmt(totalBills),
      sub: `Orders processed ${rangeSub}`,
      icon: <FileText size={20} strokeWidth={2.5} />,
      accent: "#64748B",
      path: `/dashboard/reports/bills`,
      gradient: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
      glow: "rgba(100, 116, 139, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Cash Collected",
      value: `${sym}${fmt(cash)}`,
      sub: "Physical payments",
      icon: <Banknote size={20} strokeWidth={2.5} />,
      accent: "#F59E0B",
      path: `/dashboard/reports/payments/cash`,
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      glow: "rgba(245,158,11,0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "UPI Payments",
      value: `${sym}${fmt(upi)}`,
      sub: "Digital transactions",
      icon: <Smartphone size={20} strokeWidth={2.5} />,
      accent: "#EC4899",
      path: `/dashboard/reports/payments/upi`,
      gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
      glow: "rgba(236, 72, 153, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: `${rangeShort} Customers`,
      value: fmt(data.todayCustomers || 0),
      sub: `Unique visitors ${rangeSub}`,
      icon: <Users size={20} strokeWidth={2.5} />,
      accent: "#06B6D4",
      path: "/dashboard/reports/customers",
      gradient: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
      glow: "rgba(6, 182, 212, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "New Customers",
      value: fmt(data.newCustomers || 0),
      sub: `First-time visits ${rangeSub}`,
      icon: <UserPlus size={20} strokeWidth={2.5} />,
      accent: "#10B981",
      path: "/dashboard/reports/customers?filter=New",
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      glow: "rgba(16, 185, 129, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Repeat Customers",
      value: fmt(data.repeatCustomers || 0),
      sub: `Returning business ${rangeSub}`,
      icon: <UserCheck size={20} strokeWidth={2.5} />,
      accent: "#F59E0B",
      path: "/dashboard/reports/customers?filter=Repeat",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      glow: "rgba(245, 158, 11, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Walk-in Guests",
      value: fmt(data.walkInCustomers || 0),
      sub: `Anonymous footfall ${rangeSub}`,
      icon: <Users size={20} strokeWidth={2.5} />,
      accent: "#64748B",
      path: "/dashboard/reports/customers?filter=WalkIn",
      gradient: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
      glow: "rgba(100, 116, 139, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Avg Bill Value",
      value: `${sym}${fmt(data.avgOrderValue || 0)}`,
      sub: `Average per order ${rangeSub}`,
      icon: <BarChart3 size={20} strokeWidth={2.5} />,
      accent: "#8B5CF6",
      path: "/dashboard/reports/analytics",
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      glow: "rgba(139, 92, 246, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: `${rangeShort} Peak`,
      value: data.peakHour || "N/A",
      sub: `Busiest hour ${rangeSub}`,
      icon: <Clock size={20} strokeWidth={2.5} />,
      accent: "#F59E0B",
      path: "/dashboard/reports/analytics",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      glow: "rgba(245, 158, 11, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Performance Pulse",
      value: "View Ledger",
      sub: "Historical comparisons",
      icon: <History size={20} strokeWidth={2.5} />,
      accent: "#EC4899",
      path: "/dashboard/reports/performance",
      gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
      glow: "rgba(236, 72, 153, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Peak Performance Day",
      value: data.peakDay || "No data",
      sub: `Highest volume on ${data.peakDay || "..."}`,
      icon: <TrendingUp size={20} strokeWidth={2.5} />,
      accent: "#10B981",
      path: "/dashboard/reports/analytics",
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      glow: "rgba(16, 185, 129, 0.3)",
      trend: true,
      showTrend: false,
    },
    {
      label: "Live Status",
      value: `${data.activeOrders || 0} Active`,
      sub: `${data.completedOrders || 0} Completed today`,
      icon: <Activity size={20} strokeWidth={2.5} />,
      accent: "#F59E0B",
      path: "/dashboard/reports/analytics",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      glow: "rgba(245, 158, 11, 0.3)",
      trend: true,
      showTrend: false,
    },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } }
  };
  const card = {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" as const } }
  };

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{
          display: "flex",
          gap: "18px",
          overflowX: "auto",
          paddingBottom: "12px",
          width: "100%",
        }}
        className="no-scrollbar"
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            variants={card}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="kravy-stat-card"
            style={{ minWidth: "260px", flex: "0 0 auto", cursor: "pointer" }}
            onClick={() => {
              kravy.click();
              router.push(s.path);
            }}
          >
            {/* Colored accent top bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0,
              height: "2px",
              background: s.gradient,
              opacity: 0.8,
              borderRadius: "22px 22px 0 0",
            }} />

            {/* Glow orb */}
            <div className="kravy-stat-glow" style={{
              width: "130px", height: "130px",
              top: "-40px", right: "-40px",
              background: s.glow,
              opacity: 0.25,
            }} />

            {/* Second subtle orb */}
            <div className="kravy-stat-glow" style={{
              width: "60px", height: "60px",
              bottom: "-10px", left: "-10px",
              background: s.glow,
              opacity: 0.25,
            }} />

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              {/* Icon */}
              <div style={{
                width: "46px", height: "46px",
                borderRadius: "14px",
                background: s.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
                boxShadow: `0 6px 20px ${s.glow === "var(--kravy-brand)" ? "rgba(139,92,246,0.3)" : s.glow}`,
                position: "relative",
                zIndex: 1,
              }}>
                {s.icon}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Expand Icon */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    kravy.click();
                    router.push(s.path);
                  }}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--kravy-bg-2)",
                    border: "1px solid var(--kravy-border)",
                    cursor: "pointer",
                    color: "var(--kravy-text-muted)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = s.accent;
                    e.currentTarget.style.color = s.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--kravy-border)";
                    e.currentTarget.style.color = "var(--kravy-text-muted)";
                  }}
                >
                  <Maximize2 size={14} />
                </button>

                {/* Trend / rank badge */}
                {s.showTrend ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background: s.trend ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${s.trend ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                    fontSize: "0.68rem", fontWeight: 700,
                    color: s.trend ? "#10B981" : "#EF4444",
                  }}>
                    {s.trend ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {growth.toFixed(1)}%
                  </div>
                ) : (
                  <div style={{
                    fontSize: "0.62rem", fontWeight: 700,
                    padding: "4px 10px", borderRadius: "999px",
                    background: `${s.accent}14`,
                    color: s.accent,
                    border: `1px solid ${s.accent}30`,
                  }}>
                    {s.label.includes("Udhaar") ? "⚠️ Dues" : s.label.includes("Wallet") ? "💰 Advance" : (s.label.includes("Today") || s.label.includes("Outstanding")) ? "📋 Today" : "📊 Stats"}
                  </div>
                )}
              </div>
            </div>

            {/* Value */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
              style={{
                fontSize: "1.85rem",
                fontWeight: 900,
                color: "var(--kravy-text-primary)",
                letterSpacing: "-1.5px",
                lineHeight: 1,
                marginBottom: "8px",
                position: "relative",
                zIndex: 1,
              }}
            >
              {s.value}
            </motion.div>

            {/* Separator */}
            <div style={{
              height: "1px",
              background: `linear-gradient(90deg, ${s.accent}30, transparent)`,
              marginBottom: "10px",
            }} />

            {/* Label + sub */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--kravy-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "3px",
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: "0.72rem",
                color: s.label.includes("Udhaar") ? "#EF4444" : s.label.includes("Wallet") ? "#10B981" : s.showTrend ? (s.trend ? "#10B981" : "#EF4444") : "var(--kravy-text-faint)",
                fontWeight: 600,
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                {s.showTrend && (s.trend ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
                {s.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Customer Dues Modal Overlay */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
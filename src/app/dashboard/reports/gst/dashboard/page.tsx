"use client";
import { useCurrency } from "@/lib/currency-context";
import React, { useState, useEffect, useMemo } from "react";
import { 
  IndianRupee, 
  TrendingUp, 
  Receipt, 
  Package, 
  Truck, 
  BarChart3, 
  PieChart as PieChartIcon, 
  ArrowLeft, 
  Calendar,
  ArrowRight,
  ChevronRight,
  TrendingDown,
  LayoutDashboard,
  Filter,
  Download
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import Link from "next/link";
import ReportExportDropdown from "@/components/ReportExportDropdown";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function GSTDashboardPage() {
  const { currencySymbol: sym } = useCurrency();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setMounted(true);
  }, []);

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/gst?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  const stats = useMemo(() => {
    if (!data) return null;
    const { gstr3b } = data;
    return [
      { label: "Total Sales", value: gstr3b.taxable + gstr3b.totalGst, icon: <IndianRupee size={20} />, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
      { label: "Total GST", value: gstr3b.totalGst, icon: <Receipt size={20} />, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
      { label: "Delivery Tax", value: gstr3b.deliveryGst || 0, icon: <Truck size={20} />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
      { label: "Packaging Tax", value: gstr3b.packagingGst || 0, icon: <Package size={20} />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
    ];
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return { rateData: [], typeData: [] };
    
    // Rate-wise Data
    const rates: Record<string, number> = {};
    data.gstr1.forEach((bill: any) => {
      const rateStr = bill.rates || "0%";
      const rateArr = rateStr.split(",").map((s: string) => s.trim());
      rateArr.forEach((r: string) => {
        rates[r] = (rates[r] || 0) + bill.totalGst;
      });
    });

    const rateData = Object.entries(rates).map(([name, value]) => ({ name, value }));

    // Type Data (Items vs Delivery vs Packaging)
    const { gstr3b } = data;
    const itemGst = gstr3b.totalGst - (gstr3b.deliveryGst || 0) - (gstr3b.packagingGst || 0);
    const typeData = [
      { name: "Items", value: itemGst },
      { name: "Delivery", value: gstr3b.deliveryGst || 0 },
      { name: "Packaging", value: gstr3b.packagingGst || 0 },
    ].filter(d => d.value > 0);

    return { rateData, typeData };
  }, [data]);

  const dailyTrend = useMemo(() => {
    if (!data) return [];
    return data.dailyTax.slice().reverse().map((d: any) => ({
      date: format(new Date(d.date), "dd MMM"),
      tax: d.totalGst,
      sales: d.gross
    }));
  }, [data]);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--kravy-text-muted)] font-bold animate-pulse">Loading GST Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--kravy-bg)] p-4 md:p-8 space-y-8 no-scrollbar">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports/gst" className="w-12 h-12 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight">GST <span className="text-indigo-600">Dashboard</span></h1>
            <p className="text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] opacity-60">Visual Tax Intelligence & Analytics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl px-4 py-2 gap-3 shadow-sm">
            <Calendar size={18} className="text-indigo-50" />
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-[var(--kravy-text-primary)]" />
              <ArrowRight size={14} className="text-[var(--kravy-text-muted)]" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-[var(--kravy-text-primary)]" />
            </div>
          </div>
          <button onClick={fetchReport} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
            <TrendingUp size={20} />
          </button>
          {data && (
            <ReportExportDropdown
              data={data.gstr1 || []}
              columns={[
                { key: "billNumber", label: "Invoice No" },
                { key: "date", label: "Date" },
                { key: "customerName", label: "Buyer Name" },
                { key: "taxable", label: "Taxable ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
                { key: "totalGst", label: "Total GST ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
                { key: "grandTotal", label: "Total ({sym})", format: (v) => v ? Number(v).toFixed(2) : "0.00" },
              ]}
              filename={`GST_Dashboard_Summary_${startDate}_to_${endDate}`}
              title={`GST Dashboard Summary (${startDate} to ${endDate})`}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-indigo-600 animate-pulse">Analyzing Financial Patterns...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats?.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none group hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] group-hover:text-indigo-500 transition-colors">{stat.label}</div>
                </div>
                <div className="text-3xl font-black text-[var(--kravy-text-primary)] tracking-tighter">{sym}{stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "70%" }} 
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                  <span className="text-[10px] font-black text-indigo-500">70%</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales vs Tax Trend */}
            <div className="lg:col-span-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">GST Revenue Trend</h3>
                  <p className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-widest">Daily Tax collection analysis</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /> Sales</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Tax</div>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 800 }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="tax" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTax)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tax Breakdown Donut */}
            <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[3rem] p-8 shadow-2xl flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">Source Breakdown</h3>
                <p className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-widest">Items vs Service Charges</p>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rate Wise Bar Chart */}
            <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[3rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">Rate-wise Distribution</h3>
                  <p className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-widest">Revenue by GST slab</p>
                </div>
                <BarChart3 size={24} className="text-indigo-500" />
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.rateData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Invoices Table */}
            <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">Detailed Audit Log</h3>
                <Link href="/dashboard/reports/gst" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:underline">
                  View All <ChevronRight size={12} />
                </Link>
              </div>
              <div className="overflow-x-auto flex-1 no-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[var(--kravy-surface)] z-10">
                    <tr className="text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] border-b border-[var(--kravy-border)]">
                      <th className="py-3 pr-4">Invoice</th>
                      <th className="py-3 px-4">Taxable</th>
                      <th className="py-3 px-4">Charges Tax</th>
                      <th className="py-3 pl-4 text-right text-indigo-600">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kravy-border)]">
                    {data?.gstr1.slice(0, 5).map((bill: any, i: number) => (
                      <tr key={i} className="hover:bg-indigo-50/10 transition-colors">
                        <td className="py-4 pr-4">
                          <p className="text-xs font-black text-[var(--kravy-text-primary)]">#{bill.billNumber}</p>
                          <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase">{format(new Date(bill.date), "dd MMM")}</p>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold">{sym}{bill.taxable.toFixed(2)}</td>
                        <td className="py-4 px-4 text-xs font-bold text-amber-600">{sym}{(bill.deliveryGst + bill.packagingGst).toFixed(2)}</td>
                        <td className="py-4 pl-4 text-xs font-black text-indigo-600 text-right">{sym}{bill.totalGst.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

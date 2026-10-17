"use client";
import { useCurrency } from "@/lib/currency-context";
import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  ArrowRight, 
  ChevronRight, 
  Printer, 
  Filter,
  RefreshCcw,
  AlertCircle,
  TrendingUp,
  Receipt,
  PieChart,
  Grid,
  Check,
  Settings,
  LayoutDashboard,
  Copy,
  Eye,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import ReportExportDropdown from "@/components/ReportExportDropdown";

type GSTReportData = {
  gstr1: any[];
  gstr3b: {
    taxable: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  };
  hsnSummary: any[];
  dailyTax: any[];
};

export default function GSTReportPage() {
  const { currencySymbol: sym } = useCurrency();

  const [activeTab, setActiveTab] = useState<"GSTR-1" | "GSTR-3B" | "HSN" | "Daily">("GSTR-1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GSTReportData | null>(null);
  const [gstEnabled, setGstEnabled] = useState<boolean | null>(null);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedJson, setSelectedJson] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "billNumber", "date", "customerName", "buyerGSTIN", "rates", "hsns", "taxable", "cgst", "sgst", "igst", "grandTotal", "type", "actions"
  ]);

  useEffect(() => {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setMounted(true);
  }, []);

  const allColumns = [
    { key: "billNumber", label: "Invoice No" },
    { key: "date", label: "Date" },
    { key: "customerName", label: "Buyer Name" },
    { key: "buyerGSTIN", label: "Buyer GSTIN" },
    { key: "placeOfSupply", label: "Place of Supply" },
    { key: "rates", label: "Rate %" },
    { key: "hsns", label: "HSN Code" },
    { key: "taxable", label: "Taxable ({sym})" },
    { key: "cgst", label: "CGST ({sym})" },
    { key: "sgst", label: "SGST ({sym})" },
    { key: "igst", label: "IGST ({sym})" },
    { key: "grandTotal", label: "Total ({sym})" },
    { key: "type", label: "Type" },
    { key: "actions", label: "JSON" },
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/gst?startDate=${startDate}&endDate=${endDate}`);
      if (res.status === 403) {
        setGstEnabled(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch report");
      const result = await res.json();
      setData(result);
      setGstEnabled(true);
    } catch (err) {
      console.error(err);
      toast.error("Error loading GST report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--kravy-text-muted)] font-bold animate-pulse">Loading GST Reports...</p>
      </div>
    );
  }

  if (gstEnabled === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-rose-500">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-4">GST Not Enabled</h2>
        <p className="text-[var(--kravy-text-muted)] max-w-md mb-8 italic">
          GST Reports are only available when Tax Calculation is enabled in your Business Profile.
        </p>
        <button 
          onClick={() => window.location.href = "/dashboard/profile"}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
        >
          Enable GST in Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight">
            GST <span className="text-indigo-600">Reports</span> Center
          </h1>
          <p className="text-sm text-[var(--kravy-text-muted)] italic mt-1 uppercase tracking-widest font-black opacity-60">
            Professional Tax Auditing & Filing Reports
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Link href="/dashboard/reports/gst/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 group transition-all">
              <LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" /> 
              Analytics Dashboard
              <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl px-4 py-2 gap-3 shadow-sm">
            <Calendar size={18} className="text-indigo-500" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-[var(--kravy-text-primary)]"
              />
              <ArrowRight size={14} className="text-[var(--kravy-text-muted)]" />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-[var(--kravy-text-primary)]"
              />
            </div>
          </div>
          {data && (
            <ReportExportDropdown
              data={
                activeTab === "GSTR-1" ? (data?.gstr1 || []) :
                activeTab === "HSN" ? (data?.hsnSummary || []) :
                activeTab === "Daily" ? (data?.dailyTax || []) :
                (data ? [data.gstr3b] : [])
              }
              columns={
                activeTab === "GSTR-1" ? allColumns.filter(c => visibleColumns.includes(c.key)).map(c => ({ key: c.key, label: c.label })) :
                activeTab === "HSN" ? [
                  { key: "hsn", label: "HSN / SAC Code" },
                  { key: "qty", label: "Total Qty sold" },
                  { key: "taxable", label: "Taxable Value" },
                  { key: "cgst", label: "CGST" },
                  { key: "sgst", label: "SGST" },
                  { key: "totalGst", label: "Total GST" }
                ] :
                activeTab === "Daily" ? [
                  { key: "date", label: "Accounting Date" },
                  { key: "bills", label: "Bills Generated" },
                  { key: "gross", label: "Daily Sales (Gross)" },
                  { key: "taxable", label: "Taxable Amount" },
                  { key: "totalGst", label: "Daily GST" }
                ] :
                [
                  { key: "taxable", label: "Total Taxable" },
                  { key: "cgst", label: "CGST" },
                  { key: "sgst", label: "SGST" },
                  { key: "totalGst", label: "Total GST" }
                ]
              }
              filename={`${activeTab.replace("-", "_")}_Report_${startDate}_to_${endDate}`}
              title={`${activeTab} Report (${startDate} to ${endDate})`}
            />
          )}

          {activeTab === "GSTR-1" && (
            <div className="relative">
              <button 
                onClick={() => setShowColumnToggle(!showColumnToggle)}
                className="flex items-center gap-2 px-4 py-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-indigo-500 transition-all text-[var(--kravy-text-secondary)] shadow-sm"
              >
                <Settings size={14} className={showColumnToggle ? "animate-spin-slow rotate-45" : ""} />
                Columns
              </button>
              
              <AnimatePresence>
                {showColumnToggle && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl shadow-2xl z-[60] p-4 overflow-hidden"
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-3 px-2 flex justify-between items-center">
                      Toggle Columns
                      <button onClick={() => setVisibleColumns(allColumns.map(c => c.key))} className="text-indigo-500 hover:underline">All</button>
                    </div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
                      {allColumns.map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all group"
                        >
                          <span className={`text-[11px] font-bold ${visibleColumns.includes(col.key) ? "text-indigo-500" : "text-[var(--kravy-text-muted)] group-hover:text-[var(--kravy-text-secondary)]"}`}>
                            {col.label}
                          </span>
                          {visibleColumns.includes(col.key) && <Check size={12} className="text-indigo-500" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {activeTab === "GSTR-1" && data?.gstr1 && (
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(data.gstr1, null, 2));
                toast.success("Full JSON Copied!");
              }}
              className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              <Copy size={14} /> Full JSON
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
        {[
          { id: "GSTR-1", icon: <FileText size={16} />, label: "GSTR-1 (Invoices)" },
          { id: "GSTR-3B", icon: <TrendingUp size={16} />, label: "GSTR-3B (Summary)" },
          { id: "HSN", icon: <Grid size={16} />, label: "HSN Summary" },
          { id: "Daily", icon: <Receipt size={16} />, label: "Daily Tax" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 border-2
              ${activeTab === tab.id 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20" 
                : "bg-[var(--kravy-surface)] text-[var(--kravy-text-muted)] border-[var(--kravy-border)] hover:border-indigo-600/30"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px]"
          >
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--kravy-text-muted)] mt-6 animate-pulse">Calculating Tax Data...</p>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="overflow-x-auto">
              {activeTab === "GSTR-1" && (
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-[var(--kravy-bg)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kravy-text-muted)] border-b border-[var(--kravy-border)]">
                      {allColumns.map(col => visibleColumns.includes(col.key) && (
                        <th key={col.key} className={`px-6 py-5 ${["taxable", "cgst", "sgst", "igst", "grandTotal"].includes(col.key) ? "text-right" : ""}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kravy-border)]">
                    {data?.gstr1.map((bill, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/10 transition-all group border-b border-[var(--kravy-border)]/20 last:border-0">
                        {allColumns.map(col => {
                          if (!visibleColumns.includes(col.key)) return null;

                          let content: React.ReactNode = "";
                          let className = "px-6 py-4 text-xs font-bold";

                          switch (col.key) {
                            case "billNumber":
                              content = bill.billNumber;
                              className += " font-black text-[var(--kravy-text-primary)]";
                              break;
                            case "date":
                              content = format(new Date(bill.date), "dd/MM/yyyy");
                              className += " text-[var(--kravy-text-muted)] whitespace-nowrap";
                              break;
                            case "customerName":
                              content = bill.customerName;
                              className += " text-[var(--kravy-text-secondary)]";
                              break;
                            case "buyerGSTIN":
                              content = bill.buyerGSTIN;
                              className += " font-mono text-indigo-500";
                              break;
                            case "placeOfSupply":
                              content = bill.placeOfSupply;
                              className += " text-[var(--kravy-text-muted)] whitespace-nowrap";
                              break;
                            case "rates":
                              content = bill.rates;
                              className += " text-indigo-500";
                              break;
                            case "hsns":
                              content = bill.hsns;
                              className += " font-mono";
                              break;
                            case "taxable":
                              content = `${sym}${bill.taxable.toFixed(2)}`;
                              className += " text-right";
                              break;
                            case "cgst":
                              content = (
                                <span>{sym}{bill.cgst.toFixed(2)} <span className="text-[9px] opacity-60">({bill.taxType || "Exc"})</span></span>
                              );
                              className += " text-right text-indigo-600/70";
                              break;
                            case "sgst":
                              content = (
                                <span>{sym}{bill.sgst.toFixed(2)} <span className="text-[9px] opacity-60">({bill.taxType || "Exc"})</span></span>
                              );
                              className += " text-right text-emerald-600/70";
                              break;
                            case "igst":
                              content = (
                                <span>{sym}{bill.igst.toFixed(2)} <span className="text-[9px] opacity-60">({bill.taxType || "Exc"})</span></span>
                              );
                              className += " text-right text-rose-600/70";
                              break;
                            case "grandTotal":
                              content = `${sym}${bill.grandTotal.toFixed(2)}`;
                              className += " text-sm font-black text-right text-[var(--kravy-text-primary)]";
                              break;
                            case "type":
                              content = (
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${bill.type === "B2B" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 dark:bg-white/10 text-[var(--kravy-text-muted)]"}`}>
                                  {bill.type}
                                </span>
                              );
                              className += " text-center";
                              break;
                            case "actions":
                              content = (
                                <div className="flex gap-2 justify-center">
                                  <button onClick={() => setSelectedJson(bill)} className="p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-[var(--kravy-text-secondary)] hover:text-indigo-600 transition-all">
                                    <Eye size={14} />
                                  </button>
                                  <button onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
                                    toast.success("Row JSON Copied!");
                                  }} className="p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg text-[var(--kravy-text-secondary)] hover:text-indigo-600 transition-all">
                                    <Copy size={14} />
                                  </button>
                                </div>
                              );
                              className += " text-center";
                              break;
                          }

                          return <td key={col.key} className={className}>{content}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "GSTR-3B" && data && (
                <div className="p-10 space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[
                        { label: "Total Taxable", value: data.gstr3b.taxable, color: "indigo" },
                        { label: "CGST", value: data.gstr3b.cgst, color: "emerald" },
                        { label: "SGST", value: data.gstr3b.sgst, color: "emerald" },
                        { label: "Total GST", value: data.gstr3b.totalGst, color: "rose" },
                      ].map((card, i) => (
                        <div key={i} className={`p-8 rounded-3xl bg-${card.color}-500/5 border border-${card.color}-500/20`}>
                           <div className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-3">{card.label}</div>
                           <div className={`text-3xl font-black text-${card.color}-600 tracking-tighter`}>{sym}{card.value.toFixed(2)}</div>
                        </div>
                      ))}
                   </div>

                   <div className="bg-[var(--kravy-bg)] rounded-[2rem] p-10 border border-[var(--kravy-border)] space-y-6">
                      <h3 className="text-xl font-black text-[var(--kravy-text-primary)] leading-none mb-4">Summary Conclusion</h3>
                      <div className="grid md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <p className="text-sm font-medium text-[var(--kravy-text-muted)] leading-relaxed underline decoration-indigo-500/30 decoration-4 underline-offset-4">
                               During this period, you generated a total taxable value of <span className="text-[var(--kravy-text-primary)] font-black">{sym}{data.gstr3b.taxable.toFixed(2)}</span> with a net GST liability of <span className="text-[var(--kravy-text-primary)] font-black">{sym}{data.gstr3b.totalGst.toFixed(2)}</span>.
                            </p>
                            <div className="p-6 bg-white dark:bg-black/20 rounded-2xl border border-[var(--kravy-border)]">
                               <div className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)] mb-4">Tax Division (50/50 Internal split)</div>
                               <div className="flex items-center gap-6">
                                  <div className="flex-1">
                                     <div className="h-2 bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                                     <div className="mt-2 text-[10px] font-bold">CENTRAL (CGST): {sym}{data.gstr3b.cgst.toFixed(2)}</div>
                                  </div>
                                  <div className="flex-1">
                                     <div className="h-2 bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                                     <div className="mt-2 text-[10px] font-bold">STATE (SGST): {sym}{data.gstr3b.sgst.toFixed(2)}</div>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
                            <Receipt size={100} className="absolute -bottom-4 -right-4 opacity-10" />
                            <h4 className="text-lg font-black mb-2">Ready for Filing?</h4>
                            <p className="text-sm font-medium text-white/70 mb-6 italic">You can export this summary as a CSV and send it directly to your CA for 3B filing.</p>
                            <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-white/10 active:scale-95 transition-all">
                               Download Summary PDF
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "HSN" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--kravy-bg)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kravy-text-muted)] border-b border-[var(--kravy-border)]">
                      <th className="px-6 py-5">HSN / SAC Code</th>
                      <th className="px-6 py-5 text-center">Total Qty sold</th>
                      <th className="px-6 py-5 text-right">Taxable Value</th>
                      <th className="px-6 py-5 text-right">CGST</th>
                      <th className="px-6 py-5 text-right">SGST</th>
                      <th className="px-6 py-5 text-right font-black text-indigo-600">Total GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kravy-border)]">
                    {data?.hsnSummary.map((hsn, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/10 transition-all">
                        <td className="px-6 py-4 text-xs font-black text-[var(--kravy-text-primary)]">Code: {hsn.hsn}</td>
                        <td className="px-6 py-4 text-xs font-bold text-center">{hsn.qty}</td>
                        <td className="px-6 py-4 text-xs font-bold text-right">{sym}{hsn.taxable.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-right">{sym}{hsn.cgst.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-right">{sym}{hsn.sgst.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-black text-right text-indigo-600">{sym}{hsn.totalGst.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "Daily" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--kravy-bg)] text-[10px] font-black uppercase tracking-[0.2em] text-[var(--kravy-text-muted)] border-b border-[var(--kravy-border)]">
                      <th className="px-6 py-5">Accounting Date</th>
                      <th className="px-6 py-5 text-center">Bills Generated</th>
                      <th className="px-6 py-5 text-right">Daily Sales (Gross)</th>
                      <th className="px-6 py-5 text-right">Taxable Amount</th>
                      <th className="px-6 py-5 text-right font-black text-emerald-500">Daily GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kravy-border)]">
                    {data?.dailyTax.map((day, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/10 transition-all">
                        <td className="px-6 py-4 text-xs font-black text-[var(--kravy-text-primary)]">{format(new Date(day.date), "dd MMMM yyyy")}</td>
                        <td className="px-6 py-4 text-xs font-bold text-center">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-[var(--kravy-border)]">
                            {day.bills} Invoices
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-right">{sym}{day.gross.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-right">{sym}{day.taxable.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-black text-right text-emerald-600">{sym}{day.totalGst.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(!data || (activeTab === "GSTR-1" && data.gstr1.length === 0) || (activeTab === "HSN" && data.hsnSummary.length === 0) || (activeTab === "Daily" && data.dailyTax.length === 0)) && (
               <div className="p-32 flex flex-col items-center justify-center text-center">
                  <PieChart size={64} className="text-slate-100 dark:text-white/5 mb-6" />
                  <div className="text-xl font-black text-[var(--kravy-text-muted)] uppercase tracking-widest italic opacity-50">No Data Found for this Range</div>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedJson && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--kravy-border)]">
                <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">JSON Preview (Invoice: {selectedJson.billNumber})</h3>
                <div className="flex gap-4">
                  <button onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedJson, null, 2));
                    toast.success("Copied!");
                  }} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={() => setSelectedJson(null)} className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-black/30 rounded-b-3xl">
                <pre className="text-xs font-mono text-[var(--kravy-text-secondary)]">
                  {JSON.stringify(selectedJson, null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

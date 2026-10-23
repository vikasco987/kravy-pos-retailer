"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  History, Search, Filter, RefreshCw, AlertCircle, ArrowRight, 
  Calendar, User, ExternalLink, ShieldCheck, ChevronDown, Receipt 
} from "lucide-react";
import { toast } from "react-hot-toast";

interface ChangeItem {
  field: string;
  label: string;
  before: any;
  after: any;
  summary?: string;
}

interface CentralLogEntry {
  id: string;
  billId: string;
  invoiceNo: string;
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  eventType: string;
  reason?: string | null;
  changes: ChangeItem[];
  createdAt: string;
}

export default function CentralBillHistoryPage() {
  const [logs, setLogs] = useState<CentralLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  useEffect(() => {
    fetchCentralHistory();
  }, [eventTypeFilter]);

  const fetchCentralHistory = async (cursor?: string) => {
    try {
      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("limit", "10");
      if (cursor) params.append("cursor", cursor);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (eventTypeFilter !== "ALL") params.append("eventType", eventTypeFilter);

      const res = await fetch(`/api/bill-manager/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch bill edit logs");
      const data = await res.json();

      if (cursor) {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      } else {
        setLogs(data.logs || []);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      setError(err.message || "Failed to load audit history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCentralHistory();
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "PAYMENT_UPDATE":
        return { label: "Payment Update", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" };
      case "STATUS_CHANGE":
        return { label: "Status Change", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" };
      case "HOLD_STATUS":
        return { label: "Hold / Resume", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" };
      case "CUSTOMER_UPDATE":
        return { label: "Customer Details", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" };
      default:
        return { label: "Bill Edited", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" };
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto w-full kravy-page-fade">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <History size={20} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Bill Edit Audit History
            </h1>
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Tenant-wide audit trail of all modified bills, payment reconciliations, and status updates.
          </p>
        </div>

        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors w-fit"
        >
          <Receipt size={15} className="text-indigo-500" />
          Back to Bill Manager
        </Link>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        {/* Search by Bill Number */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number (e.g. INV/2610/0125)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            Search
          </button>
        </form>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            <option value="BILL_EDIT">Bill Edited</option>
            <option value="PAYMENT_UPDATE">Payment Updates</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="CUSTOMER_UPDATE">Customer Details</option>
            <option value="HOLD_STATUS">Hold / Resume</option>
          </select>
        </div>
      </div>

      {/* ── Audit Logs List ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading audit records...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-3">
            <AlertCircle size={22} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck size={28} />
            </div>
            <p className="text-base font-black text-slate-800 dark:text-slate-200">No edit events found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No bills match the selected filter, or no bills have been modified yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const badge = getEventBadge(log.eventType);
              const changes = Array.isArray(log.changes) ? log.changes : [];

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        #{log.invoiceNo}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                      {log.reason && (
                        <span className="text-xs italic text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                          "{log.reason}"
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>

                      {/* Direct Click to View Bill Details */}
                      <Link
                        href={`/dashboard/billing/${log.billId}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Bill <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Actor details */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold">
                    <User size={14} className="text-indigo-500" />
                    <span>Edited by {log.actorName || "Staff"}</span>
                    {log.actorRole && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {log.actorRole}
                      </span>
                    )}
                  </div>

                  {/* Changes Diff Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {changes.map((ch, idx) => {
                      const isCurrency = ["total", "subtotal", "tax", "discountAmount", "amountPaid", "balanceDue", "deliveryCharges", "packagingCharges", "serviceCharge"].includes(ch.field);
                      const formatVal = (val: any) => {
                        if (val === "" || val === null || val === undefined) return "—";
                        if (isCurrency && !isNaN(Number(val))) {
                          return `₹${Number(val).toLocaleString("en-IN")}`;
                        }
                        return String(val);
                      };

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {ch.label || ch.field}
                            </span>
                            {isCurrency && (
                              <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-xs">
                                Financial
                              </span>
                            )}
                          </div>

                          {ch.summary ? (
                            <div className="flex flex-col gap-1.5 mt-1">
                              {ch.summary.split(/•|;/).map((s: string, sIdx: number) => {
                                const text = s.trim();
                                if (!text) return null;
                                const isAdd = text.toLowerCase().startsWith("added");
                                const isRemove = text.toLowerCase().startsWith("removed");
                                const badgeClass = isAdd
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : isRemove
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";

                                return (
                                  <div key={sIdx} className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl border text-[11px] font-bold ${badgeClass}`}>
                                    <span>{isAdd ? "➕" : isRemove ? "➖" : "✏️"}</span>
                                    <span>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono text-xs mt-1">
                              <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold line-through">
                                {formatVal(ch.before)}
                              </span>
                              <ArrowRight size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black">
                                {formatVal(ch.after)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Cursor Load More ── */}
        {nextCursor && (
          <div className="pt-4 text-center">
            <button
              onClick={() => fetchCentralHistory(nextCursor)}
              disabled={loadingMore}
              className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {loadingMore ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronDown size={15} />}
              Load More Older Records
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

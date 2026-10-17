"use client";

import React, { useState, useEffect } from "react";
import { History, User, Calendar, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";

interface ChangeItem {
  field: string;
  label: string;
  before: any;
  after: any;
  summary?: string;
}

interface LogEntry {
  id: string;
  invoiceNo: string;
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  eventType: string;
  reason?: string | null;
  changes: ChangeItem[];
  createdAt: string;
}

interface Props {
  billId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BillHistoryModal({ billId, isOpen, onClose }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && billId) {
      loadInitialHistory();
    } else {
      setLogs([]);
      setNextCursor(null);
      setError(null);
    }
  }, [isOpen, billId]);

  const loadInitialHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/bill-manager/${billId}/history?limit=10`);
      if (!res.ok) throw new Error("Failed to load bill history");
      const data = await res.json();
      setLogs(data.logs || []);
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      setError(err.message || "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await fetch(`/api/bill-manager/${billId}/history?limit=10&cursor=${nextCursor}`);
      if (!res.ok) throw new Error("Failed to load more records");
      const data = await res.json();
      setLogs(prev => [...prev, ...(data.logs || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      toast.error(err.message || "Failed to load older records");
    } finally {
      setLoadingMore(false);
    }
  };

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Audit Edit History</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lightweight change-log for this bill</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center font-black text-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading history logs...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-xs font-bold">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <ShieldCheck size={24} />
              </div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">No edits recorded yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">This bill has not been modified since creation.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-950/70 space-y-8">
              {logs.map((log) => {
                const badge = getEventBadge(log.eventType);
                const changes = Array.isArray(log.changes) ? log.changes : [];

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-4 border-indigo-500 shadow-sm" />

                    <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                      {/* Event Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                          {log.reason && (
                            <span className="text-xs italic text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs">
                              "{log.reason}"
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>

                      {/* Actor Info */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
                        <User size={13} className="text-indigo-500" />
                        <span>{log.actorName || "Staff"}</span>
                        {log.actorRole && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {log.actorRole}
                          </span>
                        )}
                      </div>

                      {/* Changed Fields Diff List */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
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
                            <div key={idx} className="bg-white dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-xs">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="font-black text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                                  {ch.label || ch.field}
                                </span>
                                {isCurrency && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    Financial
                                  </span>
                                )}
                              </div>

                              {ch.summary ? (
                                <div className="flex flex-col gap-1 mt-1">
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
                                      <div key={sIdx} className={`flex items-center gap-2 p-1.5 px-2.5 rounded-xl border text-[11px] font-bold ${badgeClass}`}>
                                        <span>{isAdd ? "➕" : isRemove ? "➖" : "✏️"}</span>
                                        <span>{text}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 mt-1">
                                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold line-through font-mono text-xs">
                                    {formatVal(ch.before)}
                                  </span>
                                  <ArrowRight size={13} className="text-slate-400" />
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black font-mono text-xs">
                                    {formatVal(ch.after)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {nextCursor && (
            <div className="pt-2 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingMore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown size={14} />}
                Load More Older Records
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GitMerge, 
  X, 
  Check, 
  Users, 
  PartyPopper, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Table, Order } from "@/components/TerminalContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  primaryTableId?: string | null;
  tables: Table[];
  orders: Order[];
  currencySymbol?: string;
  kravy?: any;
  onMergeSuccess: (data: {
    primaryTableId: string;
    primaryTableName: string;
    mergedOrderId: string;
    totalItems: number;
    grandTotal: number;
  }) => void;
}

export default function MergeTablesModal({
  isOpen,
  onClose,
  primaryTableId,
  tables,
  orders,
  currencySymbol = "₹",
  kravy,
  onMergeSuccess,
}: Props) {
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>(primaryTableId || "");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [partyNote, setPartyNote] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  // Sync selectedPrimaryId when modal opens with a new primaryTableId
  React.useEffect(() => {
    if (primaryTableId) {
      setSelectedPrimaryId(primaryTableId);
    } else if (tables.length > 0 && !selectedPrimaryId) {
      // Find first table with active order
      const firstActive = tables.find((t) =>
        orders.some((o) => (o.tableId === t.id || o.table?.id === t.id) && o.status !== "COMPLETED" && !o.isDeleted)
      );
      if (firstActive) setSelectedPrimaryId(firstActive.id);
    }
  }, [primaryTableId, tables, orders]);

  // Reset selected source IDs when primary changes
  React.useEffect(() => {
    setSelectedSourceIds((prev) => prev.filter((id) => id !== selectedPrimaryId));
  }, [selectedPrimaryId]);

  // Helper: Index active orders by tableId once per orders change for O(1) instant lookup
  const activeOrdersByTable = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      if (o.status !== "COMPLETED" && !o.isDeleted) {
        const tid = o.tableId || o.table?.id;
        if (tid) {
          const list = map.get(tid) || [];
          list.push(o);
          map.set(tid, list);
        }
      }
    }
    return map;
  }, [orders]);

  const getTableActiveOrders = (tableId: string) => {
    return activeOrdersByTable.get(tableId) || [];
  };

  // Tables that have active orders
  const activeTables = useMemo(() => {
    return tables.filter((t) => (activeOrdersByTable.get(t.id)?.length || 0) > 0);
  }, [tables, activeOrdersByTable]);

  // Candidate source tables (all tables other than the selected primary)
  const candidateSourceTables = useMemo(() => {
    return tables.filter((t) => t.id !== selectedPrimaryId);
  }, [tables, selectedPrimaryId]);

  // Primary Table Details
  const primaryTable = useMemo(() => tables.find((t) => t.id === selectedPrimaryId), [tables, selectedPrimaryId]);
  const primaryOrders = selectedPrimaryId ? (activeOrdersByTable.get(selectedPrimaryId) || []) : [];
  const primaryTotal = useMemo(() => primaryOrders.reduce((sum, o) => sum + (o.total || 0), 0), [primaryOrders]);
  const primaryItemsCount = useMemo(() => primaryOrders.reduce(
    (sum, o) => sum + (Array.isArray(o.items) ? o.items.length : 0),
    0
  ), [primaryOrders]);

  // Source Tables Details
  const selectedSourceTables = useMemo(() => tables.filter((t) => selectedSourceIds.includes(t.id)), [tables, selectedSourceIds]);
  const sourceTotal = useMemo(() => selectedSourceIds.reduce((sum, id) => {
    const ords = activeOrdersByTable.get(id) || [];
    return sum + ords.reduce((s, o) => s + (o.total || 0), 0);
  }, 0), [selectedSourceIds, activeOrdersByTable]);

  const sourceItemsCount = useMemo(() => selectedSourceIds.reduce((sum, id) => {
    const ords = activeOrdersByTable.get(id) || [];
    return (
      sum +
      ords.reduce((s, o) => s + (Array.isArray(o.items) ? o.items.length : 0), 0)
    );
  }, 0), [selectedSourceIds, activeOrdersByTable]);

  // Grand totals
  const combinedGrandTotal = primaryTotal + sourceTotal;
  const combinedItemsCount = primaryItemsCount + sourceItemsCount;

  const toggleSourceTable = (tableId: string) => {
    kravy?.click?.();
    setSelectedSourceIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleMergeSubmit = async () => {
    if (!selectedPrimaryId) {
      toast.error("Please select a Primary Table for the combined bill.");
      return;
    }
    if (selectedSourceIds.length === 0) {
      toast.error("Please select at least 1 other table to merge.");
      return;
    }

    setIsMerging(true);
    kravy?.click?.();

    try {
      const res = await fetch("/api/tables/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryTableId: selectedPrimaryId,
          sourceTableIds: selectedSourceIds,
          partyNote: partyNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to merge tables");
      }

      kravy?.success?.();
      toast.success(data.message || "Tables successfully merged!");
      onMergeSuccess({
        primaryTableId: data.primaryTableId,
        primaryTableName: data.primaryTableName,
        mergedOrderId: data.mergedOrderId,
        totalItems: data.totalItems,
        grandTotal: data.grandTotal,
      });
      onClose();
    } catch (err: any) {
      kravy?.error?.();
      console.error("Merge error:", err);
      toast.error(err.message || "Failed to merge tables");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-white"
          >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
                <GitMerge size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Merge Tables (Party Booking)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <PartyPopper size={11} /> Single Combined Bill
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Combine two or more tables into a single unified bill.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
              title="Close [Esc]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 no-scrollbar">
            {/* Step 1: Select Primary Table */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center">
                    1
                  </span>
                  Select Primary Table (Bill Host)
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                  Host Table
                </span>
              </label>

              <select
                value={selectedPrimaryId}
                onChange={(e) => {
                  kravy?.click?.();
                  setSelectedPrimaryId(e.target.value);
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all cursor-pointer"
              >
                <option value="">-- Select Primary Table --</option>
                {activeTables.map((t) => {
                  const ords = getTableActiveOrders(t.id);
                  const tot = ords.reduce((s, o) => s + (o.total || 0), 0);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.floor ? `(${t.floor})` : ""} · {ords.length} Order(s) · {currencySymbol}{tot}
                    </option>
                  );
                })}
              </select>

              {primaryTable && (
                <div className="mt-2 p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-purple-700 dark:text-purple-300">
                      {primaryTable.name}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {primaryItemsCount} Items currently
                    </span>
                  </div>
                  <span className="font-black text-purple-700 dark:text-purple-300 font-mono">
                    {currencySymbol}{primaryTotal}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Select Source Tables to Merge */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center">
                    2
                  </span>
                  Select Tables to Merge
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Select 1 or more tables
                </span>
              </label>

              {candidateSourceTables.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3 text-slate-400 text-xs">
                  <AlertCircle size={16} className="text-amber-500 shrink-0" />
                  <span>
                    No other tables available to merge.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {candidateSourceTables.map((t) => {
                    const ords = getTableActiveOrders(t.id);
                    const tot = ords.reduce((s, o) => s + (o.total || 0), 0);
                    const itemsCnt = ords.reduce(
                      (s, o) => s + (Array.isArray(o.items) ? o.items.length : 0),
                      0
                    );
                    const isSelected = selectedSourceIds.includes(t.id);
                    const hasActiveOrder = ords.length > 0;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleSourceTable(t.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-600 shadow-md shadow-purple-600/10 scale-[1.01]"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : hasActiveOrder
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {t.name}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black truncate text-slate-900 dark:text-white">
                              {t.name} {t.floor ? `(${t.floor})` : ""}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {hasActiveOrder ? (
                                `${itemsCnt} Items · Token #${ords[0]?.tokenNumber || "N/A"}`
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Vacant (Add to Party)</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasActiveOrder ? (
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                              {currencySymbol}{tot}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Free
                            </span>
                          )}
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-purple-600 border-purple-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Optional Party / Group Label */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 block">
                Party Name / Group Note (Optional)
              </label>
              <input
                type="text"
                value={partyNote}
                onChange={(e) => setPartyNote(e.target.value)}
                placeholder="e.g. Birthday Party / Sharma Family Group"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Live Combined Summary Card */}
            {selectedPrimaryId && selectedSourceIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-950 text-white shadow-xl shadow-purple-900/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />
                <div className="relative z-10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-purple-200/80">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-purple-300" />
                      Combined Party Bill Preview
                    </span>
                    <span>
                      {1 + selectedSourceIds.length} Tables Merged
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-purple-800/60">
                    <div className="flex flex-col">
                      <span className="text-xs text-purple-200/70 font-medium">
                        Tables: {primaryTable?.name} + {selectedSourceTables.map((t) => t.name).join(" + ")}
                      </span>
                      <span className="text-[11px] text-purple-300/80 font-bold">
                        Total Items: {combinedItemsCount}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase text-purple-300/70 font-bold block">
                        New Grand Total
                      </span>
                      <strong className="text-2xl font-black italic tracking-tight font-mono text-white">
                        {currencySymbol}{combinedGrandTotal}
                      </strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isMerging}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleMergeSubmit}
              disabled={isMerging || !selectedPrimaryId || selectedSourceIds.length === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMerging ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Merging Tables...</span>
                </>
              ) : (
                <>
                  <GitMerge size={13} />
                  <span>
                    Merge & Create Single Bill ({selectedSourceIds.length + 1} Tables)
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

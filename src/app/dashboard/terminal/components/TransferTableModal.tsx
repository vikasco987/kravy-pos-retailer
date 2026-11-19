"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  X,
  Search,
  Check,
  RefreshCw,
  Utensils,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Table, Order } from "@/components/TerminalContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: Table | null;
  tables: Table[];
  orders: Order[];
  currencySymbol?: string;
  kravy?: any;
  onTransfer: (sourceTableId: string, targetTableId: string) => Promise<void>;
}

export default function TransferTableModal({
  isOpen,
  onClose,
  sourceTable,
  tables,
  orders,
  currencySymbol = "₹",
  kravy,
  onTransfer,
}: Props) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active running orders on source table
  const sourceOrders = useMemo(() => {
    if (!sourceTable) return [];
    return orders.filter(
      (o) =>
        (o.tableId === sourceTable.id || o.table?.id === sourceTable.id) &&
        o.status !== "COMPLETED" &&
        !o.isDeleted
    );
  }, [sourceTable, orders]);

  // Compute available destination tables (excluding source table itself)
  const availableTables = useMemo(() => {
    if (!sourceTable) return [];
    return tables
      .filter((t) => t.id !== sourceTable.id)
      .map((t) => {
        const hasActiveOrder = orders.some(
          (o) =>
            (o.tableId === t.id || o.table?.id === t.id) &&
            o.status !== "COMPLETED" &&
            !o.isDeleted
        );
        return {
          ...t,
          isOccupied: hasActiveOrder,
        };
      })
      .filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          (t.zone || "").toLowerCase().includes(q) ||
          (t.floor || "").toLowerCase().includes(q)
        );
      });
  }, [tables, sourceTable, orders, search]);

  const selectedTargetTable = useMemo(
    () => tables.find((t) => t.id === selectedTargetId),
    [tables, selectedTargetId]
  );

  const handleConfirmTransfer = async () => {
    if (!sourceTable) return;
    if (!selectedTargetId) {
      toast.error("Please select a target table to transfer to");
      return;
    }
    const target = tables.find((t) => t.id === selectedTargetId);
    if (!target) return;

    // Check if target has orders
    const targetHasOrders = orders.some(
      (o) =>
        (o.tableId === target.id || o.table?.id === target.id) &&
        o.status !== "COMPLETED" &&
        !o.isDeleted
    );
    if (targetHasOrders) {
      toast.error(`${target.name} already has an active order! Please pick a free table.`);
      return;
    }

    setIsSubmitting(true);
    kravy?.click?.();
    try {
      await onTransfer(sourceTable.id, selectedTargetId);
      onClose();
    } catch (err: any) {
      console.error("TRANSFER_MODAL_ERR:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                  <ArrowRightLeft size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Transfer Table
                    </h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                      Shift Order
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Shift running order from {sourceTable?.name || "Table"} to another free table.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {sourceOrders.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  No Active Order to Transfer
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  There is no active running order on {sourceTable?.name || "this table"}. Transfer is only available when an active order is present.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Visual Transfer Pathway (Source -> Target) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center font-black text-xs shrink-0">
                      {sourceTable?.name}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Current Table</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">{sourceTable?.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {sourceOrders.reduce((acc, o) => acc + (o.items || []).length, 0)} Items
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-indigo-600 dark:text-indigo-400">
                    <ArrowRight size={20} strokeWidth={2.5} className="animate-pulse" />
                  </div>

                  <div className="flex items-center gap-2.5 text-right justify-end">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Target Table</div>
                      <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {selectedTargetTable ? selectedTargetTable.name : "Select Table"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {selectedTargetTable ? (selectedTargetTable.zone || "Default") : "Pick below"}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center font-black text-xs shrink-0">
                      {selectedTargetTable ? selectedTargetTable.name : "?"}
                    </div>
                  </div>
                </div>

                {/* Search Table */}
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search table name, zone or floor..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Destination Tables Grid */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Select Free Table
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {availableTables.map((t) => {
                      const isSelected = t.id === selectedTargetId;
                      const isOccupied = t.isOccupied;

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (!isOccupied) {
                              setSelectedTargetId(t.id);
                              kravy?.click?.();
                            }
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between relative ${
                            isOccupied
                              ? "opacity-40 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                              : isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 shadow-md shadow-indigo-500/10 cursor-pointer"
                              : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-indigo-400 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {t.name}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isOccupied ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                            <span>{t.zone || "Default"}</span>
                            <span>{isOccupied ? "Occupied" : "Free"}</span>
                          </div>

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>

            {sourceOrders.length > 0 && (
              <button
                onClick={handleConfirmTransfer}
                disabled={isSubmitting || !selectedTargetId}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={14} />
                    Transfer Order
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

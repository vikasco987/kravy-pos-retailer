"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, 
  X, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Receipt, 
  Utensils, 
  AlertCircle,
  Sparkles,
  Clock,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Table, Order } from "@/components/TerminalContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  orders: Order[];
  currencySymbol?: string;
  kravy?: any;
  onMergeSuccess: (data: {
    targetOrderId: string;
    combinedItemsCount: number;
    grandTotal: number;
  }) => void;
}

export default function MergeOrdersModal({
  isOpen,
  onClose,
  table,
  orders,
  currencySymbol = "₹",
  kravy,
  onMergeSuccess,
}: Props) {
  // Filter active valid orders on this table
  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status !== "COMPLETED" && !o.isDeleted
    );
  }, [orders]);

  const [targetOrderId, setTargetOrderId] = useState<string>("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeNote, setMergeNote] = useState("");

  // Initialize target order to first order, and others as source orders
  useEffect(() => {
    if (activeOrders.length >= 2) {
      const primary = activeOrders[0];
      setTargetOrderId(primary.id);
      setSelectedSourceIds(activeOrders.slice(1).map((o) => o.id));
    } else if (activeOrders.length === 1) {
      setTargetOrderId(activeOrders[0].id);
      setSelectedSourceIds([]);
    } else {
      setTargetOrderId("");
      setSelectedSourceIds([]);
    }
  }, [activeOrders, isOpen]);

  const targetOrder = useMemo(
    () => activeOrders.find((o) => o.id === targetOrderId),
    [activeOrders, targetOrderId]
  );

  const selectedSourceOrders = useMemo(
    () => activeOrders.filter((o) => selectedSourceIds.includes(o.id)),
    [activeOrders, selectedSourceIds]
  );

  // Toggle source order selection
  const toggleSourceOrder = (id: string) => {
    if (id === targetOrderId) return;
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Change target order
  const handleSelectTarget = (newTargetId: string) => {
    setTargetOrderId(newTargetId);
    // If newly selected target was in source list, remove it
    setSelectedSourceIds((prev) => prev.filter((id) => id !== newTargetId));
  };

  // Calculate combined preview
  const preview = useMemo(() => {
    const allToCombine = [
      ...(targetOrder ? [targetOrder] : []),
      ...selectedSourceOrders,
    ];

    let totalItems = 0;
    let grandTotal = 0;

    allToCombine.forEach((ord) => {
      const items = (ord.items as any[]) || [];
      items.forEach((it) => {
        totalItems += Number(it.quantity || it.qty || 1);
        const p = Number(it.price || it.rate || 0);
        const q = Number(it.quantity || it.qty || 1);
        grandTotal += p * q;
      });
    });

    return { totalItems, grandTotal };
  }, [targetOrder, selectedSourceOrders]);

  const handleMerge = async () => {
    if (!targetOrderId) {
      toast.error("Please select a primary order to merge into");
      return;
    }
    if (selectedSourceIds.length === 0) {
      toast.error("Please select at least one order to merge");
      return;
    }

    setIsMerging(true);
    kravy?.click?.();

    try {
      const res = await fetch("/api/orders/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetOrderId,
          sourceOrderIds: selectedSourceIds,
          tableId: table?.id,
          note: mergeNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to merge orders");
      }

      toast.success(`✅ Orders merged successfully! Combined bill is ready.`);
      kravy?.success?.();
      onMergeSuccess({
        targetOrderId,
        combinedItemsCount: data.combinedItemsCount || preview.totalItems,
        grandTotal: data.grandTotal || preview.grandTotal,
      });
      onClose();
    } catch (err: any) {
      console.error("MERGE_ORDERS_ERR:", err);
      toast.error(err.message || "Failed to merge orders");
      kravy?.error?.();
    } finally {
      setIsMerging(false);
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
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <Layers size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Merge Orders · {table?.name || "Table"}
                    </h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      Combine Bill
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Combine multiple running orders on this table into a single unified bill.
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

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {activeOrders.length < 2 ? (
              <div className="p-8 text-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Not Enough Orders to Merge
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  This table currently has {activeOrders.length} active order. At least 2 active orders are required to merge.
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
                {/* 1. Target Order Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    1. Primary Order (Select target order to merge into)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeOrders.map((ord) => {
                      const isSelected = ord.id === targetOrderId;
                      const ordIdx = activeOrders.findIndex((o) => o.id === ord.id);
                      const tokenStr = `#${ordIdx + 1}`;
                      const itemsList = (ord.items as any[]) || [];
                      const orderTotal = itemsList.reduce(
                        (sum, it) => sum + Number(it.price || it.rate || 0) * Number(it.quantity || it.qty || 1),
                        0
                      );

                      return (
                        <div
                          key={ord.id}
                          onClick={() => handleSelectTarget(ord.id)}
                          className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-sm"
                              : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {tokenStr}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                                Order {tokenStr}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold truncate">
                                {itemsList.length} Items · {new Date(ord.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {currencySymbol}{orderTotal.toFixed(0)}
                            </span>
                            {isSelected && (
                              <div className="text-[9px] font-black text-emerald-600 uppercase">
                                Primary
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Source Orders to Merge */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      2. Orders to Combine (Select orders to merge)
                    </label>
                    <span className="text-[10px] font-black text-emerald-600">
                      {selectedSourceIds.length} Selected
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeOrders
                      .filter((o) => o.id !== targetOrderId)
                      .map((ord) => {
                        const isChecked = selectedSourceIds.includes(ord.id);
                        const ordIdx = activeOrders.findIndex((o) => o.id === ord.id);
                      const tokenStr = `#${ordIdx + 1}`;
                        const itemsList = (ord.items as any[]) || [];
                        const orderTotal = itemsList.reduce(
                          (sum, it) => sum + Number(it.price || it.rate || 0) * Number(it.quantity || it.qty || 1),
                          0
                        );

                        return (
                          <div
                            key={ord.id}
                            onClick={() => toggleSourceOrder(ord.id)}
                            className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isChecked
                                ? "bg-white dark:bg-slate-800/80 border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                                : "bg-slate-50/40 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                }`}
                              >
                                {isChecked && <Check size={12} strokeWidth={3} />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    Order {tokenStr}
                                  </span>
                                  {ord.kotNumbers && ord.kotNumbers.length > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                                      KOT #{ord.kotNumbers.join(", #")}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                  {itemsList.map((i) => `${i.name} (x${i.quantity || i.qty || 1})`).join(", ")}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white">
                                {currencySymbol}{orderTotal.toFixed(0)}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {itemsList.length} items
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Combined Bill Preview Summary */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-teal-500/5 dark:from-emerald-950/30 dark:via-slate-800/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={13} /> Merged Bill Preview
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Combined Total ({preview.totalItems} Items)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {currencySymbol}{preview.grandTotal.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600">
                        Ready to Print / Checkout
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              disabled={isMerging}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>

            {activeOrders.length >= 2 && (
              <button
                onClick={handleMerge}
                disabled={isMerging || selectedSourceIds.length === 0}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Merging Orders...
                  </>
                ) : (
                  <>
                    <Layers size={14} />
                    Merge Orders & Combine Bill
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

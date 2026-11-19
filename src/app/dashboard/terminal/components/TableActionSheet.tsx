"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Check,
    Printer,
    ArrowRight,
    GitMerge,
    ArrowRightLeft,
    Layers,
    Edit3,
    Calendar,
    MessageCircle,
    X,
    Clock,
    Users
} from "lucide-react";
import { Table, Order } from "@/components/TerminalContext";

export interface TableActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table | null;
    orders: Order[];
    currencySymbol?: string;
    onNewOrder: (table: Table) => void;
    onAddItem: (table: Table, order: Order) => void;
    onMarkAllReady: (table: Table, order: Order) => void;
    onPrintKOT: (table: Table, order: Order) => void;
    onWhatsApp: (table: Table, order: Order) => void;
    onFinalBill: (table: Table, order: Order) => void;
    onMergeTables: (table: Table) => void;
    onTransferTable: (table: Table) => void;
    onMergeOrders: (table: Table) => void;
    onEditTable: (table: Table) => void;
    onReserveTable?: (table: Table) => void;
}

export const TableActionSheet: React.FC<TableActionSheetProps> = ({
    isOpen,
    onClose,
    table,
    orders,
    currencySymbol = "₹",
    onNewOrder,
    onAddItem,
    onMarkAllReady,
    onPrintKOT,
    onWhatsApp,
    onFinalBill,
    onMergeTables,
    onTransferTable,
    onMergeOrders,
    onEditTable,
    onReserveTable,
}) => {
    // Running orders for this table
    const tableActiveOrders = useMemo(() => {
        if (!table) return [];
        return orders.filter(
            (o) =>
                (o.tableId === table.id || o.table?.id === table.id) &&
                o.status !== "COMPLETED" &&
                !o.isDeleted
        );
    }, [orders, table?.id]);

    const activeOrder = tableActiveOrders[0] || null;

    const isReady = table ? (table.status === "READY" || tableActiveOrders.some((o) => o.status === "READY")) : false;
    const isOccupied =
        isReady ||
        Boolean(table?.status && table.status !== "FREE") ||
        tableActiveOrders.length > 0 ||
        Boolean(table?.activeOrderId) ||
        ((table?.activeCount ?? 0) > 0) ||
        (Number(table?.activeAmount) || 0) > 0;

    // Elapsed time calculation
    const elapsedMinutes = useMemo(() => {
        const timeRef = table?.startTime || activeOrder?.createdAt;
        if (!timeRef) return 0;
        const diffMs = Date.now() - new Date(timeRef).getTime();
        return Math.max(0, Math.floor(diffMs / 60000));
    }, [table?.startTime, activeOrder?.createdAt]);

    const formattedTime = useMemo(() => {
        if (elapsedMinutes >= 60) {
            const hrs = Math.floor(elapsedMinutes / 60);
            const mins = elapsedMinutes % 60;
            return `${hrs}h ${mins}m`;
        }
        return `${elapsedMinutes}m`;
    }, [elapsedMinutes]);

    // Item count & total amount
    const totalItems = useMemo(() => {
        if (!tableActiveOrders.length) return 0;
        return tableActiveOrders.reduce((sum, ord) => {
            if (Array.isArray(ord.items)) {
                return sum + ord.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
            }
            return sum;
        }, 0);
    }, [tableActiveOrders]);

    const totalAmount = useMemo(() => {
        if (!table) return 0;
        if (tableActiveOrders.length > 0) {
            return tableActiveOrders.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
        }
        return Number(table.activeAmount) || 0;
    }, [tableActiveOrders, table?.activeAmount]);

    if (!isOpen || !table) return null;

    // Subtitle text
    const capacityStr = (table as any).capacity ? `${(table as any).capacity} seats` : "Seats available";
    const subtitle = isOccupied
        ? `Walk-in · ${formattedTime} · ${currencySymbol}${totalAmount.toFixed(0)} · ${totalItems || 1} items`
        : table.status === "PENDING"
        ? `Reserved · ${capacityStr}`
        : `Free · ${capacityStr}`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] pointer-events-auto flex items-end sm:items-center justify-center sm:p-4">
                {/* Backdrop with blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 sm:bg-black/70 backdrop-blur-sm sm:backdrop-blur-md"
                />

                {/* Responsive Sheet / Modal (Bottom Sheet on Mobile, Centered Modal Dialog on Tablet & Desktop) */}
                <motion.div
                    initial={{ y: "100%", opacity: 0.8, scale: 1 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full sm:max-w-md md:max-w-lg bg-white dark:bg-[#101627] text-slate-900 dark:text-[#e8ecf4] border-t sm:border border-slate-200/90 dark:border-[#232b45] rounded-t-[24px] sm:rounded-2xl px-4 sm:px-6 pt-3 sm:pt-5 pb-6 sm:pb-6 shadow-2xl sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] z-10 max-h-[90vh] overflow-y-auto"
                >
                    {/* Grab Handle - visible only on mobile */}
                    <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#232b45] mx-auto mb-3 sm:hidden" />

                    {/* Header: Table Name & Subtitle */}
                    <div className="flex items-start justify-between mb-4 px-0.5">
                        <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-[800] tracking-tight leading-snug">
                                    {table.name.toUpperCase().startsWith("TABLE") ? table.name : `Table ${table.name}`}
                                </h3>
                                {isOccupied && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[800] uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        Occupied
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-[13px] font-[500] text-slate-500 dark:text-[#7c86a2] mt-1 truncate">
                                {subtitle}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Primary Grid Actions (2 columns on mobile, 3 columns on tablet/desktop for running tables) */}
                    {isOccupied ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3.5">
                            {/* New Order Button */}
                            <button
                                onClick={() => onNewOrder(table)}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-[#6366f1] hover:bg-[#5254db] text-white text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/40"
                            >
                                <Plus size={16} strokeWidth={2.5} />
                                <span>New order</span>
                            </button>

                            {/* Add Item Button */}
                            <button
                                onClick={() => {
                                    if (activeOrder) {
                                        onAddItem(table, activeOrder);
                                    } else {
                                        onNewOrder(table);
                                    }
                                }}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-slate-100 dark:bg-[#161c2e] hover:bg-slate-200/80 dark:hover:bg-[#1c243b] text-slate-800 dark:text-[#e8ecf4] border border-slate-200/80 dark:border-[#232b45] text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
                            >
                                <Plus size={16} strokeWidth={2.5} className="text-[#6366f1]" />
                                <span>Add item</span>
                            </button>

                            {/* Mark All Ready Button (Emerald) */}
                            <button
                                onClick={() => {
                                    if (activeOrder) onMarkAllReady(table, activeOrder);
                                }}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-[#10b981] hover:bg-[#059669] text-white text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-sm shadow-emerald-500/25 hover:shadow-emerald-500/40"
                            >
                                <Check size={16} strokeWidth={3} />
                                <span>Mark ready</span>
                            </button>

                            {/* Print KOT Button */}
                            <button
                                onClick={() => {
                                    if (activeOrder) onPrintKOT(table, activeOrder);
                                }}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-slate-100 dark:bg-[#161c2e] hover:bg-slate-200/80 dark:hover:bg-[#1c243b] text-slate-800 dark:text-[#e8ecf4] border border-slate-200/80 dark:border-[#232b45] text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
                            >
                                <Printer size={16} className="text-[#6366f1]" />
                                <span>Print KOT</span>
                            </button>

                            {/* WhatsApp Button */}
                            <button
                                onClick={() => {
                                    if (activeOrder) onWhatsApp(table, activeOrder);
                                }}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-[#25D366]/15 hover:bg-[#25D366]/25 dark:bg-[#25D366]/20 dark:hover:bg-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
                            >
                                <MessageCircle size={16} strokeWidth={2.5} />
                                <span>WhatsApp</span>
                            </button>

                            {/* Final Bill Button */}
                            <button
                                onClick={() => {
                                    if (activeOrder) onFinalBill(table, activeOrder);
                                }}
                                className="h-11 sm:h-12 px-3 rounded-[12px] bg-[#6366f1] hover:bg-[#5254db] text-white text-[12px] sm:text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/40"
                            >
                                <ArrowRight size={16} strokeWidth={2.5} />
                                <span>Final bill</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mb-3.5">
                            {/* New Order Button */}
                            <button
                                onClick={() => onNewOrder(table)}
                                className="h-12 px-4 rounded-[12px] bg-[#6366f1] hover:bg-[#5254db] text-white text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/40"
                            >
                                <Plus size={17} strokeWidth={2.5} />
                                <span>New order</span>
                            </button>

                            {/* Reserve Button */}
                            <button
                                onClick={() => {
                                    if (onReserveTable) onReserveTable(table);
                                }}
                                className="h-12 px-4 rounded-[12px] bg-slate-100 dark:bg-[#161c2e] hover:bg-slate-200/80 dark:hover:bg-[#1c243b] text-slate-800 dark:text-[#e8ecf4] border border-slate-200/80 dark:border-[#232b45] text-[13px] font-[700] flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
                            >
                                <Calendar size={17} className="text-blue-500" />
                                <span>Reserve</span>
                            </button>
                        </div>
                    )}

                    {/* Secondary List Rows */}
                    <div className="space-y-1.5 border-t border-slate-200/70 dark:border-[#232b45]/70 pt-2.5">
                        {/* Merge Tables */}
                        <button
                            onClick={() => onMergeTables(table)}
                            className="w-full h-11 sm:h-12 px-3 rounded-[12px] hover:bg-slate-100 dark:hover:bg-[#161c2e] text-left transition-all flex items-center gap-3 active:scale-[0.98] group"
                        >
                            <div className="w-8 h-8 rounded-[9px] bg-indigo-500/15 group-hover:bg-indigo-500/25 text-[#6366f1] flex items-center justify-center shrink-0 transition-colors">
                                <GitMerge size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] sm:text-[13px] font-[700] text-slate-900 dark:text-[#e8ecf4]">
                                    Merge Tables
                                </div>
                                <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-[#7c86a2] truncate">
                                    Party booking & combine tables
                                </div>
                            </div>
                        </button>

                        {/* Transfer Table (Only for occupied tables) */}
                        {isOccupied && (
                            <button
                                onClick={() => onTransferTable(table)}
                                className="w-full h-11 sm:h-12 px-3 rounded-[12px] hover:bg-slate-100 dark:hover:bg-[#161c2e] text-left transition-all flex items-center gap-3 active:scale-[0.98] group"
                            >
                                <div className="w-8 h-8 rounded-[9px] bg-indigo-500/15 group-hover:bg-indigo-500/25 text-[#6366f1] flex items-center justify-center shrink-0 transition-colors">
                                    <ArrowRightLeft size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] sm:text-[13px] font-[700] text-slate-900 dark:text-[#e8ecf4]">
                                        Transfer Table
                                    </div>
                                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-[#7c86a2] truncate">
                                        Shift order to another free table
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* Merge Orders (Only for occupied tables) */}
                        {isOccupied && (
                            <button
                                onClick={() => onMergeOrders(table)}
                                className="w-full h-11 sm:h-12 px-3 rounded-[12px] hover:bg-slate-100 dark:hover:bg-[#161c2e] text-left transition-all flex items-center gap-3 active:scale-[0.98] group"
                            >
                                <div className="w-8 h-8 rounded-[9px] bg-indigo-500/15 group-hover:bg-indigo-500/25 text-[#6366f1] flex items-center justify-center shrink-0 transition-colors">
                                    <Layers size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] sm:text-[13px] font-[700] text-slate-900 dark:text-[#e8ecf4]">
                                        Merge Orders
                                    </div>
                                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-[#7c86a2] truncate">
                                        Combine multiple running orders
                                    </div>
                                </div>
                                {tableActiveOrders.length > 1 && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#10b981] text-white text-[11px] font-[800] leading-none shrink-0 shadow-xs">
                                        {tableActiveOrders.length}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Edit Table */}
                        <button
                            onClick={() => onEditTable(table)}
                            className="w-full h-11 sm:h-12 px-3 rounded-[12px] hover:bg-slate-100 dark:hover:bg-[#161c2e] text-left transition-all flex items-center gap-3 active:scale-[0.98] group"
                        >
                            <div className="w-8 h-8 rounded-[9px] bg-indigo-500/15 group-hover:bg-indigo-500/25 text-[#6366f1] flex items-center justify-center shrink-0 transition-colors">
                                <Edit3 size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] sm:text-[13px] font-[700] text-slate-900 dark:text-[#e8ecf4]">
                                    Edit Table
                                </div>
                                <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-[#7c86a2] truncate">
                                    Rename, change floor or zone
                                </div>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

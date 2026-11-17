"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pencil,
  MoreVertical,
  QrCode,
  ScanLine,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Layers,
  AlertCircle,
  TrendingDown,
  X,
  History,
  Tag,
  Percent,
  Info,
  DollarSign,
  HelpCircle,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Boxes,
  ShieldCheck,
  ChevronRight,
  Flame,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCurrency } from "@/lib/currency-context";
import { kravy } from "@/lib/sounds";
import { OrderDetailsPanel } from "@/app/dashboard/billing/components/OrderDetailsPanel";

interface ItemDetailScreenProps {
  itemId: string;
  categoryName?: string;
  onBack: () => void;
  onEdit: () => void;
  onAdjustStockSuccess?: () => void;
}

export default function ItemDetailScreen({
  itemId,
  categoryName: initialCategoryName,
  onBack,
  onEdit,
  onAdjustStockSuccess,
}: ItemDetailScreenProps) {
  const { currencySymbol: sym } = useCurrency();

  // Tab State: "details" | "transactions"
  const [activeTab, setActiveTab] = useState<"details" | "transactions">("details");

  // Item Data & Loading
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Accordion Sections in Details Tab (All neatly collapsable with beautiful states)
  const [openSections, setOpenSections] = useState<{
    otherPricing: boolean;
    tax: boolean;
    basicInfo: boolean;
    variants: boolean;
  }>({
    otherPricing: false,
    tax: false,
    basicInfo: true, // Opened by default for instant delight
    variants: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<any | null>(null);

  // Handle clicking transaction to view Bill Details (OrderDetailsPanel)
  const handleTransactionClick = async (txn: any) => {
    if (!txn.billId) {
      if (txn.source) toast(`${txn.source}: ${txn.reason || ""}`);
      return;
    }
    const tid = toast.loading("Loading bill details...");
    try {
      const res = await fetch(`/api/bill-manager/${txn.billId}`);
      if (res.ok) {
        const fullData = await res.json();
        setSelectedBillForDetails(fullData.bill || fullData);
      } else {
        toast.error("Failed to load bill details");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bill details");
    } finally {
      toast.dismiss(tid);
    }
  };

  // Bottom Sheet States: Stock In / Stock Out
  const [stockModalType, setStockModalType] = useState<"IN" | "OUT" | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [stockUnitPrice, setStockUnitPrice] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [stockDate, setStockDate] = useState("");
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Fetch Item Full Details
  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/items?id=${itemId}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setItem(data);
      } else {
        toast.error("Failed to load item details");
      }
    } catch (err) {
      console.error("Item detail fetch error:", err);
      toast.error("Error loading item details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions History
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const res = await fetch(`/api/items/transactions?itemId=${itemId}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Transactions fetch error:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (itemId) {
      fetchItemDetails();
      fetchTransactions();
    }
  }, [itemId]);

  // Derived Values
  const currentStock =
    item?.currentStock != null
      ? Number(item.currentStock)
      : item?.openingStock != null
      ? Number(item.openingStock)
      : 0;
  const reorderLevel = item?.reorderLevel != null ? Number(item.reorderLevel) : 0;
  const sellingPrice = Number(item?.sellingPrice || item?.price || 0);
  const purchasePrice = item?.price != null ? Number(item.price) : 0;
  const stockValue = currentStock > 0 ? currentStock * (purchasePrice || sellingPrice) : 0;
  const unit = item?.unit || "Pcs";
  const itemType = item?.itemType || "Product";
  const categoryName = item?.category?.name || initialCategoryName || "General";

  // Stock In / Stock Out Handler
  const handleOpenStockModal = (type: "IN" | "OUT") => {
    setStockModalType(type);
    setStockQty("");
    setStockUnitPrice(type === "IN" && purchasePrice ? String(purchasePrice) : "");
    setStockReason(type === "IN" ? "Purchase" : "Wastage");
    setStockNotes("");
    setStockDate(new Date().toLocaleDateString("en-GB"));
  };

  const handleAdjustStock = async () => {
    if (!item) return;
    const qty = parseFloat(stockQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    const type = stockModalType;
    if (!type) return;

    if (type === "OUT" && currentStock - qty < 0) {
      const confirmNeg = window.confirm(
        `Warning: Remaining stock will be negative (${currentStock - qty}). Proceed anyway?`
      );
      if (!confirmNeg) return;
    }

    setIsSubmittingStock(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          type,
          quantity: qty,
          unitPrice: stockUnitPrice ? parseFloat(stockUnitPrice) : undefined,
          reason: stockReason || (type === "IN" ? "Stock In" : "Stock Out"),
          notes: stockNotes || "",
          adjustmentDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust stock");

      kravy?.success?.();
      toast.success(
        type === "IN" ? `Added ${qty} ${unit} to stock!` : `Deducted ${qty} ${unit} from stock!`
      );

      setStockModalType(null);
      // Refresh current screen data & notify parent
      fetchItemDetails();
      fetchTransactions();
      onAdjustStockSuccess?.();
    } catch (err: any) {
      kravy?.error?.();
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Generate 2-letter Avatar
  const avatarLetters = useMemo(() => {
    if (!item?.name) return "IT";
    const parts = item.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return item.name.slice(0, 2).toUpperCase();
  }, [item?.name]);

  if (loading && !item) {
    return (
      <div className="fixed inset-0 z-[10020] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-indigo-500/20" />
        <p className="text-xs font-black tracking-widest uppercase text-slate-300">
          Loading Item Details...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10020] bg-slate-100 dark:bg-slate-950 flex flex-col justify-between overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* 🔝 HERO HEADER & TOP CARD */}
      {/* ========================================================================= */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs z-10 shrink-0">
        {/* Top Navbar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="h-10 px-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs"
              title="Edit Item Details"
            >
              <Pencil size={15} className="stroke-[2.5]" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              title="More Actions"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Item Title & Hero Identity */}
        <div className="px-5 pt-1 pb-3 flex items-center gap-3.5">
          {item?.imageUrl ? (
            <div className="w-15 h-15 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 shrink-0 shadow-md shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200/70 dark:ring-slate-700">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-black text-xl tracking-tight shrink-0 shadow-md shadow-indigo-500/20">
              {avatarLetters}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ring-4 ${
                  item?.isVeg
                    ? "bg-emerald-500 ring-emerald-500/20"
                    : "bg-rose-500 ring-rose-500/20"
                }`}
                title={item?.isVeg ? "Veg" : "Non-Veg"}
              />
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                {item?.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {itemType}
              </span>
              <span className="text-xs font-semibold text-slate-400 truncate">
                {categoryName}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Price & Realtime Stock Banner */}
        <div className="px-5 pb-3">
          <div className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-indigo-950 text-white shadow-lg shadow-slate-900/15 flex items-center justify-between">
            {/* Background Ambient Glow */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Sale Price
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                  {sym}{sellingPrice.toFixed(2)}
                </span>
                {item?.mrp && Number(item.mrp) > sellingPrice && (
                  <span className="text-xs font-bold text-slate-400 line-through tabular-nums ml-1.5">
                    {sym}{Number(item.mrp).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* In-Stock Live Pill */}
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Current Stock
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl font-black text-sm tabular-nums shadow-sm ${
                  currentStock < 0
                    ? "bg-rose-500/90 text-white ring-2 ring-rose-400/30"
                    : currentStock === 0
                    ? "bg-amber-500/90 text-white ring-2 ring-amber-400/30"
                    : reorderLevel > 0 && currentStock <= reorderLevel
                    ? "bg-amber-500/90 text-white ring-2 ring-amber-400/30"
                    : "bg-emerald-500/90 text-white ring-2 ring-emerald-400/30"
                }`}
              >
                <span>{currentStock}</span>
                <span className="text-[11px] font-bold opacity-90">{unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Details vs Transactions */}
        <div className="flex items-center border-t border-slate-100 dark:border-slate-800/80 px-5 gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`py-3 text-sm font-black relative transition-colors flex items-center gap-2 ${
              activeTab === "details"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Boxes size={16} />
            <span>Details</span>
            {activeTab === "details" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`py-3 text-sm font-black relative transition-colors flex items-center gap-2 ${
              activeTab === "transactions"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Receipt size={16} />
            <span>Transactions</span>
            <span
              className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === "transactions"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {transactions.length}
            </span>
            {activeTab === "transactions" && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
              />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📄 TAB 1: DETAILS CONTENT (Clean Modern Cards & Accordions) */}
      {/* ========================================================================= */}
      {activeTab === "details" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 pb-28">
          {/* Quick Metrics Bar: Barcode & Stock Value Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Barcode Quick Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <ScanLine size={18} />
                </div>
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {item?.barcode ? "Change" : "+ Add"}
                </button>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Barcode / SKU
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 block truncate">
                  {item?.barcode || "No Barcode"}
                </span>
              </div>
            </div>

            {/* Total Stock Value Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                  <TrendingUp size={18} />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Valuation
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Stock Value
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
                  {sym}{stockValue.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Info Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("basicInfo")}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Info size={16} />
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Basic Info & Inventory Alert
                </span>
              </div>
              {openSections.basicInfo ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {openSections.basicInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Category</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {categoryName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Measurement Unit</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Low Stock Warning</span>
                    <span
                      className={`font-black tabular-nums ${
                        reorderLevel > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                      }`}
                    >
                      {reorderLevel > 0 ? `Below ${reorderLevel} ${unit}` : "Disabled"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Dietary Type</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item?.isVeg ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {item?.isVeg ? "Pure Veg" : "Non-Veg"}
                    </span>
                  </div>

                  {item?.description && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Item Description
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {item.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Variants Accordion (if variants exist) */}
          {item?.variants && item.variants.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("variants")}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Layers size={16} />
                  </div>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Available Variants
                  </span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    {item.variants.length}
                  </span>
                </div>
                {openSections.variants ? (
                  <ChevronUp size={18} className="text-slate-400" />
                ) : (
                  <ChevronDown size={18} className="text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {openSections.variants && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs divide-y divide-slate-100 dark:divide-slate-800/80"
                  >
                    {item.variants.map((v: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {v.name}
                        </span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 tabular-nums text-sm">
                          {sym}{Number(v.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Other Pricing Accordion (MRP, Wholesale, Purchase) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("otherPricing")}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Tag size={16} />
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Other Pricing (MRP & Wholesale)
                </span>
              </div>
              {openSections.otherPricing ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {openSections.otherPricing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Purchase / Cost Price</span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {item?.price != null ? `${sym}${Number(item.price).toFixed(2)}` : "Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Maximum Retail Price (MRP)</span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {item?.mrp != null ? `${sym}${Number(item.mrp).toFixed(2)}` : "Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">Wholesale Price</span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums">
                      {item?.wholesalePrice != null
                        ? `${sym}${Number(item.wholesalePrice).toFixed(2)}`
                        : "Not Set"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tax & GST Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("tax")}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Percent size={16} />
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Tax & GST Details
                </span>
              </div>
              {openSections.tax ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>

            <AnimatePresence>
              {openSections.tax && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">Tax Status</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {item?.taxStatus || "Without Tax"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/70 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium">GST Rate</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {item?.gst != null ? `${item.gst}%` : "0%"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-medium">HSN Code</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono">
                      {item?.hsnCode || "—"}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧾 TAB 2: TRANSACTIONS CONTENT (Vibrant Ledger Cards) */}
      {/* ========================================================================= */}
      {activeTab === "transactions" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 pb-28">
          {loadingTransactions ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Loading Transactions...
              </span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/90 dark:border-slate-800 text-center flex flex-col items-center justify-center shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Receipt size={32} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No Transactions Recorded
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Transactions automatically appear here when POS sales or Stock In/Out adjustments are made for this item.
              </p>
            </div>
          ) : (
            transactions.map((txn: any) => {
              const isPlus = txn.quantity > 0;
              const formattedDate =
                txn.date || txn.createdAt
                  ? new Date(txn.date || txn.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "";
              const formattedTime =
                txn.date || txn.createdAt
                  ? new Date(txn.date || txn.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "";

              return (
                <div
                  key={txn.id}
                  onClick={() => handleTransactionClick(txn)}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 transition-all ${
                    txn.billId
                      ? "hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer active:scale-[0.99] group"
                      : "cursor-default"
                  }`}
                  title={txn.billId ? "Click to view Bill Details" : txn.source}
                >
                  {/* Left: Direction Icon + Bill Info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isPlus
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                      }`}
                    >
                      {isPlus ? (
                        <ArrowDown size={20} className="stroke-[3]" />
                      ) : (
                        <ArrowUp size={20} className="stroke-[3]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {txn.billNumber}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                          {txn.source}
                        </span>
                        {txn.paymentStatus && (
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              txn.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {txn.paymentStatus}
                          </span>
                        )}
                      </div>

                      <div className="text-base font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                        {sym}
                        {Math.abs(
                          txn.totalAmount != null && txn.totalAmount > 0
                            ? txn.totalAmount
                            : txn.unitPrice != null && txn.unitPrice > 0
                            ? txn.unitPrice * Math.abs(txn.quantity || 1)
                            : (sellingPrice || 0) * Math.abs(txn.quantity || 1)
                        ).toFixed(2)}
                      </div>

                      <div className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity Badge & Click Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wider">
                        Quantity
                      </span>
                      <span
                        className={`text-base font-black tabular-nums px-2.5 py-1 rounded-xl ${
                          isPlus
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {isPlus ? `+${txn.quantity}` : txn.quantity}
                      </span>
                    </div>

                    {txn.billId && (
                      <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} className="stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📌 BOTTOM FIXED BAR: VIBRANT STOCK IN & STOCK OUT BUTTONS */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 gap-3 z-20 shadow-2xl">
        <button
          type="button"
          onClick={() => handleOpenStockModal("IN")}
          className="group relative overflow-hidden h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowDown size={17} className="stroke-[3]" />
          </div>
          <div className="text-left">
            <span className="block leading-none font-black text-sm">Stock In</span>
            <span className="text-[10px] text-emerald-100/90 font-medium leading-none">Add inventory</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleOpenStockModal("OUT")}
          className="group relative overflow-hidden h-13 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowUp size={17} className="stroke-[3]" />
          </div>
          <div className="text-left">
            <span className="block leading-none font-black text-sm">Stock Out</span>
            <span className="text-[10px] text-rose-100/90 font-medium leading-none">Deduct stock</span>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 📥 BOTTOM SHEET MODAL: STOCK IN / STOCK OUT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {stockModalType && (
          <div className="fixed inset-0 z-[10035] flex items-end justify-center p-0 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[36px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-5 pb-8 relative max-h-[92vh] overflow-y-auto"
            >
              {/* Floating Close Button */}
              <button
                type="button"
                onClick={() => setStockModalType(null)}
                className="w-9 h-9 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-lg absolute -top-4 left-1/2 -translate-x-1/2 hover:scale-105 active:scale-95 transition-all z-10"
              >
                <X size={18} />
              </button>

              {/* Title */}
              <div className="mt-2 mb-4">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {stockModalType === "IN" ? "Stock In" : "Stock Out"} ({item?.name})
                </h3>
              </div>

              {/* Big Quantity Input Box */}
              <div
                className={`border-2 rounded-3xl p-3.5 mb-2 ${
                  stockModalType === "IN"
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                    : "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20"
                }`}
              >
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0.0"
                  className={`w-full text-center text-4xl font-black bg-transparent outline-none tabular-nums ${
                    stockModalType === "IN"
                      ? "text-emerald-600 dark:text-emerald-400 placeholder-emerald-300"
                      : "text-rose-600 dark:text-rose-400 placeholder-rose-300"
                  }`}
                />
              </div>

              {/* Current & Resulting Stock Calculation */}
              {(() => {
                const addQty = parseFloat(stockQty) || 0;
                const newStock =
                  stockModalType === "IN" ? currentStock + addQty : currentStock - addQty;
                return (
                  <div className="flex items-center justify-between px-1 mb-4 text-xs font-bold text-slate-500">
                    <span>
                      Current Stock:{" "}
                      <span
                        className={`tabular-nums font-semibold ${
                          currentStock < 0 ? "text-rose-500" : ""
                        }`}
                      >
                        {currentStock} {unit}
                      </span>
                    </span>
                    {addQty > 0 && (
                      <span
                        className={`font-extrabold ${
                          stockModalType === "IN"
                            ? "text-emerald-600"
                            : newStock < 0
                            ? "text-rose-600"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {stockModalType === "IN" ? "New Stock: " : "Remaining: "}
                        {newStock} {unit}
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {/* Adjustment Date */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      Adjustment Date
                    </label>
                    <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums mt-0.5">
                      {stockDate || new Date().toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Calendar size={18} className="text-slate-400" />
                </div>

                {/* Stock In Price (Only for Stock In) */}
                {stockModalType === "IN" && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                      Stock In Price / Unit ({sym})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stockUnitPrice}
                      onChange={(e) => setStockUnitPrice(e.target.value)}
                      placeholder="e.g. 90"
                      className="w-full text-sm font-black text-slate-900 dark:text-white bg-transparent outline-none tabular-nums"
                    />
                  </div>
                )}

                {/* Reasons Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 px-1 uppercase tracking-wider">
                    Reason
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(stockModalType === "IN"
                      ? ["Purchase", "Opening Stock", "Return"]
                      : ["Wastage", "Damage", "Internal Use"]
                    ).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStockReason(r)}
                        className={`py-2.5 px-1 text-center rounded-2xl text-xs font-black border transition-all truncate ${
                          stockReason === r
                            ? stockModalType === "IN"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                              : "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Notes / Details
                  </label>
                  <input
                    type="text"
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                    placeholder="e.g. Invoice # / Supplier notes"
                    className="w-full text-xs font-medium text-slate-900 dark:text-white bg-transparent outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={isSubmittingStock || !stockQty || parseFloat(stockQty) <= 0}
                  onClick={handleAdjustStock}
                  className={`w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50 transition-all mt-2 ${
                    stockModalType === "IN"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30"
                      : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/30"
                  }`}
                >
                  {isSubmittingStock
                    ? "Updating Stock..."
                    : stockModalType === "IN"
                    ? "Add Stock"
                    : "Remove Stock"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bill Details Panel (Past Bill History drawer) */}
      {selectedBillForDetails && (
        <OrderDetailsPanel
          bill={selectedBillForDetails}
          business={null}
          onClose={() => setSelectedBillForDetails(null)}
          onUpdate={() => {
            fetchTransactions();
            fetchItemDetails();
          }}
        />
      )}
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Edit2, Trash2, Printer, MapPin, Receipt, CheckCircle, Save, Phone, Info, Copy, Plus, User, ChevronDown, ChevronRight, Layers, UtensilsCrossed, ShoppingBag, Truck, Monitor, Utensils, Calendar, UserCheck, History, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, Eye, MessageCircle, FileEdit, Bluetooth, Download } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { getTaxConfig } from "@/lib/tax-config";
import { toast } from "react-hot-toast";
import { useAuthContext } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { BillPreviewModal } from "./BillPreviewModal";
import { PaymentSettlementModal } from "./PaymentSettlementModal";
import { generateA4InvoicePDF } from "@/lib/a4-invoice-generator";

export const OrderDetailsPanel = ({ bill: initialBill, business, onClose, onUpdate }: { bill: any, business: any, onClose: () => void, onUpdate?: (updated: any) => void }) => {
  const [bill, setBill] = useState(initialBill);
  const [isLoadingItems, setIsLoadingItems] = useState(!initialBill?.items);

  const { currencySymbol: sym, currencyCode, taxConfig: ctxTaxConfig } = useCurrency();
  const taxConfig = ctxTaxConfig || getTaxConfig(bill?.currencySymbol || business?.currencyCode || currencyCode || sym || "INR");
  const taxName = taxConfig?.taxName || "GST";
  const taxIdLabel = taxConfig?.taxIdLabel || "GSTIN";
  const isSplitTax = taxConfig?.isSplitTax !== false;
  const { user } = useAuthContext();
  const isAdmin = user?.type === "ADMIN" || user?.type === "MASTER";
  const [activeTab, setActiveTab] = useState<string>("order_info");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Edit History State
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchBillHistory = async (cursor?: string) => {
    if (!bill?.id) return;
    try {
      if (cursor) setHistoryLoadingMore(true);
      else setHistoryLoading(true);
      setHistoryError(null);

      const url = `/api/bill-manager/${bill.id}/history?limit=10${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load edit history");
      const data = await res.json();

      if (cursor) {
        setHistoryLogs(prev => [...prev, ...(data.logs || [])]);
      } else {
        setHistoryLogs(data.logs || []);
      }
      setHistoryNextCursor(data.nextCursor || null);
    } catch (e: any) {
      setHistoryError(e.message || "Failed to load audit logs");
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  };

  useEffect(() => {
    if (activeTab === "edit_history" && historyLogs.length === 0 && !historyLoading) {
      fetchBillHistory();
    }
  }, [activeTab, bill?.id]);

  React.useEffect(() => {
    if (initialBill && !initialBill.items) {
      setIsLoadingItems(true);
      const searchParams = typeof window !== "undefined" ? window.location.search : "";
      fetch(`/api/bill-manager/${initialBill.id}${searchParams}`, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data && data.bill) {
            let itms = data.bill.items || [];
            if (typeof itms === 'string') {
              try { itms = JSON.parse(itms); } catch(e) {}
            }
            if (!Array.isArray(itms)) itms = [];
            setBill({ ...data.bill, items: itms, isOrder: initialBill?.isOrder });
          } else {
            setBill(initialBill);
          }
          setIsLoadingItems(false);
        })
        .catch((e) => {
          console.error("Failed to fetch bill details:", e);
          setBill(initialBill);
          setIsLoadingItems(false);
        });
    } else {
      setBill(initialBill);
    }
  }, [initialBill]);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (bill) {
      setEditName(bill.customerName || "");
      setEditPhone(bill.customerPhone || "");
    }
  }, [bill]);

  const getCustomerAvatar = (name: string) => {
    const trimmed = (name || "Walk-in Customer").trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : trimmed.slice(0, 2).toUpperCase();

    // Deterministic curated gradients
    const gradients = [
      { bg: "from-blue-600 via-indigo-600 to-indigo-700", text: "text-white", border: "border-blue-400/30" },
      { bg: "from-purple-600 via-fuchsia-600 to-pink-600", text: "text-white", border: "border-purple-400/30" },
      { bg: "from-emerald-500 via-teal-600 to-cyan-600", text: "text-white", border: "border-emerald-400/30" },
      { bg: "from-amber-500 via-orange-500 to-rose-500", text: "text-white", border: "border-amber-400/30" },
      { bg: "from-cyan-500 via-blue-600 to-violet-600", text: "text-white", border: "border-cyan-400/30" },
      { bg: "from-rose-500 via-pink-600 to-red-600", text: "text-white", border: "border-rose-400/30" },
    ];
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    const selected = gradients[Math.abs(hash) % gradients.length];
    return { initials, ...selected };
  };

  const taxActive = bill && (bill.tax > 0 || bill.deliveryGst > 0 || bill.packagingGst > 0) && bill.isTaxEnabled !== false;

  // Preview & Delete Confirmation State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = isAdmin || user?.type === "SELLER" || user?.type === "OWNER" || (user?.permissions && user.permissions.includes("delete-bill"));
  const canEdit = isAdmin || user?.type === "SELLER" || user?.type === "OWNER" || (user?.permissions && (user.permissions.includes("edit-bill") || user.permissions.includes("delete-bill")));

  const handlePrintHTML = () => {
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/dashboard/billing/${bill.id}?returnTo=${encodeURIComponent(currentPath)}`);
  };

  const handleEditBill = () => {
    onClose();
    const currentPath = window.location.pathname + window.location.search;
    router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}&returnTo=${encodeURIComponent(currentPath)}`);
  };

  const handleWhatsApp = () => {
    const phone = formatWhatsAppNumber(bill.customerPhone);
    const origin = window.location.origin;
    const pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    const restaurantName = business?.businessName || "Kravy POS";
    const message = encodeURIComponent(
      "🙏 *Thank you for shopping with us!*\n\n" +
      `Hello *${bill.customerName || "Customer"}*,\n\n` +
      `Here is your invoice from *${restaurantName}*:\n\n` +
      "🧾 *Bill No:* #" + bill.billNumber + "\n" +
      "💰 *Bill Amount:* " + sym + bill.total + "\n\n" +
      "📄 *Download Invoice:*\n" + pdfUrl + "\n\n" +
      "We look forward to serving you again! 😊"
    );
    window.open(phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  const handleDeleteBill = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bill-manager/${bill.id}`, {
        method: "DELETE",
        headers: { "x-delete-reason": deleteReason || "Deleted by user" },
      });
      if (res.ok) {
        toast.success("Bill deleted successfully!");
        setShowDeleteModal(false);
        onClose();
        if (onUpdate) onUpdate(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete bill");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting bill");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCustomer = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/bill-manager/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: editName, customerPhone: editPhone }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedBill = data.bill ?? data;
        toast.success("Customer details updated! 🎉");
        if (onUpdate) onUpdate(updatedBill);
        setShowEditCustomer(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to update details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating customer details");
    } finally {
      setEditSaving(false);
    }
  };

  if (!bill) return null;
  if (!mounted) return null;

  const dt = new Date(bill.createdAt);
  const dateStr = dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

  const getOrderTitle = () => {
    const t = bill.tableName || "POS";
    if (t === "POS") return "Counter Order Details";
    if (t.includes("TAKEAWAY")) return "Takeaway Order Details";
    if (t.includes("DELIVERY")) return "Delivery Order Details";
    return `Dine In Order Details (${t})`;
  };

  const paymentStatusClean = (bill.paymentStatus || "").toUpperCase().trim();
  const orderStatusClean = (bill.orderStatus || "").toUpperCase().trim();

  const isCancelled = paymentStatusClean === "CANCELLED" || paymentStatusClean === "DELETED" || paymentStatusClean === "VOID" || orderStatusClean === "CANCELLED" || orderStatusClean === "VOID";

  const isPending = !isCancelled && (
    paymentStatusClean === "PENDING" || 
    paymentStatusClean === "UNPAID" || 
    paymentStatusClean === "HOLD" || 
    paymentStatusClean === "PARTIAL" ||
    orderStatusClean === "PENDING" ||
    orderStatusClean === "ACTIVE" ||
    (bill.isOrder && orderStatusClean !== "COMPLETED" && paymentStatusClean !== "PAID")
  );

  const isSettled = !isCancelled && !isPending && (
    paymentStatusClean === "PAID" || 
    paymentStatusClean === "SETTLED" || 
    paymentStatusClean === "COMPLETED" ||
    (!bill.isOrder && paymentStatusClean !== "PENDING" && paymentStatusClean !== "UNPAID" && paymentStatusClean !== "HOLD" && paymentStatusClean !== "PARTIAL")
  );

  const getStatusLabel = () => {
    if (isCancelled) return "CANCELLED";
    if (isPending) return bill.paymentStatus || bill.orderStatus || "PENDING";
    return bill.paymentStatus || "PAID";
  };

  // KOT details grouping
  const kGroups = (() => {
    const kMap: any = {};
    const items = bill.items || [];

    // Group items by their KOT / token round if available
    items.forEach((it: any) => {
      const kot = it.kotNumber || it.tokenNumber || "Round 1";
      if (!kMap[kot]) {
        kMap[kot] = {
          kotNumber: kot,
          timestamp: it.addedAt ? new Date(it.addedAt) : new Date(bill.createdAt),
          items: []
        };
      }
      kMap[kot].items.push(it);
    });

    let groups = Object.values(kMap);

    // Fallback using bill's kotNumbers list
    if (groups.length === 0 && bill.kotNumbers && bill.kotNumbers.length > 0) {
      bill.kotNumbers.forEach((kotNum: number) => {
        groups.push({
          kotNumber: kotNum,
          timestamp: new Date(bill.createdAt),
          items: items
        });
      });
    }

    // Fallback using single tokenNumber
    if (groups.length === 0) {
      groups.push({
        kotNumber: bill.tokenNumber || "01",
        timestamp: new Date(bill.createdAt),
        items: items
      });
    }

    // Sort KOT rounds in reverse chronological order (newest first)
    groups.sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());

    return groups;
  })();

  const format = (num: number) => {
    if (num === undefined || num === null || isNaN(num)) return "0.00";
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  let grossSubtotal = 0;
  let totalInclusiveGst = 0;
  let totalExclusiveGst = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  const uniqueRates = new Set<number>();
  
  let totalItemDiscounts = 0;
  if (bill.items) {
    // First pass to calculate gross subtotal and item-level discounts
    bill.items.forEach((it: any) => {
       const q = Number(it.qty || it.quantity || 0);
       const r = Number(it.rate || it.price || 0);
       const raw = it.overriddenAmount ?? (q * r);
       let itDisc = 0;
       if (it.itemDiscountType === 'PERCENT' && it.itemDiscountValue) {
         itDisc = (raw * it.itemDiscountValue) / 100;
       } else if (it.itemDiscountType === 'FLAT' && it.itemDiscountValue) {
         itDisc = it.itemDiscountValue;
       }
       totalItemDiscounts += itDisc;
       grossSubtotal += Math.max(0, raw - itDisc);
    });

    // Calculate bill-level discount ratio
    const discountRatio = grossSubtotal > 0 ? Math.max(0, 1 - ((bill.discountAmount || 0) / grossSubtotal)) : 1;

    // Second pass to calculate proportionate tax
    bill.items.forEach((it: any) => {
       const q = Number(it.qty || it.quantity || 0);
       const r = Number(it.rate || it.price || 0);
       const raw = it.overriddenAmount ?? (q * r);
       let itDisc = 0;
       if (it.itemDiscountType === 'PERCENT' && it.itemDiscountValue) {
         itDisc = (raw * it.itemDiscountValue) / 100;
       } else if (it.itemDiscountType === 'FLAT' && it.itemDiscountValue) {
         itDisc = it.itemDiscountValue;
       }
       const originalGross = Math.max(0, raw - itDisc);
       const discountedGross = originalGross * discountRatio;

       const rate = bill.isTaxEnabled !== false ? Number(it.gst || 0) : 0;
       if (rate > 0) uniqueRates.add(rate);
       const isInclusive = it.taxStatus === "With Tax";
       
       let itemGst = 0;
       let splitCgst = 0;
       if (isInclusive) {
           const base = discountedGross / (1 + rate / 100);
           const exactGst = discountedGross - base;
           splitCgst = Math.round(exactGst * 50) / 100;
           itemGst = splitCgst * 2;
           totalInclusiveGst += itemGst;
       } else {
           const exactGst = (discountedGross * rate / 100);
           splitCgst = Math.round(exactGst * 50) / 100;
           itemGst = splitCgst * 2;
           totalExclusiveGst += itemGst;
       }
       
       totalCGST += splitCgst;
       totalSGST += splitCgst;
    });
  }

  const customChargesList = Array.isArray((bill as any).customCharges) ? (bill as any).customCharges : [];
  const customChargesTotal = customChargesList.reduce((sum: number, c: any) => sum + Number(c.amount || c.value || 0), 0);

  const unroundedTotal = grossSubtotal + totalExclusiveGst + (bill.deliveryCharges || 0) + (bill.deliveryGst || 0) + (bill.packagingCharges || 0) + (bill.packagingGst || 0) + (bill.serviceCharge || 0) + customChargesTotal - (bill.discountAmount || 0) - (bill.loyaltyRedeemed || 0);
  const roundOff = bill.total - unroundedTotal;


  return createPortal(
    <div style={{ 
      position: "fixed", inset: 0, zIndex: 999999, 
      display: "flex", justifyContent: "flex-end", 
      background: "linear-gradient(135deg, rgba(243, 246, 252, 0.72) 0%, rgba(15, 23, 42, 0.45) 100%)", 
      backdropFilter: "blur(6px)" 
    }}>
      {/* Backdrop closer click hook */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={onClose} />
      
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .orderDetailsDrawer {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Right Slide-over POS Panel Surface */}
      <div 
        className="orderDetailsDrawer w-full sm:max-w-[620px] h-full bg-white flex flex-col overflow-hidden relative z-2 border-l border-[#E2E8F0] shadow-2xl"
        style={{
          boxSizing: "border-box"
        }}
      >
        {isLoadingItems ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "#FFFFFF" }}>
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-[#315BFF] mb-4"></div>
            <span className="font-bold text-slate-500 text-sm tracking-wide">Fetching Order Details...</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-center gap-2 sm:gap-3 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#E2E8F0] bg-white shrink-0">
              {/* Title & Status/Date Group */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#315BFF]/10 text-[#315BFF] flex items-center justify-center shrink-0">
                  <Receipt size={20} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] sm:text-[20px] font-bold text-[#17233B] tracking-tight leading-snug truncate">
                    {getOrderTitle()}
                  </h3>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-wide uppercase ${
                        isCancelled
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {getStatusLabel()}
                    </span>
                    <span className="text-[#94A3B8]">•</span>
                    <span className="text-[12px] sm:text-[13px] text-[#64748B] font-medium whitespace-nowrap">
                      {dateStr} · {timeStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
                        toast.success("Bill Schema Copied!");
                      }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[#17233B] text-[12px] font-semibold hover:bg-slate-50 transition-all active:scale-95"
                      title="Copy Bill Schema"
                    >
                      <Copy size={13} /> Schema
                    </button>
                    <button
                      onClick={() => setShowSchema(true)}
                      className="hidden sm:flex relative items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                        9+
                      </span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 4l-4 16"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/>
                      </svg>
                      Debug
                    </button>
                  </>
                )}
                <button
                  onClick={async () => {
                    onClose();
                    router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}`);
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 h-[36px] sm:h-[42px] px-2.5 sm:px-4 rounded-xl bg-[#315BFF] hover:bg-blue-600 text-white text-[12px] sm:text-[14px] font-semibold transition-all active:scale-95 shadow-sm whitespace-nowrap"
                >
                  <Plus size={14} className="stroke-[3]" /> Add Items
                </button>
                <button 
                  onClick={onClose} 
                  className="w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] rounded-xl bg-slate-50 hover:bg-slate-100 text-[#64748B] hover:text-[#17233B] border border-[#E2E8F0] flex items-center justify-center transition-all active:scale-90"
                  title="Close (ESC)"
                >
                  <X size={18} className="stroke-[2.5]" />
                </button>
              </div>
            </div>

        {showSchema && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowSchema(false)} />
            <div style={{ background: "#1E293B", borderRadius: "24px", width: "100%", maxWidth: "800px", position: "relative", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4l-4 16"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/></svg>
                    API Payload / Schema Explorer
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94A3B8" }}>Raw data structure for Order #{bill?.billNumber || bill?.id}</p>
                </div>
                <button onClick={() => setShowSchema(false)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} className="hover:bg-red-500/20 hover:text-red-400">
                  <X size={18} />
                </button>
              </div>
              
              <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
                <div style={{ marginBottom: "16px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>API Endpoint</div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <code style={{ flex: 1, background: "rgba(0,0,0,0.5)", padding: "12px", borderRadius: "8px", color: "#A7F3D0", fontSize: "0.85rem", wordBreak: "break-all" }}>
                      GET /api/bill-manager/{bill?.id}
                    </code>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`GET /api/bill-manager/${bill?.id}`);
                      toast.success("Endpoint copied!");
                    }} style={{ padding: "0 16px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }} className="hover:bg-white/20">
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>JSON Payload</div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
                      toast.success("JSON copied to clipboard!");
                    }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", color: "#818CF8", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }} className="hover:text-indigo-300">
                      <Copy size={14} /> Copy JSON
                    </button>
                  </div>
                  <pre style={{ margin: 0, padding: "16px", background: "transparent", color: "#E2E8F0", fontSize: "0.85rem", overflowX: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: "1.5" }}>
                    {JSON.stringify(bill, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Customer Information Card */}
        <div className="p-3 sm:p-5 bg-white border-b border-[#E2E8F0] shrink-0">
          <div className="relative overflow-hidden bg-white border border-[#DFE7F2] rounded-[16px] p-3 sm:p-5 shadow-xs">
            <div className="flex justify-between items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                {(() => {
                  const avatar = getCustomerAvatar(bill.customerName);
                  return (
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${avatar.bg} ${avatar.text} border ${avatar.border} flex items-center justify-center shrink-0 shadow-sm font-black text-[14px] sm:text-[16px] tracking-wider font-mono`}>
                      {avatar.initials}
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <div className="text-[15px] sm:text-[18px] font-bold text-[#17233B] leading-tight truncate">
                    {bill.customerName || "Walk-in Customer"}
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-[#64748B] font-medium font-mono mt-0.5 truncate">
                    {bill.customerPhone ? `Mob: ${bill.customerPhone}` : "No Contact Details"}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  setEditName(bill.customerName || "");
                  setEditPhone(bill.customerPhone || "");
                  setShowEditCustomer(true);
                }}
                className="h-[34px] sm:h-[38px] px-2.5 sm:px-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-[#315BFF] text-[12px] sm:text-[13px] font-bold active:scale-95 transition-all shrink-0 shadow-xs whitespace-nowrap"
              >
                Edit Details
              </button>
            </div>

            {/* 3 Colored Accent Metadata Cards */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3.5 border-t border-slate-100">
              {/* Card 1: Bill Number (Blue Accent Border) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 p-2 sm:p-3 rounded-[10px] sm:rounded-[12px] border border-blue-200/80 border-l-[3px] sm:border-l-[3.5px] border-l-[#315BFF] shadow-2xs flex flex-col justify-center min-w-0">
                <span className="text-[9px] sm:text-[11px] text-[#315BFF] font-bold uppercase tracking-wider block truncate">
                  BILL NO
                </span>
                <div className="text-[12px] sm:text-[14px] text-[#1E40AF] font-bold font-mono mt-0.5 leading-snug truncate" title={`#${bill.billNumber}`}>
                  #{bill.billNumber}
                </div>
              </div>

              {/* Card 2: Source Table (Orange/Amber Accent Border) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 p-2 sm:p-3 rounded-[10px] sm:rounded-[12px] border border-amber-200/80 border-l-[3px] sm:border-l-[3.5px] border-l-amber-500 shadow-2xs flex flex-col justify-center min-w-0">
                <span className="text-[9px] sm:text-[11px] text-amber-700 font-bold uppercase tracking-wider block truncate">
                  SOURCE TABLE
                </span>
                <div className="text-[12px] sm:text-[14px] text-amber-900 font-bold uppercase mt-0.5 truncate leading-snug" title={(bill.tableName || "POS") === "POS" ? "COUNTER" : bill.tableName}>
                  {(bill.tableName || "POS") === "POS" ? "COUNTER" : bill.tableName}
                </div>
              </div>

              {/* Card 3: Order Type (Green Accent Border) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 p-2 sm:p-3 rounded-[10px] sm:rounded-[12px] border border-emerald-200/80 border-l-[3px] sm:border-l-[3.5px] border-l-emerald-500 shadow-2xs flex flex-col justify-center min-w-0">
                <span className="text-[9px] sm:text-[11px] text-emerald-700 font-bold uppercase tracking-wider block truncate">
                  ORDER TYPE
                </span>
                <div className="text-[12px] sm:text-[14px] font-bold uppercase mt-0.5 text-emerald-950 truncate leading-snug">
                  {bill.tableName === "TAKEAWAY" ? "TAKEAWAY" : bill.tableName === "DELIVERY" ? "DELIVERY" : (!bill.tableName || bill.tableName === "POS") ? "COUNTER" : "DINE-IN"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white border-b border-[#E2E8F0] px-4 sm:px-6 gap-4 overflow-x-auto scrollbar-none shrink-0 h-[52px]">
          <button
            onClick={async () => setActiveTab("order_info")}
            className={`h-full text-[13px] sm:text-[14px] font-semibold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "order_info"
                ? "border-[#315BFF] text-[#315BFF]"
                : "border-transparent text-[#94A3B8] hover:text-[#17233B]"
            }`}
          >
            <Receipt size={18} /> Order Info
          </button>
          <button
            onClick={async () => setActiveTab("kot_history")}
            className={`h-full text-[13px] sm:text-[14px] font-semibold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "kot_history"
                ? "border-[#315BFF] text-[#315BFF]"
                : "border-transparent text-[#94A3B8] hover:text-[#17233B]"
            }`}
          >
            <Layers size={18} /> KOT History
          </button>
          <button
            onClick={async () => setActiveTab("customer_details")}
            className={`h-full text-[13px] sm:text-[14px] font-semibold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "customer_details"
                ? "border-[#315BFF] text-[#315BFF]"
                : "border-transparent text-[#94A3B8] hover:text-[#17233B]"
            }`}
          >
            <User size={18} /> Customer Details
          </button>
          <button
            onClick={async () => setActiveTab("edit_history")}
            className={`h-full text-[13px] sm:text-[14px] font-semibold border-b-2 transition-all shrink-0 flex items-center gap-2 ${
              activeTab === "edit_history"
                ? "border-[#315BFF] text-[#315BFF]"
                : "border-transparent text-[#94A3B8] hover:text-[#17233B]"
            }`}
          >
            <History size={18} /> Edit History
          </button>
        </div>

        {/* Scrollable Container Body with Subtle Low-Opacity Blue-Grey Dotted Background */}
        <div 
          className="relative flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 overflow-hidden"
          style={{
            backgroundColor: "#F4F7FC",
            backgroundImage: "radial-gradient(#DCE5F1 1.2px, transparent 1.2px)",
            backgroundSize: "20px 20px"
          }}
        >
          {/* Subtle Ambient Decorative Gradient Glow in Background */}
          <div 
            className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-500/[0.02] blur-3xl" />
            <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-emerald-500/[0.02] blur-3xl" />
          </div>
          
          {/* TAB 1: ORDER INFO */}
          {activeTab === "order_info" && (
            <div className="relative z-1 flex flex-col gap-4">
              {/* Items Grid Table */}
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[14px] text-[#17233B] font-bold">
                    Items Summary ({bill.items?.length || 0})
                  </span>
                  <span className="text-[13px] font-medium text-[#64748B]">
                    Billed Items
                  </span>
                </div>
                
                <div className="relative overflow-hidden w-full border border-[#DFE7F2] rounded-[16px] sm:rounded-[18px] bg-white shadow-xs">
                  {/* Designer Top Colorful Border Accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10" />
                  
                  <div className="w-full overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[340px] sm:min-w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 via-[#F8FAFC] to-slate-50 border-b border-[#DFE7F2] text-[#64748B] font-semibold uppercase text-[11px] sm:text-[12px] tracking-wider h-[40px] sm:h-[46px]">
                          <th className="py-2 px-2.5 sm:px-4 text-left">ITEM NAME</th>
                          {taxActive && <th className="py-2 px-1 text-center w-[44px] sm:w-[52px]">{taxName}</th>}
                          <th className="py-2 px-1 text-center w-[40px] sm:w-[50px]">QTY</th>
                          <th className="py-2 px-1 sm:px-2 text-right w-[65px] sm:w-[80px] whitespace-nowrap">PRICE</th>
                          <th className="py-2 px-2.5 sm:px-4 text-right w-[72px] sm:w-[88px] whitespace-nowrap">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {bill.items?.map((it: any, i: number) => {
                          const q = Number(it.qty || it.quantity || 0);
                          const r = Number(it.rate || it.price || 0);
                          const raw = it.overriddenAmount ?? (q * r);
                          let itDisc = 0;
                          let itDiscLabel = "";
                          if (it.itemDiscountType === 'PERCENT' && it.itemDiscountValue) {
                            itDisc = (raw * it.itemDiscountValue) / 100;
                            itDiscLabel = `${it.itemDiscountValue}%`;
                          } else if (it.itemDiscountType === 'FLAT' && it.itemDiscountValue) {
                            itDisc = it.itemDiscountValue;
                            itDiscLabel = `${sym}${it.itemDiscountValue.toFixed(2)}`;
                          }
                          const lineTotal = Math.max(0, raw - itDisc);

                          return (
                            <tr key={i} className="hover:bg-[#F8FAFC] transition-colors min-h-[46px] sm:min-h-[52px]">
                              <td className="py-2 sm:py-3 px-2.5 sm:px-4 text-[13px] sm:text-[15px] font-semibold text-[#17233B]">
                                <div className="inline items-baseline leading-snug break-words" title={it.name || "Item"}>
                                  <span>{it.name || "Unknown Item"}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(JSON.stringify(it, null, 2));
                                      toast.success("Item Schema Copied!");
                                    }}
                                    title="Copy Item Schema"
                                    className="inline-flex items-center text-slate-300 hover:text-slate-600 ml-1 p-0.5 rounded transition-colors align-middle"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                                {itDisc > 0 && (
                                  <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                    🏷️ Disc: -{sym}{itDisc.toFixed(2)} ({itDiscLabel})
                                  </div>
                                )}
                              </td>
                              {taxActive && (
                                <td className="py-2 px-1 text-center shrink-0">
                                  <span className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-md ${
                                    it.taxStatus === "With Tax" 
                                      ? "bg-indigo-50 text-indigo-700" 
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {it.taxStatus === "With Tax" ? "INCL" : "EXCL"}
                                  </span>
                                </td>
                              )}
                              <td className="py-2 px-1 text-center shrink-0">
                                <span className="inline-flex items-center justify-center min-w-[22px] sm:min-w-[26px] h-[22px] sm:h-[24px] px-1 sm:px-1.5 rounded-md bg-[#F1F5F9] font-bold text-[12px] sm:text-[13px] text-[#17233B] font-mono border border-slate-200">
                                  {q}
                                </span>
                              </td>
                              <td className="py-2 px-1 sm:px-2 text-right text-[13px] sm:text-[15px] font-semibold text-[#17233B] tabular-nums whitespace-nowrap shrink-0">
                                {sym}{format(r)}
                              </td>
                              <td className="py-2 px-2.5 sm:px-4 text-right text-[13px] sm:text-[15px] font-bold text-[#17233B] tabular-nums whitespace-nowrap shrink-0">
                                {sym}{format(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* --- SEAMLESS TICKET DIVIDER WITH CURVED SIDE NOTCHES (NO UGLY DOTS) --- */}
                <div className="relative flex items-center justify-between -my-2 z-20 pointer-events-none px-1">
                  {/* Left Clean Inward Cutout (Punch) */}
                  <div className="relative -ml-2.5 sm:-ml-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F4F6F9] border border-[#CBD5E1] shadow-[inset_-2px_0_3px_rgba(0,0,0,0.06)]" />
                  
                  {/* Clean Subtle Hairline Divider */}
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#CBD5E1]/60 via-slate-200 to-[#CBD5E1]/60 mx-1" />
                  
                  {/* Right Clean Inward Cutout (Punch) */}
                  <div className="relative -mr-2.5 sm:-mr-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F4F6F9] border border-[#CBD5E1] shadow-[inset_2px_0_3px_rgba(0,0,0,0.06)]" />
                </div>
              </div>

              {/* Bill Summary Card with High-End Ticket Finish */}
              <div className="relative bg-white border border-[#DFE7F2] rounded-[18px] p-4 sm:p-5 shadow-xs space-y-3.5 overflow-hidden">

                {/* Subtle Circular Rubber-Stamp Watermark positioned cleanly at Top-Right/Center-Right behind subtotal and tax amounts, away from payment selector */}
                <div 
                  className="pointer-events-none absolute right-4 sm:right-8 top-12 select-none opacity-[0.07] z-0 transition-transform"
                  style={{
                    transform: "rotate(-14deg)",
                  }}
                  aria-hidden="true"
                >
                  <div className={`relative w-[100px] h-[100px] sm:w-[115px] sm:h-[115px] flex items-center justify-center rounded-full border-[3px] p-[2px] sm:p-1 ${
                    isCancelled
                      ? "border-[#E11D48] text-[#E11D48]"
                      : isPending
                      ? "border-[#D97706] text-[#D97706]"
                      : "border-[#16A34A] text-[#16A34A]"
                  }`}>
                    {/* Inner Circular Border for Authentic Double Ring */}
                    <div className="relative w-full h-full rounded-full border-[1.5px] border-current flex flex-col items-center justify-center p-1 sm:p-1.5">
                      
                      {/* Circular Arc SVG Text along Upper Ring */}
                      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                        <defs>
                          <path
                            id="upperRingArc"
                            d="M 16,60 A 44,44 0 0,1 104,60"
                            fill="none"
                          />
                          <path
                            id="lowerRingArc"
                            d="M 104,60 A 44,44 0 0,1 16,60"
                            fill="none"
                          />
                        </defs>
                        <text
                          fill="currentColor"
                          fontSize="9.5"
                          fontWeight="800"
                          letterSpacing="2.2"
                          className="uppercase font-mono select-none"
                        >
                          <textPath href="#upperRingArc" startOffset="50%" textAnchor="middle">
                            {isCancelled
                              ? "ORDER CANCELLED"
                              : isPending
                              ? "PAYMENT PENDING"
                              : "PAYMENT COMPLETED"}
                          </textPath>
                        </text>
                        <text
                          fill="currentColor"
                          fontSize="7.5"
                          fontWeight="700"
                          letterSpacing="1.8"
                          className="uppercase font-mono select-none opacity-80"
                        >
                          <textPath href="#lowerRingArc" startOffset="50%" textAnchor="middle">
                            ★ KRAVY POS ★
                          </textPath>
                        </text>
                      </svg>

                      {/* Small Status Checkmark / Icon above Central Text */}
                      <div className="flex items-center justify-center mb-0.5">
                        {isCancelled ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 sm:w-3 sm:h-3">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        ) : isPending ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 sm:w-3 sm:h-3">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 sm:w-3 sm:h-3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>

                      {/* Bold Central Status Text */}
                      <span className="font-extrabold tracking-[0.16em] uppercase text-[14px] sm:text-[18px] leading-none font-mono select-none">
                        {isCancelled
                          ? "VOID"
                          : isPending
                          ? "PENDING"
                          : "PAID"}
                      </span>
                      
                      {/* Timestamp underneath for authentic certified feel */}
                      <span className="text-[6.5px] sm:text-[7.5px] font-semibold tracking-wider uppercase opacity-75 font-mono mt-0.5 select-none">
                        {dateStr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative z-1 flex flex-col gap-2.5 pb-3 border-b border-[#E2E8F0]">
                  <div className="flex justify-between items-center text-[14px] sm:text-[15px] font-medium text-[#17233B]">
                    <span className="text-[#64748B]">Subtotal (Menu Prices)</span>
                    <span className="font-semibold">{sym}{format(grossSubtotal > 0 ? grossSubtotal : (bill.subtotal || bill.total))}</span>
                  </div>
                  {bill.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#E11D48]">
                      <span>Discount</span>
                      <span className="font-semibold">-{sym}{format(bill.discountAmount)}</span>
                    </div>
                  )}
                  {totalExclusiveGst > 0 && bill.isTaxEnabled !== false && (() => {
                    if (!isSplitTax) {
                      return (
                        <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#16A34A]">
                          <span>{uniqueRates.size === 1 ? `${taxName} (${Array.from(uniqueRates)[0]}%)` : `${taxName} (Extra)`}</span>
                          <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(totalExclusiveGst)}</span>
                        </div>
                      );
                    }
                    const displayCGST = Math.round(totalExclusiveGst * 50) / 100;
                    const displaySGST = totalExclusiveGst - displayCGST;
                    return (
                    <>
                      <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#16A34A]">
                        <span>CGST (Extra){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                        <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(displayCGST)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#16A34A]">
                        <span>SGST (Extra){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                        <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(displaySGST)}</span>
                      </div>
                    </>
                    );
                  })()}
                  {totalInclusiveGst > 0 && bill.isTaxEnabled !== false && (() => {
                    if (!isSplitTax) {
                      return (
                        <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#4F46E5] opacity-90">
                          <span>{taxName} (Included in Subtotal)</span>
                          <span className="font-semibold">({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalInclusiveGst)})</span>
                        </div>
                      );
                    }
                    const displayIncCGST = Math.round(totalInclusiveGst * 50) / 100;
                    const displayIncSGST = totalInclusiveGst - displayIncCGST;
                    return (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#4F46E5] opacity-90">
                            <span>GST (Included in Subtotal)</span>
                            <span className="font-semibold">({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalInclusiveGst)})</span>
                          </div>
                          <div className="flex justify-between items-center text-[12px] font-medium text-[#4F46E5] opacity-80 pl-2 border-l-2 border-[#C7D2FE] ml-1">
                            <span>↳ CGST (Included){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                            <span>({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayIncCGST)})</span>
                          </div>
                          <div className="flex justify-between items-center text-[12px] font-medium text-[#4F46E5] opacity-80 pl-2 border-l-2 border-[#C7D2FE] ml-1">
                            <span>↳ SGST (Included){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                            <span>({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayIncSGST)})</span>
                          </div>
                        </div>
                    );
                  })()}
                  {(bill.tax > 0 && totalExclusiveGst === 0 && totalInclusiveGst === 0) && bill.isTaxEnabled !== false && (
                    <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#D97706]">
                      <span>{taxName}</span>
                      <span className="font-semibold">+{sym}{format(bill.tax)}</span>
                    </div>
                  )}
                  {bill.deliveryCharges > 0 && (
                    <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#17233B]">
                      <span className="text-[#64748B]">Delivery Charges</span>
                      <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.deliveryCharges)}</span>
                    </div>
                  )}
                  {bill.packagingCharges > 0 && (
                    <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#17233B]">
                      <span className="text-[#64748B]">Packaging Charges</span>
                      <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.packagingCharges)}</span>
                    </div>
                  )}
                  {customChargesList.map((c: any, idx: number) => {
                    const amt = Number(c.amount || c.value || 0);
                    if (amt <= 0) return null;
                    return (
                      <div key={idx} className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#17233B]">
                        <span className="text-[#64748B]">{c.name}</span>
                        <span className="font-semibold">+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(amt)}</span>
                      </div>
                    );
                  })}
                  {Math.abs(roundOff) > 0.001 && (
                    <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-medium text-[#64748B]">
                      <span>Round Off</span>
                      <span className="font-semibold text-[#17233B]">
                        {roundOff > 0 ? "+" : "-"}{sym}{Math.abs(roundOff).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Payable Amount Banner with Rich Colorful Gradient */}
                <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-3.5 sm:p-4.5 text-white shadow-md flex flex-wrap gap-3 justify-between items-center">
                  <div className="relative z-10 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
                      TOTAL PAYABLE AMOUNT
                    </span>
                    <div className="text-[26px] sm:text-[34px] font-black text-white tracking-tight mt-0.5 leading-none drop-shadow-xs">
                      {sym}{format(bill.total)}
                    </div>
                    {/* Paid & Due Breakdown Strip */}
                    {(() => {
                      const isPartial = bill.paymentStatus === "PARTIAL";
                      const isDuePending = bill.paymentStatus === "PENDING" || bill.paymentStatus === "Pending";
                      const isDue = (bill.balanceDue !== undefined && bill.balanceDue > 0.01) || isPartial || (isDuePending && (bill.amountPaid !== undefined));

                      if (!isDue && !isPartial && !isDuePending) return null;

                      const paidAmt = bill.amountPaid !== undefined && bill.amountPaid !== null ? Number(bill.amountPaid) : (isDuePending ? 0 : bill.total);
                      const dueAmt = bill.balanceDue !== undefined && bill.balanceDue !== null ? Number(bill.balanceDue) : Math.max(0, bill.total - paidAmt);

                      return (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
                            Paid: {sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paidAmt)}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold bg-rose-500/90 border border-white/20 px-2 py-0.5 rounded-full text-white shadow-xs">
                            Pending Due: {sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dueAmt)}
                          </span>
                          {dueAmt > 0.01 && (
                            <button
                              type="button"
                              onClick={() => setShowSettlementModal(true)}
                              className="text-[10.5px] font-black bg-white hover:bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full shadow-xs transition-all active:scale-95 flex items-center gap-1 border border-emerald-200"
                            >
                              <CheckCircle size={12} className="text-emerald-600" /> Settle Due
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="relative z-10 text-right flex flex-col items-end shrink-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-100 uppercase tracking-wider block mb-1">
                      {bill.paymentStatus === "PENDING" || bill.paymentStatus === "Pending" ? "INTENDED MODE" : "PAY MODE"}
                    </span>
                    <div className="relative inline-block">
                      <select
                        disabled={bill.paymentStatus === "CANCELLED" || bill.orderStatus === "CANCELLED"}
                        value={bill.paymentMode || "Cash"}
                        onChange={async (e) => {
                          const newMode = e.target.value;
                          try {
                            const res = await fetch(`/api/bill-manager/${bill.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ paymentMode: newMode })
                            });
                            if (!res.ok) throw new Error("Failed to update payment mode");
                            const data = await res.json();
                            const updated = data.bill ?? data;
                            toast.success(`Payment mode updated to ${newMode}! 🎉`);
                            if (onUpdate) onUpdate(updated);
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to update payment mode");
                          }
                        }}
                        className={`appearance-none bg-white/15 backdrop-blur-md border border-white/30 text-white h-[38px] sm:h-[42px] pl-2.5 sm:pl-3 pr-7 rounded-[12px] text-[12px] sm:text-[13px] font-bold uppercase outline-none transition-all ${
                          bill.paymentStatus === "CANCELLED" || bill.orderStatus === "CANCELLED"
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-white/25 focus:bg-white/30"
                        }`}
                      >
                        {bill.paymentMode?.startsWith("Split") && (
                          <option value={bill.paymentMode} className="text-[#17233B]">🛍️ {bill.paymentMode}</option>
                        )}
                        <option value="Cash" className="text-[#17233B]">💵 CASH</option>
                        <option value="UPI" className="text-[#17233B]">📱 UPI</option>
                        <option value="Card" className="text-[#17233B]">💳 CARD</option>
                        <option value="Wallet" className="text-[#17233B]">👛 WALLET</option>
                        {!bill.paymentMode?.startsWith("Split") && (
                          <option value="Split" className="text-[#17233B]">🔀 SPLIT PAYMENT</option>
                        )}
                      </select>
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none text-white/80">
                        <ChevronDown size={14} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Decorative Background Circles */}
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-blue-400/20 blur-lg pointer-events-none" />
                </div>

                {/* Payment History / Settlements Breakdown if available */}
                {Array.isArray(bill.payments) && bill.payments.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                      Payment Ledger ({bill.payments.length} Transaction{bill.payments.length > 1 ? "s" : ""})
                    </span>
                    <div className="space-y-1.5">
                      {bill.payments.map((p: any, pIdx: number) => (
                        <div key={p.id || pIdx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-800 uppercase">{p.mode}</span>
                            {p.txnRef && (
                              <span className="text-[10px] text-slate-400 font-mono truncate">({p.txnRef})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-600">
                              +{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(p.paidAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleek Modern Thermal Tear Edge at Bottom */}
                <div className="relative w-[calc(100%+2rem)] sm:w-[calc(100%+2.5rem)] -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 h-[12px] pointer-events-none mt-2 bg-gradient-to-b from-white to-[#F8FAFC] border-t border-dashed border-[#CBD5E1]" />
              </div>

              {/* Dedicated Section: Staff & Bill Activity */}
              <div className="relative overflow-hidden bg-white border border-[#DFE7F2] rounded-[18px] p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h4 className="text-[13px] sm:text-[14px] font-bold text-[#17233B] leading-tight">Staff & Bill Activity</h4>
                      <p className="text-[11px] text-[#64748B]">Creator attribution and audit tracking</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Audit Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bill Creator Information */}
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                        Created By
                      </span>
                      <div className="text-[13px] font-bold text-slate-900 truncate mt-0.5">
                        {bill.created_by_staff_name || "Unknown / Legacy"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                        <span className="font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] uppercase font-mono">
                          {bill.created_by_role || (bill.created_by_staff_name ? "STAFF" : "LEGACY")}
                        </span>
                        {bill.created_by_staff_id && (
                          <span className="text-slate-500 font-mono text-[10px] truncate max-w-[130px]" title={bill.created_by_staff_id}>
                            ID: {bill.created_by_staff_id}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-medium">
                        {dateStr} at {timeStr}
                      </div>
                    </div>
                  </div>

                  {/* Last Modified Information */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-200/60 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Last Modified
                      </span>
                      <div className="text-[13px] font-bold text-slate-900 truncate mt-0.5">
                        {bill.updated_by_staff_name || "Not Modified"}
                      </div>
                      {bill.updated_by_staff_name ? (
                        <>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                            <span className="font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] uppercase font-mono">
                              {bill.updated_by_role || "STAFF"}
                            </span>
                            {bill.updated_by_staff_id && (
                              <span className="text-slate-500 font-mono text-[10px] truncate max-w-[130px]" title={bill.updated_by_staff_id}>
                                ID: {bill.updated_by_staff_id}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">
                            {bill.updatedAt ? new Date(bill.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "Modified"}
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Original state, no modifications
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons (Vibrant & Colorful) */}
              <div className="mt-1 pt-2 sm:pt-3 border-t border-[#E2E8F0] pb-2 sm:pb-0">
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {/* Print Button (Soft Blue Glass matching other buttons) */}
                  <button
                    type="button"
                    onClick={handlePrintHTML}
                    className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-blue-50 to-indigo-50/50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 text-[11px] sm:text-[13px] font-bold transition-all active:scale-95 border border-blue-200/80 shadow-xs px-1"
                    title="Print Receipt"
                  >
                    <Printer size={19} className="text-blue-600 stroke-[2.5]" />
                    <span className="truncate">Print</span>
                  </button>

                  {/* A4 PDF Download Button */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        generateA4InvoicePDF(bill, business);
                        toast.success("A4 PDF Invoice downloaded!");
                      } catch (err: any) {
                        toast.error("Failed to generate A4 PDF");
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-teal-50 to-emerald-50/50 hover:from-teal-100 hover:to-emerald-100 text-teal-800 text-[11px] sm:text-[13px] font-bold transition-all active:scale-95 border border-teal-200/80 shadow-xs px-1"
                    title="Download A4 PDF Invoice"
                  >
                    <Download size={19} className="text-teal-600 stroke-[2.5]" />
                    <span className="truncate">A4 PDF</span>
                  </button>

                  {/* Preview Button (Soft Purple Glass) */}
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-purple-50 to-indigo-50/50 hover:from-purple-100 hover:to-indigo-100 text-purple-700 text-[11px] sm:text-[13px] font-bold transition-all active:scale-95 border border-purple-200/80 shadow-xs px-1"
                    title="Preview Invoice"
                  >
                    <Eye size={19} className="text-purple-600 stroke-[2.5]" />
                    <span className="truncate">Preview</span>
                  </button>

                  {/* Edit Bill Button (Soft Amber Glass) */}
                  <button
                    type="button"
                    disabled={bill.paymentStatus === "CANCELLED" || bill.orderStatus === "CANCELLED"}
                    onClick={handleEditBill}
                    className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] text-[11px] sm:text-[13px] font-bold transition-all px-1 ${
                      bill.paymentStatus === "CANCELLED" || bill.orderStatus === "CANCELLED"
                        ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50"
                        : "bg-gradient-to-br from-amber-50 to-orange-50/50 hover:from-amber-100 hover:to-orange-100 text-amber-800 border border-amber-200/80 active:scale-95 shadow-xs"
                    }`}
                    title={bill.paymentStatus === "CANCELLED" ? "Cannot edit cancelled order" : "Edit Bill in POS"}
                  >
                    <FileEdit size={19} className={bill.paymentStatus === "CANCELLED" ? "text-slate-400" : "text-amber-600 stroke-[2.5]"} />
                    <span className="truncate">Edit Bill</span>
                  </button>

                  {/* WhatsApp Share Button (Vibrant Emerald) */}
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-emerald-50 to-teal-50/60 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 text-[11px] sm:text-[13px] font-bold transition-all active:scale-95 border border-emerald-200/90 shadow-xs px-1"
                    title="Share Invoice on WhatsApp"
                  >
                    <MessageCircle size={19} className="text-emerald-600 stroke-[2.5]" />
                    <span className="truncate">WhatsApp</span>
                  </button>

                  {/* Delete Bill Button (Soft Rose) */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 h-[64px] sm:h-[78px] rounded-[14px] sm:rounded-[16px] bg-gradient-to-br from-rose-50 to-red-50/60 hover:from-rose-100 hover:to-red-100 text-rose-700 text-[11px] sm:text-[13px] font-bold transition-all active:scale-95 border border-rose-200/80 shadow-xs px-1"
                    title="Delete / Cancel this Bill"
                  >
                    <Trash2 size={19} className="text-rose-600 stroke-[2.5]" />
                    <span className="truncate">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KOT HISTORY */}
          {activeTab === "kot_history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tokens / Rounds Placed</span>
              
              {kGroups.map((group: any, idx: number) => {
                const grTime = new Date(group.timestamp);
                const showTime = grTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                const showDate = grTime.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });

                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    
                    {/* Centered Timestamp Marker */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                      <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                        <Clock size={12} style={{ color: "#64748B" }} />
                        <span style={{ fontSize: "0.72rem", fontWeight: 800 }}>{showDate} {showTime}</span>
                      </div>
                      <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
                    </div>

                    {/* KOT Round Card */}
                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "16px", overflow: "hidden" }}>
                      
                      {/* Round Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F0FDFA", border: "1px solid #CCFBF1", padding: "4px 10px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 900, color: "#0D9488", textTransform: "uppercase" }}>
                          <Layers size={12} /> KOT #{String(group.kotNumber).padStart(4, '0')}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", color: "#64748B", fontWeight: 700 }}>
                          <button
                              onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(group, null, 2));
                                  toast.success("KOT Schema Copied!");
                              }}
                              title="Copy KOT Schema"
                              style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", fontWeight: 700, color: "#475569" }}
                          >
                              <Copy size={10} /> Schema
                          </button>
                          <span>Placed By Cashier</span>
                          <Printer size={12} style={{ cursor: "pointer", color: "#64748B" }} />
                        </div>
                      </div>

                      {/* Items table exactly styled */}
                      <div style={{ 
                        width: "100%", 
                        overflow: "hidden", 
                        border: "1px solid #E2E8F0", 
                        borderRadius: "12px",
                        background: "#FFFFFF",
                        marginTop: "8px"
                      }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                          <thead>
                            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                              <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", borderRight: "1px solid #E2E8F0" }}>Item Name</th>
                              <th style={{ padding: "12px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "65px", borderRight: "1px solid #E2E8F0" }}>Qty</th>
                              <th style={{ padding: "12px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "95px", borderRight: "1px solid #E2E8F0" }}>Price</th>
                              <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", textAlign: "center", width: "105px" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((it: any, i: number) => {
                              const q = Number(it.qty || it.quantity || 0);
                              const r = Number(it.rate || it.price || 0);
                              return (
                                <tr key={i} className="orderItemRow" style={{ borderBottom: i === group.items.length - 1 ? "none" : "1px solid #E2E8F0" }}>
                                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0F172A", borderRight: "1px solid #E2E8F0" }}>
                                    {it.name}
                                  </td>
                                  <td style={{ padding: "12px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                                    {q}
                                  </td>
                                  <td style={{ padding: "12px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                                    {sym} {format(r)}
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#0F172A" }}>
                                    {sym} {format(q * r)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: CUSTOMER DETAILS */}
          {activeTab === "customer_details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Customer Credentials</span>
                <button
                    onClick={() => {
                        const customerSchema = {
                            customerName: bill.customerName,
                            customerPhone: bill.customerPhone,
                            customerAddress: bill.customerAddress,
                            buyerGSTIN: bill.buyerGSTIN,
                            placeOfSupply: bill.placeOfSupply
                        };
                        navigator.clipboard.writeText(JSON.stringify(customerSchema, null, 2));
                        toast.success("Customer Schema Copied!");
                    }}
                    title="Copy Customer Schema"
                    style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}
                >
                    <Copy size={12} /> Schema
                </button>
              </div>
              
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <DetailRow label="Customer Name" value={bill.customerName || "Walk-in Customer"} icon={<User size={16} color="#10B981" />} />
                <DetailRow label="Contact Number" value={bill.customerPhone || "—"} icon={<Phone size={16} color="#2563EB" />} />
                <DetailRow label="Table / Source" value={(bill.tableName || "POS") === "POS" ? "Counter (POS)" : bill.tableName} icon={<UtensilsCrossed size={16} color="#EA580C" />} />
                <DetailRow 
                  label="Order Type" 
                  value={bill.tableName === "TAKEAWAY" ? "TAKEAWAY" : bill.tableName === "DELIVERY" ? "DELIVERY" : (!bill.tableName || bill.tableName === "POS") ? "COUNTER" : "DINE-IN"} 
                  icon={
                    bill.tableName === "TAKEAWAY" 
                      ? <ShoppingBag size={16} color="#F59E0B" /> 
                      : bill.tableName === "DELIVERY" 
                        ? <Truck size={16} color="#8B5CF6" /> 
                        : (!bill.tableName || bill.tableName === "POS") 
                          ? <Monitor size={16} color="#64748B" /> 
                          : <Utensils size={16} color="#10B981" />
                  } 
                />
                
                {bill.zoneName && (
                  <DetailRow label="Service Zone" value={bill.zoneName} icon={<Layers size={16} color="#8B5CF6" />} />
                )}

                {bill.buyerGSTIN && (
                  <DetailRow label={`Buyer ${taxIdLabel}`} value={bill.buyerGSTIN} icon={<Receipt size={16} color="#D97706" />} />
                )}

                {bill.placeOfSupply && (
                  <DetailRow label="Place of Supply" value={bill.placeOfSupply} icon={<MapPin size={16} color="#0891B2" />} />
                )}

                <DetailRow label="Billing Date & Time" value={`${dateStr} at ${timeStr}`} icon={<Calendar size={16} color="#4F46E5" />} />

                <DetailRow 
                  label="Created By" 
                  value={bill.created_by_staff_name ? `${bill.created_by_staff_name} (${bill.created_by_role || "STAFF"})` : "Unknown / Legacy"} 
                  icon={<UserCheck size={16} color="#2563EB" />} 
                />

                {bill.created_by_staff_id && (
                  <DetailRow label="Creator ID" value={bill.created_by_staff_id} icon={<Info size={16} color="#6366F1" />} />
                )}

                <DetailRow 
                  label="Last Modified By" 
                  value={bill.updated_by_staff_name ? `${bill.updated_by_staff_name} (${bill.updated_by_role || "STAFF"})` : "Not Modified"} 
                  icon={<History size={16} color="#D97706" />} 
                />

                {bill.clerkUserId && (
                  <DetailRow label="Business Owner (Clerk ID)" value={bill.clerkUserId} icon={<ShieldCheck size={16} color="#DB2777" />} />
                )}

                {/* Notes box exactly styled as a premium instructions badge */}
                {(bill.notes || bill.auditNote) && (
                  <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>Special Instructions / Audit Notes</span>
                    <div style={{ fontSize: "0.8rem", color: "#92400E", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: "10px", padding: "12px", marginTop: "6px", fontStyle: "italic", lineHeight: 1.4 }}>
                      "{bill.notes || bill.auditNote}"
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 4: EDIT HISTORY */}
          {activeTab === "edit_history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Bill Change-Log & Audit Trail</span>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#94A3B8" }}>Timestamped before/after values of all modifications</p>
                </div>
                <button
                  onClick={() => fetchBillHistory()}
                  disabled={historyLoading}
                  style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}
                  title="Refresh Audit History"
                >
                  <RefreshCw size={12} className={historyLoading ? "animate-spin text-indigo-600" : ""} />
                  Refresh
                </button>
              </div>

              {historyLoading && historyLogs.length === 0 ? (
                <div style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "#64748B" }}>
                  <RefreshCw className="animate-spin text-indigo-600" size={24} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Loading edit history...</span>
                </div>
              ) : historyError ? (
                <div style={{ padding: "16px", borderRadius: "12px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} />
                  <span>{historyError}</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", background: "#F8FAFC", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#EEF2FF", color: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto" }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0F172A" }}>No Edits Recorded</div>
                  <p style={{ fontSize: "0.75rem", color: "#64748B", margin: "4px auto 0 auto", maxWidth: "260px" }}>This bill is in its original state and has not been modified since creation.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {historyLogs.map((log: any) => {
                    const changes = Array.isArray(log.changes) ? log.changes : [];
                    let badgeBg = "#EEF2FF";
                    let badgeColor = "#4338CA";
                    let badgeLabel = "Bill Edited";

                    if (log.eventType === "PAYMENT_UPDATE") {
                      badgeBg = "#ECFDF5";
                      badgeColor = "#047857";
                      badgeLabel = "Payment Update";
                    } else if (log.eventType === "STATUS_CHANGE") {
                      badgeBg = "#EFF6FF";
                      badgeColor = "#1D4ED8";
                      badgeLabel = "Status Change";
                    } else if (log.eventType === "HOLD_STATUS") {
                      badgeBg = "#FFFBEB";
                      badgeColor = "#B45309";
                      badgeLabel = "Hold / Resume";
                    } else if (log.eventType === "CUSTOMER_UPDATE") {
                      badgeBg = "#FAF5FF";
                      badgeColor = "#7E22CE";
                      badgeLabel = "Customer Details";
                    }

                    return (
                      <div key={log.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ background: badgeBg, color: badgeColor, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px" }}>
                              {badgeLabel}
                            </span>
                            {log.reason && (
                              <span style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#64748B" }}>
                                "{log.reason}"
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "#64748B", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} />
                            {new Date(log.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })}
                          </span>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <User size={13} style={{ color: "#4F46E5" }} />
                          <span>Edited by {log.actorName || "Staff"}</span>
                          {log.actorRole && (
                            <span style={{ fontSize: "0.6rem", background: "#E2E8F0", color: "#475569", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                              {log.actorRole}
                            </span>
                          )}
                        </div>

                        {/* Differences list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "8px", borderTop: "1px solid #E2E8F0" }}>
                          {changes.map((ch: any, idx: number) => {
                            const isCurrency = ["total", "subtotal", "tax", "discountAmount", "amountPaid", "balanceDue", "deliveryCharges", "packagingCharges", "serviceCharge"].includes(ch.field);
                            const formatVal = (val: any) => {
                              if (val === "" || val === null || val === undefined) return "—";
                              if (isCurrency && !isNaN(Number(val))) {
                                return `${sym}${Number(val).toLocaleString("en-IN")}`;
                              }
                              return String(val);
                            };

                            return (
                              <div key={idx} style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontWeight: 800, color: "#475569", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.5px" }}>
                                    {ch.label || ch.field}
                                  </span>
                                  {isCurrency && (
                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748B", background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px" }}>
                                      Financial Value
                                    </span>
                                  )}
                                </div>

                                {ch.summary ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                                    {ch.summary.split(/•|;/).map((s: string, sIdx: number) => {
                                      const text = s.trim();
                                      if (!text) return null;
                                      const isAdd = text.toLowerCase().startsWith("added");
                                      const isRemove = text.toLowerCase().startsWith("removed");
                                      const badgeBg = isAdd ? "#ECFDF5" : isRemove ? "#FEF2F2" : "#EFF6FF";
                                      const badgeColor = isAdd ? "#047857" : isRemove ? "#B91C1C" : "#1D4ED8";
                                      const badgeBorder = isAdd ? "#A7F3D0" : isRemove ? "#FECACA" : "#BFDBFE";

                                      return (
                                        <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "6px", background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor, padding: "5px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>
                                          <span style={{ fontSize: "0.85rem" }}>{isAdd ? "➕" : isRemove ? "➖" : "✏️"}</span>
                                          <span>{text}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                                    <div style={{ padding: "4px 8px", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", textDecoration: "line-through", fontWeight: 700, fontSize: "0.82rem", fontFamily: isCurrency ? "monospace" : "inherit" }}>
                                      {formatVal(ch.before)}
                                    </div>
                                    <ArrowRight size={14} style={{ color: "#94A3B8" }} />
                                    <div style={{ padding: "4px 8px", borderRadius: "6px", background: "#ECFDF5", color: "#16A34A", fontWeight: 900, fontSize: "0.85rem", fontFamily: isCurrency ? "monospace" : "inherit" }}>
                                      {formatVal(ch.after)}
                                    </div>
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

              {/* Load More Button */}
              {historyNextCursor && (
                <div style={{ textAlign: "center", paddingTop: "8px" }}>
                  <button
                    onClick={() => fetchBillHistory(historyNextCursor)}
                    disabled={historyLoadingMore}
                    style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, color: "#334155", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {historyLoadingMore ? <RefreshCw className="animate-spin" size={12} /> : <ChevronDown size={14} />}
                    Load More Older Records
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {showEditCustomer && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={async () => setShowEditCustomer(false)} />
            
            <div 
              style={{ 
                position: "relative", zIndex: 2, background: "#FFFFFF", borderRadius: "20px", padding: "28px", 
                width: "100%", maxWidth: "380px", boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15)", 
                display: "flex", flexDirection: "column", gap: "20px", border: "1px solid #E2E8F0",
                animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={18} style={{ color: "#2563EB" }} /> Edit Customer Details
                </div>
                <button 
                  onClick={async () => setShowEditCustomer(false)} 
                  style={{
                    width: "28px", height: "28px", borderRadius: "8px", background: "#F1F5F9",
                    border: "none", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.2s"
                  }}
                  className="hover:bg-red-100 hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Customer Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter customer name"
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "0.9rem", fontWeight: 700, outline: "none", width: "100%" }}
                  className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Phone Number</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Enter phone number"
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "0.9rem", fontWeight: 700, outline: "none", width: "100%" }}
                  className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button 
                  onClick={async () => setShowEditCustomer(false)} 
                  style={{ flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "white", fontWeight: 800, color: "#475569", cursor: "pointer", fontSize: "0.8rem", transition: "0.2s" }}
                  className="hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCustomer} 
                  disabled={editSaving} 
                  style={{ 
                    flex: 1, padding: "11px", borderRadius: "10px", border: "none", 
                    background: "#2563EB", color: "white", fontWeight: 800, cursor: "pointer", 
                    fontSize: "0.8rem", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" 
                  }}
                  className="hover:bg-blue-600"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bill Preview Modal */}
        {showPreviewModal && (
          <BillPreviewModal
            bill={bill}
            business={business}
            onClose={() => setShowPreviewModal(false)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div
              className="absolute inset-0"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />
            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Delete Bill #{bill.billNumber}?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Are you sure? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Reason for Deletion
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Order cancelled, Customer left..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBill}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-rose-600/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettlementModal && (
          <PaymentSettlementModal
            isOpen={showSettlementModal}
            onClose={() => setShowSettlementModal(false)}
            bill={bill}
            currencySymbol={sym}
            onSettled={(updated) => {
              setShowSettlementModal(false);
              setBill(updated);
              if (onUpdate) onUpdate(updated);
            }}
          />
        )}
        </>
        )}
      </div>
    </div>,
    document.body
  );
};

const DetailRow = ({ label, value, icon }: { label: string, value: string, icon: any }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
    <div style={{ marginTop: "2px" }}>{icon}</div>
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "#0F172A", fontWeight: 750, marginTop: "2px" }}>{value}</span>
    </div>
  </div>
);

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Edit2, Trash2, Printer, MapPin, Receipt, CheckCircle, Save, Phone, Info, Copy, Plus, User, ChevronDown, ChevronRight, Layers, UtensilsCrossed, ShoppingBag, Truck, Monitor, Utensils, Calendar, UserCheck, History, RefreshCw, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "react-hot-toast";
import { useAuthContext } from "@/components/AuthContext";
import { useRouter } from "next/navigation";

export const OrderDetailsPanel = ({ bill: initialBill, business, onClose, onUpdate }: { bill: any, business: any, onClose: () => void, onUpdate?: (updated: any) => void }) => {
  const [bill, setBill] = useState(initialBill);
  const [isLoadingItems, setIsLoadingItems] = useState(!initialBill?.items);

  const { currencySymbol: sym } = useCurrency();
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

  const taxActive = bill && (bill.tax > 0 || bill.deliveryGst > 0 || bill.packagingGst > 0) && bill.isTaxEnabled !== false;

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

  const getStatusLabel = () => {
    if (bill.isOrder) return bill.orderStatus || "ACTIVE";
    return bill.paymentStatus || "SETTLED";
  };

  const isSettled = bill.paymentStatus === "Paid" || !bill.isOrder;

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

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  let grossSubtotal = 0;
  let totalInclusiveGst = 0;
  let totalExclusiveGst = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  const uniqueRates = new Set<number>();
  
  if (bill.items) {
    // First pass to calculate gross subtotal
    bill.items.forEach((it: any) => {
       const q = Number(it.qty || it.quantity || 0);
       const r = Number(it.rate || it.price || 0);
       grossSubtotal += (q * r);
    });

    // Calculate discount ratio
    const discountRatio = grossSubtotal > 0 ? Math.max(0, 1 - ((bill.discountAmount || 0) / grossSubtotal)) : 1;

    // Second pass to calculate proportionate tax
    bill.items.forEach((it: any) => {
       const q = Number(it.qty || it.quantity || 0);
       const r = Number(it.rate || it.price || 0);
       const originalGross = q * r;
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

  const unroundedTotal = grossSubtotal + totalExclusiveGst + (bill.deliveryCharges || 0) + (bill.deliveryGst || 0) + (bill.packagingCharges || 0) + (bill.packagingGst || 0) + (bill.serviceCharge || 0) - (bill.discountAmount || 0) - (bill.loyaltyRedeemed || 0);
  const roundOff = bill.total - unroundedTotal;


  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", justifyContent: "flex-end", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }}>
      {/* Backdrop closer click hook */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={onClose} />
      
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .orderDetailsPanel {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .tabBtn {
          transition: all 0.2s;
        }
        .tabBtn:hover {
          color: #0F172A !important;
          background: #F1F5F9;
        }
        .orderItemCard {
          transition: all 0.2s;
        }
        .orderItemCard:hover {
          border-color: #CBD5E1 !important;
          background: #F8FAFC !important;
        }
        .orderItemRow {
          transition: all 0.2s;
        }
        .orderItemRow:hover {
          background: #F8FAFC !important;
        }
      `}</style>

      {/* Slide-over Content Drawer */}
      <div 
        className="orderDetailsPanel"
        style={{
          position: "relative", zIndex: 2, width: "100%", maxWidth: "740px", height: "100%",
          background: "#FFFFFF", borderLeft: "1px solid #E2E8F0",
          boxShadow: "-10px 0 40px rgba(15, 23, 42, 0.1)", display: "flex", flexDirection: "column", overflow: "hidden"
        }}
      >
        {isLoadingItems ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "#FFFFFF" }}>
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 mb-4"></div>
            <span className="font-bold text-slate-500 text-sm tracking-wide">Fetching Order Details...</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          <div style={{ minWidth: "200px", flex: 1 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Receipt size={18} style={{ color: "#2563EB" }} /> {getOrderTitle()}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span style={{
                padding: "3px 10px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800,
                background: isSettled ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: isSettled ? "#10B981" : "#F59E0B", textTransform: "uppercase"
              }}>
                {getStatusLabel()}
              </span>
              <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 600 }}>{dateStr} · {timeStr}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {isAdmin && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
                  toast.success("Bill Schema Copied!");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px",
                  border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", transition: "0.2s"
                }}
                className="hover:bg-slate-200"
                title="Copy Bill Schema"
              >
                <Copy size={14} /> Schema
              </button>
            )}
            <button
              onClick={() => setShowSchema(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px",
                border: "none", background: "#312E81", color: "white", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(49, 46, 129, 0.15)", transition: "0.2s"
              }}
              className="hover:bg-indigo-900 relative"
            >
              <div style={{ position: "absolute", top: "-6px", right: "-6px", background: "#EF4444", color: "white", fontSize: "0.55rem", padding: "2px 4px", borderRadius: "4px", fontWeight: "bold" }}>
                9+
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4l-4 16"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/></svg>
              Debug
            </button>
            <button
              onClick={async () => {
                onClose();
                router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}`);
              }}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px",
                border: "none", background: "#2563EB", color: "white", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)", transition: "0.2s"
              }}
              className="hover:bg-blue-600"
            >
              <Plus size={14} /> Add Items
            </button>
            <button 
              onClick={onClose} 
              style={{
                width: "36px", height: "36px", borderRadius: "10px", background: "#F1F5F9",
                border: "none", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.2s"
              }}
              className="hover:bg-red-100 hover:text-red-600"
            >
              <X size={18} />
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

        {/* Customer Quick Header Box */}
        <div style={{ padding: "20px 24px", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(37, 99, 235, 0.08)", color: "#2563EB", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 850, color: "#0F172A" }}>
                    {bill.customerName || "Walk-in Customer"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "2px", fontWeight: 700, fontFamily: "monospace" }}>
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
                style={{
                  padding: "6px 12px", borderRadius: "8px", border: "1px solid #E2E8F0",
                  background: "#FFFFFF", color: "#475569", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", transition: "0.2s"
                }}
                className="hover:border-slate-400 hover:text-slate-900"
              >
                Edit Details
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #E2E8F0" }}>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>Bill Number</span>
                <div style={{ fontSize: "0.85rem", color: "#2563EB", fontWeight: 900, fontFamily: "monospace", marginTop: "2px" }}>#{bill.billNumber}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>Source Table</span>
                <div style={{ fontSize: "0.85rem", color: "#EA580C", fontWeight: 900, textTransform: "uppercase", marginTop: "2px" }}>
                  {(bill.tableName || "POS") === "POS" ? "Counter (Direct)" : bill.tableName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>Order Type</span>
                <div style={{ 
                  fontSize: "0.85rem", 
                  fontWeight: 900, 
                  textTransform: "uppercase", 
                  marginTop: "2px",
                  color: bill.tableName === "TAKEAWAY" 
                    ? "#F59E0B" // Amber
                    : bill.tableName === "DELIVERY" 
                      ? "#8B5CF6" // Purple
                      : (!bill.tableName || bill.tableName === "POS") 
                        ? "#64748B" // Slate
                        : "#10B981" // Emerald
                }}>
                  {bill.tableName === "TAKEAWAY" ? "TAKEAWAY" : bill.tableName === "DELIVERY" ? "DELIVERY" : (!bill.tableName || bill.tableName === "POS") ? "COUNTER" : "DINE-IN"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Headers */}
        <div style={{ display: "flex", background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 16px" }}>
          <button
            onClick={async () => setActiveTab("order_info")}
            className="tabBtn"
            style={{
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === "order_info" ? "3px solid #2563EB" : "3px solid transparent",
              color: activeTab === "order_info" ? "#2563EB" : "#64748B", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
          >
            Order Info
          </button>
          <button
            onClick={async () => setActiveTab("kot_history")}
            className="tabBtn"
            style={{
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === "kot_history" ? "3px solid #2563EB" : "3px solid transparent",
              color: activeTab === "kot_history" ? "#2563EB" : "#64748B", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
          >
            KOT History
          </button>
          <button
            onClick={async () => setActiveTab("customer_details")}
            className="tabBtn"
            style={{
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === "customer_details" ? "3px solid #2563EB" : "3px solid transparent",
              color: activeTab === "customer_details" ? "#2563EB" : "#64748B", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
          >
            Customer Details
          </button>
          <button
            onClick={async () => setActiveTab("edit_history")}
            className="tabBtn"
            style={{
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === "edit_history" ? "3px solid #2563EB" : "3px solid transparent",
              color: activeTab === "edit_history" ? "#2563EB" : "#64748B", fontSize: "0.82rem", fontWeight: 800, cursor: "pointer",
              borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <History size={14} />
            Edit History
          </button>
        </div>

        {/* Scrollable Container Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", background: "#FFFFFF" }}>
          
          {/* TAB 1: ORDER INFO */}
          {activeTab === "order_info" && (
            <>
              {/* Items Grid Table */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Items Summary</span>
                
                <div style={{ 
                  width: "100%", 
                  overflow: "hidden", 
                  border: "1px solid #E2E8F0", 
                  borderRadius: "12px",
                  background: "#FFFFFF"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ padding: "14px 18px", fontWeight: 700, color: "#475569", borderRight: "1px solid #E2E8F0" }}>Item Name</th>
                        {taxActive && <th style={{ padding: "14px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "85px", borderRight: "1px solid #E2E8F0" }}>GST Type</th>}
                        {taxActive && <th style={{ padding: "14px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "65px", borderRight: "1px solid #E2E8F0" }}>GST %</th>}
                        <th style={{ padding: "14px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "65px", borderRight: "1px solid #E2E8F0" }}>Qty</th>
                        <th style={{ padding: "14px 8px", fontWeight: 700, color: "#475569", textAlign: "center", width: "95px", borderRight: "1px solid #E2E8F0" }}>Price</th>
                        <th style={{ padding: "14px 18px", fontWeight: 700, color: "#475569", textAlign: "center", width: "105px" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.items?.map((it: any, i: number) => {
                        const q = Number(it.qty || it.quantity || 0);
                        const r = Number(it.rate || it.price || 0);
                        return (
                          <tr key={i} className="orderItemRow" style={{ borderBottom: i === bill.items.length - 1 ? "none" : "1px solid #E2E8F0" }}>
                            <td style={{ padding: "14px 18px", fontWeight: 500, color: "#0F172A", borderRight: "1px solid #E2E8F0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {it.name || "Unknown Item"}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(it, null, 2));
                                        toast.success("Item Schema Copied!");
                                    }}
                                    title="Copy Item Schema"
                                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                                >
                                    <Copy size={12} color="#64748B" />
                                </button>
                              </div>
                            </td>
                            {taxActive && (
                              <td style={{ padding: "14px 8px", textAlign: "center", borderRight: "1px solid #E2E8F0" }}>
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: it.taxStatus === "With Tax" ? "#4F46E5" : "#059669", background: it.taxStatus === "With Tax" ? "#EEF2FF" : "#ECFDF5", padding: "4px 8px", borderRadius: "6px" }}>
                                  {it.taxStatus === "With Tax" ? "INCL" : "EXCL"}
                                </span>
                              </td>
                            )}
                            {taxActive && (
                              <td style={{ padding: "14px 8px", textAlign: "center", color: "#334155", fontWeight: 700, borderRight: "1px solid #E2E8F0" }}>
                                {it.gst ? `${it.gst}%` : "-"}
                              </td>
                            )}
                            <td style={{ padding: "14px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                              {q}
                            </td>
                            <td style={{ padding: "14px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                              {sym} {format(r)}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 600, color: "#0F172A" }}>
                              {sym} {format(q * r)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Calculations Summary Box */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "20px", padding: "20px", marginTop: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px dashed #E2E8F0", paddingBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                    <span>Subtotal (Menu Prices)</span>
                    <span style={{ color: "#0F172A", fontWeight: 800 }}>{sym}{format(grossSubtotal > 0 ? grossSubtotal : (bill.subtotal || bill.total))}</span>
                  </div>
                  {bill.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#DC2626" }}>
                      <span>Discount</span>
                      <span style={{ fontWeight: 800 }}>-{sym}{format(bill.discountAmount)}</span>
                    </div>
                  )}
                  {totalExclusiveGst > 0 && bill.isTaxEnabled !== false && (() => {
                    const displayCGST = Math.round(totalExclusiveGst * 50) / 100;
                    const displaySGST = totalExclusiveGst - displayCGST;
                    return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                        <span>CGST (Extra){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                        <span style={{ fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(displayCGST)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                        <span>SGST (Extra){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                        <span style={{ fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(displaySGST)}</span>
                      </div>
                    </>
                    );
                  })()}
                  {totalInclusiveGst > 0 && bill.isTaxEnabled !== false && (() => {
                    const displayIncCGST = Math.round(totalInclusiveGst * 50) / 100;
                    const displayIncSGST = totalInclusiveGst - displayIncCGST;
                    return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#4F46E5", opacity: 0.8 }}>
                            <span>GST (Included in Subtotal)</span>
                            <span style={{ fontWeight: 800 }}>({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalInclusiveGst)})</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 600, color: "#4F46E5", opacity: 0.7, paddingLeft: "8px", borderLeft: "2px solid #C7D2FE", marginLeft: "4px" }}>
                            <span>↳ CGST (Included){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                            <span>({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayIncCGST)})</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 600, color: "#4F46E5", opacity: 0.7, paddingLeft: "8px", borderLeft: "2px solid #C7D2FE", marginLeft: "4px" }}>
                            <span>↳ SGST (Included){uniqueRates.size === 1 ? ` (${Array.from(uniqueRates)[0] / 2}%)` : ''}</span>
                            <span>({sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayIncSGST)})</span>
                          </div>
                        </div>
                    );
                  })()}
                  {(bill.tax > 0 && totalExclusiveGst === 0 && totalInclusiveGst === 0) && bill.isTaxEnabled !== false && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#D97706" }}>
                      <span>GST (Tax)</span>
                      <span style={{ fontWeight: 800 }}>+{sym}{format(bill.tax)}</span>
                    </div>
                  )}
                  {bill.deliveryCharges > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Delivery Charges</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.deliveryCharges)}</span>
                    </div>
                  )}
                  {bill.deliveryGst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                      <span>Delivery GST</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.deliveryGst)}</span>
                    </div>
                  )}
                  {bill.packagingCharges > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Packaging Charges</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.packagingCharges)}</span>
                    </div>
                  )}
                  {bill.packagingGst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                      <span>Packaging GST</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.packagingGst)}</span>
                    </div>
                  )}
                  {bill.serviceCharge > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Service Charge</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+{sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(bill.serviceCharge)}</span>
                    </div>
                  )}
                  {Math.abs(roundOff) > 0.01 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Round Off</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>{roundOff > 0 ? "+" : "-"}{sym}{Math.abs(roundOff).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: "14px" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Total Payable Amount</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 1000, color: "#0F172A", marginTop: "2px" }}>{sym}{format(bill.total)}</div>
                    {bill.paymentStatus === "PARTIAL" && (
                      <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.65rem", color: "#64748B", textTransform: "uppercase" }}>Paid:</span> {sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bill.amountPaid || 0)}
                        </div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#EF4444", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.65rem", color: "#64748B", textTransform: "uppercase" }}>Due:</span> {sym}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bill.balanceDue || 0)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>Payment Mode</span>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
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
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          background: "#EFF6FF",
                          border: "1px solid #BFDBFE",
                          padding: "6px 28px 6px 12px",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 900,
                          color: "#2563EB",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          outline: "none",
                          fontFamily: "inherit",
                          transition: "all 0.2s"
                        }}
                        className="hover:bg-blue-100 hover:border-blue-300"
                      >
                        <option value="Cash">💵 Cash</option>
                        <option value="UPI">📱 UPI</option>
                        <option value="Card">💳 Card</option>
                        <option value="Wallet">👛 Wallet</option>
                      </select>
                      <div style={{ position: "absolute", top: "50%", right: "10px", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center", color: "#2563EB" }}>
                        <ChevronDown size={12} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={async () => {
                    onClose();
                    router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}`);
                  }}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "14px", border: "none",
                    background: "#2563EB", color: "white", fontSize: "0.85rem", fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(37, 99, 235, 0.15)", transition: "0.2s"
                  }}
                  className="hover:bg-blue-600"
                >
                  Proceed to Billing <ChevronRight size={16} />
                </button>
              </div>
            </>
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
                  <DetailRow label="Buyer GSTIN" value={bill.buyerGSTIN} icon={<Receipt size={16} color="#D97706" />} />
                )}

                {bill.placeOfSupply && (
                  <DetailRow label="Place of Supply" value={bill.placeOfSupply} icon={<MapPin size={16} color="#0891B2" />} />
                )}

                <DetailRow label="Billing Date & Time" value={`${dateStr} at ${timeStr}`} icon={<Calendar size={16} color="#4F46E5" />} />

                {bill.clerkUserId && (
                  <DetailRow label="Handled By (Clerk ID)" value={bill.clerkUserId} icon={<UserCheck size={16} color="#DB2777" />} />
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

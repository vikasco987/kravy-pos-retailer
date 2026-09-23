"use client";

import React, { useState } from "react";
import { 
  ChevronDown, ChevronRight, Filter, Clock, CheckCircle2, 
  Smartphone, CreditCard, Wallet, Banknote, MoreVertical, 
  Eye, Printer, FileText, MessageCircle, Trash2, XCircle, CheckCircle, X,
  User, Phone, Calendar, Layers, UtensilsCrossed, Receipt, Plus, MapPin, UserCheck,
  ShoppingBag, Truck, Monitor, Utensils
} from "lucide-react";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/ConfirmContext";


// --- Sub-components ---

const TypeBadge = ({ type }: { type: string }) => {
  const { confirm } = useConfirm();
  const t = type?.toUpperCase() || "POS";
  let color = "#64748B";
  let bg = "rgba(100, 116, 139, 0.1)";
  let label = "Dine-in";

  if (t.includes("DELIVERY")) { color = "#3B82F6"; bg = "rgba(59, 130, 246, 0.1)"; label = "Delivery"; }
  else if (t.includes("TAKEAWAY")) { color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.1)"; label = "Takeaway"; }
  else if (t === "COUNTER" || t !== "POS") { color = "#10B981"; bg = "rgba(16, 185, 129, 0.1)"; label = "Dine-in"; }

  return (
    <span style={{ 
      padding: "5px 12px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800, 
      background: bg, color: color, display: "inline-block", border: `1px solid ${color}20`
    }}>{label}</span>
  );
};

const StatusIndicator = ({ status, isHeld }: { status: string, isHeld?: boolean }) => {
  const s = status?.toLowerCase();
  if (isHeld || s === "pending") return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontSize: "0.65rem", fontWeight: 800 }}>
      <Clock size={12} /> PENDING
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "0.65rem", fontWeight: 800 }}>
      <CheckCircle2 size={12} /> SETTLED
    </div>
  );
};

const PaymentBadge = ({ mode, status, amountPaid, balanceDue, total }: { mode: string, status: string, amountPaid?: number, balanceDue?: number, total?: number }) => {
  const m = (mode || "Cash").toLowerCase();
  
  const formatNum = (num: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
  const isPartial = status?.toUpperCase() === "PARTIAL";

  const renderStatus = () => {
    if (isPartial) {
       return (
         <div style={{ display: "flex", flexDirection: "column", gap: "2px", border: "1px solid #FCD34D", background: "#FFFBEB", padding: "4px 8px", borderRadius: "6px", width: "fit-content" }}>
           <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#D97706" }}>⏱ PARTIAL</div>
           <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#64748B" }}>Paid: <span style={{ color: "#10B981" }}>₹{formatNum(amountPaid!)}</span></div>
           <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#64748B" }}>Due: <span style={{ color: "#EF4444" }}>₹{formatNum(balanceDue!)}</span></div>
         </div>
       );
    }
    
    const isPaid = status === "Paid" || status === "PAID";
    return (
      <div style={{ 
        fontSize: "0.6rem", fontWeight: 900, 
        color: isPaid ? "#10B981" : "#EF4444", 
        border: `1px solid ${isPaid ? "#D1FAE5" : "#FEE2E2"}`, 
        padding: "2px 6px", borderRadius: "4px", width: "fit-content" 
      }}>
        {isPaid ? "✓" : "✗"} {status?.toUpperCase()}
      </div>
    );
  };

  if (m.startsWith("split")) {
    const breakdownMatch = mode.match(/\((.*?)\)/);
    const breakdownText = breakdownMatch ? breakdownMatch[1] : "";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "4px 8px", borderRadius: "6px", background: "#FFFBEB", color: "#D97706",
          fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", width: "fit-content"
        }}>
          <ShoppingBag size={10} /> SPLIT
        </div>
        {breakdownText && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
             {breakdownText.split(",").map((part, i) => (
                <span key={i} style={{ fontSize: "0.55rem", fontWeight: 800, color: "#64748B" }}>
                   • {part.trim()}
                </span>
             ))}
          </div>
        )}
        {renderStatus()}
      </div>

    );
  }

  let icon = <Banknote size={10} />;
  let color = "#6B7280";
  let bg = "#F3F4F6";

  if (m === "upi") { icon = <Smartphone size={10} />; color = "#4F46E5"; bg = "#EEF2FF"; }
  if (m === "card") { icon = <CreditCard size={10} />; color = "#2563EB"; bg = "#EFF6FF"; }
  if (m === "wallet") { icon = <Wallet size={10} />; color = "#7C3AED"; bg = "#F5F3FF"; }
  if (m === "cash") { icon = <Banknote size={10} />; color = "#059669"; bg = "#ECFDF5"; }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "4px 8px", borderRadius: "6px", background: bg, color: color,
        fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", width: "fit-content"
      }}>
        {icon} {mode || "Cash"}
      </div>
      {renderStatus()}
    </div>
  );
};

const MenuOption = ({ icon, label, onClick, isDestructive }: any) => (
  <button 
    type="button"
    onClick={async (e) => { e.stopPropagation(); onClick(e); }} 
    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-[0.85rem] font-bold transition-colors ${isDestructive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon} {label}
  </button>
);

const BillActions = ({ bill, refresh, business, userRole, userPermissions, openMenuId, setOpenMenuId, setPreviewBill, setViewBillDetails }: any) => {
  const isOpen = openMenuId === bill.id;
  const router = useRouter();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<any>({});
  const [mounted, setMounted] = useState(false);
  
  React.useEffect(() => { setMounted(true); }, []);
  
  const canDelete = userRole === "ADMIN" || userRole === "MASTER" || userRole === "SELLER" || userRole === "OWNER" || (userPermissions && userPermissions.includes("delete-bill"));
  const canEdit = userRole === "ADMIN" || userRole === "MASTER" || userRole === "SELLER" || userRole === "OWNER" || (userPermissions && (userPermissions.includes("edit-bill") || userPermissions.includes("delete-bill")));

  const [reasonModal, setReasonModal] = useState<{type: "CANCELLED" | "DELETED", isOpen: boolean} | null>(null);

  const handleDelete = async (reason: string) => {
    try {
      const res = await fetch(`/api/bill-manager/${bill.id}`, { 
        method: "DELETE",
        headers: { "x-delete-reason": reason } 
      });
      if (res.ok) { toast.success("Deleted"); refresh(true); }
    } catch (e) { toast.error("Error"); }
  };

  const handleStatusUpdate = async (status: string, reason?: string) => {
    const label = status === "Paid" ? "PAID" : status === "CANCELLED" ? "CANCELLED" : "UNPAID";
    if (status === "Paid" && !await confirm(`Mark this order as ${label}?`)) return;
    if (status === "Pending" && !await confirm(`Mark this order as ${label}?`)) return;
    
    try {
      if (bill.isOrder && status === "Paid") {
        const res1 = await fetch("/api/bill-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: bill.items,
            subtotal: bill.subtotal,
            tax: bill.tax,
            total: bill.total,
            paymentMode: bill.paymentMode || "Cash",
            paymentStatus: "Paid",
            customerName: bill.customerName,
            customerPhone: bill.customerPhone,
            tableName: bill.tableName,
            orderId: bill.id,
            isKotPrinted: true,
            amountPaid: bill.total
          })
        });

        if (res1.ok) {
           await fetch("/api/orders", {
             method: "PATCH",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ orderId: bill.id, status: "COMPLETED", skipInventoryDeduction: true })
           });
           toast.success(`Updated to PAID`);
           refresh(true);
           return;
        } else {
           throw new Error("Failed to create bill");
        }
      }

      const res = await fetch(`/api/bill-manager/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: status, auditNote: reason ? `Reason: ${reason}` : undefined }),
      });
      if (res.ok) { toast.success(`Updated to ${label}`); refresh(true); }
      else { toast.error("Failed to update"); }
    } catch (e) { toast.error("Error"); }
  };

  const handleWhatsApp = async () => {
    const phone = formatWhatsAppNumber(bill.customerPhone);
    const origin = window.location.origin;
    const pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    const restaurantName = business?.businessName || "Kravy POS";
    const message = encodeURIComponent(
      "🙏 *Thank you for shopping with us!*\n\n" +
      `Hello *${bill.customerName || "Customer"}*,\n\n` +
      `Here is your invoice from *${restaurantName}*:\n\n` +
      "🧾 *Bill No:* " + bill.billNumber + "\n" +
      "💰 *Bill Amount:* Rs. " + bill.total + "\n\n" +
      "📄 *Download Invoice:*\n" + pdfUrl + "\n\n" +
      "We look forward to serving you again! 😊"
    );
    window.open(phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  const toggleMenu = (e: any) => {
    e.stopPropagation();
    if (isOpen) {
      setOpenMenuId(null);
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 280; // approximate height
        const menuWidth = 200;
        
        setMenuPos({
          left: rect.right - menuWidth,
          ...(spaceBelow < menuHeight 
            ? { bottom: window.innerHeight - rect.top + 8 } 
            : { top: rect.bottom + 8 })
        });
      }
      setOpenMenuId(bill.id);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <button 
          ref={buttonRef}
          onClick={toggleMenu} 
          className={`w-[30px] h-[30px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${isOpen ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}
        >
          <MoreVertical size={14} />
        </button>
        {isOpen && mounted && typeof document !== "undefined" && createPortal(
          <div style={{ position: "absolute", zIndex: 99999 }}>
            <div style={{ position: "fixed", inset: 0, zIndex: 99998 }} onClick={async (e) => { e.stopPropagation(); setOpenMenuId(null); }} />
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-y-auto no-scrollbar" style={{
              position: "fixed", left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom, width: "200px",
              borderRadius: "18px", padding: "8px", zIndex: 99999, display: "flex", flexDirection: "column", gap: "2px",
              maxHeight: "300px"
            }}>
              <MenuOption icon={<Eye size={14} color="#3B82F6" />} label="View Details" onClick={async () => { setOpenMenuId(null); setViewBillDetails(bill); }} />
              <MenuOption icon={<Eye size={14} color="#8B5CF6" />} label="Preview" onClick={async () => { setOpenMenuId(null); setPreviewBill(bill); }} />
              <MenuOption icon={<Printer size={14} color="#6B7280" />} label="Reprint Bill" onClick={async () => { setOpenMenuId(null); router.push(`/dashboard/billing/${bill.id}`); }} />
              {canEdit && (
                <MenuOption icon={<FileText size={14} color="#3B82F6" />} label="Edit Bill" onClick={async () => { setOpenMenuId(null); router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}`); }} />
              )}
              <MenuOption icon={<MessageCircle size={14} color="#10B981" />} label="WhatsApp" onClick={async () => { setOpenMenuId(null); handleWhatsApp(); }} />
              
              <div style={{ height: "1px", background: "#F3F4F6", margin: "4px 0" }} />
              
              {bill.paymentStatus !== "Paid" && (
                <MenuOption icon={<CheckCircle size={14} color="#10B981" />} label="Mark as Paid" onClick={async () => { setOpenMenuId(null); handleStatusUpdate("Paid"); }} />
              )}
              {bill.paymentStatus !== "Pending" && bill.paymentStatus !== "Unpaid" && (
                <MenuOption icon={<Clock size={14} color="#F59E0B" />} label="Mark as Unpaid" onClick={async () => { setOpenMenuId(null); handleStatusUpdate("Pending"); }} />
              )}
              {bill.paymentStatus !== "CANCELLED" && bill.paymentStatus !== "DELETED" ? (
                <MenuOption icon={<XCircle size={14} color="#EF4444" />} label="Mark as Cancelled" onClick={async () => { setOpenMenuId(null); setReasonModal({ type: "CANCELLED", isOpen: true }); }} />
              ) : (
                <MenuOption icon={<CheckCircle size={14} color="#10B981" />} label="Restore Order" onClick={async () => { setOpenMenuId(null); handleStatusUpdate("Paid"); }} />
              )}
              {canDelete && (
                <>
                  <div style={{ height: "1px", background: "#F3F4F6", margin: "4px 0" }} />
                  {bill.paymentStatus !== "DELETED" && (
                    <MenuOption icon={<Trash2 size={14} color="#EF4444" />} label="Delete Bill" onClick={async () => { setOpenMenuId(null); setReasonModal({ type: "DELETED", isOpen: true }); }} isDestructive />
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      
      {reasonModal?.isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "20px", width: "90%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 900, marginBottom: "16px", color: "#1E293B" }}>
              {reasonModal.type === "CANCELLED" ? "Cancel Bill" : "Delete Bill"}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "12px" }}>Select a reason:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {["Guest refused to pay", "Wrong Item Billed", "Test Order", "Duplicate Bill"].map(rs => (
                <button key={rs} onClick={() => {
                  setReasonModal(null);
                  if (reasonModal.type === "CANCELLED") handleStatusUpdate("CANCELLED", rs);
                  else handleDelete(rs);
                }} style={{ padding: "10px", background: "#F1F5F9", borderRadius: "10px", textAlign: "left", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                  {rs}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.8rem", color: "#64748B", marginBottom: "8px" }}>Or enter custom reason:</p>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const val = e.target.elements.customReason.value;
              if(!val) return;
              setReasonModal(null);
              if (reasonModal.type === "CANCELLED") handleStatusUpdate("CANCELLED", val);
              else handleDelete(val);
            }}>
              <input name="customReason" autoFocus placeholder="Type reason here..." style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "12px", fontSize: "0.85rem", outline: "none" }} />
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setReasonModal(null)} style={{ padding: "10px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, color: "#64748B" }}>Close</button>
                <button type="submit" style={{ padding: "10px 16px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, background: "#EF4444", color: "white" }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Table Component ---

export default function BillHistoryTable({ bills, business, userRole, userPermissions, refresh, currentPage, itemsPerPage, visibleCols }: any) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewBill, setPreviewBill] = useState<any>(null);
  const [viewBillDetails, setViewBillDetails] = useState<any>(null);

  // Auto-close menu on table scroll
  React.useEffect(() => {
    const handleScroll = (e: Event) => {
      if (openMenuId && e.target instanceof Element && e.target.classList.contains('kravy-card')) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [openMenuId]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  return (
    <div className="kravy-card hidden md:block" style={{ overflowX: "auto", padding: 0, marginBottom: "100px" }}>
      <table className="kravy-table" style={{ minWidth: "1400px", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <th style={{ width: "40px" }}></th>
            {visibleCols.sno && <Th label="#S.No" width="50px" />}
            {visibleCols.timeline && <Th label="Date & Time" width="160px" />}
            {visibleCols.billInfo && <Th label="Bill Info" width="140px" />}
            {visibleCols.source && <Th label="Type" width="110px" />}
            {visibleCols.items && <Th label="Items" width="100px" />}
            {visibleCols.customer && <Th label="Customer" width="150px" />}
            {visibleCols.customerPhone && <Th label="Phone" width="110px" />}
            {visibleCols.subtotal && <Th label="Subtotal" isRight />}
            {visibleCols.discount && <Th label="Disc." isRight color="#EF4444" />}
            {visibleCols.gst && <Th label="GST" isRight color="#F59E0B" />}
            {visibleCols.total && <Th label="Net Total" isRight />}
            {visibleCols.payment && <Th label="Payment" />}
            {visibleCols.token && <Th label="Token" width="70px" />}
            <th style={{ padding: "16px 20px", textAlign: "right", fontSize: "0.7rem", fontWeight: 900, color: "#9CA3AF" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill: any, idx: number) => {
            const isExpanded = expandedRows.has(bill.id);
            const dt = new Date(bill.createdAt);
            const itemsCount = bill.items?.length || 0;

            return (
              <React.Fragment key={bill.id}>
                <tr style={{ borderBottom: isExpanded ? "none" : "" }} className="border-b border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td style={{ padding: "16px 10px", width: "40px", textAlign: "center" }}>
                    <button onClick={async () => toggleRow(bill.id)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </td>
                  {visibleCols.sno && <td style={{ padding: "16px 20px", fontSize: "0.75rem", fontWeight: 700, color: "#D1D5DB" }}>{(currentPage-1)*itemsPerPage + idx + 1}</td>}
                  {visibleCols.timeline && (
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>{dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}</span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9CA3AF" }}>{dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </td>
                  )}
                  {visibleCols.billInfo && (
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#6366F1", fontFamily: "monospace" }}>#{bill.billNumber}</span>
                        <StatusIndicator status={bill.isOrder ? bill.orderStatus! : (bill.paymentStatus || "Paid")} />
                      </div>
                    </td>
                  )}
                  {visibleCols.source && <td><TypeBadge type={bill.tableName || "POS"} /></td>}
                  {visibleCols.items && (
                    <td>
                      <button onClick={async () => toggleRow(bill.id)} style={{ padding: "6px 12px", borderRadius: "10px", background: "#EEF2FF", color: "#6366F1", fontSize: "0.7rem", fontWeight: 900, border: "1px solid #E0E7FF", cursor: "pointer", transition: "all 0.2s" }}>
                        {itemsCount} {itemsCount === 1 ? 'ITEM' : 'ITEMS'}
                      </button>
                    </td>
                  )}
                  {visibleCols.customer && (
  <td className="text-slate-800 dark:text-slate-200" style={{ fontSize: "0.85rem", fontWeight: 800 }}>
    {bill.customerName || "Walk-in"}
    {(bill.paymentStatus === "CANCELLED" || bill.paymentStatus === "DELETED") && bill.auditNote && (
      <div style={{ fontSize: "0.65rem", color: "#EF4444", fontWeight: 700, marginTop: "4px", background: "#FEF2F2", padding: "2px 6px", borderRadius: "4px", display: "inline-block" }}>
        {bill.auditNote}
      </div>
    )}
  </td>
)}
                  {visibleCols.customerPhone && <td style={{ fontSize: "0.75rem", fontFamily: "monospace" }} className="text-slate-400 dark:text-slate-500">{bill.customerPhone || "—"}</td>}
                  {visibleCols.subtotal && <td className="text-slate-800 dark:text-slate-200" style={{ textAlign: "right", fontWeight: 600 }}>₹{format(bill.subtotal || bill.total)}</td>}
                  {visibleCols.discount && <td style={{ textAlign: "right", fontWeight: 700 }} className="text-red-500 dark:text-red-400">₹{format(bill.discountAmount || 0)}</td>}
                  {visibleCols.gst && <td style={{ textAlign: "right", fontWeight: 700 }} className="text-amber-500 dark:text-amber-400">₹{format(bill.tax || 0)}</td>}
                  {visibleCols.total && <td className="text-slate-900 dark:text-white" style={{ textAlign: "right", fontSize: "1rem", fontWeight: 950 }}>₹{format(bill.total)}</td>}
                  {visibleCols.payment && <td><PaymentBadge mode={bill.paymentMode} status={bill.paymentStatus} amountPaid={bill.amountPaid} balanceDue={bill.balanceDue} total={bill.total} /></td>}
                  {visibleCols.token && (
                    <td>
                      {(bill.kotNumbers && bill.kotNumbers.length > 0) ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F1F5F9", padding: "4px 8px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                          <span style={{ fontSize: "0.55rem", fontWeight: 900, color: "#64748B" }}>TOKENS</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 950, color: "#6366F1", fontFamily: "monospace", lineHeight: 1 }}>{bill.kotNumbers.join(', ')}</span>
                        </div>
                      ) : bill.tokenNumber ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F1F5F9", padding: "4px 8px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                          <span style={{ fontSize: "0.55rem", fontWeight: 900, color: "#64748B" }}>TOKEN</span>
                          <span style={{ fontSize: "0.9rem", fontWeight: 950, color: "#6366F1", fontFamily: "monospace", lineHeight: 1 }}>{String(bill.tokenNumber).padStart(2, '0')}</span>
                        </div>
                      ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                    </td>
                  )}
                  <td style={{ textAlign: "right", paddingRight: "60px" }}>
                    <BillActions 
                      bill={bill} 
                      refresh={refresh} 
                      business={business} 
                      userRole={userRole} 
                      userPermissions={userPermissions}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      setPreviewBill={setPreviewBill}
                      setViewBillDetails={setViewBillDetails}
                    />
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={16} style={{ padding: "0 20px 24px 60px" }}>
                       <div style={{ background: "white", borderRadius: "28px", padding: "32px", border: "1px solid #F1F5F9", boxShadow: "0 15px 40px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: "24px", position: "relative", overflow: "hidden" }}>
                          {/* Accent line */}
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "6px", background: "linear-gradient(to bottom, #6366F1, #A855F7)" }} />
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ padding: "10px", background: "#EEF2FF", borderRadius: "12px", color: "#6366F1" }}><FileText size={20} /></div>
                                <div>
                                   <div style={{ fontSize: "1rem", fontWeight: 900, color: "#1E293B" }}>Detailed Items Breakdown</div>
                                   <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94A3B8" }}>Invoice ID: {bill.id.slice(-8).toUpperCase()}</div>
                                </div>
                             </div>
                             <div style={{ display: "flex", gap: "8px" }}>
                                <span style={{ padding: "6px 12px", background: "#F1F5F9", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 900, color: "#64748B" }}>{itemsCount} ITEMS TOTAL</span>
                             </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                             {bill.items?.map((it: any, i: number) => {
                               const q = Number(it.qty || it.quantity || 0);
                               const r = Number(it.rate || it.price || 0);
                               return (
                                 <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#F8FAFC", borderRadius: "20px", border: "1px solid #F1F5F9", transition: "all 0.2s" }} className="hover:border-indigo-100 hover:shadow-sm">
                                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                       <div style={{ width: "36px", height: "36px", background: "white", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E2E8F0", fontSize: "0.75rem", fontWeight: 900, color: "#6366F1" }}>{q}x</div>
                                       <div style={{ display: "flex", flexDirection: "column" }}>
                                          <span style={{ fontWeight: 850, fontSize: "0.9rem", color: "#1E293B" }}>{it.name}</span>
                                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94A3B8" }}>Unit Price: ₹{format(r)}</span>
                                       </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                       <span style={{ fontWeight: 950, fontSize: "1.05rem", color: "#1E293B" }}>₹{format(q * r)}</span>
                                    </div>
                                 </div>
                               );
                             })}
                          </div>

                          <div style={{ marginTop: "8px", background: "#F8FAFC", borderRadius: "24px", padding: "24px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <div style={{ display: "flex", gap: "32px" }}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                   <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#94A3B8", textTransform: "uppercase" }}>Subtotal</span>
                                   <span style={{ fontSize: "1rem", fontWeight: 900, color: "#1E293B" }}>₹{format(bill.subtotal)}</span>
                                </div>
                                {bill.discountAmount > 0 && (
                                   <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#EF4444", textTransform: "uppercase" }}>Discount</span>
                                      <span style={{ fontSize: "1rem", fontWeight: 900, color: "#EF4444" }}>-₹{format(bill.discountAmount)}</span>
                                   </div>
                                )}
                                {bill.tax > 0 && (
                                   <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#F59E0B", textTransform: "uppercase" }}>GST (Tax)</span>
                                      <span style={{ fontSize: "1rem", fontWeight: 900, color: "#F59E0B" }}>+₹{format(bill.tax)}</span>
                                   </div>
                                )}
                             </div>
                             <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "#6366F1", textTransform: "uppercase", letterSpacing: "1px" }}>Total Payable</span>
                                <span style={{ fontSize: "1.75rem", fontWeight: 1000, color: "#1E293B", lineHeight: 1 }}>₹{format(bill.total)}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {previewBill && (
        <BillPreviewModal bill={previewBill} business={business} onClose={() => setPreviewBill(null)} />
      )}

      {viewBillDetails && (
        <OrderDetailsPanel 
          bill={viewBillDetails} 
          business={business} 
          onClose={() => setViewBillDetails(null)} 
          onUpdate={(updatedBill) => {
            setViewBillDetails(updatedBill);
            if (typeof refresh === "function") refresh(true);
          }}
        />
      )}
    </div>
  );
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convert = (n: number, depth = 0): string => {
    if (depth > 10) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100, depth + 1) : '');
    if (n < 100000) return convert(Math.floor(n / 1000), depth + 1) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000, depth + 1) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000), depth + 1) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000, depth + 1) : '');
    return convert(Math.floor(n / 10000000), depth + 1) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000, depth + 1) : '');
  };

  if (isNaN(num) || !isFinite(num)) return '';
  if (num === 0) return 'Zero Only';
  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
  
  let result = convert(integerPart) + ' Rupees';
  if (decimalPart > 0) result += ' and ' + convert(decimalPart) + ' Paise';
  return result + ' Only';
};

const BillPreviewModal = ({ bill, business, onClose }: { bill: any, business: any, onClose: () => void }) => {
  if (!bill) return null;

  const dt = new Date(bill.createdAt);
  const dateStr = dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const format = (num: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  const ps = typeof business?.printSettings === "string" ? JSON.parse(business.printSettings) : (business?.printSettings || {});

  const addressParts = [business?.businessAddress, business?.district, business?.state, business?.pinCode].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "";

  const UPI_ID = business?.upi || "";
  const UPI_NAME = business?.businessName || "Store";
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(bill.total).toFixed(2)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  // GST Calculation
  const taxActive = business?.taxEnabled ?? true;
  const perProductEnabled = business?.perProductTaxEnabled ?? false;
  const globalRate = business?.taxRate ?? 5.0;
  const discountRatio = bill.subtotal > 0 ? ((bill.subtotal - (bill.discountAmount || 0)) / bill.subtotal) : 1;

  const taxGroups = (bill.items || []).reduce((acc: any, item: any) => {
    let rate = 0;
    if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
      rate = item.gst;
    } else if (taxActive) {
      rate = globalRate;
    }
    const qty = Number(item.qty || item.quantity || 0);
    const itemRate = Number(item.rate || item.price || 0);
    const gross = (qty * itemRate) * discountRatio;
    let taxable = gross;
    let gst = 0;
    let isInclusive = item.taxStatus === "With Tax";
    if (bill.tax > 0 && bill.total > 0) {
       const expectedExclusive = bill.subtotal + bill.tax + (bill.deliveryCharges || 0) + (bill.packagingCharges || 0) + (bill.serviceCharge || 0) - (bill.discountAmount || 0);
       if (Math.abs(bill.total - expectedExclusive) < 0.5) {
         isInclusive = false;
       } else {
         isInclusive = true;
       }
    }

    if (isInclusive) {
      taxable = gross / (1 + rate / 100);
      gst = gross - taxable;
    } else {
      taxable = gross;
      gst = (gross * rate) / 100;
    }
    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0 };
    acc[rate].taxable += taxable;
    acc[rate].cgst += gst / 2;
    acc[rate].sgst += gst / 2;
    return acc;
  }, {});
  let taxBreakup = Object.values(taxGroups).filter((g: any) => g.cgst > 0 || g.sgst > 0);
  
  // Robust fallback for historical bills where GST rate was not saved explicitly in items
  if (taxBreakup.length === 0 && bill.tax > 0) {
    const assumedRate = Math.round((bill.tax / bill.subtotal) * 100);
    taxBreakup.push({
      rate: assumedRate,
      taxable: bill.subtotal,
      cgst: bill.tax / 2,
      sgst: bill.tax / 2
    });
  }

  const totalTaxable = taxBreakup.reduce((sum, g: any) => sum + g.taxable, 0);

  const handleWhatsApp = async () => {
    const phone = formatWhatsAppNumber(bill.customerPhone);
    const origin = window.location.origin;
    const pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    const restaurantName = business?.businessName || "Kravy POS";
    const message = encodeURIComponent(
      "🙏 *Thank you for shopping with us!*\n\n" +
      `Hello *${bill.customerName || "Customer"}*,\n\n` +
      `Here is your invoice from *${restaurantName}*:\n\n` +
      "🧾 *Bill No:* " + bill.billNumber + "\n" +
      "💰 *Bill Amount:* Rs. " + bill.total + "\n\n" +
      "📄 *Download Invoice:*\n" + pdfUrl + "\n\n" +
      "We look forward to serving you again! 😊"
    );
    window.open(phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  const handlePrintPdf = async () => {
    const origin = window.location.origin;
    const pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    window.open(pdfUrl, "_blank");
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.6)", padding: "20px" }}>
      <div style={{ margin: "auto", background: "#F1F5F9", width: "100%", maxWidth: "460px", borderRadius: "20px", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "90vh", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "white", borderBottom: "1px solid #E2E8F0" }}>
           <div>
             <div style={{ fontSize: "1.15rem", fontWeight: 950, color: "#0F172A" }}>Bill Preview</div>
             <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px" }}>Check Before Printing</div>
           </div>
           <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#FEE2E2", color: "#EF4444", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
             <X size={18} />
           </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "32px 24px 64px 24px", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", background: "#E2E8F0", flex: 1 }}>
           
           {/* Exact Receipt Paper Match */}
           <div style={{ background: "white", width: "100%", maxWidth: "340px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", fontFamily: "var(--font-inter), sans-serif", color: "black", flexShrink: 0 }}>
              
              {/* Logo & Header */}
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                 {business?.logoUrl ? (
                   <img src={business.logoUrl} alt="Logo" style={{ width: "80px", height: "80px", objectFit: "contain", margin: "0 auto 12px auto", filter: "grayscale(100%) contrast(200%)" }} />
                 ) : (
                   <div style={{ width: "60px", height: "60px", margin: "0 auto 12px auto", background: "black", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: "24px" }}>
                     K
                   </div>
                 )}
                 <div style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "2px", letterSpacing: "-0.5px" }}>{business?.businessName || "Kravy POS"}</div>
                 <div style={{ fontSize: "0.8rem", fontWeight: 700, maxWidth: "90%", margin: "0 auto" }}>{fullAddress}</div>
              </div>

              <div style={{ borderTop: "1.5px dashed black", margin: "8px 0" }} />
              <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 800 }}>GSTIN: {business?.gstNumber || "NOT PROVIDED"}</div>
              <div style={{ borderTop: "1.5px dashed black", margin: "8px 0" }} />

              <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 800, lineHeight: 1.4, marginBottom: "12px" }}>
                 <div>Bill No: {bill.billNumber}</div>
                 <div>Date: {dateStr}, {timeStr}</div>
              </div>

              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <span style={{ border: "1.5px solid black", padding: "4px 12px", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase" }}>
                  TYPE: {bill.tableName || "POS"}
                </span>
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "12px 0" }} />
              
              {/* Items Header */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase" }}>
                <span>ITEM DESCRIPTION</span>
                <span>TOTAL</span>
              </div>
              <div style={{ display: "flex", overflow: "hidden", fontSize: "0.8rem", fontWeight: 900, letterSpacing: "2px", marginBottom: "8px" }}>
                ================================================
              </div>

              {/* Items List */}
              <div style={{ marginBottom: "12px" }}>
                 {bill.items?.map((it: any, i: number) => {
                   const q = Number(it.qty || it.quantity || 0);
                   const r = Number(it.rate || it.price || 0);
                   let itemGst = perProductEnabled && it.gst !== undefined && it.gst !== null ? it.gst : (taxActive ? globalRate : 0);
                   
                   // Fallback visual fix for historical items
                   if (itemGst === 0 && bill.tax > 0) {
                     itemGst = Math.round((bill.tax / bill.subtotal) * 100);
                   }

                   return (
                     <div key={i} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 900 }}>
                           <span>{it.name}</span>
                           <span>₹{format(q * r)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                           <span>{q} x ₹{format(r)}</span>
                           <span>| GST: {itemGst}%</span>
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "12px 0 8px 0" }} />

              {/* Subtotals */}
              <div style={{ fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.6 }}>
                 <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal</span>
                    <span>₹{format(bill.subtotal || bill.total)}</span>
                 </div>
                 {(bill.discountAmount > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Discount</span>
                      <span>-₹{format(bill.discountAmount)}</span>
                   </div>
                 )}
                 {(bill.deliveryCharges > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Delivery Charge</span>
                      <span>₹{format(bill.deliveryCharges)}</span>
                   </div>
                 )}
                 {(bill.packagingCharges > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Packaging Charge</span>
                      <span>₹{format(bill.packagingCharges)}</span>
                   </div>
                 )}
                 {(bill.serviceCharge > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Service Charge</span>
                      <span>₹{format(bill.serviceCharge)}</span>
                   </div>
                 )}
                 {(bill.tax > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Taxable Amt</span>
                      <span>₹{format(totalTaxable)}</span>
                   </div>
                 )}
                 {(bill.tax > 0) && (() => {
                      const totalCGST = taxBreakup.reduce((sum, g: any) => sum + (g.cgst || 0), 0);
                      const totalSGST = taxBreakup.reduce((sum, g: any) => sum + (g.sgst || 0), 0);
                      const totalIGST = taxBreakup.reduce((sum, g: any) => sum + (g.igst || 0), 0);
                      if (totalCGST > 0 || totalSGST > 0) {
                        return (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>CGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>₹{format(totalCGST)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>SGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>₹{format(totalSGST)}</span></div>
                          </>
                        );
                      } else if (totalIGST > 0) {
                        return <div style={{ display: "flex", justifyContent: "space-between" }}><span>IGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate}%)` : ''}</span><span>₹{format(totalIGST)}</span></div>;
                      }
                      return <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Tax</span><span>₹{format(bill.tax)}</span></div>;
                 })()}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />
              <div style={{ borderTop: "4px solid black", margin: "8px 0" }} />
              
              {/* Grand Total */}
              {(() => {
                const finalTotalNum = Number(bill.total);
                const roundedTotal = Math.round(finalTotalNum);
                const roundOff = roundedTotal - finalTotalNum;
                return (
                  <>
                    {Math.abs(roundOff) > 0.001 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", fontSize: "0.9rem", fontWeight: 900 }}>
                        <span>ROUND OFF</span>
                        <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0" }}>
                       <span style={{ fontSize: "1.2rem", fontWeight: 950, textTransform: "uppercase" }}>GRAND TOTAL</span>
                       <span style={{ fontSize: "1.4rem", fontWeight: 950 }}>₹{format(roundedTotal)}</span>
                    </div>
                  </>
                );
              })()}

              <div style={{ borderTop: "4px solid black", margin: "8px 0" }} />

              {/* GST Tax Breakup */}
              {ps.showTaxBreakup !== false && taxBreakup.length > 0 && (
                <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "4px" }}>GST TAX BREAKUP</div>
                  <div style={{ borderTop: "1.5px dashed black", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 900 }}>
                    <span style={{ width: "25%" }}>Rate</span>
                    <span style={{ width: "35%", textAlign: "right" }}>Taxable</span>
                    <span style={{ width: "20%", textAlign: "right" }}>CGST</span>
                    <span style={{ width: "20%", textAlign: "right" }}>SGST</span>
                  </div>
                  <div style={{ borderTop: "3px solid black", margin: "4px 0" }} />
                  {taxBreakup.map((g: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 800 }}>
                      <span style={{ width: "25%" }}>{g.rate}%</span>
                      <span style={{ width: "35%", textAlign: "right" }}>{format(g.taxable)}</span>
                      <span style={{ width: "20%", textAlign: "right" }}>{format(g.cgst)}</span>
                      <span style={{ width: "20%", textAlign: "right" }}>{format(g.sgst)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "3px solid black", margin: "4px 0" }} />
                </div>
              )}

              {/* Amount in words */}
              <div style={{ fontSize: "0.8rem", fontStyle: "italic", fontWeight: 800, marginTop: "12px", marginBottom: "16px", lineHeight: 1.3 }}>
                Amount in Words: {numberToWords(Math.round(bill.total))}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />
              
              {/* Payment Info */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 900 }}>
                <span>Payment: {bill.paymentMode || "Cash"}</span>
                <span>Status: {bill.paymentStatus}</span>
              </div>
              
              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />

              {/* QR Code */}
              {business?.upi && business?.upiQrEnabled !== false && (
                <div style={{ textAlign: "center", margin: "24px 0" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 950, textTransform: "uppercase", marginBottom: "12px" }}>SCAN & PAY</div>
                  <img src={qrUrl} alt="UPI QR" style={{ width: "160px", height: "160px", margin: "0 auto 12px auto", mixBlendMode: "multiply", filter: "contrast(200%) grayscale(100%)" }} />
                  <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>UPI: {business.upi}</div>
                </div>
              )}

              {business?.upi && business?.upiQrEnabled !== false && (
                <div style={{ borderTop: "2px dashed black", margin: "16px 0" }} />
              )}

              {/* Footer Elements */}
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                 <div style={{ fontSize: "1.1rem", fontWeight: 950, textTransform: "uppercase", marginBottom: "12px", letterSpacing: "1px" }}>
                   THANK YOU 🙏 VISIT AGAIN
                 </div>
                 <div style={{ fontSize: "0.7rem", fontWeight: 800 }}>Software by Kravy</div>
                 <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 800, letterSpacing: "4px", marginTop: "4px" }}>
                   * * * END OF BILL * * *
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "16px 24px", background: "white", borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "10px" }}>
           <button onClick={onClose} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #E2E8F0", background: "white", fontWeight: 800, color: "#475569", cursor: "pointer", fontSize: "0.95rem", transition: "0.2s" }} className="hover:bg-slate-50">Close</button>
           <button onClick={handlePrintPdf} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #F97316", background: "white", fontWeight: 800, color: "#EA580C", cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }} className="hover:bg-orange-50"><Printer size={18} /> Print PDF / Direct</button>
           <button onClick={handleWhatsApp} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "#10B981", fontWeight: 800, color: "white", cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }} className="hover:bg-emerald-400"><Smartphone size={18} /> WhatsApp</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Th = ({ label, isRight, color = "#9CA3AF", width }: any) => (
  <th style={{ padding: "16px 20px", textAlign: isRight ? "right" : "left", fontSize: "0.7rem", fontWeight: 900, color: color, letterSpacing: "1px", width }}>
    {label}
  </th>
);

const OrderDetailsPanel = ({ bill, business, onClose, onUpdate }: { bill: any, business: any, onClose: () => void, onUpdate?: (updated: any) => void }) => {
  const [activeTab, setActiveTab] = useState<string>("order_info");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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
          position: "relative", zIndex: 2, width: "100%", maxWidth: "580px", height: "100%",
          background: "#FFFFFF", borderLeft: "1px solid #E2E8F0",
          boxShadow: "-10px 0 40px rgba(15, 23, 42, 0.1)", display: "flex", flexDirection: "column", overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          <div>
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                              {it.name}
                            </td>
                            <td style={{ padding: "14px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                              {q}
                            </td>
                            <td style={{ padding: "14px 8px", textAlign: "center", color: "#334155", fontWeight: 500, borderRight: "1px solid #E2E8F0" }}>
                              ₹ {format(r)}
                            </td>
                            <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 600, color: "#0F172A" }}>
                              ₹ {format(q * r)}
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
                    <span>Subtotal</span>
                    <span style={{ color: "#0F172A", fontWeight: 800 }}>₹{format(bill.subtotal || bill.total)}</span>
                  </div>
                  {bill.discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#DC2626" }}>
                      <span>Discount</span>
                      <span style={{ fontWeight: 800 }}>-₹{format(bill.discountAmount)}</span>
                    </div>
                  )}
                  {bill.tax > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#D97706" }}>
                      <span>GST (Tax)</span>
                      <span style={{ fontWeight: 800 }}>+₹{format(bill.tax)}</span>
                    </div>
                  )}
                  {bill.deliveryCharges > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Delivery Charges</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+₹{format(bill.deliveryCharges)}</span>
                    </div>
                  )}
                  {bill.packagingCharges > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Packaging Charges</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+₹{format(bill.packagingCharges)}</span>
                    </div>
                  )}
                  {bill.serviceCharge > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                      <span>Service Charge</span>
                      <span style={{ color: "#0F172A", fontWeight: 800 }}>+₹{format(bill.serviceCharge)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Total Payable Amount</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 1000, color: "#0F172A", marginTop: "2px" }}>₹{format(bill.total)}</div>
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
                                    ₹ {format(r)}
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#0F172A" }}>
                                    ₹ {format(q * r)}
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
              <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Customer Credentials</span>
              
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

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { MoreVertical, Eye, Printer, FileText, MessageCircle, CheckCircle, Clock, XCircle, Trash2, Bluetooth } from "lucide-react";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { useConfirm } from "@/components/ConfirmContext";

export const MenuOption = ({ icon, label, onClick, isDestructive }: any) => (
  <button 
    type="button"
    onClick={async (e) => { e.stopPropagation(); onClick(e); }} 
    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-[0.85rem] font-bold transition-colors ${isDestructive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon} {label}
  </button>
);

export const BillActions = ({ bill, refresh, business, userRole, userPermissions, openMenuId, setOpenMenuId, setPreviewBill, setViewBillDetails, isMobile, handleViewDetailsClick, handlePreviewClick }: any) => {
  const menuId = isMobile ? `mobile-${bill.id}` : `desktop-${bill.id}`;
  const isOpen = openMenuId === menuId;
  const router = useRouter();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<any>({});
  const [mounted, setMounted] = useState(false);
  const { confirm } = useConfirm();
  
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
      setOpenMenuId(menuId);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        {isMobile ? (
          <button 
            ref={buttonRef}
            onClick={toggleMenu} 
            className={`w-[30px] h-[30px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${isOpen ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}
          >
            <MoreVertical size={16} />
          </button>
        ) : (
          <button 
            ref={buttonRef}
            onClick={toggleMenu} 
            className={`w-[30px] h-[30px] rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${isOpen ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}
          >
            <MoreVertical size={14} />
          </button>
        )}
        {isOpen && mounted && typeof document !== "undefined" && createPortal(
          <div style={{ position: "absolute", zIndex: 99999 }}>
            {(() => {
              const isNativeApp = typeof window !== 'undefined' && !!(window as any).__KRAVY_APP__;
              const useBottomSheet = isMobile && isNativeApp;

              return (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: useBottomSheet ? "rgba(0,0,0,0.3)" : "transparent" }} onClick={async (e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                  <div className={`bg-white dark:bg-slate-900 overflow-y-auto no-scrollbar ${useBottomSheet ? 'border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom,20px)]' : 'border border-slate-100 dark:border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.15)]'}`} style={useBottomSheet ? {
                    position: "fixed", left: 0, right: 0, bottom: 0,
                    borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "20px 16px", zIndex: 99999, display: "flex", flexDirection: "column", gap: "6px",
                    maxHeight: "85vh",
                    animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                  } : {
                    position: "fixed", left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom, width: "200px",
                    borderRadius: "18px", padding: "8px", zIndex: 99999, display: "flex", flexDirection: "column", gap: "2px",
                    maxHeight: "300px"
                  }}>
                    {useBottomSheet && (
                <>
                  <div style={{ width: "36px", height: "5px", background: "#E2E8F0", borderRadius: "10px", alignSelf: "center", marginBottom: "8px", flexShrink: 0 }} />
                  <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0F172A", padding: "4px 8px 16px 8px", borderBottom: "1px solid #F1F5F9", marginBottom: "8px" }}>
                    Bill Options
                  </div>
                </>
              )}
              <MenuOption icon={<Eye size={14} color="#3B82F6" />} label="View Details" onClick={async () => { setOpenMenuId(null); handleViewDetailsClick ? handleViewDetailsClick(bill) : setViewBillDetails(bill); }} />
              <MenuOption icon={<Eye size={14} color="#8B5CF6" />} label="Preview" onClick={async () => { setOpenMenuId(null); handlePreviewClick ? handlePreviewClick(bill) : setPreviewBill(bill); }} />
              {((business as any)?.posHtmlPrintEnabled !== false) && (
              <MenuOption icon={<Printer size={14} color="#6B7280" />} label="Reprint HTML" onClick={async () => { setOpenMenuId(null); const currentPath = window.location.pathname + window.location.search; router.push(`/dashboard/billing/${bill.id}?returnTo=${encodeURIComponent(currentPath)}`); }} />
              )}
              {((business as any)?.posWebBtPrintEnabled !== false) && (
              <MenuOption icon={<Bluetooth size={14} color="#4F46E5" />} label="Direct BT Print" onClick={async () => { 
                setOpenMenuId(null); 
                try {
                  toast.loading("Preparing BT Print...", { id: "bt-print" });
                  const { ensurePrinterConnected, printReceiptData } = await import("@/lib/web-bluetooth");
                  await ensurePrinterConnected();
                  toast.dismiss("bt-print");
                  const currentPath = window.location.pathname + window.location.search; 
                  router.push(`/dashboard/billing/${bill.id}?returnTo=${encodeURIComponent(currentPath)}&autoPrint=bt`);
                } catch (e: any) {
                  toast.error(e.message || "BT failed", { id: "bt-print" });
                }
              }} />
              )}
              {canEdit && (
                <MenuOption icon={<FileText size={14} color="#3B82F6" />} label="Edit Bill" onClick={async () => { setOpenMenuId(null); const currentPath = window.location.pathname + window.location.search; router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}&returnTo=${encodeURIComponent(currentPath)}`); }} />
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
            </>
          );
        })()}
      </div>,
      document.body
    )}
      </div>
      
      {reasonModal?.isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div 
          style={{ position: "fixed", inset: 0, zIndex: 9999999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", padding: "16px", backdropFilter: "blur(4px)" }}
          onClick={() => setReasonModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
            style={{ padding: "24px", borderRadius: "24px", width: "100%", maxWidth: "420px", maxHeight: "90vh", overflowY: "auto" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-slate-900 dark:text-white" style={{ fontSize: "1.2rem", fontWeight: 900, marginBottom: "8px" }}>
              {reasonModal.type === "CANCELLED" ? "Cancel Bill" : "Delete Bill"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: "0.85rem", marginBottom: "14px" }}>Select a reason:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {["Guest refused to pay", "Wrong Item Billed", "Test Order", "Duplicate Bill"].map(rs => (
                <button 
                  key={rs} 
                  type="button"
                  onClick={() => {
                    setReasonModal(null);
                    if (reasonModal.type === "CANCELLED") handleStatusUpdate("CANCELLED", rs);
                    else handleDelete(rs);
                  }} 
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  style={{ padding: "12px", borderRadius: "12px", textAlign: "left", fontSize: "0.85rem", fontWeight: 700 }}
                >
                  {rs}
                </button>
              ))}
            </div>
            <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: "0.85rem", marginBottom: "8px" }}>Or enter custom reason:</p>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const val = e.target.elements.customReason.value;
              if(!val) return;
              setReasonModal(null);
              if (reasonModal.type === "CANCELLED") handleStatusUpdate("CANCELLED", val);
              else handleDelete(val);
            }}>
              <input 
                name="customReason" 
                autoFocus 
                placeholder="Type reason here..." 
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                style={{ width: "100%", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "0.85rem", outline: "none" }} 
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  onClick={() => setReasonModal(null)} 
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  style={{ padding: "10px 18px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 800 }}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                  style={{ padding: "10px 20px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 800, background: "#EF4444", color: "white" }}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

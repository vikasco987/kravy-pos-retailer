"use client";

import { useCurrency } from '@/lib/currency-context';
import { getTaxConfig } from '@/lib/tax-config';
import React, { useState } from "react";
import { 
  ChevronDown, ChevronRight, Filter, Clock, CheckCircle2, 
  Smartphone, CreditCard, Wallet, Banknote, MoreVertical, 
  Eye, Printer, FileText, MessageCircle, Trash2, XCircle, CheckCircle, X,
  User, Phone, Calendar, Layers, UtensilsCrossed, Receipt, Plus, MapPin, UserCheck,
  ShoppingBag, Truck, Monitor, Utensils, Copy, ArrowDown, Ticket, QrCode
} from "lucide-react";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/ConfirmContext";
import { useAuthContext } from "@/components/AuthContext";


// --- Sub-components ---

import { TypeBadge, StatusIndicator, PaymentBadge } from "./components/Badges";

import { BillActions } from "./components/BillActionMenu";
import { BillPreviewModal } from "./components/BillPreviewModal";
import { OrderDetailsPanel } from "./components/OrderDetailsPanel";


const Th = ({ label, width, isRight, color }: { label: string, width?: string, isRight?: boolean, color?: string }) => (
  <th style={{ padding: "16px 20px", textAlign: isRight ? "right" : "left", width: width || "auto", fontSize: "0.7rem", fontWeight: 900, color: color || "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px" }}>
    {label}
  </th>
);

// --- Main Table Component ---

export default function BillHistoryTable({ bills, business, userRole, userPermissions, refresh, currentPage, itemsPerPage, visibleCols }: any) {
  const { currencySymbol: sym, currencyCode, taxConfig: ctxTaxConfig } = useCurrency();
  const taxConfig = ctxTaxConfig || getTaxConfig(business?.currencyCode || currencyCode || sym || "INR");
  const taxName = taxConfig?.taxName || "GST";
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewBill, setPreviewBill] = useState<any>(null);
  const [viewBillDetails, setViewBillDetails] = useState<any>(null);

  const handleViewDetailsClick = async (billToLoad: any) => {
    const tid = toast.loading("Loading details...");
    try {
      const res = await fetch(`/api/bill-manager/${billToLoad.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setViewBillDetails(fullData.bill || fullData);
      } else {
        setViewBillDetails(billToLoad);
      }
    } catch(e) {
      setViewBillDetails(billToLoad);
    } finally {
      toast.dismiss(tid);
    }
  };

  const handlePreviewClick = async (billToLoad: any) => {
    const tid = toast.loading("Loading preview...");
    try {
      const res = await fetch(`/api/bill-manager/${billToLoad.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setPreviewBill(fullData.bill || fullData);
      } else {
        setPreviewBill(billToLoad);
      }
    } catch(e) {
      setPreviewBill(billToLoad);
    } finally {
      toast.dismiss(tid);
    }
  };

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

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  const groupedBills = bills.reduce((acc: any, rawBill: any) => {
    const bill = { ...rawBill };
    if (typeof bill.items === 'string') {
      try { bill.items = JSON.parse(bill.items); } catch(e) { bill.items = []; }
    }
    if (!Array.isArray(bill.items)) bill.items = [];

    const dt = new Date(bill.createdAt);
    const dateKey = dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(bill);
    return acc;
  }, {});

  return (
    <>
    <div className="kravy-card hidden md:block" style={{ overflowX: "auto", padding: 0, marginBottom: "100px" }}>
      <table className="kravy-table" style={{ minWidth: "1400px", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            {visibleCols.sno && <Th label="#S.No" width="50px" />}
            {visibleCols.timeline && <Th label="Date & Time" width="160px" />}
            {visibleCols.billInfo && <Th label="Bill Info" width="140px" />}
            {visibleCols.token && <Th label="Token" width="70px" />}
            {visibleCols.source && <Th label="Source" width="110px" />}
            {visibleCols.customer && <Th label="Customer" width="150px" />}
            {visibleCols.customerPhone && <Th label="Phone" width="110px" />}
            {visibleCols.items && <Th label="Items" width="100px" />}
            {visibleCols.subtotal && <Th label="Subtotal" isRight />}
            {visibleCols.discount && <Th label="Disc." isRight color="#EF4444" />}
            {visibleCols.gst && <Th label={taxName} isRight color="#F59E0B" />}
            {visibleCols.total && <Th label="Net Total" isRight />}
            {visibleCols.payment && <Th label="Payment" />}
            <th style={{ padding: "16px 20px", textAlign: "right", fontSize: "0.7rem", fontWeight: 900, color: "#9CA3AF" }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill: any, idx: number) => {
            const dt = new Date(bill.createdAt);
            const itemsCount = bill.itemsCount !== undefined ? bill.itemsCount : (bill.items?.length || 0);

            return (
              <React.Fragment key={bill.id}>
                <tr className="border-b border-slate-50 dark:border-slate-800/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                  {visibleCols.source && (
                    <td>
                      <span style={{ 
                        padding: "4px 8px", borderRadius: "6px", 
                        background: (bill.tableName || "POS") === "POS" ? "rgba(99, 102, 241, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                        color: (bill.tableName || "POS") === "POS" ? "#6366F1" : "#D97706", 
                        fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", border: "1px solid currentColor"
                      }}>
                        {(bill.tableName || "POS") === "POS" ? "Counter" : bill.tableName}
                      </span>
                      {bill.zoneName && (
                        <span style={{ 
                          marginLeft: "6px",
                          padding: "4px 8px", borderRadius: "6px", 
                          background: "rgba(168, 85, 247, 0.1)", 
                          color: "#A855F7", 
                          fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", border: "1px solid currentColor"
                        }}>
                          {bill.zoneName}
                        </span>
                      )}
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
                  {visibleCols.items && (
                    <td>
                      <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: "10px", background: "#EEF2FF", color: "#6366F1", fontSize: "0.7rem", fontWeight: 900, border: "1px solid #E0E7FF" }}>
                        {itemsCount} {itemsCount === 1 ? 'ITEM' : 'ITEMS'}
                      </div>
                    </td>
                  )}
                  {visibleCols.subtotal && <td className="text-slate-800 dark:text-slate-200" style={{ textAlign: "right", fontWeight: 600 }}>{sym}{format(bill.subtotal || bill.total)}</td>}
                  {visibleCols.discount && <td style={{ textAlign: "right", fontWeight: 700 }} className="text-red-500 dark:text-red-400">{sym}{format(bill.discountAmount || 0)}</td>}
                  {visibleCols.gst && <td style={{ textAlign: "right", fontWeight: 700 }} className="text-amber-500 dark:text-amber-400">{sym}{format(bill.tax || 0)}</td>}
                  {visibleCols.total && <td className="text-slate-900 dark:text-white" style={{ textAlign: "right", fontSize: "1rem", fontWeight: 950 }}>{sym}{format(bill.total)}</td>}
                  {visibleCols.payment && <td><PaymentBadge mode={bill.paymentMode} status={bill.paymentStatus} amountPaid={bill.amountPaid} balanceDue={bill.balanceDue} total={bill.total} /></td>}
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
                      handleViewDetailsClick={handleViewDetailsClick}
                      handlePreviewClick={handlePreviewClick}
                    />
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* --- Mobile App-Style Cards View --- */}
    <div className="md:hidden flex flex-col gap-4 mb-24 mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
       {Object.entries(groupedBills).map(([date, dateBills]: any) => {
         const dayTotal = dateBills.reduce((acc: number, b: any) => acc + (b.total || 0), 0);
         return (
         <div key={date} className="flex flex-col gap-2.5">
           {/* Date Header with Day Summary */}
           <div className="flex items-center justify-between px-2 pt-2.5 pb-0.5">
             <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200">
               <Calendar size={13} className="text-indigo-500" />
               <span>{date}</span>
             </div>
             <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                 {dateBills.length} {dateBills.length === 1 ? 'Bill' : 'Bills'}
               </span>
               <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-0.5 rounded-full font-mono">
                 {sym}{format(dayTotal)}
               </span>
             </div>
           </div>

           {dateBills.map((bill: any) => {
              const isPaid = (bill.paymentStatus || "").toLowerCase() === 'paid';
              const isPending = (bill.paymentStatus || "").toLowerCase() === 'pending';
              
              const statusBadge = isPaid
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : isPending
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

              const statusGlow = isPaid
                ? "bg-emerald-500"
                : isPending
                  ? "bg-amber-500"
                  : "bg-rose-500";

              const isTakeaway = (bill.tableName || "").includes("TAKEAWAY");
              const isDelivery = (bill.tableName || "").includes("DELIVERY");
              const isCounter = (bill.tableName || "POS") === "POS";

              const typeLabel = isTakeaway 
                ? "Takeaway" 
                : isDelivery 
                  ? "Delivery" 
                  : isCounter 
                    ? "Counter" 
                    : (bill.tableName || "Dine In");

              const typeDot = isTakeaway
                ? "bg-amber-500"
                : isDelivery
                  ? "bg-rose-500"
                  : isCounter
                    ? "bg-indigo-500"
                    : "bg-emerald-500";

              const typeStyle = isTakeaway
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                : isDelivery
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                  : isCounter
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40"
                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40";

              const dt = new Date(bill.createdAt);
              const timeStr = dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
              const itemsCount = bill.itemsCount !== undefined ? bill.itemsCount : (bill.items?.length || 0);

              return (
                <div 
                  key={bill.id} 
                  onClick={() => handleViewDetailsClick(bill)}
                  className="group bg-white dark:bg-slate-900 rounded-[22px] p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-md border border-slate-200/70 dark:border-slate-800 relative cursor-pointer active:scale-[0.985] transition-all overflow-hidden"
                >
                  {/* Left Status Accent Bar */}
                  <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${statusGlow}`} />

                  {/* Top Row: Type Pill, Bill Number, Time, Status & 3-Dots */}
                  <div className="flex items-center justify-between gap-2 pl-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      {/* Order Type Pill */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${typeStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeDot}`} />
                        <span>{typeLabel}</span>
                      </span>

                      {/* Bill Number */}
                      <span className="font-mono font-black text-[13px] text-slate-800 dark:text-slate-100 tracking-tight">
                        #{bill.billNumber}
                      </span>

                      {/* Time */}
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                        <Clock size={10} className="text-slate-400" />
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${statusBadge}`}>
                        {isPaid ? <CheckCircle2 size={10} className="text-emerald-500" /> : isPending ? <Clock size={10} className="text-amber-500" /> : <XCircle size={10} className="text-rose-500" />}
                        {bill.isOrder ? (bill.orderStatus || "ORDER") : (bill.paymentStatus || "PAID")}
                      </span>

                      {/* 3-Dots Action Menu */}
                      <div onClick={e => e.stopPropagation()}>
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
                          handleViewDetailsClick={handleViewDetailsClick}
                          handlePreviewClick={handlePreviewClick}
                          isMobile={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Customer Info, Chips vs Amount */}
                  <div className="flex items-center justify-between gap-3 pt-0.5 pl-1.5">
                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Customer Name & Phone */}
                      <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{bill.customerName || "Walk-In Customer"}</span>
                        {bill.customerPhone && (
                          <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                            • {bill.customerPhone}
                          </span>
                        )}
                      </div>

                      {/* Chips row: Items, Payment Mode, Token */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <ShoppingBag size={10} />
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                          <CreditCard size={10} />
                          {bill.paymentMode || "Cash"}
                        </span>

                        {bill.tokenNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                            <Ticket size={10} />
                            Token #{String(bill.tokenNumber).padStart(2, '0')}
                          </span>
                        )}
                        {bill.kotNumbers && bill.kotNumbers.length > 0 && !bill.tokenNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/60">
                            KOT #{bill.kotNumbers.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                        {sym}{format(bill.total)}
                      </div>
                      {bill.discountAmount > 0 && (
                        <div className="text-[10px] font-bold text-rose-500 mt-1">
                          -{sym}{format(bill.discountAmount)} off
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Quick Action Strip */}
                  <div className="flex items-center gap-2 pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 pl-1.5">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleViewDetailsClick(bill); }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <Eye size={13} className="text-indigo-400 dark:text-indigo-600" />
                      <span>Details</span>
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handlePreviewClick(bill); }}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-black border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>

                    {bill.customerPhone && (
                      <a 
                        href={`https://wa.me/${formatWhatsAppNumber(bill.customerPhone)}?text=${encodeURIComponent(
                          `Hello ${bill.customerName || "Customer"}, here is your invoice #${bill.billNumber} of ${sym}${format(bill.total)} from ${business?.businessName || "Kravy POS"}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all shrink-0"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={13} />
                        <span className="hidden xs:inline">Share</span>
                      </a>
                    )}
                  </div>
                </div>
              );
           })}
         </div>
         );
       })}
    </div>

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
    </>
  );
}


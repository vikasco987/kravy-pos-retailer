"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle, Smartphone, CreditCard, Banknote, Wallet, AlertCircle, FileText, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface PaymentSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    billNumber: string;
    customerName?: string;
    customerPhone?: string;
    total: number;
    amountPaid?: number;
    balanceDue?: number;
    paymentMode?: string;
    paymentStatus?: string;
  };
  currencySymbol?: string;
  onSettled: (updatedBill: any) => void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  isOpen,
  onClose,
  bill,
  currencySymbol = "₹",
  onSettled,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  const sym = currencySymbol || "₹";
  const billTotal = Math.max(0, Number(bill.total || 0));
  const alreadyReceived = Math.max(0, Number(bill.amountPaid || 0));
  const currentOutstanding = Math.max(
    0,
    bill.balanceDue !== undefined && bill.balanceDue !== null
      ? Number(bill.balanceDue)
      : billTotal - alreadyReceived
  );

  const [settlementAmount, setSettlementAmount] = useState<string>(
    currentOutstanding > 0 ? currentOutstanding.toFixed(2) : billTotal.toFixed(2)
  );
  const [selectedMode, setSelectedMode] = useState<string>(
    bill.paymentMode && ["Cash", "UPI", "Card", "Wallet"].includes(bill.paymentMode)
      ? bill.paymentMode
      : "Cash"
  );
  const [remark, setRemark] = useState<string>("");
  const [txnRef, setTxnRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericEntered = Number(settlementAmount) || 0;
  const isOverpayment = numericEntered > currentOutstanding + 0.01;
  const isZeroOrNegative = numericEntered <= 0;
  const remainingAfter = Math.max(0, currentOutstanding - numericEntered);
  const willFullySettle = remainingAfter <= 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isZeroOrNegative) {
      toast.error("Please enter a valid amount greater than ₹0");
      return;
    }

    if (isOverpayment) {
      toast.error(`Amount cannot exceed pending balance of ${sym}${currentOutstanding.toFixed(2)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/bill-manager/${bill.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericEntered,
          paymentMode: selectedMode,
          remark: remark.trim() || undefined,
          txnRef: txnRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to settle payment");
      }

      if (willFullySettle) {
        toast.success(`🎉 Bill #${bill.billNumber} Fully Settled! Paid ${sym}${numericEntered.toFixed(2)} via ${selectedMode}`);
      } else {
        toast.success(`✅ Received ${sym}${numericEntered.toFixed(2)} via ${selectedMode}. Remaining: ${sym}${remainingAfter.toFixed(2)}`);
      }

      onSettled(data.bill);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentModes = [
    { id: "Cash", label: "Cash", icon: Banknote, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200" },
    { id: "UPI", label: "UPI", icon: Smartphone, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200" },
    { id: "Card", label: "Card", icon: CreditCard, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200" },
    { id: "Wallet", label: "Wallet", icon: Wallet, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">
                Receive Payment & Settle
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight mt-0.5">
              {bill.billNumber ? (bill.billNumber.startsWith("#") ? bill.billNumber : `#${bill.billNumber}`) : "Order"}
            </h2>
            {bill.customerName && (
              <p className="text-xs text-blue-100 font-medium">
                Customer: {bill.customerName}
              </p>
            )}
            {bill.billNumber?.startsWith("ORD") && (
              <span className="inline-block mt-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold text-white uppercase tracking-wider">
                ⚡ Auto-Billing Floor Order
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Bill Summary Cards */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Grand Total</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                {sym}{billTotal.toFixed(2)}
              </span>
            </div>
            <div className="text-center border-x border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Received</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                {sym}{alreadyReceived.toFixed(2)}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-rose-500 uppercase block">Outstanding</span>
              <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                {sym}{currentOutstanding.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Settlement Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Receiving Amount ({sym}) <span className="text-rose-500">*</span>
              </label>
              {currentOutstanding > 0 && (
                <button
                  type="button"
                  onClick={() => setSettlementAmount(currentOutstanding.toFixed(2))}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 underline"
                >
                  Full ({sym}{currentOutstanding.toFixed(2)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                {sym}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentOutstanding}
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                className={`w-full h-11 pl-8 pr-3 text-base font-black rounded-xl bg-slate-50 dark:bg-slate-800/80 border transition-all outline-none ${
                  isOverpayment
                    ? "border-rose-400 text-rose-600 focus:ring-2 focus:ring-rose-200"
                    : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {isOverpayment && (
              <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Cannot exceed current outstanding of {sym}{currentOutstanding.toFixed(2)}
              </p>
            )}
            {!isOverpayment && numericEntered > 0 && (
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                {willFullySettle ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={13} /> This will mark the bill as FULLY PAID (Outstanding = {sym}0.00)
                  </span>
                ) : (
                  <span>
                    Remaining Due after this: <strong className="text-rose-600">{sym}{remainingAfter.toFixed(2)}</strong> (Status: Partial)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Payment Mode Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Payment Mode Received
            </label>
            <div className="grid grid-cols-4 gap-2">
              {paymentModes.map((pm) => {
                const Icon = pm.icon;
                const isSelected = selectedMode === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedMode(pm.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <Icon size={16} className={isSelected ? "text-white" : "text-slate-500"} />
                    <span className="mt-1 text-[11px]">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional UTR / Reference for UPI / Card */}
          {(selectedMode === "UPI" || selectedMode === "Card") && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Transaction Reference / UTR (Optional)
              </label>
              <input
                type="text"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                placeholder="e.g. 12-digit UTR or Card auth code"
                className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Remark / Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Remark / Note (Optional)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Remaining payment received at counter"
              className="w-full h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isOverpayment || isZeroOrNegative}
              className={`w-full h-11 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 text-white shadow-md transition-all active:scale-[0.98] ${
                isSubmitting || isOverpayment || isZeroOrNegative
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              }`}
            >
              {isSubmitting ? (
                <span>Recording Payment...</span>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>
                    Receive {sym}{numericEntered > 0 ? numericEntered.toFixed(2) : "0.00"} & Settle
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

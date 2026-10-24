"use client";

import React, { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  RefreshCw, 
  Printer, 
  Settings, 
  X, 
  CheckCircle2, 
  HelpCircle,
  ShieldAlert
} from "lucide-react";
import { registerPrinterRecoveryHandler, PrinterSlot } from "@/lib/web-bluetooth";

interface RecoveryDetails {
  slot: PrinterSlot;
  error: string;
  printerName: string | null;
  uncertainOutcome?: boolean;
  onRetry: () => Promise<void>;
  onScan: () => Promise<void>;
}

export function PrinterRecoveryModal() {
  const [details, setDetails] = useState<RecoveryDetails | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  useEffect(() => {
    registerPrinterRecoveryHandler((info) => {
      setDetails(info);
      setRecoverySuccess(false);
      setLoadingAction(null);
    });

    return () => {
      registerPrinterRecoveryHandler(null);
    };
  }, []);

  if (!details) return null;

  const handleRetry = async () => {
    setLoadingAction("retry");
    try {
      await details.onRetry();
      setRecoverySuccess(true);
      setTimeout(() => {
        setDetails(null);
        setRecoverySuccess(false);
      }, 1500);
    } catch (e: any) {
      console.warn("Recovery retry failed:", e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleScan = async () => {
    setLoadingAction("scan");
    try {
      await details.onScan();
      setRecoverySuccess(true);
      setTimeout(() => {
        setDetails(null);
        setRecoverySuccess(false);
      }, 1500);
    } catch (e: any) {
      console.warn("Recovery scan failed:", e);
    } finally {
      setLoadingAction(null);
    }
  };

  const openPrinterSettings = () => {
    setDetails(null);
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard/settings/connect-printer";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              recoverySuccess 
                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" 
                : details.uncertainOutcome 
                ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" 
                : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
            }`}>
              {recoverySuccess ? (
                <CheckCircle2 size={24} className="animate-in zoom-in" />
              ) : details.uncertainOutcome ? (
                <ShieldAlert size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {recoverySuccess ? "Printer Connected!" : "Printer Connection Lost"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                {details.slot === "kot" ? "Kitchen Ticket (KOT)" : "Customer Bill"} Printer
              </p>
            </div>
          </div>

          <button
            onClick={() => setDetails(null)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Bill Safe Assurance Banner */}
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex items-center gap-2.5">
          <span className="text-emerald-600 text-sm">✅</span>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Bill safe hai! Bill data successfully save ho chuka hai.
          </p>
        </div>

        {/* Status & Error Details */}
        <div className="space-y-2 bg-slate-50 dark:bg-neutral-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-neutral-800 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-neutral-300">
            <span className="font-medium">Device:</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {details.printerName || "Bluetooth Thermal Printer"}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-neutral-300">
            <span className="font-medium">Status:</span>
            <span className="font-bold text-rose-500 uppercase tracking-wider text-[10px] bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
              Offline / Dropped
            </span>
          </div>
          {details.error && (
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 pt-1 border-t border-slate-200/60 dark:border-neutral-700/60 font-mono">
              Error: {details.error}
            </p>
          )}
        </div>

        {/* Uncertain Outcome Notice (Avoid duplicate receipts) */}
        {details.uncertainOutcome && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <HelpCircle size={15} className="shrink-0 mt-0.5" />
            <p className="leading-snug">
              Print write time out ho gaya. Check karein ki printer se receipt nikalna shuru hui ya nahi, taaki duplicate print na nikle.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={loadingAction !== null}
            onClick={handleRetry}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loadingAction === "retry" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>Retry Reconnection & Print</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleScan}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-98 text-slate-800 dark:text-neutral-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {loadingAction === "scan" ? <RefreshCw size={12} className="animate-spin" /> : <Printer size={12} />}
              <span>Scan Printer</span>
            </button>

            <button
              type="button"
              onClick={openPrinterSettings}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-98 text-slate-800 dark:text-neutral-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Settings size={12} />
              <span>Printer Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

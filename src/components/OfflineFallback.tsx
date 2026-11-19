"use client";

import React from "react";
import { WifiOff, ShoppingCart, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";

interface OfflineFallbackProps {
  moduleName: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function OfflineFallback({
  moduleName,
  description = "This module requires an initial internet sync or cached data that is not yet loaded on this device.",
  actionHref = "/dashboard/billing/checkout",
  actionLabel = "Open Quick POS Billing"
}: OfflineFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <WifiOff size={28} strokeWidth={2.2} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-widest uppercase mb-3">
          <span>Offline Module Standby</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight mb-2">
          {moduleName} Offline
        </h2>

        <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] leading-relaxed mb-6">
          {description}
        </p>

        <div className="space-y-3">
          <Link
            href={actionHref}
            onClick={() => kravy.click()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={16} />
            <span>{actionLabel}</span>
          </Link>

          <button
            onClick={() => {
              kravy.click();
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard/billing/checkout");
              }
            }}
            className="w-full py-3 px-4 bg-[var(--kravy-bg-2)] hover:bg-[var(--kravy-surface-hover)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <ArrowLeft size={14} />
            <span>Back to Previous Screen</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--kravy-border)] flex items-center justify-center gap-2 text-[11px] text-[var(--kravy-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Quick POS & Table Orders remain fully functional offline</span>
        </div>
      </div>
    </div>
  );
}

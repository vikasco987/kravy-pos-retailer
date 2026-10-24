"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Bluetooth, Settings, HelpCircle, CheckCircle, Zap, ExternalLink } from "lucide-react";
import BluetoothPrinterManagement from "@/components/printing/BluetoothPrinterManagement";
import { kravy } from "@/lib/sounds";

export default function ConnectPrinterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--kravy-bg)] text-[var(--kravy-text-primary)] p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* ── Top Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--kravy-border)] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              kravy.click();
              router.push("/dashboard/settings");
            }}
            className="w-10 h-10 rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 active:scale-95 shadow-sm"
            title="Back to Settings"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Hardware Setup
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[10px] font-bold text-slate-400">Settings</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--kravy-text-primary)] flex items-center gap-2">
              <span>Connect Thermal Printer</span>
              <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Wireless
              </span>
            </h1>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings/printing"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--kravy-border)] bg-[var(--kravy-surface)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--kravy-text-secondary)] transition-all shadow-xs"
          >
            <Settings size={14} />
            <span>Printing Layout</span>
          </Link>
          <Link
            href="/dashboard/billing/checkout"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Printer size={14} />
            <span>Open POS</span>
          </Link>
        </div>
      </div>

      {/* ── Main Bluetooth Printer Controller ── */}
      <BluetoothPrinterManagement standalone={true} />

      {/* ── Helpful Step-by-Step Guide & Supported Hardware ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Card 1: 3-Step Quick Guide */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Zap size={18} />
            <h3 className="text-sm font-black text-[var(--kravy-text-primary)]">
              How to Connect Printer (3 Steps)
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs text-[var(--kravy-text-muted)] leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>Apne Mobile/Tablet/Laptop ka <strong>Bluetooth ON</strong> karein aur Printer ka power switch ON karein.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>Upar <strong>"Connect Bill Printer"</strong> button dabayein, popup me apna printer select karein aur <strong>Pair</strong> karein.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>Connect hote hi <strong>"Test Print"</strong> dabakar check karein — paper par test receipt print ho jayegi!</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Supported Printers & Notice */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={18} />
            <h3 className="text-sm font-black text-[var(--kravy-text-primary)]">
              Supported Thermal Printers
            </h3>
          </div>
          <p className="text-xs text-[var(--kravy-text-muted)] leading-relaxed">
            Kravy POS sabhi standard <strong>58mm (2-inch)</strong> aur <strong>80mm (3-inch)</strong> Bluetooth ESC/POS thermal printers ko support karta hai:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["MT580P", "Everycom", "TVS Electronics", "Epson ESC/POS", "RP-3150", "RP-58", "Pegasus", "Hoin", "NGX", "Phomemo"].map(p => (
              <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                {p}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            * Browser Note: Google Chrome, Edge, ya Brave for Android/Desktop recommended hai.
          </p>
        </div>
      </div>
    </div>
  );
}

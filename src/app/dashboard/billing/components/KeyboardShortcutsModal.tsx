"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Keyboard, 
  X, 
  Search, 
  CreditCard, 
  Printer, 
  ShoppingCart, 
  Zap, 
  CheckCircle2,
  Sparkles,
  Command,
  Monitor,
  Laptop
} from "lucide-react";

type OSType = "both" | "windows" | "mac";

interface KeyCombo {
  keys: string[];
  orKeys?: string[];
}

interface ShortcutItem {
  description: string;
  badge?: string;
  isUniversal?: boolean;
  universalKeys?: string[];
  win: KeyCombo;
  mac: KeyCombo;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "Search & Quick Navigation",
    icon: <Search size={16} />,
    color: "from-blue-500 to-indigo-600",
    items: [
      {
        description: "Focus Search & Barcode Bar",
        badge: "Fast Search",
        isUniversal: true,
        universalKeys: ["/", "or", "F2"],
        win: { keys: ["F2"], orKeys: ["/"] },
        mac: { keys: ["F2"], orKeys: ["/"] },
      },
      {
        description: "Add Matched Item to Cart",
        badge: "Quick Add",
        isUniversal: true,
        universalKeys: ["Enter ↵"],
        win: { keys: ["Enter"] },
        mac: { keys: ["Return ↵"] },
      },
      {
        description: "Jump to Customer Phone Number",
        badge: "Customer",
        win: { keys: ["Alt", "P"], orKeys: ["F3"] },
        mac: { keys: ["⌘ Cmd", "P"], orKeys: ["⌥ Opt", "P", "or", "F3"] },
      },
      {
        description: "Close Modals / Blur Input / Clear Search",
        isUniversal: true,
        universalKeys: ["Esc"],
        win: { keys: ["Esc"] },
        mac: { keys: ["Esc"] },
      },
    ],
  },
  {
    title: "Instant Payment Selection",
    icon: <CreditCard size={16} />,
    color: "from-emerald-500 to-teal-600",
    items: [
      {
        description: "Select Cash Payment Mode",
        badge: "Default",
        win: { keys: ["Alt", "C"], orKeys: ["F4"] },
        mac: { keys: ["⌥ Opt", "C"], orKeys: ["F4"] },
      },
      {
        description: "Select UPI (QR) Payment Mode",
        badge: "QR Pay",
        win: { keys: ["Alt", "U"], orKeys: ["F5"] },
        mac: { keys: ["⌥ Opt", "U"], orKeys: ["F5"] },
      },
      {
        description: "Select Card / POS Payment Mode",
        badge: "Card",
        win: { keys: ["Alt", "D"], orKeys: ["F6"] },
        mac: { keys: ["⌥ Opt", "D"], orKeys: ["F6"] },
      },
      {
        description: "Select Customer Wallet / Credit",
        win: { keys: ["Alt", "W"] },
        mac: { keys: ["⌥ Opt", "W"] },
      },
    ],
  },
  {
    title: "Settlement & Printing",
    icon: <Printer size={16} />,
    color: "from-orange-500 to-amber-600",
    items: [
      {
        description: "Settle & Print Final Bill",
        badge: "Primary",
        win: { keys: ["Ctrl", "Enter"], orKeys: ["F8"] },
        mac: { keys: ["⌘ Cmd", "Enter"], orKeys: ["F8"] },
      },
      {
        description: "Save & Print Kitchen KOT",
        badge: "Kitchen",
        win: { keys: ["Ctrl", "K"], orKeys: ["F9"] },
        mac: { keys: ["⌘ Cmd", "K"], orKeys: ["F9"] },
      },
      {
        description: "Hold Current Bill / View Held Orders",
        badge: "Hold",
        win: { keys: ["Alt", "H"], orKeys: ["F7"] },
        mac: { keys: ["⌥ Opt", "H"], orKeys: ["F7"] },
      },
      {
        description: "Direct Bluetooth (BT) Print Bill",
        isUniversal: true,
        universalKeys: ["F10"],
        win: { keys: ["F10"] },
        mac: { keys: ["F10"] },
      },
    ],
  },
  {
    title: "Cart & System Controls",
    icon: <ShoppingCart size={16} />,
    color: "from-purple-500 to-pink-600",
    items: [
      {
        description: "Clear / Reset Current Cart",
        badge: "Reset",
        win: { keys: ["Alt", "X"], orKeys: ["Ctrl", "Shift", "⌫"] },
        mac: { keys: ["⌥ Opt", "X"], orKeys: ["⌘ Cmd", "Shift", "⌫"] },
      },
      {
        description: "Open / Close Shortcuts Help Sheet",
        badge: "Help",
        win: { keys: ["Ctrl", "/"], orKeys: ["F1", "or", "?"] },
        mac: { keys: ["⌘ Cmd", "/"], orKeys: ["F1", "or", "?"] },
      },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  const [selectedOS, setSelectedOS] = useState<OSType>("both");
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // Auto-detect OS on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform || navigator.userAgent);
      // We keep "both" as default so user immediately sees both Windows & Mac,
      // but they can filter to their exact system anytime.
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDetection = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.metaKey) parts.push("⌘ Cmd");
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push(navigator.platform?.includes("Mac") ? "⌥ Option" : "Alt");
      if (e.shiftKey) parts.push("Shift");

      let keyName = e.key;
      if (keyName === " ") keyName = "Space";
      if (!["Meta", "Control", "Alt", "Shift"].includes(e.key)) {
        parts.push(keyName);
      }

      setLastKeyPressed(parts.length > 0 ? parts.join(" + ") : keyName);
    };

    window.addEventListener("keydown", handleKeyDetection);
    return () => window.removeEventListener("keydown", handleKeyDetection);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderKeyPills = (keys: string[]) => {
    return (
      <div className="inline-flex items-center gap-1">
        {keys.map((k, i) => {
          if (k === "or") {
            return (
              <span key={i} className="text-[10px] text-[var(--kravy-text-muted)] font-bold px-0.5">
                or
              </span>
            );
          }
          return (
            <kbd
              key={i}
              className="px-2 py-0.5 min-w-[24px] text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[var(--kravy-text-primary)] rounded-md font-mono text-[11px] font-black shadow-xs"
            >
              {k}
            </kbd>
          );
        })}
      </div>
    );
  };

  const renderCombo = (combo: KeyCombo) => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {renderKeyPills(combo.keys)}
        {combo.orKeys && combo.orKeys.length > 0 && (
          <>
            <span className="text-[10px] text-[var(--kravy-text-muted)] font-bold">/</span>
            {renderKeyPills(combo.orKeys)}
          </>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[var(--kravy-text-primary)]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[var(--kravy-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[var(--kravy-bg)]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                <Keyboard size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-[var(--kravy-text-primary)]">
                    POS Keyboard Shortcuts
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                    <Zap size={10} /> Windows & Mac Supported
                  </span>
                </div>
                <p className="text-xs text-[var(--kravy-text-muted)] font-medium mt-0.5">
                  Operate entire billing counter lightning-fast without touching the mouse!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* OS Selection Tabs */}
              <div className="flex items-center p-1 bg-[var(--kravy-bg-2)]/80 border border-[var(--kravy-border)] rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedOS("both")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                    selectedOS === "both"
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                  }`}
                >
                  <Laptop size={12} />
                  <span>Both (Win & Mac)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOS("windows")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                    selectedOS === "windows"
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                  }`}
                >
                  <Monitor size={12} />
                  <span>Windows</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOS("mac")}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                    selectedOS === "mac"
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                  }`}
                >
                  <Command size={12} />
                  <span>macOS</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg-2)] transition-all shrink-0"
                title="Close [Esc]"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Interactive Live Key Test Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-indigo-500/5 border-b border-[var(--kravy-border)] flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--kravy-text-muted)]">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Press any key on your keyboard to test:</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[11px] text-[var(--kravy-text-muted)]">Detected:</span>
              <kbd className="px-2.5 py-1 bg-white dark:bg-black/40 border border-indigo-400 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black shadow-sm min-w-[36px] text-center">
                {lastKeyPressed || "Press a key..."}
              </kbd>
            </div>
          </div>

          {/* Body Categories */}
          <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {SHORTCUT_CATEGORIES.map((cat, idx) => (
              <div
                key={idx}
                className="bg-[var(--kravy-bg)]/50 border border-[var(--kravy-border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-[var(--kravy-border)]">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color} text-white shadow-sm`}>
                      {cat.icon}
                    </div>
                    <h3 className="text-sm font-black text-[var(--kravy-text-primary)] tracking-tight">
                      {cat.title}
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="p-2 sm:p-2.5 rounded-xl bg-[var(--kravy-surface)]/70 border border-[var(--kravy-border)]/60 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--kravy-text-primary)]">
                            {item.description}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {/* Universal keys if identical and user selected 'both' */}
                        {item.isUniversal && selectedOS === "both" ? (
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--kravy-border)]/40 text-xs">
                            <span className="text-[10px] text-[var(--kravy-text-muted)] font-medium">
                              All Platforms:
                            </span>
                            {renderKeyPills(item.universalKeys || [])}
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-1 border-t border-[var(--kravy-border)]/40">
                            {/* Windows Row */}
                            {(selectedOS === "both" || selectedOS === "windows") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded shrink-0">
                                  <Monitor size={10} /> Win
                                </span>
                                {renderCombo(item.win)}
                              </div>
                            )}

                            {/* Mac Row */}
                            {(selectedOS === "both" || selectedOS === "mac") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                                  <Command size={10} /> Mac
                                </span>
                                {renderCombo(item.mac)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-bg)]/40 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--kravy-text-muted)]">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>
                <strong>Mac Tip:</strong> On Mac keyboards, use <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold text-[10px]">⌘ + Enter</kbd> or hold <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold text-[10px]">Fn + F8</kbd> to settle & print directly!
              </span>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Got it, Start Billing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

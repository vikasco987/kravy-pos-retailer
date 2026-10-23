"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import {
  LayoutGrid, Columns, Check, ArrowLeft, Save,
  ShoppingCart, Sliders, Layers, Search, Eye, Sparkles,
  AlertCircle, CheckCircle2, RotateCcw, Plus,
  UserCircle, Activity, Users, Percent, Award, Package, LayoutDashboard, Printer, ChevronRight,
  Bluetooth, RefreshCw, Power, Utensils, ShoppingBag, Truck
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";
import { ensurePrinterConnected, isPrinterConnected, getConnectedPrinterName, disconnectPrinter } from "@/lib/web-bluetooth";

function MenuLayoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";
  const { profile: cachedProfile, updateProfile } = useProfileCache();

  // Bluetooth Printer states (Bill & KOT)
  const [billBtEnabled, setBillBtEnabled] = useState(true);
  const [billBtConnected, setBillBtConnected] = useState(false);
  const [billBtPrinterName, setBillBtPrinterName] = useState<string | null>(null);
  const [billBtLoading, setBillBtLoading] = useState(false);

  const [kotBtEnabled, setKotBtEnabled] = useState(true);
  const [kotBtConnected, setKotBtConnected] = useState(false);
  const [kotBtPrinterName, setKotBtPrinterName] = useState<string | null>(null);
  const [kotBtLoading, setKotBtLoading] = useState(false);

  // Active Layout: image-grid-side | text-grid-side | image-wide-classic | text-grid-classic
  type LayoutType = "image-grid-side" | "text-grid-side" | "image-wide-classic" | "text-grid-classic";
  // ✅ Default is always Card 1: "image-grid-side"
  const [layout, setLayout] = useState<LayoutType>("image-grid-side");
  const [saving, setSaving] = useState(false);

  // KOT Mode preference (mobile & POS ordering)
  const [kotMode, setKotMode] = useState<boolean>(true);

  // Service / Order Modes: Dining, Takeaway, Delivery (All enabled by default)
  const [orderModes, setOrderModes] = useState({
    dining: true,
    takeaway: true,
    delivery: true,
  });

  // POS Checkout Layout Mode: 'scroll' (Default) | 'sticky' (Classic)
  type CheckoutLayoutType = "scroll" | "sticky";
  const [checkoutLayout, setCheckoutLayout] = useState<CheckoutLayoutType>("scroll");

  // Additional Feature Toggles for POS Menu
  const [features, setFeatures] = useState({
    showCatSearch: true,
    compactCards: false,
    showItemImages: true,
    showAddCategoryBtn: true,
    autoScrollCategory: true,
  });

  // Custom Surcharge / Service Charge Label
  const [serviceChargeName, setServiceChargeName] = useState("Service Charge");

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedKotMode = localStorage.getItem("pos_kot_mode");
      if (savedKotMode !== null) {
        setKotMode(savedKotMode === "true");
      }

      const savedLayout = localStorage.getItem("pos_category_layout");
      if (savedLayout) {
        if (savedLayout === "vertical" || savedLayout === "image-grid-side") {
          setLayout("image-grid-side");
        } else if (savedLayout === "text-grid-side") {
          setLayout("text-grid-side");
        } else if (savedLayout === "full" || savedLayout === "image-wide-classic") {
          setLayout("image-wide-classic");
        } else if (savedLayout === "horizontal" || savedLayout === "text-grid-classic") {
          setLayout("text-grid-classic");
        }
      } else {
        setLayout("image-grid-side");
        localStorage.setItem("pos_category_layout", "image-grid-side");
      }

      const savedFeatures = localStorage.getItem("pos_menu_layout_features");
      if (savedFeatures) {
        setFeatures(prev => ({ ...prev, ...JSON.parse(savedFeatures) }));
      }

      // Check Order Modes in localStorage
      const savedOrderModes = localStorage.getItem("pos_order_modes");
      if (savedOrderModes) {
        try {
          const parsed = JSON.parse(savedOrderModes);
          setOrderModes({
            dining: parsed.dining !== false,
            takeaway: parsed.takeaway !== false,
            delivery: parsed.delivery !== false,
          });
        } catch (e) {}
      }

      // Check Checkout Layout (Scroll vs Sticky)
      const savedCheckoutLayout = localStorage.getItem("pos_checkout_layout");
      if (savedCheckoutLayout === "sticky" || savedCheckoutLayout === "scroll") {
        setCheckoutLayout(savedCheckoutLayout);
      } else {
        setCheckoutLayout("scroll");
        localStorage.setItem("pos_checkout_layout", "scroll");
      }

      // Check Bluetooth printer toggle states
      const savedBillEnabled = localStorage.getItem("bt_bill_printer_enabled") ?? localStorage.getItem("bt_printer_enabled");
      if (savedBillEnabled !== null) {
        setBillBtEnabled(savedBillEnabled === "true");
      } else {
        setBillBtEnabled(true);
        localStorage.setItem("bt_bill_printer_enabled", "true");
      }

      const savedKotEnabled = localStorage.getItem("bt_kot_printer_enabled");
      if (savedKotEnabled !== null) {
        setKotBtEnabled(savedKotEnabled === "true");
      } else {
        setKotBtEnabled(true);
        localStorage.setItem("bt_kot_printer_enabled", "true");
      }

      // Check Custom Service Charge Name
      const savedChargeName = localStorage.getItem("kravy_service_charge_name");
      if (savedChargeName) {
        setServiceChargeName(savedChargeName);
      }

      // Check if already connected or auto-reconnect if enabled
      checkBtStatus();
      if (savedBillEnabled !== "false") {
        autoConnectBt("bill");
      }
      if (savedKotEnabled === "true") {
        autoConnectBt("kot");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync order modes from database profile when cachedProfile updates
  useEffect(() => {
    if (cachedProfile) {
      if ((cachedProfile as any).posKotEnabled !== undefined) {
        setKotMode((cachedProfile as any).posKotEnabled !== false);
      }
      if ((cachedProfile as any).posCheckoutLayout) {
        const layoutVal = (cachedProfile as any).posCheckoutLayout;
        if (layoutVal === "sticky" || layoutVal === "scroll") {
          setCheckoutLayout(layoutVal);
          localStorage.setItem("pos_checkout_layout", layoutVal);
        }
      }
      setOrderModes({
        dining: cachedProfile.posDiningEnabled !== false,
        takeaway: cachedProfile.posTakeawayEnabled !== false,
        delivery: cachedProfile.posDeliveryEnabled !== false,
      });
      if ((cachedProfile as any).serviceChargeName) {
        setServiceChargeName((cachedProfile as any).serviceChargeName);
      }
    }
  }, [cachedProfile]);

  const checkBtStatus = () => {
    try {
      // Bill Slot
      const billConn = isPrinterConnected("bill");
      setBillBtConnected(billConn);
      if (billConn) {
        setBillBtPrinterName(getConnectedPrinterName("bill"));
      } else {
        const savedId = typeof localStorage !== "undefined" 
          ? (localStorage.getItem("LAST_CONNECTED_BILL_PRINTER_ID") || localStorage.getItem("LAST_CONNECTED_PRINTER_ID"))
          : null;
        if (savedId) {
          setBillBtPrinterName(`Saved Device (${savedId.slice(0, 6)}...)`);
        } else {
          setBillBtPrinterName(null);
        }
      }

      // KOT Slot
      const kotConn = isPrinterConnected("kot");
      setKotBtConnected(kotConn);
      if (kotConn) {
        setKotBtPrinterName(getConnectedPrinterName("kot"));
      } else {
        const savedId = typeof localStorage !== "undefined" ? localStorage.getItem("LAST_CONNECTED_KOT_PRINTER_ID") : null;
        if (savedId) {
          setKotBtPrinterName(`Saved Device (${savedId.slice(0, 6)}...)`);
        } else {
          setKotBtPrinterName(null);
        }
      }
    } catch (e) {
      setBillBtConnected(false);
      setKotBtConnected(false);
    }
  };

  const autoConnectBt = async (slot: "bill" | "kot") => {
    try {
      const idKey = slot === "kot" ? "LAST_CONNECTED_KOT_PRINTER_ID" : "LAST_CONNECTED_BILL_PRINTER_ID";
      let savedPrinterId = localStorage.getItem(idKey);
      if (!savedPrinterId && slot === "bill") savedPrinterId = localStorage.getItem("LAST_CONNECTED_PRINTER_ID");

      if (savedPrinterId) {
        if (slot === "bill") setBillBtLoading(true);
        else setKotBtLoading(true);
        await ensurePrinterConnected(false, slot);
        checkBtStatus();
      }
    } catch (e) {
      console.log(`Auto-connect deferred [${slot}]:`, e);
      checkBtStatus();
    } finally {
      if (slot === "bill") setBillBtLoading(false);
      else setKotBtLoading(false);
    }
  };

  // Keep printer connection status synchronized on window focus or storage changes
  useEffect(() => {
    const handleSync = () => checkBtStatus();
    window.addEventListener("focus", handleSync);
    const interval = setInterval(checkBtStatus, 2000);
    return () => {
      window.removeEventListener("focus", handleSync);
      clearInterval(interval);
    };
  }, []);

  const handleConnectBtPrinter = async (slot: "bill" | "kot") => {
    kravy.click();
    if (slot === "bill") setBillBtLoading(true);
    else setKotBtLoading(true);

    try {
      await ensurePrinterConnected(true, slot);
      checkBtStatus();
      const slotLabel = slot === "bill" ? "Bill" : "KOT";
      toast.success(`${slotLabel} Bluetooth Printer Connected Successfully! 🖨️`);
    } catch (err: any) {
      checkBtStatus();
      if (err.message && (err.message.includes("cancelled") || err.name === "NotFoundError")) {
        toast("Printer selection kept unchanged", { icon: "ℹ️" });
      } else {
        toast.error(err.message || `Failed to connect ${slot.toUpperCase()} printer`);
      }
    } finally {
      if (slot === "bill") setBillBtLoading(false);
      else setKotBtLoading(false);
    }
  };

  const handleToggleBtEnabled = async (slot: "bill" | "kot") => {
    kravy.toggle();
    if (slot === "bill") {
      const nextState = !billBtEnabled;
      setBillBtEnabled(nextState);
      localStorage.setItem("bt_bill_printer_enabled", String(nextState));
      localStorage.setItem("bt_printer_enabled", String(nextState));

      if (!nextState) {
        await disconnectPrinter(false, "bill");
        checkBtStatus();
        toast("Bill Bluetooth Printer Disabled", { icon: "🔌" });
      } else {
        toast.success("Bill Bluetooth Printer Enabled");
        autoConnectBt("bill");
      }
    } else {
      const nextState = !kotBtEnabled;
      setKotBtEnabled(nextState);
      localStorage.setItem("bt_kot_printer_enabled", String(nextState));

      if (!nextState) {
        await disconnectPrinter(false, "kot");
        checkBtStatus();
        toast("KOT Bluetooth Printer Disabled", { icon: "🔌" });
      } else {
        toast.success("KOT Bluetooth Printer Enabled");
        autoConnectBt("kot");
      }
    }
  };

  const handleSelectLayout = (newLayout: LayoutType) => {
    kravy.click();
    setLayout(newLayout);
    try {
      localStorage.setItem("pos_category_layout", newLayout);
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_category_layout",
        newValue: newLayout
      }));
    } catch (e) {}
  };

  const toggleFeature = (key: keyof typeof features) => {
    kravy.toggle();
    setFeatures(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("pos_menu_layout_features", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleToggleOrderMode = async (mode: "dining" | "takeaway" | "delivery") => {
    kravy.toggle();
    const currentActiveCount = (orderModes.dining ? 1 : 0) + (orderModes.takeaway ? 1 : 0) + (orderModes.delivery ? 1 : 0);
    if (orderModes[mode] && currentActiveCount <= 1) {
      toast.error("At least one order mode must remain active!");
      return;
    }

    const updated = {
      ...orderModes,
      [mode]: !orderModes[mode],
    };
    setOrderModes(updated);

    try {
      localStorage.setItem("pos_order_modes", JSON.stringify(updated));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_order_modes",
        newValue: JSON.stringify(updated),
      }));

      // Background persist to database profile
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posDiningEnabled: updated.dining,
          posTakeawayEnabled: updated.takeaway,
          posDeliveryEnabled: updated.delivery,
        }),
      });

      updateProfile({
        posDiningEnabled: updated.dining,
        posTakeawayEnabled: updated.takeaway,
        posDeliveryEnabled: updated.delivery,
      }, false);
      toast.success(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode ${updated[mode] ? "enabled" : "disabled"}`);
    } catch (e) {
      console.error("Failed to update order mode:", e);
    }
  };

  const handleSelectCheckoutLayout = async (newLayout: CheckoutLayoutType) => {
    kravy.click();
    setCheckoutLayout(newLayout);
    try {
      localStorage.setItem("pos_checkout_layout", newLayout);
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_checkout_layout",
        newValue: newLayout
      }));
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posCheckoutLayout: newLayout }),
      });
      updateProfile({ posCheckoutLayout: newLayout }, false);
      toast.success(`Checkout layout switched to ${newLayout === "sticky" ? "Sticky Layout" : "Scroll Layout"}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("pos_kot_mode", String(kotMode));
      localStorage.setItem("pos_category_layout", layout);
      localStorage.setItem("pos_checkout_layout", checkoutLayout);
      localStorage.setItem("pos_menu_layout_features", JSON.stringify(features));
      localStorage.setItem("pos_order_modes", JSON.stringify(orderModes));
      localStorage.setItem("kravy_service_charge_name", serviceChargeName.trim() || "Service Charge");

      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_kot_mode",
        newValue: String(kotMode)
      }));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_category_layout",
        newValue: layout
      }));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_checkout_layout",
        newValue: checkoutLayout
      }));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_order_modes",
        newValue: JSON.stringify(orderModes)
      }));
      window.dispatchEvent(new StorageEvent("storage", {
        key: "kravy_service_charge_name",
        newValue: serviceChargeName.trim() || "Service Charge"
      }));

      // Persist to database profile
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posKotEnabled: kotMode,
          enableKOTWithBill: kotMode,
          posDiningEnabled: orderModes.dining,
          posTakeawayEnabled: orderModes.takeaway,
          posDeliveryEnabled: orderModes.delivery,
          posCheckoutLayout: checkoutLayout,
          serviceChargeName: serviceChargeName.trim() || "Service Charge",
        }),
      });

      updateProfile({
        posKotEnabled: kotMode,
        enableKOTWithBill: kotMode,
        posDiningEnabled: orderModes.dining,
        posTakeawayEnabled: orderModes.takeaway,
        posDeliveryEnabled: orderModes.delivery,
        posCheckoutLayout: checkoutLayout,
        serviceChargeName: serviceChargeName.trim() || "Service Charge",
      }, false);

      kravy.success();
      toast.success("POS Menu & Service preferences saved!");

      setTimeout(() => {
        router.push("/dashboard/billing/checkout");
      }, 500);
    } catch (error) {
      toast.error("Failed to save layout settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full kravy-page-fade pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 w-full">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href={fromCheckout ? "/dashboard/billing/checkout" : "/dashboard/settings"}
            onClick={() => kravy.click()}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
            title={fromCheckout ? "Back to POS Checkout" : "Back to Settings"}
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-white sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                POS Menu Layout
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shrink-0">
                Live Engine
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] mt-0.5 truncate">
              Select product grid layout & configure menu features
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 w-full lg:w-auto shrink-0 min-w-0">
          <Link
            href="/dashboard/billing/checkout"
            onClick={() => kravy.click()}
            className="flex-1 lg:flex-none h-10 sm:h-12 px-2.5 min-[380px]:px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] min-[380px]:text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 border border-slate-200 dark:border-white/10 shadow-xs whitespace-nowrap min-w-0"
          >
            <ShoppingCart size={14} className="shrink-0" />
            <span className="truncate">POS Checkout</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 lg:flex-none h-10 sm:h-12 px-2.5 min-[380px]:px-5 sm:px-8 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] min-[380px]:text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap min-w-0"
          >
            <Save size={14} className="shrink-0" />
            <span className="truncate">{saving ? "Saving..." : "Apply & Save"}</span>
          </button>
        </div>
      </div>

      {/* ── Order Preferences / General Settings & Billing View (Screenshot 2 Match) ── */}
      <div className="space-y-6 pt-1">
        {/* General Settings */}
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">
            General Settings
          </h2>
          <div className="bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
            <input
              type="checkbox"
              id="kot-mode-checkbox"
              checked={kotMode}
              onChange={(e) => {
                kravy.toggle();
                const nextVal = e.target.checked;
                setKotMode(nextVal);
                localStorage.setItem("pos_kot_mode", String(nextVal));
                window.dispatchEvent(new StorageEvent("storage", {
                  key: "pos_kot_mode",
                  newValue: String(nextVal)
                }));
              }}
              className="mt-1 w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
            <div className="space-y-1">
              <label htmlFor="kot-mode-checkbox" className="text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer select-none">
                KOT Mode
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    toast("KOT Mode ON hone par mobile par KOT & Hold aur KOT & Bill buttons show hote hain, aur kitchen ticket print hoti hai. OFF hone par direct Save & Hold aur Save & Bill chalega.", {
                      icon: "ℹ️",
                      duration: 6000
                    });
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide hover:underline cursor-pointer"
                >
                  HOW DOES THIS WORK?
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Info Box ── */}
      <div className="bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-transparent border border-indigo-500/20 p-4 sm:p-6 md:p-7 rounded-2xl sm:rounded-[2rem] flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner mt-0.5 sm:mt-0">
          <Sparkles size={18} className="sm:w-[22px] sm:h-[22px]" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Choose Your Menu Experience
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 leading-relaxed font-medium">
            Checkout screen par categories aur products kaise display honge, yeh aap yahan se chune sakte hain. Kisi bhi card par click karke preview dekh sakte hain aur live switch kar sakte hain.
          </p>
        </div>
      </div>

      {/* ── Layout Cards Section ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/50" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400 dark:text-white/40">
              Display Styles (4 Formats)
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
            Selected: <span className="text-indigo-600 dark:text-indigo-400 uppercase font-black">{layout}</span>
          </span>
        </div>

        {/* Cards layout container: Horizontal scroll below 1280px (xl), 4-column grid at 1280px and above */}
        <div className="flex xl:grid xl:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto xl:overflow-x-visible pb-4 xl:pb-0 scrollbar-thin">

          {/* Card 1: Image grid Side view */}
          <div
            onClick={() => handleSelectLayout("image-grid-side")}
            className={`cursor-pointer rounded-2xl sm:rounded-[2rem] border-2 p-3.5 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden flex-shrink-0 w-[280px] sm:w-[320px] xl:w-auto ${
              layout === "image-grid-side"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {layout === "image-grid-side" && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Design Illustration: Image grid Side view */}
            <div className="h-40 sm:h-44 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              {/* Header Title inside Preview */}
              <div className="text-center mb-2.5">
                <div className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">
                  Image grid
                </div>
                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                  Side view
                </div>
              </div>

              {/* Mockup Card Container */}
              <div className="w-full max-w-[190px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-1.5 flex gap-1.5 shadow-sm overflow-hidden">
                {/* Left Sidebar Category Strip */}
                <div className="w-6 bg-purple-100/80 dark:bg-purple-950/40 rounded-lg p-1 flex flex-col gap-1 shrink-0 justify-around border-r border-purple-200/40 dark:border-purple-800/20">
                  <div className="w-full h-3 rounded bg-purple-300/60 dark:bg-purple-700/50" />
                  <div className="w-full h-3 rounded bg-purple-400 dark:bg-purple-500 shadow-xs" />
                  <div className="w-full h-3 rounded bg-purple-300/60 dark:bg-purple-700/50" />
                  <div className="w-full h-3 rounded bg-purple-300/60 dark:bg-purple-700/50" />
                </div>

                {/* Right 2x2 Image Grid with colorful food cards */}
                <div className="grid grid-cols-2 gap-1.5 flex-1 p-0.5">
                  <div className="rounded-xl bg-[#FFF1F2] dark:bg-rose-950/30 flex items-center justify-center text-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-rose-100/70 dark:border-rose-900/30 hover:scale-105 transition-transform">
                    <span>🍩</span>
                  </div>
                  <div className="rounded-xl bg-[#FEF9C3] dark:bg-amber-950/30 flex items-center justify-center text-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-amber-100/70 dark:border-amber-900/30 hover:scale-105 transition-transform">
                    <span>🍛</span>
                  </div>
                  <div className="rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/30 flex items-center justify-center text-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-emerald-100/70 dark:border-emerald-900/30 hover:scale-105 transition-transform">
                    <span>🥤</span>
                  </div>
                  <div className="rounded-xl bg-[#FFEDD5] dark:bg-orange-950/30 flex items-center justify-center text-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-orange-100/70 dark:border-orange-900/30 hover:scale-105 transition-transform">
                    <span>🍵</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Image grid Side view
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Categories left side mein fixed rail ban kar rehti hain aur right side par items ka image grid load hota hai.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Vertical Sidebar Rail</span>
                <span>•</span>
                <span>2x2 Product Grid</span>
              </div>
            </div>
          </div>

          {/* Card 2: Text Grid Side View */}
          <div
            onClick={() => handleSelectLayout("text-grid-side")}
            className={`cursor-pointer rounded-2xl sm:rounded-[2rem] border-2 p-3.5 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden flex-shrink-0 w-[280px] sm:w-[320px] xl:w-auto ${
              layout === "text-grid-side"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {layout === "text-grid-side" && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Design Illustration: Text Grid Side View */}
            <div className="h-40 sm:h-44 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              {/* Header Title inside Preview */}
              <div className="text-center mb-2.5">
                <div className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">
                  Text Grid
                </div>
                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                  Side View
                </div>
              </div>

              {/* Mockup Card Container */}
              <div className="w-full max-w-[190px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-1.5 flex gap-1.5 shadow-sm overflow-hidden">
                {/* Left Sidebar Category Strip with Skeletons */}
                <div className="w-6 bg-slate-100 dark:bg-white/5 rounded-lg p-1 flex flex-col gap-1 shrink-0 justify-around border-r border-slate-200/60 dark:border-white/10">
                  <div className="w-full h-3 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="w-full h-3 rounded bg-slate-300 dark:bg-white/20 animate-pulse" />
                  <div className="w-full h-3 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="w-full h-3 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>

                {/* Right 2x2 Text Cards with Skeleton Bars */}
                <div className="grid grid-cols-2 gap-1.5 flex-1 p-0.5">
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      className="rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 p-2 flex flex-col justify-center gap-1.5 shadow-xs"
                    >
                      <div className="w-3/4 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                      <div className="w-1/2 h-1.5 rounded-full bg-slate-300/80 dark:bg-white/15 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Text Grid Side View
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Categories left side mein rail form mein hoti hain aur items bina image ke lightweight text grid card mein load hote hain.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Vertical Sidebar Rail</span>
                <span>•</span>
                <span>Text-Only Skeleton Grid</span>
              </div>
            </div>
          </div>

          {/* Card 3: Image Wide Classic View */}
          <div
            onClick={() => handleSelectLayout("image-wide-classic")}
            className={`cursor-pointer rounded-2xl sm:rounded-[2rem] border-2 p-3.5 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden flex-shrink-0 w-[280px] sm:w-[320px] xl:w-auto ${
              layout === "image-wide-classic"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {layout === "image-wide-classic" && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Design Illustration: Image Wide Classic View */}
            <div className="h-40 sm:h-44 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              {/* Header Title inside Preview */}
              <div className="text-center mb-2.5">
                <div className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">
                  Image Wide
                </div>
                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                  Classic View
                </div>
              </div>

              {/* Mockup Card Container */}
              <div className="w-full max-w-[190px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-2 flex flex-col gap-2 shadow-sm overflow-hidden justify-center">
                {/* Row 1: Donut + Skeleton text bars */}
                <div className="w-full h-11 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 rounded-xl p-1.5 flex items-center gap-2 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center text-sm shrink-0">
                    <span>🍩</span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="w-4/5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                    <div className="w-1/2 h-1.5 rounded-full bg-slate-300/80 dark:bg-white/15 animate-pulse" />
                  </div>
                </div>

                {/* Row 2: Can + Skeleton text bars */}
                <div className="w-full h-11 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 rounded-xl p-1.5 flex items-center gap-2 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-sm shrink-0">
                    <span>🥤</span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="w-4/5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                    <div className="w-1/2 h-1.5 rounded-full bg-slate-300/80 dark:bg-white/15 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Image Wide Classic View
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Items horizontal wide strips mein image aur details ke sath classic view mein display hote hain.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Wide Row Strips</span>
                <span>•</span>
                <span>Image + Text Skeleton</span>
              </div>
            </div>
          </div>

          {/* Card 4: Text Grid Classic View */}
          <div
            onClick={() => handleSelectLayout("text-grid-classic")}
            className={`cursor-pointer rounded-2xl sm:rounded-[2rem] border-2 p-3.5 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden flex-shrink-0 w-[280px] sm:w-[320px] xl:w-auto ${
              layout === "text-grid-classic"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {layout === "text-grid-classic" && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Design Illustration: Text Grid Classic View */}
            <div className="h-40 sm:h-44 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              {/* Header Title inside Preview */}
              <div className="text-center mb-2.5">
                <div className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">
                  Text Grid
                </div>
                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                  Classic View
                </div>
              </div>

              {/* Mockup Card Container - 2x2 grid without sidebar */}
              <div className="w-full max-w-[190px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-1.5 shadow-sm overflow-hidden flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1.5 w-full h-full p-0.5">
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      className="rounded-xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 p-2 flex flex-col justify-center gap-1.5 shadow-xs"
                    >
                      <div className="w-3/4 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                      <div className="w-1/2 h-1.5 rounded-full bg-slate-300/80 dark:bg-white/15 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Text Grid Classic View
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Bina sidebar rail ke clean text-based 2x2 classic grid format mein items render hote hain.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Full Width Grid</span>
                <span>•</span>
                <span>Text Skeleton Layout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Checkout Layout Mode (Scroll vs Sticky) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/50" />
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 dark:text-white/40">
              Checkout Layout Mode
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
            Current: <span className="text-indigo-600 dark:text-indigo-400 font-black">
              {checkoutLayout === "sticky" ? "Sticky Layout (Classic)" : "Scroll Layout (Default)"}
            </span>
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-white/50 px-1 font-medium">
          Choose how the checkout screen is displayed. This setting changes the layout only; billing functionality, calculations and printing remain the same.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Scroll Layout (Current / Default) */}
          <div
            onClick={() => handleSelectCheckoutLayout("scroll")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
              checkoutLayout === "scroll"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {checkoutLayout === "scroll" && (
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Illustration */}
            <div className="h-36 sm:h-40 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              <div className="w-full max-w-[200px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-2 flex flex-col gap-1.5 shadow-sm overflow-hidden">
                <div className="w-full h-3 rounded bg-indigo-100 dark:bg-indigo-950/60 flex items-center px-1.5 justify-between">
                  <div className="w-12 h-1.5 rounded-full bg-indigo-400" />
                  <div className="w-4 h-1.5 rounded-full bg-indigo-300" />
                </div>
                <div className="flex-1 space-y-1 overflow-hidden py-0.5">
                  <div className="w-full h-3 rounded bg-slate-100 dark:bg-slate-800 flex items-center px-1.5 justify-between">
                    <div className="w-14 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-6 h-1.5 rounded bg-slate-400 dark:bg-slate-600" />
                  </div>
                  <div className="w-full h-3 rounded bg-slate-100 dark:bg-slate-800 flex items-center px-1.5 justify-between">
                    <div className="w-10 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-6 h-1.5 rounded bg-slate-400 dark:bg-slate-600" />
                  </div>
                  <div className="w-full h-3 rounded bg-slate-100 dark:bg-slate-800 flex items-center px-1.5 justify-between opacity-60">
                    <div className="w-12 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-6 h-1.5 rounded bg-slate-400 dark:bg-slate-600" />
                  </div>
                </div>
                <div className="w-full h-3.5 rounded bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Scroll Layout (Current)
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Default
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Customer, Cart Items, Totals aur Pay buttons ek smooth continuous scroll view mein flow karte hain.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Full Page Scroll</span>
                <span>•</span>
                <span>Natural Mobile Flow</span>
              </div>
            </div>
          </div>

          {/* Card 2: Sticky Layout (Classic) */}
          <div
            onClick={() => handleSelectCheckoutLayout("sticky")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 transition-all group flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
              checkoutLayout === "sticky"
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-indigo-300"
            }`}
          >
            {checkoutLayout === "sticky" && (
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 bg-indigo-600 text-white rounded-full p-1 shadow-md z-10">
                <Check size={14} strokeWidth={3} />
              </div>
            )}

            {/* Illustration */}
            <div className="h-36 sm:h-40 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner relative">
              <div className="w-full max-w-[200px] h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-white/15 p-2 flex flex-col justify-between shadow-sm overflow-hidden">
                <div className="w-full h-3 rounded bg-indigo-100 dark:bg-indigo-950/60 flex items-center px-1.5 justify-between">
                  <div className="w-12 h-1.5 rounded-full bg-indigo-400" />
                  <div className="w-4 h-1.5 rounded-full bg-indigo-300" />
                </div>
                {/* Scrollable middle indicator */}
                <div className="flex-1 space-y-1 overflow-hidden py-0.5 border-y border-dashed border-slate-200 dark:border-slate-800 my-0.5">
                  <div className="w-full h-2.5 rounded bg-slate-100 dark:bg-slate-800 flex items-center px-1.5 justify-between">
                    <div className="w-12 h-1 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-5 h-1 rounded bg-slate-400 dark:bg-slate-600" />
                  </div>
                  <div className="w-full h-2.5 rounded bg-slate-100 dark:bg-slate-800 flex items-center px-1.5 justify-between">
                    <div className="w-10 h-1 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-5 h-1 rounded bg-slate-400 dark:bg-slate-600" />
                  </div>
                </div>
                {/* Fixed bottom footer */}
                <div className="w-full p-1 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/40 flex flex-col gap-1 shadow-xs">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <div className="w-8 h-1.5 rounded-full bg-indigo-600 font-black" />
                  </div>
                  <div className="w-full h-3 rounded bg-indigo-600 flex items-center justify-center">
                    <div className="w-12 h-1 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Sticky Layout (Classic)
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Fixed Footer
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Payment total, payment modes aur action buttons neeche screen par pinned/sticky rehte hain.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Pinned Bottom Bar</span>
                <span>•</span>
                <span>Middle Cart Scroll</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Modes / Service Types Section (Dining, Takeaway, Delivery) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/50" />
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 dark:text-white/40">
              Checkout Service Modes
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
            Active: <span className="text-indigo-600 dark:text-indigo-400 font-black">
              {[
                orderModes.dining && "Dining",
                orderModes.takeaway && "Takeaway",
                orderModes.delivery && "Delivery"
              ].filter(Boolean).join(" · ") || "None"}
            </span>
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-white/50 px-1 font-medium">
          Select which order modes appear on your POS checkout screen. Uncheck any option to hide it from billing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Dining */}
          <div
            onClick={() => handleToggleOrderMode("dining")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 transition-all flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
              orderModes.dining
                ? "bg-white dark:bg-white/5 border-indigo-600 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                : "bg-white/40 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                orderModes.dining
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                <Utensils size={20} />
              </div>

              {/* Checkbox indicator */}
              <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                orderModes.dining
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}>
                {orderModes.dining && <Check size={14} strokeWidth={3} />}
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Dining
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  orderModes.dining
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}>
                  {orderModes.dining ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Table service & dine-in orders with table number selection.
              </p>
            </div>
          </div>

          {/* Card 2: Takeaway */}
          <div
            onClick={() => handleToggleOrderMode("takeaway")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 transition-all flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
              orderModes.takeaway
                ? "bg-white dark:bg-white/5 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20"
                : "bg-white/40 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                orderModes.takeaway
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                <ShoppingBag size={20} />
              </div>

              {/* Checkbox indicator */}
              <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                orderModes.takeaway
                  ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}>
                {orderModes.takeaway && <Check size={14} strokeWidth={3} />}
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Takeaway
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  orderModes.takeaway
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}>
                  {orderModes.takeaway ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Quick counter pickup & parcel billing without table assignment.
              </p>
            </div>
          </div>

          {/* Card 3: Delivery */}
          <div
            onClick={() => handleToggleOrderMode("delivery")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-5 transition-all flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
              orderModes.delivery
                ? "bg-white dark:bg-white/5 border-rose-500 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/20"
                : "bg-white/40 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                orderModes.delivery
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                <Truck size={20} />
              </div>

              {/* Checkbox indicator */}
              <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                orderModes.delivery
                  ? "bg-rose-500 border-rose-500 text-white shadow-xs"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              }`}>
                {orderModes.delivery && <Check size={14} strokeWidth={3} />}
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Delivery
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  orderModes.delivery
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}>
                  {orderModes.delivery ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-white/40 font-medium mt-1 leading-relaxed">
                Home doorstep delivery with customer address & delivery charges.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Account Settings Section ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/50" />
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 dark:text-white/40">
            Account
          </h2>
        </div>

        {/* ── Bluetooth Dual Printer Controller Card (Bill + KOT) ── */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-4">
          {/* Main Card Header */}
          <div className="flex items-center gap-3.5 border-b border-[var(--kravy-border)] pb-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Bluetooth size={22} className={billBtConnected || kotBtConnected ? "animate-pulse" : ""} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                  Bluetooth Printer Management
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Dual-Channel
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5">
                Connect separate printers for Bill and KOT, or use a single printer for both.
              </p>
            </div>
          </div>

          {/* Row 1: Bill Bluetooth Printer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--kravy-bg-2)]/50 p-3 sm:p-3.5 rounded-2xl border border-[var(--kravy-border)]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                billBtConnected ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" : "bg-slate-200 dark:bg-white/10 text-slate-500"
              }`}>
                <Printer size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">
                    Bill Bluetooth Print
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    billBtConnected ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
                  }`}>
                    {billBtConnected ? "Connected" : "Offline"}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)]">
                  {billBtConnected
                    ? `Device: ${billBtPrinterName || "Ready"}`
                    : billBtPrinterName
                    ? `Saved: ${billBtPrinterName}`
                    : "Customer Bill & Receipt Printer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                disabled={!billBtEnabled || billBtLoading}
                onClick={() => handleConnectBtPrinter("bill")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {billBtLoading ? <RefreshCw size={13} className="animate-spin" /> : <Printer size={13} />}
                <span>{billBtConnected ? "Change Bill Printer" : "Connect Bill Printer"}</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={billBtEnabled}
                onClick={() => handleToggleBtEnabled("bill")}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  billBtEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-neutral-700"
                }`}
                title={billBtEnabled ? "Turn Off Bill Printer" : "Turn On Bill Printer"}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    billBtEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Row 2: KOT Bluetooth Printer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--kravy-bg-2)]/50 p-3 sm:p-3.5 rounded-2xl border border-[var(--kravy-border)]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                kotBtConnected ? "bg-amber-500/10 text-amber-600 border border-amber-500/30" : "bg-slate-200 dark:bg-white/10 text-slate-500"
              }`}>
                <Printer size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)]">
                    KOT Bluetooth Print
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                    kotBtConnected ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
                  }`}>
                    {kotBtConnected ? "Connected" : "Offline"}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)]">
                  {kotBtConnected
                    ? `Device: ${kotBtPrinterName || "Ready"}`
                    : kotBtPrinterName
                    ? `Saved: ${kotBtPrinterName}`
                    : "Kitchen Ticket (KOT) Printer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                disabled={!kotBtEnabled || kotBtLoading}
                onClick={() => handleConnectBtPrinter("kot")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {kotBtLoading ? <RefreshCw size={13} className="animate-spin" /> : <Printer size={13} />}
                <span>{kotBtConnected ? "Change KOT Printer" : "Connect KOT Printer"}</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={kotBtEnabled}
                onClick={() => handleToggleBtEnabled("kot")}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  kotBtEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-neutral-700"
                }`}
                title={kotBtEnabled ? "Turn Off KOT Printer" : "Turn On KOT Printer"}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    kotBtEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick info note */}
          <div className="pt-2 text-[10px] text-[var(--kravy-text-muted)] flex items-center justify-between">
            <span>💡 Tip: Agar aapke paas ek hi printer hai, to dono me use connect kar sakte hain ya sirf Bill me connect rakhein, dono usi par print ho jayenge.</span>
            <span className="font-bold text-indigo-600">Auto-Reconnect: Active</span>
          </div>
        </div>

        {/* ── Custom Surcharge / Service Charge Label Card ── */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 shadow-sm">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-[var(--kravy-text-primary)]">
                    Custom Charge Label (Service Charge)
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Bill Print
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[var(--kravy-text-muted)] mt-0.5">
                  POS checkout aur printed invoice par &quot;Service Charge&quot; ki jagah apna custom naam show karein
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Input Box */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                Charge Display Name (e.g., Laundry Charge, Delivery Fee)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={serviceChargeName}
                  onChange={(e) => setServiceChargeName(e.target.value)}
                  placeholder="e.g. Service Charge, Laundry Charge, Handling Fee"
                  className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-[var(--kravy-text-muted)]"
                />
                {serviceChargeName !== "Service Charge" && (
                  <button
                    type="button"
                    onClick={() => setServiceChargeName("Service Charge")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-indigo-600 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-neutral-800"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] mr-1">Quick Select:</span>
                {[
                  "Service Charge",
                  "Laundry Charge",
                  "Handling Fee",
                  "Packaging & Care",
                  "Delivery Charge",
                  "Urgent Service"
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { kravy.click(); setServiceChargeName(preset); }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      serviceChargeName === preset
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-[var(--kravy-bg)] text-[var(--kravy-text-secondary)] border-[var(--kravy-border)] hover:border-indigo-500"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Thermal Bill Preview Snippet */}
            <div className="bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl p-3.5 flex flex-col justify-between font-mono">
              <div>
                <div className="flex items-center justify-between text-[10px] text-[var(--kravy-text-muted)] font-bold pb-2 border-b border-dashed border-[var(--kravy-border)]">
                  <span>🧾 PRINT INVOICE PREVIEW</span>
                  <span className="text-emerald-500 font-black">THERMAL 80MM</span>
                </div>
                <div className="py-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>120.00</span>
                  </div>
                  <div className="flex justify-between font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                    <span>{(serviceChargeName || "SERVICE CHARGE").toUpperCase()}</span>
                    <span>+15.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-1 border-t border-[var(--kravy-border)]">
                    <span>TOTAL PAYABLE</span>
                    <span>135.00</span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-[var(--kravy-text-muted)] italic">
                Bills, KOTs and receipts will print & display this customized label.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-[32px] overflow-hidden shadow-xl divide-y divide-[var(--kravy-border)]">
          {[
            {
              href: "/dashboard/profile?from=menu-layout",
              icon: <UserCircle size={20} />,
              color: "#8B5CF6",
              label: "Business Profile",
              desc: "Update your store name, address and branding"
            },
            {
              href: "/dashboard/settings/currency?from=menu-layout",
              icon: <Percent size={20} />,
              color: "#059669",
              label: "Currency & Localization",
              desc: "Set base currency and formatting rules"
            },
            {
              href: "/dashboard/settings/tax?from=menu-layout",
              icon: <Percent size={20} />,
              color: "#F59E0B",
              label: "Tax Management",
              desc: "Enable/Disable GST and configure tax rates"
            },
            {
              href: "/dashboard/settings/customer?from=menu-layout",
              icon: <Users size={20} />,
              color: "#06B6D4",
              label: "Customer Setup",
              desc: "Configure QR Menu data collection rules (Name, Phone, Address)"
            },
            {
              href: "/dashboard/settings/loyalty?from=menu-layout",
              icon: <Award size={20} />,
              color: "#D4A353",
              label: "Loyalty Program",
              desc: "Set point ratios and redemption rules for customers"
            },
            {
              href: "/dashboard/settings/inventory?from=menu-layout",
              icon: <Package size={20} />,
              color: "#3B82F6",
              label: "Inventory & Stock",
              desc: "Manage serial numbers and stock entry rules"
            },
            {
              href: "/dashboard/settings/pos?from=menu-layout",
              icon: <LayoutDashboard size={20} />,
              color: "#8B5CF6",
              label: "Quick POS Layout",
              desc: "Enable/Disable payment modes and action buttons"
            },
            {
              href: "/dashboard/settings/sidebar?from=menu-layout",
              icon: <Sliders size={20} />,
              color: "#EC4899",
              label: "Sidebar Menu Controls",
              desc: "Hide unnecessary sidebar items & customize your navigation menu"
            },
            {
              href: "/dashboard/settings/printing?from=menu-layout",
              icon: <Printer size={20} />,
              color: "#EC4899",
              label: "Printing Setup",
              desc: "Customize bill & KOT layouts with live preview"
            },
          ].map((item, idx) => (
            <Link key={idx} href={item.href} onClick={() => kravy.click()} className="block">
              <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-[var(--kravy-surface-hover)] dark:hover:bg-white/[0.03] transition-all cursor-pointer group">
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    background: `${item.color}15`,
                    border: `1px solid ${item.color}30`,
                    color: item.color
                  }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-[10px] sm:text-xs text-[var(--kravy-text-muted)] truncate mt-0.5">
                    {item.desc}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 dark:text-white/30 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="pt-8 border-t border-slate-100 dark:border-white/5 text-center">
        <p className="text-[10px] text-slate-300 dark:text-white/10 uppercase tracking-[6px] font-black italic">
          Kravy POS · Menu Layout Engine
        </p>
      </div>
    </div>
  );
}

export default function MenuLayoutPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center opacity-50">Loading Layout Controls...</div>}>
      <MenuLayoutContent />
    </Suspense>
  );
}

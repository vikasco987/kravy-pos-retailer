"use client";

import { useEffect, useState } from "react";
import { 
  Bluetooth, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Info,
  Power,
  Trash2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import {
  ensurePrinterConnected,
  isPrinterConnected,
  getConnectedPrinterName,
  disconnectPrinter,
  isSamePrinterForKot,
  setSamePrinterForKot,
  printReceiptData,
  getPrinterLiveStatus,
  getAuthorizedPrinters,
  connectAuthorizedPrinter,
  forgetAuthorizedPrinter,
  AuthorizedPrinterItem
} from "@/lib/web-bluetooth";

interface BluetoothPrinterManagementProps {
  standalone?: boolean;
}

export default function BluetoothPrinterManagement({ standalone = false }: BluetoothPrinterManagementProps) {
  // Bluetooth Printer states (Bill & KOT)
  const [billBtEnabled, setBillBtEnabled] = useState(true);
  const [billBtConnected, setBillBtConnected] = useState(false);
  const [billBtPrinterName, setBillBtPrinterName] = useState<string | null>(null);
  const [billBtLoading, setBillBtLoading] = useState(false);

  const [kotBtEnabled, setKotBtEnabled] = useState(true);
  const [kotBtConnected, setKotBtConnected] = useState(false);
  const [kotBtPrinterName, setKotBtPrinterName] = useState<string | null>(null);
  const [kotBtLoading, setKotBtLoading] = useState(false);
  const [billBtStatus, setBillBtStatus] = useState<string>("DISCONNECTED");
  const [kotBtStatus, setKotBtStatus] = useState<string>("DISCONNECTED");
  const [billBtLastError, setBillBtLastError] = useState<string | null>(null);
  const [kotBtLastError, setKotBtLastError] = useState<string | null>(null);
  const [samePrinterForKot, setSamePrinterForKotState] = useState(true);
  const [testPrintingSlot, setTestPrintingSlot] = useState<"bill" | "kot" | null>(null);
  const [authorizedPrinters, setAuthorizedPrinters] = useState<AuthorizedPrinterItem[]>([]);
  const [connectingAuthorizedId, setConnectingAuthorizedId] = useState<string | null>(null);

  // Initialize status from localStorage
  useEffect(() => {
    try {
      const billEnabled = localStorage.getItem("bt_bill_printer_enabled");
      if (billEnabled !== null) {
        setBillBtEnabled(billEnabled === "true");
      }
      const kotEnabled = localStorage.getItem("bt_kot_printer_enabled");
      if (kotEnabled !== null) {
        setKotBtEnabled(kotEnabled === "true");
      }
      setSamePrinterForKotState(isSamePrinterForKot());
      checkBtStatus();
    } catch (e) {}
  }, []);

  const checkBtStatus = () => {
    try {
      // Bill Slot
      const billConn = isPrinterConnected("bill");
      const billLive = getPrinterLiveStatus("bill");
      setBillBtConnected(billConn);
      setBillBtStatus(billLive.status);
      setBillBtLastError(billLive.lastError);
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
      const kotLive = getPrinterLiveStatus("kot");
      setKotBtConnected(kotConn);
      setKotBtStatus(kotLive.status);
      setKotBtLastError(kotLive.lastError);
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

      // Refresh authorized list asynchronously
      getAuthorizedPrinters().then(devs => {
        setAuthorizedPrinters(devs);
      }).catch(() => {});
    } catch (e) {
      setBillBtConnected(false);
      setKotBtConnected(false);
      setBillBtStatus("ERROR");
      setKotBtStatus("ERROR");
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

  const handleToggleSamePrinterForKot = (enabled: boolean) => {
    kravy.toggle();
    setSamePrinterForKotState(enabled);
    setSamePrinterForKot(enabled);
    checkBtStatus();
    if (enabled) {
      toast.success("Bill and KOT will now use the same printer! 🖨️");
    } else {
      toast("Separate printers enabled for Bill & KOT", { icon: "ℹ️" });
    }
  };

  const handleDisconnectBtPrinter = async (slot: "bill" | "kot") => {
    kravy.click();
    try {
      await disconnectPrinter(true, slot);
      checkBtStatus();
      toast.success(`${slot === "bill" ? "Bill" : "KOT"} printer disconnected and removed`);
    } catch (e: any) {
      toast.error("Failed to disconnect: " + e.message);
    }
  };

  const handleConnectAuthorizedDevice = async (device: AuthorizedPrinterItem, slot: "bill" | "kot" = "bill") => {
    kravy.click();
    setConnectingAuthorizedId(device.id);
    try {
      await connectAuthorizedPrinter(device.id, slot);
      checkBtStatus();
      toast.success(`Connected to ${device.name || "Authorized Printer"}! 🖨️`);
    } catch (err: any) {
      checkBtStatus();
      toast.error(err.message || "Could not connect to authorized printer");
    } finally {
      setConnectingAuthorizedId(null);
    }
  };

  const handleTestPrintBt = async (slot: "bill" | "kot") => {
    kravy.click();
    setTestPrintingSlot(slot);
    try {
      const mockOrder = {
        orderNumber: slot === "bill" ? "TEST-BILL-01" : "TEST-KOT-01",
        billNumber: slot === "bill" ? "TEST-BILL-01" : undefined,
        tableName: "Table T-1",
        customerName: "Test Customer",
        customerPhone: "9876543210",
        createdAt: new Date().toISOString(),
        isTaxEnabled: true,
        items: [
          { name: "Paneer Butter Masala", qty: 1, price: 240, rate: 240, gst: 5 },
          { name: "Butter Naan", qty: 2, price: 40, rate: 40, gst: 5 }
        ],
        subtotal: 320,
        tax: 16,
        totalAmount: 336,
        paymentMode: "CASH"
      };
      const mockBusiness = {
        businessName: "Kravy POS Test",
        businessAddress: "Live Bluetooth Test Print",
        phone: "9876543210",
        upi: "kravy@upi"
      };

      await printReceiptData(mockOrder, mockBusiness, null, slot);
      toast.success(`${slot.toUpperCase()} test print successful! 📄`);
    } catch (err: any) {
      toast.error(err.message || `Test print failed for ${slot.toUpperCase()}`);
    } finally {
      setTestPrintingSlot(null);
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

  return (
    <div className={`bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-4 ${standalone ? "max-w-4xl mx-auto" : ""}`}>
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

      {/* Toggle: Same Printer for Bill & KOT */}
      <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 rounded-2xl">
        <div className="space-y-0.5 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Same Printer for Bill & KOT
            </span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              Recommended
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            Agar aapke paas 1 hi printer hai, to isse enable rakhein. KOT alag se scan nahi karna padega aur dono bina issue print honge.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={samePrinterForKot}
          onClick={() => handleToggleSamePrinterForKot(!samePrinterForKot)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            samePrinterForKot ? "bg-indigo-600" : "bg-slate-300 dark:bg-neutral-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              samePrinterForKot ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
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
                billBtConnected 
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200" 
                  : billBtStatus === "CONNECTING" || billBtStatus === "RECONNECTING"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 animate-pulse"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
              }`}>
                {billBtConnected ? (billBtStatus === "PRINTING" ? "Printing..." : "Connected") : (billBtStatus === "RECONNECTING" ? "Reconnecting..." : "Offline")}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)]">
              {billBtConnected
                ? `Device: ${billBtPrinterName || "Ready"}`
                : billBtPrinterName
                ? `Saved: ${billBtPrinterName}`
                : "Customer Bill & Receipt Printer"}
            </p>
            {billBtLastError && !billBtConnected && (
              <p className="text-[9px] text-rose-500 font-medium truncate max-w-[240px]">
                ⚠️ {billBtLastError}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {billBtConnected && (
            <>
              <button
                type="button"
                disabled={testPrintingSlot === "bill"}
                onClick={() => handleTestPrintBt("bill")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
              >
                {testPrintingSlot === "bill" ? <RefreshCw size={11} className="animate-spin" /> : null}
                <span>Test Print</span>
              </button>
              <button
                type="button"
                onClick={() => handleDisconnectBtPrinter("bill")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Disconnect and Forget Printer"
              >
                Disconnect
              </button>
            </>
          )}

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
      {samePrinterForKot ? (
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl">
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
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200">
                  Shared (Using Bill Printer)
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)]">
                {kotBtConnected ? `Active on: ${billBtPrinterName || "Bill Printer"}` : "Bill printer connect hone par KOT auto-active ho jayega."}
              </p>
            </div>
          </div>

          {kotBtConnected && (
            <button
              type="button"
              disabled={testPrintingSlot === "kot"}
              onClick={() => handleTestPrintBt("kot")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
            >
              {testPrintingSlot === "kot" ? <RefreshCw size={11} className="animate-spin" /> : null}
              <span>Test KOT Print</span>
            </button>
          )}
        </div>
      ) : (
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
                  KOT Bluetooth Print (Dedicated)
                </span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  kotBtConnected 
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200" 
                    : kotBtStatus === "CONNECTING" || kotBtStatus === "RECONNECTING"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 animate-pulse"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
                }`}>
                  {kotBtConnected ? (kotBtStatus === "PRINTING" ? "Printing..." : "Connected") : (kotBtStatus === "RECONNECTING" ? "Reconnecting..." : "Offline")}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--kravy-text-muted)]">
                {kotBtConnected
                  ? `Device: ${kotBtPrinterName || "Ready"}`
                  : kotBtPrinterName
                  ? `Saved: ${kotBtPrinterName}`
                  : "Separate Kitchen Ticket Printer"}
              </p>
              {kotBtLastError && !kotBtConnected && (
                <p className="text-[9px] text-rose-500 font-medium truncate max-w-[240px]">
                  ⚠️ {kotBtLastError}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
            {kotBtConnected && (
              <>
                <button
                  type="button"
                  disabled={testPrintingSlot === "kot"}
                  onClick={() => handleTestPrintBt("kot")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {testPrintingSlot === "kot" ? <RefreshCw size={11} className="animate-spin" /> : null}
                  <span>Test KOT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnectBtPrinter("kot")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  title="Disconnect and Forget KOT Printer"
                >
                  Disconnect
                </button>
              </>
            )}

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
      )}

      {/* Previously Authorized / Bonded Printers Section */}
      {authorizedPrinters.length > 0 && (
        <div className="p-3.5 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Previously Authorized / Bonded Printers ({authorizedPrinters.length})
            </span>
            <span className="text-[10px] text-slate-500">
              Click to connect without scanning
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {authorizedPrinters.map(dev => (
              <div 
                key={dev.id}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700 rounded-xl"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {dev.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    ID: {dev.id.slice(0, 10)}... • {dev.type === "CAPACITOR_BLE" ? "Native BLE" : "Web Bluetooth"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={connectingAuthorizedId === dev.id || dev.isConnected}
                    onClick={() => handleConnectAuthorizedDevice(dev, "bill")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dev.isConnected 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 disabled:opacity-50"
                    }`}
                  >
                    {connectingAuthorizedId === dev.id ? (
                      <RefreshCw size={11} className="animate-spin inline" />
                    ) : dev.isConnected ? (
                      "Connected ✓"
                    ) : (
                      "Connect"
                    )}
                  </button>
                  <button
                    type="button"
                    title="Remove/Forget this device"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await forgetAuthorizedPrinter(dev.id);
                      if (ok) {
                        toast.success(`${dev.name} removed`);
                        checkBtStatus();
                      } else {
                        toast.error("Failed to remove device");
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Discovery Limitation Notice (Connected to another phone) */}
      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
        <span className="text-blue-600 text-sm shrink-0 mt-0.5">ℹ️</span>
        <div className="space-y-0.5">
          <span className="font-bold text-[11px] block">Printer Scan Guidance:</span>
          <p className="text-[10px] leading-relaxed text-blue-800/90 dark:text-blue-300/90">
            Agar printer scan list me nahi dikh raha, to sambhav hai ki yeh pehle se kisi doosre phone se connected hai. Thermal printers connect hone ke baad advertising band kar dete hain. Kripya doosre phone ka Bluetooth band karein ya printer ko restart karke dubara scan karein.
          </p>
        </div>
      </div>

      {/* Quick info note */}
      <div className="pt-2 text-[10px] text-[var(--kravy-text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>Web Bluetooth ESC/POS Engine Active</span>
        <span className="font-mono">
          Bill: {billBtConnected ? "ACTIVE" : "OFF"} | KOT: {kotBtConnected ? (samePrinterForKot ? "SHARED" : "ACTIVE") : "OFF"}
        </span>
      </div>
    </div>
  );
}

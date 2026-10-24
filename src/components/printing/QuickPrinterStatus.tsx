"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bluetooth, Printer, Check, X, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  isPrinterConnected,
  getConnectedPrinterName,
  ensurePrinterConnected,
  disconnectPrinter
} from "@/lib/web-bluetooth";

interface QuickPrinterStatusProps {
  className?: string;
  compact?: boolean;
}

export function QuickPrinterStatus({ className = "", compact = false }: QuickPrinterStatusProps) {
  const [connected, setConnected] = useState<boolean>(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const checkStatus = useCallback(() => {
    try {
      const isConn = isPrinterConnected();
      setConnected(isConn);
      setPrinterName(isConn ? getConnectedPrinterName() : null);
    } catch {
      setConnected(false);
      setPrinterName(null);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await ensurePrinterConnected(true);
      checkStatus();
      const name = getConnectedPrinterName() || "Printer";
      toast.success(`${name} connected!`);
    } catch (err: any) {
      checkStatus();
      if (!err?.message?.includes("cancelled")) {
        toast.error(err?.message || "Bluetooth connection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await disconnectPrinter(true);
      checkStatus();
      toast.info("Printer disconnected");
    } catch (err: any) {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-black transition-all ${
        connected
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
          : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
      } ${className}`}
    >
      <div className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        <Bluetooth size={11} className={connected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"} />
        <span className="truncate max-w-[110px]">
          {connected ? (printerName || "BT Printer") : "BT Disconnected"}
        </span>
      </div>

      {connected ? (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={loading}
          title="Disconnect this printer (Release connection for other devices)"
          className="ml-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1 font-bold text-[8.5px] cursor-pointer"
        >
          {loading ? <RefreshCw size={8} className="animate-spin" /> : <Unplug size={8} />}
          <span>Disconnect</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          title="Connect Bluetooth Printer"
          className="ml-0.5 px-1.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-0.5 font-black uppercase text-[8.5px] cursor-pointer"
        >
          {loading ? <RefreshCw size={8} className="animate-spin" /> : <Bluetooth size={8} />}
          <span>Pair</span>
        </button>
      )}
    </div>
  );
}

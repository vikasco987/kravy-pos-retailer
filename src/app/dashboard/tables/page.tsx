"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/components/AuthContext";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import {
  QrCode, Plus, Trash2, Download, Copy, Eye,
  Table as TableIcon, Search, RefreshCw, X, Edit, Layers, Settings, ChevronDown,
  Code2, Check, FileCode, ShoppingBag, Clock, ArrowRight, ArrowLeftRight, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { kravy } from "@/lib/sounds";
import QRMenuTemplate from "@/components/printing/QRMenuTemplate";
import { useConfirm } from "@/components/ConfirmContext";
import { useTerminalContext } from "@/components/TerminalContext";

interface TableRecord {
  id: string;
  name: string;
  zone: string;
  floor?: string;
  qrUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  clerkUserId?: string;
}

export default function TablesPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const { user, loading: authLoading } = useAuthContext();
  const { emitUpdate } = useTerminalContext();
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newZone, setNewZone] = useState("Default");
  const [newFloor, setNewFloor] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<TableRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [multiZoneEnabled, setMultiZoneEnabled] = useState(false);
  const [editingTable, setEditingTable] = useState<TableRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editZone, setEditZone] = useState("Default");
  const [editFloor, setEditFloor] = useState("");
  const [bulkFloor, setBulkFloor] = useState("");
  const [search, setSearch] = useState("");
  const [showQRTemplate, setShowQRTemplate] = useState(false);
  const [qrContext, setQrContext] = useState<{ tableId: string, tableName: string } | null>(null);

  // Admin JSON Inspector Modal State
  const [jsonModalData, setJsonModalData] = useState<{ title: string; json: any } | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.email === "vikasvikas9095@gmail.com";

  const getBase = () => (typeof window !== "undefined" ? window.location.origin : "");

  const generateTableUrl = (id: string, name: string) =>
    `${getBase()}/menu/${user?.businessId || user?.id}?tableId=${encodeURIComponent(id)}&tableName=${encodeURIComponent(name)}`;

  const [availableFloors, setAvailableFloors] = useState<string[]>(["Floor 1", "Ground Floor"]);
  
  const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
  const [isFloorManagerOpen, setIsFloorManagerOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [isFloorLoading, setIsFloorLoading] = useState(false);
  const [editingFloor, setEditingFloor] = useState<{old: string, new: string} | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const [tableRes, floorRes, ordersRes] = await Promise.all([
        fetch(`${getBase()}/api/tables?t=${ts}`, { cache: "no-store" }).catch(() => null),
        fetch(`${getBase()}/api/floors?t=${ts}`, { cache: "no-store" }).catch(() => null),
        fetch(`${getBase()}/api/orders?active=true`, { cache: "no-store" }).catch(() => null)
      ]);
      
      let data: TableRecord[] = [];
      if (tableRes && tableRes.ok) {
        data = await tableRes.json();
        setTables(data);
      }

      if (ordersRes && ordersRes.ok) {
        const ordData = await ordersRes.json();
        if (Array.isArray(ordData)) {
          setActiveOrders(ordData.filter((o: any) => !o.isDeleted && o.status !== "COMPLETED"));
        }
      }

      let floorsList = ["Floor 1", "Ground Floor"];
      if (floorRes && floorRes.ok) {
        const floorData = await floorRes.json();
        if (floorData.floors && Array.isArray(floorData.floors)) {
          floorsList = floorData.floors;
        }
      }

      // Also ensure any floor present in existing tables is included
      const ignoredZoneNames = new Set(["DEFAULT", "ALL", "AC", "ROOM", "NON AC"]);
      const tableFloors = data
        .map(t => (t.floor || "").trim())
        .filter(f => f && !ignoredZoneNames.has(f.toUpperCase()));
      const uniqueFloors = Array.from(new Set([...floorsList, ...tableFloors]))
        .filter(f => f && !ignoredZoneNames.has(f.toUpperCase()));
      setAvailableFloors(uniqueFloors);

    } catch (e) {
      console.error(e);
      kravy.error();
      toast.error("Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  const [activeFloorTab, setActiveFloorTab] = useState<string>("ALL");
  const [creationMode, setCreationMode] = useState<"single" | "bulk">("single");
  const [bulkPrefix, setBulkPrefix] = useState("T-");
  const [bulkStart, setBulkStart] = useState<number>(1);
  const [bulkCount, setBulkCount] = useState<number>(5);
  const [bulkZone, setBulkZone] = useState("");
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const createTable = async () => {
    if (!newName.trim() || isCreating) { 
      if (!newName.trim()) { kravy.error(); toast.error("Please enter a table name"); }
      return; 
    }
    
    setIsCreating(true);
    try {
      const res = await fetch(`/api/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), zone: newZone || "Default", floor: newFloor || (activeFloorTab !== "ALL" ? activeFloorTab : (availableFloors[0] || "Floor 1")) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const t: TableRecord = await res.json();
      setTables((prev) => {
        if (prev.some(table => table.id === t.id)) return prev;
        return [...prev, t];
      });
      setNewName("");
      kravy.success();
      toast.success(`Table "${t.name}" created!`);
      emitUpdate();
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to create table");
    } finally {
      setIsCreating(false);
    }
  };

  const createBulkTables = async () => {
    if (bulkCount < 1 || isBulkCreating) return;
    setIsBulkCreating(true);
    try {
      const selectedZone = bulkZone || "Default";
      const selectedFloor = bulkFloor || (activeFloorTab !== "ALL" ? activeFloorTab : (availableFloors[0] || "Floor 1"));
      const tablesToCreate = [];
      for (let i = 0; i < bulkCount; i++) {
        const num = bulkStart + i;
        const formattedNum = num < 10 && !bulkPrefix.endsWith("-") && !bulkPrefix.endsWith(" ") ? `0${num}` : `${num}`;
        tablesToCreate.push({
          name: `${bulkPrefix}${formattedNum}`,
          zone: selectedZone,
          floor: selectedFloor
        });
      }

      const res = await fetch(`/api/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: tablesToCreate, zone: selectedZone, floor: selectedFloor }),
      });

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      if (result.tables && Array.isArray(result.tables)) {
        setTables(prev => {
          const map = new Map(prev.map(t => [t.id, t]));
          result.tables.forEach((t: TableRecord) => map.set(t.id, t));
          return Array.from(map.values());
        });
      }
      kravy.success();
      toast.success(`${result.count || tablesToCreate.length} Tables created successfully!`);
      emitUpdate();
      fetchTables();
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to create bulk tables");
    } finally {
      setIsBulkCreating(false);
    }
  };

  const updateTable = async () => {
    if (!editingTable || !editName.trim()) return;
    try {
      const res = await fetch(`/api/tables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTable.id, name: editName.trim(), zone: editZone || "Default", floor: editFloor || "Floor 1" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTables(prev => prev.map(t => t.id === updated.id ? updated : t));
      setEditingTable(null);
      kravy.success();
      toast.success("Table updated");
      emitUpdate();
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Update failed");
    }
  };

  const deleteTable = async (id: string) => {
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setTables((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
      kravy.success();
      toast.success("Table deleted");
      emitUpdate();
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to delete table");
    }
  };


  const getTableOrder = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return activeOrders.find(
      (o) =>
        !o.isDeleted &&
        o.status !== "COMPLETED" &&
        (o.tableId === tableId ||
          o.table?.id === tableId ||
          (table && o.tableName && o.tableName.toLowerCase() === table.name.toLowerCase()))
    );
  };

  const getTableDetails = (tableId: string) => {
    const order = getTableOrder(tableId);
    if (!order) return { status: "FREE" as const, order: null, amount: 0, mins: 0, itemsCount: 0 };
    const isBilled = order.status === "BILLED" || Boolean(order.isPrinted) || order.status === "READY";
    const amount = Number(order.total || order.subtotal || 0);
    const diffMs = order.createdAt ? Date.now() - new Date(order.createdAt).getTime() : 0;
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
    return {
      status: isBilled ? ("BILLED" as const) : ("OCCUPIED" as const),
      order,
      amount,
      mins,
      itemsCount,
    };
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-IN").format(Math.round(val || 0));
  const copyTableUrl = (id: string, name: string) => {
    const url = generateTableUrl(id, name);
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    kravy.success();
    toast.success("Link copied!");
  };

  const downloadTableQR = (table: TableRecord) => {
    const qrRef = document.querySelector(`#qr-${table.id} svg`) as SVGElement;
    if (!qrRef) return;
    const svgData = new XMLSerializer().serializeToString(qrRef);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1F2937";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Scan to Order", canvas.width / 2, 40);
      ctx.fillStyle = "#4F46E5";
      ctx.font = "bold 20px Arial";
      ctx.fillText(`Table: ${table.name}`, canvas.width / 2, 70);
      const qrSize = 260;
      const qrX = (canvas.width - qrSize) / 2;
      ctx.drawImage(img, qrX, 90, qrSize, qrSize);
      ctx.fillStyle = "#6B7280";
      ctx.font = "14px Arial";
      ctx.fillText("Place this QR on your table", canvas.width / 2, 380);
      const pngFile = canvas.toDataURL("image/png");
      const dl = document.createElement("a");
      dl.download = `QR_Table_${table.name}.png`;
      dl.href = pngFile;
      dl.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  useEffect(() => { if (user) fetchTables(); }, [user]);

  const filtered = tables.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
      (t.floor && t.floor.toLowerCase().includes(search.toLowerCase())) ||
      (t.zone && t.zone.toLowerCase().includes(search.toLowerCase()));
    const tableFloor = (t.floor || "Floor 1").trim();
    const matchesFloor = activeFloorTab === "ALL" || tableFloor.toUpperCase() === activeFloorTab.trim().toUpperCase();
    return matchesSearch && matchesFloor;
  });

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--kravy-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--kravy-brand)]/20 border-t-[var(--kravy-brand)] animate-spin" />
        <p className="text-sm font-bold text-[var(--kravy-text-muted)]">Loading…</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-rose-500 font-bold">Please log in to manage tables</p>
    </div>
  );

  return (
    <div className="min-h-full w-full bg-[var(--kravy-bg)] pb-28 md:pb-32 lg:pb-24">

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <div className="bg-[var(--kravy-surface)] border-b border-[var(--kravy-border)] px-4 sm:px-6 lg:px-8 py-6 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Icon badge */}
            <div className="w-12 h-12 rounded-2xl bg-[var(--kravy-brand)] flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <TableIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight leading-tight">
                Floor & Station Manager
              </h1>
              <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] font-medium mt-0.5">
                Create floors (Ground, 1st, Rooftop, Garden), add tables &amp; generate QR codes
              </p>
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsFloorManagerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-xs font-black text-[var(--kravy-text-primary)] hover:border-[var(--kravy-brand)] hover:text-[var(--kravy-brand)] transition-all shadow-sm"
            >
              <Settings size={14} /> Manage Floors
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setJsonModalData({
                      title: "Floors List (JSON)",
                      json: {
                        totalFloors: availableFloors.length,
                        floors: availableFloors,
                        floorDetails: availableFloors.map(floor => ({
                          floor,
                          tablesCount: tables.filter(t => (t.floor || "Floor 1").toUpperCase() === floor.toUpperCase()).length,
                          tables: tables
                            .filter(t => (t.floor || "Floor 1").toUpperCase() === floor.toUpperCase())
                            .map(t => ({ id: t.id, name: t.name, floor: t.floor || "Floor 1", zone: t.zone }))
                        }))
                      }
                    });
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-sm"
                  title="Admin: Inspect & Copy Floors JSON"
                >
                  <Code2 size={14} /> Floor JSON
                </button>
                <button
                  onClick={() => {
                    setJsonModalData({
                      title: "Tables Page Full Data (JSON)",
                      json: {
                        totalCount: tables.length,
                        availableFloors,
                        activeFloorTab,
                        tables
                      }
                    });
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm"
                  title="Admin: Inspect & Copy Full Tables JSON"
                >
                  <Code2 size={14} /> Page JSON
                </button>
              </>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--kravy-brand)]/8 border border-[var(--kravy-brand)]/15 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-black text-[var(--kravy-text-primary)]">{tables.length}</span>
              <span className="text-xs font-bold text-[var(--kravy-text-muted)]">Tables</span>
            </div>
            <button
              onClick={fetchTables}
              disabled={loading}
              className="w-9 h-9 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg)]
                flex items-center justify-center text-[var(--kravy-text-muted)]
                hover:border-[var(--kravy-brand)] hover:text-[var(--kravy-brand)] transition-all
                disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ══════════════════════════════════════
            FLOOR SELECTION TABS
        ══════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { kravy.click(); setActiveFloorTab("ALL"); }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                activeFloorTab === "ALL"
                  ? "bg-[var(--kravy-brand)] border-[var(--kravy-brand)] text-white shadow-lg shadow-indigo-500/20 scale-[1.02]"
                  : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-[var(--kravy-brand)]/40"
              }`}
            >
              All Floors ({tables.length})
            </button>

            {availableFloors.map((f) => {
              const count = tables.filter((t) => (t.floor || "Floor 1").toUpperCase() === f.toUpperCase()).length;
              return (
                <button
                  key={f}
                  onClick={() => { 
                    kravy.click(); 
                    setActiveFloorTab(f);
                    setNewZone(f);
                    setBulkZone(f);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap flex items-center gap-2 ${
                    activeFloorTab.toUpperCase() === f.toUpperCase()
                      ? "bg-[var(--kravy-brand)] border-[var(--kravy-brand)] text-white shadow-lg shadow-indigo-500/20 scale-[1.02]"
                      : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-[var(--kravy-brand)]/40"
                  }`}
                >
                  <Layers size={13} />
                  <span>{f}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    activeFloorTab.toUpperCase() === f.toUpperCase() ? "bg-white/20 text-white" : "bg-[var(--kravy-bg)] text-[var(--kravy-text-muted)]"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setIsFloorManagerOpen(true)}
              className="px-3 py-2.5 rounded-2xl text-xs font-bold text-[var(--kravy-brand)] bg-[var(--kravy-brand)]/10 hover:bg-[var(--kravy-brand)]/20 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={14} /> Add New Floor
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════
            ADD TABLE & BULK CREATION FORM
        ══════════════════════════════════════ */}
        <div className="bg-[var(--kravy-surface)] rounded-2xl border border-[var(--kravy-border)] shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-[var(--kravy-border)] bg-[var(--kravy-bg)]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--kravy-brand)]/10 flex items-center justify-center">
                <Plus size={14} className="text-[var(--kravy-brand)]" />
              </div>
              <span className="text-sm font-black text-[var(--kravy-text-primary)]">
                {creationMode === "single" ? "Add Table" : "Auto Generate Multiple Tables"}
              </span>
            </div>

            {/* Switch Single / Bulk */}
            <div className="flex items-center bg-[var(--kravy-bg)] p-1 rounded-xl border border-[var(--kravy-border)]">
              <button
                onClick={() => setCreationMode("single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  creationMode === "single" 
                    ? "bg-[var(--kravy-surface)] text-[var(--kravy-brand)] shadow-sm" 
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                Single Table
              </button>
              <button
                onClick={() => setCreationMode("bulk")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  creationMode === "bulk" 
                    ? "bg-[var(--kravy-brand)] text-white shadow-sm" 
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                <span>⚡ Auto Generator</span>
              </button>
            </div>
          </div>

          <div className="p-5">
            {creationMode === "single" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <TableIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]"
                    />
                    <input
                      type="text"
                      placeholder="Station / Counter name — e.g. Counter 1, Billing Desk, Shelf A, Spot 05, T-01…"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") createTable(); }}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                        text-[var(--kravy-text-primary)] rounded-xl text-sm font-medium outline-none
                        focus:ring-2 focus:ring-[var(--kravy-brand)]/20 focus:border-[var(--kravy-brand)]
                        transition-all placeholder:text-[var(--kravy-text-muted)]"
                    />
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Layers
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] pointer-events-none"
                    />
                    <select
                      value={newFloor || (activeFloorTab !== "ALL" ? activeFloorTab : (availableFloors[0] || "Floor 1"))}
                      onChange={(e) => setNewFloor(e.target.value)}
                      className="w-full pl-10 pr-8 py-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                        text-[var(--kravy-text-primary)] rounded-xl text-sm font-bold outline-none
                        focus:ring-2 focus:ring-[var(--kravy-brand)]/20 focus:border-[var(--kravy-brand)]
                        transition-all cursor-pointer appearance-none"
                    >
                      {availableFloors.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] pointer-events-none" />
                  </div>

                  <button
                    onClick={createTable}
                    disabled={isCreating}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                      bg-[var(--kravy-brand)] text-white font-black text-sm
                      hover:bg-indigo-700 active:scale-[0.97]
                      shadow-md shadow-indigo-500/25 transition-all
                      whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                  >
                    {isCreating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                    {isCreating ? "Creating..." : "Add Table"}
                  </button>
                </div>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase">Presets:</span>
                  {["Counter-01", "Counter-02", "Station-A", "Shelf-1", "Spot-01", "T-01", "Desk-1"].map((tip) => (
                    <button
                      key={tip}
                      onClick={() => setNewName(tip)}
                      className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                        bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                        text-[var(--kravy-text-muted)] hover:border-[var(--kravy-brand)]
                        hover:text-[var(--kravy-brand)] transition-all"
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Bulk Generator Form */
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] px-1">Prefix</label>
                    <input
                      type="text"
                      placeholder="e.g. Counter-, Spot-, Desk-, T-"
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-sm font-bold outline-none focus:border-[var(--kravy-brand)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] px-1">Start From</label>
                    <input
                      type="number"
                      min={1}
                      value={bulkStart}
                      onChange={(e) => setBulkStart(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-sm font-bold outline-none focus:border-[var(--kravy-brand)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] px-1">Number of Tables</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}
                        className="w-9 h-10 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] font-black text-base hover:bg-[var(--kravy-brand)] hover:text-white transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        className="flex-1 px-3 py-2.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-sm font-bold outline-none text-center focus:border-[var(--kravy-brand)]"
                      />
                      <button
                        type="button"
                        onClick={() => setBulkCount(Math.min(50, bulkCount + 1))}
                        className="w-9 h-10 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] font-black text-base hover:bg-[var(--kravy-brand)] hover:text-white transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)] px-1">Floor</label>
                    <select
                      value={bulkFloor || (activeFloorTab !== "ALL" ? activeFloorTab : (availableFloors[0] || "Floor 1"))}
                      onChange={(e) => setBulkFloor(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-sm font-bold outline-none focus:border-[var(--kravy-brand)]"
                    >
                      {availableFloors.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--kravy-border)]">
                  <div className="text-xs text-[var(--kravy-text-muted)] font-medium">
                    Preview: <span className="font-bold text-[var(--kravy-text-primary)]">{bulkPrefix}{bulkStart}</span> to <span className="font-bold text-[var(--kravy-text-primary)]">{bulkPrefix}{bulkStart + bulkCount - 1}</span> ({bulkCount} tables in {bulkFloor || (activeFloorTab !== "ALL" ? activeFloorTab : (availableFloors[0] || "Floor 1"))})
                  </div>
                  <button
                    onClick={createBulkTables}
                    disabled={isBulkCreating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs uppercase tracking-wider hover:opacity-90 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
                  >
                    {isBulkCreating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    {isBulkCreating ? "Generating..." : `Create ${bulkCount} Tables Now`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════
            SEARCH BAR & FILTERS
        ══════════════════════════════════════ */}
        {tables.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
              <input
                type="text"
                placeholder="Search tables or floor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)]
                  text-[var(--kravy-text-primary)] rounded-xl text-sm font-medium outline-none
                  focus:ring-2 focus:ring-[var(--kravy-brand)]/20 focus:border-[var(--kravy-brand)]
                  transition-all placeholder:text-[var(--kravy-text-muted)]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <p className="text-xs font-bold text-[var(--kravy-text-muted)]">
              Showing {filtered.length} of {tables.length} tables {activeFloorTab !== "ALL" ? `in ${activeFloorTab}` : ""}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════
            LOADING STATE
        ══════════════════════════════════════ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[var(--kravy-brand)]/20 border-t-[var(--kravy-brand)] animate-spin" />
            <p className="text-sm font-bold text-[var(--kravy-text-muted)] animate-pulse">Loading tables…</p>
          </div>
        )}

        {/* ══════════════════════════════════════
            EMPTY STATE
        ══════════════════════════════════════ */}
        {!loading && tables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center
            bg-[var(--kravy-surface)] rounded-2xl border border-dashed border-[var(--kravy-border)]">
            <div className="w-20 h-20 rounded-3xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
              flex items-center justify-center mb-5 shadow-inner">
              <TableIcon size={32} className="text-[var(--kravy-text-muted)] opacity-40" />
            </div>
            <p className="font-black text-[var(--kravy-text-primary)] text-lg mb-2">No tables yet</p>
            <p className="text-sm text-[var(--kravy-text-muted)] max-w-xs">
              Add your first table above to generate a QR code for ordering
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════
            TABLES GRID
        ══════════════════════════════════════ */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5 pb-8">
            {filtered.map((table, idx) => (
              <div
                key={table.id}
                className="group bg-[var(--kravy-surface)] rounded-2xl border border-[var(--kravy-border)]
                  overflow-hidden shadow-sm hover:shadow-xl hover:border-[var(--kravy-brand)]/40
                  transition-all duration-300 hover:-translate-y-1 flex flex-col"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Card top strip */}
                <div className="h-1.5 bg-gradient-to-r from-[var(--kravy-brand)] to-indigo-400 opacity-60
                  group-hover:opacity-100 transition-opacity" />

                {/* Station name + Live Order Indicator */}
                {(() => {
                  const details = getTableDetails(table.id);
                  const isFree = details.status === "FREE";
                  const order = details.order;
                  return (
                    <div className="px-5 pt-4 pb-3 flex flex-col gap-2 border-b border-[var(--kravy-border)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest">
                              Station / Spot
                            </span>
                            {isFree ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>READY</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-200 animate-bounce">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>ACTIVE ORDER</span>
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-[var(--kravy-text-primary)] tracking-tight leading-none mt-1">
                            {table.name}
                          </h3>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="w-9 h-9 rounded-xl bg-[var(--kravy-brand)]/8 border border-[var(--kravy-brand)]/15 flex items-center justify-center flex-shrink-0">
                            <QrCode size={16} className="text-[var(--kravy-brand)]" />
                          </div>
                          {(table.floor || table.zone) && (
                            <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                              {table.floor || table.zone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Order Strip */}
                      {!isFree && order && (
                        <div className="mt-1 flex items-center justify-between bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                          <div>
                            <span className="text-[9px] font-bold text-amber-700 block">Current Bill</span>
                            <span className="text-base font-black text-amber-700">₹{formatCurrency(details.amount)}</span>
                          </div>
                          <button
                            onClick={() => {
                              sessionStorage.setItem("quick_pos_handoff_order", JSON.stringify(order));
                              router.push(`/dashboard/billing/checkout?orderId=${order.id}&tableId=${table.id}&tableName=${encodeURIComponent(table.name)}&returnTo=/dashboard/tables`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                          >
                            <span>Open POS</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* QR Code */}
                <div className="flex-1 flex items-center justify-center p-5">
                  <div
                    id={`qr-${table.id}`}
                    className="bg-white p-4 rounded-2xl shadow-md border border-gray-100
                      group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300"
                  >
                    <QRCode
                      value={generateTableUrl(table.id, table.name)}
                      size={140}
                      style={{ display: "block" }}
                    />
                  </div>
                </div>

                {/* URL preview */}
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-[var(--kravy-text-muted)] font-mono truncate
                    bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-lg px-2.5 py-1.5">
                    {generateTableUrl(table.id, table.name).replace("https://", "").slice(0, 44)}…
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {/* Copy Link */}
                  <button
                    onClick={() => copyTableUrl(table.id, table.name)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                      border font-black text-xs transition-all
                      ${copiedId === table.id
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-[var(--kravy-bg)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-[var(--kravy-brand)] hover:text-[var(--kravy-brand)]"
                      }`}
                  >
                    <Copy size={12} />
                    {copiedId === table.id ? "Copied!" : "Copy Link"}
                  </button>

                  {/* Download QR */}
                  <button
                    onClick={() => {
                        setQrContext({ tableId: table.id, tableName: table.name });
                        setShowQRTemplate(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                      border border-[var(--kravy-border)] bg-[var(--kravy-bg)]
                      text-[var(--kravy-text-secondary)] font-black text-xs
                      hover:border-[var(--kravy-brand)] hover:text-[var(--kravy-brand)] transition-all"
                  >
                    <Download size={12} />
                    Download
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      setEditingTable(table);
                      setEditName(table.name);
                      setEditZone(table.zone || "Default");
                      setEditFloor(table.floor || availableFloors[0] || "Floor 1");
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                      bg-[var(--kravy-brand)]/8 border border-[var(--kravy-brand)]/20
                      text-[var(--kravy-brand)] font-black text-xs
                      hover:bg-[var(--kravy-brand)] hover:text-white transition-all"
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => window.open(generateTableUrl(table.id, table.name), "_blank")}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                      border border-[var(--kravy-border)] bg-[var(--kravy-bg)]
                      text-[var(--kravy-text-secondary)] font-black text-xs
                      hover:bg-[var(--kravy-brand)] hover:text-white transition-all"
                  >
                    <Eye size={12} />
                    Preview
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirmId(table.id)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                      bg-rose-500/8 border border-rose-500/20 text-rose-500 font-black text-xs
                      hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setJsonModalData({
                          title: `Table "${table.name}" JSON`,
                          json: table
                        });
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl
                        bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700
                        text-slate-600 dark:text-slate-300 font-black text-xs hover:border-indigo-500 hover:text-indigo-600 transition-all"
                      title="Admin: View & Copy Table JSON"
                    >
                      <Code2 size={12} /> View Table JSON
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* "Add Table" ghost card */}
            <button
              onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="Table name"]')?.focus()}
              className="group min-h-[320px] rounded-2xl border-2 border-dashed border-[var(--kravy-border)]
                bg-[var(--kravy-bg)] flex flex-col items-center justify-center gap-3
                hover:border-[var(--kravy-brand)]/50 hover:bg-[var(--kravy-brand)]/3 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-[var(--kravy-border)]
                group-hover:border-[var(--kravy-brand)]/50 group-hover:bg-[var(--kravy-brand)]/5
                flex items-center justify-center transition-all">
                <Plus size={20} className="text-[var(--kravy-text-muted)] group-hover:text-[var(--kravy-brand)] transition-colors" />
              </div>
              <p className="text-xs font-black text-[var(--kravy-text-muted)] group-hover:text-[var(--kravy-brand)] transition-colors uppercase tracking-wider">
                Add Table
              </p>
            </button>
          </div>
        )}

        {/* Search no results */}
        {!loading && tables.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-[var(--kravy-text-muted)] opacity-30 mb-3" />
            <p className="font-bold text-[var(--kravy-text-primary)]">No tables match "{search}"</p>
            <button onClick={() => setSearch("")} className="text-sm text-[var(--kravy-brand)] font-bold mt-2 hover:underline">
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          EDIT TABLE MODAL
      ══════════════════════════════════════ */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingTable(null)} />
          <div className="relative w-full max-w-md bg-[var(--kravy-surface)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--kravy-border)] flex items-center justify-between bg-[var(--kravy-bg)]/40">
              <div className="flex items-center gap-2">
                <Edit size={16} className="text-[var(--kravy-brand)]" />
                <span className="text-sm font-black text-[var(--kravy-text-primary)]">Edit Table</span>
              </div>
              <button onClick={() => setEditingTable(null)} className="text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Table Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Floor</label>
                <select
                  value={editFloor || (availableFloors[0] || "Floor 1")}
                  onChange={(e) => setEditFloor(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)] transition-all"
                >
                  {availableFloors.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingTable(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] font-black text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={updateTable}
                  className="flex-1 py-3.5 rounded-2xl bg-[var(--kravy-brand)] text-white font-black text-sm shadow-lg shadow-indigo-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════════════ */}
      {deleteConfirmId && (() => {
        const table = tables.find((t) => t.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            {/* Sheet */}
            <div className="relative w-full sm:max-w-sm bg-[var(--kravy-surface)]
              rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden
              animate-in slide-in-from-bottom-4 duration-300">

              {/* Mobile handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--kravy-border)]" />
              </div>

              <div className="p-6 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-100
                  flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={26} className="text-rose-500" />
                </div>

                <h3 className="text-xl font-black text-[var(--kravy-text-primary)] mb-2">
                  Delete Table?
                </h3>
                <p className="text-sm text-[var(--kravy-text-muted)] font-medium leading-relaxed mb-5">
                  Table <span className="font-black text-[var(--kravy-text-primary)]">"{table?.name}"</span> aur uska QR code permanently delete ho jaayega.
                  Yeh action undo nahi ho sakti.
                </p>

                {/* Table preview chip */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--kravy-bg)]
                  border border-[var(--kravy-border)] rounded-xl mb-6">
                  <QrCode size={14} className="text-[var(--kravy-text-muted)]" />
                  <span className="font-black text-sm text-[var(--kravy-text-primary)]">{table?.name}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => deleteTable(deleteConfirmId)}
                    className="w-full py-3.5 rounded-2xl
                      bg-gradient-to-r from-rose-600 to-rose-500
                      text-white font-black text-sm
                      shadow-lg shadow-rose-500/30
                      hover:-translate-y-0.5 hover:shadow-rose-500/40
                      active:scale-[0.98] transition-all
                      flex items-center justify-center gap-2"
                  >
                    <Trash2 size={15} /> Haan, Delete Karo
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="w-full py-3.5 rounded-2xl bg-[var(--kravy-bg)]
                      border border-[var(--kravy-border)]
                      text-[var(--kravy-text-secondary)] font-black text-sm
                      hover:bg-[var(--kravy-surface-hover)] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR MENU TEMPLATE MODAL */}
      {showQRTemplate && qrContext && (
        <QRMenuTemplate 
            isOpen={showQRTemplate}
            onClose={() => setShowQRTemplate(false)}
            businessName={(user as any)?.businessName || user?.name || "Kravy POS"}
            tableId={qrContext.tableId}
            tableName={qrContext.tableName}
            qrUrl={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generateTableUrl(qrContext.tableId, qrContext.tableName))}`}
        />
      )}

      {/* ══════════════════════════════════════
          FLOOR MANAGER MODAL
      ══════════════════════════════════════ */}
      {typeof document !== "undefined" && isFloorManagerOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--kravy-surface)] rounded-3xl w-full max-w-md shadow-2xl border border-[var(--kravy-border)] overflow-hidden"
          >
            <div className="p-5 border-b border-[var(--kravy-border)] bg-[var(--kravy-bg)]/40 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[var(--kravy-text-primary)] uppercase tracking-wider text-sm flex items-center gap-2">
                  <Settings size={16} className="text-[var(--kravy-brand)]" />
                  Manage Restaurant Floors
                </h3>
                <p className="text-[11px] text-[var(--kravy-text-muted)] font-medium mt-0.5">
                  Organize tables by floor (e.g. Floor 1, Ground Floor, Rooftop)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setJsonModalData({
                        title: "Floors List (JSON)",
                        json: {
                          totalFloors: availableFloors.length,
                          floors: availableFloors,
                          floorDetails: availableFloors.map(floor => ({
                            floor,
                            tablesCount: tables.filter(t => (t.floor || "Floor 1").toUpperCase() === floor.toUpperCase()).length,
                            tables: tables
                              .filter(t => (t.floor || "Floor 1").toUpperCase() === floor.toUpperCase())
                              .map(t => ({ id: t.id, name: t.name, floor: t.floor || "Floor 1", zone: t.zone }))
                          }))
                        }
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-black transition-colors"
                    title="Export Floors JSON"
                  >
                    <Code2 size={13} /> Floor JSON
                  </button>
                )}
                <button 
                  onClick={() => setIsFloorManagerOpen(false)}
                  className="p-2 text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] rounded-xl hover:bg-[var(--kravy-bg)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Floor Name (e.g. 2nd Floor, Garden)..."
                  value={newFloorName}
                  onChange={e => setNewFloorName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newFloorName.trim() && !isFloorLoading) {
                      setIsFloorLoading(true);
                      try {
                        const res = await fetch("/api/floors", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "add", floorName: newFloorName.trim() })
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success(`Floor "${newFloorName.trim()}" added!`);
                          setNewFloorName("");
                          fetchTables();
                        } else {
                          toast.error(data.error || "Failed to add floor");
                        }
                      } catch (err: any) {
                        toast.error(err.message);
                      }
                      setIsFloorLoading(false);
                    }
                  }}
                  className="flex-1 h-10 px-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)]"
                />
                <button 
                  disabled={isFloorLoading || !newFloorName.trim()}
                  onClick={async () => {
                    if (!newFloorName.trim()) return;
                    setIsFloorLoading(true);
                    try {
                      const res = await fetch("/api/floors", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "add", floorName: newFloorName.trim() })
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast.success(`Floor "${newFloorName.trim()}" added!`);
                        setNewFloorName("");
                        fetchTables();
                      } else {
                        toast.error(data.error || "Failed to add floor");
                      }
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                    setIsFloorLoading(false);
                  }}
                  className="h-10 px-4 bg-[var(--kravy-brand)] text-white font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 disabled:opacity-50 transition-colors shadow-lg shadow-[var(--kravy-brand)]/20"
                >
                  {isFloorLoading ? "..." : "Add Floor"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 border border-[var(--kravy-border)] rounded-xl p-2 bg-[var(--kravy-bg)]">
                {availableFloors.length === 0 ? (
                  <div className="text-center text-xs font-bold text-[var(--kravy-text-muted)] py-4 uppercase tracking-wider">No floors defined</div>
                ) : (
                  availableFloors.map(floor => (
                    <div key={floor} className="flex items-center justify-between p-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl group">
                      {editingFloor?.old === floor ? (
                        <input 
                          autoFocus
                          value={editingFloor.new}
                          onChange={e => setEditingFloor({ ...editingFloor, new: e.target.value })}
                          className="flex-1 h-8 px-2 bg-[var(--kravy-bg)] border border-[var(--kravy-brand)]/50 rounded-lg text-xs font-bold text-[var(--kravy-text-primary)] outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-[var(--kravy-brand)]" />
                          <span className="text-xs font-black text-[var(--kravy-text-primary)] uppercase tracking-wider">{floor}</span>
                          <span className="text-[10px] font-bold text-[var(--kravy-text-muted)]">
                            ({tables.filter(t => (t.floor || "Floor 1").toUpperCase() === floor.toUpperCase()).length} tables)
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {editingFloor?.old === floor ? (
                          <>
                            <button 
                              disabled={isFloorLoading || !editingFloor.new.trim()}
                              onClick={async () => {
                                if (!editingFloor.new.trim() || editingFloor.old === editingFloor.new) {
                                  setEditingFloor(null);
                                  return;
                                }
                                setIsFloorLoading(true);
                                try {
                                  const res = await fetch("/api/floors", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "edit", oldFloor: editingFloor.old, newFloor: editingFloor.new.trim() })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success("Floor renamed!");
                                    setEditingFloor(null);
                                    fetchTables();
                                  } else {
                                    toast.error(data.error || "Failed to update floor");
                                  }
                                } catch (err: any) {
                                  toast.error(err.message);
                                }
                                setIsFloorLoading(false);
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 text-[10px] font-black uppercase transition-colors"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingFloor(null)}
                              className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => setEditingFloor({ old: floor, new: floor })}
                              className="p-1.5 text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-brand)]/10 hover:text-[var(--kravy-brand)] rounded-lg transition-colors"
                              title="Edit floor name"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (!await confirm(`Delete floor "${floor}"? Tables on this floor won't be deleted.`)) return;
                                setIsFloorLoading(true);
                                try {
                                  const res = await fetch("/api/floors", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "delete", floorName: floor })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success("Floor deleted");
                                    fetchTables();
                                  } else {
                                    toast.error(data.error || "Failed to delete floor");
                                  }
                                } catch (err: any) {
                                  toast.error(err.message);
                                }
                                setIsFloorLoading(false);
                              }}
                              className="p-1.5 text-[var(--kravy-text-muted)] hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-colors"
                              title="Delete floor"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    
      {/* ══════════════════════════════════════
          ADMIN JSON PREVIEW & COPY MODAL
      ══════════════════════════════════════ */}
      {jsonModalData && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--kravy-border)] flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Code2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">{jsonModalData.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Admin Data Inspector &amp; JSON Exporter</p>
                </div>
              </div>
              <button
                onClick={() => setJsonModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content / JSON Viewer */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-emerald-400 select-all">
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(jsonModalData.json, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--kravy-border)] bg-[var(--kravy-bg)] flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--kravy-text-muted)] font-medium">
                {Array.isArray(jsonModalData.json) ? `${jsonModalData.json.length} items` : "1 object"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonModalData.json, null, 2));
                    setJsonCopied(true);
                    toast.success("JSON copied to clipboard!");
                    setTimeout(() => setJsonCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all"
                >
                  {jsonCopied ? <Check size={14} /> : <Copy size={14} />}
                  {jsonCopied ? "Copied!" : "Copy JSON"}
                </button>
                <button
                  onClick={() => setJsonModalData(null)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] font-black text-xs hover:bg-[var(--kravy-border)]/50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
}
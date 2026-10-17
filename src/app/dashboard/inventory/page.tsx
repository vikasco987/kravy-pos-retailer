"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Search, Plus, Filter, ChevronDown, Download, Eye, Edit, Trash2, FileText, X, AlertTriangle, Save, Sparkles, TrendingUp, Layers, ArrowUpDown, CheckCircle2, XCircle, BadgePercent, BarChart3, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { useSearch } from "@/components/SearchContext";
import Link from "next/link";
import { useConfirm } from "@/components/ConfirmContext";
import { printBarcodeLabel } from "@/components/printing/BarcodeLabelPrint";
import BarcodePrintModal from "./BarcodePrintModal";
import { useTerminalContext } from "@/components/TerminalContext";
import { useProfileCache } from "@/hooks/useProfileCache";

type InventoryItem = {
  id: string;
  name: string;
  category: { name: string } | null;
  categoryId: string | null;
  currentStock: number;
  reorderLevel: number;
  openingStock: number;
  unit: string;
  price: number;
  sellingPrice: number;
  barcode?: string;
  inventoryCode?: string | null;
  taxStatus?: string;
  gst?: number;
  hsnCode?: string;
  zones: string[];
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
};

export default function InventoryPage() {
  const { currencySymbol: sym } = useCurrency();
  const { emitUpdate, lastUpdated } = useTerminalContext();

  const { confirm } = useConfirm();
  const { query: globalQuery } = useSearch();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [sortBy, setSortBy] = useState<"name" | "stock-low" | "stock-high" | "price-low" | "price-high">("name");
  const [filterMode, setFilterMode] = useState<"all" | "critical">("all");
  const [activeTab, setActiveTab] = useState<"finished" | "raw">("finished");
  const [isStockEditMode, setIsStockEditMode] = useState(false);

  // Filter inline dropdowns
  const [openFilterDropdown, setOpenFilterDropdown] = useState<"category" | "status" | "sort" | null>(null);

  // Modal inline dropdowns
  const [modalCategoryOpen, setModalCategoryOpen] = useState(false);
  const [modalUnitOpen, setModalUnitOpen] = useState(false);
  
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isRawSaving, setIsRawSaving] = useState(false);
  const [editingRaw, setEditingRaw] = useState<RawMaterial | null>(null);
  const [rawFormData, setRawFormData] = useState({
    name: "", unit: "kg", stock: 0, minStock: 0, price: 0
  });

  // Recipe Modal State
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState<InventoryItem | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<any[]>([]);
  const [isRecipeSaving, setIsRecipeSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    currentStock: 0,
    reorderLevel: 0,
    openingStock: 0,
    unit: "pcs",
    price: 0,
    sellingPrice: 0,
    barcode: "",
    taxStatus: "Without Tax",
    gst: null as number | null,
    hsnCode: "",
    zones: [] as string[],
  });

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const { profile } = useProfileCache();

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchRawMaterials();

    const handleKravySearch = (e: any) => {
      setSearchTerm(e.detail || "");
    };
    window.addEventListener("kravy-search", handleKravySearch);
    return () => window.removeEventListener("kravy-search", handleKravySearch);
  }, []);

  useEffect(() => {
    if (lastUpdated) {
      fetchInventory();
      fetchRawMaterials();
    }
  }, [lastUpdated]);

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch("/api/inventory/materials");
      if (res.ok) {
        const data = await res.json();
        setRawMaterials(data);
      }
    } catch (err) {
      console.error("Fetch raw materials error:", err);
    }
  };

  useEffect(() => {
    if (profile) {
      setTaxEnabled(profile.taxEnabled ?? true);
    }
  }, [profile]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Fetch inventory error:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (id: string, newStock: number, isRaw: boolean = false) => {
    try {
      if (isRaw) {
        setRawMaterials(prev => prev.map(m => m.id === id ? { ...m, stock: newStock } : m));
        await fetch('/api/inventory/materials', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, stock: newStock })
        });
        emitUpdate();
      } else {
        setItems(prev => prev.map(m => m.id === id ? { ...m, currentStock: newStock } : m));
        await fetch('/api/items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, currentStock: newStock })
        });
        emitUpdate();
      }
    } catch (err) {
      console.error("Stock inline update failed:", err);
      toast.error("Failed to update stock");
      // Re-fetch to revert to actual server state on error
      if (isRaw) fetchRawMaterials();
      else fetchInventory();
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, type: 'finished' | 'raw') => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-index="${index + 1}"][data-type="${type}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`input[data-index="${index - 1}"][data-type="${type}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      categoryId: item.categoryId || "",
      currentStock: item.currentStock || 0,
      reorderLevel: item.reorderLevel || 0,
      openingStock: item.openingStock || 0,
      unit: item.unit || "pcs",
      price: item.price || 0,
      sellingPrice: item.sellingPrice || 0,
      barcode: item.barcode || "",
      taxStatus: item.taxStatus || "Without Tax",
      gst: item.gst ?? null,
      hsnCode: item.hsnCode || "",
      zones: item.zones || [],
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = "/api/items"; 
      
      const payload = editingItem 
        ? { id: editingItem.id, ...formData }
        : { ...formData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingItem ? "Updated successfully" : "Added successfully");
        setIsModalOpen(false);
        setEditingItem(null);
        fetchInventory();
        emitUpdate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Save failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/items?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted successfully");
        fetchInventory();
        emitUpdate();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const getStatus = (item: InventoryItem) => {
    if (item.currentStock <= 0) return "out-of-stock";
    if (item.currentStock <= item.reorderLevel) return "low-stock";
    return "in-stock";
  };

  const filteredItems = items
    .filter(item => {
      const activeQuery = searchTerm || globalQuery;
      const matchesSearch = item.name.toLowerCase().includes(activeQuery.toLowerCase()) || 
                           item.barcode?.toLowerCase().includes(activeQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
      
      const status = getStatus(item);
      const matchesStatus = filterStatus === "all" || status === filterStatus;
      const matchesCritical = filterMode === "all" || item.currentStock <= item.reorderLevel;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesCritical;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "stock-low") return a.currentStock - b.currentStock;
      if (sortBy === "stock-high") return b.currentStock - a.currentStock;
      if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const stats = [
    { label: "Total Assets", val: items.length, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", mode: "all" },
    { label: "Critical Stock", val: items.filter(i => i.currentStock <= i.reorderLevel).length, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10", mode: "critical" },
    { label: "Categories", val: categories.length, icon: Layers, color: "text-amber-500", bg: "bg-amber-500/10", mode: "all" },
    { label: "Live Value", val: `${sym}${Math.round(items.reduce((acc, i) => acc + (i.currentStock * i.price), 0))}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", mode: "all" },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      {/* Header Hub */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight flex items-center gap-2">
            <Sparkles className="text-[var(--kravy-brand)] shrink-0" size={22} />
            <span className="truncate">Inventory Hub</span>
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider opacity-70 mt-0.5">
            Real-time Asset Monitoring & Stock Control
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-1 rounded-xl flex gap-1 shadow-sm shrink-0">
            <button 
              onClick={async () => setActiveTab("finished")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'finished' ? 'bg-[var(--kravy-brand)] text-white shadow-md shadow-[var(--kravy-brand)]/20' : 'text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg)]'}`}
            >
              Finished Products
            </button>
            <button 
              onClick={async () => setActiveTab("raw")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'raw' ? 'bg-[var(--kravy-brand)] text-white shadow-md shadow-[var(--kravy-brand)]/20' : 'text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg)]'}`}
            >
              Raw Ingredients
            </button>
          </div>
          <Link 
            href="/dashboard/inventory/reports"
            className="h-9 sm:h-10 px-3 sm:px-4 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:border-[var(--kravy-brand)] transition-all whitespace-nowrap shrink-0"
          >
            <BarChart3 size={15} className="shrink-0" /> REPORT
          </Link>
          <button 
            onClick={() => setIsStockEditMode(!isStockEditMode)}
            className={`h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm whitespace-nowrap shrink-0 ${isStockEditMode ? 'bg-orange-500 text-white shadow-orange-500/20 border border-orange-500' : 'bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] hover:border-orange-500 hover:text-orange-500'}`}
          >
            <Edit size={15} className="shrink-0" strokeWidth={isStockEditMode ? 3 : 2} /> {isStockEditMode ? 'Finish Editing' : 'Edit Stock'}
          </button>
          <button 
            onClick={() => setIsBarcodeModalOpen(true)}
            className="h-9 sm:h-10 px-3 sm:px-4 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:border-[var(--kravy-brand)] transition-all whitespace-nowrap shrink-0"
          >
            <Printer size={15} className="shrink-0" /> PRINT BARCODES
          </button>
          <button 
            onClick={async () => {
              if (activeTab === 'finished') {
                setEditingItem(null);
                setFormData({
                  name: "", categoryId: "", currentStock: 0, reorderLevel: 0, openingStock: 0, unit: "pcs", price: 0, sellingPrice: 0, barcode: "", taxStatus: "Without Tax", gst: null, hsnCode: "", zones: []
                });
                setIsModalOpen(true);
              } else {
                setEditingRaw(null);
                setRawFormData({ name: "", unit: "kg", stock: 0, minStock: 0, price: 0 });
                setIsRawModalOpen(true);
              }
            }}
            className="h-9 sm:h-10 px-4 sm:px-5 bg-[var(--kravy-brand)] text-white rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 hover:shadow-lg hover:shadow-[var(--kravy-brand)]/20 transition-all active:scale-95 shadow-md shadow-[var(--kravy-brand)]/10 whitespace-nowrap shrink-0"
          >
            <Plus size={15} strokeWidth={3} className="shrink-0" /> {activeTab === 'finished' ? 'New Product' : 'New Material'}
          </button>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="flex lg:grid lg:grid-cols-4 gap-2.5 sm:gap-3 px-1 overflow-x-auto no-scrollbar py-1 snap-x">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={async () => setFilterMode(stat.mode as any)}
            className={`cursor-pointer bg-[var(--kravy-surface)] border rounded-2xl p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 transition-all duration-300 min-w-[200px] sm:min-w-[220px] lg:min-w-0 flex-1 snap-start ${filterMode === stat.mode && stat.mode === "critical" ? "border-rose-500 ring-2 ring-rose-500/10 shadow-rose-500/5" : "border-[var(--kravy-border)] hover:border-[var(--kravy-brand)]/30"}`}
          >
            <div className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
              <stat.icon size={16} />
            </div>
            <div className="truncate">
              <div className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)] leading-tight truncate">{stat.val}</div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--kravy-text-muted)] opacity-60">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Smart Filters */}
      <div className="flex flex-wrap gap-2.5 items-center px-1">
        <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)] group-focus-within:text-[var(--kravy-brand)] transition-colors">
            <Search size={14} />
          </div>
          <input
            type="text"
            placeholder="Search assets or barcodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-xs font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)] focus:ring-4 focus:ring-[var(--kravy-brand)]/5 transition-all h-9 sm:h-10 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Category Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilterDropdown(openFilterDropdown === "category" ? null : "category")}
              className="flex items-center justify-between gap-2 px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-primary)] cursor-pointer outline-none h-9 sm:h-10 hover:border-[var(--kravy-brand)] transition-all shadow-sm whitespace-nowrap"
            >
              <span className="truncate max-w-[120px] sm:max-w-[150px]">
                {selectedCategory === "all" ? "Categories: ALL" : categories.find(c => c.id === selectedCategory)?.name || "Categories"}
              </span>
              <Filter className={`text-[var(--kravy-text-muted)] shrink-0 transition-transform ${openFilterDropdown === "category" ? "scale-110 text-[var(--kravy-brand)]" : ""}`} size={12} />
            </button>

            {openFilterDropdown === "category" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenFilterDropdown(null)} />
                <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[200px] max-w-[280px] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory("all"); setOpenFilterDropdown(null); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${selectedCategory === "all" ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                  >
                    Categories: ALL
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.id); setOpenFilterDropdown(null); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors truncate ${selectedCategory === cat.id ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilterDropdown(openFilterDropdown === "status" ? null : "status")}
              className="flex items-center justify-between gap-2 px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-primary)] cursor-pointer outline-none h-9 sm:h-10 hover:border-[var(--kravy-brand)] transition-all shadow-sm whitespace-nowrap"
            >
              <span>
                {filterStatus === "all" ? "Condition: ALL" : filterStatus === "in-stock" ? "IN STOCK" : filterStatus === "low-stock" ? "LOW STOCK" : "OUT OF STOCK"}
              </span>
              <CheckCircle2 className={`text-[var(--kravy-text-muted)] shrink-0 transition-transform ${openFilterDropdown === "status" ? "scale-110 text-[var(--kravy-brand)]" : ""}`} size={12} />
            </button>

            {openFilterDropdown === "status" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenFilterDropdown(null)} />
                <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[170px] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { value: "all", label: "Condition: ALL" },
                    { value: "in-stock", label: "IN STOCK" },
                    { value: "low-stock", label: "LOW STOCK" },
                    { value: "out-of-stock", label: "OUT OF STOCK" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setFilterStatus(opt.value as any); setOpenFilterDropdown(null); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${filterStatus === opt.value ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenFilterDropdown(openFilterDropdown === "sort" ? null : "sort")}
              className="flex items-center justify-between gap-2 px-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-primary)] cursor-pointer outline-none h-9 sm:h-10 hover:border-[var(--kravy-brand)] transition-all shadow-sm whitespace-nowrap"
            >
              <span>
                {sortBy === "name" ? "Sort: NAME (A-Z)" : sortBy === "stock-low" ? "Sort: STOCK ↑" : sortBy === "stock-high" ? "Sort: STOCK ↓" : sortBy === "price-low" ? "Sort: PRICE ↑" : "Sort: PRICE ↓"}
              </span>
              <ArrowUpDown className={`text-[var(--kravy-text-muted)] shrink-0 transition-transform ${openFilterDropdown === "sort" ? "scale-110 text-[var(--kravy-brand)]" : ""}`} size={12} />
            </button>

            {openFilterDropdown === "sort" && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenFilterDropdown(null)} />
                <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 min-w-[210px] bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-2xl p-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { value: "name", label: "Sort: NAME (A-Z)" },
                    { value: "stock-low", label: "Sort: STOCK (LOW→HIGH)" },
                    { value: "stock-high", label: "Sort: STOCK (HIGH→LOW)" },
                    { value: "price-low", label: "Sort: PRICE (LOW→HIGH)" },
                    { value: "price-high", label: "Sort: PRICE (HIGH→LOW)" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSortBy(opt.value as any); setOpenFilterDropdown(null); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${sortBy === opt.value ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reset Filters */}
          {(searchTerm || selectedCategory !== "all" || filterStatus !== "all" || sortBy !== "name" || filterMode !== "all") && (
            <button
              onClick={async () => {
                setSearchTerm("");
                setSelectedCategory("all");
                setFilterStatus("all");
                setSortBy("name");
                setFilterMode("all");
              }}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-rose-500/5 text-rose-500 border border-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-rose-500/10 transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              <XCircle size={12} className="shrink-0" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Dense Modern Table */}
      <motion.div 
        layout
        className="flex-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg shadow-black/5 flex flex-col mb-4"
      >
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--kravy-navbar-bg)] backdrop-blur-xl border-b border-[var(--kravy-border)]">
              <tr className="bg-gradient-to-r from-[var(--kravy-brand)]/[0.03] to-transparent">
                <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[200px]">{activeTab === 'finished' ? 'Inventory Item' : 'Raw Material'}</th>
                {activeTab === 'finished' && <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[150px]">Inventory ID</th>}
                <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[130px]">{activeTab === 'finished' ? 'Category' : 'Stock Unit'}</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[160px]">Stock Status</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[110px]">Critical Floor</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[120px]">Valuation</th>
                <th className="px-5 py-4 text-center text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] whitespace-nowrap min-w-[160px]">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kravy-border)]/50">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={activeTab === 'finished' ? 7 : 6} className="h-14 px-5 bg-[var(--kravy-bg)]/30"></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'finished' ? 7 : 6} className="py-20 text-center">
                    <Package className="mx-auto text-[var(--kravy-text-faint)] mb-4 opacity-20" size={48} />
                    <div className="text-sm font-bold text-[var(--kravy-text-muted)]">No inventory records found</div>
                    <div className="text-[10px] uppercase tracking-widest text-[var(--kravy-text-faint)] mt-1">Try adjusting your filters</div>
                  </td>
                </tr>
              ) : activeTab === 'finished' ? (
                filteredItems.map((item, index) => {
                  const status = getStatus(item);
                  return (
                    <motion.tr 
                      layout
                      key={item.id} 
                      className="group hover:bg-[var(--kravy-brand)]/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${status === 'out-of-stock' ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)]'}`}>
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[var(--kravy-text-primary)] leading-tight">{item.name}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                               <div className="text-[10px] font-bold text-[var(--kravy-text-faint)]">Unit: {item.unit}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.inventoryCode ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg font-black text-xs font-mono border border-indigo-500/20 whitespace-nowrap tracking-wide">{item.inventoryCode}</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--kravy-text-faint)] italic">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-3 py-1.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-secondary)]">
                          {item.category?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {isStockEditMode ? (
                            <input
                              type="number"
                              defaultValue={item.currentStock ?? 0}
                              data-index={index}
                              data-type="finished"
                              onWheel={(e) => e.currentTarget.blur()}
                              onKeyDown={(e) => handleInlineKeyDown(e, index, 'finished')}
                              onBlur={(e) => {
                                 const val = parseFloat(e.target.value);
                                 if (!isNaN(val) && val !== (item.currentStock ?? 0)) {
                                   handleStockUpdate(item.id, val, false);
                                 }
                              }}
                              className="w-20 bg-[var(--kravy-surface)] border border-orange-500/50 rounded-md px-2 py-1 text-sm font-black text-orange-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <div className="w-20 px-2 py-1 text-sm font-black text-[var(--kravy-text-primary)] cursor-pointer" onClick={() => setIsStockEditMode(true)}>
                              {item.currentStock ?? 0}
                            </div>
                          )}
                          <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                            status === 'out-of-stock' ? 'bg-rose-500/10 text-rose-600' : 
                            status === 'low-stock' ? 'bg-amber-500/10 text-amber-600' : 
                            'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {status.replace('-', ' ')}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-[var(--kravy-text-muted)]">{item.reorderLevel}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <div className="text-sm font-black text-[var(--kravy-text-primary)]">{sym}{item.sellingPrice}</div>
                          <div className="text-[10px] font-bold text-[var(--kravy-text-faint)]">Cost: {sym}{item.price}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          <button 
                            onClick={async () => {
                              setSelectedItemForRecipe(item);
                              setIsRecipeModalOpen(true);
                              // Fetch recipe
                              const res = await fetch(`/api/inventory/recipes?itemId=${item.id}`);
                              if (res.ok) {
                                const data = await res.json();
                                setCurrentRecipe(data.map((r: any) => ({
                                  materialId: r.materialId,
                                  quantity: r.quantity,
                                  name: r.material.name
                                })));
                              }
                            }}
                            className="h-8 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1"
                          >
                            <FileText size={12} /> Recipe
                          </button>
                          <button 
                            onClick={async () => handleEdit(item)}
                            className="w-8 h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)] hover:border-[var(--kravy-brand)]/50 transition-all flex items-center justify-center"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => printBarcodeLabel(item, profile)}
                            className="w-8 h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-blue-500 hover:border-blue-500/50 transition-all flex items-center justify-center"
                            title="Print Barcode Label"
                          >
                            <Printer size={14} />
                          </button>
                          <button 
                            onClick={async () => handleDelete(item.id)}
                            className="w-8 h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-rose-500 hover:border-rose-500/50 transition-all flex items-center justify-center"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                rawMaterials
                  .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((mat, index) => {
                    const isLow = mat.stock <= mat.minStock;
                    return (
                      <motion.tr 
                        layout
                        key={mat.id} 
                        className="group hover:bg-orange-500/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black text-xs">
                              {mat.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[var(--kravy-text-primary)] leading-tight">{mat.name}</div>
                              <div className="text-[10px] font-bold text-[var(--kravy-text-faint)] mt-1 uppercase">ID: {mat.id.slice(-6)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60">
                            {mat.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {isStockEditMode ? (
                              <input
                                type="number"
                                defaultValue={mat.stock}
                                data-index={index}
                                data-type="raw"
                                onWheel={(e) => e.currentTarget.blur()}
                                onKeyDown={(e) => handleInlineKeyDown(e, index, 'raw')}
                                onBlur={(e) => {
                                   const val = parseFloat(e.target.value);
                                   if (!isNaN(val) && val !== mat.stock) {
                                     handleStockUpdate(mat.id, val, true);
                                   }
                                }}
                                className="w-20 bg-[var(--kravy-surface)] border border-orange-500/50 rounded-md px-2 py-1 text-sm font-black text-orange-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            ) : (
                              <div className="w-20 px-2 py-1 text-sm font-black text-[var(--kravy-text-primary)] cursor-pointer" onClick={() => setIsStockEditMode(true)}>
                                {mat.stock}
                              </div>
                            )}
                            <span className="text-xs font-bold text-[var(--kravy-text-muted)]">{mat.unit}</span>
                            {isLow && (
                              <div className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter bg-rose-500/10 text-rose-600">
                                LOW STOCK
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-bold text-[var(--kravy-text-muted)]">{mat.minStock} {mat.unit}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-black text-[var(--kravy-text-primary)]">{sym}{mat.price}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            <button 
                              onClick={async () => {
                                setEditingRaw(mat);
                                setRawFormData({
                                  name: mat.name,
                                  unit: mat.unit,
                                  stock: mat.stock,
                                  minStock: mat.minStock,
                                  price: mat.price
                                });
                                setIsRawModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-orange-500 hover:border-orange-500/50 transition-all flex items-center justify-center"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if(!await confirm("Delete this material?")) return;
                                const res = await fetch(`/api/inventory/materials?id=${mat.id}`, { method: 'DELETE' });
                                if(res.ok) {
                                  toast.success("Deleted");
                                  fetchRawMaterials();
                                  emitUpdate();
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-rose-500 hover:border-rose-500/50 transition-all flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Inventory Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={async () => { setIsModalOpen(false); setModalCategoryOpen(false); setModalUnitOpen(false); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] w-full max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--kravy-border)] flex justify-between items-center bg-gradient-to-r from-[var(--kravy-brand)]/[0.05] to-transparent shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--kravy-brand)] flex items-center justify-center text-white shadow-lg shadow-[var(--kravy-brand)]/20">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[var(--kravy-text-primary)]">{editingItem ? 'Edit Asset Record' : 'Create New Asset'}</h2>
                    <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-widest leading-none mt-1">Classification & Stock Levels</p>
                  </div>
                </div>
                <button onClick={async () => { setIsModalOpen(false); setModalCategoryOpen(false); setModalUnitOpen(false); }} className="w-8 h-8 rounded-xl hover:bg-[var(--kravy-bg)] flex items-center justify-center text-[var(--kravy-text-muted)] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form id="asset-form" onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Item Primary Name</label>
                    <input
                      required
                      className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                      placeholder="e.g. Basmati Rice 25kg"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Classification</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setModalCategoryOpen(!modalCategoryOpen); setModalUnitOpen(false); }}
                        className="w-full flex items-center justify-between bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] outline-none hover:border-[var(--kravy-brand)] focus:border-[var(--kravy-brand)] transition-all text-left shadow-inner shadow-black/5"
                      >
                        <span className="truncate">
                          {categories.find(c => c.id === formData.categoryId)?.name || "No Category"}
                        </span>
                        <ChevronDown size={16} className={`text-[var(--kravy-text-muted)] shrink-0 transition-transform ${modalCategoryOpen ? "rotate-180" : ""}`} />
                      </button>

                      {modalCategoryOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setModalCategoryOpen(false)} />
                          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-2xl p-1.5 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => { setFormData({ ...formData, categoryId: "" }); setModalCategoryOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${formData.categoryId === "" ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                            >
                              No Category
                            </button>
                            {categories.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => { setFormData({ ...formData, categoryId: cat.id }); setModalCategoryOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors truncate ${formData.categoryId === cat.id ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                       <div className="space-y-1.5 relative">
                          <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Unit Type</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => { setModalUnitOpen(!modalUnitOpen); setModalCategoryOpen(false); }}
                              className="w-full flex items-center justify-between bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] outline-none hover:border-[var(--kravy-brand)] focus:border-[var(--kravy-brand)] transition-all text-left shadow-inner shadow-black/5"
                            >
                              <span className="truncate">
                                {formData.unit === "pcs" && "Pieces (pcs)"}
                                {formData.unit === "kg" && "Kilogram (kg)"}
                                {formData.unit === "ltr" && "Liter (ltr)"}
                                {formData.unit === "box" && "Box"}
                                {formData.unit === "pkt" && "Packet"}
                                {!["pcs","kg","ltr","box","pkt"].includes(formData.unit) && (formData.unit || "Pieces (pcs)")}
                              </span>
                              <ChevronDown size={16} className={`text-[var(--kravy-text-muted)] shrink-0 transition-transform ${modalUnitOpen ? "rotate-180" : ""}`} />
                            </button>

                            {modalUnitOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setModalUnitOpen(false)} />
                                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl shadow-2xl p-1.5 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                  {[
                                    { value: "pcs", label: "Pieces (pcs)" },
                                    { value: "kg", label: "Kilogram (kg)" },
                                    { value: "ltr", label: "Liter (ltr)" },
                                    { value: "box", label: "Box" },
                                    { value: "pkt", label: "Packet" }
                                  ].map(u => (
                                    <button
                                      key={u.value}
                                      type="button"
                                      onClick={() => { setFormData({ ...formData, unit: u.value }); setModalUnitOpen(false); }}
                                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${formData.unit === u.value ? "bg-[var(--kravy-brand)] text-white" : "text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"}`}
                                    >
                                      {u.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Barcode</label>
                          <input
                            type="text"
                            placeholder="Scan/Type"
                            className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                            value={formData.barcode}
                            onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Live Stock</label>
                    <input
                      type="number"
                      className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({...formData, currentStock: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Alert Floor</label>
                    <input
                      type="number"
                      className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({...formData, reorderLevel: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Purchase Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--kravy-text-faint)]">{sym}</span>
                      <input
                        type="number"
                        className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl pl-8 pr-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Selling Value</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--kravy-text-faint)]">{sym}</span>
                      <input
                        type="number"
                        className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl pl-8 pr-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] outline-none transition-all shadow-inner shadow-black/5"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({...formData, sellingPrice: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                </div>

                {/* Tax & GST Settings - Only if enabled globally */}
                {taxEnabled && (
                  <div className="space-y-4 pt-4 border-t border-[var(--kravy-border)]">
                    <div className="flex items-center gap-2 mb-2">
                       <BadgePercent size={14} className="text-indigo-600" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Tax Settings</h4>
                    </div>
                    
                    <div className="flex gap-2 p-1 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl">
                      {["Without Tax", "With Tax"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={async () => setFormData({ ...formData, taxStatus: status })}
                          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            formData.taxStatus === status
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]/50"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[0, 5, 12, 18, 28].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={async () => setFormData({ ...formData, gst: val })}
                          className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                            formData.gst === val
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-[var(--kravy-bg)] border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:border-indigo-600/50"
                          }`}
                        >
                          GST @ {val}%
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">HSN/SAC Code</label>
                      <input
                        type="text"
                        className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)] transition-all shadow-inner shadow-black/5"
                        placeholder="e.g. 9963"
                        value={formData.hsnCode}
                        onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                      />
                    </div>
                  </div>
                )}
                {/* Zone Settings */}
                <div className="space-y-4 pt-4 border-t border-[var(--kravy-border)]">
                  <div className="flex items-center gap-2 mb-2">
                     <Layers size={14} className="text-emerald-600" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Zone Visibility</h4>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest px-1">Active Zones (Comma separated)</label>
                    <input
                      type="text"
                      className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl px-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:border-[var(--kravy-brand)] transition-all shadow-inner shadow-black/5"
                      placeholder="e.g. Default, Rooftop, Poolside"
                      value={formData.zones.join(", ")}
                      onChange={(e) => setFormData({...formData, zones: e.target.value.split(",").map(z => z.trim()).filter(z => z !== "")})}
                    />
                    <p className="text-[9px] text-[var(--kravy-text-muted)] font-medium px-1">
                      Leave empty to show in all zones if Multi-Zone is disabled, or just "Default" for main menu.
                    </p>
                  </div>
                </div>
              </form>
              <div className="p-3 sm:p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] flex flex-row gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={async () => { setIsModalOpen(false); setModalCategoryOpen(false); setModalUnitOpen(false); }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--kravy-bg)] text-[var(--kravy-text-muted)] rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--kravy-border)]/20 transition-all border border-[var(--kravy-border)]"
                >
                  Discard Changes
                </button>
                <button
                  form="asset-form"
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--kravy-brand)] text-white rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-[var(--kravy-brand)]/20 transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-xl shadow-[var(--kravy-brand)]/10"
                >
                  {isSaving ? <Package className="animate-spin" size={16} /> : <Save size={16} className="group-hover:scale-110 transition-transform" />}
                  Confirm Transaction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Raw Material Modal */}
      <AnimatePresence>
        {isRawModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={async () => setIsRawModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative z-10 p-4 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h2 className="text-lg font-black mb-6 flex items-center gap-2">
                <Package className="text-orange-500" /> {editingRaw ? "Edit Material" : "New Raw Material"}
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Material Name</label>
                  <input className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" placeholder="e.g. Flour, Sugar" value={rawFormData.name} onChange={e => setRawFormData({...rawFormData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Unit (kg, ltr, pcs)</label>
                    <input className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={rawFormData.unit} onChange={e => setRawFormData({...rawFormData, unit: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Current Stock</label>
                    <input type="number" className="w-full bg-[var(--kravy-bg)] border border(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={rawFormData.stock} onChange={e => setRawFormData({...rawFormData, stock: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Reorder Level</label>
                    <input type="number" className="w-full bg-[var(--kravy-bg)] border border(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={rawFormData.minStock} onChange={e => setRawFormData({...rawFormData, minStock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Price per Unit</label>
                    <input type="number" className="w-full bg-[var(--kravy-bg)] border border(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={rawFormData.price} onChange={e => setRawFormData({...rawFormData, price: Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={async () => setIsRawModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-black uppercase">Cancel</button>
                <button disabled={isRawSaving} onClick={async () => {
                  setIsRawSaving(true);
                  try {
                    const res = await fetch("/api/inventory/materials", {
                      method: editingRaw ? 'PATCH' : 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editingRaw ? { ...rawFormData, id: editingRaw.id } : rawFormData)
                    });
                    if(res.ok) {
                      toast.success("Saved");
                      setIsRawModalOpen(false);
                      fetchRawMaterials();
                      emitUpdate();
                    } else {
                      toast.error("Failed to save material");
                    }
                  } catch (err) {
                    toast.error("Something went wrong");
                  } finally {
                    setIsRawSaving(false);
                  }
                }} className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase disabled:opacity-50 flex items-center justify-center gap-2">
                  {isRawSaving ? <Package className="animate-spin" size={16} /> : null}
                  {isRawSaving ? "Saving..." : "Save Material"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recipe Management Modal */}
      <AnimatePresence>
        {isRecipeModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={async () => setIsRecipeModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-[var(--kravy-border)] flex justify-between items-center bg-indigo-500/5">
                <div>
                  <h2 className="text-lg font-black text-indigo-600">Recipe: {selectedItemForRecipe?.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map raw materials to this item</p>
                </div>
                <button onClick={async () => setIsRecipeModalOpen(false)} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentRecipe.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                      <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-xs font-bold text-slate-400">No ingredients mapped yet</p>
                    </div>
                  ) : (
                    currentRecipe.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                        <div className="flex-1 font-bold text-sm">{item.name}</div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-24 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const newRecipe = [...currentRecipe];
                              newRecipe[idx].quantity = Number(e.target.value);
                              setCurrentRecipe(newRecipe);
                            }}
                          />
                          <span className="text-[10px] font-black text-slate-400 uppercase">{rawMaterials.find(m => m.id === item.materialId)?.unit}</span>
                        </div>
                        <button 
                          onClick={async () => setCurrentRecipe(currentRecipe.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Add Ingredient</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      onChange={(e) => {
                        const matId = e.target.value;
                        if (!matId) return;
                        if (currentRecipe.some(r => r.materialId === matId)) return toast.error("Already added");
                        const mat = rawMaterials.find(m => m.id === matId);
                        if (mat) {
                          setCurrentRecipe([...currentRecipe, { materialId: matId, quantity: 1, name: mat.name }]);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Select a material...</option>
                      {rawMaterials.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={async () => setIsRecipeModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest"
                  >
                    Discard
                  </button>
                  <button 
                    disabled={isRecipeSaving}
                    onClick={async () => {
                      setIsRecipeSaving(true);
                      try {
                        const res = await fetch("/api/inventory/recipes", {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: selectedItemForRecipe?.id, materials: currentRecipe })
                        });
                        if (res.ok) {
                          toast.success("Recipe saved successfully!");
                          setIsRecipeModalOpen(false);
                          emitUpdate();
                        }
                      } finally {
                        setIsRecipeSaving(false);
                      }
                    }}
                    className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                  >
                    {isRecipeSaving ? "Saving..." : "Save Recipe Configuration"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>




      {/* Barcode Print Modal */}
      <BarcodePrintModal 
        isOpen={isBarcodeModalOpen} 
        onClose={() => setIsBarcodeModalOpen(false)} 
        items={filteredItems} 
      />
    </div>
  );
}

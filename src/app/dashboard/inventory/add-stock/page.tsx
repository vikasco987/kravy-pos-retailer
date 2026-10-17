"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, X, ChevronRight, LayoutGrid, CheckCircle2,
  Save, Plus, Minus, AlertTriangle, Package, TrendingUp, RefreshCw, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Item = {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  categoryId: string | null;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  price: number;
};

type Category = {
  id: string;
  name: string;
};

export default function InventoryAddStockPage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  // Draft state for inline edits
  const [draftItems, setDraftItems] = useState<Record<string, { addStock: number; reorderLevel: number }>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Detailed item panel
  const [detailedItem, setDetailedItem] = useState<Item | null>(null);

  // AbortController ref for race condition & stale request handling
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input for instant typing responsiveness
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch('/api/inventory', { signal: controller.signal }),
        fetch('/api/categories', { signal: controller.signal })
      ]);

      if (!itemsRes.ok || !catRes.ok) {
        throw new Error("Failed to load inventory data");
      }

      const itemsData = await itemsRes.json();
      const catData = await catRes.json();

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      const matchSearch = !query || item.name.toLowerCase().includes(query);
      const matchCat = catFilter === "ALL" || item.category?.id === catFilter || item.categoryId === catFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, catFilter]);

  const getStatus = useCallback((item: Item) => {
    if (item.currentStock <= 0) return "out";
    if (item.currentStock <= item.reorderLevel) return "low";
    return "ok";
  }, []);

  // Pre-calculate critical count
  const criticalCount = useMemo(() => {
    return filteredItems.filter(i => getStatus(i) !== 'ok').length;
  }, [filteredItems, getStatus]);

  const handleDraftChange = useCallback((itemId: string, field: 'addStock' | 'reorderLevel', value: number) => {
    setDraftItems(prev => {
      const item = items.find(i => i.id === itemId);
      const existing = prev[itemId] || {
        addStock: 0,
        reorderLevel: item?.reorderLevel ?? 0,
      };
      return {
        ...prev,
        [itemId]: { ...existing, [field]: value }
      };
    });
  }, [items]);

  const dirtyCount = useMemo(() => {
    return Object.keys(draftItems).filter(id => {
      const d = draftItems[id];
      const item = items.find(i => i.id === id);
      return d.addStock !== 0 || d.reorderLevel !== (item?.reorderLevel ?? 0);
    }).length;
  }, [draftItems, items]);

  const updateSingleItem = async (itemId: string) => {
    if (savingRowId || isSavingAll) return;
    const draft = draftItems[itemId];
    if (!draft) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setSavingRowId(itemId);
    try {
      const newStock = item.currentStock + (draft.addStock || 0);
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          currentStock: newStock,
          reorderLevel: draft.reorderLevel
        })
      });

      if (!res.ok) throw new Error("Update failed");

      setItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        currentStock: newStock,
        reorderLevel: draft.reorderLevel
      } : i));

      if (detailedItem?.id === itemId) {
        setDetailedItem(prev => prev ? { ...prev, currentStock: newStock, reorderLevel: draft.reorderLevel } : null);
      }

      setDraftItems(prev => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });

      toast.success(`${item.name} updated ✅`);
    } catch {
      toast.error(`Failed to update ${item.name}`);
    } finally {
      setSavingRowId(null);
    }
  };

  const handleSaveAllChanges = async () => {
    if (isSavingAll || savingRowId) return;

    const dirtyIds = Object.keys(draftItems).filter(id => {
      const d = draftItems[id];
      const item = items.find(i => i.id === id);
      return d && (d.addStock !== 0 || d.reorderLevel !== (item?.reorderLevel ?? 0));
    });

    if (dirtyIds.length === 0) {
      toast.error("No changes to save!");
      return;
    }

    setIsSavingAll(true);
    try {
      const bulkPayload = dirtyIds.map(id => {
        const item = items.find(i => i.id === id)!;
        const draft = draftItems[id];
        return {
          id,
          currentStock: item.currentStock + (draft.addStock || 0),
          reorderLevel: draft.reorderLevel
        };
      });

      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bulkPayload })
      });

      if (!res.ok) throw new Error("Bulk save request failed");

      const resData = await res.json();
      const results: { id: string; success: boolean; currentStock?: number; reorderLevel?: number; error?: string }[] = resData.results || [];

      const successfulIds = new Set(results.filter(r => r.success).map(r => r.id));
      const failedResults = results.filter(r => !r.success);

      // Optimistically update successfully saved items
      if (successfulIds.size > 0) {
        setItems(prev => prev.map(i => {
          if (successfulIds.has(i.id)) {
            const draft = draftItems[i.id];
            return {
              ...i,
              currentStock: i.currentStock + (draft?.addStock || 0),
              reorderLevel: draft?.reorderLevel ?? i.reorderLevel
            };
          }
          return i;
        }));

        setDraftItems(prev => {
          const n = { ...prev };
          successfulIds.forEach(id => delete n[id]);
          return n;
        });

        if (detailedItem && successfulIds.has(detailedItem.id)) {
          const draft = draftItems[detailedItem.id];
          setDetailedItem(prev => prev ? {
            ...prev,
            currentStock: prev.currentStock + (draft?.addStock || 0),
            reorderLevel: draft?.reorderLevel ?? prev.reorderLevel
          } : null);
        }
      }

      if (failedResults.length > 0) {
        const failedNames = failedResults
          .map(f => items.find(i => i.id === f.id)?.name || f.id)
          .slice(0, 3)
          .join(", ");
        toast.error(`Failed to save: ${failedNames}${failedResults.length > 3 ? ` and ${failedResults.length - 3} more` : ''}`);
      } else {
        toast.success(`Saved all ${successfulIds.size} items ✅`);
      }
    } catch (err: any) {
      toast.error("Failed to execute bulk save");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleCopyJSON = () => {
    try {
      const dataToCopy = filteredItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category?.name || 'Uncategorized',
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        unit: item.unit,
        price: item.price,
      }));
      navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      toast.success("Inventory JSON copied to clipboard! 📋");
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F5F7FA] text-slate-800 flex flex-col p-4 md:p-8 font-sans">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Inventory Stock Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Add stock and set critical floor levels per item</p>
        </div>
        <div className="flex items-center gap-3">
          {dirtyCount > 0 && (
            <button
              onClick={handleSaveAllChanges}
              disabled={isSavingAll || !!savingRowId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSavingAll ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All ({dirtyCount})
            </button>
          )}
          <button
            onClick={handleCopyJSON}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm active:scale-95"
            title="Copy current inventory as JSON"
          >
            <Copy size={16} /> Copy JSON
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} /> Refresh
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <X size={16} /> Close
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 h-[calc(100vh-140px)]">

        {/* ── LEFT SIDEBAR: CATEGORIES ── */}
        <div className="w-64 flex flex-col bg-slate-50 rounded-xl overflow-hidden border border-blue-100/50 shadow-sm shrink-0">
          <div className="px-5 py-4 font-bold text-xs flex items-center gap-2 border-b border-slate-200 text-slate-600 bg-slate-100/50">
            <LayoutGrid size={16} /> CATEGORIES
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <button
              onClick={() => setCatFilter('ALL')}
              className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between ${catFilter === 'ALL' ? 'text-blue-700 bg-white border-l-4 border-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'}`}
            >
              All categories
              {catFilter === 'ALL' && <CheckCircle2 size={16} className="text-blue-600" />}
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between ${catFilter === c.id ? 'text-blue-700 bg-white border-l-4 border-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'}`}
              >
                {c.name}
                {catFilter === c.id && <CheckCircle2 size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Search Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-600">
                <Package size={14} className="text-blue-500" />
                <span>{filteredItems.length} items</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl shadow-sm text-xs font-semibold text-rose-600">
                <AlertTriangle size={14} />
                <span>{criticalCount} critical</span>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-slate-300" size={40} />
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead className="bg-[#F8FAFC] sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-1/3">Item Name</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-28">Current Stock</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-36">Add Stock</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-36">Critical Floor</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-28">Status</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const draft = draftItems[item.id];
                        const isDirty = !!draft;
                        const addStockVal = draft?.addStock ?? 0;
                        const reorderVal = draft?.reorderLevel ?? item.reorderLevel;
                        const previewStock = item.currentStock + (addStockVal || 0);
                        const isSavingRow = savingRowId === item.id;
                        const status = getStatus(item);

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-slate-100 transition-colors group ${isDirty ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}
                          >
                            {/* Item Name */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${status === 'out' ? 'bg-rose-100 text-rose-600' : status === 'low' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {item.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{item.category?.name || 'Uncategorized'} · {item.unit}</div>
                                </div>
                              </div>
                            </td>

                            {/* Current Stock */}
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800">{item.currentStock}</span>
                                {isDirty && addStockVal !== 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600">→ {previewStock}</span>
                                )}
                              </div>
                            </td>

                            {/* Add Stock */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDraftChange(item.id, 'addStock', (addStockVal || 0) - 1)}
                                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                >
                                  <Minus size={12} strokeWidth={3} />
                                </button>
                                <input
                                  type="number"
                                  value={addStockVal}
                                  onChange={(e) => handleDraftChange(item.id, 'addStock', Number(e.target.value))}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className={`w-16 bg-white border ${isDirty && addStockVal !== 0 ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'} rounded-lg px-2 py-1.5 text-xs font-black text-center text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                />
                                <button
                                  onClick={() => handleDraftChange(item.id, 'addStock', (addStockVal || 0) + 1)}
                                  className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                                >
                                  <Plus size={12} strokeWidth={3} />
                                </button>
                              </div>
                            </td>

                            {/* Critical Floor */}
                            <td className="px-5 py-3">
                              <div className="relative w-24">
                                <input
                                  type="number"
                                  value={reorderVal}
                                  onChange={(e) => handleDraftChange(item.id, 'reorderLevel', Number(e.target.value))}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className={`w-full bg-white border ${isDirty && reorderVal !== item.reorderLevel ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'} rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">{item.unit}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                status === 'out' ? 'bg-rose-100 text-rose-700' :
                                status === 'low' ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'Good'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isDirty && (
                                  <button
                                    onClick={() => updateSingleItem(item.id)}
                                    disabled={isSavingRow}
                                    className="p-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                                    title="Save this item"
                                  >
                                    {isSavingRow ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.5} />}
                                  </button>
                                )}
                                <button
                                  onClick={() => setDetailedItem(item)}
                                  className="p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  title="View details"
                                >
                                  <ChevronRight size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                            <Package className="mx-auto mb-3 opacity-20" size={40} />
                            No items found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── DETAIL SIDE PANEL ── */}
      <AnimatePresence>
        {detailedItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailedItem(null)}
              className="fixed inset-0 z-40 bg-black/10"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-96 bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200 flex flex-col"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xl text-slate-800">Item Details</h3>
                  <button onClick={() => setDetailedItem(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors">
                    <X size={22} />
                  </button>
                </div>

                {/* Item Header */}
                <div className="mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mb-3 ${getStatus(detailedItem) === 'out' ? 'bg-rose-100 text-rose-600' : getStatus(detailedItem) === 'low' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {detailedItem.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-black text-slate-800 text-2xl leading-tight mb-1">{detailedItem.name}</h4>
                  <div className="text-sm text-slate-500 font-medium">{detailedItem.category?.name || 'Uncategorized'} · {detailedItem.unit}</div>
                </div>

                {/* Stock Info */}
                <div className="space-y-3 mb-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Stock</span>
                      <span className="text-2xl font-black text-slate-800">{detailedItem.currentStock} <span className="text-sm text-slate-400">{detailedItem.unit}</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Critical Floor</span>
                      <span className="text-lg font-black text-rose-600">{detailedItem.reorderLevel} <span className="text-xs text-slate-400">{detailedItem.unit}</span></span>
                    </div>
                  </div>

                  {/* Stock Gauge */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>Stock Level</span>
                      <span>{detailedItem.reorderLevel > 0 ? Math.round((detailedItem.currentStock / Math.max(detailedItem.reorderLevel * 3, detailedItem.currentStock)) * 100) : 100}%</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getStatus(detailedItem) === 'out' ? 'bg-rose-500' : getStatus(detailedItem) === 'low' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${detailedItem.reorderLevel > 0 ? Math.min(100, Math.round((detailedItem.currentStock / Math.max(detailedItem.reorderLevel * 3, detailedItem.currentStock)) * 100)) : 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                      <span>0</span>
                      <span>Critical: {detailedItem.reorderLevel}</span>
                      <span>{Math.max(detailedItem.reorderLevel * 3, detailedItem.currentStock)}+</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    getStatus(detailedItem) === 'out' ? 'bg-rose-50 border-rose-200' :
                    getStatus(detailedItem) === 'low' ? 'bg-amber-50 border-amber-200' :
                    'bg-emerald-50 border-emerald-200'
                  }`}>
                    {getStatus(detailedItem) !== 'ok' && <AlertTriangle size={18} className={getStatus(detailedItem) === 'out' ? 'text-rose-600' : 'text-amber-600'} />}
                    {getStatus(detailedItem) === 'ok' && <TrendingUp size={18} className="text-emerald-600" />}
                    <div>
                      <div className={`text-sm font-black ${getStatus(detailedItem) === 'out' ? 'text-rose-700' : getStatus(detailedItem) === 'low' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {getStatus(detailedItem) === 'out' ? 'Out of Stock' : getStatus(detailedItem) === 'low' ? 'Low Stock — Reorder Soon' : 'Stock Level Good'}
                      </div>
                      <div className={`text-xs font-medium ${getStatus(detailedItem) === 'out' ? 'text-rose-500' : getStatus(detailedItem) === 'low' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {getStatus(detailedItem) === 'out' ? 'Immediate restocking required' : getStatus(detailedItem) === 'low' ? `${detailedItem.reorderLevel - detailedItem.currentStock} units below critical floor` : `${detailedItem.currentStock - detailedItem.reorderLevel} units above critical floor`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Add Stock */}
                <div className="border-t border-slate-200 pt-5">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quick Add Stock</div>
                  <div className="flex gap-2">
                    {[10, 25, 50, 100].map(qty => (
                      <button
                        key={qty}
                        onClick={() => {
                          handleDraftChange(detailedItem.id, 'addStock', qty);
                          setDetailedItem(prev => prev ? { ...prev } : null);
                        }}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      await updateSingleItem(detailedItem.id);
                      setDetailedItem(null);
                    }}
                    disabled={!draftItems[detailedItem.id]}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-2xl text-sm font-bold transition-colors shadow-xl shadow-slate-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

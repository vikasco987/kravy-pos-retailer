"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Check, Copy, X, ChevronRight, ChevronLeft, ChevronDown, LayoutGrid, CheckCircle2, Save, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthContext';

type Item = {
  id: string;
  name: string;
  price: number;
  sellingPrice: number;
  gst: number;
  taxStatus: string; // "With Tax" or "Without Tax"
  hsnCode?: string | null;
  categoryId: string;
};

type Category = {
  id: string;
  name: string;
};

export default function ItemTaxManagementPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.type === "ADMIN" || user?.type === "MASTER";

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  // Bulk Apply Input States
  const [bulkTaxType, setBulkTaxType] = useState("With Tax");
  const [bulkGst, setBulkGst] = useState<number>(5);
  const [bulkHsn, setBulkHsn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Custom anchored dropdown state for bulk tax
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);

  // Draft state for inline edits
  const [draftItems, setDraftItems] = useState<Record<string, { taxStatus: string; gst: number; hsnCode: string }>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // Single Item Breakdown State
  const [detailedItem, setDetailedItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch('/api/menu/tax-items'),
        fetch('/api/categories')
      ]);
      const itemsData = await itemsRes.json();
      const catData = await catRes.json();

      setItems(Array.isArray(itemsData) ? itemsData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(search.toLowerCase()));
      // FIXED: items return `category: { id, name }` instead of `categoryId`
      const matchCat = catFilter === "ALL" || (item as any).category?.id === catFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, catFilter]);

  const handleApplyToAll = async () => {
    if (filteredItems.length === 0) return;
    if (!confirm(`Are you sure you want to update tax settings for all ${filteredItems.length} items in this view?`)) return;

    setIsSaving(true);
    const idsToUpdate = filteredItems.map(i => i.id);

    try {
      const res = await fetch('/api/menu/bulk-tax-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: idsToUpdate,
          taxStatus: bulkTaxType,
          gst: bulkGst,
          hsnCode: bulkHsn.trim() ? bulkHsn.trim() : undefined
        })
      });

      if (!res.ok) throw new Error("Failed to update");

      setItems(prev => prev.map(item => {
        if (idsToUpdate.includes(item.id)) {
          return {
            ...item,
            taxStatus: bulkTaxType,
            gst: bulkGst,
            ...(bulkHsn.trim() ? { hsnCode: bulkHsn.trim() } : {})
          };
        }
        return item;
      }));
      
      if (detailedItem && idsToUpdate.includes(detailedItem.id)) {
        setDetailedItem(prev => prev ? {
          ...prev,
          taxStatus: bulkTaxType,
          gst: bulkGst,
          ...(bulkHsn.trim() ? { hsnCode: bulkHsn.trim() } : {})
        } : null);
      }

      toast.success(`Updated ${idsToUpdate.length} items successfully`);
    } catch (err) {
      toast.error("Failed to update items");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftChange = (itemId: string, field: 'taxStatus' | 'gst' | 'hsnCode', value: any) => {
    setDraftItems(prev => {
      const item = items.find(i => i.id === itemId);
      const existing = prev[itemId] || {
        taxStatus: item?.taxStatus || "Without Tax",
        gst: item?.gst || 0,
        hsnCode: item?.hsnCode || ""
      };
      return {
        ...prev,
        [itemId]: { ...existing, [field]: value }
      };
    });
  };

  // Save all modified / dirty items at once
  const handleSaveAllChanges = async () => {
    const dirtyIds = Object.keys(draftItems);
    if (dirtyIds.length === 0) {
      toast.error("No changes to save!");
      return;
    }

    setIsSavingAll(true);
    try {
      const itemsPayload = dirtyIds.map(id => ({
        id,
        taxStatus: draftItems[id].taxStatus,
        gst: draftItems[id].gst,
        hsnCode: draftItems[id].hsnCode
      }));

      const res = await fetch('/api/menu/bulk-tax-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload })
      });

      if (!res.ok) throw new Error("Failed to save changes");

      // Update state
      setItems(prev => prev.map(item => {
        if (draftItems[item.id]) {
          return {
            ...item,
            taxStatus: draftItems[item.id].taxStatus,
            gst: draftItems[item.id].gst,
            hsnCode: draftItems[item.id].hsnCode
          };
        }
        return item;
      }));

      // Clear draft
      setDraftItems({});
      toast.success(`Successfully saved ${dirtyIds.length} item(s)! ✅`);
    } catch (err) {
      toast.error("Failed to save all changes");
    } finally {
      setIsSavingAll(false);
    }
  };

  const updateSingleItem = async (itemId: string) => {
    const draft = draftItems[itemId];
    if (!draft) return;
    
    setSavingRowId(itemId);
    try {
      const res = await fetch('/api/menu/bulk-tax-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          taxStatus: draft.taxStatus,
          gst: draft.gst,
          hsnCode: draft.hsnCode
        })
      });

      if (!res.ok) throw new Error("Update failed");
      
      // Update main state
      setItems(prev => prev.map(item => item.id === itemId ? {
        ...item,
        taxStatus: draft.taxStatus,
        gst: draft.gst,
        hsnCode: draft.hsnCode
      } : item));
      if (detailedItem && detailedItem.id === itemId) {
        setDetailedItem(prev => prev ? {
          ...prev,
          taxStatus: draft.taxStatus,
          gst: draft.gst,
          hsnCode: draft.hsnCode
        } : null);
      }
      
      // Clear draft
      setDraftItems(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[itemId];
        return newDrafts;
      });

      toast.success("Item updated");
    } catch (err) {
      toast.error("Failed to update item");
    } finally {
      setSavingRowId(null);
    }
  };

  const copyPageSchema = () => {
    navigator.clipboard.writeText(JSON.stringify(items, null, 2));
    toast.success("Page Schema Copied!");
  };

  const copyItemSchema = (item: Item) => {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    toast.success("Item Schema Copied!");
  };

  return (
    <div className="min-h-[calc(100vh-100px)] w-full text-slate-800 flex flex-col font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 sm:p-2 md:p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-all shrink-0 active:scale-95 shadow-sm"
            title="Back to Tax Settings"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Item Tax & HSN Management</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-snug">Manage Tax Type (With/Without Tax), GST % and HSN Code per item</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
          {Object.keys(draftItems).length > 0 && (
            <button
              onClick={handleSaveAllChanges}
              disabled={isSavingAll}
              className="px-2.5 sm:px-3.5 md:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isSavingAll ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="sm:w-4 sm:h-4" />}
              <span>Save Changes</span>
              <span className="bg-white/20 px-1.5 py-0.2 rounded-md text-[10px] sm:text-xs">({Object.keys(draftItems).length})</span>
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={copyPageSchema} 
              className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Copy size={14} className="sm:w-4 sm:h-4" /> API JSON
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3.5 lg:gap-5 flex-1 min-h-0">
        
        {/* Categories Selector: Compact sidebar on desktop, horizontal scrollable pills on tablet/mobile */}
        <div className="lg:w-44 xl:w-48 flex flex-col bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm shrink-0 overflow-hidden">
          <div className="px-3.5 py-2 sm:py-2.5 font-bold text-[11px] sm:text-xs flex items-center justify-between border-b border-slate-200 text-slate-600 bg-slate-100/60">
            <span className="flex items-center gap-1.5">
              <LayoutGrid size={14} /> CATEGORIES
            </span>
            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500">
              {categories.length + 1}
            </span>
          </div>
          
          {/* Mobile & Tablet (<1024px): horizontal scroll pill bar */}
          <div className="flex lg:hidden overflow-x-auto p-1.5 sm:p-2 gap-1.5 scrollbar-thin">
            <button 
              onClick={() => setCatFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${catFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              All Categories
              {catFilter === 'ALL' && <CheckCircle2 size={13} />}
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${catFilter === c.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                {c.name}
                {catFilter === c.id && <CheckCircle2 size={13} />}
              </button>
            ))}
          </div>

          {/* Desktop (>=1024px): compact vertical list */}
          <div className="hidden lg:flex flex-col flex-1 overflow-y-auto max-h-[calc(100vh-250px)] py-1">
            <button 
              onClick={() => setCatFilter('ALL')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-all flex items-center justify-between ${catFilter === 'ALL' ? 'text-blue-700 bg-white border-l-4 border-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'}`}
            >
              <span className="truncate">All categories</span>
              {catFilter === 'ALL' && <CheckCircle2 size={14} className="text-blue-600 shrink-0 ml-1" />}
            </button>
            {categories.map(c => (
              <button 
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold transition-all flex items-center justify-between ${catFilter === c.id ? 'text-blue-700 bg-white border-l-4 border-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-transparent'}`}
              >
                <span className="truncate">{c.name}</span>
                {catFilter === c.id && <CheckCircle2 size={14} className="text-blue-600 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Search + Bulk Controls + Table */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar: Search on top or flex row, Bulk Controls on their own single horizontal row */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search items or HSN..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Bulk Action Controls: Always single horizontal row (never stacking vertically) */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-xl border border-slate-200 shadow-sm overflow-visible whitespace-nowrap shrink-0">
              <span className="text-[11px] font-bold text-slate-500 pl-1 shrink-0">Bulk:</span>
              <div className="relative inline-block shrink-0">
                <button
                  type="button"
                  onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-700 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shrink-0"
                >
                  <span>{bulkTaxType}</span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${bulkDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {bulkDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setBulkDropdownOpen(false)} 
                    />
                    <div 
                      className="absolute left-0 top-full mt-1.5 z-50 w-[130px] bg-white border border-slate-200 rounded-xl shadow-xl py-1 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setBulkTaxType("With Tax");
                          setBulkDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                          bulkTaxType === "With Tax" 
                            ? "bg-blue-50 text-blue-700 font-bold" 
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>With Tax</span>
                        {bulkTaxType === "With Tax" && <Check size={13} className="text-blue-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkTaxType("Without Tax");
                          setBulkDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                          bulkTaxType === "Without Tax" 
                            ? "bg-blue-50 text-blue-700 font-bold" 
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>Without Tax</span>
                        {bulkTaxType === "Without Tax" && <Check size={13} className="text-blue-600" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="relative w-16 sm:w-20 shrink-0">
                <input 
                  type="number" 
                  value={bulkGst}
                  onChange={(e) => setBulkGst(Number(e.target.value))}
                  placeholder="GST"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2 pr-5 py-1 text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">%</span>
              </div>

              <div className="relative w-20 sm:w-24 shrink-0">
                <input 
                  type="text" 
                  value={bulkHsn}
                  onChange={(e) => setBulkHsn(e.target.value)}
                  placeholder="HSN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <button 
                onClick={handleApplyToAll}
                disabled={isSaving || filteredItems.length === 0}
                className="px-2.5 sm:px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50 whitespace-nowrap active:scale-95 shrink-0"
              >
                Apply ({filteredItems.length})
              </button>

              {Object.keys(draftItems).length > 0 && (
                <button
                  onClick={handleSaveAllChanges}
                  disabled={isSavingAll}
                  className="px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] sm:text-xs font-bold shadow transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-50 active:scale-95 shrink-0"
                >
                  {isSavingAll ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>Save ({Object.keys(draftItems).length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Table Area */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-slate-300" size={40} />
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead className="bg-[#F8FAFC] sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-1/4">Item Name</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-24">Price</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-36">Tax Type</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-28">GST %</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 w-36">HSN Code</th>
                        <th className="px-5 py-3.5 text-xs font-bold text-slate-800 border-b border-slate-200 text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(item => {
                        const draft = draftItems[item.id];
                        const isDirty = !!draft;
                        const currentTaxStatus = draft?.taxStatus ?? (item.taxStatus || "Without Tax");
                        const currentGst = draft?.gst ?? (item.gst ?? 0);
                        const currentHsn = draft?.hsnCode !== undefined ? draft.hsnCode : (item.hsnCode || "");
                        const isSavingRow = savingRowId === item.id;

                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                            <td className="px-5 py-3 text-sm font-medium text-slate-800">
                              <div>{item.name}</div>
                              {item.hsnCode && (
                                <span className="text-[10px] font-mono text-slate-400">HSN: {item.hsnCode}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-600">₹{item.price}</td>
                            <td className="px-5 py-3">
                              <select 
                                value={currentTaxStatus}
                                onChange={(e) => handleDraftChange(item.id, 'taxStatus', e.target.value)}
                                className={`bg-white border ${isDirty ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'} rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all cursor-pointer`}
                              >
                                <option value="With Tax">With Tax</option>
                                <option value="Without Tax">Without Tax</option>
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <div className="relative w-24">
                                <input 
                                  type="number" 
                                  value={currentGst}
                                  onChange={(e) => handleDraftChange(item.id, 'gst', Number(e.target.value))}
                                  className={`w-full bg-white border ${isDirty ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'} rounded-lg pl-2.5 pr-6 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="relative w-32">
                                <input 
                                  type="text" 
                                  value={currentHsn}
                                  placeholder="e.g. 210690"
                                  onChange={(e) => handleDraftChange(item.id, 'hsnCode', e.target.value)}
                                  className={`w-full bg-white border ${isDirty ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'} rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase transition-all`}
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isDirty && (
                                  <button 
                                    onClick={() => updateSingleItem(item.id)}
                                    disabled={isSavingRow}
                                    className="p-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    title="Save this item"
                                  >
                                    {isSavingRow ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                                  </button>
                                )}
                                <button 
                                  onClick={() => setDetailedItem(item)}
                                  className="p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  title="View Tax Breakdown"
                                >
                                  <ChevronRight size={17} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">No items found matching your filters.</td>
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

      {/* Right Pane for Details (Full Side Drawer) */}
      <AnimatePresence>
        {detailedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailedItem(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-[480px] md:w-[500px] max-w-full bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-200 flex flex-col"
            >
              <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h3 className="font-black text-xl sm:text-2xl text-slate-800">Tax Breakdown</h3>
                  <button onClick={() => setDetailedItem(null)} className="p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors">
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="mb-6 sm:mb-8">
                  <h4 className="font-black text-slate-800 text-2xl sm:text-3xl leading-tight mb-2">{detailedItem.name}</h4>
                  <div className="flex items-center gap-3 text-sm sm:text-base md:text-lg font-bold text-slate-500">
                    <span>Current Price: ₹{detailedItem.price}</span>
                    {detailedItem.hsnCode && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        HSN: {detailedItem.hsnCode}
                      </span>
                    )}
                  </div>
                </div>

                {(() => {
                  const isInclusive = detailedItem.taxStatus === "With Tax";
                  const rate = detailedItem.gst || 0;
                  const gross = detailedItem.price;
                  let taxable = 0;
                  let gstAmt = 0;
                  let finalTotal = 0;

                  if (isInclusive) {
                    taxable = gross / (1 + rate / 100);
                    gstAmt = gross - taxable;
                    finalTotal = gross;
                  } else {
                    taxable = gross;
                    gstAmt = (gross * rate) / 100;
                    finalTotal = gross + gstAmt;
                  }

                  return (
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Type</span>
                          <span className={`text-sm font-black px-3 py-1 rounded-lg ${isInclusive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isInclusive ? 'WITH TAX' : 'WITHOUT TAX'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Rate</span>
                          <span className="text-xl font-black text-slate-700">{rate}%</span>
                        </div>
                      </div>

                      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-slate-600">Taxable Amount</span>
                          <span className="font-black text-slate-800 text-lg">₹{taxable.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-slate-600">GST Amount</span>
                          <span className="font-black text-rose-600 text-lg">+ ₹{gstAmt.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-blue-200/50 w-full my-4"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-black text-blue-900">Net Final Price</span>
                          <span className="font-black text-blue-700 text-3xl">₹{finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => copyItemSchema(detailedItem)} 
                        className="w-full flex items-center justify-center gap-2 mt-8 py-4 bg-slate-800 text-white hover:bg-slate-900 rounded-2xl text-sm font-bold transition-colors shadow-xl shadow-slate-900/10"
                      >
                        <Copy size={18} /> Copy Item Schema
                      </button>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

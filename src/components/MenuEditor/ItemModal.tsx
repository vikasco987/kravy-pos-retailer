import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Image as ImageIcon, RotateCcw, Check } from "lucide-react";
import Image from "next/image";
import AddonGroupsModal from "./AddonGroupsModal";
import { useConfirm } from "@/components/ConfirmContext";

export default function ItemModal({ item, addonGroups = [], onSave, onClose, categories = [] }: any) {
    const { confirm } = useConfirm();
    const defaultItem = {
        name: "",
        price: null,
        purchasingPrice: null,
        mrp: null,
        sellingPrice: null,
        description: "",
        isVeg: true,
        isEgg: false,
        variants: [],
        addonGroupIds: [],
        imageUrl: "",
        categoryId: item?.categoryId || "",
        packagingCharges: 0,
        gstType: "goods",
        taxRate: "5.0%",
        zones: Array.isArray(item?.zones) ? item.zones : [],
        ...item
    };

    const [local, setLocal] = useState(defaultItem);
    const [tab, setTab] = useState("basic");
    const [uploading, setUploading] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    const [showAddonManager, setShowAddonManager] = useState(false);
    const [localGroups, setLocalGroups] = useState(addonGroups);

    // Zone states
    const [availableZones, setAvailableZones] = useState<string[]>(["MAIN KITCHEN", "BAR", "GRILL", "BAKERY", "COUNTER"]);
    const [showQuickAddZone, setShowQuickAddZone] = useState(false);
    const [quickZoneInput, setQuickZoneInput] = useState("");

    useEffect(() => {
      setMounted(true);
      fetch("/api/profile/zones")
        .then(res => res.json())
        .then(data => {
          if (data.zones && Array.isArray(data.zones)) {
            setAvailableZones(data.zones);
          }
        })
        .catch(() => {});
    }, []);

    const handleSaveQuickZone = async () => {
      const name = quickZoneInput.trim().toUpperCase();
      if (!name) return;
      try {
        const res = await fetch("/api/profile/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", zoneName: name })
        });
        if (res.ok) {
          setAvailableZones(prev => Array.from(new Set([...prev, name])));
          setLocal(prev => ({ ...prev, zones: [name] }));
          setQuickZoneInput("");
          setShowQuickAddZone(false);
        } else {
          const data = await res.json();
          alert(data.error || "Failed to add zone");
        }
      } catch (err) {
        console.error("Error adding zone:", err);
      }
    };
    useEffect(() => setLocalGroups(addonGroups), [addonGroups]);

    async function handleQuickAddonSave(data: any) {
        const res = await fetch(`/api/menu-editor/addon-groups`, {
            method: data.id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            const saved = await res.json();
            setLocalGroups((prev: any[]) => data.id ? prev.map((g: any) => g.id === data.id ? saved : g) : [saved, ...prev]);
            if (!data.id) {
                handleToggleAddonGroup(saved.id);
            }
            setShowAddonManager(false);
        } else {
            alert("Failed to save addon group");
        }
    }

    async function handleQuickAddonDelete(id: string) {
        if (!await confirm("Are you sure?")) return;
        const res = await fetch(`/api/menu-editor/addon-groups?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setLocalGroups((prev: any[]) => prev.filter((g: any) => g.id !== id));
            setLocal(prev => ({ ...prev, addonGroupIds: prev.addonGroupIds.filter((i: string) => i !== id) }));
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploading(true);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.secure_url) {
          setLocal(prev => ({ ...prev, imageUrl: data.secure_url }));
        } else {
          alert("Upload failed");
        }
      } catch (err) {
        alert("Upload Error");
      } finally {
        setUploading(false);
      }
    };

    const handleAddVariantGroup = () => {
        const newGroup = {
            id: crypto.randomUUID(),
            groupName: "New Group",
            type: "radio",
            required: false,
            options: []
        };
        setLocal(prev => ({
            ...prev,
            variants: [...(Array.isArray(prev.variants) ? prev.variants : []), newGroup]
        }));
    };

    const handleUpdateVariantGroup = (idx: number, updates: any) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            newVariants[idx] = { ...newVariants[idx], ...updates };
            return { ...prev, variants: newVariants };
        });
    };

    const handleUpdateVariantOption = (groupIdx: number, optionIdx: number, updates: any) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            const newGroup = { ...newVariants[groupIdx] };
            const newOptions = [...(Array.isArray(newGroup.options) ? newGroup.options : [])];
            if (newOptions[optionIdx]) {
                newOptions[optionIdx] = { ...newOptions[optionIdx], ...updates };
            }
            newGroup.options = newOptions;
            newVariants[groupIdx] = newGroup;
            return { ...prev, variants: newVariants };
        });
    };

    const handleDeleteVariantGroup = (idx: number) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            newVariants.splice(idx, 1);
            return { ...prev, variants: newVariants };
        });
    };

    const handleAddVariantOption = (groupIdx: number) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            const newGroup = { ...newVariants[groupIdx] };
            newGroup.options = [
                ...(Array.isArray(newGroup.options) ? newGroup.options : []),
                { id: crypto.randomUUID(), name: "New Option", price: 0 }
            ];
            newVariants[groupIdx] = newGroup;
            return { ...prev, variants: newVariants };
        });
    };



    const handleDeleteVariantOption = (groupIdx: number, optionIdx: number) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            const newGroup = { ...newVariants[groupIdx] };
            const newOptions = [...(Array.isArray(newGroup.options) ? newGroup.options : [])];
            newOptions.splice(optionIdx, 1);
            newGroup.options = newOptions;
            newVariants[groupIdx] = newGroup;
            return { ...prev, variants: newVariants };
        });
    };

    const handleToggleAddonGroup = (groupId: string) => {
        setLocal(prev => {
            const currentIds = Array.isArray(prev.addonGroupIds) ? prev.addonGroupIds : [];
            if (currentIds.includes(groupId)) {
                return { ...prev, addonGroupIds: currentIds.filter(id => id !== groupId) };
            } else {
                return { ...prev, addonGroupIds: [...currentIds, groupId] };
            }
        });
    };

    if (!mounted) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-[var(--kravy-surface)] dark:bg-slate-900 rounded-[32px] border border-[var(--kravy-border)] shadow-2xl w-full max-w-lg p-0 z-[10000] overflow-hidden flex flex-col max-h-[90vh]">

          <div className="p-8 pb-4 shrink-0">
            <h3 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">✨</div>
              Item Details
            </h3>

            <div className="flex gap-2 mb-2 border-b border-[var(--kravy-border)] overflow-x-auto no-scrollbar">
              {["basic", "variants", "addons", "image"].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--kravy-text-muted)] hover:text-indigo-400"}`}
                >
                  {t === "basic" ? "Info" : t === "variants" ? "Variants" : t === "addons" ? "Add-ons" : "Photo"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-8 overflow-y-auto no-scrollbar pb-8 flex-1">
            {tab === "variants" && (
              <div className="space-y-6 pb-4">
                <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  <div>
                    <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-100">Variant Groups</h4>
                    <p className="text-[10px] font-bold text-indigo-500/70 mt-1">E.g., Size, Choice of Crust</p>
                  </div>
                  <button onClick={handleAddVariantGroup} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95">
                    + Add Group
                  </button>
                </div>

                {(Array.isArray(local.variants) ? local.variants : []).map((group: any, gIdx: number) => (
                  <div key={group.id || gIdx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                    {/* Group Header */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1 space-y-3 w-full">
                        <input
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-black text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/30"
                          value={group.groupName}
                          onChange={(e) => handleUpdateVariantGroup(gIdx, { groupName: e.target.value })}
                          placeholder="Group Name (e.g. Select Size)"
                        />
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                            <input
                              type="radio"
                              name={`type-${gIdx}`}
                              checked={group.type === "radio"}
                              onChange={() => handleUpdateVariantGroup(gIdx, { type: "radio" })}
                              className="w-4 h-4 text-indigo-600"
                            />
                            Single Choice
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                            <input
                              type="radio"
                              name={`type-${gIdx}`}
                              checked={group.type === "checkbox"}
                              onChange={() => handleUpdateVariantGroup(gIdx, { type: "checkbox" })}
                              className="w-4 h-4 text-indigo-600"
                            />
                            Multiple Choice
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 ml-auto bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/30">
                            <input
                              type="checkbox"
                              checked={group.required}
                              onChange={(e) => handleUpdateVariantGroup(gIdx, { required: e.target.checked })}
                              className="w-3.5 h-3.5 text-amber-500 rounded cursor-pointer"
                            />
                            <span className="dark:text-amber-500">Required</span>
                          </label>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteVariantGroup(gIdx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Delete Group">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Group Options */}
                    <div className="p-4 space-y-2 bg-slate-50/30 dark:bg-slate-800/20">
                      {(Array.isArray(group.options) ? group.options : []).map((opt: any, oIdx: number) => (
                        <div key={opt.id || oIdx} className="flex gap-2 items-center">
                          <input
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                            value={opt.name}
                            onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, { name: e.target.value })}
                            placeholder="Option Name"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">₹</span>
                            <input
                              type="number"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg pl-7 pr-2 py-2 outline-none focus:border-indigo-400"
                              value={opt.price}
                              onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, { price: Number(e.target.value) })}
                              placeholder="Price"
                            />
                          </div>
                          <button onClick={() => handleDeleteVariantOption(gIdx, oIdx)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => handleAddVariantOption(gIdx)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 py-2 flex items-center gap-1">
                        + Add Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "addons" && (
              <div className="space-y-6 pb-4">
                 <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                  <div>
                    <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-100">Linked Add-on Groups</h4>
                    <p className="text-[10px] font-bold text-indigo-500/70 mt-1">Select from your global Add-on library.</p>
                  </div>
                  <button onClick={() => setShowAddonManager(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95">
                    + New Group
                  </button>
                </div>

                {localGroups.length === 0 ? (
                  <div className="text-center py-8 text-[var(--kravy-text-muted)] text-xs font-bold">
                    No Add-on Groups found. Create them first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {localGroups.map((group: any) => {
                      const isSelected = (local.addonGroupIds || []).includes(group.id);
                      return (
                        <div 
                          key={group.id} 
                          onClick={() => handleToggleAddonGroup(group.id)}
                          className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                            isSelected 
                              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm" 
                              : "border-[var(--kravy-border)] bg-[var(--kravy-bg)] hover:border-indigo-300"
                          }`}
                        >
                          <div>
                             <h4 className={`text-sm font-black ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-[var(--kravy-text-primary)]"}`}>
                               {group.name}
                             </h4>
                             <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] mt-1">
                               {group.addons?.length || 0} Add-ons &bull; {group.isCompulsory ? "Required" : "Optional"}
                             </p>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "basic" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Item Name</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                    value={local.name}
                    placeholder="e.g. Kadai Paneer"
                    onChange={(e) => setLocal({ ...local, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Purchasing Price (₹)</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      type="number"
                      value={local.purchasingPrice ?? ""}
                      placeholder="Optional"
                      onChange={(e) => setLocal({ ...local, purchasingPrice: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Selling Price (₹)</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      type="number"
                      value={local.sellingPrice ?? ""}
                      placeholder="Selling Price"
                      onChange={(e) => setLocal({ ...local, sellingPrice: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">MRP (₹)</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      type="number"
                      value={local.mrp ?? ""}
                      placeholder="Optional"
                      onChange={(e) => setLocal({ ...local, mrp: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Category</label>
                    <select
                      value={local.categoryId ?? "uncategorised"}
                      onChange={(e) => setLocal({ ...local, categoryId: e.target.value })}
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                    >
                      {categories.map((c: any) => <option key={c.id} value={c.id === "all" ? "uncategorised" : c.id} className="bg-[var(--kravy-bg)]">{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Item Code / Short Code</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      value={local.shortCode ?? ""}
                      placeholder="e.g. 1999"
                      onChange={(e) => setLocal({ ...local, shortCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Manufacturer Barcode</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      value={local.barcode ?? ""}
                      placeholder="Scan or type barcode"
                      onChange={(e) => setLocal({ ...local, barcode: e.target.value })}
                    />
                  </div>
                </div>

                {/* 📍 Zone Selection & Quick Add Zone */}
                <div className="space-y-1 bg-indigo-50/40 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex justify-between items-center ml-1 mb-1">
                    <label className="block text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                      📍 Assigned Zone / Kitchen
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddZone(!showQuickAddZone)}
                      className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      + Quick Add Zone
                    </button>
                  </div>
                  
                  <select
                    value={local.zones?.[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocal({ ...local, zones: val ? [val] : [] });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[var(--kravy-text-primary)] rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-xs transition-all"
                  >
                    <option value="">-- All Zones (Global Menu) --</option>
                    {availableZones.map((z: string) => (
                      <option key={z} value={z.toUpperCase()} className="bg-[var(--kravy-bg)]">
                        📍 {z.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {showQuickAddZone && (
                    <div className="mt-2 p-3 rounded-xl border border-indigo-500/30 bg-white dark:bg-slate-900 flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="New Zone Name (e.g. TANDOOR)"
                        value={quickZoneInput}
                        onChange={(e) => setQuickZoneInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveQuickZone}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Description</label>
                  <textarea
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                    rows={3}
                    placeholder="Brief description about the taste..."
                    value={local.description ?? ""}
                    onChange={(e) => setLocal({ ...local, description: e.target.value })}
                  />
                </div>
              </div>
            )}

            {tab === "image" && (
              <div className="space-y-6 flex flex-col items-center pt-2">
                 <div className="w-full h-56 rounded-[2rem] border-2 border-dashed border-[var(--kravy-border)] bg-[var(--kravy-bg)] relative overflow-hidden flex items-center justify-center group">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                         <RotateCcw className="animate-spin text-indigo-500" size={24} />
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Uploading Image...</p>
                      </div>
                    ) : local.imageUrl ? (
                      <>
                        <Image src={local.imageUrl} alt="Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <p className="text-white text-[10px] font-black uppercase">Change Photo</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                           <ImageIcon size={24} strokeWidth={2.5} />
                        </div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Click to Upload Photo</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                 </div>
                 <div className="w-full space-y-2">
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Or enter Image URL manually</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                      value={local.imageUrl ?? ""}
                      placeholder="https://..."
                      onChange={(e) => setLocal({ ...local, imageUrl: e.target.value })}
                    />
                 </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 shrink-0 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)]">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-surface-hover)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!local.name || local.sellingPrice === null) {
                   alert("Item Name and Selling Price are required!");
                   return;
                }
                onSave({
                   ...local,
                   price: Number(local.mrp || local.sellingPrice), // Keep price synced with MRP for legacy reasons if needed
                   mrp: Number(local.mrp || local.sellingPrice),
                   purchasingPrice: local.purchasingPrice ? Number(local.purchasingPrice) : null,
                   sellingPrice: Number(local.sellingPrice)
                });
              }}
              className="px-8 py-3 font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 text-white active:scale-95"
            >
              Save Item
            </button>
          </div>

          <AnimatePresence>
            {showAddonManager && (
              <AddonGroupsModal 
                groups={localGroups}
                onSave={handleQuickAddonSave}
                onDelete={handleQuickAddonDelete}
                onClose={() => setShowAddonManager(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>, document.body
    );
}

function Check({ size, strokeWidth }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

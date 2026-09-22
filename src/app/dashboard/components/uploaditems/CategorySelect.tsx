
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, Check, ChevronDown, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { kravy } from "@/lib/sounds";

export interface Category {
  id: string;
  name: string;
}

interface CategorySelectProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  setCategories,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddNew = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create");

      kravy.success();
      toast.success("Category created! ✨");
      
      const newCat = { id: data.id, name: data.name };
      setCategories((prev) => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
      setSelectedCategory(data.id);
      setIsAddingNew(false);
      setNewCategoryName("");
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      kravy.error();
      toast.error(err.message || "Error creating category");
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = !categories;

  return (
    <div className="relative mb-6" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] mb-1.5 uppercase tracking-widest">Category Select *</label>
      
      <div 
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        className={`w-full bg-[var(--kravy-input-bg)] border ${isOpen ? 'border-[var(--kravy-brand)] ring-2 ring-[var(--kravy-brand)]/10' : 'border-[var(--kravy-input-border)]'} ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-200`}
      >
        <span className={`font-bold text-sm ${selectedCat ? 'text-[var(--kravy-text-primary)]' : 'text-gray-400'}`}>
          {isLoading ? "Loading Categories..." : (selectedCat ? selectedCat.name : "Select Category")}
        </span>
        {isLoading ? (
          <Loader2 size={18} className="text-[var(--kravy-text-muted)] animate-spin" />
        ) : (
          <ChevronDown size={18} className={`text-[var(--kravy-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      <AnimatePresence>
        {isOpen && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 mt-2 w-full bg-[var(--kravy-surface)] border border-[var(--kravy-border-strong)] rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
          >
            {/* Search Bar */}
            {!isAddingNew && (
              <div className="p-2 border-b border-[var(--kravy-border)] relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search categories..."
                  className="w-full bg-[var(--kravy-bg-2)] border-none rounded-lg pl-9 pr-3 py-2 text-sm font-bold outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="max-h-[220px] overflow-y-auto no-scrollbar py-1">
              {isAddingNew ? (
                <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[var(--kravy-brand)]">New Category Name</span>
                    <button onClick={() => setIsAddingNew(false)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                  </div>
                  <input
                    autoFocus
                    type="text"
                    className="w-full bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[var(--kravy-brand)]"
                    placeholder="e.g. Desserts"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    onClick={handleAddNew}
                    disabled={isCreating}
                    className="w-full bg-[var(--kravy-brand)] text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 text-[10px] uppercase tracking-widest"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {isCreating ? "Creating..." : "Confirm Create"}
                  </button>
                </div>
              ) : (
                <>
                  {filteredCategories.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[var(--kravy-text-muted)] italic text-xs">
                      No matching categories found.
                    </div>
                  ) : (
                    filteredCategories.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(cat.id);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--kravy-brand)]/10 transition-colors ${selectedCategory === cat.id ? 'bg-[var(--kravy-brand)]/5' : ''}`}
                      >
                        <span className={`text-sm ${selectedCategory === cat.id ? 'font-black text-[var(--kravy-brand)]' : 'font-bold text-[var(--kravy-text-primary)]'}`}>
                          {cat.name}
                        </span>
                        {selectedCategory === cat.id && <Check size={16} className="text-[var(--kravy-brand)]" />}
                      </div>
                    ))
                  )}

                  {/* Add New Option */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); setIsAddingNew(true); }}
                    className="mx-3 mt-1 mb-2 p-2 border-2 border-dashed border-[var(--kravy-border)] hover:border-[var(--kravy-brand)] rounded-xl flex items-center justify-center gap-2 text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)] cursor-pointer transition-all group"
                  >
                    <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Add New Category</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategorySelect;

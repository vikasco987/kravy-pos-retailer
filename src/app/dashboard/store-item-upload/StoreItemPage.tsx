"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy, Trash2, RefreshCw, ArrowRight, FileSpreadsheet, Settings2, X, Check } from "lucide-react";
import { kravy } from "@/lib/sounds";
import { AnimatePresence, motion } from "framer-motion";
import { useProfileCache } from "@/hooks/useProfileCache";

/* =============================
   TYPES
============================= */
type Category = { id: string; name: string };

type ClerkOption = {
  clerkId: string;
  label: string;
  email: string;
};

type StoreItem = {
  id?: string;
  name: string;
  shortCode?: string | null;
  description?: string;
  price: number | null;
  categoryId: string | null;
  clerkId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  zones?: string[];
  isVeg?: boolean;
  isEgg?: boolean;
};

/* =============================
   COMPONENT
============================= */
export default function StoreItemPage() {
  const { user } = useAuthContext();
  const userId = user?.businessId || user?.id;
  const router = useRouter();
  const { profile } = useProfileCache();

  const [mode, setMode] = useState<"create" | "update">("create");
  const [loadingItems, setLoadingItems] = useState(false);

  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clerks, setClerks] = useState<ClerkOption[]>([]);

  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [bulkClerkId, setBulkClerkId] = useState("");
  const [applyClerkToAll, setApplyClerkToAll] = useState(true);
  const [clerkSearch, setClerkSearch] = useState("");
  const [showClerkDropdown, setShowClerkDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mapping State
  const [mappingOpen, setMappingOpen] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [uploadedRows, setUploadedRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    name: "",
    shortCode: "",
    price: "",
    category: "",
    description: "",
    imageUrl: "",
    zones: ""
  });
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [multiZoneMenuEnabled, setMultiZoneMenuEnabled] = useState(false);
  const [availableZones, setAvailableZones] = useState<string[]>(["Default"]);
  const [bulkZone, setBulkZone] = useState("");
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");


  /* =============================
     LOAD MASTER DATA
  ============================= */
  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setCategories(data) : setCategories([]))
      .catch(() => setCategories([]));

    fetch("/api/clerks")
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setClerks(data) : setClerks([]))
      .catch(() => setClerks([]));

    fetch("/api/tables")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const zones = Array.from(new Set(data.map((t: any) => t.zone || "Default")));
          setAvailableZones(zones);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profile && profile.multiZoneMenuEnabled !== undefined) {
      setMultiZoneMenuEnabled(!!profile.multiZoneMenuEnabled);
    }
  }, [profile]);

  /* =============================
     CLERK FILTER
  ============================= */
  const filteredClerks = useMemo(() => {
    return clerks.filter(c =>
      c.label.toLowerCase().includes(clerkSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clerkSearch.toLowerCase())
    );
  }, [clerks, clerkSearch]);

  /* =============================
     DUPLICATE & VALIDATION
  ============================= */
  const duplicateKeys = useMemo(() => {
    const keys = items.map(i => {
      const name = i.name.trim().toLowerCase();
      const zones = (i.zones || []).slice().sort().join(",");
      return `${name}|${zones}`;
    });
    return keys.filter((k, i) => keys.indexOf(k) !== i);
  }, [items]);

  const hasErrors =
    items.some(i => !i.name.trim() || i.price == null || i.price <= 0) ||
    duplicateKeys.length > 0;

  /* =============================
     FETCH EXISTING ITEMS
  ============================= */
  const fetchExistingItems = async () => {
    try {
      setLoadingItems(true);
      const res = await fetch("/api/menu/view");
      const data = await res.json();

      if (!res.ok) {
        kravy.error();
        toast.error(data?.error || "Failed to load items");
        return;
      }

      setItems(
        data.map((i: any) => ({
          id: i.id,
          name: i.name,
          shortCode: i.shortCode ?? null,
          description: i.description || "",
          price: i.price,
          categoryId: i.categoryId ?? null,
          clerkId: i.clerkId ?? null,
          imageUrl: i.imageUrl ?? null,
          isActive: i.isActive ?? true,
          zones: i.zones || [],
        }))
      );

      setMode("update");
      kravy.success();
      toast.success("Items loaded for update");
    } catch {
      kravy.error();
      toast.error("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  /* =============================
     ENSURE CATEGORY
  ============================= */
  const ensureCategory = async (name: string) => {
    const res = await fetch("/api/categories/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const cat = await res.json();
    setCategories(prev =>
      prev.some(c => c.id === cat.id) ? prev : [...prev, cat]
    );
    return cat;
  };

  /* =============================
     FILE UPLOAD (CSV + EXCEL)
  ============================= */
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // smooth fake progress while parsing
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 5 : p));
      }, 150);

      if (file.name.endsWith(".csv")) {
        const Papa = (await import("papaparse")).default;

        Papa.parse(file, {
          header: false, // Parse as arrays first to find headers
          skipEmptyLines: true,
          complete: async (result) => {
            clearInterval(progressTimer);
            if (result.data && Array.isArray(result.data)) {
              const allRows = result.data as string[][];
              
              // Find the header row (scan first 20 rows)
              let headerIndex = 0;
              const keywords = ["name", "item", "price", "mrp", "rate", "category", "desc", "nam", "किमत", "मूल्य"];
              
              for (let i = 0; i < Math.min(20, allRows.length); i++) {
                const row = allRows[i].map(c => String(c).toLowerCase());
                const matchCount = row.filter(cell => keywords.some(k => cell.includes(k))).length;
                if (matchCount >= 2) {
                  headerIndex = i;
                  break;
                }
              }

              const headers = allRows[headerIndex];
              const dataRows = allRows.slice(headerIndex + 1).map(row => {
                const obj: any = {};
                headers.forEach((h, idx) => {
                  obj[h] = row[idx];
                });
                return obj;
              });

              setFileHeaders(headers);
              setUploadedRows(dataRows);
              
              // Try to auto-map
              setColumnMapping({
                name: headers.find(h => /name|dish|item|title|उत्पाद|नाम/i.test(String(h))) || "",
                shortCode: headers.find(h => /code|short|id|sku|कोड/i.test(String(h))) || "",
                price: headers.find(h => /price|selling|mrp|cost|rate|मूल्य|कीमत/i.test(String(h))) || "",
                category: headers.find(h => /category|group|type|श्रेणी|वर्ग/i.test(String(h))) || "",
                description: headers.find(h => /desc|info|detail|composition|विवरण/i.test(String(h))) || "",
                imageUrl: headers.find(h => /image|url|photo|img|link|फोटो/i.test(String(h))) || "",
                zones: headers.find(h => /zone|area|section|location|स्थान/i.test(String(h))) || ""
              });
              setMappingOpen(true);
            }
            setUploadProgress(100);
          },
          error: (err) => {
            clearInterval(progressTimer);
            throw err;
          }
        });
      } else {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        clearInterval(progressTimer);

        // Find the header row (scan first 20 rows)
        let headerIndex = 0;
        const keywords = ["name", "item", "price", "mrp", "rate", "category", "desc", "nam", "किमत", "मूल्य"];
        
        for (let i = 0; i < Math.min(20, allRows.length); i++) {
          const row = (allRows[i] || []).map((c: any) => String(c || "").toLowerCase());
          const matchCount = row.filter((cell: string) => keywords.some(k => cell.includes(k))).length;
          if (matchCount >= 2) {
            headerIndex = i;
            break;
          }
        }

        const headers = (allRows[headerIndex] || []).map((h: any) => String(h || ""));
        const dataRows = allRows.slice(headerIndex + 1).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((h: string, idx: number) => {
            if (h) obj[h] = row[idx];
          });
          return obj;
        });

        setFileHeaders(headers.filter(Boolean));
        setUploadedRows(dataRows);

        // Try to auto-map
        setColumnMapping({
          name: headers.find(h => /name|dish|item|title|उत्पाद|नाम/i.test(String(h))) || "",
          shortCode: headers.find(h => /code|short|id|sku|कोड/i.test(String(h))) || "",
          price: headers.find(h => /price|selling|mrp|cost|rate|मूल्य|कीमत/i.test(String(h))) || "",
          category: headers.find(h => /category|group|type|श्रेणी|वर्ग/i.test(String(h))) || "",
          description: headers.find(h => /desc|info|detail|composition|विवरण/i.test(String(h))) || "",
          imageUrl: headers.find(h => /image|url|photo|img|link|फोटो/i.test(String(h))) || "",
          zones: headers.find(h => /zone|area|section|location|स्थान/i.test(String(h))) || ""
        });
        setMappingOpen(true);
        setUploadProgress(100);
      }

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch {
      setUploading(false);
      setUploadProgress(0);
      kravy.error();
      toast.error("File upload failed");
    }
  };


  const processRows = async (rows: any[], overrideMapping?: any) => {
    const mapping = overrideMapping || { name: "name", price: "price", category: "category" };
    const total = rows.length;
    
    setUploading(true);
    setUploadProgress(5);
    
    // 1. Extract and Deduplicate Categories
    const uniqueCatNames = Array.from(new Set(
      rows.map(r => String(r[mapping.category] || "").trim()).filter(Boolean)
    ));

    // 2. Ensure Categories in Parallel
    const catMap: Record<string, string> = {};
    const existingCats = categories;

    const ensuredCats = await Promise.all(
      uniqueCatNames.map(async (name) => {
        const existing = existingCats.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing;
        return await ensureCategory(name);
      })
    );

    ensuredCats.forEach(c => {
      catMap[c.name.toLowerCase()] = c.id;
    });

    setUploadProgress(20);

    // 3. Process Items
    const newItems: StoreItem[] = [];
    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const name = String(row[mapping.name] || "").trim();
      if (!name) continue;

      const catName = String(row[mapping.category] || "").trim();
      const categoryId = catName ? (catMap[catName.toLowerCase()] || null) : null;

      const rawPrice = mapping.price ? String(row[mapping.price] || "0") : "0";
      const parsedPrice = parseFloat(rawPrice.replace(/[^\d.-]/g, '')) || 0;

      newItems.push({
        name,
        shortCode: mapping.shortCode ? String(row[mapping.shortCode] || "").trim() || null : null,
        description: mapping.description ? String(row[mapping.description] || "").trim() : "",
        price: parsedPrice,
        categoryId,
        clerkId: userId ?? null,
        imageUrl: mapping.imageUrl ? String(row[mapping.imageUrl] || "").trim() || null : null,
        isActive: true,
        isVeg: !/\b(nv|egg|chicken|mutton|fish|meat|pork|beef|non-veg|nonveg)\b/i.test(name) && !name.includes("(NV)"),
        isEgg: /\b(egg)\b/i.test(name),
        zones: mapping.zones ? String(row[mapping.zones] || "").split(",").map(z => z.trim().toUpperCase()).filter(Boolean) : [],
      });

      if (i % Math.max(1, Math.floor(total / 20)) === 0) {
        setUploadProgress(Math.min(98, 20 + Math.round((i / total) * 78)));
      }
    }

    setItems(newItems);
    setMode("create");
    setMappingOpen(false);
    
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(100);
      kravy.success();
      toast.success(`Lightning Fast Load: ${newItems.length} items`);
    }, 600);
  };

  const handleConfirmMapping = () => {
    if (!columnMapping.name || !columnMapping.price) {
      toast.error("Please map Name and Price columns");
      return;
    }
    processRows(uploadedRows, columnMapping);
  };

  /* =============================
     IMAGE UPLOAD
  ============================= */
  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    if (!res.ok) throw new Error();
    return (await res.json()).url;
  };

  const handleImageFile = async (file: File, index: number) => {
    try {
      const url = await uploadImage(file);
      setItems(prev =>
        prev.map((it, i) => (i === index ? { ...it, imageUrl: url } : it))
      );
    } catch {
      kravy.error();
      toast.error("Image upload failed");
    }
  };

  /* =============================
      ADD MANUAL ITEM             
  ============================= */
  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        shortCode: null,
        description: "",
        price: null,
        categoryId: null,
        clerkId: userId ?? null,
        imageUrl: null,
        isActive: true,
        zones: [],
      },
    ]);

    // keep mode consistent
    if (mode !== "create") {
      setMode("create");
    }
  };


  /* =============================
     SAVE / UPDATE
  ============================= */
  const saveItems = async () => {
    const res = await fetch("/api/store-items/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const data = await res.json();

    if (!res.ok) {
      kravy.error();
      toast.error(data?.error || "Save failed");
      return false;
    }

    kravy.success();
    toast.success(`${data.insertedCount} items saved successfully`);
    return true;
  };


  const updateItems = async () => {
    const validItems = items.filter(
      i => i.id && i.name.trim() && i.price != null
    );

    if (!validItems.length) {
      kravy.error();
      toast.error("No valid items to update");
      return false;
    }

    const res = await fetch("/api/store-items/bulk-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: validItems }),
    });

    if (!res.ok) {
      kravy.error();
      toast.error("Update failed");
      return false;
    }

    kravy.success();
    toast.success("Items updated successfully");
    return true;
  };

  const handleSave = async () => {
    if (saving) return;

    if (!items.length) {
      kravy.error();
      toast.error("No items");
      return;
    }

    if (hasErrors) {
      kravy.error();
      toast.error(
        mode === "update"
          ? "Fix highlighted rows before updating"
          : "Fix errors before saving"
      );
      return;
    }

    try {
      setSaving(true);

      let success = false;

      if (mode === "create") {
        success = await saveItems();
      } else {
        success = await updateItems();
      }

      if (success) {
        router.push("/dashboard/menu/view");
      }
    } finally {
      setSaving(false);
    }
  };
  const isRowInvalid = (item: StoreItem) => {
    const nameMissing = !item.name.trim();
    const priceInvalid = item.price == null || item.price <= 0;
    const name = item.name.trim().toLowerCase();
    const zones = (item.zones || []).slice().sort().join(",");
    const key = `${name}|${zones}`;
    const isDuplicate = item.name.trim() && duplicateKeys.includes(key);
    
    return nameMissing || priceInvalid || !!isDuplicate;
  };

  /* =============================
     SEARCH FILTER
  ============================= */

  let displayedItems = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  if (showErrorsOnly) {
    displayedItems = displayedItems.filter(i => isRowInvalid(i));
  }

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    setDragIndex(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      kravy.error();
      toast.error("Only image files allowed");
      return;
    }

    await handleImageFile(file, index);
  };


  /* =============================
     RENDER
  ============================= */
  return (
    <div className="p-6 space-y-8 bg-[var(--kravy-bg)] dark:bg-slate-950 min-h-full transition-colors duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--kravy-text-primary)] dark:text-white tracking-tight">Bulk Menu Upload</h1>
          <p className="text-sm font-medium text-[var(--kravy-text-muted)] mt-1">
            {mode === "create" ? "Bulk create items with spreadsheet upload" : "Edit and update your live menu items"}
          </p>
        </div>

        <div className="flex gap-3">
          {uploadedRows.length > 0 && (
            <button 
              onClick={() => setMappingOpen(true)} 
              className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <Settings2 size={18} /> Remap Columns
            </button>
          )}
          <button onClick={fetchExistingItems} className="px-5 py-2.5 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl font-bold hover:border-[var(--kravy-brand)] transition-all flex items-center gap-2" >
            Sync Existing
          </button>
          <button
            onClick={() => {
              setItems([]);
              setMode("create");
            }}
            className="px-5 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-bold hover:bg-rose-500/20 transition-all"
          >
            Clear Sheet
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Rows", value: items.length, icon: "📋", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Duplicates", value: duplicateKeys.length, icon: "⚠️", color: duplicateKeys.length > 0 ? "text-rose-600" : "text-emerald-600", bg: duplicateKeys.length > 0 ? "bg-rose-50" : "bg-emerald-50" },
          { label: "Mode", value: mode.toUpperCase(), icon: "⚡", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Status", value: hasErrors ? "Invalid" : "Ready", icon: "💎", color: hasErrors ? "text-rose-600" : "text-emerald-600", bg: hasErrors ? "bg-rose-50" : "bg-emerald-50" }
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} dark:bg-slate-800 ${stat.color} flex items-center justify-center text-xl shadow-inner`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-0.5">{stat.label}</div>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
            </div>
          </div>
        ))}
        
        {/* ROW FILTER TOGGLE */}
        <div 
          onClick={() => setShowErrorsOnly(!showErrorsOnly)}
          className={`bg-white dark:bg-slate-900 border cursor-pointer border-gray-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 ${showErrorsOnly ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/20' : ''}`}
        >
          <div className={`w-12 h-12 rounded-2xl ${showErrorsOnly ? 'bg-rose-500 text-white' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'} flex items-center justify-center text-xl shadow-inner`}>
            🚨
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-0.5">Filter</div>
            <div className={`text-sm font-black ${showErrorsOnly ? 'text-rose-600' : 'text-gray-600 dark:text-gray-400'}`}>
              {showErrorsOnly ? "Showing Errors Only" : "Show All Rows"}
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${showErrorsOnly ? 'bg-rose-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white dark:bg-slate-200 rounded-full transition-all ${showErrorsOnly ? 'left-6' : 'left-1'}`} />
          </div>
        </div>
      </div>

      {/* MAIN ACTIONS BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.02)] transition-colors">
        <div className="lg:col-span-5 relative group">
          <input
            type="file"
            id="file-upload"
            accept=".xlsx,.xls,.csv"
            disabled={uploading}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center gap-1 w-full border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[24px] py-6 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group/label"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center mb-1 group-hover/label:scale-110 transition-all duration-500">
              <span className="text-2xl">📤</span>
            </div>
            <span className="text-sm font-black text-gray-800 tracking-tight">
              {uploading ? "Analyzing Spreadsheet..." : "Upload CSV / Excel Sheet"}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drag & Drop or Click</span>
          </label>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-40">🔍</span>
            <input
              className="bg-gray-50/50 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white font-[600] h-[68px] pl-12 pr-4 w-full rounded-[24px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
              placeholder="Search in spreadsheet..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col justify-center">
          <button
            type="button"
            onClick={addManualItem}
            className="h-[68px] w-full bg-black text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span className="text-xl">✨</span> 
            Add New Row
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.04)] overflow-hidden mb-12 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm border-collapse">
            <thead className="bg-gray-50/50 dark:bg-slate-800/50">
              <tr>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Dish Image</th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Dish Context</th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Short Code</th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Composition</th>
                 <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Selling Price</th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left">Category</th>
                {multiZoneMenuEnabled && (
                  <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left relative">
                    Zones
                    <div className="mt-2 relative">
                      <input
                        className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-300 shadow-sm"
                        placeholder="Assign to all..."
                        value={zoneSearch}
                        onFocus={() => setShowZoneDropdown(true)}
                        onChange={(e) => setZoneSearch(e.target.value)}
                      />
                      {showZoneDropdown && (
                        <div className="absolute z-[100] mt-2 right-0 w-[240px] max-h-72 overflow-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                          {availableZones.filter(z => z.toLowerCase().includes(zoneSearch.toLowerCase())).map((z) => (
                            <div
                              key={z}
                              className="px-5 py-4 text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all mb-1 last:mb-0"
                              onClick={() => {
                                setBulkZone(z);
                                setItems((prev) =>
                                  prev.map((it) => ({
                                    ...it,
                                    zones: [z],
                                  }))
                                );
                                setShowZoneDropdown(false);
                                setZoneSearch(z);
                              }}
                            >
                              <span className="text-[13px] font-black">{z}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </th>
                )}
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-left relative">
                  Global Clerk
                  <div className="mt-2 relative">
                    <input
                      className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-300 shadow-sm"
                      placeholder="Assign to all..."
                      value={clerkSearch}
                      onFocus={() => setShowClerkDropdown(true)}
                      onChange={(e) => setClerkSearch(e.target.value)}
                    />
                    {showClerkDropdown && (
                      <div className="absolute z-[100] mt-2 right-0 w-[240px] max-h-72 overflow-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                        {filteredClerks.map((c) => (
                          <div
                            key={c.clerkId}
                           className="px-5 py-4 text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all mb-1 last:mb-0 group/clerk"
                            onClick={() => {
                              setBulkClerkId(c.clerkId);
                              setItems((prev) =>
                                prev.map((it) => ({
                                  ...it,
                                  clerkId: c.clerkId,
                                }))
                              );
                              setShowClerkDropdown(false);
                              setClerkSearch(c.label);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-[13px] font-black">{c.label}</span>
                              <span className="text-[10px] opacity-40 font-medium tracking-tight group-hover/clerk:opacity-100">{c.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 text-center">Active</th>
                <th className="py-7 px-8 text-[11px] font-black uppercase tracking-[0.25em] text-rose-400 text-center">Trash</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50/80 dark:divide-slate-800/80">
              {displayedItems.map((item, i) => {
                const invalid = isRowInvalid(item);
                return (
                  <tr
                    key={item.id ?? i}
                    className={`hover:bg-gray-50/30 transition-all group/row relative ${
                      invalid ? "bg-rose-50/30 border-l-4 border-l-rose-500" : ""
                    }`}
                  >
                  {/* IMAGE & URL INPUT */}
                  <td className="py-8 px-8">
                    <div className="flex flex-col gap-3">
                      <div
                        onDragOver={e => e.preventDefault()}
                        onDragEnter={() => setDragIndex(items.indexOf(item))}
                        onDragLeave={() => setDragIndex(null)}
                        onDrop={e => handleDrop(e, items.indexOf(item))}
                        className={`w-20 h-20 rounded-3xl shrink-0 overflow-hidden bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-center border-2 transition-all duration-500 relative group/img ${
                          dragIndex === items.indexOf(item) ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900 shadow-2xl scale-105" : "border-gray-100 dark:border-slate-800"
                        }`}
                      >
                        <label className="w-full h-full flex items-center justify-center cursor-pointer">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="object-cover w-full h-full transform transition-transform group-hover/img:scale-110" alt="Item" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 opacity-30 group-hover/img:opacity-100 transition-all">
                              <span className="text-2xl">📸</span>
                              <span className="text-[9px] font-black uppercase tracking-tighter">Upload</span>
                            </div>
                          )}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={e => e.target.files && handleImageFile(e.target.files[0], items.indexOf(item))}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Image URL..."
                         className="w-full max-w-[120px] text-[9px] bg-gray-50 dark:bg-slate-800 border border-transparent rounded-lg px-2 py-1.5 text-gray-400 dark:text-gray-500 font-bold outline-none focus:border-indigo-200 dark:focus:border-indigo-900 focus:bg-white dark:focus:bg-slate-700 focus:text-gray-700 dark:focus:text-slate-300 transition-all opacity-0 group-hover/row:opacity-100"
                        value={item.imageUrl ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems(prev =>
                            prev.map((it) =>
                              it === item ? { ...it, imageUrl: val } : it
                            )
                          )
                        }}
                      />
                    </div>
                  </td>

                  {/* NAME INPUT */}
                  <td className="py-8 px-8 align-top min-w-[300px]">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                          <input
                            className={`bg-gray-50/50 dark:bg-slate-800/50 border-2 ${!item.name.trim() ? "border-rose-200 dark:border-rose-900/50" : "border-gray-50 dark:border-slate-800"} rounded-2xl px-5 py-4 w-full text-base font-black text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-gray-600`}
                            placeholder="e.g. Butter Chicken Large"
                            value={item.name}
                            onChange={e => {
                              const val = e.target.value;
                              setItems(prev =>
                                prev.map((it) =>
                                  it === item ? { ...it, name: val } : it
                                )
                              )
                            }}
                          />
                          <button
                            type="button"
                            className="p-4 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-95 group/copy"
                            onClick={() => {
                              navigator.clipboard.writeText(item.name);
                              toast.success("Name copied!");
                            }}
                          >
                            <Copy size={20} className="group-hover/copy:scale-110 transition-transform" />
                          </button>
                       </div>
                       <div className="flex items-center gap-2 px-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Visible in digital menu</span>
                       </div>
                    </div>
                  </td>

                  {/* SHORT CODE INPUT */}
                  <td className="py-8 px-8 align-top min-w-[150px]">
                    <div className="flex flex-col gap-2">
                       <input
                         className={`bg-gray-50/50 dark:bg-slate-800/50 border-2 border-gray-50 dark:border-slate-800 rounded-2xl px-5 py-4 w-full text-base font-black text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-gray-600`}
                         placeholder="e.g. 1999"
                         value={item.shortCode ?? ""}
                         onChange={e => {
                           const val = e.target.value;
                           setItems(prev =>
                             prev.map((it) =>
                               it === item ? { ...it, shortCode: val } : it
                             )
                           )
                         }}
                       />
                    </div>
                  </td>

                  {/* DESCRIPTION INPUT */}
                  <td className="py-8 px-8 align-top min-w-[300px]">
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="bg-gray-50/50 dark:bg-slate-800/50 border-2 border-gray-50 dark:border-slate-800 rounded-2xl px-5 py-4 w-full text-sm font-bold text-gray-600 dark:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none h-[100px]"
                        placeholder="Describe the dish, ingredients, or story..."
                        value={item.description || ""}
                        onChange={e => {
                          const val = e.target.value;
                          setItems(prev =>
                            prev.map((it) =>
                              it === item ? { ...it, description: val } : it
                            )
                          )
                        }}
                      />
                    </div>
                  </td>

                  {/* PRICE INPUT */}
                  <td className="py-8 px-8 align-top">
                    <div className="relative group/price">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 font-black text-lg group-focus-within/price:text-emerald-500 transition-colors">₹</span>
                      <input
                        type="number"
                        className={`bg-gray-50/50 dark:bg-slate-800/50 border-2 ${(!item.price || item.price <= 0) ? "border-rose-200 dark:border-rose-900/50" : "border-gray-50 dark:border-slate-800"} rounded-2xl pl-11 pr-5 py-4 w-36 text-base font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-sm`}
                        placeholder="0"
                        value={item.price ?? ""}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setItems(prev =>
                            prev.map((it) =>
                              it === item ? { ...it, price: val } : it
                            )
                          )
                        }}
                      />
                    </div>
                  </td>

                  {/* CATEGORY SELECT */}
                  <td className="py-8 px-8 align-top">
                    <div className="relative">
                      <select
                        className="bg-gray-50/50 border-2 border-gray-50 rounded-2xl px-5 py-4 w-full text-xs font-black text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                        value={item.categoryId ?? ""}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val === "__new__") {
                            const newName = prompt("Enter new category name:");
                            if (newName && newName.trim()) {
                              try {
                                const cat = await ensureCategory(newName.trim());
                                setItems(prev =>
                                  prev.map((it) =>
                                    it === item ? { ...it, categoryId: cat.id } : it
                                  )
                                );
                                toast.success(`Created & assigned category: ${cat.name}`);
                              } catch {
                                toast.error("Failed to create category");
                              }
                            }
                          } else {
                            setItems(prev =>
                              prev.map((it) =>
                                it === item ? { ...it, categoryId: val } : it
                              )
                            );
                          }
                        }}
                      >
                        <option value="">Ungrouped</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="__new__" className="text-indigo-600 font-black">+ Create New</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <span className="text-[10px]">▼</span>
                      </div>
                    </div>
                  </td>

                  {/* ZONES INPUT */}
                  {multiZoneMenuEnabled && (
                    <td className="py-8 px-8 align-top">
                      <div className="flex flex-col gap-2">
                        <input
                          className="bg-gray-50/50 dark:bg-slate-800/50 border-2 border-gray-50 dark:border-slate-800 rounded-2xl px-4 py-3 w-full text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-indigo-400 transition-all shadow-sm placeholder:text-gray-300"
                          placeholder="e.g. Default, Rooftop"
                          list="item-zones-list"
                          value={item.zones?.join(", ") || ""}
                          onChange={(e) => {
                            const val = e.target.value.split(",").map(z => z.trim()).filter(Boolean);
                            setItems(prev =>
                              prev.map((it) =>
                                it === item ? { ...it, zones: val } : it
                              )
                            )
                          }}
                        />
                        <datalist id="item-zones-list">
                          {availableZones.map(z => <option key={z} value={z} />)}
                        </datalist>
                      </div>
                    </td>
                  )}

                  {/* CLERK SELECT */}
                  <td className="py-8 px-8 align-top">
                    <div className="relative">
                      <select
                        className="bg-gray-50/50 border-2 border-gray-50 rounded-2xl px-5 py-4 w-full text-xs font-black text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                        value={item.clerkId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((it) =>
                              it === item ? { ...it, clerkId: val } : it
                            )
                          )
                        }}
                      >
                        <option value="">No Assignment</option>
                        {clerks.map((c) => (
                          <option key={c.clerkId} value={c.clerkId}>{c.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <span className="text-[10px]">▼</span>
                      </div>
                    </div>
                  </td>

                  {/* ACTIVE STATUS */}
                  <td className="py-8 px-8 text-center align-top">
                    <div className="flex items-center justify-center pt-2">
                      <label className="relative inline-flex items-center cursor-pointer group/toggle">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={item.isActive}
                          onChange={e => {
                            const checked = e.target.checked;
                            setItems(prev =>
                              prev.map((it) =>
                                it === item ? { ...it, isActive: checked } : it
                              )
                            )
                          }}
                        />
                        <div className="w-14 h-7 bg-gray-100 dark:bg-slate-800 peer-focus:outline-none peer-focus:ring-8 peer-focus:ring-indigo-500/5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:shadow-md after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </td>

                  {/* DELETE BUTTON */}
                  <td className="py-8 px-8 text-center align-top">
                    <button
                      className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-400 rounded-2xl shadow-sm hover:bg-rose-500 hover:text-white hover:shadow-rose-500/20 transition-all duration-300 active:scale-90"
                      onClick={() => {
                        setItems(prev => prev.filter((it) => it !== item));
                        kravy.error();
                      }}
                    >
                      <Trash2 size={24} />
                    </button>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col items-center gap-10 mt-10">
        {hasErrors && (
          <div className="w-full max-w-3xl bg-rose-50 border-2 border-rose-100 rounded-[32px] p-8 flex items-center gap-6 animate-in slide-in-from-bottom-10 duration-700">
            <div className="w-16 h-16 rounded-[24px] bg-rose-500 text-white flex items-center justify-center text-3xl shadow-xl shadow-rose-200">
               ⚠️
            </div>
            <div>
              <h4 className="text-rose-900 font-black text-lg">Incomplete Information</h4>
              <p className="text-rose-600/70 text-sm font-bold uppercase tracking-widest mt-0.5">
                Check highlighted rows for missing dish names or invalid pricing.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={hasErrors || saving}
          className={`group relative overflow-hidden w-full max-w-[560px] h-[96px] rounded-[40px] font-black uppercase tracking-[0.4em] text-[15px] shadow-[0_30px_60px_rgba(79,70,229,0.15)] transition-all duration-700 active:scale-[0.97] ${
            hasErrors || saving
              ? "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-100 shadow-none"
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-2"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <div className="relative flex items-center justify-center gap-5">
            {saving ? (
              <>
                <RefreshCw size={32} className="animate-spin text-white/50" />
                <span>{mode === "create" ? "Building Menu..." : "Syncing Cloud..."}</span>
              </>
            ) : (
              <>
                <span className="text-4xl group-hover:scale-125 transition-transform duration-500">✨</span>
                <span>{mode === "create" ? "Launch Digital Menu" : "Push Updates Live"}</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* COLUMN MAPPING OVERLAY */}
      <AnimatePresence>
        {mappingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Map Your Columns</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Aligning Spreadsheet Data with Store Schema</p>
                </div>
                <button 
                  onClick={() => setMappingOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                {[
                  { key: "name", label: "Dish Name", icon: "🍱", required: true },
                  { key: "description", label: "Description", icon: "📝", required: false },
                  { key: "price", label: "Selling Price", icon: "💰", required: true },
                  { key: "category", label: "Category", icon: "🏷️", required: false },
                  { key: "imageUrl", label: "Image URL", icon: "🖼️", required: false },
                  ...(multiZoneMenuEnabled ? [{ key: "zones", label: "Zones (Comma Separated)", icon: "📍", required: false }] : [])
                ].map((field: any) => (
                  <div key={field.key} className="flex items-center gap-6 p-4 rounded-3xl bg-gray-50/50 border border-gray-100/50">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl shadow-sm">
                      {field.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
                        Map to: {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </div>
                      <select
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
                        value={columnMapping[field.key as keyof typeof columnMapping]}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      >
                        <option value="">Select Column from Excel...</option>
                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {columnMapping[field.key as keyof typeof columnMapping] && (
                        <div className="mt-2 flex items-center gap-2 px-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                          <span className="text-[10px] font-bold text-indigo-500/80 uppercase truncate">
                            Preview: {String(uploadedRows[0]?.[columnMapping[field.key as keyof typeof columnMapping]] || "---")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex gap-4">
                <button
                  onClick={() => setMappingOpen(false)}
                  className="flex-1 h-16 rounded-3xl border-2 border-gray-100 font-black text-gray-400 uppercase tracking-widest text-[11px] hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMapping}
                  className="flex-[2] h-16 rounded-3xl bg-black text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-600 shadow-2xl shadow-indigo-100 transition-all"
                >
                  Process Import <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploading && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white rounded-[48px] p-12 w-full max-w-md text-center shadow-[0_50px_100px_rgba(0,0,0,0.3)] animate-in zoom-in-90 duration-500 border border-gray-100">
            <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner relative overflow-hidden">
               <RefreshCw size={48} className="text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Importing Items</h2>
            <p className="text-gray-400 font-black text-[10px] mb-10 uppercase tracking-[0.3em]">Optimizing your Digital Ecosystem</p>

            <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 transition-all duration-1000 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-6 flex justify-between items-end">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{uploadProgress < 100 ? "Processing..." : "Verified"}</span>
               <span className="text-3xl font-black text-indigo-600">{uploadProgress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

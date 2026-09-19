
// src/app/menu/view/page.tsx

// "use client";

// import { useAuth } from "@clerk/nextjs";
// import { useEffect, useMemo, useState } from "react";
// import Image from "next/image";
// import { motion, AnimatePresence } from "framer-motion";

// type MenuItem = {
//   id: string;
//   name: string;
//   price?: number | null;
//   imageUrl?: string | null;
//   unit?: string | null;
//   categoryId?: string | null;
// };

// type MenuCategory = {
//   id: string;
//   name: string;
//   items: MenuItem[];
// };

// type CartItem = MenuItem & { quantity: number };

// export default function ViewMenuPage() {
//   const { getToken } = useAuth();
//   const [menus, setMenus] = useState<MenuCategory[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const [cart, setCart] = useState<Record<string, CartItem>>({});
//   const [activeCategory, setActiveCategory] = useState<string | null>(null);

//   // guard Audio for SSR
//   const addSound =
//     typeof window !== "undefined" && typeof Audio !== "undefined"
//       ? new Audio("/sounds/add.mp3")
//       : null;
//   const removeSound =
//     typeof window !== "undefined" && typeof Audio !== "undefined"
//       ? new Audio("/sounds/remove.mp3")
//       : null;

//   useEffect(() => {
//     const fetchMenus = async () => {
//       setLoading(true);
//       setError(null);

//       try {
//         // try to get token (not strictly required if you use Clerk middleware),
//         // but calling getToken keeps compatibility if backend expects bearer token.
//         let token: string | undefined;
//         try {
//           token = await getToken();
//         } catch {
//           token = undefined;
//         }

//         const headers: Record<string, string> = {
//           "Content-Type": "application/json",
//         };
//         if (token) {
//           headers["Authorization"] = `Bearer ${token}`;
//         }

//         // include credentials so cookies set by Clerk middleware are sent
//         const res = await fetch("/api/menu/view", {
//   method: "GET",
//   credentials: "include",
// });


//         if (!res.ok) {
//           const text = await res.text().catch(() => "");
//           throw new Error(text || `Failed to fetch menus (${res.status})`);
//         }

//         const data = await res.json().catch(() => ({}));

//         // support different response shapes:
//         // 1) { menus: MenuCategory[] }
//         // 2) { items: Item[], categories: Category[] } -> convert to MenuCategory[]
//         if (Array.isArray(data.menus)) {
//           setMenus(data.menus);
//           if (data.menus.length > 0) setActiveCategory(data.menus[0].id);
//         console.error("Error fetching menus:", err);
//         setError(err?.message ?? "Something went wrong");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchMenus();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [getToken]); // getToken stable by Clerk; keep it in deps

//   const addToCart = (item: MenuItem) => {
//     setCart((prev) => {
//       const existing = prev[item.id];
//       return {
//         ...prev,
//         [item.id]: { ...item, quantity: existing ? existing.quantity + 1 : 1 },
//       };
//     });

//     if (addSound) {
//       addSound.currentTime = 0;
//       void addSound.play().catch(() => {});
//     }
//   };

//   const removeFromCart = (item: MenuItem) => {
//     setCart((prev) => {
//       const existing = prev[item.id];
//       if (!existing) return prev;

//       if (removeSound) {
//         removeSound.currentTime = 0;
//         void removeSound.play().catch(() => {});
//       }

//       if (existing.quantity === 1) {
//         const newCart = { ...prev };
//         delete newCart[item.id];
//         return newCart;
//       }
//       return { ...prev, [item.id]: { ...existing, quantity: existing.quantity - 1 } };
//     });
//   };

//   const scrollToCategory = (id: string) => {
//     const el = document.getElementById(`cat-${id}`);
//     if (el) {
//       el.scrollIntoView({ behavior: "smooth", block: "start" });
//       setActiveCategory(id);
//     }
//   };

//   const totalPrice = Object.values(cart).reduce((sum, item) => sum + ((item.price ?? 0) * item.quantity), 0);
//   const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

//   // render
//   if (loading) return <p className="p-4 text-center">Loading...</p>;
//   if (error) return <p className="p-4 text-red-500 text-center">Error: {error}</p>;

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar - Categories */}
//       <div className="w-1/5 bg-white border-r shadow-sm overflow-y-auto p-4">
//         <h2 className="font-bold text-xl mb-6 text-gray-700">Categories</h2>
//         <ul className="space-y-3">
//           {menus.map((cat) => (
//             <li key={cat.id}>
//               <button
//                 onClick={() => scrollToCategory(cat.id)}
//                 className={`w-full text-left px-4 py-2 rounded-lg font-medium transition ${
//                   activeCategory === cat.id
//                     ? "bg-green-500 text-white"
//                     : "hover:bg-green-100 hover:text-green-700 text-gray-800"
//                 }`}
//               >
//                 {cat.name} <span className="text-xs text-slate-500 ml-2">({cat.items.length})</span>
//               </button>
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Right - Items */}
//       <div className="flex-1 overflow-y-auto p-4 md:p-6">
//         <h1 className="text-2xl font-bold mb-6 text-gray-800">Products</h1>
//         <div className="space-y-12">
//           {menus.map((cat) => (
//             <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-20">
//               <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">{cat.name}</h2>
//               {cat.items.length === 0 ? (
//                 <p className="text-sm text-gray-500 mb-4">No items in this category.</p>
//               ) : (
//                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
//                   {cat.items.map((item) => {
//                     const inCart = cart[item.id]?.quantity || 0;
//                     return (
//                       <div
//                         key={item.id}
//                         className={`border rounded-2xl p-2 shadow-md hover:shadow-xl transition relative cursor-pointer flex flex-col items-center ${
//                           inCart > 0 ? "bg-green-100" : "bg-white"
//                         }`}
//                         onClick={() => addToCart(item)}
//                         
//                         
//                       >
//                         {inCart > 0 && (
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               removeFromCart(item);
//                             }}
//                             className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-lg shadow hover:bg-red-600 transition z-10"
//                             aria-label="remove one"
//                           >
//                             -
//                           </button>
//                         )}

//                         <div className="w-full h-32 relative rounded-xl overflow-hidden mb-2">
//                           {item.imageUrl ? (
//                             // next/image requires parent relative and fill for  fill
//                             <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
//                           ) : (
//                             <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 rounded-xl">
//                               No Image
//                             </div>
//                           )}
//                         </div>

//                         <div className="flex flex-col items-center text-center">
//                           <h3 className="font-semibold text-gray-800 line-clamp-2">{item.name}</h3>
//                           <p className="text-green-600 font-bold mt-1">
//                             ₹{(item.price ?? 0).toFixed(2)}
//                           </p>
//                           {item.unit && <p className="text-xs text-gray-500 mt-1">{item.unit}</p>}
//                         </div>

//                         <AnimatePresence>
//                           {inCart > 0 && (
//                             <div
//                               key={inCart}
//                               className="absolute bottom-2 left-2 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg"
//                               
//                               
//                               
//                               transition={{ type: "spring", stiffness: 500, damping: 20 }}
//                             >
//                               {inCart}
//                             </div>
//                           )}
//                         </AnimatePresence>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </section>
//           ))}
//         </div>

//         {/* Bottom Cart Bar */}
//         {totalItems > 0 && (
//           <div
//             className="fixed bottom-0 left-0 right-0 bg-white shadow-xl border-t z-50 px-4 py-3 flex justify-between items-center md:px-6"
//             
//             
//             transition={{ type: "spring", stiffness: 200 }}
//           >
//             <div className="flex flex-col md:flex-row gap-2 md:gap-4 font-semibold text-gray-800">
//               <span>🛒 {totalItems} item{totalItems > 1 ? "s" : ""}</span>
//               <span>Total: ₹{totalPrice.toFixed(2)}</span>
//             </div>

//             <button
//               onClick={() => {
//                 try {
//                   localStorage.setItem("pendingCart", JSON.stringify(cart));
//                   localStorage.setItem("pendingTotal", totalPrice.toString());
//                   window.location.href = "/billing";
//                 } catch (e) {
//                   console.error("Failed to save cart to localStorage", e);
//                 }
//               }}
//               className="bg-blue-600 px-4 py-2 rounded-xl text-white font-semibold hover:bg-green-700 transition"
//             >
//               ✅ Generate Payment Slip
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// last updated code above



















































//src/app/menu/view/page.tsx

"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, ChevronDown, Trash2, Pencil, RotateCcw, Check, X, Sparkles, Image as ImageIcon, Loader2, Globe, Zap, Printer, File, Heart, Copy, GripVertical, IndianRupee, Layers, LayoutGrid, ListFilter, Edit2, MonitorSmartphone } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter, useSearchParams } from "next/navigation";
import ItemModal from "@/components/MenuEditor/ItemModal";
import { useConfirm } from "@/components/ConfirmContext";

/* types */
type MenuItem = {
  id: string;
  name: string;
  price?: number | null;
  sellingPrice?: number | null;
  imageUrl?: string | null;
  unit?: string | null;
  categoryId?: string | null;
  description?: string | null;
  isVeg: boolean;
  isEgg: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  isNew: boolean;
  spiciness?: string | null;
  rating?: number | null;
  hiName?: string | null;
  mrName?: string | null;
  taName?: string | null;
  upsellText?: string | null;
  taxStatus?: string | null;
  gst?: number | null;
  hsnCode?: string | null;
  shortCode?: string | null;
  isActive: boolean;
  expiryDate?: string | null;
  isFavorite: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  sortOrder?: number | null;
  items: MenuItem[];
  zones?: string[];
};

type CartItem = MenuItem & { quantity: number };

function formatPrice(v?: number | null) {
  return `₹${((v ?? 0)).toFixed(2)}`;
}
export default function ViewMenuPage() {
    const { confirm } = useConfirm();


  const [menus, setMenus] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expiryTrackingEnabled, setExpiryTrackingEnabled] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const asUserId = searchParams.get("asUserId");

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [selectedMerchantClerkId, setSelectedMerchantClerkId] = useState<string>("");
  const [searchMerchantQuery, setSearchMerchantQuery] = useState("");
  const [isMerchantDropdownOpen, setIsMerchantDropdownOpen] = useState(false);

  const selectedMerchantLabel = useMemo(() => {
    if (!selectedMerchantClerkId) return "-- View My Own Menu --";
    const found = merchants.find((m) => m.clerkId === selectedMerchantClerkId);
    return found ? `${found.name} (${found.email})` : selectedMerchantClerkId;
  }, [merchants, selectedMerchantClerkId]);

  const filteredMerchants = useMemo(() => {
    const q = searchMerchantQuery.toLowerCase().trim();
    if (!q) return merchants;
    return merchants.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [merchants, searchMerchantQuery]);

  // Image search side panel states
  const [imageSearchItem, setImageSearchItem] = useState<MenuItem | null>(null);
  const [searchImageQuery, setSearchImageQuery] = useState("");
  const [searchedImages, setSearchedImages] = useState<{ url: string; title?: string }[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [visibleImagesCount, setVisibleImagesCount] = useState(12);
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(null);
  const [searchProvider, setSearchProvider] = useState<"foodsnap" | "global">("foodsnap");

  // Upload New Menu States
  const [showUploadMenuModal, setShowUploadMenuModal] = useState(false);
  const [aiLanguagePref, setAiLanguagePref] = useState("english");
  const [chunkingMode, setChunkingMode] = useState<"batch" | "single" | "stream">("batch");
  const [menuFileQueue, setMenuFileQueue] = useState<File[]>([]);
  const [extractingMenu, setExtractingMenu] = useState(false);
  const [extractedMenuProgress, setExtractedMenuProgress] = useState({ completed: 0, total: 0 });
  const [extractedMenuItems, setExtractedMenuItems] = useState<any[]>([]);
  const [selectedAiZone, setSelectedAiZone] = useState<string>("");
  const [newAiZone, setNewAiZone] = useState<string>("");
  const [isCreatingAiZone, setIsCreatingAiZone] = useState<boolean>(false);
  const [savingExtractedMenu, setSavingExtractedMenu] = useState(false);
  const [business, setBusiness] = useState<any>(null);

  // Sync All state
  const [syncProgress, setSyncProgress] = useState<{ completed: number; total: number } | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // filters & UI
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");
  const [filterZone, setFilterZone] = useState<string | "all">("all");
  const [availableZones, setAvailableZones] = useState<string[]>(["MAIN KITCHEN", "BAR", "GRILL", "BAKERY", "COUNTER"]);
  const [filterHasImage, setFilterHasImage] = useState<"any" | "only" | "no">("any");
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [sortMode, setSortMode] = useState<
    "alpha_asc" | "alpha_desc" | "price_asc" | "price_desc"
  >("alpha_asc");

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [menuLayout, setMenuLayout] = useState<'grid' | 'list'>('grid');
  const [toast, setToast] = useState<string | null>(null);
  
  const [wipeZone, setWipeZone] = useState<string>("All");
  const [catSearch, setCatSearch] = useState("");

  // Quick Add states
  const [quickAddCat, setQuickAddCat] = useState<{ id: string; name: string } | null>(null);
  const [quickAddDietary, setQuickAddDietary] = useState<"veg" | "nv" | "egg">("veg");
  const [quickAddTaxStatus, setQuickAddTaxStatus] = useState("Without Tax");
  const [quickAddGst, setQuickAddGst] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Inline editing state
  const [editingField, setEditingField] = useState<{ id: string, field: "name" | "price" | "expiryDate" | "zone", value: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [quickAddImage, setQuickAddImage] = useState<string | null>(null);

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkDiet, setBulkDiet] = useState<"veg" | "egg" | "nv" | null>(null);
  const [bulkZone, setBulkZone] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  const [addonGroups, setAddonGroups] = useState<any[]>([]);
  const detectDiet = (name: string) => {
    if (name.toUpperCase().includes("(NV)")) return "nv";
    if (name.toUpperCase().includes("(V)")) return "veg";
    return null;
  };

  const handleMerchantChange = (clerkId: string) => {
    setSelectedMerchantClerkId(clerkId);
    if (clerkId) {
      router.push(`/dashboard/menu/view?asUserId=${clerkId}`);
    } else {
      router.push("/dashboard/menu/view");
    }
  };

  const handleWipeMenu = async () => {
    if (!await confirm("Are you sure you want to WIPE this customer's entire menu? This is permanent and deletes all products and categories.")) return;
    try {
      const deleteUrl = asUserId ? `/api/items?all=true&asUserId=${asUserId}` : `/api/items?all=true`;
      const res = await fetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setMenus([]);
      setToast("Customer's menu wiped clean!");
    } catch (e: any) {
      console.error(e);
      setToast("Failed to wipe menu: " + e.message);
    }
  };

  const handleDeleteAllBills = async () => {
    if (!selectedMerchantClerkId) {
      setToast("Please select a merchant first.");
      return;
    }
    const foundMerchant = merchants.find((m) => m.clerkId === selectedMerchantClerkId);
    if (!foundMerchant) return;
    
    if (!await confirm(`Are you sure you want to PERMANENTLY delete ALL BILLS for ${foundMerchant.email}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch("/api/admin/bills/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: foundMerchant.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete bills");
      setToast(data.message || `Deleted ${data.count} bills.`);
    } catch (e: any) {
      console.error(e);
      setToast("Error: " + e.message);
    }
  };

  const handleSearchImages = async (forcedQuery?: string, provider?: "foodsnap" | "global") => {
    const q = forcedQuery || searchImageQuery.trim();
    if (!q) return;
    setSearchingImages(true);
    setVisibleImagesCount(12);

    const activeProvider = provider || searchProvider;
    try {
      let photos = [];
      if (activeProvider === "foodsnap") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
          const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            photos = data.data || [];
          }
        } catch (err) {
          console.warn("FoodSnap search failed, falling back to Deep Search...", err);
        }
      } else {
        const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(q)}&offset=0`);
        if (resDeep.ok) {
          const dataDeep = await resDeep.json();
          photos = dataDeep.data || [];
        }
      }

      const results = photos.map((p: any) => ({
        url: p.image_url || p.image || p.url || p.imageUrl,
        title: p.title || p.name || ""
      })).filter((x: any) => Boolean(x.url));

      setSearchedImages(results);
    } catch (e) {
      console.error(e);
      setToast("Failed to search images");
    } finally {
      setSearchingImages(false);
    }
  };

  const toggleSearchProvider = () => {
    const nextProvider = searchProvider === "foodsnap" ? "global" : "foodsnap";
    setSearchProvider(nextProvider);
    handleSearchImages(searchImageQuery, nextProvider);
  };

  const startParsingMenuFiles = async () => {
    if (menuFileQueue.length === 0) return;
    setExtractingMenu(true);
    setExtractedMenuProgress({ completed: 0, total: 0 });

    if (chunkingMode !== "stream") {
      setExtractedMenuItems([]);
    }

    let combinedMenu: any[] = [];
    const filesToProcess = chunkingMode === "single" ? [menuFileQueue[0]] : [...menuFileQueue];
    
    if (chunkingMode === "single") {
      setMenuFileQueue(prev => prev.slice(1));
    } else {
      setMenuFileQueue([]);
    }

    for (let file of filesToProcess) {
      try {
        const formData = new FormData();
        formData.append("menuFile", file);
        formData.append("languagePref", aiLanguagePref);

        // Step 1: Fast Parse
        const parseRes = await fetch("/api/menu/upload-ocr?parseOnly=true", {
          method: "POST",
          body: formData
        });

        const parseText = await parseRes.text();
        if (!parseRes.ok) throw new Error(`Parsing failed: ${parseText || parseRes.statusText}`);
        let parseData: any = {};
        try {
          parseData = JSON.parse(parseText);
        } catch (e) {
          throw new Error(`Parsing response invalid: ${parseText}`);
        }
        if (!parseData.success || !parseData.partsArray) {
          throw new Error("Failed to parse file for AI processing");
        }

        // Step 2: Get Key
        const keyRes = await fetch("/api/menu/get-keys");
        const keyText = await keyRes.text();
        if (!keyRes.ok) throw new Error(`Failed to fetch API key: ${keyText}`);
        let keyData: any = {};
        try {
          keyData = JSON.parse(keyText);
        } catch (e) {
          throw new Error(`Invalid key response: ${keyText}`);
        }
        const { apiKey } = keyData;
        if (!apiKey) throw new Error("API Key missing on server (Ensure GEMINI_API_KEY is set in .env)");

        // Step 3: Call Gemini
        const modelsToTry = [
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-flash-latest"
        ];
        const apiKeys = apiKey.split(',').map((k: string) => k.trim());
        let textResponse = "";
        
        for (const model of modelsToTry) {
          for (const currentKey of apiKeys) {
            try {
              const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: parseData.partsArray }],
                  generationConfig: { responseMimeType: "application/json" }
                })
              });
              const gemText = await geminiRes.text();
              if (geminiRes.ok) {
                const geminiData = JSON.parse(gemText);
                textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textResponse) break; // Break API key loop
              }
            } catch {}
          }
          if (textResponse) break; // Break model loop
        }

        if (!textResponse) throw new Error("Gemini models failed to extract menu.");

        // Step 4: Post Process
        let parsedJson;
        try {
            let cleanText = textResponse.trim();
            if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
            if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
            if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
            
            cleanText = cleanText.replace(/[\n\r\t]+/g, ' ');
            
            // Remove trailing commas inside objects and arrays (fixes "Expected double-quoted property name")
            cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            
            parsedJson = JSON.parse(cleanText);
        } catch (parseErr: any) {
            console.warn("JSON parse failed, attempting auto-repair...", parseErr);
            let cleanText = textResponse.replace(/[\n\r]+/g, ' ');
            cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            let repaired = cleanText.replace(/,[^,]*$/, ''); 
            
            const closingOptions = [']', '}]', ']}', ']}]}', '}', '}}', '}]}'];
            let success = false;
            
            for (const closing of closingOptions) {
                try {
                    parsedJson = JSON.parse(repaired + closing);
                    success = true;
                    break;
                } catch(e) {}
            }
            
            if (!success) {
                repaired = repaired.replace(/,[^,]*$/, '');
                for (const closing of closingOptions) {
                    try {
                        parsedJson = JSON.parse(repaired + closing);
                        success = true;
                        break;
                    } catch(e) {}
                }
            }
            
            if (!success) {
                // Bulletproof strategy: discard the broken object completely by truncating at the last '}'
                const lastBrace = textResponse.lastIndexOf('}');
                if (lastBrace !== -1) {
                    let aggressiveRepair = textResponse.substring(0, lastBrace + 1);
                    for (const closing of closingOptions) {
                        try {
                            parsedJson = JSON.parse(aggressiveRepair + closing);
                            success = true;
                            break;
                        } catch(e) {}
                    }
                }
            }
            
            if (!success) {
                throw new Error(`AI JSON is truncated and cannot be parsed. Try a smaller file. Error: ${parseErr.message}`);
            }
        }
        const processRes = await fetch("/api/menu/post-process", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedJson)
        });
        if (!processRes.ok) throw new Error("Post-processing failed");
        const processedData = await processRes.json();
        const items = processedData.menu || [];

        if (items.length > 0) {
          const newItems = items.map((item: any) => ({
            ...item,
            _tempId: Math.random().toString(36).substr(2, 9),
            checked: true,
            imageUrl: null,
            img_status: 'loading'
          }));
          combinedMenu = combinedMenu.concat(newItems);

          if (chunkingMode === "stream") {
            setExtractedMenuItems(prev => [...prev, ...newItems]);
            // Run image search for this chunk in the background
            autoApplyExtractedImages(newItems, true);
          }
        }
      } catch (err: any) {
        console.error(err);
        setToast(`Error processing ${file.name}: ${err.message}`);
      }
    }

    if (chunkingMode !== "stream") {
      if (combinedMenu.length > 0) {
        setExtractedMenuItems(combinedMenu);
        autoApplyExtractedImages(combinedMenu, false);
      } else {
        setExtractingMenu(false);
      }
    } else {
      setExtractingMenu(false);
    }
  };

  const autoApplyExtractedImages = async (items: any[], isStream = false) => {
    const total = items.length;
    let completed = 0;

    const chunkSize = 3;
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const promises = chunk.map(async (item) => {
        let foundImg = null;
        let foundStatus = 'empty';
        try {
          const rawName = item.item_name || item.name || "";
          const cleanName = rawName.replace(/^\(v\)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
          
          const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(cleanName)}`);
          if (res.ok) {
            const data = await res.json();
            const photos = data.data || [];
            if (photos.length > 0) {
              const firstImg = photos[0].image_url || photos[0].image || photos[0].url || photos[0].imageUrl;
              if (firstImg) {
                foundImg = firstImg;
                foundStatus = 'success';
              }
            }
          }
        } catch {
          foundStatus = 'error';
        }

        // Functional state update to avoid overriding stream data
        setExtractedMenuItems(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(u => u._tempId === item._tempId);
          if (idx > -1) {
            updated[idx].imageUrl = foundImg;
            updated[idx].img_status = foundStatus;
          }
          return updated;
        });

        completed++;
        if (!isStream) {
          setExtractedMenuProgress({ completed, total });
        }
      });
      await Promise.all(promises);
    }
    if (!isStream) {
      setExtractingMenu(false);
    }
  };

  const handleAddExtractedMenu = async () => {
    const selectedItems = extractedMenuItems.filter(item => item.checked);
    if (selectedItems.length === 0) {
      setToast("Please select at least one item to add.");
      return;
    }

    setSavingExtractedMenu(true);
    try {
      let existingCatsRes = await fetch("/api/categories", {
        headers: asUserId ? { "x-impersonate-id": asUserId } : {}
      });
      let existingCats = await existingCatsRes.json();
      if (!Array.isArray(existingCats)) existingCats = [];

      const categoriesMap = new Map<string, string>();
      existingCats.forEach((c: any) => {
        categoriesMap.set(c.name.toLowerCase().trim(), c.id);
      });

      for (const item of selectedItems) {
        let categoryName = (item.category || item.category_name || "General").trim();
        let catKey = categoryName.toLowerCase();
        let categoryId = categoriesMap.get(catKey);

        if (!categoryId) {
          const catRes = await fetch("/api/categories", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(asUserId ? { "x-impersonate-id": asUserId } : {})
            },
            body: JSON.stringify({ name: categoryName })
          });
          if (catRes.ok) {
            const newCat = await catRes.json();
            categoryId = newCat.id || newCat.category?.id;
            if (categoryId) {
              categoriesMap.set(catKey, categoryId);
            }
          }
        }

        const rawName = item.item_name || item.name || "Unnamed Item";
        const isVegVal = item.type?.toLowerCase().includes("veg") && !item.type?.toLowerCase().includes("non");
        const isEggVal = item.type?.toLowerCase().includes("egg");
        
        await fetch("/api/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(asUserId ? { "x-impersonate-id": asUserId } : {})
          },
          body: JSON.stringify({
            name: rawName,
            price: Number(item.price || item.price_default || 0),
            categoryId,
            imageUrl: item.imageUrl || null,
            isVeg: isVegVal,
            isEgg: isEggVal,
            zones: selectedAiZone ? [selectedAiZone] : [],
            description: item.description || "",
            variants: item.variants || undefined
          })
        });
      }

      setToast("Menu items successfully merged!");
      setShowUploadMenuModal(false);
      await fetchMenus(); 
    } catch (err: any) {
      console.error(err);
      setToast("Failed to merge menu items");
    } finally {
      setSavingExtractedMenu(false);
    }
  };

  const handleRemoveImage = async (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: item.id, imageUrl: null }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      
      setMenus(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(it => it.id === item.id ? { ...it, imageUrl: null } : it)
      })));
      setToast(`Image removed for ${item.name}`);
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Remove failed");
    }
  };

  const handleClearAllImages = async () => {
    if (!await confirm("Are you sure you want to remove ALL menu images? This action cannot be undone.")) return;
    try {
      const res = await fetch("/api/items/clear-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        }
      });
      if (!res.ok) throw new Error("Failed to clear all images");
      
      setMenus(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(it => ({ ...it, imageUrl: null }))
      })));
      setToast("All images removed successfully");
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Failed to clear all images");
    }
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    setDraggedOverItemId(itemId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverItemId(null);
  };

  const handleDrop = async (e: React.DragEvent, item: MenuItem) => {
    e.preventDefault();
    setDraggedOverItemId(null);

    // Check for internal image drag and drop
    const internalData = e.dataTransfer.getData("application/json");
    if (internalData) {
      try {
        const { sourceImageUrl } = JSON.parse(internalData);
        if (sourceImageUrl) {
          if (sourceImageUrl === item.imageUrl) return; // Dropped on itself
          setToast(`Applying image to ${item.name}...`);
          
          const saveRes = await fetch("/api/items", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(asUserId ? { "x-impersonate-id": asUserId } : {})
            },
            body: JSON.stringify({ id: item.id, imageUrl: sourceImageUrl })
          });

          if (saveRes.ok) {
            setMenus(prev => prev.map(cat => ({
              ...cat,
              items: cat.items.map(it => it.id === item.id ? { ...it, imageUrl: sourceImageUrl } : it)
            })));
            setToast("Image applied successfully!");
          } else {
            throw new Error("Failed to save image reference");
          }
          return; // Exit early since we handled the internal drag
        }
      } catch (err) {
        console.error("Failed to parse internal drag data", err);
      }
    }

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToast("Only image files are allowed!");
      return;
    }

    setToast(`Uploading image for ${item.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: asUserId ? { "x-impersonate-id": asUserId } : {},
        body: formData
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const newImgUrl = uploadData.secure_url;

      if (newImgUrl) {
        const saveRes = await fetch("/api/items", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(asUserId ? { "x-impersonate-id": asUserId } : {})
          },
          body: JSON.stringify({ id: item.id, imageUrl: newImgUrl })
        });

        if (saveRes.ok) {
          setMenus(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(it => it.id === item.id ? { ...it, imageUrl: newImgUrl } : it)
          })));
          setToast("Image uploaded successfully!");
        } else {
          throw new Error("Failed to save image reference");
        }
      }
    } catch (err) {
      console.error(err);
      setToast("Failed to upload image.");
    }
  };

  const handleLoadMoreImages = async () => {
    if (!imageSearchItem) return;
    const q = searchImageQuery.trim();
    if (!q) return;
    
    const currentOffset = searchedImages.length;
    setSearchingImages(true);
    try {
      const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(q)}&offset=${currentOffset}`);
      if (resDeep.ok) {
        const dataDeep = await resDeep.json();
        const photos = dataDeep.data || [];
        const nextResults = photos.map((p: any) => ({
          url: p.image_url || p.image || p.url || p.imageUrl,
          title: p.title || p.name || ""
        })).filter((x: any) => Boolean(x.url));

        if (nextResults.length === 0) {
          setToast("No more images found.");
        } else {
          setSearchedImages(prev => [...prev, ...nextResults]);
          setVisibleImagesCount(prev => prev + 12);
        }
      }
    } catch (e) {
      console.error(e);
      setToast("Failed to load more images");
    } finally {
      setSearchingImages(false);
    }
  };

  const handleSelectImage = async (url: string) => {
    if (!imageSearchItem) return;
    try {
      const editPayload = { ...imageSearchItem, imageUrl: url };
      await saveEdit(editPayload);
      setImageSearchItem(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncAllImages = async () => {
    const blankItems: MenuItem[] = [];
    menus.forEach(cat => {
      cat.items.forEach(it => {
        if (!it.imageUrl) {
          blankItems.push(it);
        }
      });
    });

    if (blankItems.length === 0) {
      setToast("All items already have images!");
      return;
    }

    if (!await confirm(`Sync images for ${blankItems.length} items without images?`)) return;

    setSyncProgress({ completed: 0, total: blankItems.length });

    const chunkSize = 5;
    for (let i = 0; i < blankItems.length; i += chunkSize) {
      const chunk = blankItems.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (item) => {
        try {
          const cleanName = item.name.replace(/^\(v\)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          let firstImg = null;
          
          try {
            const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(cleanName)}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              const photos = data.data || [];
              firstImg = photos[0]?.image_url || photos[0]?.image || photos[0]?.url;
            }
          } catch (err) {
            console.warn("FoodSnap sync timed out for", cleanName);
          }

          // Fallback to strict SafeSearch google-image-search if FoodSnap returns nothing
          if (!firstImg) {
            try {
              const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(cleanName)}`);
              if (resDeep.ok) {
                const dataDeep = await resDeep.json();
                const photosDeep = dataDeep.data || [];
                firstImg = photosDeep[0]?.image_url || photosDeep[0]?.image || photosDeep[0]?.url;
              }
            } catch (e) {
              console.warn("Safe image search failed for", cleanName);
            }
          }
          
          if (firstImg) {
            const updateRes = await fetch("/api/items", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: item.id,
                imageUrl: firstImg
              })
            });
            
            if (updateRes.ok) {
              setMenus(prev => prev.map(cat => ({
                ...cat,
                items: cat.items.map(it => it.id === item.id ? { ...it, imageUrl: firstImg } : it)
              })));
            }
          }
        } catch (err) {
          console.error("Sync failed for item", item.name, err);
        } finally {
          setSyncProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null);
        }
      });

      await Promise.all(promises);
    }

    setSyncProgress(null);
    setToast("Image sync complete!");
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    fetch("/api/user/me")
      .then(res => res.json())
      .then(data => {
        if (data.role === "ADMIN") {
          setIsAdmin(true);
          // Fetch merchants list
          fetch("/api/admin/users")
            .then(r => r.json())
            .then(usersList => {
              if (Array.isArray(usersList)) {
                // Filter for merchants (OWNER / SELLER / ADMIN)
                const merchantUsers = usersList.filter(u => u.role === "OWNER" || u.role === "SELLER" || u.role === "ADMIN");
                setMerchants(merchantUsers);
                
                // If currently impersonating, set selected drop-down
                if (asUserId) {
                  setSelectedMerchantClerkId(asUserId);
                }
              }
            }).catch(e => console.error("Failed to load merchants", e));
        }
      }).catch(e => console.error("Failed to check user me", e));

    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setBusiness(data?.profile || data);
        setTaxEnabled(data?.taxEnabled || data?.perProductTaxEnabled || false);
        setExpiryTrackingEnabled(data?.expiryTrackingEnabled || false);
      })
      .catch(() => {});

    fetch("/api/menu-editor/addon-groups")
      .then(res => res.json())
      .then(data => setAddonGroups(data))
      .catch(console.error);
  }, [asUserId]);

  const fetchMenus = async () => {
    setLoading(true);
    setError(null);

    try {
      const t = Date.now();
      const fetchUrl = asUserId ? `/api/menu/view?asUserId=${asUserId}&t=${t}` : `/api/menu/view?t=${t}`;
      const catUrl = asUserId ? `/api/categories?asUserId=${asUserId}&t=${t}` : `/api/categories?t=${t}`;

      const fetchOpts: RequestInit = {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
      };

      const [res, catRes] = await Promise.all([
        fetch(fetchUrl, fetchOpts),
        fetch(catUrl, fetchOpts)
      ]);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed (${res.status})`);
      }

      const items = await res.json();

      let allCategories: any[] = [];
      if (catRes.ok) {
        try {
          const catData = await catRes.json();
          if (Array.isArray(catData)) {
            allCategories = catData;
          }
        } catch (e) {
          console.error("Error parsing categories json:", e);
        }
      }

      if (!Array.isArray(items)) {
        throw new Error("Menu API did not return array");
      }

      const UNCATEGORISED_ID = "__uncategorised__";

      const categoryMap = new Map<string, MenuCategory>();
      
      allCategories.forEach((c: any) => {
        if (c && c.id) {
          categoryMap.set(c.id, {
            id: c.id,
            name: c.name || "Unnamed Category",
            sortOrder: c.sortOrder ?? null,
            items: [],
          });
        }
      });

      categoryMap.set(UNCATEGORISED_ID, {
        id: UNCATEGORISED_ID,
        name: "Uncategorised",
        items: [],
      });

      items.forEach((it: any) => {
        const rawCatId = it.category?.id;
        const catId = rawCatId ? String(rawCatId) : UNCATEGORISED_ID;
        const catName = it.category?.name ?? "Uncategorised";

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            id: catId,
            name: catName,
            sortOrder: it.category?.sortOrder ?? null,
            zones: it.category?.zones ?? [],
            items: [],
          });
        }

        categoryMap.get(catId)!.items.push({
          ...it,
          id: String(it.id),
          name: it.name ?? "Unnamed",
          price: it.price ?? null,
          sellingPrice: it.sellingPrice ?? null,
          imageUrl: it.imageUrl || it.image || null,
          unit: it.unit ?? null,
          categoryId: catId,
          isVeg: it.isVeg ?? true,
          isEgg: !!it.isEgg,
          isBestseller: !!it.isBestseller,
          isNew: !!it.isNew,
          isFavorite: !!it.isFavorite,
          shortCode: it.shortCode ?? null,
          expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().split('T')[0] : null,
        });
      });

      let finalCategories = Array.from(categoryMap.values()).filter(c => 
        c.id !== UNCATEGORISED_ID || c.items.length > 0
      );

      finalCategories.sort((a, b) => {
        const aVal = a.sortOrder;
        const bVal = b.sortOrder;
        if (aVal !== null && aVal !== undefined && (bVal === null || bVal === undefined)) return -1;
        if (bVal !== null && bVal !== undefined && (aVal === null || aVal === undefined)) return 1;
        if (aVal !== null && aVal !== undefined && bVal !== null && bVal !== undefined) {
           if (aVal !== bVal) return aVal - bVal;
        }
        return (a.name || "").localeCompare(b.name || "");
      });

      const favoriteItems = finalCategories.flatMap(c => c.items.filter(it => it.isFavorite));
      if (favoriteItems.length > 0) {
        finalCategories.unshift({
          id: "favorites_virtual",
          name: "♥ Favorites",
          sortOrder: -9999,
          items: favoriteItems,
        });
      }

      setMenus(finalCategories);
      setActiveCategory(finalCategories[0]?.id ?? null);
    } catch (err: any) {
      console.error("Error fetching menus:", err);
      setError(err.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
    fetch("/api/profile/zones")
      .then(res => res.json())
      .then(data => {
        if (data.zones && Array.isArray(data.zones)) setAvailableZones(data.zones);
      })
      .catch(() => {});
  }, [asUserId]);

  const allCategories = useMemo(() => [{ id: "all", name: "All Categories" }, ...menus.map((m) => ({ id: m.id, name: m.name }))], [menus]);

  const allItemZones = useMemo(() => {
    const set = new Set<string>(availableZones.map(z => z.toUpperCase()));
    menus.forEach(cat => {
      cat.items.forEach((item: any) => {
        if (Array.isArray(item.zones)) {
          item.zones.forEach((z: string) => set.add(z.toUpperCase()));
        }
      });
    });
    return Array.from(set).filter(Boolean);
  }, [menus, availableZones]);

  const flattenedItems = useMemo(() => menus.flatMap((c) => c.items.map((it) => ({ ...it, categoryName: c.name }))), [menus]);

  const filteredByQuery = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return flattenedItems;
    return flattenedItems.filter((it) => (it.name?.toLowerCase() ?? "").includes(q) || (it as any).categoryName?.toLowerCase()?.includes(q));
  }, [flattenedItems, debouncedQuery]);

  const filteredByCategory = useMemo(() => {
    if (filterCategory === "all") return filteredByQuery;
    return filteredByQuery.filter((it) => it.categoryId === filterCategory);
  }, [filteredByQuery, filterCategory]);

  const filteredByZone = useMemo(() => {
    if (filterZone === "all") return filteredByCategory;
    const targetZone = filterZone.toUpperCase();
    return filteredByCategory.filter((it: any) => {
      const zones: string[] = Array.isArray(it.zones) ? it.zones : [];
      return zones.some((z: string) => z.toUpperCase() === targetZone);
    });
  }, [filteredByCategory, filterZone]);

  const filteredByImage = useMemo(() => {
    if (filterHasImage === "any") return filteredByZone;
    if (filterHasImage === "only") return filteredByZone.filter((it) => !!it.imageUrl);
    return filteredByZone.filter((it) => !it.imageUrl);
  }, [filteredByZone, filterHasImage]);

  const filteredByPrice = useMemo(() => {
    let arr = filteredByImage;
    if (priceMin !== "") arr = arr.filter((it) => (it.price ?? 0) >= Number(priceMin));
    if (priceMax !== "") arr = arr.filter((it) => (it.price ?? 0) <= Number(priceMax));
    return arr;
  }, [filteredByImage, priceMin, priceMax]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredByPrice];
    switch (sortMode) {
      case "alpha_asc": copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")); break;
      case "alpha_desc": copy.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? "")); break;
      case "price_asc": copy.sort((a, b) => (Number(a.price ?? 0) - Number(b.price ?? 0))); break;
      case "price_desc": copy.sort((a, b) => (Number(b.price ?? 0) - Number(a.price ?? 0))); break;
    }
    return copy;
  }, [filteredByPrice, sortMode]);

  const groupedForUI = useMemo(() => {
    if (filterCategory !== "all") {
      const itemsForCat = sortedItems.filter((it) => it.categoryId === filterCategory);
      const catObj = menus.find((m) => m.id === filterCategory);
      const name = catObj?.name ?? (filterCategory === "uncategorised" ? "Uncategorised" : "Selected Category");
      return [{ id: String(filterCategory), name, items: itemsForCat }];
    }

    const map = new Map<string, MenuCategory>();
    for (const it of sortedItems) {
      const cid = it.categoryId ?? "uncategorised";
      if (!map.has(cid)) {
        const catName = menus.find((m) => m.id === cid)?.name ?? (cid === "uncategorised" ? "Uncategorised" : "Unknown");
        map.set(cid, { id: cid, name: catName, items: [] });
      }
      map.get(it.categoryId ?? "uncategorised")!.items.push({ ...it });
    }

    const list: MenuCategory[] = [];
    const hasActiveFilter = filterZone !== "all" || debouncedQuery.trim() !== "" || filterHasImage !== "all" || priceMin !== "" || priceMax !== "";
    
    for (const m of menus) {
      if (m.id === "favorites_virtual") continue;
      const got = map.get(m.id) || { id: m.id, name: m.name, items: [], zones: m.zones };
      
      let isCatInZone = false;
      if (filterZone !== "all") {
        const targetZone = filterZone.toUpperCase();
        isCatInZone = (m.zones || []).some((z: string) => z.toUpperCase() === targetZone);
      }

      if (debouncedQuery.trim() !== "") {
        if (got.items.length > 0 || m.name.toLowerCase().includes(debouncedQuery.trim().toLowerCase())) {
          list.push(got);
        }
      } else if (filterZone !== "all") {
         if (got.items.length > 0 || isCatInZone) {
            list.push(got);
         }
      } else {
        // Just push it if no text/zone filter completely excludes it
        if (!hasActiveFilter || got.items.length > 0 || isCatInZone) {
          list.push(got);
        } else {
          list.push(got); // Actually, just always push it so empty categories always show!
        }
      }
    }
    const unc = map.get("uncategorised");
    if (unc && unc.items.length > 0) list.push(unc);
    return list;
  }, [sortedItems, menus, filterCategory, filterZone, query, filterHasImage, priceMin, priceMax]);

  const sidebarCategories = useMemo(() => {
    return menus.map(m => {
      const filteredItems = m.items.filter((it: any) => {
        let match = true;
        
        // Zone filter
        if (filterZone !== "all") {
          const targetZone = filterZone.toUpperCase();
          const zones: string[] = Array.isArray(it.zones) ? it.zones : [];
          match = match && zones.some((z: string) => z.toUpperCase() === targetZone);
        }
        
        // Search filter
        if (debouncedQuery.trim()) {
           const q = debouncedQuery.trim().toLowerCase();
           match = match && ((it.name?.toLowerCase() ?? "").includes(q) || m.name.toLowerCase().includes(q));
        }
        
        // Image filter
        if (filterHasImage === "only") match = match && !!it.imageUrl;
        if (filterHasImage === "none") match = match && !it.imageUrl;
        
        // Price filter
        if (priceMin !== "") match = match && (it.price ?? 0) >= Number(priceMin);
        if (priceMax !== "") match = match && (it.price ?? 0) <= Number(priceMax);

        return match;
      });
      
      return { ...m, items: filteredItems };
    }).filter(m => {
      const hasActiveFilter = filterZone !== "all" || debouncedQuery.trim() !== "" || filterHasImage !== "all" || priceMin !== "" || priceMax !== "";
      if (!hasActiveFilter) return true;
      
      if (filterZone !== "all") {
        const targetZone = filterZone.toUpperCase();
        const isCatInZone = (m.zones || []).some((z: string) => z.toUpperCase() === targetZone);
        if (isCatInZone) return true; // Explicitly in zone, show regardless of items
      }

      if (debouncedQuery.trim() && m.name.toLowerCase().includes(debouncedQuery.trim().toLowerCase())) return true;
      if (debouncedQuery.trim() !== "" && m.items.length === 0) return false;
      return true; // Always return true for empty categories unless explicitly filtered out by search text
    });
  }, [menus, filterZone, query, filterHasImage, priceMin, priceMax]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => { const existing = prev[item.id]; return { ...prev, [item.id]: { ...item, quantity: existing ? existing.quantity + 1 : 1 } }; });
  };

  const removeFromCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (!existing) return prev;
      if (existing.quantity === 1) {
        const copy = { ...prev }; delete copy[item.id]; return copy;
      }
      return { ...prev, [item.id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const totalItems = Object.values(cart).reduce((sum, it) => sum + it.quantity, 0);

  async function handleToggleStatus(item: MenuItem) {
    try {
      const newStatus = !item.isActive;
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: item.id, isActive: newStatus }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      
      setMenus(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(it => it.id === item.id ? { ...it, isActive: newStatus } : it)
      })));
      fetchMenus();
      setToast(`Item ${item.name} is now ${newStatus ? "Online" : "Offline"}`);
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Toggle failed");
    }
  }

  async function handleToggleFavorite(item: MenuItem) {
    const newStatus = !item.isFavorite;
    
    // Optimistic Update
    setMenus(prevMenus => {
      const newMenus = JSON.parse(JSON.stringify(prevMenus));
      for (const cat of newMenus) {
        const found = cat.items.find((i: any) => i.id === item.id);
        if (found) found.isFavorite = newStatus;
      }
      
      const favCatIndex = newMenus.findIndex((c: any) => c.id === 'favorites_virtual');
      const allItems = newMenus.filter((c: any) => c.id !== 'favorites_virtual').flatMap((c: any) => c.items);
      
      // Deduplicate items
      const uniqueFavItemsMap = new Map();
      allItems.filter((i: any) => i.isFavorite).forEach((i: any) => {
         if(!uniqueFavItemsMap.has(i.id)) uniqueFavItemsMap.set(i.id, i);
      });
      const favItems = Array.from(uniqueFavItemsMap.values());
      
      if (favItems.length > 0) {
        if (favCatIndex !== -1) {
          newMenus[favCatIndex].items = favItems;
        } else {
          newMenus.unshift({ id: 'favorites_virtual', name: '♥ Favorites', items: favItems, sortOrder: -1 });
        }
      } else if (favCatIndex !== -1) {
        newMenus.splice(favCatIndex, 1);
      }
      
      return newMenus;
    });

    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: item.id, isFavorite: newStatus }),
      });
      if (res.ok) {
        setToast(`Item ${item.name} is now ${newStatus ? "in Favorites" : "removed"}`);
      } else {
        fetchMenus();
        setToast("Failed to toggle favorite status");
      }
    } catch (err: any) {
      console.error(err);
      fetchMenus();
      setToast("Failed to toggle favorite status");
    }
  }

  async function saveEdit(updated: MenuItem) {
    console.log("🚀 [FRONTEND_SAVE_EDIT] Payload:", JSON.stringify(updated, null, 2));
    if (!updated?.id) return;
    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({
          id: updated.id,
          name: updated.name,
          price: updated.price,
          sellingPrice: updated.sellingPrice,
          unit: updated.unit,
          categoryId: updated.categoryId,
          imageUrl: updated.imageUrl,
          taxStatus: updated.taxStatus,
          gst: updated.gst,
          isVeg: updated.isVeg,
          isEgg: updated.isEgg,
          shortCode: updated.shortCode,
          expiryDate: updated.expiryDate,
          variants: (updated as any).variants,
          description: (updated as any).description,
          addonGroupIds: (updated as any).addonGroupIds,
          zones: (updated as any).zones,
          hsnCode: (updated as any).hsnCode,
          isActive: (updated as any).isActive,
          isBestseller: (updated as any).isBestseller,
          isRecommended: (updated as any).isRecommended,
          isNew: (updated as any).isNew,
          isFavorite: (updated as any).isFavorite,
          spiciness: (updated as any).spiciness,
          rating: (updated as any).rating,
          hiName: (updated as any).hiName,
          mrName: (updated as any).mrName,
          taName: (updated as any).taName,
          upsellText: (updated as any).upsellText,
        }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      
      const savedItem = await res.json();
      
      setMenus((prev) => {
        // Remove item from wherever it currently is
        const newMenus = prev.map(cat => ({
          ...cat,
          items: cat.items.filter(it => it.id !== updated.id)
        }));
        
        // Find the target category (or fallback to uncategorised)
        const targetCatId = savedItem.categoryId || "__uncategorised__";
        const catIndex = newMenus.findIndex(cat => cat.id === targetCatId);
        
        if (catIndex !== -1) {
          // Push item into the new category
          newMenus[catIndex].items.push({
            ...savedItem,
            id: String(savedItem.id)
          });
        }
        return newMenus;
      });

      setEditingItem(null);
      setToast("Item updated");
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Update failed");
    }
  }

  async function handleInlineSave() {
    if (!editingField) return;
    const { id, field, value } = editingField;
    
    let targetItem: MenuItem | undefined;
    for (const cat of menus) {
      const found = cat.items.find(i => i.id === id);
      if (found) {
        targetItem = found;
        break;
      }
    }
    
    if (!targetItem) {
      setEditingField(null);
      return;
    }

    if (field === "name" && targetItem.name === value) { setEditingField(null); return; }
    if (field === "price" && targetItem.price === Number(value)) { setEditingField(null); return; }
    if (field === "expiryDate" && targetItem.expiryDate && new Date(targetItem.expiryDate).toISOString().split('T')[0] === value) { setEditingField(null); return; }
    if (field === "zone" && (targetItem as any).zones?.[0] === value) { setEditingField(null); return; }
    if (field === "zone" && !(targetItem as any).zones?.length && !value) { setEditingField(null); return; }

    const updated = { ...targetItem };
    if (field === "name") updated.name = value;
    if (field === "price") updated.price = Number(value) || 0;
    if (field === "expiryDate") updated.expiryDate = value ? new Date(value).toISOString() : null;
    if (field === "zone") {
        (updated as any).zones = value ? [value] : [];
    }

    setEditingField(null); // Optimistic close
    await saveEdit(updated);
  }

  async function confirmDelete(item: MenuItem) {
    if (!item?.id) return;
    try {
      const res = await fetch("/api/items", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: item.id }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      setMenus((prev) => prev.map((cat) => ({ ...cat, items: cat.items.filter((it) => it.id !== item.id) })));
      setDeletingItem(null);
      setToast("Item deleted");
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Delete failed");
    }
  }

  async function deleteAllMenu() {
    try {
      const url = new URL("/api/items", window.location.origin);
      url.searchParams.set("all", "true");
      if (wipeZone !== "All") url.searchParams.set("zone", wipeZone);

      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: asUserId ? { "x-impersonate-id": asUserId } : undefined
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      setMenus([]);
      setShowDeleteAllConfirm(false);
      setToast("Entire menu deleted successfully");
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Bulk delete failed");
    }
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) { setToast("Category name required"); return; }
    setIsCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error(await res.text().catch(() => `Failed (${res.status})`));
      const data = await res.json().catch(() => null);
      const newCat = data?.id ? { id: data.id, name: data.name || name, items: [] } : { id: String(Date.now()), name, items: [] };
      setMenus((prev) => [newCat, ...prev]);
      setNewCategoryName("");
      setToast("Category created");
    } catch (err: any) {
      console.error(err);
      setToast(err?.message ?? "Create failed");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function handleRenameCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCategory) return;
    const formData = new FormData(e.currentTarget);
    const newName = (formData.get("name") as string).trim();
    if (!newName) return;

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: editingCategory.id, name: newName }),
      });
      if (res.ok) {
        setMenus(prev => prev.map(cat => cat.id === editingCategory.id ? { ...cat, name: newName } : cat));
        setEditingCategory(null);
        setToast("Category renamed");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteCategory(deleteItems: boolean = false) {
    if (!deletingCategory) return;
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ id: deletingCategory.id, deleteItems }),
      });
      if (res.ok) {
        if (deleteItems) {
          setMenus(prev => prev.filter(c => c.id !== deletingCategory.id));
          setToast(`Category and its ${deletingCategory.items.length} items deleted.`);
        } else {
          // Items will automatically be moved to null/uncategorised on backend.
          // On frontend, let's refresh or move them manually.
          const uncategorisedId = "__uncategorised__";
          setMenus(prev => {
            const removed = prev.find(c => c.id === deletingCategory.id);
            const filtered = prev.filter(c => c.id !== deletingCategory.id);
            if (removed && removed.items.length > 0) {
              // Check if uncategorised exists
              const uncIdx = filtered.findIndex(c => c.id === uncategorisedId);
              if (uncIdx >= 0) {
                filtered[uncIdx].items = [...filtered[uncIdx].items, ...removed.items.map(it => ({ ...it, categoryId: null }))];
              } else {
                filtered.push({ id: uncategorisedId, name: "Uncategorised", items: removed.items.map(it => ({ ...it, categoryId: null })) });
              }
            }
            return filtered;
          });
          setToast("Category deleted, items moved to Uncategorised.");
        }
        setDeletingCategory(null);
      }
    } catch (err) {
      console.error(err);
      setToast("Failed to delete category");
    }
  }


  /* ================= QUICK ADD HANDLERS ================= */
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quickAddCat) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const shortCode = formData.get("shortCode") as string;
    const description = formData.get("description") as string;
    const manualImageUrl = formData.get("imageUrl") as string;
    const imageUrl = quickAddImage || manualImageUrl;

    if (!name || !price) {
      setToast("Name and price are required");
      return;
    }

    if (!quickAddCat.id) {
      setToast("Please select a category");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticItem: MenuItem = {
      id: tempId,
      name,
      price: Number(price),
      categoryId: quickAddCat.id,
      isVeg: quickAddDietary === "veg",
      isEgg: quickAddDietary === "egg",
      isBestseller: false,
      isRecommended: false,
      isNew: true,
      shortCode: shortCode || null,
      description: description || null,
      imageUrl: imageUrl || null,
      taxStatus: quickAddTaxStatus,
      gst: Number(quickAddGst),
      isActive: true
    };

    // 🚀 OPTIMISTIC UPDATE: Update UI immediately
    setMenus(prev => prev.map(cat => 
      cat.id === quickAddCat.id 
        ? { ...cat, items: [optimisticItem, ...cat.items] }
        : cat
    ));
    setQuickAddCat(null); 
    setQuickAddTaxStatus("Without Tax");
    setQuickAddGst(0);
    setQuickAddImage(null);
    setToast(`"${name}" added to ${quickAddCat.name}`);

    // Backend update in background
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          categoryId: quickAddCat.id,
          description: description || null,
          imageUrl: imageUrl || null,
          shortCode: shortCode || null,
          taxStatus: quickAddTaxStatus,
          gst: Number(quickAddGst),
          isVeg: quickAddDietary === "veg",
          isEgg: quickAddDietary === "egg"
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setMenus(prev => prev.map(cat => 
          cat.id === quickAddCat.id 
            ? { ...cat, items: cat.items.map(it => it.id === tempId ? {
                ...newItem,
                id: String(newItem.id),
                price: Number(newItem.sellingPrice || newItem.price),
                categoryId: quickAddCat.id
              } : it) }
            : cat
        ));
      } else {
        setMenus(prev => prev.map(cat => 
          cat.id === quickAddCat.id 
            ? { ...cat, items: cat.items.filter(it => it.id !== tempId) }
            : cat
        ));
        setToast(`Failed to save "${name}" formally.`);
      }
    } catch (err) {
      console.error("Optimistic add error:", err);
      setMenus(prev => prev.map(cat => 
        cat.id === quickAddCat.id 
          ? { ...cat, items: cat.items.filter(it => it.id !== tempId) }
          : cat
      ));
    }
  };

  const handleQuickAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const zone = formData.get("zone") as string;
    if (!name) return;

    const tempId = `temp-cat-${Date.now()}`;
    const optimisticCat: MenuCategory = {
      id: tempId,
      name,
      zones: zone ? [zone] : [],
      items: []
    };

    setMenus(prev => [optimisticCat, ...prev]);
    setShowAddCategory(false);
    setToast(`Category "${name}" created`);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, zones: zone ? [zone] : [] }),
      });

      if (res.ok) {
        const data = await res.json();
        setMenus(prev => prev.map(c => c.id === tempId ? { ...c, id: data.id } : c));
      } else {
        setMenus(prev => prev.filter(c => c.id !== tempId));
        setToast("Failed to formally sync category.");
      }
    } catch (err) {
      console.error(err);
      setMenus(prev => prev.filter(c => c.id !== tempId));
    }
  };


  if (loading) return <p className="p-6 text-center">Loading items...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <div className="h-[calc(100vh-72px)] bg-[var(--kravy-bg)] flex flex-col -m-4 sm:-m-6 lg:-m-8 overflow-hidden transition-colors duration-300">
      <div className="flex-shrink-0 z-40 bg-[var(--kravy-navbar-bg)] backdrop-blur-md border-b border-[var(--kravy-border)] transition-all">
        <div className="w-full">
          {isAdmin && (
            <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-4 z-50">
              <div className="flex items-center gap-3 flex-1 min-w-[280px] relative">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex-shrink-0">Active Merchant:</span>
                
                <div className="relative flex-1 max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      value={isMerchantDropdownOpen ? searchMerchantQuery : selectedMerchantLabel}
                      onFocus={() => {
                        setIsMerchantDropdownOpen(true);
                        setSearchMerchantQuery("");
                      }}
                      onChange={(e) => setSearchMerchantQuery(e.target.value)}
                      placeholder="Type to search merchant..."
                      className="w-full bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] pl-4 pr-10 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                    />
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-faint)] pointer-events-none" />
                  </div>

                  {isMerchantDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMerchantDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 py-1.5 no-scrollbar divide-y divide-[var(--kravy-border)]/30">
                        <div
                          onClick={() => {
                            handleMerchantChange("");
                            setIsMerchantDropdownOpen(false);
                          }}
                          className="px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10 cursor-pointer transition-all uppercase tracking-wider"
                        >
                          -- View My Own Menu --
                        </div>

                        {filteredMerchants.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-[var(--kravy-text-muted)] font-medium">No merchants match your search</div>
                        ) : (
                          filteredMerchants.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                handleMerchantChange(m.clerkId);
                                setIsMerchantDropdownOpen(false);
                              }}
                              className={`px-4 py-2.5 text-xs font-bold text-[var(--kravy-text-primary)] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/20 cursor-pointer transition-all flex flex-col gap-0.5 ${
                                selectedMerchantClerkId === m.clerkId ? "bg-indigo-50/50 text-indigo-600 border-l-4 border-indigo-500" : ""
                              }`}
                            >
                              <span>{m.name}</span>
                              <span className="text-[10px] text-[var(--kravy-text-muted)] font-medium">{m.email}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSyncAllImages}
                  disabled={syncProgress !== null}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md disabled:opacity-50 transition-all"
                >
                  <Sparkles size={12} /> {syncProgress ? `Syncing (${syncProgress.completed}/${syncProgress.total})` : "Sync All Images"}
                </button>

                {asUserId && (
                  <>
                    <button
                      onClick={handleWipeMenu}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
                    >
                      <Trash2 size={12} /> Wipe Customer Menu
                    </button>
                    <button
                      onClick={handleDeleteAllBills}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
                    >
                      <Trash2 size={12} /> Delete All Bills
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Top Bar: Search & Filters */}
          <div className="px-6 py-4 border-b border-[var(--kravy-border)]/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 gap-3 items-center overflow-x-auto no-scrollbar py-1 min-w-0">
                <div className="relative group">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-faint)] group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search menu items..."
                    className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] pl-10 pr-4 py-2.5 rounded-2xl w-72 min-w-[220px] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 font-bold transition-all shadow-sm"
                  />
                </div>

                <div className="h-8 w-[1px] bg-[var(--kravy-border)] mx-1 opacity-50 flex-shrink-0" />

                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-4 py-2 my-0.5 rounded-xl flex-shrink-0 outline-none font-black text-xs uppercase tracking-wider hover:border-indigo-500/50 transition-all cursor-pointer">
                  {allCategories.map((c) => <option key={c.id} value={c.id as any}>{c.name}</option>)}
                </select>

                <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="bg-[var(--kravy-surface)] border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 my-0.5 rounded-xl flex-shrink-0 outline-none font-black text-xs uppercase tracking-wider hover:border-indigo-500 transition-all cursor-pointer">
                  <option value="all">📍 All Zones</option>
                  {allItemZones.map((z: string) => (
                    <option key={z} value={z} className="bg-[var(--kravy-bg)]">
                      📍 Zone: {z}
                    </option>
                  ))}
                </select>

                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-4 py-2 my-0.5 rounded-xl flex-shrink-0 outline-none font-black text-xs uppercase tracking-wider hover:border-indigo-500/50 transition-all cursor-pointer">
                  <option value="alpha_asc">Sort: A → Z</option>
                  <option value="alpha_desc">Sort: Z → A</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>

                <div className="flex items-center gap-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] px-3 py-2 rounded-xl flex-shrink-0">
                  <span className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase mr-1">Price:</span>
                  <input placeholder="Min" type="number" value={priceMin === "" ? "" : String(priceMin)} onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))} className="bg-transparent text-[var(--kravy-text-primary)] w-12 outline-none text-xs text-center font-bold" />
                  <span className="text-[var(--kravy-text-muted)] opacity-30">-</span>
                  <input placeholder="Max" type="number" value={priceMax === "" ? "" : String(priceMax)} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} className="bg-transparent text-[var(--kravy-text-primary)] w-12 outline-none text-xs text-center font-bold" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="px-6 py-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-extrabold text-[10px] uppercase tracking-widest flex-shrink-0 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 group"
                  title="Clear Entire Menu"
                >
                   <Trash2 size={14} className="group-hover:animate-bounce" /> Clear All
                </button>
                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                <button
                  onClick={() => router.push(asUserId ? `/dashboard/menu/pdf?asUserId=${asUserId}` : "/dashboard/menu/pdf")}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-black text-xs uppercase tracking-widest flex-shrink-0 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95"
                  title="Download / Print PDF Menu Card"
                >
                  <Printer size={16} strokeWidth={2.5} /> PDF Menu Card
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowUploadMenuModal(true)}
                    className="px-6 py-2.5 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex-shrink-0 hover:bg-orange-700 transition-all flex items-center gap-2.5 shadow-lg shadow-orange-600/20 active:scale-95 animate-pulse"
                    title="Upload New Menu File"
                  >
                    <Plus size={16} strokeWidth={3} /> Upload Menu (AI)
                  </button>
                )}
                <button
                  onClick={() => {
                    if (menus.length === 0) {
                      setShowAddCategory(true);
                      setToast("Create a category first!");
                    } else {
                      setQuickAddCat({ id: menus[0].id, name: menus[0].name });
                    }
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex-shrink-0 hover:bg-emerald-700 transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-600/20 active:scale-95"
                  title="Quick Add Item"
                >
                  <Plus size={16} strokeWidth={3} /> New Item
                </button>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex-shrink-0 hover:bg-indigo-700 transition-all flex items-center gap-2.5 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Plus size={16} strokeWidth={3} /> New Category
                </button>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const ids = new Set<string>();
                    menus.forEach(cat => {
                      cat.items.forEach(item => {
                        if (val === "unassigned") {
                          if (!(item as any).zones || (item as any).zones.length === 0) ids.add(item.id);
                        } else {
                          if ((item as any).zones?.includes(val)) ids.add(item.id);
                        }
                      });
                    });
                    if (ids.size === 0) {
                        setToast(val === "unassigned" ? "All items have zones!" : `No items in ${val}`);
                    } else {
                        setIsBulkMode(true);
                        setSelectedIds(ids);
                    }
                    e.target.value = "";
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 text-amber-400 font-black text-xs uppercase tracking-widest flex-shrink-0 hover:bg-slate-700 transition-all shadow-lg shadow-amber-500/10 cursor-pointer focus:outline-none border-none"
                >
                  <option value="">📍 QUICK SELECT...</option>
                  <option value="unassigned">Unassigned Items</option>
                  {business?.zones?.map((z: string) => <option key={z} value={z}>Zone: {z}</option>)}
                </select>
                <button
                  onClick={() => {
                    setIsBulkMode(!isBulkMode);
                    if (isBulkMode) setSelectedIds(new Set());
                  }}
                  className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest flex-shrink-0 transition-all flex items-center gap-2.5 shadow-lg active:scale-95 ${isBulkMode ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-white border border-indigo-200 text-indigo-600 shadow-indigo-500/10"}`}
                >
                  <Check size={16} strokeWidth={3} /> {isBulkMode ? "Exit Bulk Edit" : "Bulk Edit"}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Category Slider (Only on mobile, stays fixed under top bar) */}
          <div className="md:hidden py-3 px-6 bg-[var(--kravy-bg)]/40 border-b border-[var(--kravy-border)]/50">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              <button 
                onClick={() => { setFilterCategory("all"); setActiveCategory(null); }} 
                className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${filterCategory === "all" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"}`}
              >
                All
              </button>
              {sidebarCategories.map((m) => (
                <button 
                  key={m.id} 
                  onClick={() => { setFilterCategory(m.id); setActiveCategory(m.id); const el = document.getElementById(`cat-${m.id}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }} 
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${filterCategory === m.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"}`}
                >
                  {m.name}
                </button>
              ))}
              <button
                onClick={() => setShowAddCategory(true)}
                className="whitespace-nowrap w-8 h-8 rounded-full bg-white border border-[var(--kravy-border)] flex items-center justify-center flex-shrink-0 text-[var(--kravy-brand)] shadow-sm"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 MAIN CONTENT AREA: FIXED SIDEBAR + SCROLLABLE PRODUCTS */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Navigation Rail (The "Slider" requested by user) */}
        <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 bg-[var(--kravy-surface)] border-r border-[var(--kravy-border)] shadow-xl z-30">
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em]">
                MENU CATEGORIES
              </h3>
              <button 
                onClick={() => setShowReorderModal(true)}
                className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white p-1.5 rounded-lg transition-all"
                title="Customize Category Order"
              >
                <Sparkles size={14} />
              </button>
            </div>
            {/* Category Search Box */}
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="🔍 Search Category..." 
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-4 py-2 text-xs font-bold text-[var(--kravy-text-primary)] placeholder-[var(--kravy-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-8 space-y-1">
            <button 
              onClick={() => { setFilterCategory("all"); setActiveCategory(null); }} 
              className={`w-full text-left px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${filterCategory === "all" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1" : "text-[var(--kravy-text-secondary)] hover:bg-[var(--kravy-bg)] hover:text-indigo-500"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${filterCategory === "all" ? "bg-white animate-pulse" : "bg-indigo-500/40"}`} />
              All Items
            </button>

            {sidebarCategories.filter(m => m.name.toLowerCase().includes(catSearch.toLowerCase())).map((m) => (
              <div key={m.id} className="group relative">
                <button 
                  onClick={() => { 
                    setFilterCategory(m.id); 
                    setActiveCategory(m.id); 
                    const el = document.getElementById(`cat-${m.id}`); 
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); 
                  }} 
                  className={`w-full text-left px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${filterCategory === m.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1" : "text-[var(--kravy-text-secondary)] hover:bg-[var(--kravy-bg)] hover:text-indigo-500"}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${filterCategory === m.id ? "bg-white animate-pulse" : "bg-indigo-500/40"}`} />
                  <span className="truncate flex-1">{m.name}</span>
                  <span className={`text-[10px] font-bold ${filterCategory === m.id ? "text-indigo-200" : "text-[var(--kravy-text-faint)]"}`}>{m.items.length}</span>
                </button>
                
                {/* Category Actions: Edit & Delete */}
                <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingCategory({ id: m.id, name: m.name }); }}
                    className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                    title="Rename Category"
                  >
                    <Pencil size={12} />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeletingCategory(m); }}
                    className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Delete Category"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 px-2">
              <button
                onClick={() => setShowAddCategory(true)}
                className="w-full py-3.5 rounded-2xl bg-indigo-50/50 border-2 border-dashed border-indigo-200 text-indigo-500 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-indigo-50 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> New Section
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid Area: ONLY THIS SCROLLS */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth no-scrollbar md:scrollbar-default bg-[var(--kravy-bg)]/30">
          <div className="max-w-6xl mx-auto p-6 lg:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                  Product Catalog
                </h2>
                <p className="text-[var(--kravy-text-muted)] text-sm font-medium mt-1">
                  Manage your products, prices and categories
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleClearAllImages}
                  className="flex items-center gap-2 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-full border border-rose-100 transition-colors"
                >
                  <Trash2 size={12} /> Clear All Images
                </button>
                <div className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  {totalItems} Items Total
                </div>
              </div>
            </div>

            {groupedForUI.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-[var(--kravy-surface)] rounded-full flex items-center justify-center border border-[var(--kravy-border)] mb-4 text-indigo-500/30">
                   <Search size={32} />
                </div>
                <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">No products found</h3>
                <p className="text-sm text-[var(--kravy-text-muted)] mt-1">Try adjusting your filters or search query.</p>
              </div>
            )}

            <div className="space-y-16">
              {groupedForUI.map((cat) => (
                <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-6">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <h3 className="font-black text-[var(--kravy-text-primary)] text-xl flex items-center gap-4 flex-1">
                      {cat.name}
                      <div className="flex-1 h-[2px] bg-gradient-to-r from-[var(--kravy-border-strong)] to-transparent opacity-30" />
                    </h3>
                  </div>

                {cat.items.length === 0 ? (
                  <p className="text-sm text-[var(--kravy-text-muted)] font-medium opacity-60">No items available in this category.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {cat.items.map((item) => {
                      const inCart = cart[item.id]?.quantity ?? 0;
                      return (
                        <div key={item.id}   className="bg-[var(--kravy-surface)] p-4 rounded-2xl border border-[var(--kravy-border)] shadow-sm relative cursor-pointer min-w-0 transition-all hover:border-indigo-400/50">

                          <div
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, item)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchProvider("foodsnap"); // default back to FoodSnap
                              setImageSearchItem(item);
                              const cleanName = item.name.replace(/^\(v\)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
                              setSearchImageQuery(cleanName);
                              handleSearchImages(cleanName, "foodsnap");
                            }}
                            className={`w-full h-40 mb-4 relative rounded-xl overflow-hidden bg-[var(--kravy-bg-2)] flex items-center justify-center min-w-0 shadow-inner group cursor-pointer ring-offset-2 hover:ring-2 hover:ring-indigo-500 transition-all ${
                              draggedOverItemId === item.id 
                                ? "border-4 border-dashed border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 scale-95" 
                                : ""
                            }`}
                          >
                            {item.imageUrl ? (
                              <div 
                                className="relative w-full h-full group/img"
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify({ sourceImageUrl: item.imageUrl }));
                                }}
                              >
                                <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!item.isActive ? "grayscale opacity-50" : ""}`} />
                                <button
                                  onClick={(e) => handleRemoveImage(e, item)}
                                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md z-20"
                                  title="Remove Image"
                                >
                                  <X size={12} strokeWidth={3} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item); }}
                                  className={`absolute top-2 left-2 rounded-full p-1.5 shadow-md z-20 transition-all ${item.isFavorite ? "bg-white opacity-100" : "bg-white/50 opacity-0 group-hover/img:opacity-100 hover:bg-white"}`}
                                  title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                                >
                                  <Heart size={16} className={item.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-500"} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[var(--kravy-text-secondary)] opacity-50 relative w-full h-full">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item); }}
                                  className={`absolute top-2 left-2 rounded-full p-1.5 shadow-md z-20 transition-all ${item.isFavorite ? "bg-white opacity-100" : "bg-[var(--kravy-bg)] opacity-0 group-hover:opacity-100 hover:bg-white"}`}
                                  title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                                >
                                  <Heart size={16} className={item.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-500"} />
                                </button>
                                <div className="text-[var(--kravy-text-faint)] font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-1">
                                <span>No Image</span>
                                <span className="text-[9px] text-indigo-500 font-black lowercase normal-case tracking-normal">(click to add)</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Status Badge & Zone Badge */}
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }}
                                className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${
                                  item.isActive 
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                                    : "bg-rose-500 text-white hover:bg-rose-600"
                                }`}
                              >
                                {item.isActive ? "● Online" : "○ Offline"}
                              </button>
                              {editingField?.id === item.id && editingField.field === "zone" ? (
                                <select
                                  autoFocus
                                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500 focus:outline-none shadow-md"
                                  value={editingField.value}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    setEditingField(null);
                                    if ((item as any).zones?.[0] === val || (!(item as any).zones?.length && !val)) return;
                                    const updated = { ...item, zones: val ? [val] : [] };
                                    await saveEdit(updated);
                                  }}
                                  onBlur={() => setEditingField(null)}
                                >
                                  <option value="">🌐 All Zones</option>
                                  {business?.zones?.map((z: string) => <option key={z} value={z}>📍 {z}</option>)}
                                </select>
                              ) : (
                                <div onClick={(e) => { e.stopPropagation(); setEditingField({ id: item.id, field: "zone", value: (item as any).zones?.[0] || "" }); }} className="cursor-pointer hover:ring-2 hover:ring-amber-500 rounded-full transition-all shrink-0 inline-flex">
                                  {(item as any).zones && (item as any).zones.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900/85 backdrop-blur-md text-amber-300 border border-amber-500/40 shadow-md">
                                      📍 {(item as any).zones.join(", ")}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-900/70 backdrop-blur-md text-slate-300 border border-slate-700 shadow-md">
                                      🌐 All Zones
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-3 h-3 border-[1.2px] rounded-sm flex items-center justify-center shrink-0 ${item.isVeg ? "border-green-600" : item.isEgg ? "border-amber-500" : "border-red-600"}`}>
                                    <div className={`w-1 h-1 rounded-full ${item.isVeg ? "bg-green-600" : item.isEgg ? "bg-amber-500" : "bg-red-600"}`} />
                                </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                  {editingField?.id === item.id && editingField.field === "name" ? (
                                    <input 
                                      autoFocus
                                      className="font-bold text-sm md:text-base w-full min-w-[80px] max-w-full bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 focus:outline-none px-1 py-0.5 rounded-sm text-indigo-700 dark:text-indigo-300"
                                      value={editingField.value}
                                      onChange={e => setEditingField({ ...editingField, value: e.target.value })}
                                      onBlur={handleInlineSave}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") handleInlineSave();
                                        if (e.key === "Escape") setEditingField(null);
                                      }}
                                    />
                                  ) : (
                                    <h4 
                                      onClick={(e) => { e.stopPropagation(); setEditingField({ id: item.id, field: "name", value: item.name }); }} 
                                      className="font-bold text-[var(--kravy-text-primary)] text-sm md:text-base group-hover:text-indigo-500 transition-colors cursor-pointer break-normal whitespace-normal line-clamp-3 leading-tight pr-2"
                                      title="Click to edit name"
                                    >
                                      {item.name}
                                    </h4>
                                  )}
                                  {expiryTrackingEnabled && item.expiryDate && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {editingField?.id === item.id && editingField.field === "expiryDate" ? (
                                        <input
                                          autoFocus
                                          type="date"
                                          className="text-[10px] font-bold px-1 py-0.5 rounded border border-indigo-500 focus:outline-none bg-white dark:bg-slate-800 text-indigo-700"
                                          value={editingField.value}
                                          onChange={e => setEditingField({ ...editingField, value: e.target.value })}
                                          onBlur={handleInlineSave}
                                          onKeyDown={e => {
                                            if (e.key === "Enter") handleInlineSave();
                                            if (e.key === "Escape") setEditingField(null);
                                          }}
                                        />
                                      ) : (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setEditingField({ id: item.id, field: "expiryDate", value: new Date(item.expiryDate!).toISOString().split('T')[0] }); }}
                                          className={`cursor-pointer hover:ring-2 hover:ring-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                                            new Date(item.expiryDate) < new Date() 
                                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                              : new Date(item.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          }`}>
                                          Exp: {new Date(item.expiryDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="p-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-110 transition-transform">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:scale-110 transition-transform">Delete</button>
                              </div>
                            </div>

                            {editingField?.id === item.id && editingField.field === "price" ? (
                              <input 
                                autoFocus
                                type="number"
                                className="w-24 font-extrabold text-base bg-slate-100 dark:bg-slate-800 border-b border-indigo-500 focus:outline-none px-1 py-0.5 rounded-sm text-indigo-600 dark:text-indigo-400"
                                value={editingField.value}
                                onChange={e => setEditingField({ ...editingField, value: e.target.value })}
                                onBlur={handleInlineSave}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleInlineSave();
                                  if (e.key === "Escape") setEditingField(null);
                                }}
                              />
                            ) : (
                              <div 
                                onClick={(e) => { e.stopPropagation(); setEditingField({ id: item.id, field: "price", value: String(item.price) }); }}
                                className="text-indigo-600 dark:text-indigo-400 font-extrabold text-base cursor-pointer hover:underline"
                                title="Click to edit price"
                              >
                                {formatPrice(item.price)}
                              </div>
                            )}
                            {item.unit && <div className="text-[0.65rem] font-bold text-[var(--kravy-text-muted)] uppercase tracking-tighter opacity-70">{item.unit}</div>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Item Card */}
                    <div
                      
                      onClick={() => setQuickAddCat({ id: cat.id, name: cat.name })}
                      className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-indigo-100/50 hover:border-indigo-300 transition-all min-h-[220px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                        <Plus size={24} strokeWidth={3} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Quick Add</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight mt-1">Add to {cat.name}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
            </div>
          </div>
        </main>
      </div>


      {/* 🚀 BULK ACTIONS FLOATING BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <div 
             
             
            
            className="fixed left-4 right-4 bottom-10 z-[60] bg-indigo-950 text-white p-5 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(30,27,75,0.6)] flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto border border-white/20 backdrop-blur-2xl ring-1 ring-white/10"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white text-indigo-950 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl rotate-3">
                {selectedIds.size}
              </div>
              <div className="flex flex-col">
                <div className="text-base font-black uppercase tracking-[0.1em] leading-none">Bulk Selections</div>
                <div className="text-[10px] font-bold text-indigo-300 mt-2 uppercase tracking-wider">
                  Pick status to apply to {selectedIds.size} Items
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 flex-1 justify-center">
              <div className="flex p-1.5 bg-white/5 rounded-[1.5rem] gap-2 border border-white/5 scale-90 md:scale-100">
                <button 
                  onClick={() => setBulkDiet(bulkDiet === "veg" ? null : "veg")}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${bulkDiet === "veg" ? "bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/20 px-7" : "bg-white/5 text-green-400 border-white/5 hover:bg-white/10"}`}
                >
                  Veg <div className={`w-1.5 h-1.5 rounded-full ${bulkDiet === "veg" ? "bg-white" : "bg-green-500"}`} />
                </button>
                <button 
                  onClick={() => setBulkDiet(bulkDiet === "egg" ? null : "egg")}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${bulkDiet === "egg" ? "bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20 px-7" : "bg-white/5 text-amber-400 border-white/5 hover:bg-white/10"}`}
                >
                  Egg <div className={`w-1.5 h-1.5 rounded-full ${bulkDiet === "egg" ? "bg-white" : "bg-amber-500"}`} />
                </button>
                <button 
                  onClick={() => setBulkDiet(bulkDiet === "nv" ? null : "nv")}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${bulkDiet === "nv" ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20 px-7" : "bg-white/5 text-rose-300 border-white/5 hover:bg-white/10"}`}
                >
                  NV <div className={`w-1.5 h-1.5 rounded-full ${bulkDiet === "nv" ? "bg-white" : "bg-rose-500"}`} />
                </button>
              </div>

              <select
                value={bulkZone || ""}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === "CREATE_NEW_ZONE") {
                        const newZ = prompt("Enter New Zone Name:");
                        if (newZ && newZ.trim()) {
                            const upperZ = newZ.trim().toUpperCase();
                            fetch("/api/profile/zones", { method: "POST", body: JSON.stringify({ action: "add", zoneName: upperZ }) }).then(res => {
                                if(res.ok) {
                                    setBusiness((prev: any) => prev ? { ...prev, zones: Array.from(new Set([...(prev.zones || []), upperZ])) } : prev);
                                    setBulkZone(upperZ);
                                }
                            });
                        }
                    } else {
                        setBulkZone(val || null);
                    }
                }}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white focus:outline-none font-black uppercase tracking-widest cursor-pointer"
              >
                <option value="" className="bg-indigo-950">Assign Zone</option>
                {business?.zones?.map((z: string) => <option key={z} value={z} className="bg-indigo-950">{z}</option>)}
                <option value="CREATE_NEW_ZONE" className="bg-indigo-600 text-white font-black">+ Create New Zone</option>
              </select>

              <button 
                disabled={isBulkUpdating || (!bulkDiet && !bulkZone)}
                onClick={async () => {
                  if (!bulkDiet && !bulkZone) return;
                  setIsBulkUpdating(true);
                  try {
                    const payload: any = { ids: Array.from(selectedIds) };
                    if (bulkDiet) {
                      payload.isVeg = bulkDiet === "veg";
                      payload.isEgg = bulkDiet === "egg";
                    }
                    if (bulkZone) {
                      payload.zones = [bulkZone];
                    }
                    
                    const res = await fetch("/api/items", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });
                    
                    if (res.ok) {
                      setIsBulkMode(false);
                      setMenus(prev => prev.map(cat => ({
                        ...cat,
                        items: cat.items.map(it => {
                          if (!selectedIds.has(it.id)) return it;
                          const updated = { ...it };
                          if (bulkDiet) {
                            updated.isVeg = bulkDiet === "veg";
                            updated.isEgg = bulkDiet === "egg";
                          }
                          if (bulkZone) {
                            updated.zones = [bulkZone];
                          }
                          return updated;
                        })
                      })));
                      const cnt = selectedIds.size;
                      const dietLabel = bulkDiet === "veg" ? "Veg 🥗" : bulkDiet === "egg" ? "Egg 🥚" : bulkDiet === "nv" ? "Non-Veg 🍗" : "";
                      const zoneLabel = bulkZone ? `Zone: ${bulkZone}` : "";
                      const label = [dietLabel, zoneLabel].filter(Boolean).join(" & ");
                      setSelectedIds(new Set());
                      setBulkDiet(null);
                      setBulkZone(null);
                      setToast(`Updated ${cnt} items with ${label}`);
                    }
                  } catch (err) {
                    setToast("Bulk update failed");
                  } finally { 
                    setIsBulkUpdating(false); 
                  }
                }}
                className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl active:scale-95 ${(!bulkDiet && !bulkZone) ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5" : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/40"}`}
              >
                Apply Changes
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={async () => {
                  setIsBulkUpdating(true);
                  try {
                    const itemsToFix = Array.from(selectedIds).map(id => {
                      const item = menus.flatMap(c => c.items).find(it => it.id === id);
                      if (!item) return null;
                      const diet = detectDiet(item.name);
                      if (!diet) return null;
                      return { id, isVeg: diet === "veg", isEgg: diet === "egg" };
                    }).filter(x => x !== null) as {id: string, isVeg: boolean, isEgg: boolean}[];

                    if (itemsToFix.length === 0) {
                      setToast("No (V) or (NV) tags found in selected items.");
                      return;
                    }

                    // Process in batches or concurrently
                    await Promise.all(itemsToFix.map(fix => 
                      fetch("/api/items", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: fix.id, name: "ignore", isVeg: fix.isVeg, isEgg: fix.isEgg })
                      })
                    ));

                    setMenus(prev => prev.map(cat => ({
                      ...cat,
                      items: cat.items.map(it => {
                        const fix = itemsToFix.find(f => f.id === it.id);
                        return fix ? { ...it, isVeg: fix.isVeg, isEgg: fix.isEgg } : it;
                      })
                    })));

                    setToast(`Magic Fix: Updated ${itemsToFix.length} items ✨`);
                    setSelectedIds(new Set());
                    setIsBulkMode(false);
                  } catch (err) {
                    setToast("Magic fix failed");
                  } finally {
                    setIsBulkUpdating(false);
                  }
                }}
                className="w-12 h-12 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500 text-white flex items-center justify-center transition-all group active:scale-95"
                title="Magic Fix Diet from Names"
              >
                <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
              </button>

              <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />
              <button 
                onClick={() => { setSelectedIds(new Set()); setBulkDiet(null); setIsBulkMode(false); }}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition-all group active:scale-95"
                title="Cancel Bulk Mode"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {editingItem && (
        <EditModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
          onSave={saveEdit} 
          allCategories={allCategories}
          taxEnabled={taxEnabled}
          setToast={setToast}
          availableZones={business?.zones || []}
          onAddZone={(z) => {
             setBusiness((prev: any) => prev ? { ...prev, zones: Array.from(new Set([...(prev.zones || []), z])) } : prev);
          }}
        />
      )}
      {deletingItem && (
        <ConfirmDelete 
          item={deletingItem} 
          onClose={() => setDeletingItem(null)} 
          onConfirm={() => confirmDelete(deletingItem!)} 
        />
      )}
      
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteAllConfirm(false)} />
          <div   className="relative bg-[var(--kravy-surface)] rounded-[32px] border border-[var(--kravy-border)] shadow-2xl w-full max-w-sm p-8 z-[10001] text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
               <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-3 tracking-tight">Delete Entire Catalog?</h3>
            <p className="text-[var(--kravy-text-muted)] font-medium mb-6 leading-relaxed">
              This will <span className="text-rose-600 font-black underline">permanently delete items</span>. This action cannot be undone.
            </p>
            
            {business?.zones && business.zones.length > 0 && (
              <div className="mb-8 text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-2 block">Select Zone to Clear</label>
                <select 
                  value={wipeZone} 
                  onChange={(e) => setWipeZone(e.target.value)}
                  className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--kravy-text-primary)]"
                >
                  <option value="All">⚠️ All Zones (Entire Menu)</option>
                  {business.zones.map((z: string) => (
                    <option key={z} value={z}>Only Zone: {z}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteAllConfirm(false)} className="px-6 py-4 font-black text-[var(--kravy-text-muted)] rounded-2xl hover:bg-[var(--kravy-surface-hover)] transition-all">Cancel</button>
              <button 
                onClick={deleteAllMenu} 
                className="px-6 py-4 font-black rounded-2xl bg-rose-600 hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 text-white active:scale-95"
              >
                {wipeZone === "All" ? "Yes, Delete All" : "Clear Zone"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 QUICK ADD ITEM MODAL */}
      {quickAddCat && (
        <ItemModal
          item={{ categoryId: quickAddCat.id }}
          addonGroups={addonGroups}
          categories={menus.map(m => ({ id: m.id, name: m.name }))}
          onSave={async (data: any) => {
            setQuickAddCat(null);
            const tempId = `temp-${Date.now()}`;
            const optimisticItem = { ...data, id: tempId, categoryId: quickAddCat.id };
            setMenus(prev => prev.map(cat => 
              cat.id === quickAddCat.id 
                ? { ...cat, items: [optimisticItem, ...cat.items] }
                : cat
            ));
            setToast(`"${data.name}" added to ${quickAddCat.name}`);

            try {
              const res = await fetch("/api/items", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  ...(asUserId ? { "x-impersonate-id": asUserId } : {})
                },
                body: JSON.stringify(data)
              });
              if (!res.ok) throw new Error();
              const savedItem = await res.json();
              setMenus(prev => prev.map(cat => 
                cat.id === quickAddCat.id 
                  ? { ...cat, items: cat.items.map(it => it.id === tempId ? { ...savedItem, categoryId: quickAddCat.id } : it) }
                  : cat
              ));
            } catch {
              setToast("Failed to add item");
              setMenus(prev => prev.map(cat => 
                cat.id === quickAddCat.id 
                  ? { ...cat, items: cat.items.filter(it => it.id !== tempId) }
                  : cat
              ));
            }
          }}
          onClose={() => setQuickAddCat(null)}
        />
      )}

      {/* 🚀 QUICK ADD CATEGORY MODAL */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddCategory(false)} />
          <div className="relative bg-[var(--kravy-surface)] w-full max-w-sm rounded-[2rem] shadow-2xl border border-[var(--kravy-border)] overflow-hidden scale-100 animate-in fade-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[var(--kravy-border)]/50">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={24} className="text-amber-500" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--kravy-text-primary)] leading-tight">New Category</h3>
                  <p className="text-[10px] text-[var(--kravy-text-muted)] font-black uppercase tracking-widest mt-0.5">
                    Add menu section
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleQuickAddCategory} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-1">Category Name</label>
                  <input
                    name="name"
                    autoFocus
                    autoComplete="off"
                    placeholder="e.g. Desserts"
                    required
                    className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold"
                  />
                </div>
                
                <div className="space-y-1 mt-3">
                  <label className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-1">Assigned Zone</label>
                  <select
                    name="zone"
                    className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold appearance-none"
                  >
                    <option value="">-- Global (Available in all zones) --</option>
                    {business?.zones?.map((z: string) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(false)}
                    className="flex-1 py-3 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg)] text-[var(--kravy-text-secondary)] font-black text-xs hover:bg-[var(--kravy-surface-hover)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 rounded-xl bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div   className="fixed right-8 bottom-32 bg-[var(--kravy-surface)] border border-indigo-500 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] font-bold flex items-center gap-3 px-6 py-4 rounded-2xl ring-1 ring-white/10">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-sm">✓</div>
          <span className="text-[var(--kravy-text-primary)]">{toast}</span>
        </div>
      )}

      {/* 🚀 RENAME CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
          <div className="relative bg-[var(--kravy-surface)] w-full max-w-sm rounded-[2rem] shadow-2xl border border-[var(--kravy-border)] overflow-hidden scale-100 animate-in fade-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[var(--kravy-border)]/50">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full rotate-12" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--kravy-text-primary)] leading-tight">Rename Category</h3>
                  <p className="text-[10px] text-[var(--kravy-text-muted)] font-black uppercase tracking-widest mt-0.5">Change section name</p>
                </div>
              </div>
              <form onSubmit={handleRenameCategory} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-1">New Name</label>
                  <input
                    name="name"
                    defaultValue={editingCategory.name}
                    autoFocus
                    autoComplete="off"
                    required
                    className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-3 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg)] text-[var(--kravy-text-secondary)] font-black text-xs hover:bg-[var(--kravy-surface-hover)] transition-all">Cancel</button>
                  <button type="submit" className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all">Update</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 DELETE CATEGORY CONFIRMATION */}
      {deletingCategory && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingCategory(null)} />
          <div className="relative bg-[var(--kravy-surface)] w-full max-w-sm rounded-[2rem] shadow-2xl border border-[var(--kravy-border)] overflow-hidden scale-100 animate-in fade-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-[900] text-[var(--kravy-text-primary)] mb-2">Delete {deletingCategory.name}?</h3>
              <p className="text-sm text-[var(--kravy-text-muted)] font-bold mb-8">
                All {deletingCategory.items.length} products will be moved to <span className="text-indigo-600 font-black">"Uncategorised"</span> section.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleDeleteCategory(false)} className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95">Delete Section Only</button>
                <button onClick={() => handleDeleteCategory(true)} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all active:scale-95">Delete Section & {deletingCategory.items.length} Items</button>
                <button onClick={() => setDeletingCategory(null)} className="w-full py-4 rounded-2xl bg-[var(--kravy-bg)] text-[var(--kravy-text-secondary)] font-black text-xs uppercase tracking-widest hover:bg-[var(--kravy-border)] transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 CATEGORY REORDER MODAL */}
      {showReorderModal && (
        <CategoryReorderModal
           menus={menus}
           onClose={() => setShowReorderModal(false)}
           onSave={async (orderedIds: string[]) => {
              try {
                setShowReorderModal(false);
                setToast("Saving order...");
                const res = await fetch("/api/categories/order", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", ...(asUserId ? { "x-impersonate-id": asUserId } : {}) },
                  body: JSON.stringify({ categoryIds: orderedIds })
                });
                if(res.ok) {
                   fetchMenus();
                   setToast("Category order saved!");
                }
              } catch (e) { console.error(e); setToast("Failed to reorder categories"); }
           }}
           onReset={async () => {
              try {
                setShowReorderModal(false);
                setToast("Resetting order...");
                const res = await fetch("/api/categories/order", { 
                  method: "DELETE",
                  headers: { ...(asUserId ? { "x-impersonate-id": asUserId } : {}) }
                });
                if(res.ok) {
                   fetchMenus();
                   setToast("Category order reset to alphabetical!");
                }
              } catch (e) { console.error(e); setToast("Failed to reset category order"); }
           }}
        />
      )}

      {/* 🚀 ADMIN IMAGE SEARCH SIDE PANEL */}
      <AnimatePresence>
        {imageSearchItem && (
          <div
            
            
            
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex justify-end"
            onClick={() => setImageSearchItem(null)}
          >
            <div
              
              
              
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[var(--kravy-surface)] border-l border-[var(--kravy-border)] h-full shadow-2xl flex flex-col p-8 overflow-hidden z-[10001]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--kravy-border)]/50 pb-4 mb-6">
                <div>
                  <h3 className="font-[900] text-[var(--kravy-text-primary)] text-xl tracking-tight">Search Images</h3>
                  <p className="text-xs text-[var(--kravy-text-muted)] font-medium mt-1 truncate max-w-[200px]">For: <span className="font-bold text-indigo-500">{imageSearchItem.name}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {/* <button
                    onClick={toggleSearchProvider}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                      searchProvider === "global"
                        ? "bg-amber-500/10 border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white"
                        : "bg-indigo-500/10 border-indigo-200 text-indigo-600 hover:bg-indigo-500 hover:text-white"
                    }`}
                    title={searchProvider === "global" ? "Switch to FoodSnap Search" : "Switch to Global Web Search"}
                  >
                    {searchProvider === "global" ? (
                      <>
                        <Sparkles size={12} /> FoodSnap
                      </>
                    ) : (
                      <>
                        <Globe size={12} /> Global Search
                      </>
                    )}
                  </button> */}
                  <button onClick={() => setImageSearchItem(null)} className="p-2 hover:bg-[var(--kravy-surface-hover)] rounded-xl text-[var(--kravy-text-secondary)] transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  value={searchImageQuery}
                  onChange={(e) => setSearchImageQuery(e.target.value)}
                  placeholder="Enter keyword to search..."
                  className="flex-1 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchImages()}
                />
                <button
                  onClick={() => handleSearchImages()}
                  disabled={searchingImages}
                  className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-indigo-600/10"
                >
                  {searchingImages ? <Loader2 className="animate-spin" size={16} /> : "Search"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                {searchingImages ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-xs text-[var(--kravy-text-muted)] font-black uppercase tracking-wider">Searching FoodSnap...</p>
                  </div>
                ) : searchedImages.length === 0 ? (
                  <p className="text-center py-20 text-xs text-[var(--kravy-text-muted)] font-bold opacity-60">No images found. Try a different query.</p>
                ) : (
                  <div className="flex flex-col gap-6 pb-12">
                    <div className="grid grid-cols-2 gap-4">
                      {searchedImages.slice(0, visibleImagesCount).map((img, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectImage(img.url)}
                          className="group flex flex-col gap-1.5 cursor-pointer"
                        >
                          <div className="relative h-28 rounded-xl overflow-hidden border border-[var(--kravy-border)] hover:border-indigo-500 shadow-sm transition-all">
                            <img src={img.url} alt={img.title || "Thumbnail"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 px-3 py-1.5 rounded-lg shadow-md active:scale-95">Use Image</span>
                            </div>
                          </div>
                          {img.title && (
                            <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] truncate px-1 text-center group-hover:text-indigo-500 transition-colors" title={img.title}>
                              {img.title}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {visibleImagesCount < searchedImages.length ? (
                      <button
                        onClick={() => setVisibleImagesCount(prev => prev + 12)}
                        className="w-full py-3 bg-[var(--kravy-surface-hover)] border border-[var(--kravy-border)] rounded-xl font-black text-xs uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-98"
                      >
                        Load More Images
                      </button>
                    ) : (
                      <button
                        onClick={handleLoadMoreImages}
                        disabled={searchingImages}
                        className="w-full py-3 bg-[var(--kravy-surface-hover)] border border-[var(--kravy-border)] rounded-xl font-black text-xs uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {searchingImages ? <Loader2 className="animate-spin" size={16} /> : "Search Next Page"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload New Menu Modal */}
      {showUploadMenuModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--kravy-border)]/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">Upload New Catalog (Kravy AI)</h3>
                <p className="text-xs text-[var(--kravy-text-muted)] font-medium mt-1">Upload a PDF, Doc, Excel, or Menu Image to automatically extract and merge new items into the existing menu.</p>
              </div>
              <button 
                onClick={() => setShowUploadMenuModal(false)}
                className="p-2 hover:bg-[var(--kravy-surface-hover)] rounded-xl text-[var(--kravy-text-secondary)] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">

              {/* Zone Selector */}
              <div className="space-y-4 bg-[var(--kravy-surface-hover)] p-6 rounded-[1.5rem] border border-[var(--kravy-border)] shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-[var(--kravy-text-primary)]">Assign to Zone</h4>
                    <p className="text-[10px] text-[var(--kravy-text-muted)] font-bold mt-1">Select a zone where these items will be automatically added.</p>
                  </div>
                </div>
                
                {isCreatingAiZone ? (
                  <div className="flex items-center gap-3">
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Enter New Zone Name (e.g. Ground Floor)"
                      className="flex-1 px-4 py-3 bg-[var(--kravy-surface)] border border-indigo-500 rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm"
                      value={newAiZone}
                      onChange={(e) => setNewAiZone(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && newAiZone.trim()) {
                          const newZ = newAiZone.trim().toUpperCase();
                          const res = await fetch("/api/profile/zones", { method: "POST", body: JSON.stringify({ action: "add", zoneName: newZ }) });
                          if (res.ok) {
                              setBusiness((prev: any) => prev ? { ...prev, zones: Array.from(new Set([...(prev.zones || []), newZ])) } : prev);
                              setSelectedAiZone(newZ);
                              setIsCreatingAiZone(false);
                              setNewAiZone("");
                              setToast("Zone created and selected!");
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={async () => {
                          if(!newAiZone.trim()) return;
                          const newZ = newAiZone.trim().toUpperCase();
                          const res = await fetch("/api/profile/zones", { method: "POST", body: JSON.stringify({ action: "add", zoneName: newZ }) });
                          if (res.ok) {
                              setBusiness((prev: any) => prev ? { ...prev, zones: Array.from(new Set([...(prev.zones || []), newZ])) } : prev);
                              setSelectedAiZone(newZ);
                              setIsCreatingAiZone(false);
                              setNewAiZone("");
                              setToast("Zone created and selected!");
                          }
                      }}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setIsCreatingAiZone(false)}
                      className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    className="w-full px-5 py-3.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer shadow-sm transition-all hover:border-[var(--kravy-text-muted)]"
                    value={selectedAiZone}
                    onChange={(e) => {
                        if (e.target.value === "CREATE_NEW_ZONE") {
                            setIsCreatingAiZone(true);
                        } else {
                            setSelectedAiZone(e.target.value);
                        }
                    }}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em', paddingRight: '3rem' }}
                  >
                    <option value="">-- Global (Available in all zones) --</option>
                    {business?.zones?.map((z: string) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                    <option value="CREATE_NEW_ZONE" className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30">+ Create New Zone</option>
                  </select>
                )}
              </div>
              
              {/* Drag and Drop Zone */}
              {extractedMenuItems.length === 0 && (
                <div className="space-y-6">
                  {/* Selected Files List */}
                  {menuFileQueue.length > 0 && (
                    <div className="bg-[var(--kravy-surface-hover)] border border-[var(--kravy-border)] rounded-2xl p-4 shadow-sm">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] mb-3">Selected Files ({menuFileQueue.length})</h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {menuFileQueue.map((file, idx) => (
                          <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-3 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                {file.type.includes("image") ? <ImageIcon size={16} /> : <File size={16} />}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-[var(--kravy-text-primary)] truncate">{file.name}</p>
                                <p className="text-[10px] text-[var(--kravy-text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setMenuFileQueue(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 hover:bg-red-50 text-[var(--kravy-text-muted)] hover:text-red-500 rounded-lg transition-colors shrink-0"
                              title="Remove file"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dropzone */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        setMenuFileQueue(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
                      }
                    }}
                    className={`border-[2px] border-dashed border-[var(--kravy-border)] hover:border-orange-500 rounded-2xl text-center bg-[var(--kravy-bg-2)]/40 hover:bg-orange-50/10 transition-all cursor-pointer relative flex flex-col items-center justify-center gap-3 ${menuFileQueue.length > 0 ? 'p-6' : 'p-12'}`}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.accept = ".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp";
                      input.onchange = (e: any) => {
                        if (e.target.files) {
                          setMenuFileQueue(prev => [...prev, ...Array.from(e.target.files)]);
                        }
                      };
                      input.click();
                    }}
                  >
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/20 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[var(--kravy-text-primary)] uppercase tracking-wider">{menuFileQueue.length > 0 ? "Add More Files" : "Drag & Drop Menu File Here"}</h4>
                      <p className="text-[10px] text-[var(--kravy-text-muted)] font-bold mt-1">Supports PDF, Excel, Word, or Images (JPG/PNG/WebP)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Progress */}
              {extractingMenu && (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-orange-500 uppercase tracking-widest animate-pulse">AI Digitizing & Scraping Menu...</p>
                    {extractedMenuProgress.total > 0 && (
                      <p className="text-[10px] text-[var(--kravy-text-muted)] font-bold mt-1">
                        Processing Chunk: {extractedMenuProgress.completed} of {extractedMenuProgress.total} items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* File Selected Action */}
              {menuFileQueue.length > 0 && !extractingMenu && extractedMenuItems.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-5 bg-[var(--kravy-surface-hover)] p-6 rounded-[1.5rem] border border-[var(--kravy-border)] shadow-inner">
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Extraction Mode</label>
                      <select
                        className="w-full px-4 py-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer shadow-sm transition-all"
                        value={chunkingMode}
                        onChange={(e) => setChunkingMode(e.target.value as any)}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
                      >
                        <option value="batch">Batch / Default (All at once)</option>
                        <option value="single">Single Mode (One by one)</option>
                        <option value="stream">Stream Mode (Automated Chunking)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Menu Translation</label>
                      <select
                        className="w-full px-4 py-3 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-sm font-bold text-[var(--kravy-text-primary)] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer shadow-sm transition-all"
                        value={aiLanguagePref}
                        onChange={(e) => setAiLanguagePref(e.target.value)}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em', paddingRight: '2.5rem' }}
                      >
                        <option value="english">English Only</option>
                        <option value="dual">English + Regional (Hindi/Marathi)</option>
                        <option value="arabic">English + Arabian (Arabic)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={startParsingMenuFiles}
                    className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2 mt-2 w-full max-w-2xl justify-center"
                  >
                    <Zap size={14} fill="currentColor" /> 
                    {chunkingMode === "stream" ? "Start Automated Extraction" : "Extract Menu Items"}
                  </button>
                </div>
              )}



              {/* Extracted Items List */}
              {extractedMenuItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center opacity-75">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[var(--kravy-text-primary)]">Parsed Menu Preview ({extractedMenuItems.length} Items)</h4>
                    <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Select items to import</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {extractedMenuItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`bg-[var(--kravy-surface)] border rounded-[1.5rem] p-4 flex items-center justify-between gap-4 transition-all ${
                          item.checked ? "border-orange-500 bg-orange-50/5 animate-pulse" : "border-[var(--kravy-border)]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => {
                              setExtractedMenuItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: e.target.checked } : it));
                            }}
                            className="w-4 h-4 rounded border-[var(--kravy-border)] text-orange-600 focus:ring-orange-500/20 accent-orange-500 cursor-pointer animate-none"
                          />
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--kravy-bg-2)] flex-shrink-0 relative">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)]">
                                {item.img_status === 'loading' ? <Loader2 className="animate-spin text-orange-500" size={16} /> : <ImageIcon size={16} />}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-[var(--kravy-text-primary)] truncate" title={item.name}>{item.name}</h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black text-orange-500 uppercase bg-orange-500/10 px-1.5 py-0.5 rounded">{item.category}</span>
                              <span className="text-[9px] font-bold text-[var(--kravy-text-muted)]">₹{item.price}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {extractedMenuItems.length > 0 && (
              <div className="p-6 border-t border-[var(--kravy-border)]/50 flex justify-between items-center gap-4 bg-[var(--kravy-bg-2)]/30">
                <button
                  onClick={() => {
                    setExtractedMenuItems([]);
                    setMenuFileQueue([]);
                  }}
                  className="px-6 py-3 border border-[var(--kravy-border)] hover:bg-[var(--kravy-surface-hover)] text-[var(--kravy-text-primary)] font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Clear / Upload New
                </button>
                <button
                  onClick={handleAddExtractedMenu}
                  disabled={savingExtractedMenu}
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingExtractedMenu ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} fill="currentColor" />}
                  Add to Existing Menu
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
/* ================= COMPONENT: EDIT MODAL ================= */
function EditModal({ 
  item, 
  onClose, 
  onSave, 
  allCategories, 
  taxEnabled, 
  setToast,
  availableZones,
  onAddZone
}: { 
  item: MenuItem; 
  onClose: () => void; 
  onSave: (u: MenuItem) => void;
  allCategories: { id: string, name: string }[];
  taxEnabled: boolean;
  setToast: (msg: string) => void;
  availableZones: string[];
  onAddZone: (z: string) => void;
}) {
    const [local, setLocal] = useState<MenuItem>(item);
    const [tab, setTab] = useState<"basic" | "variants" | "qr" | "lang" | "image">("basic");
    const [uploading, setUploading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [showQuickAddZone, setShowQuickAddZone] = useState(false);
    const [quickZoneInput, setQuickZoneInput] = useState("");

    useEffect(() => {
      setMounted(true);
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
          onAddZone(name);
          setLocal(prev => ({ ...prev, zones: [name] } as any));
          setQuickZoneInput("");
          setShowQuickAddZone(false);
          setToast(`Added zone "${name}"`);
        }
      } catch (err) {}
    };

    useEffect(() => {
      console.log("🔄 [EDIT_MODAL_INIT] Setting local state from item:", item.name, item.imageUrl);
      setLocal(item);
    }, [item.id]); 

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
          setToast("Image uploaded to Cloudinary!");
        } else {
          setToast("Upload failed");
        }
      } catch (err) {
        setToast("Upload Error");
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
            newVariants[groupIdx].options = [
                ...(Array.isArray(newVariants[groupIdx].options) ? newVariants[groupIdx].options : []),
                { id: crypto.randomUUID(), name: "New Option", price: 0 }
            ];
            return { ...prev, variants: newVariants };
        });
    };

    const handleUpdateVariantOption = (groupIdx: number, optionIdx: number, updates: any) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            const newOptions = [...(Array.isArray(newVariants[groupIdx].options) ? newVariants[groupIdx].options : [])];
            if (newOptions[optionIdx]) {
                newOptions[optionIdx] = { ...newOptions[optionIdx], ...updates };
            }
            newVariants[groupIdx].options = newOptions;
            return { ...prev, variants: newVariants };
        });
    };

    const handleDeleteVariantOption = (groupIdx: number, optionIdx: number) => {
        setLocal(prev => {
            const newVariants = [...(Array.isArray(prev.variants) ? prev.variants : [])];
            const newOptions = [...(Array.isArray(newVariants[groupIdx].options) ? newVariants[groupIdx].options : [])];
            newOptions.splice(optionIdx, 1);
            newVariants[groupIdx].options = newOptions;
            return { ...prev, variants: newVariants };
        });
    };

    if (!mounted) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
        <div   className="relative bg-[var(--kravy-surface)] rounded-[32px] border border-[var(--kravy-border)] shadow-2xl w-full max-w-lg p-0 z-[10000] overflow-hidden">

          <div className="p-8 pb-4">
            <h3 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">✏️</div>
              Edit Item Details
            </h3>

            <div className="flex gap-2 mb-6 border-b border-[var(--kravy-border)] overflow-x-auto no-scrollbar">
              {(["basic", "variants", "image", "qr", "lang"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-[var(--kravy-text-muted)]"}`}
                >
                  {t === "basic" ? "Info" : t === "variants" ? "Variants" : t === "image" ? "Photo" : t === "qr" ? "QR Extra" : "Lang"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-8 max-h-[50vh] overflow-y-auto no-scrollbar pb-8">
            {tab === "variants" && (
              <div className="space-y-6 pb-12">
                <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div>
                    <h4 className="text-sm font-black text-indigo-900">Variant Groups</h4>
                    <p className="text-[10px] font-bold text-indigo-500/70 mt-1">E.g., Size, Choice of Crust, Add-ons</p>
                  </div>
                  <button onClick={handleAddVariantGroup} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95">
                    + Add Group
                  </button>
                </div>

                {(Array.isArray(local.variants) ? local.variants : []).map((group: any, gIdx: number) => (
                  <div key={group.id || gIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Group Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1 space-y-3 w-full">
                        <input
                          className="w-full bg-white border border-slate-300 text-slate-800 font-black text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/30"
                          value={group.groupName}
                          onChange={(e) => handleUpdateVariantGroup(gIdx, { groupName: e.target.value })}
                          placeholder="Group Name (e.g. Select Size)"
                        />
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                            <input
                              type="radio"
                              name={`type-${gIdx}`}
                              checked={group.type === "radio"}
                              onChange={() => handleUpdateVariantGroup(gIdx, { type: "radio" })}
                              className="w-4 h-4 text-indigo-600"
                            />
                            Single Choice
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                            <input
                              type="radio"
                              name={`type-${gIdx}`}
                              checked={group.type === "checkbox"}
                              onChange={() => handleUpdateVariantGroup(gIdx, { type: "checkbox" })}
                              className="w-4 h-4 text-indigo-600"
                            />
                            Multiple Choice
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 ml-auto bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            <input
                              type="checkbox"
                              checked={group.required}
                              onChange={(e) => handleUpdateVariantGroup(gIdx, { required: e.target.checked })}
                              className="w-3.5 h-3.5 text-amber-500 rounded cursor-pointer"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteVariantGroup(gIdx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Group">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Group Options */}
                    <div className="p-4 space-y-2 bg-slate-50/30">
                      {(Array.isArray(group.options) ? group.options : []).map((opt: any, oIdx: number) => (
                        <div key={opt.id || oIdx} className="flex gap-2 items-center">
                          <input
                            className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                            value={opt.name}
                            onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, { name: e.target.value })}
                            placeholder="Option Name"
                          />
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">₹</span>
                            <input
                              type="number"
                              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg pl-7 pr-2 py-2 outline-none focus:border-indigo-400"
                              value={opt.price}
                              onChange={(e) => handleUpdateVariantOption(gIdx, oIdx, { price: Number(e.target.value) })}
                              placeholder="Price"
                            />
                          </div>
                          <button onClick={() => handleDeleteVariantOption(gIdx, oIdx)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => handleAddVariantOption(gIdx)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 py-2 flex items-center gap-1">
                        + Add Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "basic" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Item Name</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                    value={local.name}
                    onChange={(e) => setLocal({ ...local, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Price (₹)</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      type="number"
                      value={local.price ?? ""}
                      onChange={(e) => setLocal({ ...local, price: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Selling Price (₹)</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                      type="number"
                      value={local.sellingPrice ?? ""}
                      onChange={(e) => setLocal({ ...local, sellingPrice: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Description</label>
                  <textarea
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                    rows={3}
                    value={local.description ?? ""}
                    onChange={(e) => setLocal({ ...local, description: e.target.value })}
                  />
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
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                    value={local.expiryDate ?? ""}
                    onChange={(e) => setLocal({ ...local, expiryDate: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Category</label>
                    <select
                      value={local.categoryId ?? "uncategorised"}
                      onChange={(e) => setLocal({ ...local, categoryId: e.target.value })}
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                    >
                      {allCategories.map((c) => <option key={c.id} value={c.id === "all" ? "uncategorised" : c.id} className="bg-[var(--kravy-bg)]">{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Unit</label>
                    <input
                      className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                      value={local.unit ?? ""}
                      onChange={(e) => setLocal({ ...local, unit: e.target.value })}
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
                    value={(local as any).zones?.[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocal({ ...local, zones: val ? [val] : [] } as any);
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
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Manual Image URL</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                    value={local.imageUrl ?? ""}
                    placeholder="https://..."
                    onChange={(e) => setLocal({ ...local, imageUrl: e.target.value })}
                  />
                </div>

                {taxEnabled && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Tax Status</label>
                    <div className="flex gap-2 p-1 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-2xl">
                      {["Without Tax", "With Tax"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setLocal({ ...local, taxStatus: status })}
                          className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                            local.taxStatus === status
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
                          onClick={() => setLocal({ ...local, gst: val })}
                          className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                            local.gst === val
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-[var(--kravy-bg)] border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:border-indigo-600/50"
                          }`}
                        >
                          GST @ {val}%
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">HSN/SAC Code</label>
                      <input
                        className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                        placeholder="e.g. 9963"
                        value={local.hsnCode ?? ""}
                        onChange={(e) => setLocal({ ...local, hsnCode: e.target.value })}
                      />
                    </div>
                    </div>
                  )}
              </div>
            )}

            {tab === "image" && (
              <div className="space-y-6 flex flex-col items-center">
                 <div className="w-full h-48 rounded-[2rem] border-2 border-dashed border-[var(--kravy-border)] bg-[var(--kravy-bg)] relative overflow-hidden flex items-center justify-center group">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                         <RotateCcw className="animate-spin text-indigo-500" size={24} />
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Uploading to Cloudinary...</p>
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
                           <Plus size={24} strokeWidth={3} />
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
                    <p className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest text-center">Or enter URL manually in Basic tab</p>
                 </div>
              </div>
            )}

            {tab === "qr" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-3">Dietary Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocal({ ...local, isVeg: true, isEgg: false })}
                      className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] transition-all ${local.isVeg ? "border-green-500 bg-green-50 text-green-600" : "border-[var(--kravy-border)] text-[var(--kravy-text-muted)]"}`}
                    >
                      🥗 Veg
                    </button>
                    <button
                      onClick={() => setLocal({ ...local, isVeg: false, isEgg: true })}
                      className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] transition-all ${local.isEgg ? "border-amber-500 bg-amber-50 text-amber-600" : "border-[var(--kravy-border)] text-[var(--kravy-text-muted)]"}`}
                    >
                      🥚 Egg
                    </button>
                    <button
                      onClick={() => setLocal({ ...local, isVeg: false, isEgg: false })}
                      className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] transition-all ${(!local.isVeg && !local.isEgg) ? "border-red-500 bg-red-50 text-red-600" : "border-[var(--kravy-border)] text-[var(--kravy-text-muted)]"}`}
                    >
                      🍗 Non-Veg
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1">Menu Badges</label>
                    <div className="space-y-2">
                      {[
                        { id: "isBestseller", label: "Bestseller", icon: "🏅" },
                        { id: "isRecommended", label: "Recommended", icon: "👍" },
                        { id: "isNew", label: "New Launch", icon: "🆕" }
                      ].map(b => (
                        <label key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--kravy-bg)] cursor-pointer hover:bg-[var(--kravy-surface-hover)] transition-all">
                          <input
                            type="checkbox"
                            checked={(local as any)[b.id]}
                            onChange={(e) => setLocal({ ...local, [b.id]: e.target.checked })}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                          <span className="text-sm font-bold">{b.icon} {b.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1">Properties</label>
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-tighter mb-1.5 underline">Spiciness Level</span>
                        <div className="flex gap-1 bg-[var(--kravy-bg)] p-1 rounded-lg">
                          {["mild", "medium", "hot"].map(s => (
                            <button
                              key={s}
                              onClick={() => setLocal({ ...local, spiciness: s })}
                              className={`flex-1 py-1 px-2 rounded-md font-black text-[10px] capitalize transition-all ${local.spiciness === s ? "bg-white shadow-sm text-indigo-600" : "text-[var(--kravy-text-muted)] hover:text-indigo-400"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-tighter mb-1.5 underline">Base Rating (4-5)</span>
                        <input
                          type="number"
                          step="0.1" max="5" min="3"
                          className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-sm font-black px-3 py-2 rounded-lg"
                          value={local.rating ?? 4.5}
                          onChange={(e) => setLocal({ ...local, rating: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Upsell Suggestion (e.g. Best with Cold Coffee)</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none font-medium text-xs italic"
                    value={local.upsellText ?? ""}
                    placeholder="Best with..."
                    onChange={(e) => setLocal({ ...local, upsellText: e.target.value })}
                  />
                </div>
              </div>
            )}

            {tab === "lang" && (
              <div className="space-y-5">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-2">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mb-1">Smart Translate</p>
                  <p className="text-[11px] text-indigo-500 leading-tight">Add translations for the QR menu to reach more customers!</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2 flex items-center justify-between">
                    Hindi Name (हिन्दी)
                    <button onClick={() => setLocal({ ...local, hiName: "पनीर टिक्का" })} className="text-[8px] text-indigo-500 font-black px-1.5 py-0.5 border border-indigo-200 rounded">Sample</button>
                  </label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none font-bold"
                    value={local.hiName ?? ""}
                    placeholder="जैसे: पनीर टिक्का"
                    onChange={(e) => setLocal({ ...local, hiName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Marathi Name (मराठी)</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none font-bold"
                    value={local.mrName ?? ""}
                    placeholder="मराठी नाव"
                    onChange={(e) => setLocal({ ...local, mrName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1 mb-2">Tamil Name (தமிழ்)</label>
                  <input
                    className="w-full bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl px-4 py-3 outline-none font-bold"
                    value={local.taName ?? ""}
                    placeholder="தமிழ் பெயர்"
                    onChange={(e) => setLocal({ ...local, taName: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-8 pt-4 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)]">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-surface-hover)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log("💎 [EDIT_MODAL_ON_SAVE] Final Local State:", JSON.stringify(local, null, 2));
                onSave(local);
              }}
              className="px-8 py-3 font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 text-white active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>, document.body
    );
}

function ConfirmDelete({ item, onClose, onConfirm }: { item: MenuItem; onClose: () => void; onConfirm: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
        <div   className="relative bg-[var(--kravy-surface)] rounded-[32px] border border-[var(--kravy-border)] shadow-2xl w-full max-w-sm p-8 z-[10000] text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-3 tracking-tight">Delete Item?</h3>
          <p className="text-[var(--kravy-text-muted)] font-medium mb-8 leading-relaxed">
            Are you sure you want to delete <span className="font-black text-[var(--kravy-text-primary)]">"{item.name}"</span>? This action cannot be undone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onClose} className="px-6 py-4 font-black text-[var(--kravy-text-muted)] rounded-2xl hover:bg-[var(--kravy-surface-hover)] transition-all">Cancel</button>
            <button onClick={() => onConfirm()} className="px-6 py-4 font-black rounded-2xl bg-rose-600 hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 text-white active:scale-95">Delete</button>
          </div>
        </div>
      </div>, document.body
    );
}

function CategoryReorderModal({ menus, onClose, onSave, onReset }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const validCategories = menus.filter((m: any) => m.id !== 'favorites_virtual' && m.id !== '__uncategorised__');
  const [reorderList, setReorderList] = useState(validCategories);

  if (!mounted) return null;

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newList = [...reorderList];
    const temp = newList[idx - 1];
    newList[idx - 1] = newList[idx];
    newList[idx] = temp;
    setReorderList(newList);
  };

  const moveDown = (idx: number) => {
    if (idx === reorderList.length - 1) return;
    const newList = [...reorderList];
    const temp = newList[idx + 1];
    newList[idx + 1] = newList[idx];
    newList[idx] = temp;
    setReorderList(newList);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-[var(--kravy-surface)] w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-[var(--kravy-border)] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-[var(--kravy-border)]/50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">Customize Order</h3>
              <p className="text-[10px] text-[var(--kravy-text-muted)] font-black uppercase tracking-widest mt-1">Reorder Categories on POS</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><X size={20} className="text-[var(--kravy-text-primary)]" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {reorderList.map((m: any, idx: number) => (
              <div key={m.id} className="flex items-center gap-4 bg-[var(--kravy-bg)] p-3 px-4 rounded-2xl border border-[var(--kravy-border)] group hover:border-indigo-500/50 transition-colors shadow-sm">
                <span className="font-black text-sm text-[var(--kravy-text-primary)] flex-1">{m.name}</span>
                <div className="flex items-center gap-1.5">
                  <button disabled={idx === 0} onClick={() => moveUp(idx)} className="p-2 bg-[var(--kravy-surface)] rounded-xl border border-[var(--kravy-border)] disabled:opacity-20 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-[var(--kravy-text-secondary)] shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                  <button disabled={idx === reorderList.length - 1} onClick={() => moveDown(idx)} className="p-2 bg-[var(--kravy-surface)] rounded-xl border border-[var(--kravy-border)] disabled:opacity-20 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-[var(--kravy-text-secondary)] shadow-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-[var(--kravy-border)]/50 flex gap-3">
             <button onClick={onReset} className="px-6 py-4 text-xs uppercase tracking-widest font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm">Reset</button>
             <button onClick={() => onSave(reorderList.map((m: any) => m.id))} className="flex-1 py-4 text-xs uppercase tracking-widest font-black bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:bg-indigo-700 transition-all active:scale-95">Save Order</button>
          </div>
       </div>
    </div>, document.body
  );
}

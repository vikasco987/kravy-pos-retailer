
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/currency-context";
import { kravy } from "@/lib/sounds";
import { toast } from "sonner";
import { useTerminalContext } from "@/components/TerminalContext";
import { motion, AnimatePresence } from "framer-motion";
import ItemDetailScreen from "./ItemDetailScreen";
import {
  ArrowLeft,
  Search,
  Plus,
  Sparkles,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  FolderOpen,
  ArrowUpDown,
  MapPin,
  Upload,
  Layers,
  CheckCircle2,
  Info,
  LayoutGrid,
  Settings,
  Calendar,
  Scan,
  Barcode,
  Tag,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  History,
  Package,
  Boxes,
  Sliders,
  Pencil
} from "lucide-react";

// Types
type MenuItem = {
  id: string;
  name: string;
  price?: number;
  sellingPrice?: number;
  mrp?: number;
  wholesalePrice?: number;
  purchaseTaxStatus?: string | null;
  wholesaleTaxStatus?: string | null;
  minWholesaleQty?: number | null;
  openingStock?: number | null;
  currentStock?: number | null;
  reorderLevel?: number | null;
  stockInDate?: string | null;
  gst?: number | null;
  taxStatus?: string | null;
  hsnCode?: string | null;
  imageUrl?: string | null;
  unit?: string | null;
  barcode?: string | null;
  itemType?: "Product" | "Service";
  categoryId?: string | null;
  isVeg?: boolean;
  isEgg?: boolean;
  isActive?: boolean;
  sku?: string | null;
  description?: string | null;
  variants?: { name: string; price: number | string }[];
  zones?: string[];
};

type MenuCategory = {
  id: string;
  name: string;
  sortOrder?: number | null;
  zones?: string[];
  items: MenuItem[];
};

interface MobileEditMenuViewProps {
  asUserId?: string | null;
  onSwitchToDesktop?: () => void;
}

export default function MobileEditMenuView({ asUserId, onSwitchToDesktop }: MobileEditMenuViewProps = {}) {
  const router = useRouter();
  const { currencySymbol: sym } = useCurrency();
  const { emitUpdate } = useTerminalContext();

  // Primary States
  const [mounted, setMounted] = useState(false);
  const [menus, setMenus] = useState<MenuCategory[]>([]);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; sortOrder?: number | null; zones?: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Zone States
  const [topZone, setTopZone] = useState("Global");
  const [topZoneModalVisible, setTopZoneModalVisible] = useState(false);

  // Item Detail Screen State (View Mode with Details & Transactions)
  const [detailScreenItem, setDetailScreenItem] = useState<{ item: MenuItem; catId: string; catName: string } | null>(null);

  // Edit Item Modal States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editPurchaseTaxStatus, setEditPurchaseTaxStatus] = useState<"With Tax" | "Without Tax">("With Tax");
  const [editWholesalePrice, setEditWholesalePrice] = useState("");
  const [editWholesaleTaxStatus, setEditWholesaleTaxStatus] = useState<"With Tax" | "Without Tax">("Without Tax");
  const [editMinWholesaleQty, setEditMinWholesaleQty] = useState("");
  const [editMrp, setEditMrp] = useState("");
  const [showOtherPricing, setShowOtherPricing] = useState(false);
  // Stock / Inventory States
  const [isInventoryEnabled, setIsInventoryEnabled] = useState(false);
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  
  // Stock In / Stock Out / History Sheet States
  const [stockActionItem, setStockActionItem] = useState<MenuItem | null>(null);
  const [stockActionType, setStockActionType] = useState<"SELECT" | "IN" | "OUT" | "HISTORY">("SELECT");
  const [stockQuantityInput, setStockQuantityInput] = useState<string>("");
  const [stockUnitPriceInput, setStockUnitPriceInput] = useState<string>("");
  const [stockReasonInput, setStockReasonInput] = useState<string>("");
  const [stockNotesInput, setStockNotesInput] = useState<string>("");
  const [stockAdjustmentDate, setStockAdjustmentDate] = useState<string>("");
  const [isSubmittingStock, setIsSubmittingStock] = useState<boolean>(false);
  const [stockHistoryLogs, setStockHistoryLogs] = useState<any[]>([]);
  const [loadingStockHistory, setLoadingStockHistory] = useState<boolean>(false);

  const [showStockSection, setShowStockSection] = useState(false);
  const [editOpeningStock, setEditOpeningStock] = useState("");
  const [editStockInDate, setEditStockInDate] = useState("");
  const [editLowStockAlert, setEditLowStockAlert] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editItemType, setEditItemType] = useState<"Product" | "Service">("Product");
  const [editBarcode, setEditBarcode] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editIsVeg, setEditIsVeg] = useState(true);
  const [editIsEgg, setEditIsEgg] = useState(false);
  const [isFoodTypeEnabled, setIsFoodTypeEnabled] = useState(true);
  const [editDescription, setEditDescription] = useState("");
  // GST & Tax Configuration States
  const [isGstEnabled, setIsGstEnabled] = useState(false);
  const [showItemSettingsModal, setShowItemSettingsModal] = useState(false);
  const [editTaxStatus, setEditTaxStatus] = useState<"With Tax" | "Without Tax">("Without Tax");
  const [editGstRate, setEditGstRate] = useState<string>("GST@5%");
  const [editHsnCode, setEditHsnCode] = useState("");
  const [showTaxRateModal, setShowTaxRateModal] = useState(false);
  const [variants, setVariants] = useState<{ name: string; price: string | number }[]>([]);
  const [variantType, setVariantType] = useState<"Size" | "Quantity" | "Custom">("Size");
  const [showVariantTypeModal, setShowVariantTypeModal] = useState(false);
  const [editZone, setEditZone] = useState("Global");
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [showCategorySelectModal, setShowCategorySelectModal] = useState(false);
  const [showUnitSelectModal, setShowUnitSelectModal] = useState(false);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [showAddUnitPrompt, setShowAddUnitPrompt] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState("");
  const [isFetchingItemDetails, setIsFetchingItemDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Tab switcher: "items" | "categories"
  const [menuTab, setMenuTab] = useState<"items" | "categories">("items");

  // Create Category Modal States
  const [isCreateCategoryModalVisible, setIsCreateCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Add Item Category Screen (Comprehensive Drawer / Modal)
  const [showAddItemCategoryScreen, setShowAddItemCategoryScreen] = useState(false);
  const [categoryScreenName, setCategoryScreenName] = useState("");
  const [categoryScreenZone, setCategoryScreenZone] = useState("Global");
  const [isReorderModalVisible, setIsReorderModalVisible] = useState(false);
  const [reorderList, setReorderList] = useState<{ id: string; name: string }[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Edit Category Modal States
  const [isEditCategoryModalVisible, setIsEditCategoryModalVisible] = useState(false);
  const [selectedCategoryToEdit, setSelectedCategoryToEdit] = useState<MenuCategory | null>(null);
  const [editCategoryNewName, setEditCategoryNewName] = useState("");
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);

  // Image Search Modal States
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [searchImageQuery, setSearchImageQuery] = useState("");
  const [searchedImages, setSearchedImages] = useState<{ url: string; title?: string }[]>([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [syncingAllImages, setSyncingAllImages] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });

  // Feedbacks
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    type: "success" | "danger" | "warning";
    title: string;
    detail: string;
  }>({ open: false, type: "success", title: "", detail: "" });

  const showFeedback = (title: string, detail: string, type: "success" | "danger" | "warning" = "success") => {
    setFeedbackModal({ open: true, type, title, detail });
    setTimeout(() => {
      setFeedbackModal((prev) => ({ ...prev, open: false }));
    }, 2000);
  };

  // Close top-level active modal or sheet if open, returns true if handled
  const handleCloseTopModal = useCallback((): boolean => {
    if (showImageSearchModal) {
      setShowImageSearchModal(false);
      return true;
    }
    if (showCategorySelectModal) {
      setShowCategorySelectModal(false);
      return true;
    }
    if (showUnitSelectModal) {
      setShowUnitSelectModal(false);
      return true;
    }
    if (showVariantTypeModal) {
      setShowVariantTypeModal(false);
      return true;
    }
    if (zoneModalVisible) {
      setZoneModalVisible(false);
      return true;
    }
    if (topZoneModalVisible) {
      setTopZoneModalVisible(false);
      return true;
    }
    if (showTaxRateModal) {
      setShowTaxRateModal(false);
      return true;
    }
    if (showItemSettingsModal) {
      setShowItemSettingsModal(false);
      return true;
    }
    if (isCreateCategoryModalVisible) {
      setIsCreateCategoryModalVisible(false);
      return true;
    }
    if (isEditCategoryModalVisible) {
      setIsEditCategoryModalVisible(false);
      return true;
    }
    if (isReorderModalVisible) {
      setIsReorderModalVisible(false);
      return true;
    }
    if (showAddItemCategoryScreen) {
      setShowAddItemCategoryScreen(false);
      return true;
    }
    if (stockActionItem) {
      setStockActionItem(null);
      setStockActionType("SELECT");
      return true;
    }
    if (isEditModalVisible) {
      setIsEditModalVisible(false);
      return true;
    }
    if (detailScreenItem) {
      setDetailScreenItem(null);
      return true;
    }
    return false;
  }, [
    showImageSearchModal,
    showCategorySelectModal,
    showUnitSelectModal,
    showVariantTypeModal,
    zoneModalVisible,
    topZoneModalVisible,
    showTaxRateModal,
    showItemSettingsModal,
    isCreateCategoryModalVisible,
    isEditCategoryModalVisible,
    isReorderModalVisible,
    showAddItemCategoryScreen,
    stockActionItem,
    isEditModalVisible,
    detailScreenItem,
  ]);

  // Keep a ref to handleCloseTopModal to avoid re-binding window listeners on every state change
  const handleCloseTopModalRef = useRef(handleCloseTopModal);
  useEffect(() => {
    handleCloseTopModalRef.current = handleCloseTopModal;
  }, [handleCloseTopModal]);

  // Push history state whenever a major modal or detail screen opens
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      detailScreenItem ||
      isEditModalVisible ||
      showAddItemCategoryScreen ||
      isReorderModalVisible ||
      isEditCategoryModalVisible ||
      isCreateCategoryModalVisible ||
      stockActionItem ||
      showItemSettingsModal ||
      topZoneModalVisible
    );

    if (isAnyModalOpen) {
      // Check if we already pushed state for this modal
      if (typeof window !== "undefined" && !window.history.state?.kravyMenuModalOpen) {
        window.history.pushState({ kravyMenuModalOpen: true }, "");
      }
    }
  }, [
    detailScreenItem,
    isEditModalVisible,
    showAddItemCategoryScreen,
    isReorderModalVisible,
    isEditCategoryModalVisible,
    isCreateCategoryModalVisible,
    stockActionItem,
    showItemSettingsModal,
    topZoneModalVisible,
  ]);

  // Listen to popstate (browser/Android back gesture) and hardware-back event from Capacitor
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const handled = handleCloseTopModalRef.current();
      if (handled) {
        // Modal was closed by back button, stop it from popping further
        e.preventDefault?.();
      }
    };

    const handleHardwareBack = (e: Event) => {
      const handled = handleCloseTopModalRef.current();
      if (handled) {
        e.preventDefault(); // Stop CapacitorBackButtonHandler from calling router.back() or exitApp()
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("kravy:hardware-back", handleHardwareBack);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("kravy:hardware-back", handleHardwareBack);
    };
  }, []);

  const handleHeaderBack = () => {
    const handled = handleCloseTopModalRef.current();
    if (handled) {
      // If modal was closed, revert the pushed history state if present
      if (typeof window !== "undefined" && window.history.state?.kravyMenuModalOpen) {
        window.history.back();
      }
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/billing/checkout");
    }
  };

  // 1. Fetch Categories & Menu
  const fetchAllCategories = useCallback(async () => {
    try {
      const catUrl = asUserId
        ? `/api/categories?asUserId=${asUserId}&t=${Date.now()}`
        : `/api/categories?t=${Date.now()}`;
      const res = await fetch(catUrl);
      if (res.ok) {
        const data = await res.json();
        const normalized = Array.isArray(data)
          ? data
              .map((c: any) => ({
                id: String(c.id || c._id || ""),
                name: String(c.name || ""),
                sortOrder: c.sortOrder ?? null,
                zones: Array.isArray(c.zones) ? c.zones : [],
              }))
              .filter((c: any) => c.id !== "")
              .sort((a: any, b: any) => {
                if (a.sortOrder == null && b.sortOrder == null) return a.name.localeCompare(b.name);
                if (a.sortOrder == null) return 1;
                if (b.sortOrder == null) return -1;
                return (a.sortOrder as number) - (b.sortOrder as number);
              })
          : [];
        setAllCategories(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [asUserId]);

  const fetchMenus = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const itemsUrl = asUserId
        ? `/api/items?asUserId=${asUserId}&t=${Date.now()}`
        : `/api/items?t=${Date.now()}`;
      const catsUrl = asUserId
        ? `/api/categories?asUserId=${asUserId}&t=${Date.now()}`
        : `/api/categories?t=${Date.now()}`;

      const [itemsRes, catsRes] = await Promise.all([
        fetch(itemsUrl),
        fetch(catsUrl),
      ]);

      let itemsData: any[] = [];
      let catsData: any[] = [];

      if (itemsRes.ok) itemsData = await itemsRes.json();
      if (catsRes.ok) catsData = await catsRes.json();

      const normalizedCats = Array.isArray(catsData) ? catsData : [];
      setAllCategories(normalizedCats);

      // Build category map matching React Native app structure
      const categoryMap: Record<string, MenuCategory> = {};

      // Seed with existing categories
      normalizedCats.forEach((cat: any) => {
        const catId = String(cat.id || cat._id);
        const catName = String(cat.name || "Others");
        const key = catId;
        categoryMap[key] = {
          id: catId,
          name: catName,
          sortOrder: cat.sortOrder ?? null,
          zones: cat.zones || [],
          items: [],
        };
      });

      // Populate items
      if (Array.isArray(itemsData)) {
        itemsData.forEach((item: any) => {
          const catId = item.categoryId ? String(item.categoryId) : "others";
          const catName = item.category?.name || "Others";

          if (!categoryMap[catId]) {
            categoryMap[catId] = {
              id: catId,
              name: catName,
              sortOrder: 999,
              zones: [],
              items: [],
            };
          }

          categoryMap[catId].items.push({
            id: String(item.id || item._id),
            name: String(item.name || "Unnamed Item"),
            price: Number(item.sellingPrice || item.price || 0),
            sellingPrice: Number(item.sellingPrice || item.price || 0),
            mrp: item.mrp != null ? Number(item.mrp) : undefined,
            wholesalePrice: item.wholesalePrice != null ? Number(item.wholesalePrice) : undefined,
            openingStock: item.openingStock != null ? Number(item.openingStock) : (item.currentStock != null ? Number(item.currentStock) : null),
            currentStock: item.currentStock != null ? Number(item.currentStock) : null,
            reorderLevel: item.reorderLevel != null ? Number(item.reorderLevel) : null,
            stockInDate: item.updatedAt || item.createdAt ? new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-GB") : null,
            gst: item.gst != null ? Number(item.gst) : null,
            taxStatus: item.taxStatus || null,
            hsnCode: item.hsnCode || null,
            imageUrl: item.imageUrl || item.image || "",
            unit: item.unit || "",
            barcode: item.barcode || null,
            sku: item.inventoryCode || item.shortCode || null,
            categoryId: catId,
            isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
            isVeg: item.isVeg !== undefined ? item.isVeg : true,
            isEgg: item.isEgg !== undefined ? item.isEgg : false,
            description: item.description || "",
            variants: item.variants || [],
            zones: item.zones || [],
          });
        });
      }

      const finalMenus = Object.values(categoryMap).sort((a, b) => {
        if (a.sortOrder == null && b.sortOrder == null) return a.name.localeCompare(b.name);
        if (a.sortOrder == null) return 1;
        if (b.sortOrder == null) return -1;
        return (a.sortOrder as number) - (b.sortOrder as number);
      });

      setMenus(finalMenus);
    } catch (err) {
      console.error("Failed to load menu items:", err);
      toast.error("Failed to load menu items");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [asUserId]);

  useEffect(() => {
    setMounted(true);
    fetchMenus(true);
    fetchAllCategories();
    if (typeof localStorage !== "undefined") {
      const savedInv = localStorage.getItem("kravy_item_inventory_enabled");
      if (savedInv === "true") {
        setIsInventoryEnabled(true);
      }
    }
  }, [fetchMenus, fetchAllCategories]);

  // Available Zones from categories & items
  const ZONE_OPTIONS = useMemo(() => {
    const zoneSet = new Set<string>(["Global"]);
    allCategories.forEach((cat) => {
      if (Array.isArray(cat.zones)) cat.zones.forEach((z) => zoneSet.add(z));
    });
    menus.forEach((cat) => {
      cat.items.forEach((it) => {
        if (Array.isArray(it.zones)) it.zones.forEach((z) => zoneSet.add(z));
      });
    });
    return Array.from(zoneSet);
  }, [allCategories, menus]);

  // Filter Categories by Top Zone
  const zoneFilteredCategories = useMemo(() => {
    return menus.filter((cat) => {
      if (topZone === "Global") return true;
      if (cat.items.some((i) => i.zones && i.zones.includes(topZone))) return true;
      if (cat.zones && cat.zones.includes(topZone)) return true;
      return false;
    });
  }, [menus, topZone]);

  // Inventory Summary Stats across all zone-filtered items
  const inventoryStats = useMemo(() => {
    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    zoneFilteredCategories.forEach((cat) => {
      cat.items.forEach((it) => {
        totalItems++;
        const cur = it.currentStock != null ? Number(it.currentStock) : (it.openingStock != null ? Number(it.openingStock) : 0);
        const reorder = it.reorderLevel != null ? Number(it.reorderLevel) : 0;
        if (cur <= 0) {
          outOfStockCount++;
        } else if (reorder > 0 && cur <= reorder) {
          lowStockCount++;
        }
      });
    });

    return { totalItems, lowStockCount, outOfStockCount };
  }, [zoneFilteredCategories]);

  // Filter Categories by Search Query & Selected Tab Chip & Stock Filter
  const filteredMenus = useMemo(() => {
    let result = zoneFilteredCategories;
    if (selectedCategory !== "ALL") {
      result = result.filter((cat) => cat.id === selectedCategory);
    }

    // Apply stock filter if inventory is enabled and a specific stock filter is active
    if (isInventoryEnabled && stockFilter !== "ALL") {
      result = result
        .map((cat) => {
          const matchedItems = cat.items.filter((it) => {
            const cur = it.currentStock != null ? Number(it.currentStock) : (it.openingStock != null ? Number(it.openingStock) : 0);
            const reorder = it.reorderLevel != null ? Number(it.reorderLevel) : 0;
            if (stockFilter === "IN_STOCK") {
              return cur > (reorder > 0 ? reorder : 0);
            } else if (stockFilter === "LOW_STOCK") {
              return cur > 0 && reorder > 0 && cur <= reorder;
            } else if (stockFilter === "OUT_OF_STOCK") {
              return cur <= 0;
            }
            return true;
          });
          return { ...cat, items: matchedItems };
        })
        .filter((cat) => cat.items.length > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result
        .map((cat) => {
          const matchedItems = cat.items.filter(
            (it) =>
              it.name.toLowerCase().includes(q) ||
              (it.description && it.description.toLowerCase().includes(q)) ||
              (it.barcode && it.barcode.toLowerCase().includes(q))
          );
          if (cat.name.toLowerCase().includes(q)) {
            return cat;
          }
          return { ...cat, items: matchedItems };
        })
        .filter((cat) => cat.items.length > 0);
    }

    return result;
  }, [zoneFilteredCategories, selectedCategory, searchQuery, isInventoryEnabled, stockFilter]);

  // Click Item -> Open Item Detail Screen (Details & Transactions)
  const handleItemClick = (item: MenuItem, catId: string, catName: string) => {
    setDetailScreenItem({ item, catId, catName });
  };

  // Open Edit Item Modal (when clicked from Detail Screen or Edit Action)
  const openEditModal = async (item: MenuItem, catId: string, catName: string) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditPrice(String(item.sellingPrice ?? item.price ?? "0"));
    setEditPurchasePrice(item.price != null ? String(item.price) : "");
    setEditMrp(item.mrp != null ? String(item.mrp) : "");
    setEditWholesalePrice(item.wholesalePrice != null ? String(item.wholesalePrice) : "");
    setShowOtherPricing(Boolean(item.mrp || item.wholesalePrice));
    setEditCategoryId(catId);
    setEditCategoryName(catName);
    setEditImageUrl(item.imageUrl || "");
    setEditItemType(item.itemType || "Product");
    setEditBarcode(item.barcode || "");
    setEditUnit(item.unit || "");
    setEditIsVeg(item.isVeg !== undefined ? item.isVeg : true);
    setEditIsEgg(item.isEgg !== undefined ? item.isEgg : false);
    const initialFoodTypeEnabled = typeof localStorage !== "undefined"
      ? localStorage.getItem("kravy_food_type_enabled") !== "false"
      : true;
    setIsFoodTypeEnabled(initialFoodTypeEnabled);
    setEditDescription(item.description || "");
    setEditZone(item.zones && item.zones.length > 0 ? item.zones[0] : "Global");
    setEditTaxStatus((item.taxStatus as "With Tax" | "Without Tax") || "Without Tax");
    setEditPurchaseTaxStatus((item.purchaseTaxStatus as "With Tax" | "Without Tax") || "With Tax");
    setEditWholesaleTaxStatus((item.wholesaleTaxStatus as "With Tax" | "Without Tax") || "Without Tax");
    setEditMinWholesaleQty(item.minWholesaleQty != null ? String(item.minWholesaleQty) : "");
    // Stock / Inventory
    const liveStock = item.openingStock != null ? String(item.openingStock) : (item.currentStock != null ? String(item.currentStock) : "");
    setEditOpeningStock(liveStock);
    const todayFormatted = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY matching screenshot 24/10/2026
    setEditStockInDate(item.stockInDate || todayFormatted);
    setEditLowStockAlert(item.reorderLevel != null ? String(item.reorderLevel) : "");
    const initialInvEnabled = (typeof localStorage !== "undefined" && localStorage.getItem("kravy_item_inventory_enabled") === "true") || Boolean(item.openingStock || item.currentStock || item.reorderLevel);
    setIsInventoryEnabled(initialInvEnabled);
    setShowStockSection(false); // Closed by default as requested

    const itemGstVal = item.gst != null ? item.gst : 5;
    setEditGstRate(`GST@${itemGstVal}%`);
    setEditHsnCode(item.hsnCode || "");
    const initialGstEnabled = (typeof localStorage !== "undefined" && localStorage.getItem("kravy_item_gst_enabled") === "true") || (item.gst != null && item.gst > 0) || Boolean(item.taxStatus);
    setIsGstEnabled(initialGstEnabled);
    const rawVariants = (item.variants || []) as any[];
    // Convert group-based variants [{ groupName, options: [...] }] or flat variants [{ name, price }] into flat format
    const currentVariants: { name: string; price: string | number }[] = [];
    if (Array.isArray(rawVariants)) {
      rawVariants.forEach((v: any) => {
        if (!v) return;
        if (Array.isArray(v.options) && v.options.length > 0) {
          v.options.forEach((opt: any) => {
            if (opt) {
              currentVariants.push({
                name: String(opt.name || opt.label || "").trim(),
                price: opt.price != null ? String(opt.price) : "0"
              });
            }
          });
        } else {
          currentVariants.push({
            name: String(v.name || v.label || v.groupName || "").trim(),
            price: v.price != null ? String(v.price) : "0"
          });
        }
      });
    }
    setVariants(currentVariants);
    // Auto-detect variant type
    if (currentVariants.length > 0) {
      const names = currentVariants.map(v => (v.name || "").toLowerCase());
      if (names.some(n => ["small", "regular", "medium", "large", "xl", "half", "full"].includes(n))) {
        setVariantType("Size");
      } else if (names.some(n => /pc|piece|gm|kg|ml|ltr/i.test(n))) {
        setVariantType("Quantity");
      } else {
        setVariantType("Custom");
      }
    } else {
      setVariantType("Size");
    }

    setIsEditModalVisible(true);
    setIsFetchingItemDetails(true);

    try {
      const res = await fetch(`/api/items?id=${item.id}`);
      if (res.ok) {
        const details = await res.json();
        setEditName(details.name || item.name);
        setEditPrice(String(details.sellingPrice || details.price || "0"));
        setEditPurchasePrice(details.price != null ? String(details.price) : "");
        setEditMrp(details.mrp != null ? String(details.mrp) : "");
        setEditWholesalePrice(details.wholesalePrice != null ? String(details.wholesalePrice) : "");
        if (details.purchaseTaxStatus) setEditPurchaseTaxStatus(details.purchaseTaxStatus);
        if (details.wholesaleTaxStatus) setEditWholesaleTaxStatus(details.wholesaleTaxStatus);
        if (details.minWholesaleQty != null) setEditMinWholesaleQty(String(details.minWholesaleQty));
        if (details.mrp || details.wholesalePrice) {
          setShowOtherPricing(true);
        }
        if (details.barcode) setEditBarcode(details.barcode);
        if (details.itemType) setEditItemType(details.itemType);
        // Stock from API
        const apiStock = details.openingStock != null ? String(details.openingStock) : (details.currentStock != null ? String(details.currentStock) : "");
        if (apiStock) {
          setEditOpeningStock(apiStock);
          setIsInventoryEnabled(true);
        }
        if (details.reorderLevel != null) {
          setEditLowStockAlert(String(details.reorderLevel));
          setIsInventoryEnabled(true);
        }
        if (details.updatedAt || details.createdAt) {
          setEditStockInDate(new Date(details.updatedAt || details.createdAt).toLocaleDateString("en-GB"));
        }
        setEditCategoryId(details.categoryId || catId);
        setEditCategoryName(details.category?.name || catName);
        setEditImageUrl(details.imageUrl || item.imageUrl || "");
        setEditUnit(details.unit || item.unit || "");
        setEditIsVeg(details.isVeg !== undefined ? details.isVeg : true);
        if (details.isEgg !== undefined) setEditIsEgg(Boolean(details.isEgg));
        setEditDescription(details.description || "");
        if (details.taxStatus) {
          setEditTaxStatus(details.taxStatus as "With Tax" | "Without Tax");
        }
        if (details.gst != null) {
          setEditGstRate(`GST@${details.gst}%`);
          setIsGstEnabled(true);
        }
        if (details.hsnCode) {
          setEditHsnCode(details.hsnCode);
        }
        const rawFetched = (details.variants || item.variants || []) as any[];
        const normalizedFetched: { name: string; price: string | number }[] = [];
        if (Array.isArray(rawFetched)) {
          rawFetched.forEach((v: any) => {
            if (!v) return;
            if (Array.isArray(v.options) && v.options.length > 0) {
              v.options.forEach((opt: any) => {
                if (opt) {
                  normalizedFetched.push({
                    name: String(opt.name || opt.label || "").trim(),
                    price: opt.price != null ? String(opt.price) : "0"
                  });
                }
              });
            } else {
              normalizedFetched.push({
                name: String(v.name || v.label || v.groupName || "").trim(),
                price: v.price != null ? String(v.price) : "0"
              });
            }
          });
        }
        setVariants(normalizedFetched);
        if (normalizedFetched.length > 0) {
          const names = normalizedFetched.map((v: any) => (v.name || "").toLowerCase());
          if (names.some((n: string) => ["small", "regular", "medium", "large", "xl", "half", "full"].includes(n))) {
            setVariantType("Size");
          } else if (names.some((n: string) => /pc|piece|gm|kg|ml|ltr/i.test(n))) {
            setVariantType("Quantity");
          } else {
            setVariantType("Custom");
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch detailed item:", err);
    } finally {
      setIsFetchingItemDetails(false);
    }
  };

  // Open Add Item Modal (Create Mode)
  const handleOpenCreateItem = (defaultCatId?: string, defaultCatName?: string) => {
    setSelectedItem(null);
    setEditName("");
    setEditPrice("");
    setEditPurchasePrice("");
    setEditMrp("");
    setEditWholesalePrice("");
    setShowOtherPricing(false);
    const targetCatId = defaultCatId || (allCategories[0]?.id || "others");
    const targetCatName = defaultCatName || (allCategories[0]?.name || "Others");
    setEditCategoryId(targetCatId);
    setEditCategoryName(targetCatName);
    setEditImageUrl("");
    setEditItemType("Product");
    setEditBarcode("");
    setEditUnit("");
    setEditIsVeg(true);
    setEditIsEgg(false);
    const initialFoodTypeEnabled = typeof localStorage !== "undefined"
      ? localStorage.getItem("kravy_food_type_enabled") !== "false"
      : true;
    setIsFoodTypeEnabled(initialFoodTypeEnabled);
    setEditDescription("");
    setEditZone(topZone && topZone !== "Global" ? topZone : "Global");
    setEditTaxStatus("Without Tax");
    setEditPurchaseTaxStatus("With Tax");
    setEditWholesaleTaxStatus("Without Tax");
    setEditMinWholesaleQty("");
    setEditOpeningStock("");
    const todayFormatted = new Date().toLocaleDateString("en-GB");
    setEditStockInDate(todayFormatted);
    setEditLowStockAlert("");
    setIsInventoryEnabled(false);
    setShowStockSection(false);
    setEditGstRate("GST@5%");
    setEditHsnCode("");
    setIsGstEnabled(false);
    setVariants([]);
    setVariantType("Size");
    setIsFetchingItemDetails(false);
    setIsEditModalVisible(true);
  };

  // Image Upload via File Picker
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const toastId = toast.loading("Uploading image...");
      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEditImageUrl(data.url || data.secure_url || "");
        toast.success("Image uploaded successfully!", { id: toastId });
      } else {
        toast.error("Failed to upload image", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    }
  };

  // Online Image Search
  const handleSearchImages = async (forcedQuery?: string) => {
    const q = forcedQuery || searchImageQuery.trim();
    if (!q) return;
    setSearchingImages(true);
    try {
      const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(q)}`);
      let photos: any[] = [];
      if (res.ok) {
        const data = await res.json();
        photos = data.data || [];
      }

      if (photos.length === 0) {
        const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(q)}&offset=0`);
        if (resDeep.ok) {
          const dataDeep = await resDeep.json();
          photos = dataDeep.data || [];
        }
      }

      const results = photos
        .map((p: any) => ({
          url: p.image_url || p.image || p.url || p.imageUrl,
          title: p.title || p.name || "",
        }))
        .filter((x: any) => Boolean(x.url));

      setSearchedImages(results);
    } catch (e) {
      console.error(e);
      toast.error("Failed to search images");
    } finally {
      setSearchingImages(false);
    }
  };

  const handleLoadMoreImages = async () => {
    const q = searchImageQuery.trim();
    if (!q) return;
    const currentOffset = searchedImages.length;
    const page = Math.floor(currentOffset / 12) + 1;
    setLoadingMoreImages(true);
    try {
      const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(q)}&page=${page}`);
      let photos: any[] = [];
      if (res.ok) {
        const data = await res.json();
        photos = data.data || [];
      }

      if (photos.length === 0) {
        const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(q)}&offset=${currentOffset}`);
        if (resDeep.ok) {
          const dataDeep = await resDeep.json();
          photos = dataDeep.data || [];
        }
      }

      const nextResults = photos
        .map((p: any) => ({
          url: p.image_url || p.image || p.url || p.imageUrl,
          title: p.title || p.name || "",
        }))
        .filter((x: any) => Boolean(x.url));

      if (nextResults.length === 0) {
        toast.info("No more images found.");
      } else {
        setSearchedImages((prev) => {
          const existingUrls = new Set(prev.map((img) => img.url));
          const uniqueNew = nextResults.filter((img) => !existingUrls.has(img.url));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load more images");
    } finally {
      setLoadingMoreImages(false);
    }
  };

  // Sync All Blank Images
  const handleSyncAllImages = async () => {
    const blankItems: MenuItem[] = [];
    menus.forEach((cat) => {
      cat.items.forEach((it) => {
        if (topZone !== "Global" && !it.zones?.includes(topZone)) return;
        if (!it.imageUrl) blankItems.push(it);
      });
    });

    if (blankItems.length === 0) {
      showFeedback("All Set!", "All items already have images!", "success");
      return;
    }

    if (!confirm(`Are you sure you want to auto-sync images for ${blankItems.length} items without images?`)) {
      return;
    }

    setSyncingAllImages(true);
    setSyncProgress({ completed: 0, total: blankItems.length });

    let completedCount = 0;
    const chunkSize = 4;

    for (let i = 0; i < blankItems.length; i += chunkSize) {
      const chunk = blankItems.slice(i, i + chunkSize);

      const promises = chunk.map(async (item) => {
        try {
          const cleanName = item.name.replace(/^\(v\)\s*/i, "").replace(/\[.*?\]|\(.*?\)/g, "").trim();
          let firstImg = null;

          try {
            const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(cleanName)}`);
            if (res.ok) {
              const data = await res.json();
              const photos = data.data || [];
              firstImg = photos[0]?.image_url || photos[0]?.image || photos[0]?.url;
            }
          } catch {}

          if (!firstImg) {
            const resDeep = await fetch(`/api/proxy/google-image-search?q=${encodeURIComponent(cleanName)}&offset=0`);
            if (resDeep.ok) {
              const dataDeep = await resDeep.json();
              const photosDeep = dataDeep.data || [];
              firstImg = photosDeep[0]?.image_url || photosDeep[0]?.image || photosDeep[0]?.url;
            }
          }

          if (firstImg) {
            await fetch("/api/items", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: item.id,
                imageUrl: firstImg,
              }),
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          completedCount++;
          setSyncProgress({ completed: completedCount, total: blankItems.length });
        }
      });

      await Promise.all(promises);
    }

    setSyncingAllImages(false);
    fetchMenus(false);
    emitUpdate({ type: "MENU_UPDATE" });
    showFeedback("Success", "Images synced successfully!", "success");
  };

  // Save Item Changes
  const handleSaveItem = async (isSaveAndNew: boolean = false) => {
    if (!editName.trim()) {
      showFeedback("Name Missing", "Please enter an item name.", "warning");
      return;
    }
    if (isNaN(parseFloat(editPrice))) {
      showFeedback("Invalid Price", "Please enter a valid price.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const sellPriceNum = parseFloat(editPrice) || 0;
      const purchasePriceNum = editPurchasePrice.trim() !== "" ? parseFloat(editPurchasePrice) : null;
      const mrpNum = editMrp.trim() !== "" ? parseFloat(editMrp) : null;
      const wholesalePriceNum = editWholesalePrice.trim() !== "" ? parseFloat(editWholesalePrice) : null;

      // Extract numeric GST rate if enabled
      let parsedGst: number | null = null;
      if (isGstEnabled) {
        const match = editGstRate.match(/(\d+(\.\d+)?)/);
        parsedGst = match ? parseFloat(match[1]) : 0;
      }

      const method = selectedItem ? "PUT" : "POST";
      const res = await fetch("/api/items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selectedItem ? { id: selectedItem.id } : {}),
          name: editName.trim(),
          price: purchasePriceNum != null ? purchasePriceNum : sellPriceNum,
          sellingPrice: sellPriceNum,
          mrp: mrpNum,
          wholesalePrice: wholesalePriceNum,
          taxStatus: isGstEnabled ? editTaxStatus : "Without Tax",
          gst: parsedGst,
          taxRate: isGstEnabled ? editGstRate : null,
          hsnCode: isGstEnabled ? (editHsnCode.trim() || null) : null,
          openingStock: isInventoryEnabled && editOpeningStock.trim() !== "" ? parseFloat(editOpeningStock) : undefined,
          currentStock: isInventoryEnabled && editOpeningStock.trim() !== "" ? parseFloat(editOpeningStock) : undefined,
          reorderLevel: isInventoryEnabled && editLowStockAlert.trim() !== "" ? parseFloat(editLowStockAlert) : undefined,
          categoryId: editCategoryId === "others" ? null : editCategoryId,
          imageUrl: editImageUrl || null,
          barcode: editBarcode.trim() || null,
          unit: editUnit || null,
          isVeg: editIsVeg,
          isEgg: editIsEgg,
          description: editDescription || null,
          variants: variants,
          zones: editZone && editZone !== "Global" ? [editZone] : [],
        }),
      });

      if (!res.ok) throw new Error(selectedItem ? "Failed to update item" : "Failed to create item");

      kravy.success();
      showFeedback(
        selectedItem ? "Item Updated" : "Item Created",
        selectedItem ? "Changes saved successfully!" : "New item added successfully!",
        "success"
      );
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });

      if (isSaveAndNew) {
        setSelectedItem(null);
        setEditName("");
        setEditPrice("");
        setEditPurchasePrice("");
        setEditMrp("");
        setEditWholesalePrice("");
        setEditMinWholesaleQty("");
        setEditOpeningStock("");
        setEditLowStockAlert("");
        setEditImageUrl("");
        setEditBarcode("");
        setEditUnit("");
        setEditDescription("");
        setVariants([]);
      } else {
        setIsEditModalVisible(false);
      }
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to update item");
    } finally {
      setIsSaving(false);
    }
  };

  // 📦 Handle Stock In / Stock Out Adjustment Submit
  const handleAdjustStock = async () => {
    if (!stockActionItem) return;
    const qty = parseFloat(stockQuantityInput);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    const type = stockActionType === "IN" ? "IN" : "OUT";
    const curStock = stockActionItem.currentStock != null ? Number(stockActionItem.currentStock) : (stockActionItem.openingStock != null ? Number(stockActionItem.openingStock) : 0);

    // Negative stock check on stock out
    if (type === "OUT" && curStock - qty < 0) {
      const confirmNegative = window.confirm(`Warning: Remaining stock will be negative (${curStock - qty}). Do you still want to proceed?`);
      if (!confirmNegative) return;
    }

    setIsSubmittingStock(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: stockActionItem.id,
          type,
          quantity: qty,
          unitPrice: stockUnitPriceInput ? parseFloat(stockUnitPriceInput) : undefined,
          reason: stockReasonInput || (type === "IN" ? "Purchase" : "Wastage"),
          notes: stockNotesInput || "",
          adjustmentDate: stockAdjustmentDate || new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      kravy.success();
      showFeedback(
        type === "IN" ? "Stock Added" : "Stock Removed",
        `${qty} ${stockActionItem.unit || "Pcs"} ${type === "IN" ? "added to" : "removed from"} stock successfully!`,
        "success"
      );

      // Reset and close
      setStockActionItem(null);
      setStockActionType("SELECT");
      setStockQuantityInput("");
      setStockUnitPriceInput("");
      setStockReasonInput("");
      setStockNotesInput("");
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err: any) {
      console.error(err);
      kravy.error();
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // 📜 Fetch Stock History for an Item
  const handleFetchStockHistory = async (item: MenuItem) => {
    setStockActionItem(item);
    setStockActionType("HISTORY");
    setLoadingStockHistory(true);
    try {
      const res = await fetch(`/api/inventory/adjust?itemId=${item.id}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setStockHistoryLogs(Array.isArray(data) ? data : []);
      } else {
        setStockHistoryLogs([]);
      }
    } catch (e) {
      console.error("Failed to fetch stock history:", e);
      setStockHistoryLogs([]);
    } finally {
      setLoadingStockHistory(false);
    }
  };

  // Delete Item
  const confirmDeleteItem = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items?id=${selectedItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete item");

      kravy.success();
      setShowDeleteConfirm(false);
      setIsEditModalVisible(false);
      showFeedback("Item Deleted", "Item removed successfully!", "danger");
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Create Category (Modal)
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showFeedback("Missing Name", "Please enter a category name.", "warning");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create category");

      setNewCategoryName("");
      setIsCreateCategoryModalVisible(false);
      kravy.success();
      showFeedback("Category Created", "New category has been added.", "success");
      fetchAllCategories();
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Comprehensive Add Category Screen (Save or Save & New)
  const handleSaveCategoryScreen = async (isSaveAndNew: boolean) => {
    if (!categoryScreenName.trim()) {
      showFeedback("Name Missing", "Please enter category name.", "warning");
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryScreenName.trim(),
          zones: categoryScreenZone !== "Global" ? [categoryScreenZone] : [],
        }),
      });

      if (!res.ok) throw new Error("Failed to save category");

      kravy.success();
      fetchAllCategories();
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });

      if (isSaveAndNew) {
        setCategoryScreenName("");
        showFeedback("Category Saved", "New category added. You can add another.", "success");
      } else {
        setShowAddItemCategoryScreen(false);
        setCategoryScreenName("");
        showFeedback("Category Saved", "Category added successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to save category");
    }
  };

  // Reorder Categories
  const handleOpenReorder = () => {
    const validCats = allCategories.filter((c) => c.id !== "others" && c.id !== "__uncategorised__");
    setReorderList(validCats);
    setIsReorderModalVisible(true);
  };

  const moveCategory = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= reorderList.length) return;
    const newList = [...reorderList];
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;
    setReorderList(newList);
  };

  const handleSaveCategoryOrder = async () => {
    setIsSavingOrder(true);
    try {
      const categoryIds = reorderList.map((c) => c.id);
      const res = await fetch("/api/categories/order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(asUserId ? { "x-impersonate-id": asUserId } : {})
        },
        body: JSON.stringify({ categoryIds }),
      });

      if (!res.ok) throw new Error("Failed to reorder categories");

      kravy.success();
      setIsReorderModalVisible(false);
      showFeedback("Order Saved", "Categories reordered successfully!", "success");
      fetchAllCategories();
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to save order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Update Category Name
  const handleUpdateCategory = async () => {
    if (!selectedCategoryToEdit) return;
    if (!editCategoryNewName.trim()) {
      showFeedback("Name Missing", "Please enter category name.", "warning");
      return;
    }

    setIsUpdatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCategoryToEdit.id,
          name: editCategoryNewName.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update category");

      kravy.success();
      setIsEditCategoryModalVisible(false);
      showFeedback("Category Updated", "Category renamed successfully!", "success");
      fetchAllCategories();
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to update category");
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async () => {
    if (!selectedCategoryToEdit) return;
    setIsDeletingCategory(true);
    try {
      const res = await fetch(`/api/categories?id=${selectedCategoryToEdit.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete category");

      kravy.success();
      setShowDeleteCategoryConfirm(false);
      setIsEditCategoryModalVisible(false);
      showFeedback("Category Deleted", "Category removed successfully!", "danger");
      fetchAllCategories();
      fetchMenus(false);
      emitUpdate({ type: "MENU_UPDATE" });
    } catch (err) {
      console.error(err);
      kravy.error();
      toast.error("Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* 📱 COMPACT UNIFIED TOP HEADER BAR (All controls in 1 row) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-2 sm:px-3 py-2 shadow-2xs transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Back Button */}
          <button
            onClick={handleHeaderBack}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            title="Go Back"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Compact Zone Dropdown Pill */}
          <button
            onClick={() => setTopZoneModalVisible(true)}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            title="Select Zone"
          >
            <MapPin size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[55px] sm:max-w-[75px]">
              {topZone}
            </span>
            <ChevronDown size={13} className="text-slate-400 shrink-0" />
          </button>

          {/* Compact Search Bar (Flex-1) */}
          <div className="relative flex-1 flex items-center min-w-0">
            <Search size={16} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 sm:h-9 pl-8 sm:pl-9 pr-6 sm:pr-7 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-[13px] sm:text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Action: Add Category */}
          <button
            onClick={() => setShowAddItemCategoryScreen(true)}
            className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 font-bold text-[12px] sm:text-[13px] flex items-center gap-1 shrink-0 active:scale-95 transition-all hover:bg-indigo-100"
            title="Add Category"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Category</span>
          </button>

          {/* Quick Settings Cog (Inventory & Tax Toggle) */}
          <button
            onClick={() => setShowItemSettingsModal(true)}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 active:scale-95 transition-all ${
              isInventoryEnabled
                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
            title="Inventory & Menu Settings"
          >
            <Settings size={16} />
          </button>

          {/* Optional Desktop Switcher */}
          {onSwitchToDesktop && (
            <button
              onClick={onSwitchToDesktop}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              title="Switch to Desktop / Grid Catalog View"
            >
              <LayoutGrid size={18} />
            </button>
          )}
        </div>
      </header>

      {/* 🔀 COMPACT SEGMENTED SWITCHER: ITEMS vs CATEGORIES */}
      <div className="px-3 sm:px-4 pt-2 pb-1.5 bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setMenuTab("items")}
            className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
              menuTab === "items"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <span>Items</span>
            <span
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums transition-colors ${
                menuTab === "items"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {menus.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMenuTab("categories")}
            className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
              menuTab === "categories"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <span>Categories</span>
            <span
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums transition-colors ${
                menuTab === "categories"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {allCategories.length}
            </span>
          </button>
        </div>
      </div>

      {/* 🏷️ HORIZONTAL CATEGORY CHIPS (Visible only on Items Tab) */}
      {menuTab === "items" && (
        <div className="py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xs">
          <div className="flex items-center gap-2 overflow-x-auto px-3 no-scrollbar">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-[14px] font-bold uppercase tracking-wider border shrink-0 transition-all ${
                selectedCategory === "ALL"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              ALL
            </button>

            {zoneFilteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-[14px] font-bold uppercase tracking-wider border shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                {cat.name}
              </button>
            ))}

            {/* Plus chip to add category */}
            <button
              onClick={() => setShowAddItemCategoryScreen(true)}
              className="w-8 h-8 rounded-lg border-2 border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
              title="Add Category"
            >
              <Plus size={16} />
            </button>

            {/* Compact Sync All Images button in chips line */}
            <button
              onClick={handleSyncAllImages}
              disabled={syncingAllImages}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-indigo-600/15 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-[13px] shrink-0 flex items-center gap-1 active:scale-95 transition-all disabled:opacity-60"
              title="Sync All Item Images via Unsplash"
            >
              <Sparkles size={15} className="text-amber-500" />
              <span className="whitespace-nowrap">
                {syncingAllImages ? `${syncProgress.completed}/${syncProgress.total}` : "Sync Images"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 📋 MAIN CONTENT AREA: ITEMS VIEW vs CATEGORIES VIEW */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 pb-36">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Menu...</p>
          </div>
        ) : menuTab === "items" ? (
          /* ============================================================== */
          /* 🍕 ITEMS TAB VIEW */
          /* ============================================================== */
          <div className="space-y-4 pt-2">
            {/* Items Section Header */}
            <div className="flex items-center justify-between py-1 px-0.5">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Menu Items
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                  Manage products, prices and variants
                </p>
              </div>
            </div>

            {filteredMenus.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <FolderOpen size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  {searchQuery ? "No items match your search" : "No items in this category"}
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateItem()}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100"
                >
                  + Add First Item
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredMenus.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs overflow-hidden"
                  >
                    {/* Category Header Row (Click to edit category) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryToEdit(cat);
                        setEditCategoryNewName(cat.name);
                        setIsEditCategoryModalVisible(true);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] sm:text-[16px] font-bold uppercase tracking-wide text-slate-850 dark:text-slate-100">
                          {cat.name}
                        </span>
                        <span className="text-[12px] font-medium text-slate-400">
                          ({cat.items.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[12px] font-semibold transition-colors">
                        <span>Edit</span>
                        <ChevronRight size={14} />
                      </div>
                    </button>

                    {/* Items in this Category */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {cat.items.map((item) => {
                        const curStock = item.currentStock != null ? Number(item.currentStock) : (item.openingStock != null ? Number(item.openingStock) : 0);
                        const reorder = item.reorderLevel != null ? Number(item.reorderLevel) : 0;
                        const unitLabel = item.unit ? item.unit : "Pcs";
                        const isOutOfStock = curStock <= 0;
                        const isLowStock = !isOutOfStock && reorder > 0 && curStock <= reorder;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item, cat.id, cat.name)}
                            className="py-2.5 px-3 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer transition-all duration-150"
                          >
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-start gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                                    item.isVeg ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-rose-500 ring-2 ring-rose-500/20"
                                  }`}
                                  title={item.isVeg ? "Veg" : "Non-Veg"}
                                />
                                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                  {item.name}
                                </h3>
                              </div>

                              <div className="flex items-center gap-2 mt-1 ml-4 flex-wrap">
                                <span className="text-[17px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
                                  {sym}{item.price}
                                </span>
                                {item.variants && item.variants.length > 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                    {item.variants.length} {item.variants.length === 1 ? "Variant" : "Variants"}
                                  </span>
                                )}

                                {/* Stock Quantity Badge (Only when Inventory is ON) */}
                                {isInventoryEnabled && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStockActionItem(item);
                                      setStockActionType("SELECT");
                                    }}
                                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 active:scale-95 transition-all ${
                                      isOutOfStock
                                        ? "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400"
                                        : isLowStock
                                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400"
                                        : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400"
                                    }`}
                                    title="Click to Adjust Stock"
                                  >
                                    <span className="font-extrabold tabular-nums">
                                      {isOutOfStock ? "Out of Stock" : `In Stock: ${curStock} ${unitLabel}`}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Right side: Thumbnail + Quick Edit Action Button */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Direct Edit Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(item, cat.id, cat.name);
                                }}
                                className="w-8 h-8 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center transition-all active:scale-90 shadow-2xs group"
                                title="Edit Item Details"
                              >
                                <Pencil size={14} className="stroke-[2.5] transition-transform group-hover:scale-110" />
                              </button>

                              {/* Image Thumbnail / Add Image Icon (Clean 56x56 box) */}
                              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                    <ImageIcon size={18} />
                                    <Plus size={10} className="absolute bottom-1 right-1 text-slate-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* 🛑 Bottom Clearance Spacer */}
                <div className="h-28 sm:h-32 shrink-0 pointer-events-none" aria-hidden="true" />
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* 📁 CATEGORIES TAB VIEW */
          /* ============================================================== */
          <div className="space-y-3.5 pt-1">
            {/* Categories Section Header & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 py-1 px-0.5">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Categories
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Manage all menu categories & ordering
                </p>
              </div>

              {/* Action Buttons: Prominent + Add Category & Secondary Reorder */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenReorder}
                  className="h-9 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                  title="Reorder Categories"
                >
                  <ArrowUpDown size={14} className="text-slate-500 dark:text-slate-400 stroke-[2.5]" />
                  <span>Reorder</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddItemCategoryScreen(true)}
                  className="h-9 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all"
                  title="Add Category"
                >
                  <Plus size={15} strokeWidth={3} />
                  <span>Add Category</span>
                </button>
              </div>
            </div>

            {/* List of Categories */}
            {allCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-8">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
                  <FolderOpen size={32} />
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-white">
                  No Categories Found
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Organize your store items into clean categories like Momos, Drinks, Desserts.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddItemCategoryScreen(true)}
                  className="mt-4 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  + Add First Category
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {allCategories
                  .filter((cat) => {
                    if (!searchQuery.trim()) return true;
                    return cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                  })
                  .map((cat, idx) => {
                    const matchedCategory = menus.find((m) => m.id === cat.id);
                    const itemCount = matchedCategory ? matchedCategory.items.length : 0;
                    
                    // Elegant curated gradient accents for category avatars
                    const gradients = [
                      "from-indigo-500 to-blue-500",
                      "from-purple-500 to-pink-500",
                      "from-amber-500 to-orange-500",
                      "from-emerald-500 to-teal-500",
                      "from-rose-500 to-red-500",
                      "from-cyan-500 to-blue-600",
                    ];
                    const grad = gradients[idx % gradients.length];
                    const initialChar = cat.name.trim().charAt(0).toUpperCase() || "C";

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategoryToEdit(
                            matchedCategory || {
                              id: cat.id,
                              name: cat.name,
                              sortOrder: cat.sortOrder,
                              zones: cat.zones,
                              items: [],
                            }
                          );
                          setEditCategoryNewName(cat.name);
                          setIsEditCategoryModalVisible(true);
                        }}
                        className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/70 flex items-center justify-between gap-3.5 transition-all active:scale-[0.99] cursor-pointer"
                      >
                        {/* Left: Dynamic Color Avatar & Category Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center font-black text-lg tracking-tight shrink-0 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform`}
                          >
                            {initialChar}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base sm:text-[17px] font-black text-slate-900 dark:text-white truncate tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cat.name}
                              </h4>
                              {cat.zones && cat.zones.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 uppercase tracking-wide">
                                  {cat.zones.join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md tabular-nums ${
                                  itemCount > 0
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    : "bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400"
                                }`}
                              >
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Modern Edit Button */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategoryToEdit(
                                matchedCategory || {
                                  id: cat.id,
                                  name: cat.name,
                                  sortOrder: cat.sortOrder,
                                  zones: cat.zones,
                                  items: [],
                                }
                              );
                              setEditCategoryNewName(cat.name);
                              setIsEditCategoryModalVisible(true);
                            }}
                            className="h-9 px-3.5 rounded-2xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-extrabold text-xs flex items-center gap-1.5 transition-all border border-slate-200/60 dark:border-slate-700/60 group-hover:border-indigo-200"
                            title="Edit Category"
                          >
                            <span>Edit</span>
                            <ChevronRight size={14} className="stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {/* 🛑 Bottom Clearance Spacer */}
                <div className="h-28 sm:h-32 shrink-0 pointer-events-none" aria-hidden="true" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🚀 FLOATING ACTION BUTTON (FAB) IN BOTTOM RIGHT FOR QUICK ADD */}
      <div className="fixed right-4 sm:right-6 bottom-20 lg:bottom-6 z-50 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => {
            if (menuTab === "categories") {
              setShowAddItemCategoryScreen(true);
            } else {
              handleOpenCreateItem();
            }
          }}
          className="h-14 px-4 sm:px-5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm flex items-center gap-2 shadow-[0_10px_25px_rgba(99,102,241,0.45)] border-2 border-white/20 transition-all duration-200 group"
          title={menuTab === "categories" ? "Quick Add Category" : "Quick Add Item"}
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-90 transition-transform duration-200">
            <Plus size={18} strokeWidth={3} />
          </div>
          <span className="whitespace-nowrap tracking-wide">
            {menuTab === "categories" ? "Add Category" : "Add Item"}
          </span>
        </motion.button>
      </div>

      {/* 📱 BOTTOM BAR (App-Style Floating Actions) - Hidden on mobile where MobileBottomNav is docked */}
      <footer className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/menu/upload")}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Plus size={18} />
          <span>Add Item</span>
        </button>

        <button
          onClick={handleSyncAllImages}
          className="w-13 h-13 rounded-2xl border-2 border-indigo-600/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950/50 active:scale-95 transition-all"
          title="Auto Apply AI Images"
        >
          <Sparkles size={20} />
        </button>
      </footer>

      {/* ========================================================================= */}
      {/* 🛠️ MODAL: EDIT MENU ITEM (App-Style Full Screen / Drawer) */}
      {/* ========================================================================= */}
      {mounted && typeof document !== "undefined" && createPortal(
        <>
          {/* 📱 SCREEN: ITEM DETAIL & TRANSACTIONS VIEW */}
          <AnimatePresence>
            {detailScreenItem && (
              <ItemDetailScreen
                itemId={detailScreenItem.item.id}
                categoryName={detailScreenItem.catName}
                onBack={() => setDetailScreenItem(null)}
                onEdit={() => {
                  const target = detailScreenItem;
                  setDetailScreenItem(null);
                  openEditModal(target.item, target.catId, target.catName);
                }}
                onAdjustStockSuccess={() => {
                  fetchMenus(false);
                  emitUpdate({ type: "MENU_UPDATE" });
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isEditModalVisible && (
              <div className="fixed inset-0 z-[10025] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-[32px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-indigo-50/30 dark:from-slate-900 dark:to-slate-850 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditModalVisible(false)}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
                  >
                    <ArrowLeft size={17} className="stroke-[2.5]" />
                  </button>
                  <div>
                    <h2 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight">
                      {selectedItem ? "Edit Item" : "Add New Item"}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      {selectedItem ? "Update details, price & stock" : "Create new product in catalog"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isFetchingItemDetails && (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-1" />
                  )}
                  {/* Delete Item (only when editing existing item) */}
                  {selectedItem && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200/70 dark:border-rose-800/60 hover:bg-rose-100 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                      title="Delete Item"
                    >
                      <Trash2 size={16} className="stroke-[2.2]" />
                    </button>
                  )}
                  {/* Settings Cog Button */}
                  <button
                    type="button"
                    onClick={() => setShowItemSettingsModal(true)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-2xs active:scale-95 ${
                      isGstEnabled
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60"
                        : "bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 border border-slate-200/80 dark:border-slate-700"
                    }`}
                    title="Item Tax & GST Settings"
                  >
                    <Settings size={17} className="stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50">

                {/* Add item image here (Sleek Modern Media Zone) */}
                <div
                  onClick={() => {
                    setSearchImageQuery(editName);
                    setShowImageSearchModal(true);
                    handleSearchImages(editName);
                  }}
                  className="w-full rounded-2xl border-2 border-dashed border-indigo-200/80 dark:border-indigo-900/70 bg-gradient-to-b from-indigo-50/40 via-white to-purple-50/30 dark:from-indigo-950/20 dark:to-slate-900 p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all group relative overflow-hidden shadow-2xs active:scale-[0.99]"
                >
                  {editImageUrl ? (
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-slate-800">
                      <img
                        src={editImageUrl}
                        alt="preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                        Change
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditImageUrl("");
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                        title="Remove image"
                      >
                        <X size={13} className="stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-indigo-500 group-hover:text-indigo-600 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                        <ImageIcon size={24} className="stroke-[2]" />
                      </div>
                      <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
                        Add item image
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Tap to upload or search online
                      </span>
                    </div>
                  )}
                </div>

                {/* Item Name */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Cupcake, Masala Dosa"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[15px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Sale Price with inline Tax Dropdown */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Sale Price
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 font-black text-base">
                        {sym}
                      </span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-[16px] font-black text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 tabular-nums transition-all"
                      />
                    </div>
                    {/* Tax Status Dropdown (With Tax / Without Tax) on the Right in the Same Row */}
                    {isGstEnabled && (
                      <div className="w-36 shrink-0 relative">
                        <select
                          value={editTaxStatus}
                          onChange={(e) => setEditTaxStatus(e.target.value as "With Tax" | "Without Tax")}
                          className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-indigo-50/60 dark:bg-slate-800 border border-indigo-200/80 dark:border-slate-700 text-xs font-bold text-indigo-900 dark:text-indigo-300 outline-none focus:border-indigo-600 cursor-pointer"
                        >
                          <option value="Without Tax">Without Tax</option>
                          <option value="With Tax">With Tax</option>
                        </select>
                        <ChevronDown size={14} className="text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Selection */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddItemCategoryScreen(true)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={13} className="stroke-[3]" />
                      <span>New</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCategorySelectModal(true)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-left text-[14px] font-bold text-slate-900 dark:text-white hover:border-indigo-400 hover:bg-white transition-all shadow-2xs"
                  >
                    <span>{editCategoryName || "Select Category"}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* Unit */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Unit
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnitSelectModal(true)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-left text-[14px] font-bold text-slate-900 dark:text-white hover:border-indigo-400 hover:bg-white transition-all shadow-2xs"
                  >
                    <span>{editUnit ? editUnit.toUpperCase() : "Select Unit"}</span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                </div>

                {/* Description */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Short description or ingredients..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Food Type Toggle (Pure Veg / Contains Egg / Non-Veg) */}
                {isFoodTypeEnabled && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Food Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Pure Veg */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsVeg(true);
                          setEditIsEgg(false);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          editIsVeg && !editIsEgg
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20"
                            : "bg-slate-50/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${editIsVeg && !editIsEgg ? "bg-white" : "bg-emerald-500"} shrink-0`} />
                        <span className="truncate">Pure Veg</span>
                      </button>

                      {/* Contains Egg */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsVeg(false);
                          setEditIsEgg(true);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          editIsEgg
                            ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25 ring-2 ring-amber-500/20"
                            : "bg-slate-50/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${editIsEgg ? "bg-white" : "bg-amber-500"} shrink-0`} />
                        <span className="truncate">Egg</span>
                      </button>

                      {/* Non-Veg */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditIsVeg(false);
                          setEditIsEgg(false);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          !editIsVeg && !editIsEgg
                            ? "bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25 ring-2 ring-rose-500/20"
                            : "bg-slate-50/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${!editIsVeg && !editIsEgg ? "bg-white" : "bg-rose-500"} shrink-0`} />
                        <span className="truncate">Non-Veg</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 💳 Other Pricing Accordion (Polished & Attractive Design) */}
                <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-850 shadow-2xs transition-all">
                  <button
                    type="button"
                    onClick={() => setShowOtherPricing((prev) => !prev)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Tag size={15} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Other Pricing
                          </span>
                          {(editPurchasePrice || editMrp || editWholesalePrice || editMinWholesaleQty) ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-indigo-500/60" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Purchase, Wholesale & MRP settings
                        </p>
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
                      showOtherPricing ? "rotate-180 bg-indigo-50 text-indigo-600" : ""
                    }`}>
                      <ChevronDown size={16} strokeWidth={2.5} />
                    </div>
                  </button>

                  {showOtherPricing && (
                    <div className="p-4 pt-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
                      {/* Grid 1: Purchase Price & MRP */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Purchase Price */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            Purchase Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {sym}
                            </span>
                            <input
                              type="number"
                              value={editPurchasePrice}
                              onChange={(e) => setEditPurchasePrice(e.target.value)}
                              placeholder="0.0"
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 tabular-nums transition-all"
                            />
                          </div>
                        </div>

                        {/* MRP */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            MRP
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {sym}
                            </span>
                            <input
                              type="number"
                              value={editMrp}
                              onChange={(e) => setEditMrp(e.target.value)}
                              placeholder="0.0"
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 tabular-nums transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Grid 2: Wholesale Price & Min Wholesale Qty */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Wholesale Price */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            Cost / Wholesale Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              {sym}
                            </span>
                            <input
                              type="number"
                              value={editWholesalePrice}
                              onChange={(e) => setEditWholesalePrice(e.target.value)}
                              placeholder="0.0"
                              className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 tabular-nums transition-all"
                            />
                          </div>
                        </div>

                        {/* Minimum Wholesale Quantity */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            Min Wholesale Qty
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={editMinWholesaleQty}
                              onChange={(e) => setEditMinWholesaleQty(e.target.value)}
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-indigo-600 tabular-nums transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 📦 Stock / Inventory Accordion (Visible when enabled in Item Settings) */}
                {isInventoryEnabled && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 transition-all">
                    <button
                      type="button"
                      onClick={() => setShowStockSection((prev) => !prev)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          Stock/Inventory
                        </span>
                        {(editOpeningStock || editLowStockAlert) && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 transition-transform duration-200 ${
                          showStockSection ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showStockSection && (
                      <div className="p-4 pt-1 border-t border-slate-200/70 dark:border-slate-800/70 space-y-3 bg-white dark:bg-slate-900/60">
                        {/* Opening Stock */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Opening Stock
                          </label>
                          <input
                            type="number"
                            value={editOpeningStock}
                            onChange={(e) => setEditOpeningStock(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 tabular-nums"
                          />
                        </div>

                        {/* Date When Stock-In */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Date When Stock-In
                          </label>
                          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                              {editStockInDate || new Date().toLocaleDateString("en-GB")}
                            </span>
                            <Calendar size={18} className="text-slate-400 shrink-0" />
                          </div>
                        </div>

                        {/* Low Stock Alert at */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                              Low Stock Alert at
                            </label>
                            <Info size={14} className="text-slate-400" />
                          </div>
                          <input
                            type="number"
                            value={editLowStockAlert}
                            onChange={(e) => setEditLowStockAlert(e.target.value)}
                            placeholder="0.0"
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 tabular-nums"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* 🏷️ GST Tax Rate & HSN Code (Positioned after Description, visible when GST is enabled) */}
                {isGstEnabled && (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                        Tax Rate
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTaxRateModal(true)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between text-left hover:border-indigo-400"
                      >
                        <span className="truncate">{editGstRate}</span>
                        <ChevronDown size={14} className="text-indigo-400 shrink-0" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                        HSN / SAC Code
                      </label>
                      <input
                        type="text"
                        value={editHsnCode}
                        onChange={(e) => setEditHsnCode(e.target.value)}
                        placeholder="e.g. 2106"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* 🎛️ Variants Section (Placed at the very bottom, below Other Pricing, Stock & Description) */}
                <div className="pt-2">
                  {variants.length === 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                          Add Variants
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Add Size, Quantity, or Custom
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVariantTypeModal(true)}
                        className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
                        title="Add Variants"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-4 bg-white dark:bg-slate-900 shadow-sm space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {variantType} Variants
                        </h4>
                      </div>

                      {/* Variant rows */}
                      <div className="space-y-2.5">
                        {variants.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {/* Price input on Left (matching screenshot ₹0.00) */}
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                {sym}
                              </span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={v.price}
                                onChange={(e) => {
                                  const newVars = [...variants];
                                  newVars[idx].price = e.target.value;
                                  setVariants(newVars);
                                }}
                                className="w-full pl-7 pr-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 tabular-nums"
                              />
                            </div>

                            {/* Name input (Regular, Medium, Large, or custom) */}
                            <input
                              type="text"
                              placeholder={variantType === "Size" ? "e.g. Regular" : variantType === "Quantity" ? "e.g. 500 gm" : "Variant Name"}
                              value={v.name}
                              onChange={(e) => {
                                const newVars = [...variants];
                                newVars[idx].name = e.target.value;
                                setVariants(newVars);
                              }}
                              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                            />

                            {/* Delete single row */}
                            <button
                              type="button"
                              onClick={() => {
                                const newVars = [...variants];
                                newVars.splice(idx, 1);
                                setVariants(newVars);
                              }}
                              className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center shrink-0 transition-colors"
                              title="Delete variant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* + Add single variant row button */}
                      <button
                        type="button"
                        onClick={() => setVariants([...variants, { name: "", price: "" }])}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>

                      {/* Bottom actions: Remove all variants & Change Type */}
                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setVariants([])}
                          className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVariantTypeModal(true)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        >
                          <ArrowUpDown size={13} />
                          <span>Change Type</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions (Save & New / Save) */}
              <div className="p-4 border-t border-slate-200/90 dark:border-slate-800 grid grid-cols-2 gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveItem(true)}
                  disabled={isSaving || isDeleting}
                  className="w-full py-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100/90 text-indigo-700 dark:text-indigo-300 font-extrabold text-[13px] tracking-wide border border-indigo-200/80 dark:border-indigo-800/80 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center shadow-2xs"
                >
                  Save & New
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveItem(false)}
                  disabled={isSaving || isDeleting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-[13px] tracking-wide shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 📦 MODAL: SELECT VARIANT TYPE (Image 2 Bottom Sheet) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showVariantTypeModal && (
          <div className="fixed inset-0 z-[10035] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative"
            >
              {/* Floating Close Button */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowVariantTypeModal(false)}
                  className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg -mt-7 border-2 border-white dark:border-slate-800"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Header */}
              <div className="px-6 pt-3 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Select Variant
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVariantTypeModal(false)}
                  className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 items-center justify-center hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options matching screenshot */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {/* 1. Size */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantType("Size");
                    if (variants.length === 0) {
                      setVariants([
                        { name: "Regular", price: "0.00" },
                        { name: "Medium", price: "0.00" },
                        { name: "Large", price: "0.00" }
                      ]);
                    }
                    setShowVariantTypeModal(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col group"
                >
                  <span className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    Size
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Use sizes such as small, regular, medium, large, etc.
                  </span>
                </button>

                {/* 2. Quantity */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantType("Quantity");
                    if (variants.length === 0) {
                      setVariants([
                        { name: "1 Pc", price: "0.00" },
                        { name: "2 Pc", price: "0.00" },
                        { name: "3 Pieces", price: "0.00" }
                      ]);
                    }
                    setShowVariantTypeModal(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col group"
                >
                  <span className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    Quantity
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Use quantity such as 3 Pieces, 6 Pc, 100 gm, 1 kg etc.
                  </span>
                </button>

                {/* 3. Custom */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantType("Custom");
                    if (variants.length === 0) {
                      setVariants([{ name: "", price: "0.00" }]);
                    }
                    setShowVariantTypeModal(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex flex-col group pb-8 sm:pb-4"
                >
                  <span className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    Custom
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add your own variant name
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 📂 MODAL: CHOOSE CATEGORY FOR ITEM (Bottom Sheet style matching Reference Image 2) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCategorySelectModal && (
          <div className="fixed inset-0 z-[10030] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs">
            {/* Backdrop Closer */}
            <div
              className="absolute inset-0"
              onClick={() => setShowCategorySelectModal(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl border-t border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden z-10"
            >
              {/* Top drag handle indicator */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-3 mb-1 shrink-0" />

              {/* Title Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-[17px] font-bold text-slate-900 dark:text-white">
                  Select Item Category
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCategorySelectModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Category Options List */}
              <div className="flex-1 overflow-y-auto py-1">
                {/* None Option */}
                <button
                  type="button"
                  onClick={() => {
                    setEditCategoryId("");
                    setEditCategoryName("");
                    setShowCategorySelectModal(false);
                  }}
                  className={`w-full py-3.5 px-5 flex items-center justify-between text-left text-[14px] font-medium transition-colors ${
                    !editCategoryId
                      ? "bg-[#2563EB] text-white font-bold"
                      : "text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>None</span>
                </button>

                {allCategories.map((c) => {
                  const isSelected = editCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setEditCategoryId(c.id);
                        setEditCategoryName(c.name);
                        setShowCategorySelectModal(false);
                      }}
                      className={`w-full py-3.5 px-5 flex items-center justify-between text-left text-[14px] uppercase tracking-wide transition-colors ${
                        isSelected
                          ? "bg-[#2563EB] text-white font-bold"
                          : "text-slate-900 dark:text-slate-100 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Action: Add Item Category Button */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategorySelectModal(false);
                    setShowAddItemCategoryScreen(true);
                  }}
                  className="w-full py-3 rounded-xl border-2 border-[#2563EB] bg-white dark:bg-slate-900 text-[#2563EB] hover:bg-blue-50/60 font-bold text-[14px] transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Add Item Category</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ========================================================================= */}
      {/* 📏 MODAL: SELECT UNIT (Bottom Sheet style matching Reference Images 1, 2, 3) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showUnitSelectModal && (
          <div className="fixed inset-0 z-[10030] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs">
            {/* Backdrop Closer */}
            <div
              className="absolute inset-0"
              onClick={() => {
                setShowUnitSelectModal(false);
                setShowAddUnitPrompt(false);
              }}
            />

            {/* Floating Top Circular Close Button (Black circle with X, matching Reference Image) */}
            <button
              type="button"
              onClick={() => {
                setShowUnitSelectModal(false);
                setShowAddUnitPrompt(false);
              }}
              className="absolute bottom-[82vh] z-20 w-11 h-11 rounded-full bg-[#111827] text-white flex items-center justify-center shadow-2xl border border-slate-700/80 active:scale-90 transition-transform"
              title="Close"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl border-t border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden z-10"
            >
              {/* Title Header */}
              <div className="px-6 pt-5 pb-3 shrink-0">
                <h3 className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight">
                  Select Unit
                </h3>
              </div>

              {/* Add New Unit Link Button */}
              <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                {!showAddUnitPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowAddUnitPrompt(true)}
                    className="text-[15px] font-semibold text-[#8B5CF6] hover:text-[#7C3AED] transition-colors flex items-center gap-1.5"
                  >
                    <span>Add New Unit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. BUNDLE, DOZEN, BOX"
                      value={newUnitInput}
                      onChange={(e) => setNewUnitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newUnitInput.trim()) {
                          const code = newUnitInput.trim().toUpperCase();
                          if (!customUnits.includes(code)) {
                            setCustomUnits((prev) => [...prev, code]);
                          }
                          setEditUnit(code);
                          setNewUnitInput("");
                          setShowAddUnitPrompt(false);
                          setShowUnitSelectModal(false);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase outline-none focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newUnitInput.trim()) {
                          const code = newUnitInput.trim().toUpperCase();
                          if (!customUnits.includes(code)) {
                            setCustomUnits((prev) => [...prev, code]);
                          }
                          setEditUnit(code);
                          setNewUnitInput("");
                        }
                        setShowAddUnitPrompt(false);
                        setShowUnitSelectModal(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewUnitInput("");
                        setShowAddUnitPrompt(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Units List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/60">
                {/* Standard Units directly from the user's uploaded screenshots */}
                {[
                  { code: "NONE", label: "NONE", value: "" },
                  { code: "BAG", label: "BAGS", value: "bag" },
                  { code: "BDL", label: "BUNDLES", value: "bdl" },
                  { code: "BOX", label: "BOX", value: "box" },
                  { code: "BTL", label: "BOTTLES", value: "btl" },
                  { code: "BUC", label: "BUCKETS", value: "buc" },
                  { code: "CAN", label: "CANS", value: "can" },
                  { code: "CRT", label: "CARATS", value: "crt" },
                  { code: "CTN", label: "CARTONS", value: "ctn" },
                  { code: "DZN", label: "DOZENS", value: "dzn" },
                  { code: "GMS", label: "GRAMS", value: "gm" },
                  { code: "KG", label: "KILOGRAMS", value: "kg" },
                  { code: "KW", label: "KILOWATT", value: "kw" },
                  { code: "LTR", label: "LITRE", value: "ltr" },
                  { code: "MTR", label: "METERS", value: "mtr" },
                  { code: "ML", label: "MILLILITRE", value: "ml" },
                  { code: "NOS", label: "NUMBERS", value: "nos" },
                  { code: "PAC", label: "PACKS", value: "pac" },
                  { code: "PLATE", label: "PLATE", value: "plate" },
                  { code: "PORTION", label: "PORTION", value: "portion" },
                  { code: "PRS", label: "PAIRS", value: "prs" },
                  { code: "PCS", label: "PIECES", value: "pcs" },
                  { code: "QTL", label: "QUINTAL", value: "qtl" },
                  { code: "ROL", label: "ROLLS", value: "rol" },
                  { code: "SQF", label: "SQUARE FEET", value: "sqf" },
                  { code: "SQM", label: "SQUARE METERS", value: "sqm" },
                  { code: "TBS", label: "TABLETS", value: "tbs" },
                  { code: "W", label: "WATTS", value: "w" },
                  ...customUnits.map((cu) => ({ code: cu, label: cu, value: cu.toLowerCase() }))
                ].map((u) => {
                  const isSelected = (!editUnit && !u.value) || (editUnit && editUnit.toLowerCase() === u.value);
                  return (
                    <button
                      key={u.code}
                      type="button"
                      onClick={() => {
                        setEditUnit(u.value);
                        setShowUnitSelectModal(false);
                      }}
                      className={`w-full py-4 px-6 flex items-center justify-between text-left transition-colors ${
                        isSelected
                          ? "bg-[#EDE9FE] dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-300 font-bold"
                          : "text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="text-[15px] font-bold tracking-wide">
                        <span className="uppercase">{u.code}</span>{" "}
                        <span className="font-normal text-slate-500 dark:text-slate-400 text-[14px]">
                          ({u.label})
                        </span>
                      </span>
                      {isSelected && (
                        <Check size={20} className="text-[#7C3AED] stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🖼️ MODAL: SEARCH & SELECT IMAGES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showImageSearchModal && (
          <div className="fixed inset-0 z-[10030] flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full h-full sm:h-[85vh] sm:max-w-lg bg-white dark:bg-slate-900 sm:rounded-[32px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Search Images
                </h3>
                <button
                  onClick={() => setShowImageSearchModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search bar inside image modal */}
              <div className="p-4 pb-2">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchImageQuery}
                    onChange={(e) => setSearchImageQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchImages()}
                    placeholder="Search food item..."
                    className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchImages()}
                    className="absolute right-2 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold"
                  >
                    Search
                  </button>
                </div>
              </div>

              {/* Image Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {searchingImages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">Searching...</span>
                  </div>
                ) : searchedImages.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-xs font-bold">
                    No images found. Try another search.
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {searchedImages.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setEditImageUrl(img.url);
                            setShowImageSearchModal(false);
                          }}
                          className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-indigo-500 active:scale-95 transition-all relative group"
                        >
                          <img
                            src={img.url}
                            alt={img.title || "food"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="py-4 text-center">
                      <button
                        onClick={handleLoadMoreImages}
                        disabled={loadingMoreImages}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
                      >
                        {loadingMoreImages ? "Loading..." : "Load More Images"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Local File Upload Button in Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                <label className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md">
                  <Upload size={16} />
                  <span>Upload from Computer</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 📁 MODAL: ADD ITEM CATEGORY (App Fullscreen / Drawer) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddItemCategoryScreen && (
          <div className="fixed inset-0 z-[10025] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-[32px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setShowAddItemCategoryScreen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Add Item Category
                </h2>
                <div className="w-8" />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Zone assign */}
                {ZONE_OPTIONS.length > 0 && (
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Assign to Zone
                    </label>
                    <select
                      value={categoryScreenZone}
                      onChange={(e) => setCategoryScreenZone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    >
                      {ZONE_OPTIONS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Name */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryScreenName}
                    onChange={(e) => setCategoryScreenName(e.target.value)}
                    placeholder="e.g. Starters / Beverages"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                  />
                  <div className="flex items-center gap-1 mt-1.5 text-slate-400 text-[11px] font-medium">
                    <Info size={12} />
                    <span>Items are grouped by category while placing orders.</span>
                  </div>
                </div>

                {/* Category List & Reorder Trigger */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      All Categories ({allCategories.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenReorder}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"
                      title="Reorder Categories"
                    >
                      <ArrowUpDown size={14} />
                      <span>Reorder</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    {allCategories.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between bg-white dark:bg-slate-900"
                      >
                        <span>{c.name}</span>
                        {c.zones && c.zones.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {c.zones.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveCategoryScreen(true)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  Save & New
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCategoryScreen(false)}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ✏️ MODAL: EDIT / DELETE CATEGORY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditCategoryModalVisible && selectedCategoryToEdit && (
          <div className="fixed inset-0 z-[10025] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-[32px] flex flex-col shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditCategoryModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0"
                  title="Back"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <h2 className="text-[22px] sm:text-[23px] font-bold text-slate-900 dark:text-white tracking-tight flex-1 text-center pr-2">
                  Edit Category
                </h2>
                <div className="w-10 shrink-0" aria-hidden="true" />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Category Name Input Field */}
                <div>
                  <label className="text-[13px] sm:text-[14px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={editCategoryNewName}
                    onChange={(e) => setEditCategoryNewName(e.target.value)}
                    className="w-full h-14 px-4 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-indigo-500 dark:border-indigo-500 text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white outline-none shadow-2xs transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15"
                    placeholder="Category Name"
                  />
                </div>

                {/* Items in this Category Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-[13px] sm:text-[14px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Items in this category ({selectedCategoryToEdit.items.length})
                    </h4>
                    <span className="text-[12px] text-slate-400 font-medium">
                      Tap item to edit
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[50vh] sm:max-h-[46vh] overflow-y-auto pr-0.5 pb-2">
                    {selectedCategoryToEdit.items.length === 0 ? (
                      <div className="px-4 py-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                        <FolderOpen size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          No items in this category yet
                        </p>
                      </div>
                    ) : (
                      selectedCategoryToEdit.items.map((it) => (
                        <div
                          key={it.id}
                          onClick={() => {
                            setIsEditCategoryModalVisible(false);
                            handleItemClick(it, selectedCategoryToEdit.id, selectedCategoryToEdit.name);
                          }}
                          className="min-h-[84px] sm:min-h-[88px] p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800 active:scale-[0.99] cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs group"
                        >
                          {/* Left: 56x56 Thumbnail & Product Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Product Image Thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                              {it.imageUrl ? (
                                <img
                                  src={it.imageUrl}
                                  alt={it.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  loading="lazy"
                                />
                              ) : (
                                <ImageIcon size={20} className="text-slate-300 dark:text-slate-600" />
                              )}
                            </div>

                            {/* Product Name & Diet Dot */}
                            <div className="min-w-0 flex-1 pr-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    it.isVeg
                                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                                      : it.isEgg
                                      ? "bg-amber-500 ring-2 ring-amber-500/20"
                                      : "bg-rose-500 ring-2 ring-rose-500/20"
                                  }`}
                                  title={it.isVeg ? "Vegetarian" : it.isEgg ? "Egg" : "Non-Vegetarian"}
                                />
                                <h5 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 dark:text-white truncate tracking-tight">
                                  {it.name}
                                </h5>
                              </div>
                            </div>
                          </div>

                          {/* Right: Selling Price & 36px Circular Touch Target Arrow */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[16px] sm:text-[17px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {sym}{it.price}
                            </span>
                            <div className="w-9 h-9 rounded-full bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors shrink-0">
                              <ChevronRight size={15} className="stroke-[2.5]" />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Buttons: 54-56px Height, Aligned & Safe-Area Aware */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 shrink-0 pb-safe">
                <button
                  type="button"
                  onClick={() => setShowDeleteCategoryConfirm(true)}
                  disabled={isUpdatingCategory || isDeletingCategory}
                  className="flex-1 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[14px] sm:text-[15px] uppercase tracking-wider border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCategory}
                  disabled={isUpdatingCategory || isDeletingCategory}
                  className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[14px] sm:text-[15px] uppercase tracking-wider shadow-lg shadow-indigo-600/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isUpdatingCategory ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🔄 MODAL: REORDER CATEGORIES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isReorderModalVisible && (
          <div className="fixed inset-0 z-[10035] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Reorder Categories
                </h3>
                <button
                  onClick={() => setIsReorderModalVisible(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {reorderList.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {idx + 1}. {cat.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveCategory(idx, "up")}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-30 text-xs font-bold"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveCategory(idx, "down")}
                        disabled={idx === reorderList.length - 1}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-600 disabled:opacity-30 text-xs font-bold"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => setIsReorderModalVisible(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategoryOrder}
                  disabled={isSavingOrder}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
                >
                  {isSavingOrder ? "Saving..." : "Save Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ⚠️ DELETE ITEM CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[10035] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Menu Item?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                Are you sure you want to remove &quot;{selectedItem?.name}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteItem}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ⚠️ DELETE CATEGORY CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDeleteCategoryConfirm && (
          <div className="fixed inset-0 z-[10035] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Delete Category?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                Are you sure you want to delete &quot;{selectedCategoryToEdit?.name}&quot;?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteCategoryConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={isDeletingCategory}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25"
                >
                  {isDeletingCategory ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🌍 MODAL: TOP ZONE SELECTION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {topZoneModalVisible && (
          <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Select Zone</h3>
                <button onClick={() => setTopZoneModalVisible(false)} className="text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="py-2 space-y-1">
                {ZONE_OPTIONS.map((z) => (
                  <button
                    key={z}
                    onClick={() => {
                      setTopZone(z);
                      setTopZoneModalVisible(false);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors ${
                      topZone === z
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span>{z}</span>
                    {topZone === z && <Check size={14} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🌟 FEEDBACK / TOAST MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {/* ========================================================================= */}
        {/* ⚙️ MODAL: ITEM SETTINGS (GST & TAX TOGGLE) */}
        {/* ========================================================================= */}
        {showItemSettingsModal && (
          <div className="fixed inset-0 z-[10035] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Item Settings
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Configure tax and billing options
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowItemSettingsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* GST Enable / Disable Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Enable GST / Tax
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Show tax rate, HSN code & With/Without Tax options
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isGstEnabled;
                    setIsGstEnabled(nextVal);
                    if (typeof localStorage !== "undefined") {
                      localStorage.setItem("kravy_item_gst_enabled", String(nextVal));
                    }
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    isGstEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      isGstEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Stock / Inventory Enable / Disable Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Enable Stock / Inventory
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Manage opening stock, stock-in date & low stock alerts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isInventoryEnabled;
                    setIsInventoryEnabled(nextVal);
                    if (typeof localStorage !== "undefined") {
                      localStorage.setItem("kravy_item_inventory_enabled", String(nextVal));
                    }
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    isInventoryEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      isInventoryEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Food Type (Restaurant Mode) Enable / Disable Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Food Type (Restaurant)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Show Veg, Egg & Non-Veg tags (Turn off for retail / non-restaurant)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isFoodTypeEnabled;
                    setIsFoodTypeEnabled(nextVal);
                    if (typeof localStorage !== "undefined") {
                      localStorage.setItem("kravy_food_type_enabled", String(nextVal));
                    }
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0 ${
                    isFoodTypeEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      isFoodTypeEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemSettingsModal(false)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📋 BOTTOM SHEET / MODAL: SELECT TAX RATE (Matching Reference Screenshot) */}
        {/* ========================================================================= */}
        {showTaxRateModal && (
          <div className="fixed inset-0 z-[10035] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Select Tax Rate
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTaxRateModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tax Rate Options List (Matching Screenshot exactly) */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {[
                  "GST@0%",
                  "IGST@0%",
                  "GST@0.25%",
                  "IGST@0.25%",
                  "GST@1.5%",
                  "IGST@1.5%",
                  "GST@3%",
                  "IGST@3%",
                  "GST@5%",
                  "IGST@5%",
                  "GST@12%",
                  "IGST@12%",
                  "GST@18%",
                  "IGST@18%",
                  "GST@28%",
                  "IGST@28%",
                  "Exempt",
                ].map((rate) => {
                  const isSelected = editGstRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setEditGstRate(rate);
                        setShowTaxRateModal(false);
                      }}
                      className={`w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isSelected
                          ? "bg-indigo-50/70 dark:bg-indigo-950/40 font-black text-indigo-600 dark:text-indigo-400"
                          : "font-bold text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span className="text-sm tracking-wide">{rate}</span>
                      {isSelected && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 📦 BOTTOM SHEET MODAL: STOCK ACTION SELECTOR (Stock In vs Stock Out vs History) */}
        {/* ========================================================================= */}
        {stockActionItem && stockActionType === "SELECT" && (
          <div className="fixed inset-0 z-[10036] flex items-end justify-center p-0 bg-slate-950/75 backdrop-blur-md transition-all">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-[36px] shadow-2xl border-t border-x border-slate-200/80 dark:border-slate-800 flex flex-col p-6 pb-9 relative overflow-hidden"
            >
              {/* Top Drag Handle Indicator */}
              <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80 mx-auto mb-4 -mt-1 cursor-grab active:cursor-grabbing" />

              {/* Header with Title and Modern Close Button */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
                    Stock Manager
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate mt-1 tracking-tight">
                    {stockActionItem.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStockActionItem(null);
                    setStockActionType("SELECT");
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
                  title="Close"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Glowing Hero Stock Balance Card */}
              {(() => {
                const cur = stockActionItem.currentStock != null ? Number(stockActionItem.currentStock) : (stockActionItem.openingStock != null ? Number(stockActionItem.openingStock) : 0);
                const unit = stockActionItem.unit || "Pcs";
                const isOut = cur <= 0;

                return (
                  <div
                    className={`relative overflow-hidden p-5 rounded-3xl border transition-all mb-5 ${
                      isOut
                        ? "bg-gradient-to-b from-rose-50/70 via-rose-50/20 to-transparent dark:from-rose-950/30 dark:via-rose-950/10 border-rose-200/80 dark:border-rose-900/60 shadow-xs"
                        : "bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/60 shadow-xs"
                    }`}
                  >
                    {/* Subtle Background Glow Orb */}
                    <div
                      className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
                        isOut ? "bg-rose-400" : "bg-emerald-400"
                      }`}
                    />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOut ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-black uppercase tracking-widest ${
                            isOut ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {isOut ? "Out of Stock" : "Current Stock Level"}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
                        <span
                          className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tight ${
                            isOut ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {cur.toFixed(1)}
                        </span>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          {unit}
                        </span>
                      </div>

                      {stockActionItem.price != null && stockActionItem.price > 0 && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                          Selling Price: <span className="font-bold text-slate-700 dark:text-slate-300">{sym}{stockActionItem.price}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Primary Action Buttons: Stock In (Green Vibrant) & Stock Out (Rose Vibrant) */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setStockActionType("IN");
                    setStockQuantityInput("");
                    setStockUnitPriceInput(stockActionItem.price != null ? String(stockActionItem.price) : "");
                    setStockReasonInput("Purchase");
                    setStockNotesInput("");
                    setStockAdjustmentDate(new Date().toLocaleDateString("en-GB"));
                  }}
                  className="group relative overflow-hidden h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowDown size={18} className="stroke-[3] text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-none font-extrabold text-sm">Stock In</span>
                    <span className="text-[10px] text-emerald-100/90 font-medium leading-tight">Add inventory</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStockActionType("OUT");
                    setStockQuantityInput("");
                    setStockUnitPriceInput("");
                    setStockReasonInput("Wastage");
                    setStockNotesInput("");
                    setStockAdjustmentDate(new Date().toLocaleDateString("en-GB"));
                  }}
                  className="group relative overflow-hidden h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/30 active:scale-98 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowUp size={18} className="stroke-[3] text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-none font-extrabold text-sm">Stock Out</span>
                    <span className="text-[10px] text-rose-100/90 font-medium leading-tight">Deduct stock</span>
                  </div>
                </button>
              </div>

              {/* Secondary History & Item Details Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFetchStockHistory(stockActionItem)}
                  className="h-11 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/60 dark:border-slate-700/60 active:scale-98 transition-all"
                >
                  <History size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Audit History</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const it = stockActionItem;
                    setStockActionItem(null);
                    handleItemClick(it, it.categoryId || "others", "");
                  }}
                  className="h-11 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/60 dark:border-slate-700/60 active:scale-98 transition-all"
                >
                  <Sliders size={16} className="text-slate-500" />
                  <span>Edit Item Details</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📥 BOTTOM SHEET MODAL: STOCK IN (Exact Screenshot Flow) */}
        {/* ========================================================================= */}
        {stockActionItem && stockActionType === "IN" && (
          <div className="fixed inset-0 z-[10037] flex items-end justify-center p-0 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-5 pb-8 relative max-h-[92vh] overflow-y-auto"
            >
              {/* Floating Close Button */}
              <button
                type="button"
                onClick={() => setStockActionType("SELECT")}
                className="w-9 h-9 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-lg absolute -top-4 left-1/2 -translate-x-1/2 hover:scale-105 active:scale-95 transition-all z-10"
              >
                <X size={18} />
              </button>

              {/* Title */}
              <div className="mt-2 mb-4">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Stock In ({stockActionItem.name})
                </h3>
              </div>

              {/* Green Big Input Box */}
              <div className="border-2 border-emerald-500 rounded-2xl p-3 bg-emerald-50/20 dark:bg-emerald-950/20 mb-2">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={stockQuantityInput}
                  onChange={(e) => setStockQuantityInput(e.target.value)}
                  placeholder="0.0"
                  className="w-full text-center text-3xl font-black text-emerald-600 dark:text-emerald-400 bg-transparent outline-none tabular-nums placeholder-emerald-300"
                />
              </div>

              {/* Current & Calculated Resulting Stock */}
              {(() => {
                const cur = stockActionItem.currentStock != null ? Number(stockActionItem.currentStock) : (stockActionItem.openingStock != null ? Number(stockActionItem.openingStock) : 0);
                const addQty = parseFloat(stockQuantityInput) || 0;
                const newStock = cur + addQty;
                const unit = stockActionItem.unit || "Pcs";
                return (
                  <div className="flex items-center justify-between px-1 mb-4 text-xs font-bold text-slate-500">
                    <span>Current Stock: <span className="text-rose-500 tabular-nums">{cur} {unit}</span></span>
                    {addQty > 0 && (
                      <span className="text-emerald-600 font-extrabold">New Stock: {newStock} {unit}</span>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {/* Adjustment Date */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block">Adjustment Date</label>
                    <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">
                      {stockAdjustmentDate || new Date().toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Calendar size={18} className="text-slate-400" />
                </div>

                {/* Stock In Purchase Price */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Stock In Price / Unit ({sym})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stockUnitPriceInput}
                    onChange={(e) => setStockUnitPriceInput(e.target.value)}
                    placeholder="e.g. 90"
                    className="w-full text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none tabular-nums"
                  />
                </div>

                {/* Reason Select / Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 px-1">Reason</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Purchase", "Opening Stock", "Return"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStockReasonInput(r)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          stockReasonInput === r
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Notes / Supplier Details</label>
                  <input
                    type="text"
                    value={stockNotesInput}
                    onChange={(e) => setStockNotesInput(e.target.value)}
                    placeholder="e.g. Invoice #402 / Supplier ABC"
                    className="w-full text-xs font-medium text-slate-900 dark:text-white bg-transparent outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={isSubmittingStock || !stockQuantityInput || parseFloat(stockQuantityInput) <= 0}
                  onClick={handleAdjustStock}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all mt-2"
                >
                  {isSubmittingStock ? "Adding Stock..." : "Add Stock"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📤 BOTTOM SHEET MODAL: STOCK OUT (Exact Screenshot Flow) */}
        {/* ========================================================================= */}
        {stockActionItem && stockActionType === "OUT" && (
          <div className="fixed inset-0 z-[10037] flex items-end justify-center p-0 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-5 pb-8 relative max-h-[92vh] overflow-y-auto"
            >
              {/* Floating Close Button */}
              <button
                type="button"
                onClick={() => setStockActionType("SELECT")}
                className="w-9 h-9 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-lg absolute -top-4 left-1/2 -translate-x-1/2 hover:scale-105 active:scale-95 transition-all z-10"
              >
                <X size={18} />
              </button>

              {/* Title */}
              <div className="mt-2 mb-4">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Stock Out ({stockActionItem.name})
                </h3>
              </div>

              {/* Red Big Input Box */}
              <div className="border-2 border-rose-500 rounded-2xl p-3 bg-rose-50/20 dark:bg-rose-950/20 mb-2">
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={stockQuantityInput}
                  onChange={(e) => setStockQuantityInput(e.target.value)}
                  placeholder="0.0"
                  className="w-full text-center text-3xl font-black text-rose-600 dark:text-rose-400 bg-transparent outline-none tabular-nums placeholder-rose-300"
                />
              </div>

              {/* Current & Calculated Remaining Stock */}
              {(() => {
                const cur = stockActionItem.currentStock != null ? Number(stockActionItem.currentStock) : (stockActionItem.openingStock != null ? Number(stockActionItem.openingStock) : 0);
                const removeQty = parseFloat(stockQuantityInput) || 0;
                const remStock = cur - removeQty;
                const unit = stockActionItem.unit || "Pcs";
                return (
                  <div className="flex items-center justify-between px-1 mb-4 text-xs font-bold text-slate-500">
                    <span>Current Stock: <span className="tabular-nums font-semibold">{cur} {unit}</span></span>
                    {removeQty > 0 && (
                      <span className={`font-extrabold ${remStock < 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-200"}`}>
                        Remaining: {remStock} {unit}
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                {/* Adjustment Date */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block">Adjustment Date</label>
                    <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">
                      {stockAdjustmentDate || new Date().toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Calendar size={18} className="text-slate-400" />
                </div>

                {/* Reason Select / Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1 px-1">Reason</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {["Wastage", "Damage", "Internal Use", "Correction"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStockReasonInput(r)}
                        className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all truncate ${
                          stockReasonInput === r
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Notes / Reason Details</label>
                  <input
                    type="text"
                    value={stockNotesInput}
                    onChange={(e) => setStockNotesInput(e.target.value)}
                    placeholder="e.g. Broken packaging or burnt during prep"
                    className="w-full text-xs font-medium text-slate-900 dark:text-white bg-transparent outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={isSubmittingStock || !stockQuantityInput || parseFloat(stockQuantityInput) <= 0}
                  onClick={handleAdjustStock}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-rose-600/25 transition-all mt-2"
                >
                  {isSubmittingStock ? "Removing Stock..." : "Remove Stock"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 📜 BOTTOM SHEET MODAL: STOCK HISTORY LEDGER */}
        {/* ========================================================================= */}
        {stockActionItem && stockActionType === "HISTORY" && (
          <div className="fixed inset-0 z-[10037] flex items-end justify-center p-0 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col p-5 pb-8 relative max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Stock History
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {stockActionItem.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStockActionType("SELECT")}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 py-2">
                {loadingStockHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading History...</span>
                  </div>
                ) : stockHistoryLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <History size={36} className="text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold">No stock adjustments recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use Stock In or Stock Out to record movements.</p>
                  </div>
                ) : (
                  stockHistoryLogs.map((log: any) => {
                    const isPlus = log.type === "IN" || log.action === "ORDER_INVENTORY_RESTORED";
                    const formattedDate = log.createdAt ? new Date(log.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "";

                    return (
                      <div key={log.id} className="py-2.5 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                              isPlus ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}>
                              {log.reason || (isPlus ? "Stock In" : "Stock Out")}
                            </span>
                            <span className="text-[11px] text-slate-400 tabular-nums">{formattedDate}</span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                              {log.notes}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Balance: {log.previousStock ?? "-"} → <span className="font-bold text-slate-700 dark:text-slate-300">{log.newStock ?? "-"}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black tabular-nums ${isPlus ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPlus ? "+" : "-"}{log.quantity} {log.unit || "Pcs"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {feedbackModal.open && (
          <div className="fixed inset-0 z-[10040] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 px-6 py-5 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center max-w-xs text-center pointer-events-auto"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                  feedbackModal.type === "danger"
                    ? "bg-rose-50 text-rose-500 border border-rose-200"
                    : feedbackModal.type === "warning"
                    ? "bg-amber-50 text-amber-500 border border-amber-200"
                    : "bg-emerald-50 text-emerald-500 border border-emerald-200"
                }`}
              >
                {feedbackModal.type === "danger" ? (
                  <Trash2 size={24} />
                ) : feedbackModal.type === "warning" ? (
                  <AlertTriangle size={24} />
                ) : (
                  <CheckCircle2 size={24} />
                )}
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {feedbackModal.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {feedbackModal.detail}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )}
</div>
);
}

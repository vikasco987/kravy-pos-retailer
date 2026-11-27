"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
    LayoutGrid, Check, ArrowLeft, Save, Eye, EyeOff, RotateCcw, AlertCircle, Sparkles,
    Home, ShoppingCart, LayoutDashboard, Activity, Building, Receipt, Zap,
    UtensilsCrossed, Layers, PlusCircle, Upload, Settings, Users, UserPlus,
    Package, IndianRupee, QrCode, Camera, TrendingUp, PieChart, FileText,
    BarChart3, UserCircle, Mail, Printer, Trash2,
    Building2,
    Calendar,
    Hash,
    ShieldCheck,
    Loader2,
    History,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Lock, Shield, Archive, HelpCircle, Smartphone, Bluetooth,
    Sliders, ChefHat, GripVertical
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useAuthContext } from "@/components/AuthContext";
import { useProfileCache } from "@/hooks/useProfileCache";

// Complete list of sidebar groups & items mirroring Sidebar.tsx
// Ordered by requirement: Past Bills / History directly after KDS, then Table Status
const allSidebarGroups = [
  {
    group: "OPERATIONS",
    items: [
      { icon: Home, label: "Store Dashboard", href: "/dashboard" },
      { icon: ShoppingCart, label: "Quick POS Billing", href: "/dashboard/billing/checkout" },
      { icon: LayoutDashboard, label: "Floor Management", href: "/dashboard/terminal" },
      { icon: Activity, label: "Kitchen Workflow", href: "/dashboard/kitchen" },
      { icon: ChefHat, label: "Kitchen Display (KDS)", href: "/dashboard/kds" },
      { icon: Receipt, label: "Past Bills / History", href: "/dashboard/billing" },
      { icon: LayoutGrid, label: "Table Status", href: "/dashboard/tables" },
      { icon: Building, label: "Hotel Room Stay", href: "/dashboard/rooms" },
      { icon: Zap, label: "Fuel Billing", href: "/dashboard/fuel" },
    ]
  },
  {
    group: "STORE CATALOG",
    items: [
      { icon: UtensilsCrossed, label: "Browse Products", href: "/dashboard/menu/view" },
      { icon: Sparkles, label: "Quotation AI", href: "/dashboard/quotation" },
      { icon: Sparkles, label: "Interactive Editor", href: "/dashboard/menu-editor" },
      { icon: Layers, label: "Add-on clusters", href: "/dashboard/menu/addons" },
      { icon: Zap, label: "AI Menu Scraper", href: "/dashboard/ai-scraper", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Sparkles, label: "Auto Apply Images", href: "/dashboard/auto-apply", roles: ["ADMIN"] },
      { icon: PlusCircle, label: "Add Single Item", href: "/dashboard/menu/upload" },
      { icon: Upload, label: "Excel Bulk Import", href: "/dashboard/store-item-upload", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Settings, label: "Category & Editor", href: "/dashboard/menu/edit" },
    ]
  },
  {
    group: "RESOURCES",
    items: [
      { icon: Users, label: "Customer Parties", href: "/dashboard/parties" },
      { icon: UserPlus, label: "Staff Management", href: "/dashboard/staff", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Package, label: "Inventory Stock", href: "/dashboard/inventory", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: IndianRupee, label: "Expenses", href: "/dashboard/expenses", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: QrCode, label: "QR Order Terminal", href: "/dashboard/qr-orders" },
    ]
  },
  {
    group: "MARKETING",
    items: [
      { icon: Sparkles, label: "Marketing Hub", href: "/dashboard/combos" },
      { icon: Camera, label: "Gallery Manager", href: "/dashboard/gallery" },
    ]
  },
  {
    group: "REPORTS & ANALYTICS",
    items: [
      { icon: TrendingUp, label: "Daily Sales Report", href: "/dashboard/reports/sales/daily" },
      { icon: History, label: "Bill Edit History", href: "/dashboard/billing/history" },
      { icon: BarChart3, label: "Sales Analytics", href: "/dashboard/reports/sales/drilldown" },
      { icon: AlertCircle, label: "Customer Dues / Udhaar", href: "/dashboard/reports/unpaid" },
      { icon: IndianRupee, label: "Wallet Deposits", href: "/dashboard/reports/wallet-deposits" },
      { icon: PieChart, label: "GST Reports", href: "/dashboard/reports/gst" },
      { icon: FileText, label: "Manual Invoice", href: "/dashboard/admin/invoice-generator", roles: ["ADMIN"] },
    ]
  },
  {
    group: "INSIGHTS",
    items: [
      { icon: BarChart3, label: "Revenue Analysis", href: "/dashboard/reports/sales/revenue" },
      { icon: PieChart, label: "Mode of Payment", href: "/dashboard/reports/payments" },
      { icon: TrendingUp, label: "Business Growth", href: "/dashboard/reports/performance" },
    ]
  },
  {
    group: "ADMINISTRATION",
    items: [
      { icon: UserCircle, label: "Business Profile", href: "/dashboard/profile", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Mail, label: "Gmail Integration", href: "/dashboard/integration/gmail", roles: ["ADMIN", "SELLER"] },
      { icon: Settings, label: "POS Settings", href: "/dashboard/settings", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Sliders, label: "Sidebar Menu Layout", href: "/dashboard/settings/sidebar", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Printer, label: "Printing Setup", href: "/dashboard/settings/printing", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Smartphone, label: "Android APK Printer", href: "/dashboard/printer", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Bluetooth, label: "Direct Web Print", href: "/dashboard/web-printer", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Smartphone, label: "App Settings", href: "/dashboard/admin/app-settings", roles: ["ADMIN"] },
      { icon: History, label: "Backups", href: "/dashboard/admin/backup", roles: ["ADMIN"] },
      { icon: QrCode, label: "Google Review QR", href: "/dashboard/admin/qr-manager", roles: ["ADMIN"] },
      { icon: Zap, label: "Advanced Controls", href: "/dashboard/settings/advanced", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: IndianRupee, label: "Tax Management", href: "/dashboard/settings/tax", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: Lock, label: "Access Control", href: "/admin/users", roles: ["ADMIN"] },
      { icon: Shield, label: "Manage Platform", href: "/admin/dashboard", roles: ["ADMIN"] },
      { icon: ShieldCheck, label: "Security & Backup", href: "/dashboard/backup", roles: ["ADMIN"] },
      { icon: Archive, label: "Archive & Trash", href: "/dashboard/billing/deleted", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: HelpCircle, label: "Help & Support", href: "/dashboard/help" },
    ]
  }
];

export default function SidebarSettingsPage() {
    const router = useRouter();
    const { user: authUser, loading: authLoading, refresh: refreshUser } = useAuthContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hiddenHrefs, setHiddenHrefs] = useState<string[]>([]);
    const [sidebarOrder, setSidebarOrder] = useState<Record<string, string[]>>({});
    const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const { profile: cachedProfile } = useProfileCache();
    const userRole = authUser?.type || "USER";
    const allowedPaths = authUser?.permissions || [];

    const taxEnabled = !!cachedProfile?.taxEnabled;
    const aiScraperEnabled = !!cachedProfile?.aiScraperEnabled;
    const excelImportEnabled = !!cachedProfile?.excelImportEnabled;
    const fuelBillingEnabled = !!cachedProfile?.enableFuelBilling;
    const hotelManagementEnabled = !!cachedProfile?.enableHotelManagement;

    useEffect(() => {
        if (authLoading) return;
        
        // Use user's own hidden items from AuthContext
        if (authUser && authUser.hiddenSidebarItems) {
            setHiddenHrefs(authUser.hiddenSidebarItems);
            localStorage.setItem("kravy_hidden_sidebar_items", JSON.stringify(authUser.hiddenSidebarItems));
        } else {
            try {
                const local = localStorage.getItem("kravy_hidden_sidebar_items");
                if (local) setHiddenHrefs(JSON.parse(local));
            } catch (e) {}
        }

        // Use custom order
        if (authUser && authUser.sidebarOrder) {
            setSidebarOrder(authUser.sidebarOrder);
            localStorage.setItem("kravy_sidebar_custom_order", JSON.stringify(authUser.sidebarOrder));
        } else {
            try {
                const localOrder = localStorage.getItem("kravy_sidebar_custom_order");
                if (localOrder) setSidebarOrder(JSON.parse(localOrder));
            } catch (e) {}
        }

        setLoading(false);
    }, [authUser, authLoading]);

    // Check item visibility matching Sidebar.tsx access rules exactly
    const canAccessItem = (item: any) => {
        // 1. Application-wide Feature Flags
        if (item.label === "GST Reports" && !taxEnabled) return false;
        if (item.label === "AI Menu Scraper" && !aiScraperEnabled) return false;
        if (item.label === "Excel Bulk Import" && !excelImportEnabled) return false;
        if (item.label === "Fuel Billing" && !fuelBillingEnabled) return false;
        if (item.label === "Hotel Room Stay" && !hotelManagementEnabled) return false;

        // 2. Global Admin Bypass
        if (userRole === "ADMIN") return true;

        // 3. Explicit Path-based Access
        const baseHref = item.href.split("?")[0];
        const hasLegacyWorkflow = allowedPaths.includes("/dashboard/workflow");
        const isNewPath = baseHref === "/dashboard/terminal" || baseHref === "/dashboard/kitchen" || baseHref === "/dashboard/kds";
        const isExpensePath = baseHref === "/dashboard/expenses";
        const isRoomPath = baseHref === "/dashboard/rooms";
        const isFuelPath = baseHref === "/dashboard/fuel";
        const isKdsPath = baseHref === "/dashboard/kds";

        if (
            allowedPaths.includes("*") || 
            allowedPaths.includes(item.href) || 
            allowedPaths.includes(baseHref) || 
            (hasLegacyWorkflow && isNewPath) ||
            (isExpensePath && (userRole === "ADMIN" || userRole === "SELLER")) ||
            (isFuelPath && (userRole === "ADMIN" || userRole === "SELLER" || userRole === "USER")) ||
            (isKdsPath && (userRole === "ADMIN" || userRole === "SELLER" || userRole === "OWNER")) ||
            isRoomPath
        ) return true;

        // 4. Permission List Constraint
        if (allowedPaths.length > 0) return false;

        // 5. Legacy Role-based Fallback
        const hasRoleAccess = allowedPaths.length === 0 && Array.isArray(item.roles) ? item.roles.includes(userRole) : (allowedPaths.length === 0);
        return hasRoleAccess;
    };

    const filteredGroups = allSidebarGroups.map(group => {
        // Filter items within the group
        const items = group.items.filter(item => canAccessItem(item));

        // Apply custom ordering for this group if present
        const groupOrder = sidebarOrder[group.group];
        const sortedItems = [...items].sort((a, b) => {
            if (!groupOrder) return 0;
            const idxA = groupOrder.indexOf(a.href);
            const idxB = groupOrder.indexOf(b.href);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        return { ...group, items: sortedItems };
    }).filter(group => group.items.length > 0);

    const toggleItem = (href: string) => {
        if (href === "/dashboard/settings" || href === "/dashboard/profile") {
            toast.error("Critical settings link cannot be hidden");
            return;
        }
        kravy.toggle?.();
        setHiddenHrefs(prev => 
            prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
        );
    };

    const moveItemInGroup = (groupName: string, index: number, direction: "up" | "down", currentGroupItems: any[]) => {
        kravy.click?.();
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentGroupItems.length) return;

        const reordered = [...currentGroupItems];
        const temp = reordered[index];
        reordered[index] = reordered[targetIndex];
        reordered[targetIndex] = temp;

        const newHrefs = reordered.map(item => item.href);
        setSidebarOrder(prev => ({
            ...prev,
            [groupName]: newHrefs
        }));
    };

    const handleDragStart = (groupName: string, index: number) => {
        setDraggedGroup(groupName);
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, groupName: string, targetIndex: number, currentGroupItems: any[]) => {
        e.preventDefault();
        if (draggedGroup !== groupName || draggedIndex === null || draggedIndex === targetIndex) return;

        const reordered = [...currentGroupItems];
        const [movedItem] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, movedItem);

        setDraggedIndex(targetIndex);
        const newHrefs = reordered.map(item => item.href);
        setSidebarOrder(prev => ({
            ...prev,
            [groupName]: newHrefs
        }));
    };

    const handleDragEnd = () => {
        setDraggedGroup(null);
        setDraggedIndex(null);
    };

    const handleResetAll = () => {
        kravy.click?.();
        setHiddenHrefs([]);
        setSidebarOrder({});
        localStorage.removeItem("kravy_sidebar_custom_order");
        localStorage.removeItem("kravy_hidden_sidebar_items");
        toast.success("Reset all sidebar positions and visibility to default");
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to localStorage
            localStorage.setItem("kravy_hidden_sidebar_items", JSON.stringify(hiddenHrefs));
            localStorage.setItem("kravy_sidebar_custom_order", JSON.stringify(sidebarOrder));

            // Notify Sidebar dynamically in same tab
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'kravy_hidden_sidebar_items',
                newValue: JSON.stringify(hiddenHrefs)
            }));
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'kravy_sidebar_custom_order',
                newValue: JSON.stringify(sidebarOrder)
            }));

            // Save to Database (User Preferences)
            const res = await fetch(`/api/user/preferences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    hiddenSidebarItems: hiddenHrefs,
                    sidebarOrder: sidebarOrder
                }),
            });

            if (res.ok) {
                kravy.success?.();
                refreshUser();
                toast.success("Sidebar configuration & order saved!");
            } else {
                toast.error("Failed to sync configuration with server");
            }
        } catch (error) {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center opacity-50">Loading Navigation Controls...</div>;

    const totalItems = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
    const hiddenCount = filteredGroups.reduce((acc, g) => {
        return acc + g.items.filter(i => hiddenHrefs.includes(i.href)).length;
    }, 0);
    const visibleCount = totalItems - hiddenCount;

    return (
        <div className="w-full space-y-6 sm:space-y-8 kravy-page-fade pb-28">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button 
                        onClick={() => router.back()}
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-white" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[26px] xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                            Sidebar Menu Controls
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-wider sm:tracking-[0.12em] mt-0.5 leading-normal">
                            Reorder items with arrows (▲ ▼) or drag & drop • Hide unnecessary links
                        </p>
                    </div>
                </div>

                <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 shrink-0 self-start sm:self-auto">
                    <button
                        onClick={handleResetAll}
                        className="h-9 sm:h-10 md:h-11 px-3 sm:px-4 md:px-5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-slate-200 dark:border-white/10 whitespace-nowrap"
                    >
                        <RotateCcw size={14} />
                        <span>Reset All</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="h-9 sm:h-10 md:h-11 px-4 sm:px-5 md:px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 shadow-xl shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Save size={15} />
                        <span>{saving ? "Saving..." : "Save Customization"}</span>
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/20 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-3 sm:gap-3.5 items-start min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-500 shrink-0 shadow-inner">
                        <Sliders size={18} />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">Custom Sidebar Reordering & Visibility</h3>
                        <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed font-medium">
                            Use the <strong className="text-violet-500">Up (▲)</strong> and <strong className="text-violet-500">Down (▼)</strong> arrow buttons or drag by the grip handle to arrange items in any position you want. Click eye icon to show/hide.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-white/5 px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto">
                    <div className="text-center border-r border-slate-200 dark:border-white/10 pr-3">
                        <div className="text-base sm:text-lg font-black text-emerald-500">{visibleCount}</div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visible</div>
                    </div>
                    <div className="text-center pl-1">
                        <div className="text-base sm:text-lg font-black text-rose-500">{hiddenCount}</div>
                        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hidden</div>
                    </div>
                </div>
            </div>

            {/* Groups Grid */}
            <div className="space-y-5 sm:space-y-6">
                {filteredGroups.map((group) => (
                    <div key={group.group} className="space-y-2.5 sm:space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50" />
                                <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/40">{group.group}</h2>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {group.items.length} items
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                            {group.items.map((item, index) => {
                                const isHidden = hiddenHrefs.includes(item.href);
                                const isProtected = item.href === "/dashboard/settings" || item.href === "/dashboard/profile";
                                const Icon = item.icon;
                                const isFirst = index === 0;
                                const isLast = index === group.items.length - 1;
                                const isBeingDragged = draggedGroup === group.group && draggedIndex === index;

                                return (
                                    <div
                                        key={item.href}
                                        draggable
                                        onDragStart={() => handleDragStart(group.group, index)}
                                        onDragOver={(e) => handleDragOver(e, group.group, index, group.items)}
                                        onDragEnd={handleDragEnd}
                                        className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 group select-none ${
                                            isBeingDragged
                                            ? "border-violet-500 border-dashed bg-violet-500/10 scale-[1.01]"
                                            : !isHidden 
                                              ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-sm hover:border-violet-300 dark:hover:border-violet-500/30" 
                                              : "bg-slate-50 dark:bg-black/30 border-slate-100 dark:border-white/5 opacity-50 grayscale"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                            {/* Drag handle */}
                                            <div className="text-slate-300 dark:text-white/20 hover:text-violet-500 cursor-grab shrink-0">
                                                <GripVertical size={14} />
                                            </div>

                                            {/* Position index */}
                                            <span className="w-4 h-4 rounded-md bg-slate-100 dark:bg-white/10 text-[9px] font-black text-slate-500 dark:text-white/60 flex items-center justify-center shrink-0">
                                                {index + 1}
                                            </span>

                                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                                !isHidden 
                                                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" 
                                                : "bg-slate-200 dark:bg-white/5 text-slate-400"
                                            }`}>
                                                <Icon size={15} />
                                            </div>
                                            <div className="min-w-0 flex-1 py-0.5">
                                                <div className={`text-xs sm:text-sm font-bold tracking-tight leading-snug transition-colors ${!isHidden ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-white/40"}`}>
                                                    {item.label}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono break-all opacity-60">
                                                    {item.href}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons: Move Up, Move Down, Toggle Visibility */}
                                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                title="Move item up"
                                                disabled={isFirst}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveItemInGroup(group.group, index, "up", group.items);
                                                }}
                                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-violet-500 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all active:scale-95"
                                            >
                                                <ChevronUp size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Move item down"
                                                disabled={isLast}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveItemInGroup(group.group, index, "down", group.items);
                                                }}
                                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/70 hover:bg-violet-500 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-inherit transition-all active:scale-95"
                                            >
                                                <ChevronDown size={13} />
                                            </button>

                                            {isProtected ? (
                                                <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md">
                                                    Always
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    title={!isHidden ? "Hide from sidebar" : "Show in sidebar"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleItem(item.href);
                                                    }}
                                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center border transition-all ${
                                                        !isHidden 
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                                                        : "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                                                    }`}
                                                >
                                                    {!isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl sm:rounded-[2rem] shadow-2xl flex items-center justify-between gap-3 sm:gap-6 z-50">
                <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                    <span className="text-violet-600 font-black">{hiddenCount}</span> hidden • Custom order
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 sm:h-10 px-3.5 sm:px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-violet-600/30 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                >
                    <Save size={14} />
                    <span>{saving ? "Saving..." : "Save Sidebar"}</span>
                </button>
            </div>
        </div>
    );
}

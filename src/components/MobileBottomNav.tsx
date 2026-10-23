"use client";

import { usePathname, useRouter } from "next/navigation";
import { 
    LayoutDashboard, 
    ShoppingCart, 
    Receipt, 
    Utensils, 
    Fuel, 
    MoreHorizontal, 
    X, 
    ChevronRight,
    Settings,
    Activity,
    LayoutGrid,
    UtensilsCrossed,
    TrendingUp,
    UserCircle,
    PlusCircle,
    Users,
    UserPlus,
    Package,
    IndianRupee,
    Percent,
    Plus
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/AuthContext";
import { useProfileCache } from "@/hooks/useProfileCache";
import { kravy } from "@/lib/sounds";

export default function MobileBottomNav({ profile }: any) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: authUser, loading: authLoading } = useAuthContext();
    const { profile: cachedProfile } = useProfileCache();
    const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    const activeProfile = profile || cachedProfile;

    useEffect(() => {
        if (authLoading) return;
        if (authUser && authUser.hiddenSidebarItems) {
            setHiddenSidebarItems(authUser.hiddenSidebarItems);
        } else {
            try {
                const local = localStorage.getItem("kravy_hidden_sidebar_items");
                if (local) setHiddenSidebarItems(JSON.parse(local));
            } catch (e) {}
        }
    }, [authUser, authLoading]);

    // Close More menu on route change
    useEffect(() => {
        setIsMoreOpen(false);
    }, [pathname]);

    const userRole = authUser?.type || "USER";
    const allowedPaths = Array.isArray(authUser?.permissions) ? authUser.permissions : [];

    const rawNavItems = [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={24} /> },
        { label: "POS", href: "/dashboard/billing/checkout", icon: <ShoppingCart size={24} /> },
        { label: "History", href: "/dashboard/billing", icon: <Receipt size={24} /> },
        ...(activeProfile?.enableFuelBilling ? [{ label: "Fuel", href: "/dashboard/fuel", icon: <Fuel size={24} /> }] : [])
    ];

    const visibleNavItems = rawNavItems.filter((item) => {
        if (Array.isArray(hiddenSidebarItems)) {
            if (hiddenSidebarItems.includes(item.href) || hiddenSidebarItems.includes(item.label)) {
                return false;
            }
        }
        if (userRole === "ADMIN") return true;
        if (allowedPaths.length > 0) {
            if (allowedPaths.includes("*")) return true;
            const baseHref = item.href.split("?")[0];
            const isAllowed = allowedPaths.includes(item.href) || 
                              allowedPaths.includes(baseHref) ||
                              (item.href === "/dashboard/fuel" && activeProfile?.enableFuelBilling);
            if (!isAllowed) return false;
        }
        return true;
    });

    return (
        <div className="print:hidden" data-mobile-bottom-nav="true">
            {/* ── Native-Style Bottom Sheet for 'More' ── */}
            <div
                className={`fixed inset-0 bg-black/60 z-[9998] lg:hidden backdrop-blur-xs transition-opacity duration-300 ${
                    isMoreOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMoreOpen(false)}
            />
            <div 
                className={`fixed bottom-[65px] left-0 right-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 rounded-t-[2.5rem] shadow-2xl z-[9998] lg:hidden p-5 pt-3 pb-6 transition-transform duration-300 ease-out will-change-transform ${
                    isMoreOpen ? "translate-y-0" : "translate-y-[120%] pointer-events-none"
                }`}
            >
                {/* Drag Handle Indicator */}
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-1 cursor-grab" onClick={() => setIsMoreOpen(false)} />

                {/* Sheet Header */}
                <div className="flex items-center justify-between pb-3 pt-1 px-1">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Quick Actions
                    </h3>
                    <button
                        onClick={() => setIsMoreOpen(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Container */}
                <div className="space-y-4 max-h-[62vh] overflow-y-auto px-1 py-1 scrollbar-none">
                    {/* Top 3 Featured Cards (Compact & Responsive) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {/* 1. Add Single Item (Purple-Orange Gradient) */}
                        <button
                            onClick={() => {
                                kravy.click();
                                setIsMoreOpen(false);
                                router.push("/dashboard/menu/upload");
                            }}
                            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-orange-400 text-white shadow-xs active:scale-95 transition-all text-center min-h-[76px] sm:min-h-[88px]"
                        >
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mb-0.5">
                                <Plus size={20} className="sm:w-6 sm:h-6" strokeWidth={2.8} />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold leading-tight drop-shadow-xs">
                                Add Single<br />Item
                            </span>
                        </button>

                        {/* 2. Settings (Soft Peach/Orange) */}
                        <button
                            onClick={() => {
                                kravy.click();
                                setIsMoreOpen(false);
                                router.push("/dashboard/settings");
                            }}
                            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#FFEAD7] dark:bg-orange-950/40 text-[#B8561B] dark:text-orange-300 shadow-2xs active:scale-95 transition-all text-center min-h-[76px] sm:min-h-[88px]"
                        >
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mb-0.5">
                                <Settings size={18} className="sm:w-[22px] sm:h-[22px] fill-[#B8561B] dark:fill-orange-300 stroke-[#B8561B] dark:stroke-orange-300" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5">
                                Settings
                            </span>
                        </button>

                        {/* 3. Inventory Stock (Soft Amber) */}
                        <button
                            onClick={() => {
                                kravy.click();
                                setIsMoreOpen(false);
                                router.push("/dashboard/inventory");
                            }}
                            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-300 shadow-2xs active:scale-95 transition-all text-center min-h-[76px] sm:min-h-[88px]"
                        >
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center mb-0.5 text-[#D97706] dark:text-amber-400">
                                <Package size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.2} />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5">
                                Inventory
                            </span>
                        </button>
                    </div>

                    {/* 2-Column Rounded Action Pills Grid */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        {[
                            {
                                label: "Past Bills /\nHistory",
                                href: "/dashboard/billing",
                                icon: <Receipt size={18} className="text-[#6366F1]" />,
                                iconBg: "bg-[#EEF2FF] dark:bg-indigo-950/50",
                                border: "border-indigo-200 dark:border-indigo-900/50"
                            },
                            {
                                label: "Browse Products",
                                href: "/dashboard/menu/view",
                                icon: <UtensilsCrossed size={18} className="text-[#D97706]" />,
                                iconBg: "bg-[#FEF3C7] dark:bg-amber-950/50",
                                border: "border-amber-200 dark:border-amber-900/50"
                            },
                            {
                                label: "Customer Parties",
                                href: "/dashboard/parties",
                                icon: <Users size={18} className="text-[#EA580C]" />,
                                iconBg: "bg-[#FFEDD5] dark:bg-orange-950/50",
                                border: "border-orange-200 dark:border-orange-900/50"
                            },
                            {
                                label: "Staff\nManagement",
                                href: "/dashboard/staff",
                                icon: <UserPlus size={18} className="text-[#2563EB]" />,
                                iconBg: "bg-[#DBEAFE] dark:bg-blue-950/50",
                                border: "border-blue-200 dark:border-blue-900/50"
                            },
                            {
                                label: "Inventory Stock",
                                href: "/dashboard/inventory",
                                icon: <Package size={18} className="text-[#D97706]" />,
                                iconBg: "bg-[#FEF3C7] dark:bg-amber-950/50",
                                border: "border-amber-200 dark:border-amber-900/50"
                            },
                            {
                                label: "Business\nExpenses",
                                href: "/dashboard/expenses",
                                icon: <IndianRupee size={18} className="text-[#9333EA]" />,
                                iconBg: "bg-[#F3E8FF] dark:bg-purple-950/50",
                                border: "border-purple-200 dark:border-purple-900/50"
                            },
                            {
                                label: "Business Profile",
                                href: "/dashboard/profile",
                                icon: <UserCircle size={18} className="text-[#0D9488]" />,
                                iconBg: "bg-[#CCFBF1] dark:bg-teal-950/50",
                                border: "border-teal-200 dark:border-teal-900/50"
                            },
                            {
                                label: "POS Settings",
                                href: "/dashboard/settings",
                                icon: <Settings size={18} className="text-[#7C3AED]" />,
                                iconBg: "bg-[#EDE9FE] dark:bg-violet-950/50",
                                border: "border-violet-200 dark:border-violet-900/50"
                            },
                            {
                                label: "Tax Management",
                                href: "/dashboard/settings/tax",
                                icon: <Percent size={18} className="text-[#0D9488]" />,
                                iconBg: "bg-[#CCFBF1] dark:bg-teal-950/50",
                                border: "border-teal-200 dark:border-teal-900/50"
                            },
                        ].map((btn, idx) => (
                            <button
                                key={btn.href + idx}
                                onClick={() => {
                                    kravy.click();
                                    setIsMoreOpen(false);
                                    router.push(btn.href);
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border ${btn.border} shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all text-left`}
                            >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${btn.iconBg}`}>
                                        {btn.icon}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-line truncate">
                                        {btn.label}
                                    </span>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 shrink-0 ml-1" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bottom Nav Bar ── */}
            <div className="block lg:hidden fixed bottom-0 left-0 right-0 h-[65px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-[9999] pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {visibleNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <button
                            key={item.href}
                            onClick={() => {
                                kravy.click();
                                setIsMoreOpen(false);
                                router.push(item.href);
                            }}
                            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                                isActive 
                                ? "text-indigo-600 dark:text-indigo-400" 
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                            }`}
                        >
                            {item.icon}
                            <span className="text-[12px] font-bold mt-0.5">{item.label}</span>
                        </button>
                    );
                })}

                {/* 🚀 Replace Settings with MORE button */}
                <button
                    onClick={() => {
                        kravy.click();
                        setIsMoreOpen(prev => !prev);
                    }}
                    className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                        isMoreOpen 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                >
                    <MoreHorizontal size={24} />
                    <span className="text-[12px] font-bold mt-0.5">More</span>
                </button>
            </div>
        </div>
    );
}

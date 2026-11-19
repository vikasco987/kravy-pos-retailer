"use client";

import { usePathname, useRouter } from "next/navigation";
import { 
    LayoutDashboard, 
    ShoppingCart, 
    Receipt, 
    ReceiptText,
    Utensils, 
    Armchair,
    Fuel, 
    MoreHorizontal, 
    Grid2X2,
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
    Plus,
    Youtube,
    Video,
    Bluetooth,
    MessageSquare
} from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
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
    const [poppingKey, setPoppingKey] = useState<string | null>(null);
    const [effects, setEffects] = useState<{ id: number; key: string; sparks: { x: number; y: number; color: string }[] }[]>([]);
    const nextEffectId = useRef(0);

    const triggerGameFx = (key: string) => {
        setPoppingKey(key);
        setTimeout(() => {
            setPoppingKey(prev => (prev === key ? null : prev));
        }, 750);

        const colors = ["#ff6b9d", "#ffc24b", "#4cd9a8", "#60a5fa", "#a78bfa"];
        const sparks: { x: number; y: number; color: string }[] = [];
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * 2 * Math.PI;
            const dist = 32 + Math.random() * 18;
            sparks.push({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                color: colors[i % colors.length]
            });
        }
        const effId = ++nextEffectId.current;
        setEffects(prev => [...prev, { id: effId, key, sparks }]);
        setTimeout(() => {
            setEffects(prev => prev.filter(e => e.id !== effId));
        }, 700);

        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            try {
                navigator.vibrate(15);
            } catch (e) {}
        }
    };

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

    // Close More menu on route change and handle Android hardware back
    useEffect(() => {
        setIsMoreOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleHardwareBack = (e: Event) => {
            if (isMoreOpen) {
                e.preventDefault();
                setIsMoreOpen(false);
            }
        };
        window.addEventListener("kravy:hardware-back", handleHardwareBack);
        return () => window.removeEventListener("kravy:hardware-back", handleHardwareBack);
    }, [isMoreOpen]);

    const userRole = authUser?.type || "USER";
    const allowedPaths = Array.isArray(authUser?.permissions) ? authUser.permissions : [];

    const rawNavItems = [
        { label: "Dashboard", href: "/dashboard", IconComponent: LayoutDashboard, imageSrc: "/images/bottom-nav/dashboard.png" },
        { label: "POS", href: "/dashboard/billing/checkout", IconComponent: ShoppingCart, imageSrc: "/images/bottom-nav/pos.png" },
        { label: "Bills", href: "/dashboard/billing", IconComponent: ReceiptText, imageSrc: "/images/bottom-nav/history.png" },
        { label: "Menu", href: "/dashboard/menu/view", IconComponent: Utensils, tabletOnly: true }
    ];

    const filterAllowed = (item: any) => {
        if (Array.isArray(hiddenSidebarItems)) {
            if (hiddenSidebarItems.includes(item.href) || hiddenSidebarItems.includes(item.label)) {
                return false;
            }
        }
        if (userRole === "ADMIN") return true;

        if (userRole === "STAFF") {
            if (allowedPaths.includes("*")) return true;
            if (allowedPaths.length === 0) return false;
            const baseHref = item.href.split("?")[0];
            const isAllowed = allowedPaths.includes(item.href) || 
                              allowedPaths.includes(baseHref) ||
                              (allowedPaths.includes("/dashboard/workflow") && (baseHref === "/dashboard/terminal" || baseHref === "/dashboard/kitchen" || baseHref === "/dashboard/kds")) ||
                              (allowedPaths.includes("/dashboard/settings") && baseHref.startsWith("/dashboard/settings")) ||
                              (allowedPaths.includes("/dashboard/help") && baseHref.startsWith("/dashboard/help")) ||
                              (allowedPaths.includes("/dashboard/menu") && baseHref.startsWith("/dashboard/menu")) ||
                              (allowedPaths.includes("/dashboard/inventory") && baseHref.startsWith("/dashboard/inventory")) ||
                              (item.href === "/dashboard/fuel" && activeProfile?.enableFuelBilling);
            return !!isAllowed;
        }

        if (allowedPaths.length > 0) {
            if (allowedPaths.includes("*")) return true;
            const baseHref = item.href.split("?")[0];
            const isAllowed = allowedPaths.includes(item.href) || 
                              allowedPaths.includes(baseHref) ||
                              (allowedPaths.includes("/dashboard/workflow") && (baseHref === "/dashboard/terminal" || baseHref === "/dashboard/kitchen" || baseHref === "/dashboard/kds")) ||
                              (allowedPaths.includes("/dashboard/settings") && baseHref.startsWith("/dashboard/settings")) ||
                              (allowedPaths.includes("/dashboard/help") && baseHref.startsWith("/dashboard/help")) ||
                              (allowedPaths.includes("/dashboard/menu") && baseHref.startsWith("/dashboard/menu")) ||
                              (allowedPaths.includes("/dashboard/inventory") && baseHref.startsWith("/dashboard/inventory")) ||
                              (item.href === "/dashboard/fuel" && activeProfile?.enableFuelBilling);
            if (!isAllowed) return false;
        }
        return true;
    };

    const visibleNavItems = rawNavItems.filter(filterAllowed);
    // On mobile (<640px / sm), show 4 primary tabs + More (total 5 tabs). Menu is kept in More.
    // On tablet (sm to lg), show all 5 primary tabs (including Menu) + More (total 6 tabs).
    const mobileNavItems = visibleNavItems.filter((item) => !item.tabletOnly);

    // Top 3 Featured Cards (Filtered by staff permissions)
    const featuredCards = [
        {
            label: "Add Single\nItem",
            href: "/dashboard/menu/upload",
            imageSrc: "/images/quick-actions/add_item.png",
            icon: <Plus size={20} className="sm:w-6 sm:h-6" strokeWidth={2.8} />,
            bg: "bg-gradient-to-br from-indigo-500 via-purple-500 to-orange-400 text-white shadow-xs",
            iconClass: "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-0.5",
            textClass: "text-[10px] sm:text-xs font-bold leading-tight drop-shadow-xs"
        },
        {
            label: "Inventory Stock",
            href: "/dashboard/inventory",
            imageSrc: "/images/quick-actions/inventory.png",
            icon: <Package size={18} className="sm:w-[22px] sm:h-[22px] text-[#D97706]" />,
            bg: "bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-300 shadow-2xs",
            iconClass: "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-0.5",
            textClass: "text-[10px] sm:text-xs font-bold leading-tight mt-0.5"
        },
        {
            label: "Settings",
            href: "/dashboard/settings",
            imageSrc: "/images/quick-actions/settings.png",
            icon: <Settings size={18} className="sm:w-[22px] sm:h-[22px] fill-[#B8561B] dark:fill-orange-300 stroke-[#B8561B] dark:stroke-orange-300" />,
            bg: "bg-[#FFEAD7] dark:bg-orange-950/40 text-[#B8561B] dark:text-orange-300 shadow-2xs",
            iconClass: "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-0.5",
            textClass: "text-[10px] sm:text-xs font-bold leading-tight mt-0.5"
        }
    ].filter(filterAllowed);

    // 2-Column Action Pills (Filtered by staff permissions)
    const actionPills = [
        {
            label: "Floor & Stations",
            href: "/dashboard/tables",
            imageSrc: "/images/quick-actions/terminal.png",
            icon: <LayoutGrid size={18} className="text-[#6366F1]" />,
            iconBg: "bg-[#EEF2FF] dark:bg-indigo-950/50",
            border: "border-indigo-200 dark:border-indigo-900/50"
        },
        {
            label: "Browse Products",
            href: "/dashboard/menu/view",
            imageSrc: "/images/quick-actions/menu.png",
            icon: <UtensilsCrossed size={18} className="text-[#D97706]" />,
            iconBg: "bg-[#FEF3C7] dark:bg-amber-950/50",
            border: "border-amber-200 dark:border-amber-900/50"
        },
        {
            label: "Customer Parties",
            href: "/dashboard/parties",
            imageSrc: "/images/quick-actions/customers.png",
            icon: <Users size={18} className="text-[#EA580C]" />,
            iconBg: "bg-[#FFEDD5] dark:bg-orange-950/50",
            border: "border-orange-200 dark:border-orange-900/50"
        },
        {
            label: "Staff\nManagement",
            href: "/dashboard/staff",
            imageSrc: "/images/quick-actions/staff.png",
            icon: <UserPlus size={18} className="text-[#2563EB]" />,
            iconBg: "bg-[#DBEAFE] dark:bg-blue-950/50",
            border: "border-blue-200 dark:border-blue-900/50"
        },
        {
            label: "Store Expenses",
            href: "/dashboard/expenses",
            imageSrc: "/images/quick-actions/expenses.png",
            icon: <IndianRupee size={18} className="text-[#9333EA]" />,
            iconBg: "bg-[#F3E8FF] dark:bg-purple-950/50",
            border: "border-purple-200 dark:border-purple-900/50"
        },
        {
            label: "Business Profile",
            href: "/dashboard/profile",
            imageSrc: "/images/quick-actions/profile.png",
            icon: <UserCircle size={18} className="text-[#0D9488]" />,
            iconBg: "bg-[#CCFBF1] dark:bg-teal-950/50",
            border: "border-teal-200 dark:border-teal-900/50"
        },
        {
            label: "Connect Printer",
            href: "/dashboard/settings/connect-printer",
            imageSrc: "/images/quick-actions/printer.png",
            icon: <Bluetooth size={18} className="text-[#4F46E5]" />,
            iconBg: "bg-[#EEF2FF] dark:bg-indigo-950/50",
            border: "border-indigo-200 dark:border-indigo-900/50"
        },
        {
            label: "WhatsApp Wallet",
            href: "/dashboard/settings/whatsapp",
            icon: <MessageSquare size={18} className="text-[#25D366]" />,
            iconBg: "bg-[#DCFCE7] dark:bg-emerald-950/50",
            border: "border-emerald-200 dark:border-emerald-900/50"
        },
        {
            label: "Tax Management",
            href: "/dashboard/settings/tax",
            imageSrc: "/images/quick-actions/tax.png",
            icon: <Percent size={18} className="text-[#0D9488]" />,
            iconBg: "bg-[#CCFBF1] dark:bg-teal-950/50",
            border: "border-teal-200 dark:border-teal-900/50"
        },
        ...(activeProfile?.enableFuelBilling ? [{
            label: "Fuel Billing",
            href: "/dashboard/fuel",
            icon: <Fuel size={18} className="text-[#0284C7]" />,
            iconBg: "bg-[#DDF4FF] dark:bg-sky-950/50",
            border: "border-sky-200 dark:border-sky-900/50"
        }] : [])
    ].filter(filterAllowed);

    const isVideoBannerAllowed = filterAllowed({ href: "/dashboard/help/videos", label: "Tutorial Videos" });

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
                    {/* Top Featured Cards (Filtered by staff permissions) */}
                    {featuredCards.length > 0 && (
                        <div className={`grid gap-2 sm:gap-2.5 ${
                            featuredCards.length === 3 ? "grid-cols-3" : featuredCards.length === 2 ? "grid-cols-2" : "grid-cols-1"
                        }`}>
                            {featuredCards.map((card) => (
                                <button
                                    key={card.href + card.label}
                                    onClick={() => {
                                        kravy.click();
                                        setIsMoreOpen(false);
                                        router.push(card.href);
                                    }}
                                    className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl sm:rounded-2xl ${card.bg} active:scale-95 transition-all text-center min-h-[76px] sm:min-h-[88px]`}
                                >
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-0.5">
                                        {(card as any).imageSrc ? (
                                            <img 
                                                src={(card as any).imageSrc} 
                                                alt={card.label} 
                                                className="w-full h-full object-contain drop-shadow-sm" 
                                            />
                                        ) : card.icon}
                                    </div>
                                    <span className={card.textClass}>
                                        {card.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 2-Column Rounded Action Pills Grid (Filtered by staff permissions) */}
                    {actionPills.length > 0 && (
                        <div className={`grid gap-2.5 pt-1 ${actionPills.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                            {actionPills.map((btn, idx) => (
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
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                                            {(btn as any).imageSrc ? (
                                                <img 
                                                    src={(btn as any).imageSrc} 
                                                    alt={btn.label} 
                                                    className="w-full h-full object-contain drop-shadow-sm transition-transform group-hover:scale-105" 
                                                />
                                            ) : (
                                                <div className={`w-full h-full rounded-xl flex items-center justify-center ${btn.iconBg}`}>
                                                    {btn.icon}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-line truncate">
                                            {btn.label}
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400 shrink-0 ml-1" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Empty State when no extra action is allowed */}
                    {featuredCards.length === 0 && actionPills.length === 0 && !isVideoBannerAllowed && (
                        <div className="text-center py-8 px-4 text-slate-400 dark:text-slate-500 text-sm font-medium">
                            No additional actions available for your access.
                        </div>
                    )}

                    {/* Tutorial Video Direct Highlight Banner (Filtered by staff permissions) */}
                    {isVideoBannerAllowed && (
                        <button
                            onClick={() => {
                                kravy.click();
                                setIsMoreOpen(false);
                                router.push("/dashboard/help/videos");
                            }}
                            className="w-full mt-2 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 text-white shadow-md active:scale-[0.98] transition-all text-left"
                        >
                            <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 p-1 shadow-inner">
                                    <img 
                                        src="/images/quick-actions/youtube_3d.png" 
                                        alt="Tutorial Videos" 
                                        className="w-full h-full object-contain drop-shadow-md" 
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                                        <span>Watch POS Video Tutorials</span>
                                        <span className="text-[9px] bg-white/25 px-1.5 py-0.2 rounded font-extrabold uppercase">Official</span>
                                    </div>
                                    <p className="text-[10px] text-white/90 leading-tight mt-0.5 truncate">
                                        Learn Billing, Tables, Menu & Printer setup step-by-step
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-white/80 shrink-0 ml-2" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Premium Polish Bottom Nav Bar with 3D Game Animations ── */}
            <nav 
                aria-label="Mobile Navigation"
                className="block lg:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 shadow-[0_-4px_25px_rgba(124,58,237,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-[9999] px-1 pb-safe [perspective:600px]" 
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="h-full flex items-center justify-between w-full px-1 sm:px-3">
                    {/* Render Navigation Items */}
                    {visibleNavItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        const isTabletOnly = item.tabletOnly;
                        const isPopping = poppingKey === item.href;
                        const itemEffects = effects.filter(e => e.key === item.href);

                        const isOperationalRoute = 
                            item.href === "/dashboard/billing/checkout" ||
                            item.href === "/dashboard/terminal" || 
                            item.href === "/dashboard/tables" || 
                            item.href === "/dashboard/kitchen" || 
                            item.href === "/dashboard/workflow";
                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => {
                                    kravy.click();
                                    triggerGameFx(item.href);
                                    setIsMoreOpen(false);
                                    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
                                    if (isOffline && isOperationalRoute) {
                                        window.history.pushState({ kravyOfflineRoute: item.href }, "", item.href);
                                        window.dispatchEvent(new CustomEvent("kravy:offline-navigate", { detail: { path: item.href } }));
                                        return;
                                    }
                                    router.push(item.href);
                                }}
                                className={`relative flex-col items-center justify-center flex-1 h-full py-1 outline-none border-none focus:outline-none select-none transition-all duration-200 active:scale-90 ${
                                    isTabletOnly ? "hidden sm:flex" : "flex"
                                } ${
                                    isActive 
                                    ? "text-[#7C3AED] dark:text-[#A78BFA]" 
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                }`}
                            >
                                {/* Glowing Pill Backdrop on Active Tab */}
                                <div className={`relative flex items-center justify-center px-2.5 sm:px-3 py-1 rounded-2xl transition-all duration-300 ${
                                    isActive 
                                    ? "bg-purple-100/90 dark:bg-purple-900/40 shadow-[0_0_20px_rgba(124,58,237,0.35)] scale-100" 
                                    : "bg-transparent scale-95"
                                }`}>
                                    {/* 3D Animated Icon Wrapper */}
                                    <div 
                                        className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 [transform-style:preserve-3d] ${
                                            isPopping 
                                                ? "animate-kravy-jump" 
                                                : isActive 
                                                    ? "animate-kravy-float" 
                                                    : ""
                                        }`}
                                    >
                                        {item.imageSrc ? (
                                            <img 
                                                src={item.imageSrc} 
                                                alt={item.label} 
                                                className={`w-8 h-8 sm:w-9 sm:h-9 object-contain transition-all duration-200 ${
                                                    isActive 
                                                        ? "scale-105 drop-shadow-[0_8px_8px_rgba(124,58,237,0.45)]" 
                                                        : "opacity-90 hover:opacity-100 drop-shadow-[0_4px_4px_rgba(0,0,0,0.18)]"
                                                }`} 
                                            />
                                        ) : item.IconComponent ? (
                                            <item.IconComponent size={26} strokeWidth={2.0} />
                                        ) : null}

                                        {/* Light Sweep Sheen when active */}
                                        {isActive && (
                                            <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                                <span className="absolute -top-1/4 -left-3/4 w-1/2 h-[150%] bg-gradient-to-r from-transparent via-white/70 dark:via-white/40 to-transparent -skew-x-[20deg] animate-kravy-shine" />
                                            </span>
                                        )}

                                        {/* Sparkles and Shockwave Ring on Click */}
                                        {itemEffects.map(eff => (
                                            <React.Fragment key={eff.id}>
                                                <i className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-purple-500 dark:border-purple-400 pointer-events-none animate-kravy-ring" />
                                                {eff.sparks.map((s, sIdx) => (
                                                    <i 
                                                        key={sIdx}
                                                        className="absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full pointer-events-none animate-kravy-spark"
                                                        style={{
                                                            backgroundColor: s.color,
                                                            // @ts-ignore
                                                            "--x": `${s.x}px`,
                                                            "--y": `${s.y}px`
                                                        }}
                                                    />
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                <span className={`text-[12px] sm:text-[13px] tracking-tight mt-0.5 leading-tight whitespace-nowrap transition-all duration-200 ${
                                    isActive 
                                    ? "font-extrabold text-[#7C3AED] dark:text-[#A78BFA] translate-y-0.5 drop-shadow-xs" 
                                    : "font-semibold text-slate-500 dark:text-slate-400"
                                }`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}

                    {/* 🚀 MORE BUTTON (Using 4-Tile App Launcher Logo) */}
                    {(() => {
                        const isPopping = poppingKey === "more";
                        const moreEffects = effects.filter(e => e.key === "more");
                        return (
                            <button
                                type="button"
                                onClick={() => {
                                    kravy.click();
                                    triggerGameFx("more");
                                    setIsMoreOpen(prev => !prev);
                                }}
                                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 outline-none border-none focus:outline-none select-none transition-all duration-200 active:scale-90 ${
                                    isMoreOpen 
                                    ? "text-[#7C3AED] dark:text-[#A78BFA]" 
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                }`}
                            >
                                <div className={`relative flex items-center justify-center px-2.5 sm:px-3 py-1 rounded-2xl transition-all duration-300 ${
                                    isMoreOpen 
                                    ? "bg-purple-100/90 dark:bg-purple-900/40 shadow-[0_0_20px_rgba(124,58,237,0.35)] scale-100" 
                                    : "bg-transparent scale-95"
                                }`}>
                                    <div 
                                        className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 [transform-style:preserve-3d] ${
                                            isPopping 
                                                ? "animate-kravy-jump" 
                                                : isMoreOpen 
                                                    ? "animate-kravy-float" 
                                                    : ""
                                        }`}
                                    >
                                        <img 
                                            src="/images/bottom-nav/more.png" 
                                            alt="More" 
                                            className={`w-8 h-8 sm:w-9 sm:h-9 object-contain transition-all duration-200 ${
                                                isMoreOpen 
                                                    ? "scale-105 drop-shadow-[0_8px_8px_rgba(124,58,237,0.45)]" 
                                                    : "opacity-90 hover:opacity-100 drop-shadow-[0_4px_4px_rgba(0,0,0,0.18)]"
                                            }`} 
                                        />

                                        {isMoreOpen && (
                                            <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                                <span className="absolute -top-1/4 -left-3/4 w-1/2 h-[150%] bg-gradient-to-r from-transparent via-white/70 dark:via-white/40 to-transparent -skew-x-[20deg] animate-kravy-shine" />
                                            </span>
                                        )}

                                        {moreEffects.map(eff => (
                                            <React.Fragment key={eff.id}>
                                                <i className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-purple-500 dark:border-purple-400 pointer-events-none animate-kravy-ring" />
                                                {eff.sparks.map((s, sIdx) => (
                                                    <i 
                                                        key={sIdx}
                                                        className="absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full pointer-events-none animate-kravy-spark"
                                                        style={{
                                                            backgroundColor: s.color,
                                                            // @ts-ignore
                                                            "--x": `${s.x}px`,
                                                            "--y": `${s.y}px`
                                                        }}
                                                    />
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <span className={`text-[12px] sm:text-[13px] tracking-tight mt-0.5 leading-tight whitespace-nowrap transition-all duration-200 ${
                                    isMoreOpen 
                                    ? "font-extrabold text-[#7C3AED] dark:text-[#A78BFA] translate-y-0.5 drop-shadow-xs" 
                                    : "font-semibold text-slate-500 dark:text-slate-400"
                                }`}>
                                    More
                                </span>
                            </button>
                        );
                    })()}
                </div>
            </nav>
        </div>
    );
}

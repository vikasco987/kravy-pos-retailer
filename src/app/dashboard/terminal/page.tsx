
"use client";
import { useCurrency } from '@/lib/currency-context';
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useSocket } from "@/components/SocketContext";
import { useTerminalContext, Order, Table } from "@/components/TerminalContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { kravy } from "@/lib/sounds";
import {
    LayoutDashboard, ChefHat, MapPin, CreditCard,
    Clock, Bell, TrendingUp, ArrowRight, ArrowLeft, Check,
    Flame, UtensilsCrossed, Plus, Trash2, Eye, Edit2, Code2,
    Printer, X, Filter, Search, User, ChevronRight,
    Edit3, LogOut, Table as TableIcon, History,
    RotateCcw, RefreshCw, MoreHorizontal, Zap, Star, ShieldCheck, Layers, CheckCircle2,
    Wifi, Battery, Signal, Smartphone, Timer, AlertTriangle, ChevronUp, Package2,
    Terminal as TerminalIcon, LayoutGrid, ListTodo, ZoomIn, ZoomOut, Phone, MessageSquare,
    Truck, Package, Pause, Save, Receipt, MessageCircle, Gift, Split, Copy,
    Crown, Building, Layout, Wind, Navigation, Bluetooth, GripVertical, Move,
    GitMerge, MoreVertical, ArrowRightLeft, Menu, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    closestCenter,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PrintTemplates from "@/components/printing/PrintTemplates";
import BillPreview from "@/components/printing/BillPreview";
import { useAuthContext } from "@/components/AuthContext";
import { useConfirm } from "@/components/ConfirmContext";
import { getQRCodeDataUrl } from "@/lib/qrHelper";
import { QuickPrinterStatus } from "@/components/printing/QuickPrinterStatus";
import { getInventorySettings } from "@/lib/inventory-utils";
import MergeTablesModal from "./components/MergeTablesModal";
import MergeOrdersModal from "./components/MergeOrdersModal";
import FullScreenToggle from "@/components/FullScreenToggle";
import TransferTableModal from "./components/TransferTableModal";
import { TableActionSheet } from "./components/TableActionSheet";


const SatoshiFont = async () => (
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
);


// --- TYPES ---
type OrderItem = {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    qty?: number;
    rate?: number;
    isVeg?: boolean;
    isNew?: boolean;
    instruction?: string;
    variants?: any[];
    taxStatus?: string;
    gst?: number;
};


const TableTimer = ({ startTime, className = "" }: { startTime?: string, className?: string }) => {
    const { confirm } = useConfirm();
    const [timeData, setTimeData] = useState<{ h: number, m: number }>({ h: 0, m: 0 });
    const [ageStatus, setAgeStatus] = useState<"fresh" | "medium" | "old">("fresh");

    useEffect(() => {
        if (!startTime) return;

        const update = async () => {
            const now = new Date();
            const start = new Date(startTime);
            const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
            const mins = Math.floor(diff / 60);

            // 🟢 <10 min: Green (Fresh)
            // 🟡 10-20 min: Amber (Medium)
            // 🔴 >20 min: Red (Old / Overdue)
            if (mins < 10) setAgeStatus("fresh");
            else if (mins < 20) setAgeStatus("medium");
            else setAgeStatus("old");

            const h = Math.floor(mins / 60);
            const m = mins % 60;
            setTimeData({ h, m });
        };

        update();
        const interval = setInterval(update, 10000);
        return () => clearInterval(interval);
    }, [startTime]);

    if (!startTime) return null;

    const dynamicTextColor = {
        fresh: "text-emerald-600 dark:text-emerald-400",
        medium: "text-amber-500 dark:text-amber-400",
        old: "text-rose-600 dark:text-rose-400 font-bold"
    };

    const isCompact = className.includes("!p-0") || className.includes("!bg-transparent");

    if (isCompact) {
        return (
            <div className={`flex items-center leading-none shrink-0 font-[700] text-[12px] font-['Inter',sans-serif] ${dynamicTextColor[ageStatus]} ${className}`}>
                <span className="text-[12px] font-[700] tracking-tight whitespace-nowrap leading-none tabular-nums">
                    {timeData.h > 0 ? `${timeData.h}h ${timeData.m}m` : `${timeData.m}m`}
                </span>
            </div>
        );
    }

    const ageColors = {
        fresh: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/60",
        medium: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60",
        old: "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/60 animate-pulse"
    };

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-2xs font-['Inter',sans-serif] ${ageColors[ageStatus]} ${className}`}>
            <Clock size={11} className="shrink-0" />
            <span className="text-[12px] font-[700] tracking-tight tabular-nums">
                {timeData.h > 0 ? `${timeData.h}h ${timeData.m}m` : `${timeData.m}m`}
            </span>
        </div>
    );
};

const getTableIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("vip")) return <Crown size={14} />;
    if (n.includes("balcony")) return <Building size={14} />;
    if (n.includes("window")) return <Layout size={14} />;
    if (n.includes("rooftop")) return <Wind size={14} />;
    if (n.includes("floor")) return <Navigation size={14} />;
    return <TableIcon size={14} />;
};


type TabKey = "dashboard" | "kitchen" | "payment" | "track";

interface SortableTableCardProps {
    table: Table;
    statusConfig: any;
    isActive: boolean;
    isArrangeMode: boolean;
    onSelectTable: (tableId: string) => void;
    onEditTable?: (table: Table) => void;
    onLongPress?: (table: Table) => void;
    orders?: Order[];
    isDragTarget?: boolean;
    isDragHot?: boolean;
    isFlash?: boolean;
    isLifted?: boolean;
    onStartDragTransfer?: (e: React.PointerEvent, table: Table) => void;
}

const RollingCount = ({ value, prefix = "₹" }: { value: number; prefix?: string }) => {
    const [displayVal, setDisplayVal] = useState(value);
    const prevValRef = useRef(value);

    useEffect(() => {
        const from = prevValRef.current;
        const to = value;
        prevValRef.current = value;
        if (from === to) return;

        const duration = 500;
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + (to - from) * easeProgress);
            setDisplayVal(current);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                setDisplayVal(to);
            }
        };

        requestAnimationFrame(step);
    }, [value]);

    return (
        <span>
            {prefix}{displayVal.toFixed(2)}
        </span>
    );
};

const TableTimerRing = ({ startTime }: { startTime?: string }) => {
    const [mins, setMins] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const update = () => {
            const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
            setMins(Math.max(0, diff));
        };
        update();
        const interval = setInterval(update, 10000);
        return () => clearInterval(interval);
    }, [startTime]);

    const circumference = 50.3; // 2 * PI * 8
    const progress = Math.min(mins, 60) / 60;
    const strokeDashoffset = circumference * (1 - progress);
    const strokeColor = mins >= 60 ? "#ef4444" : mins >= 30 ? "#f97316" : "#f59e0b";

    return (
        <svg className="w-4 h-4 -rotate-90 shrink-0" viewBox="0 0 20 20">
            <circle
                className="stroke-slate-200 dark:stroke-slate-700/80 fill-none"
                cx="10"
                cy="10"
                r="8"
                strokeWidth="2.8"
            />
            <circle
                className="fill-none transition-all duration-700 ease-out"
                cx="10"
                cy="10"
                r="8"
                strokeWidth="2.8"
                stroke={strokeColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
            />
        </svg>
    );
};

const SortableTableCard = ({
    table: t,
    statusConfig,
    isActive,
    isArrangeMode,
    onSelectTable,
    onEditTable,
    onLongPress,
    orders,
    isDragTarget,
    isDragHot,
    isFlash,
    isLifted,
    onStartDragTransfer,
}: SortableTableCardProps) => {
    const { currencySymbol = "₹" } = useCurrency();
    const [isHolding, setIsHolding] = useState(false);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLongPressTriggeredRef = useRef(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: t.id,
        disabled: !isArrangeMode,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const tableActiveOrders = orders
        ? orders.filter(o => ((o.tableId === t.id) || (o.table?.id === t.id)) && o.status !== "COMPLETED" && !o.isDeleted)
        : [];
    const isReady = t.status === "READY" || tableActiveOrders.some(o => o.status === "READY");
    const isOccupied = isReady || Boolean(t.status && t.status !== "FREE") || tableActiveOrders.length > 0;

    // Check if order is 12h+ stale (720 min)
    const isStale = useMemo(() => {
        if (!isOccupied || !t.startTime) return false;
        const diffMins = Math.floor((Date.now() - new Date(t.startTime).getTime()) / 60000);
        return diffMins >= 720;
    }, [isOccupied, t.startTime]);

    const cfg = isReady
        ? statusConfig.READY
        : isOccupied
        ? (statusConfig[t.status as keyof typeof statusConfig] || statusConfig.PREPARING)
        : statusConfig.FREE;

    const displayName = t.name;
    const nameLength = displayName?.length || 0;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isArrangeMode) return;
        isLongPressTriggeredRef.current = false;
        touchStartPosRef.current = { x: e.clientX, y: e.clientY };
        setIsHolding(true);

        // If occupied, pass event up for possible drag-to-transfer
        if (isOccupied && onStartDragTransfer) {
            onStartDragTransfer(e, t);
        }

        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
            isLongPressTriggeredRef.current = true;
            setIsHolding(false);
            if (typeof navigator !== "undefined" && navigator?.vibrate) {
                try {
                    navigator.vibrate(15);
                } catch (err) {
                    // ignore if vibration blocked
                }
            }
            if (onLongPress) {
                onLongPress(t);
            }
        }, 450);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!touchStartPosRef.current) return;
        const dx = e.clientX - touchStartPosRef.current.x;
        const dy = e.clientY - touchStartPosRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
            if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
            }
            setIsHolding(false);
            touchStartPosRef.current = null;
        }
    };

    const handlePointerCancelOrEnd = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setIsHolding(false);
        touchStartPosRef.current = null;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            title={displayName}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerCancelOrEnd}
            onPointerLeave={handlePointerCancelOrEnd}
            onPointerCancel={handlePointerCancelOrEnd}
            onContextMenu={(e) => {
                if (isLongPressTriggeredRef.current) {
                    e.preventDefault();
                }
            }}
            onClick={() => {
                if (isArrangeMode) return;
                if (isLongPressTriggeredRef.current) {
                    isLongPressTriggeredRef.current = false;
                    return;
                }
                onSelectTable(t.id);
            }}
            className={`relative group h-[90px] sm:h-[94px] flex flex-col rounded-[14px] transition-all duration-200 font-['Plus_Jakarta_Sans',sans-serif] select-none ${
                isHolding ? "scale-[0.95]" : ""
            } ${
                isLifted ? "opacity-35 scale-[0.96]" : ""
            } ${
                isFlash ? "table-flash-effect" : ""
            } ${
                isReady ? "table-ready-pulse" : ""
            } ${
                isDragHot ? "table-drag-hot z-30" : ""
            } ${
                isDragTarget && !isDragHot ? "table-drag-target-pulse" : ""
            } ${
                isDragging
                    ? "opacity-60 scale-105 shadow-2xl ring-2 ring-[#635BFF] cursor-grabbing z-50"
                    : isArrangeMode
                    ? "cursor-grab hover:scale-[1.02] hover:shadow-md ring-1 ring-dashed ring-indigo-400/50"
                    : isActive
                    ? "z-20 scale-[1.02] -translate-y-0.5 cursor-pointer ring-2 ring-[#635BFF] shadow-[0_0_20px_rgba(99,91,255,0.2)]"
                    : "z-10 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
            }`}
        >
            {/* 3px smooth progress line during 450ms hold */}
            {isHolding && (
                <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#6366f1] rounded-b-[14px] z-30 pointer-events-none animate-[hl_450ms_linear_forwards]" />
            )}

            {/* 12h+ Stale Check Warning Badge (placed on top-left next to timer ring to prevent overlap with order count badge) */}
            {isStale && (
                <div className="absolute -top-2 left-3 z-30 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-[800] uppercase tracking-wider flex items-center gap-1 shadow-xs table-stale-badge">
                    <AlertTriangle size={10} strokeWidth={2.5} />
                    <span>Check</span>
                </div>
            )}

            <div
                className={`w-full h-full rounded-[14px] flex flex-col justify-between p-2 sm:p-2.5 transition-all duration-300 relative overflow-hidden ${cfg.bg} ${cfg.border} ${cfg.glow}`}
            >
                {/* Row 1 (Top Header): Only for occupied (pulse dot + timer ring) or Arrange mode */}
                <div className="w-full flex items-center justify-between gap-1 z-20 relative min-h-[14px]">
                    {isOccupied && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            {/* Color-coded Circular Progress Ring Timer */}
                            <TableTimerRing startTime={t.startTime} />
                            {isReady && (
                                <Bell size={12} className="text-[#065F46] dark:text-emerald-300 table-bell-shake" />
                            )}
                        </div>
                    )}

                    {isArrangeMode ? (
                        <div
                            {...attributes}
                            {...listeners}
                            title="Drag to rearrange"
                            className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-[#635BFF] dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform shadow-2xs shrink-0 ml-auto"
                        >
                            <GripVertical size={12} />
                        </div>
                    ) : isOccupied && t.startTime ? (
                        <TableTimer
                            startTime={t.startTime}
                            className={`!bg-transparent !p-0 !border-none !shadow-none !text-[10px] sm:!text-[11px] !font-[600] ${cfg.timerColor || "!text-[#64748B] dark:!text-amber-300"} ml-auto font-['Inter',sans-serif] tabular-nums`}
                        />
                    ) : null}
                </div>

                {/* Row 2 (Middle Body): Prominent Bold Table Number (20px, 800) */}
                <div
                    {...(isArrangeMode ? { ...attributes, ...listeners } : {})}
                    className="w-full flex items-center justify-center flex-1 z-10 px-0.5 min-h-0 overflow-hidden my-auto"
                >
                    <span
                        className={`text-center font-[800] leading-none tracking-tight select-none truncate w-full font-['Plus_Jakarta_Sans',sans-serif] ${cfg.text}`}
                        style={{
                            fontSize: nameLength <= 3 
                                ? "clamp(16px, 1.8vw, 20px)" 
                                : nameLength <= 6 
                                ? "clamp(13px, 1.4vw, 17px)" 
                                : "clamp(11px, 1.1vw, 14px)",
                        }}
                    >
                        {displayName}
                    </span>
                </div>

                {/* Row 3 (Bottom): Running Bill Amount with rolling count ONLY when occupied */}
                <div className="w-full flex items-center justify-center pt-0.5 z-20 relative min-h-[14px]">
                    {isOccupied && (
                        <span className={`text-[12px] sm:text-[14px] font-[800] tracking-tight font-['Inter',sans-serif] tabular-nums truncate max-w-full ${cfg.priceColor || "text-[#0F172A] dark:text-amber-100"}`}>
                            <RollingCount value={Number(t.activeAmount) || 0} prefix={currencySymbol} />
                        </span>
                    )}
                </div>
            </div>

            {/* Notification Badge: #F43F5E (11px, weight 600) ONLY when more than 1 active order (> 1) */}
            {!isArrangeMode && (t.activeCount ?? 0) > 1 && (
                <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 z-[40] animate-bounce">
                    <div className="bg-[#F43F5E] text-white text-[10px] sm:text-[11px] font-[600] min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 font-['Inter',sans-serif] tabular-nums">
                        {t.activeCount}
                    </div>
                </div>
            )}
        </div>
    );
};

const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n: number): string => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };
    if (num === 0) return 'Zero Only';
    const integerPart = Math.floor(Math.abs(num));
    const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
    let result = convert(integerPart) + ' Rupees';
    if (decimalPart > 0) result += ' and ' + convert(decimalPart) + ' Paise';
    return result + ' Only';
};

const calculateOrderTotals = (items: any[], isTaxEnabled: boolean, globalRate: number, perProductEnabled: boolean, business?: any) => {
    let subtotal = 0;
    let gst = 0;

    items.forEach(it => {
        const q = Number(it.quantity || it.qty || 0);
        const p = Number(it.price || it.rate || 0);
        const gross = q * p;

        let rate = 0;
        if (isTaxEnabled) {
            rate = perProductEnabled ? Number(it.gst || 0) : globalRate;
        }

        let isInclusive = it.taxStatus === "With Tax";

        if (isInclusive) {
            const base = gross / (1 + rate / 100);
            subtotal += base;
            gst += (gross - base);
        } else {
            subtotal += gross;
            gst += (gross * rate) / 100;
        }
    });

    return { subtotal, gst, total: subtotal + gst };
};


function KravyPOS() {
    const { currencySymbol: sym } = useCurrency();
    const { user } = useAuthContext();
    const router = useRouter();
    const billReceiptRef = useRef<HTMLDivElement | null>(null);
    const kotReceiptRef = useRef<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
    const {
        tablesList,
        orders,
        business,
        isLoading,
        fetchData,
        updateTableStatus,
        setOrders,
        setRawTables,
        isSyncing,
        manualSync,
        emitUpdate
    } = useTerminalContext();

    const ordersRef = useRef<Order[]>([]);
    const orderUpdateQueuesRef = useRef<Record<string, Promise<any>>>({});

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);
    const { socket, isConnected } = useSocket();

    const switchTab = (tab: TabKey) => {
        kravy.click();
        setActiveTab(tab);
    };


    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [sheetTable, setSheetTable] = useState<Table | null>(null);
    const [flashTableId, setFlashTableId] = useState<string | null>(null);
    const [dragActiveTable, setDragActiveTable] = useState<Table | null>(null);
    const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number; dx: number; width: number; height: number } | null>(null);
    const [dragHotTableId, setDragHotTableId] = useState<string | null>(null);
    const [undoToast, setUndoToast] = useState<{
        id: string;
        message: string;
        onUndo: () => Promise<void>;
    } | null>(null);
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isMergeOrdersModalOpen, setIsMergeOrdersModalOpen] = useState(false);
    const [isTableActionMenuOpen, setIsTableActionMenuOpen] = useState(false);
    const tableActionMenuRef = useRef<HTMLDivElement>(null);
    const [isDiningHeaderMenuOpen, setIsDiningHeaderMenuOpen] = useState(false);
    const diningHeaderMenuRef = useRef<HTMLDivElement>(null);
    const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
    const customerPopoverRef = useRef<HTMLDivElement>(null);

    // Auto-close table action dropdown menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tableActionMenuRef.current && !tableActionMenuRef.current.contains(event.target as Node)) {
                setIsTableActionMenuOpen(false);
            }
            if (diningHeaderMenuRef.current && !diningHeaderMenuRef.current.contains(event.target as Node)) {
                setIsDiningHeaderMenuOpen(false);
            }
            if (customerPopoverRef.current && !customerPopoverRef.current.contains(event.target as Node)) {
                setIsCustomerPopoverOpen(false);
            }
        };
        if (isTableActionMenuOpen || isDiningHeaderMenuOpen || isCustomerPopoverOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isTableActionMenuOpen, isDiningHeaderMenuOpen, isCustomerPopoverOpen]);

    // Resizable Slide-Over Drawer for Table Details
    const [drawerWidth, setDrawerWidth] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("kravy_terminal_drawer_width");
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 440 && parsed <= 1200) {
                    return parsed;
                }
            }
        }
        return 580; // Elegant default width
    });
    const [isResizingDrawer, setIsResizingDrawer] = useState(false);
    const [isSmScreen, setIsSmScreen] = useState(false);

    useEffect(() => {
        const checkScreen = () => setIsSmScreen(window.innerWidth >= 640);
        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    const startResizingDrawer = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizingDrawer(true);
    }, []);

    useEffect(() => {
        if (!isResizingDrawer) return;

        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            // Since drawer is anchored to right edge, dragging left increases width
            const calculatedWidth = window.innerWidth - clientX;
            const minW = Math.min(440, window.innerWidth - 40);
            const maxW = Math.min(window.innerWidth - 50, 1200);

            if (calculatedWidth >= minW && calculatedWidth <= maxW) {
                setDrawerWidth(Math.round(calculatedWidth));
            } else if (calculatedWidth < minW) {
                setDrawerWidth(minW);
            } else if (calculatedWidth > maxW) {
                setDrawerWidth(maxW);
            }
        };

        const handlePointerUp = () => {
            setIsResizingDrawer(false);
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp);
        window.addEventListener("touchmove", handlePointerMove);
        window.addEventListener("touchend", handlePointerUp);

        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";

        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
            window.removeEventListener("touchmove", handlePointerMove);
            window.removeEventListener("touchend", handlePointerUp);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };
    }, [isResizingDrawer]);

    // Persist drawer width to localStorage so it stays wherever user sets it
    useEffect(() => {
        if (!isResizingDrawer && typeof window !== "undefined") {
            localStorage.setItem("kravy_terminal_drawer_width", String(drawerWidth));
        }
    }, [isResizingDrawer, drawerWidth]);

    const handleMergeOrdersSuccess = (data: {
        targetOrderId: string;
        combinedItemsCount: number;
        grandTotal: number;
    }) => {
        fetchData(false, true);
        emitUpdate({ type: "ORDER_UPDATE" });
        emitUpdate({ type: "TABLE_UPDATE" });
        setSelectedOrderId(data.targetOrderId);
        setIsMergeOrdersModalOpen(false);
    };

    const handleMergeSuccess = (data: {
        primaryTableId: string;
        primaryTableName: string;
        mergedOrderId: string;
        totalItems: number;
        grandTotal: number;
    }) => {
        fetchData(false, true);
        emitUpdate({ type: "ORDER_UPDATE" });
        emitUpdate({ type: "TABLE_UPDATE" });
        setSelectedTableId(data.primaryTableId);
        setSelectedOrderId(data.mergedOrderId);
        if (isTableModalOpen) setIsTableModalOpen(false);
    };

    // Floor Management Quick Table Add/Edit
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [jsonModalData, setJsonModalData] = useState<{ title: string; json: any } | null>(null);
    const [jsonCopied, setJsonCopied] = useState(false);
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN" || user?.email === "vikasvikas9095@gmail.com";
    const [editingTable, setEditingTable] = useState<{ id: string, name: string, zone?: string, floor?: string } | null>(null);
    const [tableNameInput, setTableNameInput] = useState("");
    const [tableZoneInput, setTableZoneInput] = useState("Default");
    const [tableFloorInput, setTableFloorInput] = useState("Floor 1");
    const [fetchedFloors, setFetchedFloors] = useState<string[]>([]);
    const [manageTransferTo, setManageTransferTo] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [isSavingTable, setIsSavingTable] = useState(false);
    const [isDeletingTable, setIsDeletingTable] = useState(false);
    const [tableDelConfirm, setTableDelConfirm] = useState(false);
    // KOT Dropdown menu state
    const [isKotDropdownOpen, setIsKotDropdownOpen] = useState(false);
    // Drag & Drop Arrange Mode
    const [isArrangeMode, setIsArrangeMode] = useState(false);
    const [isSavingArrangement, setIsSavingArrangement] = useState(false);
    const [arrangeTablesList, setArrangeTablesList] = useState<Table[]>([]);

    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 150,
            tolerance: 5,
        },
    });
    const keyboardSensor = useSensor(KeyboardSensor);
    const dndSensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

    const triggerTableFlash = (tableId: string) => {
        setFlashTableId(tableId);
        setTimeout(() => setFlashTableId(null), 800);
    };

    const handleTransferOrder = async (sourceTableId: string, targetTableId: string, enableUndo = false) => {
        if (!sourceTableId || !targetTableId) return;
        const sourceOrders = orders.filter(o => ((o.tableId === sourceTableId) || (o.table?.id === sourceTableId)) && o.status !== "COMPLETED" && !o.isDeleted);
        if (sourceOrders.length === 0) {
            toast.error("No active order found on this table!");
            return;
        }
        const sourceTable = tablesList.find(t => t.id === sourceTableId);
        const targetTable = tablesList.find(t => t.id === targetTableId);
        const targetHasOrders = orders.some(o => ((o.tableId === targetTableId) || (o.table?.id === targetTableId)) && o.status !== "COMPLETED" && !o.isDeleted);
        if (targetHasOrders) {
            toast.error(`${targetTable?.name || "Target table"} already has an active running order!`);
            return;
        }

        setIsTransferring(true);
        try {
            for (const ord of sourceOrders) {
                const res = await fetch("/api/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: ord.id, tableId: targetTableId })
                });
                if (!res.ok) throw new Error("Transfer request failed");
            }

            setManageTransferTo("");
            setIsTableModalOpen(false);
            setEditingTable(null);
            fetchData(false, true);
            emitUpdate({ type: "ORDER_UPDATE" });
            kravy.success();
            triggerTableFlash(targetTableId);

            if (enableUndo) {
                // Trigger 5s interactive Undo dark toast with progress bar
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoToast({
                    id: `${sourceTableId}-${targetTableId}`,
                    message: `${sourceTable?.name || "Source"} moved to ${targetTable?.name || "Target"}`,
                    onUndo: async () => {
                        try {
                            for (const ord of sourceOrders) {
                                await fetch("/api/orders", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ orderId: ord.id, tableId: sourceTableId })
                                });
                            }
                            fetchData(false, true);
                            emitUpdate({ type: "ORDER_UPDATE" });
                            kravy.click();
                            triggerTableFlash(sourceTableId);
                            toast.success("Transfer undone! ✅");
                        } catch (e) {
                            toast.error("Failed to undo transfer");
                        }
                    }
                });
                undoTimerRef.current = setTimeout(() => {
                    setUndoToast(null);
                }, 5000);
            } else {
                toast.success(`Order transferred to ${targetTable?.name || "new table"}!`);
            }
        } catch (err) {
            console.error("TRANSFER_ORDER_ERR:", err);
            toast.error("Failed to transfer order");
            kravy.error();
        } finally {
            setIsTransferring(false);
        }
    };

    // ── Drag-to-Transfer Pointer Handlers ──
    const handleStartDragTransfer = (e: React.PointerEvent, sourceTable: Table) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const currentTarget = e.currentTarget as HTMLElement;
        const rect = currentTarget.getBoundingClientRect();
        let isDragActive = false;

        const onMove = (moveEv: PointerEvent) => {
            const dx = moveEv.clientX - startX;
            const dy = moveEv.clientY - startY;
            if (!isDragActive && Math.hypot(dx, dy) > 10) {
                isDragActive = true;
                setDragActiveTable(sourceTable);
                if (typeof navigator !== "undefined" && navigator?.vibrate) {
                    try { navigator.vibrate(15); } catch (err) {}
                }
            }

            if (isDragActive) {
                setDragGhostPos({
                    x: moveEv.clientX,
                    y: moveEv.clientY,
                    dx,
                    width: rect.width,
                    height: rect.height,
                });

                // Find element under pointer
                const elem = document.elementFromPoint(moveEv.clientX, moveEv.clientY);
                const targetCard = elem?.closest("[data-table-id]");
                const targetId = targetCard?.getAttribute("data-table-id");
                if (targetId && targetId !== sourceTable.id) {
                    const targetTable = tablesList.find(t => t.id === targetId);
                    const isTargetFree = !targetTable?.status || targetTable?.status === "FREE";
                    if (isTargetFree) {
                        setDragHotTableId(targetId);
                    } else {
                        setDragHotTableId(null);
                    }
                } else {
                    setDragHotTableId(null);
                }
            }
        };

        const onUp = (upEv: PointerEvent) => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);

            if (isDragActive) {
                const elem = document.elementFromPoint(upEv.clientX, upEv.clientY);
                const targetCard = elem?.closest("[data-table-id]");
                const targetId = targetCard?.getAttribute("data-table-id");
                setDragActiveTable(null);
                setDragGhostPos(null);
                setDragHotTableId(null);

                if (targetId && targetId !== sourceTable.id) {
                    const targetTable = tablesList.find(t => t.id === targetId);
                    const isTargetFree = !targetTable?.status || targetTable?.status === "FREE";
                    if (isTargetFree) {
                        handleTransferOrder(sourceTable.id, targetId, true);
                    }
                }
            }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    };

    // ── Drag & Drop Table Arrangement Handlers ──
    const handleStartArrange = () => {
        kravy.click();
        const sorted = [...tablesList].sort((a, b) => {
            if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
            if (a.sortOrder != null) return -1;
            if (b.sortOrder != null) return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        setArrangeTablesList(sorted);
        setIsArrangeMode(true);
        toast.info("Arrange Mode Active: Drag table cards to reorder.");
    };

    const handleDragEndTable = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setArrangeTablesList((prev) => {
            const oldIndex = prev.findIndex((item) => item.id === active.id);
            const newIndex = prev.findIndex((item) => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
        kravy.click();
    };

    const handleSaveArrangement = async () => {
        if (arrangeTablesList.length === 0) {
            setIsArrangeMode(false);
            return;
        }

        setIsSavingArrangement(true);
        try {
            const tableIds = arrangeTablesList.map((t) => t.id);
            const res = await fetch("/api/tables/order", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableIds }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save table arrangement");
            }

            // Optimistically update local rawTables state with new sortOrders
            setRawTables((prev) => {
                const orderMap = new Map<string, number>();
                tableIds.forEach((id, idx) => orderMap.set(id, idx + 1));
                return prev.map((tbl) => ({
                    ...tbl,
                    sortOrder: orderMap.has(tbl.id) ? orderMap.get(tbl.id)! : tbl.sortOrder,
                }));
            });

            setIsArrangeMode(false);
            toast.success("Table layout arrangement saved successfully! 🎉");
            kravy.success();
            fetchData(false, true);
            emitUpdate({ type: "TABLE_UPDATE" });
        } catch (err: any) {
            console.error("SAVE_ARRANGEMENT_ERR:", err);
            toast.error(err.message || "Failed to save arrangement");
            kravy.error();
        } finally {
            setIsSavingArrangement(false);
        }
    };

    const handleCancelArrangement = () => {
        kravy.click();
        setArrangeTablesList([]);
        setIsArrangeMode(false);
        toast.info("Arrangement changes discarded.");
    };

    const handleResetArrangement = async () => {
        if (!confirm("Are you sure you want to reset tables back to default A-Z order?")) return;
        setIsSavingArrangement(true);
        try {
            const res = await fetch("/api/tables/order", { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to reset table layout");

            setRawTables((prev) => prev.map((tbl) => ({ ...tbl, sortOrder: null })));
            setIsArrangeMode(false);
            toast.success("Table arrangement reset to default order.");
            kravy.success();
            fetchData(false, true);
            emitUpdate({ type: "TABLE_UPDATE" });
        } catch (err) {
            toast.error("Failed to reset table layout");
            kravy.error();
        } finally {
            setIsSavingArrangement(false);
        }
    };

    const handleSaveTable = async () => {
        if (!tableNameInput.trim()) return;
        setIsSavingTable(true);
        try {
            const method = editingTable ? "PUT" : "POST";
            const body = editingTable
                ? { id: editingTable.id, name: tableNameInput.trim(), zone: tableZoneInput, floor: tableFloorInput }
                : { name: tableNameInput.trim(), zone: tableZoneInput, floor: tableFloorInput };
            const res = await fetch("/api/tables", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (res.ok) {
                toast.success(`Table ${editingTable ? "updated" : "added"}!`);
                fetchData(false, true);
                emitUpdate({ type: "TABLE_UPDATE" });
                setIsTableModalOpen(false);
                setEditingTable(null);
                setTableNameInput("");
                setTableDelConfirm(false);
                kravy.success();
            } else {
                toast.error("Failed to save table");
                kravy.error();
            }
        } catch (e) {
            toast.error("Error saving table");
            kravy.error();
        } finally {
            setIsSavingTable(false);
        }
    };

    const handleDeleteTable = async (id: string, name: string) => {
        setIsDeletingTable(true);
        try {
            const res = await fetch(`/api/tables?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Table deleted!");
                if (selectedTableId === id) setSelectedTableId(null);
                setIsTableModalOpen(false);
                setEditingTable(null);
                setTableDelConfirm(false);
                fetchData(false, true);
                emitUpdate({ type: "TABLE_UPDATE" });
                kravy.trash();
            } else {
                toast.error("Failed to delete table");
                kravy.error();
            }
        } catch (e) {
            toast.error("Error deleting table");
            kravy.error();
        } finally {
            setIsDeletingTable(false);
        }
    };

    const handleEditTable = async (tbl: Table) => {
        setEditingTable(tbl);
        setTableNameInput(tbl.name);
        setTableZoneInput(tbl.zone || "Default");
        setTableFloorInput(tbl.floor || "Floor 1");
        setManageTransferTo("");
        setTableDelConfirm(false);
        try {
            const res = await fetch("/api/floors");
            if (res.ok) {
                const fData = await res.json();
                if (Array.isArray(fData.floors)) setFetchedFloors(fData.floors);
            }
        } catch (err) {}
        setIsTableModalOpen(true);
        kravy.click();
    };

    const [payMethod, setPayMethod] = useState("CASH");
    const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending">("Paid");
    const [splitCash, setSplitCash] = useState<number | "">("");
    const [splitUpi, setSplitUpi] = useState<number | "">("");
    const [splitCard, setSplitCard] = useState<number | "">("");
    const [splitWallet, setSplitWallet] = useState<number | "">("");
    const [amountPaid, setAmountPaid] = useState<number | "">("");
    const [discountMode, setDiscountMode] = useState<'PROMO' | 'INSTANT' | 'CHARGES'>('INSTANT');
    const [manualDeliveryCharge, setManualDeliveryCharge] = useState<string>("");
    const [deliveryChargeType, setDeliveryChargeType] = useState<'FLAT' | 'PERCENT'>('FLAT');
    const [manualPackagingCharge, setManualPackagingCharge] = useState<string>("");
    const [packagingChargeType, setPackagingChargeType] = useState<'FLAT' | 'PERCENT'>('FLAT');
    const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
    const [discountValue, setDiscountValue] = useState<string>("");
    const [isCgstEnabled, setIsCgstEnabled] = useState(true);
    const [isSgstEnabled, setIsSgstEnabled] = useState(true);
    const [printBillOnConfirm, setPrintBillOnConfirm] = useState(false);
    const [settleTab, setSettleTab] = useState<"ITEMS" | "KOT" | "RESERVATION">("ITEMS");
    const [tableSearch, setTableSearch] = useState("");
    const [useLoyaltyDiscount, setUseLoyaltyDiscount] = useState(false);
    const searchParams = useSearchParams();
    const { user: authUser } = useAuthContext();
    const userRole = authUser?.type || null;
    const userPermissions = authUser?.permissions || [];
    const [tableFilter, setTableFilter] = useState<"ALL" | "FREE" | "RUNNING" | "READY">("ALL");
    const [activeZone, setActiveZone] = useState<string>("ALL");
    const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
    const [showQRTemplate, setShowQRTemplate] = useState(false);
    const [qrContext, setQrContext] = useState<{ tableId: string, tableName: string } | null>(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [editCustomerName, setEditCustomerName] = useState("");
    const [editCustomerPhone, setEditCustomerPhone] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [selectedParty, setSelectedParty] = useState<any>(null);
    const [clock, setClock] = useState("");
    const [dateStr, setDateStr] = useState("");

    // Persist and restore selection + Handle return query params (e.g. from KOT print in checkout)
    useEffect(() => {
        const paramTableId = searchParams.get("tableId") || (typeof window !== "undefined" ? sessionStorage.getItem("last_active_table_id") : null);
        const paramOrderId = searchParams.get("orderId");
        const refreshTrigger = searchParams.get("refresh");

        if (paramTableId) {
            setSelectedTableId(paramTableId);
            sessionStorage.setItem("terminal_selected_table", paramTableId);
            if (typeof window !== "undefined") sessionStorage.removeItem("last_active_table_id");
        }

        if (paramOrderId) {
            setSelectedOrderId(paramOrderId);
            sessionStorage.setItem("terminal_selected_order", paramOrderId);
        } else {
            const savedOrderId = sessionStorage.getItem("terminal_selected_order");
            if (savedOrderId) setSelectedOrderId(savedOrderId);
        }

        // Always force fresh fetch on mount or when returning with refresh trigger
        fetchData(false, true);

        router.prefetch("/dashboard/billing/checkout");
    }, [router, searchParams, fetchData]);

    useEffect(() => {
        if (selectedTableId) sessionStorage.setItem("terminal_selected_table", selectedTableId);
        else sessionStorage.removeItem("terminal_selected_table");
    }, [selectedTableId]);

    // Handle physical/browser back button + Escape key: if a table is selected, returns to table grid
    useEffect(() => {
        if (!selectedTableId) return;

        // Push state so back action can be captured
        window.history.pushState({ terminalTableDetail: true }, "");

        const handlePopState = () => {
            setSelectedTableId(null);
            setSelectedOrderId(null);
        };

        const handleHardwareBack = (e: Event) => {
            if (selectedTableId) {
                e.preventDefault();
                setSelectedTableId(null);
                setSelectedOrderId(null);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedTableId(null);
                setSelectedOrderId(null);
            }
        };

        window.addEventListener("popstate", handlePopState);
        window.addEventListener("kravy:hardware-back", handleHardwareBack);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("kravy:hardware-back", handleHardwareBack);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedTableId]);

    useEffect(() => {
        if (selectedOrderId) sessionStorage.setItem("terminal_selected_order", selectedOrderId);
        else sessionStorage.removeItem("terminal_selected_order");
    }, [selectedOrderId]);

    const selectedTable = tablesList.find(t => t.id === selectedTableId);
    const tableOrders = selectedTable ? orders.filter(o => ((o.tableId === selectedTable.id) || (o.table?.id === selectedTable.id)) && o.status !== "COMPLETED" && !o.isDeleted) : [];
    const sortedTableOrders = useMemo(() => {
        return [...tableOrders].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    }, [tableOrders]);
    const activeOrderForSelected = selectedOrderId 
        ? orders.find(o => o.id === selectedOrderId) 
        : (sortedTableOrders.length > 0 ? sortedTableOrders[0] : (selectedTable?.activeOrderId ? orders.find(o => o.id === selectedTable.activeOrderId) : undefined));

    // Dynamic Totals Calculation
    const isTaxEnabled = business?.taxEnabled === true;
    const globalRate = 0; // Deprecated in v2, item-level taxation is always used
    const perProductEnabled = true; // Hardcoded true for v2 item-level taxation

    let subtotalCost = 0;
    let calculatedGst = 0;
    let grandTotal = 0;

    if (activeOrderForSelected && Array.isArray(activeOrderForSelected.items)) {
        activeOrderForSelected.items.forEach((it: any) => {
            const q = Number(it.quantity || it.qty || 0);
            const p = Number(it.price || it.rate || 0);
            const lineTotal = q * p;
            const rate = isTaxEnabled ? ((perProductEnabled && it.gst !== undefined && it.gst !== null) ? it.gst : globalRate) : 0;

            if (it.taxStatus === "With Tax") {
                const taxable = lineTotal / (1 + rate / 100);
                calculatedGst += (lineTotal - taxable);
                subtotalCost += taxable;
                grandTotal += lineTotal;
            } else {
                const gst = (lineTotal * rate / 100);
                calculatedGst += gst;
                subtotalCost += lineTotal;
                grandTotal += (lineTotal + gst);
            }
        });
    }

    useEffect(() => {
        const tableId = searchParams.get("tableId");
        const orderId = searchParams.get("orderId");

        if (tableId) {
            setSelectedTableId(tableId);
        }

        if (orderId) {
            setSelectedOrderId(orderId);
        }
    }, [searchParams]);

    const [printMode, setPrintMode] = useState<"KOT" | "BILL" | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<"KOT" | "BILL">("BILL");
    const [previewZoom, setPreviewZoom] = useState(1);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [printTable, setPrintTable] = useState<Table | null>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [selectedItemForAdd, setSelectedItemForAdd] = useState<any>(null);
    const [addQty, setAddQty] = useState(1);

    // ✅ Fetch Menu Items for "Add Item" Modal
    useEffect(() => {
        const controller = new AbortController();
        const fetchItems = async () => {
            try {
                const res = await fetch("/api/menu/items", { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    setMenuItems(Array.isArray(data) ? data : []);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Failed to fetch menu items for terminal", err);
                }
            }
        };
        fetchItems();
        return () => controller.abort();
    }, []);

    // Manual Combination States
    const [showCombineModal, setShowCombineModal] = useState(false);
    const [combineSelection, setCombineSelection] = useState<Set<string>>(new Set());

    const handlePrint = async (type: "KOT" | "BILL" | "COMBINED_BILL" | "MANUAL_COMBINE" | "KOT_BILL", customOrder?: Order, customTable?: Table) => {
        kravy.click();

        console.log(`[PRINT_DEBUG] handlePrint called. Type: ${type}`, { customOrder, customTable });
        let targetOrder = customOrder || printOrder || activeOrderForSelected;
        let targetTable = customTable || printTable || selectedTable;
        console.log(`[PRINT_DEBUG] Target Order Token:`, targetOrder?.tokenNumber);

        if (type === "COMBINED_BILL" && targetOrder) {
            try {
                const res = await fetch(`/api/public/orders/${targetOrder.id}/combined-bill`);
                const data = await res.json();
                if (data.success) {
                    const mergedItems = data.orders.flatMap((o: any) => o.items);
                    targetOrder = {
                        ...targetOrder,
                        id: `Combined #${targetOrder.id.slice(-4).toUpperCase()}`,
                        items: mergedItems,
                        total: data.grandTotal
                    } as any;
                    setPrintOrder(targetOrder as Order);
                } else {
                    alert("Combined bill failed: " + data.error);
                    return;
                }
            } catch (err) {
                console.error("Combined bill fetch error:", err);
                return;
            }
        } else if (type === "MANUAL_COMBINE") {
            const selectedOrders = orders.filter(o => combineSelection.has(o.id));
            if (selectedOrders.length === 0) return;

            const mergedItems = selectedOrders.flatMap(o => o.items);
            const subtotal = mergedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
            const gst = isTaxEnabled ? (subtotal * globalRate) / 100 : 0;
            const total = subtotal + gst;

            targetOrder = {
                id: `ManualMerge-${new Date().getTime().toString().slice(-4)}`,
                items: mergedItems,
                total: total,
                table: selectedOrders[0].table,
                customerName: "Combined Group",
                createdAt: new Date().toISOString(),
                status: "ACCEPTED"
            } as any;
            setPrintOrder(targetOrder as Order);
            setPrintTable(targetTable || (selectedOrders[0].table as any));
        } else {
            if (customOrder) setPrintOrder(customOrder as Order);
            if (customTable) setPrintTable(customTable);
        }

        // ✅ Print Execution
        const checkAndPrint = (attempts = 0) => {
            const isBill = type === "BILL" || type === "COMBINED_BILL" || type === "MANUAL_COMBINE" || type === "KOT_BILL";
            const targetRef = isBill ? billReceiptRef.current : kotReceiptRef.current;

            if (!targetRef) {
                if (attempts < 40) { // Up to 2 seconds (40 * 50ms)
                    setTimeout(() => checkAndPrint(attempts + 1), 50);
                } else {
                    console.error(`[PRINT ERROR] No DOM reference found for ${type}. billReceiptRef: ${!!billReceiptRef.current}, kotReceiptRef: ${!!kotReceiptRef.current}`);
                }
                return;
            }

            const containerId = `print-container-terminal-${type}`;
            const styleId = `print-style-terminal-${type}`;

            // Clean up ALL previous print containers and styles so they never collide in print preview
            document.querySelectorAll("[id^='print-container-']").forEach(el => el.remove());
            document.querySelectorAll("[id^='print-style-']").forEach(el => el.remove());

            console.log(`[PRINT_DEBUG] targetRef found. Starting print sequence...`);
            const ps = (business as any)?.printSettings || {};
            const is80 = ps.paperWidth === '80mm';
            const paperWidth = is80 ? '74mm' : '58mm';
            const paperBottomPadding = ps.paperBottomPadding !== undefined && ps.paperBottomPadding !== null ? `${ps.paperBottomPadding}px` : (is80 ? '80px' : '20px');

            const fontFamilyVal = ps.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const kotFontFamilyVal = ps.kotFontFamily || '"Courier New", Courier, monospace';
            const fontWeightVal = ps.fontWeight || '';
            const kotFontWeightVal = ps.kotFontWeight || '';

            const getClamped = (val: any, def: number, min: number, max: number) => {
                if (val === undefined || val === null || val === "") return def;
                return Math.max(min, Math.min(max, Number(val)));
            };
            const rawBusinessNameSize = getClamped(ps.businessNameSize, 18, 14, 32);
            const businessAddressSize = getClamped(ps.businessAddressSize, 11, 8, 16);
            const taglineSize = getClamped(ps.taglineSize, 11, 8, 14);
            const receiptTokenSize = getClamped(ps.receiptTokenSize, 28, 18, 40);
            const detailsFontSize = getClamped(ps.detailsFontSize, 10, 8, 14);
            const itemsFontSize = getClamped(ps.itemsFontSize, 11, 9, 18);
            const totalFontSize = getClamped(ps.totalFontSize, 13, 11, 24);
            const greetingFontSize = getClamped(ps.greetingFontSize, 12, 9, 18);
            const kotTokenSize = getClamped(ps.kotTokenSize, 16, 12, 28);
            const kotItemsFontSize = getClamped(ps.kotItemsFontSize, 11, 9, 40);
            const kotQtyFontSize = getClamped(ps.kotQtyFontSize, 14, 10, 40);

            const nameLen = ((business as any)?.businessName || "").length;
            let finalBusinessNameSize = rawBusinessNameSize;
            if (nameLen > 25) finalBusinessNameSize -= 2;
            if (nameLen > 35) finalBusinessNameSize -= 2;
            finalBusinessNameSize = Math.max(14, finalBusinessNameSize);

            const addrLen = ((business as any)?.businessAddress || "").length;
            let finalAddressSize = businessAddressSize;
            if (addrLen > 60) finalAddressSize -= 1;
            if (addrLen > 100) finalAddressSize -= 1;
            finalAddressSize = Math.max(8, finalAddressSize);

            const isKotType = type === "KOT";

            const printHTML = targetRef.innerHTML;
            const printStyles = `
                @media print {
                    html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    body > *:not(#${containerId}) { display: none !important; }
                    @page { 
                        margin: 0; 
                        size: ${is80 ? '80mm' : '58mm'} auto; 
                    }
                    #${containerId} {
                        display: block !important; 
                        width: 100% !important; 
                        max-width: ${paperWidth} !important; 
                        height: auto !important;
                        overflow: visible !important; 
                        margin: 0 auto !important; 
                        padding: ${is80 ? `2mm 6mm ${paperBottomPadding} 6mm` : `2mm 4% ${paperBottomPadding} 4%`} !important; 
                        background: #fff !important; 
                        position: relative !important; 
                        box-sizing: border-box !important;
                    }
                    #${containerId}.receipt-container-dynamic {
                        --r-font-family: ${fontFamilyVal};
                        --r-business-size: ${finalBusinessNameSize}px;
                        --r-address-size: ${finalAddressSize}px;
                        --r-tagline-size: ${taglineSize}px;
                        --r-items-size: ${itemsFontSize}px;
                        --r-total-size: ${totalFontSize}px;
                        --r-token-size: ${receiptTokenSize}px;
                        --r-details-size: ${detailsFontSize}px;
                        --r-greeting-size: ${greetingFontSize}px;
                        font-family: var(--r-font-family) !important;
                        font-size: var(--r-details-size) !important;
                    }
                    #${containerId}.receipt-container-dynamic, #${containerId}.receipt-container-dynamic * {
                        font-family: var(--r-font-family) !important;
                    }
                    #${containerId}.receipt-container-dynamic, #${containerId}.receipt-container-dynamic * {
                        font-family: var(--r-font-family) !important;
                    }
                    #${containerId}.kot-container-dynamic {
                        --k-font-family: ${kotFontFamilyVal};
                        --k-items-size: ${kotItemsFontSize}px;
                        --k-qty-size: ${kotQtyFontSize}px;
                        --k-token-size: ${kotTokenSize}px;
                        font-family: var(--k-font-family) !important;
                        font-size: var(--k-items-size) !important;
                    }
                    #${containerId}.kot-container-dynamic, #${containerId}.kot-container-dynamic * {
                        font-family: var(--k-font-family) !important;
                    }
                    ${fontWeightVal ? `
                    #${containerId}.receipt-container-dynamic, #${containerId}.receipt-container-dynamic * {
                        font-weight: ${fontWeightVal} !important;
                    }` : ''}
                    ${kotFontWeightVal ? `
                    #${containerId}.kot-container-dynamic, #${containerId}.kot-container-dynamic * {
                        font-weight: ${kotFontWeightVal} !important;
                    }` : ''}
                    * { color: #000 !important; border-color: #000 !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    img { max-width: 100% !important; display: block !important; margin: 0 auto !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `;

            const styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.textContent = printStyles;
            document.head.appendChild(styleSheet);

            const printContainer = document.createElement("div");
            printContainer.id = containerId;
            printContainer.className = isKotType
                ? "kot kot-container kot-container-dynamic text-black bg-white"
                : "receipt receipt-container receipt-container-dynamic text-black bg-white";
            printContainer.innerHTML = printHTML;

            // Add physical bottom spacer for thermal feeds past cutter to prevent jamming
            const spacer = document.createElement("div");
            spacer.style.height = paperBottomPadding;
            spacer.style.minHeight = paperBottomPadding;
            spacer.style.display = "block";
            spacer.style.clear = "both";
            printContainer.appendChild(spacer);

            document.body.appendChild(printContainer);

            // Dynamic Image Preloader: Ensure all images are loaded, but NEVER block for more than 800ms
            const images = Array.from(printContainer.querySelectorAll("img"));
            const imagePromises = images.map((img) => {
                if (img.complete && img.naturalWidth > 0) {
                    if (typeof img.decode === "function") {
                        return img.decode().catch(() => {});
                    }
                    return Promise.resolve();
                }
                return new Promise<void>((resolve) => {
                    img.onload = () => {
                        if (typeof img.decode === "function") {
                            img.decode().then(resolve).catch(resolve);
                        } else {
                            resolve();
                        }
                    };
                    img.onerror = () => resolve(); // continue even if an image fails
                });
            });

            Promise.race([
                Promise.all(imagePromises),
                new Promise((resolve) => setTimeout(resolve, 800)) // Force continue after 800ms to prevent hanging!
            ]).then(() => {
                setTimeout(() => {
                    window.print();

                    // Cleanup significantly delayed to ensure slow spoolers finish reading the DOM
                    setTimeout(() => {
                        if (document.head.contains(styleSheet)) document.head.removeChild(styleSheet);
                        if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
                    }, 2500);
                }, 50); // slight UI buffer
            });

            // 🔥 Post-Print Updates
            if (targetOrder && type !== "MANUAL_COMBINE") {
                const targetId = (targetOrder as any).id.includes("Combined") ? customOrder?.id || printOrder?.id : targetOrder.id;
                const body: any = { orderId: targetId };
                const autoBoth = isBill && business?.enableKOTWithBill && (type as string) !== "MANUAL_COMBINE" && (type as string) !== "COMBINED_BILL";

                if (type === "KOT" || autoBoth) {
                    body.isKotPrinted = true;
                    if (targetOrder.items) body.items = targetOrder.items.map((it: any) => ({ ...it, isNew: false }));
                    if (targetOrder.status === "PENDING" || targetOrder.status === "ACCEPTED") body.status = "PREPARING";
                }
                if (isBill || autoBoth) {
                    body.isBillPrinted = true;
                    if (targetOrder.status === "READY") body.status = "COMPLETED";
                }

                if (targetId && !targetId.startsWith("temp-") && targetId.length === 24) {
                    fetch("/api/orders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    }).then(() => {
                        setOrders(prev => prev.map(o => o.id === (body.orderId || targetOrder.id) ? { ...o, ...body } : o));
                        emitUpdate();
                        if (body.status === "COMPLETED") handleCheckout(body.orderId || targetOrder.id, true);
                    });
                } else {
                    setOrders(prev => prev.map(o => o.id === (body.orderId || targetOrder.id) ? { ...o, ...body } : o));
                }
            }

            if (type === "BILL" && business?.enableKOTWithBill) {
                const ps = (business as any)?.printSettings || {};
                const delay = ps.spoolerDelay !== undefined && ps.spoolerDelay !== null ? Number(ps.spoolerDelay) : 2500;
                setTimeout(() => {
                    handlePrint("KOT", targetOrder, targetTable);
                }, delay);
            }
        };
        setTimeout(checkAndPrint, 50);
    };

    const handleSaveAction = async (type: "KOT" | "BILL", order: Order) => {
        kravy.click();
        const body: any = { orderId: order.id };
        if (type === "KOT") {
            body.isKotPrinted = true;
            if (order.status === "PENDING" || order.status === "ACCEPTED") body.status = "PREPARING";
        } else {
            body.isBillPrinted = true;
            if (order.status === "READY") body.status = "COMPLETED";
        }

        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success(`Order ${type} Saved & Updated`);
                // ✅ Local update
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...body } : o));
                emitUpdate();

                if (body.status === "COMPLETED") {
                    await handleCheckout(order.id, true);
                }
            }
        } catch (err) {
            toast.error("Failed to save action");
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleUpdateItemQty = async (orderId: string, itemIndex: number, newQty: number) => {
        if (newQty < 1) return;
        const currentOrders = ordersRef.current.length > 0 ? ordersRef.current : orders;
        const order = currentOrders.find(o => o.id === orderId);
        if (!order || !order.items[itemIndex]) return;

        const newItems = [...order.items];
        newItems[itemIndex] = { ...newItems[itemIndex], quantity: newQty };

        // Recalculate totals using standard calculateOrderTotals function
        const { total: calculatedTotal } = calculateOrderTotals(newItems, isTaxEnabled, globalRate, perProductEnabled, business);
        const finalTotal = Number(calculatedTotal.toFixed(2));

        // Optimistic Local update immediately using latest ref to prevent UI lag on rapid clicks
        const updatedOrders = (ordersRef.current.length > 0 ? ordersRef.current : orders).map(o =>
            o.id === orderId ? { ...o, items: newItems, total: finalTotal } : o
        );
        ordersRef.current = updatedOrders;
        setOrders(updatedOrders);

        // Serialize API requests per order to prevent out-of-order race conditions
        const prevPromise = orderUpdateQueuesRef.current[orderId] || Promise.resolve();
        const nextPromise = prevPromise
            .catch(() => {}) // never break the queue on error
            .then(async () => {
                // Check latest items in ordersRef before dispatching to always persist latest write
                const latestOrder = ordersRef.current.find(o => o.id === orderId);
                const itemsToPersist = latestOrder ? latestOrder.items : newItems;
                const totalToPersist = latestOrder ? latestOrder.total : finalTotal;

                const res = await fetch("/api/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId,
                        items: itemsToPersist,
                        total: totalToPersist
                    })
                });

                if (res.ok) {
                    emitUpdate();
                } else {
                    toast.error("Failed to update quantity");
                    fetchData(false, true);
                }
            })
            .catch((err) => {
                console.error("Order quantity update error:", err);
                toast.error("Failed to update quantity");
                fetchData(false, true);
            });

        orderUpdateQueuesRef.current[orderId] = nextPromise;
    };

    const handleRemoveItem = async (orderId: string, itemIndex: number) => {
        const currentOrders = ordersRef.current.length > 0 ? ordersRef.current : orders;
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;

        if (order.items.length === 1) {
            if (await confirm("This is the last item. Delete the whole order?")) {
                const updatedOrders = (ordersRef.current.length > 0 ? ordersRef.current : orders).filter(o => o.id !== orderId);
                ordersRef.current = updatedOrders;
                setOrders(updatedOrders);

                try {
                    const res = await fetch("/api/orders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId, isDeleted: true })
                    });
                    if (res.ok) {
                        emitUpdate();
                    } else {
                        toast.error("Failed to delete order");
                        fetchData(false, true);
                    }
                } catch (err) {
                    console.error("Order deletion error:", err);
                    toast.error("Failed to delete order");
                    fetchData(false, true);
                }
            }
            return;
        }

        const newItems = order.items.filter((_, idx) => idx !== itemIndex);
        const { total: calculatedTotal } = calculateOrderTotals(newItems, isTaxEnabled, globalRate, perProductEnabled, business);
        const finalTotal = Number(calculatedTotal.toFixed(2));

        const updatedOrders = (ordersRef.current.length > 0 ? ordersRef.current : orders).map(o =>
            o.id === orderId ? { ...o, items: newItems, total: finalTotal } : o
        );
        ordersRef.current = updatedOrders;
        setOrders(updatedOrders);

        // Serialize through the same per-order queue so removals and quantity clicks don't conflict
        const prevPromise = orderUpdateQueuesRef.current[orderId] || Promise.resolve();
        const nextPromise = prevPromise
            .catch(() => {})
            .then(async () => {
                const res = await fetch("/api/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId,
                        items: newItems,
                        total: finalTotal
                    })
                });
                if (res.ok) {
                    toast.success("Item removed");
                    emitUpdate();
                } else {
                    toast.error("Failed to remove item");
                    fetchData(false, true);
                }
            })
            .catch((err) => {
                console.error("Remove item error:", err);
                toast.error("Failed to remove item");
                fetchData(false, true);
            });

        orderUpdateQueuesRef.current[orderId] = nextPromise;
    };

    const handleToggleItemPrepared = async (orderId: string, itemIndex: number) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const targetItem = order.items[itemIndex];
        if (!targetItem) return;

        kravy.click();
        const willBePrepared = !targetItem.isPrepared;
        const newItems = order.items.map((it: any, idx: number) => {
            if (idx === itemIndex) {
                return {
                    ...it,
                    isPrepared: willBePrepared,
                    preparedAt: willBePrepared ? new Date().toISOString() : undefined
                };
            }
            return it;
        });

        const allPrepared = newItems.every((it: any) => it.isPrepared);
        const newStatus: Order["status"] = allPrepared ? "READY" : "PREPARING";

        // ✅ Optimistic Local update in TerminalContext
        setOrders(prev => prev.map(o => o.id === orderId ? {
            ...o,
            items: newItems,
            status: newStatus,
            updatedAt: new Date().toISOString()
        } : o));

        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId,
                    items: newItems,
                    status: newStatus
                })
            });
            if (res.ok) {
                toast.success(willBePrepared ? `Marked "${targetItem.name}" as READY! 🔔` : `Marked "${targetItem.name}" as COOKING 👨‍🍳`);
                if (socket && isConnected) {
                    socket.emit("kds_order_event", {
                        businessId: business?.id || business?.userId,
                        type: "ITEM_PREPARED_UPDATE",
                        orderId,
                        status: newStatus,
                        items: newItems
                    });
                }
                emitUpdate();
            }
        } catch (err) {
            toast.error("Failed to update item status");
            fetchData(false, true);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const orderId = active.id as string;
        const newStatus = over.id as Order["status"];
        const order = orders.find(o => o.id === orderId);

        if (order && order.status !== newStatus) {
            updateOrderStatus(orderId, newStatus);
        }
    };

    // fetchData is now provided by TerminalContext
    // fetchBusiness is now managed by TerminalContext

    useEffect(() => {
        if (activeTab === "payment" && activeOrderForSelected?.customerPhone) {
            const fetchParty = async () => {
                try {
                    const res = await fetch(`/api/parties?phone=${activeOrderForSelected.customerPhone}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            setSelectedParty(data[0]);
                            setUseLoyaltyDiscount(false); // Reset toggle when customer changes
                        } else {
                            setSelectedParty(null);
                            setUseLoyaltyDiscount(false);
                        }
                    }
                } catch (err) {
                    console.error("Party fetch failed", err);
                }
            };
            fetchParty();
        } else if (activeTab !== "payment") {
            setSelectedParty(null);
        }
    }, [activeTab, activeOrderForSelected?.customerPhone]);

    // ✅ PRE-FILL QR CHARGES INTO POS
    useEffect(() => {
        if (activeOrderForSelected) {
            if ((activeOrderForSelected as any).deliveryCharges > 0) {
                setDeliveryChargeType("FLAT");
                setManualDeliveryCharge(String((activeOrderForSelected as any).deliveryCharges));
            } else {
                setManualDeliveryCharge("");
            }
            if ((activeOrderForSelected as any).packagingCharges > 0) {
                setPackagingChargeType("FLAT");
                setManualPackagingCharge(String((activeOrderForSelected as any).packagingCharges));
            } else {
                setManualPackagingCharge("");
            }
        } else {
            setManualDeliveryCharge("");
            setManualPackagingCharge("");
        }
    }, [activeOrderForSelected?.id]);

    // Polling is now managed by TerminalContext
    useEffect(() => {
        const tick = async () => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
    }, []);
    useEffect(() => {
        setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
        // Permission check for Staff
        if (userRole === "STAFF") {
            if (newStatus === "READY" && !userPermissions.includes("kit-complete-order")) {
                toast.error("Permission Denied: Cannot mark order as ready.");
                return;
            }
            if (newStatus === "COMPLETED" && !userPermissions.includes("kit-complete-order")) {
                toast.error("Permission Denied: Cannot complete order.");
                return;
            }
        }

        try {
            // ✅ Sound on Interaction
            kravy.click();
            setUpdatingOrders(prev => new Set(prev).add(orderId));

            if (orderId && !orderId.startsWith("temp-") && orderId.length === 24) {
                const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: newStatus }) });
                if (!res.ok) throw new Error("Update failed");
            }

            if (newStatus === "ACCEPTED") {
                kravy.orderAccept();
                toast.success("Order Accepted 🧑‍🍳");
            } else if (newStatus === "PREPARING") {
                kravy.orderAccept();
                toast.success("Cooking Started 🔥");
            } else if (newStatus === "READY") {
                kravy.orderReady();
                toast.success("Order Ready! 🛎️");
            } else if (newStatus === "COMPLETED") {
                kravy.success();
                toast.success("Order Delivered! ✅");
            } else {
                kravy.success();
            }

            // ✅ Local update (Optimistic)
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            emitUpdate({ type: "ORDER_UPDATE" });
            emitUpdate({ type: "TABLE_UPDATE" });

            if (newStatus === "COMPLETED") {
                await handleCheckout(orderId, true);
            }
        } catch {
            kravy.error();
            toast.error("Update failed");
        } finally {
            setUpdatingOrders(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    const softDeleteOrder = async (orderId: string) => {
        if (!await confirm("Are you sure you want to delete this order? It will be removed from workflow but kept in records.")) return;
        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, isDeleted: true })
            });
            if (res.ok) {
                toast.success("Order removed from workflow");
                // ✅ Local update (Optimistic)
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isDeleted: true } : o));
            }
        } catch (err) {
            toast.error("Failed to delete order");
        }
    };

    const settlementBill = useMemo(() => {
        if (!activeOrderForSelected) return null;

        const isTaxEnabled = business?.taxEnabled === true;
        const globalRate = 0;
        const perProductEnabled = true;

        let grossSubtotal = 0;
        let totalInclusiveGst = 0;
        let totalExclusiveGst = 0;

        if (Array.isArray(activeOrderForSelected.items)) {
            activeOrderForSelected.items.forEach((it: any) => {
                const q = Number(it.quantity || it.qty || 0);
                const p = Number(it.price || it.rate || 0);
                const lineTotal = q * p;

                let rate = 0;
                if (isTaxEnabled) {
                    rate = perProductEnabled ? Number(it.gst || 0) : globalRate;
                }
                let isInclusive = it.taxStatus === "With Tax";

                grossSubtotal += lineTotal;
                if (isInclusive && rate > 0) {
                    const base = lineTotal / (1 + rate / 100);
                    totalInclusiveGst += (lineTotal - base);
                } else if (rate > 0) {
                    totalExclusiveGst += (lineTotal * rate / 100);
                }
            });
        }

        let dVal = Number(discountValue) || 0;
        let discountAmt = 0;
        if (discountType === "PERCENT") {
            discountAmt = (grossSubtotal * dVal) / 100;
        } else {
            discountAmt = dVal;
        }

        let loyaltyRedeemed = 0;
        if (useLoyaltyDiscount && selectedParty && selectedParty.loyaltyPoints >= (business?.loyaltyMinRedeem || 0)) {
            loyaltyRedeemed = selectedParty.loyaltyPoints;
            if (loyaltyRedeemed > (grossSubtotal - discountAmt)) {
                loyaltyRedeemed = grossSubtotal - discountAmt;
            }
        }

        const netSubtotal = grossSubtotal - discountAmt - loyaltyRedeemed;
        const discountRatio = grossSubtotal > 0 ? (netSubtotal / grossSubtotal) : 1;

        totalInclusiveGst *= discountRatio;
        totalExclusiveGst *= discountRatio;

        let totalCGST = totalExclusiveGst / 2;
        let totalSGST = totalExclusiveGst / 2;

        let deliveryCharge = 0;
        let packagingCharge = 0;

        if (typeof manualDeliveryCharge !== 'undefined' && manualDeliveryCharge) {
            deliveryCharge = deliveryChargeType === 'PERCENT' ? (netSubtotal * Number(manualDeliveryCharge)) / 100 : Number(manualDeliveryCharge);
        }
        if (typeof manualPackagingCharge !== 'undefined' && manualPackagingCharge) {
            packagingCharge = packagingChargeType === 'PERCENT' ? (netSubtotal * Number(manualPackagingCharge)) / 100 : Number(manualPackagingCharge);
        }

        const totalCharges = deliveryCharge + packagingCharge;
        const totalChargesGst = isTaxEnabled ? (totalCharges * globalRate) / 100 : 0;

        const unroundedTotal = netSubtotal + totalExclusiveGst + totalCharges + totalChargesGst;
        const finalTotal = Math.round(unroundedTotal);
        const roundOff = finalTotal - unroundedTotal;

        return {
            subtotal: grossSubtotal,
            discountAmt,
            loyaltyRedeemed,
            gstAmount: totalExclusiveGst + totalInclusiveGst,
            totalExclusiveGst,
            totalInclusiveGst,
            totalCGST,
            totalSGST,
            deliveryCharge,
            packagingCharge,
            totalCharges,
            totalChargesGst,
            total: finalTotal,
            roundOff,
            unroundedTotal,
            isTaxEnabled,
            perProductEnabled
        };
    }, [activeOrderForSelected, discountType, discountValue, isCgstEnabled, isSgstEnabled, globalRate, business, typeof manualDeliveryCharge !== 'undefined' ? manualDeliveryCharge : null, typeof deliveryChargeType !== 'undefined' ? deliveryChargeType : null, typeof manualPackagingCharge !== 'undefined' ? manualPackagingCharge : null, typeof packagingChargeType !== 'undefined' ? packagingChargeType : null, useLoyaltyDiscount, selectedParty]);

    const [isSettling, setIsSettling] = useState(false);

    const handleCheckout = async (targetOrderId: string, silent = false) => {
        if (isSettling) return;

        const order = orders.find(o => o.id === targetOrderId);
        if (!order) return;

        // Re-calculate with current settlement modifiers
        let orderSubtotal = 0;
        order.items.forEach(it => orderSubtotal += ((it.price || it.rate || 0) * (it.quantity || it.qty || 0)));
        let dVal = Number(discountValue) || 0;
        let discountAmt = discountType === "PERCENT" ? (orderSubtotal * dVal) / 100 : dVal;
        let loyaltyRedeemed = settlementBill?.loyaltyRedeemed || 0;

        let calcSubtotal = 0;
        let totalTax = 0;

        order.items.forEach((it) => {
            const qty = Number(it.quantity || it.qty || 0);
            const rate = Number(it.price || it.rate || 0);
            const gross = qty * rate;
            let itemRate = isTaxEnabled
                ? (it.gst !== undefined && it.gst !== null ? Number(it.gst) : (perProductEnabled ? 0 : globalRate))
                : 0;
            let isInclusive = isTaxEnabled && (it.taxStatus === "With Tax");

            if (isInclusive) {
                const base = gross / (1 + itemRate / 100);
                calcSubtotal += base;
                totalTax += (gross - base);
            } else {
                calcSubtotal += gross;
                totalTax += (gross * itemRate) / 100;
            }
        });

        const discountRatio = orderSubtotal > 0 ? Math.max(0, 1 - (discountAmt / orderSubtotal)) : 1;
        const finalTax = totalTax * discountRatio;

        let deliveryCharge = 0;
        let packagingCharge = 0;
        if (targetOrderId === activeOrderForSelected?.id && settlementBill) {
            deliveryCharge = settlementBill.deliveryCharge || 0;
            packagingCharge = settlementBill.packagingCharge || 0;
        }

        const totalCharges = deliveryCharge + packagingCharge;
        const totalChargesGst = isTaxEnabled ? (totalCharges * globalRate) / 100 : 0;

        let taxable = calcSubtotal - discountAmt - loyaltyRedeemed;
        let orderCgst = isCgstEnabled ? (finalTax + totalChargesGst) / 2 : 0;
        let orderSgst = isSgstEnabled ? (finalTax + totalChargesGst) / 2 : 0;
        let orderTotal = Math.round(taxable + finalTax + totalCharges + totalChargesGst);
        try {
            setIsSettling(true);
            if (payMethod === "wallet") {
                if (!selectedParty) {
                    toast.error("Please link a customer to use Wallet payment");
                    setIsSettling(false);
                    return;
                }
                if ((selectedParty.walletBalance || 0) < orderTotal) {
                    toast.error("Insufficient wallet balance");
                    setIsSettling(false);
                    return;
                }

                const walletRes = await fetch("/api/wallet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "payment",
                        partyId: selectedParty.id,
                        amount: orderTotal,
                        description: `Order #${targetOrderId.slice(-6).toUpperCase()}`
                    })
                });
                if (!walletRes.ok) throw new Error("Wallet payment failed");
                const walletData = await walletRes.json();
                setSelectedParty((prev: any) => ({ ...prev, walletBalance: walletData.balance }));
            }

            let finalPaymentMode = payMethod.toUpperCase();
            if (payMethod === "SPLIT") {
                const parts = [];
                if (Number(splitCash) > 0) parts.push(`Cash: ${splitCash}`);
                if (Number(splitUpi) > 0) parts.push(`UPI: ${splitUpi}`);
                if (Number(splitCard) > 0) parts.push(`Card: ${splitCard}`);
                if (Number(splitWallet) > 0) parts.push(`Wallet: ${splitWallet}`);
                finalPaymentMode = parts.length > 0 ? `Split (${parts.join(", ")})` : "Split";
            }

            const finalAmountPaid = amountPaid === "" ? orderTotal : Number(amountPaid);

            const derivedKotNumbers = (order.kotNumbers && order.kotNumbers.length > 0)
                ? order.kotNumbers
                : Array.from(new Set(
                    (order.items || [])
                        .map((it: any) => Number(it.kotNumber || it.tokenNumber))
                        .filter((kn: number) => !isNaN(kn) && kn > 0)
                )).sort((a: number, b: number) => a - b);

            const derivedTokenNumber = order.tokenNumber || (derivedKotNumbers.length > 0 ? derivedKotNumbers[derivedKotNumbers.length - 1] : null);

            const billData = {
                orderId: targetOrderId,
                items: order.items?.map(it => ({
                    id: it.itemId || it.id,
                    itemId: it.itemId || it.id,
                    name: it.name,
                    price: it.price || it.rate || 0,
                    quantity: it.quantity || it.qty || 0,
                    total: (it.price || it.rate || 0) * (it.quantity || it.qty || 0),
                    taxStatus: it.taxStatus || "Without Tax",
                    gst: isTaxEnabled ? ((perProductEnabled && it.gst !== undefined && it.gst !== null) ? it.gst : globalRate) : 0,
                    kotNumber: it.kotNumber || derivedTokenNumber || 1,
                    isCustomRate: it.isCustomRate || false
                })),
                subtotal: orderSubtotal,
                total: orderTotal,
                discountAmount: discountAmt,
                cgst: orderCgst,
                sgst: orderSgst,
                tax: finalTax,
                deliveryCharges: deliveryCharge,
                deliveryGst: isTaxEnabled ? (deliveryCharge * globalRate) / 100 : 0,
                packagingCharges: packagingCharge,
                packagingGst: isTaxEnabled ? (packagingCharge * globalRate) / 100 : 0,
                paymentMode: finalPaymentMode,
                paymentStatus: paymentStatus,
                customerName: order.customerName || "Walk-in",
                customerPhone: order.customerPhone || null,
                customerAddress: order.customerAddress || null,
                tableName: order.table?.name || "Counter",
                tokenNumber: derivedTokenNumber,
                kotNumbers: derivedKotNumbers,
                loyaltyPointsRedeemed: settlementBill?.loyaltyRedeemed || 0,
                amountPaid: finalAmountPaid,
                balanceDue: Math.max(0, orderTotal - finalAmountPaid),
                profileId: business?.id,
                source: "FloorManagement"
            };
            const res = await fetch("/api/bill-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData) });
            const data = await res.json();
            console.log("[CHECKOUT_DEBUG] Bill-Manager Response:", data);

            if (!res.ok) {
                toast.error(data.error || "Failed to save bill. Order was not closed.");
                setIsSettling(false);
                return null;
            }

            const savedBill = data.bill || data;

            // 🚀 RUN SECONDARY UPDATES IN BACKGROUND
            const promises = [];

            // Only update status if not already COMPLETED (to avoid loop) and if it's a real order ID (not a temporary one)
            if (order.status !== "COMPLETED" && !targetOrderId.startsWith("temp-") && targetOrderId.length > 10) {
                promises.push(
                    fetch("/api/orders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: targetOrderId, status: "COMPLETED", skipInventoryDeduction: true })
                    })
                );
            }

            // Free the table if it was occupied
            if (order.table && order.table.id && order.table.name !== "POS" && order.table.name !== "TAKEAWAY" && order.table.name !== "DELIVERY") {
                promises.push(
                    fetch(`/api/tables`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: order.table.id, isOccupied: false, currentOrderId: null })
                    })
                );
            }

            if (promises.length > 0) {
                try {
                    await Promise.all(promises);
                } catch (e) {
                    console.error("[CHECKOUT_DEBUG] Background updates failed:", e);
                }
            }
            fetchData(false, true);

            // 🔥 CRITICAL OPTIMIZATION: Turn off Processing indicator immediately 
            // after the critical bill-save transaction completes!
            setIsSettling(false);

            if (!silent) {
                kravy.payment();
                toast.success("Transaction Finalized! 💰");

                // 🔥 Optimistic Updates for Instant UI Reaction
                setOrders(prev => prev.filter(o => o.id !== targetOrderId));
                if (order.table && order.table.id) {
                    updateTableStatus(order.table.id, { isOccupied: false, activeOrderId: undefined, status: "FREE" });
                }

                // ✅ IMPORTANT: Switch tab BEFORE clearing selection to avoid render crash
                setActiveTab("dashboard");
                setSelectedTableId(null);
            }

            // Important: return the bill so the caller (like BillPreview) can use the real billNumber
            if (savedBill) {
                // Merge savedBill with order to keep tokenNumber & kotNumbers if savedBill doesn't have it
                const mergedBill = {
                    ...order,
                    ...savedBill,
                    kotNumbers: (savedBill.kotNumbers && savedBill.kotNumbers.length > 0) ? savedBill.kotNumbers : derivedKotNumbers,
                    tokenNumber: savedBill.tokenNumber || derivedTokenNumber,
                };
                console.log("[CHECKOUT_DEBUG] Merged Bill with Token:", mergedBill.tokenNumber, "BillNumber:", mergedBill.billNumber);
                setPrintOrder(mergedBill as any);
                return mergedBill;
            }
            return null;
        } catch (error) {
            setIsSettling(false);
            if (!silent) {
                kravy.error();
                toast.error("Checkout failed");
            }
        }
    };


    const upiLink = business?.upi ? `upi://pay?pa=${business.upi}&pn=${encodeURIComponent(business.businessName || "Store")}&am=${grandTotal.toFixed(2)}&cu=INR` : "";
    const [qrUrl, setQrUrl] = useState<string>("");

    useEffect(() => {
        if (upiLink) {
            getQRCodeDataUrl(upiLink, { width: 220 }).then(setQrUrl);
        } else {
            setQrUrl("");
        }
    }, [upiLink]);
    const activeTablesSource = (isArrangeMode && arrangeTablesList.length > 0) ? arrangeTablesList : tablesList;

    const filteredTables = useMemo(() => {
        return activeTablesSource
            .filter(t => {
                const searchLower = tableSearch.toLowerCase();
                const matchSearch = (() => {
                    if (!searchLower) return true;
                    if (t.name.toLowerCase().includes(searchLower)) return true;
                    const tableOrders = orders.filter(o => ((o.tableId === t.id) || (o.table?.id === t.id)) && o.status !== "COMPLETED" && !o.isDeleted);
                    return tableOrders.some(o =>
                        o.id.toLowerCase().includes(searchLower) ||
                        (o.customerName && o.customerName.toLowerCase().includes(searchLower)) ||
                        (o.zoneName && o.zoneName.toLowerCase().includes(searchLower)) ||
                        (o.notes && o.notes.toLowerCase().includes(searchLower))
                    );
                })();
                const matchFilter = (() => {
                    if (tableFilter === "ALL") return true;
                    if (tableFilter === "FREE") return !t.status || t.status === "FREE";
                    if (tableFilter === "RUNNING") return t.status === "PREPARING" || t.status === "ACCEPTED" || t.status === "PENDING";
                    if (tableFilter === "READY") return t.status === "READY";
                    return true;
                })();
                const tableFloorOrZone = (t.floor || t.zone || "");
                const matchZone = activeZone === "ALL" || (tableFloorOrZone ? tableFloorOrZone.trim().toUpperCase() === activeZone.toUpperCase() : false);
                return matchSearch && matchFilter && matchZone;
            })
            .sort((a, b) => {
                if (isArrangeMode) return 0; // Preserve exact arranged sequence during arrange mode
                if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
                if (a.sortOrder != null) return -1;
                if (b.sortOrder != null) return 1;
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            });
    }, [activeTablesSource, tableSearch, tableFilter, activeZone, orders, isArrangeMode]);

    const availableZones = useMemo(() => {
        const zones = new Set<string>();
        tablesList.forEach(t => {
            const val = (t.floor || t.zone);
            if (val) {
                const normalized = val.trim();
                if (normalized && normalized.toUpperCase() !== "DEFAULT" && normalized.toUpperCase() !== "ALL") {
                    zones.add(normalized);
                }
            }
        });
        return Array.from(zones).sort();
    }, [tablesList]);

    // Distinct list of floors for select dropdowns
    const allFloorsList = useMemo(() => {
        const set = new Set<string>(["Floor 1", "Ground Floor"]);
        fetchedFloors.forEach(f => f && set.add(f.trim()));
        tablesList.forEach(t => {
            if (t.floor && t.floor.trim()) set.add(t.floor.trim());
        });
        return Array.from(set).sort();
    }, [fetchedFloors, tablesList]);

    // Distinct list of zones for select dropdowns
    const allZonesList = useMemo(() => {
        const set = new Set<string>(["Default", "AC", "Non-AC", "Rooftop", "Garden"]);
        tablesList.forEach(t => {
            if (t.zone && t.zone.trim()) set.add(t.zone.trim());
        });
        return Array.from(set).sort();
    }, [tablesList]);

    const stats = {
        running: orders.filter(o => o.status === "PREPARING" && !o.isDeleted).length,
        pending: orders.filter(o => (o.status === "PENDING" || o.status === "ACCEPTED") && !o.isDeleted).length, // Total active queue
        incoming: orders.filter(o => o.status === "PENDING" && !o.isDeleted).length, // Just new ones
        ready: orders.filter(o => o.status === "READY" && !o.isDeleted).length,
        sales: orders.filter(o => o.status === "COMPLETED" && !o.isDeleted).reduce((s, o) => s + o.total, 0)
    };

    const statusConfig = {
        FREE: {
            bg: "bg-[#F1F5F9] dark:bg-slate-900/90",
            border: "border border-[#E2E8F0] dark:border-slate-800",
            text: "text-[#0F172A] dark:text-white",
            dot: "bg-slate-300 dark:bg-slate-600",
            priceColor: "text-[#0F172A] dark:text-slate-100",
            timerColor: "!text-[#64748B] dark:!text-slate-400",
            glow: "shadow-2xs",
            label: "Available"
        },
        READY: {
            bg: "bg-[#DCFCE7] dark:bg-emerald-950/70",
            border: "border-2 border-[#10B981] dark:border-emerald-500",
            text: "text-[#065F46] dark:text-emerald-100",
            dot: "bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse",
            priceColor: "text-[#065F46] dark:text-emerald-200",
            timerColor: "!text-[#047857] dark:!text-emerald-300",
            glow: "shadow-md shadow-emerald-500/25",
            label: "Ready to Serve"
        },
        PREPARING: {
            bg: "bg-[#FFF7D6] dark:bg-amber-950/40",
            border: "border border-[#F59E0B] dark:border-amber-500/80",
            text: "text-[#0F172A] dark:text-white",
            dot: "bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
            priceColor: "text-[#0F172A] dark:text-amber-100",
            timerColor: "!text-[#64748B] dark:!text-amber-300",
            glow: "shadow-2xs",
            label: "Cooking"
        },
        ACCEPTED: {
            bg: "bg-[#FFF7D6] dark:bg-amber-950/40",
            border: "border border-[#F59E0B] dark:border-amber-500/80",
            text: "text-[#0F172A] dark:text-white",
            dot: "bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
            priceColor: "text-[#0F172A] dark:text-amber-100",
            timerColor: "!text-[#64748B] dark:!text-amber-300",
            glow: "shadow-2xs",
            label: "Accepted"
        },
        PENDING: {
            bg: "bg-[#FFF7D6] dark:bg-amber-950/40",
            border: "border border-[#F59E0B] dark:border-amber-500/80",
            text: "text-[#0F172A] dark:text-white",
            dot: "bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
            priceColor: "text-[#0F172A] dark:text-amber-100",
            timerColor: "!text-[#64748B] dark:!text-amber-300",
            glow: "shadow-2xs",
            label: "Reserved"
        }
    };

    // Helper: Aggregate items for Chef
    const productionSummary = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.filter(o => (o.status === "PENDING" || o.status === "PREPARING") && !o.isDeleted).forEach(o => {
            if (Array.isArray(o.items)) {
                o.items.forEach(it => {
                    counts[it.name] = (counts[it.name] || 0) + it.quantity;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [orders]);

    const getOrderAge = (createdAt: string) => {
        const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        if (diff < 5) return { color: "text-emerald-500", label: "Fresh" };
        if (diff < 15) return { color: "text-amber-500", label: "Warning" };
        return { color: "text-rose-500", label: "Delayed", alert: true };
    };

    return (
        <div
            className={`flex flex-col h-[100dvh] min-h-0 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-indigo-50/20 to-slate-100 dark:from-[#0B1B48] dark:via-[#081028] dark:to-slate-950 transition-colors duration-500 relative`}
        >
            {/* ═══ COMBINATION SELECTION MODAL (MOVED TO TOP) ═══ */}
            <AnimatePresence>
                {showCombineModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={async () => {
                                console.log("[CI] Closing Modal via Backdrop");
                                setShowCombineModal(false);
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-[500px] h-[80vh] flex flex-col rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Merge Pipelines</h3>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Select orders to combine</p>
                                </div>
                                <button onClick={async () => setShowCombineModal(false)} className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {orders.filter(o => o.status !== "COMPLETED" && !o.isDeleted).map(o => (
                                    <button
                                        key={o.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setCombineSelection(prev => {
                                                const next = new Set(prev);
                                                if (next.has(o.id)) next.delete(o.id);
                                                else next.add(o.id);
                                                return next;
                                            });
                                        }}
                                        className={`w-full p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left ${combineSelection.has(o.id) ? "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-600 shadow-lg shadow-indigo-600/10 -translate-y-1" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${combineSelection.has(o.id) ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                            {o.table?.name}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none mb-1">ID: #{o.id.slice(-6).toUpperCase()}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{o.items.length} items</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span className="text-[10px] font-black text-emerald-500 italic">{sym}{o.total}</span>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${combineSelection.has(o.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 dark:border-slate-700"}`}>
                                            {combineSelection.has(o.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    </button>
                                ))}

                                {orders.filter(o => o.status !== "COMPLETED" && !o.isDeleted).length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center">
                                        <Layers size={48} strokeWidth={1} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6">No Active orders to merge</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    disabled={combineSelection.size < 2}
                                    onClick={async () => {
                                        setShowCombineModal(false);
                                        handlePrint("MANUAL_COMBINE");
                                    }}
                                    className={`w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${combineSelection.size >= 2 ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/20 active:scale-95 translate-y-0" : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed translate-y-2 opacity-50"}`}
                                >
                                    <Printer size={18} /> Combine & Print {combineSelection.size > 0 && `(${combineSelection.size})`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* ── HEADER ── */}
            <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-6 min-h-[60px] lg:h-[60px] shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/40 dark:border-slate-800/40 shadow-lg z-[50] py-2 lg:py-0 gap-4 lg:gap-6 transition-colors duration-300">
                {/* Brand & Navigation */}
                <div className="flex items-center justify-start w-full lg:w-auto gap-4 lg:gap-8">
                    <div className="flex items-center gap-4">
                        {/* SIDEBAR TOGGLE BUTTON */}
                        <button
                            type="button"
                            onClick={() => {
                                try { kravy.click(); } catch {}
                                window.dispatchEvent(new CustomEvent("kravy-toggle-sidebar"));
                            }}
                            title="Open Menu"
                            aria-label="Toggle Sidebar"
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black shadow-md hover:scale-[1.02] active:scale-95 transition-all shrink-0 border border-slate-800 dark:border-slate-200"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="min-w-0 flex-1">
                            <div className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tighter truncate">Live Orders & <em className="text-indigo-600 dark:text-indigo-400 not-italic">Floor Terminal</em></div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest truncate">Main Branch v2.4</span>
                            </div>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        {[
                            { key: "dashboard", label: "Terminal", icon: TerminalIcon },
                            { key: "payment", label: "Cashier", icon: CreditCard },
                        ].map(t => {
                            const isActive = activeTab === t.key;
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.key}
                                    onClick={async () => { kravy.click(); setActiveTab(t.key as TabKey); }}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                                >
                                    <Icon size={12} />
                                    <span>{t.label}</span>
                                    {isActive && <motion.div layoutId="nav-ind" className="absolute -bottom-[20px] left-3 right-3 h-0.5 bg-slate-900 dark:bg-white rounded-t-full shadow-[0_-4px_10px_rgba(0,0,0,0.1)]" />}
                                </button>
                            );
                        })}
                    </nav>
                </div>


                {/* Right Controls */}
                <div className="hidden lg:flex items-center gap-3">
                    <FullScreenToggle variant="pill" showLabel={true} />
                    <button
                        onClick={async () => {
                            kravy.click();
                            router.push("/dashboard/billing/checkout?returnTo=/dashboard/terminal");
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all border border-white/10"
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span>Quick Bill</span>
                    </button>
                </div>
            </header>

            {/* ═══ MAIN ═══ */}
            <main className="flex-1 min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* ── TERMINAL TAB ── */}
                    {activeTab === "dashboard" && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col md:flex-row h-full min-h-0 gap-3 p-3 overflow-hidden"
                        >

                            {/* TABLES PANEL - ALWAYS FULL VIEW (FinTech / Modern SaaS Redesign) */}
                            <div
                                className="bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-[24px] shadow-sm w-full flex-1 flex flex-col h-full min-h-0 font-['Plus_Jakarta_Sans',sans-serif]"
                            >
                                {/* Panel Header */}
                                <div className="p-3.5 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300 shrink-0 relative z-30">
                                    {/* Arrange Mode Live Banner */}
                                    {isArrangeMode && (
                                        <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-[#635BFF] dark:text-indigo-300">
                                            <div className="flex items-center gap-2 text-[11px] font-[700] uppercase tracking-wider">
                                                <span className="w-2 h-2 rounded-full bg-[#635BFF] animate-ping" />
                                                Drag cards to reorder
                                            </div>
                                            <button
                                                onClick={handleResetArrangement}
                                                disabled={isSavingArrangement}
                                                className="text-[10px] font-[600] underline hover:text-[#F43F5E] text-[#64748B] transition-colors"
                                            >
                                                Reset to Default
                                            </button>
                                        </div>
                                    )}

                                    {/* Compact Controls: Search Input + Status Filter + Floor Filter + Dining Actions (3-dot) */}
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            {/* Search Input (13px, weight 500) */}
                                            <div className="relative flex-1">
                                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                                                <input
                                                    type="text"
                                                    placeholder="Search station, counter, spot or table..."
                                                    className="w-full h-10 pl-9 pr-8 bg-white dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl text-[13px] font-[500] text-[#0F172A] dark:text-white placeholder:text-[#64748B] placeholder:text-[13px] placeholder:font-[500] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all shadow-2xs"
                                                    value={tableSearch}
                                                    onChange={e => setTableSearch(e.target.value)}
                                                />
                                                {tableSearch && (
                                                    <button
                                                        onClick={() => setTableSearch("")}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Floor Filter Dropdown (12px, weight 700) */}
                                            {availableZones.length > 0 && (
                                                <div className="relative">
                                                    <select
                                                        value={activeZone}
                                                        onChange={e => { kravy.click(); setActiveZone(e.target.value); }}
                                                        className={`h-10 px-2.5 sm:px-3 rounded-xl text-[12px] font-[700] border focus:outline-none cursor-pointer transition-all shadow-2xs ${activeZone !== "ALL"
                                                                ? "bg-[#635BFF] text-white border-[#635BFF]"
                                                                : "bg-white dark:bg-slate-800/90 border-[#E2E8F0] dark:border-slate-700/80 text-[#0F172A] dark:text-slate-200 focus:border-[#635BFF]"
                                                            }`}
                                                        title="Filter by Floor"
                                                    >
                                                        <option value="ALL" className="bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white">All Floors</option>
                                                        {availableZones.map(z => (
                                                            <option key={z} value={z} className="bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white">{z}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Actions: Arrange Save/Cancel or 3-Dot Dining Actions Menu */}
                                            {isArrangeMode ? (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={handleCancelArrangement}
                                                        disabled={isSavingArrangement}
                                                        className="px-2.5 h-10 bg-white dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-[11px] sm:text-[12px] font-[700] uppercase tracking-wider transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveArrangement}
                                                        disabled={isSavingArrangement}
                                                        className="px-3 h-10 bg-[#635BFF] hover:bg-[#5249e0] text-white rounded-xl text-[11px] sm:text-[12px] font-[700] uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                                    >
                                                        {isSavingArrangement ? (
                                                            <RefreshCw size={12} className="animate-spin" />
                                                        ) : (
                                                            <Check size={12} strokeWidth={2.8} />
                                                        )}
                                                        Save
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative shrink-0" ref={diningHeaderMenuRef}>
                                                    <button
                                                        onClick={() => {
                                                            kravy.click();
                                                            setIsDiningHeaderMenuOpen(prev => !prev);
                                                        }}
                                                        className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 shadow-2xs ${
                                                            isDiningHeaderMenuOpen
                                                                ? "bg-[#0F172A] text-white border-[#0F172A]"
                                                                : "bg-white dark:bg-slate-800 text-[#64748B] border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                                                        }`}
                                                        title="Floor & Station Actions"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {isDiningHeaderMenuOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-[9999] backdrop-blur-xl"
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        kravy.click();
                                                                        setIsDiningHeaderMenuOpen(false);
                                                                        setIsMergeModalOpen(true);
                                                                    }}
                                                                    className="w-full p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all flex items-center gap-2.5 group"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-[#635BFF] flex items-center justify-center shrink-0">
                                                                        <GitMerge size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[12px] font-[700] text-[#0F172A] dark:text-white">Merge Tables</div>
                                                                        <div className="text-[10px] text-[#64748B]">Party Booking</div>
                                                                    </div>
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        kravy.click();
                                                                        setIsDiningHeaderMenuOpen(false);
                                                                        handleStartArrange();
                                                                    }}
                                                                    className="w-full p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all flex items-center gap-2.5 group"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 flex items-center justify-center shrink-0">
                                                                        <Move size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[12px] font-[700] text-[#0F172A] dark:text-white">Arrange Layout</div>
                                                                        <div className="text-[10px] text-[#64748B]">Reorder table cards</div>
                                                                    </div>
                                                                </button>

                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => {
                                                                        kravy.click();
                                                                        setIsDiningHeaderMenuOpen(false);
                                                                        setJsonModalData({
                                                                            title: "Terminal Tables Full Data (JSON)",
                                                                            json: {
                                                                                totalCount: tablesList.length,
                                                                                activeZone,
                                                                                availableZones,
                                                                                tables: tablesList
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="w-full p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all flex items-center gap-2.5 group border-t border-slate-100 dark:border-slate-800 mt-1"
                                                                >
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#64748B] flex items-center justify-center shrink-0">
                                                                        <Code2 size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[12px] font-[700] text-[#0F172A] dark:text-white">View JSON Data</div>
                                                                        <div className="text-[10px] text-[#64748B]">Admin developer tool</div>
                                                                    </div>
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                        </div>

                                        {/* Status Filter Chips with sliding animated pill highlight */}
                                        <div className="relative flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl overflow-x-auto no-scrollbar">
                                            {[
                                                { key: "ALL", label: "All", count: tablesList.length },
                                                { key: "FREE", label: "Free", count: tablesList.filter(t => !t.status || t.status === "FREE").length },
                                                { key: "RUNNING", label: "Busy", count: orders.filter(o => o.status === "PREPARING" && !o.isDeleted).length },
                                                { key: "READY", label: "Ready", count: orders.filter(o => o.status === "READY" && !o.isDeleted).length },
                                            ].map((chip) => {
                                                const isSelected = tableFilter === chip.key;
                                                return (
                                                    <button
                                                        key={chip.key}
                                                        type="button"
                                                        onClick={() => {
                                                            kravy.click();
                                                            setTableFilter(chip.key as any);
                                                        }}
                                                        className={`relative flex-1 min-w-[70px] sm:min-w-[80px] h-7.5 px-2.5 rounded-xl text-[11px] sm:text-[12px] font-[700] flex items-center justify-center gap-1.5 transition-colors z-10 ${
                                                            isSelected
                                                                ? "text-white"
                                                                : "text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <motion.div
                                                                layoutId="tableStatusChipActivePill"
                                                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                                                className="absolute inset-0 bg-[#635BFF] rounded-xl z-[-1] shadow-xs"
                                                            />
                                                        )}
                                                        <span>{chip.label}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                                                            isSelected
                                                                ? "bg-white/20 text-white"
                                                                : "bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300"
                                                        }`}>
                                                            {chip.count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Tables Grid Grouped By Floor */}
                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-2.5 sm:p-4 pb-20 sm:pb-10 scrollbar-hide bg-[#F8FAFC]/50 dark:bg-slate-950/50 space-y-4 sm:space-y-5">
                                    <DndContext
                                        sensors={dndSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEndTable}
                                    >
                                        {(() => {
                                            const grouped: Record<string, Table[]> = {};
                                            filteredTables.forEach(t => {
                                                const rawFloor = (t.floor && t.floor.trim()) ? t.floor.trim() : (t.zone && t.zone.trim() ? t.zone.trim() : "");
                                                const floorName = (rawFloor && rawFloor.toUpperCase() !== "DEFAULT" && rawFloor.toUpperCase() !== "ALL") ? rawFloor : "General Floor";
                                                if (!grouped[floorName]) grouped[floorName] = [];
                                                grouped[floorName].push(t);
                                            });

                                            const floorNames = Object.keys(grouped);

                                            if (isLoading && tablesList.length === 0) {
                                                return (
                                                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2.5 sm:gap-3">
                                                        {Array.from({ length: 12 }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="h-[90px] sm:h-[94px] rounded-[14px] border border-slate-200 dark:border-slate-800 table-skeleton-card"
                                                            />
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            if (filteredTables.length === 0) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center opacity-40 mt-16 text-center">
                                                        <TableIcon size={36} strokeWidth={1.2} className="text-[#64748B]" />
                                                        <p className="text-[12px] font-[700] uppercase tracking-wider text-[#64748B] mt-4">No Tables Found</p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <>
                                                    {floorNames.map((floorName) => {
                                                        const tablesInFloor = grouped[floorName];
                                                        const tableIdsInFloor = tablesInFloor.map(t => t.id);

                                                        return (
                                                            <div key={floorName} className="space-y-2.5">
                                                                {/* Floor Header Label (13px, weight 800) */}
                                                                <div className="flex items-center gap-2 px-1 pt-1">
                                                                    <div className="h-3.5 w-1.5 bg-[#635BFF] rounded-full" />
                                                                    <span className="text-[13px] font-[800] uppercase tracking-wider text-[#0F172A] dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
                                                                        {floorName}
                                                                    </span>
                                                                    <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-['Inter',sans-serif]">
                                                                        {tablesInFloor.length} {tablesInFloor.length === 1 ? "Table" : "Tables"}
                                                                    </span>
                                                                    <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-slate-800/80" />
                                                                </div>

                                                                {/* Table Grid for this Floor (6 columns on desktop, 3 columns on phone, 12px gap) */}
                                                                <SortableContext items={tableIdsInFloor} strategy={rectSortingStrategy}>
                                                                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2.5 sm:gap-3">
                                                                        {tablesInFloor.map((t, idx) => {
                                                                            const isActive = selectedTableId === t.id;
                                                                            const isTarget = Boolean(dragActiveTable && dragActiveTable.id !== t.id && (!t.status || t.status === "FREE"));
                                                                            const isHot = dragHotTableId === t.id;
                                                                            const isFlashing = flashTableId === t.id;
                                                                            const isLifted = dragActiveTable?.id === t.id;

                                                                            return (
                                                                                <div
                                                                                    key={t.id}
                                                                                    data-table-id={t.id}
                                                                                    className="relative"
                                                                                    style={{ animation: "rise 0.35s both", animationDelay: `${Math.min(idx * 25, 300)}ms` }}
                                                                                >
                                                                                    <SortableTableCard
                                                                                        table={t}
                                                                                        orders={orders}
                                                                                        statusConfig={statusConfig}
                                                                                        isActive={isActive}
                                                                                        isArrangeMode={isArrangeMode}
                                                                                        isDragTarget={isTarget}
                                                                                        isDragHot={isHot}
                                                                                        isFlash={isFlashing}
                                                                                        isLifted={isLifted}
                                                                                        onStartDragTransfer={handleStartDragTransfer}
                                                                                        onSelectTable={(tableId) => {
                                                                                            kravy.click();
                                                                                            // Check if this table has any active / running order
                                                                                            const runningOrders = orders.filter(
                                                                                                (o) =>
                                                                                                    ((o.tableId === t.id) || (o.table?.id === t.id)) &&
                                                                                                    o.status !== "COMPLETED" &&
                                                                                                    !o.isDeleted
                                                                                            );
                                                                                            const isOccupied =
                                                                                                runningOrders.length > 0 ||
                                                                                                (t.status && t.status !== "FREE") ||
                                                                                                Boolean(t.activeOrderId) ||
                                                                                                (t.activeCount ?? 0) > 0 ||
                                                                                                (Number(t.activeAmount) || 0) > 0;

                                                                                            if (isOccupied) {
                                                                                                // Running order exists: Open slide-over order panel
                                                                                                setSelectedTableId(tableId);
                                                                                                setSelectedOrderId(null);
                                                                                            } else {
                                                                                                // Empty / free table: Directly navigate to POS Menu / Billing
                                                                                                router.push(`/dashboard/billing/checkout?tableId=${t.id}&tableName=${encodeURIComponent(t.name)}&returnTo=/dashboard/terminal`);
                                                                                            }
                                                                                        }}
                                                                                        onEditTable={handleEditTable}
                                                                                        onLongPress={(tableToOpen) => {
                                                                                            kravy.click();
                                                                                            setSheetTable(tableToOpen);
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </SortableContext>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Quick Add Table Ghost Button (Disabled in Arrange Mode) */}
                                                    {!isArrangeMode && (
                                                        <div className="pt-1.5">
                                                            <motion.div
                                                                onClick={async () => { setEditingTable(null); setTableNameInput(""); setTableZoneInput(activeZone === "ALL" ? "" : activeZone); setIsTableModalOpen(true); kravy.click(); }}
                                                                className="relative group h-[44px] sm:h-[48px] w-full flex items-center justify-center gap-2 rounded-[14px] transition-all duration-200 cursor-pointer z-10 hover:-translate-y-0.5 border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 hover:border-[#635BFF]/60 bg-white/70 dark:bg-slate-900/40 hover:bg-indigo-50/30"
                                                            >
                                                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 transition-colors shadow-2xs">
                                                                    <Plus size={13} className="text-[#64748B] group-hover:text-[#635BFF] transition-colors" />
                                                                </div>
                                                                <span className="text-[11px] font-[700] uppercase tracking-wider text-[#64748B] group-hover:text-[#635BFF] font-['Plus_Jakarta_Sans',sans-serif]">Quick Add Table</span>
                                                            </motion.div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </DndContext>
                                </div>

                                {/* Stats Footer - Professional FinTech SaaS Stats Bar */}
                                <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] shrink-0 font-['Plus_Jakarta_Sans',sans-serif]">
                                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-0.5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-[700] text-[#64748B] uppercase tracking-wider">Preparing</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#635BFF] animate-pulse" />
                                                    <span className="text-sm font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif] tabular-nums">{stats.running}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-[700] text-[#64748B] uppercase tracking-wider">Ready</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-sm font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif] tabular-nums">{stats.ready}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-[700] text-[#64748B] uppercase tracking-wider">Queue</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                                    <span className="text-sm font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif] tabular-nums">{stats.pending}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-8 w-px bg-[#E2E8F0] dark:bg-slate-800 shrink-0" />
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] font-[700] text-[#64748B] uppercase tracking-wider">Sales Today</span>
                                            <span className="text-sm font-[800] text-[#635BFF] font-['Inter',sans-serif] tabular-nums">{sym}{stats.sales.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* OVERLAY SLIDE-OVER DRAWER (Opens over tables from the right side) */}
                            <AnimatePresence>
                                {selectedTable && (
                                    <>
                                        {/* Backdrop Dimmer (click outside to close) */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            onClick={() => {
                                                kravy.click();
                                                setSelectedTableId(null);
                                                setSelectedOrderId(null);
                                            }}
                                            className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[2px] z-[10000]"
                                        />

                                        {/* Slide-over Drawer Panel */}
                                        <motion.div
                                            key={selectedTable.id}
                                            initial={{ x: "100%", opacity: 0.5 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: "100%", opacity: 0 }}
                                            transition={isResizingDrawer ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 300 }}
                                            style={{
                                                width: isSmScreen ? `${drawerWidth}px` : "100%",
                                                maxWidth: "100vw",
                                            }}
                                            className="fixed top-0 right-0 bottom-0 z-[10001] h-[100dvh] max-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-[-25px_0_60px_rgba(0,0,0,0.25)] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]"
                                        >
                                            {/* ═══ VERTICAL DRAG RESIZE HANDLE ON LEFT EDGE (Chhoti si line in the middle) ═══ */}
                                            <div
                                                onMouseDown={startResizingDrawer}
                                                onTouchStart={startResizingDrawer}
                                                title="Drag to resize panel width"
                                                className="hidden sm:flex absolute -left-3 top-0 bottom-0 w-6 cursor-col-resize z-50 items-center justify-center group select-none"
                                            >
                                                {/* Left Edge Border line hover effect */}
                                                <div className={`absolute right-2.5 top-0 bottom-0 w-0.5 transition-colors pointer-events-none ${isResizingDrawer ? "bg-[#635BFF]" : "bg-transparent group-hover:bg-[#635BFF]/60"}`} />

                                                {/* Small Centered Line Handle Pill */}
                                                <div
                                                    className={`w-1.5 h-12 rounded-full transition-all duration-200 shadow-md flex items-center justify-center ${
                                                        isResizingDrawer
                                                            ? "bg-[#635BFF] scale-110 shadow-indigo-500/50"
                                                            : "bg-slate-300 dark:bg-slate-600 group-hover:bg-[#635BFF] group-hover:h-16 group-hover:w-2"
                                                    }`}
                                                >
                                                    {/* Subtle Grip dots inside the pill */}
                                                    <div className="flex flex-col gap-1 items-center justify-center pointer-events-none">
                                                        <div className="w-0.5 h-1 rounded-full bg-white/70" />
                                                        <div className="w-0.5 h-1 rounded-full bg-white/70" />
                                                        <div className="w-0.5 h-1 rounded-full bg-white/70" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-full min-h-0 flex flex-col relative z-10 overflow-hidden">
                                                {/* Order Header: Clean Modern FinTech Bar (Optimized for Mobile & Desktop) */}
                                                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 relative z-20">
                                                    {/* Mobile Top Row / Desktop Left Group */}
                                                    <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 min-w-0">
                                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                            {/* Mobile Back Button */}
                                                            <button
                                                                onClick={() => {
                                                                    if (typeof window !== "undefined" && window.history.state?.terminalTableDetail) {
                                                                        window.history.back();
                                                                    } else {
                                                                        setSelectedTableId(null);
                                                                        setSelectedOrderId(null);
                                                                    }
                                                                }}
                                                                className="lg:hidden w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-2xs shrink-0 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white active:scale-95 transition-all"
                                                            >
                                                                <ArrowLeft size={15} />
                                                            </button>

                                                            {/* 1. Table ID Avatar */}
                                                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] rounded-xl flex items-center justify-center font-[800] text-xs sm:text-sm shadow-sm shrink-0 font-['Plus_Jakarta_Sans',sans-serif]">
                                                                {selectedTable.name}
                                                            </div>

                                                            {/* 2. Customer Info Trigger */}
                                                            <div className="relative shrink-0" ref={customerPopoverRef}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        kravy.click();
                                                                        setIsCustomerPopoverOpen(prev => !prev);
                                                                    }}
                                                                    title="Customer Details"
                                                                    className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl flex items-center gap-1 transition-all text-xs font-[700] border ${
                                                                        isCustomerPopoverOpen
                                                                            ? "bg-[#635BFF] text-white border-[#635BFF] shadow-xs"
                                                                            : "bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-2xs"
                                                                    }`}
                                                                >
                                                                    <User size={12} className={isCustomerPopoverOpen ? "text-white" : "text-[#635BFF]"} />
                                                                    <span className="truncate max-w-[70px] sm:max-w-[95px] xl:max-w-[130px]">
                                                                        {activeOrderForSelected?.customerName || "Walk-in"}
                                                                    </span>
                                                                </button>

                                                                {/* Customer Details Popover */}
                                                                <AnimatePresence>
                                                                    {isCustomerPopoverOpen && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                            exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                                                            className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-[100] backdrop-blur-xl"
                                                                        >
                                                                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] flex items-center justify-center shrink-0">
                                                                                        <User size={13} />
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-[9px] font-[700] uppercase tracking-wider text-[#64748B] leading-none block">Customer Details</span>
                                                                                        <p className="text-xs font-[800] text-[#0F172A] dark:text-white leading-tight truncate max-w-[140px]">
                                                                                            {activeOrderForSelected?.customerName || "Walk-in Customer"}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setIsCustomerPopoverOpen(false)}
                                                                                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                                                >
                                                                                    <X size={13} />
                                                                                </button>
                                                                            </div>

                                                                            <div className="space-y-1.5 text-xs">
                                                                                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                                                    <span className="text-[10px] text-[#64748B] font-bold uppercase flex items-center gap-1">
                                                                                        <TableIcon size={10} /> Table
                                                                                    </span>
                                                                                    <span className="font-bold text-[#0F172A] dark:text-slate-200">
                                                                                        {selectedTable.name} {selectedTable.floor ? `· ${selectedTable.floor}` : ""}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                                                    <span className="text-[10px] text-[#64748B] font-bold uppercase flex items-center gap-1">
                                                                                        <Receipt size={10} /> Order #
                                                                                    </span>
                                                                                    <span className="font-bold text-[#0F172A] dark:text-slate-200">
                                                                                        {activeOrderForSelected?.orderNumber ? `#${activeOrderForSelected.orderNumber}` : (() => {
                                                                                            const curIdx = sortedTableOrders.findIndex(o => o.id === activeOrderForSelected?.id);
                                                                                            return curIdx >= 0 ? `Order #${curIdx + 1}` : `#${activeOrderForSelected?.id?.slice(-4).toUpperCase() || "1"}`;
                                                                                        })()}
                                                                                    </span>
                                                                                </div>

                                                                                {activeOrderForSelected?.customerPhone && (
                                                                                    <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                                                        <span className="text-[10px] text-[#64748B] font-bold uppercase flex items-center gap-1">
                                                                                            <Phone size={10} /> Phone
                                                                                        </span>
                                                                                        <span className="font-bold text-[#0F172A] dark:text-slate-200 font-['Inter',sans-serif]">
                                                                                            {activeOrderForSelected.customerPhone}
                                                                                        </span>
                                                                                    </div>
                                                                                )}

                                                                                {activeOrderForSelected?.notes && (
                                                                                    <div className="py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50">
                                                                                        <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase block mb-0.5">
                                                                                            Note
                                                                                        </span>
                                                                                        <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
                                                                                            {activeOrderForSelected.notes}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>

                                                        {/* Mobile Top-Right (Timer + Close Button) */}
                                                        <div className="flex items-center gap-1.5 sm:hidden">
                                                            {(activeOrderForSelected?.createdAt || selectedTable?.startTime) && (
                                                                <div className="h-8 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1 shrink-0 shadow-2xs">
                                                                    <Clock size={11} className="text-emerald-600 dark:text-emerald-400" />
                                                                    <TableTimer startTime={activeOrderForSelected?.createdAt || selectedTable.startTime} className="!bg-transparent !p-0 !border-none !text-[11px] !font-[700] !text-emerald-700 dark:!text-emerald-300 font-['Inter',sans-serif] tabular-nums" />
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    kravy.click();
                                                                    setSelectedTableId(null);
                                                                    setSelectedOrderId(null);
                                                                }}
                                                                title="Close Panel"
                                                                className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#64748B] hover:text-rose-600 transition-all flex items-center justify-center shadow-2xs active:scale-95 shrink-0"
                                                            >
                                                                <X size={15} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Middle Info (Timer + Items Count) - Auto-hide on narrow panel */}
                                                    <div className="hidden xl:flex items-center gap-1.5 shrink-0">
                                                        {(activeOrderForSelected?.createdAt || selectedTable?.startTime) && (
                                                            <div className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5 shrink-0 shadow-2xs">
                                                                <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                                <TableTimer startTime={activeOrderForSelected?.createdAt || selectedTable.startTime} className="!bg-transparent !p-0 !border-none !text-[11px] sm:!text-[12px] !font-[700] !text-emerald-700 dark:!text-emerald-300 font-['Inter',sans-serif] tabular-nums" />
                                                                <span className="text-[10px] font-[600] text-emerald-600/70 uppercase hidden 2xl:inline">
                                                                    ({new Date(activeOrderForSelected?.createdAt || selectedTable.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                                                </span>
                                                            </div>
                                                        )}

                                                        {activeOrderForSelected && (
                                                            <div className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0 shadow-2xs">
                                                                <span className="text-xs font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif]">
                                                                    {(activeOrderForSelected.items || []).length}
                                                                </span>
                                                                <span className="text-[9px] font-[700] text-[#64748B] uppercase">ITEMS</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons: Clean Row (Always visible with shrinking & responsive text) */}
                                                    <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto sm:ml-auto shrink-0">
                                                        <button
                                                            onClick={async () => {
                                                                kravy.click();
                                                                router.push(`/dashboard/billing/checkout?tableId=${selectedTable.id}&tableName=${encodeURIComponent(selectedTable.name)}&returnTo=/dashboard/terminal`);
                                                            }}
                                                            className="flex-1 sm:flex-none h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-[#635BFF] hover:bg-[#5249e0] text-white text-[10px] sm:text-[11px] font-[700] uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
                                                        >
                                                            <Plus size={13} strokeWidth={2.5} />
                                                            <span>New Order</span>
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                kravy.click();
                                                                if (activeOrderForSelected) {
                                                                    sessionStorage.setItem("quick_pos_handoff_order", JSON.stringify(activeOrderForSelected));
                                                                    router.push(`/dashboard/billing/checkout?orderId=${activeOrderForSelected.id}&tableId=${selectedTable.id}&tableName=${encodeURIComponent(selectedTable.name)}&returnTo=/dashboard/terminal`);
                                                                } else {
                                                                    toast.error("Please select a table/order first");
                                                                }
                                                            }}
                                                            className="flex-1 sm:flex-none h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[10px] sm:text-[11px] font-[700] uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition-all whitespace-nowrap shrink-0"
                                                        >
                                                            <Plus size={13} strokeWidth={2.5} />
                                                            <span>Add Item</span>
                                                        </button>

                                                        {/* Mobile items count pill */}
                                                        {activeOrderForSelected && (
                                                            <div className="sm:hidden h-8 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0F172A] dark:text-white border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0 text-[10px] font-[700]">
                                                                <span>{(activeOrderForSelected.items || []).length}</span>
                                                                <span className="text-[8px] text-[#64748B]">ITM</span>
                                                            </div>
                                                        )}

                                                        {/* Three-Dots Menu */}
                                                        <div className="relative shrink-0" ref={tableActionMenuRef}>
                                                            <button
                                                                onClick={() => {
                                                                    kravy.click();
                                                                    setIsTableActionMenuOpen((prev) => !prev);
                                                                }}
                                                                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 shadow-2xs relative ${
                                                                    isTableActionMenuOpen
                                                                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                                                                        : "bg-white dark:bg-slate-800 text-[#64748B] border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                                                }`}
                                                                title="Table Actions"
                                                            >
                                                                <MoreVertical size={14} />
                                                                {tableOrders.length > 1 && (
                                                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white">
                                                                        {tableOrders.length}
                                                                    </span>
                                                                )}
                                                            </button>

                                                            {/* Dropdown Menu */}
                                                            <AnimatePresence>
                                                                {isTableActionMenuOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                                        className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-[100] backdrop-blur-xl"
                                                                    >
                                                                        <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                                            <span className="text-[10px] font-[800] uppercase tracking-wider text-[#64748B]">
                                                                                Table Actions · {selectedTable.name}
                                                                            </span>
                                                                        </div>

                                                                        <button
                                                                            onClick={() => {
                                                                                kravy.click();
                                                                                setIsTableActionMenuOpen(false);
                                                                                setIsMergeModalOpen(true);
                                                                            }}
                                                                            className="w-full p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left transition-all flex items-center gap-3 group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#635BFF] flex items-center justify-center shrink-0">
                                                                                <GitMerge size={15} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-xs font-[800] text-[#0F172A] dark:text-white">Merge Tables</div>
                                                                                <p className="text-[10px] text-[#64748B] font-medium truncate">Party booking & combine tables</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => {
                                                                                kravy.click();
                                                                                setIsTableActionMenuOpen(false);
                                                                                if (!activeOrderForSelected) {
                                                                                    toast.error("No active running order on this table!");
                                                                                    return;
                                                                                }
                                                                                setIsTransferModalOpen(true);
                                                                            }}
                                                                            className="w-full p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-all flex items-center gap-3 group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-[#635BFF] flex items-center justify-center shrink-0">
                                                                                <ArrowRightLeft size={15} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-xs font-[800] text-[#0F172A] dark:text-white">Transfer Table</div>
                                                                                <p className="text-[10px] text-[#64748B] font-medium truncate">Shift order to another free table</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => {
                                                                                kravy.click();
                                                                                setIsTableActionMenuOpen(false);
                                                                                if (tableOrders.length < 2) {
                                                                                    toast.info(`This table has ${tableOrders.length} order. At least 2 active orders are required to merge.`);
                                                                                    return;
                                                                                }
                                                                                setIsMergeOrdersModalOpen(true);
                                                                            }}
                                                                            className="w-full p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-all flex items-center gap-3 group relative"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#10B981] flex items-center justify-center shrink-0">
                                                                                <Layers size={15} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-xs font-[800] text-[#0F172A] dark:text-white">Merge Orders</div>
                                                                                <p className="text-[10px] text-[#64748B] font-medium truncate">Combine multiple running orders</p>
                                                                            </div>
                                                                            {tableOrders.length > 1 && (
                                                                                <span className="px-1.5 py-0.5 rounded-md bg-[#10B981] text-white text-[9px] font-[700] uppercase">
                                                                                    {tableOrders.length}
                                                                                </span>
                                                                            )}
                                                                        </button>

                                                                        <button
                                                                            onClick={() => {
                                                                                kravy.click();
                                                                                setIsTableActionMenuOpen(false);
                                                                                if (selectedTable) {
                                                                                    handleEditTable(selectedTable);
                                                                                }
                                                                            }}
                                                                            className="w-full p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left transition-all flex items-center gap-3 group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                                                <Edit3 size={15} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-xs font-[800] text-[#0F172A] dark:text-white">Edit Table</div>
                                                                                <p className="text-[10px] text-[#64748B] font-medium truncate">Rename, change floor or zone</p>
                                                                            </div>
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        {/* Desktop Close Panel Button */}
                                                        <button
                                                            onClick={() => {
                                                                kravy.click();
                                                                setSelectedTableId(null);
                                                                setSelectedOrderId(null);
                                                            }}
                                                            title="Close Panel"
                                                            className="hidden sm:flex h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all items-center justify-center shadow-2xs active:scale-95 shrink-0"
                                                        >
                                                            <X size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Multi-Order Tabs (Segmented Clean Style) */}
                                                {selectedTable && sortedTableOrders.length > 1 && (
                                                    <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex gap-2 overflow-x-auto scrollbar-hide bg-slate-100/60 dark:bg-slate-900/60 shrink-0">
                                                        {sortedTableOrders.map((o, idx) => {
                                                            const isSelected = activeOrderForSelected?.id === o.id;
                                                            const orderNum = idx + 1;
                                                            const orderLabel = o.customerName 
                                                                ? `${o.customerName} · Order #${orderNum}` 
                                                                : `Order #${orderNum}`;

                                                            return (
                                                                <button
                                                                    key={o.id}
                                                                    onClick={async () => { kravy.click(); setSelectedOrderId(o.id); }}
                                                                    className={`shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-[700] uppercase tracking-wider transition-all flex items-center gap-2 ${
                                                                        isSelected 
                                                                            ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs dark:bg-white dark:text-[#0F172A]" 
                                                                            : "bg-white dark:bg-slate-800 text-[#64748B] border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                                                    }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-[800] ${
                                                                        isSelected 
                                                                            ? "bg-white/20 text-white dark:text-[#0F172A]" 
                                                                            : "bg-slate-100 dark:bg-slate-700 text-[#0F172A]"
                                                                    }`}>
                                                                        {orderNum}
                                                                    </div>
                                                                    <span>{orderLabel}</span>
                                                                    <TableTimer startTime={o.createdAt} className="!bg-transparent !p-0 !border-none !text-[10px] !font-[600] opacity-70 tabular-nums" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Scrollable Container (Items & Cards) */}
                                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin p-3 sm:p-5 space-y-3 sm:space-y-4">
                                                    {activeOrderForSelected ? (
                                                        <>
                                                            {/* Enterprise Workflow Stepper with Connected Bar */}
                                                            {(() => {
                                                                const totalOrderItems = (activeOrderForSelected?.items || []).filter((it: any) => it.kotNumber).length || (activeOrderForSelected?.items?.length || 0);
                                                                const preparedOrderItems = (activeOrderForSelected?.items || []).filter((it: any) => (it.isPrepared || activeOrderForSelected?.status === "READY") && it.kotNumber).length || (activeOrderForSelected?.items?.filter((it: any) => it.isPrepared)?.length || 0);
                                                                const isOrderReady = activeOrderForSelected?.status === "READY";
                                                                const isCooking = activeOrderForSelected?.status === "PREPARING" || isOrderReady;
                                                                const hasSomeReady = !isOrderReady && preparedOrderItems > 0;

                                                                const steps = [
                                                                    { key: "ACCEPTED", label: "Accepted", done: true },
                                                                    { key: "COOKING", label: "Cooking", done: isCooking },
                                                                    { 
                                                                        key: "READY", 
                                                                        label: isOrderReady ? "Ready to Serve" : hasSomeReady ? `Ready (${preparedOrderItems}/${totalOrderItems})` : "Ready", 
                                                                        done: isOrderReady, 
                                                                        partial: hasSomeReady 
                                                                    }
                                                                ];

                                                                return (
                                                                    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xs">
                                                                        <div className="flex items-center justify-between relative px-2 sm:px-4">
                                                                            {/* Connected Background Track */}
                                                                            <div className="absolute left-8 right-8 sm:left-10 sm:right-10 top-3 sm:top-3.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0">
                                                                                <div 
                                                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                                                    style={{ width: isOrderReady ? "100%" : isCooking ? "50%" : "0%" }}
                                                                                />
                                                                            </div>

                                                                            {steps.map((step, idx) => {
                                                                                const isStepDone = step.done;
                                                                                const isStepPartial = (step as any).partial;
                                                                                return (
                                                                                    <div key={step.key} className="flex flex-col items-center gap-1 sm:gap-1.5 relative z-10">
                                                                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-[800] transition-all duration-300 ${
                                                                                            isStepDone
                                                                                                ? "bg-emerald-600 text-white shadow-sm ring-3 sm:ring-4 ring-emerald-50 dark:ring-emerald-950/60"
                                                                                                : isStepPartial
                                                                                                ? "bg-amber-500 text-white shadow-sm ring-3 sm:ring-4 ring-amber-50 dark:ring-amber-950/60"
                                                                                                : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                                                                        }`}>
                                                                                            {isStepDone ? <Check size={12} strokeWidth={3} /> : isStepPartial ? `${preparedOrderItems}` : idx + 1}
                                                                                        </div>
                                                                                        <span className={`text-[9px] sm:text-[10px] font-[700] uppercase tracking-wider ${
                                                                                            isStepDone ? "text-emerald-700 dark:text-emerald-400" : isStepPartial ? "text-amber-700 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
                                                                                        }`}>
                                                                                            {step.label}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Order Breakdown Card */}
                                                            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 shadow-2xs space-y-3 sm:space-y-4">
                                                                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-3.5 sm:h-4 bg-[#635BFF] rounded-full" />
                                                                        <span className="text-[11px] sm:text-[12px] font-[800] uppercase tracking-wider text-[#0F172A] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                                                                            Order Breakdown
                                                                        </span>
                                                                        <span className="text-[10px] sm:text-[11px] font-[600] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748B] font-['Inter',sans-serif]">
                                                                            {(activeOrderForSelected.items || []).length} items
                                                                        </span>
                                                                    </div>
                                                                    {(() => {
                                                                        if (!activeOrderForSelected?.createdAt) return null;
                                                                        const orderMinutes = Math.floor((Date.now() - new Date(activeOrderForSelected.createdAt).getTime()) / 60000);
                                                                        if (orderMinutes >= 20) {
                                                                            return (
                                                                                <span className="text-[8.5px] sm:text-[9px] font-[700] uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-800/40 animate-pulse">
                                                                                    High Priority · {orderMinutes}m
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>

                                                                {(() => {
                                                                    const rounds = (activeOrderForSelected.items || []).reduce((acc: any, item: any, itemGlobalIndex: number) => {
                                                                        const r = item.kotNumber || "New Items";
                                                                        if (!acc[r]) acc[r] = [];
                                                                        acc[r].push({ ...item, itemGlobalIndex });
                                                                        return acc;
                                                                    }, {});

                                                                    const itemKotNumbers = Object.keys(rounds)
                                                                        .filter(k => k !== "New Items")
                                                                        .map(Number)
                                                                        .sort((a, b) => a - b);

                                                                    const sortedRounds = [
                                                                        ...itemKotNumbers.map((kn: number, i: number) => ({ id: kn, label: `Round ${i + 1} - KOT #${kn}`, items: rounds[kn] })),
                                                                        ...(rounds["New Items"] ? [{ id: "New Items", label: "🛒 Current Cart (Not Printed)", items: rounds["New Items"] }] : [])
                                                                    ].filter(r => r.items && r.items.length > 0);

                                                                    return sortedRounds.map((roundObj) => {
                                                                        const roundTotal = roundObj.items?.length || 0;
                                                                        const roundPrepared = roundObj.items?.filter((it: any) => it.isPrepared || activeOrderForSelected?.status === "READY").length || 0;
                                                                        const isRoundFullyReady = roundTotal > 0 && roundPrepared === roundTotal;
                                                                        const isCartRound = roundObj.id === "New Items";

                                                                        return (
                                                                            <div key={roundObj.id} className="space-y-2">
                                                                                {/* Round Banner */}
                                                                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                                                        <Receipt size={12} className="text-[#635BFF]" />
                                                                                        <span className="text-[10.5px] sm:text-[11px] font-[700] uppercase tracking-wider text-[#0F172A] dark:text-white">
                                                                                            {roundObj.label}
                                                                                        </span>
                                                                                    </div>
                                                                                    {!isCartRound && roundTotal > 0 && (
                                                                                        <span className={`text-[8.5px] sm:text-[9px] font-[700] px-2 py-0.5 rounded-full border ${
                                                                                            isRoundFullyReady
                                                                                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                                                                : roundPrepared > 0
                                                                                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                                                                                : "bg-slate-200/70 text-slate-700 border-slate-300"
                                                                                        }`}>
                                                                                            {isRoundFullyReady ? "ALL READY" : `${roundPrepared}/${roundTotal} READY`}
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Items List */}
                                                                                <div className="space-y-1.5 sm:space-y-2">
                                                                                    {roundObj.items?.map((item: any, idx: number) => {
                                                                                        const isPrepared = !!item.isPrepared || activeOrderForSelected?.status === "READY";
                                                                                        const isNonVeg = item.isVeg === false || item.name?.toUpperCase().includes("(NV)");
                                                                                        const itemRealIndex = item.itemGlobalIndex ?? activeOrderForSelected.items.indexOf(item);

                                                                                        return (
                                                                                            <motion.div
                                                                                                key={`${roundObj.id}-${idx}`}
                                                                                                initial={{ opacity: 0, y: 6 }}
                                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                                transition={{ delay: idx * 0.02 }}
                                                                                                className={`p-2 sm:p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 sm:gap-3 ${
                                                                                                    isPrepared
                                                                                                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                                                                                                        : "bg-slate-50/60 hover:bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60"
                                                                                                }`}
                                                                                            >
                                                                                                {/* Left: Food Type Marker & Name */}
                                                                                                <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                                                                                                    {/* Food Veg/Non-Veg Box */}
                                                                                                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs border flex items-center justify-center shrink-0 ${
                                                                                                        isNonVeg ? "border-rose-500" : "border-emerald-600"
                                                                                                    }`}>
                                                                                                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isNonVeg ? "bg-rose-500" : "bg-emerald-600"}`} />
                                                                                                    </div>

                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                                                                            <span className="text-[12px] sm:text-[13px] font-[700] text-[#0F172A] dark:text-white truncate font-['Plus_Jakarta_Sans',sans-serif]">
                                                                                                                {item.name}
                                                                                                            </span>

                                                                                                            {/* Status Badge */}
                                                                                                            {roundObj.id !== "New Items" ? (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handleToggleItemPrepared(activeOrderForSelected.id, itemRealIndex);
                                                                                                                    }}
                                                                                                                    className={`text-[8.5px] sm:text-[9px] font-[700] px-1.5 sm:px-2 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                                                                                                                        isPrepared
                                                                                                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                                                                                            : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                                                                                                                    }`}
                                                                                                                >
                                                                                                                    {isPrepared ? (
                                                                                                                        <>
                                                                                                                            <Check size={9} strokeWidth={3} />
                                                                                                                            <span>READY</span>
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <>
                                                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                                                                            <span>COOKING</span>
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </button>
                                                                                                            ) : (
                                                                                                                <span className="text-[8.5px] sm:text-[9px] font-[700] px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                                                                                                    NEW
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>

                                                                                                        <div className="flex items-center gap-2 text-[10.5px] sm:text-[11px] font-[600] text-[#64748B] mt-0.5">
                                                                                                            <span className="font-['Inter',sans-serif]">{sym}{item.price} each</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Right: Quantity Stepper, Price, Delete */}
                                                                                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                                                                                    {/* Stepper */}
                                                                                                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={async () => { kravy.remove(); handleUpdateItemQty(activeOrderForSelected.id, itemRealIndex, item.quantity - 1); }}
                                                                                                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-bold"
                                                                                                        >
                                                                                                            −
                                                                                                        </button>
                                                                                                        <span className="w-5 sm:w-6 text-center text-[11px] sm:text-xs font-[700] text-[#0F172A] dark:text-white font-['Inter',sans-serif]">
                                                                                                            {item.quantity}
                                                                                                        </span>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={async () => { kravy.click(); handleUpdateItemQty(activeOrderForSelected.id, itemRealIndex, item.quantity + 1); }}
                                                                                                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-[#635BFF] text-xs font-bold"
                                                                                                        >
                                                                                                            +
                                                                                                        </button>
                                                                                                    </div>

                                                                                                    {/* Price */}
                                                                                                    <span className="min-w-[42px] sm:min-w-[48px] text-right text-[12px] sm:text-[13px] font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif] tabular-nums">
                                                                                                        {sym}{item.price * item.quantity}
                                                                                                    </span>

                                                                                                    {/* Delete */}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={async () => { kravy.trash(); handleRemoveItem(activeOrderForSelected.id, itemRealIndex); }}
                                                                                                        title="Delete Item"
                                                                                                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0"
                                                                                                    >
                                                                                                        <Trash2 size={12} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}

                                                                {/* Summary Row */}
                                                                <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#64748B]">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-[600]">Total Items:</span>
                                                                        <span className="font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif]">
                                                                            {(activeOrderForSelected.items || []).reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-[600]">Subtotal:</span>
                                                                        <span className="font-[800] text-[#0F172A] dark:text-white font-['Inter',sans-serif]">
                                                                            {sym}{(() => {
                                                                                const rawItemsSum = (activeOrderForSelected.items || []).reduce((sum: number, it: any) => {
                                                                                    return sum + (Number(it.quantity || it.qty || 0) * Number(it.price || it.rate || 0));
                                                                                }, 0);
                                                                                return rawItemsSum ? rawItemsSum.toFixed(2) : (activeOrderForSelected.total ?? "0");
                                                                            })()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-16 space-y-3">
                                                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs">
                                                                <UtensilsCrossed size={28} className="text-[#64748B]" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-[800] text-[#0F172A] dark:text-white uppercase tracking-tight">No Items Added Yet</p>
                                                                <p className="text-[11px] font-medium text-[#64748B] mt-1">Tap "+ Add Item" above to add dishes to this order</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Sticky Footer: Kitchen Operations + Grand Total + Quick Actions */}
                                                <div className="shrink-0 p-3 sm:p-5 pb-5 sm:pb-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 space-y-2 sm:space-y-3 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
                                                    {/* Row 1: Kitchen Operations + Grand Total Card */}
                                                    <div className="flex gap-2 sm:gap-3">
                                                        {/* Kitchen Operations Card */}
                                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between">
                                                            <span className="text-[8.5px] sm:text-[9px] font-[800] uppercase text-[#64748B] tracking-wider flex items-center gap-1.5 mb-1.5 sm:mb-2">
                                                                <ChefHat size={11} className="text-[#635BFF]" />
                                                                Kitchen Operations
                                                            </span>
                                                            <div className="flex w-full">
                                                                {(() => {
                                                                    const status = activeOrderForSelected?.status;
                                                                    const isPending = status === "PENDING";
                                                                    const isPreparing = status === "PREPARING";
                                                                    const isReady = status === "READY";

                                                                    if (isPending) {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => updateOrderStatus(activeOrderForSelected!.id, "PREPARING")}
                                                                                className="w-full h-8 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] sm:text-[10px] font-[700] uppercase tracking-wider bg-[#0F172A] hover:bg-slate-800 text-white shadow-2xs active:scale-95 transition-all duration-200"
                                                                            >
                                                                                <ChefHat size={12} /> Start Cooking
                                                                            </button>
                                                                        );
                                                                    }

                                                                    if (isPreparing) {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => updateOrderStatus(activeOrderForSelected!.id, "READY")}
                                                                                className="w-full h-8 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] sm:text-[10px] font-[700] uppercase tracking-wider bg-[#10B981] hover:bg-[#0ea372] text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all duration-200"
                                                                            >
                                                                                <Check size={12} strokeWidth={3} /> Mark All Ready
                                                                            </button>
                                                                        );
                                                                    }

                                                                    if (isReady) {
                                                                        return (
                                                                            <div className="w-full h-8 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] sm:text-[10px] font-[700] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                                                                                <Check size={12} strokeWidth={3} className="text-emerald-600" /> All Items Ready
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className="w-full h-8 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] sm:text-[10px] font-[700] uppercase tracking-wider bg-slate-200/60 dark:bg-slate-700/50 text-slate-400 opacity-60 cursor-not-allowed">
                                                                            Order {status || "Unknown"}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* Grand Total FinTech Card */}
                                                        <div className="min-w-[125px] sm:min-w-[180px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-800 flex flex-col justify-between shrink-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[8px] sm:text-[9px] font-[700] uppercase tracking-wider opacity-60">Grand Total</span>
                                                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[7px] font-[800] uppercase tracking-wider backdrop-blur-sm border border-white/10">TAX INCL</span>
                                                            </div>
                                                            <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 font-['Inter',sans-serif]">
                                                                <span className="text-xs sm:text-sm font-normal opacity-50">{sym}</span>
                                                                <strong className="text-xl sm:text-3xl font-[800] tracking-tight">{activeOrderForSelected?.total ?? "0"}</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions Row: 1st WhatsApp Icon + 2nd Print KOT / Preview Dropdown + Primary Print Final Bill */}
                                                    <div className="flex items-center gap-2 pt-0.5">
                                                        {/* 1st: WhatsApp Icon Button */}
                                                        <button
                                                            type="button"
                                                            disabled={!activeOrderForSelected}
                                                            title={activeOrderForSelected?.customerPhone ? `WhatsApp bill to ${activeOrderForSelected.customerPhone}` : "Send WhatsApp Bill"}
                                                            onClick={() => {
                                                                if (!activeOrderForSelected) return;
                                                                const url = `https://billing.kravy.in/order-tracking/${activeOrderForSelected.id}`;
                                                                const msg = `Hi${activeOrderForSelected.customerName ? ' ' + activeOrderForSelected.customerName : ''},\n\nHere is your live order tracking & digital bill from Kravy:\n${url}\n\nTotal Amount: ₹${activeOrderForSelected.total}\n\nThank you!`;
                                                                const phone = activeOrderForSelected.customerPhone ? `91${activeOrderForSelected.customerPhone.replace(/[^0-9]/g, '')}` : '';
                                                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                            }}
                                                            className="h-10 sm:h-11 w-10 sm:w-11 rounded-xl flex items-center justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                                        >
                                                            <MessageCircle size={18} />
                                                        </button>

                                                        {/* 2nd: Print KOT & Preview Dropdown */}
                                                        <div className="relative shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={!activeOrderForSelected}
                                                                onClick={() => setIsKotDropdownOpen(prev => !prev)}
                                                                className="h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 text-[11px] sm:text-xs font-[700] uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Printer size={14} className="text-[#64748B] dark:text-slate-300" />
                                                                <span>Print KOT</span>
                                                                <ChevronDown size={13} className={`text-[#64748B] transition-transform duration-200 ${isKotDropdownOpen ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {/* Dropdown Menu */}
                                                            {isKotDropdownOpen && (
                                                                <>
                                                                    <div 
                                                                        className="fixed inset-0 z-40" 
                                                                        onClick={() => setIsKotDropdownOpen(false)} 
                                                                    />
                                                                    <div className="absolute left-0 bottom-full mb-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                setIsKotDropdownOpen(false);
                                                                                const tbl = tablesList.find(t => t.id === activeOrderForSelected?.table?.id);
                                                                                if (activeOrderForSelected) {
                                                                                    setPrintOrder(activeOrderForSelected);
                                                                                    setPrintTable(tbl || null);
                                                                                    setTimeout(() => handlePrint("KOT", activeOrderForSelected, tbl || undefined), 100);
                                                                                }
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-[600] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-left"
                                                                        >
                                                                            <Printer size={14} className="text-[#635BFF]" />
                                                                            <div>
                                                                                <div className="font-[700]">USB KOT</div>
                                                                                <div className="text-[10px] text-slate-400">Print KOT via USB</div>
                                                                            </div>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                setIsKotDropdownOpen(false);
                                                                                if (!activeOrderForSelected) return;
                                                                                try {
                                                                                    const { ensurePrinterConnected, printReceiptData } = await import("@/lib/web-bluetooth");
                                                                                    await ensurePrinterConnected(false, 'kot');

                                                                                    const tbl = tablesList.find(t => t.id === activeOrderForSelected?.table?.id);
                                                                                    setPrintOrder(activeOrderForSelected);
                                                                                    if (tbl) setPrintTable(tbl);

                                                                                    const kotOrderData = {
                                                                                        ...activeOrderForSelected,
                                                                                        tableName: tbl?.name || activeOrderForSelected.table?.name || (activeOrderForSelected as any).tableName || "Counter",
                                                                                        kotNumbers: activeOrderForSelected.tokenNumber ? [String(activeOrderForSelected.tokenNumber)] : [],
                                                                                        tokenNumber: activeOrderForSelected.tokenNumber || "---",
                                                                                        items: activeOrderForSelected.items || []
                                                                                    };

                                                                                    await printReceiptData(kotOrderData, business, kotReceiptRef.current, 'kot');
                                                                                    toast.success("BT KOT Printed! 🧾");
                                                                                } catch (err: any) {
                                                                                    toast.error(err.message || "BT KOT Print failed");
                                                                                }
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-[600] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-left"
                                                                        >
                                                                            <Bluetooth size={14} className="text-blue-500" />
                                                                            <div>
                                                                                <div className="font-[700]">Bluetooth KOT</div>
                                                                                <div className="text-[10px] text-slate-400">Thermal Mobile KOT</div>
                                                                            </div>
                                                                        </button>
                                                                        <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                setIsKotDropdownOpen(false);
                                                                                if (activeOrderForSelected) setPrintOrder(activeOrderForSelected);
                                                                                setPreviewMode("KOT");
                                                                                setShowPreview(true);
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-[600] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-left"
                                                                        >
                                                                            <Eye size={14} className="text-slate-500" />
                                                                            <div>
                                                                                <div className="font-[700]">Preview KOT</div>
                                                                                <div className="text-[10px] text-slate-400">View KOT slip on screen</div>
                                                                            </div>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                setIsKotDropdownOpen(false);
                                                                                if (activeOrderForSelected) setPrintOrder(activeOrderForSelected);
                                                                                setPreviewMode("BILL");
                                                                                setShowPreview(true);
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-[600] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors text-left"
                                                                        >
                                                                            <Receipt size={14} className="text-emerald-500" />
                                                                            <div>
                                                                                <div className="font-[700]">Preview Bill</div>
                                                                                <div className="text-[10px] text-slate-400">View final bill preview</div>
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* 3rd: Primary Full-Attention Print Final Bill Button */}
                                                        <button
                                                            type="button"
                                                            disabled={!activeOrderForSelected}
                                                            onClick={async () => {
                                                                if (!activeOrderForSelected || !selectedTable) return;
                                                                kravy.payment();
                                                                setSelectedOrderId(activeOrderForSelected.id);
                                                                setActiveTab("payment");
                                                            }}
                                                            className="flex-1 h-10 sm:h-11 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#635BFF] via-[#5249e0] to-[#4338ca] hover:from-[#5249e0] hover:to-[#3730a3] text-white font-[800] text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                                                        >
                                                            <span>Print Final Bill</span>
                                                            <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ── CASHIER / BILLING TAB ── */}
                    {activeTab === "payment" && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col p-0 lg:p-6 xl:p-8 overflow-y-auto no-scrollbar"
                        >
                            {selectedTable && activeOrderForSelected ? (
                                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-0 lg:gap-6 w-full h-full lg:min-h-0">

                                    {/* LEFT PANEL: Order Summary */}
                                    <div className="bg-white dark:bg-slate-900 lg:bg-white/40 lg:dark:bg-[#0B1B48]/40 lg:backdrop-blur-2xl rounded-none lg:rounded-3xl flex flex-col lg:overflow-hidden border-0 lg:border border-white/60 dark:border-indigo-500/20 shadow-none lg:shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative mb-2 lg:mb-0">
                                        <div className="hidden lg:block absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-indigo-500/5 dark:to-transparent pointer-events-none" />
                                        <div className="p-4 lg:p-6 border-b border-slate-100 lg:border-white/50 dark:border-slate-800/50 flex flex-col lg:flex-row items-start lg:items-center justify-between bg-white lg:bg-white/30 dark:bg-slate-900 lg:dark:bg-slate-900/30 lg:backdrop-blur-md relative z-10 gap-4 lg:gap-0">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setActiveTab("dashboard")}
                                                        className="md:hidden w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 border border-slate-200 dark:border-slate-700 mr-1"
                                                    >
                                                        <ArrowLeft size={16} className="text-slate-700 dark:text-slate-300" />
                                                    </button>
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                                        <Receipt size={20} />
                                                    </div>
                                                    <h3 className="text-lg md:text-2xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Order Summary</h3>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (activeOrderForSelected) {
                                                                navigator.clipboard.writeText(JSON.stringify(activeOrderForSelected, null, 2));
                                                                toast.success("Order JSON copied!");
                                                            }
                                                        }}
                                                        className="px-2 lg:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5 lg:gap-2 transition-all uppercase tracking-widest whitespace-nowrap"
                                                    >
                                                        <Copy size={12} /> <span className="hidden sm:inline">Copy</span> JSON
                                                    </button>
                                                    {authUser?.type === "ADMIN" || authUser?.type === "MASTER" ? (
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(JSON.stringify(business, null, 2));
                                                                toast.success("Business Profile JSON copied!");
                                                            }}
                                                            className="px-2 lg:px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-[10px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 lg:gap-2 transition-all uppercase tracking-widest whitespace-nowrap"
                                                        >
                                                            <Copy size={12} /> <span className="hidden sm:inline">Copy</span> JSON 2
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 lg:p-5 grid grid-cols-2 lg:flex lg:gap-8 items-start border-b border-slate-100 lg:border-slate-200 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 gap-y-4">
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase tracking-wider">ID</p>
                                                <span className="px-2 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded">Active</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase tracking-wider">Table</p>
                                                <span className="px-2 py-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 rounded">{selectedTable.name}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase tracking-wider">Token / KOT</p>
                                                <span className="px-2 py-1 text-xs font-black bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded">
                                                    #{activeOrderForSelected.tokenNumber || (activeOrderForSelected.kotNumbers && activeOrderForSelected.kotNumbers.length > 0 ? activeOrderForSelected.kotNumbers[0] : "---")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase tracking-wider">Order Type</p>
                                                <span className="px-2 py-1 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 rounded">Dine In</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2 font-bold uppercase tracking-wider">Waiter</p>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">-</span>
                                            </div>
                                        </div>

                                        <div className="p-4 lg:p-5 border-b border-slate-100 lg:border-slate-200 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                            <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                                                <User size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold truncate">{activeOrderForSelected.customerName || "Guest (+1)"}</span>
                                                    {activeOrderForSelected.customerPhone && <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{activeOrderForSelected.customerPhone}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    setEditCustomerName(activeOrderForSelected.customerName || "");
                                                    setEditCustomerPhone(activeOrderForSelected.customerPhone || "");
                                                    setShowCustomerModal(true);
                                                }}
                                                className="flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg border border-slate-200 lg:border-slate-300 dark:border-slate-700 hover:bg-slate-50 lg:hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 transition-colors w-full sm:w-auto"
                                            >
                                                <Edit3 size={14} /> Edit Details
                                            </button>
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex overflow-x-auto no-scrollbar px-4 lg:px-5 border-b border-slate-100 lg:border-slate-200 dark:border-slate-800 pt-2 gap-4 lg:gap-6">
                                            {["ITEMS", "KOT", "RESERVATION"].map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={async () => setSettleTab(tab as any)}
                                                    className={`pb-3 text-[13px] lg:text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${settleTab === tab ? "text-indigo-600 lg:text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-500" : "text-slate-500 lg:text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}`}
                                                >
                                                    {tab === "ITEMS" ? "Ordered Items" : tab === "KOT" ? "KOT History" : "User Reservation History"}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Table/List */}
                                        <div className="flex-1 lg:overflow-y-auto p-3 lg:p-4 space-y-3 bg-slate-50/50 dark:bg-[#111111]/50">
                                            {settleTab === "ITEMS" ? (
                                                <div className="space-y-3">
                                                    {(Array.isArray(activeOrderForSelected.items) ? activeOrderForSelected.items : []).map((it: any, idx: number) => (
                                                        <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-100 lg:border-white/60 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all duration-300 transform lg:hover:-translate-y-0.5 gap-3 sm:gap-0">
                                                            <div className="flex items-center gap-3 lg:gap-4 flex-1">
                                                                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm shadow-sm border border-slate-100 lg:border-white/50 dark:border-slate-700 shrink-0 ${it.isVeg === false || it.name?.toUpperCase().includes("(NV)") ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"}`}>
                                                                    {it.isVeg === false || it.name?.toUpperCase().includes("(NV)") ? "🍗" : "🥗"}
                                                                </div>
                                                                <div className="min-w-0 pr-2">
                                                                    <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-xs lg:text-[13px] break-words">{it.name}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] lg:text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 lg:px-2 py-0.5 rounded uppercase tracking-widest">{sym}{it.price} each</span>
                                                                        {it.kotNumber ? (
                                                                            <span className="text-[9px] lg:text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-1.5 lg:px-2 py-0.5 rounded uppercase tracking-widest">KOT #{it.kotNumber}</span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 lg:gap-6 sm:pl-4 justify-between sm:justify-end border-t border-slate-100 dark:border-slate-700/50 sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                                                                <div className="text-center flex items-center sm:block gap-2 sm:gap-0">
                                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest sm:mb-0.5">Qty</p>
                                                                    <p className="text-xs lg:text-sm font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 w-6 h-6 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center">{it.quantity}</p>
                                                                </div>
                                                                <div className="text-right min-w-[70px]">
                                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5 hidden sm:block">Total</p>
                                                                    <p className="text-base lg:text-lg font-black text-slate-900 dark:text-white">{sym}{it.price * it.quantity}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : settleTab === "KOT" ? (
                                                <div className="h-full flex flex-col p-4">
                                                    {(() => {
                                                        const kotList = Array.from(new Set(
                                                            (activeOrderForSelected?.items || [])
                                                                .map((item: any) => Number(item.kotNumber))
                                                                .filter(kn => !isNaN(kn) && kn > 0)
                                                        )).sort((a: any, b: any) => a - b);
                                                        if (kotList.length === 0) {
                                                            return (
                                                                <div className="h-full flex flex-col items-center justify-center opacity-40">
                                                                    <Receipt size={32} className="text-slate-400 mb-4" />
                                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">No KOT History Found</p>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="space-y-3">
                                                                {kotList.map((kn: number, i: number) => (
                                                                    <div key={kn} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                                                <ChefHat size={16} className="text-indigo-600 dark:text-indigo-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-200">KOT #{kn}</p>
                                                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Round {i + 1}</p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Printed</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center p-8 opacity-40">
                                                    <History size={32} className="text-slate-400 mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">No Past Reservations</p>
                                                    {selectedParty && (
                                                        <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 w-full max-w-sm text-left opacity-80">
                                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">Customer Profile</p>
                                                            <div className="space-y-1 mt-2">
                                                                <p className="text-[10px] uppercase font-bold text-slate-500">Name: <span className="text-slate-900 dark:text-slate-300">{selectedParty.name}</span></p>
                                                                <p className="text-[10px] uppercase font-bold text-slate-500">Phone: <span className="text-slate-900 dark:text-slate-300">{selectedParty.phone}</span></p>
                                                                <p className="text-[10px] uppercase font-bold text-slate-500">Total Visits: <span className="text-slate-900 dark:text-slate-300">{selectedParty.totalVisits || 0}</span></p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT PANEL: Billing Calculation */}
                                    <div className="bg-white dark:bg-slate-900 lg:bg-white/40 lg:dark:bg-[#0B1B48]/40 lg:backdrop-blur-2xl rounded-none lg:rounded-3xl flex flex-col border-0 lg:border border-white/60 dark:border-indigo-500/20 shadow-none lg:shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative w-full lg:h-full lg:overflow-hidden pb-4 lg:pb-0">
                                        <div className="hidden lg:block absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-indigo-500/5 dark:to-transparent pointer-events-none" />
                                        <div className="flex-1 lg:overflow-y-auto no-scrollbar relative z-10">
                                            {/* Totals Section */}
                                            <div className="p-5 border-b border-white/50 dark:border-slate-800/50 space-y-2 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md">
                                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                    <span>Items Base</span>
                                                    <span>{sym}{settlementBill?.subtotal.toFixed(2)}</span>
                                                </div>
                                                {(settlementBill?.discountAmt || 0) > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500">
                                                        <span>Discount</span>
                                                        <span>- {sym}{(settlementBill?.discountAmt || 0).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {(settlementBill?.loyaltyRedeemed || 0) > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400">
                                                        <span>Loyalty Redeemed</span>
                                                        <span>- {sym}{(settlementBill?.loyaltyRedeemed || 0).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {(settlementBill?.totalExclusiveGst || 0) > 0 && (
                                                    <>
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                                                            <span>CGST (Extra)</span>
                                                            <span>+ {sym}{(settlementBill?.totalCGST || 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                                                            <span>SGST (Extra)</span>
                                                            <span>+ {sym}{(settlementBill?.totalSGST || 0).toFixed(2)}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {(settlementBill?.totalInclusiveGst || 0) > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-80">
                                                        <span>GST (Included)</span>
                                                        <span>({sym}{(settlementBill?.totalInclusiveGst || 0).toFixed(2)})</span>
                                                    </div>
                                                )}
                                                {settlementBill?.isTaxEnabled && (settlementBill?.totalExclusiveGst === 0 && settlementBill?.totalInclusiveGst === 0) && (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">
                                                        <span>GST Total (Active)</span>
                                                        <span>+ {sym}0.00</span>
                                                    </div>
                                                )}
                                                {((settlementBill?.totalCharges || 0) > 0) && (
                                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-500">
                                                        <span>Other Charges</span>
                                                        <span>+ {sym}{((settlementBill?.totalCharges || 0) + (settlementBill?.totalChargesGst || 0)).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {Math.abs(settlementBill?.roundOff || 0) > 0.01 && (
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                        <span>Round Off</span>
                                                        <span>{(settlementBill?.roundOff || 0) > 0 ? "+" : "-"}{sym}{Math.abs(settlementBill?.roundOff || 0).toFixed(2)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-700 pb-2 gap-4 mt-2 pt-2">
                                                    <div className="flex flex-wrap gap-x-2 gap-y-1 flex-1">
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter leading-none">Sub: {sym}{settlementBill?.subtotal.toFixed(2)}</p>
                                                        {(settlementBill?.discountAmt || 0) > 0 && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter leading-none">Disc: -{sym}{settlementBill?.discountAmt.toFixed(2)}</p>}
                                                        {(settlementBill?.loyaltyRedeemed || 0) > 0 && <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter leading-none">Loyalty: -{sym}{settlementBill?.loyaltyRedeemed.toFixed(2)}</p>}
                                                        {settlementBill?.isTaxEnabled && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter leading-none">Tax: {sym}{settlementBill?.gstAmount.toFixed(2)}</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">PAYABLE</p>
                                                        <p className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm leading-none">{sym}{settlementBill?.total.toFixed(2)}</p>
                                                    </div>
                                                </div>

                                                {/* Tabs */}
                                                <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-0.5 bg-slate-50 dark:bg-slate-900 mt-4">
                                                    <button onClick={async () => setDiscountMode('PROMO')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${discountMode === 'PROMO' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Promo</button>
                                                    <button onClick={async () => setDiscountMode('INSTANT')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${discountMode === 'INSTANT' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Discount</button>
                                                    <button onClick={async () => setDiscountMode('CHARGES')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${discountMode === 'CHARGES' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Charges</button>
                                                </div>

                                                {/* Discount Tab Content */}
                                                {discountMode === 'INSTANT' && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                                            <button onClick={async () => setDiscountType('PERCENT')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${discountType === 'PERCENT' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>%</button>
                                                            <button onClick={async () => setDiscountType('FLAT')} className={`px-3 py-1.5 text-xs font-bold rounded-md ${discountType === 'FLAT' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{sym}</button>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            placeholder="Amount..."
                                                            value={discountValue}
                                                            onChange={e => setDiscountValue(e.target.value)}
                                                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white"
                                                        />
                                                    </div>
                                                )}

                                                {/* Charges Tab Content */}
                                                {discountMode === 'CHARGES' && (
                                                    <div className="grid grid-cols-1 gap-2 mt-3">
                                                        <div className="flex gap-2">
                                                            <div className="flex flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                                <div className="bg-slate-100 dark:bg-slate-800 px-2 flex items-center border-r border-slate-200 dark:border-slate-700">
                                                                    <Truck size={14} className="text-slate-500" />
                                                                </div>
                                                                <select value={deliveryChargeType} onChange={e => setDeliveryChargeType(e.target.value as any)} className="bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs px-2 outline-none dark:text-white">
                                                                    <option value="FLAT">{sym}</option>
                                                                    <option value="PERCENT">%</option>
                                                                </select>
                                                                <input type="number" placeholder="Delivery..." value={manualDeliveryCharge} onChange={e => setManualDeliveryCharge(e.target.value)} className="w-full bg-transparent px-2 text-sm outline-none dark:text-white" />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                                <div className="bg-slate-100 dark:bg-slate-800 px-2 flex items-center border-r border-slate-200 dark:border-slate-700">
                                                                    <Package size={14} className="text-slate-500" />
                                                                </div>
                                                                <select value={packagingChargeType} onChange={e => setPackagingChargeType(e.target.value as any)} className="bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs px-2 outline-none dark:text-white">
                                                                    <option value="FLAT">{sym}</option>
                                                                    <option value="PERCENT">%</option>
                                                                </select>
                                                                <input type="number" placeholder="Packaging..." value={manualPackagingCharge} onChange={e => setManualPackagingCharge(e.target.value)} className="w-full bg-transparent px-2 text-sm outline-none dark:text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Promo Tab Content (Placeholder) */}
                                                {discountMode === 'PROMO' && (
                                                    <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400 p-2">
                                                        Enter Promo Code Below
                                                        <div className="flex gap-2 mt-1">
                                                            <input type="text" placeholder="Code" className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none dark:text-white" />
                                                            <button className="bg-blue-600 text-white px-3 rounded-lg text-xs font-bold uppercase">Apply</button>
                                                        </div>
                                                        {selectedParty && (
                                                            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-left">
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <h4 className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                                            <Gift size={12} /> Loyalty Points
                                                                        </h4>
                                                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                                                            {selectedParty.loyaltyPoints} Available Points
                                                                        </p>
                                                                    </div>
                                                                    {selectedParty.loyaltyPoints >= (business?.loyaltyMinRedeem || 0) ? (
                                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                                            <input type="checkbox" checked={useLoyaltyDiscount} onChange={(e) => setUseLoyaltyDiscount(e.target.checked)} className="sr-only peer" />
                                                                            <div className="w-9 h-5 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                                                        </label>
                                                                    ) : (
                                                                        <span className="text-[9px] text-amber-600/60 font-bold">Min {business?.loyaltyMinRedeem || 0} req.</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ✅ Partial Payment (Khata/Udhaar) */}
                                            <div className="px-4 pb-2">
                                                <div className="flex gap-2 items-center bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2 rounded-xl">
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Amount Paid ({sym})</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <input
                                                                type="number"
                                                                value={amountPaid}
                                                                onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
                                                                placeholder={`Full: ${(settlementBill?.total || 0).toFixed(2)}`}
                                                                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-600 outline-none font-black text-xs text-slate-800 dark:text-white focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                    {(amountPaid !== "" && Number(amountPaid) < (settlementBill?.total || 0)) && (
                                                        <div className="flex-1 text-right bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50">
                                                            <p className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Unpaid Balance</p>
                                                            <p className="text-xs font-black text-rose-600">{sym}{((settlementBill?.total || 0) - Number(amountPaid)).toFixed(2)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Payment Methods */}
                                            <div className="px-4 pb-4 grid grid-cols-3 md:grid-cols-6 gap-3">
                                                {[
                                                    { id: 'CASH', icon: <div className="text-2xl drop-shadow-sm">💵</div>, color: 'from-emerald-500 to-teal-500' },
                                                    { id: 'UPI', icon: <div className="text-2xl drop-shadow-sm">📱</div>, color: 'from-purple-500 to-indigo-600' },
                                                    { id: 'CARD', icon: <div className="text-2xl drop-shadow-sm">💳</div>, color: 'from-slate-700 to-slate-900' },
                                                    { id: 'COUNTER', icon: <div className="text-2xl drop-shadow-sm">🏪</div>, color: 'from-amber-500 to-orange-500' },
                                                    { id: 'WALLET', icon: <div className="text-2xl drop-shadow-sm">👛</div>, color: 'from-pink-500 to-rose-500' },
                                                    { id: 'SPLIT', icon: <div className="text-2xl drop-shadow-sm">🔀</div>, color: 'from-blue-500 to-cyan-500' }
                                                ].map(method => (
                                                    <button
                                                        key={method.id}
                                                        onClick={async () => setPayMethod(method.id)}
                                                        className={`group relative flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg overflow-hidden ${payMethod === method.id ? 'border-transparent text-white shadow-xl scale-105' : 'border border-slate-200/50 bg-white/50 text-slate-600'}`}
                                                    >
                                                        {payMethod === method.id && (
                                                            <div className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-100 transition-opacity duration-300`} />
                                                        )}
                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <div className={`transition-transform duration-300 ${payMethod === method.id ? 'scale-110 mb-1' : 'group-hover:scale-110'}`}>{method.icon}</div>
                                                            <span className={`text-[9px] font-black uppercase mt-1 tracking-widest ${payMethod === method.id ? 'text-white drop-shadow-sm' : 'text-slate-500 group-hover:text-slate-800'}`}>{method.id}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {payMethod === 'SPLIT' && (
                                                <div className="px-4 pb-4">
                                                    <div className="space-y-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 dark:bg-white/5 dark:border-white/10">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                                                                <Split size={12} /> Split Breakdown
                                                            </div>
                                                            <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-indigo-300">
                                                                Total: {sym}{(settlementBill?.total || 0).toFixed(2)}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                            {/* Cash */}
                                                            <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">💵 Cash</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const rem = Math.max(0, (settlementBill?.total || 0) - ((Number(splitUpi) || 0) + (Number(splitCard) || 0) + (Number(splitWallet) || 0)));
                                                                            setSplitCash(rem > 0 ? Number(rem.toFixed(2)) : "");
                                                                        }}
                                                                        className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline uppercase"
                                                                    >
                                                                        Auto Fill
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={splitCash}
                                                                    onChange={(e) => setSplitCash(e.target.value === "" ? "" : Number(e.target.value))}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-xs font-black outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                                                />
                                                            </div>

                                                            {/* UPI */}
                                                            <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">📱 UPI</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const rem = Math.max(0, (settlementBill?.total || 0) - ((Number(splitCash) || 0) + (Number(splitCard) || 0) + (Number(splitWallet) || 0)));
                                                                            setSplitUpi(rem > 0 ? Number(rem.toFixed(2)) : "");
                                                                        }}
                                                                        className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline uppercase"
                                                                    >
                                                                        Auto Fill
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={splitUpi}
                                                                    onChange={(e) => setSplitUpi(e.target.value === "" ? "" : Number(e.target.value))}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-xs font-black outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                                                />
                                                            </div>

                                                            {/* Card */}
                                                            <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">💳 Card</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const rem = Math.max(0, (settlementBill?.total || 0) - ((Number(splitCash) || 0) + (Number(splitUpi) || 0) + (Number(splitWallet) || 0)));
                                                                            setSplitCard(rem > 0 ? Number(rem.toFixed(2)) : "");
                                                                        }}
                                                                        className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline uppercase"
                                                                    >
                                                                        Auto Fill
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={splitCard}
                                                                    onChange={(e) => setSplitCard(e.target.value === "" ? "" : Number(e.target.value))}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-xs font-black outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                                                />
                                                            </div>

                                                            {/* Wallet */}
                                                            <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">👛 Wallet</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const rem = Math.max(0, (settlementBill?.total || 0) - ((Number(splitCash) || 0) + (Number(splitUpi) || 0) + (Number(splitCard) || 0)));
                                                                            setSplitWallet(rem > 0 ? Number(rem.toFixed(2)) : "");
                                                                        }}
                                                                        className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline uppercase"
                                                                    >
                                                                        Auto Fill
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    value={splitWallet}
                                                                    onChange={(e) => setSplitWallet(e.target.value === "" ? "" : Number(e.target.value))}
                                                                    placeholder="0.00"
                                                                    className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-xs font-black outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Payment Status */}
                                            <div className="px-4 pb-4">
                                                <div className="flex gap-2">
                                                    {(["Pending", "Paid"] as const).map((s) => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setPaymentStatus(s)}
                                                            className={`flex-1 py-2 rounded-xl border-2 font-black text-[10px] transition-all uppercase tracking-wider ${paymentStatus === s
                                                                ? (s === 'Paid' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20')
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                                                }`}
                                                        >
                                                            {s === 'Pending' ? '🕒 PENDING' : '✅ PAID'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>


                                            {/* Action Buttons */}
                                            <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (activeOrderForSelected) {
                                                            await handleCheckout(activeOrderForSelected.id, false);
                                                        } else {
                                                            setActiveTab("dashboard");
                                                        }
                                                    }}
                                                    disabled={isSettling}
                                                    className="flex flex-col items-center justify-center py-2 rounded-xl border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all font-black"
                                                    title="Save & Settle order without printing"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    <span className="text-[9px] font-black uppercase mt-1">{isSettling ? "Saving..." : "Save Bill"}</span>
                                                </button>
                                                <button onClick={async () => { if (activeOrderForSelected) setPrintOrder(activeOrderForSelected); setShowPreview(true); }} className="flex flex-col items-center justify-center py-2 rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 hover:bg-blue-100">
                                                    <Eye size={18} />
                                                    <span className="text-[9px] font-black uppercase mt-1">Preview</span>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const finalOrder = await handleCheckout(activeOrderForSelected.id);
                                                        const billId = finalOrder?.id || activeOrderForSelected.id;
                                                        try {
                                                            const billUrl = `${window.location.origin}/api/bill-manager/${billId}/pdf`;
                                                            const text = `Hello! Here is your bill: ${billUrl}`;
                                                            const waUrl = `https://wa.me/91${activeOrderForSelected.customerPhone || ""}?text=${encodeURIComponent(text)}`;
                                                            window.open(waUrl, "_blank");
                                                            toast.success("Opening WhatsApp...");
                                                        } catch (e: any) {
                                                            toast.error(e.message || "WhatsApp Send Failed!");
                                                        }
                                                    }}
                                                    className="flex flex-col items-center justify-center py-2 rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-500 hover:bg-green-100"
                                                >
                                                    <MessageCircle size={18} />
                                                    <span className="text-[9px] font-black uppercase mt-1">WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sticky Footer */}
                                        <div className="sticky lg:static bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-5 border-t border-slate-200 lg:border-white/40 bg-white/95 lg:bg-white/60 dark:bg-slate-900/95 lg:dark:bg-slate-900/60 backdrop-blur-xl mt-auto lg:rounded-b-3xl z-[60] pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-5 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] lg:shadow-none">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const tableToPrint = selectedTable;
                                                        const currentOrder = activeOrderForSelected;
                                                        if (!currentOrder) return;

                                                        const finalizedBill = await handleCheckout(currentOrder.id, false);
                                                        const billToPrint = finalizedBill || currentOrder;
                                                        handlePrint("BILL", billToPrint as any, tableToPrint as any);
                                                    }}
                                                    disabled={isSettling}
                                                    className="hidden sm:flex flex-1 relative overflow-hidden items-center justify-center gap-2 px-4 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 text-white font-black text-xs lg:text-[13px] uppercase tracking-[0.1em] lg:tracking-[0.2em] transition-all shadow-[0_10px_40px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_50px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 active:translate-y-1"
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                                    <Printer size={20} className="relative z-10 drop-shadow-md" />
                                                    <span className="relative z-10 drop-shadow-md">{isSettling ? "Processing..." : "USB Print"}</span>
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        const currentOrder = activeOrderForSelected;
                                                        if (!currentOrder) return;
                                                        try {
                                                            const { ensurePrinterConnected, printReceiptData } = await import("@/lib/web-bluetooth");

                                                            // 1. MUST be synchronous to user gesture
                                                            await ensurePrinterConnected(false, 'bill');

                                                            // 2. Network requests
                                                            const finalizedBill = await handleCheckout(currentOrder.id, false);
                                                            const billToPrint = finalizedBill || currentOrder;

                                                            // 3. Print
                                                            await printReceiptData(billToPrint, business, billReceiptRef.current, 'bill');
                                                        } catch (err: any) {
                                                            toast.error(err.message || "BT Print failed");
                                                        }
                                                    }}
                                                    disabled={isSettling}
                                                    className="flex-1 sm:flex-[0.6] relative overflow-hidden flex items-center justify-center gap-2 px-3 py-3.5 sm:py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-[0.1em] transition-all shadow-[0_10px_40px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 active:translate-y-1"
                                                >
                                                    <Bluetooth size={18} />
                                                    <span>BT Print</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center max-w-sm opacity-50 animate-in fade-in zoom-in-95">
                                    <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 border border-slate-300 dark:border-slate-700 shadow-inner">
                                        <CreditCard size={40} />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-200 mb-2">Billing Vault</p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-8">Select an active table from Terminal to initiate checkout flow.</p>
                                    <button onClick={async () => setActiveTab("dashboard")} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors">
                                        Back to Terminal
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>



            {/* ═══ ADD ITEM MODAL ═══ */}
            <AnimatePresence>
                {showAddItemModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={async () => setShowAddItemModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-[600px] h-[80vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Add Items</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Updating Order #{orderToUpdate?.id.slice(-4).toUpperCase()}</p>
                                </div>
                                <button onClick={async () => setShowAddItemModal(false)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"><X size={20} /></button>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search menu items..."
                                        className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={itemSearch}
                                        onChange={e => setItemSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {menuItems
                                    .filter(it => it.isActive !== false) // 🛡️ Hide Offline Items
                                    .filter(it => !itemSearch || it.name.toLowerCase().includes(itemSearch.toLowerCase()))
                                    .map(it => (
                                        <div
                                            key={it.id}
                                            onClick={async () => {
                                                kravy.click();
                                                addItemToOrder(it);
                                            }}
                                            className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 border border-slate-300 flex items-center justify-center shrink-0`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${it.isVeg === false ? "bg-rose-600" : "bg-emerald-600"}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{it.name}</p>
                                                    {business?.expiryTrackingEnabled && it.expiryDate && (
                                                        <div className="flex items-center mb-1">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${new Date(it.expiryDate) < new Date()
                                                                ? 'bg-red-100 text-red-600 border border-red-200'
                                                                : new Date(it.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                                    : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                                                }`}>
                                                                Exp: {new Date(it.expiryDate).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sym}{it.price}</p>
                                                        {(() => {
                                                            const invSettings = getInventorySettings(business);
                                                            if (!invSettings.enabled) return null;
                                                            const isTracked = it.currentStock !== null && it.currentStock !== undefined && typeof it.currentStock === "number" && !isNaN(it.currentStock) && (
                                                                invSettings.isStockCompulsory ||
                                                                it.currentStock > 0 ||
                                                                it.currentStock < 0 ||
                                                                (typeof it.reorderLevel === "number" && it.reorderLevel > 0) ||
                                                                (typeof it.openingStock === "number" && it.openingStock > 0)
                                                            );
                                                            if (!isTracked) return null;
                                                            const stock = it.currentStock;
                                                            if (stock <= 0) {
                                                                return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">{stock < 0 ? `Deficit (${stock})` : "Out of Stock"}</span>;
                                                            }
                                                            if (invSettings.lowStockAlerts !== false && typeof it.reorderLevel === "number" && !isNaN(it.reorderLevel) && it.reorderLevel > 0 && stock <= it.reorderLevel) {
                                                                return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">Low Stock: {stock}</span>;
                                                            }
                                                            return <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border border-slate-200/80">Stock: {stock}</span>;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Plus size={20} />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* Modular Shared Templates for Thermal Printing */}
            {(() => {
                const targetPrintOrder = printOrder || activeOrderForSelected;
                const isPrintOrderActive = targetPrintOrder?.id === activeOrderForSelected?.id && settlementBill;

                const resolvedPrintSubtotal = isPrintOrderActive ? settlementBill.subtotal : ((targetPrintOrder as any)?.subtotal || (targetPrintOrder ? calculateOrderTotals(targetPrintOrder.items || [], isTaxEnabled, globalRate, perProductEnabled, business).subtotal : 0));
                const resolvedPrintDiscountAmt = isPrintOrderActive ? (settlementBill.discountAmt + (settlementBill.loyaltyRedeemed || 0)) : ((targetPrintOrder as any)?.discountAmount || (targetPrintOrder as any)?.discountAmt || (targetPrintOrder as any)?.discount || 0);
                const resolvedPrintTotalTaxable = isPrintOrderActive ? (settlementBill.subtotal - settlementBill.discountAmt - (settlementBill.loyaltyRedeemed || 0)) : (((targetPrintOrder as any)?.subtotal ? ((targetPrintOrder as any)?.subtotal - ((targetPrintOrder as any)?.discountAmount || (targetPrintOrder as any)?.discountAmt || (targetPrintOrder as any)?.discount || 0)) : (targetPrintOrder ? calculateOrderTotals(targetPrintOrder.items || [], isTaxEnabled, globalRate, perProductEnabled, business).subtotal : 0)));
                const resolvedPrintTotalGst = isPrintOrderActive ? settlementBill.gstAmount : ((targetPrintOrder as any)?.tax || (targetPrintOrder as any)?.gstAmount || (targetPrintOrder as any)?.gst || (targetPrintOrder ? calculateOrderTotals(targetPrintOrder.items || [], isTaxEnabled, globalRate, perProductEnabled, business).gst : 0));
                const resolvedPrintDeliveryCharge = isPrintOrderActive ? settlementBill.deliveryCharge : ((targetPrintOrder as any)?.deliveryCharges || (targetPrintOrder as any)?.deliveryCharge || 0);
                const resolvedPrintDeliveryGst = isPrintOrderActive ? (settlementBill.totalChargesGst || 0) : ((targetPrintOrder as any)?.deliveryGst || 0);
                const resolvedPrintPackagingCharge = isPrintOrderActive ? settlementBill.packagingCharge : ((targetPrintOrder as any)?.packagingCharges || (targetPrintOrder as any)?.packagingCharge || 0);
                const resolvedPrintPackagingGst = ((targetPrintOrder as any)?.packagingGst || 0);
                const resolvedPrintServiceCharge = ((targetPrintOrder as any)?.serviceCharge || 0);
                const resolvedPrintFinalTotal = isPrintOrderActive ? settlementBill.total : (targetPrintOrder?.total || 0);

                const resolvedKotNumbers = (() => {
                    const directKots = targetPrintOrder?.kotNumbers || activeOrderForSelected?.kotNumbers;
                    if (Array.isArray(directKots) && directKots.length > 0) {
                        return directKots;
                    }
                    const itemsList = targetPrintOrder?.items || activeOrderForSelected?.items || [];
                    const itemKots = Array.from(new Set(
                        itemsList
                            .map((item: any) => Number(item.kotNumber || item.tokenNumber))
                            .filter((kn: number) => !isNaN(kn) && kn > 0)
                    )).sort((a: number, b: number) => a - b);

                    if (itemKots.length > 0) return itemKots;

                    const singleToken = printOrder?.tokenNumber || activeOrderForSelected?.tokenNumber;
                    if (singleToken && Number(singleToken) > 0) return [Number(singleToken)];

                    return [];
                })();

                return (
                    <>
                        <PrintTemplates
                            receiptRef={billReceiptRef}
                            kotRef={kotReceiptRef}
                            business={business}
                            billNumber={targetPrintOrder?.billNumber || targetPrintOrder?.orderNumber || (targetPrintOrder?.id ? `ORD-${targetPrintOrder.id.slice(-4).toUpperCase()}` : "DRAFT")}
                            billDate={targetPrintOrder?.createdAt ? new Date(targetPrintOrder.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '|').replace(',', ' -') : new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '|').replace(',', ' -')}
                            tokenNumber={(() => {
                                const tn = targetPrintOrder?.tokenNumber || activeOrderForSelected?.tokenNumber || (resolvedKotNumbers.length > 0 ? resolvedKotNumbers[resolvedKotNumbers.length - 1] : null);
                                if (tn == null || tn === "" || tn === 0) return "---";
                                if (typeof tn === 'object' && (tn as any).$numberLong) return (tn as any).$numberLong.toString().padStart(3, '0');
                                return tn.toString().padStart(3, '0');
                            })()}
                            selectedTable={targetPrintOrder?.table?.name || "Counter"}
                            customerName={targetPrintOrder?.customerName?.trim() || "Walk-in Customer"}
                            customerPhone={targetPrintOrder?.customerPhone || ""}
                            customerAddress={targetPrintOrder?.customerAddress || ""}
                            orderNotes={targetPrintOrder?.notes || ""}
                            buyerGSTIN=""
                            placeOfSupply=""
                            items={targetPrintOrder?.items?.map((it: any) => ({
                                name: it.name,
                                qty: Number(it.quantity || it.qty || 0),
                                rate: Number(it.price || it.rate || 0),
                                gst: it.gst,
                                isNew: it.isNew
                            })) || []}
                            subtotal={resolvedPrintSubtotal}
                            discountAmt={resolvedPrintDiscountAmt}
                            appliedOffer={null}
                            taxActive={isTaxEnabled}
                            perProductEnabled={perProductEnabled}
                            globalRate={globalRate}
                            totalTaxable={resolvedPrintTotalTaxable}
                            totalGst={resolvedPrintTotalGst}
                            taxBreakup={(() => {
                                const taxGroups = (printOrder?.items || []).reduce((acc: any, item: any) => {
                                    let rate = 0;
                                    if (perProductEnabled) rate = item.gst || 0;
                                    else if (isTaxEnabled) rate = globalRate;
                                    if (rate === 0 && resolvedPrintTotalGst > 0 && resolvedPrintTotalTaxable > 0) rate = Math.round((resolvedPrintTotalGst / resolvedPrintTotalTaxable) * 100);
                                    if (rate <= 0) return acc;
                                    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
                                    const qty = Number(item.qty || item.quantity || 1);
                                    const price = Number(item.rate || item.price || 0);
                                    const itemTotal = qty * price;
                                    const discountRatio = resolvedPrintSubtotal > 0 ? (resolvedPrintDiscountAmt / resolvedPrintSubtotal) : 0;
                                    const discountedGross = itemTotal - (itemTotal * discountRatio);

                                    let itemTaxable = discountedGross;
                                    let gst = 0;
                                    if (item.taxStatus === "With Tax") {
                                        itemTaxable = discountedGross / (1 + rate / 100);
                                        gst = discountedGross - itemTaxable;
                                    } else {
                                        gst = (discountedGross * rate) / 100;
                                    }

                                    const splitCgst = Math.round(gst * 50) / 100;
                                    acc[rate].taxable += itemTaxable;
                                    acc[rate].cgst += splitCgst;
                                    acc[rate].sgst += (gst - splitCgst);
                                    acc[rate].totalTax += gst;
                                    return acc;
                                }, {});
                                return Object.values(taxGroups);
                            })()}
                            deliveryCharge={resolvedPrintDeliveryCharge}
                            deliveryGst={resolvedPrintDeliveryGst}
                            packagingCharge={resolvedPrintPackagingCharge}
                            packagingGst={resolvedPrintPackagingGst}
                            serviceCharge={resolvedPrintServiceCharge}
                            finalTotal={resolvedPrintFinalTotal}
                            paymentMode={payMethod || "Cash"}
                            paymentStatus="Paid"
                            upiTxnRef=""
                            qrUrl={qrUrl}
                            kotNumbers={(resolvedKotNumbers as unknown as number[])}
                            prevWalletBalance={null}
                            selectedParty={null}
                            numberToWords={numberToWords}
                        />

                        {/* Modular Bill Preview Modal */}
                        <BillPreview
                            showPreview={showPreview}
                            setShowPreview={setShowPreview}
                            previewZoom={previewZoom}
                            setPreviewZoom={setPreviewZoom}
                            business={business}
                            serviceCharge={resolvedPrintServiceCharge}
                            prevWalletBalance={null}
                            selectedParty={null}
                            billNumber={printOrder?.billNumber || printOrder?.orderNumber || (printOrder?.id ? `ORD-${printOrder.id.slice(-4).toUpperCase()}` : "DRAFT")}
                            billDate={printOrder?.createdAt ? new Date(printOrder.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                            tokenNumber={(() => {
                                const tn = printOrder?.tokenNumber || activeOrderForSelected?.tokenNumber || (resolvedKotNumbers.length > 0 ? resolvedKotNumbers[resolvedKotNumbers.length - 1] : null);
                                if (tn == null || tn === "" || tn === 0) return "---";
                                if (typeof tn === 'object' && (tn as any).$numberLong) return (tn as any).$numberLong.toString().padStart(3, '0');
                                return tn.toString().padStart(3, '0');
                            })()}
                            selectedTable={printOrder?.table?.name || "Counter"}
                            customerName={printOrder?.customerName?.trim() || "Walk-in Customer"}
                            customerPhone={printOrder?.customerPhone || ""}
                            customerAddress={printOrder?.customerAddress || ""}
                            orderNotes={printOrder?.notes || ""}
                            placeOfSupply=""
                            items={printOrder?.items?.map((it: any) => ({
                                name: it.name,
                                qty: Number(it.qty || it.quantity || 0),
                                rate: Number(it.rate || it.price || 0),
                                gst: it.gst || 0,
                                taxStatus: it.taxStatus || "Without Tax"
                            })) || []}
                            subtotal={resolvedPrintSubtotal}
                            discountAmt={resolvedPrintDiscountAmt}
                            appliedOffer={null}
                            taxActive={isTaxEnabled}
                            perProductEnabled={perProductEnabled}
                            totalTaxable={resolvedPrintTotalTaxable}
                            totalGst={resolvedPrintTotalGst}
                            taxBreakup={(() => {
                                const taxGroups = (printOrder?.items || []).reduce((acc: any, item: any) => {
                                    let rate = 0;
                                    if (perProductEnabled) rate = item.gst || 0;
                                    else if (isTaxEnabled) rate = globalRate;
                                    if (rate === 0 && resolvedPrintTotalGst > 0 && resolvedPrintTotalTaxable > 0) rate = Math.round((resolvedPrintTotalGst / resolvedPrintTotalTaxable) * 100);
                                    if (rate <= 0) return acc;
                                    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
                                    const qty = Number(item.qty || item.quantity || 1);
                                    const price = Number(item.rate || item.price || 0);
                                    const itemTotal = qty * price;
                                    const discountRatio = resolvedPrintSubtotal > 0 ? (resolvedPrintDiscountAmt / resolvedPrintSubtotal) : 0;
                                    const discountedGross = itemTotal - (itemTotal * discountRatio);

                                    let itemTaxable = discountedGross;
                                    let gst = 0;
                                    if (item.taxStatus === "With Tax") {
                                        itemTaxable = discountedGross / (1 + rate / 100);
                                        gst = discountedGross - itemTaxable;
                                    } else {
                                        gst = (discountedGross * rate) / 100;
                                    }

                                    const splitCgst = Math.round(gst * 50) / 100;
                                    acc[rate].taxable += itemTaxable;
                                    acc[rate].cgst += splitCgst;
                                    acc[rate].sgst += (gst - splitCgst);
                                    acc[rate].totalTax += gst;
                                    return acc;
                                }, {});
                                return Object.values(taxGroups);
                            })()}
                            deliveryCharge={resolvedPrintDeliveryCharge}
                            deliveryGst={resolvedPrintDeliveryGst}
                            packagingCharge={resolvedPrintPackagingCharge}
                            packagingGst={resolvedPrintPackagingGst}
                            finalTotal={resolvedPrintFinalTotal}
                            paymentMode={payMethod || "Cash"}
                            paymentStatus="Paid"
                            qrUrl={qrUrl}
                            numberToWords={numberToWords}
                            kravy={kravy}
                            kotNumbers={(resolvedKotNumbers as unknown as number[])}
                            // Actions - Adapting for workflow
                            printKOT={() => handlePrint("KOT", targetPrintOrder || undefined)}
                            printReceipt={(enableKOT, customBill) => {
                                handlePrint("BILL", customBill || targetPrintOrder || undefined);
                                setTimeout(() => setShowPreview(false), 500);
                            }}
                            saveBill={async () => {
                                if (printOrder?.id) {
                                    return await handleCheckout(printOrder.id, true);
                                }
                                return null;
                            }}
                            resetForm={() => setShowPreview(false)}
                            isSaving={false}
                            lastSavedBillId={printOrder?.id || null}
                            userRole={userRole || "ADMIN"}
                            userPermissions={userPermissions || []}
                            resumeBillId={null}
                            router={router}
                        />
                    </>
                );
            })()}
            {/* Quick Table Add/Edit Modal -> Right Side Slide-over Panel (Half Page) */}
            <AnimatePresence>
                {isTableModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={async () => {
                                setIsTableModalOpen(false);
                                setTableDelConfirm(false);
                            }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative bg-white dark:bg-slate-900 w-full sm:w-[500px] md:w-[550px] lg:w-[48%] max-w-[680px] h-full shadow-[-10px_0_40px_rgba(15,23,42,0.15)] border-l border-slate-200 dark:border-slate-800 z-[1001] flex flex-col overflow-hidden"
                        >
                            {/* Panel Header */}
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <TableIcon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Table Settings</p>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                            {editingTable ? `Manage "${editingTable.name}"` : "Add New Table"}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsTableModalOpen(false);
                                        setTableDelConfirm(false);
                                    }}
                                    className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                                {/* ── SECTION 1: Rename & Zone ── */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2 bg-indigo-500/5">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Edit2 size={13} />
                                        </div>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">
                                            {editingTable ? "Table Details & Name" : "Create Table"}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-3.5">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">Table Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={tableNameInput}
                                                onChange={(e) => setTableNameInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSaveTable()}
                                                className="w-full mt-1.5 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                                                placeholder="e.g. T-01, VIP-1, Balcony..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">Floor / Section</label>
                                                <div className="relative mt-1.5">
                                                    <select
                                                        value={tableFloorInput}
                                                        onChange={(e) => setTableFloorInput(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
                                                    >
                                                        {allFloorsList.map((f) => (
                                                            <option key={f} value={f}>{f}</option>
                                                        ))}
                                                        {tableFloorInput && !allFloorsList.includes(tableFloorInput) && (
                                                            <option value={tableFloorInput}>{tableFloorInput}</option>
                                                        )}
                                                    </select>
                                                    <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">Zone</label>
                                                <div className="relative mt-1.5">
                                                    <select
                                                        value={tableZoneInput}
                                                        onChange={(e) => setTableZoneInput(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
                                                    >
                                                        {allZonesList.map((z) => (
                                                            <option key={z} value={z}>{z}</option>
                                                        ))}
                                                        {tableZoneInput && !allZonesList.includes(tableZoneInput) && (
                                                            <option value={tableZoneInput}>{tableZoneInput}</option>
                                                        )}
                                                    </select>
                                                    <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveTable}
                                            disabled={isSavingTable || !tableNameInput.trim()}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {isSavingTable ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                            {editingTable ? "Save Changes" : "Create Table"}
                                        </button>
                                    </div>
                                </div>

                                {/* ── SECTION 2: Transfer Order (Only when editing an existing table) ── */}
                                {editingTable && (() => {
                                    const sourceActiveOrders = orders.filter(o => ((o.tableId === editingTable.id) || (o.table?.id === editingTable.id)) && o.status !== "COMPLETED" && !o.isDeleted);
                                    const hasActiveOrders = sourceActiveOrders.length > 0;
                                    const otherTables = tablesList.filter(t => t.id !== editingTable.id);

                                    return (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2 bg-amber-500/5">
                                                <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                    <ArrowRight size={13} />
                                                </div>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">Transfer Order</span>
                                                {!hasActiveOrders && (
                                                    <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                                        No Active Order
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                {!hasActiveOrders ? (
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                        No active running order on this table. Transfer is only possible when an order is active.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3.5">
                                                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                                                                    {sourceActiveOrders.length} Running Order{sourceActiveOrders.length > 1 ? "s" : ""}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                    Token #{sourceActiveOrders[0]?.tokenNumber || "N/A"} · {sourceActiveOrders[0]?.customerName || "Walk-In"}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                                                                ₹{sourceActiveOrders.reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">Select Target Table</label>
                                                            <select
                                                                value={manageTransferTo}
                                                                onChange={(e) => setManageTransferTo(e.target.value)}
                                                                className="w-full mt-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-all cursor-pointer"
                                                            >
                                                                <option value="">-- Select Destination Table --</option>
                                                                {otherTables.map((t) => {
                                                                    const isOccupied = orders.some(o => ((o.tableId === t.id) || (o.table?.id === t.id)) && o.status !== "COMPLETED" && !o.isDeleted);
                                                                    return (
                                                                        <option key={t.id} value={t.id} disabled={isOccupied}>
                                                                            {t.name} {t.floor ? `(${t.floor})` : ""} {isOccupied ? "— Occupied" : "✓ Free"}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>

                                                        <button
                                                            onClick={() => handleTransferOrder(editingTable.id, manageTransferTo)}
                                                            disabled={isTransferring || !manageTransferTo}
                                                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                                                        >
                                                            {isTransferring ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                                                            Transfer Order
                                                        </button>

                                                        {/* Merge Table (Party Booking) Shortcut */}
                                                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    kravy.click();
                                                                    setIsMergeModalOpen(true);
                                                                }}
                                                                className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
                                                            >
                                                                <GitMerge size={13} />
                                                                Merge Table (Party Booking)
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ── SECTION 3: Delete Table ── */}
                                {editingTable && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-rose-200 dark:border-rose-900/40 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-rose-200 dark:border-rose-900/40 flex items-center gap-2 bg-rose-500/5">
                                            <div className="w-7 h-7 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                                <Trash2 size={13} />
                                            </div>
                                            <span className="text-sm font-black text-rose-600 dark:text-rose-400">Danger Zone</span>
                                        </div>
                                        <div className="p-4">
                                            {!tableDelConfirm ? (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-400 font-medium">
                                                        Deleting this table will remove its configuration and historical floor layout placement.
                                                    </p>
                                                    <button
                                                        onClick={() => setTableDelConfirm(true)}
                                                        className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                                    >
                                                        <Trash2 size={13} /> Delete This Table
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 p-2 text-center">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">
                                                        Are you sure you want to permanently delete table "{editingTable.name}"?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setTableDelConfirm(false)}
                                                            className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black text-xs hover:bg-slate-300 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTable(editingTable.id, editingTable.name)}
                                                            disabled={isDeletingTable}
                                                            className="flex-1 py-2 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
                                                        >
                                                            {isDeletingTable ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                            Yes, Delete Table
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Customer Details Modal */}
                {showCustomerModal && activeOrderForSelected && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={async () => setShowCustomerModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.2)] p-6 w-full max-w-sm border border-white/50 dark:border-slate-700/50 z-[101]">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <User size={20} className="text-indigo-600 dark:text-indigo-400" />
                                Edit Customer
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 px-1">Customer Name</label>
                                    <input autoFocus type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" placeholder="e.g. John Doe" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 px-1">Phone Number (Optional)</label>
                                    <input type="tel" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" placeholder="e.g. +91 9876543210" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                                <button onClick={async () => setShowCustomerModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                                <button onClick={async () => {
                                    try {
                                        const res = await fetch("/api/orders", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                orderId: activeOrderForSelected.id,
                                                customerName: editCustomerName,
                                                customerPhone: editCustomerPhone
                                            })
                                        });
                                        if (res.ok) {
                                            toast.success("Customer details saved");
                                            fetchData(false, true);
                                            setShowCustomerModal(false);
                                        } else {
                                            toast.error("Failed to save details");
                                        }
                                    } catch (e) {
                                        toast.error("An error occurred");
                                    }
                                }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">Save</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════
                ADMIN JSON PREVIEW & COPY MODAL
            ══════════════════════════════════════ */}
            {jsonModalData && typeof document !== "undefined" && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                    <Code2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black tracking-tight">{jsonModalData.title}</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Admin Data Inspector &amp; JSON Exporter</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setJsonModalData(null)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-emerald-400 select-all">
                            <pre className="whitespace-pre-wrap break-all leading-relaxed">
                                {JSON.stringify(jsonModalData.json, null, 2)}
                            </pre>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-400 font-medium">
                                {Array.isArray(jsonModalData.json) ? `${jsonModalData.json.length} items` : "1 object"}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(jsonModalData.json, null, 2));
                                        setJsonCopied(true);
                                        toast.success("JSON copied to clipboard!");
                                        setTimeout(() => setJsonCopied(false), 2000);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all"
                                >
                                    {jsonCopied ? <Check size={14} /> : <Copy size={14} />}
                                    {jsonCopied ? "Copied!" : "Copy JSON"}
                                </button>
                                <button
                                    onClick={() => setJsonModalData(null)}
                                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-100 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ══════════════════════════════════════
                MERGE TABLES (PARTY BOOKING) MODAL
            ══════════════════════════════════════ */}
            <MergeTablesModal
                isOpen={isMergeModalOpen}
                onClose={() => setIsMergeModalOpen(false)}
                primaryTableId={selectedTableId || editingTable?.id || null}
                tables={tablesList}
                orders={orders}
                currencySymbol={sym}
                kravy={kravy}
                onMergeSuccess={handleMergeSuccess}
            />

            {/* ══════════════════════════════════════
                MERGE ORDERS (SAME TABLE) MODAL
            ══════════════════════════════════════ */}
            <MergeOrdersModal
                isOpen={isMergeOrdersModalOpen}
                onClose={() => setIsMergeOrdersModalOpen(false)}
                table={selectedTable || null}
                orders={tableOrders}
                currencySymbol={sym}
                kravy={kravy}
                onMergeSuccess={handleMergeOrdersSuccess}
            />

            {/* ══════════════════════════════════════
                TRANSFER TABLE MODAL
            ══════════════════════════════════════ */}
            <TransferTableModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                sourceTable={selectedTable || null}
                tables={tablesList}
                orders={orders}
                currencySymbol={sym}
                kravy={kravy}
                onTransfer={async (sourceId, targetId) => {
                    await handleTransferOrder(sourceId, targetId);
                    setSelectedTableId(targetId);
                }}
            />

            {/* ══════════════════════════════════════
                LONG-PRESS TABLE QUICK ACTION BOTTOM SHEET
            ══════════════════════════════════════ */}
            <TableActionSheet
                isOpen={Boolean(sheetTable)}
                onClose={() => setSheetTable(null)}
                table={sheetTable}
                orders={orders}
                currencySymbol={sym}
                onNewOrder={(tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    router.push(`/dashboard/billing/checkout?tableId=${tbl.id}&tableName=${encodeURIComponent(tbl.name)}&returnTo=/dashboard/terminal`);
                }}
                onAddItem={(tbl, ord) => {
                    setSheetTable(null);
                    kravy.click();
                    try {
                        sessionStorage.setItem("quick_pos_handoff_order", JSON.stringify(ord));
                    } catch (e) {
                        // ignore storage errors
                    }
                    router.push(`/dashboard/billing/checkout?orderId=${ord.id}&tableId=${tbl.id}&tableName=${encodeURIComponent(tbl.name)}&returnTo=/dashboard/terminal`);
                }}
                onMarkAllReady={async (tbl, ord) => {
                    setSheetTable(null);
                    kravy.click();
                    await updateOrderStatus(ord.id, "READY");
                    toast.success(`Table ${tbl.name}: All items marked ready! ✅`);
                }}
                onPrintKOT={async (tbl, ord) => {
                    setSheetTable(null);
                    kravy.click();
                    try {
                        // Bluetooth attempt first
                        const { ensurePrinterConnected, printReceiptData } = await import("@/lib/web-bluetooth");
                        await ensurePrinterConnected(false, "kot");
                        const kotOrderData = {
                            ...ord,
                            tableName: tbl.name || ord.table?.name || "Counter",
                            kotNumbers: ord.tokenNumber ? [String(ord.tokenNumber)] : [],
                            tokenNumber: ord.tokenNumber || "---",
                            items: ord.items || []
                        };
                        await printReceiptData(kotOrderData, business, kotReceiptRef.current, "kot");
                        toast.success(`KOT sent to printer for Table ${tbl.name}! 🧾`);
                    } catch (err: any) {
                        // Fallback to thermal/USB handlePrint
                        setPrintOrder(ord);
                        setPrintTable(tbl);
                        handlePrint("KOT", ord, tbl);
                        toast.success(`KOT sent to printer for Table ${tbl.name}! 🧾`);
                    }
                }}
                onWhatsApp={(tbl, ord) => {
                    setSheetTable(null);
                    kravy.click();
                    const url = `https://billing.kravy.in/order-tracking/${ord.id}`;
                    const msg = `Hi${ord.customerName ? " " + ord.customerName : ""},\n\nHere is your live order tracking & digital bill from Kravy for Table ${tbl.name}:\n${url}\n\nTotal Amount: ${sym}${ord.total}\n\nThank you!`;
                    const phone = ord.customerPhone ? `91${ord.customerPhone.replace(/[^0-9]/g, "")}` : "";
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                    toast.success("Bill shared on WhatsApp! 📱");
                }}
                onFinalBill={(tbl, ord) => {
                    setSheetTable(null);
                    kravy.payment();
                    setSelectedTableId(tbl.id);
                    setSelectedOrderId(ord.id);
                    setActiveTab("payment");
                }}
                onMergeTables={(tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    setSelectedTableId(tbl.id);
                    setIsMergeModalOpen(true);
                }}
                onTransferTable={(tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    setSelectedTableId(tbl.id);
                    setIsTransferModalOpen(true);
                }}
                onMergeOrders={(tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    setSelectedTableId(tbl.id);
                    const tblOrders = orders.filter(
                        (o) =>
                            ((o.tableId === tbl.id) || (o.table?.id === tbl.id)) &&
                            o.status !== "COMPLETED" &&
                            !o.isDeleted
                    );
                    if (tblOrders.length < 2) {
                        toast.info(`Table ${tbl.name} has ${tblOrders.length} order. At least 2 active orders are required to merge.`);
                        return;
                    }
                    setIsMergeOrdersModalOpen(true);
                }}
                onEditTable={(tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    handleEditTable(tbl);
                }}
                onReserveTable={async (tbl) => {
                    setSheetTable(null);
                    kravy.click();
                    toast.success(`Table ${tbl.name} marked as Reserved! 📅`);
                }}
            />

            {/* ══════════════════════════════════════
                5-SECOND UNDO TOAST NOTIFICATION
            ══════════════════════════════════════ */}
            <AnimatePresence>
                {undoToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] min-w-[280px] max-w-sm bg-[#1F2937] text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 pt-3 pb-3.5 flex items-center justify-between gap-3 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="text-[12px] font-[600] truncate">{undoToast.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                const onUndoFn = undoToast.onUndo;
                                setUndoToast(null);
                                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                                await onUndoFn();
                            }}
                            className="px-3 py-1 rounded-xl bg-[#635BFF] hover:bg-[#5249e0] text-white text-[11px] font-[800] uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-sm"
                        >
                            Undo
                        </button>
                        {/* 5-second animated progress line */}
                        <div className="absolute left-3 right-3 bottom-0.5 h-[2px] bg-white/70 rounded-full undo-progress-line pointer-events-none" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════
                DRAG-TO-TRANSFER TILTED FLOATING GHOST
            ══════════════════════════════════════ */}
            {dragActiveTable && dragGhostPos && (
                <div
                    className="table-ghost-card rounded-[14px] bg-[#FFF7D6] dark:bg-amber-950/90 border-2 border-[#F59E0B] p-2.5 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]"
                    style={{
                        width: `${dragGhostPos.width}px`,
                        height: `${dragGhostPos.height}px`,
                        left: `${dragGhostPos.x - dragGhostPos.width / 2}px`,
                        top: `${dragGhostPos.y - dragGhostPos.height / 2}px`,
                        transform: `rotate(${Math.max(-8, Math.min(8, dragGhostPos.dx / 10))}deg) scale(1.08)`,
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Moving...</span>
                    </div>
                    <div className="text-center font-[800] text-lg text-slate-900 dark:text-white">
                        {dragActiveTable.name}
                    </div>
                    <div className="text-center text-xs font-[800] text-amber-900 dark:text-amber-200">
                        {sym}{(Number(dragActiveTable.activeAmount) || 0).toFixed(2)}
                    </div>
                </div>
            )}

        </div>
    );

    async function addItemToOrder(menuItem: any) {
        console.log("[DEBUG] addItemToOrder started. MenuItem:", menuItem);
        if (!orderToUpdate) {
            console.error("[ERROR] No order selected to update!");
            toast.error("Please select an order first");
            return;
        }

        try {
            console.log("[DEBUG] Current Order to update:", orderToUpdate);
            const newItem: OrderItem = {
                itemId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1,
                isVeg: menuItem.isVeg,
                isNew: true,
                taxStatus: menuItem.taxStatus || "Without Tax",
                gst: menuItem.gst ?? 0
            };

            const updatedItems = [...orderToUpdate.items, newItem];
            console.log("[DEBUG] Updated items list:", updatedItems);

            const { total: newTotal } = calculateOrderTotals(updatedItems, isTaxEnabled, globalRate, perProductEnabled, business);
            console.log("[DEBUG] Calculated new total:", newTotal);

            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: orderToUpdate.id,
                    items: updatedItems,
                    total: newTotal
                })
            });

            console.log("[DEBUG] API Response Status:", res.status);
            if (res.ok) {
                const updatedOrderData = await res.json().catch(() => null);
                toast.success(`Added ${menuItem.name} to order`);
                console.log("[SUCCESS] Item added. Refreshing data...");
                fetchData(false, true); // ✅ Force refresh
                emitUpdate(updatedOrderData ? { order: updatedOrderData } : undefined); // ✅ Notify KDS immediately
                setShowAddItemModal(false);
                setItemSearch("");
            } else {
                const errData = await res.json();
                console.error("[ERROR] API Failure:", errData);
                toast.error(errData.error || errData.message || "Failed to add item");
            }
        } catch (err) {
            console.error("[CRITICAL] addItemToOrder caught error:", err);
            toast.error("An error occurred while adding item");
        }
    }
}
export default function WorkflowPage() {
    const { currencySymbol: sym } = useCurrency();
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center font-black uppercase tracking-[0.2em] animate-pulse">Loading Workflow...</div>}>
            <KravyPOS />
        </Suspense>
    );
}

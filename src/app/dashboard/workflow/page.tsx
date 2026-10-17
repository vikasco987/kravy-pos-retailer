"use client";
import { useCurrency } from '@/lib/currency-context';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSidebar } from "@/components/SidebarContext";
import { toast } from "sonner";
import { kravy } from "@/lib/sounds";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import {
    LayoutDashboard, ChefHat, MapPin, CreditCard,
    Clock, Bell, TrendingUp, ArrowRight, Check,
    Flame, UtensilsCrossed, Plus, Trash2, Eye,
    Printer, X, Filter, Search, User, ChevronRight,
    Edit3, LogOut, Table as TableIcon, History,
    RotateCcw, MoreHorizontal, Zap, Star, ShieldCheck, Layers, CheckCircle2,
    Wifi, Battery, Signal, Smartphone, Timer, AlertTriangle, ChevronUp, Package2,
    Terminal as TerminalIcon, LayoutGrid, ListTodo, ZoomIn, ZoomOut, Phone, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
    DndContext, 
    useSensor, 
    useSensors, 
    PointerSensor, 
    DragEndEvent,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useAuthContext } from "@/components/AuthContext";
import { useConfirm } from "@/components/ConfirmContext";
import { useSocket } from "@/components/SocketContext";
import { useProfileCache } from "@/hooks/useProfileCache";


// --- TYPES ---
type OrderItem = {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
    isVeg?: boolean;
    isNew?: boolean;
    instruction?: string;
    variants?: any[];
    taxStatus?: string;
    gst?: number;
    qty?: number;
    rate?: number;
};

type Order = {
    id: string;
    items: OrderItem[];
    total: number;
    status: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED";
    table?: { id: string; name: string };
    customerName?: string;
    customerPhone?: string;
    createdAt: string;
    caseType?: string;
    parentOrderId?: string;
    isMerged?: boolean;
    isKotPrinted?: boolean;
    customerAddress?: string;
    updatedAt: string;
    notes?: string;
    discountAmount?: number;
    deliveryCharges?: number;
    packagingCharges?: number;
    serviceCharge?: number;
    preferences?: {
        dontSendCutlery?: boolean;
    };
    isDeleted?: boolean;
    zoneName?: string;
    isBillPrinted?: boolean;
    tokenNumber?: string | number;
    kotNumbers?: string[];
    billNumber?: string;
};

type TableStatus = {
    id: string;
    name: string;
    isOccupied: boolean;
    activeOrderId?: string;
    status: "FREE" | "PENDING" | "ACCEPTED" | "PREPARING" | "READY";
    activeCount: number;
};

const TABS = [
    { key: "live-orders", label: "Live Orders", icon: ChefHat },
    { key: "dashboard", label: "Terminal", icon: LayoutDashboard },
    { key: "kitchen", label: "Kitchen", icon: ChefHat },
    { key: "payment", label: "Cashier", icon: CreditCard },
    { key: "track", label: "Tracking", icon: MapPin },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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

// --- DND HELPERS ---
const DraggableOrderCard = ({ children, id, order }: any) => {
  const { confirm } = useConfirm();
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: { order }
    });
    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 1,
        position: 'relative' as any,
    };
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
            {children}
        </div>
    );
};

const DroppableColumn = ({ children, id, className, isOverStyle }: any) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`${className} ${isOver ? isOverStyle : ""}`}>
            {children}
        </div>
    );
};

export default function KravyPOS() {
  const { currencySymbol: sym } = useCurrency();
    const receiptRef = useRef<HTMLDivElement | null>(null);
    const billReceiptRef = useRef<HTMLDivElement | null>(null);
    const kotReceiptRef = useRef<HTMLDivElement | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>("live-orders");
    const [liveOrderTab, setLiveOrderTab] = useState<"PREPARING" | "READY" | "COMPLETED">("PREPARING");
    const [liveOrderSearch, setLiveOrderSearch] = useState("");
    const [orders, setOrders] = useState<Order[]>([]);
    const [tablesList, setTablesList] = useState<TableStatus[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [payMethod, setPayMethod] = useState("upi");
    const [tableSearch, setTableSearch] = useState("");
    const { user: authUser } = useAuthContext();
    const userRole = authUser?.type || null;
    const userPermissions = authUser?.permissions || [];
    const [tableFilter, setTableFilter] = useState<"ALL" | "RUNNING" | "READY">("ALL");
    const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);
    const [selectedParty, setSelectedParty] = useState<any>(null);
    const [clock, setClock] = useState("");
    const [dateStr, setDateStr] = useState("");
    
    const { profile: business } = useProfileCache();
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => {
            console.log("Realtime update received in workflow");
            fetchData();
        };
        socket.on("dashboard_update", handleUpdate);
        return () => {
            socket.off("dashboard_update", handleUpdate);
        };
    }, [socket]);

    const emitUpdate = (customData?: any) => {
        if (socket && isConnected && business?.id) {
            socket.emit("pos_update", { businessId: business.id, timestamp: Date.now(), ...(customData || {}) });
        }
    };
    
    const selectedTable = tablesList.find(t => t.id === selectedTableId);
    const activeOrderForSelected = orders.find(o => o.id === selectedTable?.activeOrderId);

    const isTaxEnabled = business?.taxEnabled ?? true;
    const taxRate = 0;

    // Dynamic Totals Calculation
    const businessDetails = business;
    const activeOrderTotals = activeOrderForSelected 
        ? calculateWorkflowTotals(activeOrderForSelected.items, businessDetails, activeOrderForSelected)
        : { subtotal: 0, taxableSubtotal: 0, totalGst: 0, grandTotal: 0 };
    
    const subtotalCost = activeOrderTotals.subtotal;
    const calculatedGst = activeOrderTotals.totalGst;
    const grandTotal = activeOrderTotals.grandTotal;
    
    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const res = await fetch("/api/items");
            if (res.ok) {
                const data = await res.json();
                setMenuItems(data);
            }
        } catch (err) {
            console.error("Failed to fetch menu:", err);
        }
    };
    const [printMode, setPrintMode] = useState<"KOT" | "BILL" | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState<"KOT" | "BILL">("BILL");
    const [previewZoom, setPreviewZoom] = useState(1);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [printTable, setPrintTable] = useState<TableStatus | null>(null);
    const printRequestIdRef = useRef<number>(0);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [selectedItemForAdd, setSelectedItemForAdd] = useState<any>(null);
    const [addQty, setAddQty] = useState(1);

    // Manual Combination States
    const [showCombineModal, setShowCombineModal] = useState(false);
    const [combineSelection, setCombineSelection] = useState<Set<string>>(new Set());

    const handlePrint = async (type: "KOT" | "BILL" | "COMBINED_BILL" | "MANUAL_COMBINE", customOrder?: Order, customTable?: TableStatus) => {
        kravy.click();
        
        const currentRequestId = ++printRequestIdRef.current;

        let targetOrder = customOrder || printOrder || activeOrderForSelected;
        let targetTable = customTable || printTable || selectedTable;

        if (type === "COMBINED_BILL" && targetOrder) {
            if (targetOrder.id.includes("Combined")) {
                setPrintOrder(targetOrder);
            } else {
                try {
                    const res = await fetch(`/api/public/orders/${targetOrder.id}/combined-bill`);
                    if (!res.ok) {
                        toast.error("Failed to fetch combined bill data. Server returned " + res.status);
                        console.error("Combined bill fetch failed with status:", res.status);
                        return;
                    }
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
                    toast.error("Failed to parse combined bill data.");
                    return;
                }
            }
        } else if (type === "MANUAL_COMBINE") {
            const selectedOrders = orders.filter(o => combineSelection.has(o.id));
            if (selectedOrders.length === 0) return;

            const mergedItems = selectedOrders.flatMap(o => o.items);
            const totalDiscount = selectedOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
            const totalDelivery = selectedOrders.reduce((sum, o) => sum + (o.deliveryCharges || 0), 0);
            const totalPackaging = selectedOrders.reduce((sum, o) => sum + (o.packagingCharges || 0), 0);
            const totalService = selectedOrders.reduce((sum, o) => sum + (o.serviceCharge || 0), 0);
            const totals = calculateWorkflowTotals(mergedItems, business, { discountAmount: totalDiscount, deliveryCharges: totalDelivery, packagingCharges: totalPackaging, serviceCharge: totalService } as any);
            const subtotal = totals.subtotal;
            const gst = totals.totalGst;
            const total = totals.grandTotal;

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
            if (customOrder) setPrintOrder(customOrder);
            if (customTable) setPrintTable(customTable);
        }

        // Wait for state update
        console.log(`[PRINT] Starting ${type} flow...`);
        console.log(`[PRINT] Context: Order=${targetOrder?.id}, Table=${targetTable?.name || "None"}`);


            const isBill = type === "BILL" || type === "COMBINED_BILL" || type === "MANUAL_COMBINE";
            const autoBoth = isBill && business?.enableKOTWithBill && type !== "MANUAL_COMBINE" && type !== "COMBINED_BILL";
            
            let printHTML = "";
            if (autoBoth) {
                const kotContent = kotReceiptRef.current?.innerHTML || "";
                const billContent = billReceiptRef.current?.innerHTML || "";
                printHTML = `
                    <div class="kot-section">${kotContent}</div>
                    <div style="border-top: 2px dashed #000; margin: 30px 0; position: relative;">
                        <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; font-size: 8px; font-weight: bold; text-transform: uppercase;">Final Bill Follows</span>
                    </div>
                    <div class="bill-section">${billContent}</div>
                `;
                console.log("[PRINT] Combined KOT + Bill triggered via Auto-Both setting");
            } else {
                const targetRef = (showPreview && previewMode === (isBill ? "BILL" : "KOT"))
                    ? receiptRef.current
                    : (isBill ? billReceiptRef.current : kotReceiptRef.current);
                
                if (!targetRef) {
                    console.error(`[PRINT ERROR] No DOM reference found for ${type}. Check if printer zone is rendered.`);
                    return;
                }
                printHTML = targetRef.innerHTML;
            }

            console.log(`[PRINT] Template Found. HTML size: ${printHTML.length} chars`);

            if (printHTML.length < 50) {
                console.warn(`[PRINT WARNING] Template seems empty or too small. Receipt might be blank.`);
            }

            // 🛡️ SANITIZATION: Clean up any old print templates/styles to prevent double-printing or styling overlap
            document.getElementById("print-receipt-container")?.remove();
            document.getElementById("print-receipt-style")?.remove();
            document.querySelectorAll("[id^='print-container-']").forEach(el => el.remove());
            document.querySelectorAll("[id^='print-style-']").forEach(el => el.remove());

            // --- RECURSIVE DOM POLLER FIX ---
            // --- RECURSIVE DOM POLLER FIX ---
            const checkAndPrint = async (attempts = 0) => {
                if (currentRequestId !== printRequestIdRef.current) {
                    console.log(`[PRINT WARNING] Print request ${currentRequestId} aborted because a new request (${printRequestIdRef.current}) started.`);
                    return;
                }

                let currentHtml = "";
                if (autoBoth) {
                    currentHtml = `
                        <div class="kot-section">${kotReceiptRef.current?.innerHTML || ""}</div>
                        <div style="border-top: 2px dashed #000; margin: 30px 0; position: relative;">
                            <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; font-size: 8px; font-weight: bold; text-transform: uppercase;">Final Bill Follows</span>
                        </div>
                        <div class="bill-section">${billReceiptRef.current?.innerHTML || ""}</div>
                    `;
                } else {
                    const targetRef = (showPreview && previewMode === (isBill ? "BILL" : "KOT"))
                        ? receiptRef.current
                        : (isBill ? billReceiptRef.current : kotReceiptRef.current);
                    currentHtml = targetRef?.innerHTML || "";
                }

                const expectedIdPart = targetOrder ? (targetOrder.status === "COMPLETED" ? "#B_N_PLACEHOLDER" : targetOrder.id.slice(-6).toUpperCase()) : "";
                
                if (type !== "MANUAL_COMBINE" && type !== "COMBINED_BILL" && targetOrder && currentHtml && currentHtml.length > 50 && !currentHtml.includes(expectedIdPart)) {
                    if (attempts < 20) {
                        setTimeout(() => checkAndPrint(attempts + 1), 50);
                        return;
                    } else {
                        console.warn(`[PRINT ABORTED] DOM did not sync to order ${targetOrder.id} within 1000ms. Stale bill printing prevented.`);
                        if (typeof toast !== 'undefined' && toast.error) {
                            toast.error("Receipt generation timeout. Stale bill printing prevented.");
                        }
                        setPrintOrder(null);

                        setPrintTable(null);
                        return;
                    }
                }

                printHTML = currentHtml;

                if (isBill && targetOrder?.status === "COMPLETED") {
                    try {
                        const res = await fetch(`/api/bill-manager/search-by-order?orderId=${targetOrder.id}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.billNumber) {
                                printHTML = printHTML.replace(/INV: #B_N_PLACEHOLDER/g, `INV: ${data.billNumber}`);
                            } else {
                                printHTML = printHTML.replace(/INV: #B_N_PLACEHOLDER/g, `INV: #${targetOrder.id.slice(-6).toUpperCase()}`);
                            }
                        } else {
                            printHTML = printHTML.replace(/INV: #B_N_PLACEHOLDER/g, `INV: #${targetOrder.id.slice(-6).toUpperCase()}`);
                        }
                    } catch (e) {
                        printHTML = printHTML.replace(/INV: #B_N_PLACEHOLDER/g, `INV: #${targetOrder.id.slice(-6).toUpperCase()}`);
                    }
                }

            // ✅ Read printSettings dynamically
            const ps = (business as any)?.printSettings || {};
            const is80 = ps.paperWidth === '80mm';
            const paperWidth = is80 ? '74mm' : '58mm';
            const paperBottomPadding = ps.paperBottomPadding !== undefined && ps.paperBottomPadding !== null ? `${ps.paperBottomPadding}px` : '80px';

            const fontFamilyVal = ps.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const kotFontFamilyVal = ps.kotFontFamily || '"Courier New", Courier, monospace';
            const fontWeightVal = ps.fontWeight || '';
            const kotFontWeightVal = ps.kotFontWeight || '';

            const getClamped = (val: any, def: number, min: number, max: number) => {
                if (val === undefined || val === null || val === '') return def;
                return Math.max(min, Math.min(max, Number(val)));
            };
            const rawBusinessNameSize = getClamped(ps.businessNameSize, 18, 14, 32);
            const finalBusinessNameSize = (() => {
                let size = rawBusinessNameSize;
                const nameLen = (business?.businessName || '').length;
                if (nameLen > 25) size -= 2;
                if (nameLen > 35) size -= 2;
                return Math.max(14, size);
            })();
            const finalAddressSize = (() => {
                let size = getClamped(ps.businessAddressSize, 11, 8, 16);
                const addrLen = (business?.businessAddress || '').length;
                if (addrLen > 60) size -= 1;
                if (addrLen > 100) size -= 1;
                return Math.max(8, size);
            })();
            const taglineSize = getClamped(ps.taglineSize, 11, 8, 14);
            const receiptTokenSize = getClamped(ps.receiptTokenSize, 28, 18, 40);
            const detailsFontSize = getClamped(ps.detailsFontSize, 10, 8, 14);
            const itemsFontSize = getClamped(ps.itemsFontSize, 11, 9, 18);
            const totalFontSize = getClamped(ps.totalFontSize, 13, 11, 24);
            const greetingFontSize = getClamped(ps.greetingFontSize, 12, 9, 18);
            const kotTokenSize = getClamped(ps.kotTokenSize, 16, 12, 28);
            const kotItemsFontSize = getClamped(ps.kotItemsFontSize, 11, 9, 40);
            const kotQtyFontSize = getClamped(ps.kotQtyFontSize, 14, 10, 40);

            const printStyles = `
                @media print {
                    html, body { 
                        height: auto !important; 
                        overflow: visible !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }
                    body > *:not(#print-receipt-container) { display: none !important; }
                    @page { 
                        margin: 0; 
                        size: ${is80 ? '80mm auto' : 'auto'}; 
                    }
                    #print-receipt-container {
                        display: block !important;
                        width: 100% !important;
                        max-width: ${paperWidth} !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 auto !important;
                        padding: ${is80 ? `2mm 6mm ${paperBottomPadding} 6mm` : `2mm 4% ${paperBottomPadding} 4%`} !important; 
                        background: #fff !important;
                        color: #000 !important;
                        position: relative !important;
                        box-sizing: border-box !important;
                    }

                    /* Receipt dynamic CSS vars */
                    #print-receipt-container.receipt-container-dynamic {
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
                    #print-receipt-container.receipt-container-dynamic,
                    #print-receipt-container.receipt-container-dynamic * {
                        font-family: var(--r-font-family) !important;
                    }

                    /* KOT dynamic CSS vars */
                    #print-receipt-container.kot-container-dynamic {
                        --k-font-family: ${kotFontFamilyVal};
                        --k-items-size: ${kotItemsFontSize}px;
                        --k-qty-size: ${kotQtyFontSize}px;
                        --k-token-size: ${kotTokenSize}px;
                        font-family: var(--k-font-family) !important;
                        font-size: var(--k-items-size) !important;
                    }
                    #print-receipt-container.kot-container-dynamic,
                    #print-receipt-container.kot-container-dynamic * {
                        font-family: var(--k-font-family) !important;
                    }

                    ${fontWeightVal ? `
                    #print-receipt-container.receipt-container-dynamic,
                    #print-receipt-container.receipt-container-dynamic * {
                        font-weight: ${fontWeightVal} !important;
                    }` : ''}

                    ${kotFontWeightVal ? `
                    #print-receipt-container.kot-container-dynamic,
                    #print-receipt-container.kot-container-dynamic * {
                        font-weight: ${kotFontWeightVal} !important;
                    }` : ''}

                    * { 
                        color: #000 !important; 
                        border-color: #000 !important; 
                        overflow: visible !important;
                        
                        
                    }
                    img { 
                        filter: grayscale(100%) contrast(300%) !important; 
                        max-width: 100% !important;
                        display: block !important;
                        margin: 0 auto !important;
                    }
                }
            `;

            const styleSheet = document.createElement("style");
            styleSheet.id = "print-receipt-style";
            styleSheet.textContent = printStyles;
            document.head.appendChild(styleSheet);

            const printContainer = document.createElement("div");
            printContainer.id = "print-receipt-container";
            const containerClass = isBill ? "receipt-container-dynamic" : "kot-container-dynamic";
            printContainer.className = containerClass;
            printContainer.innerHTML = printHTML;

            // Add physical bottom spacer for thermal feeds past cutter to prevent jamming
            const spacer = document.createElement("div");
            spacer.style.height = paperBottomPadding;
            spacer.style.minHeight = paperBottomPadding;
            spacer.style.display = "block";
            spacer.style.clear = "both";
            printContainer.appendChild(spacer);

            document.body.appendChild(printContainer);

            kravy.print();
            window.print();

            setTimeout(() => {
                if (document.head.contains(styleSheet)) document.head.removeChild(styleSheet);
                if (document.body.contains(printContainer)) document.body.removeChild(printContainer);
            }, 15000);

            if (targetOrder && type !== "MANUAL_COMBINE") {
                const body: any = { orderId: (targetOrder as any).id.includes("Combined") ? customOrder?.id || printOrder?.id : targetOrder.id };
                const autoBoth = isBill && business?.enableKOTWithBill && type !== "COMBINED_BILL";

                if (type === "KOT" || autoBoth) {
                    body.isKotPrinted = true;
                    // Auto transition PENDING/ACCEPTED -> PREPARING
                    if (targetOrder.status === "PENDING" || targetOrder.status === "ACCEPTED") {
                        body.status = "PREPARING";
                    }
                }
                if (isBill || autoBoth) {
                    body.isBillPrinted = true;
                    // Auto transition READY -> COMPLETED
                    if (targetOrder.status === "READY") {
                        body.status = "COMPLETED";
                    }
                }

                fetch("/api/orders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                }).then(() => {
                    emitUpdate();
                    if (body.status === "COMPLETED") {
                        handleCheckout(body.orderId, true);
                    } else {
                        fetchData();
                    }
                });
            }
        };

        checkAndPrint(0);
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
                emitUpdate();
                if (body.status === "COMPLETED") {
                    await handleCheckout(order.id, true);
                } else {
                    fetchData();
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

    const fetchData = async () => {
        try {
            const [ordersRes, tablesRes] = await Promise.all([
                fetch("/api/orders?limit=50"),
                fetch("/api/tables")
            ]);
            if (ordersRes.ok && tablesRes.ok) {
                const ordersData: Order[] = await ordersRes.json();
                const rawTables = await tablesRes.json();
                setOrders(ordersData);
                const processed = rawTables.map((t: any) => {
                    const tableOrders = ordersData.filter(o => o.table?.id === t.id && o.status !== "COMPLETED" && !o.isDeleted);
                    const liveOrder = tableOrders[0]; // Primary display order
                    let status: "FREE" | "PENDING" | "ACCEPTED" | "PREPARING" | "READY" = "FREE";
                    if (liveOrder) {
                        if (liveOrder.status === "PENDING") status = "PENDING";
                        else if (liveOrder.status === "ACCEPTED") status = "ACCEPTED";
                        else if (liveOrder.status === "PREPARING") status = "PREPARING";
                        else if (liveOrder.status === "READY") status = "READY";
                    }
                    return { id: t.id, name: t.name, isOccupied: !!liveOrder, activeOrderId: liveOrder?.id, status, activeCount: tableOrders.length };
                });
                setTablesList(processed);
            }
        } catch (err) { console.error("Polling failed", err); }
    };

    // Business profile is now handled by useProfileCache

    useEffect(() => {
        if (activeTab === "payment" && activeOrderForSelected?.customerPhone) {
            const fetchParty = async () => {
                try {
                    const res = await fetch(`/api/parties?phone=${activeOrderForSelected.customerPhone}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            setSelectedParty(data[0]);
                        } else {
                            setSelectedParty(null);
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


    const { manualSync, isSyncing } = useSmartPolling(fetchData, 15000, true);
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

            const res = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: newStatus }) });
            if (res.ok) {
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

                if (newStatus === "COMPLETED") {
                    await handleCheckout(orderId, true);
                } else {
                    fetchData();
                }
                emitUpdate();
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
                fetchData();
                emitUpdate();
            }
        } catch (err) {
            toast.error("Failed to delete order");
        }
    };

    const handleCheckout = async (targetOrderId: string, silent = false) => {
        const order = orders.find(o => o.id === targetOrderId);
        if (!order) return;

        const totals = calculateWorkflowTotals(order.items, business, order);
        const orderSubtotal = totals.subtotal;
        const orderGst = totals.totalGst;
        const orderTotal = totals.grandTotal;

        try {
            if (payMethod === "wallet") {
                if (!selectedParty) {
                    toast.error("Please link a customer to use Wallet payment");
                    return;
                }
                if ((selectedParty.walletBalance || 0) < orderTotal) {
                    toast.error("Insufficient wallet balance");
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

            const taxActive = business?.taxEnabled ?? true;
            const globalRate = 0;

            const billData = {
                orderId: order.id,
                items: order.items.map(it => ({
                    ...it,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    total: it.price * it.quantity,
                    gst: (it.gst === undefined || it.gst === null) ? (taxActive ? globalRate : 0) : it.gst,
                })),
                subtotal: totals.taxableSubtotal || orderSubtotal,
                tax: totals.totalGst,
                total: orderTotal,
                paymentMode: payMethod.toUpperCase(),
                paymentStatus: "Paid",
                customerName: order.customerName || "Walk-in Customer",
                customerPhone: order.customerPhone || null,
                customerAddress: order.customerAddress || null,
                tableName: order.table?.name || "Counter",
                zoneName: order.table?.name && order.table?.name !== "Counter" ? (tablesList.find((t: any) => t.name === order.table?.name) as any)?.zone : null,
                discountAmount: order.discountAmount || 0,
                deliveryCharges: order.deliveryCharges || 0,
                packagingCharges: order.packagingCharges || 0,
                serviceCharge: order.serviceCharge || 0,
                deliveryGst: ((order.deliveryCharges || 0) > 0 && business?.deliveryGstEnabled) ? ((order.deliveryCharges || 0) * (business?.deliveryGstRate || 0) / 100) : 0,
                packagingGst: ((order.packagingCharges || 0) > 0 && business?.packagingGstEnabled) ? ((order.packagingCharges || 0) * (business?.packagingGstRate || 0) / 100) : 0,
                amountPaid: orderTotal,
                currencySymbol: business?.currencySymbol || sym,
                profileId: business?.id,
            };
            const p1 = fetch("/api/bill-manager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData) });
            const p2 = order.status !== "COMPLETED" 
                ? fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: targetOrderId, status: "COMPLETED", skipInventoryDeduction: true }) })
                : Promise.resolve({ ok: true });

            const [res1, res2] = await Promise.all([p1, p2]);
            if (!res1.ok) throw new Error("fail");

            if (!silent) {
                kravy.payment();
                toast.success("Transaction Finalized! 💰");
                setSelectedTableId(null);
                setActiveTab("dashboard");
            }
            fetchData();
        } catch {
            if (!silent) {
                kravy.error();
                toast.error("Checkout failed");
            }
        }
    };


    const upiLink = business?.upi ? `upi://pay?pa=${business.upi}&pn=${encodeURIComponent(business.businessName || "Store")}&am=${grandTotal.toFixed(2)}&cu=INR` : "";
    const qrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}` : "";
    const filteredTables = useMemo(() => tablesList.filter(t => {
        const searchLower = tableSearch.toLowerCase();
        const matchSearch = (() => {
            if (!searchLower) return true;
            if (t.name.toLowerCase().includes(searchLower)) return true;
            const tableOrders = orders.filter(o => o.table?.id === t.id && o.status !== "COMPLETED" && !o.isDeleted);
            return tableOrders.some(o => 
                o.id.toLowerCase().includes(searchLower) ||
                (o.customerName && o.customerName.toLowerCase().includes(searchLower)) ||
                (o.zoneName && o.zoneName.toLowerCase().includes(searchLower)) ||
                (o.notes && o.notes.toLowerCase().includes(searchLower))
            );
        })();
        const matchFilter = tableFilter === "ALL" || (tableFilter === "RUNNING" && t.status === "PREPARING") || (tableFilter === "READY" && t.status === "READY");
        return matchSearch && matchFilter;
    }), [tablesList, tableSearch, tableFilter, orders]);

    const stats = {
        running: orders.filter(o => o.status === "PREPARING" && !o.isDeleted).length,
        pending: orders.filter(o => (o.status === "PENDING" || o.status === "ACCEPTED") && !o.isDeleted).length, // Total active queue
        incoming: orders.filter(o => o.status === "PENDING" && !o.isDeleted).length, // Just new ones
        ready: orders.filter(o => o.status === "READY" && !o.isDeleted).length,
        sales: orders.filter(o => o.status === "COMPLETED" && !o.isDeleted).reduce((s, o) => s + o.total, 0)
    };

    const statusConfig = {
        FREE: { bg: "bg-slate-50", text: "text-slate-400", dot: "bg-slate-300", ring: "ring-slate-100", label: "Vacant", btn: "bg-slate-900" },
        PENDING: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", ring: "ring-rose-200", label: "Reviewing", btn: "bg-rose-600 hover:bg-rose-700" },
        ACCEPTED: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", ring: "ring-amber-200", label: "Accepted", btn: "bg-amber-600 hover:bg-amber-700" },
        PREPARING: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", ring: "ring-indigo-200", label: "Preparing", btn: "bg-indigo-600 hover:bg-indigo-700" },
        READY: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200", label: "Serve Now", btn: "bg-emerald-600 hover:bg-emerald-700" }
    };

    // Helper: Aggregate items for Chef
    const productionSummary = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.filter(o => (o.status === "PENDING" || o.status === "PREPARING") && !o.isDeleted).forEach(o => {
            o.items.forEach(it => {
                counts[it.name] = (counts[it.name] || 0) + it.quantity;
            });
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
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
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
            <header className="flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 min-h-[64px] lg:h-[64px] shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-[50] py-3 lg:py-0 gap-4 lg:gap-8 transition-colors duration-300">
                {/* Brand & Mobile Actions */}
                <div className="flex items-center justify-between w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center font-mono text-lg font-bold text-white shadow-lg shadow-slate-900/20 flex-shrink-0">
                            <span>K</span>
                        </div>
                        <div>
                            <div className="text-base font-black text-slate-900 dark:text-white leading-none">Kravy <em className="text-rose-500 not-italic">POS</em></div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Management</div>
                        </div>
                    </div>

                    <div className="flex lg:hidden items-center gap-2">
                        <button className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400"><User size={14} /></button>
                        <button
                            onClick={async () => { kravy.click(); setActiveTab("dashboard"); }}
                            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                            New
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs (Scrollable on mobile) */}
                <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full lg:w-auto justify-start lg:justify-center -mx-4 px-4 lg:mx-0 lg:px-0">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.key;
                        let badgeCount = 0;
                        if (t.key === "live-orders") badgeCount = stats.pending + stats.running;
                        if (t.key === "kitchen") badgeCount = stats.pending + stats.running;
                        if (t.key === "payment") badgeCount = stats.ready;

                        return (
                            <button
                                key={t.key}
                                onClick={async () => { kravy.click(); setActiveTab(t.key); }}
                                className={`relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[11px] lg:text-xs font-bold transition-all whitespace-nowrap ${isActive ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                            >
                                <Icon size={14} />
                                <span>{t.label}</span>
                                {badgeCount > 0 && (
                                    <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ${t.key === "payment" ? "bg-blue-500" : "bg-rose-500"}`}>
                                        {badgeCount}
                                    </span>
                                )}
                                {isActive && <motion.div layoutId="nav-ind" className="absolute -bottom-[21px] lg:-bottom-[17px] left-3 right-3 h-0.5 bg-slate-900 dark:bg-white rounded-t-full" />}
                            </button>
                        );
                    })}
                </nav>

                {/* Right Controls (Hidden on mobile stats, shown buttons on desktop) */}
                <div className="hidden lg:flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={manualSync}
                            className={`flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-bold text-emerald-600 transition-all ${isSyncing ? "opacity-70" : "hover:bg-emerald-100 hover:scale-105"}`}
                        >
                            <div className={`w-1.5 h-1.5 bg-emerald-500 rounded-full ${isSyncing ? "animate-pulse" : ""}`} />
                            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                        </button>
                        <div className="text-right">
                            <div className="flex items-center">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] mr-2">Pulse:</span>
                                <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 leading-none">{clock}</div>
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">{dateStr}</div>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-3">
                        <button className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all"><User size={16} /></button>
                        <button
                            onClick={async () => { kravy.click(); setActiveTab("dashboard"); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={14} />
                            <span>New Order</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══ MAIN ═══ */}
            <main className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">

                    {/* ── LIVE ORDERS / QR MANAGER TAB ── */}
                    {activeTab === "live-orders" && (
                        <motion.div
                            key="live-orders"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
                        >
                            {/* Live Orders Sub-Header */}
                            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                    {(["PREPARING", "READY", "COMPLETED"] as const).map(tab => {
                                        const count = tab === "PREPARING"
                                            ? orders.filter(o => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status) && !o.isDeleted).length
                                            : tab === "READY"
                                                ? orders.filter(o => o.status === "READY" && !o.isDeleted).length
                                                : orders.filter(o => o.status === "COMPLETED" && !o.isDeleted).length;

                                        const isActive = liveOrderTab === tab;
                                        const label = tab === "PREPARING" ? "Preparing" : tab === "READY" ? "Ready" : "Picked up";

                                        return (
                                            <button
                                                key={tab}
                                                onClick={async () => { kravy.click(); setLiveOrderTab(tab); }}
                                                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 border ${isActive
                                                        ? "bg-[#EF6C00] text-white border-[#EF6C00] shadow-sm"
                                                        : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    }`}
                                            >
                                                {label} ({count})
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by the 4 digit order ID"
                                            className="w-full h-10 pl-11 pr-4 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                                            value={liveOrderSearch}
                                            onChange={e => setLiveOrderSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative group">
                                        <select className="h-10 px-4 pr-10 bg-white border border-slate-300 rounded-lg text-sm appearance-none focus:outline-none cursor-pointer">
                                            <option>Placed At</option>
                                        </select>
                                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-blue-600" />
                                    </div>
                                    <button onClick={fetchData} className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"><RotateCcw size={18} /></button>
                                </div>
                            </div>

                            {/* Orders Grid */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                                <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-8">
                                    {orders
                                        .filter(o => {
                                            const statusMatch = liveOrderTab === "PREPARING"
                                                ? ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)
                                                : o.status === liveOrderTab && !o.isDeleted;
                                            const searchMatch = !liveOrderSearch || o.id.toLowerCase().includes(liveOrderSearch.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(liveOrderSearch.toLowerCase()));
                                            return statusMatch && searchMatch && !o.isDeleted;
                                        })
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((order, idx) => (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[180px] hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all group w-full max-w-2xl lg:max-w-none mx-auto"
                                            >
                                                {/* Left Section: Info & Buttons */}
                                                <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">
                                                    <div className="bg-[#E8EAF6] dark:bg-indigo-900/30 text-[#3F51B5] dark:text-indigo-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">
                                                        QR ORDER - {order.caseType || "DINE-IN"}
                                                    </div>
                                                    <div className="p-4 flex-1 space-y-4">
                                                        <div>
                                                            <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{business?.businessName || "Terminal kitchen"}</h3>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{order.table?.name || "Counter"}</p>
                                                        </div>

                                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">ID: {order.id.slice(-4).toUpperCase()}</p>
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex gap-2">
                                                                <div className="flex-1 flex flex-col gap-1">
                                                                    <button
                                                                        onClick={async () => {
                                                                            const tbl = tablesList.find(t => t.id === order.table?.id);
                                                                            setPrintOrder(order);
                                                                            setPrintTable(tbl || null);
                                                                            setTimeout(() => handlePrint("KOT", order, tbl || undefined), 100);
                                                                        }}
                                                                        className="w-full h-8 rounded border border-blue-600 bg-white text-[10px] font-black uppercase text-blue-600 flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all font-mono"
                                                                    >
                                                                        <Printer size={12} /> KOT
                                                                    </button>
                                                                    <button onClick={async () => handleSaveAction("KOT", order)} className="text-[7px] font-black uppercase text-indigo-500 hover:underline tracking-tighter text-center">Save KOT</button>
                                                                </div>
                                                                <div className="flex-1 flex flex-col gap-1">
                                                                    <button
                                                                        onClick={async () => {
                                                                            const tbl = tablesList.find(t => t.id === order.table?.id);
                                                                            setPrintOrder(order);
                                                                            setPrintTable(tbl || null);
                                                                            setTimeout(() => handlePrint("BILL", order, tbl || undefined), 100);
                                                                        }}
                                                                        className="w-full h-8 rounded border border-emerald-600 bg-white text-[10px] font-black uppercase text-emerald-600 flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all font-mono"
                                                                    >
                                                                        <CreditCard size={12} /> Bill
                                                                    </button>
                                                                    <button onClick={async () => handleSaveAction("BILL", order)} className="text-[7px] font-black uppercase text-emerald-500 hover:underline tracking-tighter text-center">Save Bill</button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* COMBINED BILL ACTION */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setShowCombineModal(true);
                                                                setCombineSelection(new Set([order.id]));
                                                            }}
                                                            className="flex items-center justify-center gap-1.5 w-full h-10 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 text-[10px] font-black uppercase text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm italic"
                                                        >
                                                            <Layers size={14} /> Merge & Combine Bill
                                                        </button>

                                                        <div className="pt-2 border-t border-slate-100 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight truncate">{order.customerName || "WALK-IN"}</span>
                                                                <Phone size={12} className="text-slate-400" />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-500">{order.customerPhone || "No contact"}</p>
                                                            <p className="text-[10px] text-slate-400 leading-tight">1st order</p>
                                                            {order.customerAddress && (
                                                                <p className="text-[10px] font-bold text-blue-600 leading-tight border-l-2 border-blue-200 pl-2 mt-2 bg-blue-50/50 py-1">
                                                                    <MapPin size={10} className="inline mr-1" /> {order.customerAddress}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline">
                                                            <Clock size={10} /> Timeline
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle Section: Items & Status */}
                                                <div className="w-full flex-1 p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800" style={{ minWidth: 0 }}>
                                                    <div className={`flex items-center gap-2 mb-4 text-[11px] font-black uppercase tracking-wider ${order.preferences?.dontSendCutlery ? "text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100" : "text-emerald-600"}`}>
                                                        {order.preferences?.dontSendCutlery ? (
                                                            <>
                                                                <AlertTriangle size={12} />
                                                                Don't send cutlery
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 size={12} />
                                                                Send cutlery
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 space-y-3">
                                                        {order.items.map((it, i) => (
                                                            <div key={i} className="flex items-start justify-between group/item">
                                                                <div className="flex items-start gap-2 min-w-0">
                                                                    <div className={`mt-1 w-3 h-3 border border-slate-300 flex items-center justify-center shrink-0`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${it.isVeg === false ? "bg-rose-600" : "bg-emerald-600"}`} />
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                                            <span className="font-bold">{it.quantity} x</span> {it.name}
                                                                            {it.isNew && (
                                                                                <span className="ml-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter animate-pulse shadow-sm">NEW ITEM</span>
                                                                            )}
                                                                        </span>
                                                                        {it.variants && it.variants.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                {it.variants.map((v: any, idx: number) => (
                                                                                    <span key={idx} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-indigo-100 italic">
                                                                                        {v.option}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest truncate">{it.instruction || "Standard Prepared"}</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">{sym}{it.price * it.quantity}</span>
                                                            </div>
                                                        ))}
                                                        
                                                        <button 
                                                            onClick={async () => {
                                                                kravy.click();
                                                                setOrderToUpdate(order);
                                                                setShowAddItemModal(true);
                                                            }}
                                                            className="flex items-center gap-2 text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest mt-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 transition-all active:scale-95"
                                                        >
                                                            <Plus size={14} strokeWidth={3} /> Add More Items
                                                        </button>

                                                        {order.notes && (
                                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl flex gap-2.5 items-start">
                                                                <MessageSquare size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Global Instruction</p>
                                                                    <p className="text-[12px] font-bold text-blue-800 leading-tight italic">"{order.notes}"</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-6 pt-4 border-t border-slate-200 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase">Total Bill</span>
                                                                <span className="px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                                                                    {order.isBillPrinted ? "PAID" : "UNPAID"}
                                                                </span>
                                                                {order.isKotPrinted && (
                                                                    <span className="px-1.5 py-0.5 rounded border border-emerald-500 bg-emerald-500 text-[9px] font-black text-white uppercase flex items-center gap-1">
                                                                        <Check size={8} /> KOT Printed
                                                                    </span>
                                                                )}
                                                                {(order as any).paymentMode && (
                                                                    <span className="px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">
                                                                        {(order as any).paymentMode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{sym}{order.total}</span>
                                                        </div>

                                                        {liveOrderTab !== "COMPLETED" && (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-[11px]">
                                                                    <span className="text-slate-500 font-medium">
                                                                        {order.status === 'READY' ? 'Handover food in' : 'Preparing food'}
                                                                    </span>
                                                                    <span className="font-bold text-slate-700">
                                                                        {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m elapsed
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: "65%" }}
                                                                        className="h-full bg-emerald-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Section: Partner & Support */}
                                                <div className="w-full lg:w-72 p-6 flex flex-col justify-between gap-6">
                                                    <div className="space-y-4">
                                                        {order.status === "READY" ? (
                                                            <div className="p-3 border border-slate-200 rounded-lg flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                                    <User size={20} className="text-slate-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-slate-800">Server awaiting</p>
                                                                    <p className="text-[10px] text-blue-600 flex items-center gap-1 font-bold cursor-pointer">Call | OTP: 8381</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                                                    <ChefHat size={24} className="text-slate-300" />
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Incoming Workflow</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            disabled={updatingOrders.has(order.id)}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const nextStatus = order.status === "PENDING" ? "ACCEPTED" : order.status === "ACCEPTED" ? "PREPARING" : order.status === "PREPARING" ? "READY" : "COMPLETED";
                                                                updateOrderStatus(order.id, nextStatus);
                                                            }}
                                                            className={`w-full h-12 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg ${updatingOrders.has(order.id)
                                                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                    : (statusConfig[order.status as keyof typeof statusConfig]?.btn || "bg-slate-900") + " text-white"
                                                                }`}
                                                        >
                                                            {updatingOrders.has(order.id) ? (
                                                                <RotateCcw className="animate-spin" size={16} />
                                                            ) : (
                                                                <>
                                                                    {order.status === 'PENDING' && <><Check size={16} strokeWidth={3} /> Confirm Accept</>}
                                                                    {order.status === 'ACCEPTED' && <><Flame size={16} /> Start Cooking</>}
                                                                    {order.status === 'PREPARING' && <><Bell size={16} /> Mark as Ready</>}
                                                                    {order.status === 'READY' && <><CheckCircle2 size={16} /> Order Handover</>}
                                                                    {order.status === 'COMPLETED' && 'Done'}
                                                                </>
                                                            )}
                                                        </motion.button>
                                                        <div className="flex flex-col gap-2">
                                                            <button className="h-8 rounded border border-blue-600 text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all uppercase">
                                                                <MoreHorizontal size={14} /> Live order chat support
                                                            </button>
                                                            <button className="h-8 rounded border border-blue-600 text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all uppercase">
                                                                <User size={14} /> Order help
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}

                                    {orders.filter(o => {
                                        const statusMatch = liveOrderTab === "PREPARING"
                                            ? ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)
                                            : o.status === liveOrderTab && !o.isDeleted;
                                        return statusMatch && !o.isDeleted;
                                    }).length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center">
                                                <div className="w-24 h-24 bg-slate-200 rounded-[3rem] flex items-center justify-center text-slate-400 mb-8 shadow-inner"><Layers size={48} strokeWidth={1} /></div>
                                                <p className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">No Live Orders ({orders.length} in memory)</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">Safe and Sound. Everything is handled.</p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </motion.div>
                    )}


                    {/* ── TERMINAL TAB ── */}
                    {activeTab === "dashboard" && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col md:flex-row h-full gap-3 p-3 overflow-y-auto md:overflow-hidden"
                        >
                            {/* LEFT PANEL */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full md:w-[340px] shrink-0 flex flex-col overflow-hidden max-h-[500px] md:max-h-full transition-colors duration-300">
                                {/* Panel Header */}
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <Layers size={12} />
                                            Dining Tables
                                        </span>
                                        <button onClick={fetchData} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><RotateCcw size={13} /></button>
                                    </div>

                                    {/* Search */}
                                    <div className="relative mb-3">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search table..."
                                            className="w-full h-10 pl-9 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white dark:focus:bg-slate-900 dark:text-white transition-all"
                                            value={tableSearch}
                                            onChange={e => setTableSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Filter Pills */}
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                        {(["ALL", "RUNNING", "READY"] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={async () => { kravy.click(); setTableFilter(f); }}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${tableFilter === f ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/10" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tables Grid */}
                                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {filteredTables.map(t => {
                                            const cfg = statusConfig[t.status];
                                            const isActive = selectedTableId === t.id;
                                            return (
                                                <motion.button
                                                    layout
                                                    key={t.id}
                                                    onClick={async () => { kravy.click(); setSelectedTableId(t.id); }}
                                                    className={`relative group h-24 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all ${isActive ? "z-10" : ""}`}
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.96 }}
                                                >
                                                    <div className={`w-full flex-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all ${cfg.bg} ${cfg.text} ${isActive ? `border-slate-900 scale-105 shadow-xl` : "border-transparent"}`}>
                                                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-40">TAB</span>
                                                        <span className="text-xl font-black italic">
                                                            {t.name?.startsWith("T-") ? t.name.slice(2) : t.name}
                                                        </span>

                                                        {/* Active Order Count Badge */}
                                                        {t.activeCount > 0 && (
                                                            <div className="absolute -top-1 -right-1 flex items-center justify-center">
                                                                <div className="bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-300">
                                                                    {t.activeCount}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${cfg.text}`}>
                                                        <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />
                                                        {cfg.label}
                                                    </span>
                                                    {t.isOccupied && <span className="absolute inset-0 rounded-2xl ring-4 ring-slate-900/5 animate-pulse" />}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                    {filteredTables.length === 0 && (
                                        <div className="flex flex-col items-center justify-center opacity-30 mt-16 text-center">
                                            <TableIcon size={36} strokeWidth={1.2} />
                                            <p className="text-xs font-bold uppercase tracking-widest mt-4">Sab kuch khali hai!</p>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Footer */}
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-1">
                                        <div className="flex-1 text-center py-2 border-r border-slate-200 dark:border-slate-700">
                                            <span className="block text-[11px] font-black text-indigo-600 leading-none">{stats.running}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cooking</span>
                                        </div>
                                        <div className="flex-1 text-center py-2 border-r border-slate-200 dark:border-slate-700">
                                            <span className="block text-[11px] font-black text-amber-600 leading-none">{stats.pending}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Waiting</span>
                                        </div>
                                        <div className="flex-1 text-center py-2 border-r border-slate-200 dark:border-slate-700">
                                            <span className="block text-[11px] font-black text-emerald-600 leading-none">{stats.ready}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Done</span>
                                        </div>
                                        <div className="flex-1 text-center py-2">
                                            <span className="block text-[11px] font-black text-slate-900 dark:text-white leading-none">{sym}{stats.sales}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sales</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PANEL */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm transition-colors duration-300">
                                {selectedTable ? (
                                    <motion.div
                                        key={selectedTable.id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="h-full flex flex-col"
                                    >
                                        {/* Order Header */}
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors duration-300">
                                            <div className="flex items-center gap-4">
                                                <motion.div
                                                    initial={{ rotate: -10, scale: 0.8 }}
                                                    animate={{ rotate: 0, scale: 1 }}
                                                    className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center font-black italic shadow-lg shadow-slate-900/10"
                                                >
                                                    {selectedTable.name}
                                                </motion.div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                                            {activeOrderForSelected?.customerName || "Walk-in Customer"}
                                                        </h2>
                                                        {activeOrderForSelected?.customerPhone && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1 uppercase tracking-tighter">
                                                                <Smartphone size={10} />
                                                                {activeOrderForSelected.customerPhone}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">● Live</span>
                                                        {activeOrderForSelected?.isKotPrinted && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                                <Printer size={10} /> KOT PRINTED
                                                            </span>
                                                        )}
                                                        {activeOrderForSelected?.isBillPrinted && (
                                                            <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                                                <CreditCard size={10} /> BILL PRINTED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                                        <span className="flex items-center gap-1"><User size={11} /> 4 Guests</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="flex items-center gap-1"><ShieldCheck size={11} /> Rahul S.</span>
                                                        {activeOrderForSelected && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                                <span className="text-slate-900 dark:text-white">{activeOrderForSelected.items.length} items</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all"><MoreHorizontal size={18} /></button>
                                                <button className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all"><Edit3 size={16} /></button>
                                                <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-1" />
                                                <button className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all"><Plus size={14} /> Add Item</button>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
                                            {activeOrderForSelected ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-2 mb-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Zap size={11} /> Order Breakdown</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg">Kitchen Priority: HIGH</span>
                                                    </div>
                                                    {activeOrderForSelected.items.map((item, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.04 }}
                                                            className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${item.isVeg === false ? "bg-rose-50 border border-rose-100 text-rose-500" : "bg-emerald-50 border border-emerald-100 text-emerald-500"}`}>
                                                                    {item.isVeg === false ? "🍗" : "🥗"}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                        {sym}{item.price}
                                                                        {item.instruction && <span className="text-slate-900 ml-1.5 font-black border-l border-slate-200 pl-1.5 italic text-[9px] uppercase"> · {item.instruction}</span>}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                                                                    <button className="w-6 h-6 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors font-bold">−</button>
                                                                    <span className="w-4 text-center text-xs font-black italic">x{item.quantity}</span>
                                                                    <button className="w-6 h-6 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors font-bold">+</button>
                                                                </div>
                                                                <span className="w-16 text-right text-sm font-black italic text-slate-900">{sym}{item.price * item.quantity}</span>
                                                                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                                    <UtensilsCrossed size={64} strokeWidth={0.8} />
                                                    <p className="text-xs font-bold uppercase tracking-widest mt-6">Table selected. No active order.</p>
                                                    <button className="mt-4 h-11 px-6 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all">Start Dining Session</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                                            <div className="flex gap-4 mb-4">
                                                <div className="flex-1 bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm flex flex-col justify-between">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-3"><Clock size={11} /> Workflow</span>
                                                    <div className="flex gap-2">
                                                        {[
                                                            { s: "PREPARING", label: "Start Cooking", icon: <ChefHat size={13} />, active: activeOrderForSelected?.status === "PENDING" },
                                                            { s: "READY", label: "Mark Ready", icon: <Check size={13} />, active: activeOrderForSelected?.status === "PREPARING" },
                                                        ].map((btn, i) => (
                                                            <button
                                                                key={i}
                                                                disabled={!activeOrderForSelected || !btn.active}
                                                                onClick={async () => updateOrderStatus(activeOrderForSelected!.id, btn.s as Order["status"])}
                                                                className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${btn.active ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/10" : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 opacity-50 cursor-not-allowed"}`}
                                                            >
                                                                {btn.icon} {btn.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="w-[180px] bg-slate-900 text-white rounded-[1.5rem] p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-8 -mt-8 rounded-full blur-2xl" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Total Amount</span>
                                                    <strong className="text-3xl font-black italic tracking-tighter">{sym}{activeOrderForSelected?.total ?? "—"}</strong>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={async () => { setPreviewMode("KOT"); setShowPreview(true); }}
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900"
                                                    title="Preview KOT"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <button
                                                        onClick={async () => {
                                                            const tbl = tablesList.find(t => t.id === activeOrderForSelected?.table?.id);
                                                            if (activeOrderForSelected) {
                                                                setPrintOrder(activeOrderForSelected);
                                                                setPrintTable(tbl || null);
                                                                setTimeout(() => handlePrint("KOT", activeOrderForSelected, tbl || undefined), 100);
                                                            }
                                                        }}
                                                        className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white transition-all shadow-sm"
                                                    >
                                                        <Printer size={15} /> KOT
                                                    </button>
                                                    <button onClick={async () => activeOrderForSelected && handleSaveAction("KOT", activeOrderForSelected)} className="text-[7px] font-black uppercase text-indigo-500 hover:underline tracking-tighter text-center">Save KOT</button>
                                                </div>
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <button
                                                        onClick={async () => {
                                                            const tbl = tablesList.find(t => t.id === activeOrderForSelected?.table?.id);
                                                            if (activeOrderForSelected) {
                                                                setPrintOrder(activeOrderForSelected);
                                                                setPrintTable(tbl || null);
                                                                setTimeout(() => handlePrint("BILL", activeOrderForSelected, tbl || undefined), 100);
                                                            }
                                                        }}
                                                        className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white transition-all shadow-sm"
                                                    >
                                                        <CreditCard size={15} /> Bill
                                                    </button>
                                                    <button onClick={async () => activeOrderForSelected && handleSaveAction("BILL", activeOrderForSelected)} className="text-[7px] font-black uppercase text-emerald-500 hover:underline tracking-tighter text-center">Save Bill</button>
                                                </div>
                                                <button
                                                    disabled={!activeOrderForSelected}
                                                    onClick={async () => {
                                                        kravy.payment();
                                                        if (activeOrderForSelected && (activeOrderForSelected as any).paymentMode) {
                                                            const m = (activeOrderForSelected as any).paymentMode.toLowerCase();
                                                            if (m.includes("upi")) setPayMethod("upi");
                                                            else if (m.includes("cash")) setPayMethod("cash");
                                                            else if (m.includes("card")) setPayMethod("card");
                                                            else if (m.includes("counter")) setPayMethod("pay on counter");
                                                        }
                                                        setActiveTab("payment");
                                                    }}
                                                    className="flex-[2.5] h-14 rounded-2xl flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <CreditCard size={16} /> Proceed to Billing
                                                    <ArrowRight size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-12">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 shadow-inner">
                                            <TableIcon size={32} strokeWidth={1.2} />
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white mb-2">Select a Table</p>
                                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Click any table to view active orders</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── KITCHEN (KDS) TAB ── */}
                    {activeTab === "kitchen" && (
                        <motion.div
                            key="kitchen"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col p-5 gap-5 items-center"
                        >

                            <div className="flex-1 w-full overflow-x-auto pb-6 no-scrollbar px-4">
                                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                    <div className="flex flex-col md:flex-row gap-5 md:justify-center items-center md:items-start min-w-max h-full">
                                        {[
                                            { status: "PENDING", title: "Accept Order", emoji: "🛎️", next: "ACCEPTED", btnLabel: "Accept Order", color: "rose", bg: "bg-rose-500" },
                                            { status: "ACCEPTED", title: "New Orders", emoji: "🔔", next: "PREPARING", btnLabel: "Start Cooking", color: "blue", bg: "bg-blue-500" },
                                            { status: "PREPARING", title: "In Preparation", emoji: "🍳", next: "READY", btnLabel: "Mark Ready", color: "amber", bg: "bg-amber-500" },
                                            { status: "READY", title: "Ready to Serve", emoji: "✅", next: "COMPLETED", btnLabel: "Handed Over", color: "emerald", bg: "bg-emerald-500" },
                                        ].map(col => {
                                            const colOrders = orders.filter(o => o.status === col.status && !o.isDeleted);
                                            return (
                                                <DroppableColumn 
                                                    key={col.status} 
                                                    id={col.status} 
                                                    className="flex-shrink-0 w-full max-w-[340px] md:w-[320px] h-fit md:h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm transition-colors duration-300"
                                                    isOverStyle="ring-4 ring-indigo-500/20 bg-indigo-50/30"
                                                >
                                                    <div className="p-6 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="text-xl leading-none">{col.emoji}</span>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">{col.title}</span>
                                                        </div>
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black text-white shadow-lg ${col.bg}`}>{colOrders.length}</span>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                                        {colOrders.map(o => (
                                                            <DraggableOrderCard key={o.id} id={o.id} order={o}>
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.96 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all active:scale-98"
                                                                >
                                                        <div className="flex items-center justify-between mb-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-inner ${col.status === 'PENDING' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500' : col.status === 'ACCEPTED' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : col.status === 'PREPARING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500'}`}>{o.table?.name}</div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs font-black text-slate-900 dark:text-white">#{o.id.slice(-4).toUpperCase()}</p>
                                                                        {o.isKotPrinted && (
                                                                            <span className="text-indigo-500" title="KOT Printed">
                                                                                <Printer size={10} strokeWidth={3} />
                                                                            </span>
                                                                        )}
                                                                        {o.isBillPrinted && (
                                                                            <span className="text-rose-500" title="Bill Printed">
                                                                                <CreditCard size={10} strokeWidth={3} />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1 flex items-center gap-1">
                                                                        <Clock size={8} /> 5m ago
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[9px] font-black bg-slate-900 dark:bg-slate-800 text-white px-2.5 py-1 rounded-full">{o.items.length} items</span>
                                                        </div>
                                                        <div className="space-y-2 mb-6">
                                                            {o.items.map((it, idx) => (
                                                                <div key={idx} className="flex justify-between items-start gap-4">
                                                                    <div className="flex items-start gap-2 max-w-[80%]">
                                                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${it.isVeg === false ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} />
                                                                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase leading-snug">
                                                                            {it.name}
                                                                            {it.isNew && (
                                                                                <span className="ml-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">NEW</span>
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11px] font-black italic text-slate-400 dark:text-slate-500">×{it.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-col gap-2 mb-2">
                                                            <div className="flex gap-2">
                                                                <div className="flex-1 flex flex-col gap-1.5">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const tbl = tablesList.find(t => t.id === o.table?.id);
                                                                            setPrintOrder(o);
                                                                            setPrintTable(tbl || null);
                                                                            setTimeout(() => handlePrint("KOT", o, tbl || undefined), 100);
                                                                        }}
                                                                        className="w-full h-11 rounded-xl border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 hover:bg-indigo-50 transition-all shadow-sm"
                                                                    >
                                                                        <Printer size={14} /> KOT
                                                                    </button>
                                                                    <button onClick={async (e) => { e.stopPropagation(); handleSaveAction("KOT", o); }} className="text-[8px] font-black uppercase text-indigo-500 hover:underline tracking-tighter text-center">Save KOT</button>
                                                                </div>
                                                                <div className="flex-1 flex flex-col gap-1.5">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const tbl = tablesList.find(t => t.id === o.table?.id);
                                                                            setPrintOrder(o);
                                                                            setPrintTable(tbl || null);
                                                                            setTimeout(() => handlePrint("BILL", o, tbl || undefined), 10);
                                                                        }}
                                                                        className="w-full h-11 rounded-xl border-2 border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-900/10 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all shadow-sm"
                                                                    >
                                                                        <CreditCard size={14} /> BILL
                                                                    </button>
                                                                    <button onClick={async (e) => { e.stopPropagation(); handleSaveAction("BILL", o); }} className="text-[8px] font-black uppercase text-emerald-500 hover:underline tracking-tighter text-center">Save Bill</button>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    alert("[TC] Click registered. Opening Modal.");
                                                                    setShowCombineModal(true);
                                                                    setCombineSelection(new Set([o.id]));
                                                                }}
                                                                className="w-full h-10 rounded-xl border-2 border-dashed border-indigo-400 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all"
                                                            >
                                                                <Layers size={14} /> Merge & Combine Bill
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={async (e) => { e.stopPropagation(); updateOrderStatus(o.id, col.next as Order["status"]); }}
                                                            className={`w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg active:scale-95 ${col.status === 'PENDING' ? 'bg-rose-500 text-white shadow-rose-500/10' : col.status === 'ACCEPTED' ? 'bg-blue-500 text-white shadow-blue-500/10' : col.status === 'PREPARING' ? 'bg-amber-500 text-white shadow-amber-500/10' : 'bg-emerald-900 text-white shadow-emerald-900/10'}`}
                                                        >
                                                            {col.btnLabel}
                                                        </button>
                                                                </motion.div>
                                                            </DraggableOrderCard>
                                                        ))}
                                                        {colOrders.length === 0 && (
                                                            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                                                                <ChefHat size={48} strokeWidth={0.8} />
                                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-6">Chill Mode 😌</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </DroppableColumn>
                                            );
                                        })}
                                    </div>
                                </DndContext>
                            </div>
                        </motion.div>
                    )}

                    {/* ── CASHIER / BILLING TAB ── */}
                    {activeTab === "payment" && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto no-scrollbar"
                        >
                            {selectedTable && activeOrderForSelected ? (
                                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 max-w-6xl w-full h-full lg:h-auto overflow-visible">
                                    {/* Receipt column */}
                                    <div className="bg-white dark:bg-white shadow-2xl rounded-[2.5rem] p-8 flex flex-col border border-slate-100 relative overflow-hidden h-fit animate-in fade-in zoom-in-95 duration-500">
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900" />

                                        <div className="text-center pb-8 border-b border-dashed border-slate-200 mb-8 mt-4">
                                            <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 p-4 shadow-xl shadow-slate-900/10">
                                                <Printer size={32} strokeWidth={1.5} />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">
                                                {business?.businessName || "Kravy POS"}
                                            </h3>
                                            <div className="flex flex-col gap-1 mt-3">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Settlement</span>
                                                <div className="flex items-center justify-center gap-2 text-[11px] font-black text-slate-600">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">Table {selectedTable.name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">#{activeOrderForSelected.id.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto scrollbar-hide py-2">
                                            {activeOrderForSelected.items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between items-start group">
                                                    <div className="flex-1 pr-4">
                                                        <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{it.name}</p>
                                                        {it.variants && it.variants.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-1">
                                                                {it.variants.map((v: any, idx: number) => (
                                                                    <span key={idx} className="text-[8px] font-black text-indigo-500 uppercase italic">
                                                                        • {v.option}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] font-bold text-slate-400 tracking-tight uppercase">{it.quantity} × {sym}{it.price}</p>
                                                    </div>
                                                    <span className="text-xs font-black italic text-slate-900">{sym}{it.price * it.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-dashed border-slate-200 space-y-3">
                                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                <span>Subtotal</span>
                                                <span>{sym}{(activeOrderForSelected.total / 1.05).toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                <span>GST (5%)</span>
                                                <span>{sym}{(activeOrderForSelected.total - activeOrderForSelected.total / 1.05).toFixed(0)}</span>
                                            </div>
                                            {payMethod === "wallet" && (
                                                <div className="flex justify-between text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                                                    <span>Remaining Bal</span>
                                                    <span>{sym}{((selectedParty?.walletBalance || 0) - activeOrderForSelected.total).toFixed(0)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-slate-900">
                                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 italic">Bill Amount</span>
                                                <span className="text-3xl font-black italic tracking-tighter text-slate-900">{sym}{activeOrderForSelected.total}</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 text-center opacity-20 text-[9px] font-black uppercase tracking-[0.4em] italic">
                                            Trusted by Kravy
                                        </div>
                                    </div>

                                    {/* Payment Options */}
                                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white dark:border-slate-800 rounded-[3rem] p-8 lg:p-12 shadow-sm flex flex-col h-full animate-in slide-in-from-right-8 duration-700">
                                        <div className="mb-10">
                                            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic mb-2 leading-none uppercase">Checkout</h3>
                                            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Select Settlement Pipeline</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            {[
                                                { id: "upi", label: "UPI", emoji: "📱", desc: "Digital Payment", theme: "emerald" },
                                                { id: "cash", label: "Cash", emoji: "💵", desc: "Hard Currency", theme: "amber" },
                                                { id: "wallet", label: "Wallet", emoji: "💰", desc: `Bal: ₹${selectedParty?.walletBalance?.toFixed(0) || 0}`, theme: "indigo" },
                                                { id: "card", label: "Card", emoji: "💳", desc: "Swipe / Dip", theme: "slate" },
                                                { id: "pay on counter", label: "Counter", emoji: "🏪", desc: "Pay at counter", theme: "slate" },
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={async () => { kravy.click(); setPayMethod(m.id); }}
                                                    className={`relative flex flex-col items-start p-6 rounded-[2.5rem] border-2 transition-all group overflow-hidden ${payMethod === m.id ? "bg-white dark:bg-slate-800 border-slate-900 dark:border-white shadow-2xl -translate-y-1" : "bg-white/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700"}`}
                                                >
                                                    {payMethod === m.id && (
                                                        <motion.div layoutId="pay-marker" className="absolute top-5 right-5 text-slate-900 dark:text-white">
                                                            <CheckCircle2 size={24} />
                                                        </motion.div>
                                                    )}
                                                    <span className="text-4xl mb-5 grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110">{m.emoji}</span>
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">{m.label}</span>
                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1.5 leading-none">{m.desc}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="bg-white/60 dark:bg-slate-800/60 rounded-[2.5rem] border border-white/80 dark:border-slate-700 shadow-inner p-8 mb-8 flex-1 flex flex-col justify-center min-h-[160px]">
                                            {payMethod === "upi" ? (
                                                <div className="flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4">
                                                    <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-indigo-500/10 border border-slate-50 dark:border-slate-600">📱</div>
                                                    <div>
                                                        <p className="text-xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight mb-2 italic">Scan to Pay {sym}{activeOrderForSelected.total}</p>
                                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Awaiting Digital Handshake...</p>
                                                        <div className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest italic">Live Sync Active</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center animate-in fade-in scale-95">
                                                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Handover {payMethod.toUpperCase()} Settlement</p>
                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Confirm once payment is physically received</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={async () => { setPreviewMode("BILL"); setShowPreview(true); }}
                                                className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white shadow-sm transition-all active:scale-90"
                                            >
                                                <Eye size={20} />
                                                <span className="text-[8px] font-black uppercase mt-1">Preview</span>
                                            </button>
                                            <button
                                                onClick={async () => handlePrint("BILL")}
                                                className="flex-1 h-20 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white shadow-sm transition-all active:scale-95"
                                            >
                                                <Printer size={18} /> Print Physical Receipt
                                            </button>
                                            <button
                                                onClick={async () => handleCheckout(activeOrderForSelected.id)}
                                                className="flex-[2.5] h-20 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.8rem] flex items-center justify-center gap-4 text-base font-black uppercase tracking-[0.15em] shadow-2xl shadow-slate-900/40 active:scale-95 transition-all hover:bg-slate-800 dark:hover:bg-slate-100"
                                            >
                                                Finalize Settlement <ArrowRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center max-w-sm opacity-30 animate-in fade-in zoom-in-95">
                                    <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-400 mb-8 border border-slate-200 shadow-inner">
                                        <CreditCard size={40} strokeWidth={1} />
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 mb-3 italic tracking-tighter uppercase leading-none">Billing Vault</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-10">Select an active table from Terminal to initiate checkout flow.</p>
                                    <button onClick={async () => setActiveTab("dashboard")} className="h-14 px-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-110 active:scale-90 transition-all">
                                        <LayoutDashboard size={16} className="mr-2 inline" /> Back to Terminal
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── TRACKING TAB ── */}
                    {activeTab === "track" && (
                        <motion.div
                            key="track"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
                        >
                            {/* Live Orders Sub-Header */}
                            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
                                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-inner">
                                    {(["PREPARING", "READY", "COMPLETED"] as const).map(tab => {
                                        const count = tab === "PREPARING"
                                            ? orders.filter(o => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status) && !o.isDeleted).length
                                            : tab === "READY"
                                                ? orders.filter(o => o.status === "READY" && !o.isDeleted).length
                                                : orders.filter(o => o.status === "COMPLETED" && !o.isDeleted).length;

                                        const isActive = liveOrderTab === tab;
                                        const label = tab === "PREPARING" ? "Preparing" : tab === "READY" ? "Ready" : "Past Bills";

                                        return (
                                            <button
                                                key={tab}
                                                onClick={async () => { kravy.click(); setLiveOrderTab(tab); }}
                                                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${isActive
                                                        ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20"
                                                        : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
                                                    }`}
                                            >
                                                {label} <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80">
                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search Order ID or Customer..."
                                            className="w-full h-12 pl-11 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400 font-bold"
                                            value={liveOrderSearch}
                                            onChange={e => setLiveOrderSearch(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        onClick={async () => { kravy.click(); fetchData(); }} 
                                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Orders Pipeline Table */}
                            <div className="flex-1 overflow-x-auto p-4 md:p-8">
                                <div className="max-w-full mx-auto bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Table</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order/Customer</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Items</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Time In</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Stage</th>
                                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {orders
                                                .filter(o => {
                                                    const statusMatch = liveOrderTab === "PREPARING"
                                                        ? ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)
                                                        : o.status === liveOrderTab && !o.isDeleted;
                                                    const searchMatch = !liveOrderSearch || o.id.toLowerCase().includes(liveOrderSearch.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(liveOrderSearch.toLowerCase()));
                                                    return statusMatch && searchMatch && !o.isDeleted;
                                                })
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .map((order) => {
                                                    const age = getOrderAge(order.createdAt);
                                                    return (
                                                        <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                                                            <td className="px-6 py-8">
                                                                <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center border border-rose-100 dark:border-rose-800 shadow-inner">
                                                                    <span className="text-xs font-black text-rose-600 uppercase italic tracking-tighter">{order.table?.name || "GUEST"}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8">
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none mb-1.5">{order.customerName || "WALK-IN GUEST"}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ORDER ID: #{order.id.slice(-6).toUpperCase()}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8">
                                                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                                    {order.items.map((it, i) => (
                                                                        <span key={i} className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                                            {it.quantity}X {it.name.toUpperCase()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8">
                                                                <p className="text-sm font-black text-slate-900 dark:text-white italic">{sym}{Math.round(order.total)}</p>
                                                            </td>
                                                            <td className="px-6 py-8">
                                                                <div>
                                                                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${age.alert ? "text-rose-500 animate-pulse" : "text-slate-400"}`}>
                                                                        <Clock size={12} />
                                                                        {age.alert ? "DELAYED" : "FRESH"}
                                                                    </div>
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8 text-center">
                                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                                    order.status === "READY" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                    order.status === "PREPARING" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                    order.status === "COMPLETED" ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                                                                    "bg-rose-50 text-rose-600 border-rose-200"
                                                                }`}>
                                                                    • {order.status === "PENDING" ? "PENDING" : order.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-8 text-right">
                                                                <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                                    <button
                                                                        onClick={async () => {
                                                                            setPrintOrder(order);
                                                                            handlePrint("KOT", order);
                                                                        }}
                                                                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                        title="Print KOT"
                                                                    >
                                                                        <Printer size={16} />
                                                                    </button>
                                                                    
                                                                    {order.status === "COMPLETED" && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                setPrintOrder(order);
                                                                                handlePrint("BILL", order);
                                                                            }}
                                                                            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                            title="Print Final Bill"
                                                                        >
                                                                            <CreditCard size={16} />
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        onClick={async () => {
                                                                            setOrderToUpdate(order);
                                                                            setShowAddItemModal(true);
                                                                        }}
                                                                        className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                        title="Edit / Add Items"
                                                                    >
                                                                        <Edit3 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => softDeleteOrder(order.id)}
                                                                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                        title="Delete Order"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                    {order.status !== "COMPLETED" && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (order.status === "PENDING" || order.status === "ACCEPTED") updateOrderStatus(order.id, "PREPARING");
                                                                                else if (order.status === "PREPARING") updateOrderStatus(order.id, "READY");
                                                                                else if (order.status === "READY") updateOrderStatus(order.id, "COMPLETED");
                                                                            }}
                                                                            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                                                                            title="Next Stage"
                                                                        >
                                                                            <ArrowRight size={18} strokeWidth={3} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* ═══ PREVIEW MODAL ═══ */}
            <AnimatePresence>
                {showPreview && selectedTable && activeOrderForSelected && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={async () => setShowPreview(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-[500px] h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{previewMode === "BILL" ? "Bill Preview" : "KOT Preview"}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Check before printing</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={async () => setPreviewZoom(z => Math.max(0.5, z - 0.1))} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ZoomOut size={14} /></button>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-9 text-center">{(previewZoom * 100).toFixed(0)}%</span>
                                    <button onClick={async () => setPreviewZoom(z => Math.min(2, z + 0.1))} className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><ZoomIn size={14} /></button>
                                    <div className="w-px h-5 bg-slate-100 dark:bg-slate-800 mx-1" />
                                    <button onClick={async () => setShowPreview(false)} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className="flex-1 overflow-auto bg-slate-200/80 dark:bg-zinc-900 p-8 flex flex-col items-center shadow-inner">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    ref={receiptRef}
                                    className="bg-white text-black p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] origin-top transition-all duration-300 mx-auto ring-1 ring-black/5"
                                    style={{
                                        width: '58mm',
                                        minHeight: '100px',
                                        transform: `scale(${previewZoom * 1.5})`,
                                        marginBottom: `${previewZoom * 120}px`
                                    }}
                                >
                                    {(() => {
                                        const targetO = printOrder || activeOrderForSelected;
                                        const targetT = printTable || selectedTable;
                                        if (!targetO || !targetT) return null;
                                        const totals = calculateWorkflowTotals(targetO.items, business, targetO);
                                        const sub = totals.subtotal;
                                        const gst = totals.totalGst;
                                        const total = totals.grandTotal;

                                        return getReceiptJSX(
                                            previewMode,
                                            business,
                                            targetO,
                                            targetT,
                                            sub,
                                            isTaxEnabled,
                                            taxRate,
                                            gst,
                                            total,
                                            payMethod,
                                            qrUrl
                                        );
                                    })()}
                                </motion.div>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3 shrink-0">
                                <button
                                    onClick={async () => setShowPreview(false)}
                                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={async () => {
                                        handlePrint(previewMode);
                                        setShowPreview(false);
                                    }}
                                    className="flex-[2] py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer size={16} /> Print Direct
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


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
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sym}{it.price}</p>
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

            {/* Hidden Printer Zone */}
            <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
                <div ref={billReceiptRef} style={{ width: '100%' }}>
                    {(() => {
                        const targetO = printOrder || activeOrderForSelected;
                        const targetT = printTable || selectedTable;
                        if (!targetO || !targetT) return null;
                        const totals = calculateWorkflowTotals(targetO.items, business, targetO);
                        const sub = totals.subtotal;
                        const gst = totals.totalGst;
                        const total = totals.grandTotal;
                        const predictedBalance = (payMethod.toLowerCase() === "wallet" && selectedParty) 
                            ? (selectedParty.walletBalance - total) 
                            : selectedParty?.walletBalance;
                        return getReceiptJSX("BILL", business, targetO, targetT, sub, isTaxEnabled, taxRate, gst, total, payMethod, qrUrl, predictedBalance);
                    })()}
                </div>
                <div ref={kotReceiptRef} style={{ width: '100%' }}>
                    {(() => {
                        const targetO = printOrder || activeOrderForSelected;
                        const targetT = printTable || selectedTable;
                        if (!targetO || !targetT) return null;
                        const totals = calculateWorkflowTotals(targetO.items, business, targetO);
                        const sub = totals.subtotal;
                        const gst = totals.totalGst;
                        const total = totals.grandTotal;
                        return getReceiptJSX("KOT", business, targetO, targetT, sub, isTaxEnabled, taxRate, gst, total, payMethod, qrUrl);
                    })()}
                </div>
            </div>

        </div>
    );

    function getReceiptJSX(
        mode: "BILL" | "KOT",
        business: any,
        activeOrder: Order | null | undefined,
        table: TableStatus | null | undefined,
        subtotal: number,
        taxEnabled: boolean,
        taxRate: number,
        gst: number,
        total: number,
        paymentMethod: string,
        qrCodeUrl: string,
        remainingBalance?: number
    ) {
        if (!activeOrder) return null;
        const displayTable = table || { name: activeOrder.table?.name || "Counter", id: "0" };

        if (mode === "BILL") {
            return (
                <div className="font-mono text-[10px] leading-tight text-black bg-white" style={{ width: '100%', paddingBottom: '15mm' }}>
                    {/* Header Section */}
                    <div className="text-center mb-2">
                        {business?.logoUrl && (
                            <div className="flex justify-center mb-1">
                                <img src={business.logoUrl} alt="Logo" className="max-h-[20mm] object-contain" style={{ filter: 'contrast(400%) grayscale(100%)' }} />
                            </div>
                        )}
                        <div className="font-black text-[16px] leading-none uppercase tracking-tight mb-1">{business?.businessName || "KRAVY RESTAURANT"}</div>
                        {(business?.businessAddress || business?.district) && (
                            <div className="text-[8px] font-black uppercase">
                                {business?.businessAddress} {business?.district && `| ${business.district}`}
                            </div>
                        )}
                        {business?.gstNumber && <div className="text-[9px] font-black border-y border-dotted border-black py-1 mt-1">GSTIN: {business.gstNumber}</div>}
                    </div>

                    {/* Order Details Section */}
                    <div className="flex justify-between text-[10px] font-black uppercase border-b border-dotted border-black pb-1 mb-1">
                        <span>{activeOrder?.status === "COMPLETED" ? "INV: #B_N_PLACEHOLDER" : `ORDER: #${activeOrder?.id.slice(-6).toUpperCase()}`}</span>
                        <span>{new Date(activeOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="border border-black border-dotted px-1">TABLE: {displayTable.name}</span>
                        <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {(activeOrder.customerName || activeOrder.customerPhone || activeOrder.customerAddress) && (
                        <div className="mb-1 text-[9px] font-black uppercase border-y border-dotted border-black py-0.5">
                            {activeOrder.customerName && <div className="truncate">CUST: {activeOrder.customerName}</div>}
                            {activeOrder.customerPhone && <div>PH: {activeOrder.customerPhone}</div>}
                            {activeOrder.customerAddress && <div className="mt-0.5" style={{ whiteSpace: 'pre-wrap' }}>ADDR: {activeOrder.customerAddress}</div>}
                        </div>
                    )}

                    {/* Items Section */}
                    <div className="flex justify-between font-black text-[10px] uppercase border-b border-dotted border-black py-1 mt-1 mb-1">
                        <span className="flex-1">ITEM NAME</span>
                        <span className="w-[8mm] text-center">QTY</span>
                        <span className="w-[15mm] text-right">TOTAL</span>
                    </div>

                    <div className="space-y-1">
                        {activeOrder?.items.map((it: any, idx: number) => {
                            const q = Number(it.quantity || it.qty || 0);
                            const p = Number(it.price || it.rate || 0);
                            return (
                            <div key={idx} className="flex justify-between text-[10px] font-black uppercase leading-tight border-b border-dotted border-black/20 pb-0.5">
                                <div className="flex-1 pr-1">
                                    <div className="truncate">{it.name}</div>
                                    <div className="text-[8px] opacity-70">{q} x {p.toFixed(2)}</div>
                                </div>
                                <span className="w-[8mm] text-center self-start pt-0.5">x{q}</span>
                                <span className="w-[15mm] text-right self-start pt-0.5">{(q * p).toFixed(2)}</span>
                            </div>
                        )})}
                    </div>

                    {/* Totals Section */}
                    <div className="mt-1 pt-1 space-y-0.5">
                        <div className="flex justify-between text-[10px] font-black">
                            <span>SUBTOTAL</span>
                            <span>{sym}{subtotal.toFixed(2)}</span>
                        </div>
                        {taxEnabled && (
                            <div className="flex justify-between text-[9px] font-black">
                                <span>GST ({taxRate}%)</span>
                                <span>{sym}{gst.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-[16px] border-y-2 border-dotted border-black py-1.5 my-1 uppercase">
                            <span>GRAND TOTAL</span>
                            <span>{sym}{total.toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="mt-1 text-[8px] font-black uppercase italic leading-none">
                        RUPEES: {numberToWords(Math.round(total))}
                    </div>

                    <div className="mt-3 text-center">
                        <div className="inline-block border border-dotted border-black px-4 py-1 text-[11px] font-black uppercase">
                            PAID VIA {paymentMethod.toUpperCase()}
                        </div>
                        {paymentMethod.toLowerCase() === "wallet" && remainingBalance !== undefined && (
                            <div className="mt-1 text-[10px] font-black uppercase border-t border-dotted border-black pt-1">
                                Remaining Balance: {sym}{remainingBalance.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* UPI QR Section */}
                    {(business?.upi && business?.upiQrEnabled !== false) && (
                        <div className="mt-3 text-center border-t border-dotted border-black pt-2">
                            <div className="text-[9px] font-black mb-1.5 uppercase tracking-[0.2em]">Scan to Pay Instantly</div>
                            <div className="inline-block border-2 border-dotted border-black p-1 bg-white rounded">
                                <img src={qrCodeUrl} alt="UPI QR" className="w-[30mm] h-[30mm] object-contain" style={{ filter: 'contrast(400%) grayscale(100%)' }} />
                            </div>
                            <div className="text-[8px] font-black mt-1 tracking-widest">{business.upi}</div>
                        </div>
                    )}

                    {/* Footer Section */}
                    <div className="mt-3 text-center border-t border-dotted border-black pt-2">
                        <div className="text-[12px] font-black uppercase italic tracking-tighter">THANK YOU 🙏 VISIT AGAIN</div>
                        {business?.businessTagLine && <div className="text-[8px] font-black mt-0.5 uppercase tracking-widest">{business.businessTagLine}</div>}
                        <div className="text-[7px] font-black opacity-30 mt-2 uppercase tracking-[0.3em]">Powered by Kravy AI</div>
                        {/* Buffer space to prevent cutting */}
                        <div className="h-[5mm]" />
                    </div>
                </div>
            );
        } else { // KOT
            return (
                <div className="kravy-kot-print text-black font-mono bg-white text-[10px] leading-tight" style={{ width: '100%', paddingBottom: '25mm' }}>
                    <div className="text-center font-bold text-[14px] border-b border-dashed border-black pb-1 mb-2 uppercase tracking-tighter">*** KOT ***</div>
                    
                    <div className="space-y-0.5 mb-2">
                        <div className="flex justify-between items-center font-bold text-[10px]">
                            <span>TOKEN: #{activeOrder.id.slice(-4).toUpperCase()}</span>
                            <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-[10px]">
                            <span>TIME: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>KOT NO: {Math.floor(Date.now() / 1000).toString().slice(-4)}</span>
                        </div>
                    </div>

                    <div className="text-center text-[16px] font-bold border border-dashed border-black py-1 my-2 uppercase">
                        TABLE: {displayTable.name}
                    </div>

                    {activeOrder.customerAddress && (
                        <div className="mt-1 mb-2 p-1 border border-dashed border-black text-[10px] font-bold uppercase">
                            DELIVERY ADDR: {activeOrder.customerAddress}
                        </div>
                    )}

                    {activeOrder.notes && (
                        <div className="mt-1 mb-2 p-1 border border-dashed border-black text-[10px] font-bold uppercase italic">
                            NOTE: {activeOrder.notes}
                        </div>
                    )}

                    <div className="flex justify-between font-bold text-[10px] uppercase border-b border-dashed border-black pb-0.5 mb-1.5">
                        <span>ITEM DESCRIPTION</span>
                        <span>QTY</span>
                    </div>

                    <div className="space-y-2">
                        {activeOrder?.items.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between items-start border-b border-dotted border-black/20 pb-1.5">
                                <div className="flex-1 pr-2">
                                    <div className="text-[12px] font-bold leading-tight uppercase">{it.name}</div>
                                    {it.instruction && <div className="text-[9px] font-bold mt-0.5 uppercase">{"=>"} {it.instruction}</div>}
                                    {it.variants && it.variants.length > 0 && (
                                        <div className="text-[9px] font-medium mt-0.5 uppercase opacity-80">
                                            ({it.variants.map((v: any) => v.name).join(', ')})
                                        </div>
                                    )}
                                </div>
                                <div className="text-[14px] font-bold shrink-0 ml-2">x{it.quantity}</div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-5 pt-1.5 border-t border-dashed border-black">
                        <div className="text-[9px] font-bold uppercase tracking-widest mb-1">Kravy POS System</div>
                        <div className="text-[7px] font-medium">{new Date().toLocaleString('en-IN')}</div>
                        {/* Extended buffer for paper tearing */}
                        <div className="h-[20mm]" />
                        <div className="text-[7px] opacity-30 italic">... end of token ...</div>
                        <div className="h-[10mm]" />
                    </div>
                </div>
            );
        }
    }

    async function addItemToOrder(menuItem: any) {
        if (!orderToUpdate) return;
        
        try {
            const newItem: OrderItem = {
                itemId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1,
                isVeg: menuItem.isVeg,
                isNew: true
            };

            const updatedItems = [...orderToUpdate.items, newItem];
            const totals = calculateWorkflowTotals(updatedItems, business, activeOrderForSelected);
            const newTotal = totals.grandTotal;

            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: orderToUpdate.id,
                    items: updatedItems,
                    total: newTotal
                })
            });

            if (res.ok) {
                const updatedOrderData = await res.json().catch(() => null);
                toast.success(`Added ${menuItem.name} to order`);
                fetchData(); // Refresh orders
                emitUpdate(updatedOrderData ? { order: updatedOrderData } : undefined);
                setShowAddItemModal(false);
                setItemSearch("");
            } else {
                toast.error("Failed to add item");
            }
        } catch (err) {
            console.error("Add item error:", err);
            toast.error("An error occurred");
        }
    }
}

export function calculateWorkflowTotals(items: any[], business: any, order?: Order) {
    if (!items || !Array.isArray(items)) {
        return { subtotal: 0, taxableSubtotal: 0, totalGst: 0, grandTotal: 0 };
    }

    const taxEnabled = business?.taxEnabled ?? true;
    const globalRate = 0;
    const perProductEnabled = true;
    const globalTaxInclusive = false;

    const discountAmt = order?.discountAmount || 0;
    const deliveryCharge = order?.deliveryCharges || 0;
    const packagingCharge = order?.packagingCharges || 0;
    const serviceCharge = order?.serviceCharge || 0;

    let subtotal = 0;
    
    // 1. Calculate raw subtotal (respecting overriddenAmount like QuickPOS)
    items.forEach(item => {
        const qty = Number(item.quantity || item.qty || 0);
        const rate = Number(item.price || item.rate || 0);
        subtotal += (item.overriddenAmount ?? (qty * rate));
    });

    // 2. Pro-rata discount calculation
    const netSubtotal = subtotal - discountAmt;
    const discountRatio = subtotal > 0 ? netSubtotal / subtotal : 1;

    let totalTaxable = 0;
    let totalGst = 0;

    items.forEach(item => {
        const qty = Number(item.quantity || item.qty || 0);
        const rate = Number(item.price || item.rate || 0);
        const rawGross = (item.overriddenAmount ?? (qty * rate));
        const gross = rawGross * discountRatio; // apply pro-rata discount

        let itemTaxRate = 0;
        if (taxEnabled) {
            if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
                itemTaxRate = Number(item.gst);
            } else {
                itemTaxRate = Number(globalRate);
            }
        }

        let taxable = gross;
        let gst = 0;

        let isInclusive = false;
        if (taxEnabled) {
            if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
                isInclusive = item.taxStatus === "With Tax";
            } else {
                isInclusive = globalTaxInclusive;
            }
        }

        if (taxEnabled) {
            if (isInclusive) {
                taxable = gross / (1 + itemTaxRate / 100);
                gst = gross - taxable;
            } else {
                taxable = gross;
                gst = (gross * itemTaxRate) / 100;
            }
        }

        totalTaxable += taxable;
        totalGst += gst;
    });

    // 3. Tax on charges
    const deliveryGst = (deliveryCharge > 0 && business?.deliveryGstEnabled) ? (deliveryCharge * (business?.deliveryGstRate || 0) / 100) : 0;
    const packagingGst = (packagingCharge > 0 && business?.packagingGstEnabled) ? (packagingCharge * (business?.packagingGstRate || 0) / 100) : 0;

    const totalCharges = deliveryCharge + packagingCharge + serviceCharge;
    const totalChargesGst = deliveryGst + packagingGst;

    const finalTotal = totalTaxable + totalGst + totalCharges + totalChargesGst;

    return {
        subtotal: Number(subtotal.toFixed(2)),
        taxableSubtotal: Number(totalTaxable.toFixed(2)),
        totalGst: Number((totalGst + totalChargesGst).toFixed(2)),
        grandTotal: Number(finalTotal.toFixed(2))
    };
}

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import { useSocket } from "@/components/SocketContext";
import { kravy } from "@/lib/sounds";

export type OrderStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED";

export interface Order {
    id: string;
    orderNumber?: string;
    items: any[];
    total: number;
    status: OrderStatus;
    tableId?: string; // ✅ Added for fast lookups
    table?: { id: string; name: string };
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    createdAt: string;
    updatedAt?: string;
    isDeleted?: boolean;
    kotNumbers?: string[];
    billNumber?: string;
    tokenNumber?: string | number;
    caseType?: string;
    zoneName?: string;
    notes?: string;
    isBillPrinted?: boolean;
    isKotPrinted?: boolean;
    isMerged?: boolean;
    parentOrderId?: string;
    preferences?: any;
    deliveryCharges?: number;
    packagingCharges?: number;
}



export interface Table {
    id: string;
    name: string;
    status: "FREE" | "PENDING" | "ACCEPTED" | "PREPARING" | "READY";
    activeOrderId?: string;
    zone?: string;
    floor?: string;
    isOccupied?: boolean;
    activeCount?: number;
    startTime?: string;
}

interface TerminalContextType {
    tablesList: Table[];
    orders: Order[];
    ordersByTableId: Record<string, Order[]>; // Fast lookup map
    business: any;
    allProfiles: any[];
    enableMultipleProfiles: boolean;
    setSelectedProfileId: (id: string) => void;
    isLoading: boolean;
    lastUpdated: number | null;
    fetchData: (showLoading?: boolean, force?: boolean) => any;
    updateTableStatus: (tableId: string, updates: Partial<Table>) => void;
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    isSyncing: boolean;
    manualSync: () => void;
    emitUpdate: (customData?: any) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider = ({ children }: { children: React.ReactNode }) => {
    const [rawTables, setRawTables] = useState<Table[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [enableMultipleProfiles, setEnableMultipleProfiles] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const { socket, isConnected } = useSocket();

    const business = React.useMemo(() => {
        if (!allProfiles.length) return null;
        if (selectedProfileId) {
            const found = allProfiles.find(p => p.id === selectedProfileId);
            if (found) return found;
        }
        return allProfiles[0];
    }, [allProfiles, selectedProfileId]);

    // Stable references to prevent infinite callback recreation loops
    const lastUpdatedRef = React.useRef<number | null>(null);
    const rawTablesLengthRef = React.useRef<number>(0);
    const fetchPromiseRef = React.useRef<Promise<void> | null>(null);

    // Keep length ref in sync
    useEffect(() => {
        rawTablesLengthRef.current = rawTables.length;
    }, [rawTables.length]);

    // Group orders by table ID for fast lookup
    const ordersByTableId = React.useMemo(() => {
        const map: Record<string, Order[]> = {};
        orders.forEach(order => {
            if (order.tableId) {
                if (!map[order.tableId]) map[order.tableId] = [];
                map[order.tableId].push(order);
            }
        });
        return map;
    }, [orders]);

    // Reactively compute tablesList whenever orders or rawTables change
    const tablesList = React.useMemo(() => {
        return rawTables.map(table => {
            const tableOrders = (ordersByTableId[table.id] || []).filter(o => !o.isDeleted && o.status !== "COMPLETED");
            
            let status: Table["status"] = "FREE";
            if (tableOrders.some(o => o.status === "READY")) status = "READY";
            else if (tableOrders.some(o => o.status === "PREPARING")) status = "PREPARING";
            else if (tableOrders.some(o => o.status === "ACCEPTED")) status = "ACCEPTED";
            else if (tableOrders.some(o => o.status === "PENDING")) status = "PENDING";

            const activeCount = tableOrders.length;
            const sortedOrders = [...tableOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const startTime = sortedOrders.length > 0 ? sortedOrders[0].createdAt : undefined;
            const activeOrderId = tableOrders.length > 0 ? tableOrders[0].id : undefined;

            return { ...table, status, activeCount, startTime, activeOrderId };
        });
    }, [rawTables, ordersByTableId]);

    // ✅ Phase 2.2: Separate profiles fetch — profiles are static during a POS session
    const profilesLoadedRef = React.useRef<boolean>(false);

    const fetchProfiles = useCallback(async () => {
        try {
            const profilesRes = await fetch(`/api/profiles`, { cache: 'no-store' });
            if (profilesRes?.ok) {
                const pData = await profilesRes.json();
                if (pData.profiles && Array.isArray(pData.profiles)) {
                    setAllProfiles(pData.profiles);
                    setEnableMultipleProfiles(pData.enableMultipleProfiles || false);
                }
                profilesLoadedRef.current = true;
            }
        } catch (err) {
            console.error("Failed to fetch profiles:", err);
        }
    }, []);

    // Fetch profiles once on mount (not on every polling cycle)
    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const fetchData = useCallback(async (showLoading = true, force = false) => {
        const currentLastUpdated = lastUpdatedRef.current;
        // ✅ Stale-time logic: Avoid fetching if data is recent (< 30s) unless forced
        if (!force && currentLastUpdated && Date.now() - currentLastUpdated < 30000) {
            console.log("[TerminalContext] Data is fresh, skipping fetch");
            return;
        }

        // ✅ Deduplication logic: If a fetch is already in flight, wait for it instead of starting a new one
        if (fetchPromiseRef.current) {
            console.log("[TerminalContext] Fetch already in progress, awaiting existing promise");
            return fetchPromiseRef.current;
        }

        if (showLoading && rawTablesLengthRef.current === 0) setIsLoading(true);
        
        const fetchWork = async () => {
            try {
                // ✅ Phase 2.2: Only fetch tables + orders in the polling loop (profiles removed)
                // ✅ Phase 2.3: Use lightweight /api/tables/summary (only id, name, zone)
                const [tablesRes, ordersRes] = await Promise.all([
                fetch(`/api/tables/summary`, { cache: 'no-store' }).catch(() => null),
                fetch(`/api/orders/active-summary`, { cache: 'no-store' }).catch(() => null)
            ]);

            if (tablesRes?.ok) {
                const tData = await tablesRes.json();
                setRawTables(tData);
            }
            if (ordersRes?.ok) {
                const oData = await ordersRes.json();
                setOrders(prevOrders => {
                    const statusRank: Record<string, number> = { "PENDING": 0, "ACCEPTED": 1, "PREPARING": 2, "READY": 3, "COMPLETED": 4 };
                    return oData.map((fetchedOrder: Order) => {
                        const localOrder = prevOrders.find(o => o.id === fetchedOrder.id);
                        if (localOrder) {
                            const localRank = statusRank[localOrder.status] ?? 0;
                            const fetchedRank = statusRank[fetchedOrder.status] ?? 0;
                            // Keep local optimistic status if it's ahead of fetched data (avoids race condition reverting status)
                            if (localRank > fetchedRank) {
                                return { ...fetchedOrder, status: localOrder.status };
                            }
                        }
                        return fetchedOrder;
                    });
                });
            }
            
            if (tablesRes?.ok || ordersRes?.ok) {
                const now = Date.now();
                lastUpdatedRef.current = now;
                setLastUpdated(now);
            }
        } catch (err) {
            console.error("Failed to fetch terminal data:", err);
        } finally {
            setIsLoading(false);
            fetchPromiseRef.current = null;
        }
    };

    fetchPromiseRef.current = fetchWork();
    return fetchPromiseRef.current;
}, []);

    const updateTableStatus = useCallback((tableId: string, updates: Partial<Table>) => {
        // Optional: Manual override if needed
        setRawTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    }, []);

    const pollCallback = useCallback(() => {
        return fetchData(false);
    }, [fetchData]);

    // ✅ Phase 2.2: Manual sync also refreshes profiles (for the refresh button)
    const { isSyncing, manualSync: _rawManualSync } = useSmartPolling(pollCallback, 30000, true);
    const manualSync = useCallback(() => {
        fetchProfiles(); // Refresh profiles on manual sync
        _rawManualSync();
    }, [fetchProfiles, _rawManualSync]);

    const emitUpdate = useCallback((customData?: any) => {
        if (socket && isConnected) {
            const bId = business?.id;
            const uId = business?.userId;
            const payload = {
                businessId: bId || uId,
                userId: uId,
                timestamp: Date.now(),
                ...(customData || {})
            };
            if (bId) {
                socket.emit("pos_update", payload);
            }
            if (uId && uId !== bId) {
                socket.emit("pos_update", { ...payload, businessId: uId });
            }
            if (customData?.order) {
                const kotPayload = {
                    businessId: bId || uId,
                    userId: uId,
                    type: "NEW_KOT",
                    order: customData.order,
                    orderId: customData.order.id,
                    timestamp: Date.now()
                };
                if (bId) socket.emit("kds_order_event", kotPayload);
                if (uId && uId !== bId) socket.emit("kds_order_event", { ...kotPayload, businessId: uId });
            }
        }
    }, [socket, isConnected, business]);

    // Listen to realtime socket events and update local state instantly + background reconciliation
    useEffect(() => {
        if (!socket) return;

        const handleKdsOrderUpdate = (eventData: any) => {
            console.log("Realtime kds_order_update received in TerminalContext:", eventData);
            if (!eventData || !eventData.orderId) {
                fetchData(false, true);
                return;
            }

            const { orderId, status, items } = eventData;
            if (eventData.type === "ITEM_PREPARED_UPDATE") {
                kravy.ping();
            }

            // 1. Instant targeted in-memory status update (0ms UI latency, 0 extra DB load)
            setOrders(prevOrders => {
                const target = prevOrders.find(o => o.id === orderId);
                if (!target) return prevOrders;

                return prevOrders.map(o => {
                    if (o.id !== orderId) return o;
                    return {
                        ...o,
                        status: status || o.status,
                        items: items || o.items,
                        updatedAt: new Date().toISOString()
                    };
                });
            });

            // 2. Background verify & reconcile without blocking UI
            fetchData(false, true);
        };

        const handleDashboardUpdate = (data: any) => {
            console.log("Realtime dashboard_update received in TerminalContext:", data);
            fetchData(false, true);
        };

        socket.on("dashboard_update", handleDashboardUpdate);
        socket.on("kds_order_update", handleKdsOrderUpdate);

        return () => {
            socket.off("dashboard_update", handleDashboardUpdate);
            socket.off("kds_order_update", handleKdsOrderUpdate);
        };
    }, [socket, fetchData]);

    // Robust room subscription on mount, profile change, and reconnects
    useEffect(() => {
        if (!socket || !isConnected) return;

        const joinRooms = () => {
            if (business?.id) {
                socket.emit("join_business", business.id);
            }
            if (business?.userId && business.userId !== business?.id) {
                socket.emit("join_business", business.userId);
            }
        };

        joinRooms();
        socket.on("connect", joinRooms);

        return () => {
            socket.off("connect", joinRooms);
        };
    }, [socket, isConnected, business?.id, business?.userId]);

    return (
        <TerminalContext.Provider value={{
            tablesList,
            orders,
            ordersByTableId,
            business,
            allProfiles,
            enableMultipleProfiles,
            setSelectedProfileId,
            isLoading,
            lastUpdated,
            fetchData,
            updateTableStatus,
            setOrders,
            isSyncing,
            manualSync,
            emitUpdate
        }}>
            {children}
        </TerminalContext.Provider>
    );
};

export const useTerminalContext = () => {
    const context = useContext(TerminalContext);
    if (context === undefined) {
        throw new Error("useTerminalContext must be used within a TerminalProvider");
    }
    return context;
};

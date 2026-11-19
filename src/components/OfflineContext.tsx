"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { offlineStorage, CachedCatalog, CachedPartyRecord, OfflineQueueItem } from "@/lib/offline-storage";

export type ConnectionStatus = "online" | "offline" | "syncing";

export interface QueueSummary {
    pending: number;
    failed: number;
    manualReview: number;
    total: number;
}

interface OfflineContextType {
    status: ConnectionStatus;
    isOffline: boolean;
    pendingCount: number;
    queueSummary: QueueSummary;
    lastSyncedAt: number | null;
    isSyncing: boolean;
    authExpired: boolean;
    saveCatalogToLocal: (data: { items: any[]; categories: any[]; taxSettings?: any; businessProfile?: any }) => Promise<void>;
    getCachedCatalog: () => Promise<CachedCatalog | null>;
    saveOfflineRetailBill: (payload: any) => Promise<{ id: string; offlineRef: string }>;
    saveOfflineRestaurantOrder: (payload: any, options?: { tableId?: string | null; parentRef?: string | null }) => Promise<{ id: string; offlineRef: string; reservedOrderNumber: string; offlineKotRef: string }>;
    saveOfflineOrderAddon: (payload: any, options: { tableId?: string | null; parentRef?: string | null; parentOrderId?: string | null; existingKotCount?: number }) => Promise<{ id: string; offlineRef: string; addonSequence: number; reservedOrderNumber: string; offlineKotRef: string }>;
    getNextAddonSequence: (parentIdentifier: string) => Promise<number>;
    cachePartiesToLocal: (parties: any[]) => Promise<void>;
    getCachedPartiesFromLocal: () => Promise<CachedPartyRecord[]>;
    saveOfflineParty: (payload: any) => Promise<{ id: string; idempotencyKey: string }>;
    saveOfflineWalletTx: (payload: { partyId: string; action: "deposit" | "withdraw" | "udhar" | "payment"; amount: number; description?: string; paymentProof?: string | null }) => Promise<{ id: string; idempotencyKey: string }>;
    syncPendingBills: () => Promise<{ success: number; failed: number }>;
    refreshPendingCount: () => Promise<void>;
    resumeSyncAfterAuth: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<ConnectionStatus>("online");
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [queueSummary, setQueueSummary] = useState<QueueSummary>({ pending: 0, failed: 0, manualReview: 0, total: 0 });
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [authExpired, setAuthExpired] = useState<boolean>(false);
    const syncLockRef = useRef<boolean>(false);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

    const refreshPendingCount = useCallback(async () => {
        try {
            const summary = await offlineStorage.getQueueSummary();
            setQueueSummary(summary);
            setPendingCount(summary.pending + summary.failed);
        } catch {
            setPendingCount(0);
            setQueueSummary({ pending: 0, failed: 0, manualReview: 0, total: 0 });
        }
    }, []);

    // Save a completed retail cash bill locally to IndexedDB before printing
    const saveOfflineRetailBill = useCallback(async (payload: any): Promise<{ id: string; offlineRef: string }> => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const offlineRef = `OFF-${yy}${mm}-${randomPart}`;
        const idempotencyKey = `off_bill_${Date.now()}_${randomPart}`;

        const offlinePayload = {
            ...payload,
            idempotencyKey,
            auditNote: `OFFLINE RETAIL SALE (Ref: ${offlineRef})`
        };

        await offlineStorage.saveOfflineBill({
            id: offlineRef,
            idempotencyKey,
            payload: offlinePayload
        });

        await refreshPendingCount();
        return { id: offlineRef, offlineRef };
    }, [refreshPendingCount]);

    // Save an offline restaurant table order / KOT locally to IndexedDB
    const saveOfflineRestaurantOrder = useCallback(async (payload: any, options?: { tableId?: string | null; parentRef?: string | null }): Promise<{ id: string; offlineRef: string; reservedOrderNumber: string; offlineKotRef: string }> => {
        // Durably allocate next sequential offline KOT reference (OFF-KOT-0001, OFF-KOT-0002, ...)
        const { sequence: kotSeq, reference: offlineKotRef } = await offlineStorage.getNextOfflineKotSequence();

        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const offlineRef = `OFF-ORD-${yy}${mm}-${randomPart}`;
        // CRITICAL SAFEGUARD: reservedOrderNumber serves as both the order reference AND the server-side idempotency fencing key!
        const reservedOrderNumber = payload.reservedOrderNumber || `ORD/${yy}${mm}/${randomPart}`;

        const offlinePayload = {
            ...payload,
            reservedOrderNumber,
            offlineKotRef,
            offlineKotSequence: kotSeq,
            isOffline: true,
            auditNote: `OFFLINE RESTAURANT ORDER (KOT: ${offlineKotRef}, Ref: ${offlineRef})`
        };

        await offlineStorage.saveOfflineOrder({
            id: offlineRef,
            offlineKotRef,
            idempotencyKey: reservedOrderNumber,
            payload: offlinePayload,
            tableId: options?.tableId || payload.tableId || null,
            parentRef: options?.parentRef || null
        });

        await refreshPendingCount();
        return { id: offlineRef, offlineRef, reservedOrderNumber, offlineKotRef };
    }, [refreshPendingCount]);

    // Save an offline restaurant add-on KOT (QT2, QT3, etc.)
    const saveOfflineOrderAddon = useCallback(async (
        payload: any, 
        options: { tableId?: string | null; parentRef?: string | null; parentOrderId?: string | null; existingKotCount?: number }
    ): Promise<{ id: string; offlineRef: string; addonSequence: number; reservedOrderNumber: string; offlineKotRef: string }> => {
        // Durably allocate next sequential offline KOT reference (OFF-KOT-0001, OFF-KOT-0002, ...)
        const { sequence: kotSeq, reference: offlineKotRef } = await offlineStorage.getNextOfflineKotSequence();

        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Calculate stable sequence (QT2, QT3, etc.)
        const parentKey = options.parentOrderId || options.parentRef || options.tableId || "default";
        const storedNextSeq = await offlineStorage.getNextAddonSequence(parentKey);
        const baseSeq = options.existingKotCount ? options.existingKotCount + 1 : 2;
        const addonSequence = Math.max(storedNextSeq, baseSeq);

        const offlineRef = `OFF-ADDON-${yy}${mm}-QT${addonSequence}-${randomPart}`;
        const reservedOrderNumber = payload.reservedOrderNumber || `ADDON/${yy}${mm}/${randomPart}`;

        const offlinePayload = {
            ...payload,
            reservedOrderNumber,
            addonSequence,
            offlineKotRef,
            offlineKotSequence: kotSeq,
            isOffline: true,
            isAddon: true,
            auditNote: `OFFLINE ADD-ON KOT (QT${addonSequence}, KOT: ${offlineKotRef}, Ref: ${offlineRef})`
        };

        await offlineStorage.saveOfflineOrderAddon({
            id: offlineRef,
            offlineKotRef,
            idempotencyKey: reservedOrderNumber,
            payload: offlinePayload,
            tableId: options.tableId || payload.tableId || null,
            parentRef: options.parentRef || null,
            parentOrderId: options.parentOrderId || payload.orderId || null,
            addonSequence
        });

        await refreshPendingCount();
        return { id: offlineRef, offlineRef, addonSequence, reservedOrderNumber, offlineKotRef };
    }, [refreshPendingCount]);

    const getNextAddonSequence = useCallback(async (parentIdentifier: string): Promise<number> => {
        return await offlineStorage.getNextAddonSequence(parentIdentifier);
    }, []);

    const resumeSyncAfterAuth = useCallback(async () => {
        setAuthExpired(false);
        // Clear authExpired flags on queued items
        const allItems = await offlineStorage.getAllQueueItems();
        for (const item of allItems) {
            if (item.authExpired) {
                await offlineStorage.updateStatus(item.id, "PENDING", { authExpired: false, lastError: "Auth restored, ready to sync" });
            }
        }
        await refreshPendingCount();
        syncPendingBills();
    }, [refreshPendingCount]);

    // Synchronize pending offline bills and orders when connectivity returns
    const syncPendingBills = useCallback(async (): Promise<{ success: number; failed: number }> => {
        if (syncLockRef.current || typeof window === "undefined" || !navigator.onLine || authExpired) {
            return { success: 0, failed: 0 };
        }

        syncLockRef.current = true;
        setIsSyncing(true);
        setStatus("syncing");

        let successCount = 0;
        let failedCount = 0;

        try {
            const queue = await offlineStorage.getPendingQueue();
            
            // Map confirmed local offline refs to server order IDs (for dependent operations within this sync cycle)
            const resolvedServerIds = new Map<string, string>();
            const failedParentRefs = new Set<string>();

            // Group items: ensure same-table FIFO ordering
            // Sort by createdAt asc to preserve strict order of operations
            queue.sort((a, b) => a.createdAt - b.createdAt);

            for (const item of queue) {
                // If item is blocked by auth expiration, skip until re-login
                if (item.authExpired) {
                    continue;
                }

                // Dependency check: if this operation depends on a parentRef, ensure parent is synced
                if (item.parentRef) {
                    if (failedParentRefs.has(item.parentRef)) {
                        // Parent failed; block dependent operation
                        await offlineStorage.updateStatus(item.id, "FAILED", { lastError: `Blocked: parent operation ${item.parentRef} failed` });
                        failedCount++;
                        continue;
                    }
                    const parentServerId = resolvedServerIds.get(item.parentRef);
                    if (!parentServerId) {
                        // Check if parent already synced in IndexedDB
                        const parentItem = await offlineStorage.getOfflineItem(item.parentRef);
                        if (parentItem?.serverOrderId) {
                            resolvedServerIds.set(item.parentRef, parentItem.serverOrderId);
                        } else {
                            // Parent not resolved yet; defer to next sync pass
                            continue;
                        }
                    }
                }

                if (item.retryCount >= 10) {
                    await offlineStorage.updateStatus(item.id, "MANUAL_REVIEW", { lastError: "Max retries exceeded" });
                    failedCount++;
                    continue;
                }

                try {
                    if (item.type === "ORDER" || item.type === "ORDER_ADDON") {
                        // ── ORDER OR ADD-ON SYNC PATH ─────────────────────────────────────
                        const orderPayload = { ...item.payload };
                        
                        // If add-on has parentOrderId, target that existing MongoDB order
                        if (item.type === "ORDER_ADDON") {
                            const resolvedParent = item.parentRef ? resolvedServerIds.get(item.parentRef) : null;
                            const targetOrderId = item.parentOrderId || resolvedParent || orderPayload.orderId;
                            if (targetOrderId && !targetOrderId.startsWith("OFF-")) {
                                orderPayload.orderId = targetOrderId;
                            } else if (item.parentRef && !resolvedParent) {
                                // Parent order has not yet received a server ID; defer add-on until next pass
                                continue;
                            }
                        } else if (item.parentRef && resolvedServerIds.has(item.parentRef)) {
                            orderPayload.orderId = resolvedServerIds.get(item.parentRef);
                        }

                        const endpoint = orderPayload.orderId ? "/api/orders" : "/api/orders";
                        const method = orderPayload.orderId ? "PATCH" : "POST";

                        const res = await fetch(endpoint, {
                            method,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(orderPayload)
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const serverOrderId = data.id || data.order?.id;
                            const serverOrderNumber = data.orderNumber || data.order?.orderNumber || orderPayload.reservedOrderNumber;
                            const serverTokenNumber = data.tokenNumber || data.order?.tokenNumber;
                            if (serverOrderId) {
                                resolvedServerIds.set(item.id, serverOrderId);
                            }
                            await offlineStorage.updateStatus(item.id, "SYNCED", {
                                serverOrderId: serverOrderId
                            });
                            // Persist stable local-to-server mapping to prevent duplicate reconciliation
                            if (serverOrderId) {
                                await offlineStorage.saveIdMapping({
                                    localId: item.id,
                                    serverId: serverOrderId,
                                    orderNumber: serverOrderNumber,
                                    offlineKotRef: item.offlineKotRef || item.payload?.offlineKotRef,
                                    serverTokenNumber: serverTokenNumber,
                                    tableId: item.tableId || orderPayload.tableId,
                                    syncedAt: Date.now()
                                });
                            }
                            // Remove from active queue once confirmed persisted by server
                            await offlineStorage.removeItem(item.id);

                            // Dispatch notification for real-time floor reconciliation
                            if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("kravy:order_synced", {
                                    detail: {
                                        localId: item.id,
                                        serverId: serverOrderId,
                                        orderNumber: serverOrderNumber,
                                        offlineKotRef: item.offlineKotRef || item.payload?.offlineKotRef,
                                        serverTokenNumber: serverTokenNumber,
                                        tableId: item.tableId || orderPayload.tableId
                                    }
                                }));
                            }

                            successCount++;
                        } else if (res.status === 401 || res.status === 403) {
                            // 🔒 AUTH EXPIRED: DO NOT mark MANUAL_REVIEW! Pause sync and keep PENDING
                            console.warn(`[OFFLINE_SYNC_AUTH_EXPIRED] Order ${item.id} received HTTP ${res.status}. Pausing sync until re-login.`);
                            setAuthExpired(true);
                            await offlineStorage.updateStatus(item.id, "PENDING", { 
                                authExpired: true, 
                                lastError: `Authentication expired (${res.status}). Will resume upon re-login.` 
                            });
                            failedCount++;
                            // Stop processing the rest of the queue this pass
                            break;
                        } else if (res.status === 503 || res.status >= 500 || res.status === 429) {
                            // Server busy / concurrent lease in progress: keep for bounded retry
                            await offlineStorage.updateStatus(item.id, "FAILED", { lastError: `HTTP_${res.status}` });
                            failedCount++;
                        } else if (res.status >= 400 && res.status < 500) {
                            // Client validation error
                            const errData = await res.json().catch(() => ({}));
                            await offlineStorage.updateStatus(item.id, "MANUAL_REVIEW", { 
                                lastError: errData.error || `Client error ${res.status}` 
                            });
                            failedParentRefs.add(item.id);
                            failedCount++;
                        }
                    } else if (item.type === "PARTY_CREATE") {
                        // ── PARTY CREATE SYNC PATH (PHASE B) ──────────────────────────────
                        const res = await fetch("/api/parties", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(item.payload)
                        });

                        if (res.ok) {
                            const serverParty = await res.json();
                            const serverId = serverParty.id || serverParty._id;
                            if (serverId) {
                                resolvedServerIds.set(item.id, serverId);
                                await offlineStorage.saveIdMapping({
                                    localId: item.id,
                                    serverId,
                                    syncedAt: Date.now()
                                });
                                // Update local cached party with true server ID
                                await offlineStorage.saveCachedParty({
                                    ...serverParty,
                                    id: serverId,
                                    isOfflineLocal: false
                                });
                            }
                            await offlineStorage.removeItem(item.id);
                            successCount++;
                        } else if (res.status === 401 || res.status === 403) {
                            setAuthExpired(true);
                            await offlineStorage.updateStatus(item.id, "PENDING", { authExpired: true, lastError: `Auth ${res.status}` });
                            failedCount++;
                            break;
                        } else {
                            await offlineStorage.updateStatus(item.id, "FAILED", { lastError: `HTTP_${res.status}` });
                            failedCount++;
                        }
                    } else if (item.type === "WALLET_TRANSACTION") {
                        // ── WALLET FINANCIAL TRANSACTION SYNC PATH (PHASE C) ──────────────
                        // Check if partyId is a local ID: first check in-memory Map, then check durable IndexedDB id_map store!
                        let targetPartyId = resolvedServerIds.get(item.partyId || "") || item.partyId;
                        if (targetPartyId && targetPartyId.startsWith("OFF-")) {
                            const durableMap = await offlineStorage.getIdMapping(targetPartyId);
                            if (durableMap?.serverId) {
                                targetPartyId = durableMap.serverId;
                                resolvedServerIds.set(item.partyId || "", targetPartyId);
                            } else {
                                // Parent customer has not synced yet; hold this transaction in queue for next pass
                                console.log(`[OfflineContext] Wallet transaction ${item.id} waiting for parent customer ${targetPartyId} to sync`);
                                continue;
                            }
                        }

                        const txPayload = {
                            ...item.payload,
                            partyId: targetPartyId,
                            idempotencyKey: item.idempotencyKey || item.payload?.idempotencyKey
                        };

                        const res = await fetch("/api/wallet", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(txPayload)
                        });

                        if (res.ok) {
                            const data = await res.json();
                            // Update local cached party balance with confirmed server balance
                            if (data.balance !== undefined && targetPartyId) {
                                const localP = await offlineStorage.getCachedParty(targetPartyId);
                                if (localP) {
                                    await offlineStorage.saveCachedParty({
                                        ...localP,
                                        walletBalance: data.balance
                                    });
                                }
                            }
                            await offlineStorage.removeItem(item.id);
                            successCount++;
                        } else if (res.status === 401 || res.status === 403) {
                            setAuthExpired(true);
                            await offlineStorage.updateStatus(item.id, "PENDING", { authExpired: true, lastError: `Auth ${res.status}` });
                            failedCount++;
                            break;
                        } else if (res.status === 409) {
                            // Idempotency payload conflict: move to manual review rather than retrying blindly
                            const errData = await res.json().catch(() => ({}));
                            await offlineStorage.updateStatus(item.id, "MANUAL_REVIEW", {
                                lastError: errData.error || "Idempotency conflict detected"
                            });
                            failedCount++;
                        } else {
                            await offlineStorage.updateStatus(item.id, "FAILED", { lastError: `HTTP_${res.status}` });
                            failedCount++;
                        }
                    } else {
                        // ── RETAIL BILL SYNC PATH ─────────────────────────────────────────
                        const res = await fetch("/api/bill-manager", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(item.payload)
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const serverBill = data.bill || data;
                            await offlineStorage.updateStatus(item.id, "SYNCED", {
                                serverBillId: serverBill?.id,
                                serverBillNumber: serverBill?.billNumber
                            });
                            // Remove from active queue once confirmed persisted by server
                            await offlineStorage.removeItem(item.id);
                            successCount++;
                        } else if (res.status === 401 || res.status === 403) {
                            // 🔒 AUTH EXPIRED: DO NOT mark MANUAL_REVIEW! Pause sync and keep PENDING
                            console.warn(`[OFFLINE_SYNC_AUTH_EXPIRED] Bill ${item.id} received HTTP ${res.status}. Pausing sync until re-login.`);
                            setAuthExpired(true);
                            await offlineStorage.updateStatus(item.id, "PENDING", { 
                                authExpired: true, 
                                lastError: `Authentication expired (${res.status}). Will resume upon re-login.` 
                            });
                            failedCount++;
                            break;
                        } else if (res.status >= 500 || res.status === 429) {
                            // Server busy / network drop: keep for bounded retry
                            await offlineStorage.updateStatus(item.id, "FAILED", { lastError: `HTTP_${res.status}` });
                            failedCount++;
                        } else if (res.status >= 400 && res.status < 500) {
                            // Validation conflict: Move to manual review, never silently delete!
                            const errData = await res.json().catch(() => ({}));
                            await offlineStorage.updateStatus(item.id, "MANUAL_REVIEW", { 
                                lastError: errData.error || `Client error ${res.status}` 
                            });
                            failedCount++;
                        }
                    }
                } catch (netErr: any) {
                    await offlineStorage.updateStatus(item.id, "FAILED", { lastError: netErr.message });
                    failedCount++;
                }
            }
        } finally {
            syncLockRef.current = false;
            setIsSyncing(false);
            setStatus(navigator.onLine ? "online" : "offline");
            await refreshPendingCount();
        }

        return { success: successCount, failed: failedCount };
    }, [authExpired, refreshPendingCount]);

    // Adaptive periodic retry worker: runs only while there are pending/failed items and device is online
    useEffect(() => {
        if (typeof window === "undefined") return;

        if (pendingCount > 0 && navigator.onLine && !isSyncing) {
            if (!retryTimerRef.current) {
                retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;
                    syncPendingBills();
                }, 20000); // 20-second bounded backoff interval
            }
        } else {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        }

        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [pendingCount, isSyncing, syncPendingBills]);

    // Network & Visibility event listeners
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleOnline = () => {
            setStatus("online");
            syncPendingBills();
        };

        const handleOffline = () => {
            setStatus("offline");
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && navigator.onLine) {
                refreshPendingCount().then(() => {
                    syncPendingBills();
                });
            }
        };

        const handleFocus = () => {
            if (navigator.onLine) {
                refreshPendingCount().then(() => {
                    syncPendingBills();
                });
            }
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        setStatus(navigator.onLine ? "online" : "offline");
        refreshPendingCount();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [refreshPendingCount, syncPendingBills]);

    const saveCatalogToLocal = useCallback(async (data: { items: any[]; categories: any[]; taxSettings?: any; businessProfile?: any }) => {
        await offlineStorage.saveCatalog(data);
        setLastSyncedAt(Date.now());
    }, []);

    const getCachedCatalog = useCallback(async () => {
        return await offlineStorage.getCatalog();
    }, []);

    const cachePartiesToLocal = useCallback(async (parties: any[]) => {
        await offlineStorage.cacheParties(parties);
    }, []);

    const getCachedPartiesFromLocal = useCallback(async () => {
        return await offlineStorage.getCachedParties();
    }, []);

    const saveOfflineParty = useCallback(async (payload: any) => {
        const res = await offlineStorage.queuePartyCreation(payload);
        await refreshPendingCount();
        return res;
    }, [refreshPendingCount]);

    const saveOfflineWalletTx = useCallback(async (payload: {
        partyId: string;
        action: "deposit" | "withdraw" | "udhar" | "payment";
        amount: number;
        description?: string;
        paymentProof?: string | null;
    }) => {
        const res = await offlineStorage.queueWalletTransaction(payload);
        await refreshPendingCount();
        return res;
    }, [refreshPendingCount]);

    return (
        <OfflineContext.Provider
            value={{
                status,
                isOffline: status === "offline",
                pendingCount,
                queueSummary,
                lastSyncedAt,
                isSyncing,
                authExpired,
                saveCatalogToLocal,
                getCachedCatalog,
                saveOfflineRetailBill,
                saveOfflineRestaurantOrder,
                saveOfflineOrderAddon,
                getNextAddonSequence,
                cachePartiesToLocal,
                getCachedPartiesFromLocal,
                saveOfflineParty,
                saveOfflineWalletTx,
                syncPendingBills,
                refreshPendingCount,
                resumeSyncAfterAuth
            }}
        >
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const ctx = useContext(OfflineContext);
    if (!ctx) {
        throw new Error("useOffline must be used within an OfflineProvider");
    }
    return ctx;
}

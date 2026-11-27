/**
 * Kravy POS - Offline Storage Engine (IndexedDB)
 * Cross-platform (Android WebView & Desktop Browser)
 * 
 * Provides durable local storage for:
 * 1. Catalog Cache (Menu items, categories, taxes, business profile)
 * 2. Pending Offline Queue (Retail Bills and Orders awaiting background synchronization)
 * 3. Sync Audit Log
 */

const DB_NAME = "kravy_offline_pos_db";
const DB_VERSION = 5;

export interface OfflineQueueItem {
    id: string; // Unique Local Reference (e.g. OFF-2610-A9Z4 or OFF-ORD-2610-XYZ123)
    offlineKotRef?: string; // Stable sequence reference (e.g. OFF-KOT-0001, OFF-KOT-0002)
    idempotencyKey: string; // Stable idempotency key
    type: "RETAIL_BILL" | "ORDER" | "ORDER_ADDON" | "PARTY_CREATE" | "WALLET_TRANSACTION" | "EXPENSE_CREATE" | "STOCK_ADJUSTMENT";
    payload: any;
    status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "MANUAL_REVIEW";
    createdAt: number;
    updatedAt: number;
    retryCount: number;
    lastError?: string;
    authExpired?: boolean;
    serverBillId?: string;
    serverBillNumber?: string;
    serverOrderId?: string;
    tableId?: string | null;
    parentRef?: string | null;
    parentOrderId?: string | null;
    addonSequence?: number | null;
    partyId?: string | null;
}

export interface CachedPartyRecord {
    id: string;
    name: string;
    phone: string;
    address?: string;
    dob?: string | null;
    loyaltyPoints?: number;
    walletBalance?: number;
    remarks?: string | null;
    status?: string;
    isOfflineLocal?: boolean;
    cachedAt: number;
}

export interface CachedTableRecord {
    id: string;
    name: string;
    zone?: string;
    floor?: string;
    activeOrderId?: string;
    status?: string;
    clerkUserId?: string;
    merchantId?: string;
    cachedAt: number;
}

export interface CachedCatalog {
    items: any[];
    categories: any[];
    taxSettings: any;
    businessProfile: any;
    cachedAt: number;
}

class OfflineStorage {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (typeof window === "undefined") {
            return Promise.reject(new Error("IndexedDB is only available in the browser"));
        }

        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                    const db = (event.target as IDBOpenDBRequest).result;

                    // 1. Catalog store
                    if (!db.objectStoreNames.contains("catalog")) {
                        db.createObjectStore("catalog", { keyPath: "id" });
                    }

                    // 2. Offline Sync Queue
                    if (!db.objectStoreNames.contains("sync_queue")) {
                        const queueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
                        queueStore.createIndex("status", "status", { unique: false });
                        queueStore.createIndex("createdAt", "createdAt", { unique: false });
                    }

                    // 3. Cached Tables Store (For offline floor persistence)
                    if (!db.objectStoreNames.contains("tables")) {
                        db.createObjectStore("tables", { keyPath: "id" });
                    }

                    // 4. Stable local-to-server ID mapping (For reconciling synced orders)
                    if (!db.objectStoreNames.contains("id_map")) {
                        const mapStore = db.createObjectStore("id_map", { keyPath: "localId" });
                        mapStore.createIndex("serverId", "serverId", { unique: false });
                        mapStore.createIndex("orderNumber", "orderNumber", { unique: false });
                    }

                    // 5. Monotonic sequence counters (For unique local offline KOT sequence)
                    if (!db.objectStoreNames.contains("counters")) {
                        db.createObjectStore("counters", { keyPath: "id" });
                    }

                    // 6. Cached Parties / Customers (Phase B)
                    if (!db.objectStoreNames.contains("parties")) {
                        const partyStore = db.createObjectStore("parties", { keyPath: "id" });
                        partyStore.createIndex("phone", "phone", { unique: false });
                        partyStore.createIndex("name", "name", { unique: false });
                    }

                    // 7. Cached Inventory Items (Phase D)
                    if (!db.objectStoreNames.contains("inventory")) {
                        const invStore = db.createObjectStore("inventory", { keyPath: "id" });
                        invStore.createIndex("categoryId", "categoryId", { unique: false });
                    }

                    // 8. Cached Expenses (Phase D)
                    if (!db.objectStoreNames.contains("expenses")) {
                        const expStore = db.createObjectStore("expenses", { keyPath: "id" });
                        expStore.createIndex("date", "date", { unique: false });
                    }

                    // 9. Cached Past Bills (Phase D)
                    if (!db.objectStoreNames.contains("bills_cache")) {
                        const billsStore = db.createObjectStore("bills_cache", { keyPath: "id" });
                        billsStore.createIndex("createdAt", "createdAt", { unique: false });
                        billsStore.createIndex("billNumber", "billNumber", { unique: false });
                    }
                };

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        return this.dbPromise;
    }

    /**
     * Cache the latest menu, categories, and business profile for offline use
     */
    async saveCatalog(data: { items: any[]; categories: any[]; taxSettings?: any; businessProfile?: any }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("catalog", "readwrite");
            const store = tx.objectStore("catalog");
            const record: CachedCatalog & { id: string } = {
                id: "current_catalog",
                items: data.items || [],
                categories: data.categories || [],
                taxSettings: data.taxSettings || null,
                businessProfile: data.businessProfile || null,
                cachedAt: Date.now()
            };
            store.put(record);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn("[OfflineStorage] Failed to cache catalog:", err);
        }
    }

    /**
     * Retrieve the cached catalog when offline
     */
    async getCatalog(): Promise<CachedCatalog | null> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("catalog", "readonly");
            const store = tx.objectStore("catalog");
            const req = store.get("current_catalog");
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /**
     * Enqueue a pending retail bill for background sync (Durably committed before print)
     */
    
    async queueWalletTransaction(payload: any): Promise<{ id: string; idempotencyKey: string }> {
        const id = "OFF-WLT-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
        const db = await this.getDB();
        const tx = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        const record: OfflineQueueItem = {
            id,
            idempotencyKey: id,
            type: "WALLET_TX" as any,
            payload,
            status: "PENDING",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            retryCount: 0
        };
        store.put(record);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve({ id, idempotencyKey: id });
            tx.onerror = () => reject(tx.error);
        });
    }

    async saveOfflineBill(item: { id: string; idempotencyKey: string; payload: any }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readwrite");
            const store = tx.objectStore("sync_queue");
            const record: OfflineQueueItem = {
                id: item.id,
                idempotencyKey: item.idempotencyKey,
                type: "RETAIL_BILL",
                payload: item.payload,
                status: "PENDING",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                retryCount: 0
            };
            store.put(record);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("[OfflineStorage] Failed to save offline bill:", err);
            throw err;
        }
    }

    /**
     * Enqueue a pending offline business table order / KOT
     */
    async saveOfflineOrder(item: { 
        id: string; 
        offlineKotRef?: string;
        idempotencyKey: string; 
        payload: any;
        tableId?: string | null;
        parentRef?: string | null;
    }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readwrite");
            const store = tx.objectStore("sync_queue");
            const record: OfflineQueueItem = {
                id: item.id,
                offlineKotRef: item.offlineKotRef || item.payload?.offlineKotRef || undefined,
                idempotencyKey: item.idempotencyKey,
                type: "ORDER",
                payload: item.payload,
                status: "PENDING",
                tableId: item.tableId || null,
                parentRef: item.parentRef || null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                retryCount: 0
            };
            store.put(record);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("[OfflineStorage] Failed to save offline order:", err);
            throw err;
        }
    }

    /**
     * Enqueue a pending offline business add-on KOT (QT2, QT3, etc.)
     */
    async saveOfflineOrderAddon(item: {
        id: string;
        offlineKotRef?: string;
        idempotencyKey: string;
        payload: any;
        tableId?: string | null;
        parentRef?: string | null;
        parentOrderId?: string | null;
        addonSequence: number;
    }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readwrite");
            const store = tx.objectStore("sync_queue");
            const record: OfflineQueueItem = {
                id: item.id,
                offlineKotRef: item.offlineKotRef || item.payload?.offlineKotRef || undefined,
                idempotencyKey: item.idempotencyKey,
                type: "ORDER_ADDON",
                payload: item.payload,
                status: "PENDING",
                tableId: item.tableId || null,
                parentRef: item.parentRef || null,
                parentOrderId: item.parentOrderId || null,
                addonSequence: item.addonSequence,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                retryCount: 0
            };
            store.put(record);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("[OfflineStorage] Failed to save offline order addon:", err);
            throw err;
        }
    }

    /**
     * Get the next add-on sequence (e.g. QT2, QT3) for a specific parent order or table
     */
    async getNextAddonSequence(parentIdentifier: string): Promise<number> {
        try {
            const all = await this.getAllQueueItems();
            const matchingAddons = all.filter(it => 
                it.type === "ORDER_ADDON" && 
                (it.parentRef === parentIdentifier || it.parentOrderId === parentIdentifier || it.tableId === parentIdentifier)
            );
            let maxSeq = 1; // QT1 is the initial order
            for (const item of matchingAddons) {
                if (item.addonSequence && item.addonSequence > maxSeq) {
                    maxSeq = item.addonSequence;
                }
            }
            return maxSeq + 1;
        } catch {
            return 2;
        }
    }

    /**
     * Get a specific saved offline order/bill (for reprinting without duplicating)
     */
    async getOfflineItem(id: string): Promise<OfflineQueueItem | null> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readonly");
            const store = tx.objectStore("sync_queue");
            const req = store.get(id);
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /**
     * Cache tables locally for offline floor display.
     * When merchantId is provided, records are tagged and isolated per merchant.
     */
    async saveTables(tables: any[], merchantId?: string): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("tables", "readwrite");
            const store = tx.objectStore("tables");
            const now = Date.now();

            // If merchantId is provided, prune stale tables for this merchant first
            if (merchantId) {
                const cursorReq = store.openCursor();
                await new Promise<void>((resolve, reject) => {
                    cursorReq.onsuccess = (e: any) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            if (cursor.value && (cursor.value.merchantId === merchantId || cursor.value.clerkUserId === merchantId)) {
                                cursor.delete();
                            }
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    cursorReq.onerror = () => reject(cursorReq.error);
                });
            }

            for (const t of tables) {
                const mId = merchantId || t.clerkUserId || t.merchantId;
                store.put({
                    id: t.id,
                    name: t.name,
                    zone: t.zone,
                    floor: t.floor,
                    activeOrderId: t.activeOrderId,
                    status: t.status,
                    clerkUserId: t.clerkUserId || mId,
                    merchantId: mId,
                    cachedAt: now
                });
            }
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn("[OfflineStorage] saveTables error:", err);
        }
    }

    /**
     * Get cached tables. When merchantId is provided, strictly isolates to that merchant.
     */
    async getTables(merchantId?: string): Promise<CachedTableRecord[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("tables", "readonly");
            const store = tx.objectStore("tables");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => {
                    const all: CachedTableRecord[] = req.result || [];
                    if (merchantId) {
                        const filtered = all.filter(t => t.merchantId === merchantId || t.clerkUserId === merchantId);
                        resolve(filtered);
                    } else {
                        resolve(all);
                    }
                };
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /**
     * Get all active pending orders for a table (for merging local table state)
     */
    async getPendingOrdersByTable(): Promise<Record<string, OfflineQueueItem[]>> {
        try {
            const all = await this.getAllQueueItems();
            const map: Record<string, OfflineQueueItem[]> = {};
            for (const item of all) {
                if (item.type === "ORDER" && (item.status === "PENDING" || item.status === "SYNCING" || item.status === "FAILED")) {
                    const tId = item.tableId || item.payload?.tableId;
                    if (tId) {
                        if (!map[tId]) map[tId] = [];
                        map[tId].push(item);
                    }
                }
            }
            return map;
        } catch {
            return {};
        }
    }

    /**
     * Get a specific saved offline bill (for reprinting without duplicating the sale)
     */
    async getOfflineBill(id: string): Promise<OfflineQueueItem | null> {
        return this.getOfflineItem(id);
    }

    /**
     * Get all items in the sync queue regardless of status (for diagnostic audit)
     */
    async getAllQueueItems(): Promise<OfflineQueueItem[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readonly");
            const store = tx.objectStore("sync_queue");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /**
     * Get all pending items in the sync queue (PENDING + retryable FAILED)
     */
    async getPendingQueue(): Promise<OfflineQueueItem[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readonly");
            const store = tx.objectStore("sync_queue");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => {
                    const all: OfflineQueueItem[] = req.result || [];
                    const actionable = all.filter(it => it.status === "PENDING" || it.status === "FAILED");
                    resolve(actionable);
                };
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /**
     * Get counts broken down by status
     */
    async getQueueSummary(): Promise<{ pending: number; failed: number; manualReview: number; total: number }> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readonly");
            const store = tx.objectStore("sync_queue");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => {
                    const all: OfflineQueueItem[] = req.result || [];
                    let pending = 0;
                    let failed = 0;
                    let manualReview = 0;
                    for (const item of all) {
                        if (item.status === "PENDING") pending++;
                        else if (item.status === "FAILED") failed++;
                        else if (item.status === "MANUAL_REVIEW") manualReview++;
                    }
                    resolve({ pending, failed, manualReview, total: all.length });
                };
                req.onerror = () => resolve({ pending: 0, failed: 0, manualReview: 0, total: 0 });
            });
        } catch {
            return { pending: 0, failed: 0, manualReview: 0, total: 0 };
        }
    }

    /**
     * Update the sync status of an item with server confirmation details
     */
    async updateStatus(
        id: string, 
        status: OfflineQueueItem["status"], 
        details?: { 
            serverBillId?: string; 
            serverBillNumber?: string; 
            serverOrderId?: string;
            lastError?: string;
            authExpired?: boolean;
        }
    ): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readwrite");
            const store = tx.objectStore("sync_queue");
            const req = store.get(id);

            req.onsuccess = () => {
                const item = req.result as OfflineQueueItem;
                if (item) {
                    item.status = status;
                    item.updatedAt = Date.now();
                    if (details?.lastError !== undefined) item.lastError = details.lastError;
                    if (details?.authExpired !== undefined) item.authExpired = details.authExpired;
                    if (details?.serverBillId) item.serverBillId = details.serverBillId;
                    if (details?.serverBillNumber) item.serverBillNumber = details.serverBillNumber;
                    if (details?.serverOrderId) item.serverOrderId = details.serverOrderId;
                    if (status === "FAILED") item.retryCount += 1;
                    store.put(item);
                }
            };

            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] updateStatus error:", err);
        }
    }

    /**
     * Remove an item from the queue once confirmed synced by server
     */
    async removeItem(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("sync_queue", "readwrite");
            const store = tx.objectStore("sync_queue");
            store.delete(id);
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] removeItem error:", err);
        }
    }

    /**
     * Generate and durably commit a strictly monotonic offline KOT reference (OFF-KOT-0001, OFF-KOT-0002, ...)
     * Guaranteed to never repeat, never regress, and persist across app restarts and reloads.
     */
    async getNextOfflineKotSequence(): Promise<{ sequence: number; reference: string }> {
        try {
            const db = await this.getDB();

            // 1. Inspect existing items in sync_queue to find highest sequence recorded
            const allItems = await this.getAllQueueItems();
            let maxRecordedSeq = 0;
            for (const it of allItems) {
                const ref = it.offlineKotRef || it.payload?.offlineKotRef;
                if (ref) {
                    const match = String(ref).match(/OFF-KOT-(\d+)/);
                    if (match && match[1]) {
                        const n = parseInt(match[1], 10);
                        if (!isNaN(n) && n > maxRecordedSeq) maxRecordedSeq = n;
                    }
                }
            }

            // 2. Read stored counter from counters object store
            let storedSeq = 0;
            try {
                const tx = db.transaction("counters", "readonly");
                const store = tx.objectStore("counters");
                const req = store.get("offline_kot_counter");
                storedSeq = await new Promise<number>((resolve) => {
                    req.onsuccess = () => resolve(req.result?.lastSequence || 0);
                    req.onerror = () => resolve(0);
                });
            } catch {}

            // 3. Increment strictly above both stored counter and any discovered queue record
            const nextSeq = Math.max(storedSeq, maxRecordedSeq) + 1;
            const reference = `OFF-KOT-${String(nextSeq).padStart(4, "0")}`;

            // 4. Durably persist counter in counters store
            try {
                const tx = db.transaction("counters", "readwrite");
                const store = tx.objectStore("counters");
                store.put({ id: "offline_kot_counter", lastSequence: nextSeq, updatedAt: Date.now() });
                await new Promise<void>((resolve) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                });
            } catch {}

            return { sequence: nextSeq, reference };
        } catch (err) {
            console.error("[OfflineStorage] getNextOfflineKotSequence error:", err);
            const fallbackSeq = Math.floor(Date.now() % 10000) + 1;
            return { sequence: fallbackSeq, reference: `OFF-KOT-${String(fallbackSeq).padStart(4, "0")}` };
        }
    }

    /**
     * Persist confirmed local-to-server ID and orderNumber mapping
     */
    async saveIdMapping(record: {
        localId: string;
        serverId: string;
        orderNumber?: string;
        offlineKotRef?: string;
        serverTokenNumber?: number;
        tableId?: string | null;
        syncedAt?: number;
    }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("id_map", "readwrite");
            const store = tx.objectStore("id_map");
            store.put({
                localId: record.localId,
                serverId: record.serverId,
                orderNumber: record.orderNumber || "",
                offlineKotRef: record.offlineKotRef || "",
                serverTokenNumber: record.serverTokenNumber || null,
                tableId: record.tableId || null,
                syncedAt: record.syncedAt || Date.now()
            });
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] saveIdMapping error:", err);
        }
    }

    /**
     * Retrieve ID mapping by local ID
     */
    async getIdMapping(localId: string): Promise<{ localId: string; serverId: string; orderNumber?: string; tableId?: string | null } | null> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("id_map", "readonly");
            const store = tx.objectStore("id_map");
            const req = store.get(localId);
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /**
     * Retrieve all ID mappings
     */
    async getAllIdMappings(): Promise<Array<{ localId: string; serverId: string; orderNumber?: string; tableId?: string | null }>> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("id_map", "readonly");
            const store = tx.objectStore("id_map");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE B: CUSTOMER / PARTIES OFFLINE METHODS
    // ─────────────────────────────────────────────────────────────────────────

    async cacheParties(parties: any[]): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("parties", "readwrite");
            const store = tx.objectStore("parties");
            const now = Date.now();
            for (const p of parties) {
                const id = p.id || p._id;
                if (!id) continue;
                store.put({
                    id,
                    name: p.name || "Unnamed",
                    phone: p.phone || "",
                    address: p.address || "",
                    dob: p.dob || null,
                    loyaltyPoints: p.loyaltyPoints || 0,
                    walletBalance: p.walletBalance || 0,
                    remarks: p.remarks || null,
                    status: p.status || "ACTIVE",
                    isOfflineLocal: Boolean(p.isOfflineLocal),
                    cachedAt: now
                });
            }
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] cacheParties error:", err);
        }
    }

    async getCachedParties(): Promise<CachedPartyRecord[]> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("parties", "readonly");
            const store = tx.objectStore("parties");
            const req = store.getAll();
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    async getCachedParty(id: string): Promise<CachedPartyRecord | null> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("parties", "readonly");
            const store = tx.objectStore("parties");
            const req = store.get(id);
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    async saveCachedParty(party: Partial<CachedPartyRecord> & { id: string; name: string; phone: string }): Promise<void> {
        try {
            const db = await this.getDB();
            const tx = db.transaction("parties", "readwrite");
            const store = tx.objectStore("parties");
            store.put({
                ...party,
                cachedAt: Date.now()
            });
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] saveCachedParty error:", err);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE C: QUEUE IMMUTABLE FINANCIAL / WALLET TRANSACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    async queuePartyCreation(payload: any): Promise<{ id: string; idempotencyKey: string }> {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const localId = `OFF-CUST-${randomPart}`;
        const idempotencyKey = `off_cust_${Date.now()}_${randomPart}`;

        const item: OfflineQueueItem = {
            id: localId,
            idempotencyKey,
            type: "PARTY_CREATE",
            payload: { ...payload, localId },
            status: "PENDING",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            retryCount: 0,
            partyId: localId
        };

        const db = await this.getDB();
        const tx = db.transaction("sync_queue", "readwrite");
        tx.objectStore("sync_queue").put(item);
        await new Promise<void>((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });

        // Also save to cached parties store immediately so it appears in UI
        await this.saveCachedParty({
            id: localId,
            name: payload.name,
            phone: payload.phone,
            address: payload.address || "",
            dob: payload.dob || null,
            walletBalance: payload.walletBalance || payload.openingBalance || 0,
            loyaltyPoints: payload.loyaltyPoints || 0,
            isOfflineLocal: true
        });

        return { id: localId, idempotencyKey };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE D1: INVENTORY OFFLINE CACHE (MERCHANT-SCOPED)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cache inventory records specifically scoped to the active merchant.
     * Deletes existing cached items for this merchant before inserting new snapshot,
     * strictly preserving other merchants' caches in IndexedDB.
     */
    async cacheInventory(items: any[], merchantId: string): Promise<void> {
        if (!merchantId || !Array.isArray(items)) return;
        try {
            const db = await this.getDB();
            const tx = db.transaction(["inventory", "counters"], "readwrite");
            const store = tx.objectStore("inventory");
            const countersStore = tx.objectStore("counters");
            const now = Date.now();

            // 1. Iterate store to delete only existing records owned by THIS merchant
            const req = store.openCursor();
            await new Promise<void>((resolve, reject) => {
                req.onsuccess = (event: any) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        if (cursor.value && cursor.value.merchantId === merchantId) {
                            cursor.delete();
                        }
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                req.onerror = () => reject(req.error);
            });

            // 2. Put fresh valid items with merchantId and cachedAt
            for (const item of items) {
                const id = item.id || item._id;
                if (!id) continue;
                store.put({
                    ...item,
                    id: String(id),
                    merchantId: String(merchantId),
                    cachedAt: now
                });
            }

            // 3. Store merchant-scoped sync metadata in counters store
            countersStore.put({
                id: `inv_meta_${merchantId}`,
                merchantId,
                lastSyncedAt: now,
                itemCount: items.length
            });

            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] cacheInventory error:", err);
        }
    }

    /**
     * Retrieve cached inventory strictly filtered by the authenticated merchant ID.
     * Mismatched or unauthorized callers will receive an empty array.
     */
    async getCachedInventory(merchantId: string): Promise<any[]> {
        if (!merchantId) return [];
        try {
            const db = await this.getDB();
            const tx = db.transaction("inventory", "readonly");
            const store = tx.objectStore("inventory");
            const req = store.getAll();

            return new Promise((resolve) => {
                req.onsuccess = () => {
                    const all: any[] = req.result || [];
                    const merchantItems = all.filter((it: any) => it.merchantId === merchantId);
                    resolve(merchantItems);
                };
                req.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /**
     * Get last sync metadata for a specific merchant.
     */
    async getInventorySyncMeta(merchantId: string): Promise<{ lastSyncedAt: number; itemCount: number } | null> {
        if (!merchantId) return null;
        try {
            const db = await this.getDB();
            const tx = db.transaction("counters", "readonly");
            const store = tx.objectStore("counters");
            const req = store.get(`inv_meta_${merchantId}`);

            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    /**
     * Purge cache strictly for the logging-out merchant without touching other merchants.
     */
    async clearMerchantCache(merchantId: string): Promise<void> {
        if (!merchantId) return;
        try {
            const db = await this.getDB();
            const tx = db.transaction(["inventory", "counters"], "readwrite");
            const invStore = tx.objectStore("inventory");
            const countersStore = tx.objectStore("counters");

            const req = invStore.openCursor();
            req.onsuccess = (event: any) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value && cursor.value.merchantId === merchantId) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
            countersStore.delete(`inv_meta_${merchantId}`);

            return new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (err) {
            console.warn("[OfflineStorage] clearMerchantCache error:", err);
        }
    }
}

export const offlineStorage = new OfflineStorage();

// @ts-nocheck
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';
import { devanagariToHinglish } from './transliterate';
import { getTaxConfig } from './tax-config';

// In-memory cache for fetched logo image elements to ensure instant, reliable thermal printing
const logoImageCache = new Map<string, HTMLImageElement>();

export interface BluetoothPrintSettings {
    // Bill Toggles
    showLogo?: boolean;
    showBusinessName?: boolean;
    showTagline?: boolean;
    showContact?: boolean;
    showAddress?: boolean;
    showGST?: boolean;
    showFSSAI?: boolean;
    showBillTypeHeader?: boolean; // TAX INVOICE / SALES RECEIPT title
    showInvoiceNumber?: boolean;
    showToken?: boolean;
    showDate?: boolean;
    showTableInfo?: boolean;
    showCustomerDetails?: boolean;
    showCustomerPhone?: boolean;
    showCustomerAddress?: boolean;
    showFoodTypeSuffix?: boolean;
    showVariants?: boolean;
    showSubtotal?: boolean;
    showDiscount?: boolean;
    showDeliveryCharge?: boolean;
    showPackagingCharge?: boolean;
    showServiceCharge?: boolean;
    showTaxBreakup?: boolean;
    showGrandTotal?: boolean;
    showAmountInWords?: boolean;
    showPaymentMode?: boolean;
    showPaymentStatus?: boolean;
    showBalanceDue?: boolean;
    showUpiQr?: boolean;
    showMenuQr?: boolean;
    showGreetings?: boolean;
    showPoweredBy?: boolean;
    printTokenTicket?: boolean;

    // KOT Toggles
    showKOTHeader?: boolean;
    showKOTTable?: boolean;
    showKOTToken?: boolean;
    showKOTBillNo?: boolean;
    showKOTDateTime?: boolean;
    showKOTCustomer?: boolean;
    showKOTItemDivider?: boolean;
    showKOTVariants?: boolean;
    showKOTInstructions?: boolean;
    showKOTFooter?: boolean;

    // Element Sizing Sliders (Pixels - matching USB sizers)
    logoSize?: number;
    logoBottomSpace?: number;
    upiQrSize?: number;
    businessNameSize?: number;
    addressSize?: number;
    taglineSize?: number;
    receiptTokenSize?: number;
    itemsFontSize?: number;
    grandTotalFontSize?: number;
    customerDetailsFontSize?: number;
    detailsFontSize?: number;
    greetingsFooterSize?: number;

    // KOT Sizing Sliders
    kotTokenSize?: number;
    kotHeaderDetailsSize?: number;
    kotItemsFontSize?: number;
    kotQuantityFontSize?: number;

    // Typography & Formatting
    paperWidth?: "58mm" | "80mm";
    businessNameStyle?: "normal" | "bold" | "double_h" | "double_hw";
    tokenStyle?: "normal" | "bold" | "double_h" | "double_hw";
    grandTotalStyle?: "normal" | "bold" | "double_h" | "double_hw";
    kotHeaderStyle?: "normal" | "bold" | "double_h" | "double_hw";
    kotTokenStyle?: "normal" | "bold" | "double_h" | "double_hw";
    bottomFeeds?: number;
    cutPaper?: boolean;
    customGreetingMessage?: string;
    phonePrefixType?: string;
    secondaryPhone?: string;
}

export const DEFAULT_BT_PRINT_SETTINGS: BluetoothPrintSettings = {
    showLogo: true,
    showBusinessName: true,
    showTagline: true,
    showContact: true,
    showAddress: true,
    showGST: true,
    showFSSAI: true,
    showBillTypeHeader: true,
    showInvoiceNumber: true,
    showToken: true,
    showDate: true,
    showTableInfo: true,
    showCustomerDetails: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showFoodTypeSuffix: true,
    showVariants: true,
    showSubtotal: true,
    showDiscount: true,
    showDeliveryCharge: true,
    showPackagingCharge: true,
    showServiceCharge: true,
    showTaxBreakup: true,
    showGrandTotal: true,
    showAmountInWords: true,
    showPaymentMode: true,
    showPaymentStatus: true,
    showBalanceDue: true,
    showUpiQr: true,
    showMenuQr: true,
    showGreetings: true,
    showPoweredBy: true,
    printTokenTicket: false,

    showKOTHeader: true,
    showKOTTable: true,
    showKOTToken: true,
    showKOTBillNo: true,
    showKOTDateTime: true,
    showKOTCustomer: true,
    showKOTItemDivider: true,
    showKOTVariants: true,
    showKOTInstructions: true,
    showKOTFooter: true,

    // Default Sliders (matching USB defaults)
    logoSize: 50,
    logoBottomSpace: 0,
    upiQrSize: 160,
    businessNameSize: 18,
    addressSize: 11,
    taglineSize: 11,
    receiptTokenSize: 28,
    itemsFontSize: 11,
    grandTotalFontSize: 13,
    customerDetailsFontSize: 10,
    detailsFontSize: 10,
    greetingsFooterSize: 12,

    kotTokenSize: 16,
    kotHeaderDetailsSize: 11,
    kotItemsFontSize: 11,
    kotQuantityFontSize: 14,

    paperWidth: "58mm",
    businessNameStyle: "double_h",
    tokenStyle: "double_h",
    grandTotalStyle: "double_h",
    kotHeaderStyle: "bold",
    kotTokenStyle: "double_h",
    bottomFeeds: 4,
    cutPaper: true,
    customGreetingMessage: "",
    phonePrefixType: "TEXT",
    secondaryPhone: ""
};

export function getEffectiveBtSettings(business: any): BluetoothPrintSettings {
    const raw = business?.btPrintSettings || business?.printSettings?.bluetooth || {};
    return { ...DEFAULT_BT_PRINT_SETTINGS, ...raw };
}

/**
 * Intelligent Business Name Auto-Fit & Multi-Line Layout Engine.
 * 
 * Handles 58mm (32 normal cols) and 80mm (48 normal cols) thermal printers.
 * Ensures:
 * 1. Complete business name fits on 1 line if possible by auto-scaling font style.
 * 2. If wrapping is required, splits strictly at word boundaries into balanced lines.
 * 3. Never splits in the middle of a word and NEVER leaves an orphan single character (e.g. 't').
 * 4. Applies optimal ESC/POS styling (double_hw, double_h, bold, normal) to match preview and actual print.
 */
export interface FormattedBusinessNameLine {
    text: string;
    style: string;
}

export function formatBusinessName(
    name: string,
    paperWidth: "58mm" | "80mm" = "58mm",
    requestedStyle: string = "double_h"
): FormattedBusinessNameLine[] {
    name = (name || "").trim();
    if (!name) return [{ text: "", style: "normal" }];

    const maxCols = paperWidth === "80mm" ? 48 : 32;

    const styleWidthMultiplier: Record<string, number> = {
        quad: 4,
        triple: 3,
        giant: 3,
        double_hw: 2,
        double_w: 2,
        double_h: 1,
        bold: 1,
        normal: 1
    };

    const styleOrder = ["quad", "triple", "double_hw", "double_h", "bold", "normal"];
    const startIdx = Math.max(0, styleOrder.indexOf(requestedStyle));

    // 1. Check if name fits completely on 1 single line at requested style or downsized style
    for (let i = startIdx; i < styleOrder.length; i++) {
        const style = styleOrder[i];
        const mult = styleWidthMultiplier[style] || 1;
        const maxChars = Math.floor(maxCols / mult);
        if (name.length <= maxChars) {
            return [{ text: name, style }];
        }
    }

    // 2. Unavoidable multi-line: wrap cleanly at word boundaries
    const words = name.split(/\s+/);
    let lines: string[] = [];

    if (words.length <= 1) {
        // Single very long word without spaces
        lines = [name];
    } else if (name.length <= maxCols * 2) {
        // Split into 2 balanced lines
        let bestIdx = 1;
        let bestDiff = Infinity;
        for (let i = 1; i < words.length; i++) {
            const line1 = words.slice(0, i).join(" ");
            const line2 = words.slice(i).join(" ");
            if (line1.length <= maxCols && line2.length <= maxCols) {
                const diff = Math.abs(line1.length - line2.length);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
        }
        if (bestDiff !== Infinity) {
            lines = [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
        }
    }

    if (lines.length === 0) {
        // Multi-line greedy wrap (for very long names >= 3 lines)
        let cur = "";
        for (const w of words) {
            if (!cur) {
                cur = w;
            } else if ((cur + " " + w).length <= maxCols) {
                cur += " " + w;
            } else {
                lines.push(cur);
                cur = w;
            }
        }
        if (cur) lines.push(cur);

        // Prevent orphan single-word line at the end
        if (lines.length >= 2) {
            const last = lines[lines.length - 1];
            if (last.split(/\s+/).length === 1) {
                const prevWords = lines[lines.length - 2].split(/\s+/);
                if (prevWords.length >= 2) {
                    const moved = prevWords.pop()!;
                    const newPrev = prevWords.join(" ");
                    const newLast = moved + " " + last;
                    if (newLast.length <= maxCols) {
                        lines[lines.length - 2] = newPrev;
                        lines[lines.length - 1] = newLast;
                    }
                }
            }
        }
    }

    // Determine font style for wrapped lines
    const halfWidth = Math.floor(maxCols / 2);
    const allFitDoubleHw = lines.every(l => l.length <= halfWidth);

    let finalStyle = "double_h";
    if (requestedStyle === "normal") {
        finalStyle = "normal";
    } else if (requestedStyle === "bold") {
        finalStyle = "bold";
    } else if (allFitDoubleHw && ["double_hw", "triple", "quad"].includes(requestedStyle)) {
        finalStyle = "double_hw";
    } else {
        finalStyle = "double_h";
    }

    return lines.map(l => ({ text: l, style: finalStyle }));
}

// Lazy loader for Capacitor Native Bluetooth LE plugin (only used in Android/iOS native app)
let capBleModule: any = null;
async function getCapacitorBle() {
    if (!Capacitor.isNativePlatform()) return null;
    if (!capBleModule) {
        try {
            capBleModule = await import('@capacitor-community/bluetooth-le');
        } catch (e) {
            console.warn("Capacitor Bluetooth LE plugin failed to load:", e);
            return null;
        }
    }
    return capBleModule;
}

export const PRINTER_SERVICE_UUIDS = [
    "000018f0-0000-1000-8000-00805f9b34fb", // Generic POS
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", 
    "0000fee7-0000-1000-8000-00805f9b34fb", 
    "49535343-fe7d-4ae5-8fa9-9fafd205e455"
];

export type PrinterSlot = 'bill' | 'kot';

export function isSamePrinterForKot(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem("bt_same_printer_for_kot");
    return val === null ? true : val === "true"; // Default to true for convenience
}

export function setSamePrinterForKot(val: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem("bt_same_printer_for_kot", String(val));
    if (val && printerSlots.bill.device) {
        printerSlots.kot.device = printerSlots.bill.device;
        printerSlots.kot.server = printerSlots.bill.server;
        printerSlots.kot.char = printerSlots.bill.char;
    }
    if (val && printerSlots.bill.capDevice) {
        printerSlots.kot.capDevice = printerSlots.bill.capDevice;
        printerSlots.kot.capService = printerSlots.bill.capService;
        printerSlots.kot.capChar = printerSlots.bill.capChar;
        printerSlots.kot.capMtu = printerSlots.bill.capMtu;
        printerSlots.kot.capCanWriteWithoutResponse = printerSlots.bill.capCanWriteWithoutResponse;
    }
}

export type PrinterLiveStatus = 'DISCONNECTED' | 'DISCOVERING' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'PRINTING' | 'ERROR';

// State per slot ('bill' and 'kot')
interface PrinterState {
    device: any | null;
    server: any | null;
    char: any | null;
    capDevice: any | null;
    capService: string;
    capChar: string;
    capMtu: number;
    capCanWriteWithoutResponse: boolean;
    connPromise: Promise<any> | null;
    status: PrinterLiveStatus;
    lastError: string | null;
}

const printerSlots: Record<PrinterSlot, PrinterState> = {
    bill: {
        device: null,
        server: null,
        char: null,
        capDevice: null,
        capService: "",
        capChar: "",
        capMtu: 20,
        capCanWriteWithoutResponse: false,
        connPromise: null,
        status: 'DISCONNECTED',
        lastError: null,
    },
    kot: {
        device: null,
        server: null,
        char: null,
        capDevice: null,
        capService: "",
        capChar: "",
        capMtu: 20,
        capCanWriteWithoutResponse: false,
        connPromise: null,
        status: 'DISCONNECTED',
        lastError: null,
    }
};

export type RecoveryModalCallback = (details: {
    slot: PrinterSlot;
    error: string;
    printerName: string | null;
    onRetry: () => Promise<void>;
    onScan: () => Promise<void>;
    uncertainOutcome?: boolean;
    isPermissionError?: boolean;
    onOpenAppSettings?: () => Promise<void>;
    onOpenLocationSettings?: () => Promise<void>;
}) => void;

let recoveryModalHandler: RecoveryModalCallback | null = null;
let lastRecoveryDetails: any = null;

export function registerPrinterRecoveryHandler(handler: RecoveryModalCallback | null) {
    recoveryModalHandler = handler;
    // If a recovery was triggered before handler was registered, show it immediately
    if (handler && lastRecoveryDetails) {
        try { handler(lastRecoveryDetails); } catch (e) {}
    }
}

export function isBluetoothPermissionError(errorMsg: string): boolean {
    if (!errorMsg) return false;
    const lower = errorMsg.toLowerCase();
    return (
        lower.includes("permission denied") ||
        lower.includes("permission decline") ||
        lower.includes("not allowed") ||
        lower.includes("securityexception") ||
        lower.includes("bluetooth_scan") ||
        lower.includes("bluetooth_connect") ||
        lower.includes("access_fine_location") ||
        lower.includes("location permission")
    );
}

export async function openNativeAppSettings(): Promise<void> {
    const ble = await getCapacitorBle();
    if (ble?.BleClient?.openAppSettings) {
        await ble.BleClient.openAppSettings();
    }
}

export async function openNativeLocationSettings(): Promise<void> {
    const ble = await getCapacitorBle();
    if (ble?.BleClient?.openLocationSettings) {
        await ble.BleClient.openLocationSettings();
    }
}

export function triggerPrinterRecoveryModal(details: {
    slot: PrinterSlot;
    error: string;
    printerName: string | null;
    onRetry: () => Promise<void>;
    onScan: () => Promise<void>;
    uncertainOutcome?: boolean;
    isPermissionError?: boolean;
    onOpenAppSettings?: () => Promise<void>;
    onOpenLocationSettings?: () => Promise<void>;
}) {
    lastRecoveryDetails = details;
    if (recoveryModalHandler) {
        recoveryModalHandler(details);
    }
    // Also dispatch custom DOM event as a universal fail-safe
    if (typeof window !== "undefined") {
        try {
            window.dispatchEvent(new CustomEvent("kravy-trigger-printer-recovery", { detail: details }));
        } catch (e) {}
    }
}

export function getPrinterLiveStatus(slot: PrinterSlot = 'bill'): { status: PrinterLiveStatus; lastError: string | null } {
    const effectiveSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;
    const state = printerSlots[effectiveSlot];
    const isConn = isPrinterConnected(effectiveSlot);
    if (!isConn && state.status === 'CONNECTED') {
        state.status = 'DISCONNECTED';
    } else if (isConn && (state.status === 'DISCONNECTED' || state.status === 'ERROR')) {
        state.status = 'CONNECTED';
    }
    return { status: state.status, lastError: state.lastError };
}

// Global serial write queue to serialize all writes to physical Bluetooth printers
let printQueuePromise: Promise<any> = Promise.resolve();
export function enqueuePrintTask<T>(task: () => Promise<T>): Promise<T> {
    const run = () => task();
    const res = printQueuePromise.then(run, run);
    printQueuePromise = res.catch(() => {});
    return res;
}

function getStorageKeys(slot: PrinterSlot) {
    if (slot === 'kot' && !isSamePrinterForKot()) {
        return {
            idKey: "LAST_CONNECTED_KOT_PRINTER_ID",
            enabledKey: "bt_kot_printer_enabled",
        };
    }
    return {
        idKey: "LAST_CONNECTED_BILL_PRINTER_ID", // with fallback to LAST_CONNECTED_PRINTER_ID
        enabledKey: slot === 'kot' ? "bt_kot_printer_enabled" : "bt_bill_printer_enabled",
    };
}

// Disconnect helper that releases a slot or device safely
async function safeDisconnectDevice(targetDevice: any, isCap: boolean) {
    if (!targetDevice) return;
    try {
        if (isCap) {
            const ble = await getCapacitorBle();
            if (ble?.BleClient) {
                await ble.BleClient.disconnect(targetDevice.deviceId).catch(() => {});
            }
        } else {
            if (targetDevice.gatt?.connected) {
                targetDevice.gatt.disconnect();
            }
        }
    } catch (e) {
        console.warn("safeDisconnectDevice error:", e);
    }
}

export interface AuthorizedPrinterItem {
    id: string;
    name: string;
    type: 'WEB_BLUETOOTH' | 'CAPACITOR_BLE';
    isSaved: boolean;
    isConnected: boolean;
    nativeDeviceRef?: any;
}

/**
 * Lists previously authorized / paired devices without opening a new device picker prompt.
 * Uses Web Bluetooth navigator.bluetooth.getDevices() or localStorage/Capacitor state.
 */
export async function getAuthorizedPrinters(): Promise<AuthorizedPrinterItem[]> {
    const list: AuthorizedPrinterItem[] = [];
    const isCapacitor = Capacitor.isNativePlatform();

    if (isCapacitor) {
        if (typeof localStorage !== 'undefined') {
            const billId = localStorage.getItem("LAST_CONNECTED_BILL_PRINTER_ID") || localStorage.getItem("LAST_CONNECTED_PRINTER_ID");
            const kotId = localStorage.getItem("LAST_CONNECTED_KOT_PRINTER_ID");
            if (billId) {
                list.push({
                    id: billId,
                    name: printerSlots.bill.capDevice?.name || `Paired BLE (${billId.slice(0, 6)}...)`,
                    type: 'CAPACITOR_BLE',
                    isSaved: true,
                    isConnected: isPrinterConnected('bill')
                });
            }
            if (kotId && kotId !== billId && !isSamePrinterForKot()) {
                list.push({
                    id: kotId,
                    name: printerSlots.kot.capDevice?.name || `Paired KOT BLE (${kotId.slice(0, 6)}...)`,
                    type: 'CAPACITOR_BLE',
                    isSaved: true,
                    isConnected: isPrinterConnected('kot')
                });
            }
        }
        return list;
    }

    if (typeof navigator !== 'undefined' && navigator.bluetooth?.getDevices) {
        try {
            const authorized = await navigator.bluetooth.getDevices();
            const billSavedId = typeof localStorage !== 'undefined' ? (localStorage.getItem("LAST_CONNECTED_BILL_PRINTER_ID") || localStorage.getItem("LAST_CONNECTED_PRINTER_ID")) : null;
            const kotSavedId = typeof localStorage !== 'undefined' ? localStorage.getItem("LAST_CONNECTED_KOT_PRINTER_ID") : null;

            for (const dev of authorized) {
                const isSaved = dev.id === billSavedId || dev.id === kotSavedId;
                const isConnected = !!(dev.gatt?.connected);
                list.push({
                    id: dev.id,
                    name: dev.name || `Authorized Printer (${dev.id.slice(0, 6)}...)`,
                    type: 'WEB_BLUETOOTH',
                    isSaved,
                    isConnected,
                    nativeDeviceRef: dev
                });
            }
        } catch (err) {
            console.log("getAuthorizedPrinters getDevices error:", err);
        }
    }

    return list;
}

/**
 * Revoke permission / remove a device from the authorized list
 */
export async function forgetAuthorizedPrinter(deviceId: string): Promise<boolean> {
    try {
        if (typeof localStorage !== 'undefined') {
            if (localStorage.getItem("LAST_CONNECTED_BILL_PRINTER_ID") === deviceId) {
                localStorage.removeItem("LAST_CONNECTED_BILL_PRINTER_ID");
            }
            if (localStorage.getItem("LAST_CONNECTED_PRINTER_ID") === deviceId) {
                localStorage.removeItem("LAST_CONNECTED_PRINTER_ID");
            }
            if (localStorage.getItem("LAST_CONNECTED_KOT_PRINTER_ID") === deviceId) {
                localStorage.removeItem("LAST_CONNECTED_KOT_PRINTER_ID");
            }
        }

        // Web Bluetooth modern forget() API supported in Chrome 100+
        if (typeof navigator !== 'undefined' && navigator.bluetooth?.getDevices) {
            const authorized = await navigator.bluetooth.getDevices().catch(() => []);
            const target = authorized.find((d: any) => d.id === deviceId);
            if (target && typeof (target as any).forget === 'function') {
                if (target.gatt?.connected) {
                    try { target.gatt.disconnect(); } catch (e) {}
                }
                await (target as any).forget();
                return true;
            }
        }
        return true;
    } catch (e) {
        console.warn("forgetAuthorizedPrinter error:", e);
        return false;
    }
}

/**
 * Connect to an already authorized/bonded device directly without opening the OS scan dialog
 */
export async function connectAuthorizedPrinter(deviceId: string, slot: PrinterSlot = 'bill') {
    const effectiveSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;
    const isCapacitor = Capacitor.isNativePlatform();
    const { idKey } = getStorageKeys(effectiveSlot);

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(idKey, deviceId);
        if (effectiveSlot === 'bill') localStorage.setItem("LAST_CONNECTED_PRINTER_ID", deviceId);
    }

    // Attempt connecting directly via existing authorization
    return await ensurePrinterConnected(false, slot);
}

export async function ensurePrinterConnected(forcePrompt: boolean = false, slot: PrinterSlot = 'bill') {
    const isCapacitor = Capacitor.isNativePlatform();

    if (!isCapacitor && !navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser.");
    }

    // Determine actual effective target slot (if shared, 'kot' maps to 'bill')
    const effectiveSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;
    const state = printerSlots[effectiveSlot];
    const { idKey } = getStorageKeys(effectiveSlot);

    if (state.connPromise && !forcePrompt) {
        return await state.connPromise;
    }

    state.connPromise = (async () => {
        if (isCapacitor) {
            try {
                const ble = await getCapacitorBle();
                if (!ble?.BleClient) {
                    throw new Error("Capacitor Bluetooth plugin is unavailable on this device.");
                }
                const { BleClient } = ble;

                await BleClient.initialize();
                
                // If not forcing prompt, check if connection is genuinely alive
                if (!forcePrompt && state.capDevice && state.capChar) {
                    try {
                        const isConn = await BleClient.isEnabled().catch(() => true);
                        if (isConn) {
                            if (slot === 'kot' && isSamePrinterForKot()) {
                                syncSharedStateToKot();
                            }
                            return { capacitor: true };
                        }
                    } catch (e) {}
                }

                if (forcePrompt) {
                    // Only disconnect if the other slot is not actively using this device
                    const otherSlot: PrinterSlot = effectiveSlot === 'bill' ? 'kot' : 'bill';
                    const isOtherUsingSame = !isSamePrinterForKot() && printerSlots[otherSlot]?.capDevice?.deviceId === state.capDevice?.deviceId;
                    if (state.capDevice && !isOtherUsingSame) {
                        await safeDisconnectDevice(state.capDevice, true);
                    }
                    state.capDevice = null;
                    state.capChar = "";
                }

                let savedCapacitorId = typeof localStorage !== 'undefined' ? localStorage.getItem(idKey) : null;
                if (!savedCapacitorId && effectiveSlot === 'bill' && typeof localStorage !== 'undefined') {
                    savedCapacitorId = localStorage.getItem("LAST_CONNECTED_PRINTER_ID");
                }

                // If connecting to a previously saved printer without forcePrompt,
                // try connecting to it. If it fails (switched OFF / busy), notify with BLE error popup
                // and IMMEDIATELY prompt device selection window to choose another printer!
                if (!forcePrompt && !state.capDevice && savedCapacitorId) {
                    try {
                        state.capDevice = { deviceId: savedCapacitorId };
                    } catch(e) {}
                }

                if (state.capDevice && !state.capChar && !forcePrompt) {
                    try {
                        await BleClient.connect(state.capDevice.deviceId, (deviceId) => {
                            if (state.capDevice?.deviceId === deviceId) {
                                state.capChar = "";
                                state.capMtu = 20;
                                state.capCanWriteWithoutResponse = false;
                            }
                            if (isSamePrinterForKot() && printerSlots.kot.capDevice?.deviceId === deviceId) {
                                printerSlots.kot.capChar = "";
                            }
                            console.log(`Capacitor Printer [${effectiveSlot}] disconnected`, deviceId);
                        });
                    } catch (reconError: any) {
                        const savedName = getConnectedPrinterName(slot) || "Printer";
                        console.warn(`Saved printer [${savedCapacitorId}] connect failed:`, reconError);
                        // Clean up pending connection so scanner is NOT blocked
                        try { await BleClient.disconnect(state.capDevice.deviceId); } catch (e) {}
                        state.capDevice = null;
                        state.capChar = "";

                        // Show BLE error notification / recovery modal
                        const bleErrorMsg = "Your printer may be switched OFF or connected to another device. Please check the printer and try again.";
                        triggerPrinterRecoveryModal({
                            slot,
                            error: bleErrorMsg,
                            printerName: savedName,
                            onRetry: async () => { await ensurePrinterConnected(false, slot); },
                            onScan: async () => { await ensurePrinterConnected(true, slot); },
                            onOpenAppSettings: openNativeAppSettings,
                            onOpenLocationSettings: openNativeLocationSettings,
                        });

                        // Automatically open Bluetooth scanning/selection window if user didn't dismiss
                        try {
                            state.capDevice = await BleClient.requestDevice({});
                        } catch (scanErr: any) {
                            state.status = 'ERROR';
                            state.lastError = bleErrorMsg;
                            // Re-trigger the Recovery Modal on cancellation/error so user can tap Retry or Scan again from modal
                            triggerPrinterRecoveryModal({
                                slot,
                                error: bleErrorMsg,
                                printerName: savedName,
                                onRetry: async () => { await ensurePrinterConnected(false, slot); },
                                onScan: async () => { await ensurePrinterConnected(true, slot); },
                                onOpenAppSettings: openNativeAppSettings,
                                onOpenLocationSettings: openNativeLocationSettings,
                            });
                            throw new Error(bleErrorMsg);
                        }
                    }
                }

                if (!state.capDevice) {
                    state.capDevice = await BleClient.requestDevice({});
                }

                // Connect to the selected device if not already connected
                await BleClient.connect(state.capDevice.deviceId, (deviceId) => {
                    if (state.capDevice?.deviceId === deviceId) {
                        state.capChar = "";
                        state.capMtu = 20;
                        state.capCanWriteWithoutResponse = false;
                    }
                    if (isSamePrinterForKot() && printerSlots.kot.capDevice?.deviceId === deviceId) {
                        printerSlots.kot.capChar = "";
                    }
                    console.log(`Capacitor Printer [${effectiveSlot}] disconnected`, deviceId);
                });

                try {
                    await BleClient.requestConnectionPriority(state.capDevice.deviceId, 1);
                } catch(e) {}
                try {
                    const mtuResult = await BleClient.requestMtu(state.capDevice.deviceId, 512);
                    if (typeof mtuResult === 'number' && mtuResult > 23) {
                        state.capMtu = mtuResult - 3;
                    } else {
                        state.capMtu = 128;
                    }
                } catch(e) {
                    state.capMtu = 100;
                }

                const services = await BleClient.getServices(state.capDevice.deviceId);
                
                for (const knownUuid of PRINTER_SERVICE_UUIDS) {
                    const match = services.find(s => s.uuid.toLowerCase() === knownUuid.toLowerCase() || s.uuid.toLowerCase().includes(knownUuid.substring(4, 8).toLowerCase()));
                    if (match) {
                        const targetCharNoResp = match.characteristics.find(c => c.properties?.writeWithoutResponse);
                        const targetCharResp = match.characteristics.find(c => c.properties?.write);
                        if (targetCharNoResp) {
                            state.capService = match.uuid;
                            state.capChar = targetCharNoResp.uuid;
                            state.capCanWriteWithoutResponse = true;
                            break;
                        } else if (targetCharResp) {
                            state.capService = match.uuid;
                            state.capChar = targetCharResp.uuid;
                            state.capCanWriteWithoutResponse = false;
                            break;
                        }
                    }
                }

                if (!state.capChar) {
                    for (const service of services) {
                        const sUuid = service.uuid.toLowerCase();
                        if (sUuid.includes("1800") || sUuid.includes("1801") || sUuid.includes("180a")) continue;
                        const targetCharNoResp = service.characteristics.find(c => c.properties?.writeWithoutResponse);
                        const targetCharResp = service.characteristics.find(c => c.properties?.write);
                        if (targetCharNoResp) {
                            state.capService = service.uuid;
                            state.capChar = targetCharNoResp.uuid;
                            state.capCanWriteWithoutResponse = true;
                            break;
                        } else if (targetCharResp) {
                            state.capService = service.uuid;
                            state.capChar = targetCharResp.uuid;
                            state.capCanWriteWithoutResponse = false;
                            break;
                        }
                    }
                }

                if (!state.capChar) {
                    throw new Error("No writable characteristic found on this device.");
                }

                if (state.capDevice?.deviceId && typeof localStorage !== 'undefined') {
                    localStorage.setItem(idKey, state.capDevice.deviceId);
                    if (effectiveSlot === 'bill') localStorage.setItem("LAST_CONNECTED_PRINTER_ID", state.capDevice.deviceId);
                }

                if (isSamePrinterForKot()) {
                    syncSharedStateToKot();
                }

                return { capacitor: true };
            } catch (error: any) {
                state.capChar = "";
                const rawMsg = error?.message || String(error);
                let actionableMsg = rawMsg;
                const isPermError = isBluetoothPermissionError(rawMsg);
                if (isPermError) {
                    actionableMsg = `Bluetooth / Location permission allow nahi hai. Kripya app settings mein jakar Nearby devices (Bluetooth) aur Location permissions allow karein. (${rawMsg})`;
                    triggerPrinterRecoveryModal({
                        slot,
                        error: actionableMsg,
                        printerName: getConnectedPrinterName(slot) || "Bluetooth Thermal Printer",
                        isPermissionError: true,
                        onRetry: async () => { await ensurePrinterConnected(false, slot); },
                        onScan: async () => { await ensurePrinterConnected(true, slot); },
                        onOpenAppSettings: openNativeAppSettings,
                        onOpenLocationSettings: openNativeLocationSettings,
                    });
                } else if (rawMsg.includes("133") || rawMsg.includes("status: 19") || rawMsg.includes("GATT") || rawMsg.includes("timeout") || rawMsg.includes("failed to connect")) {
                    actionableMsg = `Printer connect nahi ho paya. Yeh kisi doosre phone se connected ho sakta hai. Kripya doosre phone se disconnect karein ya printer ko restart karein. (${rawMsg})`;
                }
                triggerPrinterRecoveryModal({
                    slot,
                    error: actionableMsg,
                    printerName: getConnectedPrinterName(slot) || "Bluetooth Thermal Printer",
                    isPermissionError: isPermError,
                    onRetry: async () => { await ensurePrinterConnected(false, slot); },
                    onScan: async () => { await ensurePrinterConnected(true, slot); },
                    onOpenAppSettings: openNativeAppSettings,
                    onOpenLocationSettings: openNativeLocationSettings,
                });
                state.status = 'ERROR';
                state.lastError = actionableMsg;
                throw new Error("Capacitor BLE Error: " + actionableMsg);
            }
        }

        try {
            // Web Bluetooth Flow
            // If already connected and characteristic is valid, verify GATT connection
            if (!forcePrompt && state.device && state.device.gatt?.connected && state.char) {
                if (slot === 'kot' && isSamePrinterForKot()) {
                    syncSharedStateToKot();
                }
                return state.char;
            }

            // If device exists but gatt.connected is false (idle sleep), attempt controlled reconnect
            if (!forcePrompt && state.device && !state.device.gatt?.connected) {
                try {
                    console.log(`[${effectiveSlot}] Device idle/disconnected. Attempting single controlled reconnect...`);
                    state.server = await state.device.gatt.connect();
                    if (state.server) {
                        state.char = await discoverPrinterCharacteristic(state.server);
                        if (state.char) {
                            if (isSamePrinterForKot()) syncSharedStateToKot();
                            return state.char;
                        }
                    }
                } catch (reconnectErr) {
                    console.log(`Silent reconnect failed for [${effectiveSlot}], proceeding to discovery...`, reconnectErr);
                    state.server = null;
                    state.char = null;
                }
            }

            const previousDevice = state.device;
            let autoReconnected = false;
            let lastPrinterId = typeof localStorage !== 'undefined' ? localStorage.getItem(idKey) : null;
            if (!lastPrinterId && effectiveSlot === 'bill' && typeof localStorage !== 'undefined') {
                lastPrinterId = localStorage.getItem("LAST_CONNECTED_PRINTER_ID");
            }

            let targetDevice: BluetoothDevice | null = null;

            // Try getDevices() for silent reconnection without popup if supported
            if (!forcePrompt && !state.device && navigator.bluetooth.getDevices) {
                try {
                    const devices = await navigator.bluetooth.getDevices();
                    if (lastPrinterId) {
                        const savedDevice = devices.find(d => d.id === lastPrinterId);
                        if (savedDevice) {
                            targetDevice = savedDevice;
                            autoReconnected = true;
                        }
                    }
                    if (!autoReconnected && devices.length > 0) {
                        targetDevice = devices[0];
                        autoReconnected = true;
                    }
                } catch(e) {
                    console.log(`Auto-reconnect getDevices failed for [${effectiveSlot}]:`, e);
                }
            }

            // If an auto-reconnect targetDevice exists, attempt to connect to it.
            // If that connection fails (switched off / busy / rejected), show the BLE Error popup
            // AND immediately open the Bluetooth Device Selection dialog without blocking!
            if (targetDevice && autoReconnected) {
                let silentRetries = 2;
                let silentErr: any = null;
                while (silentRetries > 0) {
                    try {
                        if (targetDevice.gatt?.connected) {
                            state.server = targetDevice.gatt;
                            break;
                        }
                        state.server = await targetDevice.gatt?.connect() || null;
                        if (state.server) break;
                    } catch (err: any) {
                        silentErr = err;
                        silentRetries--;
                        if (silentRetries > 0) {
                            await new Promise(r => setTimeout(r, 300));
                        }
                    }
                }

                if (!state.server) {
                    console.warn(`Saved printer [${targetDevice.name || targetDevice.id}] connect failed:`, silentErr);
                    // Disconnect/cleanup failed pending connection so scanning is not blocked
                    try { targetDevice.gatt?.disconnect(); } catch (e) {}
                    const failedPrinterName = targetDevice.name || "Bluetooth Printer";
                    targetDevice = null;
                    autoReconnected = false;

                    // Show BLE error message via Recovery Modal
                    const bleErrorMsg = "Your printer may be switched OFF or connected to another device. Please check the printer and try again.";
                    triggerPrinterRecoveryModal({
                        slot,
                        error: bleErrorMsg,
                        printerName: failedPrinterName,
                        onRetry: async () => { await ensurePrinterConnected(false, slot); },
                        onScan: async () => { await ensurePrinterConnected(true, slot); }
                    });
                    // Fall-through: targetDevice is null now, so scanning window will open automatically below!
                }
            }

            // Before requesting device with prompt, if user explicitly clicked connect/change,
            // gracefully release the old connection so the printer can advertise if necessary
            if (forcePrompt && previousDevice && previousDevice.gatt?.connected) {
                const otherSlot: PrinterSlot = effectiveSlot === 'bill' ? 'kot' : 'bill';
                const isOtherUsingSame = !isSamePrinterForKot() && printerSlots[otherSlot]?.device === previousDevice;
                if (!isOtherUsingSame) {
                    try { previousDevice.gatt.disconnect(); } catch (e) {}
                }
            }

            if (!targetDevice) {
                // Strategy: 
                // In Chrome, acceptAllDevices: true causes every nearby smart TV, earphone, smartwatch, beacon, etc.
                // to appear as "Unknown or Unsupported Device", making the thermal printer almost impossible to spot!
                // We first attempt a clean filtered discovery matching known POS printer services/prefixes.
                // If cancelled or rejected, or if user prefers full scan, fallback gracefully.
                try {
                    // Try service-filtered search first so Chrome dialog shows clean printer devices
                    targetDevice = await navigator.bluetooth.requestDevice({
                        filters: [
                            { services: ["000018f0-0000-1000-8000-00805f9b34fb"] },
                            { services: ["e7810a71-73ae-499d-8c15-faa9aef0c3f2"] },
                            { services: ["0000fee7-0000-1000-8000-00805f9b34fb"] },
                            { services: ["49535343-fe7d-4ae5-8fa9-9fafd205e455"] },
                            { namePrefix: "POS" },
                            { namePrefix: "RP" },
                            { namePrefix: "Printer" },
                            { namePrefix: "BT" },
                            { namePrefix: "MPT" },
                            { namePrefix: "MTP" },
                            { namePrefix: "MT" },
                            { namePrefix: "PSF" },
                            { namePrefix: "SR" },
                            { namePrefix: "InnerPrinter" },
                            { namePrefix: "Everycom" },
                            { namePrefix: "TVS" },
                            { namePrefix: "58" },
                            { namePrefix: "80" },
                            { namePrefix: "219" },
                            { namePrefix: "M58" },
                            { namePrefix: "Thermal" }
                        ],
                        optionalServices: PRINTER_SERVICE_UUIDS
                    });
                } catch (filterError: any) {
                    if (filterError.name === 'NotFoundError' || filterError.message?.includes('cancelled')) {
                        // User cancelled the dialog or the printer didn't match the prefix/service filter.
                        // We do not immediately fail: if forcePrompt was clicked, give one fallback to acceptAllDevices
                        // only if user didn't explicitly hit Cancel
                        const isCancel = filterError.message?.includes('User cancelled') || filterError.message?.includes('cancelled');
                        if (isCancel) {
                            throw new Error("Printer selection was cancelled.");
                        }
                    }
                    
                    // Fallback to acceptAllDevices if filtered scan was unsupported by specific printer firmware
                    try {
                        targetDevice = await navigator.bluetooth.requestDevice({
                            acceptAllDevices: true,
                            optionalServices: PRINTER_SERVICE_UUIDS
                        });
                    } catch (fallbackError: any) {
                        console.log(`Device request cancelled or failed [${effectiveSlot}]:`, fallbackError);
                        if (fallbackError.name === 'NotFoundError' || fallbackError.message?.includes('cancelled')) {
                            throw new Error("Printer selection was cancelled.");
                        }
                        throw new Error("Failed to request bluetooth device: " + fallbackError.message);
                    }
                }
            }

            state.device = targetDevice;

            const onDisconnect = () => {
                state.server = null;
                state.char = null;
                if (isSamePrinterForKot() && effectiveSlot === 'bill') {
                    printerSlots.kot.server = null;
                    printerSlots.kot.char = null;
                }
                console.log(`Printer [${effectiveSlot}] disconnected (gattserverdisconnected)`);
            };

            // Avoid adding duplicate listener
            state.device.removeEventListener("gattserverdisconnected", onDisconnect);
            state.device.addEventListener("gattserverdisconnected", onDisconnect);

            let retries = 3;
            let connectError: any = null;
            
            while (retries > 0) {
                try {
                    if (state.device.gatt?.connected) {
                        state.server = state.device.gatt;
                        break;
                    }
                    state.server = await state.device.gatt?.connect() || null;
                    if (state.server) break;
                } catch (error) {
                    connectError = error;
                    console.log(`GATT Connect attempt [${effectiveSlot}] failed. Retries left: ${retries - 1}`, error);
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                }
            }

            if (!state.server) {
                const rawMsg = connectError?.message || "";
                let actionableMsg = `Could not connect to ${effectiveSlot.toUpperCase()} printer.`;
                if (rawMsg.includes("Connection failed") || rawMsg.includes("GATT") || rawMsg.includes("busy") || rawMsg.includes("status: 133") || rawMsg.includes("status: 19") || rawMsg.includes("timeout")) {
                    actionableMsg = `Printer busy ya kisi doosre phone se connected ho sakta hai. Kripya doosre phone ka Bluetooth OFF karein ya printer ko restart karein. (${rawMsg || "Connection Rejected"})`;
                } else if (rawMsg) {
                    actionableMsg = rawMsg;
                }
                state.status = 'ERROR';
                state.lastError = actionableMsg;
                throw new Error(actionableMsg);
            }
            
            if (state.device && state.device.id && typeof localStorage !== 'undefined') {
                localStorage.setItem(idKey, state.device.id);
                if (effectiveSlot === 'bill') localStorage.setItem("LAST_CONNECTED_PRINTER_ID", state.device.id);
            }

            // Discover writable characteristic
            const printChar = await discoverPrinterCharacteristic(state.server);
            if (!printChar) {
                state.status = 'ERROR';
                state.lastError = "No writable characteristic found on this printer.";
                throw new Error("No writable characteristic found on this printer.");
            }
            
            state.char = printChar;
            state.status = 'CONNECTED';
            state.lastError = null;
            if (isSamePrinterForKot()) {
                syncSharedStateToKot();
            }
            return state.char;
        } catch (e: any) {
            state.server = null;
            state.char = null;
            state.status = 'ERROR';
            state.lastError = e?.message || "Connection failed";
            throw e;
        } finally {
            state.connPromise = null;
        }
    })();
    return state.connPromise;
}

// Helper to discover writable characteristic from GATT server
async function discoverPrinterCharacteristic(gattServer: any): Promise<BluetoothRemoteGATTCharacteristic | null> {
    let printChar: BluetoothRemoteGATTCharacteristic | null = null;
    for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
            const service = await gattServer.getPrimaryService(uuid);
            const characteristics = await service.getCharacteristics();
            printChar = characteristics.find((c: any) => c.properties.writeWithoutResponse) ||
                        characteristics.find((c: any) => c.properties.write) || null;
        } catch (e) {}
        if (printChar) break;
    }

    if (!printChar) {
        try {
            const services = await gattServer.getPrimaryServices();
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                printChar = characteristics.find((c: any) => c.properties.writeWithoutResponse) ||
                            characteristics.find((c: any) => c.properties.write) || null;
                if (printChar) break;
            }
        } catch (e) {}
    }
    return printChar;
}

function syncSharedStateToKot() {
    const b = printerSlots.bill;
    const k = printerSlots.kot;
    k.device = b.device;
    k.server = b.server;
    k.char = b.char;
    k.capDevice = b.capDevice;
    k.capService = b.capService;
    k.capChar = b.capChar;
    k.capMtu = b.capMtu;
    k.capCanWriteWithoutResponse = b.capCanWriteWithoutResponse;
}

export function isPrinterConnected(slot: PrinterSlot = 'bill'): boolean {
    const isCapacitor = Capacitor.isNativePlatform();
    const targetSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;
    const state = printerSlots[targetSlot];

    if (isCapacitor) {
        if (state.capDevice && state.capChar) return true;
        if (slot === 'kot' && printerSlots.bill.capDevice && printerSlots.bill.capChar) return true;
        return false;
    }
    if (state.device && state.device.gatt?.connected && state.char) return true;
    if (slot === 'kot' && printerSlots.bill.device && printerSlots.bill.device.gatt?.connected && printerSlots.bill.char) return true;
    return false;
}

export function isSlotStrictlyConnected(slot: PrinterSlot): boolean {
    const isCapacitor = Capacitor.isNativePlatform();
    const state = printerSlots[slot];
    if (isCapacitor) {
        return !!(state.capDevice && state.capChar);
    }
    return !!(state.device && state.device.gatt?.connected && state.char);
}

export function getConnectedPrinterName(slot: PrinterSlot = 'bill'): string | null {
    const isCapacitor = Capacitor.isNativePlatform();
    const state = printerSlots[slot];
    if (isCapacitor) {
        if (state.capDevice) {
            return state.capDevice.name || (state.capDevice.deviceId ? `BLE Printer (${state.capDevice.deviceId.slice(0, 5)})` : null);
        }
        if (slot === 'kot' && printerSlots.bill.capDevice) {
            const b = printerSlots.bill.capDevice;
            return b.name || (b.deviceId ? `BLE Printer (${b.deviceId.slice(0, 5)})` : null);
        }
        return null;
    }
    if (state.device) {
        return state.device.name || (state.device.id ? `BT Printer (${state.device.id.slice(0, 5)})` : null);
    }
    if (slot === 'kot' && printerSlots.bill.device) {
        const b = printerSlots.bill.device;
        return b.name || (b.id ? `BT Printer (${b.id.slice(0, 5)})` : null);
    }
    return null;
}


const calculateTaxBreakup: any = (order, business) => {
    const items = order?.items || [];
    const perProductEnabled = true;
    const globalRate = 0;
    
    const discountAmt = order?.discountAmount || order?.discountAmt || order?.discount || 0;
    const subtotal = order?.subtotal || items.reduce((acc, i) => acc + ((i.qty || i.quantity || 1) * (i.price || i.rate || 0)), 0);
    const discountRatio = subtotal > 0 ? (subtotal - discountAmt) / subtotal : 1;
    
    const isInterState = order?.placeOfSupply && business?.state && 
        order.placeOfSupply.trim().toLowerCase() !== business.state.trim().toLowerCase();

    const taxGroups = items.reduce((acc, item) => {
        let rate = 0;
        if (item.gst !== undefined && item.gst !== null && Number(item.gst) > 0) {
            rate = Number(item.gst);
        } else if ((order?.tax || 0) > 0) {
            rate = globalRate;
        }
        
        if (rate <= 0) return acc;
        
        const qty = item.qty || item.quantity || 1;
        const price = item.price || item.rate || 0;
        const gross = (qty * price) * discountRatio;
        
        let taxable = gross;
        let gst = 0;
        
        const taxStatus = item.taxStatus || "Without Tax";
        let isInclusive = taxStatus === "With Tax";
        
        if (isInclusive) {
            taxable = gross / (1 + rate / 100);
            gst = gross - taxable;
        } else {
            taxable = gross;
            gst = (gross * rate) / 100;
        }
        
        if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
        acc[rate].taxable += taxable;
        
        if (isInterState) {
            acc[rate].igst += gst;
        } else {
            acc[rate].cgst += gst / 2;
            acc[rate].sgst += gst / 2;
        }
        acc[rate].totalTax += gst;
        return acc;
    }, {});
    
    return Object.values(taxGroups).map((g: any) => ({
        rate: g.rate,
        taxable: Number(g.taxable.toFixed(2)),
        cgst: Number(g.cgst.toFixed(2)),
        sgst: Number(g.sgst.toFixed(2)),
        igst: Number((g.igst || 0).toFixed(2)),
        totalTax: Number(g.totalTax.toFixed(2))
    }));
};

export async function printReceiptData(order: any, business: any, elementToPrint?: HTMLElement | null, targetSlot?: PrinterSlot) {
    return enqueuePrintTask(async () => {
        const isCapacitor = Capacitor.isNativePlatform();

        // Auto-detect slot if not provided
        const isKot = elementToPrint && elementToPrint.classList && elementToPrint.classList.contains('kot-container');
        const slot: PrinterSlot = targetSlot || (isKot ? 'kot' : 'bill');
        const effectiveSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;

        // Ensure printer is connected and characteristic is alive before printing
        let activeState = printerSlots[effectiveSlot];
        const isAlive = isCapacitor 
            ? !!(activeState.capDevice && activeState.capChar)
            : !!(activeState.char && activeState.device?.gatt?.connected);

        if (!isAlive) {
            console.log(`Printer [${effectiveSlot}] not active before print, attempting silent reconnect...`);
            activeState.status = 'RECONNECTING';
            try {
                await ensurePrinterConnected(false, effectiveSlot);
                activeState = printerSlots[effectiveSlot];
            } catch (reconErr: any) {
                activeState.status = 'ERROR';
                activeState.lastError = reconErr?.message || "Reconnection failed";
                console.warn(`Pre-print reconnect attempt failed for [${effectiveSlot}]:`, reconErr);
            }
        }

        if (isCapacitor) {
            if (!activeState.capDevice || !activeState.capChar) {
                // Check fallback slot
                const altSlot: PrinterSlot = effectiveSlot === 'kot' ? 'bill' : 'kot';
                if (printerSlots[altSlot].capDevice && printerSlots[altSlot].capChar) {
                    activeState = printerSlots[altSlot];
                }
            }
            if (!activeState.capDevice || !activeState.capChar) {
                const err = `Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer in settings.`;
                activeState.status = 'DISCONNECTED';
                activeState.lastError = err;
                triggerPrinterRecoveryModal({
                    slot,
                    error: err,
                    printerName: getConnectedPrinterName(slot),
                    onRetry: async () => { await ensurePrinterConnected(false, slot); },
                    onScan: async () => { await ensurePrinterConnected(true, slot); }
                });
                throw new Error(err);
            }
        } else {
            if (!activeState.char || !activeState.device?.gatt?.connected) {
                // Check fallback slot
                const altSlot: PrinterSlot = effectiveSlot === 'kot' ? 'bill' : 'kot';
                if (printerSlots[altSlot].char && printerSlots[altSlot].device?.gatt?.connected) {
                    activeState = printerSlots[altSlot];
                }
            }
            if (!activeState.char || !activeState.device?.gatt?.connected) {
                const err = `Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer in settings.`;
                activeState.status = 'DISCONNECTED';
                activeState.lastError = err;
                triggerPrinterRecoveryModal({
                    slot,
                    error: err,
                    printerName: getConnectedPrinterName(slot),
                    onRetry: async () => { await ensurePrinterConnected(false, slot); },
                    onScan: async () => { await ensurePrinterConnected(true, slot); }
                });
                throw new Error(err);
            }
        }

        activeState.status = 'PRINTING';

    try {
        const dataChunks: Uint8Array[] = [];
        const INIT = new Uint8Array([0x1B, 0x40]); // ESC @ (Initialize printer)
        const CODE_PAGE = new Uint8Array([0x1B, 0x74, 0x00]); // ESC t 0 (Select Standard Character Code Table PC437 / USA)
        const PAPER_CUT = new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
        
        dataChunks.push(INIT);
        dataChunks.push(CODE_PAGE);

        let printedAsImage = false;
        
        // Disable text-only mode so the user gets the full Image formatting (Logo, QR, UI exact copy).
        const FORCE_TEXT_MODE = true;
        
        const isKot = elementToPrint && elementToPrint.classList && elementToPrint.classList.contains('kot-container');

        if (elementToPrint && !FORCE_TEXT_MODE) {
            try {
                // Use html-to-image to capture the exact layout
                const { toCanvas } = await import("html-to-image");
                
                // Find all hidden ancestors and temporarily unhide them to ensure proper layout dimensions
                const hiddenAncestors: { el: HTMLElement, origDisplay: string, origPos: string, origLeft: string }[] = [];
                let curr: HTMLElement | null = elementToPrint;
                
                while (curr && curr !== document.body) {
                    const style = window.getComputedStyle(curr);
                    if (style.display === 'none' || curr.classList.contains('hidden')) {
                        hiddenAncestors.push({
                            el: curr,
                            origDisplay: curr.style.display,
                            origPos: curr.style.position,
                            origLeft: curr.style.left
                        });
                        // Unhide it off-screen
                        curr.style.display = "block";
                        curr.style.position = "absolute";
                        curr.style.left = "-9999px";
                    }
                    curr = curr.parentElement;
                }
                
                // Also ensure the element itself is block
                
                const origOpacity = elementToPrint.style.opacity;
                const origVisibility = elementToPrint.style.visibility;
                elementToPrint.style.opacity = '1';
                elementToPrint.style.visibility = 'visible';
                elementToPrint.classList.remove('opacity-0');
                const origDisplay = elementToPrint.style.display;

                elementToPrint.style.display = "block";
                
                // Wait for any CSS animations or renders
                await new Promise(r => setTimeout(r, 200));
                
                const paperSize = elementToPrint.getAttribute("data-paper") || "80";
                const targetWidth = paperSize === "58" ? 384 : 576;
                const offsetWidth = elementToPrint.offsetWidth || 300;
                const scale = targetWidth / offsetWidth;
                
                // If height is 0, it means it's still hidden somehow. Fallback to text.
                if (elementToPrint.offsetHeight === 0) {
                    throw new Error("Element height is 0, cannot render image.");
                }

                const canvas = await toCanvas(elementToPrint, {
                    pixelRatio: scale,
                    backgroundColor: "#ffffff",
                    skipFonts: false,
                    imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", 
                    style: {
                        transform: 'none',
                        transformOrigin: 'top left'
                    }
                });
                
                // Debug: Append canvas to DOM so user can see what is being sent to printer
                canvas.style.position = "fixed";
                canvas.style.top = "10px";
                canvas.style.right = "10px";
                canvas.style.zIndex = "99999";
                canvas.style.border = "2px solid red";
                canvas.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";
                canvas.style.maxHeight = "50vh";
                document.body.appendChild(canvas);
                setTimeout(() => { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }, 5000);

                
                // Restore original styles
                
                elementToPrint.style.display = origDisplay;
                elementToPrint.style.opacity = origOpacity;
                elementToPrint.style.visibility = origVisibility;
                elementToPrint.classList.add('opacity-0');

                for (const ancestor of hiddenAncestors) {
                    ancestor.el.style.display = ancestor.origDisplay;
                    ancestor.el.style.position = ancestor.origPos;
                    ancestor.el.style.left = ancestor.origLeft;
                }
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const width = canvas.width;
                    const height = canvas.height;
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    
                    const bytesWidth = Math.ceil(width / 8);
                    
                    // Mobile thermal printers often crash or print garbage if the image height
                    // exceeds 255 dots in a single GS v 0 command. We slice it into strips.
                    const MAX_STRIP_HEIGHT = 200;
                    
                    for (let stripY = 0; stripY < height; stripY += MAX_STRIP_HEIGHT) {
                        const stripHeight = Math.min(MAX_STRIP_HEIGHT, height - stripY);
                        
                        const rasterHeader = new Uint8Array([
                            0x1D, 0x76, 0x30, 0x00,
                            bytesWidth % 256, Math.floor(bytesWidth / 256),
                            stripHeight % 256, Math.floor(stripHeight / 256)
                        ]);
                        dataChunks.push(rasterHeader);
                        
                        const rasterData = new Uint8Array(bytesWidth * stripHeight);
                        let idx = 0;
                        for (let y = 0; y < stripHeight; y++) {
                            const actualY = stripY + y;
                            for (let x = 0; x < bytesWidth; x++) {
                                let byte = 0;
                                for (let b = 0; b < 8; b++) {
                                    const px = (x * 8) + b;
                                    if (px < width) {
                                        const offset = (actualY * width + px) * 4;
                                        const r = data[offset];
                                        const g = data[offset + 1];
                                        const bVal = data[offset + 2];
                                        const a = data[offset + 3];
                                        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * bVal;
                                        if (a > 128 && luma < 128) {
                                            byte |= (1 << (7 - b));
                                        }
                                    }
                                }
                                rasterData[idx++] = byte;
                            }
                        }
                        dataChunks.push(rasterData);
                    }
                    printedAsImage = true;
                }
            } catch (imageErr: any) {
                console.warn("Failed to generate image receipt:", imageErr);
                // Alert the user so they can send the error back to us!
                if (typeof window !== 'undefined') {
                    alert("Image Print Error: " + (imageErr.message || JSON.stringify(imageErr)));
                }
                printedAsImage = false;
            }
        } 
        
        
        
        if (!printedAsImage) {
            const encoder = new TextEncoder();
            const bt = getEffectiveBtSettings(business);

            const is80 = bt.paperWidth === '80mm' || business?.printSettings?.paperWidth === '80mm';
            const WIDTH = is80 ? 48 : 32;

            const pLR: any = (l, r, w = WIDTH) => {
                const len = l.length + r.length;
                if (len >= w) return l.substring(0, w - r.length - 1) + " " + r;
                return l + " ".repeat(w - len) + r;
            };

            const wrapText: any = (text: string, maxFirstLineWidth: number, maxSubLineWidth?: number) => {
                const maxSubWidth = maxSubLineWidth || maxFirstLineWidth;
                const words = text.split(' ');
                const lines = [];
                let currentLine = '';
                for (let word of words) {
                    let currentMaxWidth = lines.length === 0 ? maxFirstLineWidth : maxSubWidth;
                    if ((currentLine + word).length > currentMaxWidth) {
                        if (currentLine.length > 0) {
                            lines.push(currentLine.trim());
                            currentLine = '';
                        }
                        while (word.length > 0) {
                            currentMaxWidth = lines.length === 0 ? maxFirstLineWidth : maxSubWidth;
                            if (word.length > currentMaxWidth) {
                                lines.push(word.substring(0, currentMaxWidth));
                                word = word.substring(currentMaxWidth);
                            } else {
                                currentLine = word + ' ';
                                word = ''; // exit inner loop
                            }
                        }
                    } else {
                        currentLine += word + ' ';
                    }
                }
                if (currentLine.trim().length > 0) lines.push(currentLine.trim());
                return lines;
            };

            const activeCurCode = (typeof localStorage !== 'undefined' ? localStorage.getItem("selected_currency") : null) || business?.currencyCode || order?.currencySymbol || business?.currencySymbol || "INR";
            const activeTaxCfg = getTaxConfig(activeCurCode);
            const activeCurrPrefix = activeTaxCfg.symbol === "₹" ? "Rs." : `${activeTaxCfg.symbol} `;
            const activeTaxName = activeTaxCfg.taxName || "GST";
            const activeTaxIdLabel = activeTaxCfg.taxIdLabel || "GSTIN";
            const isSplitTax = activeTaxCfg.isSplitTax !== false;

            const numToWords: any = (num: number) => {
                if (num === 0) return "Zero";
                const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
                const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
                const inWords = (n: any) => {
                    if ((n = n.toString()).length > 9) return "overflow";
                    let nArray = ("000000000" + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
                    if (!nArray) return "";
                    let str = "";
                    str += (Number(nArray[1]) !== 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + " " + a[nArray[1][1]]) + "Crore " : "";
                    str += (Number(nArray[2]) !== 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + " " + a[nArray[2][1]]) + "Lakh " : "";
                    str += (Number(nArray[3]) !== 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + " " + a[nArray[3][1]]) + "Thousand " : "";
                    str += (Number(nArray[4]) !== 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + " " + a[nArray[4][1]]) + "Hundred " : "";
                    str += (Number(nArray[5]) !== 0) ? ((str != "") ? "and " : "") + (a[Number(nArray[5])] || b[nArray[5][0]] + " " + a[nArray[5][1]]) : "";
                    return str.trim();
                };
                const intVal = Math.floor(Math.abs(num));
                const decVal = Math.round((Math.abs(num) - intVal) * 100);
                const intWords = inWords(intVal);
                if (activeTaxCfg && activeTaxCfg.code !== "INR") {
                    let result = intWords + ` ${activeTaxCfg.code}`;
                    if (decVal > 0) result += " and " + inWords(decVal) + " Cents";
                    return result + " Only";
                }
                let result = intWords + " Rupees";
                if (decVal > 0) result += " and " + inWords(decVal) + " Paise";
                return result + " Only";
            };

            // Universal High-Speed QR Code generator:
            // High reliability raster bitmap with standard 4-module quiet zone (white margin)
            // Ensures scanability and prevents overlap with surrounding text.
            const addFastRasterQr = (qrText: string, scale = 3) => {
                try {
                    const qr = QRCode.create(qrText, { errorCorrectionLevel: 'M' });
                    const modules = qr.modules;
                    const modCount = modules.size;
                    // Auto-adjust scale safely to fit printable area (58mm ~368 dots, 80mm ~540 dots)
                    // At ~37 modules: scale 2=74 dots, scale 3=111 dots, scale 4=148 dots, scale 5=185 dots, scale 6=222 dots, scale 7=259 dots
                    const maxScale = is80 ? 8 : 7;
                    const dotScale = Math.max(2, Math.min(scale, maxScale));
                    
                    // Add standard 4-module quiet zone around QR so phone cameras immediately recognize and scan it
                    const quietMargin = 4;
                    const totalModules = modCount + (quietMargin * 2);
                    const imgWidth = totalModules * dotScale;
                    const imgHeight = totalModules * dotScale;
                    const bytesWidth = Math.ceil(imgWidth / 8);

                    // Ensure default line spacing before raster image
                    dataChunks.push(new Uint8Array([0x1B, 0x32])); // ESC 2 (Default line spacing)
                    // Center alignment
                    dataChunks.push(new Uint8Array([0x1B, 0x61, 0x01])); // ESC a 1

                    // GS v 0 0 raster bit image header
                    const rasterHeader = new Uint8Array([
                        0x1D, 0x76, 0x30, 0x00,
                        bytesWidth % 256, Math.floor(bytesWidth / 256),
                        imgHeight % 256, Math.floor(imgHeight / 256)
                    ]);
                    dataChunks.push(rasterHeader);

                    const rasterData = new Uint8Array(bytesWidth * imgHeight);
                    let idx = 0;
                    for (let y = 0; y < imgHeight; y++) {
                        const modY = Math.floor(y / dotScale) - quietMargin;
                        for (let x = 0; x < bytesWidth; x++) {
                            let byte = 0;
                            for (let b = 0; b < 8; b++) {
                                const px = (x * 8) + b;
                                if (px < imgWidth) {
                                    const modX = Math.floor(px / dotScale) - quietMargin;
                                    if (modX >= 0 && modX < modCount && modY >= 0 && modY < modCount) {
                                        if (modules.get(modX, modY)) {
                                            byte |= (1 << (7 - b));
                                        }
                                    }
                                }
                            }
                            rasterData[idx++] = byte;
                        }
                    }
                    dataChunks.push(rasterData);
                    // Explicit line feeds & restore default line spacing after image
                    dataChunks.push(new Uint8Array([0x1B, 0x32])); // ESC 2
                    dataChunks.push(new Uint8Array([0x0A, 0x0A]));
                } catch(e) {
                    console.error("Fast QR Generation error:", e);
                }
            };

            const printImageToChunks = (img: any, targetWidth: number) => {
                // Determine printer printable width: 58mm (384 dots) vs 80mm (576 dots)
                const maxPaperDots = is80 ? 576 : 384;
                const maxAllowed = Math.min(targetWidth, maxPaperDots);
                const scale = maxAllowed / img.width;
                const effectiveWidth = Math.min(maxPaperDots, Math.max(24, Math.round(img.width * scale)));
                const targetHeight = Math.max(1, Math.round(img.height * scale));

                const canvas = document.createElement('canvas');
                canvas.width = effectiveWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, effectiveWidth, targetHeight);
                    ctx.drawImage(img, 0, 0, effectiveWidth, targetHeight);

                    const imageData = ctx.getImageData(0, 0, effectiveWidth, targetHeight);
                    const data = imageData.data;

                    dataChunks.push(new Uint8Array([0x1B, 0x61, 0x01])); // center
                    dataChunks.push(new Uint8Array([0x1B, 0x33, 0x18])); // ESC 3 24 (24-dot line spacing)

                    const bytesWidth = Math.ceil(effectiveWidth / 8);
                    // Single compact strip (GS v 0 0)
                    const rasterHeader = new Uint8Array([
                        0x1D, 0x76, 0x30, 0x00,
                        bytesWidth % 256, Math.floor(bytesWidth / 256),
                        targetHeight % 256, Math.floor(targetHeight / 256)
                    ]);
                    dataChunks.push(rasterHeader);

                    const rasterData = new Uint8Array(bytesWidth * targetHeight);
                    let idx = 0;
                    for (let y = 0; y < targetHeight; y++) {
                        for (let x = 0; x < bytesWidth; x++) {
                            let byte = 0;
                            for (let b = 0; b < 8; b++) {
                                const px = (x * 8) + b;
                                if (px < effectiveWidth) {
                                    const offset = (y * effectiveWidth + px) * 4;
                                    const luma = 0.2126 * data[offset] + 0.7152 * data[offset+1] + 0.0722 * data[offset+2];
                                    if (data[offset+3] > 128 && luma < 128) {
                                        byte |= (1 << (7 - b));
                                    }
                                }
                            }
                            rasterData[idx++] = byte;
                        }
                    }
                    dataChunks.push(rasterData);
                    dataChunks.push(new Uint8Array([0x1B, 0x32])); // ESC 2 (Restore default line spacing)
                }
            };

            // Logo Print (Only for Bill, standard practice)
            if (!isKot && bt.showLogo !== false && (business?.logoUrl || business?.logo)) {
                try {
                    const logoSource = (business.logoUrl || business.logo || "").trim();
                    let targetImg: HTMLImageElement | null = logoImageCache.get(logoSource) || null;

                    if (!targetImg) {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';

                        const fetchImage = async () => {
                            if (logoSource.startsWith("data:")) {
                                img.src = logoSource;
                                return true;
                            }
                            
                            try {
                                // Route through proxy to avoid CORS tainted canvas issues
                                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(logoSource)}`;
                                const res = await fetch(proxyUrl);
                                if (res.ok) {
                                    const blob = await res.blob();
                                    img.src = URL.createObjectURL(blob);
                                    return true;
                                }
                            } catch(e) {
                                console.error("Proxy fetch failed, falling back to direct", e);
                            }
                            
                            // Fallback to direct src assignment
                            img.src = logoSource;
                            return true;
                        };

                        const imgLoaded = new Promise<boolean>(async (resolve) => {
                            if (img.complete && img.naturalWidth > 0) {
                                return resolve(true);
                            }
                            img.onload = () => resolve(true);
                            img.onerror = () => {
                                console.warn("Logo image failed to load via onerror, skipping logo print.");
                                resolve(false);
                            };
                            const started = await fetchImage().catch(() => false);
                            if (!started) resolve(false);
                        });
                        
                        // Generous 4000ms timeout for slow network or high-res images
                        const success = await Promise.race([ 
                            imgLoaded, 
                            new Promise<boolean>(r => setTimeout(() => {
                                console.warn("Logo loading timed out after 4s");
                                r(false);
                            }, 4000)) 
                        ]);

                        if (success && img.naturalWidth > 0) {
                            targetImg = img;
                            logoImageCache.set(logoSource, img);
                        }
                    }
                    
                    if (targetImg) {
                        // Slider ranges from 20mm to 90mm.
                        // On 58mm printer (384 dots width, ~48mm printable area): ~8 dots per mm.
                        // On 80mm printer (576 dots width, ~72mm printable area): ~8 dots per mm.
                        // We map mm directly to printer thermal dots:
                        // 20mm -> 160 dots, 30mm -> 240 dots, 45mm -> 360 dots (max for 58mm), 65mm -> 520 dots (for 80mm)
                        const maxPaperWidth = is80 ? 540 : 368;
                        const mm = Math.max(15, Math.min(90, bt.logoSize ?? 50));
                        const targetLogoWidth = Math.min(maxPaperWidth, Math.max(80, Math.round(mm * 6.5)));
                        printImageToChunks(targetImg, targetLogoWidth);
                        if (bt.logoBottomSpace !== undefined && bt.logoBottomSpace !== 0) {
                            // Convert logo bottom space into ESC J micro-feeds (0 to 255 dots)
                            const feedDots = Math.max(0, Math.min(255, Math.round((bt.logoBottomSpace + 10) * 3)));
                            if (feedDots > 0) {
                                dataChunks.push(new Uint8Array([0x1B, 0x4A, feedDots]));
                            }
                        }
                    } else {
                        console.warn("Logo skipped: image could not be loaded within timeout.");
                    }
                } catch (e) {
                    console.error("Logo thermal conversion failed:", e);
                }
            }

            const ALIGN_CENTER = new Uint8Array([0x1B, 0x61, 0x01]);
            const ALIGN_LEFT = new Uint8Array([0x1B, 0x61, 0x00]);
            const BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
            const BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
            const LINE_FEED = new Uint8Array([0x0A]);
            const TEXT_NORMAL = new Uint8Array([0x1D, 0x21, 0x00]);
            const TEXT_DOUBLE_H = new Uint8Array([0x1D, 0x21, 0x01]);
            const TEXT_DOUBLE_W = new Uint8Array([0x1D, 0x21, 0x10]);
            const TEXT_DOUBLE_HW = new Uint8Array([0x1D, 0x21, 0x11]);
            const TEXT_TRIPLE = new Uint8Array([0x1D, 0x21, 0x22]); // 3x height, 3x width
            const TEXT_QUAD = new Uint8Array([0x1D, 0x21, 0x33]);   // 4x height, 4x width

            // Secondary legacy ESC ! modes for maximum compatibility with portable 58mm/80mm Bluetooth printers
            const ESC_MODE_NORMAL = new Uint8Array([0x1B, 0x21, 0x00]);
            const ESC_MODE_DOUBLE_H = new Uint8Array([0x1B, 0x21, 0x10]);
            const ESC_MODE_DOUBLE_W = new Uint8Array([0x1B, 0x21, 0x20]);
            const ESC_MODE_DOUBLE_HW = new Uint8Array([0x1B, 0x21, 0x30]);
            const ESC_MODE_EMPHASIZED = new Uint8Array([0x1B, 0x21, 0x08]);

            const applyStyle = (style?: string) => {
                if (style === 'quad') {
                    dataChunks.push(TEXT_QUAD);
                    dataChunks.push(ESC_MODE_DOUBLE_HW);
                    dataChunks.push(BOLD_ON);
                } else if (style === 'triple' || style === 'giant') {
                    // Send GS ! 0x22 AND ESC ! 0x30 so all printer firmware variants zoom reliably
                    dataChunks.push(TEXT_TRIPLE);
                    dataChunks.push(ESC_MODE_DOUBLE_HW);
                    dataChunks.push(BOLD_ON);
                } else if (style === 'double_hw') {
                    dataChunks.push(TEXT_DOUBLE_HW);
                    dataChunks.push(ESC_MODE_DOUBLE_HW);
                    dataChunks.push(BOLD_ON);
                } else if (style === 'double_h') {
                    dataChunks.push(TEXT_DOUBLE_H);
                    dataChunks.push(ESC_MODE_DOUBLE_H);
                    dataChunks.push(BOLD_ON);
                } else if (style === 'double_w') {
                    dataChunks.push(TEXT_DOUBLE_W);
                    dataChunks.push(ESC_MODE_DOUBLE_W);
                    dataChunks.push(BOLD_ON);
                } else if (style === 'bold') {
                    dataChunks.push(TEXT_NORMAL);
                    dataChunks.push(ESC_MODE_NORMAL);
                    dataChunks.push(BOLD_ON);
                } else {
                    dataChunks.push(TEXT_NORMAL);
                    dataChunks.push(ESC_MODE_NORMAL);
                    dataChunks.push(BOLD_OFF);
                }
            };

            const resolveStyle = (explicitStyle?: string, pxSize?: number, defaultStyle: string = "normal") => {
                if (explicitStyle && explicitStyle !== 'normal') return explicitStyle;
                if (!pxSize) return defaultStyle;
                if (pxSize >= 40) return "triple";
                if (pxSize >= 28) return "double_hw";
                if (pxSize >= 20) return "double_h";
                if (pxSize >= 13) return "bold";
                return "normal";
            };
            
            if (isKot) {
                // KOT Format
                if (bt.showKOTHeader !== false) {
                    dataChunks.push(ALIGN_CENTER);
                    const khStyle = resolveStyle(bt.kotHeaderStyle, bt.kotHeaderDetailsSize, 'bold');
                    applyStyle(khStyle);
                    dataChunks.push(encoder.encode("K.O.T\n"));
                    dataChunks.push(BOLD_OFF);
                    dataChunks.push(TEXT_NORMAL);
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                }
                
                dataChunks.push(ALIGN_LEFT);
                const tableStr = (bt.showKOTTable !== false) ? ("TABLE: " + (order?.tableName || "COUNTER")) : "";
                const kotNum = order?.kotNumbers?.[order?.kotNumbers?.length - 1] 
                    || order?.tokenNumber 
                    || order?.reservedTokenNumber 
                    || order?.kotNumber 
                    || (Array.isArray(order?.items) && order.items.find((i: any) => i?.kotNumber)?.kotNumber) 
                    || (business?.lastTokenNumber ? String(business.lastTokenNumber) : "") 
                    || "1";
                const kotNumStr = (bt.showKOTToken !== false) ? ("KOT NO: " + kotNum) : "";
                
                if (tableStr || kotNumStr) {
                    const kotPx = bt.kotTokenSize ?? 16;
                    if (kotNumStr && kotPx >= 20) {
                        if (tableStr) {
                            dataChunks.push(encoder.encode(tableStr + "\n"));
                        }
                        dataChunks.push(ALIGN_CENTER);
                        const ktStyle = resolveStyle(undefined, kotPx, 'double_hw');
                        applyStyle(ktStyle);
                        dataChunks.push(encoder.encode(`KOT NO: #${kotNum}\n`));
                        applyStyle('normal');
                        dataChunks.push(ALIGN_LEFT);
                    } else if (kotNumStr) {
                        const ktStyle = resolveStyle(undefined, kotPx, 'double_h');
                        if (tableStr) {
                            dataChunks.push(encoder.encode(tableStr + "  "));
                        }
                        applyStyle(ktStyle);
                        dataChunks.push(encoder.encode(kotNumStr + "\n"));
                        applyStyle('normal');
                    } else if (tableStr) {
                        dataChunks.push(encoder.encode(tableStr + "\n"));
                    }
                }
                
                const billNoStr = (bt.showKOTBillNo !== false) ? ("Bill: " + (order?.billNumber || order?.orderNumber || "DRAFT")) : "";
                let timeStr = "";
                let fullDateStr = "";
                try { 
                    const d = new Date();
                    timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    fullDateStr = dPart + " " + timeStr;
                } catch(e){}
                const datePrintStr = (bt.showKOTDateTime !== false) ? timeStr : "";

                if (billNoStr || datePrintStr) {
                    dataChunks.push(encoder.encode(pLR(billNoStr, datePrintStr, WIDTH) + "\n"));
                }

                if (bt.showKOTCustomer !== false && (order?.customerName || order?.customerPhone)) {
                    dataChunks.push(encoder.encode("Customer: " + (order?.customerName || "Walk-in") + (order?.customerPhone ? ` (${order.customerPhone})` : "") + "\n"));
                }

                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode(pLR("ITEM DESCRIPTION", "QTY", WIDTH) + "\n"));
                dataChunks.push(BOLD_OFF);
                
                const allItems = order?.items || [];
                const newItemsOnly = allItems.filter((i: any) => i?.isNew);
                const items = newItemsOnly.length > 0 ? newItemsOnly : allItems;
                for (const item of items) {
                    const name = (item.name || "Item").toUpperCase();
                    const fullQty = item.qty || item.quantity || 1;
                    const printedQty = item.printedQty || 0;
                    const qty = (item.isNew && printedQty) ? (fullQty - printedQty) : fullQty;
                    
                    const kItemPx = bt.kotItemsFontSize ?? 11;
                    const kQtyPx = bt.kotQuantityFontSize ?? 14;
                    const kotItemStyle = kItemPx >= 15 ? 'bold' : 'normal';
                    
                    // If KOT quantity is enlarged (>= 18px), use standout formatting
                    const isGiantQty = kQtyPx >= 18;
                    const rightCol = isGiantQty ? `[QTY: ${qty}]` : `x${qty}`;
                    const maxNameWidth = WIDTH - rightCol.length - 1;
                    const lines = wrapText(name, maxNameWidth, maxNameWidth - 4);

                    for (let i = 0; i < lines.length; i++) {
                        if (i === 0) {
                            applyStyle(kotItemStyle);
                            const paddedName = lines[i].padEnd(maxNameWidth, " ");
                            dataChunks.push(encoder.encode(paddedName + " "));
                            if (isGiantQty) {
                                applyStyle('double_hw');
                                dataChunks.push(encoder.encode(rightCol + "\n"));
                                applyStyle('normal');
                            } else if (kQtyPx >= 14) {
                                applyStyle('bold');
                                dataChunks.push(encoder.encode(rightCol + "\n"));
                                applyStyle('normal');
                            } else {
                                dataChunks.push(encoder.encode(rightCol + "\n"));
                            }
                        } else {
                            applyStyle(kotItemStyle);
                            dataChunks.push(encoder.encode("    " + lines[i] + "\n"));
                        }
                    }
                    dataChunks.push(TEXT_NORMAL);
                    dataChunks.push(BOLD_OFF);
                    if (bt.showKOTVariants !== false && item.variants && item.variants.length > 0) {
                        const varText = "  (" + item.variants.map((v: any) => v.name || v).join(", ") + ")";
                        dataChunks.push(encoder.encode(varText + "\n"));
                    }
                    if (bt.showKOTInstructions !== false && item.notes) {
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("  * Note: " + devanagariToHinglish(item.notes) + "\n"));
                        dataChunks.push(BOLD_OFF);
                    }
                    if (bt.showKOTItemDivider !== false) {
                        dataChunks.push(encoder.encode("- ".repeat(Math.floor(WIDTH / 2)).trim() + "\n"));
                    }
                }
                
                if (bt.showKOTFooter !== false) {
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    dataChunks.push(ALIGN_CENTER);
                    dataChunks.push(encoder.encode("END OF KOT\n"));
                    if (bt.showKOTDateTime !== false) {
                        dataChunks.push(encoder.encode(fullDateStr + "\n"));
                    }
                }
            } else {
                // Bill Format
                if (bt.showBusinessName !== false) {
                    dataChunks.push(ALIGN_CENTER);
                    const requestedBStyle = resolveStyle(undefined, bt.businessNameSize, 'double_h');
                    const rawBName = business?.businessName || business?.name || "KRAVY POS";
                    const formattedLines = formatBusinessName(rawBName, is80 ? '80mm' : '58mm', requestedBStyle);
                    
                    formattedLines.forEach(lineItem => {
                        applyStyle(lineItem.style);
                        dataChunks.push(encoder.encode(lineItem.text + "\n"));
                    });
                    applyStyle('normal');
                }
                
                if (bt.showTagline !== false && business?.tagline) {
                    const paragraphs = business.tagline.split('\n');
                    paragraphs.forEach(p => {
                        const tLines = wrapText(p, WIDTH, WIDTH);
                        tLines.forEach(l => dataChunks.push(encoder.encode(padCenter(l, WIDTH) + "\n")));
                    });
                }

                if (bt.showAddress !== false) {
                    const addrParts = [];
                    if (business?.businessAddress || business?.address) addrParts.push(business.businessAddress || business.address);
                    if (business?.district) addrParts.push(business.district);
                    if (business?.state) addrParts.push(business.state);
                    
                    let fullAddr = addrParts.join(", ");
                    if (business?.pinCode) fullAddr += " - " + business.pinCode;

                    if (fullAddr.trim()) {
                        let addr = fullAddr;
                        addr = addr.replace(/<br\s*[\/]?>/gi, '\n').replace(/\r\n/g, '\n');
                        const paragraphs = addr.split('\n');
                        paragraphs.forEach(p => {
                            const aLines = wrapText(p, WIDTH, WIDTH);
                            aLines.forEach(l => dataChunks.push(encoder.encode(padCenter(l, WIDTH) + "\n")));
                        });
                    }
                }

                const phonePrefix = (business?.phonePrefixType || bt?.phonePrefixType || "TEXT").toString().toUpperCase() === "SYMBOL" ? "Tel: " : "Mob: ";
                const phoneStr = business?.contactPersonPhone || business?.contactPhone || business?.businessPhone || business?.phone;
                if (bt.showContact !== false && phoneStr) dataChunks.push(encoder.encode(padCenter(phonePrefix + phoneStr, WIDTH) + "\n"));
                const secPhone = bt?.secondaryPhone || business?.secondaryPhone || business?.printSettings?.secondaryPhone;
                if (bt.showContact !== false && secPhone) dataChunks.push(encoder.encode(padCenter(phonePrefix + secPhone, WIDTH) + "\n"));
                if (bt.showGST !== false && business?.gstNumber) dataChunks.push(encoder.encode(padCenter(`${activeTaxIdLabel}: ` + business.gstNumber, WIDTH) + "\n"));
                if (bt.showFSSAI !== false && business?.fssaiNumber) dataChunks.push(encoder.encode(padCenter("FSSAI: " + business.fssaiNumber, WIDTH) + "\n"));
                
                if (bt.showBillTypeHeader !== false) {
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    dataChunks.push(ALIGN_CENTER);
                    dataChunks.push(BOLD_ON);
                    dataChunks.push(encoder.encode(business?.gstNumber && order?.isTaxEnabled ? "TAX INVOICE\n" : "SALES RECEIPT\n"));
                    dataChunks.push(BOLD_OFF);
                    dataChunks.push(ALIGN_LEFT);
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                } else {
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                }
                
                const billNoStr = (bt.showInvoiceNumber !== false) ? ("Bill No: " + (order?.billNumber || order?.orderNumber || "DRAFT")) : "";
                const tokenRaw = (order?.tokenNumber || order?.kotNumbers?.[0] || "");
                const tokenStr = (bt.showToken !== false && tokenRaw) ? ("Token: " + tokenRaw) : "";
                if (billNoStr || tokenStr) {
                    const tokenPx = bt.receiptTokenSize ?? 28;
                    // When token is enlarged (>= 22px), print Token prominently on its own centered line
                    // so it can expand to double/triple height & width cleanly!
                    if (tokenStr && tokenPx >= 22) {
                        if (billNoStr) {
                            dataChunks.push(encoder.encode(billNoStr + "\n"));
                        }
                        dataChunks.push(ALIGN_CENTER);
                        const tStyle = resolveStyle(undefined, tokenPx, tokenPx >= 36 ? 'triple' : 'double_hw');
                        applyStyle(tStyle);
                        dataChunks.push(encoder.encode(`TOKEN: ${tokenRaw}\n`));
                        applyStyle('normal');
                        dataChunks.push(ALIGN_LEFT);
                    } else if (tokenStr) {
                        const tStyle = resolveStyle(undefined, tokenPx, 'double_h');
                        if (billNoStr) {
                            dataChunks.push(encoder.encode(billNoStr + "  "));
                        }
                        applyStyle(tStyle);
                        dataChunks.push(encoder.encode(`TOKEN: ${tokenRaw}\n`));
                        applyStyle('normal');
                    } else if (billNoStr) {
                        dataChunks.push(encoder.encode(billNoStr + "\n"));
                    }
                }
                
                let dPart = "";
                let fullDateStr = "";
                try { 
                    const d = order?.createdAt ? new Date(order.createdAt) : new Date();
                    dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const dPartFull = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    fullDateStr = dPartFull + " " + timeStr;
                } catch(e){}
                const datePrint = (bt.showDate !== false) ? ("Date: " + dPart) : "";
                const tableStr = (bt.showTableInfo !== false) ? ("Table: " + (order?.tableName || "POS")) : "";
                if (datePrint || tableStr) {
                    dataChunks.push(encoder.encode(pLR(datePrint, tableStr, WIDTH) + "\n"));
                }
                
                if (bt.showCustomerDetails !== false && (order?.customerName || order?.customerPhone || order?.customerAddress)) {
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    dataChunks.push(encoder.encode("Customer: " + (order?.customerName || "Walk-in Customer") + "\n"));
                    if (bt.showCustomerPhone !== false && order?.customerPhone) dataChunks.push(encoder.encode("Phone: " + order.customerPhone + "\n"));
                    if (bt.showCustomerAddress !== false && order?.customerAddress) dataChunks.push(encoder.encode("Addr: " + order.customerAddress + "\n"));
                }
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                dataChunks.push(BOLD_ON);
                const hdrRight = "AMOUNT";
                const hdrMaxName = WIDTH - hdrRight.length - 1;
                dataChunks.push(encoder.encode("ITEM".padEnd(hdrMaxName, " ") + " " + hdrRight + "\n"));
                dataChunks.push(BOLD_OFF);
                
                let subtotal = 0;
                const items = order?.items || [];
                for (const item of items) {
                    const name = (item.name || "Item").toUpperCase();
                    const qty = String(item.qty || item.quantity || 1);
                    const price = (item.price || item.rate || 0);
                    const totalLine = price * Number(qty);
                    subtotal += totalLine;
                    
                    const tot = totalLine.toFixed(2);
                    const hdrRight = "AMOUNT";
                    const maxNameWidth = WIDTH - hdrRight.length - 1;
                    const lines = wrapText(name, maxNameWidth, maxNameWidth); 
                    
                    const iPx = bt.itemsFontSize ?? 11;
                    const itemStyle = iPx >= 16 ? 'double_h' : (iPx >= 13 ? 'bold' : 'normal');
                    applyStyle(itemStyle);
                    for (let i = 0; i < lines.length; i++) {
                        dataChunks.push(encoder.encode(lines[i] + "\n"));
                    }
                    dataChunks.push(TEXT_NORMAL);
                    dataChunks.push(BOLD_OFF);
                    
                    if (bt.showVariants !== false) {
                        let variants = [];
                        if (item.variant) variants.push(item.variant);
                        if (bt.showFoodTypeSuffix !== false && item.foodType) variants.push(item.foodType);
                        if (item.variants && Array.isArray(item.variants)) {
                            item.variants.forEach((v: any) => variants.push(v.name || v));
                        }
                        if (variants.length > 0) {
                            const varLines = wrapText(variants.join(" + "), maxNameWidth, maxNameWidth);
                            varLines.forEach((l: string) => dataChunks.push(encoder.encode(l + "\n")));
                        }
                    }
                    
                    const taxActive = (order?.tax || 0) > 0 || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
                    let qtyStr = `${qty} x ${price.toFixed(2)}`;
                    if (taxActive && item.gst !== undefined && item.gst !== null && Number(item.gst) > 0) {
                        qtyStr += ` | ${activeTaxName} ${item.gst}%`;
                    }
                    dataChunks.push(encoder.encode(pLR(qtyStr, tot, WIDTH) + "\n"));
                    
                    dataChunks.push(encoder.encode("\n"));
                    dataChunks.push(TEXT_NORMAL);
                }
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                const discount = order?.discountAmount || order?.discountAmt || order?.discount || 0;
                const tax = order?.tax || order?.gstAmount || order?.gst || 0;
                const total = order?.total || order?.finalTotal || (subtotal - discount + tax);
                const taxActive = (tax > 0) || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
                
                if (bt.showSubtotal !== false) {
                    dataChunks.push(encoder.encode(pLR("Subtotal", subtotal.toFixed(2), WIDTH) + "\n"));
                }
                if (bt.showDiscount !== false && discount > 0) {
                    dataChunks.push(encoder.encode(pLR("Discount", "-" + discount.toFixed(2), WIDTH) + "\n"));
                }
                
                const delivery = order?.deliveryCharges || 0;
                if (bt.showDeliveryCharge !== false && delivery > 0) {
                    dataChunks.push(encoder.encode(pLR("Delivery Charge", "+" + delivery.toFixed(2), WIDTH) + "\n"));
                }
                const packaging = order?.packagingCharges || 0;
                if (bt.showPackagingCharge !== false && packaging > 0) {
                    dataChunks.push(encoder.encode(pLR("Packaging", "+" + packaging.toFixed(2), WIDTH) + "\n"));
                }
                const service = order?.serviceCharge || 0;
                const serviceLabel = order?.serviceChargeName || business?.serviceChargeName || "Service Charge";
                if (bt.showServiceCharge !== false && service > 0) {
                    dataChunks.push(encoder.encode(pLR(serviceLabel, "+" + service.toFixed(2), WIDTH) + "\n"));
                }
                
                if (bt.showTaxBreakup !== false) {
                    if (taxActive) {
                        const taxBreakup = calculateTaxBreakup(order, business);
                        const totalTaxable = taxBreakup.reduce((a: any, b: any) => a + b.taxable, 0);
                        if (totalTaxable > 0) {
                            dataChunks.push(encoder.encode(pLR("Taxable Amt", totalTaxable.toFixed(2), WIDTH) + "\n"));
                        }
                        
                        let hasBreakupPrinted = false;
                        for (const t of taxBreakup) {
                            if (isSplitTax) {
                                if (t.cgst > 0 || t.sgst > 0) {
                                    hasBreakupPrinted = true;
                                    if (t.cgst > 0) dataChunks.push(encoder.encode(pLR(`CGST (${t.rate/2}%)`, t.cgst.toFixed(2), WIDTH) + "\n"));
                                    if (t.sgst > 0) dataChunks.push(encoder.encode(pLR(`SGST (${t.rate/2}%)`, t.sgst.toFixed(2), WIDTH) + "\n"));
                                } else if (t.igst > 0) {
                                    hasBreakupPrinted = true;
                                    dataChunks.push(encoder.encode(pLR(`IGST (${t.rate}%)`, t.igst.toFixed(2), WIDTH) + "\n"));
                                }
                            } else {
                                if (t.totalTax > 0) {
                                    hasBreakupPrinted = true;
                                    dataChunks.push(encoder.encode(pLR(`${activeTaxName} (${t.rate}%)`, t.totalTax.toFixed(2), WIDTH) + "\n"));
                                }
                            }
                        }
                        
                        if (!hasBreakupPrinted && tax > 0) {
                            dataChunks.push(encoder.encode(pLR(activeTaxName, "+" + tax.toFixed(2), WIDTH) + "\n"));
                        }
                    } else if (tax > 0) {
                        dataChunks.push(encoder.encode(pLR(activeTaxName, "+" + tax.toFixed(2), WIDTH) + "\n"));
                    }
                }
                
                if (bt.showGrandTotal !== false) {
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    const gtStyle = resolveStyle(undefined, bt.grandTotalFontSize, bt.grandTotalFontSize && bt.grandTotalFontSize >= 24 ? 'triple' : 'double_h');
                    applyStyle(gtStyle);
                    dataChunks.push(encoder.encode(pLR("GRAND TOTAL", `${activeCurrPrefix}${total.toFixed(2)}`, WIDTH) + "\n"));
                    applyStyle('normal');
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                }
                
                if (bt.showAmountInWords !== false) {
                    const amtWords = "Amount in Words: " + numToWords(total);
                    const awLines = wrapText(amtWords, WIDTH, WIDTH);
                    awLines.forEach((l: string) => dataChunks.push(encoder.encode(l + "\n")));
                }
                
                if (bt.showPaymentMode !== false) {
                    dataChunks.push(encoder.encode("Payment Mode: " + (order?.paymentMode || "CASH") + "\n"));
                }
                if (bt.showPaymentStatus !== false) {
                    dataChunks.push(encoder.encode("Status: " + (order?.paymentStatus || "Paid") + "\n"));
                }
                
                if (bt.showBalanceDue !== false && (order?.paymentStatus === "PARTIAL" || (order?.balanceDue !== undefined && order.balanceDue > 0))) {
                    const paid = order?.amountPaid || 0;
                    const due = order?.balanceDue || 0;
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    dataChunks.push(encoder.encode(pLR("Amount Paid:", `${activeCurrPrefix}${paid.toFixed(2)}`, WIDTH) + "\n"));
                    dataChunks.push(encoder.encode(pLR("Balance Due:", `${activeCurrPrefix}${due.toFixed(2)}`, WIDTH) + "\n"));
                }
                dataChunks.push(LINE_FEED);
                
                // Payment UPI QR Code
                const effectiveUpi = (business?.upi || business?.upiId || bt?.upiId || "").trim();
                const showUpiQr = bt.showUpiQr !== false && (Boolean(effectiveUpi) || order?.paymentMode === "UPI");
                if (showUpiQr) {
                    try {
                        const upiPa = effectiveUpi || "kravy@upi";
                        const upiPn = business?.businessName || business?.name || "KRAVY POS";
                        const upiUrl = `upi://pay?pa=${upiPa}&pn=${encodeURIComponent(upiPn)}&am=${total.toFixed(2)}&cu=INR`;
                        dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                        dataChunks.push(ALIGN_CENTER);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("SCAN & PAY\n"));
                        dataChunks.push(BOLD_OFF);
                        dataChunks.push(LINE_FEED);
                        
                        // Universal fast raster QR code with quiet zone & safe line separation
                        // Map user-configured bt.upiQrSize (100 - 300) to thermal raster dotScale (2 - 7)
                        const rawQrSize = bt.upiQrSize ?? 160;
                        let qrScale = 3;
                        if (rawQrSize >= 280) qrScale = 7;
                        else if (rawQrSize >= 240) qrScale = 6;
                        else if (rawQrSize >= 200) qrScale = 5;
                        else if (rawQrSize >= 160) qrScale = 4;
                        else if (rawQrSize <= 120) qrScale = 2;
                        else qrScale = 3;

                        addFastRasterQr(upiUrl, qrScale);
                        
                        dataChunks.push(ALIGN_CENTER);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("UPI: " + upiPa + "\n"));
                        dataChunks.push(BOLD_OFF);
                        if (order?.paymentMode === "UPI" && order?.upiTxnRef) {
                            dataChunks.push(encoder.encode("Txn Ref: " + order.upiTxnRef + "\n"));
                        }
                        dataChunks.push(ALIGN_LEFT);
                        dataChunks.push(LINE_FEED);
                        dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                        dataChunks.push(LINE_FEED);
                    } catch (e) { console.log("UPI QR error", e); }
                }

                // Menu QR Code Print
                if (bt.showMenuQr !== false && business?.enableMenuQRInBill && business?.userId) {
                    try {
                        const menuUrl = (typeof window !== 'undefined' ? window.location.origin : "https://billing.kravy.in") + "/menu/" + business.userId;
                        dataChunks.push(ALIGN_CENTER);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("RATE YOUR EXPERIENCE\n"));
                        dataChunks.push(BOLD_OFF);
                        dataChunks.push(LINE_FEED);
                        addFastRasterQr(menuUrl, 3);
                        dataChunks.push(LINE_FEED);
                    } catch (e) { console.log("QR error", e); }
                }
                
                dataChunks.push(ALIGN_CENTER);
                if (bt.showDate !== false && fullDateStr) {
                    dataChunks.push(encoder.encode(fullDateStr + "\n"));
                }
                if (bt.showGreetings !== false) {
                    const greetingText = (bt.customGreetingMessage && bt.customGreetingMessage.trim()) 
                        ? bt.customGreetingMessage.trim() 
                        : (business?.greetingMessage && business.greetingMessage.trim()) 
                            ? business.greetingMessage.trim() 
                            : "HARE KRISHNA";
                    const gStyle = resolveStyle(undefined, bt.greetingsFooterSize, 'bold');
                    applyStyle(gStyle);
                    dataChunks.push(encoder.encode(greetingText + "\n"));
                    applyStyle('normal');
                }
                if (bt.showPoweredBy !== false) {
                    dataChunks.push(encoder.encode("Powered by Kravy POS\n"));
                }
            }
        }
        
        const feedCount = Math.max(1, Math.min(Number(business?.btPrintSettings?.bottomFeeds || business?.printSettings?.bluetooth?.bottomFeeds || 4), 10));
        const feedBytes = new Uint8Array(feedCount).fill(0x0A);
        dataChunks.push(feedBytes);
        
        const shouldCut = (business?.btPrintSettings?.cutPaper !== false && business?.printSettings?.bluetooth?.cutPaper !== false);
        if (shouldCut) {
            dataChunks.push(PAPER_CUT);
        }

        // Flatten chunks for optimized transmission
        const totalLength = dataChunks.reduce((acc, val) => acc + val.length, 0);
        const printData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of dataChunks) {
            printData.set(chunk, offset);
            offset += chunk.length;
        }

        // High-Speed continuous streaming for Thermal POS Printers:
        // Small portable 58mm/80mm Bluetooth printers have 64-128 byte RX buffers.
        // Flooding at 244 bytes with 0ms delay overflows the printer hardware buffer during raster QR images.
        // Using 100 bytes chunk size with 15ms pacing ensures 100% reliable QR printing without drops or garbling.
        const CHUNK_SIZE = isCapacitor ? (activeState.capCanWriteWithoutResponse ? Math.min(activeState.capMtu || 244, 244) : 64) : 100; 
        const CHUNK_DELAY = isCapacitor ? (activeState.capCanWriteWithoutResponse ? 0 : 5) : 15;

        for (let i = 0; i < printData.length; i += CHUNK_SIZE) {
            const slice = printData.slice(i, i + CHUNK_SIZE);
            if (isCapacitor) {
                const ble = await getCapacitorBle();
                const BleClient = ble?.BleClient;
                const BluetoothLe = ble?.BluetoothLe;
                const dataViewToHexString = ble?.dataViewToHexString;

                const dataView = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
                if (activeState.capCanWriteWithoutResponse && BluetoothLe && dataViewToHexString) {
                    try {
                        const hexVal = dataViewToHexString(dataView);
                        await BluetoothLe.writeWithoutResponse({
                            deviceId: activeState.capDevice.deviceId,
                            service: activeState.capService,
                            characteristic: activeState.capChar,
                            value: hexVal
                        });
                    } catch(e) {
                        if (BleClient) await BleClient.write(activeState.capDevice.deviceId, activeState.capService, activeState.capChar, dataView);
                    }
                } else if (BleClient) {
                    await BleClient.write(activeState.capDevice.deviceId, activeState.capService, activeState.capChar, dataView);
                }
                if (CHUNK_DELAY > 0) {
                    await new Promise(r => setTimeout(r, CHUNK_DELAY));
                }
            } else {
                const targetChar = activeState.char;
                if (!targetChar) throw new Error("Printer connection lost during print");
                if (targetChar.writeValueWithoutResponse && targetChar.properties?.writeWithoutResponse) {
                    try {
                        await targetChar.writeValueWithoutResponse(slice);
                    } catch (e) {
                        await targetChar.writeValue(slice);
                    }
                } else {
                    await targetChar.writeValue(slice);
                }
                if (CHUNK_DELAY > 0) {
                    await new Promise(r => setTimeout(r, CHUNK_DELAY));
                }
            }
        }

        activeState.status = 'CONNECTED';
        return true;
    } catch (error: any) {
        console.error("Direct Web Print Error:", error);
        activeState.status = 'ERROR';
        activeState.lastError = error?.message || "Failed to print over Bluetooth";
        
        if (Capacitor.isNativePlatform()) {
            console.error("CAPACITOR BLE ERROR:", JSON.stringify(error));
        }

        // Trigger Recovery Popup so user can Reconnect, Scan, or Retry without losing context
        triggerPrinterRecoveryModal({
            slot,
            error: error?.message || "Bluetooth print write failed",
            printerName: getConnectedPrinterName(slot),
            uncertainOutcome: true, // Warn user to verify paper before duplicating receipt
            onRetry: async () => { await printReceiptData(order, business, elementToPrint, targetSlot); },
            onScan: async () => { await ensurePrinterConnected(true, slot); }
        });

        throw new Error(error.message || "Failed to print over Bluetooth");
    }
    });
}

/**
 * Dedicated Independent Token Ticket Printer (ESC/POS over Bluetooth)
 * Prints a clean, thermal-optimized separate order token ticket.
 * Zero side-effects: does not alter bill, token sequence, inventory or status.
 */
export async function printTokenTicketData(ticketData: {
    business: any;
    billNumber?: string;
    tokenNumber?: string | number;
    createdAt?: string | Date;
}, targetSlot: PrinterSlot = 'bill') {
    return enqueuePrintTask(async () => {
        const isCapacitor = Capacitor.isNativePlatform();
        const slot: PrinterSlot = targetSlot;
        const effectiveSlot: PrinterSlot = (slot === 'kot' && isSamePrinterForKot()) ? 'bill' : slot;

        let activeState = printerSlots[effectiveSlot];
        const isAlive = isCapacitor 
            ? !!(activeState.capDevice && activeState.capChar)
            : !!(activeState.char && activeState.device?.gatt?.connected);

        if (!isAlive) {
            activeState.status = 'RECONNECTING';
            try {
                await ensurePrinterConnected(false, effectiveSlot);
                activeState = printerSlots[effectiveSlot];
            } catch (reconErr: any) {
                activeState.status = 'ERROR';
                activeState.lastError = reconErr?.message || "Reconnection failed";
            }
        }

        if (isCapacitor) {
            if (!activeState.capDevice || !activeState.capChar) {
                const altSlot: PrinterSlot = effectiveSlot === 'kot' ? 'bill' : 'kot';
                if (printerSlots[altSlot].capDevice && printerSlots[altSlot].capChar) {
                    activeState = printerSlots[altSlot];
                }
            }
            if (!activeState.capDevice || !activeState.capChar) {
                const err = `Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer.`;
                activeState.status = 'DISCONNECTED';
                activeState.lastError = err;
                triggerPrinterRecoveryModal({
                    slot,
                    error: err,
                    printerName: getConnectedPrinterName(slot),
                    onRetry: async () => { await ensurePrinterConnected(false, slot); },
                    onScan: async () => { await ensurePrinterConnected(true, slot); }
                });
                throw new Error(err);
            }
        } else {
            if (!activeState.char || !activeState.device?.gatt?.connected) {
                const altSlot: PrinterSlot = effectiveSlot === 'kot' ? 'bill' : 'kot';
                if (printerSlots[altSlot].char && printerSlots[altSlot].device?.gatt?.connected) {
                    activeState = printerSlots[altSlot];
                }
            }
            if (!activeState.char || !activeState.device?.gatt?.connected) {
                const err = `Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer.`;
                activeState.status = 'DISCONNECTED';
                activeState.lastError = err;
                triggerPrinterRecoveryModal({
                    slot,
                    error: err,
                    printerName: getConnectedPrinterName(slot),
                    onRetry: async () => { await ensurePrinterConnected(false, slot); },
                    onScan: async () => { await ensurePrinterConnected(true, slot); }
                });
                throw new Error(err);
            }
        }

        const bt = getEffectiveBtSettings(ticketData.business);
        const is80 = bt.paperWidth === "80mm";
        const WIDTH = is80 ? 48 : 32;

        try {
            const encoder = new TextEncoder();
            const dataChunks: Uint8Array[] = [];
            const INIT = new Uint8Array([0x1B, 0x40]); // ESC @
            const CODE_PAGE = new Uint8Array([0x1B, 0x74, 0x00]); // ESC t 0
            const PAPER_CUT = new Uint8Array([0x1D, 0x56, 0x41, 0x10]); // GS V 65 16

            const ALIGN_CENTER = new Uint8Array([0x1B, 0x61, 0x01]);
            const ALIGN_LEFT = new Uint8Array([0x1B, 0x61, 0x00]);
            const BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
            const BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
            const LINE_FEED = new Uint8Array([0x0A]);
            const TEXT_NORMAL = new Uint8Array([0x1D, 0x21, 0x00]);
            const TEXT_DOUBLE_H = new Uint8Array([0x1D, 0x21, 0x01]);
            const TEXT_DOUBLE_HW = new Uint8Array([0x1D, 0x21, 0x11]);

            dataChunks.push(INIT);
            dataChunks.push(CODE_PAGE);

            // Divider
            const divider = "-".repeat(WIDTH) + "\n";

            // Header Section: Restaurant Name
            dataChunks.push(ALIGN_CENTER);
            dataChunks.push(divider ? encoder.encode(divider) : LINE_FEED);

            const bName = ticketData.business?.businessName || ticketData.business?.name || "KRAVY RESTAURANT";
            dataChunks.push(TEXT_DOUBLE_H);
            dataChunks.push(BOLD_ON);
            dataChunks.push(encoder.encode(bName + "\n"));
            dataChunks.push(BOLD_OFF);
            dataChunks.push(TEXT_NORMAL);
            dataChunks.push(LINE_FEED);

            // Title: ORDER TOKEN
            dataChunks.push(BOLD_ON);
            dataChunks.push(encoder.encode("ORDER TOKEN\n"));
            dataChunks.push(BOLD_OFF);
            dataChunks.push(LINE_FEED);

            // Token Number (Largest & Most Prominent: Double Height + Double Width + Bold)
            let rawToken = ticketData.tokenNumber != null ? String(ticketData.tokenNumber) : "001";
            if (/^\d+$/.test(rawToken) && rawToken.length < 3) {
                rawToken = rawToken.padStart(3, "0");
            }
            dataChunks.push(TEXT_DOUBLE_HW);
            dataChunks.push(BOLD_ON);
            dataChunks.push(encoder.encode(rawToken + "\n"));
            dataChunks.push(BOLD_OFF);
            dataChunks.push(TEXT_NORMAL);
            dataChunks.push(LINE_FEED);

            // Call to action
            dataChunks.push(BOLD_ON);
            dataChunks.push(encoder.encode("PLEASE COLLECT YOUR ORDER\n"));
            dataChunks.push(BOLD_OFF);

            // Divider
            dataChunks.push(encoder.encode(divider));

            // Metadata: Invoice / Date / Time (Left aligned or neat lines)
            dataChunks.push(ALIGN_LEFT);
            const billNo = ticketData.billNumber || "—";
            dataChunks.push(encoder.encode(`Invoice: ${billNo}\n`));

            const dObj = ticketData.createdAt ? new Date(ticketData.createdAt) : new Date();
            const dateStr = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            dataChunks.push(encoder.encode(`Date: ${dateStr}\n`));
            dataChunks.push(encoder.encode(`Time: ${timeStr}\n`));

            // Footer
            dataChunks.push(ALIGN_CENTER);
            dataChunks.push(encoder.encode(divider));
            dataChunks.push(BOLD_ON);
            dataChunks.push(encoder.encode("THANK YOU!\n"));
            dataChunks.push(BOLD_OFF);
            dataChunks.push(encoder.encode(divider));

            // Bottom Feed lines
            const feedCount = Math.max(2, Math.min(Number(bt.bottomFeeds || 4), 8));
            dataChunks.push(new Uint8Array(feedCount).fill(0x0A));

            // Auto Paper Cut if enabled
            if (bt.cutPaper !== false) {
                dataChunks.push(PAPER_CUT);
            }

            // Merge chunks and send
            const totalLength = dataChunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const merged = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of dataChunks) {
                merged.set(chunk, offset);
                offset += chunk.length;
            }

            // Send binary print stream (Capacitor BLE or Web Bluetooth)
            const CHUNK_SIZE = isCapacitor ? (activeState.capCanWriteWithoutResponse ? Math.min(activeState.capMtu || 244, 244) : 64) : 100;
            const CHUNK_DELAY = isCapacitor ? (activeState.capCanWriteWithoutResponse ? 0 : 5) : 15;

            for (let i = 0; i < merged.length; i += CHUNK_SIZE) {
                const slice = merged.slice(i, i + CHUNK_SIZE);
                if (isCapacitor) {
                    const ble = await getCapacitorBle();
                    const BleClient = ble?.BleClient;
                    const BluetoothLe = ble?.BluetoothLe;
                    const dataViewToHexString = ble?.dataViewToHexString;

                    const dataView = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
                    if (activeState.capCanWriteWithoutResponse && BluetoothLe && dataViewToHexString) {
                        try {
                            const hexVal = dataViewToHexString(dataView);
                            await BluetoothLe.writeWithoutResponse({
                                deviceId: activeState.capDevice.deviceId,
                                service: activeState.capService,
                                characteristic: activeState.capChar,
                                value: hexVal
                            });
                        } catch(e) {
                            if (BleClient) await BleClient.write(activeState.capDevice.deviceId, activeState.capService, activeState.capChar, dataView);
                        }
                    } else if (BleClient) {
                        await BleClient.write(activeState.capDevice.deviceId, activeState.capService, activeState.capChar, dataView);
                    }
                    if (CHUNK_DELAY > 0) {
                        await new Promise(r => setTimeout(r, CHUNK_DELAY));
                    }
                } else {
                    const targetChar = activeState.char;
                    if (!targetChar) throw new Error("Printer connection lost during print");
                    if (targetChar.writeValueWithoutResponse && targetChar.properties?.writeWithoutResponse) {
                        try {
                            await targetChar.writeValueWithoutResponse(slice);
                        } catch (e) {
                            await targetChar.writeValue(slice);
                        }
                    } else {
                        await targetChar.writeValue(slice);
                    }
                    if (CHUNK_DELAY > 0) {
                        await new Promise(r => setTimeout(r, CHUNK_DELAY));
                    }
                }
            }

            activeState.status = 'READY';
            activeState.lastPrintedAt = Date.now();
            return true;
        } catch (error: any) {
            console.error("Token Ticket Bluetooth Print Error:", error);
            activeState.status = 'ERROR';
            activeState.lastError = error?.message || "Failed to print Token Ticket";
            triggerPrinterRecoveryModal({
                slot,
                error: error?.message || "Token Ticket write failed",
                printerName: getConnectedPrinterName(slot),
                onRetry: async () => { await printTokenTicketData(ticketData, targetSlot); },
                onScan: async () => { await ensurePrinterConnected(true, slot); }
            });
            throw new Error(error?.message || "Failed to print Token Ticket over Bluetooth");
        }
    });
}

// Force HMR trigger
const pLR: any = (l, r, w = 32) => {
    const len = l.length + r.length;
    if (len >= w) return l.substring(0, w - r.length - 1) + " " + r;
    return l + " ".repeat(w - len) + r;
};

const wrapText: any = (text, maxFirstLineWidth, maxSubLineWidth) => {
    const maxSubWidth = maxSubLineWidth || maxFirstLineWidth;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (let word of words) {
        let currentMaxWidth = lines.length === 0 ? maxFirstLineWidth : maxSubWidth;
        if ((currentLine + word).length > currentMaxWidth) {
            if (currentLine.length > 0) {
                lines.push(currentLine.trim());
                currentLine = '';
            }
            while (word.length > 0) {
                currentMaxWidth = lines.length === 0 ? maxFirstLineWidth : maxSubWidth;
                if (word.length > currentMaxWidth) {
                    lines.push(word.substring(0, currentMaxWidth));
                    word = word.substring(currentMaxWidth);
                } else {
                    currentLine = word + ' ';
                    word = ''; // exit inner loop
                }
            }
        } else {
            currentLine += word + ' ';
        }
    }
    if (currentLine.trim().length > 0) lines.push(currentLine.trim());
    return lines;
};

const numToWords: any = (num: number, currencyCode: string = "INR") => {
    if (num === 0) return "Zero Only";
    const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const inWords = (n: any) => {
        if ((n = n.toString()).length > 9) return "overflow";
        let nArray = ("000000000" + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!nArray) return "";
        let str = "";
        str += (Number(nArray[1]) !== 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + " " + a[nArray[1][1]]) + "Crore " : "";
        str += (Number(nArray[2]) !== 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + " " + a[nArray[2][1]]) + "Lakh " : "";
        str += (Number(nArray[3]) !== 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + " " + a[nArray[3][1]]) + "Thousand " : "";
        str += (Number(nArray[4]) !== 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + " " + a[nArray[4][1]]) + "Hundred " : "";
        str += (Number(nArray[5]) !== 0) ? ((str != "") ? "and " : "") + (a[Number(nArray[5])] || b[nArray[5][0]] + " " + a[nArray[5][1]]) : "";
        return str.trim();
    };
    const intVal = Math.floor(Math.abs(num));
    const decVal = Math.round((Math.abs(num) - intVal) * 100);
    const intWords = inWords(intVal);
    if (currencyCode !== "INR") {
        let result = intWords + ` ${currencyCode}`;
        if (decVal > 0) result += " and " + inWords(decVal) + " Cents";
        return result + " Only";
    }
    let result = intWords + " Rupees";
    if (decVal > 0) result += " and " + inWords(decVal) + " Paise";
    return result + " Only";
};

const padCenter: any = (str, w) => {
    if (str.length >= w) return str;
    const pad = Math.floor((w - str.length) / 2);
    return " ".repeat(pad) + str + " ".repeat(w - str.length - pad);
};

export function generateTextReceiptPreview(order: any, business: any, isKot: boolean = false) {
    try {
        const bt = getEffectiveBtSettings(business);
        const is80 = bt.paperWidth === '80mm' || business?.printSettings?.paperWidth === '80mm';
        const WIDTH = is80 ? 48 : 32;
        let out = "";

        const activeCurCode = (typeof localStorage !== 'undefined' ? localStorage.getItem("selected_currency") : null) || business?.currencyCode || order?.currencySymbol || business?.currencySymbol || "INR";
        const activeTaxCfg = getTaxConfig(activeCurCode);
        const activeCurrPrefix = activeTaxCfg.symbol === "₹" ? "Rs." : `${activeTaxCfg.symbol} `;
        const activeTaxName = activeTaxCfg.taxName || "GST";
        const activeTaxIdLabel = activeTaxCfg.taxIdLabel || "GSTIN";
        const isSplitTax = activeTaxCfg.isSplitTax !== false;
        
        const pLR: any = (l, r, w = WIDTH) => {
            const len = l.length + r.length;
            if (len >= w) return l.substring(0, w - r.length - 1) + " " + r;
            return l + " ".repeat(w - len) + r;
        };

        if (isKot) {
            if (bt.showKOTHeader !== false) {
                out += padCenter("K.O.T", WIDTH) + "\n";
                out += "-".repeat(WIDTH) + "\n";
            }
            const tableStr = (bt.showKOTTable !== false) ? ("TABLE: " + (order?.tableName || "COUNTER")) : "";
            const kotNum = order?.kotNumbers?.[order?.kotNumbers?.length - 1] 
                || order?.tokenNumber 
                || order?.reservedTokenNumber 
                || order?.kotNumber 
                || (Array.isArray(order?.items) && order.items.find((i: any) => i?.kotNumber)?.kotNumber) 
                || (business?.lastTokenNumber ? String(business.lastTokenNumber) : "") 
                || "1";
            const kotNumStr = (bt.showKOTToken !== false) ? ("KOT NO: " + kotNum) : "";
            if (tableStr || kotNumStr) {
                out += pLR(tableStr, kotNumStr, WIDTH) + "\n";
            }
            
            const billNoStr = (bt.showKOTBillNo !== false) ? ("Bill: " + (order?.billNumber || order?.orderNumber || "DRAFT")) : "";
            let timeStr = "";
            let fullDateStr = "";
            try { 
                const d = new Date();
                timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                fullDateStr = dPart + " " + timeStr;
            } catch(e){}
            const datePrint = (bt.showKOTDateTime !== false) ? timeStr : "";
            if (billNoStr || datePrint) {
                out += pLR(billNoStr, datePrint, WIDTH) + "\n";
            }
            
            if (bt.showKOTCustomer !== false && (order?.customerName || order?.customerPhone)) {
                out += "Customer: " + (order?.customerName || "Walk-in") + (order?.customerPhone ? ` (${order.customerPhone})` : "") + "\n";
            }

            out += "-".repeat(WIDTH) + "\n";
            out += pLR("ITEM DESCRIPTION", "QTY", WIDTH) + "\n";
            
            const allItems = order?.items || [];
            const newItemsOnly = allItems.filter((i: any) => i?.isNew);
            const items = newItemsOnly.length > 0 ? newItemsOnly : allItems;
            for (const item of items) {
                const name = (item.name || "Item").toUpperCase();
                const fullQty = item.qty || item.quantity || 1;
                const printedQty = item.printedQty || 0;
                const qty = (item.isNew && printedQty) ? (fullQty - printedQty) : fullQty;
                const rightCol = "x" + qty;
                const maxNameWidth = WIDTH - rightCol.length - 1;
                const lines = wrapText(name, maxNameWidth, maxNameWidth - 4);
                
                for (let i = 0; i < lines.length; i++) {
                    if (i === 0) {
                        const paddedName = lines[i].padEnd(maxNameWidth, " ");
                        out += paddedName + " " + rightCol + "\n";
                    } else {
                        out += "    " + lines[i] + "\n";
                    }
                }
                if (bt.showKOTVariants !== false && item.variants && item.variants.length > 0) {
                    out += "  (" + item.variants.map((v: any) => v.name || v).join(", ") + ")\n";
                }
                if (bt.showKOTInstructions !== false && item.notes) {
                    out += "  * Note: " + devanagariToHinglish(item.notes) + "\n";
                }
                if (bt.showKOTItemDivider !== false) {
                    out += "- ".repeat(Math.floor(WIDTH / 2)).trim() + "\n";
                }
            }
            
            if (bt.showKOTFooter !== false) {
                out += "-".repeat(WIDTH) + "\n";
                out += padCenter("END OF KOT", WIDTH) + "\n";
                if (bt.showKOTDateTime !== false) {
                    out += padCenter(fullDateStr, WIDTH) + "\n";
                }
            }
        } else {
            if (bt.showLogo !== false && (business?.logoUrl || business?.logo)) {
                out += padCenter("[ LOGO ]", WIDTH) + "\n";
            }
            if (bt.showBusinessName !== false) {
                const rawBName = business?.businessName || business?.name || "KRAVY POS";
                const formattedLines = formatBusinessName(rawBName, is80 ? '80mm' : '58mm', 'double_h');
                formattedLines.forEach(lineItem => {
                    out += padCenter(lineItem.text, WIDTH) + "\n";
                });
            }
            
            if (bt.showTagline !== false && business?.tagline) {
                const paragraphs = business.tagline.split('\n');
                paragraphs.forEach(p => {
                    const tLines = wrapText(p, WIDTH, WIDTH);
                    tLines.forEach(l => out += padCenter(l, WIDTH) + "\n");
                });
            }

            if (bt.showAddress !== false) {
                const addrParts = [];
                if (business?.businessAddress || business?.address) addrParts.push(business.businessAddress || business.address);
                if (business?.district) addrParts.push(business.district);
                if (business?.state) addrParts.push(business.state);
                
                let fullAddr = addrParts.join(", ");
                if (business?.pinCode) fullAddr += " - " + business.pinCode;

                if (fullAddr.trim()) {
                    let addr = fullAddr;
                    addr = addr.replace(/<br\s*[\/]?>/gi, '\n').replace(/\r\n/g, '\n');
                    const paragraphs = addr.split('\n');
                    paragraphs.forEach(p => {
                        const aLines = wrapText(p, WIDTH, WIDTH);
                        aLines.forEach(l => out += padCenter(l, WIDTH) + "\n");
                    });
                }
            }

            const phonePrefix = (business?.phonePrefixType || bt?.phonePrefixType || "TEXT").toString().toUpperCase() === "SYMBOL" ? "Tel: " : "Mob: ";
            const phoneStr = business?.contactPersonPhone || business?.contactPhone || business?.businessPhone || business?.phone;
            if (bt.showContact !== false && phoneStr) out += padCenter(phonePrefix + phoneStr, WIDTH) + "\n";
            const secPhone = bt?.secondaryPhone || business?.secondaryPhone || business?.printSettings?.secondaryPhone;
            if (bt.showContact !== false && secPhone) out += padCenter(phonePrefix + secPhone, WIDTH) + "\n";
            if (bt.showGST !== false && business?.gstNumber) out += padCenter(`${activeTaxIdLabel}: ` + business.gstNumber, WIDTH) + "\n";
            if (bt.showFSSAI !== false && business?.fssaiNumber) out += padCenter("FSSAI: " + business.fssaiNumber, WIDTH) + "\n";
            
            out += "-".repeat(WIDTH) + "\n";
            out += padCenter(business?.gstNumber && order?.isTaxEnabled ? "TAX INVOICE" : "SALES RECEIPT", WIDTH) + "\n";
            out += "-".repeat(WIDTH) + "\n";
            
            const billNoStr = (bt.showInvoiceNumber !== false) ? ("Bill No: " + (order?.billNumber || order?.orderNumber || "DRAFT")) : "";
            const tokenRaw = (order?.tokenNumber || order?.kotNumbers?.[0] || "");
            const tokenStr = (bt.showToken !== false && tokenRaw) ? ("Token: " + tokenRaw) : "";
            if (billNoStr || tokenStr) {
                out += pLR(billNoStr, tokenStr, WIDTH) + "\n";
            }
            
            let dPart = "";
            let fullDateStr = "";
            try { 
                const d = order?.createdAt ? new Date(order.createdAt) : new Date();
                dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const dPartFull = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                fullDateStr = dPartFull + " " + timeStr;
            } catch(e){}
            const datePrint = (bt.showDate !== false) ? ("Date: " + dPart) : "";
            const tableStr = (bt.showTableInfo !== false) ? ("Table: " + (order?.tableName || "POS")) : "";
            if (datePrint || tableStr) {
                out += pLR(datePrint, tableStr, WIDTH) + "\n";
            }
            
            if (bt.showCustomerDetails !== false && (order?.customerName || order?.customerPhone || order?.customerAddress)) {
                out += "-".repeat(WIDTH) + "\n";
                out += "Customer: " + (order?.customerName || "Walk-in Customer") + "\n";
                if (bt.showCustomerPhone !== false && order?.customerPhone) out += "Phone: " + order.customerPhone + "\n";
                if (bt.showCustomerAddress !== false && order?.customerAddress) out += "Addr: " + order.customerAddress + "\n";
            }
            out += "-".repeat(WIDTH) + "\n";
            
            const hdrRight = "AMOUNT";
            const hdrMaxName = WIDTH - hdrRight.length - 1;
            out += "ITEM".padEnd(hdrMaxName, " ") + " " + hdrRight + "\n";
            
            let subtotal = 0;
            const items = order?.items || [];
            for (const item of items) {
                const name = (item.name || "Item").toUpperCase();
                const qty = String(item.qty || item.quantity || 1);
                const price = (item.price || item.rate || 0);
                const totalLine = price * Number(qty);
                subtotal += totalLine;
                
                const tot = totalLine.toFixed(2);
                const hdrRight = "AMOUNT";
                const maxNameWidth = WIDTH - hdrRight.length - 1;
                const lines = wrapText(name, maxNameWidth, maxNameWidth); 
                
                for (let i = 0; i < lines.length; i++) {
                    out += lines[i] + "\n";
                }
                
                if (bt.showVariants !== false) {
                    let variants = [];
                    if (item.variant) variants.push(item.variant);
                    if (bt.showFoodTypeSuffix !== false && item.foodType) variants.push(item.foodType);
                    if (item.variants && Array.isArray(item.variants)) {
                        item.variants.forEach((v: any) => variants.push(v.name || v));
                    }
                    if (variants.length > 0) {
                        const varLines = wrapText(variants.join(" + "), maxNameWidth, maxNameWidth);
                        varLines.forEach((l: string) => out += l + "\n");
                    }
                }

                const taxActive = (order?.tax || 0) > 0 || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
                let qtyStr = `${qty} x ${price.toFixed(2)}`;
                if (taxActive && item.gst !== undefined && item.gst !== null && Number(item.gst) > 0) {
                    qtyStr += ` | ${activeTaxName} ${item.gst}%`;
                }
                out += pLR(qtyStr, tot, WIDTH) + "\n";
                out += "\n";
            }
            out += "-".repeat(WIDTH) + "\n";
            
            const discount = order?.discountAmount || order?.discountAmt || order?.discount || 0;
            const tax = order?.tax || order?.gstAmount || order?.gst || 0;
            const total = order?.total || order?.finalTotal || (subtotal - discount + tax);
            const taxActive = (tax > 0) || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
            
            if (bt.showSubtotal !== false) {
                out += pLR("Subtotal", subtotal.toFixed(2), WIDTH) + "\n";
            }
            if (bt.showDiscount !== false && discount > 0) {
                out += pLR("Discount", "-" + discount.toFixed(2), WIDTH) + "\n";
            }
            
            const delivery = order?.deliveryCharges || 0;
            if (bt.showDeliveryCharge !== false && delivery > 0) {
                out += pLR("Delivery Charge", "+" + delivery.toFixed(2), WIDTH) + "\n";
            }
            const packaging = order?.packagingCharges || 0;
            if (bt.showPackagingCharge !== false && packaging > 0) {
                out += pLR("Packaging", "+" + packaging.toFixed(2), WIDTH) + "\n";
            }
            const service = order?.serviceCharge || 0;
            const serviceLabel = order?.serviceChargeName || business?.serviceChargeName || "Service Charge";
            if (bt.showServiceCharge !== false && service > 0) {
                out += pLR(serviceLabel, "+" + service.toFixed(2), WIDTH) + "\n";
            }
            
            if (bt.showTaxBreakup !== false) {
                if (taxActive) {
                    const taxBreakup = calculateTaxBreakup(order, business);
                    const totalTaxable = taxBreakup.reduce((a: any, b: any) => a + b.taxable, 0);
                    if (totalTaxable > 0) {
                        out += pLR("Taxable Amt", totalTaxable.toFixed(2), WIDTH) + "\n";
                    }
                    let hasBreakupPrinted = false;
                    for (const t of taxBreakup) {
                        if (isSplitTax) {
                            if (t.cgst > 0 || t.sgst > 0) {
                                hasBreakupPrinted = true;
                                if (t.cgst > 0) out += pLR(`CGST (${t.rate/2}%)`, t.cgst.toFixed(2), WIDTH) + "\n";
                                if (t.sgst > 0) out += pLR(`SGST (${t.rate/2}%)`, t.sgst.toFixed(2), WIDTH) + "\n";
                            } else if (t.igst > 0) {
                                hasBreakupPrinted = true;
                                out += pLR(`IGST (${t.rate}%)`, t.igst.toFixed(2), WIDTH) + "\n";
                            }
                        } else {
                            if (t.totalTax > 0) {
                                hasBreakupPrinted = true;
                                out += pLR(`${activeTaxName} (${t.rate}%)`, t.totalTax.toFixed(2), WIDTH) + "\n";
                            }
                        }
                    }
                    if (!hasBreakupPrinted && tax > 0) {
                        out += pLR(activeTaxName, "+" + tax.toFixed(2), WIDTH) + "\n";
                    }
                } else if (tax > 0) {
                    out += pLR(activeTaxName, "+" + tax.toFixed(2), WIDTH) + "\n";
                }
            }
            
            if (bt.showGrandTotal !== false) {
                out += "-".repeat(WIDTH) + "\n";
                out += pLR("GRAND TOTAL", `${activeCurrPrefix}${total.toFixed(2)}`, WIDTH) + "\n";
                out += "-".repeat(WIDTH) + "\n";
            }
            
            if (bt.showAmountInWords !== false) {
                const amtWords = "Amount in Words: " + numToWords(total, activeTaxCfg.code);
                const awLines = wrapText(amtWords, WIDTH, WIDTH);
                awLines.forEach((l: string) => out += l + "\n");
            }
            
            if (bt.showPaymentMode !== false) {
                out += "Payment Mode: " + (order?.paymentMode || "CASH") + "\n";
            }
            if (bt.showPaymentStatus !== false) {
                out += "Status: " + (order?.paymentStatus || "Paid") + "\n";
            }
            
            if (bt.showBalanceDue !== false && (order?.paymentStatus === "PARTIAL" || (order?.balanceDue !== undefined && order.balanceDue > 0))) {
                const paid = order?.amountPaid || 0;
                const due = order?.balanceDue || 0;
                out += "-".repeat(WIDTH) + "\n";
                out += pLR("Amount Paid:", `${activeCurrPrefix}${paid.toFixed(2)}`, WIDTH) + "\n";
                out += pLR("Balance Due:", `${activeCurrPrefix}${due.toFixed(2)}`, WIDTH) + "\n";
            }
            out += "\n";

            const effectiveUpi = (business?.upi || business?.upiId || bt?.upiId || "").trim();
            const showUpiQr = bt.showUpiQr !== false && (Boolean(effectiveUpi) || order?.paymentMode === "UPI");
            if (showUpiQr) {
                const upiPa = effectiveUpi || "kravy@upi";
                out += padCenter("SCAN & PAY", WIDTH) + "\n";
                out += padCenter("[ UPI QR CODE ]", WIDTH) + "\n";
                out += padCenter("UPI: " + upiPa, WIDTH) + "\n";
                if (order?.paymentMode === "UPI" && order?.upiTxnRef) {
                    out += padCenter("Txn Ref: " + order.upiTxnRef, WIDTH) + "\n";
                }
                out += "\n";
            }
            
            if (bt.showMenuQr !== false && business?.enableMenuQRInBill && business?.userId) {
                out += padCenter("RATE YOUR EXPERIENCE", WIDTH) + "\n";
                out += padCenter("[ QR CODE ]", WIDTH) + "\n";
            }
            
            if (bt.showDate !== false && fullDateStr) {
                out += padCenter(fullDateStr, WIDTH) + "\n";
            }
            if (bt.showGreetings !== false) {
                out += padCenter("HARE KRISHNA", WIDTH) + "\n";
            }
            if (bt.showPoweredBy !== false) {
                out += padCenter("Powered by Kravy POS", WIDTH) + "\n";
            }
        }
        
        return out;
    } catch(err: any) {
        console.error("Preview Generation Error:", err);
        throw new Error("Failed generating preview text: " + err.message);
    }
};

export async function disconnectPrinter(clearSavedId: boolean = false, targetSlot: PrinterSlot | 'all' = 'all') {
    try {
        const slotsToDisconnect: PrinterSlot[] = targetSlot === 'all' ? ['bill', 'kot'] : [targetSlot];
        const shared = isSamePrinterForKot();
        
        for (const s of slotsToDisconnect) {
            const { idKey } = getStorageKeys(s);
            if (clearSavedId && typeof localStorage !== 'undefined') {
                localStorage.removeItem(idKey);
                if (s === 'bill' || shared) localStorage.removeItem("LAST_CONNECTED_PRINTER_ID");
                if (s === 'kot') localStorage.removeItem("LAST_CONNECTED_KOT_PRINTER_ID");
            }

            const state = printerSlots[s];
            const otherSlot: PrinterSlot = s === 'bill' ? 'kot' : 'bill';
            const otherState = printerSlots[otherSlot];
            
            // If disconnecting only one slot while both share same physical printer and the other is still active, don't drop GATT hardware connection
            const shouldDisconnectHardware = targetSlot === 'all' || !shared;

            const isCapacitor = Capacitor.isNativePlatform();
            if (isCapacitor) {
                if (shouldDisconnectHardware && state.capDevice) {
                    const ble = await getCapacitorBle();
                    if (ble?.BleClient) {
                        await ble.BleClient.disconnect(state.capDevice.deviceId).catch(()=>{});
                    }
                }
                state.capDevice = null;
                state.capChar = "";
            } else {
                if (shouldDisconnectHardware && state.device && state.device.gatt?.connected) {
                    try { state.device.gatt.disconnect(); } catch(e) {}
                }
                state.device = null;
                state.server = null;
                state.char = null;
            }
            state.connPromise = null;
        }
    } catch(err) {
        console.error("Failed to disconnect printer:", err);
    }
}

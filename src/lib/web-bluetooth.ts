// @ts-nocheck
import { Capacitor } from '@capacitor/core';
import { BleClient, BluetoothLe, dataViewToHexString } from '@capacitor-community/bluetooth-le';
import QRCode from 'qrcode';

export const PRINTER_SERVICE_UUIDS = [
    "000018f0-0000-1000-8000-00805f9b34fb", // Generic POS
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", 
    "0000fee7-0000-1000-8000-00805f9b34fb", 
    "49535343-fe7d-4ae5-8fa9-9fafd205e455"
];

export type PrinterSlot = 'bill' | 'kot';

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
    }
};

function getStorageKeys(slot: PrinterSlot) {
    if (slot === 'kot') {
        return {
            idKey: "LAST_CONNECTED_KOT_PRINTER_ID",
            enabledKey: "bt_kot_printer_enabled",
        };
    }
    return {
        idKey: "LAST_CONNECTED_BILL_PRINTER_ID", // with fallback to LAST_CONNECTED_PRINTER_ID
        enabledKey: "bt_bill_printer_enabled",
    };
}

export async function ensurePrinterConnected(forcePrompt: boolean = false, slot: PrinterSlot = 'bill') {
    const isCapacitor = Capacitor.isNativePlatform();

    if (!isCapacitor && !navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser.");
    }

    const state = printerSlots[slot];
    const { idKey } = getStorageKeys(slot);

    if (state.connPromise && !forcePrompt) {
        return await state.connPromise;
    }

    state.connPromise = (async () => {
        if (isCapacitor) {
            try {
                await BleClient.initialize();
                
                if (!forcePrompt && state.capDevice && state.capChar) {
                    return { capacitor: true };
                }

                if (forcePrompt && state.capDevice) {
                    await BleClient.disconnect(state.capDevice.deviceId).catch(()=>{});
                    state.capDevice = null;
                    state.capChar = "";
                }

                let savedCapacitorId = typeof localStorage !== 'undefined' ? localStorage.getItem(idKey) : null;
                if (!savedCapacitorId && slot === 'bill' && typeof localStorage !== 'undefined') {
                    savedCapacitorId = localStorage.getItem("LAST_CONNECTED_PRINTER_ID");
                }

                if (!forcePrompt && !state.capDevice && savedCapacitorId) {
                    try {
                        state.capDevice = { deviceId: savedCapacitorId };
                    } catch(e) {}
                }

                if (!state.capDevice) {
                    state.capDevice = await BleClient.requestDevice({
                        // POS printers accept all
                    });
                }

                await BleClient.connect(state.capDevice.deviceId, (deviceId) => {
                    state.capDevice = null;
                    state.capChar = "";
                    state.capMtu = 20;
                    state.capCanWriteWithoutResponse = false;
                    console.log(`Capacitor Printer [${slot}] disconnected`, deviceId);
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
                    if (slot === 'bill') localStorage.setItem("LAST_CONNECTED_PRINTER_ID", state.capDevice.deviceId);
                }

                return { capacitor: true };
            } catch (error: any) {
                state.capDevice = null;
                throw new Error("Capacitor BLE Error: " + (error.message || error));
            }
        }

        try {
            if (!forcePrompt && state.device && state.device.gatt?.connected && state.char) {
                return state.char;
            }

            const previousDevice = state.device;
            const previousServer = state.server;
            const previousChar = state.char;

            let autoReconnected = false;
            let lastPrinterId = typeof localStorage !== 'undefined' ? localStorage.getItem(idKey) : null;
            if (!lastPrinterId && slot === 'bill' && typeof localStorage !== 'undefined') {
                lastPrinterId = localStorage.getItem("LAST_CONNECTED_PRINTER_ID");
            }

            let targetDevice: BluetoothDevice | null = null;

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
                        // If checking KOT slot and bill already has devices[0], try another if available
                        const otherSlot = slot === 'bill' ? 'kot' : 'bill';
                        const otherDeviceId = printerSlots[otherSlot]?.device?.id;
                        const candidate = devices.find(d => d.id !== otherDeviceId) || devices[0];
                        if (candidate) {
                            targetDevice = candidate;
                            autoReconnected = true;
                        }
                    }
                } catch(e) {
                    console.log(`Auto-reconnect getDevices failed for [${slot}]:`, e);
                }
            }

            if (!targetDevice) {
                try {
                    targetDevice = await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: PRINTER_SERVICE_UUIDS
                    });
                } catch (error: any) {
                    console.log(`Device request failed or cancelled [${slot}]:`, error);
                    if (previousDevice && previousDevice.gatt?.connected && previousChar) {
                        state.device = previousDevice;
                        state.server = previousServer;
                        state.char = previousChar;
                        return previousChar;
                    }
                    if (error.name === 'NotFoundError' || error.message.includes('cancelled')) {
                        throw new Error("Printer selection was cancelled.");
                    }
                    throw new Error("Failed to request bluetooth device: " + error.message);
                }
            }

            if (previousDevice && previousDevice !== targetDevice && previousDevice.gatt?.connected) {
                try {
                    previousDevice.gatt.disconnect();
                } catch(e) {}
            }

            state.device = targetDevice;

            state.device.addEventListener("gattserverdisconnected", () => {
                state.server = null;
                state.char = null;
                console.log(`Printer [${slot}] disconnected (gattserverdisconnected)`);
            });

            let retries = 4;
            let connectError = null;
            
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
                    console.log(`GATT Connect attempt [${slot}] failed. Retries left: ${retries - 1}`, error);
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 350));
                    }
                }
            }

            if (!state.server) {
                console.log(`GATT Connect failed [${slot}]:`, connectError);
                try {
                    targetDevice = await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: PRINTER_SERVICE_UUIDS
                    });
                    state.device = targetDevice;
                    state.device.addEventListener("gattserverdisconnected", () => {
                        state.server = null;
                        state.char = null;
                        console.log(`Printer [${slot}] disconnected (gattserverdisconnected)`);
                    });
                    state.server = await state.device.gatt?.connect() || null;
                } catch (fallbackErr: any) {
                    if (!forcePrompt && (fallbackErr.name === 'NotFoundError' || fallbackErr.message?.includes('cancelled'))) {
                        throw new Error(`Bluetooth printer [${slot}] is offline. Please select printer to connect.`);
                    }
                    throw fallbackErr;
                }

                if (!state.server) throw new Error(`Could not connect to ${slot.toUpperCase()} printer. Please ensure printer is turned on.`);
            }
            
            if (state.device && state.device.id && typeof localStorage !== 'undefined') {
                localStorage.setItem(idKey, state.device.id);
                if (slot === 'bill') localStorage.setItem("LAST_CONNECTED_PRINTER_ID", state.device.id);
            }

            let printChar: BluetoothRemoteGATTCharacteristic | null = null;
            for (const uuid of PRINTER_SERVICE_UUIDS) {
                try {
                    const service = await state.server.getPrimaryService(uuid);
                    const characteristics = await service.getCharacteristics();
                    printChar = characteristics.find(c => c.properties.writeWithoutResponse) ||
                                characteristics.find(c => c.properties.write) || null;
                } catch (e) {}
                if (printChar) break;
            }

            if (!printChar) {
                const services = await state.server.getPrimaryServices();
                for (const service of services) {
                    const characteristics = await service.getCharacteristics();
                    printChar = characteristics.find(c => c.properties.writeWithoutResponse) ||
                                characteristics.find(c => c.properties.write) || null;
                    if (printChar) break;
                }
            }

            if (!printChar) {
                throw new Error("No writable characteristic found on this printer.");
            }
            
            state.char = printChar;
            return state.char;
        } catch (e) {
            state.device = null;
            state.server = null;
            state.char = null;
            throw e;
        } finally {
            state.connPromise = null;
        }
    })();
    return state.connPromise;
}

export function isPrinterConnected(slot: PrinterSlot = 'bill'): boolean {
    const isCapacitor = Capacitor.isNativePlatform();
    const state = printerSlots[slot];
    if (isCapacitor) {
        if (state.capDevice && state.capChar) return true;
        // Fallback: if checking KOT but only Bill is connected, fallback to Bill
        if (slot === 'kot' && printerSlots.bill.capDevice && printerSlots.bill.capChar) return true;
        return false;
    }
    if (state.device && state.device.gatt?.connected && state.char) return true;
    // Fallback: if checking KOT but only Bill is connected, fallback to Bill
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
    const isCapacitor = Capacitor.isNativePlatform();

    // Auto-detect slot if not provided
    const isKot = elementToPrint && elementToPrint.classList && elementToPrint.classList.contains('kot-container');
    const slot: PrinterSlot = targetSlot || (isKot ? 'kot' : 'bill');

    // Get primary target state or fallback to other slot if only one printer is paired
    let activeState = printerSlots[slot];
    let usingFallback = false;

    if (isCapacitor) {
        if (!activeState.capDevice || !activeState.capChar) {
            // Check fallback slot
            const altSlot: PrinterSlot = slot === 'kot' ? 'bill' : 'kot';
            if (printerSlots[altSlot].capDevice && printerSlots[altSlot].capChar) {
                activeState = printerSlots[altSlot];
                usingFallback = true;
            }
        }
        if (!activeState.capDevice || !activeState.capChar) {
            throw new Error(`Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer in settings.`);
        }
    } else {
        if (!activeState.char || !activeState.device?.gatt?.connected) {
            // Check fallback slot
            const altSlot: PrinterSlot = slot === 'kot' ? 'bill' : 'kot';
            if (printerSlots[altSlot].char && printerSlots[altSlot].device?.gatt?.connected) {
                activeState = printerSlots[altSlot];
                usingFallback = true;
            }
        }
        if (!activeState.char || !activeState.device?.gatt?.connected) {
            throw new Error(`Bluetooth printer for ${slot.toUpperCase()} not connected. Please connect printer in settings.`);
        }
    }

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
            
            const is80 = business?.printSettings?.paperWidth === '80mm';
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

            const numToWords: any = (num) => {
                if (num === 0) return "Zero";
                const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
                const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
                const inWords = (n) => {
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
                return inWords(Math.round(num)) + " Rupees Only";
            };

            // Universal High-Speed QR Code generator:
            // Instead of GS ( k which fails or hangs on budget POS printers, this generates a clean,
            // razor-sharp 1-bit raster strip directly from the QR matrix in ~600 bytes total!
            // It prints in one smooth continuous sweep with zero motor stutter.
            const addFastRasterQr = (qrText: string, scale = 4) => {
                try {
                    const qr = QRCode.create(qrText, { errorCorrectionLevel: 'M' });
                    const modules = qr.modules;
                    const modCount = modules.size;
                    const dotScale = Math.max(2, Math.min(scale, 5));
                    const imgWidth = modCount * dotScale;
                    const imgHeight = modCount * dotScale;
                    const bytesWidth = Math.ceil(imgWidth / 8);

                    // Center alignment
                    dataChunks.push(new Uint8Array([0x1B, 0x61, 0x01]));

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
                        const modY = Math.floor(y / dotScale);
                        for (let x = 0; x < bytesWidth; x++) {
                            let byte = 0;
                            for (let b = 0; b < 8; b++) {
                                const px = (x * 8) + b;
                                if (px < imgWidth) {
                                    const modX = Math.floor(px / dotScale);
                                    if (modules.get(modX, modY)) {
                                        byte |= (1 << (7 - b));
                                    }
                                }
                            }
                            rasterData[idx++] = byte;
                        }
                    }
                    dataChunks.push(rasterData);
                } catch(e) {
                    console.error("Fast QR Generation error:", e);
                }
            };

            const printImageToChunks = (img, targetWidth) => {
                // Keep logo clear and well-proportioned for 2-inch (384px) & 3-inch (576px) thermal paper
                // Allow logo to scale up nicely (up to 240px wide instead of 120px)
                const maxDim = Math.min(targetWidth, 240);
                const scale = maxDim / img.width;
                const effectiveWidth = Math.min(maxDim, Math.round(img.width * scale));
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

            // Logo Print
            
            // Logo Print (Only for Bill, standard practice)
            if (!isKot && business?.logoUrl) {
                try {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    
                    const fetchImage = async () => {
                        if (business.logoUrl.startsWith("data:")) {
                            img.src = business.logoUrl;
                            return true;
                        }
                        
                        try {
                            // Route through proxy to avoid CORS tainted canvas issues
                            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(business.logoUrl)}`;
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
                        img.src = business.logoUrl;
                        return true;
                    };

                    const imgLoaded = new Promise(async (resolve) => {
                        img.onload = () => resolve(true);
                        img.onerror = () => {
                            console.warn("Logo image failed to load via onerror, skipping logo print.");
                            resolve(false);
                        };
                        const started = await fetchImage().catch(() => false);
                        if (!started) resolve(false);
                    });
                    
                    const success = await Promise.race([ imgLoaded, new Promise(r => setTimeout(() => {
                        console.warn("Logo loading timed out after 1s");
                        r(false);
                    }, 1000)) ]);
                    
                    if (success) {
                        // Increase logo size on receipt: 240 width instead of 180 (and maxDim 240 instead of 120)
                        printImageToChunks(img, 240);
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
            
            if (isKot) {
                // KOT Format
                dataChunks.push(ALIGN_CENTER);
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode("K.O.T\n"));
                dataChunks.push(BOLD_OFF);
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                dataChunks.push(ALIGN_LEFT);
                const tableStr = order?.tableName || "COUNTER";
                const kotNum = order?.kotNumbers?.[order?.kotNumbers?.length - 1] 
                    || order?.tokenNumber 
                    || order?.reservedTokenNumber 
                    || order?.kotNumber 
                    || (Array.isArray(order?.items) && order.items.find((i: any) => i?.kotNumber)?.kotNumber) 
                    || (business?.lastTokenNumber ? String(business.lastTokenNumber) : "") 
                    || "1";
                dataChunks.push(encoder.encode(pLR("TABLE: " + tableStr, "KOT NO: " + kotNum, WIDTH) + "\n"));
                
                const billNoStr = "Bill: " + (order?.billNumber || order?.orderNumber || "DRAFT");
                let timeStr = "";
                let fullDateStr = "";
                try { 
                    const d = new Date();
                    timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    fullDateStr = dPart + " " + timeStr;
                } catch(e){}
                dataChunks.push(encoder.encode(pLR(billNoStr, timeStr, WIDTH) + "\n"));
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
                    const rightCol = "x" + qty;
                    const maxNameWidth = WIDTH - rightCol.length - 1;
                    const lines = wrapText(name, maxNameWidth, maxNameWidth - 4);
                    
                    dataChunks.push(TEXT_NORMAL);
                    for (let i = 0; i < lines.length; i++) {
                        if (i === 0) {
                            const paddedName = lines[i].padEnd(maxNameWidth, " ");
                            dataChunks.push(encoder.encode(paddedName + " " + rightCol + "\n"));
                        } else {
                            dataChunks.push(encoder.encode("    " + lines[i] + "\n"));
                        }
                    }
                }
                
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                dataChunks.push(ALIGN_CENTER);
                dataChunks.push(encoder.encode("END OF KOT\n"));
                dataChunks.push(encoder.encode(fullDateStr + "\n"));
            } else {
                // Bill Format
                dataChunks.push(ALIGN_CENTER);
                dataChunks.push(TEXT_DOUBLE_H);
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode((business?.businessName || business?.name || "KRAVY POS") + "\n"));
                dataChunks.push(BOLD_OFF);
                dataChunks.push(TEXT_NORMAL);
                
                if (business?.tagline) {
                    const paragraphs = business.tagline.split('\n');
                    paragraphs.forEach(p => {
                        const tLines = wrapText(p, WIDTH, WIDTH);
                        tLines.forEach(l => dataChunks.push(encoder.encode(padCenter(l, WIDTH) + "\n")));
                    });
                }
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
                const phoneStr = business?.contactPersonPhone || business?.contactPhone || business?.businessPhone || business?.phone;
                if (phoneStr) dataChunks.push(encoder.encode(padCenter("Mob: " + phoneStr, WIDTH) + "\n"));
                if (business?.gstNumber) dataChunks.push(encoder.encode(padCenter("GSTIN: " + business.gstNumber, WIDTH) + "\n"));
                if (business?.fssaiNumber) dataChunks.push(encoder.encode(padCenter("FSSAI: " + business.fssaiNumber, WIDTH) + "\n"));
                
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                dataChunks.push(ALIGN_CENTER);
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode(business?.gstNumber && order?.isTaxEnabled ? "TAX INVOICE\n" : "SALES RECEIPT\n"));
                dataChunks.push(BOLD_OFF);
                dataChunks.push(ALIGN_LEFT);
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                const billNoStr = "Bill No: " + (order?.billNumber || order?.orderNumber || "DRAFT");
                const tokenRaw = (order?.tokenNumber || order?.kotNumbers?.[0] || "");
                const tokenStr = tokenRaw ? "Token: " + tokenRaw : "";
                dataChunks.push(encoder.encode(pLR(billNoStr, tokenStr, WIDTH) + "\n"));
                
                let dPart = "";
                let fullDateStr = "";
                try { 
                    const d = order?.createdAt ? new Date(order.createdAt) : new Date();
                    dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const dPartFull = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    fullDateStr = dPartFull + " " + timeStr;
                } catch(e){}
                const tableStr = "Table: " + (order?.tableName || "POS");
                dataChunks.push(encoder.encode(pLR("Date: " + dPart, tableStr, WIDTH) + "\n"));
                
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                dataChunks.push(encoder.encode("Customer: " + (order?.customerName || "Walk-in Customer") + "\n"));
                if (order?.customerPhone) dataChunks.push(encoder.encode("Phone: " + order.customerPhone + "\n"));
                if (order?.customerAddress) dataChunks.push(encoder.encode("Addr: " + order.customerAddress + "\n"));
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
                    
                    dataChunks.push(TEXT_NORMAL);
                    for (let i = 0; i < lines.length; i++) {
                        dataChunks.push(encoder.encode(lines[i] + "\n"));
                    }
                    
                    let variants = [];
                    if (item.variant) variants.push(item.variant);
                    if (item.foodType) variants.push(item.foodType);
                    if (item.variants && Array.isArray(item.variants)) {
                        item.variants.forEach((v: any) => variants.push(v.name || v));
                    }
                    if (variants.length > 0) {
                        const varLines = wrapText(variants.join(" + "), maxNameWidth, maxNameWidth);
                        varLines.forEach((l: string) => dataChunks.push(encoder.encode(l + "\n")));
                    }
                    
                    const taxActive = (order?.tax || 0) > 0 || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
                    let qtyStr = `${qty} x ${price.toFixed(2)}`;
                    if (taxActive && item.gst !== undefined && item.gst !== null && Number(item.gst) > 0) {
                        qtyStr += ` | GST ${item.gst}%`;
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
                
                dataChunks.push(encoder.encode(pLR("Subtotal", subtotal.toFixed(2), WIDTH) + "\n"));
                if (discount > 0) dataChunks.push(encoder.encode(pLR("Discount", "-" + discount.toFixed(2), WIDTH) + "\n"));
                
                const delivery = order?.deliveryCharges || 0;
                if (delivery > 0) dataChunks.push(encoder.encode(pLR("Delivery Charge", "+" + delivery.toFixed(2), WIDTH) + "\n"));
                const packaging = order?.packagingCharges || 0;
                if (packaging > 0) dataChunks.push(encoder.encode(pLR("Packaging", "+" + packaging.toFixed(2), WIDTH) + "\n"));
                const service = order?.serviceCharge || 0;
                const serviceLabel = order?.serviceChargeName || business?.serviceChargeName || "Service Charge";
                if (service > 0) dataChunks.push(encoder.encode(pLR(serviceLabel, "+" + service.toFixed(2), WIDTH) + "\n"));
                
                if (taxActive) {
                    const taxBreakup = calculateTaxBreakup(order, business);
                    const totalTaxable = taxBreakup.reduce((a: any, b: any) => a + b.taxable, 0);
                    if (totalTaxable > 0) {
                        dataChunks.push(encoder.encode(pLR("Taxable Amt", totalTaxable.toFixed(2), WIDTH) + "\n"));
                    }
                    
                    let hasBreakupPrinted = false;
                    for (const t of taxBreakup) {
                        if (t.cgst > 0 || t.sgst > 0) {
                            hasBreakupPrinted = true;
                            if (t.cgst > 0) dataChunks.push(encoder.encode(pLR(`CGST (${t.rate/2}%)`, t.cgst.toFixed(2), WIDTH) + "\n"));
                            if (t.sgst > 0) dataChunks.push(encoder.encode(pLR(`SGST (${t.rate/2}%)`, t.sgst.toFixed(2), WIDTH) + "\n"));
                        } else if (t.igst > 0) {
                            hasBreakupPrinted = true;
                            dataChunks.push(encoder.encode(pLR(`IGST (${t.rate}%)`, t.igst.toFixed(2), WIDTH) + "\n"));
                        }
                    }
                    
                    if (!hasBreakupPrinted && tax > 0) {
                        dataChunks.push(encoder.encode(pLR("Tax/GST", "+" + tax.toFixed(2), WIDTH) + "\n"));
                    }
                } else if (tax > 0) {
                    dataChunks.push(encoder.encode(pLR("Tax/GST", "+" + tax.toFixed(2), WIDTH) + "\n"));
                }
                
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                dataChunks.push(TEXT_DOUBLE_H);
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode(pLR("GRAND TOTAL", `Rs.${total.toFixed(2)}`, WIDTH) + "\n"));
                dataChunks.push(BOLD_OFF);
                dataChunks.push(TEXT_NORMAL);
                dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                
                const amtWords = "Amount in Words: " + numToWords(total);
                const awLines = wrapText(amtWords, WIDTH, WIDTH);
                awLines.forEach((l: string) => dataChunks.push(encoder.encode(l + "\n")));
                
                dataChunks.push(encoder.encode("Payment Mode: " + (order?.paymentMode || "CASH") + "\n"));
                dataChunks.push(encoder.encode("Status: " + (order?.paymentStatus || "Paid") + "\n"));
                
                if (order?.paymentStatus === "PARTIAL" || (order?.balanceDue !== undefined && order.balanceDue > 0)) {
                    const paid = order?.amountPaid || 0;
                    const due = order?.balanceDue || 0;
                    dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                    dataChunks.push(encoder.encode(pLR("Amount Paid:", `Rs.${paid.toFixed(2)}`, WIDTH) + "\n"));
                    dataChunks.push(encoder.encode(pLR("Balance Due:", `Rs.${due.toFixed(2)}`, WIDTH) + "\n"));
                }
                dataChunks.push(LINE_FEED);
                
                // Payment UPI QR Code (Fast direct raster bitmap for instant, smooth printing on all thermal printers)
                const showUpiQr = (business?.upi && business?.upiQrEnabled !== false) || order?.paymentMode === "UPI";
                if (showUpiQr && business?.upi) {
                    try {
                        const upiUrl = `upi://pay?pa=${business.upi}&pn=${encodeURIComponent(business.name || "Store")}&am=${total.toFixed(2)}&cu=INR`;
                        dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                        dataChunks.push(ALIGN_CENTER);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("SCAN & PAY\n"));
                        dataChunks.push(BOLD_OFF);
                        dataChunks.push(LINE_FEED);
                        
                        // Universal fast raster QR code (~2KB data, instant render, continuous print without motor stop)
                        addFastRasterQr(upiUrl, 4);
                        
                        dataChunks.push(LINE_FEED);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("UPI: " + business.upi + "\n"));
                        dataChunks.push(BOLD_OFF);
                        if (order?.paymentMode === "UPI" && order?.upiTxnRef) {
                            dataChunks.push(encoder.encode("Txn Ref: " + order.upiTxnRef + "\n"));
                        }
                        dataChunks.push(ALIGN_LEFT);
                        dataChunks.push(encoder.encode("-".repeat(WIDTH) + "\n"));
                        dataChunks.push(LINE_FEED);
                    } catch (e) { console.log("UPI QR error", e); }
                }

                // Menu QR Code Print (Fast direct raster bitmap)
                if (business?.enableMenuQRInBill && business?.userId) {
                    try {
                        const menuUrl = (typeof window !== 'undefined' ? window.location.origin : "https://billing.kravy.in") + "/menu/" + business.userId;
                        dataChunks.push(ALIGN_CENTER);
                        dataChunks.push(BOLD_ON);
                        dataChunks.push(encoder.encode("RATE YOUR EXPERIENCE\n"));
                        dataChunks.push(BOLD_OFF);
                        dataChunks.push(LINE_FEED);
                        addFastRasterQr(menuUrl, 4);
                        dataChunks.push(LINE_FEED);
                    } catch (e) { console.log("QR error", e); }
                }
                
                dataChunks.push(ALIGN_CENTER);
                if (fullDateStr) {
                    dataChunks.push(encoder.encode(fullDateStr + "\n"));
                }
                dataChunks.push(BOLD_ON);
                dataChunks.push(encoder.encode("HARE KRISHNA\n"));
                dataChunks.push(BOLD_OFF);
                dataChunks.push(encoder.encode("Powered by Kravy POS\n"));
            }
        }
        
        dataChunks.push(new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A])); // Feeds
        dataChunks.push(PAPER_CUT);

        // Flatten chunks for optimized transmission
        const totalLength = dataChunks.reduce((acc, val) => acc + val.length, 0);
        const printData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of dataChunks) {
            printData.set(chunk, offset);
            offset += chunk.length;
        }

        // High-Speed continuous streaming for Thermal POS Printers:
        // When writeWithoutResponse is available, stream in 240-512 byte packets without blocking queue.
        // Chrome prints fast because it writes directly to GATT buffer without queue overhead.
        const CHUNK_SIZE = isCapacitor ? (activeState.capCanWriteWithoutResponse ? Math.min(activeState.capMtu || 244, 244) : 64) : 244; 
        const CHUNK_DELAY = isCapacitor ? (activeState.capCanWriteWithoutResponse ? 0 : 5) : 0;

        for (let i = 0; i < printData.length; i += CHUNK_SIZE) {
            const slice = printData.slice(i, i + CHUNK_SIZE);
            if (isCapacitor) {
                const dataView = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
                if (activeState.capCanWriteWithoutResponse) {
                    try {
                        const hexVal = dataViewToHexString(dataView);
                        await BluetoothLe.writeWithoutResponse({
                            deviceId: activeState.capDevice.deviceId,
                            service: activeState.capService,
                            characteristic: activeState.capChar,
                            value: hexVal
                        });
                    } catch(e) {
                        await BleClient.write(activeState.capDevice.deviceId, activeState.capService, activeState.capChar, dataView);
                    }
                } else {
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

        return true;
    } catch (error: any) {
        console.error("Direct Web Print Error:", error);
        if (Capacitor.isNativePlatform()) {
            console.error("CAPACITOR BLE ERROR:", JSON.stringify(error));
        }
        throw new Error(error.message || "Failed to print over Bluetooth");
    }
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

const numToWords: any = (num) => {
    if (num === 0) return "Zero";
    const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const inWords = (n) => {
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
    return inWords(Math.round(num)) + " Rupees Only";
};

const padCenter: any = (str, w) => {
    if (str.length >= w) return str;
    const pad = Math.floor((w - str.length) / 2);
    return " ".repeat(pad) + str + " ".repeat(w - str.length - pad);
};

export function generateTextReceiptPreview(order: any, business: any, isKot: boolean = false) {
    try {
        const is80 = business?.printSettings?.paperWidth === '80mm';
        const WIDTH = is80 ? 48 : 32;
        let out = "";
        
        const pLR: any = (l, r, w = WIDTH) => {
            const len = l.length + r.length;
            if (len >= w) return l.substring(0, w - r.length - 1) + " " + r;
            return l + " ".repeat(w - len) + r;
        };

        if (isKot) {
        out += padCenter("K.O.T", WIDTH) + "\n";
        out += "-".repeat(WIDTH) + "\n";
        const tableStr = order?.tableName || "COUNTER";
        const kotNum = order?.kotNumbers?.[order?.kotNumbers?.length - 1] 
            || order?.tokenNumber 
            || order?.reservedTokenNumber 
            || order?.kotNumber 
            || (Array.isArray(order?.items) && order.items.find((i: any) => i?.kotNumber)?.kotNumber) 
            || (business?.lastTokenNumber ? String(business.lastTokenNumber) : "") 
            || "1";
        out += pLR("TABLE: " + tableStr, "KOT NO: " + kotNum, WIDTH) + "\n";
        
        const billNoStr = "Bill: " + (order?.billNumber || order?.orderNumber || "DRAFT");
        let timeStr = "";
        let fullDateStr = "";
        try { 
            const d = new Date();
            timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            fullDateStr = dPart + " " + timeStr;
        } catch(e){}
        out += pLR(billNoStr, timeStr, WIDTH) + "\n";
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
        }
        
        out += "-".repeat(WIDTH) + "\n";
        out += padCenter("END OF KOT", WIDTH) + "\n";
        out += padCenter(fullDateStr, WIDTH) + "\n";
    } else {
        out += padCenter((business?.businessName || business?.name || "KRAVY POS"), WIDTH) + "\n";
        
        if (business?.tagline) {
            const paragraphs = business.tagline.split('\n');
            paragraphs.forEach(p => {
                const tLines = wrapText(p, WIDTH, WIDTH);
                tLines.forEach(l => out += padCenter(l, WIDTH) + "\n");
            });
        }
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
        const phoneStr = business?.contactPersonPhone || business?.contactPhone || business?.businessPhone || business?.phone;
        if (phoneStr) out += padCenter("Mob: " + phoneStr, WIDTH) + "\n";
        if (business?.gstNumber) out += padCenter("GSTIN: " + business.gstNumber, WIDTH) + "\n";
        if (business?.fssaiNumber) out += padCenter("FSSAI: " + business.fssaiNumber, WIDTH) + "\n";
        
        out += "-".repeat(WIDTH) + "\n";
        out += padCenter(business?.gstNumber && order?.isTaxEnabled ? "TAX INVOICE" : "SALES RECEIPT", WIDTH) + "\n";
        out += "-".repeat(WIDTH) + "\n";
        
        const billNoStr = "Bill No: " + (order?.billNumber || order?.orderNumber || "DRAFT");
        const tokenRaw = (order?.tokenNumber || order?.kotNumbers?.[0] || "");
        const tokenStr = tokenRaw ? "Token: " + tokenRaw : "";
        out += pLR(billNoStr, tokenStr, WIDTH) + "\n";
        
        let dPart = "";
        let fullDateStr = "";
        try { 
            const d = order?.createdAt ? new Date(order.createdAt) : new Date();
            dPart = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dPartFull = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            fullDateStr = dPartFull + " " + timeStr;
        } catch(e){}
        const tableStr = "Table: " + (order?.tableName || "POS");
        out += pLR("Date: " + dPart, tableStr, WIDTH) + "\n";
        
        out += "-".repeat(WIDTH) + "\n";
        out += "Customer: " + (order?.customerName || "Walk-in Customer") + "\n";
        if (order?.customerPhone) out += "Phone: " + order.customerPhone + "\n";
        if (order?.customerAddress) out += "Addr: " + order.customerAddress + "\n";
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
            
            let variants = [];
            if (item.variant) variants.push(item.variant);
            if (item.foodType) variants.push(item.foodType);
            if (item.variants && Array.isArray(item.variants)) {
                item.variants.forEach((v: any) => variants.push(v.name || v));
            }
            if (variants.length > 0) {
                const varLines = wrapText(variants.join(" + "), maxNameWidth, maxNameWidth);
                varLines.forEach((l: string) => out += l + "\n");
            }

            const taxActive = (order?.tax || 0) > 0 || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
            let qtyStr = `${qty} x ${price.toFixed(2)}`;
            if (taxActive && item.gst !== undefined && item.gst !== null && Number(item.gst) > 0) {
                qtyStr += ` | GST ${item.gst}%`;
            }
            out += pLR(qtyStr, tot, WIDTH) + "\n";
            out += "\n";
        }
        out += "-".repeat(WIDTH) + "\n";
        
        const discount = order?.discountAmount || order?.discountAmt || order?.discount || 0;
        const tax = order?.tax || order?.gstAmount || order?.gst || 0;
        const total = order?.total || order?.finalTotal || (subtotal - discount + tax);
        const taxActive = (tax > 0) || (order?.deliveryGst || 0) > 0 || (order?.packagingGst || 0) > 0 || (items.some((it: any) => it.gst !== undefined && it.gst !== null && Number(it.gst) > 0));
        
        out += pLR("Subtotal", subtotal.toFixed(2), WIDTH) + "\n";
        if (discount > 0) out += pLR("Discount", "-" + discount.toFixed(2), WIDTH) + "\n";
        
        const delivery = order?.deliveryCharges || 0;
        if (delivery > 0) out += pLR("Delivery Charge", "+" + delivery.toFixed(2), WIDTH) + "\n";
        const packaging = order?.packagingCharges || 0;
        if (packaging > 0) out += pLR("Packaging", "+" + packaging.toFixed(2), WIDTH) + "\n";
        const service = order?.serviceCharge || 0;
        const serviceLabel = order?.serviceChargeName || business?.serviceChargeName || "Service Charge";
        if (service > 0) out += pLR(serviceLabel, "+" + service.toFixed(2), WIDTH) + "\n";
        
        if (taxActive) {
            const taxBreakup = calculateTaxBreakup(order, business);
            const totalTaxable = taxBreakup.reduce((a: any, b: any) => a + b.taxable, 0);
            if (totalTaxable > 0) {
                out += pLR("Taxable Amt", totalTaxable.toFixed(2), WIDTH) + "\n";
            }
            let hasBreakupPrinted = false;
            for (const t of taxBreakup) {
                if (t.cgst > 0 || t.sgst > 0) {
                    hasBreakupPrinted = true;
                    if (t.cgst > 0) out += pLR(`CGST (${t.rate/2}%)`, t.cgst.toFixed(2), WIDTH) + "\n";
                    if (t.sgst > 0) out += pLR(`SGST (${t.rate/2}%)`, t.sgst.toFixed(2), WIDTH) + "\n";
                } else if (t.igst > 0) {
                    hasBreakupPrinted = true;
                    out += pLR(`IGST (${t.rate}%)`, t.igst.toFixed(2), WIDTH) + "\n";
                }
            }
            if (!hasBreakupPrinted && tax > 0) {
                out += pLR("Tax/GST", "+" + tax.toFixed(2), WIDTH) + "\n";
            }
        } else if (tax > 0) {
            out += pLR("Tax/GST", "+" + tax.toFixed(2), WIDTH) + "\n";
        }
        
        out += "-".repeat(WIDTH) + "\n";
        out += pLR("GRAND TOTAL", `Rs.${total.toFixed(2)}`, WIDTH) + "\n";
        out += "-".repeat(WIDTH) + "\n";
        
        const amtWords = "Amount in Words: " + numToWords(total);
        const awLines = wrapText(amtWords, WIDTH, WIDTH);
        awLines.forEach((l: string) => out += l + "\n");
        
        out += "Payment Mode: " + (order?.paymentMode || "CASH") + "\n";
        out += "Status: " + (order?.paymentStatus || "Paid") + "\n";
        
        if (order?.paymentStatus === "PARTIAL" || (order?.balanceDue !== undefined && order.balanceDue > 0)) {
            const paid = order?.amountPaid || 0;
            const due = order?.balanceDue || 0;
            out += "-".repeat(WIDTH) + "\n";
            out += pLR("Amount Paid:", `Rs.${paid.toFixed(2)}`, WIDTH) + "\n";
            out += pLR("Balance Due:", `Rs.${due.toFixed(2)}`, WIDTH) + "\n";
        }
        out += "\n";

        const showUpiQr = (business?.upi && business?.upiQrEnabled !== false) || order?.paymentMode === "UPI";
        if (showUpiQr && business?.upi) {
            out += padCenter("SCAN & PAY", WIDTH) + "\n";
            out += padCenter("[ UPI QR CODE ]", WIDTH) + "\n";
            out += padCenter("UPI: " + business.upi, WIDTH) + "\n";
            if (order?.paymentMode === "UPI" && order?.upiTxnRef) {
                out += padCenter("Txn Ref: " + order.upiTxnRef, WIDTH) + "\n";
            }
            out += "\n";
        }
        
        if (business?.enableMenuQRInBill && business?.userId) {
            out += padCenter("RATE YOUR EXPERIENCE", WIDTH) + "\n";
            out += padCenter("[ QR CODE ]", WIDTH) + "\n";
        }
        
        if (fullDateStr) {
            out += padCenter(fullDateStr, WIDTH) + "\n";
        }
        out += padCenter("HARE KRISHNA", WIDTH) + "\n";
        out += padCenter("Powered by Kravy POS", WIDTH) + "\n";
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
        
        for (const s of slotsToDisconnect) {
            const { idKey } = getStorageKeys(s);
            if (clearSavedId && typeof localStorage !== 'undefined') {
                localStorage.removeItem(idKey);
                if (s === 'bill') localStorage.removeItem("LAST_CONNECTED_PRINTER_ID");
            }

            const state = printerSlots[s];
            const isCapacitor = Capacitor.isNativePlatform();
            if (isCapacitor) {
                if (state.capDevice) {
                    await BleClient.disconnect(state.capDevice.deviceId).catch(()=>{});
                    state.capDevice = null;
                    state.capChar = "";
                }
            } else {
                if (state.device && state.device.gatt?.connected) {
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

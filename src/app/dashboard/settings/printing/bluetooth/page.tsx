"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowLeft, Save, Printer, Eye, Settings, 
    Bluetooth, Image as ImageIcon, Type, Phone, MapPin, 
    Hash, User, Users, Percent, MessageSquare, QrCode,
    Receipt, ChefHat, Clock, FileText, Check, Zap,
    RefreshCw, Scissors, Sparkles, Sliders, Ticket
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";
import { 
    DEFAULT_BT_PRINT_SETTINGS, 
    BluetoothPrintSettings, 
    printReceiptData 
} from "@/lib/web-bluetooth";
import BluetoothThermalPreview from "@/components/printing/BluetoothThermalPreview";

export default function BluetoothPrintingSettingsPage() {
    const router = useRouter();
    const { profile, loading: profileLoading, invalidateCache, updateProfile } = useProfileCache();
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"configure" | "preview">("configure");
    const [sectionTab, setSectionTab] = useState<"bill" | "kot" | "sizing" | "hardware">("bill");
    const [previewMode, setPreviewMode] = useState<"bill" | "kot">("bill");
    const [previewGst, setPreviewGst] = useState(true);
    const [previewZoom, setPreviewZoom] = useState(0.95);
    const [isPrintingTest, setIsPrintingTest] = useState(false);
    const [testPrintType, setTestPrintType] = useState<"current" | "bill" | "kot">("current");

    // State for Bluetooth print settings
    const [settings, setSettings] = useState<BluetoothPrintSettings>(DEFAULT_BT_PRINT_SETTINGS);
    const [originalSettings, setOriginalSettings] = useState<BluetoothPrintSettings>(DEFAULT_BT_PRINT_SETTINGS);
    const [business, setBusiness] = useState<any>(null);
    const [upiId, setUpiId] = useState<string>("");
    const [originalUpiId, setOriginalUpiId] = useState<string>("");

    const receiptRef = useRef<HTMLDivElement>(null);
    const kotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (profile) {
            setBusiness(profile);
            const currentUpi = profile?.upi || "";
            setUpiId(currentUpi);
            setOriginalUpiId(currentUpi);
            const savedBt = profile?.btPrintSettings || profile?.printSettings?.bluetooth || {};
            const merged = {
                ...DEFAULT_BT_PRINT_SETTINGS,
                ...savedBt
            };
            setSettings(merged);
            setOriginalSettings(merged);
        }
    }, [profile]);

    const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings) || upiId !== originalUpiId;

    const toggle = (key: keyof BluetoothPrintSettings) => {
        kravy.click();
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const resetReceiptStyle = () => {
        kravy.success();
        setSettings(prev => ({
            ...prev,
            logoSize: DEFAULT_BT_PRINT_SETTINGS.logoSize,
            logoBottomSpace: DEFAULT_BT_PRINT_SETTINGS.logoBottomSpace,
            upiQrSize: DEFAULT_BT_PRINT_SETTINGS.upiQrSize,
            businessNameSize: DEFAULT_BT_PRINT_SETTINGS.businessNameSize,
            addressSize: DEFAULT_BT_PRINT_SETTINGS.addressSize,
            taglineSize: DEFAULT_BT_PRINT_SETTINGS.taglineSize,
            receiptTokenSize: DEFAULT_BT_PRINT_SETTINGS.receiptTokenSize,
            itemsFontSize: DEFAULT_BT_PRINT_SETTINGS.itemsFontSize,
            grandTotalFontSize: DEFAULT_BT_PRINT_SETTINGS.grandTotalFontSize,
            customerDetailsFontSize: DEFAULT_BT_PRINT_SETTINGS.customerDetailsFontSize,
            detailsFontSize: DEFAULT_BT_PRINT_SETTINGS.detailsFontSize,
            greetingsFooterSize: DEFAULT_BT_PRINT_SETTINGS.greetingsFooterSize,
            businessNameStyle: DEFAULT_BT_PRINT_SETTINGS.businessNameStyle,
            tokenStyle: DEFAULT_BT_PRINT_SETTINGS.tokenStyle,
            grandTotalStyle: DEFAULT_BT_PRINT_SETTINGS.grandTotalStyle
        }));
        toast.success("Receipt styling reset to defaults!");
    };

    const resetKotStyle = () => {
        kravy.success();
        setSettings(prev => ({
            ...prev,
            kotTokenSize: DEFAULT_BT_PRINT_SETTINGS.kotTokenSize,
            kotHeaderDetailsSize: DEFAULT_BT_PRINT_SETTINGS.kotHeaderDetailsSize,
            kotItemsFontSize: DEFAULT_BT_PRINT_SETTINGS.kotItemsFontSize,
            kotQuantityFontSize: DEFAULT_BT_PRINT_SETTINGS.kotQuantityFontSize,
            kotHeaderStyle: DEFAULT_BT_PRINT_SETTINGS.kotHeaderStyle,
            kotTokenStyle: DEFAULT_BT_PRINT_SETTINGS.kotTokenStyle
        }));
        toast.success("KOT styling reset to defaults!");
    };

    const resetAllToDefaults = () => {
        kravy.success();
        setSettings({
            ...DEFAULT_BT_PRINT_SETTINGS,
            paperWidth: settings.paperWidth || DEFAULT_BT_PRINT_SETTINGS.paperWidth
        });
        toast.success("All Bluetooth print styles reset to defaults!");
    };

    const handleSave = async () => {
        kravy.click();
        setSaving(true);
        try {
            const currentPrintSettings = profile?.printSettings || {};
            const updatedPrintSettings = {
                ...currentPrintSettings,
                bluetooth: settings
            };

            const trimmedUpi = upiId.trim();

            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: profile?.id,
                    upi: trimmedUpi || null,
                    upiQrEnabled: settings.showUpiQr !== false,
                    printSettings: updatedPrintSettings,
                    btPrintSettings: settings
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error || "Failed to save settings");
            }

            const updatedData = await res.json().catch(() => null);
            setOriginalSettings(settings);
            setOriginalUpiId(trimmedUpi);
            if (updatedData) {
                updateProfile(updatedData, false);
                setBusiness(updatedData);
            } else {
                setBusiness((prev: any) => ({ ...prev, upi: trimmedUpi }));
            }
            toast.success("Bluetooth print preferences & UPI ID saved!");
            kravy.success();
            if (invalidateCache) await invalidateCache();
        } catch (err: any) {
            console.error("Save error:", err);
            toast.error(err.message || "Failed to save settings");
            kravy.error();
        } finally {
            setSaving(false);
        }
    };

    // Construct printSettings that match USB template so PrintTemplates renders EXACT preview of user's BT settings
    const simulatedPrintSettings = {
        paperWidth: settings.paperWidth || "58mm",
        showLogo: settings.showLogo !== false,
        showTagline: settings.showTagline !== false,
        showContact: settings.showContact !== false,
        showAddress: settings.showAddress !== false,
        showGST: settings.showGST !== false,
        showFSSAI: settings.showFSSAI !== false,
        showBillTypeHeader: settings.showBillTypeHeader !== false,
        showInvoiceNumber: settings.showInvoiceNumber !== false,
        showToken: settings.showToken !== false,
        showTableInfo: settings.showTableInfo !== false,
        showCustomerDetails: settings.showCustomerDetails !== false,
        showCustomerPhone: settings.showCustomerPhone !== false,
        showCustomerAddress: settings.showCustomerAddress !== false,
        showFoodTypeSuffix: settings.showFoodTypeSuffix !== false,
        showVariants: settings.showVariants !== false,
        showSubtotal: settings.showSubtotal !== false,
        showDiscount: settings.showDiscount !== false,
        showDeliveryCharge: settings.showDeliveryCharge !== false,
        showPackagingCharge: settings.showPackagingCharge !== false,
        showServiceCharge: settings.showServiceCharge !== false,
        showTaxBreakup: settings.showTaxBreakup !== false,
        showGrandTotal: settings.showGrandTotal !== false,
        showAmountInWords: settings.showAmountInWords !== false,
        showPaymentMode: settings.showPaymentMode !== false,
        showPaymentStatus: settings.showPaymentStatus !== false,
        showBalanceDue: settings.showBalanceDue !== false,
        showUpiQr: settings.showUpiQr !== false,
        showMenuQr: settings.showMenuQr !== false,
        showGreetings: settings.showGreetings !== false,
        showPoweredBy: settings.showPoweredBy !== false,

        // KOT Toggles
        showKOTHeader: settings.showKOTHeader !== false,
        showKOTTable: settings.showKOTTable !== false,
        showKOTToken: settings.showKOTToken !== false,
        showKOTBillNo: settings.showKOTBillNo !== false,
        showKOTDateTime: settings.showKOTDateTime !== false,
        showKOTCustomer: settings.showKOTCustomer !== false,
        showKOTItemDivider: settings.showKOTItemDivider !== false,
        showKOTVariants: settings.showKOTVariants !== false,
        showKOTInstructions: settings.showKOTInstructions !== false,
        showKOTFooter: settings.showKOTFooter !== false,

        // Sizers
        logoHeight: settings.logoSize ?? 50,
        logoBottomMargin: settings.logoBottomSpace ?? 0,
        upiQrSize: settings.upiQrSize ?? 160,
        businessNameSize: settings.businessNameSize ?? 18,
        businessAddressSize: settings.addressSize ?? 11,
        taglineSize: settings.taglineSize ?? 11,
        receiptTokenSize: settings.receiptTokenSize ?? 28,
        detailsFontSize: settings.detailsFontSize ?? 10,
        customerDetailsFontSize: settings.customerDetailsFontSize ?? 10,
        itemsFontSize: settings.itemsFontSize ?? 11,
        totalFontSize: settings.grandTotalFontSize ?? 13,
        greetingFontSize: settings.greetingsFooterSize ?? 12,

        // KOT Sizers
        kotTokenSize: settings.kotTokenSize ?? 16,
        kotHeaderFontSize: settings.kotHeaderDetailsSize ?? 11,
        kotItemsFontSize: settings.kotItemsFontSize ?? 11,
        kotQtyFontSize: settings.kotQuantityFontSize ?? 14,

        bluetooth: settings
    };

    // Dummy props to feed into real PrintTemplates component
    const dummyProps = {
        receiptRef,
        kotRef,
        business: {
            ...business,
            upi: upiId || business?.upi,
            greetingMessage: settings.showGreetings !== false 
                ? (settings.customGreetingMessage?.trim() || business?.greetingMessage || "Thank You 🙏 Visit Again!") 
                : "",
            printSettings: simulatedPrintSettings,
            btPrintSettings: settings
        },
        billNumber: "INV-2024-001",
        billDate: new Date().toLocaleString('en-IN'),
        tokenNumber: "42",
        selectedTable: "Table 05",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        customerAddress: "Flat 101, Green Heights, Delhi",
        orderNotes: "Extra spicy, no onions please!",
        buyerGSTIN: previewGst ? "07AAAAA0000A1Z5" : null,
        placeOfSupply: previewGst ? "Delhi (07)" : null,
        items: [
            { name: "Paneer Butter Masala", qty: 2, rate: 250, gst: previewGst ? 5 : 0 },
            { name: "Butter Naan", qty: 4, rate: 40, gst: previewGst ? 5 : 0 },
            { name: "Cold Coffee", qty: 1, rate: 120, gst: previewGst ? 18 : 0 }
        ],
        subtotal: 780,
        discountAmt: 50,
        appliedOffer: { code: "WELCOME50" },
        taxActive: previewGst,
        perProductEnabled: previewGst,
        globalRate: 5,
        totalTaxable: 730,
        totalGst: previewGst ? 36.5 : 0,
        taxBreakup: previewGst ? [
            { rate: 5, taxable: 610, cgst: 15.25, sgst: 15.25, igst: 0 }, 
            { rate: 18, taxable: 120, cgst: 10.8, sgst: 10.8, igst: 0 }
        ] : [],
        deliveryCharge: 0,
        deliveryGst: 0,
        packagingCharge: 20,
        packagingGst: 1,
        serviceCharge: 0,
        finalTotal: 787.5,
        paymentMode: "UPI",
        paymentStatus: "PAID",
        upiTxnRef: "1234567890",
        qrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=test@upi",
        prevWalletBalance: null,
        selectedParty: null,
        kotNumbers: [101, 102],
        numberToWords: (num: number) => "Seven Hundred Eighty Seven Rupees Only"
    };

    const handleTestPrint = async (overrideMode?: "bill" | "kot") => {
        kravy.click();
        const modeToPrint = overrideMode || previewMode;
        setIsPrintingTest(true);
        try {
            const dummyOrder = {
                billNumber: "INV-2024-001",
                orderNumber: "ORD-101",
                createdAt: new Date().toISOString(),
                tableName: "Table 05",
                tokenNumber: "42",
                kotNumbers: [101, 102],
                customerName: "Rahul Sharma",
                customerPhone: "9876543210",
                customerAddress: "Flat 101, Green Heights, Delhi",
                isTaxEnabled: previewGst,
                items: [
                    { name: "Paneer Butter Masala", qty: 2, price: 250, foodType: "Veg", gst: 5, notes: "Extra spicy" },
                    { name: "Butter Naan", qty: 4, price: 40, foodType: "Veg", gst: 5 },
                    { name: "Cold Coffee", qty: 1, price: 120, foodType: "Beverage", gst: 18, variants: [{ name: "Less Sugar" }] }
                ],
                subtotal: 780,
                discountAmount: 50,
                tax: previewGst ? 36.5 : 0,
                total: previewGst ? 787.5 : 750,
                deliveryCharges: 0,
                packagingCharges: 20,
                serviceCharge: 0,
                paymentMode: "UPI",
                paymentStatus: "PAID",
                upiTxnRef: "1234567890",
                balanceDue: 0
            };

            const effectiveBusiness = {
                ...business,
                upi: upiId || business?.upi,
                btPrintSettings: settings,
                printSettings: {
                    ...(business?.printSettings || {}),
                    bluetooth: settings,
                    paperWidth: settings.paperWidth
                }
            };

            await printReceiptData(dummyOrder, effectiveBusiness, null, modeToPrint);
            toast.success(`Sent test ${modeToPrint.toUpperCase()} print over Bluetooth!`);
        } catch (err: any) {
            console.error("Test print error:", err);
            toast.error(err.message || "Bluetooth printer not connected. Please connect printer first.");
        } finally {
            setIsPrintingTest(false);
        }
    };

    const SettingToggle = ({ icon: Icon, label, sKey, desc, color = "bg-blue-600" }: any) => {
        const isChecked = settings[sKey as keyof BluetoothPrintSettings] !== false;
        return (
            <button 
                type="button"
                onClick={() => toggle(sKey as keyof BluetoothPrintSettings)}
                className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all text-left group cursor-pointer w-full ${
                    isChecked 
                    ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-xs" 
                    : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60"
                }`}
            >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isChecked 
                    ? `${color} text-white shadow-md shadow-current/20` 
                    : "bg-slate-200 dark:bg-white/5 text-slate-400"
                }`}>
                    <Icon size={16} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className={`text-xs sm:text-sm font-bold transition-all leading-tight truncate ${
                        isChecked ? "text-slate-900 dark:text-white" : "text-slate-400"
                    }`}>
                        {label}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium mt-0.5 truncate leading-tight">
                        {desc}
                    </p>
                </div>

                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                    isChecked 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                    : "bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-300"
                }`}>
                    {isChecked ? <Check size={12} strokeWidth={3.5} /> : null}
                </div>
            </button>
        );
    };

    const Sizer = ({ label, icon: Icon, sKey, min, max, descMap }: any) => {
        const rawVal = settings[sKey as keyof BluetoothPrintSettings];
        const value = rawVal !== undefined && rawVal !== null
            ? Number(rawVal) 
            : (DEFAULT_BT_PRINT_SETTINGS[sKey as keyof BluetoothPrintSettings] as number);

        const getLabel = (val: number) => {
            if (descMap) {
                const keys = Object.keys(descMap).map(Number).sort((a,b) => a-b);
                for (let i = keys.length - 1; i >= 0; i--) {
                    if (val >= keys[i]) return descMap[keys[i]];
                }
            }
            return `${val}px`;
        };

        return (
            <div className="p-3.5 sm:p-4 md:p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider truncate">{label}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Range: {min}px - {max}px</p>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-xs font-black shrink-0">
                        {getLabel(value as number)}
                    </span>
                </div>
                
                <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    value={value as number} 
                    onChange={(e) => setSettings(prev => ({ ...prev, [sKey]: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
            </div>
        );
    };

    if (profileLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading Bluetooth Print Setup...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 sm:space-y-8 pb-28 kravy-page-fade max-w-7xl mx-auto px-1 sm:px-3">
            {/* Top Navigation & Tabs */}
            <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <button 
                            onClick={() => router.push("/dashboard/settings/printing")}
                            className="w-10 h-10 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                            title="Back to USB Printing"
                        >
                            <ArrowLeft size={18} className="text-slate-700 dark:text-white" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                    Wireless ESC/POS
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-[10px] font-bold text-slate-400">Settings</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                                <Bluetooth size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>Bluetooth Thermal Printing</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                        <button
                            type="button"
                            onClick={resetAllToDefaults}
                            className="h-10 px-3.5 sm:px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                            title="Reset all Bluetooth layout & font styles to standard defaults"
                        >
                            <RefreshCw size={13} className="text-slate-400" />
                            <span>Reset Style</span>
                        </button>

                        <Link
                            href="/dashboard/settings/connect-printer"
                            className="h-10 px-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100/60 dark:hover:bg-blue-500/20 transition-all shrink-0"
                        >
                            <Bluetooth size={14} />
                            <span>Pair Printer</span>
                        </Link>

                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="h-10 px-5 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                        >
                            <Save size={15} />
                            <span>{saving ? "Saving..." : "Save Preferences"}</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Header Mode Switcher: USB vs Bluetooth Thermal */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl max-w-xl">
                    <Link
                        href="/dashboard/settings/printing"
                        className="py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    >
                        <Printer size={15} />
                        <span>USB / Browser Print</span>
                    </Link>
                    <div
                        className="py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-xs flex items-center justify-center gap-2"
                    >
                        <Bluetooth size={15} />
                        <span>Bluetooth Setup (Active)</span>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="xl:hidden flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl gap-1 shadow-xs border border-slate-200/50 dark:border-white/5">
                <button
                    onClick={() => setActiveTab("configure")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "configure" 
                        ? 'bg-white dark:bg-white/10 shadow-xs text-blue-600 dark:text-blue-400' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                    }`}
                >
                    <Settings size={14} className="shrink-0" /> 
                    <span>Configure</span>
                </button>
                <button
                    onClick={() => setActiveTab("preview")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "preview" 
                        ? 'bg-white dark:bg-white/10 shadow-xs text-blue-600 dark:text-blue-400' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                    }`}
                >
                    <Eye size={14} className="shrink-0" /> 
                    <span>Live Preview</span>
                </button>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* ── LEFT CONFIGURATION PANEL ── */}
                <div className={`xl:col-span-8 space-y-6 ${activeTab === "preview" ? "hidden xl:block" : "block"}`}>
                    
                    {/* Section Selector Tabs: Bill, KOT, Sizing Sliders, Paper/Hardware */}
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl gap-1 border border-slate-200/50 dark:border-white/5 overflow-x-auto">
                        <button
                            onClick={() => {
                                kravy.click();
                                setSectionTab("bill");
                                setPreviewMode("bill");
                            }}
                            className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                sectionTab === "bill"
                                ? "bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                            }`}
                        >
                            <Receipt size={14} />
                            <span>Bill Toggles</span>
                        </button>

                        <button
                            onClick={() => {
                                kravy.click();
                                setSectionTab("kot");
                                setPreviewMode("kot");
                            }}
                            className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                sectionTab === "kot"
                                ? "bg-white dark:bg-white/10 shadow-sm text-orange-600 dark:text-orange-400"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                            }`}
                        >
                            <ChefHat size={14} />
                            <span>KOT Toggles</span>
                        </button>

                        <button
                            onClick={() => {
                                kravy.click();
                                setSectionTab("sizing");
                            }}
                            className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                sectionTab === "sizing"
                                ? "bg-white dark:bg-white/10 shadow-sm text-purple-600 dark:text-purple-400"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                            }`}
                        >
                            <Sliders size={14} />
                            <span>Element Sizing</span>
                        </button>

                        <button
                            onClick={() => {
                                kravy.click();
                                setSectionTab("hardware");
                            }}
                            className={`flex-1 min-w-[90px] py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                sectionTab === "hardware"
                                ? "bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400"
                                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                            }`}
                        >
                            <Printer size={14} />
                            <span>Paper & Cut</span>
                        </button>
                    </div>

                    {/* ════ BILL TOGGLE SECTION ════ */}
                    {sectionTab === "bill" && (
                        <div className="space-y-6">
                            {/* Business & Header */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                        <Receipt size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Store Identity & Header
                                        </h2>
                                        <p className="text-[11px] text-slate-400">Choose what prints in the header of the bill</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <SettingToggle icon={ImageIcon} label="Store Logo" sKey="showLogo" desc="Print monochrome thermal logo" color="bg-blue-600" />
                                    <SettingToggle icon={Type} label="Business Name" sKey="showBusinessName" desc="Restaurant/Shop title" color="bg-blue-600" />
                                    <SettingToggle icon={MessageSquare} label="Tagline" sKey="showTagline" desc="Sub-heading or slogan" color="bg-blue-600" />
                                    <SettingToggle icon={MapPin} label="Full Address" sKey="showAddress" desc="City, state, and pin code" color="bg-blue-600" />
                                    <SettingToggle icon={Phone} label="Contact Phone" sKey="showContact" desc="Store contact phone number" color="bg-blue-600" />
                                    <SettingToggle icon={FileText} label="GSTIN Number" sKey="showGST" desc="Government tax ID" color="bg-blue-600" />
                                    <SettingToggle icon={FileText} label="FSSAI Number" sKey="showFSSAI" desc="Food safety license ID" color="bg-blue-600" />
                                    <SettingToggle icon={FileText} label="TAX INVOICE / Header Title" sKey="showBillTypeHeader" desc="Show 'TAX INVOICE' / 'SALES RECEIPT' title" color="bg-blue-600" />
                                </div>
                            </div>

                            {/* Order & Customer Details */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Order & Customer Info
                                        </h2>
                                        <p className="text-[11px] text-slate-400">Customer details, token, bill number, table</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <SettingToggle icon={Hash} label="Bill / Invoice No" sKey="showInvoiceNumber" desc="Invoice or order number" color="bg-emerald-600" />
                                    <SettingToggle icon={Zap} label="Token Number" sKey="showToken" desc="Order pickup token" color="bg-emerald-600" />
                                    <SettingToggle icon={Ticket} label="Print Token Ticket" sKey="printTokenTicket" desc="Show separate Token Ticket print button" color="bg-emerald-600" />
                                    <SettingToggle icon={Clock} label="Date & Time" sKey="showDate" desc="Timestamp of invoice" color="bg-emerald-600" />
                                    <SettingToggle icon={Users} label="Table Name / Info" sKey="showTableInfo" desc="Dining table identifier" color="bg-emerald-600" />
                                    <SettingToggle icon={User} label="Customer Name" sKey="showCustomerDetails" desc="Buyer / Walk-in name" color="bg-emerald-600" />
                                    <SettingToggle icon={Phone} label="Customer Phone" sKey="showCustomerPhone" desc="Mobile number" color="bg-emerald-600" />
                                    <SettingToggle icon={MapPin} label="Customer Address" sKey="showCustomerAddress" desc="Delivery address" color="bg-emerald-600" />
                                </div>
                            </div>

                            {/* Pricing & Taxes */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                        <Percent size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Items, Charges & GST Breakup
                                        </h2>
                                        <p className="text-[11px] text-slate-400">Subtotal, discounts, packaging, tax breakdown</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <SettingToggle icon={Type} label="Food Type / Suffix" sKey="showFoodTypeSuffix" desc="Veg/Non-Veg tag" color="bg-purple-600" />
                                    <SettingToggle icon={Type} label="Variants & Modifiers" sKey="showVariants" desc="Portion size / addons" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="Subtotal" sKey="showSubtotal" desc="Sum of item amounts" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="Discount" sKey="showDiscount" desc="Applied coupon / flat off" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="Delivery Charge" sKey="showDeliveryCharge" desc="Home delivery fee" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="Packaging Charge" sKey="showPackagingCharge" desc="Takeaway packing fee" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="Service Charge" sKey="showServiceCharge" desc="Restaurant service charge" color="bg-purple-600" />
                                    <SettingToggle icon={Percent} label="GST Tax Breakup" sKey="showTaxBreakup" desc="CGST, SGST, IGST breakdown" color="bg-purple-600" />
                                    <SettingToggle icon={Zap} label="Grand Total (Highlight)" sKey="showGrandTotal" desc="Bold final amount" color="bg-purple-600" />
                                    <SettingToggle icon={Type} label="Amount in Words" sKey="showAmountInWords" desc="Spelled out rupees" color="bg-purple-600" />
                                    <SettingToggle icon={Check} label="Payment Mode & Status" sKey="showPaymentMode" desc="Cash / UPI / Card status" color="bg-purple-600" />
                                    <SettingToggle icon={Hash} label="Balance Due" sKey="showBalanceDue" desc="For credit / partial payments" color="bg-purple-600" />
                                </div>
                            </div>

                            {/* Footer & QR Codes */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                        <QrCode size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            QR Codes & Receipt Footer
                                        </h2>
                                        <p className="text-[11px] text-slate-400">UPI Scan & Pay, Menu QR, greeting messages</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <SettingToggle icon={QrCode} label="Dynamic UPI QR" sKey="showUpiQr" desc="Scan & Pay exact bill total" color="bg-amber-600" />
                                    <SettingToggle icon={QrCode} label="Menu / Review QR" sKey="showMenuQr" desc="Rate experience & digital menu" color="bg-amber-600" />
                                    <SettingToggle 
                                        icon={Sparkles} 
                                        label={settings.customGreetingMessage?.trim() || business?.greetingMessage?.trim() || "Hare Krishna Greeting"} 
                                        sKey="showGreetings" 
                                        desc="Blessing / Footer greeting line" 
                                        color="bg-amber-600" 
                                    />
                                    <SettingToggle icon={Receipt} label="Powered by Kravy POS" sKey="showPoweredBy" desc="Software branding line" color="bg-amber-600" />
                                </div>

                                {/* UPI Payment ID Configuration Card */}
                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3 mt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <QrCode size={15} className="text-blue-600" />
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                                UPI Payment ID (VPA)
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {settings.showUpiQr === false && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        kravy.click();
                                                        setSettings(prev => ({ ...prev, showUpiQr: true }));
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                                                >
                                                    Enable QR
                                                </button>
                                            )}
                                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                                                Instant Preview Sync
                                            </span>
                                        </div>
                                    </div>
                                    {settings.showUpiQr === false && (
                                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center justify-between gap-2">
                                            <span>Dynamic UPI QR toggle is currently <strong>OFF</strong>. Turn it on to display the QR in bills & preview.</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    kravy.success();
                                                    setSettings(prev => ({ ...prev, showUpiQr: true }));
                                                }}
                                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shrink-0 text-[10px] cursor-pointer"
                                            >
                                                Turn ON
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={upiId}
                                                placeholder="e.g. yourname@okaxis, merchant@paytm"
                                                onChange={(e) => {
                                                    const val = e.target.value.trim().toLowerCase();
                                                    setUpiId(val);
                                                    setBusiness((prev: any) => ({ ...prev, upi: val }));
                                                    if (settings.showUpiQr === false) {
                                                        setSettings(prev => ({ ...prev, showUpiQr: true }));
                                                    }
                                                }}
                                                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 placeholder:font-sans"
                                            />
                                            {upiId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUpiId("");
                                                        setBusiness((prev: any) => ({ ...prev, upi: "" }));
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-rose-500 px-1.5 py-0.5 rounded cursor-pointer"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-sm shadow-blue-600/30 cursor-pointer"
                                        >
                                            <Save size={13} />
                                            <span>{saving ? "Saving..." : "Save UPI"}</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        All customer payments through the printed thermal QR code will be directly credited to this UPI ID.
                                    </p>
                                </div>

                                {/* Custom Greeting Text Input */}
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2 mt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={15} className="text-amber-600" />
                                            <label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                                Custom Greeting / Footer Text
                                            </label>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold">Printed above Powered by</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={settings.customGreetingMessage ?? business?.greetingMessage ?? ""}
                                            placeholder="e.g. THANK YOU 🙏 VISIT AGAIN or HARE KRISHNA"
                                            onChange={(e) => setSettings(prev => ({ ...prev, customGreetingMessage: e.target.value }))}
                                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-slate-400"
                                        />
                                        {(settings.customGreetingMessage || business?.greetingMessage) && (
                                            <button
                                                type="button"
                                                onClick={() => setSettings(prev => ({ ...prev, customGreetingMessage: "HARE KRISHNA" }))}
                                                className="px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-100/50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap"
                                                title="Reset to Hare Krishna"
                                            >
                                                Default
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        Type any custom greeting or message to print at the bottom of thermal receipts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════ KOT SECTION ════ */}
                    {sectionTab === "kot" && (
                        <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3 justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                        <ChefHat size={16} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Kitchen Order Ticket (K.O.T) Customizer
                                        </h2>
                                        <p className="text-[11px] text-slate-400">Select what is printed for your kitchen & cook staff</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTestPrint("kot")}
                                    disabled={isPrintingTest}
                                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black tracking-wider uppercase flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                                >
                                    <Printer size={13} />
                                    <span>{isPrintingTest ? "Printing..." : "Print KOT Test"}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <SettingToggle icon={ChefHat} label="K.O.T Header" sKey="showKOTHeader" desc="Title at the top" color="bg-orange-600" />
                                <SettingToggle icon={Users} label="Table Name / Counter" sKey="showKOTTable" desc="Table or pickup counter" color="bg-orange-600" />
                                <SettingToggle icon={Hash} label="KOT / Token Number" sKey="showKOTToken" desc="Order queue number" color="bg-orange-600" />
                                <SettingToggle icon={FileText} label="Bill Number on KOT" sKey="showKOTBillNo" desc="Linked invoice reference" color="bg-orange-600" />
                                <SettingToggle icon={Clock} label="KOT Date & Time" sKey="showKOTDateTime" desc="Exact preparation order time" color="bg-orange-600" />
                                <SettingToggle icon={User} label="Customer Name & Phone" sKey="showKOTCustomer" desc="Beneficial for takeaway orders" color="bg-orange-600" />
                                <SettingToggle icon={Type} label="Item Variants" sKey="showKOTVariants" desc="Portion sizes and choices" color="bg-orange-600" />
                                <SettingToggle icon={MessageSquare} label="Cooking Instructions / Notes" sKey="showKOTInstructions" desc="e.g. Extra spicy, no onion" color="bg-orange-600" />
                                <SettingToggle icon={FileText} label="Dotted Item Divider" sKey="showKOTItemDivider" desc="Lines between each food item" color="bg-orange-600" />
                                <SettingToggle icon={Check} label="End of KOT Footer" sKey="showKOTFooter" desc="Clear boundary line at bottom" color="bg-orange-600" />
                            </div>
                        </div>
                    )}

                    {/* ════ ELEMENT SIZING SLIDERS SECTION (Exact match to USB page) ════ */}
                    {sectionTab === "sizing" && (
                        <div className="space-y-6">
                            {/* Receipt Element Sizing */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-1">
                                    <Hash size={14} className="text-slate-400" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Receipt Element Sizing (Thermal Safe Constrained)
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Sizer label="Logo Size / Height" icon={ImageIcon} sKey="logoSize" min={20} max={90} descMap={{ 20: "20mm (Small)", 50: "50mm (Large)", 80: "80mm (Huge)" }} />
                                    <Sizer label="Logo Bottom Space" icon={ImageIcon} sKey="logoBottomSpace" min={-20} max={20} descMap={{ [-10]: "Tighter", 0: "0 (Default)", 10: "Spaced" }} />
                                    <Sizer label="UPI QR Code Size" icon={QrCode} sKey="upiQrSize" min={100} max={300} descMap={{ 100: "100px (Compact)", 160: "160px (Standard)", 220: "220px (Large)", 280: "280px (Giant)" }} />
                                    <Sizer label="Business Name Font Size" icon={Type} sKey="businessNameSize" min={14} max={50} descMap={{ 14: "Compact", 18: "Medium", 24: "Large", 32: "Extra Large", 42: "Huge (3x)" }} />
                                    <Sizer label="Address Font Size" icon={MapPin} sKey="addressSize" min={8} max={18} descMap={{ 8: "Tiny", 11: "Standard", 14: "Large" }} />
                                    <Sizer label="Tagline Font Size" icon={Type} sKey="taglineSize" min={8} max={16} descMap={{ 8: "Tiny", 11: "Standard", 13: "Large" }} />
                                    <Sizer label="Receipt Token Size" icon={Clock} sKey="receiptTokenSize" min={18} max={50} descMap={{ 18: "Small", 24: "Double Height", 32: "Double Size", 42: "Huge Standout" }} />
                                    <Sizer label="Items List Font Size" icon={Receipt} sKey="itemsFontSize" min={9} max={22} descMap={{ 9: "Compact", 11: "Standard", 15: "Bold", 18: "Large" }} />
                                    <Sizer label="Grand Total Font Size" icon={Receipt} sKey="grandTotalFontSize" min={11} max={36} descMap={{ 11: "Compact", 13: "Standard Highlight", 18: "Bold Standout", 24: "Double Size", 32: "Giant" }} />
                                    <Sizer label="Customer Details Size" icon={User} sKey="customerDetailsFontSize" min={8} max={24} descMap={{ 8: "Compact", 10: "Standard", 14: "Prominent" }} />
                                    <Sizer label="Details & Metadata Size" icon={FileText} sKey="detailsFontSize" min={8} max={16} descMap={{ 8: "Compact", 10: "Standard", 12: "Large" }} />
                                    <Sizer label="Greetings Footer Size" icon={MessageSquare} sKey="greetingsFooterSize" min={9} max={26} descMap={{ 9: "Compact", 12: "Standard", 16: "Large", 22: "Giant" }} />
                                </div>
                            </div>

                            {/* Kitchen Slip (KOT) Element Sizing */}
                            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-2 px-1">
                                    <ChefHat size={14} className="text-orange-500" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Kitchen Slip (KOT) Element Sizing
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Sizer label="KOT Token Size" icon={Clock} sKey="kotTokenSize" min={12} max={28} descMap={{ 12: "Compact", 16: "Standard", 24: "Large" }} />
                                    <Sizer label="KOT Header Details Size" icon={FileText} sKey="kotHeaderDetailsSize" min={8} max={32} descMap={{ 8: "Compact", 11: "Standard", 16: "Large" }} />
                                    <Sizer label="KOT Items Font Size" icon={ChefHat} sKey="kotItemsFontSize" min={9} max={40} descMap={{ 9: "Compact", 11: "Standard Mono", 18: "Large" }} />
                                    <Sizer label="KOT Quantity Font Size" icon={ChefHat} sKey="kotQuantityFontSize" min={10} max={40} descMap={{ 10: "Standard", 14: "Bold Standout", 20: "Huge" }} />
                                </div>
                            </div>

                            {/* Reset Styling Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    * Reset typography sizing to Bluetooth thermal standard defaults.
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={resetReceiptStyle}
                                        className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        <RefreshCw size={12} className="text-slate-400" />
                                        <span>Reset Receipt Styling</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetKotStyle}
                                        className="h-9 px-3.5 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/10 text-[11px] font-black text-orange-600 dark:text-orange-400 hover:bg-orange-100/60 dark:hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        <RefreshCw size={12} className="text-orange-500" />
                                        <span>Reset KOT Styling</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════ PAPER & HARDWARE SECTION ════ */}
                    {sectionTab === "hardware" && (
                        <div className="space-y-6">
                            {/* Paper Width (2 inch vs 3 inch) */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                    <Printer size={16} className="text-blue-600" />
                                    <span>Thermal Paper Roll Size</span>
                                </h3>
                                <p className="text-[11px] text-slate-400">Choose 2-inch (58mm) or 3-inch (80mm) depending on your Bluetooth printer roll</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setSettings(p => ({ ...p, paperWidth: "58mm" }))}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            settings.paperWidth !== "80mm"
                                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/10 shadow-xs ring-2 ring-blue-600/20"
                                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                2-Inch (58mm)
                                            </span>
                                            {settings.paperWidth !== "80mm" && <Check size={16} className="text-blue-600" />}
                                        </div>
                                        <p className="text-[11px] text-slate-400">Standard compact portable Bluetooth printer.</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSettings(p => ({ ...p, paperWidth: "80mm" }))}
                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                            settings.paperWidth === "80mm"
                                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/10 shadow-xs ring-2 ring-blue-600/20"
                                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                3-Inch (80mm)
                                            </span>
                                            {settings.paperWidth === "80mm" && <Check size={16} className="text-blue-600" />}
                                        </div>
                                        <p className="text-[11px] text-slate-400">Wider receipt format for restaurants & counters.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Feed Lines & Cutter */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                                    <Scissors size={16} className="text-indigo-600" />
                                    <span>Paper Feed & Cutter</span>
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-slate-800 dark:text-white">Bottom Feed Lines:</span>
                                            <span className="text-blue-600">{settings.bottomFeeds || 4} lines</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={1}
                                            max={8}
                                            value={settings.bottomFeeds || 4}
                                            onChange={(e) => setSettings(p => ({ ...p, bottomFeeds: Number(e.target.value) }))}
                                            className="w-full accent-blue-600"
                                        />
                                        <p className="text-[10px] text-slate-400">Extra blank paper lines at bottom to easily tear the bill from the manual serrated edge.</p>
                                    </div>

                                    <div className="pt-2">
                                        <SettingToggle 
                                            icon={Scissors} 
                                            label="Send Paper Auto-Cut Command" 
                                            sKey="cutPaper" 
                                            desc="For printers with built-in electronic cutter" 
                                            color="bg-slate-700" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT LIVE REALISTIC THERMAL PREVIEW PANEL (With Floating Control Pill Dock) ── */}
                <div className={`xl:col-span-4 xl:sticky xl:top-24 h-[calc(100vh-220px)] xl:h-[calc(100vh-140px)] w-full relative flex flex-col ${activeTab === 'preview' ? 'flex' : 'hidden xl:flex'}`}>
                    
                    {/* Sleek Vertical Floating Controller Dock (Matching user's attached screenshot) */}
                    <div className="absolute xl:-left-16 xl:right-auto right-4 top-4 xl:top-8 flex xl:flex-col flex-row gap-2.5 z-30 select-none bg-slate-900/95 dark:bg-zinc-950/95 backdrop-blur-md border border-slate-800 dark:border-zinc-800/80 rounded-[1.25rem] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        {/* Bill / KOT Preview Mode Switcher */}
                        <button 
                            type="button"
                            onClick={() => {
                                kravy.click();
                                setPreviewMode(previewMode === "bill" ? "kot" : "bill");
                            }} 
                            className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center border font-black transition-all active:scale-90 outline-none cursor-pointer ${
                                previewMode === "kot" 
                                ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/30' 
                                : 'bg-slate-800 dark:bg-zinc-900 border-slate-700 dark:border-zinc-800 text-blue-400'
                            }`}
                            title="Toggle Bill / KOT Preview"
                        >
                            <span className="leading-none text-[8px] uppercase">{previewMode === "kot" ? "KOT" : "BILL"}</span>
                            <span className="text-[6px] font-bold opacity-80 mt-0.5">{previewMode === "kot" ? "VIEW" : "VIEW"}</span>
                        </button>

                        {/* GST / Non-GST Switcher */}
                        <button 
                            type="button"
                            onClick={() => {
                                kravy.click();
                                setPreviewGst(!previewGst);
                            }} 
                            className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center border font-black transition-all active:scale-90 outline-none cursor-pointer ${
                                previewGst 
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30' 
                                : 'bg-slate-800 dark:bg-zinc-900 border-slate-700 dark:border-zinc-800 text-slate-400'
                            }`}
                            title="Toggle GST / Non-GST Mode"
                        >
                            <span className="leading-none text-[8px] uppercase">GST</span>
                            <span className="text-[6px] font-bold opacity-80 mt-0.5">{previewGst ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Paper Width 58mm (2") / 80mm (3") Switcher */}
                        <button 
                            type="button"
                            onClick={() => {
                                kravy.click();
                                setSettings((p) => ({ ...p, paperWidth: settings.paperWidth === '80mm' ? '58mm' : '80mm' }));
                            }} 
                            className="w-9 h-9 rounded-xl flex flex-col items-center justify-center border font-black transition-all active:scale-90 outline-none bg-slate-800 dark:bg-zinc-900 border-slate-700 dark:border-zinc-800 text-slate-300 hover:text-white cursor-pointer"
                            title="Toggle Paper Width (2 inch / 3 inch)"
                        >
                            <span className="leading-none text-[8px] uppercase">SIZE</span>
                            <span className="text-[7px] font-bold mt-0.5">{settings.paperWidth === '80mm' ? '3"' : '2"'}</span>
                        </button>

                        {/* Separator line */}
                        <div className="xl:w-full xl:h-[1px] w-[1px] h-6 bg-slate-800 dark:bg-zinc-800 my-0.5" />

                        {/* Zoom In */}
                        <button
                            type="button"
                            onClick={() => setPreviewZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))))}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-300 flex items-center justify-center font-bold text-sm transition-all active:scale-90 outline-none cursor-pointer"
                            title="Zoom In"
                        >
                            +
                        </button>
                        
                        {/* Percentage Indicator */}
                        <span className="text-[8px] font-black text-slate-400 select-none py-0.5 xl:block hidden text-center">
                            {Math.round(previewZoom * 100)}%
                        </span>

                        {/* Zoom Out */}
                        <button
                            type="button"
                            onClick={() => setPreviewZoom(z => Math.max(0.5, Number((z - 0.05).toFixed(2))))}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-300 flex items-center justify-center font-bold text-sm transition-all active:scale-90 outline-none cursor-pointer"
                            title="Zoom Out"
                        >
                            -
                        </button>

                        {/* Reset Zoom */}
                        <button
                            type="button"
                            onClick={() => setPreviewZoom(0.95)}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all active:scale-90 outline-none cursor-pointer"
                            title="Reset Zoom"
                        >
                            <RefreshCw size={11} />
                        </button>
                    </div>

                    {/* Realistic Thermal Printer Mockup */}
                    <div className="bg-slate-950 dark:bg-black rounded-[2.5rem] border border-slate-800 dark:border-zinc-800/80 shadow-2xl flex-1 flex flex-col relative overflow-hidden">
                        
                        {/* Metallic Dispenser Top-Bezel */}
                        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-10 select-none relative h-12 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                                <span className="text-[9px] font-black tracking-[0.2em] text-slate-200 uppercase">BLUETOOTH ON-LINE</span>
                            </div>
                            
                            {/* Realistic metallic dispenser cut slot */}
                            <div className="w-16 h-1 bg-slate-800 rounded-full border border-slate-700 shadow-inner opacity-60" />
                            
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTestPrint(previewMode)}
                                    disabled={isPrintingTest}
                                    className={`px-2 sm:px-2.5 py-0.5 rounded text-white text-[8px] font-black tracking-wider uppercase flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs transition-colors ${
                                        previewMode === "kot" 
                                            ? "bg-orange-600 hover:bg-orange-500" 
                                            : "bg-blue-600 hover:bg-blue-500"
                                    }`}
                                    title={previewMode === "kot" ? "Print Test KOT to Bluetooth printer" : "Print Test Bill to Bluetooth printer"}
                                >
                                    <Printer size={10} />
                                    <span>{isPrintingTest ? "Printing..." : previewMode === "kot" ? "Test KOT" : "Test Bill"}</span>
                                </button>
                                {previewMode !== "kot" && (
                                    <button
                                        type="button"
                                        onClick={() => handleTestPrint("kot")}
                                        disabled={isPrintingTest}
                                        className="px-2 py-0.5 rounded bg-orange-600/90 hover:bg-orange-500 text-white text-[8px] font-black tracking-wider uppercase flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                                        title="Print Test KOT to Bluetooth printer"
                                    >
                                        <ChefHat size={9} />
                                        <span>KOT Test</span>
                                    </button>
                                )}
                                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] font-black tracking-wider text-slate-400 uppercase">
                                    {settings.paperWidth === '80mm' ? '80MM / 3"' : '58MM / 2"'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Feed Dispenser Cut slot */}
                        <div className="h-1 bg-black border-b border-slate-900 relative z-10 shadow-[inset_0_2px_4px_rgba(0,0,0,1)] shrink-0" />

                        {/* Interactive Paper Tray Area */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-12 px-4 flex flex-col items-center scrollbar-none overscroll-contain touch-pan-y">
                            
                            {/* PREVIEW WRAPPER */}
                            <div 
                                className={`flex flex-col w-full transition-all duration-300 relative ${
                                    settings.paperWidth === '80mm' ? 'max-w-[340px]' : 'max-w-[270px]'
                                }`}
                            >
                                <div className="w-full origin-top transition-transform duration-200" style={{ transform: `scale(${previewZoom})` }}>
                                   <BluetoothThermalPreview 
                                       settings={settings} 
                                       business={{ ...business, upi: upiId || business?.upi }} 
                                       previewMode={previewMode} 
                                       previewGst={previewGst} 
                                   />
                                   
                                   {/* Advanced Receipt Mockup Jagged Thermal Paper Edge */}
                                   <style dangerouslySetInnerHTML={{ __html: `
                                        .hidden-print .receipt, .hidden-print .kot { 
                                            display: block !important; 
                                            width: 100% !important;
                                            background-color: #fafbf9 !important;
                                            color: #111413 !important;
                                            box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.35), 0 10px 15px -6px rgba(0, 0, 0, 0.25) !important;
                                            padding: 24px 16px !important;
                                            margin-bottom: 40px !important;
                                            position: relative !important;
                                            border: none !important;
                                            clip-path: polygon(
                                              0% 4px, 2% 0px, 4% 4px, 6% 0px, 8% 4px, 10% 0px, 12% 4px, 14% 0px, 16% 4px, 18% 0px, 20% 4px, 22% 0px, 24% 4px, 26% 0px, 28% 4px, 30% 0px, 32% 4px, 34% 0px, 36% 4px, 38% 0px, 40% 4px, 42% 0px, 44% 4px, 46% 0px, 48% 4px, 50% 0px, 52% 4px, 54% 0px, 56% 4px, 58% 0px, 60% 4px, 62% 0px, 64% 4px, 66% 0px, 68% 4px, 70% 0px, 72% 4px, 74% 0px, 76% 4px, 78% 0px, 80% 4px, 82% 0px, 84% 4px, 86% 0px, 88% 4px, 90% 0px, 92% 4px, 94% 0px, 96% 4px, 98% 0px, 100% 4px,
                                              100% calc(100% - 4px), 98% 100%, 96% calc(100% - 4px), 94% 100%, 92% calc(100% - 4px), 90% 100%, 88% calc(100% - 4px), 86% 100%, 84% calc(100% - 4px), 82% 100%, 80% calc(100% - 4px), 78% 100%, 76% calc(100% - 4px), 74% 100%, 72% calc(100% - 4px), 70% 100%, 68% calc(100% - 4px), 66% 100%, 64% calc(100% - 4px), 62% 100%, 60% calc(100% - 4px), 58% 100%, 56% calc(100% - 4px), 55% 100%, 52% calc(100% - 4px), 50% 100%, 48% calc(100% - 4px), 46% 100%, 44% calc(100% - 4px), 42% 100%, 40% calc(100% - 4px), 38% 100%, 36% calc(100% - 4px), 34% 100%, 32% calc(100% - 4px), 30% 100%, 28% calc(100% - 4px), 26% 100%, 24% calc(100% - 4px), 22% 100%, 20% calc(100% - 4px), 19% 100%, 18% calc(100% - 4px), 16% 100%, 14% calc(100% - 4px), 13% 100%, 12% calc(100% - 4px), 10% 100%, 8% calc(100% - 4px), 6% 100%, 4% calc(100% - 4px), 2% 100%, 0% calc(100% - 4px)
                                            ) !important;
                                        }
                                        .hidden-print .receipt::before, .hidden-print .kot::before {
                                            content: '';
                                            position: absolute;
                                            top: 0;
                                            left: 0;
                                            right: 0;
                                            height: 4px;
                                            background: linear-gradient(to bottom, rgba(0,0,0,0.03), transparent);
                                            pointer-events: none;
                                        }
                                   `}} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Save Button at Bottom */}
            <AnimatePresence>
                <motion.button
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 rounded-full flex items-center gap-2 sm:gap-3 border transition-all select-none group ${
                        isDirty
                        ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_10px_35px_rgba(37,99,235,0.4)] border-blue-500/30 hover:scale-105 active:scale-95 cursor-pointer"
                        : "bg-slate-900/90 dark:bg-zinc-950/90 backdrop-blur-md text-emerald-400 border-emerald-500/20 shadow-lg hover:scale-102 cursor-default"
                    } disabled:opacity-50`}
                >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
                        isDirty 
                        ? "bg-white/10 group-hover:rotate-12" 
                        : "bg-emerald-500/10"
                    }`}>
                        {isDirty ? (
                            <Save size={13} className="text-white" />
                        ) : (
                            <Check size={13} className="text-emerald-400" />
                        )}
                    </div>
                    <span className="font-black uppercase tracking-wider text-[10px] sm:text-xs whitespace-nowrap">
                        {saving 
                            ? "Saving..." 
                            : isDirty 
                                ? "Save Preferences" 
                                : "Preferences Saved"
                        }
                    </span>
                    
                    {isDirty && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
                        </span>
                    )}
                </motion.button>
            </AnimatePresence>
        </div>
    );
}

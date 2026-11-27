"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowLeft, Save, Printer, Eye, Settings, 
    Image as ImageIcon, Type, Phone, MapPin, 
    Hash, User, Users, Percent, MessageSquare, QrCode,
    Receipt, ChefHat, Clock, FileText, Check, Zap, MoreVertical, Tag,
    ChevronDown, ChevronUp, RefreshCw, Bluetooth, ArrowRight, Maximize2, X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";
import { useProfileCache } from "@/hooks/useProfileCache";
import PrintTemplates from "@/components/printing/PrintTemplates";

// --- Professional Thermal Sizing & Styling Configurations ---
const defaults: any = {
    // Bill Settings
    showLogo: true,
    showTagline: true,
    showContact: true,
    showAddress: true,
    showGST: true,
    showFSSAI: true,
    showInvoiceNumber: true,
    showToken: true,
    showTableInfo: true,
    showCustomerDetails: true,
    showTaxBreakup: true,
    showGreetings: true,
    showAmountInWords: true,
    showPaymentStatus: true,
    showFoodTypeSuffix: true,
    showSubtotal: true,
    showItemDivider: true,
    // KOT Settings
    showKOTToken: true,
    showKOTCustomer: true,
    showKOTBillNo: true,
    showKOTInstructions: true,
    showKOTItemDivider: true,
    sepKOTTop: true,
    sepKOTCustomer: true,
    sepKOTItemsHeader: true,
    sepKOTFooter: true,
    // QR Settings
    showReviewQR: false,
    printTokenTicket: false,
    
    // Printer Queue & Feed Spacing Safety Settings
    paperBottomPadding: 80,
    spoolerDelay: 1500,
    
    // Typography Customization Defaults
    billFormat: "THERMAL", // "THERMAL" | "A4"
    a4InvoiceType: "GST_TAX_INVOICE", // "GST_TAX_INVOICE" | "RETAIL_INVOICE"
    paperWidth: "58mm",
    printDensity: "balanced",
    fontFamily: "",
    kotFontFamily: "",
    fontWeight: "",
    kotFontWeight: "",
    businessNameWeight: "",
    businessAddressWeight: "",
    taglineWeight: "",
    receiptTokenWeight: "",
    itemsWeight: "",
    totalWeight: "",
    detailsWeight: "",
    customerDetailsFontWeight: "",
    greetingWeight: "",
    kotTokenWeight: "",
    kotItemsWeight: "",
    kotQtyWeight: "",
    allowWalletEditDelete: true,
    logoHeight: 50,
    logoBottomMargin: 0,
    businessNameSize: 18,
    businessAddressSize: 11,
    taglineSize: 11,
    receiptTokenSize: 28,
    detailsFontSize: 10,
    customerDetailsFontSize: 10,
    itemsFontSize: 11,
    totalFontSize: 13,
    greetingFontSize: 12,
    kotTokenSize: 16,
    kotHeaderFontSize: 11,
    kotItemsFontSize: 11,
    kotQtyFontSize: 14
};

const TYPOGRAPHY_PRESETS = {
    balanced: {
        businessNameSize: 18,
        businessAddressSize: 11,
        taglineSize: 11,
        receiptTokenSize: 28,
        detailsFontSize: 10,
        customerDetailsFontSize: 10,
        itemsFontSize: 11,
        totalFontSize: 13,
        greetingFontSize: 12,
        kotTokenSize: 16,
        kotHeaderFontSize: 11,
        kotItemsFontSize: 11,
        kotQtyFontSize: 14,
        fontFamily: "",
        kotFontFamily: "",
        fontWeight: "",
        kotFontWeight: "",
        businessNameWeight: "",
        businessAddressWeight: "",
        taglineWeight: "",
        receiptTokenWeight: "",
        itemsWeight: "",
        totalWeight: "",
        detailsWeight: "",
        customerDetailsFontWeight: "",
        greetingWeight: "",
        kotTokenWeight: "",
        kotItemsWeight: "",
        kotQtyWeight: ""
    },
    compact: {
        businessNameSize: 14,
        businessAddressSize: 9,
        taglineSize: 9,
        receiptTokenSize: 20,
        detailsFontSize: 8,
        customerDetailsFontSize: 8,
        itemsFontSize: 9,
        totalFontSize: 11,
        greetingFontSize: 9,
        kotTokenSize: 12,
        kotHeaderFontSize: 9,
        kotItemsFontSize: 9,
        kotQtyFontSize: 11,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        kotFontFamily: '"Courier New", Courier, monospace',
        fontWeight: "400",
        kotFontWeight: "400",
        businessNameWeight: "",
        businessAddressWeight: "",
        taglineWeight: "",
        receiptTokenWeight: "",
        itemsWeight: "",
        totalWeight: "",
        detailsWeight: "",
        customerDetailsFontWeight: "",
        greetingWeight: "",
        kotTokenWeight: "",
        kotItemsWeight: "",
        kotQtyWeight: ""
    },
    bold: {
        businessNameSize: 24,
        businessAddressSize: 13,
        taglineSize: 12,
        receiptTokenSize: 34,
        detailsFontSize: 12,
        customerDetailsFontSize: 12,
        itemsFontSize: 13,
        totalFontSize: 16,
        greetingFontSize: 14,
        kotTokenSize: 20,
        kotHeaderFontSize: 13,
        kotItemsFontSize: 13,
        kotQtyFontSize: 16,
        fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
        kotFontFamily: '"Courier New", Courier, monospace',
        fontWeight: "700",
        kotFontWeight: "700",
        businessNameWeight: "",
        businessAddressWeight: "",
        taglineWeight: "",
        receiptTokenWeight: "",
        itemsWeight: "",
        totalWeight: "",
        detailsWeight: "",
        customerDetailsFontWeight: "",
        greetingWeight: "",
        kotTokenWeight: "",
        kotItemsWeight: "",
        kotQtyWeight: ""
    },
    minimal: {
        businessNameSize: 16,
        businessAddressSize: 10,
        taglineSize: 10,
        receiptTokenSize: 24,
        detailsFontSize: 9,
        customerDetailsFontSize: 9,
        itemsFontSize: 10,
        totalFontSize: 12,
        greetingFontSize: 10,
        kotTokenSize: 14,
        kotHeaderFontSize: 10,
        kotItemsFontSize: 10,
        kotQtyFontSize: 12,
        fontFamily: '"Trebuchet MS", Helvetica, sans-serif',
        kotFontFamily: '"Courier New", Courier, monospace',
        fontWeight: "500",
        kotFontWeight: "500",
        businessNameWeight: "",
        businessAddressWeight: "",
        taglineWeight: "",
        receiptTokenWeight: "",
        itemsWeight: "",
        totalWeight: "",
        detailsWeight: "",
        greetingWeight: "",
        kotTokenWeight: "",
        kotItemsWeight: "",
        kotQtyWeight: ""
    }
};

const fonts = [
    { name: "Default (System Sans)", value: "", desc: "Clean & fast", safe: true },
    { name: "Courier New / Monospace", value: '"Courier New", Courier, monospace', desc: "Thermal Classic", safe: true },
    { name: "Helvetica / Clean Sans", value: '"Helvetica Neue", Helvetica, Arial, sans-serif', desc: "Modern Sans", safe: true },
    { name: "Verdana / Wide Sans", value: 'Verdana, Geneva, sans-serif', desc: "Broad Sans", safe: true },
    { name: "Georgia / Classic Serif", value: 'Georgia, Cambria, "Times New Roman", serif', desc: "Formal Print", safe: false }
];

const fontWeights = [
    { name: "Default (Style Standard)", value: "", desc: "Default bolding" },
    { name: "Light (300)", value: "300", desc: "Fine weight" },
    { name: "Regular / Normal (400)", value: "400", desc: "Standard weight" },
    { name: "Medium (500)", value: "500", desc: "Medium weight" },
    { name: "Semi Bold (600)", value: "600", desc: "Moderately bold" },
    { name: "Bold (700)", value: "700", desc: "High contrast bold" },
    { name: "Extra Bold (900)", value: "900", desc: "Heavy block weight" }
];

// Custom anchored dropdown component that keeps menus inside container/viewport
function ResponsiveDropdown({
    value,
    onChange,
    options,
    placeholder = "Select..."
}: {
    value: any;
    onChange: (val: any) => void;
    options: { label: string; value: any; sublabel?: string }[];
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => String(o.value) === String(value));

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="w-full h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] sm:text-xs font-black flex items-center justify-between gap-1.5 sm:gap-2 text-slate-800 dark:text-white hover:border-violet-400 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all cursor-pointer box-border"
            >
                <span className="truncate text-left leading-tight">
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl max-h-52 sm:max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 overscroll-contain">
                        {options.map((opt, i) => {
                            const isSelected = String(opt.value) === String(value);
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                                        isSelected
                                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-black"
                                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-bold"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="break-words leading-tight">{opt.label}</span>
                                        {isSelected && <Check size={12} className="shrink-0 text-violet-600" />}
                                    </div>
                                    {opt.sublabel && (
                                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-tight">
                                            {opt.sublabel}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function PrintingSettings() {
    const router = useRouter();
    const { profile: cachedProfile, loading: profileLoading, updateProfile } = useProfileCache();
    const [saving, setSaving] = useState(false);
    const [business, setBusiness] = useState<any>(null);
    const loading = profileLoading && !cachedProfile;
    const [previewGst, setPreviewGst] = useState(true);
    const [showStyling, setShowStyling] = useState(true);
    const [printSettings, setPrintSettings] = useState<any>({ ...defaults });
    const [originalSettings, setOriginalSettings] = useState<any>(null);
    const [previewZoom, setPreviewZoom] = useState(0.95);
    const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"configure" | "preview">("configure");

    const receiptRef = useRef<HTMLDivElement>(null);
    const kotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cachedProfile) {
            setBusiness(cachedProfile);
            const merged = {
                ...defaults,
                ...(cachedProfile.printSettings || {})
            };
            setPrintSettings(merged);
            setOriginalSettings(merged);
        }
    }, [cachedProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: business?.id,
                    printSettings,
                    reviewUrl: business?.reviewUrl || "",
                    phonePrefixType: business?.phonePrefixType || "TEXT",
                    greetingMessage: business?.greetingMessage || ""
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    updateProfile(data, false);
                    setBusiness(data);
                    const merged = {
                        ...defaults,
                        ...(data.printSettings || {})
                    };
                    setPrintSettings(merged);
                    setOriginalSettings(merged);
                } else {
                    updateProfile({ printSettings });
                    setOriginalSettings(printSettings);
                }
                kravy.success();
                toast.success("Printing preferences saved!");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const isDirty = originalSettings ? JSON.stringify(printSettings) !== JSON.stringify(originalSettings) : false;

    const toggle = (key: string) => {
        setPrintSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Templates...</p>
        </div>
    );

    // DUMMY DATA FOR PREVIEW
    const dummyProps = {
        receiptRef,
        kotRef,
        business: { ...business, printSettings },
        billNumber: "INV-2024-001",
        billDate: new Date().toLocaleString('en-IN'),
        tokenNumber: "42",
        selectedTable: "Table 05",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        customerAddress: "Flat 101, Green Heights, Delhi",
        orderNotes: "Extra spicy, no onions please!",
        buyerGSTIN: previewGst ? (business?.gstNumber || "07AAAAA0000A1Z5") : null,
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
        taxBreakup: previewGst ? [{ rate: 5, taxable: 610, cgst: 15.25, sgst: 15.25, igst: 0 }, { rate: 18, taxable: 120, cgst: 10.8, sgst: 10.8, igst: 0 }] : [],
        deliveryCharge: 0,
        deliveryGst: 0,
        packagingCharge: 20,
        packagingGst: 1,
        serviceCharge: 0,
        customCharges: [],
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

    const SettingToggle = ({ icon: Icon, label, sKey, desc, color }: any) => (
        <button 
            onClick={() => toggle(sKey)}
            className={`flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all text-left group cursor-pointer ${
                printSettings[sKey] !== false 
                ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10" 
                : "bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60"
            }`}
        >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shrink-0 ${
                printSettings[sKey] !== false 
                ? `${color} text-white shadow-lg shadow-current/20` 
                : "bg-slate-200 dark:bg-white/5 text-slate-400"
            }`}>
                <Icon size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
                <h3 className={`text-xs sm:text-sm font-bold transition-all leading-tight ${printSettings[sKey] !== false ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{label}</h3>
                <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider mt-0.5 break-words leading-tight">{desc}</p>
            </div>

            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                printSettings[sKey] !== false 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                : "bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-300"
            }`}>
                {printSettings[sKey] !== false ? <Check size={12} strokeWidth={3.5} /> : null}
            </div>
        </button>
    );

    const Sizer = ({ label, icon: Icon, sKey, weightKey, min, max, descMap }: any) => {
        const value = printSettings[sKey] !== undefined && printSettings[sKey] !== "" ? Number(printSettings[sKey]) : defaults[sKey];
        
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
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                            <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider truncate">{label}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">Range: {min}px - {max}px</p>
                        </div>
                    </div>
                    <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-violet-500/10 text-violet-600 text-xs font-black shrink-0">
                        {getLabel(value)}
                    </span>
                </div>
                
                <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    value={value} 
                    onChange={(e) => setPrintSettings((prev: any) => ({ ...prev, [sKey]: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
                />

                {weightKey && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100/50 dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest shrink-0">Weight Override</span>
                        <div className="w-full sm:w-44">
                            <ResponsiveDropdown
                                value={printSettings[weightKey] || ""}
                                onChange={(val) => setPrintSettings((prev: any) => ({ ...prev, [weightKey]: val }))}
                                options={[
                                    { label: "Default style", value: "" },
                                    ...fontWeights.map((w) => ({
                                        label: w.name.split(" (")[0],
                                        value: w.value,
                                        sublabel: w.desc
                                    }))
                                ]}
                                placeholder="Default style"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full space-y-6 sm:space-y-8 pb-20 kravy-page-fade">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 px-1 sm:px-2">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button 
                        onClick={() => router.back()}
                        className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={18} className="text-slate-600 dark:text-white" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[26px] xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Print Customizer
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-white/40 font-bold uppercase tracking-wider sm:tracking-[0.15em] mt-0.5 leading-normal">
                            Design your Bill & KOT layout
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="h-9 sm:h-10 md:h-11 px-4 sm:px-6 md:px-8 rounded-xl sm:rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-2 shadow-xl shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95 shrink-0 self-start sm:self-auto whitespace-nowrap"
                >
                    <Save size={15} />
                    <span>{saving ? "Saving..." : "Save Preferences"}</span>
                </button>
            </div>

            {/* Print Mode Navigation Tabs: USB / Browser Print vs Bluetooth Thermal */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl max-w-xl mx-1 sm:mx-2 border border-slate-200/50 dark:border-white/5">
                <div
                    className="py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-white/10 text-violet-600 dark:text-violet-400 shadow-xs flex items-center justify-center gap-2"
                >
                    <Printer size={15} />
                    <span>USB / Browser Print (Active)</span>
                </div>
                <Link
                    href="/dashboard/settings/printing/bluetooth"
                    className="py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 group"
                >
                    <Bluetooth size={15} className="group-hover:scale-110 transition-transform" />
                    <span>Bluetooth Setup</span>
                    <ArrowRight size={13} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            {/* Mobile / Tablet Tab Switcher (hidden on desktop) */}
            <div className="xl:hidden flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl sm:rounded-2xl gap-1 mx-1 sm:mx-2 shadow-sm border border-slate-200/50 dark:border-white/5">
                <button
                    onClick={() => setActiveTab("configure")}
                    className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                        activeTab === "configure" 
                        ? 'bg-white dark:bg-white/10 shadow-sm text-violet-600 dark:text-violet-400' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                    }`}
                >
                    <Settings size={12} className="shrink-0" /> 
                    <span className="truncate">Configure</span>
                </button>
                <button
                    onClick={() => setActiveTab("preview")}
                    className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                        activeTab === "preview" 
                        ? 'bg-white dark:bg-white/10 shadow-sm text-violet-600 dark:text-violet-400' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                    }`}
                >
                    <Eye size={12} className="shrink-0" /> 
                    <span className="truncate">Live Preview</span>
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-start px-1 sm:px-2">
                {/* Left: Controls */}
                <div className={`${printSettings.billFormat === 'A4' ? 'xl:col-span-6' : 'xl:col-span-8'} space-y-10 ${activeTab === 'configure' ? 'block' : 'hidden xl:block'}`}>
                    
                    {/* Auto-Connect Web Bluetooth Guide */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Web Bluetooth Auto-Connect Guide</h2>
                        </div>
                        <div className="p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-blue-500/5 border border-blue-500/10 space-y-3 sm:space-y-4">
                            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Zap size={16} className="text-blue-500 shrink-0" /> 
                                <span>Stop Bluetooth connection popups on every refresh</span>
                            </h3>
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                                Google Chrome forgets Bluetooth devices on page reload for security reasons. To allow Kravy POS to automatically reconnect to your thermal printer in the background without asking you every time, please follow <b>ONE</b> of the steps below:
                            </p>
                            <div className="space-y-2.5 sm:space-y-3 mt-2">
                                <div className="p-3 sm:p-4 bg-white dark:bg-white/5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10">
                                    <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider sm:tracking-widest mb-1.5 sm:mb-2">Option 1: Enable Chrome Flag (Recommended for Desktop)</h4>
                                    <ol className="text-[11px] sm:text-xs font-semibold text-slate-500 list-decimal pl-4 space-y-1">
                                        <li>Copy this link: <code className="bg-slate-100 dark:bg-black/20 px-1 py-0.5 rounded text-blue-500 break-all select-all">chrome://flags/#enable-web-bluetooth-new-permissions-backend</code></li>
                                        <li>Paste it in a new Chrome tab and hit Enter.</li>
                                        <li>You will see a setting named <b className="text-slate-800 dark:text-slate-300">"Use the new permissions backend for Web Bluetooth"</b> highlighted in yellow.</li>
                                        <li>Click on the dropdown next to it and change the setting from <b>Default</b> to <b>Enabled</b>.</li>
                                        <li>Click the <b>Relaunch</b> button that appears at the bottom of the Chrome window.</li>
                                    </ol>
                                </div>
                                <div className="p-3 sm:p-4 bg-white dark:bg-white/5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10">
                                    <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider sm:tracking-widest mb-1.5 sm:mb-2">Option 2: Install App (Recommended for Mobile/Tablet)</h4>
                                    <ol className="text-[11px] sm:text-xs font-semibold text-slate-500 list-decimal pl-4 space-y-1">
                                        <li>Click the <b>3 dots (⋮)</b> in the top right corner of Chrome.</li>
                                        <li>Click on <b>Install Kravy POS</b> or <b>Add to Home Screen</b>.</li>
                                        <li>Open the installed POS app from your home screen.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header & Business Info */}
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Header & Business Info</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={ImageIcon} label="Business Logo" sKey="showLogo" desc="Your restaurant logo" color="bg-blue-500" />
                            <SettingToggle icon={Type} label="Tagline" sKey="showTagline" desc="Catchy business slogan" color="bg-indigo-500" />
                            <SettingToggle icon={Phone} label="Contact Info" sKey="showContact" desc="Phone numbers & WhatsApp" color="bg-emerald-500" />
                            <SettingToggle icon={MapPin} label="Address" sKey="showAddress" desc="Full store address" color="bg-rose-500" />
                            <SettingToggle icon={Hash} label="GST Number" sKey="showGST" desc="Business GSTIN details" color="bg-amber-500" />
                            <SettingToggle icon={FileText} label="FSSAI Number" sKey="showFSSAI" desc="Food license details" color="bg-orange-500" />
                        </div>
                        
                        {printSettings.showContact && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 mt-3 sm:mt-4"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">Phone Prefix Style</h4>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Choose how phone number is labeled on the bill</p>
                                        </div>
                                    </div>
                                    <ResponsiveDropdown
                                        value={business?.phonePrefixType || "TEXT"}
                                        onChange={(val) => setBusiness({ ...business, phonePrefixType: val })}
                                        options={[
                                            { label: "Text (Mob: )", value: "TEXT", sublabel: "Standard text prefix" },
                                            { label: "Symbol (📞 )", value: "SYMBOL", sublabel: "Modern phone emoji prefix" }
                                        ]}
                                        placeholder="Text (Mob: )"
                                    />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-emerald-500/10">
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                            <Phone size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">Secondary Phone Number</h4>
                                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Prints below the main contact number</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 9876543210 (Optional)"
                                        value={printSettings.secondaryPhone || ""}
                                        onChange={(e) => setPrintSettings({ ...printSettings, secondaryPhone: e.target.value })}
                                        className="w-full h-10 sm:h-12 px-3.5 sm:px-5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Order & Customer Details */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-pink-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Order & Customer Details</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={Receipt} label="Invoice Number" sKey="showInvoiceNumber" desc="Print Invoice # / Bill No on receipt" color="bg-purple-600" />
                            <SettingToggle icon={Clock} label="Token Number" sKey="showToken" desc="Order sequence token" color="bg-pink-500" />
                            <SettingToggle icon={Tag} label="Print Token Ticket" sKey="printTokenTicket" desc="Show separate Token Ticket printing button after bill print" color="bg-amber-500" />
                            <SettingToggle icon={MapPin} label="Table / Counter" sKey="showTableInfo" desc="Show table name/counter badge" color="bg-rose-400" />
                            <SettingToggle icon={User} label="Customer Info" sKey="showCustomerDetails" desc="Name, Phone, Address" color="bg-violet-500" />
                        </div>
                    </div>

                    {/* Item List Configuration */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Items List Setup</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={Type} label="Food Type Suffix" sKey="showFoodTypeSuffix" desc="Show (V), (NV) or (R)" color="bg-rose-600" />
                        </div>
                    </div>

                    {/* Financial Summary & Taxes */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Financial Summary & Taxes</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={Hash} label="Subtotal" sKey="showSubtotal" desc="Sum before taxes" color="bg-emerald-500" />
                            <SettingToggle icon={Percent} label="Discount" sKey="showDiscount" desc="Offer & coupon lines" color="bg-amber-500" />
                            <SettingToggle icon={FileText} label="Taxable Amount" sKey="showTaxableAmt" desc="Amount liable for tax" color="bg-cyan-500" />
                            <SettingToggle icon={Receipt} label="Total GST" sKey="showTotalTax" desc="Sum of CGST+SGST" color="bg-blue-500" />
                            <SettingToggle icon={Receipt} label="Per Product GST" sKey="showPerProductGST" desc="Show GST rate below each item" color="bg-indigo-600" />
                            <SettingToggle icon={Percent} label="Tax Breakup Table" sKey="showTaxBreakup" desc="Detailed GST Rate table at bottom" color="bg-cyan-600" />
                            <SettingToggle icon={MapPin} label="Delivery Fee" sKey="showDeliveryCharges" desc="Shipping/Delivery line" color="bg-indigo-500" />
                            <SettingToggle icon={Hash} label="Packaging" sKey="showPackagingCharges" desc="Container/Packing line" color="bg-violet-500" />
                            <SettingToggle icon={Users} label="Service Charge" sKey="showServiceCharge" desc="Additional service fee" color="bg-rose-500" />
                            <SettingToggle icon={FileText} label="Amt in Words" sKey="showAmountInWords" desc="Convert total to text" color="bg-slate-500" />
                        </div>
                    </div>

                    {/* Payment & Footer */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Payment & Footer Branding</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={Receipt} label="Payment Info" sKey="showPaymentStatus" desc="Mode & Status" color="bg-blue-600" />
                            <SettingToggle icon={MessageSquare} label="Greetings" sKey="showGreetings" desc="Thank you message" color="bg-teal-500" />
                            <SettingToggle icon={MessageSquare} label="Visit Again" sKey="showVisitAgain" desc="Greeting footer line" color="bg-slate-600" />
                            <SettingToggle icon={Zap} label="Powered By" sKey="showPoweredBy" desc="Kravy branding line" color="bg-violet-600" />
                        </div>

                        {printSettings.showGreetings && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-teal-500/5 border border-teal-500/10 space-y-3 mt-3 sm:mt-4"
                            >
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">Custom Greeting Message</h4>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Printed at bottom of the receipt</p>
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Thank You 🙏 Visit Again!"
                                    value={business?.greetingMessage ?? ""}
                                    onChange={(e) => setBusiness({ ...business, greetingMessage: e.target.value })}
                                    className="w-full h-10 sm:h-12 px-3.5 sm:px-5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Separator Settings */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Layout Separators</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={MoreVertical} label="Top Header Line" sKey="sepTop" desc="Divider at the very top" color="bg-slate-500" />
                            <SettingToggle icon={MoreVertical} label="Customer Divider" sKey="sepCustomer" desc="Line after customer info" color="bg-slate-400" />
                            <SettingToggle icon={MoreVertical} label="Items Header Line" sKey="sepItemsHeader" desc="Divider for item column names" color="bg-slate-500" />
                            <SettingToggle icon={MoreVertical} label="Item Divider Line" sKey="showItemDivider" desc="Line after each food item" color="bg-slate-600" />
                            <SettingToggle icon={MoreVertical} label="Total Top Line" sKey="sepTotalTop" desc="Divider before Grand Total" color="bg-slate-600" />
                            <SettingToggle icon={MoreVertical} label="Total Bottom Line" sKey="sepTotalBottom" desc="Divider after Grand Total" color="bg-slate-700" />
                            <SettingToggle icon={MoreVertical} label="Payment Divider" sKey="sepPayment" desc="Line before payment mode" color="bg-slate-500" />
                            <SettingToggle icon={MoreVertical} label="Footer Divider" sKey="sepFooter" desc="Line before greetings" color="bg-slate-400" />
                            <SettingToggle icon={MoreVertical} label="KOT Note Border" sKey="sepKOTInstructions" desc="Box around chef notes" color="bg-slate-500" />
                        </div>
                    </div>

                    {/* KOT Settings */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">KOT (Kitchen) Layout</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={Clock} label="KOT Token" sKey="showKOTToken" desc="Token number for chefs" color="bg-rose-500" />
                            <SettingToggle icon={User} label="KOT Customer" sKey="showKOTCustomer" desc="Customer name on KOT" color="bg-orange-500" />
                            <SettingToggle icon={Receipt} label="Bill Reference" sKey="showKOTBillNo" desc="Invoice # on KOT" color="bg-indigo-500" />
                            <SettingToggle icon={Clock} label="Print Time" sKey="showKOTTime" desc="Current time on KOT" color="bg-blue-500" />
                            <SettingToggle icon={ChefHat} label="Instructions" sKey="showKOTInstructions" desc="Chef notes & modifications" color="bg-emerald-500" />
                        </div>
                    </div>

                    {/* KOT Separators */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">KOT Separators / Lines</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={MoreVertical} label="KOT Top Line" sKey="sepKOTTop" desc="Line below K.O.T title" color="bg-slate-500" />
                            <SettingToggle icon={MoreVertical} label="KOT Customer Line" sKey="sepKOTCustomer" desc="Lines around Customer info" color="bg-slate-600" />
                            <SettingToggle icon={MoreVertical} label="KOT Header Line" sKey="sepKOTItemsHeader" desc="Line below Item/Qty headers" color="bg-slate-500" />
                            <SettingToggle icon={MoreVertical} label="KOT Item Dividers" sKey="showKOTItemDivider" desc="Line below each item" color="bg-slate-600" />
                            <SettingToggle icon={MoreVertical} label="KOT Footer Line" sKey="sepKOTFooter" desc="Line at the bottom" color="bg-slate-500" />
                        </div>
                    </div>

                    {/* QR Code & Digital */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 px-1 sm:px-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">QR Code & Digital</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
                            <SettingToggle icon={QrCode} label="Feedback QR" sKey="showReviewQR" desc="Scan to review on Google" color="bg-orange-500" />
                        </div>
                        
                        {printSettings.showReviewQR && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-orange-500/5 border border-orange-500/10 space-y-3"
                            >
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                                        <QrCode size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">Review/Feedback URL</h4>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Enter your Google Review or Form link</p>
                                    </div>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="https://g.page/r/your-id/review"
                                    value={business?.reviewUrl || ""}
                                    onChange={(e) => setBusiness({ ...business, reviewUrl: e.target.value })}
                                    className="w-full h-10 sm:h-12 px-3.5 sm:px-5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Typography & Styling Customization Accordion */}
                    <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
                        <button 
                            onClick={() => setShowStyling(!showStyling)}
                            className="w-full flex items-center justify-between px-1 sm:px-2 py-1.5 hover:opacity-80 transition-all text-left"
                        >
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-2 h-2 rounded-full bg-violet-500" />
                                <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Typography & Styling</h2>
                            </div>
                            <div className="text-slate-400">
                                {showStyling ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                        </button>

                        {showStyling && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-6 sm:space-y-8"
                            >
                                {/* Paper Settings Row */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Printer size={12} /> Bill Print Format & Size
                                    </h3>
                                    
                                    {/* Primary Bill Format Selector: 2-inch, 3-inch, A4 Full Page */}
                                    <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                                            <span>Select Bill Print Format</span>
                                            {printSettings.billFormat === "A4" ? (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">A4 Format Selected</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">Thermal Roll Selected</span>
                                            )}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setPrintSettings((p: any) => ({ ...p, billFormat: "THERMAL", paperWidth: "58mm" }));
                                                    kravy.click();
                                                }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    printSettings.billFormat !== "A4" && printSettings.paperWidth !== "80mm"
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-violet-400'
                                                }`}
                                            >
                                                <div className="text-xs font-black">2" Thermal Roll</div>
                                                <div className={`text-[10px] mt-0.5 ${printSettings.billFormat !== "A4" && printSettings.paperWidth !== "80mm" ? 'text-violet-100' : 'text-slate-400'}`}>58mm Receipt Printer</div>
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setPrintSettings((p: any) => ({ ...p, billFormat: "THERMAL", paperWidth: "80mm" }));
                                                    kravy.click();
                                                }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    printSettings.billFormat !== "A4" && printSettings.paperWidth === "80mm"
                                                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-violet-400'
                                                }`}
                                            >
                                                <div className="text-xs font-black">3" Thermal Roll</div>
                                                <div className={`text-[10px] mt-0.5 ${printSettings.billFormat !== "A4" && printSettings.paperWidth === "80mm" ? 'text-violet-100' : 'text-slate-400'}`}>80mm Receipt Printer</div>
                                            </button>

                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setPrintSettings((p: any) => ({ ...p, billFormat: "A4", a4InvoiceType: p.a4InvoiceType || "GST_TAX_INVOICE" }));
                                                    kravy.click();
                                                }}
                                                className={`p-3 rounded-xl border text-left transition-all ${
                                                    printSettings.billFormat === "A4"
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                                                }`}
                                            >
                                                <div className="text-xs font-black">A4 Size Invoice</div>
                                                <div className={`text-[10px] mt-0.5 ${printSettings.billFormat === "A4" ? 'text-emerald-100' : 'text-slate-400'}`}>Full Page Laser/Inkjet</div>
                                            </button>
                                        </div>

                                        {/* A4 Sub-template Selection (Option 2) */}
                                        {printSettings.billFormat === "A4" && (
                                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 animate-in fade-in-0 duration-200">
                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                                                    Select A4 Invoice Template Style:
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPrintSettings((p: any) => ({ ...p, a4InvoiceType: "GST_TAX_INVOICE" }));
                                                            kravy.click();
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                                            (printSettings.a4InvoiceType || "GST_TAX_INVOICE") === "GST_TAX_INVOICE"
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold"
                                                                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                                                        }`}
                                                    >
                                                        <div className="text-xs font-black flex items-center justify-between">
                                                            <span>A4 GST Tax Invoice</span>
                                                            {(printSettings.a4InvoiceType || "GST_TAX_INVOICE") === "GST_TAX_INVOICE" && <Check size={14} className="text-emerald-600" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                                            HSN/SAC, CGST/SGST/IGST breakdown, Tax Summary Table, B2B compliant.
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPrintSettings((p: any) => ({ ...p, a4InvoiceType: "RETAIL_INVOICE" }));
                                                            kravy.click();
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                                            printSettings.a4InvoiceType === "RETAIL_INVOICE"
                                                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold"
                                                                : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                                                        }`}
                                                    >
                                                        <div className="text-xs font-black flex items-center justify-between">
                                                            <span>A4 Retail Invoice</span>
                                                            {printSettings.a4InvoiceType === "RETAIL_INVOICE" && <Check size={14} className="text-emerald-600" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                                            Clean, modern full-page invoice without complex HSN tax summary tables.
                                                        </div>
                                                    </button>
                                                </div>

                                                {/* Editable Terms & Conditions for A4 */}
                                                <div className="pt-2 space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                                        A4 Invoice Terms & Conditions
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        value={printSettings.a4Terms ?? business?.terms ?? "1. Payment is non-refundable. 2. Goods / Services once confirmed cannot be cancelled. 3. All disputes are subject to local jurisdiction only."}
                                                        onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4Terms: e.target.value }))}
                                                        placeholder="Enter Terms & Conditions to print at the bottom of A4 invoices..."
                                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                    />
                                                </div>

                                                {/* Editable Bank Details & Contact Info for A4 */}
                                                <div className="pt-2 space-y-2 border-t border-slate-200/70 dark:border-white/10">
                                                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                                                        A4 Bank Details & Header Info (Optional)
                                                    </label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4BankName ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4BankName: e.target.value }))}
                                                            placeholder="Bank Name (e.g. HDFC Bank)"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4AccountName ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4AccountName: e.target.value }))}
                                                            placeholder="Account Holder Name"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4AccountNumber ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4AccountNumber: e.target.value }))}
                                                            placeholder="Account Number"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4IfscCode ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4IfscCode: e.target.value }))}
                                                            placeholder="IFSC Code"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4OwnerName ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4OwnerName: e.target.value }))}
                                                            placeholder="Contact Person Name"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={printSettings.a4Website ?? ""}
                                                            onChange={(e) => setPrintSettings((p: any) => ({ ...p, a4Website: e.target.value }))}
                                                            placeholder="Website URL (e.g. https://...)"
                                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {printSettings.billFormat !== "A4" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Paper Width Toggle for Thermal */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thermal Roll Width</label>
                                            <div className="grid grid-cols-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl gap-1">
                                                <button 
                                                    type="button"
                                                    onClick={() => setPrintSettings((p: any) => ({ ...p, paperWidth: "58mm" }))}
                                                    className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${printSettings.paperWidth !== "80mm" ? 'bg-white dark:bg-white/10 shadow-sm text-violet-600' : 'text-slate-400'}`}
                                                >
                                                    58mm (2" Thermal)
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setPrintSettings((p: any) => ({ ...p, paperWidth: "80mm" }))}
                                                    className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${printSettings.paperWidth === "80mm" ? 'bg-white dark:bg-white/10 shadow-sm text-violet-600' : 'text-slate-400'}`}
                                                >
                                                    80mm (3" Thermal)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Density presets */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Print Density Mode</label>
                                            <div className="grid grid-cols-3 bg-slate-100 dark:bg-white/5 p-1 rounded-xl gap-1">
                                                {(["compact", "balanced", "spacious"] as const).map((mode) => (
                                                    <button 
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => {
                                                            setPrintSettings((p: any) => ({ 
                                                                ...p, 
                                                                printDensity: mode,
                                                                ...TYPOGRAPHY_PRESETS[mode === 'compact' ? 'compact' : mode === 'spacious' ? 'bold' : 'balanced']
                                                            }));
                                                            kravy.success();
                                                            toast.success(`Applied ${mode} presets!`);
                                                        }}
                                                        className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                            (printSettings.printDensity === mode || 
                                                            (mode === 'balanced' && !printSettings.printDensity)) 
                                                            ? 'bg-white dark:bg-white/10 shadow-sm text-violet-600' 
                                                            : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Thermal Printer Safety & Feed Spacing */}
                                        <div className="flex flex-col gap-2 col-span-1 md:col-span-2 border-t border-slate-100 dark:border-white/5 pt-4 mt-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                Printer Queue & Feed Spacing Safety (Prevents Cutter Jams / Queue Freezes)
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Receipt Bottom Padding (Feed Spacing)</span>
                                                        <span className="text-xs font-black text-violet-600">{(printSettings.paperBottomPadding !== undefined && printSettings.paperBottomPadding !== null) ? printSettings.paperBottomPadding : 80}px</span>
                                                    </div>
                                                    <input 
                                                        type="range"
                                                        min="20"
                                                        max="200"
                                                        step="10"
                                                        value={(printSettings.paperBottomPadding !== undefined && printSettings.paperBottomPadding !== null) ? printSettings.paperBottomPadding : 80}
                                                        onChange={(e) => setPrintSettings((p: any) => ({ ...p, paperBottomPadding: Number(e.target.value) }))}
                                                        className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                        Feeds paper past the cutter. Increase this if text cuts off or prints overlap.
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Consecutive Print Spooler Delay</span>
                                                        <span className="text-xs font-black text-violet-600">{((printSettings.spoolerDelay !== undefined && printSettings.spoolerDelay !== null) ? printSettings.spoolerDelay : 1500) / 1000}s</span>
                                                    </div>
                                                    <ResponsiveDropdown
                                                        value={(printSettings.spoolerDelay !== undefined && printSettings.spoolerDelay !== null) ? printSettings.spoolerDelay : 1500}
                                                        onChange={(val) => setPrintSettings((p: any) => ({ ...p, spoolerDelay: Number(val) }))}
                                                        options={[
                                                            { label: "0.5s", value: 500, sublabel: "Ultra Fast Spooler" },
                                                            { label: "1.0s", value: 1000, sublabel: "Fast Printer" },
                                                            { label: "1.5s", value: 1500, sublabel: "Balanced Standard" },
                                                            { label: "2.0s", value: 2000, sublabel: "Recommended for Slow Printers" },
                                                            { label: "3.0s", value: 3000, sublabel: "Extra Safe Queue" },
                                                            { label: "4.0s", value: 4000, sublabel: "Slow Spooler Cooldown" }
                                                        ]}
                                                        placeholder="1.5s (Balanced Standard)"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                        Cooldown time between KOT and Bill prints to prevent spooler freezes.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Typography Presets Row */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Zap size={12} /> Styling Presets
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { id: "balanced", label: "Balanced Standard", desc: "Default layout" },
                                            { id: "compact", label: "Compact POS", desc: "Dense & paper-saving" },
                                            { id: "bold", label: "Restaurant Bold", desc: "High readability" },
                                            { id: "minimal", label: "Minimal Cafe", desc: "Clean modern design" }
                                        ].map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => {
                                                    setPrintSettings((prev: any) => ({
                                                        ...prev,
                                                        printDensity: preset.id === "balanced" ? "balanced" : preset.id === "bold" ? "spacious" : preset.id,
                                                        ...TYPOGRAPHY_PRESETS[preset.id as keyof typeof TYPOGRAPHY_PRESETS]
                                                    }));
                                                    kravy.success();
                                                    toast.success(`Preset "${preset.label}" loaded!`);
                                                }}
                                                className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                                                    (printSettings.printDensity === preset.id || 
                                                     (preset.id === "balanced" && (printSettings.printDensity === "balanced" || !printSettings.printDensity)))
                                                    ? "bg-violet-600/5 border-violet-500/20 text-violet-600" 
                                                    : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300"
                                                }`}
                                            >
                                                <div className="text-xs font-black uppercase tracking-wider">{preset.label}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{preset.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Font Selector Row */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Type size={12} /> Typography & Fonts
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Receipt Font */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Receipt/Bill Font Family</label>
                                            <ResponsiveDropdown
                                                value={printSettings.fontFamily || ""}
                                                onChange={(val) => setPrintSettings((p: any) => ({ ...p, fontFamily: val }))}
                                                options={fonts.map((f) => ({
                                                    label: `${f.name}${f.safe ? " (✔ Safe)" : ""}`,
                                                    value: f.value,
                                                    sublabel: f.desc
                                                }))}
                                                placeholder="Default (System Sans)"
                                            />
                                        </div>

                                        {/* KOT Font */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">KOT (Kitchen Slip) Font Family</label>
                                            <ResponsiveDropdown
                                                value={printSettings.kotFontFamily || ""}
                                                onChange={(val) => setPrintSettings((p: any) => ({ ...p, kotFontFamily: val }))}
                                                options={fonts.map((f) => ({
                                                    label: `${f.name}${f.safe ? " (✔ Safe)" : ""}`,
                                                    value: f.value,
                                                    sublabel: f.desc
                                                }))}
                                                placeholder="Default (System Sans)"
                                            />
                                        </div>

                                        {/* Receipt Font Weight */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Receipt/Bill Font Weight</label>
                                            <ResponsiveDropdown
                                                value={printSettings.fontWeight || ""}
                                                onChange={(val) => setPrintSettings((p: any) => ({ ...p, fontWeight: val }))}
                                                options={fontWeights.map((w) => ({
                                                    label: w.name,
                                                    value: w.value,
                                                    sublabel: w.desc
                                                }))}
                                                placeholder="Default (Style Standard)"
                                            />
                                        </div>

                                        {/* KOT Font Weight */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">KOT (Kitchen Slip) Font Weight</label>
                                            <ResponsiveDropdown
                                                value={printSettings.kotFontWeight || ""}
                                                onChange={(val) => setPrintSettings((p: any) => ({ ...p, kotFontWeight: val }))}
                                                options={fontWeights.map((w) => ({
                                                    label: w.name,
                                                    value: w.value,
                                                    sublabel: w.desc
                                                }))}
                                                placeholder="Default (Style Standard)"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Slider Grid: Receipt */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-slate-200 dark:border-white/10 pb-2">
                                        <Receipt size={12} /> Receipt Element Sizing (Thermal Safe Constrained)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Sizer 
                                            label="Logo Size / Height" 
                                            icon={ImageIcon} 
                                            sKey="logoHeight" 
                                            min={20} 
                                            max={90} 
                                            descMap={{ 20: "20mm (Small)", 35: "35mm (Medium)", 50: "50mm (Large)", 70: "70mm (Extra Large)", 90: "90mm (Max Width)" }} 
                                        />
                                        <Sizer 
                                            label="Logo Bottom Space" 
                                            icon={ImageIcon} 
                                            sKey="logoBottomMargin" 
                                            min={-20} 
                                            max={20} 
                                            descMap={{ "-20": "-20 (Tight)", 0: "0 (Default)", 20: "20 (Wide)" }} 
                                        />
                                        <Sizer 
                                            label="Business Name Font Size" 
                                            icon={Type} 
                                            sKey="businessNameSize" 
                                            weightKey="businessNameWeight"
                                            min={14} 
                                            max={32} 
                                            descMap={{ 14: "Small", 18: "Medium", 24: "Large", 32: "Extra Large" }} 
                                        />
                                        <Sizer 
                                            label="Address Font Size" 
                                            icon={MapPin} 
                                            sKey="businessAddressSize" 
                                            weightKey="businessAddressWeight"
                                            min={8} 
                                            max={16} 
                                            descMap={{ 8: "Very Compact", 11: "Standard", 14: "Highly Readable", 16: "Large" }} 
                                        />
                                        <Sizer 
                                            label="Tagline Font Size" 
                                            icon={Type} 
                                            sKey="taglineSize" 
                                            weightKey="taglineWeight"
                                            min={8} 
                                            max={14} 
                                            descMap={{ 8: "Compact", 11: "Standard", 14: "Large" }} 
                                        />
                                        <Sizer 
                                            label="Receipt Token Size" 
                                            icon={Clock} 
                                            sKey="receiptTokenSize" 
                                            weightKey="receiptTokenWeight"
                                            min={18} 
                                            max={40} 
                                            descMap={{ 18: "Normal", 28: "Bold Standout", 40: "Giant Block" }} 
                                        />
                                        <Sizer 
                                            label="Items List Font Size" 
                                            icon={Receipt} 
                                            sKey="itemsFontSize" 
                                            weightKey="itemsWeight"
                                            min={9} 
                                            max={18} 
                                            descMap={{ 9: "Compact POS", 11: "Standard", 14: "Medium", 18: "Extra Large" }} 
                                        />
                                        <Sizer 
                                            label="Grand Total Font Size" 
                                            icon={Receipt} 
                                            sKey="totalFontSize" 
                                            weightKey="totalWeight"
                                            min={11} 
                                            max={24} 
                                            descMap={{ 11: "Regular", 13: "Standard Highlight", 18: "Bold Large", 24: "Screaming Total" }} 
                                        />
                                        <Sizer 
                                            label="Customer Details Size" 
                                            icon={User} 
                                            sKey="customerDetailsFontSize" 
                                            weightKey="customerDetailsFontWeight"
                                            min={8} 
                                            max={24} 
                                            descMap={{ 8: "Dense", 10: "Standard", 14: "Large", 18: "Extra Large" }} 
                                        />
                                        <Sizer 
                                            label="Details & Metadata Size" 
                                            icon={FileText} 
                                            sKey="detailsFontSize" 
                                            weightKey="detailsWeight"
                                            min={8} 
                                            max={14} 
                                            descMap={{ 8: "Dense", 10: "Standard", 14: "Large" }} 
                                        />
                                        <Sizer 
                                            label="Greetings Footer Size" 
                                            icon={MessageSquare} 
                                            sKey="greetingFontSize" 
                                            weightKey="greetingWeight"
                                            min={9} 
                                            max={18} 
                                            descMap={{ 9: "Compact", 12: "Standard", 18: "Large" }} 
                                        />
                                    </div>
                                </div>

                                {/* Slider Grid: KOT */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-slate-200 dark:border-white/10 pb-2">
                                        <ChefHat size={12} /> Kitchen Slip (KOT) Element Sizing
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Sizer 
                                            label="KOT Token Size" 
                                            icon={Clock} 
                                            sKey="kotTokenSize" 
                                            weightKey="kotTokenWeight"
                                            min={12} 
                                            max={28} 
                                            descMap={{ 12: "Regular", 16: "Standard", 28: "Large Block" }} 
                                        />
                                        <Sizer 
                                            label="KOT Header Details Size" 
                                            icon={FileText} 
                                            sKey="kotHeaderFontSize" 
                                            min={8} 
                                            max={32} 
                                            descMap={{ 8: "Tiny", 11: "Standard", 32: "Spacious Large" }} 
                                        />
                                        <Sizer 
                                            label="KOT Items Font Size" 
                                            icon={ChefHat} 
                                            sKey="kotItemsFontSize" 
                                            weightKey="kotItemsWeight"
                                            min={9} 
                                            max={40} 
                                            descMap={{ 9: "Compact", 11: "Standard Mono", 40: "Spacious Large" }} 
                                        />
                                        <Sizer 
                                            label="KOT Quantity Font Size" 
                                            icon={ChefHat} 
                                            sKey="kotQtyFontSize" 
                                            weightKey="kotQtyWeight"
                                            min={10} 
                                            max={40} 
                                            descMap={{ 10: "Standard", 14: "Bold Standout", 40: "Giant Bold" }} 
                                        />
                                    </div>
                                </div>

                                {/* Resets Row */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        * Element sizing fallbacks are applied automatically when limits are set.
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPrintSettings((p: any) => ({
                                                    ...p,
                                                    businessNameSize: defaults.businessNameSize,
                                                    businessAddressSize: defaults.businessAddressSize,
                                                    taglineSize: defaults.taglineSize,
                                                    receiptTokenSize: defaults.receiptTokenSize,
                                                    detailsFontSize: defaults.detailsFontSize,
                                                    customerDetailsFontSize: defaults.customerDetailsFontSize,
                                                    itemsFontSize: defaults.itemsFontSize,
                                                    totalFontSize: defaults.totalFontSize,
                                                    greetingFontSize: defaults.greetingFontSize,
                                                    fontFamily: defaults.fontFamily,
                                                    fontWeight: defaults.fontWeight,
                                                    businessNameWeight: defaults.businessNameWeight,
                                                    businessAddressWeight: defaults.businessAddressWeight,
                                                    taglineWeight: defaults.taglineWeight,
                                                    receiptTokenWeight: defaults.receiptTokenWeight,
                                                    itemsWeight: defaults.itemsWeight,
                                                    totalWeight: defaults.totalWeight,
                                                    detailsWeight: defaults.detailsWeight,
                                                    customerDetailsFontWeight: defaults.customerDetailsFontWeight,
                                                    greetingWeight: defaults.greetingWeight
                                                }));
                                                kravy.success();
                                                toast.success("Receipt typography reset to default!");
                                            }}
                                            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent text-[11px] sm:text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                                        >
                                            <RefreshCw size={12} /> <span>Reset Receipt Styling</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPrintSettings((p: any) => ({
                                                    ...p,
                                                    kotTokenSize: defaults.kotTokenSize,
                                                    kotItemsFontSize: defaults.kotItemsFontSize,
                                                    kotQtyFontSize: defaults.kotQtyFontSize,
                                                    kotFontFamily: defaults.kotFontFamily,
                                                    kotFontWeight: defaults.kotFontWeight,
                                                    kotTokenWeight: defaults.kotTokenWeight,
                                                    kotItemsWeight: defaults.kotItemsWeight,
                                                    kotQtyWeight: defaults.kotQtyWeight
                                                }));
                                                kravy.success();
                                                toast.success("KOT typography reset to default!");
                                            }}
                                            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent text-[11px] sm:text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
                                        >
                                            <RefreshCw size={12} /> <span>Reset KOT Styling</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className={`${printSettings.billFormat === 'A4' ? 'xl:col-span-6' : 'xl:col-span-4'} xl:sticky xl:top-24 h-[calc(100vh-220px)] xl:h-[calc(100vh-140px)] w-full relative flex flex-col ${activeTab === 'preview' ? 'flex' : 'hidden xl:flex'}`}>
                    
                    {/* Sleek Vertical/Horizontal Floating Controller Dock - Gutter Positioned on Desktop, Floating on Mobile */}
                    <div className="absolute xl:-left-16 xl:right-auto right-4 top-4 xl:top-8 flex xl:flex-col flex-row gap-2.5 z-30 select-none bg-slate-900/95 dark:bg-zinc-950/95 backdrop-blur-md border border-slate-800 dark:border-zinc-800/80 rounded-[1.25rem] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        {/* Full Screen Preview Button */}
                        <button
                            type="button"
                            onClick={() => setFullPreviewOpen(true)}
                            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-all active:scale-90 outline-none shadow-lg shadow-emerald-600/30"
                            title="Full Page Preview"
                        >
                            <Maximize2 size={14} />
                        </button>
                        {/* GST / Non-GST Switcher */}
                        <button 
                            onClick={() => setPreviewGst(!previewGst)} 
                            className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center border font-black transition-all active:scale-90 outline-none ${
                                previewGst 
                                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30' 
                                : 'bg-slate-800 dark:bg-zinc-900 border-slate-700 dark:border-zinc-800 text-slate-400'
                            }`}
                            title="Toggle GST / Non-GST Mode"
                        >
                            <span className="leading-none text-[8px] uppercase">GST</span>
                            <span className="text-[6px] font-bold opacity-80 mt-0.5">{previewGst ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Paper Width 58mm / 80mm Switcher */}
                        <button 
                            onClick={() => setPrintSettings((p: any) => ({ ...p, paperWidth: printSettings.paperWidth === '80mm' ? '58mm' : '80mm' }))} 
                            className="w-9 h-9 rounded-xl flex flex-col items-center justify-center border font-black transition-all active:scale-90 outline-none bg-slate-800 dark:bg-zinc-900 border-slate-700 dark:border-zinc-800 text-slate-300 hover:text-white"
                            title="Toggle Paper Width (58mm / 80mm)"
                        >
                            <span className="leading-none text-[8px] uppercase">SIZE</span>
                            <span className="text-[7px] font-bold mt-0.5">{printSettings.paperWidth === '80mm' ? '3"' : '2"'}</span>
                        </button>

                        {/* Separator line */}
                        <div className="xl:w-full xl:h-[1px] w-[1px] h-6 bg-slate-800 dark:bg-zinc-800 my-0.5" />

                        {/* Zoom In */}
                        <button
                            type="button"
                            onClick={() => setPreviewZoom(z => Math.min(1.5, Number((z + 0.05).toFixed(2))))}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-300 flex items-center justify-center font-bold text-sm transition-all active:scale-90 outline-none"
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
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-300 flex items-center justify-center font-bold text-sm transition-all active:scale-90 outline-none"
                            title="Zoom Out"
                        >
                            -
                        </button>

                        {/* Reset Zoom */}
                        <button
                            type="button"
                            onClick={() => setPreviewZoom(0.95)}
                            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all active:scale-90 outline-none"
                            title="Reset Zoom"
                        >
                            <RefreshCw size={11} />
                        </button>
                    </div>

                    <div className="bg-slate-950 dark:bg-black rounded-[2.5rem] border border-slate-800 dark:border-zinc-800/80 shadow-2xl flex-1 flex flex-col relative overflow-hidden">
                        
                        {/* Realistic Thermal Printer Dispenser Top-Bezel Mockup */}
                        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-10 select-none relative h-12 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                                <span className="text-[9px] font-black tracking-[0.2em] text-slate-200 uppercase">PRINTER ON-LINE</span>
                            </div>
                            
                            {/* Realistic metallic dispenser cut line */}
                            <div className="w-16 h-1 bg-slate-800 rounded-full border border-slate-700 shadow-inner opacity-60" />
                            
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] font-black tracking-wider text-slate-400 uppercase">
                                {printSettings.billFormat === 'A4' ? 'A4 INVOICE' : (printSettings.paperWidth === '80mm' ? '80MM / 3"' : '58MM / 2"')}
                            </span>
                        </div>
                        
                        {/* Feed Dispenser Cut slot */}
                        <div className="h-1 bg-black border-b border-slate-900 relative z-10 shadow-[inset_0_2px_4px_rgba(0,0,0,1)] shrink-0" />

                        {/* Interactive Paper Tray Area (Fully Height Adaptive) */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-12 px-4 flex flex-col items-center scrollbar-none overscroll-contain touch-pan-y">
                            
                            {/* THE PREVIEW WRAPPER */}
                            <div 
                                className={`flex flex-col w-full transition-all duration-300 relative ${
                                    printSettings.billFormat === 'A4' ? 'max-w-[580px]' : (printSettings.paperWidth === '80mm' ? 'max-w-[340px]' : 'max-w-[270px]')
                                }`}
                            >
                                {/* Bill Preview with Smooth Transform Scale */}
                                <div className="w-full origin-top transition-transform duration-200" style={{ transform: `scale(${previewZoom})` }}>
                                   <PrintTemplates {...(dummyProps as any)} isPreviewMode={true} />
                                   
                                   {/* Advanced Receipt Mockup CSS Overrides */}
                                   <style dangerouslySetInnerHTML={{ __html: `
                                        ${printSettings.billFormat === 'A4' ? `
                                          .hidden-print .receipt.a4-preview-wrapper, .hidden-print .a4-invoice-sheet {
                                            display: block !important;
                                            width: 100% !important;
                                            max-width: 794px !important;
                                            background-color: #ffffff !important;
                                            color: #000000 !important;
                                            box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
                                            padding: 0 !important;
                                            margin: 0 auto !important;
                                            border-radius: 6px !important;
                                            clip-path: none !important;
                                          }
                                        ` : `
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
                                        `}
                                   `}} />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-center text-[10px] text-slate-500 font-bold px-10 leading-relaxed uppercase tracking-widest select-none">
                        * Note: Preview shows actual thermal printer slot behavior.
                    </p>
                </div>
            </div> {/* Closing the grid grid-cols-12 */}
        
            <AnimatePresence>
                <motion.button
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 rounded-full flex items-center gap-2 sm:gap-3 border transition-all select-none group ${
                        isDirty
                        ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_10px_35px_rgba(139,92,246,0.4)] border-violet-500/30 hover:scale-105 active:scale-95 cursor-pointer"
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
                    
                    {/* Subtle pulsing indicator ring for unsaved changes */}
                    {isDirty && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-fuchsia-500"></span>
                        </span>
                    )}
                </motion.button>
            </AnimatePresence>

            {/* Full-Page A4 / Thermal Preview Modal */}
            {fullPreviewOpen && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm overflow-y-auto py-6 px-3 sm:px-6"
                    onClick={() => setFullPreviewOpen(false)}
                >
                    <div 
                        className="relative w-full max-w-[840px] mx-auto bg-slate-100 dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
                            <div>
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                    {printSettings.billFormat === 'A4' ? 'Full-Page A4 Invoice Preview' : 'Full Receipt Preview'}
                                </h3>
                                <p className="text-xs text-slate-500">Exact layout as printed or exported to PDF</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFullPreviewOpen(false)}
                                className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex justify-center">
                            <PrintTemplates {...(dummyProps as any)} isPreviewMode={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

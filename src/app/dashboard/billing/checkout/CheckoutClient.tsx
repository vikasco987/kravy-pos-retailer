"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock, Trash2, Play, X, Search, ChevronDown, User, Printer, ArrowLeft,
  Save, PauseCircle, RefreshCw, Eye, ZoomIn, ZoomOut, Plus,
  LayoutGrid, Columns, StickyNote, Layers, Utensils, ShoppingBag, Truck, Star, Zap, Pencil, Settings, Check, Mic, MicOff, Split
} from "lucide-react";
import { calculateDiscount } from "@/lib/discount-utils";
import { toast } from "sonner";
import { kravy } from "@/lib/sounds";
import { WhatsAppBillButton } from "@/components/WhatsAppBillButton";
import { useAuthContext } from "@/components/AuthContext";
import PrintTemplates from "@/components/printing/PrintTemplates";
import BillPreview from "@/components/printing/BillPreview";
import { useTerminalContext } from "@/components/TerminalContext";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useConfirm } from "@/components/ConfirmContext";
import ItemModal from "@/components/MenuEditor/ItemModal";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { getQRCodeDataUrl } from "@/lib/qrHelper";
import { v4 as uuidv4 } from "uuid";

/* ================= TYPES ================= */

type MenuItem = {
  id: string;
  name: string;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  gst?: number;
  hsnCode?: string;
  shortCode?: string | null;
  taxStatus?: string;
  zones?: string[];
  isVeg?: boolean;
  isEgg?: boolean;
  isActive?: boolean;
  variants?: any;
};

type BillItem = {
  id: string;
  itemId?: string;
  name: string;
  qty: number;
  rate: number;
  gst?: number | null;
  hsnCode?: string;
  taxStatus?: string;
};

function normalizeMenuItems(data: any[]): MenuItem[] {
  return (data || []).map((it: any) => {
    const sPrice = Number(it.sellingPrice);
    const bPrice = Number(it.price);
    const finalPrice = !isNaN(sPrice) && it.sellingPrice !== null ? sPrice : !isNaN(bPrice) ? bPrice : 0;
    
    let parsedVariants = it.variants;
    if (typeof parsedVariants === 'string') {
      try {
        parsedVariants = JSON.parse(parsedVariants);
      } catch(e) {}
    }

    return { ...it, price: finalPrice, gst: it.gst, hsnCode: it.hsnCode, taxStatus: it.taxStatus, shortCode: it.shortCode, variants: parsedVariants };
  });
}

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convert = (n: number, depth = 0): string => {
    if (depth > 10) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100, depth + 1) : '');
    if (n < 100000) return convert(Math.floor(n / 1000), depth + 1) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000, depth + 1) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000), depth + 1) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000, depth + 1) : '');
    return convert(Math.floor(n / 10000000), depth + 1) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000, depth + 1) : '');
  };

  if (isNaN(num) || !isFinite(num)) return '';
  if (num === 0) return 'Zero Only';
  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
  
  let result = convert(integerPart) + ' Rupees';
  if (decimalPart > 0) {
    result += ' and ' + convert(decimalPart) + ' Paise';
  }
  return result + ' Only';
};

/* ================= SUB-COMPONENTS ================= */

const InlineRateEdit = ({ item, updateRate, taxActive, perProductEnabled, globalRate }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(item.rate?.toString() || "");

  const handleSave = () => {
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      updateRate(item.id, num);
    } else {
      setVal(item.rate?.toString() || "");
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs font-black text-[var(--kravy-brand)]">{item.qty} × ₹</span>
        <input 
          autoFocus
          type="number"
          className="w-16 text-xs font-black text-[var(--kravy-brand)] bg-[var(--kravy-surface)] border border-[var(--kravy-brand)] rounded px-1 outline-none no-arrows"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={() => { setVal(item.rate?.toString() || ""); setIsEditing(true); }}
        className="text-xs font-black text-[var(--kravy-brand)] hover:underline cursor-pointer flex items-center gap-1 text-left"
        title="Edit Price"
      >
        {item.qty} × ₹{Number(item.rate ?? 0).toFixed(2)} <Pencil size={10} className="inline opacity-50 hover:opacity-100" />
      </button>
      {(taxActive || perProductEnabled) && (
        <span className="text-[8px] font-black px-1.5 py-0.5 bg-[var(--kravy-brand)]/5 text-[var(--kravy-brand)] border border-[var(--kravy-brand)]/10 rounded-md uppercase tracking-tighter">
          GST: {(perProductEnabled && item.gst !== null) ? item.gst : globalRate}%
        </span>
      )}
    </div>
  );
};


const MenuItemCard = React.memo(({ m, items, addToCart, reduceFromCart, expiryTrackingEnabled }: { 
  m: MenuItem, 
  items: BillItem[], 
  addToCart: (item: MenuItem) => void, 
  reduceFromCart: (id: string) => void,
  expiryTrackingEnabled?: boolean
}) => {
  const isVirtual = (m as any).isVirtualGroup;
  const groupedIds = isVirtual ? ((m as any).groupedItems || []).map((g: any) => g.id) : [m.id];
  const inCartItems = items.filter((i) => groupedIds.includes(i.id) || (!isVirtual && i.id.startsWith(`${m.id}-`)));
  const totalQtyInCart = inCartItems.reduce((acc, i) => acc + i.qty, 0);
  const lastInCartItem = inCartItems[inCartItems.length - 1];

  return (
    <div
      onClick={async () => addToCart(m)}
      className={`group relative border rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-200 bg-[var(--kravy-surface)] flex flex-col
        hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]
        ${totalQtyInCart > 0
          ? "border-[var(--kravy-brand)] shadow-md shadow-indigo-500/10"
          : "border-[var(--kravy-border)] hover:border-[var(--kravy-brand)]"
        }`}
    >
      <div
        className="relative w-full bg-[var(--kravy-bg)] overflow-hidden flex-shrink-0 border-b border-[var(--kravy-border)]/50"
        style={{ height: "90px" }}
      >
        {m.imageUrl && (
          <img
            src={m.imageUrl}
            alt={m.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        {totalQtyInCart > 0 && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white
            text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/40
            border border-white/20 z-10">
            ×{totalQtyInCart}
          </div>
        )}
        {totalQtyInCart > 0 && (
          <button
            onClick={async (e) => { e.stopPropagation(); if (lastInCartItem) reduceFromCart(lastInCartItem.id); }}
            className="absolute top-2 right-2 bg-rose-500 text-white
              w-6 h-6 rounded-full flex items-center justify-center
              text-sm font-black hover:bg-rose-600 shadow-lg shadow-rose-500/40
              border border-white/20 transition-all hover:scale-110 z-10"
          >
            −
          </button>
        )}
      </div>

      <div className="p-2.5 md:p-3 flex flex-col gap-1.5 flex-shrink-0">
        <div className={`w-[14px] h-[14px] border-[1.5px] rounded-sm flex items-center justify-center ${m.isVeg && !m.name.includes("(NV)") && !m.name.toLowerCase().includes("egg") ? "border-green-600" : (m.isEgg || m.name.toLowerCase().includes("egg") || m.name.includes("(E)")) ? "border-amber-500" : "border-red-600"}`}>
            <div className={`w-[6px] h-[6px] rounded-full ${m.isVeg && !m.name.includes("(NV)") && !m.name.toLowerCase().includes("egg") ? "bg-green-600" : (m.isEgg || m.name.toLowerCase().includes("egg") || m.name.includes("(E)")) ? "bg-amber-500" : "bg-red-600"}`} />
        </div>
        <p className={`text-[11px] md:text-xs font-bold leading-snug line-clamp-2 transition-colors
          ${totalQtyInCart > 0 ? "text-[var(--kravy-brand)]" : "text-[var(--kravy-text-primary)] group-hover:text-[var(--kravy-brand)]"}`}>
          {m.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
        </p>
        
        {expiryTrackingEnabled && (m as any).expiryDate && (
          <div className="flex items-center mt-0.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              new Date((m as any).expiryDate) < new Date() 
                ? 'bg-red-100 text-red-600 border border-red-200' 
                : new Date((m as any).expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
            }`}>
              Exp: {new Date((m as any).expiryDate).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs md:text-sm font-black text-emerald-500 whitespace-nowrap">
            ₹{m.price.toFixed(2)}{isVirtual ? "+" : ""}
          </p>
          {m.unit && (
            <p className="text-[9px] uppercase font-black text-[var(--kravy-text-muted)] tracking-wider truncate">
              {m.unit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  const isVirtual = (prev.m as any).isVirtualGroup;
  const groupedIds = isVirtual ? ((prev.m as any).groupedItems || []).map((g: any) => g.id) : [prev.m.id];
  
  const getQty = (items: BillItem[], id: string) => {
    const inCartItems = items.filter((i) => groupedIds.includes(i.id) || (!isVirtual && i.id.startsWith(`${id}-`)));
    return inCartItems.reduce((acc, i) => acc + i.qty, 0);
  };
  
  const prevQty = getQty(prev.items, prev.m.id);
  const nextQty = getQty(next.items, next.m.id);
  
  return prev.m === next.m && 
         prevQty === nextQty && 
         prev.expiryTrackingEnabled === next.expiryTrackingEnabled;
});

const QuickAddCard = ({ cat, onClick }: { cat: { id: string, name: string }, onClick: () => void }) => {
  return (
    <div
      onClick={async (e) => { e.stopPropagation(); onClick(); }}
      className="group relative border-2 border-dashed border-[var(--kravy-border)] rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-200 bg-[var(--kravy-bg-2)]/50 flex flex-col items-center justify-center gap-2
        hover:border-[var(--kravy-brand)] hover:bg-[var(--kravy-brand)]/5 hover:shadow-lg active:scale-[0.97] h-full min-h-[140px]"
    >
       <div className="w-10 h-10 rounded-full bg-[var(--kravy-brand)]/10 flex items-center justify-center group-hover:bg-[var(--kravy-brand)] group-hover:text-white transition-all">
          <span className="text-xl font-black">+</span>
       </div>
       <div className="text-center px-2">
         <p className="text-[10px] font-black text-[var(--kravy-text-primary)] uppercase tracking-wider">Quick Add</p>
         <p className="text-[9px] font-bold text-[var(--kravy-text-muted)] group-hover:text-[var(--kravy-brand)]">to {cat.name}</p>
       </div>
    </div>
  );
};

const QuickAddAddonChip = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={async (e) => { e.stopPropagation(); onClick(); }}
      className="flex items-center gap-2 px-4 py-1.5 border border-dashed border-indigo-300 dark:border-indigo-700 
        bg-indigo-50/20 dark:bg-indigo-900/10 rounded-full text-indigo-400 dark:text-indigo-600
        hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95"
    >
       <Plus size={12} strokeWidth={3} />
       <span className="text-[10px] font-black uppercase tracking-wider">Add new addon</span>
    </button>
  );
};

/* ================= PAGE ================= */

export default function CheckoutClient() {
  const { confirm } = useConfirm();
  /* ================= BUSINESS PROFILE ================= */
  const [business, setBusiness] = useState<{
    businessName: string;
    businessTagLine?: string;
    gstNumber?: string;
    businessAddress?: string;
    district?: string;
    state?: string;
    pinCode?: string;
    upi?: string;
    logoUrl?: string;
    taxEnabled?: boolean;
    taxInclusive?: boolean;
    taxRate?: number;
    upiQrEnabled?: boolean;
    fssaiNumber?: string;
    fssaiEnabled?: boolean;
    hsnEnabled?: boolean;
    perProductTaxEnabled?: boolean;
    collectCustomerName?: boolean;
    requireCustomerName?: boolean;
    collectCustomerPhone?: boolean;
    requireCustomerPhone?: boolean;
    collectCustomerAddress?: boolean;
    requireCustomerAddress?: boolean;
    enableKOTWithBill?: boolean;
    enableMenuQRInBill?: boolean;
    enableDeliveryCharges?: boolean;
    deliveryChargeAmount?: number;
    deliveryGstEnabled?: boolean;
    deliveryGstRate?: number;
    enablePackagingCharges?: boolean;
    packagingChargeAmount?: number;
    packagingGstEnabled?: boolean;
    packagingGstRate?: number;
    lastTokenNumber?: number;
    userId?: string;
    id?: string;
    syncQuickPosWithKitchen?: boolean;
    multiZoneMenuEnabled?: boolean;
    posCashEnabled?: boolean;
    posUpiEnabled?: boolean;
    posCardEnabled?: boolean;
    posHoldEnabled?: boolean;
    posSaveEnabled?: boolean;
    posPreviewEnabled?: boolean;
    posKotEnabled?: boolean;
    posCounterEnabled?: boolean;
    posWalletEnabled?: boolean;
    greetingMessage?: string;
    contactPersonPhone?: string;
    contactPhone?: string;
    businessPhone?: string;
    businessAddressSize?: number;
    tokenNumberSize?: number;
    businessNameSize?: number;
    phonePrefixType?: string;
    printSettings?: any;
    zones?: string[];
    expiryTrackingEnabled?: boolean;
    loyaltyValueInRupees?: number;
    enableLoyaltyProgram?: boolean;
    loyaltyPointRatio?: number;
  } | null>({
    businessName: "Kravy POS",
    taxEnabled: true,
    taxRate: 5.0,
    posCashEnabled: true,
    posUpiEnabled: true,
    posCardEnabled: true,
    posHoldEnabled: true,
    posSaveEnabled: true,
    posPreviewEnabled: true,
    posKotEnabled: true
  });

  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [enableMultipleProfiles, setEnableMultipleProfiles] = useState(false);

  const applyBusinessProfile = (data: any) => {
    if (!data) return;
    setBusiness({
      id: data.id,
      businessName: data.businessName,
      businessTagLine: data.businessTagLine,
      gstNumber: data.gstNumber,
      businessAddress: data.businessAddress,
      district: data.district,
      state: data.state,
      pinCode: data.pinCode,
      upi: data.upi,
      logoUrl: data.logoUrl,
      taxEnabled: data.taxEnabled ?? true,
      taxInclusive: data.taxInclusive ?? false,
      taxRate: data.taxRate ?? 5.0,
      fssaiNumber: data.fssaiNumber,
      fssaiEnabled: data.fssaiEnabled ?? false,
      perProductTaxEnabled: data.perProductTaxEnabled ?? false,
      collectCustomerName: data.collectCustomerName ?? true,
      requireCustomerName: data.requireCustomerName ?? false,
      collectCustomerPhone: data.collectCustomerPhone ?? true,
      requireCustomerPhone: data.requireCustomerPhone ?? false,
      collectCustomerAddress: data.collectCustomerAddress ?? false,
      requireCustomerAddress: data.requireCustomerAddress ?? false,
      enableKOTWithBill: data.enableKOTWithBill ?? false,
      enableMenuQRInBill: data.enableMenuQRInBill ?? false,
      enableDeliveryCharges: data.enableDeliveryCharges ?? false,
      deliveryChargeAmount: data.deliveryChargeAmount ?? 0,
      deliveryGstEnabled: data.deliveryGstEnabled ?? false,
      deliveryGstRate: data.deliveryGstRate ?? 0,
      enablePackagingCharges: data.enablePackagingCharges ?? false,
      packagingChargeAmount: data.packagingChargeAmount ?? 0,
      packagingGstEnabled: data.packagingGstEnabled ?? false,
      packagingGstRate: data.packagingGstRate ?? 0,
      lastTokenNumber: data.lastTokenNumber ?? 0,
      userId: data.userId,
      syncQuickPosWithKitchen: data.syncQuickPosWithKitchen ?? false,
      posCashEnabled: data.posCashEnabled ?? true,
      posUpiEnabled: data.posUpiEnabled ?? true,
      posCardEnabled: data.posCardEnabled ?? true,
      posCounterEnabled: data.posCounterEnabled ?? true,
      posWalletEnabled: data.posWalletEnabled ?? true,
      posHoldEnabled: data.posHoldEnabled ?? true,
      posSaveEnabled: data.posSaveEnabled ?? true,
      posPreviewEnabled: data.posPreviewEnabled ?? true,
      posKotEnabled: data.posKotEnabled ?? true,
      expiryTrackingEnabled: data.expiryTrackingEnabled ?? false,
      multiZoneMenuEnabled: data.multiZoneMenuEnabled ?? false,
      greetingMessage: data.greetingMessage,
      contactPersonPhone: data.contactPersonPhone,
      contactPhone: data.contactPhone,
      businessPhone: data.businessPhone,
      businessAddressSize: data.businessAddressSize,
      tokenNumberSize: data.tokenNumberSize,
      businessNameSize: data.businessNameSize,
      phonePrefixType: data.phonePrefixType || "TEXT",
      printSettings: data.printSettings,
      zones: data.zones || [],
      loyaltyValueInRupees: data.loyaltyValueInRupees ?? 1,
      enableLoyaltyProgram: data.enableLoyaltyProgram !== false,
      loyaltyPointRatio: data.loyaltyPointRatio ?? 10
    });
  };

  /* ================= CATEGORY + SEARCH ================= */
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeZone, setActiveZone] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryLayout, setCategoryLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [catSearch, setCatSearch] = useState("");

  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; sortOrder?: number | null; zones?: string[] }[]>([]);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const [addonGroups, setAddonGroups] = useState<any[]>([]);

  // Zone Manager State
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [editingZone, setEditingZone] = useState<{old: string, new: string} | null>(null);
  const [isZoneLoading, setIsZoneLoading] = useState(false);

  // 🎙️ Voice Assistant / Voice Billing State & Functions
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const toggleVoiceBilling = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice Speech API is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      toast.info("🎙️ Voice billing stopped");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        kravy.click();
        toast.success("🎙️ Voice Billing Active! Speak items (e.g. 2 Burger, 1 Coke)");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);

        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const finalPhrase = lastResult[0].transcript.trim();
          handleVoiceSearchItemAdd(finalPhrase);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Voice Recognition Error:", event.error);
        if (event.error !== "no-speech") {
          setIsListening(false);
          toast.error("Voice recognition error: " + event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      toast.error("Failed to start voice listener");
      setIsListening(false);
    }
  };

  // 🤖 AI Fuzzy & Phonetic Matcher (Levenshtein Distance + Phonetic Consonant Matcher)
  const getFuzzySimilarity = (s1: string, s2: string): number => {
    if (!s1 || !s2) return 0;
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.85;

    // Phonetic consonant compression (e.g. "barger" vs "burger" -> "brgr" vs "brgr")
    const phonA = a.replace(/[aeiouhwy]/gi, "");
    const phonB = b.replace(/[aeiouhwy]/gi, "");
    if (phonA && phonB && (phonA === phonB || phonA.includes(phonB) || phonB.includes(phonA))) {
      return 0.8;
    }

    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    const distance = dp[m][n];
    const maxLen = Math.max(m, n);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  };

  const handleVoiceSearchItemAdd = (phrase: string) => {
    if (!phrase || phrase.trim().length === 0) return;

    console.log("🎙️ Voice Phrase:", phrase);

    // Split multi-item speech like "2 burger, 1 cold coffee" or "do burger aur teen coke"
    const segments = phrase.split(/(?:,|\band\b|\baur\b|\bphir\b|\bplus\b|\n)+/gi);
    let itemsAddedCount = 0;

    segments.forEach((segment) => {
      let text = segment.toLowerCase().trim();
      if (!text) return;

      let qty = 1;
      let cleanText = text;

      const numMatch = text.match(/^(\d+|\bek\b|\bdo\b|\bteen\b|\bchaar\b|\bchar\b|\bpaanch\b|\bpanch\b|\bchhe\b|\bsaat\b|\baath\b|\bnau\b|\bdas\b|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bsix\b|\bseven\b|\beight\b|\bnine\b|\bten\b)/i);
      
      if (numMatch) {
        const word = numMatch[1].toLowerCase();
        if (word === "ek" || word === "one") qty = 1;
        else if (word === "do" || word === "two") qty = 2;
        else if (word === "teen" || word === "three") qty = 3;
        else if (word === "chaar" || word === "char" || word === "four") qty = 4;
        else if (word === "paanch" || word === "panch" || word === "five") qty = 5;
        else if (word === "chhe" || word === "che" || word === "six") qty = 6;
        else if (word === "saat" || word === "sat" || word === "seven") qty = 7;
        else if (word === "aath" || word === "eight") qty = 8;
        else if (word === "nau" || word === "nine") qty = 9;
        else if (word === "das" || word === "ten") qty = 10;
        else qty = parseInt(word, 10) || 1;

        cleanText = text.replace(numMatch[0], "").trim();
      }

      cleanText = cleanText.replace(/\b(chahiye|add|karo|daal|do|with|please|item|pieces|pcs|plate|plates)\b/gi, "").trim();

      if (!cleanText) return;

      // 1. Direct / Exact / Substring Match
      let matchedItem = menuItems.find((i) => {
        const itemName = i.name.toLowerCase();
        const shortCode = i.shortCode ? String(i.shortCode).toLowerCase() : "";
        const hiName = (i as any).hiName ? String((i as any).hiName).toLowerCase() : "";

        return (
          itemName === cleanText ||
          shortCode === cleanText ||
          (hiName && hiName === cleanText) ||
          itemName.includes(cleanText) ||
          cleanText.includes(itemName)
        );
      });

      // 2. 🤖 AI Fuzzy Phonetic Matcher (for mispronounced words e.g. "barger", "piza", "cofi")
      if (!matchedItem) {
        let bestScore = 0;
        let bestCandidate: any = null;

        menuItems.forEach((i) => {
          const scoreName = getFuzzySimilarity(cleanText, i.name);
          const scoreHi = (i as any).hiName ? getFuzzySimilarity(cleanText, (i as any).hiName) : 0;
          const maxScore = Math.max(scoreName, scoreHi);

          if (maxScore > bestScore) {
            bestScore = maxScore;
            bestCandidate = i;
          }
        });

        if (bestCandidate && bestScore >= 0.4) {
          matchedItem = bestCandidate;
          console.log(`🎙️ AI Matched "${cleanText}" to "${bestCandidate.name}" (Score: ${(bestScore * 100).toFixed(0)}%)`);
        }
      }

      if (matchedItem) {
        for (let k = 0; k < qty; k++) {
          addToCart(matchedItem);
        }
        itemsAddedCount++;
        toast.success(`🎙️ AI Selected: ${qty}x ${matchedItem.name}`);
      }
    });

    if (itemsAddedCount > 0) {
      kravy.add();
      setSearchQuery("");
      setVoiceTranscript("");
    }
  };

  // Load layout preference
  useEffect(() => {
    const saved = localStorage.getItem('pos_category_layout');
    if (saved === 'vertical' || saved === 'horizontal') {
      setCategoryLayout(saved);
    }
  }, []);

  // Save layout preference
  useEffect(() => {
    localStorage.setItem('pos_category_layout', categoryLayout);
  }, [categoryLayout]);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const kotRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeBillId = searchParams.get("resumeBillId");
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [syncedOrderId, setSyncedOrderId] = useState<string | null>(null);

  /* ================= HELD BILLS & PREVIEW STATE ================= */
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [heldBillsLoading, setHeldBillsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSavedBillId, setLastSavedBillId] = useState<string | null>(null);
  const { user: authUser } = useAuthContext();
  const menuCacheKey = `kravy_menu_${business?.userId || authUser?.businessId || authUser?.id || "default"}`;
  const userRole = authUser?.type || null;
  const userPermissions = authUser?.permissions || [];
  
  const [previewZoom, setPreviewZoom] = useState(1);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [quickAddCat, setQuickAddCat] = useState<{ id: string, name: string } | null>(null);
  const [quickAddAddonGroup, setQuickAddAddonGroup] = useState<any | null>(null);
  const [quickAddTaxStatus, setQuickAddTaxStatus] = useState("Without Tax");
  const [quickAddGst, setQuickAddGst] = useState(0);
  const [quickAddVariantsStr, setQuickAddVariantsStr] = useState("");

  // Variant Modal State
  const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<{ [groupId: string]: any[] }>({});
  const [showAddCategory, setShowAddCategory] = useState(false);

  /* ================= PARTIES (CUSTOMERS) STATE ================= */
  const [parties, setParties] = useState<any[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const customerSectionRef = useRef<HTMLDivElement>(null);
  const checkoutSidebarRef = useRef<HTMLDivElement>(null);

  /* ================= TABLES STATE ================= */
  const { tablesList: tables } = useTerminalContext();
  const [selectedTable, setSelectedTable] = useState<string>("POS");
  const [orderType, setOrderType] = useState<"DINING" | "TAKEAWAY" | "DELIVERY">("TAKEAWAY");
  const [showTableSelect, setShowTableSelect] = useState(false);
  const [manualDeliveryCharge, setManualDeliveryCharge] = useState<number>(0);
  const [deliveryChargeType, setDeliveryChargeType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [manualPackagingCharge, setManualPackagingCharge] = useState<number>(0);
  const [packagingChargeType, setPackagingChargeType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [serviceChargeType, setServiceChargeType] = useState<'FLAT' | 'PERCENT'>('FLAT');

  const resetForm = async () => {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setOrderNotes("");
    setSelectedParty(null);
    setUpiTxnRef("");
    setAmountPaid("");
    setPaymentMode("None");
    setPaymentStatus("Pending");
    setBuyerGSTIN("");
    setPlaceOfSupply("");
    setAppliedOffer(null);
    setDiscountCode("");
    setDiscountAmt(0);
    setIsKotPrinted(false);
    setTokenNumber(null);
    tokenNumberRef.current = null;
    setKotNumbers([]);
    kotNumbersRef.current = [];
    idempotencyKeyRef.current = uuidv4();
    setServiceCharge(0);
    setServiceChargeType('FLAT');
    setManualDeliveryCharge(0);
    setDeliveryChargeType('FLAT');
    setManualPackagingCharge(0);
    setPackagingChargeType('FLAT');
    setSelectedTable("POS");
    setOrderType("TAKEAWAY");
    
    // Generate new bill number for next session
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    setBillNumber(`INV/${dateStr}-${rand}`);
    setBillDate(now.toLocaleString());
    setSyncedOrderId(null);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideSuggestions = suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node);
      const isOutsideCustomerSection = customerSectionRef.current && !customerSectionRef.current.contains(event.target as Node);
      const isOutsideSidebar = checkoutSidebarRef.current && !checkoutSidebarRef.current.contains(event.target as Node);
      
      if (isOutsideSuggestions) {
        setCustomerSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchParties() {
    try {
      const res = await fetch("/api/parties");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.parties || []);
        const normalized = arr.map((p: any) => ({
          ...p,
          id: p.id || p._id
        }));
        setParties(normalized);
      }
    } catch (e) {
      console.error("Failed to fetch parties:", e);
    }
  }

  async function fetchHeldBills() {
    try {
      setHeldBillsLoading(true);
      const res = await fetch("/api/bill-manager?isHeld=true", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const onlyHeld = (data.bills || []).filter((b: any) => b.isHeld);
        setHeldBills(onlyHeld);
      }
    } catch (err) {
      console.error("Fetch held bills error", err);
    } finally {
      setHeldBillsLoading(false);
    }
  }

  useEffect(() => { 
    fetchHeldBills();
    fetchParties();
  }, []);

  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [tokenNumber, setTokenNumber] = useState<number | null>(null);
  const tokenNumberRef = useRef<number | null>(null);
  const [kotNumbers, setKotNumbers] = useState<number[]>([]);
  const kotNumbersRef = useRef<number[]>([]);
  const idempotencyKeyRef = useRef<string>(uuidv4());
  const { setOrders } = useTerminalContext();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 🏷️ COMPACT INVOICE NUMBER (Max 16 chars for GST Compliance)
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}${ (now.getMonth() + 1).toString().padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    setBillNumber(`INV/${dateStr}-${rand}`); 
    setBillDate(new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '|').replace(',', ' -'));
  }, []);

  const [prevWalletBalance, setPrevWalletBalance] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // Consolidated initialization fetch with Caching
  useEffect(() => {
    async function initPos() {
      // 1. Try to load from Cache first for instant UI
      const cachedMenu =
        localStorage.getItem(menuCacheKey) ||
        localStorage.getItem("kravy_menu_default") ||
        Object.keys(localStorage)
          .find((key) => key.startsWith("kravy_menu_") && localStorage.getItem(key))
          ?.split("\n")
          .map((key) => localStorage.getItem(key))[0] ||
        null;

      if (cachedMenu) {
        try {
          const parsed = JSON.parse(cachedMenu);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMenuItems(parsed);
            
            // Auto-derive categories from cache so they show immediately
            const initialCats: any[] = [];
            parsed.forEach((it: any) => {
              if (it.category && !initialCats.find((c: any) => c.id === it.category.id)) {
                initialCats.push({ id: it.category.id, name: it.category.name, sortOrder: it.category.sortOrder || null });
              }
            });
            setCategoriesList(initialCats);
            
            setMenuLoading(false); // Hide spinner immediately
          }
        } catch (e) { console.error("Cache parse error", e); }
      }

      try {
        // 2. Parallel fetch for latest data
        const fetchOpts = { cache: "no-store" as const, credentials: "include" as const };
        const [itemsRes, catsRes, addonsRes] = await Promise.all([
          fetch(`/api/menu/items?t=${Date.now()}`, fetchOpts),
          fetch(`/api/categories?t=${Date.now()}`, fetchOpts),
          fetch(`/api/menu-editor/addon-groups?t=${Date.now()}`, fetchOpts)
        ]);

        let finalItems: MenuItem[] = [];

        // Process items
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          const mapped = normalizeMenuItems(data || []);
          finalItems = mapped;
          setMenuItems(mapped);
          
          // Save to cache for next time
          localStorage.setItem(menuCacheKey, JSON.stringify(mapped));

          // Auto-derive categories
          setCategoriesList(prev => {
             const newList = [...prev];
             mapped.forEach((it: any) => {
               if (it.category && !newList.find(c => c.id === it.category.id)) {
                 newList.push({ id: it.category.id, name: it.category.name, sortOrder: it.category.sortOrder || null });
               }
             });
             return newList;
          });
        }

        // Process categories
        if (catsRes.ok) {
          const data = await catsRes.json();
          setCategoriesList(prev => {
            const merged = [...prev];
            data.forEach((c: any) => {
              const existing = merged.find(m => m.id === c.id);
              if (existing) {
                existing.sortOrder = c.sortOrder;
              } else {
                merged.push(c);
              }
            });
            return merged.sort((a, b) => {
              if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
              if (a.sortOrder != null) return -1;
              if (b.sortOrder != null) return 1;
              return (a.name || "").localeCompare(b.name || "");
            });
          });
        }

        // Process addons
        if (addonsRes.ok) {
          const data = await addonsRes.json();
          setAddonGroups(data || []);
        }

      } catch (err) {
        console.error("POS INIT ERROR:", err);
      } finally {
        setMenuLoading(false);
      }
    }
    initPos();
  }, [menuCacheKey]);

  // Compute available zones
  useEffect(() => {
    const itemZones = menuItems.flatMap(i => i.zones || []).filter(Boolean);
    const uniqueZones = Array.from(new Set([...itemZones, ...(business?.zones || [])]));
    setAvailableZones(uniqueZones.sort());
  }, [menuItems, business?.zones]);

  useEffect(() => {
    if (!resumeBillId) return;
    async function loadHeldBill() {
      try {
        const res = await fetch(`/api/bill-manager/${resumeBillId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const bill = data.bill ?? data;
        setActiveBillId(bill.id);
        const isMathematicallyExclusive = bill.tax > 0 && bill.total > 0 && Math.abs(bill.total - (bill.subtotal + bill.tax + (bill.deliveryCharges || 0) + (bill.packagingCharges || 0) + (bill.serviceCharge || 0))) < 0.5;
        
        setItems(bill.items.map((i: any) => ({ 
          id: i.id || i.itemId || i._id || `item-${Math.random().toString(36).substr(2, 9)}`, 
          itemId: i.itemId || i.id,
          name: i.name, 
          qty: Number(i.qty) || Number(i.quantity) || 1, 
          printedQty: Number(i.printedQty) || Number(i.qty) || Number(i.quantity) || 0,
          isNew: false,
          rate: Number(i.rate) || Number(i.price) || 0,
          gst: i.gst,
          hsnCode: i.hsnCode,
          taxStatus: isMathematicallyExclusive ? "Without Tax" : (i.taxStatus || "Without Tax"),
          kotNumber: i.kotNumber,
          addedAt: i.addedAt
        })));
        setCustomerName(bill.customerName || "");
        setCustomerPhone(bill.customerPhone || "");
        if (bill.paymentMode && bill.paymentMode.startsWith("Split (")) {
          setPaymentMode("Split");
          const mStr = bill.paymentMode;
          const c = mStr.match(/Cash:\s*₹([\d.]+)/);
          const u = mStr.match(/UPI:\s*₹([\d.]+)/);
          const cd = mStr.match(/Card:\s*₹([\d.]+)/);
          const w = mStr.match(/Wallet:\s*₹([\d.]+)/);
          if (c) setSplitCash(Number(c[1]));
          if (u) setSplitUpi(Number(u[1]));
          if (cd) setSplitCard(Number(cd[1]));
          if (w) setSplitWallet(Number(w[1]));
        } else {
          setPaymentMode(bill.paymentMode || "Cash");
        }
        setPaymentStatus(bill.paymentStatus);
        
        // Exact restoration of amount paid
        if (bill.amountPaid !== undefined && bill.amountPaid !== null) {
          setAmountPaid(bill.amountPaid);
        } else {
          setAmountPaid(0); // Show 0 instead of defaulting to full total
        }
        
        setUpiTxnRef(bill.upiTxnRef || "");
        setBuyerGSTIN(bill.buyerGSTIN || "");
        setPlaceOfSupply(bill.placeOfSupply || "");
        const table = bill.tableName || "POS";
        setSelectedTable(table);
        if (table === "TAKEAWAY") setOrderType("TAKEAWAY");
        else if (table === "DELIVERY") setOrderType("DELIVERY");
        else setOrderType("TAKEAWAY");
        setOrderNotes(bill.notes || bill.auditNote || "");
        setServiceCharge(bill.serviceCharge || 0);
        setManualDeliveryCharge(bill.deliveryCharges || 0);
        setManualPackagingCharge(bill.packagingCharges || 0);
      } catch (err) {
        console.error("RESUME BILL ERROR:", err);
      }
    }
    loadHeldBill();
  }, [resumeBillId]);

  useEffect(() => {
    const tableId = searchParams.get("tableId");
    const tableName = searchParams.get("tableName");
    const orderId = searchParams.get("orderId");
    const returnTo = searchParams.get("returnTo");

    if (tableName) {
      setSelectedTable(tableName);
      setOrderType("TAKEAWAY");
    }

    if (orderId) {
      async function loadActiveOrder() {
        // ✅ Instant Edit Handoff: Check for cached order first
        const cachedStr = sessionStorage.getItem("quick_pos_handoff_order");
        if (cachedStr) {
          try {
            const cachedOrder = JSON.parse(cachedStr);
            if (cachedOrder.id === orderId) {
              setSyncedOrderId(cachedOrder.id);
              setItems(cachedOrder.items.map((i: any) => ({
                id: i.itemId || i.id || i._id || `item-${Math.random().toString(36).substr(2, 9)}`,
                itemId: i.itemId || i.id,
                name: i.name,
                qty: Number(i.quantity || i.qty || 0),
                printedQty: Number(i.quantity || i.qty || 0),
                rate: Number(i.price || i.rate || 0),
                gst: i.gst,
                taxStatus: i.taxStatus || "Without Tax",
                isNew: false,
                kotNumber: i.kotNumber,
                addedAt: i.addedAt
              })));
              setCustomerName(cachedOrder.customerName || "");
              setCustomerPhone(cachedOrder.customerPhone || "");
              setOrderNotes(cachedOrder.notes || "");
              setTokenNumber(cachedOrder.tokenNumber || null);
              tokenNumberRef.current = cachedOrder.tokenNumber || null;
              const tkList1 = cachedOrder.kotNumbers || (cachedOrder.tokenNumber ? [cachedOrder.tokenNumber] : []);
              setKotNumbers(tkList1);
              kotNumbersRef.current = tkList1;
              
              // Clean up to avoid stale data on next visit
              sessionStorage.removeItem("quick_pos_handoff_order");
            }
          } catch (e) { console.error("Cache parse error", e); }
        }

        try {
          const res = await fetch(`/api/orders/${orderId}`);
          if (!res.ok) return;
          const data = await res.json();
          const order = data.order;
          if (!order) return;
          
          setSyncedOrderId(order.id);
          const isMathematicallyExclusive = order.tax > 0 && order.total > 0 && Math.abs(order.total - (order.subtotal + order.tax + (order.deliveryCharges || 0) + (order.packagingCharges || 0) + (order.serviceCharge || 0))) < 0.5;
          
          setItems(order.items.map((i: any) => ({
            id: i.itemId || i.id || i._id || `item-${Math.random().toString(36).substr(2, 9)}`,
            itemId: i.itemId || i.id,
            name: i.name,
            qty: Number(i.quantity || i.qty || 0),
            printedQty: Number(i.quantity || i.qty || 0),
            rate: Number(i.price || i.rate || 0),
            gst: i.gst,
            taxStatus: isMathematicallyExclusive ? "Without Tax" : (i.taxStatus || "Without Tax"),
            isNew: false,
            kotNumber: i.kotNumber,
            addedAt: i.addedAt
          })));
          setCustomerName(order.customerName || "");
          setCustomerPhone(order.customerPhone || "");
          setOrderNotes(order.notes || "");
          setTokenNumber(order.tokenNumber || null);
          tokenNumberRef.current = order.tokenNumber || null;
          const tkList2 = order.kotNumbers || (order.tokenNumber ? [order.tokenNumber] : []);
          setKotNumbers(tkList2);
          kotNumbersRef.current = tkList2;
        } catch (err) {
          console.error("LOAD ORDER ERROR:", err);
        }
      }
      loadActiveOrder();
    }
  }, [searchParams]);

  // Sync activeZone with selectedTable's zone
  useEffect(() => {
    if (business?.multiZoneMenuEnabled && selectedTable && tables.length > 0) {
      if (["POS", "TAKEAWAY", "DELIVERY"].includes(selectedTable)) {
        // Use localStorage default if available for direct visits
        const savedDefault = localStorage.getItem('kravy_default_zone');
        if (savedDefault && availableZones.includes(savedDefault)) {
          if (activeZone !== savedDefault) setActiveZone(savedDefault);
        } else if (activeZone !== "All") {
          setActiveZone("All");
        }
      } else {
        const tableObj = tables.find(t => t.name === selectedTable);
        const tZone = tableObj?.zone;
        if (tZone && tZone.toUpperCase() !== "DEFAULT" && activeZone === "All") {
          setActiveZone(tZone);
        }
      }
    }
  }, [selectedTable, tables, business?.multiZoneMenuEnabled]);

  // Show all categories in the current zone
  const categories = useMemo(() => {
    let validCats = [...categoriesList];
    
    // Fallback: if categoriesList is empty but we have items, derive from items
    if (validCats.length === 0 && menuItems.length > 0) {
      const dynamicCats = new Map();
      menuItems.forEach(i => {
        if (i.category?.name && !dynamicCats.has(i.category.name)) {
          dynamicCats.set(i.category.name, { name: i.category.name, sortOrder: i.category.sortOrder || null });
        }
      });
      validCats = Array.from(dynamicCats.values());
    }
    
    // Sort logic
    validCats.sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return (a.sortOrder as number) - (b.sortOrder as number);
      if (a.sortOrder != null) return -1;
      if (b.sortOrder != null) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    const cats = Array.from(new Set(validCats.map(c => c.name))).filter(Boolean);
    
    // Only keep categories that have at least one active item in the current zone
    // OR if the category itself has the current zone explicitly selected
    const activeCats = cats.filter(catName => {
      // ✅ Global Zone: Always show all categories
      if (activeZone === "All") return true;

      const catObj = validCats.find(c => c.name === catName);
      if (catObj?.zones?.includes(activeZone)) {
        return true;
      }
      return menuItems.some(i => 
        i.isActive !== false && 
        i.category?.name === catName &&
        (activeZone === "All" || i.zones?.includes(activeZone))
      );
    });

    const hasUncategorised = menuItems.some(i => 
      !i.category?.name &&
      i.isActive !== false &&
      (activeZone === "All" || i.zones?.includes(activeZone))
    );
    
    if (hasUncategorised && !activeCats.includes("Uncategorised")) {
      activeCats.push("Uncategorised");
    }
    
    return activeCats;
  }, [categoriesList, activeZone, menuItems]);

  const filteredMenuItems = useMemo(() => {
    const rawFiltered = menuItems
      .filter((i) => i.isActive !== false) // 🛡️ Filter Offline Items
      .filter((i) => (activeCategory === "All" || searchQuery.trim() !== "") ? true : i.category?.name === activeCategory)
      .filter((i) => i.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || (i.shortCode && String(i.shortCode).toLowerCase().includes(searchQuery.trim().toLowerCase())))
      .filter((i) => {
        if (activeZone !== "All") {
          return i.zones?.includes(activeZone);
        }

        // If activeZone is "All" (Global), show all items!
        return true;
      });

    // 🚀 Apply Virtual Grouping for items with parenthetical variants (e.g. Small, Medium, Large, Half, Full)
    const enableVirtualGroupVariants = (business as any)?.enableVirtualGroupVariants !== false && (business as any)?.printSettings?.enableVirtualGroupVariants !== false;
    if (!enableVirtualGroupVariants) {
      return rawFiltered;
    }

    const grouped: Record<string, MenuItem[]> = {};
    rawFiltered.forEach(it => {
        let baseName = it.name;
        let cleanedName = it.name.replace(/\s*\((V|NV|Egg|R)\)\s*/gi, " ").trim();
        const suffixMatch = cleanedName.match(/\s*\(([^)]+)\)\s*$/i);
        if (suffixMatch) {
            baseName = cleanedName.substring(0, suffixMatch.index).trim();
        }
        if (!grouped[baseName]) grouped[baseName] = [];
        grouped[baseName].push(it);
    });

    const finalItems: MenuItem[] = [];
    Object.entries(grouped).forEach(([baseName, group]) => {
        const hasVariant = group.some(i => i.name.trim() !== baseName.trim());
        
        if (group.length === 1 && !hasVariant) {
            finalItems.push(group[0]);
        } else {
            const minPrice = Math.min(...group.map(i => Number(i.price) || 0));
            const virtualVariants = [{
                id: 'virtual_group',
                groupName: 'Size / Portion',
                type: 'radio',
                required: true,
                options: group.map(i => {
                    let cleanedName = i.name.replace(/\s*\((V|NV|Egg|R)\)\s*/gi, " ").trim();
                    const match = cleanedName.match(/\(([^)]+)\)\s*$/)?.[1] || cleanedName;
                    let niceName = match.trim();
                    if (niceName.toUpperCase() === 'F' || niceName.toUpperCase() === 'FULL') niceName = 'Full Portion';
                    if (niceName.toUpperCase() === 'H' || niceName.toUpperCase() === 'HALF') niceName = 'Half Portion';
                    if (niceName.toUpperCase() === 'S' || niceName.toUpperCase() === 'SMALL') niceName = 'Small';
                    if (niceName.toUpperCase() === 'R' || niceName.toUpperCase() === 'REGULAR') niceName = 'Regular';
                    if (niceName.toUpperCase() === 'M' || niceName.toUpperCase() === 'MEDIUM') niceName = 'Medium';
                    if (niceName.toUpperCase() === 'L' || niceName.toUpperCase() === 'LARGE') niceName = 'Large';
                    
                    return {
                        id: i.id,
                        name: niceName,
                        price: Number(i.price) || 0,
                        originalId: i.id,
                        imageUrl: i.imageUrl || null,
                        gst: i.gst,
                        hsnCode: i.hsnCode,
                        taxStatus: i.taxStatus,
                        fullName: i.name
                    };
                })
            }];
            finalItems.push({
                ...group[0],
                id: "virtual_" + baseName,
                name: baseName,
                price: minPrice,
                variants: virtualVariants,
                isVirtualGroup: true,
                groupedItems: group
            } as any);
        }
    });

    return finalItems;
  }, [menuItems, activeCategory, searchQuery, business, selectedTable, tables, activeZone]);

  /* ================= CART ================= */
  function addToCart(item: MenuItem) {
    if (searchQuery) setSearchQuery(""); // 🚀 Auto-clear search/shortcode input on item add/select

    const itemAddons = addonGroups.filter(ag => (ag.itemIds || []).includes(item.id));
    const hasVariants = item.variants && Array.isArray(item.variants) && item.variants.length > 0;
    const hasAddons = itemAddons.length > 0;

    if (hasVariants || hasAddons) {
      // Normalize variants if they are in the old/app format
      let normalizedVariants = item.variants || [];
      if (hasVariants) {
        const isAppFormat = normalizedVariants.some((v: any) => !v.options);
        if (isAppFormat) {
          normalizedVariants = [
            {
              id: 'legacy_app_group',
              groupName: 'Options',
              type: 'radio',
              required: false,
              options: normalizedVariants.map((v: any, i: number) => ({
                id: v.id || `opt_${i}`,
                name: v.name || v.groupName || `Option ${i+1}`,
                price: v.price || 0
              }))
            }
          ];
        }
      }

      setVariantModalItem({ ...item, variants: normalizedVariants, addons: itemAddons } as any);
      setSelectedVariants({});
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        kravy.click(); // item already in cart — just increase qty
        return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1, isNew: (i.qty + 1) > (i.printedQty || 0) } : i);
      }
      kravy.add(); // new item added — bigger pop sound
      return [...prev, { 
        id: item.id, 
        itemId: item.id,
        name: item.name, 
        qty: 1, 
        printedQty: 0,
        rate: item.price,
        gst: item.gst ?? null,
        hsnCode: item.hsnCode || "",
        taxStatus: item.taxStatus || "Without Tax",
        isNew: true
      }];
    });
  }

  const handleBarcodeScan = (code: string) => {
      console.log("[Barcode Scanner] Scanned raw code:", code, "Length:", code.length);
      
      const item = menuItems.find(m => {
          const invMatch = m.inventoryCode && m.inventoryCode.toUpperCase() === code.toUpperCase();
          const idMatch = m.id && m.id.toUpperCase().endsWith(code.toUpperCase());
          const barcodeMatch = (m as any).barcode && (m as any).barcode.toUpperCase() === code.toUpperCase();
          return invMatch || idMatch || barcodeMatch;
      });

      if (!item) {
          console.error("[Barcode Scanner] Item not found. Scanned:", code, "Available items snippet:", menuItems.slice(0, 3).map(m => ({ id: m.id, inv: m.inventoryCode, barcode: (m as any).barcode })));
          toast.error(`Item not found for barcode: "${code}"`);
          kravy.error();
          return;
        }

      addToCart(item);
      toast.success(`Added ${item.name} via barcode scanner`);
  };

  useBarcodeScanner({ onScan: handleBarcodeScan });

  function confirmVariantAddToCart() {
    if (!variantModalItem) return;
    
    // validate required variants
    const variantsList = variantModalItem.variants || [];
    for (let vgIndex = 0; vgIndex < variantsList.length; vgIndex++) {
        const vg = variantsList[vgIndex];
        if (vg.required) {
            const vgId = vg.id || vg.groupName || `group_${vgIndex}`;
            const sel = selectedVariants[vgId];
            if (!sel || sel.length === 0) {
                toast.error(`Please select an option for ${vg.groupName || vg.name || "this group"}`);
                return;
            }
        }
    }

    // validate addons
    const addonsList = (variantModalItem as any).addons || [];
    for (const ag of addonsList) {
        const minSel = ag.minSelection || ag.minSelections || (ag.isCompulsory ? 1 : 0);
        if (minSel > 0) {
            const sel = selectedVariants[`ag_${ag.id}`] || [];
            if (sel.length < minSel) {
                toast.error(`Please select at least ${minSel} option(s) for ${ag.name}`);
                return;
            }
        }
    }

    // calculate additional price and form the variant string
    let additionalPrice = 0;
    let addonsPrice = 0;
    let variantDescParts: string[] = [];
    let selectedOptObj: any = null;

    Object.entries(selectedVariants).forEach(([key, opts]) => {
        opts.forEach(opt => {
            if (key.startsWith('ag_')) {
                addonsPrice += Number(opt.price || 0);
            } else {
                additionalPrice += Number(opt.price || 0);
                selectedOptObj = opt;
            }
            variantDescParts.push(opt.name);
        });
    });

    const isVirtual = (variantModalItem as any).isVirtualGroup;
    let itemToAddId = `${variantModalItem.id}-${variantDescParts.sort().join("-")}`;
    let itemToAddName = variantModalItem.name + (variantDescParts.length > 0 ? ` (${variantDescParts.join(", ")})` : "");
    let itemRate = (additionalPrice > 0 ? additionalPrice : (variantModalItem.price || 0)) + addonsPrice;
    let itemGst = variantModalItem.gst ?? null;
    let itemHsn = variantModalItem.hsnCode || "";
    let itemTaxStatus = variantModalItem.taxStatus || "Without Tax";

    if (isVirtual && selectedOptObj) {
      itemToAddId = selectedOptObj.originalId || selectedOptObj.id || variantModalItem.id;
      itemToAddName = selectedOptObj.fullName || itemToAddName;
      itemRate = Number(selectedOptObj.price) || itemRate;
      if (selectedOptObj.gst !== undefined) itemGst = selectedOptObj.gst;
      if (selectedOptObj.hsnCode !== undefined) itemHsn = selectedOptObj.hsnCode;
      if (selectedOptObj.taxStatus !== undefined) itemTaxStatus = selectedOptObj.taxStatus;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === itemToAddId);
      if (existing) {
        kravy.click();
        return prev.map((i) => i.id === itemToAddId ? { ...i, qty: i.qty + 1, isNew: (i.qty + 1) > (i.printedQty || 0) } : i);
      }
      kravy.add();
      return [...prev, { 
        id: itemToAddId, 
        itemId: isVirtual && selectedOptObj ? (selectedOptObj.originalId || selectedOptObj.id || variantModalItem.id) : variantModalItem.id,
        name: itemToAddName, 
        qty: 1, 
        printedQty: 0,
        rate: itemRate,
        gst: itemGst,
        hsnCode: itemHsn,
        taxStatus: itemTaxStatus,
        isNew: true
      }];
    });

    setVariantModalItem(null);
  }

  function reduceFromCart(itemId: string) {
    setItems((prev) => {
      const current = prev.find(i => i.id === itemId);
      if (current && current.qty <= 1) kravy.trash(); // last one removed
      else kravy.remove(); // qty decreased
      return prev.map((i) => i.id === itemId ? { ...i, qty: i.qty - 1, isNew: (i.qty - 1) > (i.printedQty || 0) } : i).filter((i) => i.qty > 0);
    });
  }

  function addAddonToCart(addon: any, groupName: string, catContext?: string) {
    kravy.add();
    const fullName = catContext 
      ? `${addon.name} (${groupName} - ${catContext})`
      : `${addon.name} (${groupName})`;
    
    setItems((prev) => {
      const existing = prev.find(i => i.name === fullName);
      if (existing) {
        return prev.map(i => i.name === fullName ? { ...i, qty: i.qty + 1, isNew: (i.qty + 1) > (i.printedQty || 0) } : i);
      }
      return [
        ...prev,
        {
          id: `addon-${Math.random().toString(36).substr(2, 9)}`,
          name: fullName,
          qty: 1,
          rate: addon.price || 0,
          gst: null,
          hsnCode: "",
          taxStatus: "Without Tax"
        }
      ];
    });
    toast.success(`Added ${addon.name}`);
  }

  function reduceAddonFromCart(addonName: string, groupName: string, catContext?: string) {
    const fullName = catContext 
      ? `${addonName} (${groupName} - ${catContext})`
      : `${addonName} (${groupName})`;
      
    setItems((prev) => {
      const existing = prev.find(i => i.name === fullName);
      if (!existing) return prev;
      
      if (existing.qty <= 1) {
        kravy.trash();
        return prev.filter(i => i.name !== fullName);
      } else {
        kravy.remove();
        return prev.map(i => i.name === fullName ? { ...i, qty: i.qty - 1, isNew: (i.qty - 1) > (i.printedQty || 0) } : i);
      }
    });
  }

  /* ================= CUSTOMER ================= */
  const [showCustomer, setShowCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isKotPrinted, setIsKotPrinted] = useState(false);
  const [buyerGSTIN, setBuyerGSTIN] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const handleCustomerPhoneChange = (val: string) => {
    setCustomerPhone(val);
    setSelectedParty(null); // Clear selected party if manual edit
    if (val.length >= 3) {
      const filtered = parties.filter(p => 
        p.phone.includes(val) || 
        p.name.toLowerCase().includes(val.toLowerCase()) ||
        p.address?.toLowerCase().includes(val.toLowerCase())
      );
      setCustomerSuggestions(filtered.slice(0, 5));
      
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
         try {
           const res = await fetch(`/api/parties?search=${encodeURIComponent(val)}`);
           if (res.ok) {
              const data = await res.json();
              setCustomerSuggestions(prev => {
                 const merged = [...prev];
                 data.forEach((p: any) => {
                    if (!merged.find(m => m.id === p.id)) merged.push(p);
                 });
                 return merged.slice(0, 5);
              });
           }
         } catch(e) {}
      }, 500);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    setSelectedParty(null); // Clear selected party if manual edit
    if (val.length >= 2) {
      const filtered = parties.filter(p => 
        p.name.toLowerCase().includes(val.toLowerCase()) || 
        p.phone.includes(val) ||
        p.address?.toLowerCase().includes(val.toLowerCase())
      );
      setCustomerSuggestions(filtered.slice(0, 5));
      
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
         try {
           const res = await fetch(`/api/parties?search=${encodeURIComponent(val)}`);
           if (res.ok) {
              const data = await res.json();
              setCustomerSuggestions(prev => {
                 const merged = [...prev];
                 data.forEach((p: any) => {
                    if (!merged.find(m => m.id === p.id)) merged.push(p);
                 });
                 return merged.slice(0, 5);
              });
           }
         } catch(e) {}
      }, 500);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const selectCustomer = (p: any) => {
    setCustomerName(p.name);
    setCustomerPhone(p.phone || "");
    setCustomerAddress(p.address || "");
    setSelectedParty(p);
    setCustomerSuggestions([]);
    kravy.success();
    toast.success(`Customer ${p.name} selected`, {
      description: "Details auto-filled instantly",
      duration: 2000
    });
  };

  /* ================= CART STATE ================= */
  const [items, setItems] = useState<BillItem[]>([]);
  const inc = (id: string) => { kravy.click(); setItems((s) => s.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)); };
  const dec = (id: string) => { 
    const item = items.find(i => i.id === id);
    if (item && item.qty === 1 && userRole === "STAFF" && !userPermissions.includes("pos-delete-item")) {
      toast.error("Permission Denied: Cannot delete item from cart.");
      return;
    }
    kravy.remove(); 
    setItems((s) => s.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0)); 
  };
  const remove = (id: string) => { 
    if (userRole === "STAFF" && !userPermissions.includes("pos-delete-item")) {
      toast.error("Permission Denied: Cannot delete item from cart.");
      return;
    }
    kravy.trash(); 
    setItems((s) => s.filter((i) => i.id !== id)); 
  };
  const updateQty = (id: string, newQty: number | string) => {
    if (userRole === "STAFF" && !userPermissions.includes("pos-delete-item") && (newQty === 0 || newQty === "")) {
      toast.error("Permission Denied: Cannot delete item from cart.");
      return;
    }
    kravy.click();
    setItems((s) => s.map((i) => i.id === id ? { ...i, qty: newQty as any } : i));
  };
  const updateRate = (id: string, newRate: number) => {
    if (userRole === "STAFF" && !userPermissions.includes("pos-discount")) {
      toast.error("Permission Denied: Cannot change item price.");
      return;
    }
    kravy.click();
    setItems((s) => s.map((i) => i.id === id ? { ...i, rate: newRate, price: newRate, isCustomRate: true } : i));
  };



  console.log("DEBUG POS RENDER - business.enableKOTWithBill:", business?.enableKOTWithBill);

  useEffect(() => {
    async function fetchBusinessProfile() {
      try {
        const res = await fetch(`/api/profiles?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const result = await res.json();
        
        setEnableMultipleProfiles(result.enableMultipleProfiles || false);
        setAvailableProfiles(result.profiles || []);
        
        if (result.profiles && result.profiles.length > 0) {
          applyBusinessProfile(result.profiles[0]);
        }
      } catch (err) {
        console.error("Fetch profile error", err);
      }
    }
    fetchBusinessProfile();

    const handleFocus = () => fetchBusinessProfile();
    // window.addEventListener("focus", handleFocus);
    // return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleDeposit = async (amount: number) => {
    if (isSaving) return;
    if (!selectedParty) {
      console.warn("[WALLET] No customer selected for deposit");
      return;
    }
    setIsSaving(true);
    console.log("[WALLET] Starting Deposit:", { amount, partyId: selectedParty.id, partyName: selectedParty.name });
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deposit",
          partyId: selectedParty.id,
          amount,
          description: "Pos Deposit"
        })
      });
      console.log("[WALLET] API Response Status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("[WALLET] Success Data:", data);
        toast.success(`₹${amount} added successfully!`, {
          description: `New balance: ₹${data.balance.toFixed(2)}`
        });
        setSelectedParty({ ...selectedParty, walletBalance: data.balance });
        // update main list
        setParties(pts => pts.map(p => (p.id === selectedParty.id || p._id === selectedParty.id) ? { ...p, walletBalance: data.balance } : p));
      } else {
        const errData = await res.json();
        console.error("[WALLET] API Error:", errData);
        toast.error("Failed to deposit money");
      }
    } catch (err) {
      console.error("[WALLET] Network/Catch Error:", err);
      toast.error("Network error during deposit");
    } finally {
      setIsSaving(false);
    }
  };

  /* ================= TOTALS ================= */
  const taxActive = business?.taxEnabled ?? true;
  const perProductEnabled = business?.perProductTaxEnabled ?? false;
  const globalTaxInclusive = business?.taxInclusive ?? false;
  const globalRate = business?.taxRate ?? 5.0;

  // 1. Calculate Gross Subtotal
  const subtotal = Number(items.reduce((a, i) => a + (i.qty * i.rate), 0).toFixed(2));
  
  // 🎟️ DISCOUNT LOGIC (Moved up to be available for tax calculation)
  const [discountCode, setDiscountCode] = useState("");
  const [appliedOffer, setAppliedOffer] = useState<any>(null);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [customDiscountValue, setCustomDiscountValue] = useState(""); 
  const [customDiscountType, setCustomDiscountType] = useState<'PERCENT' | 'FLAT'>('FLAT');
  const [discountMode, setDiscountMode] = useState<'PROMO' | 'INSTANT' | 'CHARGES'>('PROMO');

  // Recalculate discount whenever items or applied offer change
  useEffect(() => {
    if (appliedOffer) {
      const d = calculateDiscount(appliedOffer, subtotal, items);
      setDiscountAmt(d);
    } else if (customDiscountValue) {
      const val = parseFloat(customDiscountValue) || 0;
      if (customDiscountType === 'PERCENT') {
        const d = (subtotal * val) / 100;
        setDiscountAmt(d);
      } else {
        setDiscountAmt(val);
      }
    } else {
      setDiscountAmt(0);
    }
  }, [items, subtotal, appliedOffer, customDiscountValue, customDiscountType]);

  // 2. Net Taxable Amount after Discount
  const netSubtotal = subtotal - discountAmt;
  const discountRatio = subtotal > 0 ? netSubtotal / subtotal : 1;

  const taxGroups = items.reduce((acc: any, item) => {
    // 🥇 PRIORITY LOGIC: Product GST > Default GST
    let rate = 0;
    if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
      rate = item.gst;
    } else if (taxActive) {
      rate = globalRate;
    }
    
    // Apply pro-rata discount to item gross before tax calculation
    const gross = (item.qty * item.rate) * discountRatio;
    let taxable = gross;
    let gst = 0;

    let isInclusive = false;
    if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
      isInclusive = item.taxStatus === "With Tax";
    } else if (taxActive) {
      isInclusive = globalTaxInclusive;
    }

    if (isInclusive) {
      taxable = gross / (1 + rate / 100);
      gst = gross - taxable;
    } else {
      taxable = gross;
      gst = (gross * rate) / 100;
    }

    const isInterState = placeOfSupply && business?.state && 
      placeOfSupply.trim().toLowerCase() !== business.state.trim().toLowerCase();

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

  const taxBreakup = Object.values(taxGroups).map((g: any) => ({
    rate: g.rate,
    taxable: Number(g.taxable.toFixed(2)),
    cgst: Number(g.cgst.toFixed(2)),
    sgst: Number(g.sgst.toFixed(2)),
    igst: Number((g.igst || 0).toFixed(2)),
    totalTax: Number(g.totalTax.toFixed(2))
  }));

  const totalTaxable = Number(taxBreakup.reduce((a, b) => a + b.taxable, 0).toFixed(2));
  const totalGst = Number(taxBreakup.reduce((a, b) => a + b.totalTax, 0).toFixed(2));
  
  const handleApplyCoupon = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await fetch(`/api/discounts`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.offers || []).find((o: any) => o.code === discountCode.toUpperCase() && o.isActive);
        
        if (!found) {
          toast.error("Invalid or expired coupon code");
          return;
        }

        if (found.minOrderValue && subtotal < found.minOrderValue) {
          toast.error(`Minimum order of ₹${found.minOrderValue} required`);
          return;
        }

        setAppliedOffer(found);
        toast.success(`Coupon ${found.code} applied!`);
      }
    } catch (err) {
      toast.error("Failed to verify coupon");
    }
  };

  const removeCoupon = async () => {
    setAppliedOffer(null);
    setDiscountCode("");
    setDiscountAmt(0);
  };

  // Additional Charges Calculation with Percentage Support
  const rawDelivery = manualDeliveryCharge || ((orderType === "DELIVERY" && business?.enableDeliveryCharges) ? (business?.deliveryChargeAmount || 0) : 0);
  const deliveryCharge = (manualDeliveryCharge > 0 && deliveryChargeType === 'PERCENT') ? (totalTaxable * manualDeliveryCharge / 100) : rawDelivery;
  const deliveryGst = (deliveryCharge > 0 && business?.deliveryGstEnabled) ? (deliveryCharge * (business?.deliveryGstRate || 0) / 100) : 0;
 
  const rawPackaging = manualPackagingCharge || (((orderType === "DELIVERY" || orderType === "TAKEAWAY") && business?.enablePackagingCharges) ? (business?.packagingChargeAmount || 0) : 0);
  const packagingCharge = (manualPackagingCharge > 0 && packagingChargeType === 'PERCENT') ? (totalTaxable * manualPackagingCharge / 100) : rawPackaging;
  const packagingGst = (packagingCharge > 0 && business?.packagingGstEnabled) ? (packagingCharge * (business?.packagingGstRate || 0) / 100) : 0;
  
  const finalServiceCharge = (serviceCharge > 0 && serviceChargeType === 'PERCENT') ? (totalTaxable * serviceCharge / 100) : serviceCharge;

  const totalCharges = deliveryCharge + packagingCharge + finalServiceCharge;
  const totalChargesGst = deliveryGst + packagingGst;

  // Final total is now simply net taxable + GST + additional charges + tax on charges
  const finalTotal = Number((totalTaxable + totalGst + totalCharges + totalChargesGst).toFixed(2));
  const gstAmount = Number((totalGst + totalChargesGst).toFixed(2));
  
  // 🛡️ SMART AUDIT LOG: Detect if default was used
  const hasAuditNotes = items.some(i => perProductEnabled && (i.gst === undefined || i.gst === null || i.gst === 0));
  const auditNote = hasAuditNotes ? "Some items used global default tax rate." : null;

  /* ================= PAYMENT STATE ================= */
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card" | "Pay on Counter" | "Wallet" | "Split">("Cash");
  const [splitCash, setSplitCash] = useState<number | "">("");
  const [splitUpi, setSplitUpi] = useState<number | "">("");
  const [splitCard, setSplitCard] = useState<number | "">("");
  const [splitWallet, setSplitWallet] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] = useState<"Pending" | "Paid">("Paid");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [upiTxnRef, setUpiTxnRef] = useState("");

  /* ================= UPI ================= */
  const UPI_ID = business?.upi || "";
  const UPI_NAME = business?.businessName || "Store";
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${finalTotal.toFixed(2)}&cu=INR`;
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (UPI_ID) {
      getQRCodeDataUrl(upiLink, { width: 220 }).then(setQrUrl);
    } else {
      setQrUrl("");
    }
  }, [UPI_ID, UPI_NAME, finalTotal]);

  useEffect(() => {
    if (paymentMode === "Cash" || paymentMode === "Card" || paymentMode === "Pay on Counter") setPaymentStatus("Paid");
  }, [paymentMode]);

  /* ================= DELETE CONFIRM MODAL ================= */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resumeConfirmId, setResumeConfirmId] = useState<string | null>(null);

  /* ================= SAVE BILL ================= */
  async function saveBill(isHeld: boolean = false, onValidationSuccess?: () => void) {
    if (isSaving) return null;
    if (items.length === 0) { toast.error("No items to save"); return null; }
    
    // 🔥 INSTANT OPTIMISTIC UI: Only block if not doing background save
    if (!onValidationSuccess) {
        setIsSaving(true);
    }
    try {
      const finalAmountPaid = amountPaid === "" ? finalTotal : Number(amountPaid);
      const balanceDue = Math.max(0, finalTotal - finalAmountPaid);

      // Removed restriction: Customer selection is no longer compulsory for partial payments.

      // 🛡️ GST VALIDATION SYSTEM
      if (buyerGSTIN) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(buyerGSTIN)) {
          toast.error("Invalid Buyer GSTIN Format", { description: "Expected 15 chars, e.g. 07AAAAA0000A1Z5" });
          setIsSaving(false);
          return null;
        }
      }

      // Recalculate discount ratio for validation
      const validationDiscountRatio = subtotal > 0 ? (subtotal - discountAmt) / subtotal : 1;

      // Recalculation Check (Compare UI result with calculated result)
      let reCalcGst = items.reduce((sum, item) => {
        let rate = 0;
        let isInclusive = false;
        
        if (perProductEnabled && item.gst !== undefined && item.gst !== null) {
          rate = item.gst;
          isInclusive = item.taxStatus === "With Tax";
        } else if (taxActive) {
          rate = globalRate;
          isInclusive = globalTaxInclusive;
        }

        // Important: Apply discount ratio here as well
        const gross = (item.qty * item.rate) * validationDiscountRatio;
        if (isInclusive) return sum + (gross - (gross / (1 + rate / 100)));
        return sum + ((gross * rate) / 100);
      }, 0);

      // ✅ ADDED: Include charges GST in recalculation
      reCalcGst += (deliveryGst + packagingGst);

      if ((taxActive || perProductEnabled) && Math.abs(reCalcGst - gstAmount) > 1) { // Increased tolerance to 1 for rounding
        toast.error("Safety Check: GST Calculation Mismatch!", { description: `System: ₹${gstAmount.toFixed(2)}, Calculated: ₹${reCalcGst.toFixed(2)}` });
        setIsSaving(false);
        return null;
      }

      // 👛 WALLET PAYMENT LOGIC
      let effectivePaymentMode: string = paymentMode;

      if (paymentMode === "Split") {
        const c = Number(splitCash) || 0;
        const u = Number(splitUpi) || 0;
        const cd = Number(splitCard) || 0;
        const w = Number(splitWallet) || 0;

        const parts = [];
        if (c > 0) parts.push(`Cash: ₹${c.toFixed(2)}`);
        if (u > 0) parts.push(`UPI: ₹${u.toFixed(2)}`);
        if (cd > 0) parts.push(`Card: ₹${cd.toFixed(2)}`);
        if (w > 0) parts.push(`Wallet: ₹${w.toFixed(2)}`);

        effectivePaymentMode = parts.length > 0 ? `Split (${parts.join(", ")})` : "Split";

        if (w > 0) {
          if (!selectedParty) {
            toast.error("Please select a registered customer to use Wallet split payment.");
            setIsSaving(false);
            return null;
          }
          if ((selectedParty.walletBalance || 0) < w) {
            toast.error("Insufficient Wallet Balance for split!", { description: `Required: ₹${w.toFixed(2)} | Available: ₹${(selectedParty.walletBalance || 0).toFixed(2)}`, duration: 5000 });
            setIsSaving(false);
            return null;
          }

          try {
            const walletRes = await fetch("/api/wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "payment",
                partyId: selectedParty.id,
                amount: w,
                description: `Split Wallet Payment for Bill ${billNumber}`
              })
            });
            const wData = await walletRes.json();
            if (!walletRes.ok) {
              toast.error(wData.error || "Wallet split deduction failed");
              setIsSaving(false);
              return null;
            }
            if (wData.success) {
              setSelectedParty({ ...selectedParty, walletBalance: wData.balance });
            }
          } catch (err) {
            toast.error("Wallet system connection error");
            setIsSaving(false);
            return null;
          }
        }
      } else if (paymentMode === "Wallet") {
        if (!selectedParty) {
          toast.error("Please select a registered customer to use Wallet payment.");
          setIsSaving(false);
          return null;
        }
        if ((selectedParty.walletBalance || 0) < finalAmountPaid) {
          toast.error("Insufficient Wallet Balance!", { description: `Required: ₹${finalAmountPaid.toFixed(2)} | Available: ₹${(selectedParty.walletBalance || 0).toFixed(2)}`, duration: 5000, style: { border: '1px solid #ef4444', backgroundColor: '#fef2f2' } });
          setIsSaving(false);
          return null;
        }

        try {
          // Only make a payment deduction if they are actually paying an amount greater than 0
          if (finalAmountPaid > 0) {
            const walletRes = await fetch("/api/wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "payment",
                partyId: selectedParty.id,
                amount: finalAmountPaid,
                description: `Payment for Bill ${billNumber}`
              })
            });

            const wData = await walletRes.json();

            if (!walletRes.ok) {
              toast.error(wData.error || "Wallet deduction failed");
              setIsSaving(false);
              return null;
            }
            
            // Update local state balance
            if (wData.success) {
              setSelectedParty({ ...selectedParty, walletBalance: wData.balance });
            }
          }
        } catch (err) {
          toast.error("Wallet system connection error");
          setIsSaving(false);
          return null;
        }
      }

      const payload = {
        items: items.map(i => ({
          ...i,
          // 🛡️ Snapshot: If global tax is active and item has no specific GST, lock the current global rate
          gst: (i.gst === undefined || i.gst === null) ? (taxActive ? globalRate : 0) : i.gst
        })), 
        subtotal: Number(totalTaxable.toFixed(2)), 
        tax: Number(totalGst.toFixed(2)), 
        deliveryCharges: deliveryCharge,
        deliveryGst: deliveryGst,
        packagingCharges: packagingCharge,
        packagingGst: packagingGst,
        total: finalTotal,
        paymentMode: effectivePaymentMode, 
        paymentStatus: isHeld ? "HELD" : paymentStatus,
        upiTxnRef: paymentMode === "UPI" ? upiTxnRef : null,
        isHeld, customerName: customerName || "Walk-in Customer",
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        notes: orderNotes,
        auditNote: orderNotes, // Fallback for schema compatibility
        isKotPrinted: isKotPrinted === true,
        tableName: selectedTable,
        zoneName: selectedTable !== "POS" ? tables.find(t => t.name === selectedTable)?.zone : null,
        buyerGSTIN: buyerGSTIN || null,
        placeOfSupply: placeOfSupply || null,
        discountAmount: discountAmt,
        discountCode: appliedOffer?.code || null,
        deliveryCharges: deliveryCharge,
        packagingCharges: packagingCharge,
        serviceCharge: finalServiceCharge,
        kotNumbers: kotNumbersRef.current,
        tokenNumber: tokenNumberRef.current,
        profileId: business?.id,
        amountPaid: finalAmountPaid,
        idempotencyKey: idempotencyKeyRef.current,
      };

      const url = resumeBillId ? `/api/bill-manager/${resumeBillId}` : "/api/bill-manager";
      const method = resumeBillId ? "PUT" : "POST";
      
      // OPTIMISTIC UI: Clear form only after all validations pass, right before fetch
      if (onValidationSuccess) onValidationSuccess();
      
      const tApiStart = performance.now();
      console.log(`🚀 [PERF] 1. Sending ${method} ${url} request...`);

      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload),
        keepalive: true // Guaranteed delivery even on print reload
      });
      const tFetchEnd = performance.now();
      console.log(`⚡ [PERF] 2a. Fetch response received in ${(tFetchEnd - tApiStart).toFixed(2)} ms`);

      if (!res.ok) { 
        const err = await res.json(); 
        toast.error(err.error || "Failed to save bill"); 
        setIsSaving(false);
        return null; 
      }
      const data = await res.json();
      const tJsonEnd = performance.now();
      console.log(`⚡ [PERF] 2b. response.json() parsed in ${(tJsonEnd - tFetchEnd).toFixed(2)} ms`);
      // Refresh parties to include any new customer
      fetchParties();
      const savedBill = data.bill ?? data;
      if (Array.isArray(savedBill?.items)) {
        const serverItems = savedBill.items.map((i: any) => ({
          id: i.id || i.itemId || i._id || `item-${Math.random().toString(36).substr(2, 9)}`,
          itemId: i.itemId || i.id,
          name: i.name,
          qty: i.qty,
          rate: i.rate,
          gst: i.gst,
          hsnCode: i.hsnCode,
          taxStatus: i.taxStatus || "Without Tax",
          kotNumber: i.kotNumber,
          addedAt: i.addedAt,
        }));
        const pricesChanged = serverItems.some((serverItem: BillItem) => {
          const localItem = items.find((item) => item.id === serverItem.id);
          return localItem && localItem.rate !== serverItem.rate;
        });

        if (pricesChanged && !onValidationSuccess) {
          setItems(serverItems);
          toast.info("Latest menu price applied before saving");
        }
      }
      if (savedBill?.id && !onValidationSuccess) setLastSavedBillId(savedBill.id);
      if (savedBill?.billNumber && !onValidationSuccess) setBillNumber(savedBill.billNumber);
      if (savedBill?.tokenNumber) {
        setBusiness(prev => prev ? { ...prev, lastTokenNumber: savedBill.tokenNumber, lastBillNumber: savedBill.billNumber } : prev);
        
        // Prevent state pollution for the next bill if we optimistically cleared the form
        if (!onValidationSuccess) {
            setTokenNumber(savedBill.tokenNumber);
            tokenNumberRef.current = savedBill.tokenNumber;
        }
      }

      // ✅ COMPETE LINKED ORDER (Prevent Duplicates in History)
      if (syncedOrderId) {
        void fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: syncedOrderId, status: "COMPLETED", skipInventoryDeduction: true })
        }).catch((compErr) => {
          console.error("[ORDER_PATCH_BACKGROUND_ERROR] Failed to complete linked order:", compErr);
        });
      }
      
      setIsSaving(false);
      return savedBill;
    } catch (err) {
      console.error("Save bill error", err);
      toast.error("Something went wrong");
      setIsSaving(false);
      return null;
    }
  }

  /* ================= DELETE HELD BILL ================= */
  async function deleteHeldBill(id: string) {
    try {
      const res = await fetch(`/api/bill-manager/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Held bill deleted successfully");
        if (resumeBillId === id) {
          router.replace("/dashboard/billing/checkout");
          resetForm();
        }
        return true;
      } else { 
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete bill"); 
        return false; 
      }
    } catch (err) {
      console.error("Delete bill error", err);
      toast.error("Error deleting held bill");
      return false;
    }
  }

  function printReceipt(forceBoth = false, customBill?: any, onComplete?: () => void) {
    console.log("[CHECKOUT_PRINT_DEBUG] printReceipt called. forceBoth:", forceBoth, "customBill:", !!customBill);
    if (!receiptRef.current) { toast.error("Nothing to print"); if (onComplete) onComplete(); return; }
    
    // SYNCHRONOUS DOM UPDATE (Bypasses React's delayed re-rendering for huge orders)
    if (customBill) {
        const tokenContainer = receiptRef.current.querySelector('.bill-token-container') as HTMLElement;
        const tokenDisplay = receiptRef.current.querySelector('.bill-token-display');
        console.log("[CHECKOUT_PRINT_DEBUG] tokenContainer found:", !!tokenContainer, "tokenDisplay found:", !!tokenDisplay);
        if (tokenDisplay) {
            const kt = customBill.kotNumbers || [];
            const tNum = customBill.tokenNumber;
            tokenDisplay.innerHTML = kt.length > 0 ? kt.join(', ') : `#${tNum || "---"}`;
            if (tokenContainer) {
                tokenContainer.style.display = 'block';
                console.log("[CHECKOUT_PRINT_DEBUG] tokenContainer display set to block");
            }
        }
        const numberDisplay = receiptRef.current.querySelector('.bill-number-display');
        if (numberDisplay && customBill.billNumber) {
            numberDisplay.innerHTML = `No: ${customBill.billNumber}`;
        }
    }

    const billHtml = receiptRef.current.innerHTML;
    const kotHtml = kotRef.current?.innerHTML || "";

    const isKOTEnabled = forceBoth;
    console.log("PRINT TRIGGERED - KOT:", isKOTEnabled);

    const ps = (business as any)?.printSettings || {};
    const spoolerDelay = ps.spoolerDelay !== undefined && ps.spoolerDelay !== null ? Number(ps.spoolerDelay) : 0;

    if (isKOTEnabled && kotHtml) {
      let finalKotHtml = kotHtml;
      const tNum = customBill?.tokenNumber || tokenNumber;
      if (tNum) {
        finalKotHtml = finalKotHtml.replace(/#KOT_PLACEHOLDER/g, `#${tNum}`);
        finalKotHtml = finalKotHtml.replace(/#---/g, `#${tNum}`);
      }
      // KOT Print
      if (spoolerDelay > 0) {
        runPrintJob("kot", finalKotHtml, () => {
          setTimeout(() => {
            runPrintJob("bill", billHtml, onComplete);
          }, spoolerDelay);
        });
      } else {
        const combinedHtml = `
            <div class="kot-container-dynamic text-black bg-white">
                ${finalKotHtml}
            </div>
            <div style="page-break-after: always; height: 10px;"></div>
            <div class="receipt-container-dynamic text-black bg-white" style="margin-top: 10px;">
                ${billHtml}
            </div>
        `;
        runPrintJob("bill", combinedHtml, onComplete);
      }
    } else {
      runPrintJob("bill", billHtml, onComplete);
    }
  }


  const printActualBill = async () => {
    if (receiptRef.current) runPrintJob("bill", receiptRef.current.innerHTML);
  };

  const printKOT = (htmlOverride?: string | null | (() => void), callback?: () => void) => {
    let html = typeof htmlOverride === "string" ? htmlOverride : null;
    let cb = typeof htmlOverride === "function" ? htmlOverride : callback;
    if (html) runPrintJob("kot", html, cb);
    else if (kotRef.current) runPrintJob("kot", kotRef.current.innerHTML, cb);
  };

  // ✅ BACKGROUND SYNC QUEUE
  const syncOrderToBackend = async (orderData: any, tokenNumber: number, orderNumber: string) => {
    try {
      const payload = {
        ...orderData,
        reservedTokenNumber: tokenNumber,
        reservedOrderNumber: orderNumber
      };

      const res = await fetch("/api/orders", {
        method: orderData.orderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Sync failed");
      
      const data = await res.json();
      
      // Update state post-sync if needed
      if (data.id) {
        setSyncedOrderId(data.id);
        if (!orderData.orderId) {
            router.replace(`/dashboard/billing/checkout?orderId=${data.id}`, { scroll: false });
        }
      }
      return data;
    } catch (error) {
      console.error("BACKGROUND SYNC ERROR:", error);
      // Save to localStorage recovery queue
      const queue = JSON.parse(localStorage.getItem("kravy_failed_orders") || "[]");
      queue.push({
        payload: { ...orderData, reservedTokenNumber: tokenNumber, reservedOrderNumber: orderNumber },
        timestamp: Date.now()
      });
      localStorage.setItem("kravy_failed_orders", JSON.stringify(queue));
      toast.error("Order saved locally. Will sync when online.", { duration: 4000 });
      return null;
    }
  };

  const handlePrintKOT = async () => {
    if (isSaving || items.length === 0) return;
    
    console.group("⏱️ [KOT DETAILED BREAKDOWN]");
    const tKOTStart = performance.now();
    console.info("[KOT_TRACE] START");
    
    // 1. CAPTURE KOT HTML BEFORE MODIFYING ANY STATE
    console.info("[KOT_TRACE] DOM_CAPTURE_START");
    const tCapStart = performance.now();
    const htmlToPrint = kotRef.current?.innerHTML;
    console.info(`[KOT_TRACE] DOM_CAPTURE_END: ${(performance.now() - tCapStart).toFixed(2)} ms`);

    setIsSaving(true);

    try {
      kravy.ping();
      setIsKotPrinted(true);

      // 2. RESERVE TOKEN API CALL
      console.info("[KOT_TRACE] RESERVE_TOKEN_START");
      const tReserveStart = performance.now();
      let tokenNumberToUse: number | null = null;
      let orderNumberToUse = "";
      let reserveTokenStatus = "skipped";
      
      const hasNewItems = items.some(it => it.isNew);

      if (!syncedOrderId || hasNewItems) { 
          const reserveRes = await fetch(`/api/orders/reserve-token?profileId=${business?.id || ""}`, { method: "POST" });
          reserveTokenStatus = `HTTP_${reserveRes.status}`;
          if (reserveRes.ok) {
              const resData = await reserveRes.json();
              tokenNumberToUse = resData.tokenNumber;
              orderNumberToUse = resData.orderNumber;
              setTokenNumber(tokenNumberToUse);
              tokenNumberRef.current = tokenNumberToUse;
              
              if (tokenNumberToUse !== null) {
                  setKotNumbers(prev => {
                      const updated = [...prev, tokenNumberToUse as number];
                      kotNumbersRef.current = updated;
                      return updated;
                  });
              }
              setBusiness(prev => prev ? { ...prev, lastTokenNumber: tokenNumberToUse } : prev);
          }
      } else {
          tokenNumberToUse = tokenNumber;
      }
      console.info(`[KOT_TRACE] RESERVE_TOKEN_END: ${(performance.now() - tReserveStart).toFixed(2)} ms`);
      console.info(`[KOT_TRACE] RESERVE_TOKEN_STATUS: ${reserveTokenStatus}`);

      // 3. GENERATE PAYLOAD FOR BACKGROUND SYNC
      console.info("[KOT_TRACE] PAYLOAD_START");
      const tPayloadStart = performance.now();
      const orderData = {
        orderId: syncedOrderId || undefined,
        tableId: selectedTable !== "POS" ? (tables.find(t => t.name === selectedTable)?.id || searchParams.get("tableId")) : null,
        items: items.map(it => ({
          itemId: it.id, 
          name: it.name,
          price: Number(it.rate || 0),
          quantity: Number(it.qty || 0),
          rate: Number(it.rate || 0),
          qty: Number(it.qty || 0),
          addedAt: it.addedAt || new Date().toISOString(),
          taxStatus: it.taxStatus || "Without Tax",
          gst: it.gst ?? 0,
          isNew: !!it.isNew,
          variants: (it as any).variants || [],
          kotNumber: it.isNew ? tokenNumberToUse : ((it as any).kotNumber || tokenNumberToUse)
        })),
        total: Number(finalTotal.toFixed(2)),
        status: "PREPARING",
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        notes: orderNotes,
        isKotPrinted: true,
      };

      // Mark local items as not new so UI updates immediately
      setItems(prev => prev.map(i => ({ ...i, isNew: false, kotNumber: i.isNew ? tokenNumberToUse : (i.kotNumber || tokenNumberToUse) })));
      console.info(`[KOT_TRACE] PAYLOAD_END: ${(performance.now() - tPayloadStart).toFixed(2)} ms`);

      // 4. FIRE AND FORGET BACKGROUND SYNC
      let syncPromise: Promise<any> | null = null;
      if (tokenNumberToUse !== null || syncedOrderId) {
          syncPromise = syncOrderToBackend(orderData, tokenNumberToUse || 0, orderNumberToUse).finally(() => {
              setIsSaving(false);
          });
      } else {
          setIsSaving(false);
      }
      
      // 5. INJECT HTML & PRINT IMMEDIATELY
      if (htmlToPrint) {
        console.info("[KOT_TRACE] REGEX_START");
        const tRegexStart = performance.now();
        let finalHtmlToPrint = htmlToPrint;
        if (tokenNumberToUse) {
          finalHtmlToPrint = finalHtmlToPrint.replace(/#KOT_PLACEHOLDER/g, `#${tokenNumberToUse}`);
          finalHtmlToPrint = finalHtmlToPrint.replace(/#---/g, `#${tokenNumberToUse}`);
        }
        console.info(`[KOT_TRACE] REGEX_END: ${(performance.now() - tRegexStart).toFixed(2)} ms`);

        console.info("[KOT_TRACE] PRINT_START");
        const tPrintStart = performance.now();
        
        // Print Instantly!
        const returnTo = searchParams.get("returnTo");
        printKOT(finalHtmlToPrint, async () => {
          if (returnTo) {
            let finalOrderId = syncedOrderId;
            if (syncPromise) {
               try {
                 const data = await syncPromise;
                 if (data && data.id) finalOrderId = data.id;
               } catch (e) {
                 console.error("Sync promise failed in print callback", e);
               }
            }
            
            const tableId = searchParams.get("tableId");
            const tableName = searchParams.get("tableName");
            
            // OPTIMISTIC UPDATE FOR FLOOR MANAGEMENT
            if (finalOrderId && setOrders) {
               setOrders(prev => {
                   const existing = prev.find(o => o.id === finalOrderId);
                   if (existing) {
                       return prev.map(o => o.id === finalOrderId ? { ...o, items: orderData.items } : o);
                   } else {
                       return [...prev, { id: finalOrderId, ...orderData } as any];
                   }
               });
            }

            const query = new URLSearchParams();
            if (tableId) query.set("tableId", tableId);
            if (tableName) query.set("tableName", tableName);
            if (finalOrderId) query.set("orderId", finalOrderId);
            query.set("refresh", Date.now().toString());

            router.replace(`${returnTo.split('?')[0]}?${query.toString()}`);
          }
        });
        console.info(`[KOT_TRACE] PRINT_END: ${(performance.now() - tPrintStart).toFixed(2)} ms`);
        console.info(`[KOT_TRACE] TOTAL: ${(performance.now() - tKOTStart).toFixed(2)} ms`);
      }
    } catch (error) {
      console.error("KOT Error", error);
      toast.error("Failed to process KOT");
      setIsSaving(false);
    }
  };

  const runPrintJob = (type: "kot" | "bill", html: string, callback?: () => void, tOriginalClick?: number) => {
    const tPrintJobFnStart = performance.now();
    const containerId = `print-container-checkout-${type}`;
    const styleId = `print-style-checkout-${type}`;

    // Clean up ALL previous print styles and containers to prevent conflicting CSS rules
    document.querySelectorAll("[id^='print-container-checkout-']").forEach(el => el.remove());
    document.querySelectorAll("[id^='print-style-checkout-']").forEach(el => el.remove());

    const ps = (business as any)?.printSettings || {};
    const is80 = ps.paperWidth === '80mm';
    const paperWidth = is80 ? '74mm' : '58mm';
    const paperBottomPadding = ps.paperBottomPadding !== undefined && ps.paperBottomPadding !== null ? `${ps.paperBottomPadding}px` : '80px';

    // --- Dynamic Typography Configurations with Thermal Safety Limits ---
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
    const customerDetailsFontSize = getClamped(ps.customerDetailsFontSize, detailsFontSize, 8, 24);
    const itemsFontSize = getClamped(ps.itemsFontSize, 11, 9, 18);
    const totalFontSize = getClamped(ps.totalFontSize, 13, 11, 24);
    const greetingFontSize = getClamped(ps.greetingFontSize, 12, 9, 18);
    
    const kotTokenSize = getClamped(ps.kotTokenSize, 16, 12, 28);
    const kotItemsFontSize = getClamped(ps.kotItemsFontSize, 11, 9, 40);
    const kotQtyFontSize = getClamped(ps.kotQtyFontSize, 14, 10, 40);

    const getAutoShrunkNameSize = () => {
      let size = rawBusinessNameSize;
      const nameLen = (business?.businessName || "").length;
      if (nameLen > 25) size -= 2;
      if (nameLen > 35) size -= 2;
      return Math.max(14, size);
    };
    const finalBusinessNameSize = getAutoShrunkNameSize();

    const getAutoShrunkAddressSize = () => {
      let size = businessAddressSize;
      const addrLen = (business?.businessAddress || "").length;
      if (addrLen > 60) size -= 1;
      if (addrLen > 100) size -= 1;
      return Math.max(8, size);
    };
    const finalAddressSize = getAutoShrunkAddressSize();

    // Create Style
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @media print {
        html, body { 
          height: auto !important; 
          overflow: visible !important; 
          margin: 0 !important;
          padding: 0 !important;
        }
        body > *:not(#${containerId}) { display: none !important; }
        @page { 
          margin: 0; 
          size: ${is80 ? '80mm auto' : 'auto'}; 
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
          color: #000 !important;
          position: relative !important;
          box-sizing: border-box !important;
        }

        /* Inject CSS custom variables to override custom elements correctly */
        #${containerId} .receipt-container-dynamic, #${containerId}.receipt-container-dynamic {
          --r-font-family: ${fontFamilyVal};
          --r-business-size: ${finalBusinessNameSize}px;
          --r-address-size: ${finalAddressSize}px;
          --r-tagline-size: ${taglineSize}px;
          --r-items-size: ${itemsFontSize}px;
          --r-total-size: ${totalFontSize}px;
          --r-token-size: ${receiptTokenSize}px;
          --r-details-size: ${detailsFontSize}px;
          --r-customer-details-size: ${customerDetailsFontSize}px;
          --r-greeting-size: ${greetingFontSize}px;
          font-family: var(--r-font-family) !important;
          font-size: var(--r-details-size) !important;
        }

        #${containerId} .receipt-container-dynamic *, #${containerId}.receipt-container-dynamic * {
          font-family: var(--r-font-family) !important;
        }

        #${containerId} .kot-container-dynamic, #${containerId}.kot-container-dynamic {
          --k-font-family: ${kotFontFamilyVal};
          --k-items-size: ${kotItemsFontSize}px;
          --k-qty-size: ${kotQtyFontSize}px;
          --k-token-size: ${kotTokenSize}px;
          font-family: var(--k-font-family) !important;
          font-size: var(--k-items-size) !important;
        }

        #${containerId} .kot-container-dynamic *, #${containerId}.kot-container-dynamic * {
          font-family: var(--k-font-family) !important;
        }

        ${fontWeightVal ? `
        #${containerId} .receipt-container-dynamic, #${containerId}.receipt-container-dynamic, #${containerId} .receipt-container-dynamic *, #${containerId}.receipt-container-dynamic * {
          font-weight: ${fontWeightVal};
        }
        ` : ''}

        ${kotFontWeightVal ? `
        #${containerId} .kot-container-dynamic, #${containerId}.kot-container-dynamic, #${containerId} .kot-container-dynamic *, #${containerId}.kot-container-dynamic * {
          font-weight: ${kotFontWeightVal};
        }
        ` : ''}

        * { color: #000 !important; border-color: #000 !important; overflow: visible !important;  }
        img { filter: grayscale(100%) contrast(300%) !important; max-width: 100% !important; display: block !important; margin: 0 auto !important; }
      }
    `;
    document.head.appendChild(style);

    // Create Container
    const container = document.createElement("div");
    container.id = containerId;
    container.className = type === "kot"
      ? "kot kot-container kot-container-dynamic text-black bg-white"
      : "receipt receipt-container receipt-container-dynamic text-black bg-white";
    container.innerHTML = html;

    // Add physical bottom spacer for thermal feeds past cutter to prevent jamming
    const spacer = document.createElement("div");
    spacer.style.height = paperBottomPadding;
    spacer.style.minHeight = paperBottomPadding;
    spacer.style.display = "block";
    spacer.style.clear = "both";
    container.appendChild(spacer);

    document.body.appendChild(container);
    
    const tDomPrepEnd = performance.now();
    console.log(`⚡ [PRINT_WINDOW_PERF] 5. Print DOM window creation & insertion: ${(tDomPrepEnd - tPrintJobFnStart).toFixed(2)} ms`);

    if (type === "kot") setIsKotPrinted(true);

    // Dynamic Image Preloader: Ensure all images are 100% loaded before showing the print dialog
    const images = container.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // continue even if an image fails
      });
    });

    const tJobStart = performance.now();
    Promise.all(imagePromises).then(() => {
      const tDomReady = performance.now();
      console.log(`⚡ [PRINT_WINDOW_PERF] 6. Image/font preloader wait: ${(tDomReady - tJobStart).toFixed(2)} ms`);
      
      const timeoutDelay = images.length > 0 ? 150 : 10;
      setTimeout(() => {
        const tPrintTrigger = performance.now();
        console.log(`⚡ [PRINT_WINDOW_PERF] 7. Hidden setTimeout delay before print: ${(tPrintTrigger - tDomReady).toFixed(2)} ms (Configured: ${timeoutDelay}ms)`);
        if (tOriginalClick) {
           console.log(`🔥 [PRINT_WINDOW_PERF] TOTAL TIME FROM USER CLICK TO WINDOW.PRINT(): ${(tPrintTrigger - tOriginalClick).toFixed(2)} ms`);
        }
        console.log(`🖨️ [PERF] 8. Triggering window.print() for '${type}' at:`, new Date().toLocaleTimeString());
        window.print();
        
        // Call callback immediately after print dialog is closed (or returns)
        if (callback) callback();
        
        // Delay cleanup to ensure spooler finishes reading the DOM
        setTimeout(() => {
          if (document.body.contains(container)) container.remove();
          if (document.head.contains(style)) style.remove();
        }, 2500); 
      }, images.length > 0 ? 150 : 10);
    });
  };

  /* ================= QUICK ADD ITEM ================= */
  const handleQuickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quickAddCat) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const description = formData.get("description") as string;
    const imageUrl = formData.get("imageUrl") as string;

    if (!name || !price) {
      toast.error("Name and price are required");
      return;
    }

    let parsedVariants: any[] = [];
    if (quickAddVariantsStr.trim()) {
      const options = quickAddVariantsStr.split(',').map((v, i) => {
         const [name, p] = v.split(':');
         return {
            id: `opt_${Date.now()}_${i}`,
            name: name?.trim() || `Option ${i+1}`,
            price: Number(p) || 0
         };
      });
      parsedVariants.push({
        id: `group_${Date.now()}`,
        groupName: "Size/Variant",
        type: "radio",
        required: true,
        options
      });
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticItem: MenuItem = {
      id: tempId,
      name,
      price: Number(price),
      category: { id: quickAddCat.id, name: quickAddCat.name },
      unit: "pcs",
      description: description || null,
      imageUrl: imageUrl || null,
      variants: parsedVariants
    };

    // 🚀 OPTIMISTIC UPDATE: Update UI immediately
    setMenuItems(prev => [optimisticItem, ...prev]);
    setQuickAddCat(null); // Close modal right away
    setQuickAddTaxStatus("Without Tax");
    setQuickAddGst(0);
    setQuickAddVariantsStr("");
    kravy.success(); // Play sound immediately
    toast.success(`"${name}" adding to ${quickAddCat.name}...`);

    // Fire & Forget (Backend update in background)
    (async () => {
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            price: Number(price),
            categoryId: quickAddCat.id,
            description: description || null,
            imageUrl: imageUrl || null,
            taxStatus: quickAddTaxStatus,
            gst: Number(quickAddGst),
            variants: parsedVariants
          }),
        });

        if (res.ok) {
          const newItem = await res.json();
          // Replace temp item with real item from DB
          setMenuItems(prev => prev.map(it => it.id === tempId ? {
            ...newItem,
            price: Number(newItem.sellingPrice || newItem.price),
            category: { id: quickAddCat.id, name: quickAddCat.name }
          } : it));
        } else {
          // Revert on failure
          setMenuItems(prev => prev.filter(it => it.id !== tempId));
          toast.error(`Failed to save "${name}" formally. Removed from view.`);
        }
      } catch (err) {
        console.error("Optimistic add error:", err);
        setMenuItems(prev => prev.filter(it => it.id !== tempId));
        toast.error(`Connection issue while saving "${name}".`);
      }
    })();
  };

  /* ================= QUICK ADD ADDON ================= */
  const handleQuickAddAddon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quickAddAddonGroup) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const categoryIds = formData.getAll("categoryIds") as string[];

    if (!name || !price) {
      toast.error("Name and price are required");
      return;
    }

    const newAddonItem = {
      id: `it-${Date.now()}`,
      name,
      price: Number(price),
      foodType: "veg",
      categoryIds: categoryIds // Add item-level category mapping
    };

    const currentItems = Array.isArray(quickAddAddonGroup.items) 
      ? quickAddAddonGroup.items 
      : (typeof quickAddAddonGroup.items === 'string' ? JSON.parse(quickAddAddonGroup.items) : []);

    const updatedGroup = {
      ...quickAddAddonGroup,
      items: [...currentItems, newAddonItem]
    };

    setAddonGroups(prev => prev.map(ag => ag.id === quickAddAddonGroup.id ? updatedGroup : ag));
    setQuickAddAddonGroup(null);
    kravy.success();
    toast.success(`"${name}" addon added to ${quickAddAddonGroup.name}`);

    try {
      await fetch(`/api/menu-editor/addon-groups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedGroup)
      });
    } catch (err) {
      console.error("Failed to persist addon:", err);
      toast.error("Cloud sync failed for this addon.");
    }
  };

  const handleQuickAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const zone = formData.get("zone") as string;
    if (!name) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, zones: zone ? [zone] : [] }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategoriesList(prev => [...prev, newCat]);
        setShowAddCategory(false);
        toast.success(`Category "${name}" Created`);
        kravy.success();
        setActiveCategory(name);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create category");
      }
    } catch (err) {
      toast.error("Failed to create category");
    }
  };

  /* ================= UI ================= */
  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  /* ================= PERMISSIONS HELPER ================= */
  const canEdit = userRole === "ADMIN" || 
                  userRole === "MASTER" || 
                  userRole === "SELLER" || 
                  userPermissions.includes("edit") || 
                  userPermissions.includes("EDIT_POS");

  return (

    <div className="flex-1 h-full bg-slate-50 dark:bg-[var(--kravy-bg)] flex flex-col overflow-hidden">

      {/* ════════════════════════════════════════════
          MAIN LAYOUT
      ════════════════════════════════════════════ */}
      <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px] gap-0 flex-1 min-h-0">

        {/* ══════════════════════════════
            LEFT — MENU CATALOG
        ══════════════════════════════ */}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-[var(--kravy-border)]">

          {/* Left Header — STICKY & SOLID */}
          <div className="bg-[var(--kravy-surface)] border-b border-[var(--kravy-border)] px-4 md:px-6 py-3 flex-shrink-0 sticky top-0 z-20 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {searchParams.get("returnTo") && (
                  <button 
                    onClick={async () => { 
                      kravy.click(); 
                      const returnTo = searchParams.get("returnTo");
                      if (returnTo) {
                        const tableId = searchParams.get("tableId");
                        const orderId = searchParams.get("orderId") || syncedOrderId;
                        const query = new URLSearchParams();
                        if (tableId) query.set("tableId", tableId);
                        if (orderId) query.set("orderId", orderId);
                        router.push(`${returnTo.split('?')[0]}?${query.toString()}`);
                      }
                    }}
                    className="h-8 px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm"
                  >
                    <ArrowLeft size={14} strokeWidth={3} /> Back
                  </button>
                )}
                <h2 className="text-sm md:text-base font-black text-[var(--kravy-text-primary)] tracking-tight whitespace-nowrap">
                  Browse Products
                </h2>
                <button
                  onClick={async () => { kravy.toggle(); setCategoryLayout(prev => prev === 'horizontal' ? 'vertical' : 'horizontal'); }}
                  className="p-1 px-2 rounded-lg border border-[var(--kravy-border)] hover:bg-slate-100 transition-all flex items-center gap-1.5 text-[9px] font-black text-[var(--kravy-text-secondary)] shrink-0 bg-white shadow-sm"
                  title="Switch Layout"
                >
                  {categoryLayout === 'horizontal' ? <Columns size={10} /> : <LayoutGrid size={10} />}
                  <span className="hidden sm:inline tracking-widest">{categoryLayout === 'horizontal' ? 'SIDEBAR' : 'CHIPS'}</span>
                </button>
                {business && (
                  <div className="flex items-center gap-1 sm:gap-2 bg-indigo-50 border border-indigo-100 px-2 sm:px-3 py-1 rounded-lg shrink-0 max-w-[150px] sm:max-w-[200px] overflow-hidden">
                    <span className="hidden sm:inline text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Business:</span>
                    {enableMultipleProfiles ? (
                      <select
                        className="text-[10px] sm:text-xs font-black text-indigo-700 bg-transparent border-none outline-none cursor-pointer w-full text-ellipsis"
                        value={business.id}
                        onChange={(e) => {
                          const p = availableProfiles.find(p => p.id === e.target.value);
                          if (p) applyBusinessProfile(p);
                        }}
                      >
                        {availableProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.businessName || "Unnamed Business"}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-black text-indigo-700 truncate w-full">{business.businessName || "Your Store"}</span>
                    )}
                  </div>
                )}
                {business && (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg shrink-0">
                    <Layers size={12} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter whitespace-nowrap">Tokens: {business.lastTokenNumber || 0}</span>
                  </div>
                )}

                {/* Compact Zone Dropdown */}
                {business?.multiZoneMenuEnabled && availableZones.length > 0 && (
                  <div className="relative group/zone ml-1 shrink-0">
                    <button className="h-8 px-3 rounded-lg border border-[var(--kravy-border)] bg-white hover:border-indigo-500 transition-all flex items-center gap-2 shadow-sm">
                      <Layers size={12} className="text-indigo-500" />
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight truncate max-w-[80px]">
                        {activeZone === "All" ? "Global" : activeZone}
                      </span>
                      <ChevronDown size={10} className="text-indigo-400" />
                    </button>
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[var(--kravy-border)] rounded-xl shadow-2xl p-1 z-50 opacity-0 invisible group-hover/zone:opacity-100 group-hover/zone:visible transition-all">
                       <button
                         onClick={async () => { 
                           kravy.click(); 
                           setActiveZone("All");
                           if (await confirm("Set Global as default for direct visits?")) {
                             localStorage.setItem('kravy_default_zone', 'All');
                             toast.success("Default zone updated");
                           }
                         }}
                         className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all mb-0.5 last:mb-0 ${activeZone === "All" ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 text-slate-600"}`}
                       >
                         All Items (Global)
                       </button>
                       {availableZones.map(zone => (
                         <div key={zone} className="relative group/zoneitem">
                           <button
                             onClick={async () => { kravy.click(); setActiveZone(zone); }}
                             className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all mb-0.5 last:mb-0 ${activeZone === zone ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 text-slate-600"}`}
                           >
                             {zone}
                           </button>
                           <button 
                             onClick={async (e) => {
                               e.stopPropagation();
                               localStorage.setItem('kravy_default_zone', zone);
                               toast.success(`${zone} set as default`);
                             }}
                             className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/zoneitem:opacity-100 p-1 hover:text-indigo-600 text-[8px] font-black"
                           >
                             SET DEFAULT
                           </button>
                         </div>
                       ))}
                       <div className="border-t border-[var(--kravy-border)] mt-1 pt-1">
                         <button
                           onClick={() => { kravy.click(); setIsZoneManagerOpen(true); }}
                           className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 hover:bg-slate-100 text-slate-700"
                         >
                           <Settings size={12} /> Manage Zones
                         </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Combined Search & New Category — COMPACT */}
              <div className="flex items-center gap-1.5 w-full xl:w-auto xl:max-w-[400px]">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-faint)]" size={12} />
                  <input
                    type="text"
                    placeholder={isListening ? "🎙️ Listening... Speak item..." : "Search menu / Shortcode…"}
                    value={searchQuery}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        e.preventDefault();
                        const query = searchQuery.trim().toLowerCase();
                        
                        // 1. Check exact match by shortCode
                        const matchedShortCode = menuItems.find(
                          (i) => i.shortCode && String(i.shortCode).trim().toLowerCase() === query
                        );
                        if (matchedShortCode) {
                          addToCart(matchedShortCode);
                          setSearchQuery("");
                          return;
                        }
                        
                        // 2. Check exact match by name, barcode, inventoryCode, id suffix, or filtered result
                        const matchedItem = menuItems.find(
                          (i) => i.name.toLowerCase() === query || 
                                 (i as any).barcode?.toLowerCase() === query ||
                                 (i.inventoryCode && i.inventoryCode.toLowerCase() === query) ||
                                 i.id.toLowerCase().endsWith(query)
                        ) || (filteredMenuItems.length > 0 ? filteredMenuItems[0] : null);
                        
                        if (matchedItem) {
                          addToCart(matchedItem);
                          setSearchQuery("");
                        }
                      }
                    }}
                    className={`w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)]
                      h-8 pl-8 pr-8 rounded-lg text-xs outline-none
                      focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                      transition-all placeholder:text-[var(--kravy-text-muted)] font-bold ${
                        isListening ? "border-rose-500 ring-2 ring-rose-500/30" : ""
                      }`}
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceBilling}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all flex items-center gap-1 ${
                      isListening
                        ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/50"
                        : "text-[var(--kravy-text-muted)] hover:text-indigo-600 hover:bg-slate-100"
                    }`}
                    title={isListening ? "Click to stop voice listening" : "Click to Speak & Add Items via Voice (Mic Billing)"}
                  >
                    {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  </button>
                </div>
                {canEdit && (
                  <button
                    onClick={async () => setQuickAddCat(categoriesList[0] || { id: "others", name: "Others" })}
                    className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center shrink-0"
                    title="Quick Add Item"
                  >
                    <Plus size={14} strokeWidth={3} />
                  </button>
                )}
                <button
                  onClick={async () => {
                    setMenuLoading(true);
                    fetch(`/api/menu/items?t=${Date.now()}`, { cache: "no-store" })
                      .then(r => r.json())
                      .then(data => {
                        const mapped = normalizeMenuItems(data || []);
                        setMenuItems(mapped);
                        localStorage.setItem(menuCacheKey, JSON.stringify(mapped));
                        toast.success("Catalog Updated");
                      })
                      .catch(() => toast.error("Catalog sync failed"))
                      .finally(() => setMenuLoading(false));
                  }}
                  className="h-8 w-8 rounded-lg border border-[var(--kravy-border)] hover:bg-indigo-50 hover:text-indigo-600 transition-all bg-[var(--kravy-bg)] flex items-center justify-center shrink-0"
                  title="Refresh Menu"
                >
                  <RefreshCw size={12} className={menuLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Horizontal Categories — ONLY IF layout is horizontal */}
            {categoryLayout === 'horizontal' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 pb-2">
                <button
                  onClick={async () => { kravy.click(); setActiveCategory("All"); }}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all whitespace-nowrap ${activeCategory === "All"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"
                    }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={async () => { kravy.click(); setActiveCategory(cat); }}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all whitespace-nowrap ${activeCategory === cat
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
                {canEdit && (
                  <button
                    onClick={async () => setShowAddCategory(true)}
                    className="px-2 py-1 rounded-full bg-white border border-[var(--kravy-border)] text-indigo-600 hover:border-indigo-500 transition-all shadow-sm shrink-0"
                    title="Add Category"
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 🚀 CATEGORY SLIDER (Vertical Rail) — Fixed on Side — ONLY IF layout is vertical */}
            {categoryLayout === 'vertical' && (
              <div className="w-[120px] md:w-[150px] flex-shrink-0 bg-[var(--kravy-bg-2)] border-r border-[var(--kravy-border)] overflow-y-auto no-scrollbar py-3 px-2 space-y-2">
                {/* Category Search Box */}
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="🔍 Search..." 
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className="w-full bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl px-2 py-1.5 text-[9px] font-bold text-[var(--kravy-text-primary)] placeholder-[var(--kravy-text-muted)] focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  onClick={async () => { kravy.click(); setActiveCategory("All"); }}
                  className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-center flex flex-col items-center gap-1 ${activeCategory === "All"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeCategory === "All" ? "bg-white" : "bg-indigo-500/20"}`} />
                  All
                </button>
                
                {categories.filter(cat => cat.toLowerCase().includes(catSearch.toLowerCase())).map((cat) => (
                  <button
                    key={cat}
                    onClick={async () => { kravy.click(); setActiveCategory(cat); }}
                    className={`w-full py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-center flex flex-col items-center gap-1 ${activeCategory === cat
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-indigo-500/50"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeCategory === cat ? "bg-white" : "bg-indigo-500/20"}`} />
                    <span className="truncate w-full">{cat}</span>
                  </button>
                ))}

                {canEdit && (
                  <button
                    onClick={async () => setShowAddCategory(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--kravy-border)] text-[var(--kravy-text-muted)] hover:text-indigo-500 hover:border-indigo-400/50 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">New Section</span>
                  </button>
                )}
              </div>
            )}

            {/* Menu Grid: Scrollable Container */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden md:scrollbar-default scrollbar-hide">
            {menuLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-[var(--kravy-brand)]/20 border-t-[var(--kravy-brand)] rounded-full animate-spin" />
                  <p className="text-sm font-bold text-[var(--kravy-text-muted)] animate-pulse">Loading menu…</p>
                </div>
              </div>
            ) : filteredMenuItems.length === 0 && searchQuery ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div className="opacity-40">
                  <Search size={40} className="mx-auto mb-3 text-[var(--kravy-text-muted)]" />
                  <p className="font-bold text-[var(--kravy-text-primary)]">No items found</p>
                  <p className="text-xs mt-1 text-[var(--kravy-text-muted)]">Try a different search or category</p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-5 py-4 scrollbar-hide">
                {activeCategory === "All" && !searchQuery ? (
                  categories.map(catName => {
                    const catItems = filteredMenuItems.filter(i => (i.category?.name || "Uncategorised") === catName);
                    const catObj = categoriesList.find(c => c.name === catName) || { id: "uncategorised", name: catName };

                    return (
                      <div key={catName} className="mb-8">
                        <h3 className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest mb-4 flex items-center gap-3">
                          <span className="w-8 h-[2px] bg-indigo-500/20 rounded-full" /> 
                          {catName} 
                          <span className="ml-auto text-[9px] font-bold px-2 py-0.5 bg-[var(--kravy-bg-2)] rounded border border-[var(--kravy-border)]">
                            {catItems.length} Items
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mb-6">
                          {catItems.map(m => (
                            <MenuItemCard key={m.id} m={m} items={items} addToCart={addToCart} reduceFromCart={reduceFromCart} expiryTrackingEnabled={business?.expiryTrackingEnabled} />
                          ))}
                            {canEdit && <QuickAddCard cat={catObj} onClick={async () => { setQuickAddCat(catObj); toast.info(`Quick add to ${catName}`); }} />}
                        </div>

                        {/* Category Addons Section */}
                        {(() => {
                          const catAddons = addonGroups.filter(ag => (ag.categoryIds || []).includes(catObj.id));
                          if (catAddons.length === 0) return null;
                          return (
                            <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl p-4 border border-dashed border-indigo-200 dark:border-indigo-900/50">
                              <div className="flex items-center gap-2 mb-3">
                                 <Layers size={12} className="text-indigo-500" />
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Category Addons (Linked to {catName})</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 {catAddons.map(ag => (
                                   <div key={ag.id} className="flex flex-col gap-2">
                                     <div className="flex flex-wrap gap-1.5 items-center">
                                     {(Array.isArray(ag.items) ? ag.items : [])
                                       .filter((addon: any) => {
                                         if (addon.categoryIds && addon.categoryIds.length > 0) {
                                           return addon.categoryIds.includes(catObj.id);
                                         }
                                         return true;
                                       })
                                       .map((addon: any, idx: number) => {
                                       const fullName = `${addon.name} (${ag.name} - ${catName})`;
                                       const inCart = items.find(i => i.name === fullName);
                                       return (
                                        <div key={idx} className="relative group/addon">
                                         <button
                                           onClick={async () => addAddonToCart(addon, ag.name, catName)}
                                           className={`flex items-center border-[0.5px] rounded-full overflow-hidden shadow-sm transition-all group
                                             ${inCart 
                                               ? 'bg-indigo-600 border-indigo-700 shadow-indigo-500/20 scale-[1.02]' 
                                               : 'bg-[#EEEDFE] dark:bg-indigo-950/40 border-[#AFA9EC] dark:border-indigo-800 hover:border-indigo-500 hover:shadow-md hover:scale-[1.02]'
                                             }`}
                                         >
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r ${inCart ? 'border-white/20' : 'border-[#AFA9EC]/50 dark:border-indigo-800'}`}>
                                               {inCart ? (
                                                 <span className="text-[9px] font-black bg-white/20 px-1.5 rounded-md text-white mr-1 animate-in zoom-in-50 duration-300">x{inCart.qty}</span>
                                               ) : (
                                                 <Plus size={10} className="text-indigo-500 group-hover:text-indigo-700" />
                                               )}
                                               <span className={`text-[10px] font-black uppercase tracking-wide ${inCart ? 'text-white' : 'text-indigo-900 dark:text-indigo-100'}`}>{addon.name}</span>
                                            </div>
                                            <div className={`px-2.5 py-1.5 ${inCart ? 'bg-indigo-700' : 'bg-[#E5E3FC] dark:bg-indigo-900/60'}`}>
                                               <span className={`text-[9px] font-black tracking-tighter ${inCart ? 'text-white/90' : 'text-indigo-700 dark:text-indigo-300'}`}>₹{addon.price}</span>
                                            </div>
                                         </button>
                                         {inCart && (
                                            <button 
                                              onClick={async (e) => { e.stopPropagation(); reduceAddonFromCart(addon.name, ag.name, catName); }}
                                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-90 transition-all z-10 border border-white dark:border-slate-900"
                                            >
                                              <X size={10} strokeWidth={4} />
                                            </button>
                                         )}
                                        </div>
                                      )})}
                                       {canEdit && <QuickAddAddonChip onClick={async () => setQuickAddAddonGroup(ag)} />}
                                     </div>
                                   </div>
                                 ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {filteredMenuItems.map((m) => (
                        <MenuItemCard key={m.id} m={m} items={items} addToCart={addToCart} reduceFromCart={reduceFromCart} expiryTrackingEnabled={business?.expiryTrackingEnabled} />
                      ))}
                      {!searchQuery && activeCategory !== "All" && (() => {
                        const fallbackCat = categoriesList.find(c => c.name.toLowerCase() === activeCategory.toLowerCase()) || { id: "", name: activeCategory };
                        if (canEdit) return <QuickAddCard cat={fallbackCat} onClick={async () => setQuickAddCat(fallbackCat)} />;
                        return null;
                      })()}
                    </div>

                      {/* Category Addons Section */}
                      {(() => {
                        const currentCat = categoriesList.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
                        if (!currentCat) return null;
                        const catAddons = addonGroups.filter(ag => (ag.categoryIds || []).includes(currentCat.id));
                        if (catAddons.length === 0) return null;
                        return (
                          <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl p-4 border border-dashed border-indigo-200 dark:border-indigo-900/50 mt-6">
                             <div className="flex items-center gap-2 mb-3">
                               <Layers size={12} className="text-indigo-500" />
                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Addons for {activeCategory}</span>
                             </div>
                             <div className="flex flex-wrap gap-4">
                               {catAddons.map(ag => (
                                 <div key={ag.id} className="flex flex-col gap-2">
                                   <div className="flex flex-wrap gap-1.5 items-center">
                                     {(Array.isArray(ag.items) ? ag.items : [])
                                       .filter((addon: any) => {
                                         if (addon.categoryIds && addon.categoryIds.length > 0) {
                                           return addon.categoryIds.includes(currentCat.id);
                                         }
                                         return true;
                                       })
                                       .map((addon: any, idx: number) => {
                                       const fullName = `${addon.name} (${ag.name} - ${activeCategory})`;
                                       const inCart = items.find(i => i.name === fullName);
                                       return (
                                        <div key={idx} className="relative group/addon">
                                         <button
                                           onClick={async () => addAddonToCart(addon, ag.name, activeCategory)}
                                           className={`flex items-center border-[0.5px] rounded-full overflow-hidden shadow-sm transition-all group
                                             ${inCart 
                                               ? 'bg-indigo-600 border-indigo-700 shadow-indigo-500/20 scale-[1.02]' 
                                               : 'bg-[#EEEDFE] dark:bg-indigo-950/40 border-[#AFA9EC] dark:border-indigo-800 hover:border-indigo-500 hover:shadow-md hover:scale-[1.02]'
                                             }`}
                                         >
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 border-r ${inCart ? 'border-white/20' : 'border-[#AFA9EC]/50 dark:border-indigo-800'}`}>
                                               {inCart ? (
                                                 <span className="text-[9px] font-black bg-white/20 px-1.5 rounded-md text-white mr-1 animate-in zoom-in-50 duration-300">x{inCart.qty}</span>
                                               ) : (
                                                 <Plus size={10} className="text-indigo-500 group-hover:text-indigo-700" />
                                               )}
                                               <span className={`text-[10px] font-black uppercase tracking-wide ${inCart ? 'text-white' : 'text-indigo-900 dark:text-indigo-100'}`}>{addon.name}</span>
                                            </div>
                                            <div className={`px-2.5 py-1.5 ${inCart ? 'bg-indigo-700' : 'bg-[#E5E3FC] dark:bg-indigo-900/60'}`}>
                                               <span className={`text-[9px] font-black tracking-tighter ${inCart ? 'text-white/90' : 'text-indigo-700 dark:text-indigo-300'}`}>₹{addon.price}</span>
                                            </div>
                                         </button>
                                         {inCart && (
                                            <button 
                                              onClick={async (e) => { e.stopPropagation(); reduceAddonFromCart(addon.name, ag.name, activeCategory); }}
                                              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-90 transition-all z-10 border border-white dark:border-slate-900"
                                            >
                                              <X size={10} strokeWidth={4} />
                                            </button>
                                         )}
                                        </div>
                                      )})}
                                     {canEdit && <QuickAddAddonChip onClick={async () => setQuickAddAddonGroup(ag)} />}
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </div>
                        )
                      })()}

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


        {/* ══════════════════════════════
            RIGHT — CART / BILLING
        ══════════════════════════════ */}
        <div 
          ref={checkoutSidebarRef}
          className="bg-[var(--kravy-surface)] flex flex-col border-l border-[var(--kravy-border)] overflow-hidden min-h-0
          fixed bottom-0 left-0 right-0 md:static
          rounded-t-3xl md:rounded-none
          shadow-2xl md:shadow-none
          border-t-2 md:border-t-0
          transition-transform duration-300
          z-30 md:z-auto
          max-h-[82vh] md:max-h-none"
          style={{ transform: 'translateY(0)' }}
        >

          {/* Mobile Drag Handle */}
          <div className="lg:hidden flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="w-10 h-1 bg-[var(--kravy-border)] rounded-full mb-2" />
            <div className="w-full flex items-center justify-between px-5 pb-2">
              <div>
                <p className="text-sm font-black text-[var(--kravy-text-primary)]">Billing Invoice</p>
                <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5">
                  {totalItems} items · ₹{finalTotal.toFixed(2)}
                </p>
              </div>
              <span className="text-xl font-black text-[var(--kravy-brand)]">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Cart Header */}
          <div className="border-b border-[var(--kravy-border)] px-4 md:px-5 py-3.5 bg-[var(--kravy-bg)]/40 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <p className="text-sm font-black text-[var(--kravy-text-primary)] hidden md:block">Billing Invoice</p>
                  {business && enableMultipleProfiles && (
                    <select
                      className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded outline-none cursor-pointer max-w-[150px] text-ellipsis"
                      value={business.id}
                      onChange={(e) => {
                        const p = availableProfiles.find(p => p.id === e.target.value);
                        if (p) applyBusinessProfile(p);
                      }}
                    >
                      {availableProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.businessName || "Unnamed Business"}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black px-2.5 py-1 bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] rounded-lg uppercase tracking-wider">
                    {billNumber}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] hidden sm:block">{billDate}</span>
                </div>
              </div>

              {/* Note & Held Bills Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => { kravy.click(); setShowNotesModal(true); }}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${orderNotes ? "bg-blue-500/10 border-blue-500/25 text-blue-500" : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-muted)]"}`}
                  title="Add Order Note"
                >
                  <StickyNote size={17} className={orderNotes ? "animate-pulse" : ""} />
                </button>

                <button
                  onClick={async () => { kravy.click(); setShowHeldBills(true); fetchHeldBills(); }}
                  className="relative group flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-500
                    border border-amber-500/25 rounded-xl hover:bg-amber-500/20 transition-all"
                  title="View Held Bills"
                >
                  <Clock size={16} />
                  <span className="text-xs font-black hidden sm:block">Held</span>
                  {heldBills.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] font-black
                      w-4 h-4 flex items-center justify-center rounded-full border-2 border-[var(--kravy-surface)] shadow">
                      {heldBills.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>



          {/* Scrollable Middle Content (Customer + Items) */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
            {/* Customer Section Toggle */}
            <button
              onClick={async () => { kravy.click(); setShowCustomer(!showCustomer); }}
              className="px-4 md:px-5 py-3 text-left border-b border-[var(--kravy-border)]
                flex items-center justify-between hover:bg-[var(--kravy-bg)] transition-colors flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <User size={13} className="text-[var(--kravy-text-muted)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">
                  Customer Details
                </span>
                {(customerName || customerPhone) && (
                  <span className="text-[10px] font-bold text-[var(--kravy-brand)] bg-[var(--kravy-brand)]/10 px-2 py-0.5 rounded-md">
                    {customerName || customerPhone}
                  </span>
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-[var(--kravy-text-muted)] transition-transform duration-200 ${showCustomer ? "rotate-180" : ""}`}
              />
            </button>

            {showCustomer && (
              <div 
                ref={customerSectionRef}
                className="px-4 md:px-5 py-3 space-y-3 border-b border-[var(--kravy-border)] bg-[var(--kravy-bg)]/30 flex-shrink-0 relative focus-within:z-10"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-0.5">Name</label>
                    <input
                      placeholder="Customer name"
                      value={customerName}
                      autoComplete="off"
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      onFocus={() => {
                        if (customerName.length >= 2) {
                          setCustomerSuggestions(parties.filter(p => 
                            p.name.toLowerCase().includes(customerName.toLowerCase()) || 
                            p.phone.includes(customerName)
                          ).slice(0, 5));
                        }
                      }}
                      className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]
                        p-2.5 w-full rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--kravy-brand)]/20
                        focus:border-[var(--kravy-brand)] transition-all placeholder:text-[var(--kravy-text-muted)] font-medium"
                    />
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-0.5">Phone</label>
                  <input
                    placeholder="Phone number"
                    value={customerPhone}
                    autoComplete="off"
                    onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                    onFocus={() => {
                        if (customerPhone.length >= 3) {
                          setCustomerSuggestions(parties.filter(p => 
                            p.phone.includes(customerPhone) || 
                            p.name.toLowerCase().includes(customerPhone.toLowerCase())
                          ).slice(0, 5));
                        }
                    }}
                    className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]
                      p-2.5 w-full rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--kravy-brand)]/20
                      focus:border-[var(--kravy-brand)] transition-all placeholder:text-[var(--kravy-text-muted)] font-mono"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {customerSuggestions.length > 0 && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute left-0 right-0 bg-white dark:bg-[#0f172a] border border-[var(--kravy-border-strong)] rounded-xl shadow-2xl z-[60] mt-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                      style={{ top: '100%' }} // Positioned directly below the phone input container
                    >
                      <div className="p-2 border-b border-[var(--kravy-border)] bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-between">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest pl-1">Matching Customers</p>
                        <button onClick={() => setCustomerSuggestions([])} className="text-slate-400 hover:text-rose-500 mr-1 shrink-0" type="button">
                           <X size={14} />
                        </button>
                      </div>
                      {customerSuggestions.map((p, idx) => (
                        <button
                          key={p.id || idx}
                          type="button"
                          onClick={async () => selectCustomer(p)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border-b border-[var(--kravy-border)] last:border-0 transition-colors flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-black text-sm text-[var(--kravy-text-primary)] truncate">{p.name}</p>
                            <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] mt-0.5">{p.phone}</p>
                            {p.address && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate italic">{p.address}</p>}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <User size={14} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
    
                 {selectedParty && (
                   <div className="space-y-2">
                     <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl flex items-center justify-between">
                       <div>
                         <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Active Wallet Balance</p>
                         <p className="text-lg font-black text-indigo-600 mt-0.5">₹{selectedParty.walletBalance?.toFixed(2) || "0.00"}</p>
                       </div>
                       <button 
                         onClick={async () => {
                           const amt = prompt("Enter amount to deposit (₹):");
                           if (amt && !isNaN(Number(amt))) {
                             handleDeposit(Number(amt));
                           }
                         }}
                         className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                       >
                         Add
                       </button>
                     </div>

                     <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center justify-between">
                       <div>
                         <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Loyalty Rewards</p>
                         <p className="text-base font-black text-amber-600 mt-0.5">👑 {selectedParty.loyaltyPoints || 0} Pts</p>
                       </div>
                       <span className="text-[10px] font-extrabold text-amber-700 bg-amber-500/20 px-2.5 py-1 rounded-lg">
                         ₹{(selectedParty.loyaltyPoints || 0) * (business?.loyaltyValueInRupees || 1)} Discount Value
                       </span>
                     </div>
                   </div>
                 )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-0.5">Address</label>
                    <textarea
                      placeholder="Enter customer address..."
                      value={customerAddress}
                      onFocus={() => setCustomerSuggestions([])}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]
                        p-2.5 w-full rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--kravy-brand)]/20
                        focus:border-[var(--kravy-brand)] transition-all placeholder:text-[var(--kravy-text-muted)] font-medium resize-none"
                    />
                  </div>

                {business?.taxEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-0.5">Buyer GSTIN</label>
                      <input
                        placeholder="Customer GSTIN"
                        value={buyerGSTIN}
                        autoComplete="off"
                        onChange={(e) => setBuyerGSTIN(e.target.value.toUpperCase())}
                        className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]
                          p-2.5 w-full rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--kravy-brand)]/20
                          focus:border-[var(--kravy-brand)] transition-all placeholder:text-[var(--kravy-text-muted)] uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-0.5">Place of Supply</label>
                      <input
                        placeholder="e.g. Haryana"
                        value={placeOfSupply}
                        autoComplete="off"
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                        className="bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]
                          p-2.5 w-full rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--kravy-brand)]/20
                          focus:border-[var(--kravy-brand)] transition-all placeholder:text-[var(--kravy-text-muted)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Cart Items List */}
            <div className="px-4 md:px-5 py-2 space-y-1.5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <div className="w-16 h-16 rounded-[28px] bg-[var(--kravy-brand)]/5 flex items-center justify-center mb-4 animate-pulse">
                    <ShoppingBag size={32} className="text-[var(--kravy-brand)]/20" />
                  </div>
                  <p className="font-black text-[var(--kravy-text-primary)] text-xs tracking-tight">Cart is empty</p>
                  <p className="text-[9px] font-bold text-[var(--kravy-text-muted)] mt-1 max-w-[160px] mx-auto uppercase tracking-widest leading-relaxed">
                    Select items from the menu
                  </p>
                </div>
              ) : (
                <>
                  {items.map((i, idx) => (
                    <div
                      key={`${i.id || i.itemId || 'item'}-${idx}`}
                      className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl
                        bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                        hover:border-[var(--kravy-brand)]/30 transition-all group shrink-0 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--kravy-text-primary)] break-words whitespace-normal text-sm">{i.name}</p>
                        <InlineRateEdit item={i} updateRate={updateRate} taxActive={taxActive} perProductEnabled={perProductEnabled} globalRate={globalRate} />
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={async () => dec(i.id)}
                          className="w-7 h-7 rounded-lg border border-[var(--kravy-border)] bg-[var(--kravy-surface)]
                            text-[var(--kravy-text-secondary)] font-black text-base flex items-center justify-center
                            hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all"
                        >
                          −
                        </button>
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            step="any"
                            value={i.qty}
                            onChange={(e) => updateQty(i.id, e.target.value)}
                            onBlur={(e) => {
                              let val = parseFloat(e.target.value);
                              if (isNaN(val) || val <= 0) {
                                if (userRole === "STAFF" && !userPermissions.includes("pos-delete-item")) {
                                  toast.error("Permission Denied: Cannot delete item from cart.");
                                  updateQty(i.id, 1);
                                } else {
                                  remove(i.id);
                                }
                              } else {
                                 updateQty(i.id, val);
                              }
                            }}
                            className="w-12 text-center font-black text-sm text-[var(--kravy-text-primary)] bg-transparent outline-none border-b border-transparent focus:border-[var(--kravy-brand)] transition-colors"
                          />
                        </div>
                        <button
                          onClick={async () => inc(i.id)}
                          className="w-7 h-7 rounded-lg border border-[var(--kravy-border)] bg-[var(--kravy-surface)]
                            text-[var(--kravy-text-secondary)] font-black text-base flex items-center justify-center
                            hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500 transition-all"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-black text-[var(--kravy-text-primary)] text-sm min-w-[52px] text-right flex-shrink-0">
                        ₹{(Number(i.qty ?? 0) * Number(i.rate ?? 0)).toFixed(2)}
                      </span>

                      <button
                        onClick={async () => remove(i.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                          text-[var(--kravy-text-muted)] hover:bg-rose-50 hover:text-rose-500 transition-all flex-shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Subtle Density Filler at bottom of list */}
                  <div className="pt-4 pb-2 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800">
                       <Zap size={10} className="text-amber-500" />
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kravy Smart Terminal Active</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Checkout Footer (Pinned at Bottom) */}
          <div className="border-t border-[var(--kravy-border)] px-4 md:px-5 py-1.5 bg-[var(--kravy-surface)] space-y-1.5 shrink-0 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">

            {/* Totals - Dynamic Height */}
            <div className="space-y-0">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">
                  <span>Items Base</span>
                  <span>₹{totalTaxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  <span>GST Total {(taxActive || perProductEnabled) ? `(Active)` : `(Disabled)`}</span>
                  <span>+ ₹{gstAmount.toFixed(2)}</span>
                </div>
                {(deliveryCharge > 0 || packagingCharge > 0 || serviceCharge > 0) && (
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-blue-600">
                    <span>Other Charges</span>
                    <span>+ ₹{(totalCharges + totalChargesGst).toFixed(2)}</span>
                  </div>
                )}
              </div>
            <div className="flex justify-between items-center border-b border-dashed border-[var(--kravy-border)] pb-1 gap-2">
              <div className="flex flex-wrap gap-x-2 gap-y-0 flex-1">
                <p className="text-[9px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-tighter leading-none">Sub: ₹{subtotal.toFixed(2)}</p>
                {discountAmt > 0 && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter leading-none">Disc: -₹{discountAmt.toFixed(2)}</p>}
                {(taxActive || perProductEnabled) && <p className="text-[9px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-tighter leading-none">Tax: ₹{gstAmount.toFixed(2)}</p>}
                {deliveryCharge > 0 && <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter leading-none">Del: ₹{deliveryCharge.toFixed(2)}</p>}
                {packagingCharge > 0 && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter leading-none">Pkg: ₹{packagingCharge.toFixed(2)}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest leading-none mb-0">PAYABLE</p>
                <p className="text-xl font-black text-[var(--kravy-brand)] leading-none">₹{finalTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* 🎟️ ADJUSTMENTS SECTION (Discount / Charges) */}
            {!(selectedTable !== "POS" && selectedTable !== "TAKEAWAY" && selectedTable !== "DELIVERY" && searchParams.get("returnTo")) && (
              <div className="space-y-1">
                <div className="flex border border-[var(--kravy-border)] rounded-lg overflow-hidden p-0.5 bg-[var(--kravy-bg-2)]">
                   <button 
                    onClick={async () => {
                      if (userRole === "STAFF" && !userPermissions.includes("pos-discount")) {
                        toast.error("Permission Denied: Cannot apply discounts.");
                        return;
                      }
                      setDiscountMode('PROMO');
                    }}
                    className={`flex-1 py-0.5 rounded text-[9px] font-black uppercase transition-all ${discountMode === 'PROMO' ? 'bg-[var(--kravy-brand)] text-white' : 'text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]'}`}
                   >
                     Promo
                   </button>
                   <button 
                    onClick={async () => {
                      if (userRole === "STAFF" && !userPermissions.includes("pos-discount")) {
                        toast.error("Permission Denied: Cannot apply discounts.");
                        return;
                      }
                      setDiscountMode('INSTANT');
                    }}
                    className={`flex-1 py-0.5 rounded text-[9px] font-black uppercase transition-all ${discountMode === 'INSTANT' ? 'bg-[var(--kravy-brand)] text-white' : 'text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]'}`}
                   >
                     Discount
                   </button>
                   <button 
                    onClick={async () => setDiscountMode('CHARGES')}
                    className={`flex-1 py-0.5 rounded text-[9px] font-black uppercase transition-all ${discountMode === 'CHARGES' ? 'bg-indigo-600 text-white' : 'text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]'}`}
                   >
                     Charges
                   </button>
                </div>

                {discountMode === 'CHARGES' ? (
                  <div className="grid grid-cols-1 gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex gap-1">
                      <div className="flex flex-1 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-slate-100 dark:bg-slate-800 px-1.5 flex items-center border-r border-[var(--kravy-border)]">
                          <Truck size={10} className="text-slate-500" />
                        </div>
                        <select 
                          value={deliveryChargeType}
                          onChange={(e) => { kravy.click(); setDeliveryChargeType(e.target.value as 'FLAT' | 'PERCENT'); }}
                          className="bg-slate-50 dark:bg-slate-800 border-r border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-1 text-[9px] font-black outline-none cursor-pointer"
                        >
                          <option value="FLAT">₹</option>
                          <option value="PERCENT">%</option>
                        </select>
                        <input 
                          type="number"
                          placeholder="Delivery Charge..."
                          value={manualDeliveryCharge || ""}
                          onChange={e => setManualDeliveryCharge(Number(e.target.value))}
                          className="bg-transparent text-[var(--kravy-text-primary)] px-1.5 py-1 w-full outline-none text-[9px] font-black"
                        />
                      </div>

                      <div className="flex flex-1 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-slate-100 dark:bg-slate-800 px-1.5 flex items-center border-r border-[var(--kravy-border)]">
                          <ShoppingBag size={10} className="text-slate-500" />
                        </div>
                        <select 
                          value={packagingChargeType}
                          onChange={(e) => { kravy.click(); setPackagingChargeType(e.target.value as 'FLAT' | 'PERCENT'); }}
                          className="bg-slate-50 dark:bg-slate-800 border-r border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-1 text-[9px] font-black outline-none cursor-pointer"
                        >
                          <option value="FLAT">₹</option>
                          <option value="PERCENT">%</option>
                        </select>
                        <input 
                          type="number"
                          placeholder="Package Charge..."
                          value={manualPackagingCharge || ""}
                          onChange={e => setManualPackagingCharge(Number(e.target.value))}
                          className="bg-transparent text-[var(--kravy-text-primary)] px-1.5 py-1 w-full outline-none text-[9px] font-black"
                        />
                      </div>
                    </div>

                    <div className="flex bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-slate-100 dark:bg-slate-800 px-1.5 flex items-center border-r border-[var(--kravy-border)]">
                        <Star size={10} className="text-slate-500" />
                      </div>
                      <select 
                        value={serviceChargeType}
                        onChange={(e) => { kravy.click(); setServiceChargeType(e.target.value as 'FLAT' | 'PERCENT'); }}
                        className="bg-slate-50 dark:bg-slate-800 border-r border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-1.5 text-[9px] font-black outline-none cursor-pointer"
                      >
                        <option value="FLAT">₹ Flat Service Charge</option>
                        <option value="PERCENT">% Percentage Service Charge</option>
                      </select>
                      <input 
                        type="number"
                        placeholder="Amount..."
                        value={serviceCharge || ""}
                        onChange={e => setServiceCharge(Number(e.target.value))}
                        className="bg-transparent text-[var(--kravy-text-primary)] px-1.5 py-1 w-full outline-none text-[9px] font-black"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                     {discountMode === 'PROMO' ? (
                       <input 
                         placeholder="PROMO CODE..."
                         value={discountCode}
                         onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                         disabled={!!appliedOffer}
                         className="bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-2.5 py-1 flex-1 rounded-lg outline-none text-[9px] font-black tracking-widest uppercase"
                       />
                     ) : (
                       <div className="flex flex-1 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-lg overflow-hidden shadow-sm">
                          <select 
                            value={customDiscountType}
                            onChange={(e) => { kravy.click(); setCustomDiscountType(e.target.value as 'PERCENT' | 'FLAT'); }}
                            className="bg-slate-100 dark:bg-slate-800 border-r border-[var(--kravy-border)] text-[var(--kravy-text-primary)] px-2 text-[9px] font-black outline-none cursor-pointer"
                          >
                            <option value="PERCENT">%</option>
                            <option value="FLAT">₹</option>
                          </select>
                          <input 
                            type="number"
                            placeholder="Amount..."
                            value={customDiscountValue}
                            onChange={e => setCustomDiscountValue(e.target.value)}
                            className="bg-transparent text-[var(--kravy-text-primary)] px-2.5 py-1 flex-1 outline-none text-[9px] font-black"
                          />
                       </div>
                     )}
                     <button 
                       onClick={appliedOffer || (discountMode === 'INSTANT' && customDiscountValue) ? removeCoupon : handleApplyCoupon}
                       className={`px-3 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${
                         appliedOffer || (discountMode === 'INSTANT' && customDiscountValue) 
                         ? "bg-rose-500 text-white" 
                         : "bg-[var(--kravy-brand)] text-white"
                       }`}
                     >
                       {appliedOffer || (discountMode === 'INSTANT' && customDiscountValue) ? "Clear" : "Apply"}
                     </button>
                  </div>
                )}
              </div>
            )}

            {/* 💳 PAYMENT METHODS AND ACTIONS */}

              <div 
                className="grid gap-[6px] mb-[6px] w-full"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))" }}
              >
                {(["Cash", "UPI", "Card", "Pay on Counter", "Wallet", "Split"] as const)
                  .filter(mode => {
                    if (mode === "Cash") return business?.posCashEnabled !== false;
                    if (mode === "UPI") return business?.posUpiEnabled !== false;
                    if (mode === "Card") return business?.posCardEnabled !== false;
                    if (mode === "Pay on Counter") return business?.posCounterEnabled !== false;
                    if (mode === "Wallet") return business?.posWalletEnabled !== false;
                    return true;
                  })
                  .map((mode) => (
                  <button
                    key={mode}
                    onClick={async () => { kravy.toggle(); setPaymentMode(mode); }}
                    className={`h-[54px] min-w-0 flex flex-col items-center justify-center gap-[4px] p-1 rounded-[12px] border transition-all ${
                      paymentMode === mode
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-white border-[#e1e5ef] text-slate-900 hover:border-indigo-400 hover:bg-indigo-50/30"
                      }`}
                  >
                    <span className="text-[16px] leading-[18px]">{mode === "Cash" ? "💵" : mode === "UPI" ? "📱" : mode === "Card" ? "💳" : mode === "Wallet" ? "👛" : mode === "Split" ? "🔀" : "🏪"}</span>
                    <span className="text-[9px] font-[800] leading-[11px] whitespace-nowrap truncate w-full text-center uppercase tracking-tighter">{mode === "Pay on Counter" ? "Counter" : mode}</span>
                  </button>
                ))}
              </div>

              {/* ✅ Partial Payment (Khata/Udhaar) */}
              <div className="flex gap-2 items-center bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-1.5 rounded-lg mb-1.5">
                 <div className="flex-1">
                   <p className="text-[9px] font-black uppercase text-[var(--kravy-text-muted)] tracking-wider">Amount Paid (₹)</p>
                   <div className="flex items-center gap-1 mt-0.5">
                     <input
                       type="number"
                       value={amountPaid}
                       onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
                       placeholder={`Full: ${finalTotal.toFixed(2)}`}
                       className="w-full bg-transparent border-b-2 border-[var(--kravy-border)] outline-none font-black text-xs text-[var(--kravy-text-primary)] focus:border-[var(--kravy-brand)] transition-colors"
                     />
                   </div>
                 </div>
                 {(amountPaid !== "" && Number(amountPaid) < finalTotal) && (
                   <div className="flex-1 text-right bg-rose-50 dark:bg-rose-900/20 p-1.5 rounded-md border border-rose-100 dark:border-rose-900/50">
                     <p className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Unpaid Balance</p>
                     <p className="text-xs font-black text-rose-600">₹{(finalTotal - Number(amountPaid)).toFixed(2)}</p>
                     {!selectedParty && <p className="text-[7px] text-rose-500 font-bold mt-0.5 leading-tight">*Select customer required</p>}
                   </div>
                 )}
              </div>

              {/* Split Payment Control Box */}
              {paymentMode === "Split" && (
                <div className="space-y-2 p-2 rounded-xl bg-indigo-50/70 border border-indigo-200 dark:bg-white/5 dark:border-white/10 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                      <Split size={12} /> Split Breakdown
                    </div>
                    <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-indigo-300">
                      Total: ₹{finalTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {/* Cash */}
                    <div className="bg-white dark:bg-black/20 p-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">💵 Cash</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const rem = Math.max(0, finalTotal - ((Number(splitUpi)||0) + (Number(splitCard)||0) + (Number(splitWallet)||0)));
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
                        className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-[10px] font-black outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* UPI */}
                    <div className="bg-white dark:bg-black/20 p-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">📱 UPI</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const rem = Math.max(0, finalTotal - ((Number(splitCash)||0) + (Number(splitCard)||0) + (Number(splitWallet)||0)));
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
                        className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-[10px] font-black outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Card */}
                    <div className="bg-white dark:bg-black/20 p-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">💳 Card</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const rem = Math.max(0, finalTotal - ((Number(splitCash)||0) + (Number(splitUpi)||0) + (Number(splitWallet)||0)));
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
                        className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-[10px] font-black outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Wallet */}
                    <div className="bg-white dark:bg-black/20 p-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200">👛 Wallet</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const rem = Math.max(0, finalTotal - ((Number(splitCash)||0) + (Number(splitUpi)||0) + (Number(splitCard)||0)));
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
                        className="w-full bg-transparent border-b border-slate-300 dark:border-white/20 text-[10px] font-black outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Split Summary Footer */}
                  {(() => {
                    const splitSum = (Number(splitCash)||0) + (Number(splitUpi)||0) + (Number(splitCard)||0) + (Number(splitWallet)||0);
                    const diff = Number((finalTotal - splitSum).toFixed(2));
                    return (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/10 text-[9px]">
                        <span className="font-bold text-slate-600 dark:text-slate-300">Sum: ₹{splitSum.toFixed(2)}</span>
                        {Math.abs(diff) < 0.01 ? (
                          <span className="font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
                            ✓ Balanced
                          </span>
                        ) : diff > 0 ? (
                          <span className="font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                            Rem: ₹{diff.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-black text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full">
                            Over: ₹{(-diff).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* UPI Details - Conditional */}
              {paymentMode === "UPI" && (
                <div className="space-y-1.5 p-2 rounded-xl bg-indigo-50 border border-indigo-200 mb-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <a href={upiLink} className="text-center text-indigo-700 font-black text-[9px] py-1 border-2 border-dashed border-indigo-300 rounded-lg bg-white flex items-center justify-center gap-1.5">
                      📱 UPI App
                    </a>
                    <div className="grid grid-cols-2 gap-1">
                      {(["Pending", "Paid"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={async () => setPaymentStatus(s)}
                          className={`py-1 rounded-md border-2 font-black text-[7px] transition-all uppercase tracking-wider ${paymentStatus === s
                            ? s === "Paid" ? "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20" : "bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-500/20"
                            : "bg-white border-slate-200 text-slate-500"
                            }`}
                        >
                          {s === "Pending" ? "🕒 PENDING" : "✅ PAID"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    placeholder="Txn Ref No."
                    value={upiTxnRef}
                    onChange={(e) => setUpiTxnRef(e.target.value)}
                    className="bg-white border-2 border-slate-200 text-slate-900 p-1.5 w-full rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>
              )}

              {/* 💎 SMART DYNAMIC ACTIONS: Prominent if few, Compact if many */}
              {(() => {
                if (!business) return <div className="h-8 animate-pulse bg-slate-50 rounded-lg mb-1.5" />;

                const enabledActions = [
                  { id: 'hold', enabled: business.posHoldEnabled !== false },
                  { id: 'save', enabled: business.posSaveEnabled !== false },
                  { id: 'preview', enabled: business.posPreviewEnabled !== false },
                  { id: 'kot', enabled: business.posKotEnabled !== false }
                ].filter(a => a.enabled);

                const isCompact = enabledActions.length > 2;

                return (
                  <div 
                    className="grid gap-[6px] mb-[8px] w-full"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))" }}
                  >
                    {(business.posHoldEnabled !== false) && (
                      <button
                        onClick={async () => {
                          const bill = await saveBill(true);
                          if (!bill) return;
                          kravy.ping(); 
                          resetForm();
                          fetchHeldBills();
                          if (resumeBillId) router.replace("/dashboard/billing/checkout");
                        }}
                        disabled={items.length === 0 || isSaving}
                        className="flex h-[56px] min-w-0 flex-col items-center justify-center gap-[4px] rounded-[12px] p-1 border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-all font-black active:scale-95"
                      >
                        <span className="text-[17px] leading-[18px]">⏸️</span>
                        <span className="text-[9px] font-[800] leading-[11px] uppercase tracking-wider">Hold</span>
                      </button>
                    )}

                    {(business.posSaveEnabled !== false) && (
                      <button
                        type="button"
                        onClick={async () => {
                          kravy.click();
                          const bill = await saveBill();
                          if (!bill) return;
                          kravy.success(); 
                          toast.success("Bill Saved Successfully! 💾");
                          
                          const returnTo = searchParams.get("returnTo");
                          if (returnTo) {
                            const tableId = searchParams.get("tableId");
                            const orderId = searchParams.get("orderId") || syncedOrderId || bill.id;
                            const query = new URLSearchParams();
                            if (tableId) query.set("tableId", tableId);
                            if (orderId) query.set("orderId", orderId);
                            router.replace(`${returnTo.split('?')[0]}?${query.toString()}`);
                            return;
                          }
                          resetForm();
                          if (resumeBillId) router.replace("/dashboard/billing/checkout");
                        }}
                        disabled={items.length === 0 || isSaving}
                        className="flex h-[56px] min-w-0 flex-col items-center justify-center gap-[4px] rounded-[12px] p-1 border border-slate-300 text-slate-900 bg-slate-50 hover:bg-slate-200 transition-all font-black active:scale-95"
                      >
                        <span className="text-[17px] leading-[18px]">💾</span>
                        <span className="text-[9px] font-[800] leading-[11px] uppercase tracking-wider">Save</span>
                      </button>
                    )}

                    {(business.posPreviewEnabled !== false) && (
                      <button
                        onClick={async () => { kravy.open(); setPreviewZoom(1); setShowPreview(true); }}
                        disabled={items.length === 0 || isSaving}
                        className="flex h-[56px] min-w-0 flex-col items-center justify-center gap-[4px] rounded-[12px] p-1 border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-all font-black active:scale-95"
                      >
                        <span className="text-[17px] leading-[18px]">👁️</span>
                        <span className="text-[9px] font-[800] leading-[11px] uppercase tracking-wider">Preview</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        kravy.click();
                        const bill = await saveBill();
                        if (!bill) return;
                        kravy.success();
                        
                        try {
                           const billUrl = `${window.location.origin}/api/bill-manager/${bill.id}/pdf`;
                           const text = `Hello! Here is your bill from ${business?.businessName || "us"}: ${billUrl}`;
                           const waUrl = `https://wa.me/91${customerPhone || ""}?text=${encodeURIComponent(text)}`;
                           window.open(waUrl, "_blank");
                           toast.success("Opening WhatsApp...");
                        } catch (e: any) {
                           toast.error(e.message || "WhatsApp Send Failed!");
                        }
                        
                        const returnTo = searchParams.get("returnTo");
                        if (returnTo) {
                          const tableId = searchParams.get("tableId");
                          const orderId = searchParams.get("orderId") || syncedOrderId || bill.id;
                          const query = new URLSearchParams();
                          if (tableId) query.set("tableId", tableId);
                          if (orderId) query.set("orderId", orderId);
                          router.replace(`${returnTo.split('?')[0]}?${query.toString()}`);
                          return;
                        }
                        resetForm();
                        if (resumeBillId) router.replace("/dashboard/billing/checkout");
                      }}
                      disabled={items.length === 0 || isSaving}
                      className="flex h-[56px] min-w-0 flex-col items-center justify-center gap-[4px] rounded-[12px] p-1 border border-green-300 text-green-800 bg-green-50 hover:bg-green-100 transition-all font-black active:scale-95"
                    >
                      <span className="text-[17px] leading-[18px]">💬</span>
                      <span className="text-[9px] font-[800] leading-[11px] uppercase tracking-wider">WhatsApp</span>
                    </button>
                  </div>
                );
              })()}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (items.length === 0) { toast.error("No items to save"); return; }
                  
                  if (buyerGSTIN) {
                    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                    if (!gstinRegex.test(buyerGSTIN)) {
                      toast.error("Invalid Buyer GSTIN Format", { description: "Expected 15 chars, e.g. 07AAAAA0000A1Z5" });
                      return;
                    }
                  }

                  if (paymentMode === "Wallet" && selectedParty) {
                    setPrevWalletBalance(selectedParty.walletBalance);
                  } else {
                    setPrevWalletBalance(null);
                  }
                  
                  kravy.payment(); 
                  toast.success("Settlement Finalized! 💰");
                  
                  const tClickStart = performance.now();
                  console.group("⏱️ [SAVE & PRINT DETAILED BREAKDOWN]");
                  console.log("👉 0. User Clicked Save & Print at:", new Date().toLocaleTimeString());

                  // 1. Capture HTML NOW before any state changes
                  const tCapStart = performance.now();
                  const capturedBillHtml = receiptRef.current?.innerHTML || "";
                  const capturedKotHtml = kotRef.current?.innerHTML || "";
                  console.log(`⚡ [SAVE_PRINT_PERF] 1. DOM innerHTML Capture: ${(performance.now() - tCapStart).toFixed(2)} ms`);

                  // 2. Process save and WAIT for DB success
                  const tSaveStart = performance.now();
                  const bill = await saveBill(false);
                  if (!bill) {
                    console.groupEnd();
                    return; // Save failed: Cart remains, user can retry
                  }
                  console.log(`⚡ [SAVE_PRINT_PERF] 2. saveBill API & DB Save: ${(performance.now() - tSaveStart).toFixed(2)} ms`);

                  // 3. Save Succeeded -> Clear cart
                  const tResetStart = performance.now();
                  const returnTo = searchParams.get("returnTo");
                  if (!returnTo) resetForm();
                  console.log(`⚡ [SAVE_PRINT_PERF] 3. Form Reset & State Clear: ${(performance.now() - tResetStart).toFixed(2)} ms`);

                  // 4. Inject finalized DB tokens into the captured HTML
                  const tRegexStart = performance.now();
                  let finalBillHtml = capturedBillHtml;
                  let finalKotHtml = capturedKotHtml;
                  
                  if (bill.tokenNumber) {
                      finalBillHtml = finalBillHtml.replace(/#---/g, `#${bill.tokenNumber}`);
                      finalKotHtml = finalKotHtml.replace(/#KOT_PLACEHOLDER/g, `#${bill.tokenNumber}`);
                      finalKotHtml = finalKotHtml.replace(/#---/g, `#${bill.tokenNumber}`);
                  }
                  if (bill.billNumber) {
                      finalBillHtml = finalBillHtml.replace(/No: [a-zA-Z0-9\/\-]+/g, `No: ${bill.billNumber}`);
                      finalKotHtml = finalKotHtml.replace(/Bill: [a-zA-Z0-9\/\-]+/g, `Bill: ${bill.billNumber}`);
                  }
                  console.log(`⚡ [SAVE_PRINT_PERF] 4. Token & Bill Regex Injections: ${(performance.now() - tRegexStart).toFixed(2)} ms`);
                  console.log(`🎉 [SAVE_PRINT_PERF] TOTAL CLICK TO PRINT PREPARATION TIME: ${(performance.now() - tClickStart).toFixed(2)} ms`);
                  console.groupEnd();
                  
                  // 5. Print the exact finalized HTML
                  const configuredDelay = (business as any)?.printSettings?.spoolerDelay;
                  const spoolerDelay = configuredDelay !== undefined && configuredDelay !== null ? Number(configuredDelay) : 0;
                  console.log(`⚡ [SAVE_PRINT_PERF] 5. Spooler Delay Configured: ${spoolerDelay} ms`);
                  
                  if (business?.enableKOTWithBill && finalKotHtml) {
                      if (spoolerDelay > 0) {
                          runPrintJob("kot", finalKotHtml, () => {
                              console.log(`⚡ [SAVE_PRINT_PERF] 6. Waiting for Spooler Delay: ${spoolerDelay} ms`);
                              setTimeout(() => {
                                  runPrintJob("bill", finalBillHtml, undefined, tClickStart);
                              }, spoolerDelay);
                          }, tClickStart);
                      } else {
                          // Combine them to prevent Chrome from blocking the second print dialog
                          const combinedHtml = `
                              <div class="kot-container-dynamic text-black bg-white">
                                  ${finalKotHtml}
                              </div>
                              <div style="page-break-after: always; height: 10px;"></div>
                              <div class="receipt-container-dynamic text-black bg-white" style="margin-top: 10px;">
                                  ${finalBillHtml}
                              </div>
                          `;
                          runPrintJob("bill", combinedHtml, undefined, tClickStart);
                      }
                  } else {
                      runPrintJob("bill", finalBillHtml, undefined, tClickStart);
                  }
                    
                    if (returnTo) {
                      const tableId = searchParams.get("tableId");
                      const query = new URLSearchParams();
                      if (tableId) query.set("tableId", tableId);
                      
                      // Use replace for faster navigation and to clean history
                      router.replace(`${returnTo.split('?')[0]}?${query.toString()}`);
                      return;
                    }
                    
                    if (resumeBillId) router.replace("/dashboard/billing/checkout");
                }}
                disabled={items.length === 0 || (paymentMode === "UPI" && paymentStatus !== "Paid") || isSaving}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                  bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500
                  text-white font-black text-[10px] uppercase tracking-widest
                  shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} strokeWidth={3} />} 
                Print Bill / Receipt
              </motion.button>

          </div>
        </div>
      </div>

        <PrintTemplates 
          receiptRef={receiptRef}
          kotRef={kotRef}
          business={business}
          billNumber={billNumber}
          billDate={billDate}
          tokenNumber={(() => {
            const tn = tokenNumber;
            if (tn == null || tn === "" || tn === 0) return "---";
            if (typeof tn === 'object' && (tn as any).$numberLong) return (tn as any).$numberLong.toString().padStart(3, '0');
            return tn.toString().padStart(3, '0');
          })()}
          selectedTable={selectedTable}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          orderNotes={orderNotes}
          buyerGSTIN={buyerGSTIN}
          placeOfSupply={placeOfSupply}
          items={items}
          subtotal={subtotal}
          discountAmt={discountAmt}
          appliedOffer={appliedOffer}
          taxActive={taxActive}
          perProductEnabled={perProductEnabled}
          globalRate={globalRate}
          totalTaxable={totalTaxable}
          totalGst={totalGst}
          taxBreakup={taxBreakup}
          deliveryCharge={deliveryCharge}
          deliveryGst={deliveryGst}
          packagingCharge={packagingCharge}
          packagingGst={packagingGst}
          serviceCharge={serviceCharge}
          finalTotal={finalTotal}
          paymentMode={paymentMode}
          paymentStatus={paymentStatus}
          upiTxnRef={upiTxnRef}
          qrUrl={qrUrl}
          kotNumbers={kotNumbers}
          prevWalletBalance={prevWalletBalance}
          selectedParty={selectedParty}
          amountPaid={amountPaid === "" ? finalTotal : Number(amountPaid)}
          balanceDue={Math.max(0, finalTotal - (amountPaid === "" ? finalTotal : Number(amountPaid)))}
          numberToWords={numberToWords}
        />

      


      {/* ════════════════════════════════════════════
          HELD BILLS DRAWER
      ════════════════════════════════════════════ */}
      {showHeldBills && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={async () => setShowHeldBills(false)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-md bg-[var(--kravy-surface)] h-full shadow-2xl flex flex-col
            border-l border-[var(--kravy-border)] animate-in slide-in-from-right duration-300">

            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[var(--kravy-border)] flex items-center justify-between
              bg-[var(--kravy-bg)]/50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Held Bills</h3>
                <p className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest mt-1">
                  {heldBills.length} Orders Paused
                </p>
              </div>
              <button
                onClick={async () => setShowHeldBills(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl
                  hover:bg-rose-500/10 text-[var(--kravy-text-muted)] hover:text-rose-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {heldBillsLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-8 h-8 border-4 border-[var(--kravy-brand)]/20 border-t-[var(--kravy-brand)] rounded-full animate-spin" />
                  <p className="text-sm font-bold text-[var(--kravy-text-muted)]">Loading bills…</p>
                </div>
              ) : heldBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center opacity-40 p-8">
                  <Clock size={44} className="mb-4 text-[var(--kravy-text-muted)]" />
                  <p className="font-black text-[var(--kravy-text-primary)]">No held bills</p>
                  <p className="text-xs mt-1 text-[var(--kravy-text-muted)]">Orders on hold will appear here</p>
                </div>
              ) : (
                heldBills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`rounded-2xl border overflow-hidden transition-all ${resumeBillId === bill.id
                      ? "bg-[var(--kravy-brand)]/5 border-[var(--kravy-brand)] shadow-md shadow-indigo-500/10"
                      : "bg-[var(--kravy-bg)] border-[var(--kravy-border)] hover:border-[var(--kravy-brand)]/50"
                      }`}
                  >
                    {/* Card Top */}
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] font-black text-[var(--kravy-brand)] bg-[var(--kravy-brand)]/10 px-2 py-0.5 rounded-md">
                            #{bill.billNumber}
                          </span>
                          {resumeBillId === bill.id && (
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="font-black text-[var(--kravy-text-primary)] text-sm truncate">
                          {bill.customerName || "Walk-in Customer"}
                        </p>
                        {bill.customerPhone && (
                          <p className="text-[10px] font-bold text-indigo-500 font-mono mt-0.5">
                            {bill.customerPhone}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-bold text-[var(--kravy-text-muted)]">
                            {new Date(bill.createdAt).toLocaleString()}
                          </p>
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            {bill.tableName || "POS"}
                          </span>
                        </div>
                        {(bill.notes || bill.auditNote) && (
                          <div className="mt-2 p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight">Note:</p>
                            <p className="text-[10px] font-medium text-blue-800 italic line-clamp-2">
                              {bill.notes || bill.auditNote}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-[var(--kravy-brand)]">₹{bill.total.toFixed(2)}</p>
                        <p className="text-[10px] font-bold text-[var(--kravy-text-muted)]">
                          {bill.items.length} items
                        </p>
                      </div>
                    </div>

                    {/* Item chips */}
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {bill.items.slice(0, 3).map((item: any, idx: number) => (
                        <span key={idx} className="text-[10px] font-semibold bg-[var(--kravy-surface)] border border-[var(--kravy-border)] px-2.5 py-1 rounded-lg text-[var(--kravy-text-secondary)]">
                          {item.name} ×{item.qty}
                        </span>
                      ))}
                      {bill.items.length > 3 && (
                        <span className="text-[10px] font-semibold bg-[var(--kravy-surface)] border border-[var(--kravy-border)] px-2.5 py-1 rounded-lg text-[var(--kravy-text-muted)]">
                          +{bill.items.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex border-t border-[var(--kravy-border)]">
                      <button
                        onClick={async () => {
                          setShowHeldBills(false);
                          router.push(`/dashboard/billing/checkout?resumeBillId=${bill.id}`);
                        }}
                        disabled={resumeBillId === bill.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3
                          bg-[var(--kravy-brand)]/8 text-[var(--kravy-brand)] font-black text-xs
                          hover:bg-[var(--kravy-brand)] hover:text-white
                          disabled:opacity-40 disabled:cursor-not-allowed transition-all
                          border-r border-[var(--kravy-border)]"
                      >
                        <Play size={13} fill="currentColor" /> Resume
                      </button>
                      <button
                        onClick={async () => setDeleteConfirmId(bill.id)}
                        className="w-14 flex items-center justify-center
                          bg-rose-500/8 text-rose-500 hover:bg-rose-500 hover:text-white
                          transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-[var(--kravy-border)] flex-shrink-0">
              <button
                onClick={async () => setShowHeldBills(false)}
                className="w-full py-3 bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                  rounded-2xl font-black text-sm text-[var(--kravy-text-secondary)]
                  hover:bg-[var(--kravy-surface-hover)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          DELETE CONFIRM MODAL (Beautiful Bottom Sheet)
      ════════════════════════════════════════════ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={async () => setDeleteConfirmId(null)}
          />
          <div className="relative w-full sm:max-w-sm bg-[var(--kravy-surface)] rounded-t-3xl sm:rounded-3xl
            shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[var(--kravy-border)] rounded-full" />
            </div>

            <div className="p-6 text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-rose-500" />
              </div>

              <h3 className="text-xl font-black text-[var(--kravy-text-primary)] mb-2">Move to Trash?</h3>
              <p className="text-sm text-[var(--kravy-text-muted)] font-medium leading-relaxed mb-6">
                Yeh order checkout se hat jaayega.<br />Aap ise baad mein "Deleted Bills" mein dekh sakte hain.
              </p>

              {/* Bill preview */}
              {(() => {
                const bill = heldBills.find(b => b.id === deleteConfirmId);
                return bill ? (
                  <div className="bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl p-3 mb-6 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-sm font-black text-[var(--kravy-text-primary)]">
                        {bill.customerName || "Walk-in Customer"}
                      </p>
                      <p className="text-[10px] text-[var(--kravy-text-muted)] font-bold mt-0.5">
                        #{bill.billNumber} · {bill.items.length} items
                      </p>
                    </div>
                    <span className="text-lg font-black text-[var(--kravy-brand)]">₹{bill.total.toFixed(2)}</span>
                  </div>
                ) : null;
              })()}

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    const ok = await deleteHeldBill(deleteConfirmId!);
                    if (ok) { fetchHeldBills(); setDeleteConfirmId(null); }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-white
                    font-black text-sm shadow-lg shadow-rose-500/30
                    hover:shadow-rose-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all
                    flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Haan, Delete Karo
                </button>
                <button
                  onClick={async () => setDeleteConfirmId(null)}
                  className="w-full py-3.5 rounded-2xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                    text-[var(--kravy-text-secondary)] font-black text-sm
                    hover:bg-[var(--kravy-surface-hover)] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          RESUME CONFIRM MODAL
      ════════════════════════════════════════════ */}
      {resumeConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={async () => setResumeConfirmId(null)}
          />
          <div className="relative w-full sm:max-w-sm bg-[var(--kravy-surface)] rounded-t-3xl sm:rounded-3xl
            shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[var(--kravy-border)] rounded-full" />
            </div>

            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Play size={28} className="text-emerald-500" fill="currentColor" />
              </div>
              <h3 className="text-xl font-black text-[var(--kravy-text-primary)] mb-2">Resume Order?</h3>
              <p className="text-sm text-[var(--kravy-text-muted)] font-medium leading-relaxed mb-6">
                Current cart ke items replace ho jaayenge.<br />Kya aap continue karna chahte hain?
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={async () => {
                    setShowHeldBills(false);
                    router.push(`/dashboard/billing/checkout?resumeBillId=${resumeConfirmId}`);
                    setResumeConfirmId(null);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white
                    font-black text-sm shadow-lg shadow-emerald-500/30
                    hover:-translate-y-0.5 active:scale-[0.98] transition-all
                    flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="currentColor" /> Haan, Resume Karo
                </button>
                <button
                  onClick={async () => setResumeConfirmId(null)}
                  className="w-full py-3.5 rounded-2xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)]
                    text-[var(--kravy-text-secondary)] font-black text-sm hover:bg-[var(--kravy-surface-hover)] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <BillPreview 
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        previewZoom={previewZoom}
        setPreviewZoom={setPreviewZoom}
        business={business}
        billNumber={billNumber}
        billDate={billDate}
        tokenNumber={(() => {
          const tn = tokenNumber;
          if (tn == null || tn === "" || tn === 0) return "---";
          if (typeof tn === 'object' && (tn as any).$numberLong) return (tn as any).$numberLong.toString().padStart(3, '0');
          return tn.toString().padStart(3, '0');
        })()}
        selectedTable={selectedTable}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        orderNotes={orderNotes}
        placeOfSupply={placeOfSupply}
        items={items}
        subtotal={subtotal}
        discountAmt={discountAmt}
        appliedOffer={appliedOffer}
        taxActive={taxActive}
        perProductEnabled={perProductEnabled}
        totalTaxable={totalTaxable}
        totalGst={totalGst}
        taxBreakup={taxBreakup}
        deliveryCharge={deliveryCharge}
        deliveryGst={deliveryGst}
        packagingCharge={packagingCharge}
        packagingGst={packagingGst}
        finalTotal={finalTotal}
        paymentMode={paymentMode}
        paymentStatus={paymentStatus}
        qrUrl={qrUrl}
        numberToWords={numberToWords}
        kravy={kravy}
        kotNumbers={kotNumbers}
        printKOT={printKOT}
        printReceipt={(enableKOT, customBill) => {
          printReceipt(enableKOT, customBill, () => {
            resetForm();
            setShowPreview(false);
            
            const returnTo = searchParams.get("returnTo");
            if (returnTo) {
              const tableId = searchParams.get("tableId");
              const orderId = searchParams.get("orderId") || syncedOrderId || customBill?.id;
              const query = new URLSearchParams();
              if (tableId) query.set("tableId", tableId);
              if (orderId) query.set("orderId", orderId);
              query.set("refresh", Date.now().toString());
              router.replace(`${returnTo.split('?')[0]}?${query.toString()}`);
            }
          });
        }}
        saveBill={saveBill}
        resetForm={resetForm}
        isSaving={isSaving}
        lastSavedBillId={lastSavedBillId}
        userRole={userRole}
        userPermissions={userPermissions}
        resumeBillId={resumeBillId}
        router={router}
      />

      {/* 📝 ORDER NOTES MODAL */}
      {showNotesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={async () => setShowNotesModal(false)} />
          <div className="relative w-full max-w-sm bg-[var(--kravy-surface)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[var(--kravy-border)] flex items-center justify-between bg-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <StickyNote size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--kravy-text-primary)]">Order Remarks</h3>
                  <p className="text-[9px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">Internal Store Notes</p>
                </div>
              </div>
              <button onClick={async () => setShowNotesModal(false)} className="text-[var(--kravy-text-muted)] hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                autoFocus
                placeholder="E.g. Gift wrapped, Handle with care, VIP customer..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full min-h-[120px] bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-2xl p-4
                  text-sm font-bold text-[var(--kravy-text-primary)] outline-none focus:ring-2 focus:ring-blue-500/20
                  focus:border-blue-500 transition-all placeholder:text-[var(--kravy-text-muted)] resize-none"
              />
              <button
                onClick={async () => { kravy.toggle(); setShowNotesModal(false); }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest
                  shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Save Remark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          VARIANT SELECTION MODAL
      ════════════════════════════════════════════ */}
      {variantModalItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVariantModalItem(null)} />
          <div className="relative bg-white dark:bg-[#121212] w-full max-w-[420px] rounded-[32px] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/10 overflow-hidden scale-100 animate-in zoom-in-95 fade-in duration-200">
            <div className="p-7">
              <div className="flex items-start justify-between mb-6">
                <div className="pr-4">
                  <h3 className="text-[26px] font-[900] text-slate-900 dark:text-white tracking-tight leading-none mb-2">Customize</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-snug">
                    {variantModalItem.name}
                  </p>
                </div>
                <button 
                  onClick={() => setVariantModalItem(null)}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-[14px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-5 pr-1 custom-scrollbar pb-2">
                {(variantModalItem.variants || []).map((vg: any, vgIndex: number) => {
                  const vgId = vg.id || vg.groupName || `group_${vgIndex}`;
                  const vgType = vg.type === 'checkbox' ? 'checkbox' : 'radio'; // default to radio if missing
                  return (
                  <div key={vgId} className="bg-slate-50 dark:bg-slate-800/50 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.15em]">{vg.groupName || vg.name || "Group"}</h4>
                      {vg.required && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-100 dark:bg-rose-500/20 px-2.5 py-1 rounded-full">Required</span>}
                    </div>
                    
                    <div className="space-y-4">
                      {vg.options?.map((opt: any, optIndex: number) => {
                        const optId = opt.id || opt.name || `opt_${optIndex}`;
                        const isSelected = selectedVariants[vgId]?.some(s => (s.id || s.name) === optId);
                        const isRadio = vgType === 'radio';
                        const optPrice = Number(opt.price || 0);
                        
                        return (
                          <label key={optId} className="flex items-center gap-4 cursor-pointer group select-none">
                            <div className={`flex items-center justify-center transition-all ${
                              isRadio ? 'w-6 h-6 rounded-full border-[2.5px]' : 'w-[22px] h-[22px] rounded-lg border-[2.5px]'
                            } ${
                              isSelected 
                                ? 'bg-white dark:bg-indigo-600 border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.15)]' 
                                : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                            }`}>
                              {isSelected && (
                                isRadio ? (
                                  <div className="w-2.5 h-2.5 bg-indigo-600 dark:bg-white rounded-full" />
                                ) : (
                                  <Check size={14} className="text-indigo-600 dark:text-white" strokeWidth={4} />
                                )
                              )}
                            </div>
                            
                            <input 
                              type={isRadio ? 'radio' : 'checkbox'}
                              name={`variant_${vgId}`}
                              className="hidden"
                              checked={isSelected || false}
                              onChange={() => {
                                kravy.toggle();
                                setSelectedVariants(prev => {
                                  const currentSel = prev[vgId] || [];
                                  if (isRadio) {
                                    return { ...prev, [vgId]: [{ ...opt, id: optId }] };
                                  } else {
                                    if (isSelected) {
                                      return { ...prev, [vgId]: currentSel.filter(s => (s.id || s.name) !== optId) };
                                    } else {
                                      return { ...prev, [vgId]: [...currentSel, { ...opt, id: optId }] };
                                    }
                                  }
                                });
                              }}
                            />
                            
                            <div className="flex-1 flex justify-between items-center pt-0.5">
                              <span className={`text-[15px] font-[700] transition-all capitalize tracking-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                {opt.name}
                              </span>
                              {optPrice > 0 && (
                                <span className={`text-[13px] font-black tracking-wide ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                  {(variantModalItem as any).isVirtualGroup ? `₹${optPrice}` : `+₹${optPrice}`}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )})}

                {/* Addons List */}
                {((variantModalItem as any).addons || []).map((ag: any, agIndex: number) => {
                  const vgId = `ag_${ag.id}`;
                  const minSelForUI = ag.minSelection || ag.minSelections || 0;
                  const isCompulsory = minSelForUI > 0 || ag.isCompulsory;
                  return (
                  <div key={vgId} className="bg-slate-50 dark:bg-slate-800/50 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.15em]">{ag.name || "Addons"}</h4>
                      {isCompulsory && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-100 dark:bg-rose-500/20 px-2.5 py-1 rounded-full">Required (Min {minSelForUI || 1})</span>}
                    </div>
                    
                    <div className="space-y-4">
                      {ag.items?.map((opt: any, optIndex: number) => {
                        const optId = opt.id || opt.name || `opt_${optIndex}`;
                        const isSelected = selectedVariants[vgId]?.some(s => (s.id || s.name) === optId);
                        const optPrice = Number(opt.price || 0);
                        
                        return (
                          <label key={optId} className="flex items-center gap-4 cursor-pointer group select-none">
                            <div className={`flex items-center justify-center transition-all w-[22px] h-[22px] rounded-lg border-[2.5px] ${
                              isSelected 
                                ? 'bg-white dark:bg-indigo-600 border-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.15)]' 
                                : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                            }`}>
                              {isSelected && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              )}
                            </div>
                            
                            <input 
                              type="checkbox"
                              name={`addon_${vgId}`}
                              className="hidden"
                              checked={isSelected || false}
                              onChange={() => {
                                kravy.toggle();
                                setSelectedVariants(prev => {
                                  const currentSel = prev[vgId] || [];
                                  if (isSelected) {
                                    return { ...prev, [vgId]: currentSel.filter(s => (s.id || s.name) !== optId) };
                                  } else {
                                    if (ag.maxSelections && currentSel.length >= ag.maxSelections) {
                                      toast.error(`Max ${ag.maxSelections} selections allowed`);
                                      return prev;
                                    }
                                    return { ...prev, [vgId]: [...currentSel, { ...opt, id: optId }] };
                                  }
                                });
                              }}
                            />
                            
                            <div className="flex-1 flex justify-between items-center pt-0.5">
                              <span className={`text-[15px] font-[700] transition-all capitalize tracking-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                {opt.name}
                              </span>
                              {optPrice > 0 && (
                                <span className={`text-[13px] font-black tracking-wide ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                  +₹{optPrice}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )})}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => confirmVariantAddToCart()}
                  className="w-full h-[60px] bg-gradient-to-r from-[#4F46E5] to-[#6366F1] hover:from-[#4338CA] hover:to-[#4F46E5] text-white rounded-[20px] font-[900] text-[15px] uppercase tracking-widest shadow-[0_12px_24px_-8px_rgba(79,70,229,0.6)] hover:shadow-[0_16px_32px_-8px_rgba(79,70,229,0.7)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all flex justify-between items-center px-8"
                >
                  <span>Add to Order</span>
                  <span className="text-lg">₹{
                    (() => {
                      let basePrice = variantModalItem.price || 0;
                      let varPrice = 0;
                      let addPrice = 0;
                      Object.entries(selectedVariants).forEach(([k, opts]) => {
                        opts.forEach((o: any) => {
                          if (k.startsWith('ag_')) addPrice += Number(o.price || 0);
                          else varPrice += Number(o.price || 0);
                        });
                      });
                      let finalBase = varPrice > 0 ? varPrice : basePrice;
                      if ((variantModalItem as any).isVirtualGroup && varPrice > 0) finalBase = varPrice;
                      return finalBase + addPrice;
                    })()
                  }</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          QUICK ADD ITEM MODAL
      ════════════════════════════════════════════ */}
      {quickAddCat && (
        <ItemModal
          item={{ categoryId: quickAddCat.id }}
          addonGroups={addonGroups}
          categories={categoriesList}
          onSave={async (data: any) => {
            setQuickAddCat(null);
            const tempId = `temp-${Date.now()}`;
            const optimisticItem = { ...data, id: tempId, category: { id: quickAddCat.id, name: quickAddCat.name } };
            setMenuItems(prev => [optimisticItem, ...prev]);
            kravy.success();
            toast.success(`"${data.name}" adding...`);

            try {
              const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
              });
              if (!res.ok) throw new Error();
              const savedItem = await res.json();
              setMenuItems(prev => prev.map(it => it.id === tempId ? { ...savedItem, category: { id: quickAddCat.id, name: quickAddCat.name } } : it));
            } catch {
              toast.error("Failed to add item");
              setMenuItems(prev => prev.filter(it => it.id !== tempId));
            }
          }}
          onClose={() => setQuickAddCat(null)}
        />
      )}
      {/* ════════════════════════════════════════════
          QUICK ADD CATEGORY MODAL
      ════════════════════════════════════════════ */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/10" onClick={async () => setShowAddCategory(false)} />
          <div className="relative bg-[var(--kravy-surface)] w-full max-w-sm rounded-[2rem] shadow-2xl border border-[var(--kravy-border)] overflow-hidden scale-100 animate-in fade-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[var(--kravy-border)]/50">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={24} className="text-amber-500" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--kravy-text-primary)] leading-tight">New Category</h3>
                  <p className="text-[10px] text-[var(--kravy-text-muted)] font-black uppercase tracking-widest mt-0.5">
                    Add menu section
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleQuickAddCategory} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-1">Category Name</label>
                  <input
                    name="name"
                    autoFocus
                    autoComplete="off"
                    placeholder="e.g. Desserts"
                    required
                    className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold"
                  />
                </div>
                
                <div className="space-y-1 mt-3">
                  <label className="text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider ml-1">Assigned Zone</label>
                  <select
                    name="zone"
                    className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold appearance-none"
                  >
                    <option value="">-- Global (Available in all zones) --</option>
                    {availableZones?.map((z: string) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={async () => setShowAddCategory(false)}
                    className="flex-1 py-3 rounded-xl border border-[var(--kravy-border)] bg-[var(--kravy-bg)] text-[var(--kravy-text-secondary)] font-black text-xs hover:bg-[var(--kravy-surface-hover)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 rounded-xl bg-amber-500 text-white font-black text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          QUICK ADD ADDON MODAL
      ════════════════════════════════════════════ */}
      {quickAddAddonGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={async () => setQuickAddAddonGroup(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                     <Plus size={20} strokeWidth={3} />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Quick Add Addon</h3>
                     <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Adding to {quickAddAddonGroup.name}</p>
                  </div>
               </div>

               <form onSubmit={handleQuickAddAddon} className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Addon Name</label>
                     <input 
                        autoFocus
                        name="name"
                        placeholder="e.g. Extra Cheese"
                        className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                     />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Price (₹)</label>
                     <input 
                        name="price"
                        type="number"
                        placeholder="0.00"
                        className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-mono"
                     />
                  </div>

                  <div className="space-y-1.5 pt-1">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Map to Categories</label>
                     <div className="max-h-28 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 space-y-2">
                        {categoriesList.filter(c => c.name !== 'All').map(cat => (
                           <label key={cat.id} className="flex items-center gap-3 cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <input 
                                 type="checkbox" 
                                 name="categoryIds" 
                                 value={cat.id}
                                 defaultChecked={(quickAddAddonGroup.categoryIds || []).includes(cat.id)}
                                 className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                           </label>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                     <button 
                        type="button"
                        onClick={async () => setQuickAddAddonGroup(null)}
                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[0.7rem] hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                     >
                        Abort
                     </button>
                     <button 
                        type="submit"
                        className="h-12 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-[0.15em] text-[0.75rem] shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                     >
                        Register Node
                     </button>
                  </div>
               </form>
            </div>
          </motion.div>
        </div>
      )}

      {isZoneManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
          >
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <Settings size={16} className="text-indigo-500" />
                Manage Zones
              </h3>
              <button 
                onClick={() => setIsZoneManagerOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Zone Name..."
                  value={newZoneName}
                  onChange={e => setNewZoneName(e.target.value)}
                  className="flex-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
                />
                <button 
                  disabled={isZoneLoading || !newZoneName.trim()}
                  onClick={async () => {
                    if (!newZoneName.trim()) return;
                    setIsZoneLoading(true);
                    try {
                      const res = await fetch("/api/profile/zones", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "add", zoneName: newZoneName.trim() })
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast.success("Zone added");
                        setNewZoneName("");
                        setBusiness(prev => prev ? { ...prev, zones: data.zones } : prev);
                      } else {
                        toast.error(data.error || "Failed to add zone");
                      }
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                    setIsZoneLoading(false);
                  }}
                  className="h-10 px-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isZoneLoading ? "..." : "Add"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 border border-slate-100 dark:border-white/5 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/50">
                {availableZones.length === 0 ? (
                  <div className="text-center text-xs font-bold text-slate-400 py-4 uppercase tracking-wider">No zones defined</div>
                ) : (
                  availableZones.map(zone => (
                    <div key={zone} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-lg group">
                      {editingZone?.old === zone ? (
                        <input 
                          autoFocus
                          value={editingZone.new}
                          onChange={e => setEditingZone({ ...editingZone, new: e.target.value })}
                          className="flex-1 h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 rounded text-xs font-bold outline-none"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider pl-1">{zone}</span>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {editingZone?.old === zone ? (
                          <>
                            <button 
                              disabled={isZoneLoading || !editingZone.new.trim()}
                              onClick={async () => {
                                if (!editingZone.new.trim() || editingZone.old === editingZone.new) {
                                  setEditingZone(null);
                                  return;
                                }
                                setIsZoneLoading(true);
                                try {
                                  const res = await fetch("/api/profile/zones", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "edit", oldZone: editingZone.old, newZone: editingZone.new.trim() })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    toast.success("Zone updated successfully!");
                                    window.location.reload();
                                  } else {
                                    toast.error(data.error || "Failed to update zone");
                                  }
                                } catch (err: any) {
                                  toast.error(err.message);
                                }
                                setIsZoneLoading(false);
                              }}
                              className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition-colors"
                            >
                              <Save size={12} />
                            </button>
                            <button 
                              onClick={() => setEditingZone(null)}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => setEditingZone({ old: zone, new: zone })}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (await confirm(`Are you sure you want to delete zone '${zone}'? This will remove it from all items.`)) {
                                  setIsZoneLoading(true);
                                  try {
                                    const res = await fetch("/api/profile/zones", {
                                      method: "DELETE",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "delete", zoneName: zone })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      toast.success("Zone deleted successfully!");
                                      window.location.reload();
                                    } else {
                                      toast.error(data.error || "Failed to delete zone");
                                    }
                                  } catch (err: any) {
                                    toast.error(err.message);
                                  }
                                  setIsZoneLoading(false);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

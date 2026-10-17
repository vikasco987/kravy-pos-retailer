"use client";

import { useCurrency } from '@/lib/currency-context';
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { generateTextReceiptPreview, ensurePrinterConnected, printReceiptData } from "@/lib/web-bluetooth";
import { 
  MessageCircle, Printer, Download, ArrowLeft, Receipt, 
  Calendar, Clock, UtensilsCrossed, User, Phone, Eye,
  CreditCard, CheckCircle2, AlertCircle, IndianRupee, Bluetooth, History
} from "lucide-react";
import { formatWhatsAppNumber } from "@/lib/whatsapp";
import { WhatsAppBillButton } from "@/components/WhatsAppBillButton";
import { useAuthContext } from "@/components/AuthContext";
import PrintTemplates from "@/components/printing/PrintTemplates";
import BillHistoryModal from "../components/BillHistoryModal";
import { toast } from "sonner";
import type {
  BillManager,
  BusinessProfile as PrismaBusinessProfile,
} from "@prisma/client";


type BillItem = {
  name: string;
  qty: number;
  rate: number;
  gst?: number;
  hsnCode?: string | null;
  variants?: any[];
  isNew?: boolean;
};

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

type BusinessProfile = {
  businessName: string;
  businessTagLine?: string;
  gstNumber?: string;
  businessAddress?: string;
  district?: string;
  state?: string;
  pinCode?: string;
};

type BillResponse = {
  bill: BillManager;
  business: PrismaBusinessProfile | null;
};




export default function ViewBillPage() {
  const { currencySymbol: sym } = useCurrency();
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo");

  const { user: authUser } = useAuthContext();
  const userRole = authUser?.type || null;
  const userPermissions = authUser?.permissions || [];

  const [bill, setBill] = useState<BillManager | null>(null);
  const [business, setBusiness] = useState<PrismaBusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJson, setShowJson] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWebPreview, setShowWebPreview] = useState(false);
  const [webPreviewText, setWebPreviewText] = useState("");
  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const previewReceiptRef = useRef<HTMLDivElement>(null);
  const previewKotRef = useRef<HTMLDivElement>(null);

  const handleWebPreview = async () => {
    try {
      if (typeof generateTextReceiptPreview !== 'function') {
        throw new Error(`generateTextReceiptPreview is not a function. Type is ${typeof generateTextReceiptPreview}`);
      }
      const text = generateTextReceiptPreview(bill, business, false);
      setWebPreviewText(text);
      setShowWebPreview(true);
    } catch(e: any) {
      console.error("Web Preview Error:", e);
      toast.error(e.message || "Failed to show preview. Check console for details.");
    }
  };


  // ✅ Fetch from BillManager API
  useEffect(() => {
    fetch(`/api/bill-manager/${id}`)
      .then((r) => r.json())
      .then((data: BillResponse) => {
        setBill(data.bill);
        setBusiness(data.business);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (bill && business && !loading) {
      const autoPrint = searchParams.get("autoPrint");
      if (autoPrint === "bt") {
        const doPrint = async () => {
          try {
            const { ensurePrinterConnected, printReceiptData } = await import("@/lib/web-bluetooth");
            await ensurePrinterConnected();
            await printReceiptData(bill, business, receiptRef.current);
          } catch (e: any) {
            toast.error(e.message || "Auto Web Print failed");
          }
        };
        // Small delay to ensure the DOM is painted for receiptRef
        setTimeout(doPrint, 500);
      }
    }
  }, [bill, business, loading, searchParams]);


  // ✅ Print receipt function using dynamic spooler configurations and variables
  const runPrintJob = (type: "kot" | "bill", html: string) => {
    setTimeout(() => {
      const containerId = `print-container-${type}`;
      const styleId = `print-style-${type}`;

      // Clean ONLY this specific type's old containers
      document.getElementById(containerId)?.remove();
      document.getElementById(styleId)?.remove();

      const ps = (business as any)?.printSettings || {};
      const is80 = ps.paperWidth === '80mm';
      const paperWidth = is80 ? '74mm' : '58mm';
      const paperBottomPadding = ps.paperBottomPadding !== undefined && ps.paperBottomPadding !== null ? `${ps.paperBottomPadding}px` : '80px';

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

      const nameLen = (business?.businessName || "").length;
      let finalBusinessNameSize = rawBusinessNameSize;
      if (nameLen > 25) finalBusinessNameSize -= 2;
      if (nameLen > 35) finalBusinessNameSize -= 2;
      finalBusinessNameSize = Math.max(14, finalBusinessNameSize);

      const addrLen = (business?.businessAddress || "").length;
      let finalAddressSize = businessAddressSize;
      if (addrLen > 60) finalAddressSize -= 1;
      if (addrLen > 100) finalAddressSize -= 1;
      finalAddressSize = Math.max(8, finalAddressSize);

      // Create Style
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @media print {
          html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > *:not(#${containerId}) { display: none !important; }
          @page { margin: 0; size: ${is80 ? '80mm auto' : 'auto'}; }

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
          #${containerId} .receipt-container-dynamic, #${containerId}.receipt-container-dynamic, #${containerId} .receipt-container-dynamic *, #${containerId}.receipt-container-dynamic * {
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
          #${containerId} .kot-container-dynamic, #${containerId}.kot-container-dynamic, #${containerId} .kot-container-dynamic *, #${containerId}.kot-container-dynamic * {
            font-family: var(--k-font-family) !important;
          }

          ${fontWeightVal ? `
          #${containerId} .receipt-container-dynamic, #${containerId}.receipt-container-dynamic, #${containerId} .receipt-container-dynamic *, #${containerId}.receipt-container-dynamic * {
            font-weight: ${fontWeightVal} !important;
          }
          ` : ''}

          ${kotFontWeightVal ? `
          #${containerId} .kot-container-dynamic, #${containerId}.kot-container-dynamic, #${containerId} .kot-container-dynamic *, #${containerId}.kot-container-dynamic * {
            font-weight: ${kotFontWeightVal} !important;
          }
          ` : ''}

          * { color: #000 !important; border-color: #000 !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          img { filter: grayscale(100%) contrast(300%) !important; max-width: 100% !important; display: block !important; margin: 0 auto !important; }

          /* 3-inch print layout: explicit CSS fallbacks for Tailwind utility classes */
          ${is80 ? `
          #${containerId} .flex { display: flex !important; }
          #${containerId} .flex-1 { flex: 1 1 0% !important; }
          #${containerId} .shrink-0 { flex-shrink: 0 !important; }
          #${containerId} .min-w-0 { min-width: 0 !important; }
          #${containerId} .justify-between { justify-content: space-between !important; }
          #${containerId} .items-start { align-items: flex-start !important; }
          #${containerId} .items-center { align-items: center !important; }
          #${containerId} .text-center { text-align: center !important; }
          #${containerId} .text-right { text-align: right !important; }
          #${containerId} .text-left { text-align: left !important; }
          #${containerId} .break-words { overflow-wrap: break-word !important; word-break: break-word !important; }
          #${containerId} .whitespace-nowrap { white-space: nowrap !important; }
          #${containerId} .w-\\[26mm\\] { width: 26mm !important; }
          #${containerId} .w-\\[16mm\\] { width: 16mm !important; }
          #${containerId} .w-\\[12mm\\] { width: 12mm !important; }
          #${containerId} .pr-1 { padding-right: 0.25rem !important; }
          #${containerId} .pr-2 { padding-right: 0.5rem !important; }
          #${containerId} .pl-0\\.5 { padding-left: 0.125rem !important; }
          #${containerId} .pl-1 { padding-left: 0.25rem !important; }
          #${containerId} .leading-\\[1\\.2\\] { line-height: 1.2 !important; }
          #${containerId} .leading-tight { line-height: 1.25 !important; }
          #${containerId} .font-bold { font-weight: 700 !important; }
          #${containerId} .font-black { font-weight: 900 !important; }
          #${containerId} .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem !important; }
          #${containerId} .border-b { border-bottom-width: 1px !important; }
          #${containerId} .border-t { border-top-width: 1px !important; }
          #${containerId} .border-t-2 { border-top-width: 2px !important; }
          #${containerId} .border-y-2 { border-top-width: 2px !important; border-bottom-width: 2px !important; }
          #${containerId} .border-dashed { border-style: dashed !important; }
          #${containerId} .border-dotted { border-style: dotted !important; }
          #${containerId} .uppercase { text-transform: uppercase !important; }
          #${containerId} .italic { font-style: italic !important; }
          #${containerId} .mb-2 { margin-bottom: 0.5rem !important; }
          #${containerId} .pb-1 { padding-bottom: 0.25rem !important; }
          #${containerId} .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
          #${containerId} .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
          #${containerId} .px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
          #${containerId} .my-1 { margin-top: 0.25rem !important; margin-bottom: 0.25rem !important; }
          #${containerId} .mt-0\\.5 { margin-top: 0.125rem !important; }
          #${containerId} .mt-1 { margin-top: 0.25rem !important; }
          #${containerId} .mt-2 { margin-top: 0.5rem !important; }
          #${containerId} .mt-3 { margin-top: 0.75rem !important; }
          #${containerId} .mt-4 { margin-top: 1rem !important; }
          #${containerId} .mb-1 { margin-bottom: 0.25rem !important; }
          #${containerId} .pt-1 { padding-top: 0.25rem !important; }
          #${containerId} .pt-2 { padding-top: 0.5rem !important; }
          #${containerId} .w-full { width: 100% !important; }
          #${containerId} .border-collapse { border-collapse: collapse !important; }
          #${containerId} .w-\\[30mm\\] { width: 30mm !important; }
          #${containerId} .h-\\[30mm\\] { height: 30mm !important; }
          #${containerId} .inline-block { display: inline-block !important; }
          #${containerId} .block { display: block !important; }
          #${containerId} .flex-wrap { flex-wrap: wrap !important; }
          ` : ''}
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
      spacer.style.color = "transparent";
      spacer.innerHTML = ".";
      container.appendChild(spacer);

      document.body.appendChild(container);

      // Dynamic Image Preloader: Ensure logo and QR codes are fully loaded before print dialog opens
      const images = container.querySelectorAll("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      });

      Promise.all(imagePromises).then(() => {
        const timeoutDelay = images.length > 0 ? 150 : 10;
        setTimeout(() => {
          window.print();
          
          // Delay cleanup significantly to ensure slow spoolers finish reading the DOM
          setTimeout(() => {
            if (document.body.contains(container)) container.remove();
            if (document.head.contains(style)) style.remove();
          }, 15000); 
        }, timeoutDelay);
      });
    }, 50);
  };

  function printReceipt() {
    if (receiptRef.current) {
      runPrintJob("bill", receiptRef.current.innerHTML);
    } else {
      toast.error("Nothing to print");
    }
  }

  const handleWhatsApp = async () => {
    if (!bill) return;
    let pdfUrl = (bill as any).pdfUrl;
    const origin = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    // 1. Try to fetch Cloudinary URL if missing
    if (!pdfUrl) {
      try {
        const res = await fetch(`/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}&json=true`);
        const data = await res.json();
        if (data && data.url) {
          pdfUrl = data.url;
        }
      } catch (err) {
        console.error("Failed to get PDF URL:", err);
      }
    }

    // 2. FINAL FALLBACK: If still null, use the local API URL
    if (!pdfUrl) {
      pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    }

    // 3. Prepare Items Summary
    const itemsList = billItems
      .map((i) => `• ${i.name} ×${i.qty} – ₹${(Number(i.qty ?? 0) * Number(i.rate ?? 0)).toFixed(2)}`)
      .join("\n");

    const phone = formatWhatsAppNumber(bill.customerPhone);
    const restaurantName = business?.businessName || "Kravy POS";
    // origin is already declared above at line 460
    const menuUrl = `${origin}/menu/${bill.clerkUserId}`;
    const showMenu = business?.menuLinkEnabled !== false;
    
    // Using string concatenation to ensure best emoji compatibility
    const message = encodeURIComponent(
      "🙏 *Thank you for shopping with us!*\n\n" +
      `Hello *${bill.customerName || "Customer"}*,\n\n` +
      `Here is your invoice from *${restaurantName}*:\n\n` +
      "🧾 *Bill No:* " + bill.billNumber + "\n" +
      "💰 *Amount Paid:* Rs. " + bill.total + "\n\n" +
      "📄 *Download Invoice:*\n" +
      pdfUrl + "\n\n" +
      (showMenu ? ("🍴 *View Our Menu:*\n" + menuUrl + "\n\n") : "") +
      "We look forward to serving you again! 😊"
    );
    window.open(phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  if (loading) return <p className="p-6">Loading bill...</p>;
  if (!bill) return <p className="p-6">Bill not found</p>;
  const billItems: BillItem[] = Array.isArray(bill.items)
    ? (bill.items as any[]).map((i: any) => ({
      name: i.name || "Unknown Item",
      qty: Number(i.qty ?? i.quantity ?? 0),
      rate: Number(i.rate ?? i.price ?? 0),
      gst: i.gst !== undefined ? Number(i.gst) : undefined,
      hsnCode: i.hsnCode || null,
      variants: i.variants || [],
      isNew: i.isNew ?? false,
    }))
    : [];

  // ── Precise Print-Time Calculations matching POS Checkout spooler ──
  const tableName = (bill as any).tableName || (bill as any).selectedTable || "";
  const isDining = tableName && tableName !== "POS" && tableName !== "TAKEAWAY" && tableName !== "DELIVERY";

  // Historically accurate tax active state
  const taxActive = (bill.tax || 0) > 0 || (bill.deliveryGst || 0) > 0 || (bill.packagingGst || 0) > 0;
  const perProductEnabled = true;
  const globalRate = 0;
  const globalTaxInclusive = false;

  const discountAmt = bill.discountAmount || 0;
  
  // Recalculate discount ratio
  const discountRatio = bill.subtotal > 0 ? (bill.subtotal - discountAmt) / bill.subtotal : 1;

  const taxGroups = billItems.reduce((acc: any, item: any) => {
    const rawItem = (bill.items as any[]).find((it: any) => (it.name === item.name || it.id === item.id)) || {};
    
    let rate = 0;
    if (taxActive && perProductEnabled && rawItem.gst !== undefined && rawItem.gst !== null) {
      rate = Number(rawItem.gst);
    } else if (taxActive) {
      rate = globalRate;
    }
    
    const gross = (item.qty * item.rate) * discountRatio;
    let taxable = gross;
    let gst = 0;

    const taxStatus = rawItem.taxStatus || "Without Tax";
    let isInclusive = taxStatus === "With Tax";

    // If perProductTax is disabled, use global taxInclusive setting
    if (!perProductEnabled) {
      if (typeof (bill as any).isTaxInclusive === 'boolean') {
        isInclusive = (bill as any).isTaxInclusive;
      } else {
        isInclusive = globalTaxInclusive;
      }
    }

    if (isInclusive) {
      taxable = gross / (1 + rate / 100);
      gst = gross - taxable;
    } else {
      taxable = gross;
      gst = (gross * rate) / 100;
    }

    const isInterState = (bill as any).placeOfSupply && business?.state && 
      (bill as any).placeOfSupply.trim().toLowerCase() !== business.state.trim().toLowerCase();

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

  /* ================= Delivery / Packaging / Service Charges ================= */
  const deliveryCharge = (bill as any).deliveryCharges || 0;
  const packagingCharge = (bill as any).packagingCharges || 0;
  const serviceCharge = (bill as any).serviceCharge || 0;
  const deliveryGst = (deliveryCharge > 0 && business?.deliveryGstEnabled)
    ? (deliveryCharge * (business?.deliveryGstRate || 0) / 100)
    : 0;
  const packagingGst = (packagingCharge > 0 && business?.packagingGstEnabled)
    ? (packagingCharge * (business?.packagingGstRate || 0) / 100)
    : 0;

  /* ================= UPI ================= */
  const upiLink = `upi://pay?pa=${business?.upi || ""}&pn=${encodeURIComponent(business?.businessName || "Store")}&am=${bill.total.toFixed(2)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
  
  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/billing");
    }
  };

  return (
    <div className="w-full min-h-full text-slate-900 dark:text-slate-100 p-0 sm:p-1 md:p-2">
      <style>{`
        @keyframes pageSlideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .page-slide-in {
          animation: pageSlideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 page-slide-in">
        
        {/* ── Top Navigation Row: Back Arrow Button ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all active:scale-95"
            title="Go Back"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-xs sm:text-sm font-black">Back</span>
          </button>
        </div>

        {/* ── Status Alert (Hold) ── */}
        {bill.isHeld && (
          <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="animate-spin text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs sm:text-sm uppercase tracking-tight">Bill is on Hold</p>
              <p className="text-[11px] sm:text-xs font-medium opacity-80 truncate">Unhold the bill to proceed with printing or payment.</p>
            </div>
          </div>
        )}

        {/* ── Page Header / Action Bar ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Bill Title & Meta */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
              <Receipt className="text-white" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">Bill</span>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight break-all">
                  #{bill.billNumber}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  bill.paymentStatus?.toLowerCase() === 'paid' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' 
                    : bill.paymentStatus?.toLowerCase() === 'partial'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                }`}>
                  {bill.paymentStatus || 'Pending'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(bill.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="opacity-30">•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(bill.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons (Responsively wrapping, touch-friendly) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full xl:w-auto">
            <button
              onClick={printReceipt}
              disabled={bill.isHeld}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Printer size={15} className="text-indigo-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleWebPreview}
              disabled={bill.isHeld}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Eye size={15} className="text-purple-500" />
              <span className="whitespace-nowrap">Web Preview</span>
            </button>

            <button
              onClick={async () => {
                try {
                  await ensurePrinterConnected();
                  await printReceiptData(bill, business, receiptRef.current);
                } catch (err: any) {
                  toast.error(err.message || "Web Print failed");
                }
              }}
              disabled={bill.isHeld}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:opacity-90 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Bluetooth size={15} className="text-indigo-400 dark:text-indigo-600" />
              <span className="whitespace-nowrap">Web Print</span>
            </button>

            <button
              onClick={() => setShowJson(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95"
            >
              JSON
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-sm active:scale-95"
            >
              <History size={15} />
              <span>History</span>
            </button>

            <button
              onClick={() => window.open((bill as any).pdfUrl || `/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`, "_blank")}
              disabled={bill.isHeld}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download size={15} className="text-sky-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* ── Main Responsive Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* LEFT 2 COLUMNS: Order Summary */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <UtensilsCrossed size={16} className="text-indigo-500" /> Order Summary
                </h2>
                <span className="text-xs font-bold px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                  {billItems.length} {billItems.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
                      <th className="px-4 sm:px-6 py-3.5">Product</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Qty</th>
                      <th className="px-3 sm:px-4 py-3.5 text-right">Price</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {billItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 min-w-[140px]">
                          <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 break-words">{item.name}</p>
                          {item.variants && item.variants.length > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {item.variants.map((v: any) => v.name || v).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.qty}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3.5 text-right font-medium text-slate-500 dark:text-slate-400 text-xs sm:text-sm whitespace-nowrap">
                          {sym}{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-black text-slate-900 dark:text-white text-xs sm:text-sm whitespace-nowrap">
                          {sym}{((item.qty || 0) * (item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Section */}
              <div className="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <div className="w-full sm:max-w-xs space-y-2.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">{sym}{(bill.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {discountAmt > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      <span className="font-semibold">Discount</span>
                      <span className="font-black">-{sym}{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {bill.tax ? (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">GST / Tax</span>
                      <span className="font-black text-amber-600 dark:text-amber-400">{sym}{(bill.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : null}

                  {deliveryCharge > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Delivery Charge</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">{sym}{deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {packagingCharge > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Packaging Charge</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">{sym}{packagingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Grand Total</span>
                    <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{sym}{(bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Information Cards */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Customer Info Card */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-2 right-2 p-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <User size={70} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <User size={14} className="text-indigo-500" /> Customer Information
              </h3>
              <div className="space-y-3.5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Full Name</p>
                  <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">{bill.customerName || "Walk-in Customer"}</p>
                </div>
                {bill.customerPhone && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Phone Number</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} className="text-emerald-500" />
                      {bill.customerPhone}
                    </p>
                  </div>
                )}
                {(bill as any).buyerGSTIN && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">GSTIN Number</p>
                    <p className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase">{(bill as any).buyerGSTIN}</p>
                  </div>
                )}
                {(bill as any).customerAddress && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Address</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{(bill as any).customerAddress}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Info Card */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-2 right-2 p-2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <CreditCard size={70} />
              </div>
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <CreditCard size={14} className="text-emerald-500" /> Payment Details
              </h3>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Payment Mode</p>
                    <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      {bill.paymentMode?.startsWith("Split") ? "Split Payment" : (bill.paymentMode || "Cash")}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${
                    bill.paymentStatus?.toLowerCase() === 'paid' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' 
                      : bill.paymentStatus?.toLowerCase() === 'partial' 
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' 
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                  }`}>
                    {bill.paymentStatus?.toLowerCase() === 'paid' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                </div>

                {bill.paymentMode?.startsWith("Split") && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {bill.paymentMode.replace("Split (", "").replace(")", "").split(",").map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700 uppercase">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {bill.paymentStatus?.toLowerCase() === 'partial' && (
                  <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/50 mt-1">
                    <div>
                      <p className="text-[9px] font-bold text-amber-600/70 dark:text-amber-400 uppercase">Paid</p>
                      <p className="text-xs font-black text-amber-700 dark:text-amber-300">{sym}{(bill.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-rose-600/70 dark:text-rose-400 uppercase">Balance Due</p>
                      <p className="text-xs font-black text-rose-700 dark:text-rose-300">{sym}{(bill.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}

                {bill.upiTxnRef && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Transaction ID</p>
                    <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 break-all">
                      {bill.upiTxnRef}
                    </p>
                  </div>
                )}

                {bill.tableName && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Source / Table</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black uppercase mt-0.5">
                      <UtensilsCrossed size={12} />
                      {bill.tableName}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Business Quick Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/20">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">Business Name</p>
              <p className="text-base sm:text-lg font-black truncate mb-3">{business?.businessName || "Kravy POS"}</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/15">
                <div>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-tight">Total Bill</p>
                  <p className="text-lg sm:text-xl font-black tracking-tight">{sym}{(bill.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <IndianRupee size={18} />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
      {/* PRINT RECEIPT — Unified PrintTemplates (honours all printSettings) */}

      <PrintTemplates
        receiptRef={receiptRef}
        kotRef={kotRef}
        business={business}
        billNumber={bill.billNumber}
        billDate={new Date(bill.createdAt).toLocaleString('en-IN')}
        tokenNumber={(() => {
          const tn = (bill as any).tokenNumber;
          if (tn == null || tn === '' || tn === 0) return '---';
          if (typeof tn === 'object' && (tn as any).$numberLong) return (tn as any).$numberLong.toString().padStart(3, '0');
          return tn.toString().padStart(3, '0');
        })()}
        selectedTable={(bill as any).tableName || 'POS'}
        customerName={(bill as any).customerName || ''}
        customerPhone={(bill as any).customerPhone || ''}
        customerAddress={(bill as any).customerAddress || ''}
        orderNotes={(bill as any).notes || (bill as any).auditNote || ''}
        buyerGSTIN={(bill as any).buyerGSTIN || ''}
        placeOfSupply={(bill as any).placeOfSupply || ''}
        items={billItems}
        subtotal={bill.subtotal}
        discountAmt={discountAmt}
        appliedOffer={(bill as any).discountCode ? { code: (bill as any).discountCode } : null}
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
        finalTotal={bill.total}
        paymentMode={(bill as any).paymentMode || ''}
        paymentStatus={bill.paymentStatus || ''}
        upiTxnRef={(bill as any).upiTxnRef || ''}
        qrUrl={qrUrl}
        prevWalletBalance={null}
        selectedParty={null}
        kotNumbers={(bill as any).kotNumbers || []}
        numberToWords={numberToWords}
      />

      {showJson && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.6)", padding: "20px" }}>
          <div style={{ margin: "auto", background: "#0F172A", width: "100%", maxWidth: "600px", borderRadius: "20px", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "90vh", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "#1E293B", borderBottom: "1px solid #334155" }}>
               <div style={{ fontSize: "1.15rem", fontWeight: 950, color: "white" }}>JSON Debug View</div>
               <button onClick={() => setShowJson(false)} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", color: "#94A3B8", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "0.2s" }} className="hover:bg-red-500/20 hover:text-red-400">
                 <span style={{ fontSize: "24px", lineHeight: 1 }}>×</span>
               </button>
            </div>
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, position: "relative" }}>
               <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(bill, null, 2)); toast.success("JSON copied!"); }} style={{ position: "absolute", top: "24px", right: "24px", padding: "6px 12px", background: "#3B82F6", color: "white", borderRadius: "6px", border: "none", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold", zIndex: 10, transition: "0.2s" }} className="hover:bg-blue-600">Copy JSON</button>
               <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", color: "#94A3B8", wordBreak: "break-all" }}>
                 <div style={{ fontWeight: "bold", color: "#F8FAFC", marginBottom: "4px" }}>Fetch URL:</div>
                 /api/bill-manager/{id}
               </div>
               <pre style={{ margin: 0, color: "#38BDF8", fontFamily: "monospace", fontSize: "0.85rem", overflowX: "auto", paddingTop: "12px" }}>{JSON.stringify(bill, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Web Print Preview Modal */}
      {showWebPreview && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Bluetooth className="text-indigo-500" size={20} />
                Web Print Preview
              </h3>
              <button 
                onClick={() => setShowWebPreview(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-black/50 flex-1 flex flex-col items-center">
              <div 
                className="bg-white w-[80mm] min-h-[100px] p-4 shadow-md text-black whitespace-pre leading-tight mx-auto border border-slate-200 overflow-x-auto shrink-0"
                style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '11px' }}
              >
                {webPreviewText}
              </div>

              <div className="mt-6 flex flex-col gap-4 w-full max-w-[80mm] mx-auto">
                <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-xl border border-slate-300 dark:border-slate-700 w-full text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">API Endpoint</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`/api/bill-manager/${id}`);
                        toast.success("URL copied!");
                      }}
                      className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                    >
                      Copy URL
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all p-2 bg-white dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700">
                    /api/bill-manager/{id}
                  </div>
                </div>

                <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-xl border border-slate-300 dark:border-slate-700 w-full text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">JSON Data</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(bill, null, 2));
                        toast.success("JSON copied!");
                      }}
                      className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <div className="h-32 overflow-y-auto mt-2 bg-white dark:bg-slate-900 p-2 rounded border border-slate-300 dark:border-slate-700">
                    <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {JSON.stringify(bill, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowWebPreview(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={async () => {
                  setShowWebPreview(false);
                  try {
                    await ensurePrinterConnected();
                    await printReceiptData(bill, business, receiptRef.current);
                  } catch (err: any) {
                    toast.error(err.message || "Web Print failed");
                  }
                }}
                className="px-5 py-2.5 rounded-xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Bluetooth size={16} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Edit History Audit Modal */}
      {bill && (
        <BillHistoryModal
          billId={bill.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

    </div>
  );
}

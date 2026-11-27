import { useCurrency } from '@/lib/currency-context';
import { getTaxConfig } from '@/lib/tax-config';
import React, { useState, useEffect } from 'react';
import { getQRCodeDataUrl, getCachedQRCodeDataUrl } from '@/lib/qrHelper';
import { devanagariToHinglish } from '@/lib/transliterate';
import A4InvoiceTemplate from './A4InvoiceTemplate';

interface PrintTemplatesProps {
  receiptRef: React.RefObject<HTMLDivElement | null>;
  kotRef: React.RefObject<HTMLDivElement | null>;
  business: any;
  billNumber: string;
  billDate: string;
  tokenNumber: any;
  selectedTable: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderNotes: string;
  buyerGSTIN: string;
  placeOfSupply: string;
  items: any[];
  subtotal: number;
  discountAmt: number;
  appliedOffer: any;
  taxActive: boolean;
  perProductEnabled: boolean;
  globalRate: number;
  totalTaxable: number;
  totalGst: number;
  taxBreakup: any[];
  deliveryCharge: number;
  deliveryGst: number;
  packagingCharge: number;
  packagingGst: number;
  serviceCharge: number;
  serviceChargeName?: string;
  customCharges?: Array<{ name: string; amount: number; value?: number; type?: string }>;
  finalTotal: number;
  paymentMode: string;
  paymentStatus: string;
  upiTxnRef: string;
  qrUrl: string;
  prevWalletBalance: number | null;
  selectedParty: any;
  kotNumbers: number[];
  numberToWords: (num: number) => string;
  amountPaid?: number;
  balanceDue?: number;
  canPrintCustomerPhone?: boolean;
  isPreviewMode?: boolean;
  isOfflineKOT?: boolean;
  isAddonKOT?: boolean;
  addonSequence?: number | null;
  offlineKotRef?: string;
}

const PrintTemplates: React.FC<PrintTemplatesProps> = (props) => {
  const {
    receiptRef, kotRef, business, billNumber, billDate, tokenNumber, selectedTable,
    customerName, customerPhone, customerAddress, orderNotes, buyerGSTIN, placeOfSupply,
    items, subtotal, discountAmt, appliedOffer, taxActive, perProductEnabled,
    globalRate, totalTaxable, totalGst, taxBreakup, deliveryCharge, deliveryGst,
    packagingCharge, packagingGst, serviceCharge, serviceChargeName, customCharges, finalTotal, paymentMode,
    paymentStatus, upiTxnRef, qrUrl, prevWalletBalance, selectedParty, numberToWords, kotNumbers,
    amountPaid, balanceDue, canPrintCustomerPhone, isPreviewMode, isOfflineKOT, isAddonKOT, addonSequence, offlineKotRef
  } = props;

  const { currencySymbol: sym, currencyCode, taxConfig: ctxTaxConfig } = useCurrency();
  const taxConfig = ctxTaxConfig || getTaxConfig(business?.currencyCode || currencyCode || sym || "INR");
  const taxName = taxConfig.taxName || "GST";
  const taxIdLabel = taxConfig.taxIdLabel || "GSTIN";
  const isSplitTax = taxConfig.isSplitTax !== false; // true only for India

  const defaultUpiText = (business?.upi && business?.upiQrEnabled !== false && finalTotal !== undefined)
    ? `upi://pay?pa=${business.upi}&pn=${encodeURIComponent(business?.businessName || "Store")}&am=${Number(finalTotal).toFixed(2)}&cu=INR`
    : "";

  const [menuQrBase64, setMenuQrBase64] = useState<string>(() => {
    if (business?.enableMenuQRInBill && business?.userId && typeof window !== "undefined") {
      const menuUrl = `${window.location.origin}/menu/${business.userId}`;
      return getCachedQRCodeDataUrl(menuUrl, 250) || "";
    }
    return "";
  });
  const [reviewQrBase64, setReviewQrBase64] = useState<string>(() => {
    if (business?.reviewUrl) {
      return getCachedQRCodeDataUrl(business.reviewUrl, 250) || "";
    }
    return "";
  });
  const [logoBase64, setLogoBase64] = useState<string>(() => {
    if (business?.logoUrl && business.logoUrl.startsWith("data:")) return business.logoUrl;
    return "";
  });
  const [upiQrBase64, setUpiQrBase64] = useState<string>(() => {
    if (qrUrl && qrUrl.startsWith("data:")) return qrUrl;
    if (defaultUpiText) {
      return getCachedQRCodeDataUrl(defaultUpiText, 220) || "";
    }
    return "";
  });

  // Automatically generate local Base64 QR code for UPI if not already Base64
  useEffect(() => {
    if (qrUrl) {
      if (qrUrl.startsWith("data:")) {
        setUpiQrBase64(qrUrl);
      } else {
        // If external API URL is passed, extract UPI text or generate directly
        try {
          const match = qrUrl.match(/data=([^&]+)/);
          const rawText = match ? decodeURIComponent(match[1]) : qrUrl;
          getQRCodeDataUrl(rawText, { width: 220 }).then(setUpiQrBase64);
        } catch {
          setUpiQrBase64(qrUrl);
        }
      }
    } else if (business?.upi && business?.upiQrEnabled !== false && finalTotal !== undefined) {
      const upiText = `upi://pay?pa=${business.upi}&pn=${encodeURIComponent(business?.businessName || "Store")}&am=${Number(finalTotal).toFixed(2)}&cu=INR`;
      getQRCodeDataUrl(upiText, { width: 220 }).then(setUpiQrBase64);
    }
  }, [qrUrl, business?.upi, business?.upiQrEnabled, business?.businessName, finalTotal]);

  useEffect(() => {
    if (business?.logoUrl) {
      if (business.logoUrl.startsWith("data:")) {
        setLogoBase64(business.logoUrl);
      } else {
        // Try loading via same-origin proxy to completely eliminate S3 / external CORS blocking
        const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(business.logoUrl)}`;
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              setLogoBase64(canvas.toDataURL('image/png'));
              return;
            }
          } catch {
            setLogoBase64(proxiedSrc);
          }
        };
        img.onerror = () => {
          // If proxy fails, fallback to direct proxy url or original url
          setLogoBase64(proxiedSrc);
        };
        img.src = proxiedSrc;
      }
    }
  }, [business?.logoUrl]);

  useEffect(() => {
    if (business?.enableMenuQRInBill && business?.userId) {
      const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${business.userId}`;
      getQRCodeDataUrl(menuUrl, { width: 250 }).then(setMenuQrBase64);
    }
  }, [business?.enableMenuQRInBill, business?.userId]);

  useEffect(() => {
    if (business?.reviewUrl) {
      getQRCodeDataUrl(business.reviewUrl, { width: 250 }).then(setReviewQrBase64);
    }
  }, [business?.reviewUrl]);

  const ps = business?.printSettings || {};
  const s = (key: string) => ps[key] !== false; // Default to true if not set

  // --- Dynamic Typography Configurations with Thermal Safety Limits ---
  const isA4 = ps.billFormat === 'A4';
  const a4InvoiceType = ps.a4InvoiceType || 'GST_TAX_INVOICE';
  const is80 = ps.paperWidth === '80mm';
  const paperWidthStr = is80 ? '74mm' : '58mm';
  const printableWidthStr = is80 ? '74mm' : '48mm';

  // Thermal safety feed spacing
  const paperBottomPaddingVal = ps.paperBottomPadding !== undefined && ps.paperBottomPadding !== null ? `${ps.paperBottomPadding}px` : '80px';

  const fontFamilyVal = ps.fontFamily || '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const kotFontFamilyVal = ps.kotFontFamily || '"Courier New", Courier, monospace';
  const fontWeightVal = ps.fontWeight || '';
  const kotFontWeightVal = ps.kotFontWeight || '';
  
  // Custom font size resolver with min/max safety constraints
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
  const kotHeaderFontSize = getClamped(ps.kotHeaderFontSize, 11, 8, 32);
  const kotItemsFontSize = getClamped(ps.kotItemsFontSize, 11, 9, 40);
  const kotQtyFontSize = getClamped(ps.kotQtyFontSize, 14, 10, 40);

  // --- Auto-Shrink Logic for Long Texts ---
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

  const dynamicCss = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
    .receipt-container-dynamic {
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
      font-size: var(--r-details-size);
    }
    .receipt-container-dynamic, .receipt-container-dynamic * {
      font-family: var(--r-font-family) !important;
    }
    .kot-container-dynamic {
      --k-font-family: ${kotFontFamilyVal};
      --k-header-size: ${kotHeaderFontSize}px;
      --k-items-size: ${kotItemsFontSize}px;
      --k-qty-size: ${kotQtyFontSize}px;
      --k-token-size: ${kotTokenSize}px;
      font-family: var(--k-font-family) !important;
      font-size: var(--k-items-size);
    }
    .kot-container-dynamic, .kot-container-dynamic * {
      font-family: var(--k-font-family) !important;
    }
    
    @media print {
      @page { 
        margin: ${isA4 ? '10mm' : '0'} !important; 
        size: ${isA4 ? 'A4 portrait' : (is80 ? '80mm' : '58mm')} auto !important;
      }
      body { margin: 0 !important; padding: 0 !important; }
      .receipt-container { 
        width: ${isA4 ? '100%' : paperWidthStr} !important; 
        margin: 0 auto !important; 
      }
      .kot-container { 
        width: ${paperWidthStr} !important; 
        margin: 0 auto !important; 
      }
    }
    ${fontWeightVal ? `
    .receipt-container-dynamic, .receipt-container-dynamic * {
      font-weight: ${fontWeightVal};
    }
    ` : ''}
    ${kotFontWeightVal ? `
    .kot-container-dynamic, .kot-container-dynamic * {
      font-weight: ${kotFontWeightVal};
    }
    ` : ''}
  `;

  return (
    <div className="hidden-print">
      {/* Dynamic Styling and Print Scale Adjustments */}
      <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />

      {/* ================= PRINT RECEIPT ================= */}
      {isA4 ? (
        <div
          ref={receiptRef}
          className={
            isPreviewMode
              ? "receipt a4-preview-wrapper w-full shadow-2xl mx-auto rounded-md overflow-hidden my-4 border border-slate-300"
              : "fixed -z-[9999] top-0 left-0 pointer-events-none opacity-0 print:opacity-100 print:static print:z-auto print:block receipt w-full"
          }
        >
          <A4InvoiceTemplate
            business={business}
            billNumber={billNumber}
            billDate={billDate}
            tokenNumber={tokenNumber}
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
            serviceChargeName={serviceChargeName}
            customCharges={customCharges}
            finalTotal={finalTotal}
            paymentMode={paymentMode}
            paymentStatus={paymentStatus}
            upiTxnRef={upiTxnRef}
            numberToWords={numberToWords}
            amountPaid={amountPaid}
            balanceDue={balanceDue}
            isPreviewMode={isPreviewMode}
            invoiceType={a4InvoiceType}
            upiQrBase64={upiQrBase64}
            logoBase64={logoBase64}
          />
        </div>
      ) : (
      <div
        ref={receiptRef}
        data-paper={is80 ? "80" : "58"}
        className={isPreviewMode ? "receipt receipt-container receipt-container-dynamic text-black bg-white shadow-xl mx-auto rounded-md overflow-hidden border border-slate-200" : "fixed -z-[9999] top-0 left-0 pointer-events-none opacity-0 print:opacity-100 print:static print:z-auto print:block receipt receipt-container receipt-container-dynamic text-black bg-white"}
        style={{ 
          width: printableWidthStr, 
          margin: '0 auto',
          boxSizing: 'border-box',
          WebkitFontSmoothing: 'antialiased',
          overflow: 'visible',
          marginTop: '-10px',
          overflowWrap: 'break-word',
          wordBreak: 'break-word'
        }}
      >
        {Boolean(business?.logoUrl && s('showLogo')) && (
          <div className="flex justify-center mt-0 pt-0" style={{ marginTop: '-4mm', marginBottom: `${ps.logoBottomMargin !== undefined ? ps.logoBottomMargin : 0}mm` }}>
            <img 
              src={logoBase64 || `/api/proxy-image?url=${encodeURIComponent(business.logoUrl)}`} 
              alt="Logo" 
              style={{ 
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: `${ps.logoHeight || 50}mm`,
                objectFit: 'contain'
              }} 
            />
          </div>
        )}
        <div 
          className="text-center font-bold leading-tight mb-1"
          style={{ 
            fontSize: 'var(--r-business-size)',
            fontWeight: ps.businessNameWeight || undefined
          }}
        >
          {business?.businessName}
        </div>
        {(business?.businessTagLine && s('showTagline')) && (
          <div 
            className="text-center font-bold italic opacity-90 mb-1 leading-none uppercase tracking-tight"
            style={{ 
              fontSize: 'var(--r-tagline-size)',
              fontWeight: ps.taglineWeight || undefined
            }}
          >
            {business.businessTagLine}
          </div>
        )}
        {((business?.businessAddress || business?.district || business?.state || business?.pinCode) && s('showAddress')) && (
          <div 
            className="text-center font-bold leading-tight mt-1"
            style={{ 
              fontSize: 'var(--r-address-size)',
              fontWeight: ps.businessAddressWeight || undefined
            }}
          >
            {business?.businessAddress}
            {business?.district && `, ${business.district}`}
            {business?.state && `, ${business.state}`}
            {business?.pinCode && ` - ${business.pinCode}`}
          </div>
        )}
        {((business?.contactPersonPhone || business?.contactPhone || business?.businessPhone) && s('showContact')) && (
          <div className="text-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
            {business?.phonePrefixType?.toString().toUpperCase() === 'SYMBOL' ? '📞 ' : 'Mob: '} {business.contactPersonPhone || business.contactPhone || business.businessPhone}
          </div>
        )}
        {(ps.secondaryPhone && s('showContact')) && (
          <div className="text-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
            {business?.phonePrefixType?.toString().toUpperCase() === 'SYMBOL' ? '📞 ' : 'Mob: '} {ps.secondaryPhone}
          </div>
        )}
        {(business?.gstNumber && s('showGST')) && (
          <div className="text-center font-bold border-y border-black py-1 mt-2 mb-1" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
            {taxIdLabel}: {business.gstNumber}
          </div>
        )}
        {(business?.fssaiNumber && business?.fssaiEnabled && s('showFSSAI')) && (
          <div className="text-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
            FSSAI: {business.fssaiNumber}
          </div>
        )}
        
        <div className="mt-3 border-t border-dashed border-gray-400 pt-2 px-1" style={{ fontSize: 'var(--r-details-size)' }}>
          <div className="flex justify-between items-center mb-1">
            <div className="font-black uppercase tracking-tight">
              {billNumber?.startsWith('ORD') ? 'Provisional Bill' : 'Bill Summary'}
            </div>
            {(selectedTable && s('showTableInfo')) && (
              <div className="font-black uppercase border-2 border-black text-black px-1.5 py-0.5 rounded-sm" style={{ fontSize: 'calc(var(--r-details-size) - 2px)' }}>
                {selectedTable === "POS" ? "COUNTER" : selectedTable.replace("TYPE: ", "")}
              </div>
            )}
          </div>
          <div className="flex justify-between items-start">
            <div className="space-y-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
              {s('showInvoiceNumber') && <div className="font-black bill-number-display">{billNumber?.startsWith('ORD') ? 'Order No:' : 'No:'} {billNumber}</div>}
              <div className="font-black">{billDate}</div>
            </div>
            {(() => {
              const tn = tokenNumber;
              const displayToken = (() => {
                if (!s('showToken')) return null;
                if (tn == null || tn === "" || tn === "---" || tn === 0) return null;
                if (typeof tn === 'object' && tn.$numberLong) return tn.$numberLong.toString().padStart(3, '0');
                return tn.toString().padStart(3, '0');
              })();

              if (!s('showToken')) return null;

              return (
                <div className="text-right bill-token-container">
                  <div style={{ fontSize: 'calc(var(--r-details-size) - 2px)', fontWeight: '800', textTransform: 'uppercase' }}>Token</div>
                  <div className="bill-token-display" style={{ fontSize: 'calc(var(--r-details-size) + 4px)', fontWeight: '900', lineHeight: '1' }}>
                    {kotNumbers && kotNumbers.length > 0 ? `KOT: ${kotNumbers.join(", ")}` : (displayToken ? `#${displayToken}` : "#---")}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Big centered token block is disabled to save space, moved to Bill Summary header above! */}

        {((customerName || (customerPhone && canPrintCustomerPhone !== false) || customerAddress || orderNotes || buyerGSTIN) && s('showCustomerDetails')) && (
          <div className={`mt-2 font-black ${s('sepCustomer') ? 'border-t-2 border-dashed border-black' : ''} pt-1`} style={{ fontSize: 'var(--r-customer-details-size, var(--r-details-size))', fontWeight: ps.customerDetailsFontWeight || ps.detailsWeight || undefined }}>
            {customerName && <div>Customer: {customerName}</div>}
            {(customerPhone && canPrintCustomerPhone !== false) && <div>Phone: {customerPhone}</div>}
            {buyerGSTIN && <div className="uppercase">Buyer {taxIdLabel}: {buyerGSTIN}</div>}
            {customerAddress && <div className="mt-0.5" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>Addr: {customerAddress}</div>}
            {orderNotes && <div className="mt-0.5 italic">Note: {orderNotes}</div>}
          </div>
        )}

        <div className="mt-1 text-center font-bold" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
          {placeOfSupply && <div>Place of Supply: {placeOfSupply}</div>}
        </div>
        
        <div className={`flex justify-between font-bold uppercase ${s('sepItemsHeader') ? 'border-b border-dashed border-black py-1 my-1' : 'my-1'}`} style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.itemsWeight || undefined }}>
          <span className="flex-1 min-w-0 pr-1">Item Description</span>
          {is80 && <span className="w-[26mm] text-right shrink-0 pr-2">Qty x Rate</span>}
          <span className="w-[16mm] text-right shrink-0">Total</span>
        </div>
        
        {items.map((i, idx) => {
          const itemRate = (taxActive && perProductEnabled && i.gst !== undefined && i.gst !== null) ? i.gst : (taxActive ? globalRate : 0);
          const rawTotal = (Number(i.qty ?? 0) * Number(i.rate ?? 0));
          let discDeduction = 0;
          let discLabel = "";
          if (i.itemDiscountType === 'PERCENT' && i.itemDiscountValue) {
            discDeduction = (rawTotal * i.itemDiscountValue) / 100;
            discLabel = `${i.itemDiscountValue}%`;
          } else if (i.itemDiscountType === 'FLAT' && i.itemDiscountValue) {
            discDeduction = i.itemDiscountValue;
            discLabel = `${sym}${i.itemDiscountValue.toFixed(2)}`;
          }
          const lineTotal = i.overriddenAmount ?? Math.max(0, rawTotal - discDeduction);

          return (
            <div key={idx} className={`mb-2 ${s('showItemDivider') !== false ? 'border-b border-dotted border-black/20' : ''} pb-1`} style={{ fontSize: 'var(--r-items-size)' }}>
              {is80 ? (
                /* Spacious 80mm/3-inch Row Design: Proper columns */
                <>
                  <div className="flex justify-between items-start font-bold" style={{ fontWeight: ps.itemsWeight || undefined }}>
                    <span className="flex-1 min-w-0 pr-1 break-words leading-[1.2]">
                      {s('showFoodTypeSuffix') ? i.name : i.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
                    </span>
                    <span className="w-[26mm] text-right shrink-0 pr-2 whitespace-nowrap">{i.qty} x {sym}{Number(i.rate ?? 0).toFixed(2)}</span>
                    <span className="w-[16mm] text-right shrink-0 whitespace-nowrap">{sym}{lineTotal.toFixed(2)}</span>
                  </div>
                  {/* Item discount breakdown */}
                  {discDeduction > 0 && (
                    <div className="font-semibold italic text-[calc(var(--r-items-size)-2px)] text-black/80 pl-0.5 leading-tight">
                      Disc: -{sym}{discDeduction.toFixed(2)} ({discLabel})
                    </div>
                  )}
                  {/* Variants, Add-ons & Modifiers for 3-inch */}
                  {i.variants && i.variants.length > 0 && (
                    <div className="font-normal italic text-[calc(var(--r-items-size)-2px)] opacity-80 pl-0.5 leading-tight" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                      + {i.variants.map((v: any) => v.name || v).join(', ')}
                    </div>
                  )}
                  {/* Item-level notes */}
                  {i.notes && (
                    <div className="font-normal italic text-[calc(var(--r-items-size)-2px)] opacity-75 pl-0.5 leading-tight" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                      Note: {devanagariToHinglish(i.notes)}
                    </div>
                  )}
                  {/* HSN and Per-product GST/VAT for 3-inch */}
                  {((business?.hsnEnabled && i.hsnCode) || (s('showPerProductGST') !== false && taxActive && itemRate > 0)) && (
                    <div className="font-normal text-[calc(var(--r-items-size)-2px)] opacity-75 pl-0.5 leading-tight mt-0.5" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                      {((business?.hsnEnabled && i.hsnCode) ? `HSN: ${i.hsnCode}` : "")}
                      {((business?.hsnEnabled && i.hsnCode) && (s('showPerProductGST') !== false && taxActive && itemRate > 0)) ? " | " : ""}
                      {(s('showPerProductGST') !== false && taxActive && itemRate > 0) ? `${taxName}: ${itemRate}%` : ""}
                    </div>
                  )}
                  {/* Tax Status (With Tax / Without Tax) under item */}
                  {(taxActive && itemRate > 0) && (
                    <div className="font-normal text-[calc(var(--r-items-size)-2px)] opacity-75 pl-0.5 leading-tight mt-0.5" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                      {(i.taxStatus === "With Tax" || i.isTaxInclusive) ? "With Tax" : "Without Tax"}
                    </div>
                  )}
                </>
              ) : (
                /* Compact 58mm/2-inch Row Design */
                <>
                  <div className="flex justify-between items-start font-bold" style={{ fontWeight: ps.itemsWeight || undefined }}>
                    <span className="flex-1 min-w-0 pr-1 break-words leading-[1.2]">
                      {s('showFoodTypeSuffix') ? i.name : i.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
                    </span>
                    <span className="w-[12mm] text-right shrink-0">{sym}{lineTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold mt-0.5" style={{ fontSize: 'calc(var(--r-items-size) - 1px)', fontWeight: ps.itemsWeight || undefined }}>
                    <span>{i.qty} x {sym}{Number(i.rate ?? 0).toFixed(2)}{discDeduction > 0 ? ` (-${sym}${discDeduction.toFixed(2)})` : ''}</span>
                    <span className="font-bold">
                      {((business?.hsnEnabled && i.hsnCode) ? `HSN: ${i.hsnCode}` : "")} 
                      {(s('showPerProductGST') !== false && taxActive && itemRate > 0) ? ` | ${taxName}: ${itemRate}%` : ""}
                    </span>
                  </div>
                  {/* Tax Status (With Tax / Without Tax) under item in 58mm */}
                  {(taxActive && itemRate > 0) && (
                    <div className="text-[calc(var(--r-items-size)-2px)] font-normal opacity-75 mt-0.5">
                      {(i.taxStatus === "With Tax" || i.isTaxInclusive) ? "With Tax" : "Without Tax"}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {s('sepTotalTop') && <div className="my-1 border-t-2 border-black" />}
        
        <div className="space-y-1" style={{ fontSize: 'var(--r-items-size)' }}>
          {s('showSubtotal') && <div className="flex justify-between font-bold"><span>Subtotal</span><span>{sym}{(subtotal || 0).toFixed(2)}</span></div>}
          {(discountAmt > 0 && s('showDiscount')) && (
            <div className="flex justify-between font-bold italic">
              <span>Discount {appliedOffer?.code ? `(${appliedOffer.code})` : ''}</span>
              <span>- {sym}{(discountAmt || 0).toFixed(2)}</span>
            </div>
          )}
          {(taxActive) && (
            <>
              {s('showTaxableAmt') && <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}><span>Taxable Amt</span><span>{sym}{(totalTaxable || 0).toFixed(2)}</span></div>}
              {s('showTotalTax') && (() => {
                const totalCGST = taxBreakup.reduce((sum, g) => sum + (g.cgst || 0), 0);
                const totalSGST = taxBreakup.reduce((sum, g) => sum + (g.sgst || 0), 0);
                const totalIGST = taxBreakup.reduce((sum, g) => sum + (g.igst || 0), 0);
                
                // For India: show CGST/SGST or IGST split
                if (isSplitTax) {
                  if (totalCGST > 0 || totalSGST > 0) {
                    return (
                      <>
                        <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}><span>CGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>{sym}{(totalCGST || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}><span>SGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>{sym}{(totalSGST || 0).toFixed(2)}</span></div>
                      </>
                    );
                  } else if (totalIGST > 0) {
                    return <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}><span>IGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate}%)` : ''}</span><span>{sym}{(totalIGST || 0).toFixed(2)}</span></div>;
                  }
                }
                
                // For UAE (VAT), Saudi (VAT), USA (Sales Tax), UK (VAT) etc. show direct Tax Name
                const displayTaxLabel = taxBreakup.length === 1 ? `${taxName} (${taxBreakup[0].rate}%)` : `Total ${taxName}`;
                return <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}><span>{displayTaxLabel}</span><span>{sym}{(totalGst || 0).toFixed(2)}</span></div>;
              })()}
            </>
          )}
          {(deliveryCharge > 0 && s('showDeliveryCharges')) && (
            <>
              <div className="flex justify-between items-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
                <span>DELIVERY CHARGES</span>
                <span>{sym}{(deliveryCharge || 0).toFixed(2)}</span>
              </div>
              {deliveryGst > 0 && (
                <div className="flex justify-between items-center font-bold italic" style={{ fontSize: 'calc(var(--r-details-size) - 2px)' }}>
                  <span className="pl-2">└ Tax on Delivery ({business?.deliveryGstRate}%)</span>
                  <span>{sym}{(deliveryGst || 0).toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          {(packagingCharge > 0 && s('showPackagingCharges')) && (
            <>
              <div className="flex justify-between items-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
                <span>PACKAGING CHARGES</span>
                <span>{sym}{(packagingCharge || 0).toFixed(2)}</span>
              </div>
              {packagingGst > 0 && (
                <div className="flex justify-between items-center font-bold italic" style={{ fontSize: 'calc(var(--r-details-size) - 2px)' }}>
                  <span className="pl-2">└ Tax on Packaging ({business?.packagingGstRate}%)</span>
                  <span>{sym}{(packagingGst || 0).toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          {(serviceCharge > 0 && s('showServiceCharge')) && (
            <div className="flex justify-between items-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
              <span>{((serviceChargeName || (business as any)?.serviceChargeName || "Service Charge")).toUpperCase()}</span>
              <span>{sym}{(serviceCharge || 0).toFixed(2)}</span>
            </div>
          )}
          {Array.isArray(customCharges) && customCharges.map((c, idx) => (
            c.amount > 0 ? (
              <div key={idx} className="flex justify-between items-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
                <span>{(c.name || "ADDITIONAL CHARGE").toUpperCase()}</span>
                <span>{sym}{Number(c.amount || 0).toFixed(2)}</span>
              </div>
            ) : null
          ))}
          {s('sepTotalTop') && <div className="border-t-2 border-dashed border-black my-1" />}
          {(() => {
            const roundedTotal = Math.round(finalTotal);
            const roundOff = roundedTotal - finalTotal;
            return (
              <>
                {Math.abs(roundOff) > 0.001 && (
                  <div className="flex justify-between font-bold" style={{ fontSize: 'var(--r-details-size)' }}>
                    <span>Round Off</span>
                    <span>{roundOff > 0 ? '+' : ''}{(roundOff || 0).toFixed(2)}</span>
                  </div>
                )}
                <div 
                  className={`flex justify-between font-black ${s('sepTotalBottom') ? 'border-y-2 border-black py-2 my-1.5' : 'my-1.5'} uppercase bg-white px-1`} 
                  style={{ fontSize: 'var(--r-total-size)', fontWeight: ps.totalWeight || undefined }}
                >
                  <span>GRAND TOTAL</span>
                  <span>{sym}{(roundedTotal || 0).toFixed(2)}</span>
                </div>
              </>
            );
          })()}
          {(balanceDue !== undefined && balanceDue > 0) && (
            <div className="px-1 border-b-2 border-black pb-1 mb-1 border-dashed">
               <div className="flex justify-between items-center font-bold mt-1 uppercase" style={{ fontSize: 'var(--r-details-size)' }}>
                 <span>Amount Paid</span>
                 <span>{sym}{(amountPaid || 0).toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center font-bold mt-0.5 uppercase tracking-wide" style={{ fontSize: 'calc(var(--r-details-size) + 1px)' }}>
                 <span>Unpaid Balance</span>
                 <span>{sym}{(balanceDue || 0).toFixed(2)}</span>
               </div>
            </div>
          )}
        </div>

        {(taxActive) && taxBreakup.length > 0 && s('showTaxBreakup') && (
          <div className="mt-3" style={{ fontSize: 'var(--r-details-size)' }}>
            <div className="font-black border-b border-dashed border-black mb-1 pb-0.5">{taxName} TAX BREAKUP</div>
            <table className="w-full border-collapse font-bold" style={{ fontSize: 'calc(var(--r-details-size) - 1px)' }}>
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left font-bold">Rate</th>
                  <th className="text-right font-bold">Taxable</th>
                  {isSplitTax ? (
                    taxBreakup.some(g => g.igst > 0) ? (
                      <th className="text-right font-bold">IGST</th>
                    ) : (
                      <>
                        <th className="text-right font-bold">CGST</th>
                        <th className="text-right font-bold">SGST</th>
                      </>
                    )
                  ) : (
                    <th className="text-right font-bold">{taxName}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {taxBreakup.map((g, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{g.rate}%</td>
                    <td className="text-right">{(g.taxable || 0).toFixed(2)}</td>
                    {isSplitTax ? (
                      g.igst > 0 ? (
                        <td className="text-right">{(g.igst || 0).toFixed(2)}</td>
                      ) : (
                        <>
                          <td className="text-right">{(g.cgst || 0).toFixed(2)}</td>
                          <td className="text-right">{(g.sgst || 0).toFixed(2)}</td>
                        </>
                      )
                    ) : (
                      <td className="text-right">{((g.cgst || 0) + (g.sgst || 0) + (g.igst || 0) || (g.taxable * g.rate / 100) || 0).toFixed(2)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t-2 border-black mt-1" />
          </div>
        )}

        {s('showAmountInWords') && (
          <div className="mt-2 italic font-bold" style={{ fontSize: 'var(--r-details-size)' }}>
            Amount in Words: {numberToWords(finalTotal)}
          </div>
        )}

        {s('showPaymentStatus') && (
          <div 
            className={`mt-3 ${s('sepPayment') ? 'border-t-2 border-dashed border-black' : ''} pt-1 font-bold space-y-0.5`}
            style={{ fontSize: 'var(--r-items-size)' }}
          >
            <div className="flex justify-between">
              <span>Payment Mode</span>
              <span>{paymentMode?.startsWith("Split") ? "SPLIT" : (paymentMode === "None" ? "Pending" : paymentMode)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span>{paymentStatus}</span>
            </div>
            {paymentMode?.startsWith("Split") && (
              <div className="mt-1 pt-1 border-t border-dotted border-black/30">
                {paymentMode.replace("Split (", "").replace(")", "").split(",").map((s, i) => {
                  const parts = s.split(":");
                  if (parts.length !== 2) return <div key={i}>{s.trim()}</div>;
                  return (
                    <div key={i} className="flex justify-between" style={{ fontSize: 'calc(var(--r-items-size) - 1px)' }}>
                      <span>- {parts[0].trim()}</span>
                      <span>{sym}{Number(parts[1].trim()).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {((business?.upi && business?.upiQrEnabled !== false) || paymentMode === "UPI") && (
          <div className="mt-2 text-center font-bold border-t border-dashed border-black pt-2" style={{ fontSize: 'var(--r-details-size)' }}>
            {(business?.upi && business?.upiQrEnabled !== false && Boolean(upiQrBase64 || qrUrl)) && (
              <>
                <div className="font-bold mb-1" style={{ fontSize: 'var(--r-items-size)' }}>SCAN & PAY</div>
                <div className="my-2 text-center">
                  <div className="inline-block border-2 border-black p-1 bg-white">
                    <img 
                      src={upiQrBase64 || qrUrl} 
                      alt="UPI QR" 
                      className="w-[30mm] h-[30mm] object-contain block mx-auto" 
                    />
                  </div>
                </div>
                <div className="mb-2 font-bold" style={{ fontSize: 'var(--r-items-size)' }}>UPI: {business.upi}</div>
              </>
            )}
            {paymentMode === "UPI" && (
              <div className="text-center" style={{ fontSize: 'var(--r-details-size)' }}>Txn Ref: {upiTxnRef || "Pending"}</div>
            )}
          </div>
        )}
        {business?.enableMenuQRInBill && menuQrBase64 && (
          <div className="mt-2 text-center border-t-2 border-black pt-2">
            <div className="font-black mb-1 uppercase tracking-tighter" style={{ fontSize: 'var(--r-items-size)' }}>Scan to View Digital Menu</div>
            <div className="my-2 text-center">
              <div className="inline-block border-2 border-black p-1 bg-white">
                <img 
                  src={menuQrBase64} 
                  alt="Menu QR" 
                  className="w-[30mm] h-[30mm] object-contain block mx-auto" 
                  style={{ imageRendering: 'pixelated', filter: 'contrast(300%) grayscale(100%)' }}
                />
              </div>
            </div>
          </div>
        )}
        {s('showReviewQR') && business?.reviewUrl && reviewQrBase64 && (
          <div className="mt-2 text-center border-t-2 border-black pt-2">
            <div className="font-black mb-1 uppercase tracking-tighter" style={{ fontSize: 'var(--r-items-size)' }}>Rate Your Experience</div>
            <div className="my-2 text-center">
              <div className="inline-block border-2 border-black p-1 bg-white">
                <img 
                  src={reviewQrBase64} 
                  alt="Review QR" 
                  className="w-[30mm] h-[30mm] object-contain block mx-auto" 
                  style={{ imageRendering: 'pixelated', filter: 'contrast(300%) grayscale(100%)' }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Wallet balance printing temporarily disabled per user request
        {selectedParty && (
          <div className="mt-2 border-t border-dashed border-black pt-2 font-bold space-y-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
            <div className="flex justify-between uppercase">
              <span>Wallet (Opening)</span>
              <span>{sym}{(prevWalletBalance ?? selectedParty.walletBalance + (paymentMode === 'Wallet' ? finalTotal : 0)).toFixed(2)}</span>
            </div>
            {paymentMode === "Wallet" ? (
               <div className="flex justify-between uppercase text-rose-600 font-black">
                 <span>Wallet (Deducted)</span>
                 <span>- {sym}{(finalTotal || 0).toFixed(2)}</span>
               </div>
            ) : null}
            <div className="flex justify-between uppercase text-indigo-600 font-black border-t border-dotted border-black/30 mt-0.5 pt-0.5">
              <span>Wallet (Closing)</span>
              <span>{sym}{selectedParty.walletBalance?.toFixed(2) || "0.00"}</span>
            </div>
          </div>
        )}
        */}

        <div className={`mt-4 ${s('sepFooter') ? 'border-t-2 border-black' : ''} pt-2 text-center`}>
          {s('showGreetings') && (
            <div 
              className="font-black italic tracking-widest uppercase mb-1" 
              style={{ fontSize: 'var(--r-greeting-size)', fontWeight: ps.greetingWeight || undefined }}
            >
              {business?.greetingMessage || "Thank You 🙏 Visit Again!"}
            </div>
          )}
          {s('showPoweredBy') && <div className="mt-3 font-bold" style={{ fontSize: 'calc(var(--r-details-size) - 2px)' }}>Powered by Kravy</div>}
        </div>
      </div>
      )}

      {/* ================= KOT TEMPLATE ================= */}
      {!(isA4 && isPreviewMode) && (
      <div
        ref={kotRef}
        data-paper={is80 ? "80" : "58"}
        className={isPreviewMode ? "kot kot-container kot-container-dynamic text-black bg-white shadow-xl mx-auto rounded-md overflow-hidden border border-slate-200 mt-6" : "fixed -z-[9999] top-0 left-0 pointer-events-none opacity-0 print:opacity-100 print:static print:z-auto print:block kot kot-container kot-container-dynamic text-black bg-white"}
        style={{ 
          width: printableWidthStr, 
          margin: '0 auto', 
          boxSizing: 'border-box', 
          overflow: 'visible'
        }}
      >
        {isOfflineKOT && (
          <div className="bg-black text-white text-center font-black py-1 px-2 mb-1.5 uppercase tracking-widest text-[11px] border border-black">
            {isAddonKOT ? `*** OFFLINE ADD-ON KOT (QT${addonSequence || 2}) — NOT OFFICIAL TOKEN ***` : "*** OFFLINE KOT — NOT OFFICIAL TOKEN ***"}
          </div>
        )}
        <div className={`text-center font-black ${s('sepKOTTop') !== false ? 'border-b-2 border-black' : ''} pb-1 mb-2`} style={{ fontSize: 'calc(var(--k-items-size) * 1.8)' }}>
          {isOfflineKOT ? (isAddonKOT ? `OFFLINE ADD-ON K.O.T [QT${addonSequence || 2}]` : "OFFLINE K.O.T") : (isAddonKOT ? `ADD-ON K.O.T [QT${addonSequence || 2}]` : "K.O.T")}
        </div>
        
        <div className="flex flex-wrap justify-between items-center font-black mb-2 px-0.5 gap-y-1" style={{ fontSize: 'var(--k-header-size)' }}>
          <div className="border-2 border-black text-black px-1.5 py-1 rounded-sm font-black whitespace-nowrap" style={{ fontSize: 'calc(var(--k-header-size) + 1px)' }}>
            {selectedTable === "POS" ? "COUNTER" : 
             selectedTable === "TAKEAWAY" ? "TAKEAWAY" : 
             selectedTable === "DELIVERY" ? "DELIVERY" : 
             `TABLE: ${selectedTable}`}
          </div>
          {s('showKOTToken') && (
            <div className="text-right leading-none">
              <div style={{ fontSize: 'calc(var(--k-header-size) - 2px)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isOfflineKOT ? "Offline Ref" : "KOT No."}
              </div>
              <div 
                className="font-black kot-token-display"
                style={{ fontSize: isOfflineKOT ? 'calc(var(--k-token-size) * 0.72)' : 'var(--k-token-size)', fontWeight: ps.kotTokenWeight || undefined }}
              >
                {isOfflineKOT ? (offlineKotRef || "OFF-KOT-0001") : `#${(() => {
                  if (kotNumbers && kotNumbers.length > 0) {
                    return kotNumbers[kotNumbers.length - 1];
                  }
                  if (tokenNumber && tokenNumber !== "---" && tokenNumber !== 0) {
                    return tokenNumber;
                  }
                  const itemWithKot = (items || []).find((it: any) => it?.kotNumber);
                  if (itemWithKot?.kotNumber) {
                    return itemWithKot.kotNumber;
                  }
                  if (business?.lastTokenNumber) {
                    return business.lastTokenNumber;
                  }
                  return "1";
                })()}`}
              </div>
            </div>
          )}
        </div>

        <div className={`${s('sepKOTCustomer') !== false ? 'border-y border-dashed border-black' : ''} py-1 mb-2 font-bold`} style={{ fontSize: 'var(--k-header-size)' }}>
          {s('showKOTBillNo') && (
            <div className="flex justify-between">
              <span>Bill: {billNumber}</span>
              {s('showKOTTime') && <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          )}
          {(customerName && s('showKOTCustomer')) && <div className="mt-0.5 truncate">Cust: {customerName}</div>}
        </div>

        <table className="w-full border-collapse font-black" style={{ fontSize: 'var(--k-items-size)' }}>
          <thead>
            <tr className={`${s('sepKOTItemsHeader') !== false ? 'border-b-2 border-black' : ''}`}>
              <th className="text-left py-1 uppercase w-full">Item Description</th>
              <th className="text-right py-1 whitespace-nowrap pl-2 pr-1">QTY</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const newItems = items.filter(i => i.isNew);
              const itemsToPrint = newItems.length > 0 ? newItems : items;
              return itemsToPrint.map((i, idx) => (
                <tr key={idx} className={`${s('showKOTItemDivider') !== false ? 'border-b border-dotted border-black/30' : ''}`} style={{ fontWeight: ps.kotItemsWeight || undefined }}>
                  <td className="py-2 pr-1 leading-[1.1] uppercase">
                    {s('showFoodTypeSuffix') ? i.name : i.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
                    {i.variants && i.variants.length > 0 && (
                      <div className="font-bold lowercase" style={{ fontSize: 'calc(var(--k-items-size) - 2px)' }}>
                        ({i.variants.map((v:any) => v.name).join(', ')})
                      </div>
                    )}
                    {/* Item-level special instructions / notes */}
                    {i.notes && (
                      <div className="font-black italic text-black pl-0.5 mt-0.5 leading-tight" style={{ fontSize: 'calc(var(--k-items-size) - 2px)' }}>
                        *** Note: {devanagariToHinglish(i.notes)} ***
                      </div>
                    )}
                  </td>
                  <td className="text-right py-2 align-top font-black whitespace-nowrap pl-2 pr-1" style={{ fontSize: 'var(--k-qty-size)', fontWeight: ps.kotQtyWeight || undefined }}>x{i.isNew && i.printedQty ? i.qty - i.printedQty : i.qty}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>

        {(orderNotes && s('showKOTInstructions')) && (
          <div className={`mt-3 p-2 ${s('sepKOTInstructions') ? 'border-2 border-black bg-black/5' : ''} rounded-sm`}>
            <div className={`font-black uppercase mb-1 ${s('sepKOTInstructions') !== false ? 'border-b border-black' : ''}`} style={{ fontSize: 'calc(var(--k-items-size) - 2px)' }}>Chef Instructions:</div>
            <div className="font-bold italic leading-tight" style={{ fontSize: 'var(--k-items-size)' }}>{orderNotes}</div>
          </div>
        )}

        <div className={`mt-4 ${s('sepKOTFooter') !== false ? 'border-t-2 border-black' : ''} pt-2 text-center`} style={{ fontSize: 'calc(var(--k-items-size) - 2px)' }}>
          <div className="font-black uppercase">End of KOT</div>
          <div className="font-bold mt-1">{billDate}</div>
        </div>
      </div>
      )}
    </div>
  );
};

export default PrintTemplates;

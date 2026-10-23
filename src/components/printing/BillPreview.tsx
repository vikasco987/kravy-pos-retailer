import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Printer, RefreshCw } from 'lucide-react';
import { WhatsAppBillButton } from "@/components/WhatsAppBillButton";
import { getQRCodeDataUrl } from '@/lib/qrHelper';
import { formatCurrency } from "@/lib/currency";

interface BillPreviewProps {
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  previewZoom: number;
  setPreviewZoom: React.Dispatch<React.SetStateAction<number>>;
  business: any;
  billNumber: string;
  billDate: string;
  tokenNumber: string;
  selectedTable: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderNotes: string;
  placeOfSupply: string;
  items: any[];
  subtotal: number;
  discountAmt: number;
  appliedOffer: any;
  taxActive: boolean;
  perProductEnabled: boolean;
  totalTaxable: number;
  totalGst: number;
  taxBreakup: any[];
  deliveryCharge: number;
  deliveryGst: number;
  packagingCharge: number;
  packagingGst: number;
  serviceCharge: number;
  serviceChargeName?: string;
  finalTotal: number;
  paymentMode: string;
  paymentStatus: string;
  upiTxnRef?: string;
  qrUrl: string;
  prevWalletBalance: number | null;
  selectedParty: any;
  numberToWords: (num: number) => string;
  kravy: any;
  // Actions
  printKOT: () => void;
  printReceipt: (enableKOT: boolean, customBill?: any) => void;
  saveBill: () => Promise<any>;
  resetForm: () => void;
  isSaving: boolean;
  lastSavedBillId: string | null;
  userRole: string;
  userPermissions: string[];
  resumeBillId: string | null;
  router: any;
  kotNumbers?: number[];
  currencySymbol?: string;
}

const BillPreview: React.FC<BillPreviewProps> = (props) => {
  const {
    showPreview, setShowPreview, previewZoom, setPreviewZoom, business, billNumber,
    billDate, tokenNumber, selectedTable, customerName, customerPhone, customerAddress,
    orderNotes, placeOfSupply, items, subtotal, discountAmt, appliedOffer,
    taxActive, perProductEnabled, totalTaxable, totalGst, taxBreakup,
    deliveryCharge, deliveryGst, packagingCharge, packagingGst, serviceCharge, serviceChargeName,
    finalTotal, paymentMode, paymentStatus, upiTxnRef, qrUrl, prevWalletBalance, 
    selectedParty, numberToWords, kravy, printKOT, printReceipt, saveBill, 
    resetForm, isSaving, lastSavedBillId, userRole, userPermissions, 
    resumeBillId, router, kotNumbers
  } = props;

  const [reviewQrBase64, setReviewQrBase64] = useState<string>("");

  useEffect(() => {
    if (business?.reviewUrl) {
      getQRCodeDataUrl(business.reviewUrl, { width: 150 }).then(setReviewQrBase64);
    }
  }, [business?.reviewUrl]);

  const ps = business?.printSettings || {};
  const s = (key: string) => ps[key] !== false; // Default to true if not set
  const sym = props.currencySymbol || business?.currencySymbol || "₹";

  // --- Dynamic Typography Configurations with safety limits ---
  const is80 = ps.paperWidth === '80mm';
  const paperWidthStr = is80 ? '74mm' : '58mm';
  const fontFamilyVal = ps.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const fontWeightVal = ps.fontWeight || '';

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

  const previewCss = `
    .bill-preview-dynamic {
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
    .bill-preview-dynamic, .bill-preview-dynamic * {
      font-family: var(--r-font-family) !important;
    }
    ${fontWeightVal ? `
    .bill-preview-dynamic, .bill-preview-dynamic * {
      font-weight: ${fontWeightVal};
    }
    ` : ''}
  `;

  if (!showPreview) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-2 sm:p-4 pb-20 sm:pb-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowPreview(false)} />
      
      <div className="relative bg-[var(--kravy-bg)] w-full max-w-[500px] max-h-[82vh] sm:max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-[var(--kravy-border)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--kravy-border)] bg-[var(--kravy-surface)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-black text-[var(--kravy-text-primary)]">Bill Preview</h3>
            <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mt-0.5">Check before printing</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const billData = {
                  billNumber, billDate, tokenNumber, selectedTable,
                  customerName, customerPhone, customerAddress, orderNotes,
                  placeOfSupply, items, subtotal, discountAmt,
                  taxActive, perProductEnabled, totalTaxable, totalGst, taxBreakup,
                  deliveryCharge, deliveryGst, packagingCharge, packagingGst, serviceCharge,
                  finalTotal, paymentMode, paymentStatus, upiTxnRef,
                  prevWalletBalance, selectedParty, kotNumbers
                };
                navigator.clipboard.writeText(JSON.stringify(billData, null, 2));
                alert("JSON copied to clipboard!");
              }} 
              className="px-2 py-1 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center"
              title="Copy JSON Schema"
            >
              Copy JSON
            </button>
            <button onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.1))} className="w-8 h-8 rounded-lg bg-[var(--kravy-bg)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] transition-colors"><ZoomOut size={14} /></button>
            <span className="text-xs font-bold text-[var(--kravy-text-secondary)] w-9 text-center">{(previewZoom * 100).toFixed(0)}%</span>
            <button onClick={() => setPreviewZoom(z => Math.min(2, z + 0.1))} className="w-8 h-8 rounded-lg bg-[var(--kravy-bg)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] transition-colors"><ZoomIn size={14} /></button>
            <div className="w-px h-5 bg-[var(--kravy-border)] mx-1" />
            <button onClick={() => { kravy.close(); setShowPreview(false); }} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Area (Rendered like paper) */}
        <div className="flex-1 overflow-auto bg-[#E5E5E5] dark:bg-[#1A1A1A] p-6 text-center">
          {/* Dynamic styles injected locally for preview container */}
          <style dangerouslySetInnerHTML={{ __html: previewCss }} />
          
          <div 
            className="bg-white text-black p-4 shadow-xl inline-block text-left"
            style={{ 
              width: is80 ? '80mm' : '58mm', 
              minHeight: '100px',
              zoom: previewZoom * 1.5, // Use zoom to correctly scale layout without clipping bugs
              marginBottom: '40px'
            }}
          >
            {/* Dynamic style representation */}
            <div className="bill-preview-dynamic leading-tight break-words whitespace-normal overflow-hidden">
              {Boolean(s('showLogo') && business?.logoUrl) && (
                <div className="flex justify-center mb-1" style={{ marginBottom: `${ps.logoBottomMargin !== undefined ? ps.logoBottomMargin : 0}mm` }}>
                  <img 
                    src={business?.logoUrl} 
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
                className="text-center font-bold mb-1"
                style={{ 
                  fontSize: 'var(--r-business-size)',
                  fontWeight: ps.businessNameWeight || undefined
                }}
              >
                {business?.businessName}
              </div>
              {s('showTagline') && business?.businessTagLine && (
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
              {s('showAddress') && (business?.businessAddress || business?.district || business?.state || business?.pinCode) && (
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
              {s('showContact') && (business?.contactPersonPhone || business?.contactPhone || business?.businessPhone) && (
                <div className="text-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
                  {business?.phonePrefixType?.toString().toUpperCase() === 'SYMBOL' ? '📞 ' : 'Mob: '} {business.contactPersonPhone || business.contactPhone || business?.businessPhone}
                </div>
              )}
              {s('showGST') && business?.gstNumber && (
                <div className="text-center font-bold border-y border-black py-0.5 mt-2 mb-1" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
                  GSTIN: {business.gstNumber}
                </div>
              )}
              {s('showFSSAI') && (business?.fssaiNumber && business?.fssaiEnabled) && (
                <div className="text-center font-bold mt-0.5" style={{ fontSize: 'var(--r-details-size)', fontWeight: ps.detailsWeight || undefined }}>
                  FSSAI: {business.fssaiNumber}
                </div>
              )}
              {s('sepTop') && <div className="my-1 border-t border-dashed border-gray-400" />}
              
              <div className="mt-3 border-t border-dashed border-gray-400 pt-2 px-1" style={{ fontSize: 'var(--r-details-size)' }}>
                <div className="flex justify-between items-center mb-1">
                  <div className="font-black uppercase tracking-tight">
                    {billNumber?.startsWith('ORD') ? 'Provisional Bill' : 'Bill Summary'}
                  </div>
                  {selectedTable && (
                    <div className="font-black uppercase border border-black text-black px-1 py-0.5 rounded-sm" style={{ fontSize: 'calc(var(--r-details-size) - 2px)' }}>
                      {selectedTable === "POS" ? "COUNTER" : selectedTable.replace("TYPE: ", "")}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5" style={{ fontSize: 'var(--r-details-size)' }}>
                    {s('showInvoiceNumber') && <div className="font-black bill-number-display">{billNumber?.startsWith('ORD') ? 'Order No:' : 'No:'} {billNumber}</div>}
                    <div className="font-black">{billDate}</div>
                  </div>
                </div>
              </div>

              {/* Centered Token block matching physical ticket */}
              {s('showToken') && (
                <div className="bill-token-container" style={{ textAlign: 'center', margin: '10px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', display: ((kotNumbers && kotNumbers.length > 0) || (tokenNumber || business?.lastTokenNumber !== undefined)) ? 'block' : 'none' }}>
                  <div style={{ fontSize: 'calc(var(--r-details-size) - 1px)', fontWeight: ps.receiptTokenWeight || '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Token No.</div>
                  <div className="bill-token-display" style={{ fontSize: 'var(--r-token-size)', fontWeight: ps.receiptTokenWeight || '900', lineHeight: '1', marginTop: '4px' }}>
                    {kotNumbers && kotNumbers.length > 0 ? kotNumbers.join(', ') : `#${tokenNumber || "---"}`}
                  </div>
                </div>
              )}

              {s('sepCustomer') && <div className="my-1 border-t border-dashed border-gray-400" />}
              {s('showCustomerDetails') && (customerName || customerPhone || customerAddress) && (
                <div className="font-black pt-1" style={{ fontSize: 'var(--r-customer-details-size, var(--r-details-size))', fontWeight: ps.customerDetailsFontWeight || ps.detailsWeight || undefined }}>
                  {customerName && <div>Customer: {customerName}</div>}
                  {customerPhone && <div>Phone: {customerPhone}</div>}
                  {customerAddress && <div className="mt-0.5" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>Addr: {customerAddress}</div>}
                  {placeOfSupply && <div className="uppercase">POS: {placeOfSupply}</div>}
                  {orderNotes && <div className="mt-0.5 italic">Note: {orderNotes}</div>}
                </div>
              )}
              {s('sepItemsHeader') && <div className="my-1 border-t border-dashed border-gray-400" />}
              
              {/* Item Header Row */}
              <div className={`flex justify-between font-bold uppercase ${s('sepItemsHeader') ? 'border-b border-dashed border-gray-400 py-0.5 my-1' : 'my-1'}`} style={{ fontSize: 'calc(var(--r-details-size) - 1px)' }}>
                <span className="flex-1 min-w-0 pr-1">Item</span>
                {is80 && <span className="w-[26mm] text-right shrink-0 pr-2">Qty x Rate</span>}
                <span className={`${is80 ? 'w-[16mm]' : 'w-[11mm]'} text-right shrink-0`}>Total</span>
              </div>

              {items.map((i, idx) => (
                <div key={idx} className={`mb-1.5 ${s('showItemDivider') !== false ? 'border-b border-dotted border-gray-100' : ''} pb-1`}>
                  {is80 ? (
                    /* 80mm/3-inch layout: 3-column row matching PrintTemplates */
                    <>
                      <div className="flex justify-between items-start font-bold" style={{ fontSize: 'var(--r-items-size)' }}>
                        <span className="flex-1 min-w-0 pr-1 break-words leading-[1.2]">
                          {s('showFoodTypeSuffix') ? i.name : i.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
                        </span>
                        <span className="w-[26mm] text-right shrink-0 pr-2 whitespace-nowrap">{i.qty} x {sym}{Number(i.rate ?? 0).toFixed(2)}</span>
                        <span className="w-[16mm] text-right shrink-0 whitespace-nowrap">{sym}{(Number(i.qty ?? 0) * Number(i.rate ?? 0)).toFixed(2)}</span>
                      </div>
                      {/* Variants & Modifiers */}
                      {i.variants && i.variants.length > 0 && (
                        <div className="font-normal italic text-[calc(var(--r-items-size)-2px)] opacity-80 pl-0.5 leading-tight" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                          + {i.variants.map((v: any) => v.name || v).join(', ')}
                        </div>
                      )}
                      {/* Item notes */}
                      {i.notes && (
                        <div className="font-normal italic text-[calc(var(--r-items-size)-2px)] opacity-75 pl-0.5 leading-tight" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                          Note: {i.notes}
                        </div>
                      )}
                      {/* HSN and Per-product GST */}
                      {((business?.hsnEnabled && i.hsnCode) || (s('showPerProductGST') !== false && taxActive && (i.gst || 0) > 0)) && (
                        <div className="font-normal text-[calc(var(--r-items-size)-2px)] opacity-75 pl-0.5 leading-tight mt-0.5" style={{ fontSize: 'calc(var(--r-items-size) - 2px)' }}>
                          {((business?.hsnEnabled && i.hsnCode) ? `HSN: ${i.hsnCode}` : "")}
                          {((business?.hsnEnabled && i.hsnCode) && (s('showPerProductGST') !== false && taxActive && (i.gst || 0) > 0)) ? " | " : ""}
                          {(s('showPerProductGST') !== false && taxActive && (i.gst || 0) > 0) ? `GST: ${i.gst}%` : ""}
                        </div>
                      )}
                    </>
                  ) : (
                    /* 58mm/2-inch layout: compact 2-row format */
                    <>
                      <div className="flex justify-between items-start text-[9px] font-bold">
                        <span className="flex-1 min-w-0 pr-1 break-words">
                          {s('showFoodTypeSuffix') ? i.name : i.name.replace(/\s?\((V|NV|R)\)/gi, "").trim()}
                        </span>
                        <span className="w-[11mm] text-right shrink-0">{(Number(i.qty ?? 0) * Number(i.rate ?? 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-600">
                        <span>{i.qty} x {Number(i.rate ?? 0).toFixed(2)}</span>
                        <span>{((business?.hsnEnabled && i.hsnCode) ? `HSN: ${i.hsnCode}` : "")} {(s('showPerProductGST') !== false && taxActive) ? `| GST: ${i.gst || 0}%` : ""}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {s('sepTotalTop') && <div className="my-1 border-t border-dashed border-gray-400" />}
              
              <div className="space-y-0.5">
                  {s('showSubtotal') && <div className="flex justify-between text-[9px]"><span>Subtotal</span><span>{formatCurrency(subtotal, sym)}</span></div>}
                  {s('showDiscount') && discountAmt > 0 && (
                    <div className="flex justify-between text-[9px] text-rose-600 font-bold italic">
                      <span>Discount ({appliedOffer?.code})</span>
                      <span>- {formatCurrency(discountAmt, sym)}</span>
                    </div>
                  )}
                {s('showTaxBreakup') && taxActive && (
                  <>
                    <div className="flex justify-between text-[9px]"><span>Taxable Amt</span><span>{formatCurrency(totalTaxable, sym)}</span></div>
                    {(() => {
                      const totalCGST = taxBreakup.reduce((sum, g) => sum + (g.cgst || 0), 0);
                      const totalSGST = taxBreakup.reduce((sum, g) => sum + (g.sgst || 0), 0);
                      const totalIGST = taxBreakup.reduce((sum, g) => sum + (g.igst || 0), 0);
                      if (totalCGST > 0 || totalSGST > 0) {
                        return (
                          <>
                            <div className="flex justify-between text-[9px]"><span>CGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>{formatCurrency(totalCGST, sym)}</span></div>
                            <div className="flex justify-between text-[9px]"><span>SGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate / 2}%)` : ''}</span><span>{formatCurrency(totalSGST, sym)}</span></div>
                          </>
                        );
                      } else if (totalIGST > 0) {
                        return <div className="flex justify-between text-[9px]"><span>IGST{taxBreakup.length === 1 ? ` (${taxBreakup[0].rate}%)` : ''}</span><span>{formatCurrency(totalIGST, sym)}</span></div>;
                      }
                      return <div className="flex justify-between text-[9px]"><span>Total Tax</span><span>{formatCurrency(totalGst, sym)}</span></div>;
                    })()}
                  </>
                )}
                {s('showDeliveryCharges') && deliveryCharge > 0 && (
                  <>
                    <div className="flex justify-between text-[9px] font-bold"><span>Delivery</span><span>{formatCurrency(deliveryCharge, sym)}</span></div>
                    {deliveryGst > 0 && (
                      <div className="flex justify-between text-[8px] italic opacity-60 font-bold">
                        <span className="pl-2">└ Tax ({business?.deliveryGstRate}%)</span>
                        <span>{formatCurrency(deliveryGst, sym)}</span>
                      </div>
                    )}
                  </>
                )}
                {s('showPackagingCharges') && packagingCharge > 0 && (
                  <>
                    <div className="flex justify-between text-[9px] font-bold"><span>Packaging</span><span>{formatCurrency(packagingCharge, sym)}</span></div>
                    {packagingGst > 0 && (
                      <div className="flex justify-between text-[8px] italic opacity-60 font-bold">
                        <span className="pl-2">└ Tax ({business?.packagingGstRate}%)</span>
                        <span>{formatCurrency(packagingGst, sym)}</span>
                      </div>
                    )}
                  </>
                )}
                {s('sepTotalBottom') && <div className="border-t border-dashed border-gray-400 my-1" />}
                {(() => {
                  const roundedTotal = Math.round(finalTotal);
                  const roundOff = roundedTotal - finalTotal;
                  return (
                    <>
                      {Math.abs(roundOff) > 0.001 && (
                        <div className="flex justify-between text-[9px] px-1 font-bold">
                          <span>Round Off</span>
                          <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-[11px] bg-black text-white px-1 py-0.5">
                        <span>GRAND TOTAL</span>
                        <span>{formatCurrency(roundedTotal, sym)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {s('showTaxBreakup') && taxActive && taxBreakup.length > 0 && (
                <div className="mt-3">
                  <div className="text-[8px] font-bold border-b border-dashed border-gray-400 mb-1 pb-0.5">GST TAX BREAKUP</div>
                  <table className="w-full text-[8px] border-collapse">
                    <thead>
                      <tr className="border-b border-dashed border-gray-400">
                        <th className="text-left font-bold">Rate</th>
                        <th className="text-right font-bold">Taxable</th>
                        <th className="text-right font-bold">CGST</th>
                        <th className="text-right font-bold">SGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxBreakup.map((g, idx) => (
                        <tr key={idx}>
                          <td className="text-left">{g.rate}%</td>
                          <td className="text-right">{g.taxable.toFixed(2)}</td>
                          <td className="text-right">{g.cgst.toFixed(2)}</td>
                          <td className="text-right">{g.sgst.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-dashed border-gray-400 mt-1" />
                </div>
              )}

              {s('showAmountInWords') && (
                <div className="mt-2 text-[8px] italic font-medium">
                  Amount in Words: {numberToWords(finalTotal)}
                </div>
              )}

              {s('sepPayment') && <div className="border-t border-dashed border-gray-400 my-1" />}

              {s('showPaymentStatus') && paymentStatus !== "Pending" && (
                <div className="mt-1 flex justify-between text-[8px]">
                  <span>Payment: {paymentMode === "None" ? "Pending" : paymentMode}</span>
                  <span>Status: {paymentStatus}</span>
                </div>
              )}

              {((business?.upi && business?.upiQrEnabled !== false) || paymentMode === "UPI") && (
                <div className="mt-2 text-center text-[9px] font-bold border-t border-dashed border-gray-400 pt-2">
                  {(business?.upi && business?.upiQrEnabled !== false && Boolean(qrUrl)) && (
                    <>
                      <div>Scan & Pay</div>
                      <div className="my-1.5 text-center">
                        <div className="inline-block border border-gray-300 p-1 rounded-md bg-white">
                          <img src={qrUrl} alt="UPI QR" className="w-[30mm] h-[30mm] object-contain block mix-blend-multiply" />
                        </div>
                      </div>
                      <div className="mb-2">UPI: {business.upi}</div>
                    </>
                  )}
                  {paymentMode === "UPI" && (
                    <div className="text-center text-[9px]">Txn Ref: {upiTxnRef || "Pending"}</div>
                  )}
                </div>
              )}

              {s('showReviewQR') && business?.reviewUrl && reviewQrBase64 && (
                <div className="mt-2 text-center text-[9px] font-bold border-t border-dashed border-gray-400 pt-2">
                  <div>Rate Your Experience</div>
                  <div className="my-1.5 text-center">
                    <div className="inline-block border border-gray-300 p-1 rounded-md bg-white">
                      <img 
                        src={reviewQrBase64} 
                        alt="Review QR" 
                        className="w-[30mm] h-[30mm] object-contain block mix-blend-multiply" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {business?.businessTagLine && <div className="text-center text-[9px] mt-1 italic opacity-80">{business.businessTagLine}</div>}
              {s('showGreetings') && (
                <div className="text-center font-bold text-[11px] mt-2">
                  {business?.greetingMessage || "THANK YOU 🙏 VISIT AGAIN"}
                </div>
              )}

              {s('showPoweredBy') && (
                <div className="text-center text-[7px] mt-3 opacity-40 uppercase tracking-widest">
                  Powered by Kravy
                </div>
              )}

              {s('sepFooter') && <div className="border-t border-dashed border-gray-400 my-1 mt-3" />}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-[var(--kravy-border)] bg-[var(--kravy-surface)] shrink-0 flex flex-col gap-3">
          <button
            onClick={() => { kravy.close(); setShowPreview(false); }}
            className="w-full py-3.5 rounded-xl border border-[var(--kravy-border)] font-bold text-sm text-[var(--kravy-text-secondary)] hover:bg-[var(--kravy-bg)] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillPreview;

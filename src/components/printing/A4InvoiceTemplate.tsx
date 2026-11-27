import React from "react";
import { useCurrency } from "@/lib/currency-context";
import { getTaxConfig } from "@/lib/tax-config";

export interface A4InvoiceProps {
  receiptRef?: React.RefObject<HTMLDivElement | null>;
  business: any;
  billNumber: string;
  billDate: string;
  dueDate?: string;
  tokenNumber?: any;
  selectedTable?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  orderNotes?: string;
  buyerGSTIN?: string;
  placeOfSupply?: string;
  items: any[];
  subtotal: number;
  discountAmt: number;
  appliedOffer?: any;
  taxActive: boolean;
  perProductEnabled?: boolean;
  globalRate?: number;
  totalTaxable: number;
  totalGst: number;
  taxBreakup: any[];
  deliveryCharge?: number;
  deliveryGst?: number;
  packagingCharge?: number;
  packagingGst?: number;
  serviceCharge?: number;
  serviceChargeName?: string;
  customCharges?: Array<{ name: string; amount: number; value?: number; type?: string }>;
  finalTotal: number;
  paymentMode?: string;
  paymentStatus?: string;
  upiTxnRef?: string;
  numberToWords?: (num: number) => string;
  amountPaid?: number;
  balanceDue?: number;
  isPreviewMode?: boolean;
  invoiceType?: "GST_TAX_INVOICE" | "RETAIL_INVOICE";
  upiQrBase64?: string;
  logoBase64?: string;
}

export const A4InvoiceTemplate: React.FC<A4InvoiceProps> = (props) => {
  const {
    receiptRef,
    business,
    billNumber,
    billDate,
    dueDate,
    tokenNumber,
    selectedTable,
    customerName,
    customerPhone,
    customerAddress,
    orderNotes,
    buyerGSTIN,
    placeOfSupply,
    items = [],
    subtotal = 0,
    discountAmt = 0,
    appliedOffer,
    taxActive = false,
    perProductEnabled = false,
    globalRate = 0,
    totalTaxable = 0,
    totalGst = 0,
    taxBreakup = [],
    deliveryCharge = 0,
    deliveryGst = 0,
    packagingCharge = 0,
    packagingGst = 0,
    serviceCharge = 0,
    serviceChargeName,
    customCharges = [],
    finalTotal = 0,
    paymentMode = "CASH",
    paymentStatus = "PAID",
    upiTxnRef,
    numberToWords,
    amountPaid,
    balanceDue,
    isPreviewMode = false,
    invoiceType = business?.printSettings?.a4InvoiceType || "GST_TAX_INVOICE",
    upiQrBase64,
    logoBase64
  } = props;

  const { currencySymbol: sym, currencyCode, taxConfig: ctxTaxConfig } = useCurrency();
  const taxConfig = ctxTaxConfig || getTaxConfig(business?.currencyCode || currencyCode || sym || "INR");
  const taxName = taxConfig.taxName || "GST";
  const taxIdLabel = taxConfig.taxIdLabel || "GSTIN";
  const isSplitTax = taxConfig.isSplitTax !== false;

  const isGSTInvoice = invoiceType === "GST_TAX_INVOICE";

  // Business state & supply detection
  const bizGSTIN = business?.gstNumber || business?.gstin || "";
  const bizStateCode = bizGSTIN.length >= 2 ? bizGSTIN.substring(0, 2) : "07";

  let buyerStateCode = "";
  if (buyerGSTIN && buyerGSTIN.trim().length >= 2 && buyerGSTIN.trim() !== "-") {
    buyerStateCode = buyerGSTIN.trim().substring(0, 2);
  }

  const isSameState = isSplitTax && (buyerStateCode ? buyerStateCode === bizStateCode : true);

  // Calculate CGST and SGST totals for split tax
  let totalCGST = taxBreakup.reduce((sum, g) => sum + (g.cgst || 0), 0);
  let totalSGST = taxBreakup.reduce((sum, g) => sum + (g.sgst || 0), 0);
  let totalIGST = taxBreakup.reduce((sum, g) => sum + (g.igst || 0), 0);

  if (taxActive && totalTaxable > 0 && totalCGST === 0 && totalSGST === 0 && totalIGST === 0 && totalGst > 0) {
    if (isSameState) {
      totalCGST = totalGst / 2;
      totalSGST = totalGst / 2;
    } else {
      totalIGST = totalGst;
    }
  }

  const roundedGrandTotal = Math.round(finalTotal);
  const roundOff = roundedGrandTotal - finalTotal;

  const inWords = numberToWords
    ? numberToWords(roundedGrandTotal)
    : `${roundedGrandTotal} RUPEES ONLY`;

  const logoSrc = logoBase64 || business?.logoUrl;
  const storeName = business?.businessName || "";
  const storeTagline = business?.businessTagLine || "";
  const storeAddress = business?.businessAddress || "";
  const storePhone = business?.phone || business?.businessPhone || "";
  const storeEmail = business?.email || "";
  const storeWebsite = business?.printSettings?.a4Website || business?.website || "";
  const storeOwnerName = business?.printSettings?.a4OwnerName || business?.ownerName || business?.contactPerson || "";

  const resolvedCustomerName = customerName || "Walk-in Guest";
  const resolvedCustomerPhone = customerPhone || "-";
  const resolvedCustomerAddress = customerAddress || "-";
  const resolvedCustomerGST = buyerGSTIN || "-";
  const resolvedCustomerPAN = (buyerGSTIN && buyerGSTIN.length === 15) ? buyerGSTIN.substring(2, 12) : "-";
  const resolvedSupplyState = placeOfSupply || (isSameState ? "Delhi (07)" : "Interstate");

  return (
    <div
      ref={receiptRef}
      className={`a4-msteam-sheet ${
        isPreviewMode
          ? "bg-white text-black shadow-2xl mx-auto rounded-md overflow-hidden border border-slate-300 w-full max-w-[794px]"
          : "print:block bg-white text-black"
      }`}
      style={{
        boxSizing: "border-box",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        lineHeight: 1.35
      }}
    >
      <div className="p-6 sm:p-8 text-[11px] text-black">
        {/* ================= 1. TOP HEADER (MSTeam Layout) ================= */}
        <div className="flex items-start justify-between gap-4 pb-3 mb-2">
          {/* Left: Brand Logo + Company Name & Address */}
          <div className="flex items-start gap-3.5 max-w-[58%]">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Logo"
                className="w-18 h-18 object-contain rounded p-1 border border-slate-200 shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-xl shrink-0 mt-0.5">
                {storeName.charAt(0)}
              </div>
            )}
            <div className="space-y-0.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-black leading-tight">
                {storeName}
              </h1>
              {storeTagline && (
                <div className="text-[12px] font-bold text-slate-800 leading-none">
                  {storeTagline}
                </div>
              )}
              <div className="text-[9.5px] text-slate-600 leading-tight pt-1 max-w-sm whitespace-pre-line">
                {storeAddress}
                {business?.district ? `, ${business.district}` : ""}
                {business?.state ? `, ${business.state}` : ""}
                {business?.pinCode ? ` - ${business.pinCode}` : ""}
              </div>
            </div>
          </div>

          {/* Right: Contact Information (Labels with Colons & Values - only real data) */}
          <div className="text-[10px] space-y-1 shrink-0 min-w-[200px]">
            {storeOwnerName && (
              <div className="flex items-center">
                <span className="w-14 font-bold text-black">Name</span>
                <span className="w-3 font-bold text-black text-center">:</span>
                <span className="font-normal text-slate-700 truncate">{storeOwnerName}</span>
              </div>
            )}
            {storePhone && (
              <div className="flex items-center">
                <span className="w-14 font-bold text-black">Phone</span>
                <span className="w-3 font-bold text-black text-center">:</span>
                <span className="font-normal text-slate-700 font-mono">{storePhone}</span>
              </div>
            )}
            {storeEmail && (
              <div className="flex items-center">
                <span className="w-14 font-bold text-black">Email</span>
                <span className="w-3 font-bold text-black text-center">:</span>
                <span className="font-normal text-slate-700 truncate">{storeEmail}</span>
              </div>
            )}
            {storeWebsite && (
              <div className="flex items-center">
                <span className="w-14 font-bold text-black">Website</span>
                <span className="w-3 font-bold text-black text-center">:</span>
                <span className="font-normal text-blue-600 truncate">{storeWebsite}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. TAX INVOICE BLUE BAR (Equal 3 parts) ================= */}
        <div className="grid grid-cols-3 border border-[#3b82f6] text-[10px] items-center">
          <div className="py-2 px-3 border-r border-[#3b82f6] font-bold text-black">
            {bizGSTIN ? (
              <>GSTIN : <span className="font-mono">{bizGSTIN}</span></>
            ) : (
              <span>{storePhone ? `Ph: ${storePhone}` : "INVOICE"}</span>
            )}
          </div>
          <div className="py-1.5 px-2 border-r border-[#3b82f6] text-center font-bold text-[#3b82f6] text-sm tracking-wider uppercase">
            {isGSTInvoice && taxActive ? "TAX INVOICE" : "INVOICE"}
          </div>
          <div className="py-2 px-3 text-right text-[8.5px] font-bold text-black tracking-wide uppercase">
            ORIGINAL FOR RECIPIENT
          </div>
        </div>

        {/* ================= 3. DETAILS BOX (Equal 2 parts) ================= */}
        <div className="grid grid-cols-2 border border-[#3b82f6] border-t-0 text-[10px]">
          {/* Left: Customer Detail */}
          <div className="border-r border-[#3b82f6] flex flex-col justify-between">
            <div className="bg-[#f0f8ff] py-1 text-center font-bold text-black border-b border-[#3b82f6] text-[10.5px]">
              Customer Detail
            </div>
            <div className="p-3 space-y-1.5">
              <div className="flex items-start">
                <span className="w-16 font-bold text-black shrink-0">M/S</span>
                <span className="text-black font-semibold">{resolvedCustomerName}</span>
              </div>
              <div className="flex items-start">
                <span className="w-16 font-bold text-black shrink-0">Address</span>
                <span className="text-slate-700 max-w-xs">{resolvedCustomerAddress}</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-black shrink-0">Phone</span>
                <span className="text-slate-700 font-mono">{resolvedCustomerPhone}</span>
              </div>
              <div className="flex items-center">
                <span className="w-16 font-bold text-black shrink-0">GSTIN</span>
                <span className="text-slate-700 font-mono">{resolvedCustomerGST}</span>
              </div>
              {resolvedCustomerGST !== "-" && (
                <>
                  <div className="flex items-center">
                    <span className="w-16 font-bold text-black shrink-0">PAN</span>
                    <span className="text-slate-700 font-mono">{resolvedCustomerPAN}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-16 font-bold text-black shrink-0">Supply</span>
                    <span className="text-slate-700">{resolvedSupplyState}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Invoice Info */}
          <div className="p-3 space-y-2 flex flex-col justify-start">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Invoice No.</span>
              <span className="font-bold text-black font-mono text-[11px]">{billNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Invoice Date</span>
              <span className="font-bold text-black">{billDate}</span>
            </div>
            {dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-normal">Due Date</span>
                <span className="font-bold text-black">{dueDate}</span>
              </div>
            )}
            {selectedTable && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-normal">Table / Source</span>
                <span className="font-bold text-black">{selectedTable}</span>
              </div>
            )}
            {tokenNumber && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-normal">Token No.</span>
                <span className="font-bold text-black font-mono">#{tokenNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Payment Mode</span>
              <span className="font-bold text-black uppercase">{paymentMode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-normal">Supply State</span>
              <span className="font-bold text-black">{resolvedSupplyState}</span>
            </div>
          </div>
        </div>

        {/* ================= 4. TAX ITEMS TABLE (Exact MSTeam Grid Header) ================= */}
        <div className="border border-[#3b82f6] border-t-0 overflow-hidden">
          <table className="w-full border-collapse text-[9.5px]">
            <thead>
              {/* Row 1: Grouped Headers with #f0f8ff fill */}
              <tr className="bg-[#f0f8ff] text-black font-bold text-center border-b border-[#3b82f6]">
                <th rowSpan={2} className="py-2 px-1 border-r border-[#3b82f6] w-8">Sr.</th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#3b82f6] text-left">Name of Product / Service</th>
                {isGSTInvoice && <th rowSpan={2} className="py-2 px-1 border-r border-[#3b82f6] w-14">HSN</th>}
                <th rowSpan={2} className="py-2 px-1 border-r border-[#3b82f6] w-10">Qty</th>
                <th rowSpan={2} className="py-2 px-1.5 border-r border-[#3b82f6] w-16 text-right">Rate</th>
                <th rowSpan={2} className="py-2 px-1.5 border-r border-[#3b82f6] w-18 text-right">Taxable</th>
                {isGSTInvoice && taxActive && (
                  isSameState ? (
                    <>
                      <th colSpan={2} className="py-1 px-1 border-r border-[#3b82f6]">CGST</th>
                      <th colSpan={2} className="py-1 px-1 border-r border-[#3b82f6]">SGST</th>
                    </>
                  ) : (
                    <th colSpan={2} className="py-1 px-1 border-r border-[#3b82f6]">IGST</th>
                  )
                )}
                <th rowSpan={2} className="py-2 px-2 w-20 text-right">Total</th>
              </tr>
              {/* Row 2: Sub-headers for % and Amt */}
              {isGSTInvoice && taxActive && (
                <tr className="bg-[#f0f8ff] text-black font-bold text-center border-b border-[#3b82f6]">
                  {isSameState ? (
                    <>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-8">%</th>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-12 text-right">Amt</th>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-8">%</th>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-12 text-right">Amt</th>
                    </>
                  ) : (
                    <>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-10">%</th>
                      <th className="py-1 px-1 border-r border-[#3b82f6] w-14 text-right">Amount</th>
                    </>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[#3b82f6]/40 text-black">
              {items.map((it, idx) => {
                const qty = Number(it.quantity || it.qty || 1);
                const rate = Number(it.price || it.rate || 0);
                const lineGross = qty * rate;
                const gstPct = Number(it.gst ?? globalRate ?? 0);
                const isInclusive = it.taxStatus === "With Tax" || it.isTaxInclusive;

                let lineTaxable = lineGross;
                let lineTax = 0;
                if (taxActive && gstPct > 0) {
                  if (isInclusive) {
                    lineTax = lineGross * (1 - 1 / (1 + gstPct / 100));
                    lineTaxable = lineGross - lineTax;
                  } else {
                    lineTaxable = lineGross;
                    lineTax = (lineGross * gstPct) / 100;
                  }
                }

                const lineCGST = isSameState ? lineTax / 2 : 0;
                const lineSGST = isSameState ? lineTax / 2 : 0;
                const lineIGST = !isSameState ? lineTax : 0;
                const lineHalfPct = (gstPct / 2).toFixed(2);

                return (
                  <tr key={idx} className="hover:bg-blue-50/20">
                    <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 border-r border-[#3b82f6]/40">
                      <div className="font-bold text-black">{it.name}</div>
                      {it.variant && (
                        <span className="text-[8.5px] text-slate-500 block">
                          Size/Variant: {it.variant}
                        </span>
                      )}
                      {it.notes && (
                        <span className="text-[8.5px] text-slate-500 italic block">
                          └ Note: {it.notes}
                        </span>
                      )}
                    </td>
                    {isGSTInvoice && (
                      <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center font-mono">
                        {it.hsn || it.hsnCode || "9983"}
                      </td>
                    )}
                    <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center font-semibold">
                      {qty.toFixed(2)}
                    </td>
                    <td className="py-2 px-1.5 border-r border-[#3b82f6]/40 text-right font-mono">
                      {rate.toFixed(2)}
                    </td>
                    <td className="py-2 px-1.5 border-r border-[#3b82f6]/40 text-right font-mono font-semibold">
                      {lineTaxable.toFixed(2)}
                    </td>
                    {isGSTInvoice && taxActive && (
                      isSameState ? (
                        <>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center text-slate-600 font-mono">
                            {gstPct > 0 ? lineHalfPct : "0.00"}
                          </td>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-right font-mono">
                            {lineCGST.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center text-slate-600 font-mono">
                            {gstPct > 0 ? lineHalfPct : "0.00"}
                          </td>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-right font-mono">
                            {lineSGST.toFixed(2)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-center text-slate-600 font-mono">
                            {gstPct.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 border-r border-[#3b82f6]/40 text-right font-mono">
                            {lineIGST.toFixed(2)}
                          </td>
                        </>
                      )
                    )}
                    <td className="py-2 px-2 text-right font-mono font-bold text-black">
                      {(lineTaxable + lineTax).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {/* Smart Dynamic Table Spacing: spacious for short invoices, natural for 5+ items */}
              {items.length < 5 && (
                <tr
                  className={`border-t-0 ${
                    items.length <= 1
                      ? "h-36"
                      : items.length === 2
                      ? "h-28"
                      : items.length === 3
                      ? "h-20"
                      : "h-10"
                  }`}
                >
                  <td className="border-r border-[#3b82f6]/40"></td>
                  <td className="border-r border-[#3b82f6]/40"></td>
                  {isGSTInvoice && <td className="border-r border-[#3b82f6]/40"></td>}
                  <td className="border-r border-[#3b82f6]/40"></td>
                  <td className="border-r border-[#3b82f6]/40"></td>
                  <td className="border-r border-[#3b82f6]/40"></td>
                  {isGSTInvoice && taxActive && (
                    isSameState ? (
                      <>
                        <td className="border-r border-[#3b82f6]/40"></td>
                        <td className="border-r border-[#3b82f6]/40"></td>
                        <td className="border-r border-[#3b82f6]/40"></td>
                        <td className="border-r border-[#3b82f6]/40"></td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-[#3b82f6]/40"></td>
                        <td className="border-r border-[#3b82f6]/40"></td>
                      </>
                    )
                  )}
                  <td></td>
                </tr>
              )}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot>
              <tr className="bg-[#f0f8ff] border-t-2 border-[#3b82f6] font-bold text-black">
                <td className="py-1.5 px-1 border-r border-[#3b82f6] text-center"></td>
                <td className="py-1.5 px-2 border-r border-[#3b82f6]">Total</td>
                {isGSTInvoice && <td className="py-1.5 px-1 border-r border-[#3b82f6]"></td>}
                <td className="py-1.5 px-1 border-r border-[#3b82f6] text-center font-mono">
                  {items.reduce((s, it) => s + Number(it.quantity || it.qty || 1), 0).toFixed(2)}
                </td>
                <td className="py-1.5 px-1.5 border-r border-[#3b82f6]"></td>
                <td className="py-1.5 px-1.5 border-r border-[#3b82f6] text-right font-mono">
                  {(totalTaxable || subtotal).toFixed(2)}
                </td>
                {isGSTInvoice && taxActive && (
                  isSameState ? (
                    <>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6]"></td>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6] text-right font-mono">{totalCGST.toFixed(2)}</td>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6]"></td>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6] text-right font-mono">{totalSGST.toFixed(2)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6]"></td>
                      <td className="py-1.5 px-1 border-r border-[#3b82f6] text-right font-mono">{totalIGST.toFixed(2)}</td>
                    </>
                  )
                )}
                <td className="py-1.5 px-2 text-right font-mono font-black">
                  {(finalTotal).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ================= 5. SUMMARY BOX (MSTeam 2-column: Words left, Calculations right) ================= */}
        <div className="grid grid-cols-12 border border-[#3b82f6] border-t-0 text-[10px]">
          {/* Left Column: Total in words */}
          <div className="col-span-6 border-r border-[#3b82f6] flex flex-col">
            <div className="bg-[#f0f8ff] py-1 text-center font-bold text-black border-b border-[#3b82f6] text-[10.5px]">
              Total in words
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center items-center text-center space-y-1">
              <span className="font-bold text-black uppercase tracking-wide leading-relaxed font-serif">
                {inWords}
              </span>
              {orderNotes && (
                <div className="text-[9px] text-slate-500 italic pt-2">
                  Remarks: {orderNotes}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Line-by-line tax and totals */}
          <div className="col-span-6 divide-y divide-[#3b82f6]/40 text-black">
            <div className="flex justify-between px-3 py-1 font-bold">
              <span>Taxable Amount</span>
              <span className="font-mono">{(totalTaxable || subtotal).toFixed(2)}</span>
            </div>

            {discountAmt > 0 && (
              <div className="flex justify-between px-3 py-1 font-bold text-rose-600">
                <span>Discount {appliedOffer?.code ? `(${appliedOffer.code})` : ""}</span>
                <span className="font-mono">- {discountAmt.toFixed(2)}</span>
              </div>
            )}

            {taxActive && (
              isSameState ? (
                <>
                  <div className="flex justify-between px-3 py-1 font-bold">
                    <span>Add : CGST</span>
                    <span className="font-mono">{totalCGST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 font-bold">
                    <span>Add : SGST</span>
                    <span className="font-mono">{totalSGST.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between px-3 py-1 font-bold">
                  <span>Add : IGST</span>
                  <span className="font-mono">{totalIGST.toFixed(2)}</span>
                </div>
              )
            )}

            {taxActive && (
              <div className="flex justify-between px-3 py-1 font-bold">
                <span>Total Tax</span>
                <span className="font-mono">{totalGst.toFixed(2)}</span>
              </div>
            )}

            {deliveryCharge > 0 && (
              <div className="flex justify-between px-3 py-1 font-bold">
                <span>Delivery Charge</span>
                <span className="font-mono">{deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {packagingCharge > 0 && (
              <div className="flex justify-between px-3 py-1 font-bold">
                <span>Packaging Charge</span>
                <span className="font-mono">{packagingCharge.toFixed(2)}</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between px-3 py-1 font-bold">
                <span>{serviceChargeName || "Service Charge"}</span>
                <span className="font-mono">{serviceCharge.toFixed(2)}</span>
              </div>
            )}
            {Array.isArray(customCharges) && customCharges.map((c, i) => (
              c.amount > 0 ? (
                <div key={i} className="flex justify-between px-3 py-1 font-bold">
                  <span>{c.name}</span>
                  <span className="font-mono">{Number(c.amount).toFixed(2)}</span>
                </div>
              ) : null
            ))}

            {Math.abs(roundOff) > 0.001 && (
              <div className="flex justify-between px-3 py-1 text-slate-500 font-mono text-[9px]">
                <span>Round Off</span>
                <span>{roundOff > 0 ? "+" : ""}{roundOff.toFixed(2)}</span>
              </div>
            )}

            {/* Total Amount After Tax Highlight Row */}
            <div className="bg-[#f0f8ff] flex justify-between px-3 py-2 font-black text-sm text-black border-t-2 border-[#3b82f6]">
              <span>Total Amount After Tax</span>
              <span className="font-mono">{sym} {roundedGrandTotal.toFixed(2)}</span>
            </div>

            {balanceDue !== undefined && balanceDue > 0 && (
              <>
                <div className="flex justify-between px-3 py-1 font-bold text-emerald-700">
                  <span>Amount Paid</span>
                  <span className="font-mono">{sym} {(amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-3 py-1 font-bold text-rose-700 bg-rose-50/50">
                  <span>Balance Due</span>
                  <span className="font-mono">{sym} {balanceDue.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ================= 6. BANK & SIGNATORY BOX (MSTeam Style) ================= */}
        <div className="grid grid-cols-12 border border-[#3b82f6] border-t-0 text-[10px]">
          {/* Left: Bank Details */}
          <div className="col-span-6 border-r border-[#3b82f6] flex flex-col justify-between">
            <div className="bg-[#f0f8ff] py-1 text-center font-bold text-black border-b border-[#3b82f6] text-[10.5px]">
              Bank Details
            </div>
            <div className="p-3 space-y-1.5 flex-1">
              {(business?.printSettings?.a4BankName || business?.bankName) && (
                <div className="flex items-center">
                  <span className="w-24 font-bold text-black">Bank Name</span>
                  <span className="font-normal text-slate-800">{business?.printSettings?.a4BankName || business?.bankName}</span>
                </div>
              )}
              {(business?.printSettings?.a4AccountName || business?.accountName || business?.businessName) && (
                <div className="flex items-center">
                  <span className="w-24 font-bold text-black">Acc. Name</span>
                  <span className="font-normal text-slate-800">{business?.printSettings?.a4AccountName || business?.accountName || business?.businessName}</span>
                </div>
              )}
              {(business?.printSettings?.a4AccountNumber || business?.accountNumber || business?.bankAccount) && (
                <div className="flex items-center">
                  <span className="w-24 font-bold text-black">Acc. Number</span>
                  <span className="font-mono font-bold text-slate-900">{business?.printSettings?.a4AccountNumber || business?.accountNumber || business?.bankAccount}</span>
                </div>
              )}
              {(business?.printSettings?.a4IfscCode || business?.ifscCode || business?.bankIfsc) && (
                <div className="flex items-center">
                  <span className="w-24 font-bold text-black">IFSC</span>
                  <span className="font-mono font-bold text-slate-900">{business?.printSettings?.a4IfscCode || business?.ifscCode || business?.bankIfsc}</span>
                </div>
              )}
              {business?.bankDetails && !business?.printSettings?.a4BankName && !business?.bankName && (
                <div className="text-[9.5px] text-slate-700 whitespace-pre-line">
                  {business.bankDetails}
                </div>
              )}
              {business?.upi && (
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 gap-2">
                  <div>
                    <span className="font-bold text-black block">UPI ID</span>
                    <span className="font-mono text-blue-600 font-bold">{business.upi}</span>
                  </div>
                  {upiQrBase64 && (
                    <img
                      src={upiQrBase64}
                      alt="UPI QR"
                      className="w-14 h-14 object-contain border border-slate-200 rounded p-0.5 bg-white shrink-0"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Certified Declaration & Signatory */}
          <div className="col-span-6 p-3 flex flex-col justify-between text-center min-h-[110px]">
            <div className="space-y-1">
              <p className="text-[8.5px] font-bold text-slate-600 leading-tight">
                Certified that the particulars given above are true and correct.
              </p>
              <div className="font-bold text-black text-[11px]">
                For {storeName}
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 space-y-1">
              {business?.signatureUrl ? (
                <img
                  src={business.signatureUrl}
                  alt="Signature"
                  className="h-10 mx-auto object-contain"
                />
              ) : (
                <div className="border-t border-[#3b82f6]/40 w-48 mx-auto" />
              )}
              <div className="font-bold text-black text-[9.5px]">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

        {/* ================= 7. TERMS & CONDITIONS BOX (MSTeam Style) ================= */}
        <div className="border border-[#3b82f6] border-t-0 text-[10px]">
          <div className="bg-[#f0f8ff] py-0.5 text-center font-bold text-black border-b border-[#3b82f6] text-[10px]">
            Terms and Conditions
          </div>
          <div className="p-2.5 text-[8.5px] text-slate-700 leading-relaxed whitespace-pre-line">
            {business?.printSettings?.a4Terms || business?.terms || "1. Payment is non-refundable. 2. Goods / Services once confirmed cannot be cancelled. 3. All disputes are subject to local jurisdiction only."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default A4InvoiceTemplate;

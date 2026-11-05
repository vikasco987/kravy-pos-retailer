"use client";

import React, { useMemo } from "react";
import { BluetoothPrintSettings } from "@/lib/web-bluetooth";

interface BluetoothThermalPreviewProps {
  settings: BluetoothPrintSettings;
  business: any;
  previewMode?: "bill" | "kot";
  previewGst?: boolean;
}

export default function BluetoothThermalPreview({
  settings,
  business,
  previewMode = "bill",
  previewGst = true
}: BluetoothThermalPreviewProps) {
  const isKot = previewMode === "kot";
  const is80 = settings.paperWidth === "80mm";
  const numColumns = is80 ? 48 : 32;

  // Sizing with safe fallbacks
  const logoSizePx = Math.min(260, Math.max(60, Math.round((settings.logoSize ?? 50) * 2.8)));
  const logoBottomSpacePx = Math.max(-10, Math.min(40, settings.logoBottomSpace ?? 0));
  const businessNameSize = Math.max(12, Math.min(36, settings.businessNameSize ?? 18));
  const addressSize = Math.max(8, Math.min(18, settings.addressSize ?? 11));
  const taglineSize = Math.max(8, Math.min(16, settings.taglineSize ?? 11));
  const receiptTokenSize = Math.max(16, Math.min(48, settings.receiptTokenSize ?? 28));
  const itemsFontSize = Math.max(8, Math.min(20, settings.itemsFontSize ?? 11));
  const grandTotalFontSize = Math.max(11, Math.min(28, settings.grandTotalFontSize ?? 13));
  const customerDetailsFontSize = Math.max(8, Math.min(18, settings.customerDetailsFontSize ?? 10));
  const detailsFontSize = Math.max(8, Math.min(16, settings.detailsFontSize ?? 10));
  const greetingsFooterSize = Math.max(9, Math.min(22, settings.greetingsFooterSize ?? 12));

  // KOT Sizers
  const kotTokenSize = Math.max(12, Math.min(36, settings.kotTokenSize ?? 16));
  const kotHeaderDetailsSize = Math.max(8, Math.min(24, settings.kotHeaderDetailsSize ?? 11));
  const kotItemsFontSize = Math.max(9, Math.min(28, settings.kotItemsFontSize ?? 11));
  const kotQuantityFontSize = Math.max(10, Math.min(32, settings.kotQuantityFontSize ?? 14));

  // Dummy items
  const dummyItems = [
    { name: "Paneer Butter Masala", qty: 2, price: 250, gst: 5, notes: "Extra spicy" },
    { name: "Butter Naan", qty: 4, price: 40, gst: 5 },
    { name: "Cold Coffee", qty: 1, price: 120, gst: 18, variant: "Less Sugar" }
  ];

  const subtotal = 780;
  const discount = 50;
  const delivery = 0;
  const packaging = 20;
  const totalTaxable = 730;
  const totalTax = previewGst ? 36.5 : 0;
  const grandTotal = subtotal - discount + packaging + totalTax;

  const dashedDivider = useMemo(() => "-".repeat(numColumns), [numColumns]);

  return (
    <div
      className="bg-[#fafbf9] text-[#111413] w-full font-mono select-none relative shadow-2xl transition-all duration-200"
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        lineHeight: 1.25,
        letterSpacing: "0.02em"
      }}
    >
      {/* Bluetooth ESC/POS Thermal Badge Header */}
      <div className="bg-slate-900 text-white text-[9px] font-sans font-black py-1 px-3 flex items-center justify-between border-b border-slate-700 tracking-wider uppercase">
        <span className="flex items-center gap-1.5 text-blue-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          ESC/POS Bluetooth {is80 ? "80mm (3\")" : "58mm (2\")"}
        </span>
        <span className="text-slate-400 text-[8px] font-mono">{numColumns} Cols</span>
      </div>

      <div className="p-4 sm:p-5">
        {/* ================= KOT PREVIEW ================= */}
        {isKot ? (
          <div className="space-y-2">
            {settings.showKOTHeader !== false && (
              <div className="text-center font-black">
                <div
                  style={{
                    fontSize: `${kotHeaderDetailsSize + 4}px`,
                    fontWeight: 900
                  }}
                  className="tracking-widest"
                >
                  K.O.T
                </div>
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
                  {dashedDivider}
                </div>
              </div>
            )}

            {/* Table & Token */}
            <div className="flex justify-between items-baseline font-black">
              {settings.showKOTTable !== false && (
                <div
                  style={{ fontSize: `${kotHeaderDetailsSize}px` }}
                  className="bg-black text-white px-1.5 py-0.5 rounded-xs"
                >
                  TABLE: 05
                </div>
              )}
              {settings.showKOTToken !== false && (
                <div
                  style={{
                    fontSize: `${kotTokenSize}px`,
                    fontWeight: 900
                  }}
                  className="tracking-tight text-right ml-auto"
                >
                  KOT NO: #42
                </div>
              )}
            </div>

            {/* Bill No & Date/Time */}
            <div
              className="flex justify-between text-slate-800 font-bold"
              style={{ fontSize: `${kotHeaderDetailsSize}px` }}
            >
              {settings.showKOTBillNo !== false && <span>Bill: INV-2024-001</span>}
              {settings.showKOTDateTime !== false && <span>12:45 PM</span>}
            </div>

            {/* Customer in KOT */}
            {settings.showKOTCustomer !== false && (
              <div
                className="text-slate-800 font-bold truncate"
                style={{ fontSize: `${kotHeaderDetailsSize}px` }}
              >
                Customer: Rahul Sharma (9876543210)
              </div>
            )}

            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
              {dashedDivider}
            </div>

            {/* Items Header */}
            <div
              className="flex justify-between font-black tracking-wider uppercase"
              style={{ fontSize: `${kotItemsFontSize}px` }}
            >
              <span>ITEM DESCRIPTION</span>
              <span>QTY</span>
            </div>
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-0.5">
              {dashedDivider}
            </div>

            {/* Items List */}
            <div className="space-y-1.5">
              {dummyItems.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start font-bold">
                    <span
                      className="uppercase pr-2 flex-1 break-words"
                      style={{ fontSize: `${kotItemsFontSize}px` }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="font-black whitespace-nowrap"
                      style={{ fontSize: `${kotQuantityFontSize}px` }}
                    >
                      x{item.qty}
                    </span>
                  </div>

                  {settings.showKOTVariants !== false && item.variant && (
                    <div
                      className="text-slate-600 pl-2 text-xs italic"
                      style={{ fontSize: `${Math.max(8, kotItemsFontSize - 2)}px` }}
                    >
                      ({item.variant})
                    </div>
                  )}

                  {settings.showKOTInstructions !== false && item.notes && (
                    <div
                      className="font-black text-slate-900 pl-2"
                      style={{ fontSize: `${Math.max(8, kotItemsFontSize - 1)}px` }}
                    >
                      * Note: {item.notes}
                    </div>
                  )}

                  {settings.showKOTItemDivider !== false && idx < dummyItems.length - 1 && (
                    <div className="border-b border-dotted border-slate-400 my-1" />
                  )}
                </div>
              ))}
            </div>

            {settings.showKOTFooter !== false && (
              <div className="pt-2 text-center">
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none mb-1">
                  {dashedDivider}
                </div>
                <div
                  className="font-black uppercase tracking-wider"
                  style={{ fontSize: `${kotHeaderDetailsSize}px` }}
                >
                  END OF KOT
                </div>
                {settings.showKOTDateTime !== false && (
                  <div
                    className="text-slate-600 font-bold text-[9px] mt-0.5"
                  >
                    {new Date().toLocaleDateString("en-GB")} 12:45 PM
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= BILL PREVIEW ================= */
          <div className="space-y-2">
            {/* Logo */}
            {settings.showLogo !== false && (
              <div
                className="flex flex-col items-center justify-center transition-all duration-200"
                style={{ marginBottom: `${logoBottomSpacePx}px` }}
              >
                {business?.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt="Logo"
                    className="object-contain block mx-auto transition-all duration-200"
                    style={{
                      width: `${logoSizePx}px`,
                      maxHeight: `${Math.round(logoSizePx * 1.2)}px`,
                      imageRendering: "pixelated",
                      filter: "contrast(200%) grayscale(100%)"
                    }}
                  />
                ) : (
                  <div
                    className="border-2 border-dashed border-slate-400 text-slate-500 flex flex-col items-center justify-center p-2 rounded text-center transition-all duration-200"
                    style={{
                      width: `${logoSizePx}px`,
                      height: `${Math.round(logoSizePx * 0.6)}px`
                    }}
                  >
                    <span className="font-sans font-bold text-[10px]">STORE LOGO</span>
                    <span className="text-[8px] font-mono opacity-70">
                      {logoSizePx}px width ({settings.logoSize || 50}mm)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Business Name */}
            {settings.showBusinessName !== false && (
              <div
                className="text-center font-black uppercase tracking-tight break-words"
                style={{
                  fontSize: `${businessNameSize}px`,
                  fontWeight: 900,
                  lineHeight: 1.15
                }}
              >
                {business?.businessName || business?.name || "KRAVY RESTAURANT"}
              </div>
            )}

            {/* Tagline */}
            {settings.showTagline !== false && (business?.businessTagLine || business?.tagline) && (
              <div
                className="text-center font-semibold text-slate-700 italic"
                style={{ fontSize: `${taglineSize}px` }}
              >
                {business?.businessTagLine || business?.tagline || "Authentic Taste, Served Hot"}
              </div>
            )}

            {/* Address */}
            {settings.showAddress !== false && (
              <div
                className="text-center text-slate-800 leading-snug px-1"
                style={{ fontSize: `${addressSize}px` }}
              >
                {business?.businessAddress || "Shop 4, Market Complex, Connaught Place, New Delhi - 110001"}
              </div>
            )}

            {/* Contact */}
            {settings.showContact !== false && (
              <div
                className="text-center font-bold text-slate-800"
                style={{ fontSize: `${addressSize}px` }}
              >
                Mob: {business?.contactPersonPhone || business?.phone || "9876543210"}
              </div>
            )}

            {/* GST & FSSAI */}
            <div
              className="text-center font-bold text-slate-800 space-y-0.5"
              style={{ fontSize: `${addressSize}px` }}
            >
              {settings.showGST !== false && (
                <div>GSTIN: {business?.gstNumber || "07AAAAA0000A1Z5"}</div>
              )}
              {settings.showFSSAI !== false && (
                <div>FSSAI: {business?.fssaiNumber || "10019011000543"}</div>
              )}
            </div>

            {/* Title / Invoice banner */}
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
              {dashedDivider}
            </div>
            <div
              className="text-center font-black tracking-wider uppercase"
              style={{ fontSize: `${detailsFontSize + 2}px` }}
            >
              {previewGst ? "TAX INVOICE" : "SALES RECEIPT"}
            </div>
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
              {dashedDivider}
            </div>

            {/* Bill No & Token */}
            <div className="flex justify-between items-baseline font-black">
              {settings.showInvoiceNumber !== false && (
                <div style={{ fontSize: `${detailsFontSize + 1}px` }}>
                  Bill No: INV-2024-001
                </div>
              )}
              {settings.showToken !== false && (
                <div
                  className="tracking-tight text-right ml-auto"
                  style={{
                    fontSize: `${receiptTokenSize}px`,
                    fontWeight: 900
                  }}
                >
                  Token: 42
                </div>
              )}
            </div>

            {/* Date & Table */}
            <div
              className="flex justify-between text-slate-800 font-bold"
              style={{ fontSize: `${detailsFontSize}px` }}
            >
              {settings.showDate !== false && <span>Date: {new Date().toLocaleDateString("en-GB")}</span>}
              {settings.showTableInfo !== false && <span>Table: Table 05</span>}
            </div>

            {/* Customer Details */}
            {settings.showCustomerDetails !== false && (
              <div
                className="pt-1 border-t border-dashed border-slate-400 space-y-0.5"
                style={{ fontSize: `${customerDetailsFontSize}px` }}
              >
                <div className="font-bold">Customer: Rahul Sharma</div>
                {settings.showCustomerPhone !== false && <div>Phone: 9876543210</div>}
                {settings.showCustomerAddress !== false && <div>Addr: Flat 101, Green Heights, Delhi</div>}
              </div>
            )}

            {/* Items Header */}
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
              {dashedDivider}
            </div>
            <div
              className="flex justify-between font-black tracking-wider uppercase"
              style={{ fontSize: `${itemsFontSize}px` }}
            >
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-0.5">
              {dashedDivider}
            </div>

            {/* Items List */}
            <div className="space-y-1.5">
              {dummyItems.map((item, idx) => {
                const totalItemPrice = item.price * item.qty;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div
                      className="font-bold uppercase break-words"
                      style={{ fontSize: `${itemsFontSize}px` }}
                    >
                      {item.name}
                    </div>

                    {settings.showVariants !== false && item.variant && (
                      <div
                        className="text-slate-600 pl-2 text-xs italic"
                        style={{ fontSize: `${Math.max(8, itemsFontSize - 2)}px` }}
                      >
                        ({item.variant})
                      </div>
                    )}

                    <div
                      className="flex justify-between font-mono"
                      style={{ fontSize: `${Math.max(8, itemsFontSize - 1)}px` }}
                    >
                      <span className="text-slate-700">
                        {item.qty} x {item.price.toFixed(2)}
                        {previewGst && ` | GST ${item.gst}%`}
                      </span>
                      <span className="font-bold">{totalItemPrice.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Section */}
            <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none my-1">
              {dashedDivider}
            </div>

            <div className="space-y-0.5" style={{ fontSize: `${detailsFontSize}px` }}>
              {settings.showSubtotal !== false && (
                <div className="flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
              )}

              {settings.showDiscount !== false && discount > 0 && (
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Discount</span>
                  <span>-{discount.toFixed(2)}</span>
                </div>
              )}

              {settings.showPackagingCharge !== false && packaging > 0 && (
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Packaging</span>
                  <span>+{packaging.toFixed(2)}</span>
                </div>
              )}

              {settings.showTaxBreakup !== false && previewGst && (
                <div className="pt-1 mt-1 border-t border-dotted border-slate-300 space-y-0.5">
                  <div className="flex justify-between text-slate-700">
                    <span>Taxable Amt</span>
                    <span>{totalTaxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>CGST (2.5%)</span>
                    <span>15.25</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST (2.5%)</span>
                    <span>15.25</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>CGST (9%)</span>
                    <span>3.00</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST (9%)</span>
                    <span>3.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grand Total */}
            {settings.showGrandTotal !== false && (
              <div className="pt-1">
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none mb-1">
                  {dashedDivider}
                </div>
                <div
                  className="flex justify-between font-black tracking-tight"
                  style={{
                    fontSize: `${grandTotalFontSize}px`,
                    fontWeight: 900
                  }}
                >
                  <span>GRAND TOTAL</span>
                  <span>Rs.{grandTotal.toFixed(2)}</span>
                </div>
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none mt-1">
                  {dashedDivider}
                </div>
              </div>
            )}

            {/* Amount in words */}
            {settings.showAmountInWords !== false && (
              <div
                className="text-slate-700 italic font-medium"
                style={{ fontSize: `${detailsFontSize}px` }}
              >
                Amount in Words: Seven Hundred Sixty Six Rupees Only
              </div>
            )}

            {/* Payment Info */}
            <div className="space-y-0.5 pt-1" style={{ fontSize: `${detailsFontSize}px` }}>
              {settings.showPaymentMode !== false && (
                <div className="flex justify-between font-bold">
                  <span>Payment Mode:</span>
                  <span>UPI</span>
                </div>
              )}
              {settings.showPaymentStatus !== false && (
                <div className="flex justify-between font-bold">
                  <span>Status:</span>
                  <span>PAID</span>
                </div>
              )}
              {settings.showBalanceDue !== false && (
                <div className="flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span>Rs.0.00</span>
                </div>
              )}
            </div>

            {/* UPI QR Code */}
            {settings.showUpiQr !== false && (
              <div className="pt-2 text-center">
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none mb-1">
                  {dashedDivider}
                </div>
                <div
                  className="font-black tracking-wider uppercase mb-1"
                  style={{ fontSize: `${detailsFontSize}px` }}
                >
                  SCAN & PAY
                </div>
                <div className="inline-block p-1 bg-white border border-slate-400 mx-auto my-1">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=test@upi"
                    alt="UPI QR"
                    className="w-24 h-24 object-contain block mx-auto"
                    style={{ imageRendering: "pixelated", filter: "contrast(200%) grayscale(100%)" }}
                  />
                </div>
                <div
                  className="font-black text-slate-900 mt-1"
                  style={{ fontSize: `${detailsFontSize}px` }}
                >
                  UPI: {business?.upi || "kravy@upi"}
                </div>
                <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none mt-1">
                  {dashedDivider}
                </div>
              </div>
            )}

            {/* Menu QR Code */}
            {settings.showMenuQr !== false && (
              <div className="pt-2 text-center">
                <div
                  className="font-black tracking-wider uppercase mb-1"
                  style={{ fontSize: `${detailsFontSize}px` }}
                >
                  RATE YOUR EXPERIENCE
                </div>
                <div className="inline-block p-1 bg-white border border-slate-400 mx-auto my-1">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://kravy.in"
                    alt="Menu QR"
                    className="w-20 h-20 object-contain block mx-auto"
                    style={{ imageRendering: "pixelated", filter: "contrast(200%) grayscale(100%)" }}
                  />
                </div>
              </div>
            )}

            {/* Greetings & Powered By */}
            <div className="pt-2 text-center space-y-1">
              {settings.showDate !== false && (
                <div className="text-slate-600 text-[9px] font-bold">
                  {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </div>
              )}

              {settings.showGreetings !== false && (
                <div
                  className="font-black uppercase tracking-wider"
                  style={{ fontSize: `${greetingsFooterSize}px`, fontWeight: 900 }}
                >
                  {business?.greetingMessage || "HARE KRISHNA"}
                </div>
              )}

              {settings.showPoweredBy !== false && (
                <div className="text-slate-500 font-bold text-[9px] tracking-wide">
                  Powered by Kravy POS
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Feed Line Simulation Indicator */}
        <div
          className="border-t border-dashed border-slate-300 mt-4 text-center select-none"
          style={{ height: `${(settings.bottomFeeds || 4) * 8}px` }}
        >
          <span className="text-[7px] text-slate-400 font-sans uppercase tracking-widest block pt-1">
            [{settings.bottomFeeds || 4} FEED LINES]
          </span>
        </div>
      </div>
    </div>
  );
}

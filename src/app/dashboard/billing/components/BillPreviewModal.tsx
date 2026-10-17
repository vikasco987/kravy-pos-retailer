import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Code, Share2 } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
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
  if (decimalPart > 0) result += ' and ' + convert(decimalPart) + ' Paise';
  return result + ' Only';
};

export const BillPreviewModal = ({ bill: initialBill, business, onClose }: { bill: any, business: any, onClose: () => void }) => {
  const { currencySymbol: sym } = useCurrency();
  const [showJson, setShowJson] = useState(false);
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchUrl, setFetchUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (!initialBill) return;
    if (initialBill.items) {
      const b = { ...initialBill };
      if (typeof b.items === 'string') {
        try { b.items = JSON.parse(b.items); } catch(e) { b.items = []; }
      }
      if (!Array.isArray(b.items)) b.items = [];
      setBill(b);
      setFetchUrl("Initial props (Cache)");
      setLoading(false);
    } else {
      setLoading(true);
      const searchParams = typeof window !== "undefined" ? window.location.search : "";
      const url = `/api/bill-manager/${initialBill.id}${searchParams}`;
      setFetchUrl(url);
      fetch(url, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          const b = (data && data.bill) ? { ...data.bill } : { ...initialBill };
          let itms = b.items || [];
          if (typeof itms === 'string') {
            try { itms = JSON.parse(itms); } catch(e) {}
          }
          if (!Array.isArray(itms)) itms = [];
          b.items = itms;
          setBill(b);
          setLoading(false);
        })
        .catch(() => {
          const b = { ...initialBill, items: [] };
          setBill(b);
          setLoading(false);
        });
    }
  }, [initialBill]);

  if (!initialBill) return null;
  
  if (loading || !bill) {
    return createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.6)", padding: "20px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "white", padding: "24px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-inter), sans-serif", letterSpacing: "1px" }}>LOADING...</div>
          <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "4px", fontWeight: 600 }}>Fetching receipt items</div>
        </div>
      </div>,
      document.body
    );
  }

  const dt = new Date(bill.createdAt);
  const dateStr = dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const format = (num: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  const ps = typeof business?.printSettings === "string" ? JSON.parse(business.printSettings) : (business?.printSettings || {});

  const addressParts = [business?.businessAddress, business?.district, business?.state, business?.pinCode].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : "";

  const UPI_ID = business?.upi || "";
  const UPI_NAME = business?.businessName || "Store";
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(bill.total).toFixed(2)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

  // GST Calculation - Fixed for Historical Accuracy
  const rawSubtotal = (bill.items || []).reduce((sum: number, item: any) => sum + (Number(item.qty || item.quantity || 0) * Number(item.rate || item.price || 0)), 0);
  // A bill only genuinely has tax if tax was computed and saved (> 0)
  const hasSnapshotTax = bill.tax > 0 || bill.deliveryGst > 0 || bill.packagingGst > 0;
  const taxActive = hasSnapshotTax && bill.isTaxEnabled !== false;
  const perProductEnabled = true;
  const globalRate = 0;
  
  // Use rawSubtotal (Gross) instead of bill.subtotal (Taxable) to calculate discount ratio
  const discountRatio = rawSubtotal > 0 ? ((rawSubtotal - (bill.discountAmount || 0)) / rawSubtotal) : 1;

  const taxGroups = (bill.items || []).reduce((acc: any, item: any) => {
    let rate = 0;
    // item.gst is explicitly saved by CheckoutClient as a snapshot!
    if (taxActive && item.gst !== undefined && item.gst !== null) {
      rate = item.gst;
    } else if (taxActive && perProductEnabled && item.gst !== undefined && item.gst !== null) {
      rate = item.gst;
    } else if (taxActive) {
      rate = globalRate;
    }
    const qty = Number(item.qty || item.quantity || 0);
    const itemRate = Number(item.rate || item.price || 0);
    const gross = (qty * itemRate) * discountRatio;
    let taxable = gross;
    let gst = 0;
    let isInclusive = item.taxStatus === "With Tax";

    let splitCgst = 0;
    
    if (isInclusive) {
      const exactGst = gross - (gross / (1 + rate / 100));
      splitCgst = Math.round(exactGst * 50) / 100;
      gst = splitCgst * 2;
      taxable = gross - gst;
    } else {
      const exactGst = (gross * rate) / 100;
      splitCgst = Math.round(exactGst * 50) / 100;
      gst = splitCgst * 2;
      taxable = gross;
    }
    
    if (!acc[rate]) acc[rate] = { rate, taxable: 0, cgst: 0, sgst: 0 };
    acc[rate].taxable += taxable;
    acc[rate].cgst += splitCgst;
    acc[rate].sgst += splitCgst;
    return acc;
  }, {});
  let taxBreakup = Object.values(taxGroups).filter((g: any) => g.cgst > 0 || g.sgst > 0);
  
  // Robust fallback for historical bills where GST rate was not saved explicitly in items
  if (taxBreakup.length === 0 && bill.tax > 0) {
    const assumedRate = Math.round((bill.tax / bill.subtotal) * 100);
    taxBreakup.push({
      rate: assumedRate,
      taxable: bill.subtotal,
      cgst: bill.tax / 2,
      sgst: bill.tax / 2
    });
  }

  const totalTaxable: number = taxBreakup.reduce((sum: number, g: any) => sum + g.taxable, 0);

  const handleWhatsApp = async () => {
    const phone = formatWhatsAppNumber(bill.customerPhone);
    const origin = window.location.origin;
    const pdfUrl = `${origin}/api/bill-manager/${bill.id}/pdf${bill.clerkUserId ? `?clerkId=${bill.clerkUserId}` : ""}`;
    const restaurantName = business?.businessName || "Kravy POS";
    const message = encodeURIComponent(
      "🙏 *Thank you for shopping with us!*\n\n" +
      `Hello *${bill.customerName || "Customer"}*,\n\n` +
      `Here is your invoice from *${restaurantName}*:\n\n` +
      "🧾 *Bill No:* " + bill.billNumber + "\n" +
      "💰 *Bill Amount:* Rs. " + bill.total + "\n\n" +
      "📄 *Download Invoice:*\n" + pdfUrl + "\n\n" +
      "We look forward to serving you again! 😊"
    );
    window.open(phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`, "_blank");
  };

  const handlePrintPdf = async () => {
    // Redirect to standalone view for direct thermal printing
    window.location.href = `/dashboard/billing/${bill.id}`;
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", justifyContent: "flex-end", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={onClose} />
      
      <style>{`
        @keyframes slideInRightPreview {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .previewPanelAnim {
          animation: slideInRightPreview 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div 
        className="previewPanelAnim"
        style={{ position: "relative", zIndex: 2, background: "#F1F5F9", width: "100%", maxWidth: "460px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "-10px 0 40px rgba(0,0,0,0.25)" }}
      >
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "white", borderBottom: "1px solid #E2E8F0" }}>
           <div>
             <div style={{ fontSize: "1.15rem", fontWeight: 950, color: "#0F172A" }}>Bill Preview</div>
             <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px" }}>Check Before Printing</div>
           </div>
           <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
             <button onClick={() => setShowJson(!showJson)} style={{ padding: "6px 12px", borderRadius: "8px", background: showJson ? "#6366F1" : "#EEF2FF", color: showJson ? "white" : "#6366F1", border: "none", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
               {showJson ? "Hide JSON" : "Show JSON"}
             </button>
             <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#FEE2E2", color: "#EF4444", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
               <X size={18} />
             </button>
           </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "32px 24px 64px 24px", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", background: "#E2E8F0", flex: 1 }}>
           
           {showJson ? (
             <div style={{ width: "100%", maxWidth: "460px", background: "#0F172A", padding: "16px", borderRadius: "12px", color: "#38BDF8", fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto", position: "relative" }}>
               <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(bill, null, 2)); toast.success("JSON copied to clipboard!"); }} style={{ position: "absolute", top: "12px", right: "12px", padding: "6px 10px", background: "#1E293B", color: "white", borderRadius: "6px", border: "none", fontSize: "0.65rem", cursor: "pointer", fontWeight: "bold", zIndex: 10 }}>Copy</button>
               {fetchUrl && (
                 <div style={{ marginBottom: "16px", padding: "8px", background: "#1E293B", borderRadius: "6px", color: "#94A3B8", wordBreak: "break-all" }}>
                   <div style={{ fontWeight: "bold", color: "#F8FAFC", marginBottom: "4px" }}>Fetch URL:</div>
                   {fetchUrl}
                 </div>
               )}
               <pre style={{ margin: 0, paddingBottom: "20px" }}>{JSON.stringify(bill, null, 2)}</pre>
             </div>
           ) : (
           <div style={{ background: "white", width: "100%", maxWidth: "340px", padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", fontFamily: "var(--font-inter), sans-serif", color: "black", flexShrink: 0 }}>
              {/* Exact Receipt Paper Match */}
              
              {/* Logo & Header */}
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                 <div style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "2px", letterSpacing: "-0.5px" }}>{business?.businessName || "Kravy POS"}</div>
                 <div style={{ fontSize: "0.8rem", fontWeight: 700, maxWidth: "90%", margin: "0 auto" }}>{fullAddress}</div>
              </div>

              <div style={{ borderTop: "1.5px dashed black", margin: "8px 0" }} />
              <div style={{ textAlign: "center", fontSize: "0.8rem", fontWeight: 800 }}>GSTIN: {business?.gstNumber || "NOT PROVIDED"}</div>
              <div style={{ borderTop: "1.5px dashed black", margin: "8px 0" }} />

              <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 800, lineHeight: 1.4, marginBottom: "12px" }}>
                 <div>Bill No: {bill.billNumber}</div>
                 <div>Date: {dateStr}, {timeStr}</div>
                 {bill.tokenNumber ? <div>Token No: {bill.tokenNumber}</div> : null}
                 {bill.kotNumbers && bill.kotNumbers.length > 0 ? <div>KOT No: {bill.kotNumbers.join(", ")}</div> : null}
                 {bill.customerName ? <div>Customer: {bill.customerName}</div> : null}
                 {bill.customerPhone ? <div>Phone: {bill.customerPhone}</div> : null}
              </div>

              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <span style={{ border: "1.5px solid black", padding: "4px 12px", fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase" }}>
                  TYPE: {bill.tableName || "POS"}
                </span>
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "12px 0" }} />
              
              {/* Items Header */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase" }}>
                <span>ITEM DESCRIPTION</span>
                <span>TOTAL</span>
              </div>
              <div style={{ display: "flex", overflow: "hidden", fontSize: "0.8rem", fontWeight: 900, letterSpacing: "2px", marginBottom: "8px" }}>
                ================================================
              </div>

              {/* Items List */}
              <div style={{ marginBottom: "12px" }}>
                 {bill.items?.map((it: any, i: number) => {
                   const q = Number(it.qty || it.quantity || 0);
                   const r = Number(it.rate || it.price || 0);
                   let itemGst = perProductEnabled && it.gst !== undefined && it.gst !== null ? it.gst : (taxActive ? globalRate : 0);
                   
                   // Fallback visual fix for historical items
                   if (itemGst === 0 && bill.tax > 0) {
                     itemGst = Math.round((bill.tax / bill.subtotal) * 100);
                   }

                   return (
                     <div key={i} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 900 }}>
                           <span>{it.name}</span>
                           <span>{sym}{format(q * r)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                           <span>{q} x {sym}{format(r)}</span>
                           <span>| GST: {itemGst}%</span>
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "12px 0 8px 0" }} />

              {/* Subtotals */}
              <div style={{ fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.6 }}>
                 <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal</span>
                    <span>{sym}{format(rawSubtotal || bill.total)}</span>
                 </div>
                 {(bill.discountAmount > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Discount</span>
                      <span>-{sym}{format(bill.discountAmount)}</span>
                   </div>
                 )}
                 {(bill.deliveryCharges > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Delivery Charge</span>
                      <span>{sym}{format(bill.deliveryCharges)}</span>
                   </div>
                 )}
                 {(bill.packagingCharges > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Packaging Charge</span>
                      <span>{sym}{format(bill.packagingCharges)}</span>
                   </div>
                 )}
                 {(bill.serviceCharge > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Service Charge</span>
                      <span>{sym}{format(bill.serviceCharge)}</span>
                   </div>
                 )}
                 {(bill.tax > 0) && (
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Taxable Amt</span>
                      <span>{sym}{format(totalTaxable)}</span>
                   </div>
                 )}
                 {(bill.tax > 0) && (() => {
                      const totalCGST: number = taxBreakup.reduce((sum: number, g: any) => sum + (g.cgst || 0), 0);
                      const totalSGST: number = taxBreakup.reduce((sum: number, g: any) => sum + (g.sgst || 0), 0);
                      const totalIGST: number = taxBreakup.reduce((sum: number, g: any) => sum + (g.igst || 0), 0);
                      if (totalCGST > 0 || totalSGST > 0) {
                        return (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>CGST{taxBreakup.length === 1 ? ` (${(taxBreakup[0] as any).rate / 2}%)` : ''}</span><span>{sym}{format(totalCGST)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>SGST{taxBreakup.length === 1 ? ` (${(taxBreakup[0] as any).rate / 2}%)` : ''}</span><span>{sym}{format(totalSGST)}</span></div>
                          </>
                        );
                      } else if (totalIGST > 0) {
                        return <div style={{ display: "flex", justifyContent: "space-between" }}><span>IGST{taxBreakup.length === 1 ? ` (${(taxBreakup[0] as any).rate}%)` : ''}</span><span>{sym}{format(totalIGST)}</span></div>;
                      }
                      return <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total Tax</span><span>{sym}{format(bill.tax)}</span></div>;
                 })()}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />
              <div style={{ borderTop: "4px solid black", margin: "8px 0" }} />
              
              {/* Grand Total */}
              {(() => {
                const finalTotalNum = Number(bill.total);
                const roundedTotal = Math.round(finalTotalNum);
                const roundOff = roundedTotal - finalTotalNum;
                return (
                  <>
                    {Math.abs(roundOff) > 0.001 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", fontSize: "0.9rem", fontWeight: 900 }}>
                        <span>ROUND OFF</span>
                        <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0" }}>
                       <span style={{ fontSize: "1.2rem", fontWeight: 950, textTransform: "uppercase" }}>GRAND TOTAL</span>
                       <span style={{ fontSize: "1.4rem", fontWeight: 950 }}>{sym}{format(roundedTotal)}</span>
                    </div>
                  </>
                );
              })()}

              <div style={{ borderTop: "4px solid black", margin: "8px 0" }} />

              {/* GST Tax Breakup */}
              {ps.showTaxBreakup !== false && taxBreakup.length > 0 && (
                <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "4px" }}>GST TAX BREAKUP</div>
                  <div style={{ borderTop: "1.5px dashed black", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 900 }}>
                    <span style={{ width: "25%" }}>Rate</span>
                    <span style={{ width: "35%", textAlign: "right" }}>Taxable</span>
                    <span style={{ width: "20%", textAlign: "right" }}>CGST</span>
                    <span style={{ width: "20%", textAlign: "right" }}>SGST</span>
                  </div>
                  <div style={{ borderTop: "3px solid black", margin: "4px 0" }} />
                  {taxBreakup.map((g: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 800 }}>
                      <span style={{ width: "25%" }}>{g.rate}%</span>
                      <span style={{ width: "35%", textAlign: "right" }}>{format(g.taxable)}</span>
                      <span style={{ width: "20%", textAlign: "right" }}>{format(g.cgst)}</span>
                      <span style={{ width: "20%", textAlign: "right" }}>{format(g.sgst)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "3px solid black", margin: "4px 0" }} />
                </div>
              )}

              {/* Amount in words */}
              <div style={{ fontSize: "0.8rem", fontStyle: "italic", fontWeight: 800, marginTop: "12px", marginBottom: "16px", lineHeight: 1.3 }}>
                Amount in Words: {numberToWords(Math.round(bill.total))}
              </div>

              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />
              
              {/* Payment Info */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 900 }}>
                <span>Payment: {bill.paymentMode || "Cash"}</span>
                <span>Status: {bill.paymentStatus}</span>
              </div>
              
              <div style={{ borderTop: "2px dashed black", margin: "8px 0" }} />

              {/* QR Code */}
              {business?.upi && business?.upiQrEnabled !== false && (
                <div style={{ textAlign: "center", margin: "24px 0" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 950, textTransform: "uppercase", marginBottom: "12px" }}>SCAN & PAY</div>
                  <img src={qrUrl} alt="UPI QR" style={{ width: "160px", height: "160px", margin: "0 auto 12px auto", mixBlendMode: "multiply", filter: "contrast(200%) grayscale(100%)" }} />
                  <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>UPI: {business.upi}</div>
                </div>
              )}

              {business?.upi && business?.upiQrEnabled !== false && (
                <div style={{ borderTop: "2px dashed black", margin: "16px 0" }} />
              )}

              {/* Footer Elements */}
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                 <div style={{ fontSize: "1.1rem", fontWeight: 950, textTransform: "uppercase", marginBottom: "12px", letterSpacing: "1px" }}>
                   THANK YOU 🙏 VISIT AGAIN
                 </div>
                 <div style={{ fontSize: "0.7rem", fontWeight: 800 }}>Software by Kravy</div>
                 <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: 800, letterSpacing: "4px", marginTop: "4px" }}>
                   * * * END OF BILL * * *
                 </div>
              </div>
           </div>
           )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "16px 24px", background: "white", borderTop: "1px solid #E2E8F0", display: "flex", gap: "12px" }}>
           <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "white", fontWeight: 800, color: "#475569", cursor: "pointer", fontSize: "0.85rem", transition: "0.2s" }} className="hover:bg-slate-50 hover:text-red-500 hover:border-red-200">Close</button>
           <button onClick={handlePrintPdf} style={{ flex: 1.5, padding: "10px", borderRadius: "10px", border: "1px solid #F97316", background: "#FFF7ED", fontWeight: 800, color: "#EA580C", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "0.2s" }} className="hover:bg-orange-100 hover:border-orange-500"><Printer size={16} /> Print</button>
           <button onClick={handleWhatsApp} style={{ flex: 1.5, padding: "10px", borderRadius: "10px", border: "none", background: "#10B981", fontWeight: 800, color: "white", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }} className="hover:bg-emerald-500"><Smartphone size={16} /> WhatsApp</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Th = ({ label, isRight, color = "#9CA3AF", width }: any) => (
  <th style={{ padding: "16px 20px", textAlign: isRight ? "right" : "left", fontSize: "0.7rem", fontWeight: 900, color: color, letterSpacing: "1px", width }}>
    {label}
  </th>
);

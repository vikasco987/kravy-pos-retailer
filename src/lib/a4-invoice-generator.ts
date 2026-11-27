import jsPDF from "jspdf";

export const generateA4InvoicePDF = (bill: any, business: any) => {
  const cleanText = (str: string) => (str || "").replace(/[^\x20-\x7E]/g, "");

  const toWords = (num: number): string => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convert = (n: number, depth = 0): string => {
      if (depth > 10 || n <= 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100, depth + 1) : "");
      if (n < 100000) return convert(Math.floor(n / 1000), depth + 1) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000, depth + 1) : "");
      if (n < 10000000) return convert(Math.floor(n / 100000), depth + 1) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000, depth + 1) : "");
      return convert(Math.floor(n / 10000000), depth + 1) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000, depth + 1) : "");
    };

    if (isNaN(num) || !isFinite(num) || num === 0) return "ZERO RUPEES ONLY";
    const integerPart = Math.floor(Math.abs(num));
    const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
    let result = convert(integerPart) + " Rupees";
    if (decimalPart > 0) result += " and " + convert(decimalPart) + " Paise";
    return (result + " Only").toUpperCase();
  };

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ps = business?.printSettings || {};
  const isGSTInvoice = (ps.a4InvoiceType || "GST_TAX_INVOICE") === "GST_TAX_INVOICE";
  const hasTax = Number(bill.tax || 0) > 0;

  // 1. TOP HEADER
  if (business?.logoUrl && business.logoUrl.startsWith("data:")) {
    try {
      doc.addImage(business.logoUrl, "PNG", 10, 10, 28, 16);
    } catch (e) {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text(cleanText(business?.businessName || "Business Name"), 42, 15);

  if (business?.businessTagLine) {
    doc.setFontSize(10);
    doc.text(cleanText(business.businessTagLine), 42, 20.5);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const fullAddr = [business?.businessAddress, business?.district, business?.state, business?.pinCode].filter(Boolean).join(", ");
  const addrLines = doc.splitTextToSize(cleanText(fullAddr), 70);
  if (addrLines.length > 0) {
    doc.text(addrLines, 42, business?.businessTagLine ? 25.5 : 21);
  }

  // Right Side Info (Only real business data, no dummy fallbacks)
  const rightInfoX = pageWidth - 68;
  const colonX = pageWidth - 55;
  const valueX = pageWidth - 52;
  let hy = 15;
  const drawHeaderMeta = (label: string, val: string) => {
    if (!val) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(label, rightInfoX, hy);
    doc.text(":", colonX, hy);
    doc.setFont("helvetica", "normal");
    doc.text(cleanText(val).substring(0, 32), valueX, hy);
    hy += 4.8;
  };

  drawHeaderMeta("Name", ps.a4OwnerName || business?.ownerName || business?.contactPersonName || "");
  drawHeaderMeta("Phone", business?.phone || business?.contactPersonPhone || business?.businessPhone || "");
  drawHeaderMeta("Email", business?.email || business?.contactPersonEmail || "");
  drawHeaderMeta("Website", ps.a4Website || business?.website || "");

  // 2. TAX INVOICE BAR (3 equal parts with blue border #3b82f6)
  const barY = 38;
  const boxWidth = (pageWidth - 20) / 3;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.4);
  doc.rect(10, barY, pageWidth - 20, 10);
  doc.line(10 + boxWidth, barY, 10 + boxWidth, barY + 10);
  doc.line(10 + 2 * boxWidth, barY, 10 + 2 * boxWidth, barY + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const bizGstin = business?.gstNumber || business?.gstin || "";
  doc.text(bizGstin ? `GSTIN : ${bizGstin}` : (business?.phone ? `Ph : ${business.phone}` : "INVOICE"), 12, barY + 6.5);
  doc.setFontSize(13);
  doc.setTextColor(59, 130, 246);
  doc.text(isGSTInvoice && hasTax ? "TAX INVOICE" : "INVOICE", 10 + boxWidth + boxWidth / 2, barY + 7, { align: "center" });
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("ORIGINAL FOR RECIPIENT", pageWidth - 12, barY + 6.5, { align: "right" });

  // 3. DETAILS BOX (2 parts)
  const detailsY = barY + 10;
  doc.setDrawColor(59, 130, 246);
  doc.rect(10, detailsY, pageWidth - 20, 44);
  doc.line(pageWidth / 2, detailsY, pageWidth / 2, detailsY + 44);

  doc.setFillColor(240, 248, 255);
  doc.rect(10.2, detailsY + 0.2, pageWidth / 2 - 10.2, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Customer Detail", pageWidth / 4 + 5, detailsY + 4.5, { align: "center" });

  let cY = detailsY + 11;
  const row = (l: string, v: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(l, 12, y);
    doc.setFont("helvetica", "normal");
    const vLines = doc.splitTextToSize(cleanText(v || "-"), 65);
    doc.text(vLines, 30, y);
    return y + Math.max(1, vLines.length) * 4;
  };

  const custName = bill.customerName || bill.party?.name || "Walk-in Guest";
  const custPhone = bill.customerPhone || bill.party?.phone || "-";
  const custAddr = bill.customerAddress || bill.party?.address || "-";
  const custGstin = bill.buyerGSTIN || bill.party?.gstin || "-";

  cY = row("M/S", custName, cY);
  cY = row("Address", custAddr, cY);
  cY = row("Phone", custPhone, cY);
  cY = row("GSTIN", custGstin, cY);

  let rY = detailsY + 10;
  const info = (l: string, v: string, y: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(l, pageWidth / 2 + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(cleanText(v), pageWidth - 15, y, { align: "right" });
    return y + 6.5;
  };

  const billDateStr = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  rY = info("Invoice No.", bill.billNumber || "-", rY);
  rY = info("Invoice Date", billDateStr, rY);
  if (bill.tableName) rY = info("Table / Ref", bill.tableName, rY);
  if (bill.tokenNumber) rY = info("Token No.", `#${bill.tokenNumber}`, rY);
  rY = info("Payment Mode", (bill.paymentMode || "CASH").toUpperCase(), rY);
  rY = info("Status", (bill.paymentStatus || "PAID").toUpperCase(), rY);

  // 4. ITEMS TABLE
  let tableY = detailsY + 44;
  const drawTableHeader = (yPos: number) => {
    const tableH = 8;
    doc.setFillColor(240, 248, 255);
    doc.rect(10, yPos, pageWidth - 20, tableH, "F");
    doc.rect(10, yPos, pageWidth - 20, tableH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    const colX = [10, 18, 93, 111, 126, 148, 170, pageWidth - 10];
    colX.slice(1, -1).forEach(x => doc.line(x, yPos, x, yPos + tableH));

    doc.text("Sr.", 14, yPos + 5.5, { align: "center" });
    doc.text("Name of Product / Service", 20, yPos + 5.5);
    doc.text("HSN", 102, yPos + 5.5, { align: "center" });
    doc.text("Qty", 118, yPos + 5.5, { align: "center" });
    doc.text("Rate", 145, yPos + 5.5, { align: "right" });
    doc.text(isGSTInvoice && hasTax ? "Taxable" : "Amount", 167, yPos + 5.5, { align: "right" });
    doc.text("Total", pageWidth - 13, yPos + 5.5, { align: "right" });
    return { nextY: yPos + tableH, colX };
  };

  let { nextY: rowY, colX } = drawTableHeader(tableY);
  const items = Array.isArray(bill.items) ? bill.items : [];
  let pageCount = 1;

  items.forEach((it: any, idx: number) => {
    const safeName = cleanText(it.name || "Item");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const nameLines = doc.splitTextToSize(safeName, 72);
    const itemH = Math.max(7, nameLines.length * 4 + 3);

    if (rowY + itemH > pageHeight - 25) {
      doc.addPage();
      pageCount++;
      const headerRes = drawTableHeader(15);
      rowY = headerRes.nextY;
    }

    const qty = Number(it.quantity || it.qty || 1);
    const rate = Number(it.price || it.rate || 0);
    const itemTotal = qty * rate;

    doc.rect(10, rowY, pageWidth - 20, itemH);
    colX.slice(1, -1).forEach(x => doc.line(x, rowY, x, rowY + itemH));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(String(idx + 1), 14, rowY + 4.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(nameLines, 20, rowY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(it.hsn || it.hsnCode || "-", 102, rowY + 4.5, { align: "center" });
    doc.text(qty.toFixed(2), 118, rowY + 4.5, { align: "center" });
    doc.text(rate.toFixed(2), 145, rowY + 4.5, { align: "right" });
    doc.text(itemTotal.toFixed(2), 167, rowY + 4.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(itemTotal.toFixed(2), pageWidth - 13, rowY + 4.5, { align: "right" });

    rowY += itemH;
  });

  // Smart Dynamic Table Spacing: restore spacious A4 proportions for short invoices (1-4 items)
  const minTableBodyBottom = tableY + 8 + 56;
  if (pageCount === 1 && items.length < 5 && rowY < minTableBodyBottom) {
    const fillerH = minTableBodyBottom - rowY;
    doc.rect(10, rowY, pageWidth - 20, fillerH);
    colX.slice(1, -1).forEach(x => doc.line(x, rowY, x, minTableBodyBottom));
    rowY = minTableBodyBottom;
  }

  // Ensure enough space for Summary + Bank + Terms (~98mm)
  if (rowY > pageHeight - 102) {
    doc.addPage();
    rowY = 15;
  }

  // 5. SUMMARY BOX
  const summaryY = rowY;
  const totalTax = Number(bill.tax || 0);
  const discountAmt = Number(bill.discountAmt || bill.discount || 0);
  const deliveryCharge = Number(bill.deliveryCharges || 0);
  const packagingCharge = Number(bill.packagingCharges || 0);
  const serviceCharge = Number(bill.serviceCharge || 0);
  const balanceDue = Number(bill.balanceDue || 0);
  const amountPaid = Number(bill.amountPaid || 0);
  const rawTotal = Number(bill.total || 0);
  const roundedTotal = Math.round(rawTotal);
  const roundOff = roundedTotal - rawTotal;

  let summaryRowsCount = 2; // Taxable + Grand Total
  if (discountAmt > 0) summaryRowsCount++;
  if (totalTax > 0) summaryRowsCount += 3; // CGST, SGST, Total Tax
  if (deliveryCharge > 0) summaryRowsCount++;
  if (packagingCharge > 0) summaryRowsCount++;
  if (serviceCharge > 0) summaryRowsCount++;
  if (Math.abs(roundOff) > 0.001) summaryRowsCount++;
  if (balanceDue > 0) summaryRowsCount += 2;

  const summaryH = Math.max(32, summaryRowsCount * 6 + 6);
  doc.rect(10, summaryY, pageWidth - 20, summaryH);
  doc.line(pageWidth / 2 + 15, summaryY, pageWidth / 2 + 15, summaryY + summaryH);

  doc.setFillColor(240, 248, 255);
  doc.rect(10.2, summaryY + 0.2, pageWidth / 2 + 15 - 10.4, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Total in words", (pageWidth / 2 + 15) / 2 + 5, summaryY + 4, { align: "center" });
  doc.line(10, summaryY + 5.7, pageWidth / 2 + 15, summaryY + 5.7);

  const wordsText = toWords(roundedTotal);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const splitWords = doc.splitTextToSize(wordsText, pageWidth / 2 + 5);
  doc.text(splitWords, (pageWidth / 2 + 15) / 2 + 5, summaryY + 14, { align: "center" });

  let sy = summaryY + 4.5;
  const sRow = (l: string, v: string, y: number, b = false) => {
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.setFontSize(7.5);
    doc.text(l, pageWidth / 2 + 17, y);
    doc.text(v, pageWidth - 13, y, { align: "right" });
    doc.line(pageWidth / 2 + 15, y + 2, pageWidth - 10, y + 2);
    return y + 6;
  };

  sy = sRow("Subtotal / Taxable", Number(bill.subtotal || rawTotal).toFixed(2), sy, true);
  if (discountAmt > 0) sy = sRow("Discount", `-${discountAmt.toFixed(2)}`, sy, true);
  if (totalTax > 0) {
    sy = sRow("Add : CGST", (totalTax / 2).toFixed(2), sy, false);
    sy = sRow("Add : SGST", (totalTax / 2).toFixed(2), sy, false);
    sy = sRow("Total Tax", totalTax.toFixed(2), sy, true);
  }
  if (deliveryCharge > 0) sy = sRow("Delivery Charge", deliveryCharge.toFixed(2), sy, false);
  if (packagingCharge > 0) sy = sRow("Packaging Charge", packagingCharge.toFixed(2), sy, false);
  if (serviceCharge > 0) sy = sRow("Service Charge", serviceCharge.toFixed(2), sy, false);
  if (Math.abs(roundOff) > 0.001) sy = sRow("Round Off", `${roundOff > 0 ? "+" : ""}${roundOff.toFixed(2)}`, sy, false);

  doc.setFillColor(240, 248, 255);
  doc.rect(pageWidth / 2 + 15.2, sy - 4, pageWidth - (pageWidth / 2 + 15) - 10.4, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  sy = sRow("Total Amount After Tax", `Rs. ${roundedTotal.toFixed(2)}`, sy + 1, true);

  if (balanceDue > 0) {
    sy = sRow("Amount Paid", `Rs. ${amountPaid.toFixed(2)}`, sy, false);
    sy = sRow("Balance Due", `Rs. ${balanceDue.toFixed(2)}`, sy, true);
  }

  // 6. BANK & SIGNATORY BOX (Only real configured bank details)
  const bankY = summaryY + summaryH;
  const bankH = 40;
  doc.rect(10, bankY, pageWidth - 20, bankH);
  doc.line(pageWidth / 2 + 15, bankY, pageWidth / 2 + 15, bankY + bankH);

  doc.setFillColor(240, 248, 255);
  doc.rect(10.2, bankY + 0.2, pageWidth / 2 + 15 - 10.4, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Bank Details", (pageWidth / 2 + 15) / 2 + 5, bankY + 4, { align: "center" });
  doc.line(10, bankY + 5.7, pageWidth / 2 + 15, bankY + 5.7);

  const bRow = (l: string, v: string, y: number) => {
    if (!v) return y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(l, 12, y);
    doc.setFont("helvetica", "normal");
    doc.text(cleanText(v), 40, y);
    return y + 5.2;
  };

  let by = bankY + 10.5;
  by = bRow("Bank Name", ps.a4BankName || business?.bankName || "", by);
  by = bRow("Acc. Name", ps.a4AccountName || business?.accountName || business?.businessName || "", by);
  by = bRow("Acc. Number", ps.a4AccountNumber || business?.accountNumber || business?.bankAccount || "", by);
  by = bRow("IFSC", ps.a4IfscCode || business?.ifscCode || business?.bankIfsc || "", by);
  if (business?.bankDetails && !ps.a4BankName && !business?.bankName) {
    const bdLines = doc.splitTextToSize(cleanText(business.bankDetails), 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(bdLines.slice(0, 3), 12, by);
    by += bdLines.slice(0, 3).length * 4;
  }
  if (business?.upi) {
    bRow("UPI ID", business.upi, by);
  }

  const signX = pageWidth / 2 + 15 + (pageWidth - (pageWidth / 2 + 15)) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Certified that the particulars given above are true and correct.", signX, bankY + 8, { align: "center" });
  doc.setFontSize(8.5);
  doc.text(`For ${cleanText(business?.businessName || "Business")}`, signX, bankY + 14, { align: "center" });

  if (business?.signatureUrl && business.signatureUrl.startsWith("data:")) {
    try {
      doc.addImage(business.signatureUrl, "PNG", signX - 15, bankY + 16, 30, 12);
    } catch (e) {}
  }

  doc.line(pageWidth / 2 + 25, bankY + 32, pageWidth - 20, bankY + 32);
  doc.setFontSize(7.5);
  doc.text("Authorised Signatory", signX, bankY + 36, { align: "center" });

  // 7. TERMS BOX
  const termsY = bankY + bankH;
  const termsH = 16;
  doc.rect(10, termsY, pageWidth - 20, termsH);
  doc.setFillColor(240, 248, 255);
  doc.rect(10.2, termsY + 0.2, pageWidth - 20.4, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Terms and Conditions", pageWidth / 2, termsY + 3.5, { align: "center" });
  doc.line(10, termsY + 4.7, pageWidth - 10, termsY + 4.7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const termsStr = cleanText(ps.a4Terms || business?.terms || "1. Payment is non-refundable. 2. Goods once sold will not be taken back or exchanged.");
  const termsLines = doc.splitTextToSize(termsStr, pageWidth - 24);
  doc.text(termsLines.slice(0, 2), 12, termsY + 8.5);

  const fileName = `Invoice_${bill.billNumber || "Bill"}.pdf`;
  doc.save(fileName);
};

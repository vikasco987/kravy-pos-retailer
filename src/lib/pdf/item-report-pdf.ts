import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ItemReportExportRow {
  name: string;
  category?: string;
  totalSold: number;
  totalRevenue: number;
}

interface GenerateReportPDFOptions {
  title?: string;
  businessName?: string;
  dateRangeStr?: string;
  items: ItemReportExportRow[];
  grandTotalRevenue: number;
  grandTotalSold: number;
  currencySymbol?: string;
}

export async function generateItemReportPDF({
  title = "Item Reports",
  businessName = "Kravy POS",
  dateRangeStr = new Date().toLocaleDateString("en-IN"),
  items,
  grandTotalRevenue,
  grandTotalSold,
  currencySymbol = "Rs.",
}: GenerateReportPDFOptions): Promise<Uint8Array> {
  // WinAnsi font encoding cannot represent the unicode Rupee symbol "₹" (0x20B9)
  // Clean currency string to safe ASCII representation
  const cleanCurrency = (!currencySymbol || currencySymbol === "₹" || currencySymbol.includes("₹"))
    ? "Rs."
    : currencySymbol.replace(/[^\x00-\x7F]/g, "").trim() || "Rs.";

  // Sanitize any non-ASCII characters from strings to prevent WinAnsi encode error
  const safeAscii = (text: string = "") => text.replace(/[^\x00-\x7F]/g, "").trim();
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 Portrait
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const drawHeader = (pageNum: number) => {
    // Top Bar Background
    page.drawRectangle({
      x: margin,
      y: currentY - 50,
      width: contentWidth,
      height: 50,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.88, 0.90, 0.95),
      borderWidth: 1,
    });

    // Business Name & Title
    page.drawText(safeAscii(title).toUpperCase(), {
      x: margin + 14,
      y: currentY - 24,
      size: 15,
      font: fontBold,
      color: rgb(0.12, 0.15, 0.28),
    });

    page.drawText(`${safeAscii(businessName)}  |  Period: ${safeAscii(dateRangeStr)}`, {
      x: margin + 14,
      y: currentY - 40,
      size: 9,
      font: fontRegular,
      color: rgb(0.42, 0.45, 0.55),
    });

    const pageStr = `Page ${pageNum}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 9);
    page.drawText(pageStr, {
      x: pageWidth - margin - 14 - pageStrWidth,
      y: currentY - 32,
      size: 9,
      font: fontRegular,
      color: rgb(0.42, 0.45, 0.55),
    });

    currentY -= 65;

    // Table Header Row
    page.drawRectangle({
      x: margin,
      y: currentY - 24,
      width: contentWidth,
      height: 24,
      color: rgb(0.2, 0.25, 0.4),
    });

    // Columns: # (25), Item Name (240), Category (90), Qty (60), Amount (80)
    page.drawText("#", { x: margin + 8, y: currentY - 16, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("ITEM NAME", { x: margin + 30, y: currentY - 16, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("CATEGORY", { x: margin + 280, y: currentY - 16, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("QTY SOLD", { x: margin + 380, y: currentY - 16, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("AMOUNT", { x: margin + 455, y: currentY - 16, size: 9, font: fontBold, color: rgb(1, 1, 1) });

    currentY -= 24;
  };

  let pageNumber = 1;
  drawHeader(pageNumber);

  const rowHeight = 22;

  items.forEach((item, index) => {
    // Check if new page needed
    if (currentY - rowHeight < margin + 40) {
      page = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
      pageNumber++;
      drawHeader(pageNumber);
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: currentY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    // Border line below row
    page.drawLine({
      start: { x: margin, y: currentY - rowHeight },
      end: { x: margin + contentWidth, y: currentY - rowHeight },
      thickness: 0.5,
      color: rgb(0.9, 0.92, 0.94),
    });

    const sr = String(index + 1);
    page.drawText(sr, {
      x: margin + 8,
      y: currentY - 15,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Truncate name if too long
    let safeName = safeAscii(item.name || "Unnamed Item");
    if (safeName.length > 38) safeName = safeName.slice(0, 36) + "..";
    page.drawText(safeName, {
      x: margin + 30,
      y: currentY - 15,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    let safeCat = safeAscii(item.category || "-");
    if (safeCat.length > 14) safeCat = safeCat.slice(0, 13) + "..";
    page.drawText(safeCat, {
      x: margin + 280,
      y: currentY - 15,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.5),
    });

    const qtyStr = String(item.totalSold);
    page.drawText(qtyStr, {
      x: margin + 380,
      y: currentY - 15,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    const amtStr = `${cleanCurrency} ${new Intl.NumberFormat("en-IN").format(Math.round(item.totalRevenue))}`;
    page.drawText(amtStr, {
      x: margin + 455,
      y: currentY - 15,
      size: 9,
      font: fontBold,
      color: rgb(0.08, 0.45, 0.25),
    });

    currentY -= rowHeight;
  });

  // Grand Total Summary Box
  if (currentY - 40 < margin) {
    page = doc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
    pageNumber++;
    drawHeader(pageNumber);
  }

  currentY -= 8;
  page.drawRectangle({
    x: margin,
    y: currentY - 28,
    width: contentWidth,
    height: 28,
    color: rgb(0.93, 0.96, 1.0),
    borderColor: rgb(0.75, 0.82, 0.95),
    borderWidth: 1,
  });

  page.drawText("GRAND TOTAL", {
    x: margin + 14,
    y: currentY - 18,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.5),
  });

  page.drawText(`Units Sold: ${grandTotalSold}`, {
    x: margin + 320,
    y: currentY - 18,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.5),
  });

  const totalRevStr = `${cleanCurrency} ${new Intl.NumberFormat("en-IN").format(Math.round(grandTotalRevenue))}`;
  page.drawText(totalRevStr, {
    x: margin + 445,
    y: currentY - 18,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.5, 0.2),
  });

  return await doc.save();
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ExternalLink, 
  Printer, 
  Share2, 
  Download, 
  X, 
  FileSpreadsheet
} from "lucide-react";
import { toast } from "react-hot-toast";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface UniversalExportColumn {
  header: string;
  accessor: string | ((row: any, index: number) => any);
  width?: number; // Approximate column width for PDF
  align?: "left" | "right" | "center";
}

interface UniversalReportExportOptionsProps {
  title: string;
  data: any[];
  columns: UniversalExportColumn[];
  dateRangeStr?: string;
  businessName?: string;
  currencySymbol?: string;
  fileNamePrefix?: string;
  summaryRows?: { label: string; value: string | number }[];
}

export default function UniversalReportExportOptions({
  title,
  data,
  columns,
  dateRangeStr = new Date().toLocaleDateString("en-IN"),
  businessName = "Kravy POS",
  currencySymbol = "₹",
  fileNamePrefix = "Report",
  summaryRows = [],
}: UniversalReportExportOptionsProps) {
  const [activeSheet, setActiveSheet] = useState<"none" | "pdf" | "excel">("none");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getSafeFileName = (ext: string) => {
    const safeDate = dateRangeStr.replace(/[^a-zA-Z0-9]/g, "_");
    return `${fileNamePrefix}_${safeDate}.${ext}`;
  };

  const getRowValue = (row: any, col: UniversalExportColumn, idx: number): string => {
    if (typeof col.accessor === "function") {
      const v = col.accessor(row, idx);
      return v === null || v === undefined ? "-" : String(v);
    }
    const v = row[col.accessor];
    return v === null || v === undefined ? "-" : String(v);
  };

  // Helper to generate Universal PDF Blob using pdf-lib
  const getPdfBlob = async (): Promise<Blob> => {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 Portrait
    const pageHeight = 841.89;
    const margin = 32;
    const contentWidth = pageWidth - margin * 2;

    let page = doc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    const safeAscii = (text: string = "") => {
      return String(text || "")
        .replace(/₹/g, "Rs.")
        .replace(/[^\x00-\x7F]/g, "")
        .trim();
    };

    const drawHeader = (pageNum: number) => {
      // Header Card
      page.drawRectangle({
        x: margin,
        y: currentY - 45,
        width: contentWidth,
        height: 45,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: rgb(0.88, 0.90, 0.95),
        borderWidth: 1,
      });

      page.drawText(safeAscii(title).toUpperCase(), {
        x: margin + 12,
        y: currentY - 20,
        size: 14,
        font: fontBold,
        color: rgb(0.12, 0.15, 0.28),
      });

      page.drawText(`${safeAscii(businessName)}  |  Period: ${safeAscii(dateRangeStr)}  |  Page ${pageNum}`, {
        x: margin + 12,
        y: currentY - 36,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.42, 0.45, 0.55),
      });

      currentY -= 58;

      // Table Header Row
      page.drawRectangle({
        x: margin,
        y: currentY - 22,
        width: contentWidth,
        height: 22,
        color: rgb(0.2, 0.25, 0.4),
      });

      let colX = margin + 8;
      const colWidth = (contentWidth - 16) / columns.length;

      columns.forEach((col) => {
        const w = col.width || colWidth;
        page.drawText(safeAscii(col.header).toUpperCase(), {
          x: colX,
          y: currentY - 15,
          size: 8,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        colX += w;
      });

      currentY -= 22;
    };

    let pageNumber = 1;
    drawHeader(pageNumber);

    const rowHeight = 20;
    const colWidthDefault = (contentWidth - 16) / columns.length;

    data.forEach((row, rIdx) => {
      if (currentY - rowHeight < margin + 40) {
        page = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
        pageNumber++;
        drawHeader(pageNumber);
      }

      if (rIdx % 2 === 0) {
        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.99),
        });
      }

      page.drawLine({
        start: { x: margin, y: currentY - rowHeight },
        end: { x: margin + contentWidth, y: currentY - rowHeight },
        thickness: 0.5,
        color: rgb(0.92, 0.93, 0.95),
      });

      let colX = margin + 8;
      columns.forEach((col) => {
        const w = col.width || colWidthDefault;
        let valStr = safeAscii(getRowValue(row, col, rIdx));
        if (valStr.length > 25) valStr = valStr.slice(0, 23) + "..";

        page.drawText(valStr, {
          x: colX,
          y: currentY - 14,
          size: 8,
          font: fontRegular,
          color: rgb(0.18, 0.18, 0.2),
        });
        colX += w;
      });

      currentY -= rowHeight;
    });

    // Summary Rows
    if (summaryRows.length > 0) {
      if (currentY - 30 < margin) {
        page = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
        pageNumber++;
        drawHeader(pageNumber);
      }

      currentY -= 8;
      page.drawRectangle({
        x: margin,
        y: currentY - 26,
        width: contentWidth,
        height: 26,
        color: rgb(0.93, 0.96, 1.0),
        borderColor: rgb(0.75, 0.82, 0.95),
        borderWidth: 1,
      });

      let sumX = margin + 14;
      summaryRows.forEach((item) => {
        const text = `${safeAscii(item.label)}: ${safeAscii(String(item.value))}`;
        page.drawText(text, {
          x: sumX,
          y: currentY - 17,
          size: 9.5,
          font: fontBold,
          color: rgb(0.1, 0.25, 0.55),
        });
        sumX += 160;
      });
    }

    const bytes = await doc.save();
    return new Blob([bytes.buffer as BlobPart], { type: "application/pdf" });
  };

  // Helper to generate Universal Excel Blob
  const getExcelBlob = async (): Promise<Blob> => {
    const XLSX = await import("xlsx");
    const exportData = data.map((row, idx) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.header] = getRowValue(row, col, idx);
      });
      return obj;
    });

    if (summaryRows.length > 0) {
      const summaryObj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        if (idx === 0) summaryObj[col.header] = "TOTAL";
        else {
          const match = summaryRows.find((s) => s.label.toLowerCase().includes(col.header.toLowerCase()));
          summaryObj[col.header] = match ? match.value : "";
        }
      });
      exportData.push(summaryObj);
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };

  // Handlers
  const handleOpenPdf = async () => {
    try {
      setLoadingAction("open-pdf");
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setActiveSheet("none");
    } catch (err: any) {
      toast.error("Could not open PDF: " + (err?.message || ""));
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrintPdf = async () => {
    try {
      setLoadingAction("print-pdf");
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.print();
        }
      };
      setActiveSheet("none");
    } catch (err: any) {
      toast.error("Could not print PDF");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSharePdf = async () => {
    try {
      setLoadingAction("share-pdf");
      const blob = await getPdfBlob();
      const file = new File([blob], getSafeFileName("pdf"), { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: `${title} (${dateRangeStr})`,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else {
        handleSavePdfToPhone();
        toast("Sharing not supported on this device. PDF saved to phone.", { icon: "📥" });
      }
      setActiveSheet("none");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Could not share PDF");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSavePdfToPhone = async () => {
    try {
      setLoadingAction("save-pdf");
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getSafeFileName("pdf");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF saved to phone! 📱");
      setActiveSheet("none");
    } catch (err: any) {
      toast.error("Could not save PDF: " + (err?.message || ""));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenExcel = async () => {
    handleExportExcel();
  };

  const handleShareExcel = async () => {
    try {
      setLoadingAction("share-excel");
      const blob = await getExcelBlob();
      const file = new File([blob], getSafeFileName("xlsx"), {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: `${title} Excel (${dateRangeStr})`,
          files: [file],
        });
        toast.success("Excel shared successfully!");
      } else {
        handleExportExcel();
        toast("Sharing not supported on this device. Excel saved.", { icon: "📊" });
      }
      setActiveSheet("none");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Could not share Excel");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoadingAction("export-excel");
      const blob = await getExcelBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getSafeFileName("xlsx");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel file exported! 📊");
      setActiveSheet("none");
    } catch (err: any) {
      toast.error("Could not export Excel");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      {/* ── Top Badges (PDF & XLS) ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSheet("pdf")}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] active:scale-95 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition-all uppercase tracking-tight"
          title="PDF Options"
        >
          Pdf
        </button>

        <button
          type="button"
          onClick={() => setActiveSheet("excel")}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] active:scale-95 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition-all uppercase tracking-tight"
          title="Excel Options"
        >
          xls
        </button>
      </div>

      {/* ── Bottom Sheet (Mounted via createPortal to document.body) ── */}
      {mounted && activeSheet !== "none" && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex flex-col justify-end pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setActiveSheet("none")}
          />

          {/* Floating 'X' Button on top of Drawer */}
          <div className="relative z-10 flex justify-center pb-3">
            <button
              type="button"
              onClick={() => setActiveSheet("none")}
              className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center shadow-xl hover:bg-neutral-900 active:scale-90 transition-all border border-white/20"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Sheet Drawer */}
          <div
            className="relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-[28px] p-6 pb-8 shadow-2xl border-t border-slate-100 dark:border-neutral-800 animate-in slide-in-from-bottom duration-200 max-w-lg mx-auto"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              {activeSheet === "pdf" ? "PDF Options" : "Excel Options"}
            </h3>

            {/* PDF Options */}
            {activeSheet === "pdf" && (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-800">
                <button
                  type="button"
                  onClick={handleOpenPdf}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <ExternalLink size={20} className="text-neutral-500 group-hover:text-indigo-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "open-pdf" ? "Opening PDF..." : "Open PDF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <Printer size={20} className="text-neutral-500 group-hover:text-indigo-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "print-pdf" ? "Preparing Print..." : "Print PDF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSharePdf}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <Share2 size={20} className="text-neutral-500 group-hover:text-indigo-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "share-pdf" ? "Sharing..." : "Share PDF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePdfToPhone}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-indigo-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <Download size={20} className="text-neutral-500 group-hover:text-indigo-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "save-pdf" ? "Saving..." : "Save PDF to Phone"}
                  </span>
                </button>
              </div>
            )}

            {/* Excel Options */}
            {activeSheet === "excel" && (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-neutral-800">
                <button
                  type="button"
                  onClick={handleOpenExcel}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-emerald-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <ExternalLink size={20} className="text-neutral-500 group-hover:text-emerald-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "export-excel" ? "Opening..." : "Open Excel"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShareExcel}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-emerald-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <Share2 size={20} className="text-neutral-500 group-hover:text-emerald-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "share-excel" ? "Sharing..." : "Share Excel"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={!!loadingAction}
                  className="flex items-center gap-4 py-3.5 text-left text-neutral-800 dark:text-neutral-200 hover:text-emerald-600 transition-colors group active:bg-slate-50 dark:active:bg-neutral-800/50 rounded-xl px-2"
                >
                  <FileSpreadsheet size={20} className="text-neutral-500 group-hover:text-emerald-600" />
                  <span className="text-sm font-semibold">
                    {loadingAction === "export-excel" ? "Exporting..." : "Export to Excel"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  FileText, 
  ExternalLink, 
  Printer, 
  Share2, 
  Download, 
  X, 
  Table as TableIcon,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "react-hot-toast";
import { generateItemReportPDF, ItemReportExportRow } from "@/lib/pdf/item-report-pdf";

interface MobileReportExportOptionsProps {
  items: ItemReportExportRow[];
  grandTotalRevenue: number;
  grandTotalSold: number;
  dateRangeStr?: string;
  businessName?: string;
  currencySymbol?: string;
}

export default function MobileReportExportOptions({
  items,
  grandTotalRevenue,
  grandTotalSold,
  dateRangeStr = new Date().toLocaleDateString("en-IN"),
  businessName = "Kravy POS",
  currencySymbol = "₹",
}: MobileReportExportOptionsProps) {
  const [activeSheet, setActiveSheet] = useState<"none" | "pdf" | "excel">("none");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to generate PDF Blob
  const getPdfBlob = async (): Promise<Blob> => {
    const bytes = await generateItemReportPDF({
      title: "Item Reports",
      businessName,
      dateRangeStr,
      items,
      grandTotalRevenue,
      grandTotalSold,
      currencySymbol,
    });
    return new Blob([bytes.buffer as BlobPart], { type: "application/pdf" });
  };

  // Helper to generate Excel Workbook
  const getExcelBlob = async (): Promise<Blob> => {
    const XLSX = await import("xlsx");
    const exportData = items.map((i, idx) => ({
      "Sr No": idx + 1,
      "Item Name": i.name,
      "Category": i.category || "-",
      "Order Quantity": i.totalSold,
      "Order Amount": i.totalRevenue,
    }));

    // Add Grand Total row
    exportData.push({
      "Sr No": "" as any,
      "Item Name": "TOTAL",
      "Category": "",
      "Order Quantity": grandTotalSold,
      "Order Amount": grandTotalRevenue,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Item Reports");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };

  const getSafeFileName = (ext: string) => {
    const safeDate = dateRangeStr.replace(/[^a-zA-Z0-9]/g, "_");
    return `Item_Reports_${safeDate}.${ext}`;
  };

  // 1. Open PDF in new tab
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

  // 2. Print PDF
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

  // 3. Share PDF (using Web Share API if available, otherwise download fallback)
  const handleSharePdf = async () => {
    try {
      setLoadingAction("share-pdf");
      const blob = await getPdfBlob();
      const file = new File([blob], getSafeFileName("pdf"), { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Item Reports",
          text: `Item Sales Report (${dateRangeStr})`,
          files: [file],
        });
        toast.success("Shared successfully!");
      } else if (navigator.share) {
        // Fallback share without file if browser share only accepts text/url
        const url = URL.createObjectURL(blob);
        await navigator.share({
          title: "Item Reports",
          text: `Item Sales Report (${dateRangeStr})`,
          url,
        });
      } else {
        // Fallback to direct download
        handleSavePdfToPhone();
        toast("Sharing not supported on this browser. File downloaded to phone.", { icon: "📥" });
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

  // 4. Save PDF to Phone (Download)
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
      console.error("Save PDF error:", err);
      toast.error("Could not save PDF: " + (err?.message || ""));
    } finally {
      setLoadingAction(null);
    }
  };

  // Excel Actions
  // 1. Open Excel (Direct download / open)
  const handleOpenExcel = async () => {
    handleExportExcel();
  };

  // 2. Share Excel
  const handleShareExcel = async () => {
    try {
      setLoadingAction("share-excel");
      const blob = await getExcelBlob();
      const file = new File([blob], getSafeFileName("xlsx"), { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Item Reports Excel",
          text: `Item Sales Excel Report (${dateRangeStr})`,
          files: [file],
        });
        toast.success("Excel shared successfully!");
      } else {
        handleExportExcel();
        toast("Sharing not supported on this browser. Excel downloaded.", { icon: "📊" });
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

  // 3. Export to Excel (Download)
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
      {/* ── Top-right Badges (PDF / XLS) Matching User Image ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* PDF Badge Button */}
        <button
          type="button"
          onClick={() => setActiveSheet("pdf")}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] active:scale-95 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition-all uppercase tracking-tight"
          title="PDF Options"
        >
          Pdf
        </button>

        {/* XLS Badge Button */}
        <button
          type="button"
          onClick={() => setActiveSheet("excel")}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] active:scale-95 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-xs transition-all uppercase tracking-tight"
          title="Excel Options"
        >
          xls
        </button>
      </div>

      {/* ── Bottom Sheet Modal Backdrop & Content (Mounted to document.body via Portal) ── */}
      {mounted && activeSheet !== "none" && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex flex-col justify-end pointer-events-auto">
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setActiveSheet("none")}
          />

          {/* Floating Close 'X' Button on top of the Sheet (Matches User Image) */}
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

          {/* Sheet Drawer Container */}
          <div
            className="relative z-10 w-full bg-white dark:bg-neutral-900 rounded-t-[28px] p-6 pb-8 shadow-2xl border-t border-slate-100 dark:border-neutral-800 animate-in slide-in-from-bottom duration-200 max-w-lg mx-auto"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {/* Sheet Title */}
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              {activeSheet === "pdf" ? "PDF Options" : "Excel Options"}
            </h3>

            {/* PDF Options Menu */}
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

            {/* Excel Options Menu */}
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

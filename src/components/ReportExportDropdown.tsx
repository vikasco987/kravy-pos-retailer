"use client";

import React, { useState } from "react";
import { Download, FileText, Table as TableIcon, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (val: any) => string;
}

interface ReportExportDropdownProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  disabled?: boolean;
}

export default function ReportExportDropdown({
  data,
  columns,
  filename,
  title = "Report",
  disabled = false,
}: ReportExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  };

  const normalizeValue = (val: any) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && val instanceof Date) {
      return val.toLocaleDateString();
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  };

  const prepareData = () => {
    return data.map((row) => {
      const formattedRow: Record<string, string> = {};
      columns.forEach((col) => {
        let val = getNestedValue(row, col.key);
        if (col.format) {
          val = col.format(val);
        } else {
          val = normalizeValue(val);
        }
        formattedRow[col.label] = val; // Use label for header
      });
      return formattedRow;
    });
  };

  const handleExportExcel = async () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading("Generating Excel file...");

    try {
      const XLSX = await import("xlsx");
      const exportData = prepareData();
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success("Excel Exported successfully!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to export Excel", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF file...");

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const exportData = prepareData();

      // Create a temporary hidden container
      const container = document.createElement("div");
      container.style.padding = "20px";
      container.style.fontFamily = "sans-serif";
      container.style.color = "#000";
      container.style.background = "#fff";

      // Add title
      const titleEl = document.createElement("h2");
      titleEl.innerText = title;
      titleEl.style.marginBottom = "16px";
      titleEl.style.textAlign = "center";
      container.appendChild(titleEl);

      // Create table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12px";

      // Thead
      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");
      columns.forEach((col) => {
        const th = document.createElement("th");
        th.innerText = col.label;
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f3f4f6";
        th.style.textAlign = "left";
        th.style.fontWeight = "bold";
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      // Tbody
      const tbody = document.createElement("tbody");
      exportData.forEach((row, idx) => {
        const tr = document.createElement("tr");
        if (idx % 2 === 0) tr.style.backgroundColor = "#f9fafb";
        columns.forEach((col) => {
          const td = document.createElement("td");
          td.innerText = row[col.label] || "";
          td.style.border = "1px solid #ddd";
          td.style.padding = "8px";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);

      // Append temporarily to DOM to render
      document.body.appendChild(container);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${filename}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };

      await html2pdf().set(opt as any).from(container).save();
      
      // Cleanup
      document.body.removeChild(container);
      toast.success("PDF Exported successfully!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled || isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export Data
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border border-gray-200 shadow-xl bg-white">
        <DropdownMenuItem onClick={handleExportExcel} className="flex items-center gap-2 p-2 cursor-pointer rounded-lg hover:bg-gray-100 font-semibold text-sm">
          <TableIcon size={16} className="text-green-600" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2 p-2 cursor-pointer rounded-lg hover:bg-gray-100 font-semibold text-sm">
          <FileText size={16} className="text-red-500" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

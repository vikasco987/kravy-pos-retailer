"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState, useEffect, useRef } from "react";
import { Printer, Settings, Check } from "lucide-react";

interface PrintableTableProps {
  filteredItems: any[];
  grandTotalRevenue: number;
}

export default function PrintableTable({ filteredItems, grandTotalRevenue }: PrintableTableProps) {
  const { currencySymbol: sym } = useCurrency();

  const [showSettings, setShowSettings] = useState(false);
  
  // Column preferences
  const [columns, setColumns] = useState({
    category: true,
    qty: true,
    revenue: true,
    share: true
  });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("kravy_item_report_columns");
    if (saved) {
      try {
        setColumns(JSON.parse(saved));
      } catch (e) {}
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (col: keyof typeof columns) => {
    const newCols = { ...columns, [col]: !columns[col] };
    setColumns(newCols);
    localStorage.setItem("kravy_item_report_columns", JSON.stringify(newCols));
  };

  // Count visible columns for proper spacing
  const visibleColCount = 2 + Object.values(columns).filter(Boolean).length; // Sr + Product + toggled ones

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            margin: 2mm !important;
            size: auto !important;
          }
          body {
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            font-size: 10px !important;
            color: #000 !important;
            background: #fff !important;
          }
          table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          td, th {
            word-wrap: break-word !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: break-all !important;
          }
          .print\\:hidden, .print-hidden {
            display: none !important;
          }
        }
      `}} />
      <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end", position: "relative" }} className="print:hidden">
        
        {/* Settings Dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: "10px 12px",
              borderRadius: "12px",
              background: "white",
              color: "var(--kravy-text-secondary)",
              border: "1px solid var(--kravy-border)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}
            className="hover:bg-slate-50 transition-all"
            title="Print Settings"
          >
            <Settings size={18} />
          </button>

          {showSettings && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "white",
              border: "1px solid var(--kravy-border)",
              borderRadius: "12px",
              padding: "12px",
              minWidth: "200px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              zIndex: 100
            }}>
              <h4 style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--kravy-text-muted)", marginBottom: "12px", letterSpacing: "0.5px" }}>
                Select Columns
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { key: "category", label: "Category" },
                  { key: "qty", label: "Qty Sold" },
                  { key: "revenue", label: "Revenue" },
                  { key: "share", label: "Revenue Share" }
                ].map(opt => (
                  <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${columns[opt.key as keyof typeof columns] ? "var(--kravy-brand)" : "var(--kravy-border)"}`,
                      background: columns[opt.key as keyof typeof columns] ? "var(--kravy-brand)" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s"
                    }}>
                      {columns[opt.key as keyof typeof columns] && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={columns[opt.key as keyof typeof columns]} 
                      onChange={() => toggleColumn(opt.key as keyof typeof columns)}
                      style={{ display: "none" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={(e) => {
            const btn = e.currentTarget;
            if (btn.disabled) return;
            btn.disabled = true;
            btn.style.opacity = "0.5";
            setShowSettings(false);
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = "1";
              }, 1000);
            }, 300);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            background: "var(--kravy-brand)",
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.85rem",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(255,107,53,0.3)"
          }}
          className="hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Printer size={18} />
          <span>Print</span>
        </button>
      </div>

      {/* ── Print Header ── */}
      <div className="hidden print:block mb-2 mt-0 text-center">
        <h2 style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: "4px" }} className="print:!text-sm print:!mb-1">Item-wise Sales Report</h2>
        <p style={{ fontSize: "0.95rem", color: "#555", fontWeight: 500 }} className="print:!text-[10px] print:!font-normal">Printed on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      <div style={{
        background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)",
        borderRadius: "24px", overflow: "hidden", boxShadow: "var(--kravy-card-shadow)",
        marginTop: "24px"
      }} className="print:!shadow-none print:!border-none print:!rounded-none print:!m-0 print:!bg-transparent print:!overflow-visible">
        <div style={{ overflowX: "auto" }} className="print:!overflow-visible">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "auto" }} className="print:!w-full print:!border-collapse print:!table-fixed">
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }} className="print:!bg-transparent print:!border-b print:!border-black print:!border-dashed">
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", width: "60px", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Sr.</th>
                <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", width: "auto" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[50%]">Product</th>
                {columns.category && <th style={{ padding: "18px 24px", textAlign: "left", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[15%]">Category</th>}
                {columns.qty && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Qty Sold</th>}
                {columns.revenue && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[15%]">Revenue</th>}
                {columns.share && <th style={{ padding: "18px 24px", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed print:!w-[10%]">Share</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} style={{ padding: "60px", textAlign: "center", color: "var(--kravy-text-muted)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📊</div>
                    <p>No sales data found for this period.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const revenueShare = grandTotalRevenue > 0 ? (item.totalRevenue / grandTotalRevenue) * 100 : 0;
                  return (
                    <tr key={item.name} style={{ borderTop: "1px solid var(--kravy-border)", transition: "background 0.2s" }} className="print:!border-b print:!border-black print:!border-dashed">
                      <td style={{ padding: "18px 24px", fontSize: "0.85rem", fontWeight: 900, color: "var(--kravy-text-faint)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">{String(idx + 1).padStart(2, '0')}</td>
                      <td style={{ padding: "18px 24px" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed print:!w-[50%]">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} className="print:!gap-1">
                          <span style={{ fontWeight: 700, color: "var(--kravy-text-primary)" }} className="print:!text-black print:!text-[10px] print:!leading-tight print:!whitespace-normal print:!break-all">{item.name}</span>
                        </div>
                      </td>
                      {columns.category && (
                        <td style={{ padding: "18px 24px" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed">
                          <span style={{
                            padding: "4px 10px", borderRadius: "8px", background: "var(--kravy-bg-2)",
                            fontSize: "0.7rem", fontWeight: 600, color: "var(--kravy-text-secondary)"
                          }} className="print:!bg-transparent print:!p-0 print:!text-black print:!text-[10px]">
                            {item.category}
                          </span>
                        </td>
                      )}
                      {columns.qty && (
                        <td style={{ padding: "18px 24px", textAlign: "right", fontWeight: 800, color: "var(--kravy-brand)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">
                          {format(item.totalSold)}
                        </td>
                      )}
                      {columns.revenue && (
                        <td style={{ padding: "18px 24px", textAlign: "right", fontWeight: 800, color: "var(--kravy-text-primary)" }} className="print:!text-black print:!p-1 print:!text-[10px] print:!border-b print:!border-black print:!border-dashed">
                          {sym}{format(item.totalRevenue)}
                        </td>
                      )}
                      {columns.share && (
                        <td style={{ padding: "18px 24px", textAlign: "right" }} className="print:!text-black print:!p-1 print:!border-b print:!border-black print:!border-dashed">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }} className="print:!gap-1">
                            <div style={{ width: "60px", height: "6px", background: "var(--kravy-bg-2)", borderRadius: "10px", overflow: "hidden" }} className="print:hidden">
                              <div style={{ width: `${revenueShare}%`, height: "100%", background: "var(--kravy-brand)", borderRadius: "10px" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-muted)", width: "40px" }} className="print:!text-black print:!text-[10px]">
                              {revenueShare.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

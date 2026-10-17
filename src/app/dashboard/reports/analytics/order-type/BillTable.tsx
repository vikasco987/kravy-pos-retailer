"use client";
import { useCurrency } from "@/lib/currency-context";
import React, { useState } from "react";
import { 
  Utensils, Bike, ShoppingBag, Search, Filter, 
  ChevronDown, ChevronRight, Package, Receipt 
} from "lucide-react";
import { BillActionsReport } from "../../sales/daily/BillActionsReport";

interface Props {
  bills: any[];
  business: any;
}

export default function BillTable({ bills, business }: Props) {
  const { currencySymbol: sym } = useCurrency();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "40px", boxShadow: "var(--kravy-shadow-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
         <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>Detailed Bill Ledger</h3>
         <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ position: "relative" }}>
               <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--kravy-text-muted)" }} />
               <input type="text" placeholder="Search Bill #" style={{ padding: "10px 16px 10px 40px", borderRadius: "12px", border: "1px solid var(--kravy-border)", background: "var(--kravy-bg)", fontSize: "0.85rem", width: "200px" }} />
            </div>
            <button style={{ padding: "10px 20px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "12px", color: "var(--kravy-text-primary)", fontWeight: 800, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
               <Filter size={16} /> Filter
            </button>
         </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderSpacing: 0, textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--kravy-border)" }}>
              <th style={{ padding: "16px 20px" }}></th>
              {["BILL #", "TYPE", "CUSTOMER", "STATUS", "PAYMENT", "AMOUNT", ""].map((h, i) => (
                <th key={i} style={{ padding: "16px 20px", fontSize: "0.75rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bills.map((b, i) => {
              const isExpanded = expandedRows.has(b.id);
              const typeRaw = (b.tableName || "POS").toUpperCase();
              let icon = <Utensils size={14} />;
              let color = "#10B981";
              if (typeRaw.includes("DELIVERY")) { icon = <Bike size={14} />; color = "#3B82F6"; }
              else if (typeRaw.includes("TAKEAWAY")) { icon = <ShoppingBag size={14} />; color = "#F59E0B"; }

              return (
                <React.Fragment key={b.id}>
                  <tr style={{ borderBottom: isExpanded ? "none" : (i === bills.length - 1 ? "none" : "1px solid var(--kravy-border)"), transition: "background 0.2s" }} className="hover:bg-slate-50">
                    <td style={{ padding: "20px", width: "40px" }}>
                       <button 
                        onClick={() => toggleRow(b.id)}
                        style={{ background: "none", border: "none", color: "var(--kravy-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                       >
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                       </button>
                    </td>
                    <td style={{ padding: "20px" }}><span style={{ fontWeight: 800, color: "var(--kravy-purple)", fontFamily: "monospace" }}>#{b.billNumber}</span></td>
                    <td style={{ padding: "20px" }}>
                       <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${color}15`, color: color, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
                          <span style={{ fontWeight: 700, color: "var(--kravy-text-primary)", fontSize: "0.85rem" }}>{typeRaw.includes("DELIVERY") ? "Delivery" : typeRaw.includes("TAKEAWAY") ? "Takeaway" : "Dine-in"}</span>
                       </div>
                    </td>
                    <td style={{ padding: "20px" }}>
                       <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 800, color: "var(--kravy-text-primary)", fontSize: "0.9rem" }}>{b.customerName || "Walk-in"}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>{b.customerPhone || "No Phone"}</span>
                       </div>
                    </td>
                    <td style={{ padding: "20px" }}>
                       <span style={{ 
                         padding: "6px 12px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: 900,
                         background: b.paymentStatus === "Paid" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                         color: b.paymentStatus === "Paid" ? "#10B981" : "#EF4444"
                       }}>{b.paymentStatus}</span>
                    </td>
                    <td style={{ padding: "20px" }}><span style={{ fontWeight: 700, color: "var(--kravy-text-muted)", fontSize: "0.85rem" }}>{b.paymentMode}</span></td>
                    <td style={{ padding: "20px" }}><span style={{ fontWeight: 900, color: "var(--kravy-text-primary)", fontSize: "1rem" }}>{sym}{format(b.total)}</span></td>
                    <td style={{ padding: "20px", textAlign: "right" }}>
                       <BillActionsReport billId={b.id} bill={b} business={business} />
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: "0 40px 30px 60px" }}>
                         <div style={{ 
                           background: "var(--kravy-bg)", 
                           borderRadius: "24px", 
                           padding: "24px", 
                           border: "1px solid var(--kravy-border)",
                           boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)",
                           display: "flex",
                           flexDirection: "column",
                           gap: "20px"
                         }}>
                            {/* Items Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--kravy-border)", paddingBottom: "12px" }}>
                               <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Bill Items</span>
                               <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Price Breakdown</span>
                            </div>

                            {/* Items List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                               {(b.items as any[] || []).map((item, idx) => {
                                 const q = Number(item.qty || item.quantity || 0);
                                 const p = Number(item.rate || item.price || 0);
                                 return (
                                   <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                         <div style={{ width: "8px", height: "8px", background: "var(--kravy-purple)", borderRadius: "50%" }} />
                                         <div>
                                            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--kravy-text-primary)" }}>{item.name}</div>
                                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>Qty: {q} × {sym}{p}</div>
                                         </div>
                                      </div>
                                      <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--kravy-text-primary)" }}>{sym}{format(q * p)}</div>
                                   </div>
                                 );
                               })}
                            </div>

                            {/* Tax & Total Summary */}
                            <div style={{ marginTop: "12px", paddingTop: "20px", borderTop: "1px solid var(--kravy-border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                               <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>
                                     <span>Subtotal</span>
                                     <span>{sym}{format(b.subtotal)}</span>
                                  </div>
                                  {(b.tax || 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>
                                       <span>Tax / GST</span>
                                       <span>{sym}{format(b.tax)}</span>
                                    </div>
                                  )}
                                  {(b.deliveryCharges || 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>
                                       <span>Delivery</span>
                                       <span>{sym}{format(b.deliveryCharges)}</span>
                                    </div>
                                  )}
                                  {(b.packagingCharges || 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>
                                       <span>Packaging</span>
                                       <span>{sym}{format(b.packagingCharges)}</span>
                                    </div>
                                  )}
                                  {(b.discountAmount || 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 800, color: "#EF4444" }}>
                                       <span>Discount</span>
                                       <span>-{sym}{format(b.discountAmount)}</span>
                                    </div>
                                  )}
                               </div>
                               <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", padding: "16px 24px", background: "var(--kravy-surface)", borderRadius: "18px", border: "1px solid var(--kravy-border)" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--kravy-purple)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Grand Total</span>
                                  <span style={{ fontSize: "1.4rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(b.total)}</span>
                               </div>
                            </div>
                         </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

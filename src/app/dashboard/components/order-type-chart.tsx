"use client";

import { useCurrency } from '@/lib/currency-context';
import React from "react";
import Link from "next/link";
import { Maximize2 } from "lucide-react";

interface Props {
  data: {
    DELIVERY: { count: number; total: number };
    TAKEAWAY: { count: number; total: number };
    DINEIN: { count: number; total: number };
  };
}

export default function OrderTypeChart({ data }: Props) {
  const { currencySymbol: sym } = useCurrency();
  const totalAmount = data.DELIVERY.total + data.TAKEAWAY.total + data.DINEIN.total;
  
  const items = [
    { name: "Delivery", value: data.DELIVERY.total, color: "#3B82F6", percent: totalAmount > 0 ? (data.DELIVERY.total / totalAmount) * 100 : 0 },
    { name: "Dine-in", value: data.DINEIN.total, color: "#10B981", percent: totalAmount > 0 ? (data.DINEIN.total / totalAmount) * 100 : 0 },
    { name: "Takeaway", value: data.TAKEAWAY.total, color: "#F59E0B", percent: totalAmount > 0 ? (data.TAKEAWAY.total / totalAmount) * 100 : 0 },
  ].sort((a, b) => b.value - a.value);

  const format = (num: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(num));

  return (
    <div style={{
      background: "var(--kravy-surface)",
      border: "1px solid var(--kravy-border)",
      borderRadius: "24px",
      padding: "28px",
      height: "400px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "var(--kravy-card-shadow)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Order type breakdown</h3>
        <Link 
          href="/dashboard/reports/analytics/order-type" 
          style={{ 
            fontSize: "0.7rem", 
            fontWeight: 800, 
            color: "var(--kravy-purple)", 
            textTransform: "uppercase", 
            letterSpacing: "1px", 
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "rgba(99, 102, 241, 0.05)",
            borderRadius: "10px",
            border: "1px solid rgba(99, 102, 241, 0.1)"
          }}
        >
          Full Page <Maximize2 size={12} />
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", flex: 1, justifyContent: "center" }}>
        {items.map((item) => (
          <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--kravy-text-primary)" }}>{item.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{Math.round(item.percent)}%</span>
                <span style={{ color: "var(--kravy-text-muted)", fontSize: "0.9rem" }}>—</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{sym}{format(item.value)}</span>
              </div>
            </div>
            <div style={{ height: "6px", background: "var(--kravy-bg-2)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${item.percent}%`, 
                background: item.color, 
                borderRadius: "3px",
                boxShadow: `0 0 12px ${item.color}44`
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Total Revenue</span>
        <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--kravy-text-primary)" }}>{sym}{format(totalAmount)}</span>
      </div>
    </div>
  );
}

"use client";

import { useCurrency } from '@/lib/currency-context';
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface Props {
  data: { day: string; revenue: number; orders: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { currencySymbol: sym } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--kravy-surface-hover)",
        border: "1px solid var(--kravy-border-strong)",
        borderRadius: "14px",
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        color: "var(--kravy-text-primary)"
      }}>
        <div style={{ fontSize: "0.72rem", color: "var(--kravy-text-muted)", fontFamily: "monospace", marginBottom: "6px" }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Revenue: {sym}{new Intl.NumberFormat("en-IN").format(Math.round(payload[0].value))}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Orders: {payload[1].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function WeeklyRevenueChart({ data }: Props) {
  const { currencySymbol: sym } = useCurrency();
  return (
    <div style={{
      background: "var(--kravy-surface)",
      border: "1px solid var(--kravy-border)",
      borderRadius: "24px",
      padding: "28px",
      height: "400px",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      boxShadow: "var(--kravy-card-shadow)"
    }}>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "20px" }}>Weekly revenue (last 7 days)</h3>

      <div style={{ flex: 1, width: "100%", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--kravy-border)" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--kravy-text-muted)", fontSize: 11, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--kravy-text-muted)", fontSize: 10, fontWeight: 700 }}
              tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--kravy-text-muted)", fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--kravy-bg-2)", opacity: 0.4 }} />
            <Legend 
              verticalAlign="top" 
              align="left" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: "20px", paddingLeft: "0", fontSize: "0.85rem", fontWeight: 700 }}
            />
            <Bar 
              yAxisId="left"
              dataKey="revenue" 
              name="Revenue"
              fill="#3B82F6" 
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar 
              yAxisId="right"
              dataKey="orders" 
              name="Orders"
              fill="#10B981" 
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

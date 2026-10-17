"use client";
import { useCurrency } from '@/lib/currency-context';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  paymentSplit?: {
    Cash?: number;
    UPI?: number;
    Card?: number;
  };
  range?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  const { currencySymbol: sym } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--kravy-surface-hover)",
        border: "1px solid var(--kravy-border-strong)",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        color: "var(--kravy-text-primary)"
      }}>
        <div style={{ fontSize: "0.72rem", color: "var(--kravy-text-muted)", marginBottom: "4px" }}>{payload[0].name}</div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: payload[0].payload.color }}>
          {sym}{new Intl.NumberFormat("en-IN").format(Math.round(payload[0].value))}
        </div>
      </div>
    );
  }
  return null;
};

export default function PaymentModeChart({ paymentSplit, range = 30 }: Props) {
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();
  const cash = paymentSplit?.Cash || 0;
  const upi = paymentSplit?.UPI || 0;
  const card = paymentSplit?.Card || 0;
  const total = cash + upi + card;

  const data = [
    { name: "Cash", value: cash, color: "#10B981" },
    { name: "UPI", value: upi, color: "#8B5CF6" },
  ];

  if (card > 0) {
    data.push({ name: "Card", value: card, color: "#F59E0B" });
  }

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
      position: "relative",
      overflow: "hidden",
      boxShadow: "var(--kravy-card-shadow)"
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        bottom: "-40px",
        left: "-40px",
        width: "160px",
        height: "160px",
        background: "rgba(16,185,129,0.1)",
        borderRadius: "50%",
        filter: "blur(50px)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(16,185,129,0.4)"
          }}>
            <Wallet size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Payment Split</h3>
            <p style={{ fontSize: "0.72rem", color: "var(--kravy-text-muted)", fontFamily: "monospace" }}>Cash vs UPI breakdown</p>
          </div>
        </div>

        {/* Expand Icon */}
        <button 
          onClick={() => router.push(`/dashboard/reports/payments?range=${range}`)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--kravy-bg-2)",
            border: "1px solid var(--kravy-border)",
            cursor: "pointer",
            color: "var(--kravy-text-muted)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--kravy-brand)";
            e.currentTarget.style.color = "var(--kravy-brand)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--kravy-border)";
            e.currentTarget.style.color = "var(--kravy-text-muted)";
          }}
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {total === 0 ? (
          <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--kravy-text-muted)",
            gap: "12px"
          }}>
            <div style={{ fontSize: "2rem" }}>💳</div>
            <div style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>No payment data</div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={6}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color}
                      style={{ filter: `drop-shadow(0 0 8px ${entry.color}66)` }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none"
            }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-0.5px" }}>{sym}{format(total)}</div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {total > 0 && (
        <div style={{
          display: "flex",
          gap: "12px",
          marginTop: "16px",
          padding: "14px 16px",
          background: "var(--kravy-bg-2)",
          borderRadius: "14px",
          border: "1px solid var(--kravy-border)"
        }}>
          {data.map((item) => (
            <div key={item.name} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}`
                }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>{item.name}</span>
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: item.color }}>
                {sym}{format(item.value)}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--kravy-text-faint)", fontFamily: "monospace" }}>
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
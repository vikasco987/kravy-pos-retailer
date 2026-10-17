import React from "react";
import { Clock, CheckCircle2, ShoppingBag } from "lucide-react";
import { useCurrency } from '@/lib/currency-context';

export const TypeBadge = ({ type }: { type: string }) => {
  const t = type?.toUpperCase() || "POS";
  let color = "#64748B";
  let bg = "rgba(100, 116, 139, 0.1)";
  let label = "Dine-in";

  if (t.includes("DELIVERY")) { color = "#3B82F6"; bg = "rgba(59, 130, 246, 0.1)"; label = "Delivery"; }
  else if (t.includes("TAKEAWAY")) { color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.1)"; label = "Takeaway"; }
  else if (t === "COUNTER" || t !== "POS") { color = "#10B981"; bg = "rgba(16, 185, 129, 0.1)"; label = "Dine-in"; }

  return (
    <span style={{ 
      padding: "5px 12px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800, 
      background: bg, color: color, display: "inline-block", border: `1px solid ${color}20`
    }}>{label}</span>
  );
};

export const StatusIndicator = ({ status, isHeld }: { status: string, isHeld?: boolean }) => {
  const s = status?.toLowerCase();
  if (isHeld || s === "pending") return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontSize: "0.65rem", fontWeight: 800 }}>
      <Clock size={12} /> PENDING
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "0.65rem", fontWeight: 800 }}>
      <CheckCircle2 size={12} /> SETTLED
    </div>
  );
};

export const PaymentBadge = ({ mode, status, amountPaid, balanceDue, total }: { mode: string, status: string, amountPaid?: number, balanceDue?: number, total?: number }) => {
  const { currencySymbol: sym } = useCurrency();
  const m = (mode || "Cash").toLowerCase();
  
  const formatNum = (num: number) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
  const isPartial = status?.toUpperCase() === "PARTIAL";

  const renderStatus = () => {
    if (isPartial) {
       return (
         <div style={{ display: "flex", flexDirection: "column", gap: "2px", border: "1px solid #FCD34D", background: "#FFFBEB", padding: "4px 8px", borderRadius: "6px", width: "fit-content" }}>
           <div style={{ fontSize: "0.6rem", fontWeight: 900, color: "#D97706" }}>⏱ PARTIAL</div>
           <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#64748B" }}>Paid: <span style={{ color: "#10B981" }}>{sym}{formatNum(amountPaid!)}</span></div>
           <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#64748B" }}>Due: <span style={{ color: "#EF4444" }}>{sym}{formatNum(balanceDue!)}</span></div>
         </div>
       );
    }
    
    const isPaid = status === "Paid" || status === "PAID";
    return (
      <div style={{ 
        fontSize: "0.6rem", fontWeight: 900, 
        color: isPaid ? "#10B981" : "#EF4444", 
        border: `1px solid ${isPaid ? "#D1FAE5" : "#FEE2E2"}`, 
        padding: "2px 6px", borderRadius: "4px", width: "fit-content" 
      }}>
        {isPaid ? "✓" : "✗"} {status?.toUpperCase()}
      </div>
    );
  };

  if (m.startsWith("split")) {
    const breakdownMatch = mode.match(/\((.*?)\)/);
    const breakdownText = breakdownMatch ? breakdownMatch[1] : "";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "4px 8px", borderRadius: "6px", background: "#FFFBEB", color: "#D97706",
          fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", width: "fit-content"
        }}>
          <ShoppingBag size={10} /> SPLIT
        </div>
        {breakdownText && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {breakdownText.split(',').map((part, idx) => {
              const [method, amount] = part.split(':').map(s => s.trim());
              return (
                <div key={idx} style={{ fontSize: "0.6rem", color: "#475569", fontWeight: 800 }}>
                  <span style={{ color: "#1E293B" }}>{method}</span>: {sym}{formatNum(Number(amount))}
                </div>
              );
            })}
          </div>
        )}
        {renderStatus()}
      </div>
    );
  }

  let icon = "💵";
  if (m.includes("card")) icon = "💳";
  if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe") || m.includes("paytm")) icon = "📱";
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "0.9rem" }}>{icon}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{mode || "Cash"}</span>
      </div>
      {renderStatus()}
    </div>
  );
};

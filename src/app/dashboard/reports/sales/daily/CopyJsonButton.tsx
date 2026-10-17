"use client";

import { Copy } from "lucide-react";
import toast from "react-hot-toast";

export default function CopyJsonButton({ bills }: { bills: any[] }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(JSON.stringify({
          totalRecords: bills.length,
          data: bills
        }, null, 2));
        toast.success("API Data Copied!");
      }}
      style={{ padding: "10px 24px", background: "var(--kravy-purple)", color: "white", border: "none", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
    >
      <Copy size={16} /> API JSON
    </button>
  );
}

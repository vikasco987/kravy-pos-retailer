"use client";

import { useState } from "react";
import { Code, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";

export default function CopyApiButton({ range, billsData }: { range: number, billsData?: any }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/api/dashboard/export?range=${range}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast.success("API URL Copied!");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyJson = () => {
    if (billsData) {
      const dataStr = JSON.stringify(billsData, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopiedJson(true);
      toast.success("Dashboard JSON Data Copied!");
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopyUrl}
        title="Copy API Endpoint URL"
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 12px", borderRadius: "10px",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.2)",
          color: "#8B5CF6", fontSize: "0.75rem", fontWeight: 800,
          cursor: "pointer", transition: "all 0.2s"
        }}
        className="hover:bg-purple-500/20"
      >
        {copiedUrl ? <Check size={14} /> : <Code size={14} />}
        <span>API URL</span>
      </button>

      {billsData && (
        <button
          onClick={handleCopyJson}
          title="Copy Database Response JSON"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 12px", borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "#10B981", fontSize: "0.75rem", fontWeight: 800,
            cursor: "pointer", transition: "all 0.2s"
          }}
          className="hover:bg-emerald-500/20"
        >
          {copiedJson ? <Check size={14} /> : <Copy size={14} />}
          <span>JSON Schema</span>
        </button>
      )}
    </div>
  );
}

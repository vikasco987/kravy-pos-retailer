"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/AuthContext";
import { Code2, X, Copy, Check, ChevronDown, ChevronRight, Trash2, RefreshCw } from "lucide-react";

interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  timestamp: string;
  data: any;
  open: boolean;
}

// Global store so interceptor can push to it from outside React
const listeners: Array<(req: CapturedRequest) => void> = [];
let isPatched = false;

function patchFetch() {
  if (isPatched || typeof window === "undefined") return;
  isPatched = true;
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const method = (typeof args[1] === "object" && args[1]?.method) ? args[1].method.toUpperCase() : "GET";
      if (url.includes("/api/") && !url.includes("/api/auth/") && !url.includes("/api/user/me") && !url.includes("/api/notifications")) {
        const clone = response.clone();
        clone.json().then((data) => {
          const entry: CapturedRequest = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: url.replace(window.location.origin, ""),
            method,
            status: response.status,
            timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
            data,
            open: false,
          };
          listeners.forEach((fn) => fn(entry));
        }).catch(() => {});
      }
    } catch {}
    return response;
  };
}

function collapseSchema(data: any, depth = 0): any {
  if (data === null) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    return [collapseSchema(data[0], depth + 1), `...+${data.length - 1} more`];
  }
  if (typeof data === "object") {
    if (depth > 3) return "{...}";
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = collapseSchema(data[key], depth + 1);
    }
    return result;
  }
  return data;
}

export default function SchemaDebugger() {
  const { user } = useAuthContext();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.type === "ADMIN" || user?.type === "MASTER";

  useEffect(() => {
    if (!isAdmin) return;
    patchFetch();
    const handler = (req: CapturedRequest) => {
      setRequests((prev) => [req, ...prev].slice(0, 30));
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [isAdmin]);

  // Clear on page change
  useEffect(() => {
    setRequests([]);
    setOpen(false);
  }, [pathname]);

  const toggleItem = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, open: !r.open } : r));
  }, []);

  const copyRequest = useCallback((req: CapturedRequest) => {
    navigator.clipboard.writeText(JSON.stringify(req.data, null, 2)).then(() => {
      setCopied(req.id);
      setTimeout(() => setCopied(null), 1800);
    });
  }, []);

  const copyAll = useCallback(() => {
    const all: Record<string, any> = {};
    requests.forEach((r) => { all[r.url] = r.data; });
    navigator.clipboard.writeText(JSON.stringify(all, null, 2)).then(() => {
      setCopied("ALL");
      setTimeout(() => setCopied(null), 1800);
    });
  }, [requests]);

  if (!isAdmin) return null;

  return (
    <>
      {/* Floating trigger button - repositioned to bottom left developer toolbar so it never overlaps billing headers or footer */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="API Schema Debugger (Admin Only)"
        className="fixed z-[9999] w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all active:scale-95 print:hidden left-22 sm:left-24 bottom-20 lg:bottom-4 opacity-75 hover:opacity-100"
        style={{
          background: open
            ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
            : "linear-gradient(135deg,#1e1b4b,#312e81)",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: open
            ? "0 0 0 3px rgba(99,102,241,0.25), 0 4px 16px rgba(99,102,241,0.4)"
            : "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        {requests.length > 0 && !open && (
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center"
            style={{ background: "#f43f5e", color: "#fff" }}
          >
            {requests.length > 9 ? "9+" : requests.length}
          </span>
        )}
        <Code2 size={13} color="#a5b4fc" />
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-5 z-[9999] flex flex-col print:hidden"
          style={{
            width: "min(420px, calc(100vw - 24px))",
            maxHeight: "70vh",
            background: "#0f0e1a",
            border: "1.5px solid rgba(99,102,241,0.3)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))",
              borderBottom: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <div className="flex items-center gap-2">
              <Code2 size={15} color="#818cf8" />
              <span className="text-[12px] font-black text-indigo-300 tracking-wider uppercase">API Schema</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}
              >
                {requests.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRequests([])}
                title="Clear"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              >
                <Trash2 size={13} color="#f87171" />
              </button>
              <button
                onClick={copyAll}
                title="Copy All"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              >
                {copied === "ALL" ? <Check size={13} color="#34d399" /> : <Copy size={13} color="#a5b4fc" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              >
                <X size={13} color="#94a3b8" />
              </button>
            </div>
          </div>

          {/* Current page label */}
          <div
            className="px-4 py-1.5 shrink-0"
            style={{ borderBottom: "1px solid rgba(99,102,241,0.1)" }}
          >
            <p className="text-[10px] font-mono" style={{ color: "#64748b" }}>
              <span style={{ color: "#475569" }}>PAGE:</span>{" "}
              <span style={{ color: "#818cf8" }}>{pathname}</span>
            </p>
          </div>

          {/* Requests list */}
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw size={20} color="#334155" className="animate-spin" />
                <p className="text-[11px] font-medium" style={{ color: "#475569" }}>
                  Waiting for API calls…
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 cursor-pointer group hover:bg-white/[0.03] transition-all"
                    onClick={() => toggleItem(req.id)}
                  >
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        background: req.method === "GET" ? "rgba(52,211,153,0.15)" : req.method === "POST" ? "rgba(99,102,241,0.2)" : "rgba(251,146,60,0.15)",
                        color: req.method === "GET" ? "#34d399" : req.method === "POST" ? "#818cf8" : "#fb923c",
                      }}
                    >
                      {req.method}
                    </span>
                    <span
                      className="text-[10px] font-mono flex-1 truncate"
                      style={{ color: "#94a3b8" }}
                    >
                      {req.url}
                    </span>
                    <span
                      className="text-[9px] font-bold shrink-0"
                      style={{ color: req.status < 300 ? "#34d399" : "#f87171" }}
                    >
                      {req.status}
                    </span>
                    <span className="text-[9px] shrink-0" style={{ color: "#475569" }}>
                      {req.timestamp}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyRequest(req); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10"
                    >
                      {copied === req.id ? <Check size={11} color="#34d399" /> : <Copy size={11} color="#818cf8" />}
                    </button>
                    {req.open ? <ChevronDown size={12} color="#475569" /> : <ChevronRight size={12} color="#475569" />}
                  </div>

                  {/* Expanded JSON */}
                  {req.open && (
                    <div
                      className="px-4 pb-3"
                      style={{ background: "rgba(0,0,0,0.3)" }}
                    >
                      <pre
                        className="text-[9.5px] font-mono leading-relaxed overflow-x-auto"
                        style={{
                          color: "#7dd3fc",
                          maxHeight: "200px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {JSON.stringify(collapseSchema(req.data), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

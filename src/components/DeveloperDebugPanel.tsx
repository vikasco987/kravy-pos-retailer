"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/components/AuthContext";
import { createPortal } from "react-dom";
import { X, Bug, Copy, Trash2, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import SidebarTracer from "./SidebarTracer";

const redactSensitiveData = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (/password|secret|token|cookie|auth|clerk|apiKey|session/i.test(key)) {
        newObj[key] = "[REDACTED]";
      } else {
        newObj[key] = redactSensitiveData(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export default function DeveloperDebugPanel() {
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'network' | 'tracer'>('network');

  // Only render for authorized developers
  if (!user || (user.type !== "ADMIN" && user.type !== "MASTER")) {
    return null;
  }

  useEffect(() => {
    const handleDebugEvent = (e: any) => {
      setLogs((prev) => {
        const newLogs = [e.detail, ...prev];
        return newLogs.slice(0, 100);
      });
    };
    window.addEventListener("agy-dev-debug", handleDebugEvent);
    return () => window.removeEventListener("agy-dev-debug", handleDebugEvent);
  }, []);

  const handleCopyAll = (log: any) => {
    const report = `# Developer Debug Report

URL: ${log.url}
METHOD: ${log.method}
STATUS: ${log.status}
DURATION: ${log.duration.toFixed(2)}ms
TIMESTAMP: ${log.timestamp}

REQUEST:
${JSON.stringify(redactSensitiveData(log.requestBody), null, 2)}

RESPONSE:
${JSON.stringify(redactSensitiveData(log.responseBody), null, 2)}

PARSED DATA:
${log.parseError ? `ERROR: ${log.parseError}` : "SUCCESS"}
`;
    navigator.clipboard.writeText(report);
    alert("Debug report copied!");
  };

  const handleCopyJson = (log: any) => {
    navigator.clipboard.writeText(JSON.stringify(redactSensitiveData(log.responseBody), null, 2));
    alert("JSON copied!");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        data-floating-ui="true"
        className="fixed z-[9999] flex items-center gap-2 right-[76px] bottom-[calc(20px+max(80px,env(safe-area-inset-bottom)))] lg:bottom-5 px-4 h-11 rounded-2xl cursor-pointer font-extrabold transition-all duration-200 print:hidden"
        style={{
          background: "linear-gradient(135deg,#1e1b4b,#312e81)",
          color: "#a5b4fc",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          border: "1.5px solid rgba(99,102,241,0.4)",
        }}
      >
        <Bug size={18} color="#a5b4fc" /> Debug
      </button>

      {isOpen &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: "800px",
                background: "#0F172A", color: "#F8FAFC", display: "flex", flexDirection: "column",
                boxShadow: "-10px 0 40px rgba(0,0,0,0.5)", borderLeft: "1px solid #334155",
                pointerEvents: "auto"
              }}
            >
              {/* Header */}
              <div style={{ padding: "20px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem", fontWeight: 900 }}>
                  <Bug size={20} color="#38BDF8" /> Developer Debug Panel
                </h2>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ display: "flex", background: "#1E293B", borderRadius: "8px", overflow: "hidden", marginRight: "10px" }}>
                    <button 
                      onClick={() => setActiveTab('network')} 
                      style={{ background: activeTab === 'network' ? "#38BDF8" : "transparent", color: activeTab === 'network' ? "#0F172A" : "#94A3B8", border: "none", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 800 }}
                    >
                      Network
                    </button>
                    <button 
                      onClick={() => setActiveTab('tracer')} 
                      style={{ background: activeTab === 'tracer' ? "#38BDF8" : "transparent", color: activeTab === 'tracer' ? "#0F172A" : "#94A3B8", border: "none", padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 800 }}
                    >
                      Tracer
                    </button>
                  </div>
                  {activeTab === 'network' && (
                    <button onClick={() => setLogs([])} style={{ background: "#334155", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700 }}>
                      <Trash2 size={14} /> Clear
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} style={{ background: "transparent", color: "#94A3B8", border: "none", cursor: "pointer" }}>
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Layout */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {activeTab === 'tracer' ? (
                  <div style={{ flex: 1, overflowY: "auto", background: "#0F172A" }}>
                    <SidebarTracer />
                  </div>
                ) : (
                  <>
                {/* Left: Log List */}
                <div style={{ width: "300px", borderRight: "1px solid #334155", overflowY: "auto", background: "#1E293B" }}>
                  {logs.length === 0 ? (
                    <div style={{ padding: "20px", color: "#64748B", textAlign: "center", fontSize: "0.85rem" }}>No requests captured yet.</div>
                  ) : (
                    logs.map((log, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedLogIndex(i)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #334155",
                          cursor: "pointer",
                          background: selectedLogIndex === i ? "#334155" : "transparent",
                          transition: "0.2s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 900, color: log.isError ? "#F87171" : "#4ADE80" }}>{log.method}</span>
                          <span style={{ fontSize: "0.7rem", color: log.isError ? "#F87171" : "#4ADE80", fontWeight: 800 }}>{log.status}</span>
                          <span style={{ fontSize: "0.65rem", color: "#94A3B8", marginLeft: "auto" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.url.split('?')[0].split('/').slice(-2).join('/') || log.url}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right: Log Details */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#0F172A" }}>
                  {selectedLogIndex !== null && logs[selectedLogIndex] ? (
                    (() => {
                      const log = logs[selectedLogIndex];
                      const safeRes = redactSensitiveData(log.responseBody);
                      const safeReq = redactSensitiveData(log.requestBody);

                      // Analysis for current issue
                      let itemsInfo = null;
                      if (safeRes && safeRes.bill) {
                        const items = safeRes.bill.items;
                        itemsInfo = {
                          present: items !== undefined,
                          type: items === null ? "null" : Array.isArray(items) ? "array" : typeof items,
                          count: Array.isArray(items) ? items.length : 0
                        };
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          {/* Top Info */}
                          <div style={{ background: "#1E293B", padding: "16px", borderRadius: "12px", border: "1px solid #334155" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {log.isError ? <AlertCircle color="#F87171" /> : <CheckCircle2 color="#4ADE80" />}
                                <div>
                                  <div style={{ fontSize: "0.85rem", color: "#94A3B8", fontWeight: 800 }}>{log.method} {log.status}</div>
                                  <div style={{ fontSize: "1rem", color: "white", fontWeight: 700, wordBreak: "break-all" }}>{log.url}</div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 800, textTransform: "uppercase" }}>Duration</div>
                                <div style={{ fontSize: "0.9rem", color: "white", fontWeight: 700 }}>{log.duration.toFixed(2)} ms</div>
                              </div>
                              <div>
                                <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 800, textTransform: "uppercase" }}>Timestamp</div>
                                <div style={{ fontSize: "0.9rem", color: "white", fontWeight: 700 }}>{log.timestamp}</div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => handleCopyAll(log)} style={{ background: "#2563EB", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 800 }}>
                              <Copy size={16} /> Copy All
                            </button>
                            <button onClick={() => handleCopyJson(log)} style={{ background: "#334155", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 800 }}>
                              <Copy size={16} /> Copy JSON
                            </button>
                          </div>

                          {/* Parsed Insights */}
                          {itemsInfo && (
                            <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                              <h3 style={{ fontSize: "0.85rem", color: "#38BDF8", margin: "0 0 10px 0", fontWeight: 800, textTransform: "uppercase" }}>Parsed Bill Insights</h3>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                                <div><div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Items Field</div><div style={{ color: "white", fontWeight: 700 }}>{itemsInfo.present ? "Present" : "Missing"}</div></div>
                                <div><div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Data Type</div><div style={{ color: "white", fontWeight: 700 }}>{itemsInfo.type}</div></div>
                                <div><div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Count</div><div style={{ color: "white", fontWeight: 700 }}>{itemsInfo.count} items</div></div>
                              </div>
                            </div>
                          )}

                          {/* Payload Details */}
                          {safeReq && (
                            <div>
                              <h3 style={{ fontSize: "0.85rem", color: "#94A3B8", margin: "0 0 8px 0", fontWeight: 800 }}>REQUEST PAYLOAD</h3>
                              <pre style={{ background: "#1E293B", padding: "16px", borderRadius: "12px", overflowX: "auto", fontSize: "0.8rem", color: "#E2E8F0", margin: 0 }}>
                                {JSON.stringify(safeReq, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div>
                            <h3 style={{ fontSize: "0.85rem", color: "#94A3B8", margin: "0 0 8px 0", fontWeight: 800 }}>RESPONSE JSON</h3>
                            {log.parseError && (
                              <div style={{ padding: "12px", background: "rgba(248, 113, 113, 0.1)", color: "#F87171", borderRadius: "8px", marginBottom: "12px", fontSize: "0.8rem" }}>
                                <strong>Parse Error:</strong> {log.parseError}
                              </div>
                            )}
                            <pre style={{ background: "#1E293B", padding: "16px", borderRadius: "12px", overflowX: "auto", fontSize: "0.8rem", color: "#E2E8F0", margin: 0, maxHeight: "500px" }}>
                              {JSON.stringify(safeRes, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748B", fontWeight: 700 }}>
                      Select a request to view details
                    </div>
                  )}
                </div>
                </>
              )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

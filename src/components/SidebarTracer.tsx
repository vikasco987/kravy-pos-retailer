"use client";

import React, { useState, useEffect } from "react";
import { Play, Square, Copy, Download, Trash2, Clock, AlertTriangle } from "lucide-react";

export default function SidebarTracer() {
  const [isTracing, setIsTracing] = useState(false);
  const [traces, setTraces] = useState<any[]>([]);
  const [activeTrace, setActiveTrace] = useState<any>(null);

  useEffect(() => {
    if (!isTracing) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href && target.href.includes("/dashboard")) {
        const url = new URL(target.href);
        const newTrace = {
          id: Date.now(),
          targetUrl: url.pathname,
          clickTime: performance.now(),
          clickTimestamp: new Date().toISOString(),
          apiCalls: [],
          completed: false,
          renderStartTime: null,
          pageReadyTime: null,
          totalDuration: null,
        };
        setActiveTrace(newTrace);
      }
    };

    const handleDebugEvent = (e: any) => {
      if (!activeTrace) return;
      const log = e.detail;
      setActiveTrace((prev: any) => {
        if (!prev || prev.completed) return prev;
        return {
          ...prev,
          apiCalls: [
            ...prev.apiCalls,
            {
              url: log.url,
              duration: log.duration,
              status: log.status,
              startTime: performance.now() - log.duration - prev.clickTime,
              endTime: performance.now() - prev.clickTime,
              size: log.responseBody ? JSON.stringify(log.responseBody).length : 0
            }
          ]
        };
      });
    };

    const handleNavigationEnd = () => {
       setTimeout(() => {
         setActiveTrace((prev: any) => {
            if (!prev || prev.completed) return prev;
            const now = performance.now();
            const total = now - prev.clickTime;
            const finalTrace = { ...prev, completed: true, totalDuration: total, pageReadyTime: total };
            setTraces((all) => [finalTrace, ...all]);
            return null;
         });
       }, 1500); 
    };

    window.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("agy-dev-debug", handleDebugEvent);
    window.addEventListener("popstate", handleNavigationEnd);

    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
      window.removeEventListener("agy-dev-debug", handleDebugEvent);
      window.removeEventListener("popstate", handleNavigationEnd);
    };
  }, [isTracing, activeTrace]);

  const generateReport = (trace: any) => {
    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `SIDEBAR PAGE LOAD TRACE\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `Page:\n${trace.targetUrl}\n\n`;
    report += `Sidebar Click:\n${trace.clickTimestamp}\n\n`;
    report += `Total Duration:\n${trace.totalDuration?.toFixed(2) || "N/A"} ms\n\n`;
    
    report += `──────────────────────────────────\n`;
    report += `LOADING BREAKDOWN\n`;
    report += `──────────────────────────────────\n\n`;
    report += `1. Sidebar Click\n   0 ms\n\n`;
    report += `2. API Requests\n`;
    let slowestApi: any = null;
    
    trace.apiCalls.forEach((api: any) => {
      if (!slowestApi || api.duration > slowestApi.duration) slowestApi = api;
      report += `   ${api.url.split('?')[0].split('/').slice(-2).join('/')}\n`;
      report += `   Started: +${Math.max(0, api.startTime).toFixed(2)} ms\n`;
      report += `   Duration: ${api.duration.toFixed(2)} ms\n`;
      report += `   Status: ${api.status}\n`;
      report += `   Response Size: ${(api.size / 1024).toFixed(2)} KB\n\n`;
    });

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `BOTTLENECK\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (slowestApi) {
      report += `SLOWEST OPERATION:\nGET ${slowestApi.url.split('?')[0]}\n\n`;
      report += `Duration:\n${slowestApi.duration.toFixed(2)} ms\n\n`;
      report += `Percentage of total load:\n${((slowestApi.duration / trace.totalDuration) * 100).toFixed(1)}%\n\n`;
      report += `Likely Layer:\nBackend/API\n`;
    } else {
       report += `No API calls detected. Likely Frontend/Rendering issue.\n`;
    }
    
    return report;
  };

  const copyReport = (trace: any) => {
    navigator.clipboard.writeText(generateReport(trace));
    alert("Trace Report Copied!");
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, color: "white", fontSize: "1rem", fontWeight: 800 }}>Navigation Tracer</h3>
          <p style={{ margin: "4px 0 0 0", color: "#94A3B8", fontSize: "0.8rem" }}>
            Identify exactly why sidebar pages load slowly.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => setIsTracing(!isTracing)} 
            style={{ background: isTracing ? "rgba(248, 113, 113, 0.2)" : "rgba(74, 222, 128, 0.2)", color: isTracing ? "#F87171" : "#4ADE80", border: `1px solid ${isTracing ? "#F87171" : "#4ADE80"}`, padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 800 }}
          >
            {isTracing ? <><Square size={16} /> Stop Trace</> : <><Play size={16} /> Start Trace</>}
          </button>
          <button 
            onClick={() => setTraces([])} 
            style={{ background: "#334155", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700 }}
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      {isTracing && (
        <div style={{ padding: "12px", background: "rgba(234, 179, 8, 0.1)", color: "#EAB308", borderRadius: "8px", border: "1px solid rgba(234, 179, 8, 0.3)", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={16} />
          Tracing is active. Click any sidebar item to record a performance trace.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {traces.length === 0 && !activeTrace && (
           <div style={{ textAlign: "center", color: "#64748B", padding: "40px", fontSize: "0.85rem", fontWeight: 700 }}>
              Click "Start Trace" and navigate to a page.
           </div>
        )}

        {activeTrace && (
           <div style={{ background: "#1E293B", border: "1px dashed #38BDF8", borderRadius: "12px", padding: "16px" }}>
              <div style={{ color: "#38BDF8", fontSize: "0.8rem", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} className="animate-spin" /> Recording trace for {activeTrace.targetUrl}...
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
                APIs captured so far: {activeTrace.apiCalls.length}
              </div>
           </div>
        )}

        {traces.map((trace) => (
          <div key={trace.id} style={{ background: "#1E293B", borderRadius: "12px", padding: "16px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ color: "white", fontWeight: 900, fontSize: "1rem" }}>{trace.targetUrl}</div>
                <div style={{ color: "#94A3B8", fontSize: "0.75rem", marginTop: "4px" }}>
                  {new Date(trace.clickTimestamp).toLocaleTimeString()} • {trace.totalDuration?.toFixed(2)} ms total
                </div>
              </div>
              <button 
                onClick={() => copyReport(trace)} 
                style={{ background: "#2563EB", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 800 }}
              >
                <Copy size={14} /> Copy Report
              </button>
            </div>
            
            <pre style={{ background: "#0F172A", padding: "16px", borderRadius: "8px", fontSize: "0.75rem", color: "#E2E8F0", overflowX: "auto", margin: 0, border: "1px solid #1E293B" }}>
              {generateReport(trace)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

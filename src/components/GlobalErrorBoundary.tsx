"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Global Error Caught:", error, errorInfo);
    
    // Check specifically for chunk load failures (Deployment mismatch / stale asset cache)
    const msg = error?.message || "";
    const isChunkLoadError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("ChunkLoadError");

    if (isChunkLoadError && typeof window !== "undefined") {
      const hasRetried = sessionStorage.getItem("kravy_chunk_retry_attempted");
      if (!hasRetried) {
        console.warn("Chunk load failure detected. Performing single safe reload...");
        sessionStorage.setItem("kravy_chunk_retry_attempted", "true");
        window.location.reload();
      }
    }
  }

  handleManualRetry = () => {
    if (typeof window !== "undefined") {
      // Clear chunk retry guard before manual retry
      try {
        sessionStorage.removeItem("kravy_chunk_retry_attempted");
      } catch (e) {}
      window.location.reload();
    }
  };

  handleGoToHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || "";
      const isChunkLoadError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Loading chunk") ||
        msg.includes("ChunkLoadError");

      return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", padding: "20px", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ backgroundColor: "white", padding: "36px", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: "24px", fontWeight: "bold" }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
              {isChunkLoadError ? "App Update Available" : "An Unexpected Error Occurred"}
            </h1>
            <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
              {isChunkLoadError
                ? "A new version of Kravy POS is active. Please refresh to load the latest application assets."
                : "A temporary error occurred in the current view. You can reload this page or return to the dashboard."}
            </p>
            {this.state.error?.message && (
              <div style={{ backgroundColor: "#f1f5f9", padding: "10px 14px", borderRadius: "8px", textAlign: "left", marginBottom: "20px", overflowX: "auto", border: "1px solid #e2e8f0" }}>
                <code style={{ fontSize: "12px", color: "#475569", wordBreak: "break-word" }}>{this.state.error.message}</code>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                onClick={this.handleManualRetry}
                style={{ backgroundColor: "#4f46e5", color: "white", border: "none", padding: "12px 20px", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "opacity 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
              >
                Reload Page
              </button>
              <button 
                onClick={this.handleGoToHome}
                style={{ backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "background-color 0.2s" }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

"use client";

import { useEffect, useState } from "react";
import { Database, Download, Upload, RefreshCw, Shield, Clock, CheckCircle, AlertCircle, HardDrive, Cloud, FileText, Calendar, Search, FileCode, ChevronRight, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmContext";
import { useAuthContext } from "@/components/AuthContext";

type BackupRecord = {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
  s3Url?: string;
  error?: string;
  createdAt: string;
}

export default function BackupPage() {
  const { user: authUser, loading: authLoading } = useAuthContext();
  const userRole = authUser?.type || null;

  const { confirm } = useConfirm();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  if (!authLoading && userRole && userRole !== "ADMIN" && userRole !== "OWNER") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Shield size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-[var(--kravy-text-primary)] mb-2">Access Restricted</h1>
        <p className="text-sm text-[var(--kravy-text-muted)] max-w-md">
          Security & Database Backup management is restricted strictly to Administrator users only.
        </p>
      </div>
    );
  }

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/admin/backups");
      if (res.ok) {
        const data = await res.json();
        setBackupHistory(data);
      }
    } catch (err) {
      console.error("Fetch backups failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);

    try {
      // Simulate progress waiting for server response
      const interval = setInterval(() => {
        setBackupProgress(p => (p >= 80 ? 80 : p + 15));
      }, 500);

      const res = await fetch("/api/admin/backups/create", { method: "POST" });
      clearInterval(interval);
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup failed");

      setBackupProgress(100);
      alert("Backup completed successfully! Saved as " + data.fileName);
    } catch (err: any) {
      alert("Backup failed: " + err.message);
    } finally {
      setTimeout(() => {
        setIsCreatingBackup(false);
        setBackupProgress(0);
      }, 1000);
    }
  };

  const handleDeleteBackup = async (id: string, fileName: string) => {
    if (!await confirm(`Are you sure you want to delete backup "${fileName}"?`)) return;

    try {
      const res = await fetch("/api/admin/backups/delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      alert("Backup deleted successfully");
      fetchBackups();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle size={16} style={{ color: "#10B981" }} />;
      case "in-progress": return <RefreshCw size={16} style={{ color: "#F59E0B" }} />;
      case "failed": return <AlertCircle size={16} style={{ color: "#EF4444" }} />;
      default: return <Clock size={16} style={{ color: "#6B7280" }} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>
            Data Backup & Recovery
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)", marginTop: "4px" }}>
            Secure your business data with automatic and manual backups.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {selectedBackup && (
            <button
               onClick={async () => setSelectedBackup(null)}
               style={{
                 background: "rgba(239, 68, 68, 0.1)",
                 color: "#EF4444",
                 border: "1px solid rgba(239, 68, 68, 0.2)",
                 padding: "12px 24px",
                 borderRadius: "12px",
                 fontWeight: 800,
                 fontSize: "0.9rem",
                 cursor: "pointer",
                 display: "flex",
                 alignItems: "center",
                 gap: "8px"
               }}
            >
              <RefreshCw size={18} /> Reset to Live
            </button>
          )}
          <button
            onClick={async () => {
              try {
                // Update button state (you might want to add loading state)
                const res = await fetch("/api/admin/backups/export-live-all"); 
                if (res.ok) {
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const exportDate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                  a.download = `Kravy_Full_Data_Export_${exportDate}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } else {
                  alert("Export failed: " + await res.text());
                }
              } catch (e) {
                alert("Error during export: " + e);
              }
            }}
            style={{
              background: "var(--kravy-surface)",
              color: "#10B981",
              border: "1px solid var(--kravy-border)",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "var(--kravy-card-shadow)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}
          >
            <FileText size={18} /> Export Full DB (Excel)
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            style={{
              background: isCreatingBackup ? "var(--kravy-border)" : "var(--kravy-brand)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: isCreatingBackup ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isCreatingBackup ? "none" : "0 8px 20px rgba(139,92,246,0.3)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}
          >
            {isCreatingBackup ? (
              <>
                <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                Creating...
              </>
            ) : (
              <>
                <Download size={18} /> Create Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backup Progress */}
      {isCreatingBackup && (
        <div style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: "rgba(245,158,11,0.1)", color: "#F59E0B",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--kravy-text-primary)", marginBottom: "4px" }}>
                Creating Backup...
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)" }}>
                Please wait while we secure your data
              </p>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F59E0B" }}>
              {backupProgress}%
            </div>
          </div>
          <div style={{
            width: "100%", height: "8px", background: "var(--kravy-bg-2)",
            borderRadius: "10px", overflow: "hidden"
          }}>
            <div style={{
              width: `${backupProgress}%`, height: "100%",
              background: "var(--kravy-brand)",
              borderRadius: "10px", transition: "width 0.3s ease",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)"
            }} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: "rgba(16,185,129,0.1)", color: "#10B981",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>{backupHistory.length}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Total Backups</div>
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "rgba(139, 92, 246, 0.15)", color: "var(--kravy-brand)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <HardDrive size={24} />
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-0.5px" }}>
                {(backupHistory.reduce((acc, b) => acc + (b.fileSize || 0), 0) / (1024 * 1024)).toFixed(1)}
              </div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Size (MB)</div>
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: "rgba(245,158,11,0.1)", color: "#F59E0B",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Cloud size={24} />
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--kravy-text-primary)" }}>Auto</div>
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>Backup Mode</div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div style={{
        background: "var(--kravy-surface)",
        border: "1px solid var(--kravy-border)",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "var(--kravy-card-shadow)"
      }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "20px" }}>
          Backup Settings
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "rgba(16,185,129,0.1)", color: "#10B981",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--kravy-text-primary)", marginBottom: "2px" }}>
                Automatic Backup
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>Daily at 2:00 AM</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "rgba(139, 92, 246, 0.15)", color: "var(--kravy-brand)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "2px" }}>
                Encryption
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontStyle: "italic" }}>AES-256 Enabled</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "rgba(245,158,11,0.1)", color: "#F59E0B",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--kravy-text-primary)", marginBottom: "2px" }}>
                Retention Period
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontStyle: "italic" }}>30 Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Explorer */}
      <CollectionExplorer source={selectedBackup} onReset={() => setSelectedBackup(null)} />

      {/* Backup History */}
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "20px" }}>
          Backup History
        </h2>
        <div style={{
          background: "var(--kravy-surface)",
          border: "1px solid var(--kravy-border)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "var(--kravy-card-shadow)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--kravy-bg-2)" }}>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>Date & Time</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>Size</th>
                  <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>Status</th>
                  <th style={{ padding: "16px", textAlign: "center", fontSize: "0.85rem", fontWeight: 700, color: "var(--kravy-text-muted)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backupHistory.map((backup) => (
                  <tr key={backup.id} style={{ borderBottom: "1px solid var(--kravy-border)" }}>
                    <td style={{ padding: "16px", color: "var(--kravy-text-primary)", fontWeight: 500 }}>
                      {new Date(backup.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "16px", color: "var(--kravy-text-muted)" }}>
                      {(backup.fileSize / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {getStatusIcon(backup.status.toLowerCase())}
                        <span style={{ fontSize: "0.85rem", color: "var(--kravy-text-muted)", fontWeight: 500 }}>
                          {backup.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                        <button 
                          onClick={async () => setSelectedBackup(backup.filename)}
                          style={{
                               background: selectedBackup === backup.filename ? "var(--kravy-brand)" : "rgba(139, 92, 246, 0.1)",
                               color: selectedBackup === backup.filename ? "white" : "var(--kravy-brand)",
                               border: "none", borderRadius: "10px", padding: "6px 12px", cursor: "pointer",
                               fontSize: "0.75rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px"
                          }}
                        >
                          <Search size={14} /> Inspect
                        </button>
                        <DownloadButton fileName={backup.filename} />
                        <button 
                          onClick={async () => handleDeleteBackup(backup.id, backup.filename)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#EF4444",
                            border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px"
                          }}
                          title="Delete Backup"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadButton({ fileName }: { fileName: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/backups/download?file=${fileName}`);
      const data = await res.json();
      
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Failed to generate download link. Please check your AWS configuration.");
      }
    } catch (error) {
      console.error("Download Error:", error);
      alert("Error generating download link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={loading}
      style={{
        background: loading ? "var(--kravy-bg-2)" : "rgba(59,130,246,0.1)", 
        color: loading ? "var(--kravy-text-muted)" : "#3B82F6",
        border: "none", borderRadius: "8px", padding: "6px", cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px"
      }}
      title="Download Backup"
    >
      {loading ? (
        <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Download size={16} />
      )}
    </button>
  );
}
function CollectionExplorer({ source, onReset }: { source: string | null, onReset: () => void }) {
  const [collections, setCollections] = useState<{name: string, count: number}[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      try {
        const url = source 
          ? `/api/admin/backups/inspect?file=${source}` 
          : "/api/admin/backups/collections";
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (source) {
           // Response from inspect is { fileName, collections }
           setCollections(data.collections || []);
        } else {
           // Response from collections is direct array
           setCollections(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Explorer Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [source]);

  const handleExport = (format: 'excel' | 'json', model: string) => {
    let url = `/api/admin/backups/export?format=${format}&model=${model}`;
    if (source) url += `&file=${source}`;
    window.open(url, "_blank");
  };

  const filtered = collections.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      background: "var(--kravy-surface)",
      border: "1px solid var(--kravy-border)",
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "var(--kravy-card-shadow)",
      borderLeft: source ? "8px solid var(--kravy-brand)" : "1px solid var(--kravy-border)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--kravy-text-primary)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
            {source ? <><Shield size={20} style={{ color: "var(--kravy-brand)" }} /> Backup Explorer</> : "Live Data Explorer"}
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)" }}>
            {source ? `Inspecting file: ${source}` : "Inspect and export individual tables directly from MongoDB"}
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", flex: "1", maxWidth: "450px" }}>
            <div style={{ position: "relative", flex: "1" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--kravy-text-muted)" }} />
              <input 
                placeholder="Search collections..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 10px 10px 40px",
                  background: "var(--kravy-bg-2)",
                  border: "1px solid var(--kravy-border)",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  color: "var(--kravy-text-primary)",
                  outline: "none"
                }}
              />
            </div>
            {source && (
                 <button 
                   onClick={onReset}
                   style={{
                     padding: "0 16px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)",
                     borderRadius: "12px", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer"
                   }}
                 >
                   Exit
                 </button>
            )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", color: "var(--kravy-brand)" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {filtered.map(col => (
            <div key={col.name} style={{
              padding: "16px",
              background: source ? "rgba(139, 92, 246, 0.02)" : "var(--kravy-surface)",
              border: source ? "1px solid rgba(139, 92, 246, 0.1)" : "1px solid var(--kravy-border)",
              borderRadius: "18px",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ 
                    width: "32px", height: "32px", borderRadius: "8px", 
                    background: source ? "rgba(139, 92, 246, 0.1)" : "rgba(16, 185, 129, 0.1)", 
                    color: source ? "var(--kravy-brand)" : "#10B981", 
                    display: "flex", alignItems: "center", justifyContent: "center" 
                  }}>
                    <Database size={16} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--kravy-text-primary)" }}>{col.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}>{col.count} Records</p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={async () => handleExport('excel', col.name)}
                  style={{
                    flex: 1,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10B981",
                    border: "none",
                    padding: "8px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <FileText size={14} /> Excel
                </button>
                <button 
                  onClick={async () => handleExport('json', col.name)}
                  style={{
                    flex: 1,
                    background: "rgba(245, 158, 11, 0.1)",
                    color: "#F59E0B",
                    border: "none",
                    padding: "8px",
                    borderRadius: "10px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <FileCode size={14} /> JSON
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "var(--kravy-text-muted)" }}>
              No collections found matching "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

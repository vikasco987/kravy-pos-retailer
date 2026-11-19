"use client";

import { useCurrency } from '@/lib/currency-context';
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useProfileCache } from "@/hooks/useProfileCache";
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Search, 
  Plus, 
  Download, 
  Edit2, 
  Trash2, 
  History as HistoryIcon, 
  ChevronRight, 
  CreditCard, 
  Award, 
  ArrowRight, 
  ArrowDown,
  ArrowUp,
  MessageSquare,
  Filter, 
  X,
  FileText,
  LayoutGrid,
  List,
  Printer,
  Wallet,
  Share2,
  Paperclip,
  ExternalLink,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
  Cake,
  Copy,
  Check,
  Sparkles,
  Crown,
  Flame,
  Heart,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence, animate as fmAnimate } from "framer-motion";
import { OrderDetailsPanel } from "@/app/dashboard/billing/components/OrderDetailsPanel";
import { kravy } from "@/lib/sounds";
import { useConfirm } from "@/components/ConfirmContext";
import OfflineFallback from "@/components/OfflineFallback";
import { useOffline } from "@/components/OfflineContext";

type Party = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  dob?: string | null;
  loyaltyPoints?: number;
  walletBalance?: number;
  [k: string]: any;
};

type Bill = {
  id: string;
  billNumber: string;
  total: number;
  paymentStatus: string;
  paymentMode: string;
  createdAt: string;
  amountPaid?: number;
  balanceDue?: number;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return d;
  }
}

function getRelativeTime(d?: string | null) {
  if (!d) return "0 days ago";
  try {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "0 days ago";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return "Recently";
  }
}

/* ---------- Premium UI helpers (animations + smart customer insights) ---------- */

const VIP_POINTS = 500;

// Days until the next birthday (Infinity if DOB missing/invalid). 0 = today.
function daysToBirthday(dob?: string | null): number {
  if (!dob) return Infinity;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function birthdayLabel(dob?: string | null): string | null {
  const n = daysToBirthday(dob);
  if (n === 0) return "Birthday today!";
  if (n === 1) return "Birthday tomorrow";
  if (n <= 30) return `Birthday in ${n}d`;
  return null;
}

function parseDateFlexible(d?: string | null): Date | null {
  if (!d) return null;
  const s = d.trim();
  if (!s) return null;
  // Try direct parse
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    // Check if parts[2] is 4 digits (DD-MM-YYYY)
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

function getAnniversaryDate(p: Party): string | null {
  if (!p) return null;
  if (p.anniversary) return p.anniversary;
  if (p.remarks && typeof p.remarks === "string" && p.remarks.includes("Anniversary:")) {
    const raw = p.remarks.split("Anniversary:")[1].trim();
    const clean = raw.split("|")[0].split(";")[0].trim();
    if (clean) return clean;
  }
  return null;
}

function daysToAnniversary(p: Party): number {
  const anniStr = getAnniversaryDate(p);
  if (!anniStr) return Infinity;
  const d = parseDateFlexible(anniStr);
  if (!d) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function anniversaryLabel(p: Party): string | null {
  const n = daysToAnniversary(p);
  if (n === 0) return "Anniversary today!";
  if (n === 1) return "Anniversary tomorrow";
  if (n <= 30) return `Anniversary in ${n}d`;
  return null;
}


function getTier(points = 0) {
  if (points > VIP_POINTS) return { name: "GOLD", gradient: "from-amber-400 via-yellow-500 to-orange-500", ring: "ring-amber-400/70", text: "text-amber-600" };
  if (points > 100) return { name: "SILVER", gradient: "from-slate-300 via-slate-400 to-slate-500", ring: "ring-slate-300/70", text: "text-slate-500" };
  return { name: "MEMBER", gradient: "from-indigo-400 via-indigo-500 to-violet-600", ring: "ring-indigo-400/50", text: "text-indigo-500" };
}

// Smooth count-up number
function CountUp({ value, decimals = 0, prefix = "" }: { value: number; decimals?: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = fmAnimate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}</>;
}

// Staggered list animation variants
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

function CopyPhoneButton({ phone, className = "" }: { phone: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        try { navigator.clipboard?.writeText(phone); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={className}
      title={copied ? "Copied!" : "Copy phone number"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? "c" : "n"} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="flex">
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function PartiesSkeleton() {
  return (
    <div className="w-full space-y-5">
      <div className="h-24 rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-64 rounded-3xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
      </div>
    </div>
  );
}

export default function PartiesPage() {
  const { currencySymbol: sym } = useCurrency();
  const { confirm } = useConfirm();
  const { isOffline, cachePartiesToLocal, getCachedPartiesFromLocal, saveOfflineParty, saveOfflineWalletTx } = useOffline();
  const receiptRef = React.useRef<HTMLDivElement>(null);
  const { profile: business } = useProfileCache();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // UI state
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "phone" | "dob">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "balance" | "vip" | "birthday" | "anniversary">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // modal for add / edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);

  // Bill History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyBills, setPartyBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [activeTab, setActiveTab] = useState<"bills" | "wallet">("bills");
  const [mounted, setMounted] = useState(false);

  // Deposit Modal State
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositingParty, setDepositingParty] = useState<Party | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositType, setDepositType] = useState<"deposit" | "withdraw" | "udhar">("deposit");
  const [depositRemark, setDepositRemark] = useState("");
  const [depositProof, setDepositProof] = useState<File | null>(null);
  const [cardActionParty, setCardActionParty] = useState<Party | null>(null);

  // Edit Transaction State
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editTxType, setEditTxType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editRemarkText, setEditRemarkText] = useState("");
  const [editRemarkLoading, setEditRemarkLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9; // 3x3 grid or 9 rows

  // View Mode Preference
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [userPrefs, setUserPrefs] = useState<any>({});
  const [openMenuPartyId, setOpenMenuPartyId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuPartyId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  useEffect(() => {
    setMounted(true);
    fetchParties();
    fetchUserPrefs();
  }, []);

  useEffect(() => {
    if (modalOpen || historyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [modalOpen, historyOpen]);

  async function fetchUserPrefs() {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const data = await res.json();
        const prefs = data.uiPreferences || {};
        setUserPrefs(prefs);
        if (prefs.partiesView) {
          setViewMode(prefs.partiesView);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user prefs:", err);
    }
  }

  async function saveViewPreference(mode: "grid" | "table") {
    try {
      const newPrefs = { ...userPrefs, partiesView: mode };
      setUserPrefs(newPrefs);
      setViewMode(mode);

      await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uiPreferences: newPrefs })
      });
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  }

  async function fetchParties() {
    setLoading(true);
    setError(null);

    // 1. First, instantly load from local IndexedDB cache if available
    try {
      const cached = await getCachedPartiesFromLocal();
      if (cached && cached.length > 0) {
        setParties(cached);
        setLastSyncTime(cached[0]?.cachedAt || Date.now());
        setLoading(false);
      }
    } catch (cacheErr) {
      console.warn("[PartiesPage] Local cache read error:", cacheErr);
    }

    // 2. If online, fetch fresh server data and update IndexedDB cache in background
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/parties?limit=none`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch parties`);
      const data = await res.json();
      
      const normalized = (Array.isArray(data) ? data : data.parties || []).map((p: any) => ({
        ...p,
        id: p.id || p._id,
        name: p.name || "Unnamed",
        phone: p.phone || "—",
        address: p.address || "",
        dob: p.dob || null,
        loyaltyPoints: p.loyaltyPoints || 0,
      }));

      setParties(normalized);
      setLastSyncTime(Date.now());
      // Commit fresh customer data to IndexedDB
      cachePartiesToLocal(normalized).catch(() => {});
    } catch (err: any) {
      // If we already loaded cached parties, don't show full-page error
      setParties(prev => {
        if (prev.length === 0) {
          setError(err.message);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }

  const totalPositiveBalance = useMemo(() => {
    return parties.reduce((sum, p) => (p.walletBalance && p.walletBalance > 0 ? sum + p.walletBalance : sum), 0);
  }, [parties]);

  const totalNegativeBalance = useMemo(() => {
    return parties.reduce((sum, p) => (p.walletBalance && p.walletBalance < 0 ? sum + Math.abs(p.walletBalance) : sum), 0);
  }, [parties]);

  const visible = useMemo(() => {
    const lower = q.trim().toLowerCase();
    let arr = parties.filter((p) => {
      // Filter tab
      if (filterTab === "balance" && (p.walletBalance || 0) === 0) return false;
      if (filterTab === "vip" && (p.loyaltyPoints || 0) <= 500) return false;
      if (filterTab === "birthday" && daysToBirthday(p.dob) > 30) return false;
      if (filterTab === "anniversary" && daysToAnniversary(p) > 30) return false;
      if (filterTab === "active" && (p.walletBalance || 0) === 0 && (p.loyaltyPoints || 0) === 0 && (!p.createdAt || new Date(p.createdAt) <= new Date(Date.now() - 30*24*60*60*1000))) return false;

      if (!lower) return true;
      return (
        p.name.toLowerCase().includes(lower) ||
        p.phone.toLowerCase().includes(lower) ||
        (p.address || "").toLowerCase().includes(lower)
      );
    });

    arr.sort((a: any, b: any) => {
      if (filterTab === "birthday") return daysToBirthday(a.dob) - daysToBirthday(b.dob);
      if (filterTab === "anniversary") return daysToAnniversary(a) - daysToAnniversary(b);
      const A = (a[sortBy] || "").toString().toLowerCase();
      const B = (b[sortBy] || "").toString().toLowerCase();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [parties, q, sortBy, sortDir, filterTab]);

  // Reset to page 1 when search or sort or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, sortBy, sortDir, filterTab]);

  const totalPages = Math.ceil(visible.length / pageSize);
  const paginatedParties = useMemo(() => {
    return visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [visible, currentPage]);

  function pushToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchBillHistory = async (party: Party) => {
    setSelectedParty(party);
    setHistoryOpen(true);
    setLoadingBills(true);
    try {
      const res = await fetch(`/api/parties/${party.id}/bills`);
      if (res.ok) {
        const data = await res.json();
        setPartyBills(data.bills || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingBills(false);
    }
    
    // Also fetch wallet transactions
    setLoadingWallet(true);
    try {
      const res = await fetch(`/api/wallet/history/${party.id}`);
      if (res.ok) {
        const data = await res.json();
        setWalletTransactions(data);
      }
    } catch (err) {
      console.error("Error fetching wallet history:", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handlePrint = async (type: "BILL" | "DEPOSIT", data: any) => {
    let fullData = data;
    
    // For bills, we need to fetch items if they aren't present
    if (type === "BILL" && !data.items) {
      try {
        const res = await fetch(`/api/bill-manager/${data.id}`);
        if (res.ok) {
          const json = await res.json();
          fullData = json.bill;
        }
      } catch (err) {
        console.error("Failed to fetch full bill details:", err);
      }
    }

    setPrintData(fullData);
    
    // Use the runPrintJob pattern for perfect styles
    setTimeout(() => {
      const html = receiptRef.current?.innerHTML;
      if (!html) return;
      
      const containerId = "print-container-parties";
      const styleId = "print-style-parties";

      // Clean existing
      document.getElementById(containerId)?.remove();
      document.getElementById(styleId)?.remove();

      // Style
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        @media print {
          html, body { height: auto !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > *:not(#${containerId}) { display: none !important; }
          @page { margin: 0; size: 58mm auto; }
          #${containerId} {
            display: block !important;
            height: fit-content !important;
            width: 100% !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
          * { 
            
             
            color-adjust: exact !important; 
            box-shadow: none !important; 
            text-shadow: none !important; 
          }
        }
      `;
      document.head.appendChild(style);

      // Container
      const container = document.createElement("div");
      container.id = containerId;
      container.innerHTML = html;

      // Add physical bottom spacer for thermal feeds past cutter to prevent jamming
      const spacer = document.createElement("div");
      spacer.style.height = "80px";
      spacer.style.minHeight = "80px";
      spacer.style.display = "block";
      spacer.style.clear = "both";
      container.appendChild(spacer);

      document.body.appendChild(container);

      window.print();

      setTimeout(() => {
        container.remove();
        style.remove();
      }, 15000);
    }, 50);
  };

  // State for dynamic print content
  const [printData, setPrintData] = useState<any>(null);

  const handleDelete = async (id: string) => {
    pushToast("error", "Deletion is disabled to maintain data integrity. Please contact administrator.");
  };

  const handlePayBill = async (bill: any) => {
    if (!await confirm(`Mark bill ${bill.billNumber} as Paid? This will clear the due amount.`)) return;
    try {
      const res = await fetch(`/api/bill-manager/${bill.id}/pay`, {
        method: "POST"
      });
      if (res.ok) {
        pushToast("success", "Bill marked as paid successfully.");
        if (selectedParty) fetchBillHistory(selectedParty);
      } else {
        pushToast("error", "Failed to update bill.");
      }
    } catch (e) {
      pushToast("error", "Error marking bill as paid.");
    }
  };

  const exportCSV = () => {
    const header = ["Name", "Phone", "Address", "DOB", "Loyalty Points"];
    const rows = visible.map(p => [p.name, p.phone, p.address || "", p.dob || "", p.loyaltyPoints || 0]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customers_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDeposit = async () => {
    if (!depositingParty || !depositAmount || parseFloat(depositAmount) <= 0) return;
    setDepositLoading(true);
    const actionText = depositType === 'deposit' ? 'Deposited' : depositType === 'withdraw' ? 'Withdrawn' : 'Given as Udhar';
    const fallbackDesc = depositType === 'deposit' ? 'Manual Cash Deposit' : depositType === 'withdraw' ? 'Manual Cash Withdrawal' : 'Udhar (Credit Given)';
    let proofUrl = null;
    if (depositProof) {
      try {
        const { uploadToAWS } = await import("@/lib/upload-client");
        proofUrl = await uploadToAWS(depositProof);
      } catch (e: any) {
        console.error("Proof upload failed:", e);
        pushToast("error", e?.message || "Failed to upload proof");
        setDepositLoading(false);
        return;
      }
    }

    // OFFLINE WALLET TRANSACTION (PHASE C)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const amt = parseFloat(depositAmount);
        await saveOfflineWalletTx({
          partyId: depositingParty.id,
          action: depositType,
          amount: amt,
          description: depositRemark.trim() || fallbackDesc,
          paymentProof: null
        });

        const delta = (depositType === "deposit") ? amt : -amt;
        const currentBal = depositingParty.walletBalance || 0;
        const provBal = currentBal + delta;

        setParties(p => p.map(x => x.id === depositingParty.id ? { ...x, walletBalance: provBal } : x));
        pushToast("success", `Saved Offline (${actionText}) — Waiting for Sync`);
        setDepositOpen(false);
        setDepositAmount("");
        setDepositRemark("");
        setDepositType("deposit");
        setDepositProof(null);
      } catch (offlineErr) {
        pushToast("error", "Error saving offline transaction");
      } finally {
        setDepositLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: depositType,
          partyId: depositingParty.id,
          amount: parseFloat(depositAmount),
          description: depositRemark.trim() || fallbackDesc,
          paymentProof: proofUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setParties(p => p.map(x => x.id === depositingParty.id ? { ...x, walletBalance: data.balance } : x));
        pushToast("success", `${actionText} ₹${depositAmount} successfully!`);
        setDepositOpen(false);
        setDepositAmount("");
        setDepositRemark("");
        setDepositType("deposit");
        setDepositProof(null);
      } else {
        const errJson = await res.json();
        pushToast("error", errJson.error || `${depositType === 'deposit' ? 'Deposit' : 'Withdrawal'} failed`);
      }
    } catch (err) {
      pushToast("error", `Error processing ${depositType}`);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleSaveEditTx = async () => {
    if (!editingTx) return;
    setEditRemarkLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          transactionId: editingTx.id,
          type: editTxType,
          amount: parseFloat(editTxAmount) || 0,
          description: editRemarkText.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transaction) {
          setWalletTransactions(prev => prev.map(tx => tx.id === editingTx.id ? data.transaction : tx));
        }
        if (data.balance !== undefined && data.balance !== null && selectedParty) {
          setSelectedParty(prev => prev ? { ...prev, walletBalance: data.balance } : null);
          setParties(p => p.map(x => x.id === selectedParty.id ? { ...x, walletBalance: data.balance } : x));
        }
        pushToast("success", "Transaction updated & wallet balance adjusted!");
        setEditingTx(null);
      } else {
        const data = await res.json();
        pushToast("error", data.error || "Failed to update transaction");
      }
    } catch (err) {
      pushToast("error", "Error updating transaction");
    } finally {
      setEditRemarkLoading(false);
    }
  };

  const handleDeleteTx = async (tx: any) => {
    if (!await confirm(`Are you sure you want to delete this ${tx.type === 'CREDIT' ? 'Deposit' : 'Withdrawal'} transaction of ₹${tx.amount}? Customer wallet balance will be reverted.`)) return;
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          transactionId: tx.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWalletTransactions(prev => prev.filter(x => x.id !== tx.id));
        if (data.balance !== undefined && data.balance !== null && selectedParty) {
          setSelectedParty(prev => prev ? { ...prev, walletBalance: data.balance } : null);
          setParties(p => p.map(x => x.id === selectedParty.id ? { ...x, walletBalance: data.balance } : x));
        }
        pushToast("success", "Transaction deleted & wallet balance reverted!");
        if (editingTx?.id === tx.id) setEditingTx(null);
      } else {
        const errJson = await res.json();
        pushToast("error", errJson.error || "Failed to delete transaction");
      }
    } catch (err) {
      pushToast("error", "Error deleting transaction");
    }
  };

  if (loading) return <PartiesSkeleton />;

  if (error && parties.length === 0) {
    const isNetworkError = typeof navigator !== "undefined" && !navigator.onLine;
    if (isNetworkError) {
      return (
        <OfflineFallback 
          moduleName="Customer Parties & Udhar" 
          description="Customer accounts, credit balances, and transaction history require initial cloud sync before they can be accessed offline. In Phase B, this data will be automatically cached to your device."
          actionHref="/dashboard/billing/checkout"
          actionLabel="Go to Quick POS Billing"
        />
      );
    }
  }

  return (
    <>
      <div className="w-full space-y-4 animate-in fade-in duration-700">
        
        {/* ================= MOBILE VIEW TOP SECTION (Matching Reference Image 2) ================= */}
        <div className="md:hidden space-y-3 pb-1">
          {/* Mobile Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                Customers
              </h1>
              <p className="text-[11px] font-bold text-[var(--kravy-text-muted)]">
                {parties.length} Total Customers
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={exportCSV}
                className="p-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl shadow-xs active:scale-95 transition-transform"
                title="Export CSV"
              >
                <Download size={15} />
              </button>
              <button 
                onClick={() => { setEditing({ id: "new", name: "", phone: "", address: "", loyaltyPoints: 0 }); setModalOpen(true); }}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-600/30 active:scale-95 transition-transform"
              >
                <Plus size={15} /> Add Party
              </button>
            </div>
          </div>

          {/* Mobile 3-Metric Summary Cards (Matching Reference Image 2) */}
          <motion.div variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-2">
            {/* Card 1: You'll Get (Receivable / Udhar) */}
            <motion.div variants={itemVariants} whileTap={{ scale: 0.96 }} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-2.5 flex flex-col justify-between">
              <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <span>You&apos;ll Get</span>
                <ArrowDown size={11} className="text-emerald-600" />
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate mt-1">
                <CountUp value={totalNegativeBalance} decimals={2} prefix={sym} />
              </div>
            </motion.div>

            {/* Card 2: You'll Give (Advance / Store Credit) */}
            <motion.div variants={itemVariants} whileTap={{ scale: 0.96 }} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl p-2.5 flex flex-col justify-between">
              <div className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-0.5">
                <span>You&apos;ll Give</span>
                <ArrowUp size={11} className="text-rose-600" />
              </div>
              <div className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 truncate mt-1">
                <CountUp value={totalPositiveBalance} decimals={2} prefix={sym} />
              </div>
            </motion.div>

            {/* Card 3: Total Customers */}
            <motion.div variants={itemVariants} whileTap={{ scale: 0.96 }} className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-2.5 flex flex-col justify-between">
              <div className="text-[10px] font-extrabold text-[var(--kravy-text-muted)] truncate">
                Total Customers
              </div>
              <div className="text-xs sm:text-sm font-black text-[var(--kravy-text-primary)] truncate mt-1">
                <CountUp value={parties.length} />
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile Filter Tabs Row (Matching Reference Image 2) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-xl text-[var(--kravy-text-primary)] flex-shrink-0 flex items-center gap-1 shadow-xs"
              title={`Sort: ${sortBy.toUpperCase()} (${sortDir.toUpperCase()})`}
            >
              <Filter size={13} className={sortDir === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {[
              { id: "all", label: `All (${parties.length})` },
              { id: "active", label: `Active (${parties.filter(p => (p.walletBalance || 0) !== 0 || (p.loyaltyPoints || 0) > 0 || (p.createdAt && new Date(p.createdAt) > new Date(Date.now() - 30*24*60*60*1000))).length})` },
              { id: "balance", label: `Balance (${parties.filter(p => (p.walletBalance || 0) !== 0).length})` },
              { id: "vip", label: `VIP (${parties.filter(p => (p.loyaltyPoints || 0) > 500).length})` },
              { id: "birthday", label: `🎂 Birthdays (${parties.filter(p => daysToBirthday(p.dob) <= 30).length})` },
              { id: "anniversary", label: `💍 Anniversaries (${parties.filter(p => daysToAnniversary(p) <= 30).length})` }
            ].map(tab => {
              const active = filterTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${
                    active 
                      ? "text-white dark:text-slate-900" 
                      : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="mobileFilterPill"
                      className="absolute inset-0 rounded-xl bg-slate-900 dark:bg-white shadow-md"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-[1]">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Mobile Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" size={16} />
            <input 
              type="text"
              placeholder="Search Customers by name, phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl outline-none focus:border-[var(--kravy-brand)] font-medium text-xs sm:text-sm"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ================= DESKTOP VIEW TOP SECTION (Preserved for Laptop) ================= */}
        <div className="hidden md:block space-y-4">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative overflow-hidden flex flex-wrap items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-3xl border border-[var(--kravy-border)] bg-gradient-to-br from-indigo-500/10 via-[var(--kravy-surface)] to-fuchsia-500/10"
          >
            <motion.div aria-hidden animate={{ x: [0, 30, 0], y: [0, -10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <motion.div aria-hidden animate={{ x: [0, -30, 0], y: [0, 12, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -bottom-12 right-10 w-44 h-44 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="relative flex items-center gap-2.5 sm:gap-3">
              <motion.div whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.5 }} className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40 flex-shrink-0">
                <User className="text-white" size={22} />
              </motion.div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                  Customer CRM
                </h1>
                <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Database & Loyalty Management</span>
                  {lastSyncTime && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-500 font-mono">Synced {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="relative flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => saveViewPreference("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-[var(--kravy-brand)] text-white shadow-md" : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg-2)]"}`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => saveViewPreference("table")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-[var(--kravy-brand)] text-white shadow-md" : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg-2)]"}`}
                  title="Table View"
                >
                  <List size={16} />
                </button>
              </div>
              <button 
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-[var(--kravy-bg-2)] transition-all shadow-sm"
              >
                <Download size={14} /> Export
              </button>
              <button 
                onClick={() => { setEditing({ id: "new", name: "", phone: "", address: "", loyaltyPoints: 0 }); setModalOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 sm:py-2.5 bg-[var(--kravy-brand)] text-white rounded-xl font-black text-[10px] uppercase tracking-wider hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Plus size={16} /> Add Party
              </button>
            </div>
          </motion.div>

          {/* Stats Cards (Scrollable on < 1024px, 4-column Grid on >= 1024px) */}
          <div className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2 px-1 snap-x">
            <div className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 flex-1 snap-start">
              <StatCard 
                icon={<User className="text-blue-500" size={24} />} 
                label="Total Customers" 
                value={parties.length} 
                sub="Loyal active base"
              />
            </div>
            <div className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 flex-1 snap-start">
              <StatCard 
                icon={<Award className="text-amber-500" size={24} />} 
                label="Top Tier" 
                value={parties.filter(p => (p.loyaltyPoints || 0) > 500).length} 
                sub="Above 500 points"
              />
            </div>
            <div className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 flex-1 snap-start">
              <StatCard 
                icon={<CreditCard className="text-emerald-500" size={24} />} 
                label="Recent Activity" 
                value={parties.filter(p => new Date(p.createdAt) > new Date(Date.now() - 7*24*60*60*1000)).length} 
                sub="Last 7 days"
              />
            </div>
            <div className="min-w-[260px] sm:min-w-[280px] lg:min-w-0 flex-1 snap-start">
              <StatCard 
                icon={<MapPin className="text-rose-500" size={20} />} 
                label="Local Network" 
                value={new Set(parties.map(p => p.address?.split(',')[0])).size} 
                sub="Locations covered"
              />
            </div>
          </div>

          {/* Quick filter chips (desktop) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "All", count: parties.length, icon: <User size={13} /> },
              { id: "active", label: "Active", count: parties.filter(p => (p.walletBalance || 0) !== 0 || (p.loyaltyPoints || 0) > 0 || (p.createdAt && new Date(p.createdAt) > new Date(Date.now() - 30*24*60*60*1000))).length, icon: <Flame size={13} /> },
              { id: "balance", label: "Balance", count: parties.filter(p => (p.walletBalance || 0) !== 0).length, icon: <Wallet size={13} /> },
              { id: "vip", label: "VIP", count: parties.filter(p => (p.loyaltyPoints || 0) > VIP_POINTS).length, icon: <Crown size={13} /> },
              { id: "birthday", label: "Birthdays (30d)", count: parties.filter(p => daysToBirthday(p.dob) <= 30).length, icon: <Cake size={13} /> },
              { id: "anniversary", label: "Anniversaries (30d)", count: parties.filter(p => daysToAnniversary(p) <= 30).length, icon: <Heart size={13} className="text-rose-400" /> },
            ].map((tab) => {
              const active = filterTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${active ? "text-white" : "bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"}`}
                >
                  {active && (
                    <motion.span layoutId="desktopFilterPill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
                  )}
                  <span className="relative z-[1] flex items-center gap-1.5">{tab.icon}{tab.label}
                    <span className={`px-1.5 rounded-md text-[10px] ${active ? "bg-white/25" : "bg-[var(--kravy-bg-2)]"}`}>{tab.count}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="sticky top-0 z-10 bg-[rgba(var(--kravy-bg-rgb),0.92)] backdrop-blur-xl p-2.5 sm:p-3 border border-[var(--kravy-border)] rounded-2xl shadow-md flex flex-col md:flex-row items-center gap-3 transition-all">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--kravy-text-muted)]" size={18} />
              <input 
                type="text"
                placeholder="Search by name, phone or location..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl outline-none focus:border-[var(--kravy-brand)] font-medium transition-all text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] rounded-xl p-1">
                {(["name", "phone", "dob"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortBy(mode)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === mode ? 'bg-[var(--kravy-brand)] text-white shadow-md' : 'text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg-2)]'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-3 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl hover:bg-[var(--kravy-bg-2)] transition-all"
              >
                <Filter size={16} className={sortDir === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>
          </div>
        </div>

        {/* ================= CUSTOMERS LIST (Mobile List vs Desktop Grid/Table) ================= */}
        {visible.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-4">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} className="w-16 h-16 bg-[var(--kravy-bg-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-[var(--kravy-text-muted)]" size={32} />
            </motion.div>
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">No customers found</h3>
            <p className="text-[var(--kravy-text-muted)] text-xs max-w-xs mx-auto">Try adjusting your search filters or add a new party member.</p>
          </motion.div>
        ) : (
          <>
            {/* Mobile View: Dedicated modern list of cards (matching Reference Image 2) */}
            <motion.div key={`m-${filterTab}-${currentPage}-${q}`} variants={listVariants} initial="hidden" animate="show" className="md:hidden flex flex-col gap-3.5 pb-28">
              {paginatedParties.map((p) => (
                <MobileCustomerCard
                  key={p.id}
                  p={p}
                  sym={sym}
                  isMenuOpen={openMenuPartyId === p.id}
                  onToggleMenu={(e) => {
                    e.stopPropagation();
                    setOpenMenuPartyId((prev) => (prev === p.id ? null : p.id));
                  }}
                  onCloseMenu={() => setOpenMenuPartyId(null)}
                  onEdit={() => { setEditing(p); setModalOpen(true); }}
                  onViewHistory={() => fetchBillHistory(p)}
                  onOpenActions={() => setCardActionParty(p)}
                />
              ))}
            </motion.div>

            {/* Desktop View: Grid or Table according to preference */}
            <div className="hidden md:block">
              {viewMode === "grid" ? (
                <motion.div key={`g-${filterTab}-${currentPage}-${q}`} variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedParties.map((p) => (
                    <CustomerCard 
                      key={p.id} 
                      p={p} 
                      sym={sym}
                      isMenuOpen={openMenuPartyId === p.id}
                      onToggleMenu={(e) => {
                        e.stopPropagation();
                        setOpenMenuPartyId((prev) => (prev === p.id ? null : p.id));
                      }}
                      onCloseMenu={() => setOpenMenuPartyId(null)}
                      onEdit={() => { setEditing(p); setModalOpen(true); }}
                      onViewHistory={() => fetchBillHistory(p)}
                      onOpenActions={() => setCardActionParty(p)}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--kravy-bg-2)]/50">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] w-10 text-center">#</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Customer</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Contact</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Location</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Status</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--kravy-border)]">
                  {paginatedParties.map((p, idx) => {
                    const actualIdx = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.035, type: "spring", stiffness: 260, damping: 26 }}
                        className="hover:bg-[var(--kravy-bg-2)]/30 transition-colors group"
                      >
                        <td className="px-6 py-3 text-center">
                          <span className="text-[10px] font-black text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] w-5 h-5 rounded flex items-center justify-center mx-auto">{actualIdx}</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={() => fetchBillHistory(p)}
                              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform cursor-pointer"
                            >
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-[var(--kravy-text-primary)] text-sm">{p.name}</div>
                              <div className="text-[9px] font-bold text-[var(--kravy-text-muted)]">Joined {new Date(p.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-xs font-black text-[var(--kravy-brand)] font-mono">{p.phone}</div>
                          <div className="text-[9px] font-medium text-[var(--kravy-text-muted)] uppercase tracking-tight">DOB: {formatDate(p.dob)}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-xs text-[var(--kravy-text-muted)] font-medium max-w-[150px] truncate">{p.address || "—"}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {(p.loyaltyPoints || 0) > 500 ? (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md text-[8px] font-black tracking-widest flex items-center gap-1"><Crown size={9} />GOLD</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)] rounded-md text-[8px] font-black tracking-widest uppercase tracking-tight">SILVER</span>
                            )}
                            {birthdayLabel(p.dob) && (
                              <span className="px-2 py-0.5 bg-pink-500/10 text-pink-600 rounded-md text-[8px] font-black tracking-wide flex items-center gap-1"><Cake size={9} />{birthdayLabel(p.dob)}</span>
                            )}
                            {anniversaryLabel(p) && (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-md text-[8px] font-black tracking-wide flex items-center gap-1"><Heart size={9} className="fill-rose-500/30" />{anniversaryLabel(p)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <CustomerActionMenu
                              p={p}
                              isOpen={openMenuPartyId === p.id}
                              onToggle={(e) => {
                                e.stopPropagation();
                                setOpenMenuPartyId((prev) => (prev === p.id ? null : p.id));
                              }}
                              onClose={() => setOpenMenuPartyId(null)}
                              onEdit={() => { setEditing(p); setModalOpen(true); }}
                              onViewHistory={() => fetchBillHistory(p)}
                              onOpenActions={() => setCardActionParty(p)}
                              align="right"
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
              className="px-4 py-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl font-black text-xs uppercase disabled:opacity-30 hover:bg-[var(--kravy-bg-2)] transition-all"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);
                
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }

                if (start > 1) {
                  pages.push(1);
                  if (start > 2) pages.push('...');
                }

                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push('...');
                  pages.push(totalPages);
                }

                return pages.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => typeof p === 'number' && setCurrentPage(p)}
                    disabled={typeof p !== 'number'}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                      p === '...' 
                        ? 'bg-transparent text-[var(--kravy-text-muted)] cursor-default' 
                        : currentPage === p 
                          ? 'bg-[var(--kravy-brand)] text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-[var(--kravy-surface)] text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg-2)]'
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
              className="px-4 py-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] rounded-xl font-black text-xs uppercase disabled:opacity-30 hover:bg-[var(--kravy-bg-2)] transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals & Drawers - Using Portals for absolute positioning fix */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <>
          {historyOpen && selectedParty && (
              <CustomerDetailView 
                party={selectedParty}
                bills={partyBills}
                loadingBills={loadingBills}
                walletTransactions={walletTransactions}
                loadingWallet={loadingWallet}
                sym={sym}
                business={business}
                onClose={() => { setHistoryOpen(false); setSelectedParty(null); }}
                onEditCustomer={() => {
                  setEditing(selectedParty);
                  setModalOpen(true);
                }}
                onDeposit={(type) => {
                  setDepositingParty(selectedParty);
                  setDepositType(type);
                  setDepositOpen(true);
                }}
                onPayBill={(b) => handlePayBill(b)}
                onPrintBill={(b) => handlePrint("BILL", b)}
                onPrintTx={(tx) => handlePrint("DEPOSIT", tx)}
                onEditTx={(tx) => {
                  setEditingTx(tx);
                  setEditTxType(tx.type);
                  setEditTxAmount(tx.amount.toString());
                  setEditRemarkText(tx.description || "");
                }}
                onDeleteTx={(tx) => handleDeleteTx(tx)}
                onShareLink={() => {
                  kravy.click();
                  const publicUrl = `${window.location.origin}/public/ledger/${selectedParty.id}`;
                  navigator.clipboard.writeText(publicUrl);
                  pushToast("success", "Shareable statement link copied!");
                }}
              />
          )}

          {modalOpen && editing && (
            <Modal 
              title={editing.id === "new" ? "New Customer" : "Edit Customer"} 
              onClose={() => { setModalOpen(false); setEditing(null); }}
            >
              <PartyForm
                initial={editing}
                onCancel={() => { setModalOpen(false); setEditing(null); }}
                saving={saving}
                onSave={async (payload) => {
                  setSaving(true);

                  // OFFLINE CREATION PATH (PHASE B)
                  if (typeof navigator !== "undefined" && !navigator.onLine && payload.id === "new") {
                    try {
                      const { id: localId } = await saveOfflineParty(payload);
                      const offlineNewParty: Party = {
                        ...payload,
                        id: localId,
                        isOfflineLocal: true,
                        walletBalance: payload.walletBalance || payload.openingBalance || 0,
                        loyaltyPoints: payload.loyaltyPoints || 0
                      };
                      setParties(p => [offlineNewParty, ...p]);
                      pushToast("success", "Saved Offline — Waiting for Sync");
                      setModalOpen(false);
                    } catch (offlineErr) {
                      pushToast("error", "Error saving offline customer");
                    } finally {
                      setSaving(false);
                    }
                    return;
                  }

                  try {
                    const method = payload.id === "new" ? "POST" : "PUT";
                    const res = await fetch(`/api/parties`, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (payload.id === "new") {
                        setParties(p => [data, ...p]);
                      } else {
                        setParties(p => p.map(x => x.id === payload.id ? data : x));
                        setSelectedParty(prev => (prev && prev.id === payload.id ? data : prev));
                      }
                      pushToast("success", payload.id === "new" ? "Added successfully" : "Updated successfully");
                      setModalOpen(false);
                    } else {
                      const errJson = await res.json();
                      pushToast("error", errJson.error || "Save failed");
                    }
                  } catch (e) {
                    pushToast("error", "Error saving");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </Modal>
          )}

          {toast && (
            <div className={`fixed bottom-10 right-10 z-[100000] px-6 py-4 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-3 animate-in slide-in-from-right-10 duration-500 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
               {toast.type === 'success' ? <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">✓</div> : "!"}
               {toast.text}
            </div>
          )}

          {depositOpen && depositingParty && (
            <Modal 
              title={`Manage ${depositingParty.name}'s Wallet`} 
              onClose={() => { 
                setDepositOpen(false); 
                setDepositingParty(null); 
                setDepositAmount(""); 
                setDepositRemark("");
                setDepositType("deposit");
                setDepositProof(null);
              }}
            >
              <div className="space-y-6">
                {/* Transaction Type Segmented Control */}
                <div className="flex bg-[var(--kravy-bg-2)] p-1 rounded-2xl border border-[var(--kravy-border)] overflow-x-auto">
                  <button 
                    type="button"
                    onClick={() => {
                      setDepositType("deposit");
                      setDepositAmount("");
                    }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      depositType === "deposit" 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25" 
                        : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                    }`}
                  >
                    💰 Deposit
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setDepositType("withdraw");
                      setDepositAmount("");
                    }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      depositType === "withdraw" 
                        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25" 
                        : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                    }`}
                  >
                    💸 Withdraw
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setDepositType("udhar");
                      setDepositAmount("");
                    }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      depositType === "udhar" 
                        ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/25" 
                        : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                    }`}
                  >
                    💳 Give Udhar
                  </button>
                </div>

                {/* Current Balance Display */}
                <div className={`p-6 rounded-3xl border transition-all ${
                  depositType === "deposit" 
                    ? "bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-50/20 dark:from-emerald-950/25 dark:via-teal-950/15 dark:to-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300"
                    : depositType === "withdraw" 
                      ? "bg-gradient-to-br from-rose-50/70 via-pink-50/40 to-rose-50/20 dark:from-rose-950/25 dark:via-pink-950/15 dark:to-rose-950/10 border-rose-200/80 dark:border-rose-800/40 text-rose-900 dark:text-rose-300"
                      : "bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-indigo-50/20 dark:from-indigo-950/25 dark:via-blue-950/15 dark:to-indigo-950/10 border-indigo-200/80 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Wallet Balance</span>
                    <span className="text-2xl font-black font-mono">{sym}{(depositingParty.walletBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] font-bold opacity-75 uppercase leading-relaxed">
                    {depositType === "deposit" 
                      ? "Money added here can be used by the customer for future orders via 'Wallet' payment mode."
                      : depositType === "withdraw" 
                        ? "Deduct money directly from the customer's wallet balance. Make sure they have sufficient balance."
                        : "Give a loan or credit (Udhar) to the customer. This will deduct their balance, potentially into negative."}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="ml-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">
                      {depositType === "deposit" ? "Deposit Amount" : depositType === "withdraw" ? "Withdrawal Amount" : "Udhar Amount"} ({sym})
                    </label>
                  </div>

                  <input 
                    type="number"
                    autoFocus
                    placeholder="Enter amount (e.g. 500)"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className={`w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none font-black text-2xl transition-all ${
                      depositType === "deposit" ? "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" : depositType === "withdraw" ? "focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" : "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    }`}
                  />
                  {depositType === "withdraw" && parseFloat(depositAmount) > (depositingParty.walletBalance || 0) && (
                    <p className="text-[10px] font-bold text-rose-500 ml-2">⚠️ Amount exceeds current wallet balance!</p>
                  )}
                </div>

                {/* Remark Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">
                    Remark / Reason
                  </label>
                  <input 
                    type="text"
                    placeholder={depositType === "deposit" ? "e.g. Cash Topup, Advance Payment" : depositType === "withdraw" ? "e.g. Refund, Cash Handover" : "e.g. Goods taken on credit"}
                    value={depositRemark}
                    onChange={e => setDepositRemark(e.target.value)}
                    className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] font-medium text-sm transition-all"
                  />
                </div>

                {/* Proof Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">
                    Payment Proof (Optional)
                  </label>
                  <label className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[var(--kravy-bg-2)] border border-dashed border-[var(--kravy-input-border)] text-[var(--kravy-text-muted)] hover:text-[var(--kravy-brand)] hover:border-[var(--kravy-brand)] rounded-2xl cursor-pointer transition-all">
                    <Paperclip size={16} />
                    <span className="text-xs font-bold">{depositProof ? depositProof.name : "Attach Image/Screenshot"}</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDepositProof(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {depositProof && (
                    <div className="flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => setDepositProof(null)}
                        className="text-[9px] text-rose-500 font-black uppercase tracking-widest hover:underline"
                      >
                        Remove Attachment
                      </button>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => { 
                      setDepositOpen(false); 
                      setDepositingParty(null); 
                      setDepositAmount(""); 
                      setDepositRemark("");
                      setDepositType("deposit");
                      setDepositProof(null);
                    }}
                    className="flex-1 py-4 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--kravy-bg-2)] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleDeposit}
                    disabled={
                      depositLoading || 
                      !depositAmount || 
                      parseFloat(depositAmount) <= 0 || 
                      (depositType === "withdraw" && parseFloat(depositAmount) > (depositingParty.walletBalance || 0))
                    }
                    className={`flex-[2] py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                      depositType === "deposit" 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/25" 
                        : depositType === "withdraw"
                          ? "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/25"
                          : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-xl shadow-indigo-500/25"
                    }`}
                  >
                    {depositLoading ? "Processing..." : depositType === "deposit" ? "Confirm Deposit" : depositType === "withdraw" ? "Confirm Withdrawal" : "Confirm Udhar"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {editingTx && (
            <Modal 
              title="Edit Wallet Transaction" 
              onClose={() => setEditingTx(null)}
            >
              <div className="space-y-5">
                {/* Transaction Type Switcher */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">
                    Transaction Type
                  </label>
                  <div className="flex bg-[var(--kravy-bg-2)] p-1 rounded-2xl border border-[var(--kravy-border)]">
                    <button 
                      type="button"
                      onClick={() => setEditTxType("CREDIT")}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        editTxType === "CREDIT" 
                          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/10" 
                          : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                      }`}
                    >
                      🪙 Deposit (Credit +)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditTxType("DEBIT")}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        editTxType === "DEBIT" 
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/10" 
                          : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                      }`}
                    >
                      💸 Withdraw (Debit -)
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">
                    Amount ({sym})
                  </label>
                  <input 
                    type="number"
                    placeholder="Enter amount"
                    value={editTxAmount}
                    onChange={e => setEditTxAmount(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] font-black text-xl transition-all"
                  />
                </div>

                {/* Remark Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">
                    Remark / Description
                  </label>
                  <input 
                    type="text"
                    placeholder="Enter remark (e.g. Cash Topup, Deposit...)"
                    value={editRemarkText}
                    onChange={e => setEditRemarkText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEditTx(); }}
                    className="w-full px-5 py-3.5 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] font-bold text-sm transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => handleDeleteTx(editingTx)}
                    className="px-4 py-3.5 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5"
                    title="Delete this transaction permanently"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <button 
                      type="button"
                      onClick={() => setEditingTx(null)}
                      className="px-4 py-3.5 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--kravy-bg-2)] transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveEditTx}
                      disabled={editRemarkLoading || !editTxAmount || parseFloat(editTxAmount) <= 0}
                      className="px-6 py-3.5 bg-[var(--kravy-brand)] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {editRemarkLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </Modal>)}
          {/* Action Modal / Bottom Sheet for Customer Card Quick Action */}
          {cardActionParty && (
            <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setCardActionParty(null)}
              />
              <div className="relative z-10 w-full max-w-md mx-auto bg-white dark:bg-[#0E1322] rounded-t-[32px] md:rounded-3xl p-5 md:p-6 pb-8 md:pb-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 space-y-3 border-t md:border border-slate-100 dark:border-white/10">
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-2 md:hidden" />
                <div className="text-center pb-1">
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                    {cardActionParty.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {cardActionParty.phone}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const p = cardActionParty;
                    setCardActionParty(null);
                    setDepositingParty(p);
                    setDepositType("deposit");
                    setDepositOpen(true);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50/50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                      <Wallet size={19} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-slate-900 dark:text-emerald-100 tracking-tight">
                        Add Payment / Advance
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                        Deposit cash or advance payment
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                    →
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = cardActionParty;
                    setCardActionParty(null);
                    setDepositingParty(p);
                    setDepositType("withdraw");
                    setDepositOpen(true);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-rose-50 via-rose-50/70 to-pink-50/50 hover:from-rose-100 hover:to-pink-100 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-pink-950/20 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 group-hover:scale-105 transition-transform">
                      <CreditCard size={19} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-slate-900 dark:text-rose-100 tracking-tight">
                        Give Credit / Withdrawal
                      </div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                        Add credit udhar or debit balance
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                    →
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = cardActionParty;
                    setCardActionParty(null);
                    setEditing(p);
                    setModalOpen(true);
                  }}
                  className="w-full p-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 hover:from-slate-100 hover:to-indigo-100/60 dark:from-white/5 dark:via-indigo-950/20 dark:to-white/5 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#635BFF] to-[#7B73FF] text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                      <Edit2 size={19} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        Edit Customer Profile
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        Update name, phone, address & dates
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                    →
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCardActionParty(null)}
                  className="w-full py-3.5 mt-1 text-center text-xs font-black tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Stationary Floating Action Button (FAB) mounted directly to document.body */}
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9999]">
            <button 
              type="button"
              onClick={() => { setEditing({ id: "new", name: "", phone: "", address: "", loyaltyPoints: 0 }); setModalOpen(true); }}
              className="bg-gradient-to-r from-[#635BFF] to-[#7B73FF] hover:from-[#5248E5] hover:to-[#6860F5] text-white font-black text-xs sm:text-sm px-5 py-3.5 rounded-full shadow-2xl shadow-indigo-600/50 hover:shadow-indigo-600/70 flex items-center gap-2 active:scale-95 transition-all group"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                <Plus size={15} className="stroke-[3]" />
              </div>
              <span className="tracking-wide">Customers</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Hidden Print Content */}
      <div className="hidden">
        <div ref={receiptRef} className="font-mono text-[10px] leading-tight text-black bg-white" style={{ width: '100%', paddingBottom: '8mm' }}>
          {printData && (() => {
            const isBill = !!printData.billNumber;
            const taxActive = business?.taxEnabled ?? true;
            const perProductEnabled = true;
            const globalRate = 0;
            
            const items = Array.isArray(printData.items) ? printData.items : [];
            let subtotal = 0;
            let totalTax = 0;
            const taxMap: Record<number, { taxable: number; tax: number }> = {};

            if (isBill) {
              items.forEach((i: any) => {
                const qty = i.qty || i.quantity || 1;
                const rate = i.rate || i.price || 0;
                const itemTotal = qty * rate;
                subtotal += itemTotal;

                const itemTaxRate = (perProductEnabled && i.gst !== undefined && i.gst !== null) ? i.gst : (taxActive ? globalRate : 0);
                if (itemTaxRate > 0) {
                  const taxVal = (itemTotal * itemTaxRate) / 100;
                  totalTax += taxVal;
                  if (!taxMap[itemTaxRate]) taxMap[itemTaxRate] = { taxable: 0, tax: 0 };
                  taxMap[itemTaxRate].taxable += itemTotal;
                  taxMap[itemTaxRate].tax += taxVal;
                }
              });
            }

            const total = isBill ? (printData.total || (subtotal + totalTax)) : (printData.amount || 0);
            
            return (
              <div style={{ padding: '0 2mm' }}>
                <div className="text-center mb-3">
                  {business?.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img src={business.logoUrl} alt="Logo" className="max-h-[30mm] object-contain" style={{ filter: 'contrast(300%) grayscale(100%)' }} />
                    </div>
                  )}
                  <div className="text-center font-black text-[15px] uppercase">{business?.businessName}</div>
                  {(business?.businessAddress || business?.district || business?.state || business?.pinCode) && (
                    <div className="text-center text-[10px] font-bold">
                      {business?.businessAddress}
                      {business?.district && `, ${business.district}`}
                      {business?.state && `, ${business.state}`}
                      {business?.pinCode && ` - ${business.pinCode}`}
                    </div>
                  )}
                  {business?.gstNumber && <div className="text-center text-[10px] font-bold border-y border-dashed border-black py-1 mt-1.5">GSTIN: {business.gstNumber}</div>}
                  {(business?.fssaiNumber && business?.fssaiEnabled) && <div className="text-center text-[10px] font-bold">FSSAI: {business.fssaiNumber}</div>}
                </div>

                <div className="flex justify-between text-[11px] font-bold uppercase border-b-2 border-black pb-1 mb-1">
                  <span>{isBill ? `INV: #${printData.billNumber}` : "WALLET TOPUP"}</span>
                  <span>{new Date(printData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                  <span>DATE: {new Date(printData.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isBill && <span>TABLE: {printData.tableName || "POS"}</span>}
                </div>

                <div className="mb-2 text-[10px] font-bold uppercase border border-dashed border-black px-1.5 py-1.5 bg-white">
                  <div className="truncate">CUSTOMER: {selectedParty?.name || printData.customerName || "WALK-IN"}</div>
                  {(selectedParty?.phone || printData.customerPhone) && <div>PHONE: {selectedParty?.phone || printData.customerPhone}</div>}
                </div>

                {isBill ? (
                  <>
                    <div className="flex justify-between font-bold text-[10px] uppercase border-y-2 border-black py-1 mt-1 mb-1">
                        <span className="flex-1 text-left">ITEM</span>
                        <span className="w-[8mm] text-center">QTY</span>
                        <span className="w-[12mm] text-right">TOTAL</span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((it: any, idx: number) => {
                        const itemTaxRate = (perProductEnabled && it.gst !== undefined && it.gst !== null) ? it.gst : (taxActive ? globalRate : 0);
                        return (
                          <div key={idx} className="flex justify-between text-[10px] font-bold uppercase leading-tight border-b border-dotted border-black/20 pb-1">
                            <div className="flex-1 pr-1">
                              <div className="text-[11px]">{it.name}</div>
                              <div className="text-[8px]">
                                {it.qty || it.quantity} x {(it.rate || it.price).toFixed(2)}
                                {(taxActive || perProductEnabled) && ` | GST: ${itemTaxRate}%`}
                              </div>
                            </div>
                            <span className="w-[8mm] text-center self-center">x{it.qty || it.quantity}</span>
                            <span className="w-[12mm] text-right self-center">{((it.qty || it.quantity) * (it.rate || it.price)).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-1 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold"><span>SUBTOTAL</span><span>{sym}{subtotal.toFixed(2)}</span></div>
                      {Object.entries(taxMap).map(([rate, vals]: any) => (
                        <div key={rate} className="flex justify-between text-[8px] font-medium italic">
                          <span>GST ({rate}%) on {sym}{vals.taxable.toFixed(2)}</span>
                          <span>{sym}{vals.tax.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center border-y border-dashed border-black">
                    <div className="text-[12px] font-black uppercase mb-1">DEPOSIT AMOUNT</div>
                    <div className="text-[24px] font-black">{sym}{total.toFixed(2)}</div>
                    <div className="text-[9px] font-bold mt-1">Manual Cash Deposit</div>
                  </div>
                )}

                <div className="flex justify-between font-black text-[16px] border-y-2 border-black py-2 my-2 uppercase bg-white px-1">
                  <span>{isBill ? "BILL TOTAL" : "NET AMOUNT"}</span>
                  <span>{sym}{total.toFixed(2)}</span>
                </div>

                <div className="mt-3 text-center">
                    <div className="inline-block border-2 border-black px-4 py-1.5 text-[11px] font-black uppercase">
                        {isBill ? `PAID VIA ${printData.paymentMode?.toUpperCase() || "CASH"}` : "RECEIVED CASH"}
                    </div>
                </div>

                {selectedParty && (
                  <div className="mt-4 pt-2 border-t-2 border-dashed border-black">
                    <div className="flex justify-between text-[10px] font-black uppercase px-1">
                      <span>WALLET BALANCE</span>
                      <span>{sym}{(selectedParty.walletBalance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-center border-t-2 border-dashed border-black pt-4">
                    <div className="text-[12px] font-black mb-1 uppercase tracking-tighter">THANK YOU 🙏 VISIT AGAIN</div>
                    <div className="text-[8px] font-bold">Software by Kravy</div>
                    <div className="text-[9px] italic tracking-[0.2em]">*** END OF RECEIPT ***</div>
                    <div className="h-[40mm]" />
                </div>
                </div>
            );
          })()}
        </div>
      </div>


    </>
  );
}

/* ---------------- Sub-Components ---------------- */

function StatCard({ icon, label, value, sub }: { icon: any, label: string, value: number | string, subText?: string, sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-2xl hover:border-[var(--kravy-brand)]/50 transition-shadow group overflow-hidden relative"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-[var(--kravy-brand)]/20 to-transparent rounded-full opacity-70 group-hover:scale-150 transition-transform duration-500" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
      <div className="relative z-[1]">
        <motion.div whileHover={{ rotate: 12, scale: 1.12 }} className="w-11 h-11 bg-[var(--kravy-bg-2)] rounded-xl flex items-center justify-center mb-3">{icon}</motion.div>
        <div className="text-3xl font-black text-[var(--kravy-text-primary)] mb-0.5 tabular-nums">
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </div>
        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">{label}</div>
        {sub && <div className="mt-3 text-[9px] font-bold text-[var(--kravy-text-muted)] flex items-center gap-1">
          <ChevronRight size={8} className="text-[var(--kravy-brand)] group-hover:translate-x-1 transition-transform" /> {sub}
        </div>}
      </div>
    </motion.div>
  );
}

// Reusable compact 3-dot overflow menu for Customer rows & cards
function CustomerActionMenu({
  p,
  isOpen,
  onToggle,
  onClose,
  onEdit,
  onViewHistory,
  onOpenActions,
  align = "right"
}: {
  p: Party;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClose: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
  onOpenActions: () => void;
  align?: "right" | "left";
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const cleanPhone = (p.phone || "").replace(/\D/g, "");

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={menuRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Actions for ${p.name}`}
        className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? "bg-slate-100 dark:bg-white/15 text-slate-900 dark:text-white"
            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10"
        } active:scale-95`}
        title="More Actions"
      >
        <MoreVertical size={18} className="stroke-[2.2]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-[100] top-full mt-1.5 w-56 bg-white dark:bg-[#111625] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)] p-1.5 backdrop-blur-md overflow-hidden ${
              align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
            }`}
          >
            {/* Header info */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
              <div className="text-xs font-black text-slate-800 dark:text-white truncate">{p.name}</div>
              <div className="text-[11px] font-mono text-slate-400 truncate">{p.phone}</div>
            </div>

            {/* Menu Options */}
            <div className="flex flex-col gap-0.5">
              {/* Call */}
              <a
                href={`tel:${cleanPhone}`}
                onClick={() => onClose()}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0">
                  <img src="/images/pos-actions/call.png" alt="Call" className="w-4 h-4 object-contain" />
                </div>
                <span>Call Customer</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0">
                  <img src="/images/pos-actions/whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain scale-110" />
                </div>
                <span>WhatsApp Customer</span>
              </a>

              {/* History */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewHistory();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-violet-50/70 dark:hover:bg-violet-950/30 hover:text-[#6558F5] dark:hover:text-violet-400 transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0">
                  <img src="/images/pos-actions/history.png" alt="History" className="w-4 h-4 object-contain scale-110" />
                </div>
                <span>Customer History</span>
              </button>

              {/* Wallet / Action */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenActions();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-600">
                  <Wallet size={13} className="stroke-[2.5]" />
                </div>
                <span>Manage Wallet / Udhar</span>
              </button>

              {/* Edit */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left border-t border-slate-100 dark:border-white/5 mt-0.5 pt-1.5"
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0">
                  <img src="/images/pos-actions/edit.png" alt="Edit" className="w-4 h-4 object-contain" />
                </div>
                <span>Edit Customer</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileCustomerCard({ 
  p, 
  sym, 
  onEdit, 
  onViewHistory, 
  onOpenActions,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu
}: {
  p: Party;
  sym: string;
  onEdit: () => void;
  onViewHistory: () => void;
  onOpenActions: () => void;
  isMenuOpen?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
  onCloseMenu?: () => void;
}) {
  const isUdhar = (p.walletBalance || 0) < 0;
  const isAdvance = (p.walletBalance || 0) > 0;
  const balance = p.walletBalance || 0;
  const isVip = (p.loyaltyPoints || 0) > VIP_POINTS;
  const bday = birthdayLabel(p.dob);
  const anni = anniversaryLabel(p);
  const progress = Math.min(100, ((p.loyaltyPoints || 0) / VIP_POINTS) * 100);

  // Gradient avatar colors based on initial letter
  const avatarGradients = [
    "from-indigo-500 to-violet-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
  ];
  const charCode = (p.name || "A").charCodeAt(0);
  const avatarGrad = avatarGradients[charCode % avatarGradients.length];

  return (
    <motion.div
      variants={itemVariants}
      whileTap={{ scale: 0.985 }}
      className={`relative bg-white dark:bg-[#0E1322] border rounded-[20px] p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all flex flex-col gap-3 ${
        isMenuOpen 
          ? "border-[#6558F5] ring-2 ring-[#6558F5]/10 shadow-md z-30" 
          : "border-slate-200/80 dark:border-white/10 hover:border-[#6558F5]/60 hover:shadow-md hover:bg-slate-50/40 dark:hover:bg-white/[0.02]"
      }`}
    >
      {/* ── Section 1: Header (Avatar, Name, Chips, Phone, Last Visit, Balance & 3-Dot Overflow Menu) ── */}
      <div 
        onClick={onViewHistory}
        className="flex items-start justify-between gap-2.5 cursor-pointer active:opacity-85 transition-opacity"
      >
        {/* Left: 48px Avatar + Info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div 
            className={`w-12 h-12 rounded-full bg-gradient-to-tr ${avatarGrad} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm ${
              isVip ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0E1322]" : ""
            }`}
          >
            {(p.name || "A").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            {/* Customer Name */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-[17px] text-slate-900 dark:text-white hover:text-[#6558F5] truncate leading-tight tracking-tight">
                {p.name}
              </h3>
              {isVip && (
                <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                  <Award size={9} /> VIP
                </span>
              )}
            </div>

            {/* Birthday & Anniversary Chips */}
            {(bday || anni) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {bday && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 text-[10px] font-bold border border-pink-200/50 dark:border-pink-800/30">
                    <Cake size={10} /> {bday}
                  </span>
                )}
                {anni && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200/50 dark:border-rose-800/30">
                    <Heart size={10} className="fill-rose-500/30" /> {anni}
                  </span>
                )}
              </div>
            )}

            {/* Phone & Secondary meta info */}
            <div className="flex items-center gap-2 flex-wrap text-[13px] text-slate-400 font-medium mt-1">
              <span className="font-mono font-bold text-[#6558F5] flex items-center gap-1">
                <Phone size={11} /> {p.phone}
              </span>
              <span>•</span>
              <span className="text-slate-500 dark:text-slate-400">{getRelativeTime(p.createdAt)}</span>
              {p.address && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[110px] text-slate-400">{p.address}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Balance Compact Display + 3-Dot Overflow Menu */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <div className="text-right">
            {isUdhar ? (
              <div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  ↓ {sym}{Math.abs(balance).toFixed(2)}
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                  You&apos;ll Get
                </div>
              </div>
            ) : isAdvance ? (
              <div>
                <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                  ↑ {sym}{balance.toFixed(2)}
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700/80 dark:text-rose-400/80">
                  You&apos;ll Give
                </div>
              </div>
            ) : (
              <div>
                <div className="text-base font-bold text-slate-400 font-mono">
                  {sym}0.00
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Settled
                </div>
              </div>
            )}
          </div>

          {/* 3-Dot Overflow Menu */}
          <CustomerActionMenu
            p={p}
            isOpen={isMenuOpen}
            onToggle={onToggleMenu || (() => {})}
            onClose={onCloseMenu || (() => {})}
            onEdit={onEdit}
            onViewHistory={onViewHistory}
            onOpenActions={onOpenActions}
            align="right"
          />
        </div>
      </div>

      {/* ── Section 2: Loyalty Progress Bar & VIP compact label ── */}
      {!isVip && (p.loyaltyPoints || 0) > 0 && (
        <div className="flex items-center gap-2.5 pt-0.5">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progress}%` }} 
              transition={{ duration: 0.9, ease: "easeOut" }} 
              className="h-full rounded-full bg-gradient-to-r from-[#6558F5] via-indigo-500 to-amber-400" 
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0">
            {VIP_POINTS - (p.loyaltyPoints || 0) + 1} pts to VIP
          </span>
        </div>
      )}
    </motion.div>
  );
}

function CustomerCard({ 
  p, 
  sym = "₹", 
  onEdit, 
  onViewHistory, 
  onOpenActions,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu
}: { 
  p: Party;
  sym?: string;
  onEdit: () => void;
  onViewHistory: () => void;
  onOpenActions: () => void;
  isMenuOpen?: boolean;
  onToggleMenu?: (e: React.MouseEvent) => void;
  onCloseMenu?: () => void;
}) {
  const tier = getTier(p.loyaltyPoints || 0);
  const isVip = (p.loyaltyPoints || 0) > VIP_POINTS;
  const balance = p.walletBalance || 0;
  const bday = birthdayLabel(p.dob);
  const anni = anniversaryLabel(p);
  const progress = Math.min(100, ((p.loyaltyPoints || 0) / VIP_POINTS) * 100);

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 18 } }}
      className={`group bg-[var(--kravy-surface)] border rounded-3xl shadow-sm transition-all flex flex-col items-center text-center relative ${
        isMenuOpen
          ? "border-[#6558F5] ring-2 ring-[#6558F5]/10 shadow-2xl z-30"
          : "border-[var(--kravy-border)] hover:shadow-2xl hover:border-[var(--kravy-brand)]/60 hover:bg-slate-50/30 dark:hover:bg-white/[0.01]"
      }`}
    >
      {/* Gradient banner */}
      <div className="w-full h-20 relative rounded-t-3xl">
        {/* Background gradient container with overflow hidden so decorative bubbles stay clipped */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-90 overflow-hidden rounded-t-3xl`}>
          <div className="absolute -right-6 -top-8 w-28 h-28 rounded-full bg-white/20 group-hover:scale-150 transition-transform duration-700" />
          <div className="absolute -left-4 -bottom-10 w-24 h-24 rounded-full bg-black/10 group-hover:scale-125 transition-transform duration-700" />
        </div>
        
        {/* Top-Right: Loyalty Badge + 3-Dot Button (No overflow clipping so menu dropdown is fully visible) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30">
          {p.loyaltyPoints !== undefined && p.loyaltyPoints > 0 && (
            <div className="px-2 py-0.5 bg-white/25 backdrop-blur-md text-white rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
              {isVip ? <Crown size={10} /> : <Award size={10} />} {p.loyaltyPoints} PTS
            </div>
          )}
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-xl shadow-xs">
            <CustomerActionMenu
              p={p}
              isOpen={isMenuOpen}
              onToggle={onToggleMenu || (() => {})}
              onClose={onCloseMenu || (() => {})}
              onEdit={onEdit}
              onViewHistory={onViewHistory}
              onOpenActions={onOpenActions}
              align="right"
            />
          </div>
        </div>

        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {bday && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="px-2 py-0.5 bg-white/95 backdrop-blur-xs text-pink-600 rounded-md text-[9px] font-black flex items-center gap-1 shadow-md">
              <Cake size={10} /> {bday}
            </motion.div>
          )}
          {anni && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="px-2 py-0.5 bg-white/95 backdrop-blur-xs text-rose-600 rounded-md text-[9px] font-black flex items-center gap-1 shadow-md">
              <Heart size={10} className="fill-rose-500/30" /> {anni}
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 w-full flex flex-col items-center">
        {/* Avatar */}
        <motion.div 
          onClick={onViewHistory}
          whileHover={{ scale: 1.08, rotate: 3 }}
          whileTap={{ scale: 0.95 }}
          className={`-mt-9 w-[72px] h-[72px] bg-gradient-to-br ${tier.gradient} rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-[var(--kravy-surface)] mb-3 cursor-pointer relative`}
        >
          {p.name.charAt(0).toUpperCase()}
          {isVip && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shadow"><Sparkles size={11} /></span>}
        </motion.div>

        <h3 className="text-base font-black text-[var(--kravy-text-primary)] mb-0.5 group-hover:text-[var(--kravy-brand)] transition-colors line-clamp-1 max-w-full">{p.name}</h3>
        <span className={`text-[8px] font-black tracking-[0.2em] ${tier.text} mb-2`}>{tier.name}</span>

        <div className="flex items-center gap-1.5 text-[var(--kravy-brand)] font-black text-xs font-mono mb-3">
          <Phone size={12} /> {p.phone}
          <CopyPhoneButton phone={p.phone} className="p-1 rounded-md text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-bg-2)] transition-colors" />
        </div>

        {/* Wallet pill */}
        {balance !== 0 && (
          <div className={`mb-3 px-3 py-1 rounded-full text-[10px] font-black font-mono ${balance < 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
            {balance < 0 ? `↓ You'll Get ${sym}${Math.abs(balance).toFixed(2)}` : `↑ You'll Give ${sym}${balance.toFixed(2)}`}
          </div>
        )}

        <div className="w-full flex flex-col gap-1.5 mb-3">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--kravy-text-muted)] font-medium italic line-clamp-1">
             <MapPin size={10} /> {p.address || "Address hidden"}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">
             <Calendar size={10} /> {formatDate(p.dob)}
          </div>
        </div>

        {/* VIP progress */}
        {!isVip && (p.loyaltyPoints || 0) > 0 && (
          <div className="w-full mb-2">
            <div className="h-1.5 rounded-full bg-[var(--kravy-bg-2)] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400" />
            </div>
            <div className="mt-1 text-[9px] font-bold text-[var(--kravy-text-muted)]">{VIP_POINTS - (p.loyaltyPoints || 0) + 1} pts to Gold</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}


export function CustomerDetailView({
  party,
  bills,
  loadingBills,
  walletTransactions,
  loadingWallet,
  sym,
  business,
  onClose,
  onEditCustomer,
  onDeposit,
  onPayBill,
  onPrintBill,
  onPrintTx,
  onEditTx,
  onDeleteTx,
  onShareLink,
}: {
  party: Party;
  bills: Bill[];
  loadingBills: boolean;
  walletTransactions: any[];
  loadingWallet: boolean;
  sym: string;
  business: any;
  onClose: () => void;
  onEditCustomer: () => void;
  onDeposit: (type: "deposit" | "withdraw") => void;
  onPayBill: (b: Bill) => void;
  onPrintBill: (b: Bill) => void;
  onPrintTx: (tx: any) => void;
  onEditTx: (tx: any) => void;
  onDeleteTx: (tx: any) => void;
  onShareLink: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "bills" | "wallet">("details");
  const [txFilter, setTxFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewBillDetails, setViewBillDetails] = useState<any | null>(null);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);

  const handleOpenBillDetails = async (billToLoad: Bill) => {
    setLoadingBillId(billToLoad.id);
    try {
      const res = await fetch(`/api/bill-manager/${billToLoad.id}`);
      if (res.ok) {
        const fullData = await res.json();
        setViewBillDetails(fullData.bill || fullData);
      } else {
        setViewBillDetails(billToLoad);
      }
    } catch(e) {
      setViewBillDetails(billToLoad);
    } finally {
      setLoadingBillId(null);
    }
  };

  // Accordions under "Details" tab
  const [openSection, setOpenSection] = useState<{ [key: string]: boolean }>({
    balance: true,
    contact: true,
    business: false,
    address: false,
    basic: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSection((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const balance = party.walletBalance || 0;
  const isUdhar = balance < 0;
  const isAdvance = balance > 0;

  // Filter bills
  const filteredBills = useMemo(() => {
    if (txFilter === "paid") {
      return bills.filter(
        (b) => b.paymentStatus === "Paid" || b.paymentStatus === "PAID"
      );
    }
    if (txFilter === "unpaid") {
      return bills.filter(
        (b) => b.paymentStatus !== "Paid" && b.paymentStatus !== "PAID"
      );
    }
    return bills;
  }, [bills, txFilter]);

  const paidCount = useMemo(() => {
    return bills.filter((b) => b.paymentStatus === "Paid" || b.paymentStatus === "PAID").length;
  }, [bills]);

  const unpaidCount = useMemo(() => {
    return bills.filter((b) => b.paymentStatus !== "Paid" && b.paymentStatus !== "PAID").length;
  }, [bills]);

  const totalSpent = useMemo(() => {
    return bills.reduce((sum, b) => sum + (b.total || 0), 0);
  }, [bills]);

  const cleanPhone = (party.phone || "").replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-[999999] flex justify-end overflow-hidden">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Main Container: Right Side Drawer / Pane on Desktop (matching image 2) & Fullscreen/Bottom Sheet on Mobile */}
      <div className="relative z-10 w-full h-[100dvh] md:w-[480px] lg:w-[540px] bg-[#F6F7FB] dark:bg-[#070913] md:bg-white md:dark:bg-[#0B0F19] md:border-l border-slate-200/90 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
        
        {/* Top App Header (Ultra-clean, modern with gradient glow) */}
        <div className="bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 shrink-0 px-4 py-3 sticky top-0 z-20 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all active:scale-90"
              aria-label="Back"
            >
              <ArrowLeft size={20} className="stroke-[2.5]" />
            </button>

            {/* Avatar Pill */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 ${
              isUdhar 
                ? "bg-gradient-to-tr from-emerald-500 to-teal-600" 
                : isAdvance 
                  ? "bg-gradient-to-tr from-rose-500 to-pink-600" 
                  : "bg-gradient-to-tr from-indigo-500 to-violet-600"
            }`}>
              {party.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-1.5">
                <span>{party.name}</span>
                {(party.loyaltyPoints || 0) > 500 && (
                  <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded text-[9px] font-black uppercase tracking-wider">
                    VIP
                  </span>
                )}
              </h2>
              <p className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                {party.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEditCustomer}
              className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-full transition-all active:scale-95"
              title="Edit Customer"
            >
              <Edit2 size={17} />
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                onShareLink();
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative ${
                copiedLink 
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30" 
                  : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              }`}
              title={copiedLink ? "Link Copied!" : "Share Statement Link"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copiedLink ? (
                  <motion.div
                    key="copied"
                    initial={{ scale: 0, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, rotate: 90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    className="flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                  >
                    <Check size={18} className="stroke-[3]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="share"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    className="flex items-center justify-center"
                  >
                    <Share2 size={17} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5 custom-scrollbar pb-24">
          
          {/* Premium Balance Card (Centered with dynamic Red for Advance / Green for Due) */}
          <div className={`relative overflow-hidden rounded-3xl p-6 shadow-sm border flex flex-col items-center justify-center text-center transition-all ${
            isAdvance
              ? "border-rose-200/80 dark:border-rose-800/40 bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-white dark:from-rose-950/40 dark:via-rose-950/20 dark:to-[#0B0F19]"
              : isUdhar
                ? "border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[#0B0F19]"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]"
          }`}>
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className={`text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                isAdvance 
                  ? "text-rose-700 dark:text-rose-400" 
                  : isUdhar 
                    ? "text-emerald-700 dark:text-emerald-400" 
                    : "text-slate-500"
              }`}>
                <span className={`w-2 h-2 rounded-full animate-ping ${
                  isAdvance ? "bg-rose-500" : isUdhar ? "bg-emerald-500" : "bg-slate-400"
                }`} />
                <span>{isAdvance ? "You'll Give (Advance)" : isUdhar ? "You'll Get (Balance Due)" : "Zero Balance"}</span>
                {isAdvance ? (
                  <ArrowUp size={13} className="text-rose-600 stroke-[3]" />
                ) : isUdhar ? (
                  <ArrowDown size={13} className="text-emerald-600 stroke-[3]" />
                ) : null}
              </div>

              <div className={`text-4xl font-black font-mono tracking-tight mt-1.5 ${
                isAdvance 
                  ? "text-rose-600 dark:text-rose-400" 
                  : isUdhar 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-700 dark:text-slate-200"
              }`}>
                {sym}{Math.abs(balance).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="bg-slate-200/60 dark:bg-white/5 p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === "details"
                  ? "bg-white dark:bg-[#0E1322] text-[#635BFF] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bills")}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === "bills"
                  ? "bg-white dark:bg-[#0E1322] text-[#635BFF] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Bill History ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === "wallet"
                  ? "bg-white dark:bg-[#0E1322] text-[#635BFF] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Wallet Statement ({walletTransactions.length})
            </button>
          </div>

          {/* TAB 1: DETAILS (Accordions matching Screenshot 1 & 2) */}
          {activeTab === "details" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* Accordion 1: Balance & Amount */}
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-500/20 transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("balance")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      ₹
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white block tracking-tight">
                        Balance & Amount
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Due balance and total spent
                      </span>
                    </div>
                  </div>
                  {openSection.balance ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {openSection.balance && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 space-y-3 text-xs">
                    {/* CRM Mini Stats: Total Bills & Lifetime Value */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {bills.length}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                          Total Bills
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {sym}{totalSpent.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                          Lifetime Value
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 font-semibold">
                        {isAdvance ? "Advance (You'll Give)" : isUdhar ? "Balance Due (You'll Get)" : "Zero Balance"}
                      </span>
                      <span className={`font-mono font-black text-sm ${
                        isAdvance 
                          ? "text-rose-600 dark:text-rose-400" 
                          : isUdhar 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-slate-700 dark:text-slate-200"
                      }`}>
                        {sym}{Math.abs(balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Contact Info */}
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-500/20 transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("contact")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                      <Phone size={13} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white block tracking-tight">
                        Contact Info
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Primary phone & quick connect
                      </span>
                    </div>
                  </div>
                  {openSection.contact ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {openSection.contact && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Primary Mobile
                        </div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                          {party.phone}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <img src="/icons/phone-call-color.png" alt="Call" className="w-3.5 h-3.5 object-contain brightness-0 invert" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                          title="WhatsApp"
                        >
                          <img src="/icons/whatsapp-color.svg" alt="WhatsApp" className="w-4 h-4 object-contain" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Address */}
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-500/20 transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("address")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                      <MapPin size={13} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white block tracking-tight">
                        Address
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Delivery & location details
                      </span>
                    </div>
                  </div>
                  {openSection.address ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {openSection.address && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 leading-relaxed font-medium">
                      {party.address || "No address provided yet."}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Basic Info */}
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-500/20 transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("basic")}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
                      <Calendar size={13} />
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900 dark:text-white block tracking-tight">
                        Personal Info
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Birthday, Anniversary, Visits & Notes
                      </span>
                    </div>
                  </div>
                  {openSection.basic ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {openSection.basic && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-semibold">Visit Count</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md text-[11px]">
                        {bills.length} times visited
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 font-semibold">Birthday</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {party.dob ? (() => {
                          try {
                            const d = new Date(party.dob);
                            return isNaN(d.getTime()) ? "---" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                          } catch {
                            return "---";
                          }
                        })() : "---"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 font-semibold">Anniversary</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {party.remarks && party.remarks.includes("Anniversary:")
                          ? (() => {
                              const rawAnni = party.remarks.split("Anniversary:")[1].trim();
                              try {
                                const d = new Date(rawAnni);
                                return isNaN(d.getTime()) ? rawAnni : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                              } catch {
                                return rawAnni || "---";
                              }
                            })()
                          : "---"}
                      </span>
                    </div>
                    {/* Notes row if any notes exist */}
                    {party.remarks && (() => {
                      const cleanNote = party.remarks.includes("Anniversary:")
                        ? party.remarks.split("Anniversary:")[0].replace(/[\|\,\;]\s*$/, "").trim()
                        : party.remarks.trim();
                      return cleanNote ? (
                        <div className="flex justify-between items-start py-1 border-t border-slate-100 dark:border-white/5">
                          <span className="text-slate-500 font-semibold shrink-0">Notes</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-right max-w-[200px] break-words">
                            {cleanNote}
                          </span>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-white/5">
                      <span className="text-slate-500 font-semibold">Last Visit</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {bills.length > 0 ? formatDate(bills[0].createdAt) : "Recently"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BILL HISTORY */}
          {activeTab === "bills" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Bills Header & Status Filter */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Recent Bills
                </span>
                <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-white/5 p-0.5 rounded-lg text-[10px] font-bold">
                  {(["all", "paid", "unpaid"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTxFilter(filter)}
                      className={`px-2 py-0.5 rounded capitalize transition-all ${
                        txFilter === filter
                          ? "bg-white dark:bg-[#0E1322] text-[#635BFF] shadow-xs"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {loadingBills ? (
                <div className="py-16 text-center animate-pulse text-xs font-bold text-slate-400">
                  Loading Bills...
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="py-16 text-center text-xs font-bold text-slate-400 italic">
                  No bills found for this customer
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredBills.map((bill) => {
                    const isBillPaid = bill.paymentStatus === "Paid" || bill.paymentStatus === "PAID";
                    const isLoading = loadingBillId === bill.id;
                    return (
                      <div
                        key={bill.id}
                        onClick={() => handleOpenBillDetails(bill)}
                        className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl p-4 shadow-xs hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col gap-2.5 cursor-pointer relative group active:scale-[0.99]"
                      >
                        {isLoading && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-xs rounded-2xl flex items-center justify-center z-10">
                            <Loader2 size={18} className="text-[#635BFF] animate-spin" />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-bold">
                              <span className="text-base">⊘</span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                                {bill.billNumber}
                              </div>
                              <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                {sym}{bill.total.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isBillPaid
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/30"
                            }`}>
                              {bill.paymentStatus}
                            </span>
                            <div className="text-[10px] text-slate-400 font-bold mt-1">
                              Sale
                            </div>
                          </div>
                        </div>

                        {!isBillPaid && (
                          <div className="text-xs font-bold text-rose-500 font-mono">
                            Balance Due: {sym}{(bill.balanceDue || bill.total).toFixed(2)}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200/70 dark:border-white/5 text-[11px] text-slate-400">
                          <span>{formatDate(bill.createdAt)}</span>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onPrintBill(bill); }}
                              className="text-slate-400 hover:text-indigo-600 p-1"
                              title="Print"
                            >
                              <Printer size={13} />
                            </button>
                            {!isBillPaid && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onPayBill(bill); }}
                                className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-bold rounded text-[10px]"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WALLET STATEMENT */}
          {activeTab === "wallet" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Wallet Transactions ({walletTransactions.length})
                </span>
              </div>

              {walletTransactions.length === 0 ? (
                <div className="py-16 text-center text-xs font-bold text-slate-400 italic">
                  No wallet transactions found for this customer
                </div>
              ) : (
                <div className="space-y-2">
                  {walletTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl p-3.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          tx.type === "CREDIT"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/30"
                        }`}>
                          {tx.type === "CREDIT" ? "↓" : "↑"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {tx.description || (tx.type === "CREDIT" ? "Deposit" : "Withdrawal")}
                          </div>
                          <div className="text-[10px] text-slate-400">{formatDate(tx.createdAt)}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-bold ${tx.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "CREDIT" ? "+" : "-"} {sym}{tx.amount.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end mt-1">
                          <button onClick={() => onPrintTx(tx)} className="text-slate-400 hover:text-indigo-600" title="Print Receipt">
                            <Printer size={11} />
                          </button>
                          {business?.printSettings?.allowWalletEditDelete !== false && (
                            <>
                              <button onClick={() => onEditTx(tx)} className="text-slate-400 hover:text-indigo-600" title="Edit">
                                <Edit2 size={11} />
                              </button>
                              <button onClick={() => onDeleteTx(tx)} className="text-slate-400 hover:text-rose-600" title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Floating Action Bar / Button */}
        <div className="absolute bottom-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setActionMenuOpen(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-[#635BFF] to-[#7B73FF] hover:from-[#5248E5] hover:to-[#6860F5] text-white rounded-full font-black text-sm tracking-wide shadow-xl shadow-indigo-600/35 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus size={18} className="stroke-[3]" />
            <span>Action</span>
          </button>
        </div>

        {/* Action Modal / Bottom Sheet */}
        {actionMenuOpen && (
          <div className="fixed inset-0 z-[1000000] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setActionMenuOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md mx-auto bg-white dark:bg-[#0E1322] rounded-t-[32px] md:rounded-3xl p-5 md:p-6 pb-8 md:pb-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 space-y-3 border-t md:border border-slate-100 dark:border-white/10">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-2 md:hidden" />
              <div className="text-center pb-1">
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                  {party.name}
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {party.phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onDeposit("deposit");
                }}
                className="w-full p-4 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50/50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                    <Wallet size={19} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 dark:text-emerald-100 tracking-tight">
                      Add Payment / Advance
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      Deposit cash or advance payment
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                  →
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onDeposit("withdraw");
                }}
                className="w-full p-4 bg-gradient-to-r from-rose-50 via-rose-50/70 to-pink-50/50 hover:from-rose-100 hover:to-pink-100 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-pink-950/20 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 group-hover:scale-105 transition-transform">
                    <CreditCard size={19} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 dark:text-rose-100 tracking-tight">
                      Give Credit / Withdrawal
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                      Add credit udhar or debit balance
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                  →
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionMenuOpen(false);
                  onEditCustomer();
                }}
                className="w-full p-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 hover:from-slate-100 hover:to-indigo-100/60 dark:from-white/5 dark:via-indigo-950/20 dark:to-white/5 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#635BFF] to-[#7B73FF] text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                    <Edit2 size={19} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      Edit Customer Profile
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      Update name, phone, address & dates
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs font-black group-hover:translate-x-0.5 transition-transform">
                  →
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionMenuOpen(false)}
                className="w-full py-3.5 mt-1 text-center text-xs font-black tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 uppercase active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Order Details Panel for Clicked Bill */}
        {viewBillDetails && (
          <OrderDetailsPanel 
            bill={viewBillDetails} 
            business={business} 
            onClose={() => setViewBillDetails(null)} 
            onUpdate={(updatedBill) => {
              setViewBillDetails(updatedBill);
            }}
          />
        )}
      </div>
    </div>
  );
}

const COUNTRY_DATA: Record<string, { label: string; states: string[] }> = {
  "India": {
    label: "India",
    states: [
      "Andaman and Nicobar Islands",
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chandigarh",
      "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Ladakh",
      "Lakshadweep",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Puducherry",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal"
    ]
  },
  "United Arab Emirates": {
    label: "United Arab Emirates",
    states: [
      "Abu Dhabi",
      "Ajman",
      "Dubai",
      "Fujairah",
      "Ras Al Khaimah",
      "Sharjah",
      "Umm Al Quwain"
    ]
  },
  "United States": {
    label: "United States",
    states: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
      "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
      "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
      "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
      "Wisconsin", "Wyoming"
    ]
  },
  "United Kingdom": {
    label: "United Kingdom",
    states: [
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland"
    ]
  },
  "Canada": {
    label: "Canada",
    states: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", 
      "Newfoundland and Labrador", "Nova Scotia", "Ontario", 
      "Prince Edward Island", "Quebec", "Saskatchewan", 
      "Northwest Territories", "Nunavut", "Yukon"
    ]
  },
  "Australia": {
    label: "Australia",
    states: [
      "New South Wales", "Queensland", "South Australia", "Tasmania", 
      "Victoria", "Western Australia", "Australian Capital Territory", "Northern Territory"
    ]
  },
  "Singapore": {
    label: "Singapore",
    states: [
      "Central Region", "East Region", "North Region", "North-East Region", "West Region"
    ]
  },
  "Other": {
    label: "Other",
    states: []
  }
};

const COUNTRIES = Object.keys(COUNTRY_DATA);

/**
 * Mobile Bottom Sheet Modal for selecting State or Country (Matching Reference Image 2)
 */
function SelectionBottomSheet({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div className="fixed inset-0 z-[1000000] flex flex-col justify-end">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Floating circular close button right above sheet (Matching Reference Image 2) */}
      <div className="relative z-10 flex justify-center mb-3">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#1E2538] text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          aria-label="Close"
        >
          <X size={18} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Bottom Sheet Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#0E1322] rounded-t-[28px] max-h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>

          {/* Search box if list is long */}
          {options.length > 8 && (
            <div className="mt-3 relative">
              <input 
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 bg-slate-100 dark:bg-[#161D30] rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">
              No matching options found
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected = opt.toLowerCase() === selected.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className={`w-full px-6 py-3.5 text-left text-sm transition-colors flex items-center justify-between ${
                    isSelected 
                      ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20" 
                      : "font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">✓</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999999] flex flex-col md:items-center md:justify-center overflow-hidden">
      {/* Backdrop (hidden on mobile, blur on desktop) */}
      <div 
        className="hidden md:block absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Container: Fullscreen on mobile, modal card on desktop */}
      <div className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-2xl bg-[#F6F7FB] dark:bg-[#070913] md:bg-white md:dark:bg-[#0A0D18] md:border md:border-[var(--kravy-border)] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in md:zoom-in-95 duration-200">
        
        {/* Mobile Header (matches reference Image 1 & 2) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3.5 bg-white dark:bg-[#0B0F19] border-b border-slate-200/80 dark:border-white/5 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="p-1 -ml-1 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90"
              aria-label="Back"
            >
              <ArrowLeft size={22} className="stroke-[2.5]" />
            </button>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between px-8 pt-7 pb-4 border-b border-[var(--kravy-border)] shrink-0">
          <h3 className="text-xl font-black text-[var(--kravy-text-primary)] tracking-tight flex items-center gap-2.5">
            <Plus size={20} className="text-[var(--kravy-brand)]" /> {title}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body: ensures full vertical scroll on all devices */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-8 md:py-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function PartyForm({ initial, onCancel, onSave, saving }: {
  initial: Party;
  onCancel: () => void;
  onSave: (p: Party) => Promise<void>;
  saving: boolean;
}) {
  const { currencySymbol: sym } = useCurrency();

  // Helper to safely parse address parts if stored formatted
  const parseInitialAddress = () => {
    const raw = (initial.address || "").trim();
    if (!raw) {
      return { line1: "", pincode: "", city: "", state: "Delhi", country: "India", altPhone: "" };
    }

    let line1 = raw;
    let pincode = "";
    let city = "";
    let state = "Delhi";
    let country = "India";
    let altPhone = "";

    // Check for Alt Phone
    if (line1.includes("Alt Phone:")) {
      const parts = line1.split("Alt Phone:");
      altPhone = parts[1]?.trim() || "";
      line1 = parts[0]?.replace(/,\s*$/, "").trim() || "";
    }

    // Check for PIN: 123456 or 6-digit pin
    const pinMatch = line1.match(/(?:PIN:\s*|PIN\s*-\s*|\b)(\d{6})\b/i);
    if (pinMatch) {
      pincode = pinMatch[1];
      line1 = line1.replace(pinMatch[0], "").replace(/,\s*,/g, ",").replace(/,\s*$/, "").trim();
    }

    // Split remaining comma parts
    const segments = line1.split(",").map(s => s.trim()).filter(Boolean);
    if (segments.length > 1) {
      // Last or second to last could be state / city
      const possibleState = segments[segments.length - 1];
      const indianStates = COUNTRY_DATA["India"]?.states || [];
      const matched = indianStates.find(s => s.toLowerCase() === possibleState.toLowerCase());
      if (matched) {
        state = matched;
        segments.pop();
        if (segments.length > 0) {
          city = segments.pop() || "";
        }
      }
      line1 = segments.join(", ").trim();
    }

    return { line1, pincode, city, state, country, altPhone };
  };

  const [form, setForm] = useState<Party>({ ...initial });
  const [openingBalance, setOpeningBalance] = useState<string>(
    initial.walletBalance !== undefined && initial.walletBalance !== null
      ? String(initial.walletBalance)
      : ""
  );

  // Accordion section states (closed by default per request)
  const [addressOpen, setAddressOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);

  const initialParsed = parseInitialAddress();

  // Address sub-fields
  const [addrLine1, setAddrLine1] = useState(initialParsed.line1);
  const [pinCode, setPinCode] = useState(initialParsed.pincode);
  const [city, setCity] = useState(initialParsed.city);
  const [stateVal, setStateVal] = useState(initialParsed.state);
  const [countryVal, setCountryVal] = useState(initialParsed.country);
  const [addressPhone, setAddressPhone] = useState(initialParsed.altPhone);

  // Helper to extract Anniversary & Notes from remarks
  const parseRemarks = () => {
    const raw = initial.remarks || "";
    if (raw.includes("Anniversary:")) {
      const parts = raw.split("Anniversary:");
      const notePart = parts[0]?.replace(/[\|\,\;]\s*$/, "").trim() || "";
      const anniPart = parts[1]?.trim() || "";
      return { note: notePart, anniversary: anniPart };
    }
    return { note: raw, anniversary: "" };
  };

  const parsedRemarks = parseRemarks();

  // Personal details sub-fields (Safe Date formatting to prevent Invalid Date crash)
  const [dobVal, setDobVal] = useState(() => {
    if (!initial.dob) return "";
    try {
      const d = new Date(initial.dob);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split('T')[0];
    } catch {
      return "";
    }
  });
  const [anniversaryVal, setAnniversaryVal] = useState(parsedRemarks.anniversary);
  const [notesVal, setNotesVal] = useState(parsedRemarks.note);

  const [stateSheetOpen, setStateSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);

  // Pin Code auto-fetch state
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Available states dynamic list based on selected Country
  const currentStatesList = useMemo(() => {
    return COUNTRY_DATA[countryVal]?.states || [];
  }, [countryVal]);

  const handleCountryChange = (newCountry: string) => {
    setCountryVal(newCountry);
    const countryStates = COUNTRY_DATA[newCountry]?.states || [];
    if (countryStates.length > 0) {
      setStateVal(countryStates[0]);
    } else {
      setStateVal("");
    }
  };

  // Auto-fetch city & state when pincode is 6 digits (only if country is India)
  useEffect(() => {
    if (countryVal !== "India") return;
    const cleanedPin = pinCode.replace(/\D/g, "");
    if (cleanedPin.length === 6) {
      let isMounted = true;
      setPinLoading(true);
      setPinMessage(null);

      fetch(`https://api.postalpincode.in/pincode/${cleanedPin}`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const fetchedDistrict = po.District || po.Circle || "";
            const fetchedState = po.State || "";
            if (fetchedDistrict) setCity(fetchedDistrict);
            if (fetchedState) {
              const indianStates = COUNTRY_DATA["India"].states;
              const matchedState = indianStates.find(
                s => s.toLowerCase() === fetchedState.toLowerCase()
              ) || fetchedState;
              setStateVal(matchedState);
            }
            setPinMessage(`✓ ${fetchedDistrict}, ${fetchedState}`);
          } else {
            setPinMessage("Invalid PIN Code");
          }
        })
        .catch(() => {
          if (isMounted) setPinMessage("Could not verify PIN");
        })
        .finally(() => {
          if (isMounted) setPinLoading(false);
        });

      return () => { isMounted = false; };
    } else {
      setPinMessage(null);
    }
  }, [pinCode, countryVal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct full consolidated address
    const addressParts = [
      addrLine1.trim(),
      city.trim(),
      stateVal.trim(),
      pinCode.trim() ? `PIN: ${pinCode.trim()}` : "",
      countryVal.trim() && countryVal !== "India" ? countryVal.trim() : "",
      addressPhone.trim() ? `Alt Phone: ${addressPhone.trim()}` : ""
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : (form.address || "");

    // Notes can incorporate anniversary if provided
    let consolidatedRemarks = notesVal.trim();
    if (anniversaryVal) {
      consolidatedRemarks = consolidatedRemarks 
        ? `${consolidatedRemarks} | Anniversary: ${anniversaryVal}`
        : `Anniversary: ${anniversaryVal}`;
    }

    const payload: Party = {
      ...form,
      address: fullAddress,
      dob: dobVal || null,
      remarks: consolidatedRemarks || null,
      walletBalance: openingBalance ? parseFloat(openingBalance) || 0 : (form.walletBalance || 0),
      openingBalance: openingBalance ? parseFloat(openingBalance) || 0 : undefined
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-3.5 pb-6">

      {/* Top 3 Core Inputs Card (Matching Reference Image 1) */}
      <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Customer Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <span>Customer Name</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <input 
            required
            autoFocus
            type="text"
            placeholder="Enter customer name"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <span>Phone Number</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <input 
            required
            type="tel"
            placeholder="e.g. 9876543210"
            value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}
            className="w-full px-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Opening Balance */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Opening Balance
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
              {sym}
            </span>
            <input 
              type="number"
              step="any"
              placeholder="0.00"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              className="w-full pl-8 pr-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Accordion 1: Customer Address (User explicitly requested: name as "Customer Address") */}
      <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setAddressOpen(prev => !prev)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Customer Address
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {addrLine1 || city ? `${city ? city + ", " : ""}${stateVal || "Address filled"}` : "Add Address"}
            </span>
          </div>
          <div className="text-slate-400">
            {addressOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {addressOpen && (
          <div className="px-4 sm:px-5 pt-1 pb-5 border-t border-slate-100 dark:border-white/5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
            
            {/* Address Line 1 */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Address Line 1
              </label>
              <input 
                type="text"
                placeholder="Shop/Flat No., Building, Street Area"
                value={addrLine1}
                onChange={e => setAddrLine1(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Pin Code & City (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Pin Code
                  </label>
                  {pinLoading && <Loader2 size={12} className="text-indigo-600 animate-spin" />}
                </div>
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {pinMessage && (
                  <p className={`text-[10px] font-medium leading-none mt-1 ${pinMessage.startsWith("✓") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                    {pinMessage}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  City
                </label>
                <input 
                  type="text"
                  placeholder="City / District"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* State & Country Dropdowns (2 columns) with Custom Bottom Sheet */}
            <div className="grid grid-cols-2 gap-3">
              {/* State Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  State
                </label>
                {currentStatesList.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStateSheetOpen(true)}
                    className="w-full text-left px-3.5 py-2.5 pr-8 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all flex items-center justify-between"
                  >
                    <span className="truncate">{stateVal || "Select State"}</span>
                    <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                  </button>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter State / Region"
                    value={stateVal}
                    onChange={e => setStateVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                )}
              </div>

              {/* Country Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Country
                </label>
                <button
                  type="button"
                  onClick={() => setCountrySheetOpen(true)}
                  className="w-full text-left px-3.5 py-2.5 pr-8 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all flex items-center justify-between"
                >
                  <span className="truncate">{countryVal || "Select Country"}</span>
                  <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                </button>
              </div>
            </div>

            {/* Selection Bottom Sheets */}
            {stateSheetOpen && currentStatesList.length > 0 && (
              <SelectionBottomSheet
                title="Select State"
                options={currentStatesList}
                selected={stateVal}
                onSelect={(val) => setStateVal(val)}
                onClose={() => setStateSheetOpen(false)}
              />
            )}

            {countrySheetOpen && (
              <SelectionBottomSheet
                title="Select Country"
                options={COUNTRIES}
                selected={countryVal}
                onSelect={(val) => handleCountryChange(val)}
                onClose={() => setCountrySheetOpen(false)}
              />
            )}

            {/* Phone No. (Alternative Phone) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Phone No. (Optional)
              </label>
              <input 
                type="tel"
                placeholder="Alternate contact number"
                value={addressPhone}
                onChange={e => setAddressPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Personal Details */}
      <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setPersonalOpen(prev => !prev)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Personal Details
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {dobVal || anniversaryVal || notesVal ? "Details added" : "Birthday, Anniversary & More"}
            </span>
          </div>
          <div className="text-slate-400">
            {personalOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {personalOpen && (
          <div className="px-4 sm:px-5 pt-1 pb-5 border-t border-slate-100 dark:border-white/5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
            
            {/* Birthday & Anniversary (2 columns with calendar icons) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Birthday
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={dobVal}
                    onChange={e => setDobVal(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Anniversary
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={anniversaryVal}
                    onChange={e => setAnniversaryVal(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Notes
              </label>
              <textarea 
                rows={2}
                placeholder="Add special preferences or notes..."
                value={notesVal}
                onChange={e => setNotesVal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Full Width Purple 'Save Customer' Button */}
      <div className="pt-3 pb-4">
        <button 
          disabled={saving} 
          type="submit" 
          className="w-full py-3.5 sm:py-4 bg-[#635BFF] hover:bg-[#5248E5] text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving Customer...</span>
            </>
          ) : (
            <span>Save Customer</span>
          )}
        </button>

        {/* Desktop Cancel link */}
        <div className="hidden md:flex justify-center mt-2.5">
          <button 
            type="button" 
            onClick={onCancel}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Cancel and discard
          </button>
        </div>
      </div>
    </form>
  );
}
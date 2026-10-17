
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
  Image as ImageIcon
} from "lucide-react";
import { kravy } from "@/lib/sounds";
import { useConfirm } from "@/components/ConfirmContext";

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

export default function PartiesPage() {
  const { currencySymbol: sym } = useCurrency();
    const { confirm } = useConfirm();
  const receiptRef = React.useRef<HTMLDivElement>(null);
  const { profile: business } = useProfileCache();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "phone" | "dob">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => {
    const lower = q.trim().toLowerCase();
    let arr = parties.filter((p) => {
      if (!lower) return true;
      return (
        p.name.toLowerCase().includes(lower) ||
        p.phone.toLowerCase().includes(lower) ||
        (p.address || "").toLowerCase().includes(lower)
      );
    });

    arr.sort((a: any, b: any) => {
      const A = (a[sortBy] || "").toString().toLowerCase();
      const B = (b[sortBy] || "").toString().toLowerCase();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [parties, q, sortBy, sortDir]);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [q, sortBy, sortDir]);

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
      const formData = new FormData();
      formData.append("file", depositProof);
      try {
        const uploadRes = await fetch("/api/upload/image", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          proofUrl = uploadData.url;
        }
      } catch(e) {
        pushToast("error", "Failed to upload proof");
        setDepositLoading(false);
        return;
      }
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-[var(--kravy-brand)] border-t-transparent rounded-full animate-spin" />
      <p className="text-[var(--kravy-text-muted)] font-bold animate-pulse">Loading Customer Directory...</p>
    </div>
  );

  return (
    <>
      <div className="w-full space-y-4 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 bg-[var(--kravy-brand)] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <User className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">
                Customer CRM
              </h1>
              <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">
                Database & Loyalty Management
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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
        </div>

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

        {/* Customers List / Table View */}
        {visible.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--kravy-bg-2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-[var(--kravy-text-muted)]" size={32} />
            </div>
            <h3 className="text-xl font-black text-[var(--kravy-text-primary)]">No customers found</h3>
            <p className="text-[var(--kravy-text-muted)] text-xs max-w-xs mx-auto">Try adjusting your search filters or add a new party member.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedParties.map((p) => (
              <CustomerCard 
                key={p.id} 
                p={p} 
                onEdit={() => { setEditing(p); setModalOpen(true); }}
                onDelete={() => handleDelete(p.id)}
                onViewHistory={() => fetchBillHistory(p)}
                onDeposit={(type = "deposit") => { setDepositingParty(p); setDepositType(type); setDepositOpen(true); }}
                onShareLink={() => {
                  kravy.click();
                  const publicUrl = `${window.location.origin}/public/ledger/${p.id}`;
                  navigator.clipboard.writeText(publicUrl);
                  pushToast("success", "Shareable ledger link copied!");
                }}
              />
            ))}
          </div>
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
                      <tr key={p.id} className="hover:bg-[var(--kravy-bg-2)]/30 transition-colors group">
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
                          {(p.loyaltyPoints || 0) > 500 ? (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md text-[8px] font-black tracking-widest">GOLD</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)] rounded-md text-[8px] font-black tracking-widest uppercase tracking-tight">SILVER</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right min-w-[320px]">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button 
                              onClick={() => { setDepositingParty(p); setDepositType("deposit"); setDepositOpen(true); }}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                              title="Quick Deposit"
                            >
                              + Deposit
                            </button>
                            <button 
                              onClick={() => { setDepositingParty(p); setDepositType("withdraw"); setDepositOpen(true); }}
                              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                              title="Quick Withdraw"
                            >
                              - Withdraw
                            </button>
                            <button onClick={() => fetchBillHistory(p)} className="p-2 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] rounded-lg hover:bg-[var(--kravy-brand)] hover:text-white transition-all shadow-sm" title="History">
                              <HistoryIcon size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                kravy.click();
                                const publicUrl = `${window.location.origin}/public/ledger/${p.id}`;
                                navigator.clipboard.writeText(publicUrl);
                                pushToast("success", "Shareable ledger link copied!");
                              }} 
                              className="p-2 bg-indigo-50 border border-indigo-200/50 text-indigo-700 rounded-lg hover:bg-indigo-500 hover:text-white transition-all shadow-sm" 
                              title="Copy Shareable Public Ledger Link"
                            >
                              <Share2 size={14} />
                            </button>
                            <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-2 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-lg hover:text-indigo-500 hover:border-indigo-500 transition-all" title="Edit Customer">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-lg hover:text-rose-500 hover:border-rose-500 transition-all" title="Delete Customer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
              <SideDrawer 
                title={`${selectedParty.name}'s History`} 
                onClose={() => { setHistoryOpen(false); setSelectedParty(null); }}
              >
                <div className="space-y-6">
                  <div className="bg-[var(--kravy-bg-2)] p-6 rounded-[28px] border border-[var(--kravy-border)] shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">CRM Stats</span>
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black tracking-widest">
                         <Award size={12} /> GOLD MEMBER
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-black text-[var(--kravy-text-primary)]">{partyBills.length}</div>
                        <div className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)]">Total Bills</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-emerald-500">{sym}{partyBills.reduce((s, b) => s + b.total, 0).toFixed(0)}</div>
                        <div className="text-[10px] font-black uppercase text-[var(--kravy-text-muted)]">Lifetime Value</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex bg-[var(--kravy-bg-2)] p-1 rounded-2xl border border-[var(--kravy-border)]">
                    <button 
                      onClick={() => setActiveTab("bills")}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "bills" ? "bg-[var(--kravy-brand)] text-white shadow-lg shadow-indigo-500/10" : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"}`}
                    >
                      Bill History
                    </button>
                    <button 
                      onClick={() => setActiveTab("wallet")}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "wallet" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/10" : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"}`}
                    >
                      Wallet Statement
                    </button>
                  </div>

                  {activeTab === "bills" ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] pl-2">Recent Bills</h4>
                      {loadingBills ? (
                        <div className="py-20 text-center animate-pulse text-[var(--kravy-text-muted)] font-black text-sm tracking-widest">Fetching Orders...</div>
                      ) : partyBills.length === 0 ? (
                        <div className="py-12 text-center text-[var(--kravy-text-muted)] font-bold italic">No bills found for this customer</div>
                      ) : (
                        partyBills.map(bill => (
                          <div key={bill.id} className="group p-4 bg-white dark:bg-[#0D111C] border border-[var(--kravy-border)] rounded-2xl hover:border-[var(--kravy-brand)] transition-all hover:shadow-md cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                               <div>
                                 <div className="text-sm font-black text-[var(--kravy-text-primary)]">{bill.billNumber}</div>
                                 <div className="text-[10px] font-bold text-[var(--kravy-text-muted)]">{formatDate(bill.createdAt)}</div>
                               </div>
                               <div className="text-right">
                                 <div className="text-sm font-black text-indigo-500">{sym}{bill.total.toFixed(2)}</div>
                                 <div className={`text-[10px] font-black uppercase ${bill.paymentStatus === 'Paid' || bill.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{bill.paymentStatus}</div>
                                 {bill.paymentStatus === 'PARTIAL' && (
                                   <div className="text-[9px] text-amber-500/80 font-bold mt-0.5">
                                      Paid: {sym}{(bill.amountPaid || 0).toFixed(2)}<br/>Due: {sym}{(bill.balanceDue || 0).toFixed(2)}
                                   </div>
                                 )}
                               </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-[var(--kravy-border)]">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <span className="text-[10px] font-black text-[var(--kravy-text-muted)] bg-[var(--kravy-bg-2)] px-2 py-0.5 rounded-lg">{bill.paymentMode}</span>
                                 <button 
                                  onClick={(e) => { e.stopPropagation(); handlePrint("BILL", bill); }}
                                  className="p-1.5 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)] rounded-lg hover:text-[var(--kravy-brand)] transition-all"
                                  title="Reprint Bill"
                                 >
                                   <Printer size={12} />
                                 </button>
                                 {(bill.paymentStatus === 'PARTIAL' || bill.paymentStatus === 'PENDING') && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handlePayBill(bill); }}
                                     className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-colors"
                                   >
                                     Mark as Paid
                                   </button>
                                 )}
                               </div>
                               <Link 
                                href={`/dashboard/reports/sales?search=${bill.billNumber}`}
                                className="text-[10px] font-black text-[var(--kravy-brand)] flex items-center gap-1 hover:underline"
                               >
                                 DETAILS <ArrowRight size={10} />
                               </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pl-2">
                         <h4 className="text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">Transaction History</h4>
                         <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg">Wallet Balance: {sym}{(selectedParty.walletBalance || 0).toFixed(2)}</span>
                      </div>
                      {loadingWallet ? (
                        <div className="py-20 text-center animate-pulse text-[var(--kravy-text-muted)] font-black text-sm tracking-widest">Loading Transactions...</div>
                      ) : walletTransactions.length === 0 ? (
                        <div className="py-12 text-center text-[var(--kravy-text-muted)] font-bold italic">No wallet transactions yet</div>
                      ) : (
                        walletTransactions.map(tx => (
                          <div key={tx.id} className="p-4 bg-white dark:bg-[#0D111C] border border-[var(--kravy-border)] rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {tx.type === 'CREDIT' ? '↓' : '↑'}
                               </div>
                               <div>
                                 <div className="text-sm font-black text-[var(--kravy-text-primary)]">{tx.description || "No remark"}</div>
                                 <div className="text-[10px] font-bold text-[var(--kravy-text-muted)]">{formatDate(tx.createdAt)}</div>
                               </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className={`font-black text-sm ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {tx.type === 'CREDIT' ? '+' : '-'} {sym}{tx.amount.toFixed(2)}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button 
                                  onClick={() => handlePrint("DEPOSIT", tx)}
                                  className="p-1 text-[var(--kravy-text-muted)] hover:text-amber-500 transition-all"
                                  title="Print Receipt"
                                >
                                  <Printer size={12} />
                                </button>
                                {tx.paymentProof && (
                                  <a 
                                    href={tx.paymentProof} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-1 text-[var(--kravy-text-muted)] hover:text-emerald-500 transition-all"
                                    title="View Payment Proof"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                {business?.printSettings?.allowWalletEditDelete !== false && (
                                  <>
                                    <button 
                                      onClick={() => { 
                                        setEditingTx(tx); 
                                        setEditTxType(tx.type);
                                        setEditTxAmount(tx.amount.toString());
                                        setEditRemarkText(tx.description || ""); 
                                      }}
                                      className="p-1 text-[var(--kravy-text-muted)] hover:text-indigo-500 transition-all"
                                      title="Edit Transaction (Type / Amount / Remark)"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTx(tx)}
                                      className="p-1 text-[var(--kravy-text-muted)] hover:text-rose-500 transition-all"
                                      title="Delete Transaction"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </SideDrawer>
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
                  try {
                    const method = payload.id === "new" ? "POST" : "PUT";
                    const res = await fetch(`/api/parties`, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (payload.id === "new") setParties(p => [data, ...p]);
                      else setParties(p => p.map(x => x.id === payload.id ? data : x));
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
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/10" 
                        : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                    }`}
                  >
                    🪙 Deposit
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setDepositType("withdraw");
                      setDepositAmount("");
                    }}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      depositType === "withdraw" 
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/10" 
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
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/10" 
                        : "text-[var(--kravy-text-muted)] hover:bg-[var(--kravy-border)]"
                    }`}
                  >
                    💳 Give Udhar
                  </button>
                </div>

                {/* Current Balance Display */}
                <div className={`p-6 rounded-3xl border transition-all ${
                  depositType === "deposit" 
                    ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-300"
                    : depositType === "withdraw" 
                      ? "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
                      : "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200/50 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Wallet Balance</span>
                    <span className="text-2xl font-black">{sym}{(depositingParty.walletBalance || 0).toFixed(2)}</span>
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
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">
                      {depositType === "deposit" ? "Deposit Amount" : depositType === "withdraw" ? "Withdrawal Amount" : "Udhar Amount"} ({sym})
                    </label>
                    <span className="text-[9px] font-bold text-[var(--kravy-brand)] uppercase tracking-wider">Quick Presets</span>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[100, 500, 1000, 2000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(amt.toString())}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                          depositAmount === amt.toString()
                            ? (depositType === 'deposit' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : depositType === 'withdraw' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20')
                            : 'bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-border)]'
                        }`}
                      >
                        +{sym}{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="number"
                    autoFocus
                    placeholder="Enter amount (e.g. 500)"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className={`w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none font-black text-2xl transition-all ${
                      depositType === "deposit" ? "focus:border-amber-500" : depositType === "withdraw" ? "focus:border-rose-500" : "focus:border-indigo-500"
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
                        ? "bg-amber-500 hover:shadow-xl hover:shadow-amber-500/20" 
                        : depositType === "withdraw"
                          ? "bg-rose-500 hover:shadow-xl hover:shadow-rose-500/20"
                          : "bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/20"
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
            </Modal>
          )}
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
    <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
      <div className="absolute -right-2 -top-2 w-16 h-16 bg-[var(--kravy-bg-2)] rounded-full opacity-50 group-hover:scale-110 transition-transform" />
      <div className="relative z-[1]">
        <div className="w-10 h-10 bg-[var(--kravy-bg-2)] rounded-xl flex items-center justify-center mb-3">{icon}</div>
        <div className="text-2xl font-black text-[var(--kravy-text-primary)] mb-0.5">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)]">{label}</div>
        {sub && <div className="mt-3 text-[9px] font-bold text-[var(--kravy-text-muted)] flex items-center gap-1">
          <ChevronRight size={8} className="text-[var(--kravy-brand)]" /> {sub}
        </div>}
      </div>
    </div>
  );
}

function CustomerCard({ p, onEdit, onDelete, onViewHistory, onDeposit, onShareLink }: { 
  p: Party, 
  onEdit: () => void, 
  onDelete: () => void, 
  onViewHistory: () => void,
  onDeposit: (type?: "deposit" | "withdraw") => void,
  onShareLink: () => void
}) {
  return (
    <div className="group bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl p-5 shadow-sm hover:shadow-2xl hover:border-[var(--kravy-brand)] transition-all flex flex-col items-center text-center relative overflow-hidden">
      
      {/* Loyalty Badge */}
      {p.loyaltyPoints !== undefined && p.loyaltyPoints > 100 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
          <Award size={10} /> {p.loyaltyPoints} PTS
        </div>
      )}

      {/* Avatar */}
      <div 
        onClick={onViewHistory}
        className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/10 mb-4 group-hover:scale-105 transition-transform cursor-pointer"
      >
        {p.name.charAt(0)}
      </div>

      <h3 className="text-base font-black text-[var(--kravy-text-primary)] mb-1 group-hover:text-[var(--kravy-brand)] transition-colors line-clamp-1">{p.name}</h3>
      <div className="flex items-center gap-1.5 text-[var(--kravy-brand)] font-black text-xs font-mono mb-3">
        <Phone size={12} /> {p.phone}
      </div>

      <div className="w-full flex flex-col gap-1.5 mb-4">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--kravy-text-muted)] font-medium italic line-clamp-1">
           <MapPin size={10} /> {p.address || "Address hidden"}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider">
           <Calendar size={10} /> {formatDate(p.dob)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2 w-full pt-4 border-t border-[var(--kravy-border)]">
        <button 
          onClick={onViewHistory}
          className="p-2.5 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[var(--kravy-brand)] hover:text-white transition-all shadow-sm"
          title="Bill & Wallet History"
        >
          <HistoryIcon size={14} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onShareLink(); }}
          className="p-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-xl text-[9px] font-black hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
          title="Copy Shareable Public Ledger Link"
        >
          <Share2 size={14} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeposit("deposit"); }}
          className="flex-1 py-2.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1"
          title="Quick Deposit Money"
        >
          + Deposit
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeposit("withdraw"); }}
          className="flex-1 py-2.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1"
          title="Quick Withdraw Money"
        >
          - Withdraw
        </button>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2.5 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-xl hover:text-indigo-500 hover:border-indigo-500 transition-all" title="Edit Customer">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-2.5 border border-[var(--kravy-border)] text-[var(--kravy-text-muted)] rounded-xl hover:text-rose-500 hover:border-rose-500 transition-all" title="Delete Customer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SideDrawer({ title, children, onClose }: { title: string, children: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999999] flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#06080F] border-l border-[var(--kravy-border)] shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col h-[100dvh] ring-1 ring-white/10">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[var(--kravy-border)] bg-[var(--kravy-bg-2)]/50">
          <h3 className="text-xl font-black text-[var(--kravy-text-primary)] tracking-tight uppercase tracking-widest text-xs flex items-center gap-2">
            <HistoryIcon size={18} className="text-[var(--kravy-brand)]" /> {title}
          </h3>
          <button onClick={onClose} className="p-2 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-lg text-[var(--kravy-text-muted)] hover:text-rose-500 transition-all shadow-sm">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-[#06080F] border border-[var(--kravy-border)] rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight mb-8 flex items-center gap-3">
          <Plus size={24} className="text-[var(--kravy-brand)]" /> {title}
        </h3>
        {children}
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
  const [form, setForm] = useState<Party>({ ...initial });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">Display Name *</label>
          <input 
            required
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] font-medium"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">Phone Number *</label>
          <input 
            required
            value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}
            className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] font-mono"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">Date of Birth</label>
          <input 
            type="date"
            value={form.dob ? new Date(form.dob).toISOString().split('T')[0] : ""}
            onChange={e => setForm({...form, dob: e.target.value})}
            className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">Loyalty Points</label>
          <input 
            type="number"
            value={form.loyaltyPoints}
            onChange={e => setForm({...form, loyaltyPoints: parseInt(e.target.value) || 0})}
            className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)]"
          />
        </div>
      </div>
      <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--kravy-text-muted)] ml-2">Delivery Address</label>
          <textarea 
            rows={2}
            value={form.address}
            onChange={e => setForm({...form, address: e.target.value})}
            className="w-full px-5 py-4 bg-[var(--kravy-input-bg)] border border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-2xl outline-none focus:border-[var(--kravy-brand)] resize-none"
          />
      </div>
      <div className="flex gap-4 pt-4">
        <button onClick={onCancel} type="button" className="flex-1 py-4 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--kravy-border)] transition-all">Cancel</button>
        <button disabled={saving} type="submit" className="flex-[2] py-4 bg-[var(--kravy-brand)] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all">
          {saving ? "Processing..." : "Confirm & Save Customer"}
        </button>
      </div>
    </form>
  )
}

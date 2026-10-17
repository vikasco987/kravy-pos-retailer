"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Award, 
  ChevronLeft, 
  Save, 
  TrendingUp, 
  Gift, 
  AlertCircle,
  Coins,
  Search,
  RefreshCw,
  Edit3,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Users,
  Percent,
  Zap,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function LoyaltySettingsPage() {
  const router = useRouter();
  const { profile: cachedProfile, loading: profileLoading, updateProfile } = useProfileCache();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({
    enableLoyaltyProgram: true,
    loyaltyPointRatio: 10,
    loyaltyMinOrderAmount: 100,
    loyaltyValueInRupees: 1,
    loyaltyMinRedeem: 100,
    maxRedeemPointsPerBill: 500,
    maxEarnPointsPerBill: ""
  });

  const loading = profileLoading && !cachedProfile;

  useEffect(() => {
    if (cachedProfile) {
      setProfile({
        enableLoyaltyProgram: cachedProfile.enableLoyaltyProgram !== false,
        loyaltyPointRatio: cachedProfile.loyaltyPointRatio ?? 10,
        loyaltyMinOrderAmount: cachedProfile.loyaltyMinOrderAmount ?? 100,
        loyaltyValueInRupees: cachedProfile.loyaltyValueInRupees ?? 1,
        loyaltyMinRedeem: cachedProfile.loyaltyMinRedeem ?? 100,
        maxRedeemPointsPerBill: cachedProfile.maxRedeemPointsPerBill ?? 500,
        maxEarnPointsPerBill: cachedProfile.maxEarnPointsPerBill ?? ""
      });
    }
  }, [cachedProfile]);

  // Customer Loyalty Ledger State
  const [parties, setParties] = useState<any[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Adjust Points Modal State
  const [adjustingParty, setAdjustingParty] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustRemark, setAdjustRemark] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoadingParties(true);
    try {
      const res = await fetch("/api/parties");
      if (res.ok) {
        const data = await res.json();
        setParties(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load customer loyalty list");
    } finally {
      setLoadingParties(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enableLoyaltyProgram: profile.enableLoyaltyProgram,
          loyaltyPointRatio: parseFloat(profile.loyaltyPointRatio) || 10,
          loyaltyMinOrderAmount: parseFloat(profile.loyaltyMinOrderAmount) || 0,
          loyaltyValueInRupees: parseFloat(profile.loyaltyValueInRupees) || 1,
          loyaltyMinRedeem: parseInt(profile.loyaltyMinRedeem) || 100,
          maxRedeemPointsPerBill: profile.maxRedeemPointsPerBill === "" ? null : (parseInt(profile.maxRedeemPointsPerBill) || null),
          maxEarnPointsPerBill: profile.maxEarnPointsPerBill === "" || profile.maxEarnPointsPerBill === null ? null : (parseInt(profile.maxEarnPointsPerBill) || null)
        })
      });

      if (res.ok) {
        updateProfile({
          enableLoyaltyProgram: profile.enableLoyaltyProgram,
          loyaltyPointRatio: parseFloat(profile.loyaltyPointRatio) || 10,
          loyaltyMinOrderAmount: parseFloat(profile.loyaltyMinOrderAmount) || 0,
          loyaltyValueInRupees: parseFloat(profile.loyaltyValueInRupees) || 1,
          loyaltyMinRedeem: parseInt(profile.loyaltyMinRedeem) || 100,
          maxRedeemPointsPerBill: profile.maxRedeemPointsPerBill === "" ? null : (parseInt(profile.maxRedeemPointsPerBill) || null),
          maxEarnPointsPerBill: profile.maxEarnPointsPerBill === "" || profile.maxEarnPointsPerBill === null ? null : (parseInt(profile.maxEarnPointsPerBill) || null)
        });
        toast.success("Loyalty & Rewards rules updated successfully! 👑");
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Failed to save loyalty settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePointsAdjustment = async () => {
    if (!adjustingParty) return;
    setIsAdjusting(true);

    const change = adjustType === "ADD" ? Math.abs(adjustAmount) : -Math.abs(adjustAmount);
    const newTotal = Math.max(0, (adjustingParty.loyaltyPoints || 0) + change);

    try {
      const res = await fetch("/api/parties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: adjustingParty.id,
          loyaltyPoints: newTotal,
          remarks: adjustRemark ? `Points ${adjustType === 'ADD' ? 'Added' : 'Deducted'}: ${adjustRemark}` : undefined
        })
      });

      if (res.ok) {
        toast.success(`Successfully updated points for ${adjustingParty.name}`);
        setAdjustingParty(null);
        setAdjustRemark("");
        fetchParties();
      } else {
        toast.error("Failed to update points");
      }
    } catch (e) {
      toast.error("Error updating customer points");
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredParties = parties.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const totalPointsInCirculation = parties.reduce((acc, p) => acc + (p.loyaltyPoints || 0), 0);
  const activeLoyaltyCustomers = parties.filter(p => (p.loyaltyPoints || 0) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A353]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8 pb-20 kravy-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--kravy-bg)] border border-[var(--kravy-border)] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-[var(--kravy-text-primary)]">QR Loyalty & Rewards Program</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                👑 Rewards Hub
              </span>
            </div>
            <p className="text-xs text-[var(--kravy-text-muted)] font-medium mt-0.5">Manage earning ratios, redemption limits & view customer reward balances</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Program Toggle Switch */}
          <div className="flex items-center gap-2 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] px-4 py-2.5 rounded-2xl">
            <span className="text-xs font-bold text-[var(--kravy-text-primary)]">Program Status</span>
            <button
              type="button"
              onClick={() => setProfile({ ...profile, enableLoyaltyProgram: !profile.enableLoyaltyProgram })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                profile.enableLoyaltyProgram ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.enableLoyaltyProgram ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[0.65rem] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">Active Customers</span>
            <div className="text-2xl font-black text-[var(--kravy-text-primary)] mt-1">{activeLoyaltyCustomers}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[0.65rem] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">Points in Circulation</span>
            <div className="text-2xl font-black text-amber-600 mt-1">👑 {totalPointsInCirculation.toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Coins size={22} />
          </div>
        </div>

        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[0.65rem] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider">Redemption Value</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">₹{(totalPointsInCirculation * (profile.loyaltyValueInRupees || 1)).toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Gift size={22} />
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-[var(--kravy-border)] pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Points Earning & Redemption Rules</h3>
            <p className="text-xs text-[var(--kravy-text-muted)] font-medium">Define how customers earn points on QR orders and redeem discounts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Earning Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <Coins size={14} className="text-amber-500" />
              Earning Ratio (₹ spent per 1 point)
            </label>
            <div className="relative">
              <input
                type="number"
                value={profile.loyaltyPointRatio}
                onChange={(e) => setProfile({ ...profile, loyaltyPointRatio: e.target.value })}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 pl-4 pr-16 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                placeholder="10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-black uppercase text-[var(--kravy-text-muted)]">
                ₹ / point
              </span>
            </div>
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">e.g. Value 10 = Earns 1 point per ₹10 spent (₹100 bill = 10 pts)</p>
          </div>

          {/* Min Order Amount */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-indigo-500" />
              Min Order Amount for Points
            </label>
            <div className="relative">
              <input
                type="number"
                value={profile.loyaltyMinOrderAmount}
                onChange={(e) => setProfile({ ...profile, loyaltyMinOrderAmount: e.target.value })}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 pl-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                placeholder="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-black uppercase text-[var(--kravy-text-muted)]">
                ₹ Min
              </span>
            </div>
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">Orders below this amount will not earn loyalty points.</p>
          </div>

          {/* Point Redemption Value */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <Gift size={14} className="text-emerald-500" />
              1 Point Value in ₹ (Discount Rate)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={profile.loyaltyValueInRupees}
                onChange={(e) => setProfile({ ...profile, loyaltyValueInRupees: e.target.value })}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 pl-4 pr-14 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="1.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-black uppercase text-[var(--kravy-text-muted)]">
                ₹ / pt
              </span>
            </div>
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">e.g. 1.0 = 100 points give ₹100 bill discount</p>
          </div>

          {/* Minimum Redemption Threshold */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <Award size={14} className="text-amber-500" />
              Min Points Needed to Unlock Redeem
            </label>
            <input
              type="number"
              value={profile.loyaltyMinRedeem}
              onChange={(e) => setProfile({ ...profile, loyaltyMinRedeem: e.target.value })}
              className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
              placeholder="100"
            />
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">Customer must have at least this many points to redeem on bill.</p>
          </div>

          {/* Max Redeem Limit per Bill */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <Sparkles size={14} className="text-rose-500" />
              Max Redeemable Points per Bill
            </label>
            <input
              type="number"
              value={profile.maxRedeemPointsPerBill}
              onChange={(e) => setProfile({ ...profile, maxRedeemPointsPerBill: e.target.value })}
              className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
              placeholder="500"
            />
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">Cap maximum points used in a single transaction.</p>
          </div>

          {/* Max Earn Limit per Bill */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--kravy-text-primary)] flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-500" />
              Maximum Points Earned Per Bill
            </label>
            <input
              type="number"
              value={profile.maxEarnPointsPerBill}
              onChange={(e) => setProfile({ ...profile, maxEarnPointsPerBill: e.target.value })}
              className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
              placeholder="Unlimited"
            />
            <p className="text-[0.7rem] text-[var(--kravy-text-muted)] italic">Maximum loyalty points a customer can earn from a single bill. Leave blank for unlimited.</p>
          </div>
        </div>
      </div>

      {/* Customer Points Ledger & Sync Table */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--kravy-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Customer Loyalty Ledger</h3>
              <p className="text-xs text-[var(--kravy-text-muted)] font-medium">View & manage live points balance for every registered customer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kravy-text-faint)]" size={14} />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-2 pl-9 pr-3 text-xs font-bold outline-none"
              />
            </div>

            <button
              onClick={fetchParties}
              className="p-2.5 bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] transition-all"
              title="Sync & Refresh List"
            >
              <RefreshCw size={14} className={loadingParties ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--kravy-border)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--kravy-bg)] text-[0.7rem] font-black text-[var(--kravy-text-muted)] uppercase tracking-wider border-b border-[var(--kravy-border)]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-center">Loyalty Points</th>
                <th className="py-3 px-4 text-center">Discount Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kravy-border)] text-xs font-bold">
              {loadingParties ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--kravy-text-muted)]">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-amber-500" /> Loading customer rewards...
                    </div>
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--kravy-text-muted)]">
                    No customers found. Points will accumulate automatically when customers order via QR Code!
                  </td>
                </tr>
              ) : (
                filteredParties.map((p) => {
                  const points = p.loyaltyPoints || 0;
                  const discountVal = points * (profile.loyaltyValueInRupees || 1);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-black text-[var(--kravy-text-primary)]">
                        {p.name || "Walk-in Customer"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--kravy-text-muted)]">
                        {p.phone || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                          points > 0 
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" 
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                        }`}>
                          👑 {points} Pts
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-extrabold">
                        ₹{discountVal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setAdjustingParty(p);
                            setAdjustAmount(50);
                            setAdjustType("ADD");
                            setAdjustRemark("");
                          }}
                          className="px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-[0.7rem] font-black transition-all inline-flex items-center gap-1"
                        >
                          <Edit3 size={12} /> Adjust Points
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HOW IT WORKS / DOCUMENTATION */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-indigo-200/50 dark:border-indigo-800/50 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100">How It Works (Guide)</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 font-medium">Practical example of how your current loyalty settings work.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h4 className="font-black text-sm text-indigo-800 dark:text-indigo-300 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg inline-block">1. Earning Points (Customer Orders)</h4>
                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <li className="flex gap-2"><span className="text-emerald-500">✅</span> If a customer bill is <strong>₹{profile.loyaltyMinOrderAmount || 100}</strong> or more, they start earning points.</li>
                    <li className="flex gap-2"><span className="text-emerald-500">✅</span> They earn <strong>1 point for every ₹{profile.loyaltyPointRatio || 10} spent</strong>. (Example: A bill of ₹500 earns {Math.floor(500 / (profile.loyaltyPointRatio || 10))} points).</li>
                    <li className="flex gap-2"><span className="text-emerald-500">✅</span> The maximum they can earn from a single bill is <strong>{profile.maxEarnPointsPerBill || "Unlimited"} points</strong>, no matter how huge their bill is.</li>
                </ul>
            </div>
            <div className="space-y-4">
                <h4 className="font-black text-sm text-rose-800 dark:text-rose-300 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg inline-block">2. Redeeming Points (Discounts)</h4>
                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    <li className="flex gap-2"><span className="text-rose-500">💳</span> Customers cannot use points until they have collected at least <strong>{profile.loyaltyMinRedeem || 100} points</strong> in their account.</li>
                    <li className="flex gap-2"><span className="text-rose-500">💳</span> Each point gives a discount of <strong>₹{profile.loyaltyValueInRupees || 1}</strong>.</li>
                    <li className="flex gap-2"><span className="text-rose-500">💳</span> A customer can use a maximum of <strong>{profile.maxRedeemPointsPerBill || 500} points</strong> per order, capping their maximum possible discount at <strong>₹{(profile.maxRedeemPointsPerBill || 500) * (profile.loyaltyValueInRupees || 1)}</strong>.</li>
                </ul>
            </div>
        </div>
      </div>

      {/* Points Adjustment Modal */}
      {adjustingParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--kravy-border)] pb-3">
              <div>
                <h3 className="text-base font-black text-[var(--kravy-text-primary)]">Adjust Loyalty Points</h3>
                <p className="text-xs text-[var(--kravy-text-muted)]">{adjustingParty.name} ({adjustingParty.phone})</p>
              </div>
              <button 
                onClick={() => setAdjustingParty(null)}
                className="w-8 h-8 rounded-full bg-[var(--kravy-bg)] flex items-center justify-center text-[var(--kravy-text-muted)] hover:text-rose-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Balance */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Current Balance:</span>
              <span className="text-lg font-black text-amber-600">👑 {adjustingParty.loyaltyPoints || 0} Pts</span>
            </div>

            {/* Add / Deduct Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--kravy-bg)] rounded-xl border border-[var(--kravy-border)]">
              <button
                type="button"
                onClick={() => setAdjustType("ADD")}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                  adjustType === "ADD" 
                    ? "bg-emerald-500 text-white shadow-md" 
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                <Plus size={14} /> Add Points
              </button>

              <button
                type="button"
                onClick={() => setAdjustType("DEDUCT")}
                className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${
                  adjustType === "DEDUCT" 
                    ? "bg-rose-500 text-white shadow-md" 
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                <Minus size={14} /> Deduct Points
              </button>
            </div>

            {/* Preset Amount Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--kravy-text-primary)]">Quick Preset Chips</label>
              <div className="flex flex-wrap gap-2">
                {[10, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustAmount(amt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                      adjustAmount === amt
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[var(--kravy-bg)] border-[var(--kravy-border)] text-[var(--kravy-text-primary)] hover:border-amber-500"
                    }`}
                  >
                    {adjustType === "ADD" ? "+" : "-"}{amt} Pts
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--kravy-text-primary)]">Points Amount</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-2.5 px-4 text-sm font-black outline-none"
              />
            </div>

            {/* Remark */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--kravy-text-primary)]">Reason / Remark (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Good customer bonus"
                value={adjustRemark}
                onChange={(e) => setAdjustRemark(e.target.value)}
                className="w-full bg-[var(--kravy-bg)] border border-[var(--kravy-border)] rounded-xl py-2.5 px-4 text-xs font-bold outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingParty(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--kravy-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePointsAdjustment}
                disabled={isAdjusting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isAdjusting ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, MessageSquare, Wallet, Zap, CheckCircle2, 
  AlertTriangle, RefreshCw, Send, PlusCircle, ShieldCheck, 
  History, Sparkles, TrendingDown, TrendingUp, Lock, PhoneCall
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";

interface WalletData {
  autoBillEnabled: boolean;
  credits: number;
  balance: number;
  costPerMessage: number;
  totalSent: number;
}

interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  credits: number;
  balanceAfter?: number;
  description: string;
  billNumber?: string;
  customerPhone?: string;
  createdAt: string;
}

const RECHARGE_PLANS = [
  { amount: 200, credits: 400, bonus: 0, tag: "Starter" },
  { amount: 500, credits: 1100, bonus: 100, tag: "Most Popular", popular: true },
  { amount: 1000, credits: 2400, bonus: 400, tag: "Best Value" },
  { amount: 2000, credits: 5200, bonus: 1200, tag: "Mega Saver" },
];

export default function WhatsAppWalletSettings() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData>({
    autoBillEnabled: false,
    credits: 0,
    balance: 0,
    costPerMessage: 0.50,
    totalSent: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Dynamic Razorpay SDK loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fetch Wallet Data
  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/whatsapp/wallet");
      const data = await res.json();
      if (res.ok && data.success) {
        setWallet(data.wallet);
        setIsAdminUser(data.isAdmin === true);
        setTransactions(data.transactions || []);
        if (data.profile) setProfileData(data.profile);
      }
    } catch {
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  // Toggle Auto-Bill Enable / Disable
  const handleToggleAutoBill = async () => {
    kravy.click?.();
    setToggling(true);
    const newState = !wallet.autoBillEnabled;

    try {
      const res = await fetch("/api/whatsapp/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled: newState }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWallet((prev) => ({ ...prev, autoBillEnabled: newState }));
        toast.success(data.message, { icon: newState ? "✅" : "⏸️" });
      } else {
        toast.error(data.error || "Failed to update setting");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setToggling(false);
    }
  };

  // Handle Recharge via Razorpay Checkout (Identical to Subscription Flow)
  const handleRecharge = async (amount: number, credits: number, tag?: string) => {
    kravy.click?.();
    setRecharging(true);

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK. Please check your internet connection.");
        setRecharging(false);
        return;
      }

      // 2. Create Razorpay Order via /api/razorpay/order
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount,
          planKey: `whatsapp_recharge_${amount}`,
          customerId: profileData?.customerId || "user",
          customerName: profileData?.businessName || "Kravy Merchant",
          customerPhone: profileData?.phone || "",
          customerEmail: profileData?.email || "",
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to initiate payment gateway");
      }

      // 3. Configure Razorpay Modal Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Kravy POS",
        description: `WhatsApp Recharge: ₹${amount} (${credits.toLocaleString()} Messages - ${tag || "Pack"})`,
        image: "/favicon.ico",
        order_id: orderData.orderId,
        prefill: {
          name: profileData?.businessName || "",
          contact: profileData?.phone || "",
          email: profileData?.email || "",
        },
        theme: {
          color: "#25D366", // WhatsApp Green brand color
        },
        handler: async function (response: any) {
          try {
            setRecharging(true);
            toast.loading("Verifying payment...", { id: "wa-recharge" });

            // 4. Verify & Credit Wallet
            const rechargeRes = await fetch("/api/whatsapp/wallet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "recharge",
                amount,
                credits,
                description: `Razorpay: ₹${amount} (${credits.toLocaleString()} Messages - ${tag || "Pack"})`,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const rechargeData = await rechargeRes.json();
            if (rechargeRes.ok && rechargeData.success) {
              toast.success(`🎉 Recharged ₹${amount}! Added ${credits.toLocaleString()} Messages.`, { 
                id: "wa-recharge", 
                duration: 5000 
              });
              setCustomAmount("");
              fetchWallet();
            } else {
              toast.error(rechargeData.error || "Wallet credit failed. Please contact support.", { id: "wa-recharge" });
            }
          } catch (err: any) {
            toast.error("Failed to verify payment with server", { id: "wa-recharge" });
          } finally {
            setRecharging(false);
          }
        },
        modal: {
          ondismiss: function () {
            setRecharging(false);
            toast("Payment cancelled", { icon: "ℹ️" });
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        setRecharging(false);
        toast.error(`Payment failed: ${response?.error?.description || "Transaction declined"}`);
      });
      razorpayInstance.open();

    } catch (err: any) {
      console.error("Recharge Error:", err);
      toast.error(err.message || "Failed to start recharge");
      setRecharging(false);
    }
  };

  // Handle Send Test Message
  const handleSendTestMessage = async () => {
    const clean = testPhone.trim().replace(/\D/g, "");
    if (!clean || clean.length < 10) {
      toast.error("Please enter a valid 10-digit WhatsApp number");
      return;
    }

    if (wallet.credits <= 0) {
      toast.error("Credits exhausted! Please recharge your wallet first.");
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/whatsapp/send-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: "TEST_SAMPLE_BILL",
          phone: clean,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`✅ Test Bill sent to +91 ${clean.slice(-10)}!`);
        setTestPhone("");
        fetchWallet();
      } else if (res.status === 402) {
        toast.error("Wallet Credits Exhausted. Please recharge.");
      } else {
        toast.error(data.error || "Failed to send test message");
      }
    } catch {
      toast.error("Network error sending test message");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/dashboard/settings"
            onClick={() => kravy.click?.()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--color-bg-secondary, rgba(0,0,0,0.05))",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "#25D366", color: "#fff", padding: "5px 7px", borderRadius: 8, display: "flex" }}>
                <MessageSquare size={18} />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>WhatsApp Automation & Wallet</h1>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary, #666)" }}>
              Manage POS auto-bill sending, recharge message credits, and track usage history.
            </p>
          </div>
        </div>

        <button
          onClick={fetchWallet}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border, #ddd)",
            background: "transparent",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            color: "inherit",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Low Balance Alert ── */}
      {wallet.credits <= 15 && wallet.autoBillEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: wallet.credits === 0 ? "#FEE2E2" : "#FEF3C7",
            border: `1px solid ${wallet.credits === 0 ? "#FCA5A5" : "#FCD34D"}`,
            color: wallet.credits === 0 ? "#991B1B" : "#92400E",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={20} />
          <div style={{ flex: 1 }}>
            <strong>{wallet.credits === 0 ? "⚠️ Auto-Send Paused: 0 Messages Remaining!" : "⚠️ Low Message Credits Alert!"}</strong>{" "}
            {wallet.credits === 0
              ? "Your WhatsApp wallet has exhausted. Automatic bill sending on POS is currently paused. Please recharge below to resume."
              : `Only ${wallet.credits} messages left in your wallet. Recharge soon so your customers don't miss their digital bills.`}
          </div>
        </motion.div>
      )}

      {/* ── Auto Messaging Disabled Banner (Contact Support to Enable) ── */}
      {!wallet.autoBillEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.15) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Lock size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#991b1b" }}>
                  WhatsApp Auto Messaging is Disabled
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: "#FEE2E2",
                    color: "#991B1B",
                    letterSpacing: 0.5,
                  }}
                >
                  CONTACT SUPPORT TO ENABLE
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#7f1d1d", fontWeight: 500 }}>
                Automatic WhatsApp bill sending is currently disabled for this account. Please contact Kravy Support to activate the auto-messaging add-on.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/919289507882?text=Hello%20Kravy%20Support%2C%20I%20want%20to%20enable%20WhatsApp%20Auto%20Messaging%20for%20my%20store."
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => kravy.click?.()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              background: "#25D366",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <MessageSquare size={16} />
            <span>Contact Support to Enable</span>
          </a>
        </motion.div>
      )}

      {/* ── Master Enable / Disable Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "var(--color-card, #ffffff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: wallet.autoBillEnabled ? "rgba(37, 211, 102, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: wallet.autoBillEnabled ? "#16a34a" : "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Automatic WhatsApp Bill on POS</h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: wallet.autoBillEnabled ? "#DCFCE7" : "#FEE2E2",
                  color: wallet.autoBillEnabled ? "#15803D" : "#B91C1C",
                }}
              >
                {wallet.autoBillEnabled ? "ACTIVE (ENABLED)" : "PAUSED (DISABLED)"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary, #666)" }}>
              Automatically shoots a formatted bill to the customer's WhatsApp whenever cashier settles/prints a bill.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard/settings/whatsapp/templates"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 13,
              background: "#059669",
              color: "#fff",
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.2)",
              transition: "all 0.2s",
            }}
          >
            <MessageSquare size={16} />
            <span>Manage Templates</span>
          </Link>

          {wallet.autoBillEnabled ? (
            <button
              onClick={handleToggleAutoBill}
              disabled={toggling}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: toggling ? "not-allowed" : "pointer",
                background: "#EF4444",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
              }}
            >
              Turn OFF Auto-Bill
            </button>
          ) : isAdminUser ? (
            <button
              onClick={handleToggleAutoBill}
              disabled={toggling}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: toggling ? "not-allowed" : "pointer",
                background: "#16A34A",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
              }}
            >
              Turn ON Auto-Bill (Admin)
            </button>
          ) : (
            <a
              href="https://wa.me/919289507882?text=Hello%20Kravy%20Support%2C%20please%20enable%20WhatsApp%20Auto%20Messaging%20for%20my%20store."
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => kravy.click?.()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                cursor: "pointer",
                background: "#25D366",
                color: "#fff",
                boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)",
                transition: "all 0.2s",
              }}
            >
              <PhoneCall size={16} />
              <span>Contact Support to Enable</span>
            </a>
          )}
        </div>
      </motion.div>

      {/* ── KPI Metrics (3 Cards) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* Remaining Messages */}
        <div
          style={{
            background: "var(--color-card, #ffffff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary, #666)", textTransform: "uppercase" }}>
              Message Quota
            </span>
            <div style={{ background: "rgba(37, 211, 102, 0.15)", color: "#16a34a", padding: 5, borderRadius: 8 }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: wallet.credits > 0 ? "#16a34a" : "#dc2626" }}>
            {wallet.credits.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary, #777)", marginTop: 4 }}>
            Messages available to send
          </div>
        </div>

        {/* Current Balance */}
        <div
          style={{
            background: "var(--color-card, #ffffff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary, #666)", textTransform: "uppercase" }}>
              Wallet Value
            </span>
            <div style={{ background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", padding: 5, borderRadius: 8 }}>
              <Wallet size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            ₹{wallet.balance.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary, #777)", marginTop: 4 }}>
            Cost: ₹{wallet.costPerMessage.toFixed(2)} per bill message
          </div>
        </div>

        {/* Total Delivered */}
        <div
          style={{
            background: "var(--color-card, #ffffff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 14,
            padding: 18,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary, #666)", textTransform: "uppercase" }}>
              Total Delivered
            </span>
            <div style={{ background: "rgba(168, 85, 247, 0.15)", color: "#9333ea", padding: 5, borderRadius: 8 }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#9333ea" }}>
            {wallet.totalSent.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary, #777)", marginTop: 4 }}>
            Bills delivered via Meta Cloud API
          </div>
        </div>
      </div>

      {/* ── Recharge Plans ── */}
      <div
        style={{
          background: "var(--color-card, #ffffff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Sparkles size={20} color="#D97706" />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recharge WhatsApp Message Packs</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {RECHARGE_PLANS.map((plan) => (
            <div
              key={plan.amount}
              style={{
                position: "relative",
                border: plan.popular ? "2px solid #25D366" : "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 14,
                padding: 18,
                background: plan.popular ? "rgba(37, 211, 102, 0.03)" : "transparent",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -11,
                    right: 14,
                    background: "#25D366",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 12,
                    letterSpacing: "0.5px",
                  }}
                >
                  POPULAR
                </div>
              )}

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary, #666)", marginBottom: 4 }}>
                  {plan.tag}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                  ₹{plan.amount}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap size={15} /> {plan.credits.toLocaleString()} Messages
                </div>
                {plan.bonus > 0 && (
                  <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginTop: 4 }}>
                    🎁 Includes {plan.bonus} Free Bonus Messages
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginTop: 6 }}>
                  ≈ ₹{(plan.amount / plan.credits).toFixed(2)} / message
                </div>
              </div>

              <button
                onClick={() => handleRecharge(plan.amount, plan.credits, plan.tag)}
                disabled={recharging}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: recharging ? "not-allowed" : "pointer",
                  background: plan.popular ? "#25D366" : "var(--color-bg-secondary, #f3f4f6)",
                  color: plan.popular ? "#fff" : "inherit",
                  boxShadow: plan.popular ? "0 2px 6px rgba(37, 211, 102, 0.3)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {recharging ? "Processing..." : `Recharge ₹${plan.amount}`}
              </button>
            </div>
          ))}
        </div>

        {/* Custom Recharge Amount */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed var(--color-border, #e5e7eb)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Or Custom Recharge:</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>₹</span>
            <input
              type="number"
              placeholder="e.g. 750"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{
                width: 120,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border, #ccc)",
                background: "transparent",
                color: "inherit",
                fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={() => {
              const val = Number(customAmount);
              if (val >= 50) {
                const credits = Math.floor(val / (wallet.costPerMessage || 0.50));
                handleRecharge(val, credits, "Custom");
              } else {
                toast.error("Minimum custom recharge is ₹50");
              }
            }}
            disabled={recharging || !customAmount}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              cursor: (!customAmount || recharging) ? "not-allowed" : "pointer",
              background: "#3B82F6",
              color: "#fff",
            }}
          >
            Add Balance
          </button>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary, #888)" }}>
            (₹0.50 per message = 2 messages per rupee)
          </span>
        </div>
      </div>

      {/* ── Test Live Message Box ── */}
      <div
        style={{
          background: "var(--color-card, #ffffff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={18} color="#25D366" />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Test Real WhatsApp Bill Delivery</h3>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-secondary, #666)" }}>
            Send a sample formatted bill to your phone to verify Meta Cloud API and wallet deduction.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="10-digit mobile number"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border, #ccc)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
              width: 200,
            }}
          />
          <button
            onClick={handleSendTestMessage}
            disabled={sendingTest || !testPhone}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: (sendingTest || !testPhone) ? "not-allowed" : "pointer",
              background: "#25D366",
              color: "#fff",
            }}
          >
            <Send size={14} />
            {sendingTest ? "Sending..." : "Send Test Bill"}
          </button>
        </div>
      </div>

      {/* ── Transaction History Table ── */}
      <div
        style={{
          background: "var(--color-card, #ffffff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 16,
          padding: 22,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <History size={18} />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Recent Wallet Usage & Recharge History</h3>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "var(--color-text-secondary, #888)", fontSize: 13 }}>
            No transactions yet. Recharges and auto-bills will appear here in real-time.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border, #e5e7eb)", textAlign: "left", color: "var(--color-text-secondary, #666)" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Description</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Messages</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const isCredit = txn.type === "CREDIT";
                  return (
                    <tr key={txn.id} style={{ borderBottom: "1px solid var(--color-border, #f3f4f6)" }}>
                      <td style={{ padding: "10px 10px", color: "var(--color-text-secondary, #777)", whiteSpace: "nowrap" }}>
                        {new Date(txn.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isCredit ? "#DCFCE7" : "#F3F4F6",
                            color: isCredit ? "#15803D" : "#4B5563",
                          }}
                        >
                          {isCredit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isCredit ? "RECHARGE" : "BILL SENT"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 10px", fontWeight: 500 }}>
                        {txn.description}
                      </td>
                      <td
                        style={{
                          padding: "10px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: isCredit ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {isCredit ? `+${txn.credits}` : `${txn.credits}`}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--color-text-secondary, #666)" }}>
                        {txn.balanceAfter !== null && txn.balanceAfter !== undefined ? `${txn.balanceAfter} msgs` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


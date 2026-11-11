"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserCircle, Activity, Users, BarChart3,
  ChevronRight, Shield, Bell, Palette, HelpCircle, Database, Percent, Book, Award, Zap, LayoutDashboard, Printer, Sliders, Package, Bluetooth, MessageSquare
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const [role, setRole] = useState<string>("");
  const { resolvedTheme, theme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => setRole(data.role))
      .catch(() => { });
  }, []);

  const settingsGroups = [
    {
      title: "Account",
      items: [
        {
          href: "/dashboard/profile",
          icon: <UserCircle size={20} />,
          color: "#8B5CF6",
          label: "Business Profile",
          desc: "Update your store name, address and branding"
        },
        {
          href: "/dashboard/settings/whatsapp",
          icon: <MessageSquare size={20} />,
          color: "#25D366",
          label: "WhatsApp Automation & Wallet",
          desc: "Control auto-bill sending, recharge message credits & view balance"
        },
        {
          href: "/dashboard/settings/whatsapp/templates",
          icon: <MessageSquare size={20} />,
          color: "#10B981",
          label: "WhatsApp Message Templates",
          desc: "Choose auto-bill templates, preview interactive buttons & customize delivery"
        },
        {
          href: "/dashboard/settings/activity",
          icon: <Activity size={20} />,
          color: "#10B981",
          label: "Activity Log",
          desc: "View recent actions and login history"
        },
        {
          href: "/dashboard/settings/tax",
          icon: <Percent size={20} />,
          color: "#F59E0B",
          label: "Tax Management",
          desc: "Enable/Disable GST and configure tax rates"
        },
        {
          href: "/dashboard/settings/customer",
          icon: <Users size={20} />,
          color: "#06B6D4",
          label: "Customer Setup",
          desc: "Configure QR Menu data collection rules (Name, Phone, Address)"
        },
        {
          href: "/dashboard/settings/loyalty",
          icon: <Award size={20} />,
          color: "#D4A353",
          label: "Loyalty Program",
          desc: "Set point ratios and redemption rules for customers"
        },
        {
          href: "/dashboard/settings/inventory",
          icon: <Package size={20} />,
          color: "#3B82F6",
          label: "Inventory & Stock",
          desc: "Manage serial numbers and stock entry rules"
        },
        {
          href: "/dashboard/settings/pos",
          icon: <LayoutDashboard size={20} />,
          color: "#8B5CF6",
          label: "Quick POS Layout",
          desc: "Enable/Disable payment modes and action buttons"
        },
        {
          href: "/dashboard/settings/sidebar",
          icon: <Sliders size={20} />,
          color: "#EC4899",
          label: "Sidebar Menu Controls",
          desc: "Hide unnecessary sidebar items & customize your navigation menu"
        },
        {
          href: "/dashboard/settings/connect-printer",
          icon: <Bluetooth size={20} />,
          color: "#4F46E5",
          label: "Connect Printer",
          desc: "Pair and manage wireless Bluetooth thermal printers for Bill & KOT"
        },
        {
          href: "/dashboard/settings/printing",
          icon: <Printer size={20} />,
          color: "#EC4899",
          label: "Printing Setup",
          desc: "Customize bill & KOT layouts with live preview"
        },
      ]
    },
    {
      title: "Preferences",
      items: [
        {
          href: "/dashboard/settings/notifications",
          icon: <Bell size={20} />,
          color: "#FF6B35",
          label: "Notifications",
          desc: "Configure alert preferences and reminders"
        },
        {
          href: "/dashboard/security",
          icon: <Shield size={20} />,
          color: "#EF4444",
          label: "Security",
          desc: "Manage passwords, 2FA, and security logs"
        },
        {
          href: "/dashboard/settings/sessions",
          icon: <Activity size={20} />,
          color: "#0EA5E9",
          label: "Active Sessions",
          desc: "View and manage active devices and login limits"
        },
        {
          href: "/dashboard/settings/backup",
          icon: <Database size={20} />,
          color: "#F59E0B",
          label: "Data Backup",
          desc: "Export and backup your billing data"
        },
      ]
    },
    {
      title: "Support",
      items: [
        {
          href: "/dashboard/help",
          icon: <HelpCircle size={20} />,
          color: "#06B6D4",
          label: "Help & Support",
          desc: "Get assistance and read documentation"
        },
        {
          href: "/dashboard/docs/workflow",
          icon: <Book size={20} />,
          color: "#10B981",
          label: "Workflow Guide",
          desc: "Step-by-step instructions for POS operations"
        },
      ]
    },
    ...(role === "ADMIN" ? [{
      title: "Administration",
      items: [
        {
          href: "/admin/users",
          icon: <Users size={20} />,
          color: "#EC4899",
          label: "User Management",
          desc: "Manage team members, roles and permissions"
        },
        {
          href: "/admin/reports",
          icon: <BarChart3 size={20} />,
          color: "#8B5CF6",
          label: "System Reports",
          desc: "Access advanced sales and system analytics"
        },
        {
          href: "/dashboard/settings/advanced",
          icon: <Zap size={20} />,
          color: "#F59E0B",
          label: "Advanced Controls",
          desc: "Manage tool visibility and feature flags for staff"
        },
      ]
    }] : [])
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "860px" }} className="kravy-page-fade">

      {/* ── Page Header ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{
            width: "6px", height: "32px",
            background: "linear-gradient(180deg, #8B5CF6, #6D28D9)",
            borderRadius: "10px"
          }} />
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-1px" }}>
            Settings
          </h1>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--kravy-text-muted)", marginLeft: "16px", fontFamily: "monospace" }}>
          Manage your account, preferences and business configuration
        </p>
      </div>

      {/* ── Appearance Card ── */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-8 shadow-xl">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 20px rgba(139,92,246,0.4)"
          }}>
            <Palette size={24} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--kravy-text-primary)", letterSpacing: "-0.5px" }}>Appearance</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", fontFamily: "monospace" }}>Choose your preferred display theme</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {[
            { key: "light", label: "☀️ Light", desc: "Bright, clean interface" },
            { key: "dark", label: "🌙 Dark", desc: "Easy on the eyes" },
            { key: "system", label: "💻 System", desc: "Follows device setting" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key as any)}
              style={{
                flex: "1 1 200px", padding: "24px", borderRadius: "24px",
                border: "2px solid",
                borderColor: theme === opt.key ? "var(--kravy-brand)" : "var(--kravy-border)",
                background: theme === opt.key
                  ? "var(--kravy-bg-2)"
                  : "transparent",
                cursor: "pointer", textAlign: "left", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative", overflow: "hidden"
              }}
              className="hover:scale-[1.02] active:scale-[0.98]"
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px", color: "var(--kravy-text-primary)" }}>{opt.label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)", fontFamily: "monospace", lineHeight: 1.5 }}>{opt.desc}</div>
              {theme === opt.key && (
                <div style={{
                  marginTop: "12px", fontSize: "0.7rem", fontWeight: 900,
                  color: "var(--kravy-brand)", fontFamily: "monospace",
                  display: "flex", alignItems: "center", gap: "4px"
                }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "currentColor" }} />
                  ACTIVE THEME
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Settings Groups ── */}
      {settingsGroups.map((group, gi) => (
        <div key={gi}>
          <div style={{
            fontSize: "0.75rem", fontWeight: 900, color: "var(--kravy-text-muted)",
            textTransform: "uppercase", letterSpacing: "2.5px",
            fontFamily: "monospace", marginBottom: "16px", paddingLeft: "8px",
            opacity: 0.8
          }}>
            {group.title}
          </div>
          <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] overflow-hidden shadow-xl">
            {group.items.map((item, ii) => (
              <motion.div
                key={ii}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (gi * 0.1) + (ii * 0.06) }}
              >
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "16px",
                      padding: "18px 24px",
                      borderBottom: ii < group.items.length - 1 ? "1px solid var(--kravy-border)" : "none",
                      transition: "background 0.15s", cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--kravy-surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "12px",
                      background: `${item.color}15`, border: `1px solid ${item.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: item.color, flexShrink: 0
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--kravy-text-primary)", marginBottom: "2px" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-muted)" }}>
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--kravy-text-faint)" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Version Footer ── */}
      <div style={{
        textAlign: "center", fontSize: "0.65rem", color: "var(--kravy-text-faint)",
        fontFamily: "monospace", paddingBottom: "8px"
      }}>
        KravyPOS · v2.0.0 · All systems operational ✓
      </div>
    </div>
  );
}

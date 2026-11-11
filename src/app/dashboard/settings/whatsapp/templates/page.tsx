"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Zap,
  Info,
  Smartphone,
  Eye,
  ShieldCheck,
  Send,
  Layers,
  ChevronRight,
  Radio,
  Sliders,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { kravy } from "@/lib/sounds";

interface TemplateButton {
  type: string;
  label: string;
  target: string;
}

interface TemplateOption {
  id: string;
  name: string;
  badge: string;
  category: string;
  cost: string;
  trigger: string;
  description: string;
  header: string | null;
  body: string;
  footer: string | null;
  button: TemplateButton | null;
  sampleData: Record<string, string>;
}

export default function WhatsAppTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("delivery_confirmation_1");
  const [autoSendOnSettle, setAutoSendOnSettle] = useState<boolean>(true);
  const [businessName, setBusinessName] = useState<string>("My Restaurant");
  const [activePreviewId, setActivePreviewId] = useState<string>("delivery_confirmation_1");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp/templates");
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplates(data.templates || []);
        setSelectedTemplateId(data.selectedTemplateId || "delivery_confirmation_1");
        setActivePreviewId(data.selectedTemplateId || "delivery_confirmation_1");
        setAutoSendOnSettle(data.autoSendOnSettle !== false);
        if (data.businessName) setBusinessName(data.businessName);
      } else {
        toast.error(data.error || "Failed to load templates");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Could not load WhatsApp templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newTemplateId?: string, newAutoSend?: boolean) => {
    const tId = newTemplateId ?? selectedTemplateId;
    const aSend = newAutoSend ?? autoSendOnSettle;

    try {
      setSaving(true);
      kravy.click?.();
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: tId,
          autoSendOnSettle: aSend,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Template preference saved!");
        setSelectedTemplateId(tId);
        setAutoSendOnSettle(aSend);
      } else {
        toast.error(data.error || "Save failed");
        // Revert toggle state if rejected by server (e.g. disabled by admin)
        if (newAutoSend !== undefined) {
          setAutoSendOnSettle(!newAutoSend);
        }
      }
    } catch (err: any) {
      toast.error("Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  const activeTemplate = templates.find((t) => t.id === activePreviewId) || templates[0];

  const renderFilledBody = (template: TemplateOption) => {
    let text = template.body;
    if (template.id === "delivery_confirmation_1") {
      text = text
        .replace("{{1}}", "Pavan Sharma")
        .replace("{{2}}", businessName)
        .replace("{{3}}", "INV/2611/0149")
        .replace("{{4}}", "₹499.00")
        .replace("{{5}}", "PAID (UPI)");
    } else if (template.id === "order_details") {
      text = text
        .replace("{{1}}", "Pavan Sharma")
        .replace("{{2}}", "2x Butter Roti, 1x Paneer Masala")
        .replace("{{3}}", "₹349.00")
        .replace("{{4}}", "PAID (Cash)");
    } else if (template.id === "order_delivery_update") {
      text = text
        .replace("{{1}}", "Pavan Sharma")
        .replace("{{2}}", "INV/2611/0150");
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 p-4 md:p-8">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/settings"
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare size={20} />
                </span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  WhatsApp Templates & Automation
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Choose which Meta approved template shoots on billing, preview message layout, and see interactive buttons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings/whatsapp"
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm"
            >
              <Wallet size={16} className="text-emerald-500" />
              <span>Wallet & Recharges</span>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Loading Meta Templates...
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Template Selector & Settings (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Auto-Send Master Toggle Banner */}
            <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-slate-100/50 dark:shadow-none flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    autoSendOnSettle
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Auto-Send on Bill Settle
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        autoSendOnSettle
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {autoSendOnSettle ? "Active" : "Disabled"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    When enabled, WhatsApp bill shoots automatically when cashier settles a bill.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const nextVal = !autoSendOnSettle;
                  setAutoSendOnSettle(nextVal);
                  handleSave(undefined, nextVal);
                }}
                disabled={saving}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSendOnSettle ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoSendOnSettle ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Template Selector Cards */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Select Active WhatsApp Template
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> Meta Cloud Verified
                </span>
              </div>

              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const isPreviewing = activePreviewId === tpl.id;

                return (
                  <motion.div
                    key={tpl.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setActivePreviewId(tpl.id);
                      kravy.click?.();
                    }}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-white dark:bg-slate-800/90 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                        : isPreviewing
                        ? "bg-white dark:bg-slate-800/70 border-slate-300 dark:border-slate-600 shadow-md"
                        : "bg-white/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplateId(tpl.id);
                            setActivePreviewId(tpl.id);
                            handleSave(tpl.id, undefined);
                          }}
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-black text-base text-slate-900 dark:text-white">
                              {tpl.name}
                            </h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                              {tpl.badge}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {tpl.category}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {tpl.description}
                          </p>

                          {/* Button info & Trigger tag */}
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            {tpl.button ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                                <ExternalLink size={12} />
                                <span>Button: <strong>[{tpl.button.label}]</strong> ({tpl.button.target})</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <span>No interactive button (Full text)</span>
                              </div>
                            )}

                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Trigger: <strong>{tpl.trigger}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Set as Default Action */}
                      <div className="flex flex-col items-end gap-2">
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 px-3 py-1.5 rounded-2xl">
                            <CheckCircle2 size={14} /> ACTIVE
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTemplateId(tpl.id);
                              setActivePreviewId(tpl.id);
                              handleSave(tpl.id, undefined);
                            }}
                            className="px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-700 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                          >
                            Use This
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Real-Time Mobile Preview (5 Cols) */}
          <div className="lg:col-span-5 sticky top-8">
            <div className="p-4 md:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-slate-100/50 dark:shadow-none">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-emerald-500" />
                  <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Customer WhatsApp Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  LIVE VIEW
                </span>
              </div>

              {/* Realistic WhatsApp Chat Bubble Container */}
              <div
                className="rounded-3xl p-4 md:p-5 relative shadow-inner overflow-hidden border border-slate-200 dark:border-slate-700/80"
                style={{
                  background: "#E5DDD5",
                  backgroundImage:
                    "radial-gradient(#000000 0.5px, transparent 0.5px), radial-gradient(#000000 0.5px, #E5DDD5 0.5px)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 10px 10px",
                  opacity: 0.98,
                }}
              >
                {/* Chat Bubble */}
                <div className="max-w-[320px] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md text-slate-800 text-xs relative">
                  {/* Optional Template Header */}
                  {activeTemplate.header && (
                    <div className="font-black text-[13px] text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span>
                        {activeTemplate.header.replace("{{Restaurant Name}}", businessName)}
                      </span>
                    </div>
                  )}

                  {/* Body Text */}
                  <div className="whitespace-pre-line leading-relaxed text-[12px] text-slate-700 font-normal">
                    {renderFilledBody(activeTemplate)}
                  </div>

                  {/* Optional Footer Text */}
                  {activeTemplate.footer && (
                    <div className="text-[10px] text-slate-400 mt-2 font-medium tracking-wide uppercase">
                      {activeTemplate.footer}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-[9px] text-slate-400 text-right mt-1 font-semibold">
                    11:45 AM ✓✓
                  </div>

                  {/* Interactive Button CTA (If exists) */}
                  {activeTemplate.button && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                      <div className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                        <ExternalLink size={14} className="text-emerald-500" />
                        <span>{activeTemplate.button.label}</span>
                      </div>
                      <span className="text-[9px] text-center text-slate-400 font-medium">
                        Target: {activeTemplate.button.target}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Footer Guide */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2">
                <Info size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  This preview renders exactly how your customers receive it on WhatsApp with dynamic values (Customer name, bill amount, invoice PDF download button).
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

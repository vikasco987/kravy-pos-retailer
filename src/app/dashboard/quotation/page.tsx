"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Download,
  FileText,
  Printer,
  Share2,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
  Building2,
  Phone,
  Calendar,
  ShieldCheck,
  Zap,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";

type QuotationData = {
  customerName: string;
  shopName: string;
  phoneNumber: string;
  date: string;
  validUntil: string;
  softwareName: string;
  subscriptionDuration: string;
  priceAgreedText: string;
  deviceAccess: string;
  hardwareIncluded: string;
  features: string[];
  totalDescription: string;
  totalAmountText: string;
  renewalChargesText: string;
};

export default function QuotationAiPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "edit">("ai");

  const todayDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const [data, setData] = useState<QuotationData>({
    customerName: "Karan Singh",
    shopName: "Royal Spice Restaurant",
    phoneNumber: "9876543210",
    date: todayDate,
    validUntil: nextWeekDate,
    softwareName: "Kravy Billing Software",
    subscriptionDuration: "12 Months",
    priceAgreedText: "Rs. 3,000/-",
    deviceAccess: "Mobile App + Desktop/Laptop, synced on same account",
    hardwareIncluded: "Thermal Printer with Printer Software",
    features: [
      "Fast Billing System & Instant Kot Printing",
      "Inventory & Raw Material Stock Management",
      "Daily, Weekly & Monthly Sales Reports",
      "Customer & Order Management with Loyalty Points",
      "Professional Thermal & A4 Invoice/Bill Generation",
      "Cloud-based Data Access & Real-time Monitoring",
      "Multi-device Table Sync & Smart QR Menu"
    ],
    totalDescription: "Kravy Billing Software + Thermal Printer (12 Months)",
    totalAmountText: "Rs. 3,000/-",
    renewalChargesText: "After completion of 12 months, annual renewal charge will be Rs. 1,500/- per year."
  });

  const [newFeatureText, setNewFeatureText] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  // 🪄 AI GENERATE QUOTATION
  const handleGenerateAi = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/quotation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSubmit })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setData(result.data);
          setActiveTab("edit");
        }
      }
    } catch (err) {
      console.error("AI Quotation Generation Error", err);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 DIRECT 1-CLICK PDF DOWNLOAD
  const handleDownloadPdf = async () => {
    const el = document.getElementById("quotation-doc-canvas");
    if (!el) return;

    setDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      const fileName = `Kravy_Quotation_${(data.customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8] as [number, number, number, number],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error("PDF Download error", err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 📝 DOWNLOAD WORD DOC (.doc)
  const handleDownloadDocx = () => {
    const el = document.getElementById("quotation-doc-canvas");
    if (!el) return;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quotation - ${data.customerName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
        th { background: #f0f4f8; }
      </style>
    </head>
    <body>
      ${el.innerHTML}
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kravy_Quotation_${(data.customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 💬 SHARE VIA WHATSAPP
  const handleShareWhatsApp = () => {
    const text = `📄 *KRAVY BILLING SOLUTIONS QUOTATION*

👤 *Customer:* ${data.customerName}
🏪 *Shop/Restaurant:* ${data.shopName || "N/A"}
📅 *Date:* ${data.date} (Valid till ${data.validUntil})

📦 *Package Details:*
• *Software:* ${data.softwareName}
• *Duration:* ${data.subscriptionDuration}
• *Price:* ${data.priceAgreedText}
• *Devices:* ${data.deviceAccess}
• *Hardware:* ${data.hardwareIncluded}

✨ *Included Features:*
${data.features.map((f) => `• ${f}`).join("\n")}

💰 *Total Amount Payable:* ${data.totalAmountText}
🔄 *Renewal:* ${data.renewalChargesText}

For any queries, please contact Kravy Billing Solutions.
📞 Contact: +91 9999999999
🌐 Website: https://kravy.in`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");

    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Feature Handlers
  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setData((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()]
    }));
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index: number) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans">
      {/* ── TOP HEADER BAR ── */}
      <header className="print:hidden sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all text-slate-300 border border-slate-700"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Sparkles className="text-amber-400" size={20} /> Quotation AI Generator
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Gemini AI 🤖
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Create official DOCX & PDF price quotes instantly with AI
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:scale-105 text-black font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Save PDF 📄
                </>
              )}
            </button>

            <button
              onClick={handleDownloadDocx}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <FileText size={15} /> Save Word (.doc) 📝
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {copiedWhatsApp ? <Check size={15} /> : <Share2 size={15} />} WhatsApp 💬
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="max-w-7xl mx-auto px-4 my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:p-0 print:m-0">
        
        {/* 👈 LEFT PANEL: AI PROMPT & FORM CONTROLS (Hidden during print) */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          
          {/* TAB STRIP */}
          <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "ai"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles size={16} /> AI Auto-Generator
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "edit"
                  ? "bg-slate-800 text-white shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Edit3 size={16} /> Edit Details
            </button>
          </div>

          {activeTab === "ai" ? (
            /* 🪄 AI PROMPT SECTION */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Zap size={16} /> Describe Requirement
                </h2>
                <span className="text-[0.65rem] font-bold text-slate-500">Gemini 2.5 Flash AI</span>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Type customer requirement in Hindi or English... e.g. Karan wants Kravy POS for 12 months with a thermal printer for Rs 3000. Valid till 22 June."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60 leading-relaxed font-medium transition-all"
              />

              <button
                onClick={() => handleGenerateAi()}
                disabled={loading || !prompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:scale-[1.02] active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-black" /> Processing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Quotation ✨
                  </>
                )}
              </button>

              {/* QUICK PROMPT CHIPS */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  ⚡ Quick Sample Prompts:
                </span>
                <div className="space-y-2">
                  {[
                    "Karan wants 12 months Kravy POS with Thermal Printer for Rs 3000 valid till 10 Aug",
                    "Aman wants Lifetime Desktop Billing App with KDS & Thermal Printer for Rs 12000",
                    "Sharma Sweets wants 6 months Mobile POS Software for Rs 1800"
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(p);
                        handleGenerateAi(p);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{p}</span>
                      <Sparkles size={13} className="text-amber-400 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 📝 MANUAL INLINE FORM EDIT */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-h-[750px] overflow-y-auto custom-scrollbar">
              <h2 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-800 pb-3">
                📝 Edit Quotation Fields
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={data.customerName}
                    onChange={(e) => setData({ ...data, customerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Shop / Restaurant Name</label>
                  <input
                    type="text"
                    value={data.shopName}
                    onChange={(e) => setData({ ...data, shopName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={data.phoneNumber}
                      onChange={(e) => setData({ ...data, phoneNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Valid Until</label>
                    <input
                      type="text"
                      value={data.validUntil}
                      onChange={(e) => setData({ ...data, validUntil: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Subscription Duration</label>
                    <input
                      type="text"
                      value={data.subscriptionDuration}
                      onChange={(e) => setData({ ...data, subscriptionDuration: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Price Agreed</label>
                    <input
                      type="text"
                      value={data.priceAgreedText}
                      onChange={(e) => setData({ ...data, priceAgreedText: e.target.value, totalAmountText: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Hardware Included</label>
                  <input
                    type="text"
                    value={data.hardwareIncluded}
                    onChange={(e) => setData({ ...data, hardwareIncluded: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[0.7rem] font-bold text-slate-400 block mb-1">Renewal Charges Text</label>
                  <textarea
                    value={data.renewalChargesText}
                    rows={2}
                    onChange={(e) => setData({ ...data, renewalChargesText: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-500"
                  />
                </div>

                {/* FEATURES MANAGEMENT */}
                <div className="pt-3 border-t border-slate-800">
                  <label className="text-[0.7rem] font-bold text-slate-400 block mb-2">Included Features ({data.features.length})</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {data.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <span className="flex-1 text-slate-300 truncate">{feat}</span>
                        <button
                          onClick={() => handleRemoveFeature(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add new feature..."
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      onClick={handleAddFeature}
                      className="px-3 py-1.5 bg-amber-500 text-black font-black text-xs rounded-xl"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👉 RIGHT PANEL: LIVE DOCUMENT CANVAS PREVIEW */}
        <div className="lg:col-span-7">
          <div
            id="quotation-doc-canvas"
            ref={printRef}
            className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full min-h-[900px] border border-slate-200"
          >
            {/* DOCUMENT HEADER */}
            <div className="text-center border-b-2 border-[#1F4E79] pb-6 mb-6">
              <h1 className="text-2xl md:text-3xl font-black uppercase text-[#1F4E79] tracking-tight">
                Kravy Billing Solutions
              </h1>
              <p className="text-xs text-slate-500 font-semibold italic mt-0.5">
                Smart Billing & Inventory Software
              </p>
            </div>

            {/* QUOTATION TITLE */}
            <div className="text-center text-xl font-black tracking-widest text-slate-800 uppercase mb-6">
              QUOTATION
            </div>

            {/* CUSTOMER INFO TABLE */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#EAF1F8] text-[#1F4E79] font-black border border-slate-300">
                    <th className="p-2.5 text-left border border-slate-300">Customer</th>
                    <th className="p-2.5 text-left border border-slate-300">Shop Name</th>
                    <th className="p-2.5 text-left border border-slate-300">Phone</th>
                    <th className="p-2.5 text-left border border-slate-300">Date</th>
                    <th className="p-2.5 text-left border border-slate-300">Valid Until</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-slate-800 border border-slate-300">
                    <td className="p-2.5 border border-slate-300">{data.customerName || "Customer"}</td>
                    <td className="p-2.5 border border-slate-300">{data.shopName || "N/A"}</td>
                    <td className="p-2.5 border border-slate-300">{data.phoneNumber || "N/A"}</td>
                    <td className="p-2.5 border border-slate-300">{data.date}</td>
                    <td className="p-2.5 border border-slate-300">{data.validUntil}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-700 font-medium mb-5 leading-relaxed">
              Dear Customer,<br />
              Thank you for your interest in Kravy Billing Software. As discussed, we are pleased to offer you the following package:
            </p>

            {/* PACKAGE DETAILS TABLE */}
            <h2 className="text-sm font-black uppercase text-[#1F4E79] border-b pb-1 mb-3">
              Package Details
            </h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border border-slate-300">
                    <td className="p-2.5 font-extrabold bg-[#F5F7FA] text-slate-700 w-1/3 border border-slate-300">Software Name</td>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-300">{data.softwareName}</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-2.5 font-extrabold bg-[#F5F7FA] text-slate-700 border border-slate-300">Subscription Duration</td>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-300">{data.subscriptionDuration}</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-2.5 font-extrabold bg-[#F5F7FA] text-slate-700 border border-slate-300">Price Agreed</td>
                    <td className="p-2.5 font-black text-rose-600 border border-slate-300">{data.priceAgreedText}</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-2.5 font-extrabold bg-[#F5F7FA] text-slate-700 border border-slate-300">Device Access</td>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-300">{data.deviceAccess}</td>
                  </tr>
                  <tr className="border border-slate-300">
                    <td className="p-2.5 font-extrabold bg-[#F5F7FA] text-slate-700 border border-slate-300">Hardware Included</td>
                    <td className="p-2.5 font-bold text-slate-900 border border-slate-300">{data.hardwareIncluded}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* INCLUDED FEATURES */}
            <h2 className="text-sm font-black uppercase text-[#1F4E79] border-b pb-1 mb-3">
              Included Features
            </h2>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-800 mb-6 pl-4 list-disc">
              {data.features.map((feat, idx) => (
                <li key={idx} className="leading-snug">{feat}</li>
              ))}
            </ul>

            {/* TOTAL AMOUNT TABLE */}
            <h2 className="text-sm font-black uppercase text-[#1F4E79] border-b pb-1 mb-3">
              Total Amount
            </h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1F4E79] text-white font-black border border-slate-300">
                    <th className="p-2.5 text-left border border-slate-300">Description</th>
                    <th className="p-2.5 text-right border border-slate-300 w-1/3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold border border-slate-300">
                    <td className="p-2.5 border border-slate-300">{data.totalDescription}</td>
                    <td className="p-2.5 text-right border border-slate-300">{data.totalAmountText}</td>
                  </tr>
                  <tr className="bg-[#EAF1F8] font-black text-slate-900 border border-slate-300 text-sm">
                    <td className="p-2.5 border border-slate-300">Total Payable</td>
                    <td className="p-2.5 text-right text-rose-600 border border-slate-300">{data.totalAmountText}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RENEWAL CHARGES & TERMS */}
            <h2 className="text-sm font-black uppercase text-[#1F4E79] border-b pb-1 mb-2">
              Renewal Charges
            </h2>
            <p className="text-xs text-slate-700 font-semibold mb-6">
              {data.renewalChargesText}
            </p>

            <p className="text-xs text-slate-500 font-semibold italic mb-6">
              This quotation is valid until {data.validUntil}, as discussed with the customer.
            </p>

            {/* SIGNATURE SECTION */}
            <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between text-xs font-bold text-slate-700">
              <div>
                <p className="mb-1">We look forward to serving your business!</p>
                <p className="text-[0.68rem] text-slate-400">Kravy Billing Solutions · Noida, UP</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Regards,</p>
                <p className="text-sm font-black text-[#1F4E79] mt-1">Vikas Kushwaha</p>
                <p className="text-[0.7rem] text-slate-500 font-bold">Kravy Billing Solutions</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, sidebar, button {
            display: none !important;
          }
          #quotation-doc-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

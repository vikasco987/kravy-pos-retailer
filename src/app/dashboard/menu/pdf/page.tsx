"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Printer, 
  ChevronLeft, 
  Sparkles, 
  Eye, 
  EyeOff, 
  QrCode as QrIcon, 
  Utensils, 
  Download,
  Palette,
  Columns,
  Loader2,
  CheckCircle2,
  Sliders,
  Type,
  Globe,
  Tag,
  Star,
  Clock,
  Plus
} from "lucide-react";
import QRCode from "react-qr-code";

type MenuItem = {
  id: string;
  name: string;
  price?: number | null;
  sellingPrice?: number | null;
  imageUrl?: string | null;
  unit?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  description?: string | null;
  isVeg: boolean;
  isEgg: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  isNew: boolean;
  spiciness?: string | null;
  isActive?: boolean;
};

type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export default function MenuPdfGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const asUserId = searchParams.get("asUserId");

  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Customization State (Default to Web App Replica)
  const [template, setTemplate] = useState<"web_replica" | "luxury" | "bistro" | "classic">("web_replica");
  const [columns, setColumns] = useState<1 | 2>(2);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [showImages, setShowImages] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showPrices, setShowPrices] = useState(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [asUserId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const itemsUrl = asUserId ? `/api/menu/view?asUserId=${asUserId}` : "/api/menu/view";
      const profileUrl = "/api/profile";

      const [itemsRes, profileRes] = await Promise.all([
        fetch(itemsUrl),
        fetch(profileUrl)
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(Array.isArray(data) ? data : []);
      }

      if (profileRes.ok) {
        const profData = await profileRes.json();
        setProfile(profData);
      }
    } catch (err) {
      console.error("Failed to load menu data", err);
    } finally {
      setLoading(false);
    }
  };

  // Group items by category
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: MenuItem[] }>();

    items.forEach((item) => {
      if (item.isActive === false) return;
      const catName = item.category?.name || "General Menu";
      const catId = item.category?.id || "general";

      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, items: [] });
      }
      map.get(catId)!.items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Convert all images to Base64 to prevent broken images & CORS failures
  const convertImagesToBase64 = async (container: HTMLElement) => {
    const images = Array.from(container.querySelectorAll("img"));
    for (const img of images) {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) continue;
      try {
        const res = await fetch(src, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                img.setAttribute("src", reader.result);
              }
              resolve(null);
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn("Image base64 conversion fallback for:", src);
      }
    }
  };

  // 🚀 1-CLICK DIRECT AUTO PDF DOWNLOAD (PIXEL PERFECT)
  const handleAutoDownloadPdf = async () => {
    const el = document.getElementById("pdf-menu-card-canvas");
    if (!el) return;

    setDownloadingPdf(true);
    try {
      // Pre-convert images to Base64
      await convertImagesToBase64(el);

      const html2pdf = (await import("html2pdf.js")).default;
      
      const fileName = `${(profile?.businessName || "Restaurant").replace(/[^a-zA-Z0-9]/g, "_")}_Web_Menu.pdf`;
      
      const opt = {
        margin: [5, 5, 5, 5],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          allowTaint: false
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error("Direct PDF Generation error", err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 🌐 DOWNLOAD EXACT STANDALONE WEB PAGE (.html)
  const handleDownloadWebHtml = async () => {
    const el = document.getElementById("pdf-menu-card-canvas");
    if (!el) return;

    setDownloadingHtml(true);
    try {
      // Pre-convert images to Base64 for offline portability
      await convertImagesToBase64(el);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile?.businessName || 'Store'} - Digital Web Catalog</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    @media print { body { background: white; } }
  </style>
</head>
<body class="p-4 md:p-8 flex justify-center">
  <div style="max-width: 800px; width: 100%;">
    ${el.outerHTML}
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(profile?.businessName || "Restaurant").replace(/[^a-zA-Z0-9]/g, "_")}_Web_Menu.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download HTML file", err);
    } finally {
      setDownloadingHtml(false);
    }
  };

  const menuUrl = profile?.userId ? `https://billing.kravy.in/menu/${profile.userId}` : "https://kravy.in";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" />
          <p className="text-xs font-bold text-slate-400">Loading Web Menu Catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans">
      {/* ── TOP CONTROL BAR ── */}
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
                <h1 className="text-lg font-black tracking-tight text-white">Web Catalog PDF & HTML Studio</h1>
                <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Exact Web Replica 📱
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Export pixel-perfect Web App menu or download standalone HTML file</p>
            </div>
          </div>

          {/* Controls & Templates */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* Template Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
              <button
                onClick={() => setTemplate("web_replica")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  template === "web_replica" ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "text-slate-400 hover:text-white"
                }`}
              >
                📱 Web Replica
              </button>
              <button
                onClick={() => setTemplate("luxury")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  template === "luxury" ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:text-white"
                }`}
              >
                👑 Royal Gold
              </button>
              <button
                onClick={() => setTemplate("bistro")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  template === "bistro" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                }`}
              >
                🍕 Modern Bistro
              </button>
              <button
                onClick={() => setTemplate("classic")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  template === "classic" ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                📜 Fine Vintage
              </button>
            </div>

            {/* Column Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
              {[1, 2].map((col) => (
                <button
                  key={col}
                  onClick={() => setColumns(col as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    columns === col ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {col} Col
                </button>
              ))}
            </div>

            {/* Image & Detail Toggles */}
            <button
              onClick={() => setShowImages(!showImages)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showImages ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {showImages ? <Eye size={14} /> : <EyeOff size={14} />} Photos
            </button>

            {/* 🚀 DIRECT AUTO DOWNLOAD PDF */}
            <button
              onClick={handleAutoDownloadPdf}
              disabled={downloadingPdf}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" /> Saving PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Save PDF 📄
                </>
              )}
            </button>

            {/* 🌐 DOWNLOAD HTML FILE */}
            <button
              onClick={handleDownloadWebHtml}
              disabled={downloadingHtml}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Globe size={15} /> Save Web (.html) 🌐
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

      {/* ── CANVAS DISPLAY PREVIEW CONTAINER ── */}
      <div className="max-w-4xl mx-auto my-8 px-4 print:p-0 print:m-0 print:max-w-none">
        <div
          id="pdf-menu-card-canvas"
          ref={printAreaRef}
          className={`rounded-3xl print:rounded-none overflow-hidden transition-all shadow-2xl print:shadow-none relative ${
            template === "web_replica"
              ? "bg-[#f4f4f4] text-[#1e1e1e] border border-slate-300"
              : template === "luxury"
              ? "bg-[#0c0804] text-[#f4e8c1] border border-[#3b2711] p-8"
              : template === "bistro"
              ? "bg-white text-slate-900 border border-slate-200 p-8"
              : "bg-[#fdfbf7] text-[#2c221e] border border-[#e5dec9] p-8"
          }`}
        >
          {template === "web_replica" ? (
            /* 📱 EXACT WEB MENU REPLICA (Matches Live QR Menu /menu/[clerkId]) */
            <div className="w-full bg-[#f4f4f4]">
              {/* RESTAURANT INFO HEADER */}
              <div className="bg-white p-5 border-b border-[#EBEBEB] shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                    {profile?.businessName || "Restaurant Name"}
                  </h1>
                  {profile?.businessTagLine && (
                    <p className="text-xs text-gray-500 font-semibold mb-3">
                      {profile.businessTagLine}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-gray-700">
                    <span className="border border-[#b2dfc8] bg-[#F0FDF4] text-[#22C55E] px-2 py-1 rounded-md">★ 4.3 (2.1K)</span>
                    <span className="w-[1px] h-4 bg-gray-200" />
                    <span className="border border-gray-200 px-2 py-1 rounded-md">⏱ 20–30 min</span>
                    <span className="w-[1px] h-4 bg-gray-200" />
                    <span className="border border-gray-200 px-2 py-1 rounded-md">₹350 for two</span>
                  </div>

                  {/* ADDRESS & CONTACT */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center text-[0.7rem] font-bold text-gray-500 gap-2">
                    <span>📍 {profile?.businessAddress || "Main Market, City"}</span>
                    <span>📞 {profile?.contactPersonPhone || "+91 9999999999"}</span>
                    {profile?.fssaiNumber && <span>🛡️ FSSAI: {profile.fssaiNumber}</span>}
                  </div>
                </div>

                {/* QR CODE IN HEADER */}
                {showQrCode && (
                  <div className="shrink-0 bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
                    <QRCode value={menuUrl} size={60} />
                    <span className="text-[0.55rem] font-black uppercase text-gray-800 mt-1 tracking-wider">Scan to Order</span>
                  </div>
                )}
              </div>

              {/* CATEGORIES TAB STRIP */}
              <div className="bg-white border-b border-[#EBEBEB] px-4 py-3 sticky top-0 z-20 shadow-sm flex gap-2 overflow-x-auto">
                <span className="px-4 py-2 rounded-xl text-xs font-black bg-[#E23744] text-white shadow-sm">
                  🍛 All Items ({items.length})
                </span>
                {categories.map((c) => (
                  <span key={c.id} className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 shrink-0">
                    {c.name} ({c.items.length})
                  </span>
                ))}
              </div>

              {/* MENU ITEMS BODY */}
              <div className="p-4 space-y-6">
                {categories.map((cat) => (
                  <section key={cat.id} className="bg-white rounded-2xl p-4 border border-[#EBEBEB] shadow-sm break-inside-avoid">
                    <h2 className="text-base font-black text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 border-gray-100 flex items-center justify-between">
                      <span>{cat.name}</span>
                      <span className="text-xs font-bold text-gray-400 font-normal">({cat.items.length} items)</span>
                    </h2>

                    <div className={`grid gap-4 ${columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                      {cat.items.map((item) => {
                        const displayPrice = item.sellingPrice || item.price || 0;

                        return (
                          <div key={item.id} className="bg-white border border-[#F0F0F0] rounded-2xl p-3 flex items-start justify-between gap-3 shadow-2xs break-inside-avoid hover:border-gray-300 transition-all">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {showBadges && (
                                  <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 ${
                                    item.isVeg ? "border-green-600 bg-green-50" : item.isEgg ? "border-amber-500 bg-amber-50" : "border-red-600 bg-red-50"
                                  }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                      item.isVeg ? "bg-green-600" : item.isEgg ? "bg-amber-500" : "bg-red-600"
                                    }`} />
                                  </div>
                                )}
                                <h3 className="text-sm font-extrabold text-gray-900 truncate">{item.name}</h3>
                              </div>

                              {item.isBestseller && (
                                <span className="inline-block text-[0.55rem] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 mb-1">
                                  ★ Bestseller
                                </span>
                              )}

                              {showPrices && (
                                <div className="text-sm font-black text-gray-900 mt-1">
                                  ₹{displayPrice.toFixed(2)}
                                </div>
                              )}

                              {showDescriptions && item.description && (
                                <p className="text-[0.68rem] text-gray-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {showImages && (
                              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                    <Utensils size={24} />
                                  </div>
                                )}
                                <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[0.6rem] font-black text-rose-600 border border-rose-200 shadow-sm">
                                  + ADD
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {/* FOOTER */}
              <div className="bg-white p-6 border-t border-[#EBEBEB] text-center text-xs font-bold text-gray-500">
                <p className="font-extrabold text-gray-800 text-sm mb-1">
                  {profile?.greetingMessage || "Thank You! Visit Again 🙏"}
                </p>
                <p className="text-[0.65rem] text-gray-400">
                  Powered by KravyPOS Smart QR Menu & Billing System.
                </p>
              </div>
            </div>
          ) : (
            /* 👑 ROYAL GOLD / BISTRO / VINTAGE DESIGNS */
            <div>
              <div className="text-center border-b pb-8 mb-8 relative">
                {profile?.logoUrl || profile?.profileImageUrl ? (
                  <div className="w-24 h-24 mx-auto mb-4 relative rounded-full overflow-hidden border-2 shadow-xl border-amber-500/40">
                    <img
                      src={profile.logoUrl || profile.profileImageUrl}
                      alt={profile.businessName || "Restaurant"}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center text-3xl shadow-lg ${
                    template === "luxury"
                      ? "bg-gradient-to-br from-amber-500 to-amber-700 text-black"
                      : template === "bistro"
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                      : "bg-[#3c2a21] text-[#fdfbf7]"
                  }`}>
                    <Utensils size={36} />
                  </div>
                )}

                <h1 className={`text-3xl md:text-5xl font-black uppercase tracking-tight leading-none mb-2 ${
                  template === "luxury"
                    ? "font-[Syne] text-transparent bg-clip-text bg-gradient-to-r from-[#f7e39c] via-[#d4a353] to-[#e6b85c]"
                    : template === "classic"
                    ? "font-serif text-[#3c2a21]"
                    : "text-slate-900"
                }`}>
                  {profile?.businessName || "Restaurant Menu"}
                </h1>

                {profile?.businessTagLine && (
                  <p className="text-xs md:text-sm font-semibold italic mt-1 opacity-80">
                    “{profile.businessTagLine}”
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold mt-4 opacity-75">
                  {profile?.contactPersonPhone && <span>📞 {profile.contactPersonPhone}</span>}
                  {profile?.businessAddress && <span>📍 {profile.businessAddress}</span>}
                  {profile?.fssaiNumber && <span>🛡️ FSSAI: {profile.fssaiNumber}</span>}
                </div>

                {showQrCode && (
                  <div className="absolute top-0 right-0 hidden sm:flex flex-col items-center gap-1.5 p-3 rounded-2xl border shadow-lg bg-white text-gray-900 print:flex">
                    <QRCode value={menuUrl} size={70} />
                    <span className="text-[0.6rem] font-black uppercase tracking-wider">Scan Order</span>
                  </div>
                )}
              </div>

              {/* CATEGORIES & ITEMS */}
              <div className="space-y-8">
                {categories.map((cat) => (
                  <section key={cat.id} className="break-inside-avoid">
                    <h2 className={`text-lg md:text-xl font-black uppercase tracking-wider mb-4 border-b-2 pb-1 ${
                      template === "luxury" ? "text-[#f7e39c] border-[#d4a353]/60" : "text-slate-900 border-slate-900"
                    }`}>
                      {cat.name} ({cat.items.length})
                    </h2>

                    <div className={`grid gap-4 ${columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                      {cat.items.map((item) => (
                        <div key={item.id} className="p-3 rounded-xl border border-black/10 flex items-start gap-3 break-inside-avoid">
                          {showImages && (
                            <div className="w-14 h-14 shrink-0 relative rounded-lg overflow-hidden bg-gray-100">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  crossOrigin="anonymous"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Utensils size={18} className="m-auto opacity-30" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-black text-sm truncate">{item.name}</h3>
                              {showPrices && <span className="font-black text-sm">₹{(item.sellingPrice || item.price || 0).toFixed(2)}</span>}
                            </div>
                            {showDescriptions && item.description && <p className="text-[0.68rem] opacity-70 mt-1 line-clamp-2">{item.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* FOOTER */}
              <div className="mt-12 pt-6 border-t border-black/10 text-center text-xs font-bold">
                <p className="font-extrabold text-sm">{profile?.greetingMessage || "Thank You! Visit Again 🙏"}</p>
                <p className="text-[0.65rem] opacity-70 mt-0.5">Powered by KravyPOS Smart Billing System.</p>
              </div>
            </div>
          )}
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
          #pdf-menu-card-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

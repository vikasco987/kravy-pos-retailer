"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Play, 
  Search, 
  ExternalLink, 
  Youtube, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Layers, 
  Receipt, 
  Package, 
  LayoutGrid, 
  HelpCircle, 
  MessageCircle, 
  Share2, 
  CheckCircle2,
  X,
  Zap,
  Printer,
  Smartphone,
  Film
} from "lucide-react";

export interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  hindiTitle?: string;
  description: string;
  duration: string;
  category: "billing" | "inventory" | "menu" | "tables" | "hardware";
  type: "video" | "short";
  tags: string[];
  featured?: boolean;
}

// 9 Official Videos from https://www.youtube.com/@Support-Kravy (5 Full Tutorials + 4 YouTube Shorts)
export const TUTORIAL_VIDEOS: VideoItem[] = [
  // Full Videos (5)
  {
    id: "vid-billing-quick",
    youtubeId: "5YRxIC1s240",
    title: "POS Billing Tutorial in Hindi | Quick POS, Fast Billing & Printer Setup",
    hindiTitle: "Quick Billing, Fast Checkout & Thermal Printer Setup Kaise Karein",
    description: "Step-by-step masterclass on handling rapid dine-in and takeaway orders, cart management, customer details, split payments, and instant receipt printing.",
    duration: "03:15",
    category: "billing",
    type: "video",
    tags: ["Billing", "Quick POS", "Printer", "Dine In", "Takeaway"],
    featured: true
  },
  {
    id: "vid-bill-edit",
    youtubeId: "GRTvcZcxlfs",
    title: "Billing Software में Bill Edit कैसे करें? Pending Bill को Paid में Convert करना सीखें",
    hindiTitle: "Bill Edit, Items Update & Pending Bill ko Paid me Convert Karein",
    description: "Iss video mein seekhein Kravy POS mein saved bills ko edit karna, items add/remove karna, quantities change karna aur credit/pending bills ko paid mein convert karna.",
    duration: "03:19",
    category: "billing",
    type: "video",
    tags: ["Bill Edit", "Pending Bill", "Paid Bill", "Bill Manager", "POS"],
    featured: true
  },
  {
    id: "vid-tables",
    youtubeId: "Ryy0pojR-iE",
    title: "Counter & Table Management Software Demo | Add Order, Transfer Table, Add Items & Print Bill",
    hindiTitle: "Table Management, Running Order Transfer & Table Bill Settlement",
    description: "Complete guide on floor plan navigation, taking table orders, adding running KOT items, transferring bills between tables, and final checkout.",
    duration: "05:45",
    category: "tables",
    type: "video",
    tags: ["Tables", "Floor Plan", "Transfer", "KOT", "Dine-in"],
    featured: true
  },
  {
    id: "vid-menu",
    youtubeId: "cIpRywhsS-Y",
    title: "POS Item Management Tutorial in Hindi | Edit Price, Category, Variants & Add New Items",
    hindiTitle: "Menu Items, Categories, Add-ons & Price Update Kaise Karein",
    description: "Learn how to organize your food catalog, create item variations (Half/Full), link modifiers, configure food tax/GST, and disable out-of-stock dishes.",
    duration: "03:57",
    category: "menu",
    type: "video",
    tags: ["Menu", "Variants", "Categories", "Pricing", "Addons"]
  },
  {
    id: "vid-inventory",
    youtubeId: "d1hiPIp1Cl8",
    title: "Inventory Settings in Billing Software | Enable/Disable Stock Management & Settings Explained",
    hindiTitle: "Stock Inventory, Raw Material & Low Stock Alerts Guide",
    description: "Deep dive into raw material tracking, stock in/out management, low stock threshold warnings, and automated inventory deductions upon order.",
    duration: "05:47",
    category: "inventory",
    type: "video",
    tags: ["Inventory", "Stock", "Alerts", "Raw Materials"]
  },

  // YouTube Shorts / Quick Tips (4)
  {
    id: "short-item-variants",
    youtubeId: "ZBMCRXbmSBc",
    title: "Item Variants कैसे सेट करें? 🍔 | Menu में Variants कैसे दिखते हैं | POS Billing Software Tutorial",
    hindiTitle: "Menu me Half / Full / Regular Variants Setup & Display Guide",
    description: "Kravy POS me kisi bhi item ke multiple variants (Half/Full, Size, Portions) kaise set karein aur checkout counter par yeh kaise appear hote hain.",
    duration: "02:26",
    category: "menu",
    type: "short",
    tags: ["Item Variants", "Shorts", "Portions", "Menu Management", "Quick Setup"]
  },
  {
    id: "short-printer-fix",
    youtubeId: "7G1AG0gHNaY",
    title: "Printer बार-बार Disconnect हो रहा है? 🔥 ऐसे करें Disconnect & Reconnect | Printer Problem Solution",
    hindiTitle: "Thermal Printer Disconnect Problem Solution & Reconnect Guide",
    description: "Thermal USB / Bluetooth receipt printer disconnect issue solve karne ka 60-second quick guide. Reconnect karein aur smooth printing payein.",
    duration: "01:04",
    category: "hardware",
    type: "short",
    tags: ["Printer Fix", "Shorts", "Bluetooth Printer", "Thermal Setup", "Troubleshooting"]
  },
  {
    id: "short-bill-hold",
    youtubeId: "6itptYm_OVo",
    title: "POS Software में Bill Hold & Resume कैसे करें? | Customer Details से Final Bill तक",
    hindiTitle: "Rush Hours me Customer Cart Hold & Resume Karna Seekhein",
    description: "Rush hour ke dauraan cart hold karein, doosre customer ka bill banayein aur pehle wale bill ko bina data loose kiye 1-click me resume karein.",
    duration: "02:03",
    category: "billing",
    type: "short",
    tags: ["Hold Bill", "Shorts", "Resume Bill", "Rush Hours", "Fast Billing"]
  },
  {
    id: "short-pos-demo",
    youtubeId: "2xCLaPbWGeQ",
    title: "Kravy POS Quick Overview & Counter Billing Demo | Ultra-Fast Billing Experience",
    hindiTitle: "Fast Counter Billing Demo & Kravy POS Features Overview",
    description: "Kravy POS interface ka superfast counter billing walkthrough - touch item selection, instant discounts aur direct receipt printing demo.",
    duration: "01:55",
    category: "billing",
    type: "short",
    tags: ["POS Demo", "Shorts", "Counter Billing", "Kravy POS", "Fast Billing"]
  }
];

const CATEGORIES = [
  { id: "all", label: "All Topics", icon: <Layers size={14} /> },
  { id: "billing", label: "POS & Billing", icon: <Receipt size={14} /> },
  { id: "tables", label: "Tables & Floor", icon: <LayoutGrid size={14} /> },
  { id: "menu", label: "Menu & Variants", icon: <Sparkles size={14} /> },
  { id: "inventory", label: "Inventory & Stock", icon: <Package size={14} /> },
  { id: "hardware", label: "Printer & Hardware", icon: <Printer size={14} /> },
];

export default function SupportVideosPage() {
  const [selectedFormat, setSelectedFormat] = useState<"all" | "video" | "short">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalVideo, setActiveModalVideo] = useState<VideoItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const videoCounts = useMemo(() => {
    const fullVideos = TUTORIAL_VIDEOS.filter(v => v.type === "video").length;
    const shorts = TUTORIAL_VIDEOS.filter(v => v.type === "short").length;
    return { all: TUTORIAL_VIDEOS.length, fullVideos, shorts };
  }, []);

  const filteredVideos = useMemo(() => {
    return TUTORIAL_VIDEOS.filter((video) => {
      // Format filter (All, Full Video, or Short)
      if (selectedFormat !== "all" && video.type !== selectedFormat) {
        return false;
      }

      // Category filter
      const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
      if (!matchesCategory) return false;

      // Search query
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        video.title.toLowerCase().includes(query) ||
        (video.hindiTitle && video.hindiTitle.toLowerCase().includes(query)) ||
        video.description.toLowerCase().includes(query) ||
        video.tags.some(t => t.toLowerCase().includes(query))
      );
    });
  }, [selectedFormat, selectedCategory, searchQuery]);

  const featuredVideo = useMemo(() => {
    return TUTORIAL_VIDEOS.find(v => v.featured) || TUTORIAL_VIDEOS[0];
  }, []);

  const handleShare = (video: VideoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = video.type === "short" 
      ? `https://www.youtube.com/shorts/${video.youtubeId}`
      : `https://www.youtube.com/watch?v=${video.youtubeId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 sm:gap-7 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Link
            href="/dashboard/help"
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{
              background: "var(--kravy-surface)",
              border: "1px solid var(--kravy-border)",
              color: "var(--kravy-text-primary)"
            }}
            title="Back to Help Center"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1 tracking-wide">
                <Youtube size={12} /> OFFICIAL YOUTUBE TUTORIALS & SHORTS
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 hidden sm:inline-flex items-center gap-1">
                9 Videos Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-1 truncate" style={{ color: "var(--kravy-text-primary)" }}>
              Kravy POS Video Tutorials & Shorts
            </h1>
          </div>
        </div>

        {/* Subscribe / Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <a
            href="https://wa.me/919289507882?text=Hello%20Kravy%20Team%2C%20I%20need%20help%20with%20POS%20video%20tutorial"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
            style={{
              background: "var(--kravy-surface)",
              color: "var(--kravy-text-primary)",
              border: "1px solid var(--kravy-border)"
            }}
          >
            <MessageCircle size={16} className="text-emerald-500" /> WhatsApp Support
          </a>

          <a
            href="https://www.youtube.com/@Support-Kravy?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-red-600/20 transition-all"
          >
            <Youtube size={16} /> @Support-Kravy <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Featured Video Spotlight Banner */}
      {featuredVideo && (
        <div
          className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(139,92,246,0.06) 100%)",
            borderColor: "rgba(239,68,68,0.2)"
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
            {/* Left: Thumbnail & Play Button */}
            <div
              onClick={() => setActiveModalVideo(featuredVideo)}
              className="lg:col-span-7 relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer shadow-lg bg-black group"
            >
              <img
                src={`https://i.ytimg.com/vi/${featuredVideo.youtubeId}/hqdefault.jpg`}
                alt={featuredVideo.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40 group-hover:scale-110 transition-transform">
                  <Play size={26} fill="currentColor" className="ml-1" />
                </div>
              </div>

              <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-sm text-white text-[11px] sm:text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <Clock size={12} /> {featuredVideo.duration}
              </div>
            </div>

            {/* Right: Info */}
            <div className="lg:col-span-5 flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wide uppercase">
                  Featured Masterclass
                </span>
                <span className="text-xs italic" style={{ color: "var(--kravy-text-muted)" }}>
                  Must-watch for billing staff & managers
                </span>
              </div>

              <h2 className="text-base sm:text-lg lg:text-xl font-black leading-snug mb-1.5 break-words" style={{ color: "var(--kravy-text-primary)" }}>
                {featuredVideo.title}
              </h2>

              {featuredVideo.hindiTitle && (
                <p className="text-xs sm:text-sm font-bold text-violet-600 dark:text-violet-400 mb-2">
                  {featuredVideo.hindiTitle}
                </p>
              )}

              <p className="text-xs sm:text-sm line-clamp-3 leading-relaxed mb-4" style={{ color: "var(--kravy-text-muted)" }}>
                {featuredVideo.description}
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveModalVideo(featuredVideo)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-transform hover:scale-[1.02]"
                  style={{
                    background: "var(--kravy-text-primary)",
                    color: "var(--kravy-surface)"
                  }}
                >
                  <Play size={15} fill="currentColor" /> Watch Now
                </button>

                <a
                  href={`https://www.youtube.com/watch?v=${featuredVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                  style={{
                    border: "1px solid var(--kravy-border)",
                    color: "var(--kravy-text-primary)"
                  }}
                >
                  YouTube <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Format Switcher (All vs Full Tutorials vs YouTube Shorts) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="inline-flex p-1 rounded-2xl border" style={{ background: "var(--kravy-surface)", borderColor: "var(--kravy-border)" }}>
          <button
            onClick={() => setSelectedFormat("all")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedFormat === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                : "text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
            }`}
          >
            <Layers size={14} /> All Content ({videoCounts.all})
          </button>

          <button
            onClick={() => setSelectedFormat("video")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedFormat === "video"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-[var(--kravy-text-secondary)] hover:text-[var(--kravy-text-primary)]"
            }`}
          >
            <Film size={14} /> Full Tutorials ({videoCounts.fullVideos})
          </button>

          <button
            onClick={() => setSelectedFormat("short")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              selectedFormat === "short"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm"
                : "text-[var(--kravy-text-secondary)] hover:text-red-500"
            }`}
          >
            <Zap size={14} className="text-amber-300" /> Shorts & Quick Tips ({videoCounts.shorts})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72 flex-shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--kravy-text-muted)" }} />
          <input
            type="text"
            placeholder="Search all 9 tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm outline-none border transition-colors"
            style={{
              background: "var(--kravy-surface)",
              borderColor: "var(--kravy-border)",
              color: "var(--kravy-text-primary)"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (horizontal scroll on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all ${
                active 
                  ? "bg-red-600 text-white font-black shadow-sm" 
                  : "font-semibold border"
              }`}
              style={{
                borderColor: active ? "#DC2626" : "var(--kravy-border)",
                background: active ? "#DC2626" : "var(--kravy-surface)",
                color: active ? "#FFFFFF" : "var(--kravy-text-primary)"
              }}
            >
              {cat.icon}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Videos Responsive Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveModalVideo(video)}
              className="flex flex-col rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
              style={{
                background: "var(--kravy-surface)",
                borderColor: "var(--kravy-border)",
                boxShadow: "var(--kravy-card-shadow, 0 4px 12px rgba(0,0,0,0.03))"
              }}
            >
              {/* Thumbnail Container */}
              <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                <img
                  src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors group-hover:bg-black/40">
                  <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* Badge for Short vs Full Video */}
                {video.type === "short" ? (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 uppercase tracking-wider">
                    <Zap size={11} className="text-amber-300" /> YouTube Short
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Film size={11} /> Tutorial
                  </div>
                )}

                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock size={10} /> {video.duration}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {video.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-violet-600 dark:text-violet-400 bg-violet-500/10"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-sm sm:text-base font-extrabold leading-snug line-clamp-2 mb-1 group-hover:text-red-500 transition-colors" style={{ color: "var(--kravy-text-primary)" }}>
                  {video.title}
                </h3>

                {video.hindiTitle && (
                  <p className="text-xs italic mb-2 line-clamp-1" style={{ color: "var(--kravy-text-muted)" }}>
                    {video.hindiTitle}
                  </p>
                )}

                <p className="text-xs line-clamp-2 leading-relaxed mb-4 mt-auto" style={{ color: "var(--kravy-text-muted)" }}>
                  {video.description}
                </p>

                {/* Card Action Row */}
                <div className="pt-3 border-t flex items-center justify-between mt-auto" style={{ borderColor: "var(--kravy-border)" }}>
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <Play size={12} fill="currentColor" /> {video.type === "short" ? "Watch Short" : "Watch Tutorial"}
                  </span>

                  <button
                    onClick={(e) => handleShare(video, e)}
                    className="flex items-center gap-1 text-xs font-semibold py-1 px-2 rounded-md transition-colors"
                    style={{ color: copiedId === video.id ? "#22C55E" : "var(--kravy-text-muted)" }}
                    title="Copy Video Link"
                  >
                    {copiedId === video.id ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Share2 size={13} /> Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 px-4 rounded-2xl border"
          style={{ background: "var(--kravy-surface)", borderColor: "var(--kravy-border)" }}
        >
          <Youtube size={44} className="text-red-500 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold mb-1" style={{ color: "var(--kravy-text-primary)" }}>
            No Videos Found
          </h3>
          <p className="text-xs sm:text-sm max-w-sm mx-auto mb-4" style={{ color: "var(--kravy-text-muted)" }}>
            Koi video filter se match nahi hui. Dusri category ya format select karein.
          </p>
          <button
            onClick={() => { setSelectedFormat("all"); setSelectedCategory("all"); setSearchQuery(""); }}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Embedded Video Modal */}
      {activeModalVideo && (
        <div
          onClick={() => setActiveModalVideo(null)}
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[94vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <Youtube size={18} className="text-red-500 flex-shrink-0" />
                <span className="text-white text-xs sm:text-sm font-bold truncate">
                  {activeModalVideo.type === "short" ? "⚡ YouTube Short (Quick Tip)" : "Kravy POS Official Tutorial"}
                </span>
                <span className="text-[10px] bg-red-600/30 text-red-300 font-bold px-2 py-0.5 rounded hidden sm:inline">
                  {activeModalVideo.duration}
                </span>
              </div>
              <button
                onClick={() => setActiveModalVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0 ml-2"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative w-full aspect-video bg-black flex-shrink-0">
              <iframe
                src={`https://www.youtube.com/embed/${activeModalVideo.youtubeId}?autoplay=1&rel=0`}
                title={activeModalVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Modal Description */}
            <div className="p-4 sm:p-5 text-slate-100 overflow-y-auto">
              <h3 className="text-sm sm:text-base md:text-lg font-black leading-snug mb-1">
                {activeModalVideo.title}
              </h3>
              {activeModalVideo.hindiTitle && (
                <p className="text-xs sm:text-sm text-violet-400 font-bold mb-2">
                  {activeModalVideo.hindiTitle}
                </p>
              )}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {activeModalVideo.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <div className="flex gap-1.5 flex-wrap">
                  {activeModalVideo.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeModalVideo.type === "short"
                      ? `https://www.youtube.com/shorts/${activeModalVideo.youtubeId}`
                      : `https://www.youtube.com/watch?v=${activeModalVideo.youtubeId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    Open on YouTube <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Need More Assistance Banner */}
      <div
        className="rounded-2xl p-4 sm:p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: "var(--kravy-surface)",
          borderColor: "var(--kravy-border)"
        }}
      >
        <div className="min-w-0">
          <h4 className="text-sm sm:text-base font-extrabold mb-1" style={{ color: "var(--kravy-text-primary)" }}>
            Feature samajhne mein koi dikkat aa rahi hai?
          </h4>
          <p className="text-xs sm:text-sm" style={{ color: "var(--kravy-text-muted)" }}>
            Humari official support team se WhatsApp ya Call par directly connect karein.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <a
            href="https://wa.me/919289507882"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            <MessageCircle size={15} /> WhatsApp Support
          </a>
          <a
            href="https://www.youtube.com/@Support-Kravy?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600/20"
          >
            <Youtube size={15} /> Subscribe YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

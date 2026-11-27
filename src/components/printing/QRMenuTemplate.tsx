"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Edit3, Check, Sparkles, Coffee, Pizza, Utensils, Zap, Share2, MessageCircle, Mail, Copy, ExternalLink } from "lucide-react";
import { domToPng } from "modern-screenshot";
import QRCode from "react-qr-code";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

interface QRMenuTemplateProps {
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    qrUrl: string;
    rawUrl?: string;
    tableId?: string;
    tableName?: string;
}

const QRMenuTemplate: React.FC<QRMenuTemplateProps> = ({ isOpen, onClose, businessName, qrUrl, rawUrl, tableId, tableName }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const isNative = Capacitor.isNativePlatform();
            const isSmall = typeof window !== "undefined" && (window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
            setIsMobileDevice(isNative || isSmall);
        };
        checkMobile();
    }, []);

    // Dynamic Fields
    const [customName, setCustomName] = useState(businessName);
    const [tagline, setTagline] = useState("A Place to Feel at Home");
    const [logoEmoji, setLogoEmoji] = useState("☕");
    const [customTableNo, setCustomTableNo] = useState(tableName || "00");
    const [showTableNo, setShowTableNo] = useState(true);

    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

    // Extract actual menu link (from rawUrl or decoded data param from qrUrl)
    const effectiveMenuUrl = React.useMemo(() => {
        if (rawUrl) return rawUrl;
        if (qrUrl) {
            try {
                const urlObj = new URL(qrUrl);
                const dataParam = urlObj.searchParams.get("data");
                if (dataParam) return decodeURIComponent(dataParam);
            } catch (e) {
                // Ignore if not a valid URL
            }
            return qrUrl;
        }
        return typeof window !== "undefined" ? window.location.origin : "";
    }, [rawUrl, qrUrl]);

    const handleDownloadOrShare = async () => {
        // Open the interactive share modal immediately so user never waits or sees delay
        setShareModalOpen(true);

        if (!cardRef.current || generatedImageUrl) return;

        // Generate high-res image in the background for direct PNG download / clipboard copy
        try {
            const dataUrl = await domToPng(cardRef.current, {
                scale: 2.5,
                quality: 0.95,
            });
            const fileName = `${customName || "Menu"}_Table_${customTableNo || "Card"}.png`;
            setGeneratedImageUrl(dataUrl);

            try {
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                setGeneratedBlob(blob);
            } catch (blobErr) {
                console.warn("Blob parsing error:", blobErr);
            }
        } catch (err) {
            console.warn("Background card capture skipped:", err);
        }
    };

    const [isLinkCopied, setIsLinkCopied] = useState(false);

    // Guaranteed copy function that works across all browsers & webviews
    const copyTextFallback = (text: string): boolean => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            return successful;
        } catch (e) {
            return false;
        }
    };

    // Direct QR Image Download URL that automatically triggers file download when pasted or opened in any browser
    const directDownloadUrl = React.useMemo(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://billing.kravy.in";
        const safeBase = (origin.includes("localhost") || origin.includes("capacitor://")) ? origin : origin;
        const targetData = effectiveMenuUrl || "";
        return `${safeBase}/api/tables/qr-download?data=${encodeURIComponent(targetData)}&name=${encodeURIComponent(customName)}&table=${encodeURIComponent(customTableNo)}`;
    }, [effectiveMenuUrl, customName, customTableNo]);

    const handleCopyLink = async () => {
        // Copy the direct image download link so that pasting into Chrome or any tab immediately downloads the image
        const urlToCopy = directDownloadUrl;
        let copied = false;

        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(urlToCopy);
                copied = true;
            } catch (err) {
                console.log("navigator.clipboard.writeText failed, trying fallback:", err);
            }
        }

        if (!copied) {
            copied = copyTextFallback(urlToCopy);
        }

        if (copied) {
            setIsLinkCopied(true);
            toast.success("Download link copied to clipboard!");
            setTimeout(() => setIsLinkCopied(false), 2500);
        } else {
            toast.error("Could not copy link to clipboard");
        }
    };

    const handleShareWhatsAppDirect = () => {
        const text = `🍽️ *${customName}* - Menu QR Code\n\n📌 Table / Section: *${customTableNo}*\n👉 Click to download QR code image directly:\n🔗 ${directDownloadUrl}\n\n_Powered by Kravy POS_`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleShareEmailDirect = () => {
        const subject = encodeURIComponent(`${customName} - Menu QR Code`);
        const body = encodeURIComponent(`Hi,\n\nHere is the direct QR Code download link for ${customName} (Table: ${customTableNo}).\n\nDownload QR Code Image: ${directDownloadUrl}\n\nRegards,\n${customName}`);
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    };

    const handleDirectDownload = async () => {
        let imgUrl = generatedImageUrl;
        if (!imgUrl && cardRef.current) {
            try {
                imgUrl = await domToPng(cardRef.current, { scale: 2.5, quality: 0.95 });
                setGeneratedImageUrl(imgUrl);
            } catch (err) {
                console.warn("Direct download capture failed:", err);
            }
        }
        if (!imgUrl) {
            toast.error("Could not capture image, please try again");
            return;
        }
        const link = document.createElement("a");
        link.download = `${customName || "Menu"}_Table_${customTableNo || "Card"}.png`;
        link.href = imgUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Menu card downloaded to your device!");
    };

    const modalContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll modal container to top when opened
    useEffect(() => {
        if (isOpen && modalContainerRef.current) {
            modalContainerRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (!isOpen) return;
        const origOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = origOverflow;
        };
    }, [isOpen]);

    if (!isOpen || typeof document === "undefined") return null;

    const modalContent = (
        <AnimatePresence>
            <div 
                ref={modalContainerRef}
                className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
            >
                {/* Floating Top-Right Close Button for quick exit on any screen size */}
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-[1000000] w-11 h-11 rounded-full bg-slate-900/90 border border-slate-700/80 text-white hover:text-rose-400 hover:bg-slate-800 flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-sm"
                    aria-label="Close template editor"
                >
                    <X size={22} />
                </button>

                <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-5xl w-full my-auto items-center justify-center pt-8 sm:pt-4 pb-8"
                >
                    {/* PREVIEW CARD */}
                    <div className="flex-1 flex justify-center items-center py-2 sm:py-4">
                        <div 
                            ref={cardRef}
                            style={{
                                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                            }}
                            className="relative w-full max-w-[400px] rounded-[32px] p-10 text-center shadow-2xl overflow-hidden border border-white/10"
                        >
                            {/* Inner Glow/Sparkle CSS Logic */}
                            <div className="absolute top-[-60%] left-[-30%] w-[160%] h-[160%] bg-[radial-gradient(circle,rgba(255,200,80,0.08)_0%,transparent_60%)] pointer-events-none" />
                            <div className="absolute top-5 right-6 text-2xl animate-pulse text-yellow-400">✨</div>

                            {/* Header */}
                            <div className="mb-2">
                                <span className="text-5xl block mb-2 drop-shadow-[0_0_12px_rgba(255,200,80,0.6)] animate-bounce">{logoEmoji}</span>
                                <h1 className="font-playfair text-3xl font-black tracking-widest uppercase mb-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-sm">
                                    {customName}
                                </h1>
                                <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-medium">{tagline}</p>
                            </div>

                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
                                <div className="text-yellow-400 text-sm">❋</div>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
                            </div>

                            <div className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em] mb-5">📱 Scan to View Our Menu</div>

                            {/* QR Section */}
                            <div className="relative inline-block mb-6">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] border-2 border-yellow-400/30 rounded-full animate-ping pointer-events-none" />
                                <div className="bg-white rounded-3xl p-4 shadow-[0_0_40px_rgba(255,165,0,0.2)] relative z-10 border-4 border-yellow-400/20">
                                    {/* Corner Accents */}
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />
                                    <div className="w-[200px] h-[200px] flex items-center justify-center overflow-hidden rounded-xl bg-white">
                                        {effectiveMenuUrl ? (
                                            <QRCode
                                                value={effectiveMenuUrl}
                                                size={196}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                viewBox={`0 0 256 256`}
                                            />
                                        ) : (
                                            <img 
                                                src={qrUrl} 
                                                alt="Menu QR" 
                                                crossOrigin="anonymous"
                                                className="w-[200px] h-[200px] rounded-xl object-contain" 
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-full py-2.5 px-6 mb-6 inline-flex items-center gap-2 mx-auto">
                                <span className="text-lg">📷</span>
                                <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest">Point camera to order</span>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {[
                                    { i: "🍵", l: "CHAI" },
                                    { i: "🍕", l: "PIZZA" },
                                    { i: "🍜", l: "SNACKS" },
                                    { i: "🍽️", l: "THALI" }
                                ].map((f, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 opacity-60">
                                        <span className="text-xl">{f.i}</span>
                                        <span className="text-[7px] font-black text-white/50 tracking-tighter">{f.l}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

                            <div className="text-[9px] text-white/30 tracking-widest uppercase">
                                Powered by <span className="text-yellow-400/60 font-black">{customName}</span> {showTableNo && `• Table ${customTableNo}`}
                            </div>
                        </div>
                    </div>

                    {/* EDITOR SIDEBAR */}
                    <div className="w-full lg:w-[400px] bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col shadow-2xl h-fit self-center">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">QR Template Editor</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Customize your menu card</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Business Name</label>
                                <input 
                                    type="text" 
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Table Number</label>
                                    <input 
                                        type="text" 
                                        value={customTableNo}
                                        onChange={(e) => setCustomTableNo(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                        placeholder="e.g. 01"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button 
                                        onClick={() => setShowTableNo(!showTableNo)}
                                        className={`h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${showTableNo ? "bg-yellow-400 border-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/10" : "bg-slate-800 border-slate-700 text-slate-400"}`}
                                    >
                                        {showTableNo ? "Hide Table" : "Show Table"}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Slogan / Tagline</label>
                                <input 
                                    type="text" 
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Logo Emoji</label>
                                <div className="flex gap-2">
                                    {["☕", "🍔", "🍕", "🥘", "🍦", "🍗"].map(e => (
                                        <button 
                                            key={e}
                                            onClick={() => setLogoEmoji(e)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${logoEmoji === e ? "bg-yellow-400 shadow-lg shadow-yellow-400/20 scale-110" : "bg-slate-800 hover:bg-slate-700"}`}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 flex flex-col gap-3">
                            <button 
                                onClick={handleDownloadOrShare}
                                disabled={isDownloading}
                                className="w-full h-14 bg-yellow-400 text-slate-900 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-yellow-400/10 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                            >
                                {isDownloading ? "Processing..." : (
                                    <><Share2 size={18} /> Share Menu Card</>
                                )}
                            </button>
                            <button 
                                onClick={onClose}
                                className="w-full h-12 bg-slate-800 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                            >
                                Close Editor
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Interactive Share Modal (WhatsApp, Copy Image, Email, Download) */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-[1000005] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
                    >
                        <button
                            onClick={() => setShareModalOpen(false)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold">
                                <Share2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Share Menu Card</h3>
                                <p className="text-xs text-slate-400">{customName} • Table {customTableNo}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2.5">
                            {/* WhatsApp Share */}
                            <button
                                onClick={handleShareWhatsAppDirect}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <MessageCircle size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Share on WhatsApp</div>
                                        <div className="text-[11px] text-slate-400">Send direct image download link</div>
                                    </div>
                                </div>
                                <ExternalLink size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            </button>

                            {/* Copy Image Download Link to Clipboard */}
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Copy size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {isLinkCopied ? "Link Copied!" : "Copy Download Link"}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {isLinkCopied ? "Paste in browser to download image" : "Paste in browser to download image directly"}
                                        </div>
                                    </div>
                                </div>
                                <Check size={16} className={`transition-colors ${isLinkCopied ? "text-emerald-400 font-bold" : "text-slate-500 group-hover:text-indigo-400"}`} />
                            </button>

                            {/* Email Share */}
                            <button
                                onClick={handleShareEmailDirect}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
                                        <Mail size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">Share via Email</div>
                                        <div className="text-[11px] text-slate-400">Compose email with menu details</div>
                                    </div>
                                </div>
                                <ExternalLink size={16} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
                            </button>

                            {/* Direct Download Image */}
                            <button
                                onClick={handleDirectDownload}
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center">
                                        <Download size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">Download PNG File</div>
                                        <div className="text-[11px] text-slate-400">Save image directly to device</div>
                                    </div>
                                </div>
                                <Download size={16} className="text-slate-500 group-hover:text-yellow-400 transition-colors" />
                            </button>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-800/60">
                            <button
                                onClick={() => setShareModalOpen(false)}
                                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default QRMenuTemplate;

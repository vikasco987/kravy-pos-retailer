"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
    ArrowLeft, 
    Download, 
    Star, 
    Copy,
    Sparkles, 
    Check, 
    Info,
    ExternalLink,
    Search
} from "lucide-react";
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import QRCode from "react-qr-code";
import { kravy } from "@/lib/sounds";

// Preset styles for the Google Review Standee
const STYLES = [
    {
        id: "google-classic",
        name: "Google Classic (Cream)",
        bg: "#FAF6EE",
        textPrimary: "#1F2937",
        textSecondary: "#4B5563",
        starColor: "#FBBC05",
        logoMode: "color",
        borderStyle: "border border-gray-200/60 shadow-xl",
        qrBg: "#FFFFFF",
        qrFg: "#111827",
        blockBg: "#4285F4", // Google Blue
        blockText: "#FFFFFF",
        blockSubtext: "rgba(255,255,255,0.85)",
        searchBorder: "#4285F4",
        searchLabelColor: "text-gray-400",
        searchTextVal: "text-blue-600",
        ratingBadgeBg: "#FEF9C3", // Yellow 100
        ratingBadgeBorder: "#EAB308", // Yellow 500
        ratingBadgeText: "#854D0E",
        thankYouColor: "text-rose-500",
        showColorBar: true
    },
    {
        id: "obsidian-gold",
        name: "Premium Obsidian Gold",
        bg: "linear-gradient(135deg, #111111, #252525)",
        textPrimary: "#D4AF37",
        textSecondary: "#FFFFFF",
        starColor: "#D4AF37",
        logoMode: "gold",
        borderStyle: "border-2 border-[#D4AF37]/40 shadow-2xl",
        qrBg: "#FFFFFF",
        qrFg: "#111111",
        blockBg: "rgba(212,175,55,0.12)",
        blockText: "#D4AF37",
        blockSubtext: "rgba(255,255,255,0.7)",
        searchBorder: "#D4AF37",
        searchLabelColor: "text-white/40",
        searchTextVal: "text-white",
        ratingBadgeBg: "rgba(212,175,55,0.1)",
        ratingBadgeBorder: "#D4AF37",
        ratingBadgeText: "#D4AF37",
        thankYouColor: "text-[#D4AF37]",
        showColorBar: false
    },
    {
        id: "kravy-orange",
        name: "Kravy Brand Orange",
        bg: "linear-gradient(135deg, #FF6B35, #C0481F)",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255,255,255,0.85)",
        starColor: "#FFD700",
        logoMode: "white",
        borderStyle: "border border-white/10 shadow-2xl",
        qrBg: "#FFFFFF",
        qrFg: "#FF6B35",
        blockBg: "rgba(255,255,255,0.15)",
        blockText: "#FFFFFF",
        blockSubtext: "rgba(255,255,255,0.8)",
        searchBorder: "#FFFFFF",
        searchLabelColor: "text-white/60",
        searchTextVal: "text-white font-bold",
        ratingBadgeBg: "rgba(255,255,255,0.15)",
        ratingBadgeBorder: "rgba(255,255,255,0.4)",
        ratingBadgeText: "#FFFFFF",
        thankYouColor: "text-white",
        showColorBar: false
    },
    {
        id: "royal-velvet",
        name: "Royal Purple",
        bg: "linear-gradient(135deg, #2C1654, #4A235A)",
        textPrimary: "#FFD700",
        textSecondary: "#FFFFFF",
        starColor: "#FFD700",
        logoMode: "white",
        borderStyle: "border border-white/10 shadow-2xl",
        qrBg: "#FFFFFF",
        qrFg: "#2C1654",
        blockBg: "rgba(255,215,0,0.12)",
        blockText: "#FFD700",
        blockSubtext: "rgba(255,255,255,0.8)",
        searchBorder: "#FFD700",
        searchLabelColor: "text-white/55",
        searchTextVal: "text-[#FFD700]",
        ratingBadgeBg: "rgba(255,215,0,0.08)",
        ratingBadgeBorder: "#FFD700",
        ratingBadgeText: "#FFD700",
        thankYouColor: "text-yellow-400",
        showColorBar: false
    }
];

export default function GoogleReviewGenerator() {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Form inputs state
    const [restaurantName, setRestaurantName] = useState("Spice Garden");
    const [googleUrl, setGoogleUrl] = useState("https://g.page/r/your-business/review");
    const [ctaText, setCtaText] = useState("Enjoyed your experience?");
    const [subText, setSubText] = useState("Tell the world about us!");
    const [ratingVal, setRatingVal] = useState("4.8 / 5");
    const [qrHelperText, setQrHelperText] = useState("Scan to leave a review");
    const [customSearchTerm, setCustomSearchTerm] = useState("");
    
    // Highlight Info Box
    const [highlightTitle, setHighlightTitle] = useState("Your review means the world");
    const [highlightSubtext, setHighlightSubtext] = useState("It takes only 30 seconds and helps us serve you better every day!");
    
    // Footer
    const [thankYouText, setThankYouText] = useState("Thank You!");
    const [teamText, setTeamText] = useState("— The Team");
    
    // Styling configurations
    const [selectedStyleId, setSelectedStyleId] = useState("google-classic");
    const [showCircles, setShowCircles] = useState(true);
    const [showDots, setShowDots] = useState(true);

    // Load defaults from profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data?.businessName) {
                        setRestaurantName(data.businessName);
                        if (!customSearchTerm) {
                            setCustomSearchTerm(`"${data.businessName}" Review`);
                        }
                    }
                    if (data?.googleReviewUrl) {
                        setGoogleUrl(data.googleReviewUrl);
                    } else if (data?.businessName) {
                        const encodedName = encodeURIComponent(`${data.businessName} Business`);
                        setGoogleUrl(`https://www.google.com/search?q=${encodedName}&hl=en`);
                    }
                }
            } catch (err) {
                console.error("Profile fetch error:", err);
            }
        };

        fetchProfile();
    }, []);

    // Keep custom search term updated when business name changes if not manually modified
    const handleRestaurantNameChange = (val: string) => {
        setRestaurantName(val);
        setCustomSearchTerm(`"${val}" Review`);
    };

    const activeStyle = STYLES.find(s => s.id === selectedStyleId) || STYLES[0];

    // Export generator
    const handleDownload = async (format: "png" | "jpeg" = "png") => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        kravy.click();

        try {
            const dataUrl = await domToPng(cardRef.current, {
                scale: 3,
                quality: 0.95
            });

            let finalUrl = dataUrl;
            if (format === "jpeg") {
                const img = new window.Image();
                img.src = dataUrl;
                await new Promise((resolve) => {
                    img.onload = resolve;
                });
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    finalUrl = canvas.toDataURL("image/jpeg", 0.9);
                }
            }

            const link = document.createElement("a");
            const cleanName = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "_");
            link.download = `${cleanName}_google_review_standee.${format}`;
            link.href = finalUrl;
            link.click();
            toast.success(`Successfully downloaded ${format.toUpperCase()} standee!`);
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to generate standee.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Copy to clipboard
    const handleCopyToClipboard = async () => {
        if (!cardRef.current) return;
        kravy.click();
        try {
            toast.loading("Copying standee to clipboard...");
            const dataUrl = await domToPng(cardRef.current, { scale: 2 });
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            toast.dismiss();
            toast.success("Standee image copied! Paste it anywhere.");
        } catch (err) {
            toast.dismiss();
            console.error("Clipboard copy error:", err);
            toast.error("Clipboard not supported. Download standee instead!");
        }
    };

    return (
        <div className="min-h-screen bg-[#0b081e] bg-gradient-to-br from-[#0b081e] via-[#16133a] to-[#0f0c2a] text-white p-4 md:p-8 space-y-8">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/offers" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition-all">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" /> Informative Google Review Standee
                        </h1>
                        <p className="text-white/60 font-medium mt-1">Design a conversion-optimized review flyer with fallback Google search guidelines</p>
                    </div>
                </div>
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Form Editor */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* General & Setup */}
                    <Card className="bg-[#120f32] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">1. Setup & Google Link</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Name</Label>
                                <Input 
                                    value={restaurantName}
                                    onChange={(e) => handleRestaurantNameChange(e.target.value)}
                                    maxLength={24}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Google Review URL</Label>
                                </div>
                                <Input 
                                    value={googleUrl}
                                    onChange={(e) => setGoogleUrl(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500 font-mono text-xs"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Card Content Texts */}
                    <Card className="bg-[#120f32] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">2. Customize Text Content</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Headline</Label>
                                <Input 
                                    value={ctaText}
                                    onChange={(e) => setCtaText(e.target.value)}
                                    maxLength={28}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500 font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Subheadline</Label>
                                <Input 
                                    value={subText}
                                    onChange={(e) => setSubText(e.target.value)}
                                    maxLength={35}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Google Rating Badge</Label>
                                <Input 
                                    value={ratingVal}
                                    onChange={(e) => setRatingVal(e.target.value)}
                                    maxLength={16}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">QR Code Label</Label>
                                <Input 
                                    value={qrHelperText}
                                    onChange={(e) => setQrHelperText(e.target.value)}
                                    maxLength={30}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Search Directive (OR option)</Label>
                                <Input 
                                    value={customSearchTerm}
                                    onChange={(e) => setCustomSearchTerm(e.target.value)}
                                    maxLength={35}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="h-[1px] bg-white/5 my-2" />

                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Highlighted Review Box</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Box Header</Label>
                                <Input 
                                    value={highlightTitle}
                                    onChange={(e) => setHighlightTitle(e.target.value)}
                                    maxLength={30}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Box Subtext</Label>
                                <Input 
                                    value={highlightSubtext}
                                    onChange={(e) => setHighlightSubtext(e.target.value)}
                                    maxLength={90}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="h-[1px] bg-white/5 my-2" />

                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Footer Text</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Thank You Text</Label>
                                <Input 
                                    value={thankYouText}
                                    onChange={(e) => setThankYouText(e.target.value)}
                                    maxLength={20}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Team Signature</Label>
                                <Input 
                                    value={teamText}
                                    onChange={(e) => setTeamText(e.target.value)}
                                    maxLength={18}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Themes & Visual options */}
                    <Card className="bg-[#120f32] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">3. Aesthetics & Colors</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {STYLES.map(style => (
                                <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => { setSelectedStyleId(style.id); kravy.click(); }}
                                    className={`p-3 rounded-2xl text-left border relative overflow-hidden transition-all active:scale-95 ${selectedStyleId === style.id ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg" : "border-white/10 hover:border-white/20"}`}
                                >
                                    <div className="text-[10px] font-bold text-white relative z-10">{style.name}</div>
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: style.bg }} />
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="text-left">
                                    <div className="text-xs font-bold text-white">Backdrop Circles</div>
                                    <div className="text-[10px] text-white/50">Show decorative circles</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showCircles}
                                    onChange={(e) => setShowCircles(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer bg-white/5"
                                />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="text-left">
                                    <div className="text-xs font-bold text-white">Dotted Accents</div>
                                    <div className="text-[10px] text-white/50">Show dotted grids</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showDots}
                                    onChange={(e) => setShowDots(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer bg-white/5"
                                />
                            </div>
                        </div>
                    </Card>

                </div>

                {/* Right Sticky Visualizer */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-8 gap-6">
                    
                    {/* Visual Card Frame */}
                    <div className="relative group/card select-none">
                        
                        {/* Glow effect */}
                        <div 
                            className="absolute -inset-4 rounded-[40px] opacity-20 blur-2xl transition-all duration-500 pointer-events-none"
                            style={{ background: activeStyle.bg }}
                        />

                        {/* RENDER TARGET: Google Review Card Standee */}
                        <div 
                            ref={cardRef}
                            style={{
                                background: activeStyle.bg,
                                fontFamily: "'Poppins', sans-serif"
                            }}
                            className={`w-[340px] h-[520px] rounded-[28px] relative overflow-hidden flex flex-col items-center justify-between p-6 text-center ${activeStyle.borderStyle} shrink-0`}
                        >
                            <style dangerouslySetInnerHTML={{__html: `
                                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500;600;700;800&display=swap');
                            `}} />

                            {/* Background Circles */}
                            {showCircles && (
                                <>
                                    <div className="absolute top-[-30px] left-[-30px] w-[160px] h-[160px] rounded-full bg-white/[0.04] pointer-events-none z-0" />
                                    <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full bg-white/[0.03] pointer-events-none z-0" />
                                </>
                            )}

                            {/* Dot Grid */}
                            {showDots && (
                                <div className="absolute top-[80px] left-[20px] grid grid-cols-3 gap-[5px] opacity-10 z-0">
                                    {[...Array(6)].map((_, i) => (
                                        <span key={i} className="w-[5px] h-[5px] rounded-full bg-white block" />
                                    ))}
                                </div>
                            )}

                            {/* ── TOP SECTION (Google Badge + Texts) ── */}
                            <div className="w-full relative z-10 flex flex-col items-center gap-2">
                                
                                {/* Rounded Google badge */}
                                <div className="bg-white px-5 py-1.5 rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
                                    {activeStyle.logoMode === "color" ? (
                                        <svg viewBox="0 0 24 24" width="60" height="24">
                                            <path fill="#4285F4" d="M3.06 12c0-3.32 2.67-6.06 6.02-6.06 1.83 0 3.32.79 4.39 1.76l1.62-1.62C13.68 4.77 11.53 4 9.08 4 4.67 4 1 7.6 1 12s3.67 8 8.08 8c2.45 0 4.6-.77 6.01-2.08l-1.62-1.62c-1.07.97-2.56 1.76-4.39 1.76-3.35 0-6.02-2.74-6.02-6.06z" />
                                            <path fill="#EA4335" d="M12 12h8.08c.11-.47.18-.98.18-1.54 0-2.48-1.62-4.54-3.92-5.46l-1.62 1.62C16.14 7.63 17 9.17 17 10.46H12v1.54z" />
                                            <path fill="#FBBC05" d="M16.34 6.62c.79.52 1.44 1.25 1.87 2.1l1.62-1.62c-.79-1.51-2.06-2.72-3.49-3.48l-.01.01-1.62 1.62.01-.01c.54.43 1.07.89 1.62 1.38z" />
                                            <path fill="#34A853" d="M9.08 20c1.78 0 3.28-.59 4.39-1.59l-1.62-1.62c-.68.49-1.68.86-2.77.86-2.14 0-4.01-1.42-4.66-3.34L2.83 16.3C4.16 18.52 6.43 20 9.08 20z" />
                                            {/* Stylized letters for "oogle" to complete the logo look */}
                                            <text x="18" y="16.5" fill="#4285F4" fontSize="13" fontWeight="900" fontFamily="sans-serif">o</text>
                                            <text x="26" y="16.5" fill="#EA4335" fontSize="13" fontWeight="900" fontFamily="sans-serif">o</text>
                                            <text x="34" y="16.5" fill="#FBBC05" fontSize="13" fontWeight="900" fontFamily="sans-serif">g</text>
                                            <text x="42" y="16.5" fill="#34A853" fontSize="13" fontWeight="900" fontFamily="sans-serif">l</text>
                                            <text x="46" y="16.5" fill="#EA4335" fontSize="13" fontWeight="900" fontFamily="sans-serif">e</text>
                                        </svg>
                                    ) : activeStyle.logoMode === "gold" ? (
                                        <div className="text-[#D4AF37] font-black text-sm tracking-wide">Google</div>
                                    ) : (
                                        <div className="text-gray-800 font-black text-sm tracking-wide">Google</div>
                                    )}
                                </div>

                                <h2 
                                    className="text-xl font-bold tracking-tight mt-1.5"
                                    style={{ color: activeStyle.textPrimary }}
                                >
                                    {ctaText}
                                </h2>
                                <p 
                                    className="text-[10px] font-medium opacity-80"
                                    style={{ color: activeStyle.textSecondary }}
                                >
                                    {subText}
                                </p>

                                <div className="w-[120px] h-[1px] bg-gray-200/50 my-1" />

                                {/* 5 Gold stars */}
                                <div className="flex gap-1.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={22} fill={activeStyle.starColor} stroke={activeStyle.starColor} className="drop-shadow-sm" />
                                    ))}
                                </div>

                                {/* Rating Pill Badge */}
                                <div 
                                    style={{ 
                                        backgroundColor: activeStyle.ratingBadgeBg,
                                        borderColor: activeStyle.ratingBadgeBorder,
                                        color: activeStyle.ratingBadgeText
                                    }}
                                    className="border rounded-full py-0.5 px-3.5 mt-2 text-[9px] font-black uppercase tracking-wider"
                                >
                                    Rated {ratingVal} on Google
                                </div>
                            </div>

                            {/* ── MIDDLE CONTAINER (QR Code + Search Alternative) ── */}
                            <div className="w-full relative z-10 bg-white rounded-3xl p-4 shadow-lg border border-gray-100 flex flex-col items-center justify-center gap-3">
                                
                                <div className="p-2.5 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <QRCode 
                                        value={googleUrl || "https://google.com"}
                                        size={95}
                                        bgColor={activeStyle.qrBg}
                                        fgColor={activeStyle.qrFg}
                                        level="H"
                                    />
                                </div>

                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-extrabold text-gray-800 uppercase tracking-wide">{qrHelperText}</p>
                                    <p className="text-[7.5px] text-gray-400 font-semibold leading-none">Replace QR with your Google review link</p>
                                </div>

                                {/* OR Divider */}
                                <div className="w-full flex items-center gap-2 px-6">
                                    <div className="flex-1 h-[1px] bg-gray-200" />
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">OR</span>
                                    <div className="flex-1 h-[1px] bg-gray-200" />
                                </div>

                                {/* Google Search Directive Input mock */}
                                <div 
                                    style={{ borderColor: activeStyle.searchBorder }}
                                    className="w-full rounded-full border py-1.5 px-4 flex flex-col items-center justify-center leading-none"
                                >
                                    <span className={`text-[7px] font-black uppercase tracking-wider ${activeStyle.searchLabelColor}`}>Search on Google</span>
                                    <span className={`text-[9.5px] font-extrabold flex items-center gap-1 mt-0.5 ${activeStyle.searchTextVal}`}>
                                        <Search size={10} className="stroke-[3]" /> {customSearchTerm}
                                    </span>
                                </div>
                            </div>

                            {/* ── HIGHLIGHTED BLUE/BRAND BOX ── */}
                            <div 
                                style={{ backgroundColor: activeStyle.blockBg, color: activeStyle.blockText }}
                                className="w-full relative z-10 rounded-[1.25rem] p-3 text-center shadow-md space-y-0.5"
                            >
                                <h4 className="text-xs font-black tracking-tight">{highlightTitle}</h4>
                                <p className="text-[8px] font-medium leading-normal opacity-90">{highlightSubtext}</p>
                            </div>

                            {/* ── FOOTER & COLOR BAR ── */}
                            <div className="w-full relative z-10 flex flex-col items-center leading-none">
                                <h3 className={`text-sm font-black ${activeStyle.thankYouColor}`}>{thankYouText}</h3>
                                <p 
                                    className="text-[8.5px] font-semibold italic mt-1"
                                    style={{ color: activeStyle.textSecondary }}
                                >
                                    {teamText}
                                </p>
                            </div>

                            {/* Official Google Color Strip */}
                            {activeStyle.showColorBar && (
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 flex pointer-events-none">
                                    <div className="flex-1 bg-[#EA4335]" /> {/* Red */}
                                    <div className="flex-1 bg-[#FBBC05]" /> {/* Yellow */}
                                    <div className="flex-1 bg-[#34A853]" /> {/* Green */}
                                    <div className="flex-1 bg-[#4285F4]" /> {/* Blue */}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Exporters controls */}
                    <div className="w-full max-w-[340px] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => handleDownload("png")}
                                disabled={isDownloading}
                                className="bg-[#4285F4] hover:bg-[#3273DC] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-xs"
                            >
                                <Download size={15} /> Save PNG Card
                            </Button>
                            <Button 
                                onClick={() => handleDownload("jpeg")}
                                disabled={isDownloading}
                                variant="outline"
                                className="border-white/10 hover:bg-white/5 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                            >
                                <Download size={15} /> Save JPEG
                            </Button>
                        </div>

                        <Button 
                            onClick={handleCopyToClipboard}
                            variant="outline"
                            className="w-full border-white/10 hover:bg-white/5 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                        >
                            <Copy size={15} /> Copy to Clipboard
                        </Button>
                    </div>

                </div>

            </div>

        </div>
    );
}

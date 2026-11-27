"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
    ArrowLeft, 
    Download, 
    Share2, 
    Sparkles, 
    Check, 
    RefreshCw, 
    Phone, 
    Calendar, 
    Tag, 
    Star, 
    Copy,
    ChevronRight,
    Ticket
} from "lucide-react";
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { kravy } from "@/lib/sounds";

interface SystemOffer {
    id: string;
    title: string;
    code: string | null;
    discountType: string;
    discountValue: number;
    minOrderValue: number | null;
    endDate: string | null;
    isActive: boolean;
}

// Preset themes configuration
const THEMES = [
    {
        id: "red",
        name: "Sunset Crimson",
        gradient: "linear-gradient(135deg, #C0392B, #7B241C)",
        divider: "#F0B429",
        ctaBg: "#F0B429",
        ctaText: "#7B241C",
        ctaBorder: "#F0B429",
        badgeBg: "rgba(240, 180, 41, 0.15)",
        badgeBorder: "#F0B429",
        accentText: "#FFF",
        validityColor: "rgba(255,255,255,0.45)",
        phoneColor: "rgba(255,255,255,0.75)"
    },
    {
        id: "purple",
        name: "Royal Velvet",
        gradient: "linear-gradient(135deg, #2C1654, #4A235A)",
        divider: "#FFD700",
        ctaBg: "#FFD700",
        ctaText: "#2C1654",
        ctaBorder: "#FFD700",
        badgeBg: "rgba(255, 215, 0, 0.12)",
        badgeBorder: "#FFD700",
        accentText: "#FFD700",
        validityColor: "rgba(255,215,0,0.45)",
        phoneColor: "rgba(255,215,0,0.8)"
    },
    {
        id: "green",
        name: "Emerald Forest",
        gradient: "linear-gradient(135deg, #1A5C2A, #0D3B18)",
        divider: "#F0B429",
        ctaBg: "rgba(255,255,255,0.1)",
        ctaText: "#FFF",
        ctaBorder: "rgba(255,255,255,0.45)",
        badgeBg: "rgba(255, 255, 255, 0.08)",
        badgeBorder: "rgba(255, 255, 255, 0.35)",
        accentText: "#FFF",
        validityColor: "rgba(255,255,255,0.45)",
        phoneColor: "rgba(255,255,255,0.75)"
    },
    {
        id: "blue",
        name: "Midnight Ocean",
        gradient: "linear-gradient(135deg, #1A237E, #283593)",
        divider: "#64B5F6",
        ctaBg: "rgba(255,255,255,0.1)",
        ctaText: "#FFF",
        ctaBorder: "rgba(255,255,255,0.45)",
        badgeBg: "rgba(100, 181, 246, 0.12)",
        badgeBorder: "#64B5F6",
        accentText: "#FFF",
        validityColor: "rgba(255,255,255,0.45)",
        phoneColor: "rgba(100,181,246,0.85)"
    },
    {
        id: "kravy",
        name: "Kravy Brand Orange",
        gradient: "linear-gradient(135deg, #FF6B35, #C0481F)",
        divider: "#FFF",
        ctaBg: "#FFF",
        ctaText: "#FF6B35",
        ctaBorder: "#FFF",
        badgeBg: "rgba(255,255,255,0.15)",
        badgeBorder: "rgba(255,255,255,0.4)",
        accentText: "#FFF",
        validityColor: "rgba(255,255,255,0.5)",
        phoneColor: "rgba(255,255,255,0.85)"
    },
    {
        id: "lux",
        name: "Premium Gold & Black",
        gradient: "linear-gradient(135deg, #111111, #2D2D2D)",
        divider: "#D4AF37",
        ctaBg: "#D4AF37",
        ctaText: "#111",
        ctaBorder: "#D4AF37",
        badgeBg: "rgba(212, 175, 55, 0.1)",
        badgeBorder: "#D4AF37",
        accentText: "#D4AF37",
        validityColor: "rgba(212,175,55,0.5)",
        phoneColor: "rgba(212,175,55,0.8)"
    }
];

export default function OfferCardGenerator() {
    const cardRef = useRef<HTMLDivElement>(null);
    const [systemOffers, setSystemOffers] = useState<SystemOffer[]>([]);
    const [selectedSystemOfferId, setSelectedSystemOfferId] = useState("");
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Card Editor Fields state
    const [restaurantName, setRestaurantName] = useState("Spice Garden");
    const [tagline, setTagline] = useState("✦ Special Offer ✦");
    const [offerPercent, setOfferPercent] = useState("50%");
    const [offerOffText, setOfferOffText] = useState("OFF");
    const [offerTitle, setOfferTitle] = useState("Grand Discount Offer");
    const [offerSubtitle, setOfferSubtitle] = useState("Dine-in & Takeaway • All Items");
    const [validity, setValidity] = useState("Valid till 31st May 2026");
    const [ctaText, setCtaText] = useState("Order Now");
    const [phoneNumber, setPhoneNumber] = useState("98765 43210");
    
    // Styling states
    const [selectedThemeId, setSelectedThemeId] = useState("red");
    const [middleDecoType, setMiddleDecoType] = useState<"badge" | "stars" | "emoji" | "none">("badge");
    const [emojiDeco, setEmojiDeco] = useState("🍽️");
    const [showCircles, setShowCircles] = useState(true);
    const [showDots, setShowDots] = useState(true);

    // Custom gradient options
    const [useCustomGradient, setUseCustomGradient] = useState(false);
    const [customGradColor1, setCustomGradColor1] = useState("#8B5CF6");
    const [customGradColor2, setCustomGradColor2] = useState("#4C1D95");
    const [customDividerColor, setCustomDividerColor] = useState("#FFD700");
    const [customCtaBgColor, setCustomCtaBgColor] = useState("#FFD700");
    const [customCtaTextColor, setCustomCtaTextColor] = useState("#4C1D95");

    // Fetch profile and offers on load
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data?.businessName) {
                        setRestaurantName(data.businessName);
                    }
                    if (data?.contactPersonPhone) {
                        setPhoneNumber(data.contactPersonPhone);
                    }
                }
            } catch (err) {
                console.error("Profile fetch error:", err);
            }
        };

        const fetchOffers = async () => {
            try {
                const res = await fetch("/api/admin/offers");
                if (res.ok) {
                    const data = await res.json();
                    setSystemOffers(data.filter((o: any) => o.isActive));
                }
            } catch (err) {
                console.error("Offers fetch error:", err);
            } finally {
                setLoadingOffers(false);
            }
        };

        fetchProfile();
        fetchOffers();
    }, []);

    // Load selected offer from system to form fields
    const handleLoadOffer = (offerId: string) => {
        setSelectedSystemOfferId(offerId);
        if (!offerId) return;

        const offer = systemOffers.find(o => o.id === offerId);
        if (offer) {
            kravy.success();
            setOfferTitle(offer.title);
            
            // Format Offer Value
            if (offer.discountType === "PERCENTAGE") {
                setOfferPercent(`${offer.discountValue}%`);
                setOfferOffText("OFF");
            } else if (offer.discountType === "FLAT") {
                setOfferPercent(`₹${offer.discountValue}`);
                setOfferOffText("OFF");
            } else if (offer.discountType === "BOGO") {
                setOfferPercent("BUY 1");
                setOfferOffText("GET 1 FREE");
            } else {
                setOfferPercent(`${offer.discountValue}`);
                setOfferOffText("OFF");
            }

            // Subtitle logic
            let subtitle = "";
            if (offer.minOrderValue) {
                subtitle += `Min. Order ₹${offer.minOrderValue} `;
            }
            if (offer.code) {
                subtitle += `• Code: ${offer.code}`;
            }
            setOfferSubtitle(subtitle || "Special Limited Promotion");

            // Validity text
            if (offer.endDate) {
                const formattedDate = new Date(offer.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                setValidity(`Valid till ${formattedDate}`);
            } else {
                setValidity("Valid for a limited time");
            }

            toast.success(`Loaded details from "${offer.title}"!`);
        }
    };

    // Helper to get active styles based on selection
    const getActiveTheme = () => {
        if (useCustomGradient) {
            return {
                gradient: `linear-gradient(135deg, ${customGradColor1}, ${customGradColor2})`,
                divider: customDividerColor,
                ctaBg: customCtaBgColor,
                ctaText: customCtaTextColor,
                ctaBorder: customCtaBgColor,
                badgeBg: "rgba(255,255,255,0.12)",
                badgeBorder: customDividerColor,
                accentText: "#FFF",
                validityColor: "rgba(255,255,255,0.5)",
                phoneColor: "rgba(255,255,255,0.8)"
            };
        }
        return THEMES.find(t => t.id === selectedThemeId) || THEMES[0];
    };

    const activeStyle = getActiveTheme();

    // Export handler
    const handleDownload = async (format: "png" | "jpeg" = "png") => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        kravy.click();

        try {
            // Apply scale for higher print/render resolution
            const dataUrl = await domToPng(cardRef.current, {
                scale: 3,
                quality: 0.95,
                features: {
                    // Turn off webgl if modern screenshot has performance/artifacting issues
                }
            });

            // Convert PNG data url to JPEG if requested
            let exportUrl = dataUrl;
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
                    exportUrl = canvas.toDataURL("image/jpeg", 0.9);
                }
            }

            const link = document.createElement("a");
            const cleanName = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, "_");
            link.download = `${cleanName}_offer_card.${format}`;
            link.href = exportUrl;
            link.click();
            toast.success(`Successfully downloaded ${format.toUpperCase()} offer card!`);
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to generate image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Copy image to clipboard using experimental canvas-to-blob
    const handleCopyToClipboard = async () => {
        if (!cardRef.current) return;
        kravy.click();
        try {
            toast.loading("Converting card to clipboard...");
            const dataUrl = await domToPng(cardRef.current, { scale: 2 });
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            toast.dismiss();
            toast.success("Card copied to clipboard! Paste it anywhere.");
        } catch (err) {
            toast.dismiss();
            console.error("Clipboard copy failed:", err);
            toast.error("Clipboard API not supported on this browser or connection. Download the card instead!");
        }
    };

    // Share to WhatsApp
    const handleShareWhatsApp = () => {
        kravy.click();
        const text = `🍽️ *${restaurantName}* - Special Marketing Offer! \n\n🔥 *${offerTitle}*\n💥 *${offerPercent} ${offerOffText}*\n✨ ${offerSubtitle}\n📅 ${validity}\n\n📞 Call us at ${phoneNumber} to order now!\n\n_Generated via Kravy POS Marketing Hub_`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
    };

    return (
        <div className="min-h-screen bg-[#0f0c29] bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white p-4 md:p-8 space-y-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/offers" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition-all">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" /> Marketing Card Generator
                        </h1>
                        <p className="text-white/60 font-medium mt-1">Design & download beautiful promo cards for WhatsApp, Instagram, or Print</p>
                    </div>
                </div>

                {/* System load dropdown */}
                {!loadingOffers && systemOffers.length > 0 && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                        <Ticket size={18} className="text-yellow-400" />
                        <div className="text-left">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Sync Active Coupon</div>
                            <select
                                value={selectedSystemOfferId}
                                onChange={(e) => handleLoadOffer(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white outline-none border-none cursor-pointer pr-4 focus:ring-0"
                            >
                                <option value="" className="bg-[#1a1a2e]">-- Load coupon details --</option>
                                {systemOffers.map(o => (
                                    <option key={o.id} value={o.id} className="bg-[#1a1a2e]">
                                        {o.code ? `[${o.code}] ` : ""}{o.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Editor Form */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* General Section */}
                    <Card className="bg-[#151233] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">1. Header Branding</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Name</Label>
                                <Input 
                                    value={restaurantName}
                                    onChange={(e) => setRestaurantName(e.target.value)}
                                    maxLength={24}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Tagline / Header Accent</Label>
                                <Input 
                                    value={tagline}
                                    onChange={(e) => setTagline(e.target.value)}
                                    maxLength={28}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Offer Details Section */}
                    <Card className="bg-[#151233] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">2. Offer Values & Text</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Percent / Value</Label>
                                <Input 
                                    value={offerPercent}
                                    onChange={(e) => setOfferPercent(e.target.value)}
                                    maxLength={10}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500 font-bold"
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Suffix (e.g. OFF)</Label>
                                <Input 
                                    value={offerOffText}
                                    onChange={(e) => setOfferOffText(e.target.value)}
                                    maxLength={15}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500 font-bold"
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Decoration</Label>
                                <select
                                    value={middleDecoType}
                                    onChange={(e) => setMiddleDecoType(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl h-11 px-3 focus:outline-none focus:border-orange-500 font-bold text-xs"
                                >
                                    <option value="badge" className="bg-[#1a1a2e]">Circle Badge</option>
                                    <option value="stars" className="bg-[#1a1a2e]">5 Stars Rating</option>
                                    <option value="emoji" className="bg-[#1a1a2e]">Emoji Banner</option>
                                    <option value="none" className="bg-[#1a1a2e]">Clean Text Only</option>
                                </select>
                            </div>
                        </div>

                        {middleDecoType === "emoji" && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Select Emoji Icon</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {["🍽️", "👨‍👩‍👧‍👦", "👑", "🍕", "🍔", "🧁", "⚡", "🔥", "🍗", "🍟", "☕"].map(emo => (
                                        <button
                                            key={emo}
                                            type="button"
                                            onClick={() => setEmojiDeco(emo)}
                                            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${emojiDeco === emo ? "bg-orange-500 scale-110 shadow-lg" : "bg-white/5 hover:bg-white/10"}`}
                                        >
                                            {emo}
                                        </button>
                                    ))}
                                    <input 
                                        type="text"
                                        value={emojiDeco}
                                        onChange={(e) => setEmojiDeco(e.target.value)}
                                        className="w-14 bg-white/5 border border-white/10 text-white text-center text-xl rounded-xl h-10"
                                        maxLength={3}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Promo Title</Label>
                                <Input 
                                    value={offerTitle}
                                    onChange={(e) => setOfferTitle(e.target.value)}
                                    maxLength={30}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Promo Subtitle / Terms</Label>
                                <Input 
                                    value={offerSubtitle}
                                    onChange={(e) => setOfferSubtitle(e.target.value)}
                                    maxLength={45}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Footer Call to Action Section */}
                    <Card className="bg-[#151233] border-white/5 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-white/80">3. Footer & Call to Action</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Validity Info Text</Label>
                                <Input 
                                    value={validity}
                                    onChange={(e) => setValidity(e.target.value)}
                                    maxLength={35}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Button Text</Label>
                                <Input 
                                    value={ctaText}
                                    onChange={(e) => setCtaText(e.target.value)}
                                    maxLength={18}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Phone Number / Contact</Label>
                                <Input 
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white rounded-xl h-11 focus:border-orange-500 focus:ring-orange-500 font-bold"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Styling & Theme Options */}
                    <Card className="bg-[#151233] border-white/5 p-6 rounded-3xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-white/80">4. Aesthetics & Palette</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-white/60">Use Custom Colors</span>
                                <input
                                    type="checkbox"
                                    checked={useCustomGradient}
                                    onChange={(e) => setUseCustomGradient(e.target.checked)}
                                    className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer bg-white/5"
                                />
                            </div>
                        </div>

                        {!useCustomGradient ? (
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Select Preset Theme</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {THEMES.map(theme => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            onClick={() => { setSelectedThemeId(theme.id); kravy.click(); }}
                                            className={`p-3 rounded-2xl text-left border relative overflow-hidden transition-all group active:scale-95 ${selectedThemeId === theme.id ? "border-orange-500 ring-2 ring-orange-500/50 shadow-lg" : "border-white/10 hover:border-white/20"}`}
                                        >
                                            <div 
                                                className="absolute inset-0 opacity-20 pointer-events-none group-hover:scale-105 transition-all"
                                                style={{ background: theme.gradient }}
                                            />
                                            <div className="relative flex items-center justify-between">
                                                <span className="text-xs font-bold text-white truncate pr-2">{theme.name}</span>
                                                {selectedThemeId === theme.id && (
                                                    <span className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white">
                                                        <Check size={10} strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Grad Color 1</Label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={customGradColor1} 
                                                onChange={(e) => setCustomGradColor1(e.target.value)}
                                                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                                            />
                                            <span className="text-xs font-mono">{customGradColor1}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Grad Color 2</Label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={customGradColor2} 
                                                onChange={(e) => setCustomGradColor2(e.target.value)}
                                                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                                            />
                                            <span className="text-xs font-mono">{customGradColor2}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">Divider Color</Label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={customDividerColor} 
                                                onChange={(e) => setCustomDividerColor(e.target.value)}
                                                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                                            />
                                            <span className="text-xs font-mono">{customDividerColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-white/60 uppercase tracking-wider">CTA Button Bg</Label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                type="color" 
                                                value={customCtaBgColor} 
                                                onChange={(e) => {
                                                    setCustomCtaBgColor(e.target.value);
                                                    setCustomCtaTextColor(e.target.value === "#ffffff" ? "#000000" : "#ffffff");
                                                }}
                                                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                                            />
                                            <span className="text-xs font-mono">{customCtaBgColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="text-left">
                                    <div className="text-xs font-bold text-white">Backdrop Circles</div>
                                    <div className="text-[10px] text-white/50">Show layered visual circles</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showCircles}
                                    onChange={(e) => setShowCircles(e.target.checked)}
                                    className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer bg-white/5"
                                />
                            </div>
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                <div className="text-left">
                                    <div className="text-xs font-bold text-white">Dot Pattern Accents</div>
                                    <div className="text-[10px] text-white/50">Show dot grid inside the card</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showDots}
                                    onChange={(e) => setShowDots(e.target.checked)}
                                    className="w-4 h-4 rounded text-orange-500 focus:ring-0 cursor-pointer bg-white/5"
                                />
                            </div>
                        </div>
                    </Card>

                </div>

                {/* Right Side: Sticky Live Preview */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-8 gap-6">
                    
                    {/* Visual Card Frame */}
                    <div className="relative group/card select-none">
                        
                        {/* Decorative background glow matching current card theme */}
                        <div 
                            className="absolute -inset-4 rounded-[40px] opacity-30 blur-2xl transition-all duration-500 group-hover/card:scale-105 pointer-events-none"
                            style={{ background: activeStyle.gradient }}
                        />

                        {/* RENDER TARGET: Card wrapper */}
                        <div 
                            ref={cardRef}
                            style={{
                                background: activeStyle.gradient,
                                fontFamily: "'Poppins', sans-serif",
                            }}
                            className="w-[320px] h-[400px] rounded-[24px] relative overflow-hidden flex flex-col items-center justify-between p-7 text-center shadow-2xl shrink-0"
                        >
                            {/* Import fonts specifically inside the card to ensure screenshots render fonts */}
                            <style dangerouslySetInnerHTML={{__html: `
                                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600;700;800&display=swap');
                            `}} />

                            {/* ── Background Circle Shapes ── */}
                            {showCircles && (
                                <>
                                    <div className="absolute top-[-50px] right-[-50px] w-[220px] h-[220px] rounded-full bg-white/[0.06] pointer-events-none z-0" />
                                    <div className="absolute bottom-[-70px] left-[-50px] w-[260px] h-[260px] rounded-full bg-white/[0.04] pointer-events-none z-0" />
                                </>
                            )}

                            {/* ── Dot grid pattern ── */}
                            {showDots && (
                                <div className="absolute bottom-[14px] right-[14px] grid grid-cols-4 gap-[5px] opacity-12 z-0">
                                    {[...Array(12)].map((_, i) => (
                                        <span key={i} className="w-[6px] h-[6px] rounded-full bg-white block" />
                                    ))}
                                </div>
                            )}

                            {/* ── CARD TOP ── */}
                            <div className="w-full relative z-10">
                                <p className="text-[9px] font-bold uppercase tracking-[3px] text-white/70 mb-1">
                                    {tagline}
                                </p>
                                <p 
                                    className="font-bold text-[22px] text-white leading-snug tracking-normal drop-shadow-sm"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    {restaurantName}
                                </p>
                                <div 
                                    className="w-11 h-[2px] mx-auto mt-2.5 rounded-[2px]"
                                    style={{ backgroundColor: activeStyle.divider }}
                                />
                            </div>

                            {/* ── CARD MIDDLE ── */}
                            <div className="w-full flex-1 flex flex-col items-center justify-center gap-2 relative z-10">
                                
                                {/* STARS Deco */}
                                {middleDecoType === "stars" && (
                                    <span className="text-yellow-400 text-xs tracking-wider block mb-1">★ ★ ★ ★ ★</span>
                                )}

                                {/* EMOJI Deco */}
                                {middleDecoType === "emoji" && (
                                    <span className="text-3xl block mb-1">{emojiDeco}</span>
                                )}

                                {/* BADGE (Except when None/Stars without Badge is chosen) */}
                                {(middleDecoType === "badge" || middleDecoType === "emoji" || middleDecoType === "stars") && (
                                    <div 
                                        className="w-[100px] h-[100px] rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300"
                                        style={{ 
                                            backgroundColor: activeStyle.badgeBg,
                                            borderColor: activeStyle.badgeBorder
                                        }}
                                    >
                                        <span 
                                            className="text-3xl font-extrabold leading-none tracking-tighter"
                                            style={{ color: useCustomGradient ? "#FFF" : activeStyle.accentText }}
                                        >
                                            {offerPercent}
                                        </span>
                                        <span 
                                            className="text-[10px] font-bold tracking-wider mt-0.5"
                                            style={{ color: useCustomGradient ? "rgba(255,255,255,0.8)" : activeStyle.accentText }}
                                        >
                                            {offerOffText}
                                        </span>
                                    </div>
                                )}

                                <p className="text-sm font-extrabold text-white mt-1 leading-snug truncate max-w-[260px]">{offerTitle}</p>
                                <p className="text-[10px] text-white/70 max-w-[260px] truncate leading-normal">{offerSubtitle}</p>
                            </div>

                            {/* ── CARD BOTTOM ── */}
                            <div className="w-full relative z-10 space-y-2">
                                <p 
                                    className="text-[8px] tracking-[1.5px] uppercase"
                                    style={{ color: activeStyle.validityColor }}
                                >
                                    {validity}
                                </p>
                                
                                <span 
                                    className="inline-block py-2 px-6 rounded-full text-[10px] font-bold tracking-[1.5px] uppercase border transition-all pointer-events-none select-none"
                                    style={{
                                        backgroundColor: activeStyle.ctaBg,
                                        color: activeStyle.ctaText,
                                        borderColor: activeStyle.ctaBorder
                                    }}
                                >
                                    {ctaText}
                                </span>
                                
                                <p 
                                    className="text-xs font-semibold flex items-center justify-center gap-1.5 pt-1.5"
                                    style={{ color: activeStyle.phoneColor }}
                                >
                                    <Phone size={11} className="opacity-80" /> {phoneNumber}
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Exporter Controls */}
                    <div className="w-full max-w-[320px] space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => handleDownload("png")}
                                disabled={isDownloading}
                                className="bg-[#FF6B35] hover:bg-[#E05928] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 active:scale-95 transition-all text-xs"
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
                            <Copy size={15} /> Copy Card to Clipboard
                        </Button>

                        <div className="h-[1px] bg-white/10 my-1" />

                        <Button 
                            onClick={handleShareWhatsApp}
                            className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/15 active:scale-95 transition-all text-xs"
                        >
                            <Share2 size={15} /> Share to WhatsApp Marketing
                        </Button>
                    </div>

                    {/* Pro Tip Alert */}
                    <div className="w-full max-w-[320px] bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                            💡 <span className="text-white font-bold">Pro Tip:</span> Set your theme, customize tagline text, and share instantly on WhatsApp to drive traffic to your store!
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
}

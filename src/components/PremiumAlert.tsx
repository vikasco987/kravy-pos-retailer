"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Zap, 
    Check, 
    ChevronRight, 
    Sparkles, 
    X,
    Lock,
    Crown,
    CheckCircle2,
    Phone,
    Plus,
    Printer,
    CreditCard,
    ArrowRight
} from "lucide-react";

interface PremiumAlertProps {
    profile: any;
}

const plans = [
    {
      key: "year1",
      name: "1 Year Plan",
      price: "6,000",
      originalPrice: "12,000",
      description: "Ideal for businesses of every size.",
      features: [
        "Free Thermal Printer + 5 Rolls",
        "Unlimited invoices",
        "Analytics dashboard",
        "Inventory management",
        "Tax / GST management",
        "Invoice with logo & QR",
        "Chat & Email support",
      ],
    },
    {
      key: "year2",
      name: "2 Year Plan",
      price: "8,000",
      originalPrice: "16,000",
      description: "Best choice for growing businesses.",
      features: [
        "Free Thermal Printer + 5 Rolls",
        "Everything in 1 Year plan",
        "Advanced Kitchen workflow",
        "Coupons & Loyalty system",
        "Table QR ordering system",
        "Inventory alerts",
        "Priority support",
      ],
      popular: true
    },
    {
      key: "year3",
      name: "3 Year Plan",
      price: "9,500",
      originalPrice: "20,000",
      description: "Maximum savings for long-term use.",
      features: [
        "Free Thermal Printer + 5 Rolls",
        "Everything in 2 Year plan",
        "Kitchen automation",
        "Smart inventory tracking",
        "Advanced tax reports",
        "Lifetime priority support",
        "VIP Onboarding",
      ],
      highlight: true,
    },
];

export default function PremiumAlert({ profile }: PremiumAlertProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!profile) return;
        const isPremium = profile.isPremium === true;
        const forceShow = profile.showPremiumPopup === true;
        const isFrozen = profile.isFrozen === true;
        if (isFrozen || (!isPremium && forceShow)) {
            setIsOpen(true);
        }
    }, [profile]);

    const handlePlanSelect = (planKey: string, price: string) => {
        // Use clerkId or userId if available
        const identifier = profile?.clerkId || profile?.userId;
        const amount = price.replace(',', '');
        const bridgeUrl = window.location.hostname === 'localhost' 
            ? `http://localhost:3000/bridge` 
            : `https://www.kravy.in/bridge`;
            
        // Even if not logged in (no identifier), redirect to bridge to handle there
        window.location.href = `${bridgeUrl}?source=billing&clerkId=${identifier || 'guest'}&amount=${amount}&plan=${planKey}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="bg-white dark:bg-[#09090b] rounded-[3.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative border border-white/5 flex flex-col md:flex-row"
                    >
                        {/* Left Side: Features & Support */}
                        <div className="w-full md:w-[35%] bg-slate-50 dark:bg-zinc-900/50 p-10 flex flex-col border-r border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Crown size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight dark:text-white">Kravy Premium</h3>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Growth Engine</p>
                                </div>
                            </div>

                            <div className="space-y-6 mb-10 flex-1">
                                {[
                                    { title: "Unlimited Billing", desc: "No limits on invoices or orders", icon: <CheckCircle2 size={16} /> },
                                    { title: "Smart Inventory", desc: "Track stock & get low alerts", icon: <CheckCircle2 size={16} /> },
                                    { title: "Advanced Reports", desc: "Sales, GST & Profit insights", icon: <CheckCircle2 size={16} /> },
                                    { title: "24/7 Support", desc: "Priority assistance for you", icon: <CheckCircle2 size={16} /> },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="mt-1 text-emerald-500">{item.icon}</div>
                                        <div>
                                            <h4 className="text-sm font-bold dark:text-white">{item.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white dark:bg-black/20 rounded-3xl p-6 border border-slate-100 dark:border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Need Help?</p>
                                <a href="tel:9289507882" className="text-xl font-black block mb-4 hover:text-indigo-500 transition-colors dark:text-white">9289507882</a>
                                <button 
                                    onClick={() => window.open('https://wa.me/919289507882', '_blank')}
                                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Phone size={14} fill="currentColor" /> WhatsApp
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Plans */}
                        <div className="flex-1 p-10 overflow-y-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight dark:text-white">
                                        {profile?.isFrozen ? "Subscription Required" : "Choose Your Plan"}
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-zinc-400">
                                        {profile?.isFrozen 
                                            ? "Your trial or subscription has expired. Please choose a plan below to continue using Kravy POS."
                                            : "Select a plan to activate instant premium access."
                                        }
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Discounts</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.key}
                                        onClick={() => handlePlanSelect(plan.key, plan.price)}
                                        className={`group relative flex flex-col rounded-[2.5rem] p-6 border transition-all text-left hover:scale-[1.02] active:scale-95
                                        ${plan.highlight 
                                            ? "bg-indigo-600 text-white border-none shadow-xl shadow-indigo-500/30" 
                                            : "bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-white/5 hover:border-indigo-500/30"
                                        }`}
                                    >
                                        {plan.highlight && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">Best Value</div>
                                        )}
                                        {plan.popular && (
                                            <div className="absolute top-4 right-4 bg-amber-400 rounded-full p-1.5 text-amber-950">
                                                <Zap size={14} fill="currentColor" />
                                            </div>
                                        )}

                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-500'}`}>
                                            {plan.name}
                                        </p>
                                        
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <div className="text-3xl font-black">₹{plan.price}</div>
                                            <div className={`text-xs line-through opacity-40`}>₹{plan.originalPrice}</div>
                                        </div>

                                        <ul className="space-y-2.5 mb-8 flex-1">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Check size={14} className={`mt-0.5 ${plan.highlight ? 'text-indigo-200' : 'text-emerald-500'}`} />
                                                    <span className="text-[11px] font-bold leading-tight">{f}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[2px] flex items-center justify-center gap-2 shadow-lg transition-all
                                        ${plan.highlight 
                                            ? "bg-white text-indigo-900" 
                                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                        }`}>
                                            Pay Now <ArrowRight size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 p-8 bg-slate-900 dark:bg-zinc-900/50 rounded-[2.5rem] border border-slate-800 dark:border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                                
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 dark:border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                            <Printer size={28} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-black text-white uppercase tracking-widest">Hardware Bundle</p>
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-full border border-emerald-500/20 uppercase tracking-tighter">Recommended</span>
                                            </div>
                                            <p className="text-xs text-indigo-200/60 font-medium">Add physical terminal for just ₹2,999</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
                                        {[
                                            { icon: <Check size={12} />, label: "Thermal Printer" },
                                            { icon: <Check size={12} />, label: "IoT Gateway" },
                                            { icon: <Check size={12} />, label: "1 Year Warranty" },
                                            { icon: <Check size={12} />, label: "Free Setup" },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                    {item.icon}
                                                </div>
                                                <span className="text-[10px] font-bold text-white/70">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => window.open('https://wa.me/919289507882?text=I%20am%20interested%20in%20Hardware%20Pack', '_blank')}
                                        className="px-8 py-3 bg-white dark:bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
                                    >
                                        Order Now
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Close Button */}
                        {!profile?.isFrozen && (
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

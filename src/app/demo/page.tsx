"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Terminal, 
    Smartphone, 
    LayoutGrid, 
    ChefHat, 
    Printer, 
    PauseCircle, 
    MessageCircle, 
    ScanLine, 
    Utensils, 
    CheckCircle2, 
    Clock, 
    Users, 
    ChevronRight,
    Search,
    Monitor,
    Zap,
    Table as TableIcon,
    Layers,
    Plus,
    ArrowRight
} from "lucide-react";

// --- Mock Data ---
const TABLES_DATA = [
    { id: 1, seats: 2, status: 'free', name: 'T-1' },
    { id: 2, seats: 4, status: 'occupied', timer: '42m', name: 'T-2', order: ['Paneer Tikka x1', 'Masala Chai x2'] },
    { id: 3, seats: 6, status: 'occupied', timer: '18m', name: 'T-3', order: ['Dal Makhani x2', 'Garlic Naan x4'] },
    { id: 4, seats: 2, status: 'free', name: 'T-4' },
    { id: 5, seats: 4, status: 'reserved', name: 'T-5' },
    { id: 6, seats: 4, status: 'occupied', timer: '55m', name: 'T-6', order: ['Butter Chicken x1', 'Rice x2'] },
    { id: 7, seats: 8, status: 'free', name: 'T-7' },
    { id: 8, seats: 2, status: 'occupied', timer: '12m', name: 'T-8', order: ['Veg Spring Roll x2'] },
    { id: 9, seats: 4, status: 'reserved', name: 'T-9' },
    { id: 10, seats: 6, status: 'free', name: 'T-10' },
    { id: 11, seats: 2, status: 'occupied', timer: '30m', name: 'T-11', order: ['Paneer Butter Masala x2'] },
    { id: 12, seats: 4, status: 'free', name: 'T-12' }
];

const MENU_ITEMS = [
    { name: "Veg Spring Roll", price: 120, category: "Starters" },
    { name: "Paneer Tikka", price: 180, category: "Starters" },
    { name: "Paneer Butter Masala", price: 280, category: "Main Course" },
    { name: "Dal Makhani", price: 240, category: "Main Course" },
    { name: "Garlic Naan", price: 45, category: "Breads" },
];

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState<"pos" | "qr" | "tables">("pos");
    const [selectedTable, setSelectedTable] = useState(TABLES_DATA[1]);
    const [cart, setCart] = useState<{ name: string, price: number }[]>([]);
    const [activeZone, setActiveZone] = useState("Ground");

    // Stats animation simulation
    const [stats, setStats] = useState({ bills: 0, revenue: 0, time: 0 });

    useEffect(() => {
        if (activeTab === "pos") {
            const timer = setTimeout(() => {
                setStats({ bills: 142, revenue: 28400, time: 18 });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    return (
        <div className="h-screen overflow-y-auto scroll-smooth bg-[#0A0F1E] text-slate-100 font-sans selection:bg-orange-500/30">
            {/* Animated Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-20 pb-12 px-6 text-center">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-8"
                >
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Live Feature Interactive Demo
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-6"
                >
                    Har business ka <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
                        Smart Digital Brain
                    </span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl mx-auto text-slate-400 text-lg leading-relaxed mb-12"
                >
                    POS billing se lekar QR menu aur table management tak — sab ek jagah, real-time synchronization ke saath.
                </motion.p>

                {/* --- NAVIGATION TABS --- */}
                <div className="flex flex-wrap justify-center gap-3 mb-16 relative z-10">
                    {[
                        { id: "pos", label: "⚡ POS Billing", icon: Terminal },
                        { id: "qr", label: "📱 QR Menu", icon: Smartphone },
                        { id: "tables", label: "🪑 Table Management", icon: LayoutGrid },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black transition-all duration-300 border shadow-2xl ${
                                activeTab === tab.id 
                                ? "bg-orange-600 border-orange-400 text-white shadow-orange-600/20 scale-105" 
                                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                            <tab.icon size={18} strokeWidth={2.5} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* --- CONTENT SECTIONS --- */}
            <main className="max-w-6xl mx-auto px-6 pb-32 relative z-10">
                <AnimatePresence mode="wait">
                    {activeTab === "pos" && (
                        <motion.div 
                            key="pos"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="space-y-12"
                        >
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] text-center">
                                    <div className="text-4xl font-black text-orange-500 mb-2">{stats.bills}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Bills Today</div>
                                </div>
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] text-center">
                                    <div className="text-4xl font-black text-emerald-500 mb-2">₹{stats.revenue.toLocaleString()}</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Total Revenue</div>
                                </div>
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] text-center">
                                    <div className="text-4xl font-black text-blue-500 mb-2">{stats.time}s</div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Avg Billing Time</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* POS Terminal Mockup */}
                                <div className="bg-[#0F172A] border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                                    <div className="bg-slate-800/50 px-8 py-4 flex items-center justify-between border-b border-slate-700">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500" />
                                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        </div>
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live Terminal — T7
                                        </div>
                                    </div>
                                    <div className="p-10 space-y-8">
                                        <div className="text-center">
                                            <h3 className="text-2xl font-black italic text-orange-500">Spice Garden</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Table 7 | 4 Guests | Token #23</p>
                                        </div>
                                        <div className="space-y-4 border-t border-slate-800 pt-6">
                                            {[
                                                { name: "Paneer Butter Masala", qty: 2, price: 560 },
                                                { name: "Garlic Naan", qty: 4, price: 180 },
                                                { name: "Dal Makhani", qty: 1, price: 240 },
                                                { name: "Mango Lassi", qty: 3, price: 270 }
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between items-center group">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-200 uppercase">{item.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold">{item.qty} x ₹{item.price/item.qty}</p>
                                                    </div>
                                                    <span className="font-mono text-emerald-500 font-bold">₹{item.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-orange-600 rounded-3xl p-6 flex justify-between items-center shadow-xl shadow-orange-600/20">
                                            <span className="font-black uppercase tracking-widest text-sm">Grand Total</span>
                                            <span className="text-3xl font-black italic tracking-tighter">₹1,475</span>
                                        </div>
                                        <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-900/20">
                                            <MessageCircle size={20} />
                                            SEND BILL ON WHATSAPP
                                        </button>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="space-y-6">
                                    {[
                                        { title: "One-Click Billing", desc: "Rush hour mein bhi zero wait — fastest interface in the market.", icon: Zap, color: "bg-amber-500/20 text-amber-500" },
                                        { title: "KOT Management", desc: "Order place hote hi kitchen instantly alert ho jaati hai.", icon: ChefHat, color: "bg-orange-500/20 text-orange-500", badge: "Auto Print" },
                                        { title: "Hold & Save Bills", desc: "Ek customer ka order hold karke doosre ka process karein.", icon: PauseCircle, color: "bg-blue-500/20 text-blue-500" },
                                        { title: "Paperless WhatsApp Bill", desc: "Eco-friendly billing directly customer ke phone par.", icon: MessageCircle, color: "bg-emerald-500/20 text-emerald-500" },
                                        { title: "Token Management", desc: "Automatic token numbers se queue confusion khatam.", icon: Printer, color: "bg-rose-500/20 text-rose-500" },
                                    ].map((f, i) => (
                                        <motion.div 
                                            key={i}
                                            whileHover={{ x: 10 }}
                                            className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] flex gap-6 items-start group"
                                        >
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${f.color}`}>
                                                <f.icon size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-lg font-black text-white">{f.title}</h4>
                                                    {f.badge && <span className="bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-bounce">{f.badge}</span>}
                                                </div>
                                                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "qr" && (
                        <motion.div 
                            key="qr"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="space-y-16"
                        >
                            {/* QR Flow Steps */}
                            <div className="flex flex-wrap justify-between items-center gap-8 px-8">
                                {[
                                    { icon: ScanLine, label: "Scan QR", desc: "Table's Unique Code", color: "text-blue-400" },
                                    { icon: Smartphone, label: "Browse", desc: "Digital Experience", color: "text-orange-400" },
                                    { icon: Utensils, label: "Order", desc: "From Your Phone", color: "text-purple-400" },
                                    { icon: ChefHat, label: "Kitchen", desc: "Real-time Alert", color: "text-amber-400" },
                                    { icon: CheckCircle2, label: "Ready", desc: "Live Notification", color: "text-emerald-400" },
                                ].map((step, i) => (
                                    <div key={i} className="flex flex-col items-center text-center gap-4 relative">
                                        <div className={`w-20 h-20 rounded-full bg-slate-900/50 border-2 border-slate-800 flex items-center justify-center text-3xl shadow-2xl ${step.color} transition-all hover:scale-110 hover:border-current`}>
                                            <step.icon size={32} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase">{step.label}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{step.desc}</p>
                                        </div>
                                        {i < 4 && (
                                            <div className="hidden lg:block absolute left-[120%] top-[30%] w-12 h-0.5 bg-gradient-to-r from-slate-800 to-transparent" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
                                {/* Phone Mockup */}
                                <div className="flex justify-center">
                                    <div className="relative w-[320px] h-[650px] bg-[#0F172A] border-[10px] border-[#1E293B] rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-[#1E293B] rounded-b-[1.5rem] z-20 flex items-center justify-center">
                                            <div className="w-12 h-1 bg-slate-700 rounded-full" />
                                        </div>
                                        
                                        <div className="h-full overflow-y-auto p-6 pt-12 space-y-6 scrollbar-hide">
                                            <div className="text-center">
                                                <h3 className="text-xl font-black italic text-orange-500">Spice Garden</h3>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Table 5 • Digital Menu</p>
                                            </div>

                                            {["Starters", "Main Course"].map((cat) => (
                                                <div key={cat} className="space-y-3">
                                                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{cat}</h5>
                                                    {MENU_ITEMS.filter(m => m.category === cat).map((item, i) => (
                                                        <div 
                                                            key={i}
                                                            onClick={() => setCart(prev => [...prev, item])}
                                                            className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:bg-orange-600/10 transition-all cursor-pointer active:scale-95"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-bold text-white">{item.name}</p>
                                                                <p className="text-[10px] text-emerald-500 font-bold">₹{item.price}</p>
                                                            </div>
                                                            <button className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-600/20">+</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}

                                            {cart.length > 0 && (
                                                <motion.div 
                                                    initial={{ y: 50 }}
                                                    animate={{ y: 0 }}
                                                    className="sticky bottom-4 left-0 right-0 bg-orange-600 text-white p-4 rounded-2xl flex justify-between items-center shadow-2xl"
                                                >
                                                    <span className="text-xs font-black uppercase">{cart.length} Items Selected</span>
                                                    <span className="text-lg font-black tracking-tighter">₹{cart.reduce((s, i) => s + i.price, 0)}</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* QR Features */}
                                <div className="space-y-12">
                                    <div>
                                        <h3 className="text-2xl font-black mb-6">Live Order Tracking</h3>
                                        <div className="space-y-4">
                                            {[
                                                { table: "Table 3", items: "Dal Makhani x2", status: "Preparing", progress: 65, color: "text-amber-500", bg: "bg-amber-500" },
                                                { table: "Table 7", items: "Paneer Tikka x1", status: "Ready", progress: 100, color: "text-emerald-500", bg: "bg-emerald-500" },
                                            ].map((order, i) => (
                                                <div key={i} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-sm font-black text-white uppercase tracking-tight">{order.table} — {order.items}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Order #882 • 12:45 PM</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-800 border border-slate-700 ${order.color}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${order.progress}%` }}
                                                            transition={{ duration: 2, ease: "easeOut" }}
                                                            className={`h-full ${order.bg} shadow-[0_0_20px_rgba(0,0,0,0.5)]`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {[
                                            { title: "No App Required", desc: "Direct browser-based experience.", icon: Smartphone },
                                            { title: "Instant Feedback", desc: "Customer ratings per order.", icon: MessageCircle },
                                            { title: "Multi-Zone Menu", desc: "Different pricing for AC/Rooftop.", icon: Layers },
                                            { title: "Real-time Sync", desc: "Menu changes are instant.", icon: Zap },
                                        ].map((f, i) => (
                                            <div key={i} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem]">
                                                <f.icon size={20} className="text-orange-500 mb-3" />
                                                <h4 className="text-sm font-black text-white uppercase mb-2">{f.title}</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed font-bold">{f.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "tables" && (
                        <motion.div 
                            key="tables"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-12"
                        >
                            {/* Floor Plan Column */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="bg-[#0F172A] border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-2xl font-black">Floor Plan</h3>
                                        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                                            {["Ground", "Rooftop", "AC Room"].map((zone) => (
                                                <button
                                                    key={zone}
                                                    onClick={() => setActiveZone(zone)}
                                                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        activeZone === zone ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-500 hover:text-slate-300"
                                                    }`}
                                                >
                                                    {zone}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                        {TABLES_DATA.map((t) => (
                                            <motion.button
                                                key={t.id}
                                                onClick={() => setSelectedTable(t)}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${
                                                    selectedTable?.id === t.id ? "border-orange-500 ring-4 ring-orange-500/20" : "border-slate-800"
                                                } ${
                                                    t.status === 'occupied' ? 'bg-orange-500/5' : 
                                                    t.status === 'reserved' ? 'bg-blue-500/5' : 'bg-slate-900/50'
                                                }`}
                                            >
                                                <div className="text-xl font-black text-white">{t.name}</div>
                                                <div className="text-[8px] font-bold text-slate-500 uppercase mt-1">{t.seats} SEATS</div>
                                                <div className={`w-2 h-2 rounded-full mt-3 ${
                                                    t.status === 'occupied' ? 'bg-orange-500 animate-pulse' : 
                                                    t.status === 'reserved' ? 'bg-blue-500' : 'bg-emerald-500'
                                                }`} />
                                                {t.timer && <div className="text-[8px] font-black text-orange-400 mt-2">{t.timer}</div>}
                                            </motion.button>
                                        ))}
                                    </div>

                                    <div className="flex gap-8 mt-10 border-t border-slate-800 pt-8">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Occupied</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reserved</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details Column */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-full min-h-[500px]">
                                    <div className="bg-slate-800/30 p-8 border-b border-slate-800 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-black">{selectedTable?.name} Details</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedTable?.seats} Seats — {activeZone}</p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${
                                            selectedTable?.status === 'occupied' ? 'bg-orange-500/20 text-orange-400' : 
                                            selectedTable?.status === 'reserved' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                            {selectedTable?.status}
                                        </span>
                                    </div>

                                    <div className="p-8 flex-1">
                                        {selectedTable?.order ? (
                                            <div className="space-y-6">
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Active Order</h4>
                                                <div className="space-y-4">
                                                    {selectedTable.order.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center border-b border-slate-800/50 pb-4 last:border-0">
                                                            <span className="text-sm font-bold text-white uppercase">{item.split(' — ')[0]}</span>
                                                            <span className="text-[10px] font-black text-orange-500 uppercase">Preparing</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                                                <TableIcon size={48} className="mb-4" />
                                                <p className="text-xs font-black uppercase tracking-widest">No active order</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 bg-slate-900/60 border-t border-slate-800">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button className="bg-orange-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                                                {selectedTable?.status === 'free' ? 'ASSIGN TABLE' : 'PRINT BILL'}
                                            </button>
                                            <button className="bg-slate-800 text-slate-300 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-700 active:scale-95 transition-all">
                                                {selectedTable?.status === 'free' ? 'RESERVE' : 'ADD ITEM'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* --- CTA FOOTER --- */}
            <section className="bg-gradient-to-t from-orange-600/20 to-transparent pt-32 pb-20 px-6 text-center border-t border-slate-900">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight">
                    Ready to digitize your <br/>
                    <span className="text-orange-500">business operations?</span>
                </h2>
                <div className="flex flex-wrap justify-center gap-6">
                    <button className="px-10 py-5 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-orange-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                        Get Started Now
                        <ArrowRight size={20} />
                    </button>
                    <button className="px-10 py-5 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all">
                        Schedule a Demo
                    </button>
                </div>
                <p className="mt-12 text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">Trusted by 500+ businesses pan-india</p>
            </section>
        </div>
    );
}

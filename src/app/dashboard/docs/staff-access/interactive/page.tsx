"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Zap, 
  Lock, 
  Database, 
  CheckCircle2, 
  Activity, 
  ArrowRight, 
  Info,
  Smartphone,
  Layout,
  Eye,
  Menu,
  ChevronRight,
  Printer,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function InteractiveStaffGuide() {
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [mockHidden, setMockHidden] = useState(false);
  const statRef = useRef(null);
  const isStatInView = useInView(statRef, { once: true });

  // Counter animation
  useEffect(() => {
    if (isStatInView) {
      let start = 0;
      const interval = setInterval(() => {
        start += 2;
        if (start <= 100) setPercent(start);
        else clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isStatInView]);

  // Dashboard mock animation logic
  useEffect(() => {
    const timer = setTimeout(() => setMockHidden(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1A0A00] font-['Baloo_2',sans-serif] selection:bg-[#FF6B00] selection:text-white">
      {/* ── STICKY NAV ── */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFB830] flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-xl text-[#1A0A00]">Kravy <span className="text-[#FF6B00]">Docs</span></span>
          </div>
          <button 
            onClick={() => router.back()}
            className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full transition-all flex items-center gap-2"
          >
            <X size={16} /> Close
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-20 pb-32 overflow-hidden px-6">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#FF6B00 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            📋 Official Premium Guide
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tighter text-[#1A0A00]"
          >
            Staff Access <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FFB830] to-[#FF6B00] animate-gradient-x">
              System Guide
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium"
          >
            Staff ko manage karna aur permissions dena seekhein — Matching light theme aur simple bhasha mein.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 relative"
          >
            <div className="max-w-[750px] mx-auto bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.08)]">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Staff View: rahul.x123@kravypos.com</div>
              </div>
              <div className="flex min-h-[350px]">
                <div className="w-56 bg-slate-50/50 border-r border-slate-100 p-6 hidden md:block">
                  <div className="space-y-4">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Navigation</div>
                    {["Dashboard", "Tables", "Menu", "Billing", "Marketing", "Insights"].map((item, i) => (
                      <motion.div 
                        key={item}
                        animate={mockHidden && i > 3 ? { opacity: 0, x: -20, height: 0, margin: 0, padding: 0 } : { opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all ${i === 1 ? "bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
                      >
                         <div className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-white" : "bg-slate-300"}`}></div>
                         {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-10 text-left space-y-8">
                   <div className="flex gap-6">
                      <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[#FF6B00] text-4xl font-black">12</div>
                         <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Active Tables</div>
                      </div>
                      <div className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                         <div className="text-[#FFB830] text-4xl font-black">₹4.2k</div>
                         <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Today's Sales</div>
                      </div>
                   </div>
                   <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-emerald-600 text-[11px] font-black uppercase mb-1 flex items-center gap-2 tracking-widest">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                           Live Cloud Sync
                        </div>
                        <p className="text-sm text-slate-600 font-bold italic">Staff data is being pushed to Owner account instantly.</p>
                      </div>
                      <Smartphone className="text-emerald-500 opacity-60" size={32} />
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SMART MANAGEMENT GRID ── */}
      <section className="bg-white py-24 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
             <div className="bg-[#FF6B00]/10 text-[#FF6B00] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block border border-[#FF6B00]/20">
                ⚡ Smart Access
             </div>
             <h2 className="text-4xl md:text-6xl font-black text-[#1A0A00] tracking-tighter mb-4">
               Kravy ka Access <span className="text-[#FF6B00]">Control</span>
             </h2>
             <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
               System itna smart hai ki staff member ko login ke baad sirf wahi functions dikhte hain jinhe aapne allow kiya hai.
             </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🎯", title: "Targeted Access", desc: "Sirf wo sections visible honge jo aap allow karenge. Baki sab automatically gayab.", delay: 0 },
              { icon: "⚡", title: "Instant Setup", desc: "One-click mein staff account ready. Email/Password auto-generate karein.", delay: 0.1 },
              { icon: "🔄", title: "Real-time Sync", desc: "Staff ka kiya hua kaam aapke dashboard par turant update hota hai.", delay: 0.2 },
              { icon: "🛡️", title: "Shared Data", desc: "Staff delete ho jaye, data hamesha Owner account mein safe rehta hai.", delay: 0.3 },
            ].map((f, i) => (
              <motion.div 
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: f.delay }}
                viewport={{ once: true }}
                className="group bg-[#F8FAFC] p-8 rounded-[2.5rem] border border-slate-100 hover:border-[#FF6B00] transition-all hover:bg-white hover:shadow-2xl hover:shadow-[#FF6B00]/10"
              >
                <div className="text-4xl mb-6 transform group-hover:rotate-12 transition-transform">{f.icon}</div>
                <h3 className="text-lg font-black text-[#1A0A00] mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEPS SECTION ── */}
      <section className="py-24 px-6 bg-slate-900 border-y border-slate-800 text-white relative">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
          style={{ background: 'radial-gradient(circle at 70% 20%, #FF6B00 0%, transparent 50%)' }}></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-20">
             <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight">
               How to manage <br />
               <span className="text-[#FFB830]">4 Simple Steps</span>
             </h2>
          </div>

          <div className="space-y-20 relative">
            <div className="absolute left-[27px] top-12 bottom-12 w-[2px] bg-gradient-to-b from-[#FF6B00] via-[#FFB830] to-transparent opacity-20 hidden md:block"></div>
            
            {[
              { num: "1", title: "Staff Page par Jaiye", desc: "Kravy POS Side Navigation mein 'Staff Management' select karein.", tag: "Admin Menu → Staff" },
              { num: "2", title: "Details Fill Karein", desc: "Staff ka naam likhiye. Email/Password ke liye 'Auto-Generate' use karein.", tag: "Automatic Credentials" },
              { num: "3", title: "Manage Access", desc: "Decide karein ki kaunse buttons staff ko dikhne chahiye.", tag: "Tick/Untick Sections" },
              { num: "4", title: "Save & Live!", desc: "Done! Aapka staff ab login kar sakta hai aur unhe baki sab hidden dikhega.", tag: "Instant Activation" },
            ].map((s, i) => (
              <motion.div 
                key={s.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-10"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FFB830] flex-shrink-0 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-[#FF6B00]/30 z-10 rotate-3">
                  {s.num}
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white mb-2">{s.title}</h3>
                   <p className="text-slate-400 text-lg font-medium mb-4">{s.desc}</p>
                   <span className="bg-white/5 text-[#FFB830] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-white/10">
                     {s.tag}
                   </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mt-24 p-10 bg-white/5 border border-white/10 rounded-[3rem] flex items-start gap-8 backdrop-blur-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
               <ShieldCheck className="text-red-400" size={32} />
            </div>
            <div>
              <h4 className="text-red-400 font-black uppercase tracking-widest text-xs mb-2">🔴 Owner Safety Alert</h4>
              <p className="text-slate-300 text-xl font-medium leading-relaxed italic">
                "Kabhi bhi apna <span className="text-white border-b border-white/20">Master Login</span> staff ko na dein. Unke liye hamesha alag account hi banayein."
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VISIBILITY EXAMPLE ── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
            <div className="max-w-xl">
               <div className="text-slate-400 font-black uppercase tracking-widest text-[10px] mb-4 underline decoration-[#FF6B00] underline-offset-4">Dynamic UI Rendering</div>
               <h2 className="text-4xl md:text-6xl font-black text-[#1A0A00] tracking-tighter leading-none">
                 Clean Interface <br /> 
                 <span className="text-[#FF6B00]">Zero Confusions</span>
               </h2>
               <p className="text-slate-500 mt-6 font-medium text-lg leading-relaxed">
                 Dekho kaise role ke basis par Kravy POS ka sidebar automatically badal jata hai.
               </p>
            </div>
            <div className="bg-slate-50 px-8 py-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
               <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                 <CheckCircle2 size={28} />
               </div>
               <div>
                  <div className="text-sm font-black text-[#1A0A00]">Visibility Logic Sync</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Server Side</div>
               </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
             {/* Waiter View */}
             <motion.div 
               whileHover={{ y: -10 }}
               className="bg-[#F8FAFC] rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50"
             >
                <div className="bg-[#FF6B00] p-8 text-white flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">🧑‍🍳</div>
                      <h3 className="text-xl font-black uppercase tracking-widest">Waiter View</h3>
                   </div>
                   <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">Active</div>
                </div>
                <div className="p-10 space-y-5">
                   {[
                     { label: "Table Management", status: "active" },
                     { label: "KOT / Menu View", status: "active" },
                     { label: "Order Tracking Status", status: "active" },
                     { label: "Billing / Master Payments", status: "hidden" },
                     { label: "Marketing Analytics", status: "hidden" },
                   ].map(item => (
                     <div key={item.label} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${item.status === 'active' ? 'bg-white border-slate-100 text-[#FF6B00] font-black' : 'opacity-10 grayscale'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'active' ? 'bg-[#FF6B00]' : 'bg-slate-300'}`}></div>
                           <span className="text-sm">{item.label}</span>
                        </div>
                        {item.status === 'active' ? <CheckCircle2 size={18} /> : <X size={18} className="text-slate-400" />}
                     </div>
                   ))}
                </div>
             </motion.div>

             {/* Biller View */}
             <motion.div 
               whileHover={{ y: -10 }}
               className="bg-[#F8FAFC] rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50"
             >
                <div className="bg-[#1976D2] p-8 text-white flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">💳</div>
                      <h3 className="text-xl font-black uppercase tracking-widest">Biller View</h3>
                   </div>
                   <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">Active</div>
                </div>
                <div className="p-10 space-y-5">
                   {[
                     { label: "Billing & Invoicing", status: "active" },
                     { label: "Sales History Logs", status: "active" },
                     { label: "Table Management", status: "active" },
                     { label: "Expense Management", status: "hidden" },
                     { label: "Staff Hire Dashboard", status: "hidden" },
                   ].map(item => (
                     <div key={item.label} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${item.status === 'active' ? 'bg-white border-slate-100 text-[#1976D2] font-black' : 'opacity-10 grayscale'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'active' ? 'bg-[#1976D2]' : 'bg-slate-300'}`}></div>
                           <span className="text-sm">{item.label}</span>
                        </div>
                        {item.status === 'active' ? <CheckCircle2 size={18} className="text-[#1976D2]" /> : <X size={18} className="text-slate-400" />}
                     </div>
                   ))}
                </div>
             </motion.div>
          </div>

          <div className="mt-20 p-10 bg-slate-50 rounded-[3rem] text-center border border-slate-100">
             <p className="text-slate-500 text-xl font-semibold italic">
                "Jis section ka access nahi hota, uski <span className="text-[#FF6B00]">Heading (naam)</span> bhi gayab ho jati hai — zero confusion!"
             </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES DEEP DIVE ── */}
      <section className="bg-[#FFF8F0] py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 text-center">
             <h2 className="text-4xl md:text-6xl font-black text-[#1A0A00] tracking-tighter">
               Teen Powerful <span className="text-[#FF6B00]">Capabilities</span>
             </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Staff Create: Fast",
                desc: "Manually details bharne ki zaroorat nahi. One-click mein sab ready.",
                example: "Bas naam likhiye aur 'Auto-Generate' karein. rahul.x123@kravypos.com system khud bana dega.",
                points: ["Auto-Generate Email", "Secure Encryption", "One-Click Activation"]
              },
              {
                num: "2",
                title: "Access Control",
                desc: "Aap decide karein ki staff dashboard par kya dekh sakta hai.",
                example: "Waiter ko 'Sales Analytics' ya 'Inventory' dikhane ki zaroorat nahi. Tick/Untick karein.",
                points: ["Dynamic Hiding Logic", "Instant Permissions", "Custom Sidebar UI"]
              },
              {
                num: "3",
                title: "Shared Cloud Data",
                desc: "Staff kaam karenge, par sara data aapke account mein hamesha safe rahega.",
                example: "Staff ne jab bill banaya, wo aapke phone/laptop par turant dikhega. Staff badle, data nahi.",
                points: ["Owner Scope Protection", "Persistent Logs", "Cloud Data Sync"]
              }
            ].map((f, i) => (
              <motion.div 
                key={f.num}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white rounded-[3rem] border border-slate-200 overflow-hidden flex flex-col hover:shadow-2xl hover:border-[#FF6B00] transition-all"
              >
                <div className="bg-slate-50 p-8 flex items-center gap-5 border-b border-slate-100">
                   <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FFB830] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-[#FF6B00]/20">
                      {f.num}
                   </div>
                   <h3 className="text-[#1A0A00] text-xl font-black leading-tight group-hover:text-[#FF6B00] transition-colors">{f.title}</h3>
                </div>
                <div className="p-10 flex-1 flex flex-col">
                   <p className="text-slate-500 font-medium mb-8 text-base">{f.desc}</p>
                   <div className="bg-[#FF6B00]/5 border border-dashed border-[#FF6B00]/20 p-6 rounded-[2rem] mb-10">
                      <div className="text-[10px] font-black text-[#FF6B00] uppercase tracking-widest mb-3">📌 Use Case Example</div>
                      <p className="text-sm text-[#1A0A00] font-bold italic leading-relaxed">{f.example}</p>
                   </div>
                   <ul className="space-y-4 mt-auto">
                      {f.points.map(pt => (
                        <li key={pt} className="flex items-center gap-4 text-xs font-black text-slate-800">
                           <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                           </div>
                           {pt}
                        </li>
                      ))}
                   </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKING SECTION ── */}
      <section className="py-24 px-6 bg-white relative overflow-hidden" ref={statRef}>
        <div className="max-w-6xl mx-auto">
           <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div>
                 <div className="text-[#FF6B00] font-black uppercase tracking-widest text-[10px] mb-4">Cloud Tracking</div>
                 <h2 className="text-5xl md:text-7xl font-black text-[#1A0A00] tracking-tighter leading-[0.9] mb-8">
                   Pure Control <br />
                   <span className="text-[#FF6B00]">In Your Hands.</span>
                 </h2>
                 <p className="text-slate-500 text-xl font-medium leading-relaxed mb-12">
                   Staff member jo bhi activity karta hai, uska permanent log aapke Owner account mein realtime save hota hai.
                 </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <Activity className="text-[#FF6B00] mb-4" size={32} />
                        <h4 className="text-[#1A0A00] font-black mb-1">Activity Audit</h4>
                        <p className="text-slate-400 text-sm font-bold">Har click recorded hai.</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                        <Eye className="text-[#FFB830] mb-4" size={32} />
                        <h4 className="text-[#1A0A00] font-black mb-1">Live Monitor</h4>
                        <p className="text-slate-400 text-sm font-bold">Staff actions par nazar.</p>
                    </div>
                 </div>
              </div>

              <div className="relative">
                 <div className="bg-white border-4 border-[#FF6B00]/10 rounded-[4rem] p-16 text-center relative z-10 shadow-2xl shadow-orange-100">
                    <div className="text-9xl font-black text-[#FF6B00] mb-2 tracking-tighter">
                      {percent}%
                    </div>
                    <div className="text-slate-400 text-sm font-black uppercase tracking-[0.4em] mb-10">Data Streaming</div>
                    
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-12 p-[2px] border border-slate-200">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={isStatInView ? { width: "100%" } : {}}
                         transition={{ duration: 2, ease: "easeOut" }}
                         className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB830] rounded-full"
                       ></motion.div>
                    </div>

                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                       EVERY ACTION IS INSTANTLY<br />
                       REFLECTED ON OWNER DEVICE
                    </div>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border-2 border-[#FF6B00]/5 rounded-full animate-pulse-slow"></div>
              </div>
           </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-24 px-6 border-t border-slate-100 bg-slate-50/50 text-center relative overflow-hidden">
         <div className="max-w-4xl mx-auto relative z-10">
            <div className="w-24 h-24 rounded-[2.8rem] bg-gradient-to-br from-[#FF6B00] via-[#FFB830] to-[#FF6B00] flex items-center justify-center text-white mx-auto shadow-2xl shadow-[#FF6B00]/30 mb-12 transform -rotate-6">
               <ShieldCheck size={48} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#1A0A00] mb-6 tracking-tight">Kravy POS Control Ready!</h2>
            <p className="text-slate-500 text-xl font-medium mb-16 max-w-xl mx-auto">
               Ab aapka business safe aur organized rahega. Naye staff accounts bana kar apne kaam ko automate karein.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
               <button 
                 onClick={() => window.print()}
                 className="bg-slate-900 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[12px] flex items-center gap-4 hover:bg-black active:scale-95 transition-all shadow-2xl shadow-slate-200"
               >
                 <Printer size={18} /> Print Premium Version
               </button>
               <button 
                 onClick={() => router.push("/dashboard/staff")}
                 className="bg-[#FF6B00] text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[12px] flex items-center gap-4 hover:shadow-[#FF6B00]/40 active:scale-95 transition-all shadow-2xl shadow-[#FF6B00]/30"
               >
                 Go to Staff Page <ChevronRight size={18} />
               </button>
            </div>
            <p className="mt-24 text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">
              Smart POS for Modern Businesses
            </p>
         </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradient-x 5s ease infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; scale: 1; }
          50% { opacity: 0.2; scale: 1.05; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

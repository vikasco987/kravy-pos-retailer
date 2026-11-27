"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ChefHat, 
  CreditCard, 
  Table as TableIcon, 
  Printer, 
  Zap, 
  CheckCircle2, 
  Info,
  ArrowRight,
  Flame,
  MousePointer2,
  ChevronRight,
  Layers,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function POSWorkflowDocs() {
  const router = useRouter();

  const workflowSteps = [
    {
      title: "Table Selection",
      desc: "Left panel se table select karein. Status colors se pata chalega kaunsi table occupied hai.",
      icon: <TableIcon className="text-orange-600" size={24} />,
      color: "orange"
    },
    {
      title: "Order Capture",
      desc: "Items add karein aur kitchen ko send karein. Ek click mein KOT generate karein.",
      icon: <MousePointer2 className="text-indigo-600" size={24} />,
      color: "indigo"
    },
    {
      title: "Kitchen Sync",
      desc: "Chef ko real-time update milega. Preparation status live monitor karein.",
      icon: <ChefHat className="text-rose-600" size={24} />,
      color: "rose"
    },
    {
      title: "Instant Billing",
      desc: "Khana khatam hote hi checkout karein. UPI, Cash ya Card se payment accept karein.",
      icon: <CreditCard className="text-emerald-600" size={24} />,
      color: "emerald"
    },
    {
      title: "KOT Tracking",
      desc: "Print status track karein. Badge se pata chalega kitchen ticket print hui ya nahi.",
      icon: <Printer className="text-indigo-500" size={24} />,
      color: "indigo"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200 text-xl font-black">
              K
            </div>
            <span className="font-black text-xl tracking-tight text-slate-800">Workflow <span className="text-orange-600">Master</span></span>
          </div>
          <button 
            onClick={() => router.back()}
            className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl transition-all"
          >
            ← Back
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        
        {/* ── HERO SECTION ── */}
        <header className="relative mb-32">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-100/50 blur-[100px] rounded-full z-0"></div>
          <div className="absolute top-0 -right-20 w-80 h-80 bg-indigo-100/30 blur-[120px] rounded-full z-0"></div>
          
          <div className="relative z-10 space-y-8 max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
            >
              <Sparkles size={14} className="text-orange-400" /> POS Workflow Manual
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9]">
              Business Management <br/>
              <span className="text-orange-600 italic">Redefined.</span>
            </h1>
            
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
              Table booking se lekar billing tak—sab kuch ek hi screen par. 
              Staff ke liye fast, easy aur super attractive dashboard.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
               <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-black text-xs uppercase tracking-widest shadow-sm">
                 <CheckCircle2 size={16} /> Fast & Reliable
               </div>
               <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-xl border border-slate-100 font-black text-xs uppercase tracking-widest shadow-sm">
                 <Zap size={16} className="text-orange-500" /> Real-time Sync
               </div>
            </div>
          </div>
        </header>

        {/* ── QUICK STEPS ── */}
        <section className="mb-40">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-12 text-center">How It Works</h2>
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {workflowSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-orange-200 transition-all group"
                >
                  <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform ${
                    step.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                    step.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                    step.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-4">{step.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed italic">"{step.desc}"</p>
                </motion.div>
              ))}
           </div>
        </section>

        {/* ── DETAIL SECTIONS ── */}
        <div className="space-y-40">
           
           {/* Section 1: Dashboard */}
           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                 <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg font-black italic">1</div>
                 <h2 className="text-5xl font-black text-slate-900 leading-tight">Master <span className="text-orange-600 underline decoration-orange-200 underline-offset-8">POS Terminal</span></h2>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed">
                   Aapke business ka kaam ab ek single terminal par hai. Left side mein tables aur right side mein live order details.
                 </p>
                 <div className="space-y-4">
                    {[
                      { l: "Status Colors", d: "Green (Free), Red (Cooking), Blue (Ready)." },
                      { l: "Quick Search", d: "Palk jhapakte hi table find karein." },
                      { l: "Split View", d: "Table details dekhte hue billing manage karein." }
                    ].map((feature, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 shrink-0" />
                         <div>
                            <p className="font-black text-slate-800 text-sm">{feature.l}</p>
                            <p className="text-xs text-slate-400 font-medium">{feature.d}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="relative group">
                 <div className="absolute -inset-4 bg-gradient-to-tr from-orange-400 to-indigo-400 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                 <div className="relative bg-slate-900 rounded-[3rem] p-8 shadow-2xl overflow-hidden border border-white/10">
                    <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6 opacity-60">
                       <div className="w-3 h-3 rounded-full bg-rose-500" />
                       <div className="w-3 h-3 rounded-full bg-amber-500" />
                       <div className="w-3 h-3 rounded-full bg-emerald-500" />
                       <div className="ml-4 h-2 w-32 bg-white/20 rounded-full" />
                    </div>
                    <div className="flex gap-4">
                       <div className="w-1/3 space-y-3">
                          {[1,2,3,4].map(n => <div key={n} className={`h-12 rounded-xl border ${n===3 ? 'bg-orange-600 border-orange-500 shadow-lg shadow-orange-500/30' : 'bg-white/5 border-white/10'}`} />)}
                       </div>
                       <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-4">
                          <div className="space-y-3">
                             <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                             <div className="h-2 w-full bg-white/5 rounded-full" />
                             <div className="h-2 w-full bg-white/5 rounded-full" />
                             <div className="h-10 w-full bg-white/10 rounded-xl mt-6" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 2: Order Flow */}
           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="order-2 lg:order-1 relative group">
                  <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[3rem] blur-2xl opacity-40 group-hover:opacity-60 transition-all"></div>
                  <div className="relative bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl space-y-8">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Flow</span>
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black border border-indigo-100">RUNNING</div>
                     </div>
                     {[
                       { i: "🍕", n: "Paneer Pizza", s: "Cooking", c: "text-amber-500" },
                       { i: "🥤", n: "Coke (2)", s: "Served", c: "text-emerald-500" }
                     ].map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                             <span className="text-xl">{item.i}</span>
                             <span className="font-bold text-slate-800">{item.n}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${item.c}`}>{item.s}</span>
                       </div>
                     ))}
                     <div className="pt-6 border-t border-slate-100 flex gap-2">
                        <div className="flex-1 h-12 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px] uppercase tracking-widest">Modify</div>
                        <div className="flex-1 h-12 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200">KOT Ready</div>
                     </div>
                  </div>
              </div>
              <div className="order-1 lg:order-2 space-y-8">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg font-black italic">2</div>
                 <h2 className="text-5xl font-black text-slate-900 leading-tight">Fast <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Order Flow</span></h2>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed">
                   Customer ne order badla? Ya extra coke mangi? Koi dikkat nahi. Real-time mein items add karein aur kitchen ko send karein.
                 </p>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 shadow-sm">
                       <CheckCircle2 className="text-indigo-600 mt-1 shrink-0" size={20} />
                       <p className="text-sm font-bold text-indigo-900 italic">"Instructions add karein for Chef (e.g., Less Spicy, No Onion)."</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 3: KDS & Billing */}
           <div className="bg-slate-950 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full group-hover:bg-orange-600/20 transition-all"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full group-hover:bg-indigo-600/20 transition-all"></div>
              
              <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
                 <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-8 font-black italic">3</div>
                    <h2 className="text-5xl font-black mb-8 leading-tight">Kitchen & <br/><span className="text-orange-500">Billing Sync</span></h2>
                    <ul className="space-y-6 mb-10">
                       {[
                         "KDS Monitor: Kitchen mein dedicated screen for Chefs.",
                         "Live Sync-up: Dashboard se change kitchen mein 1 sec mein dikhega.",
                         "Click to Bill: Order served? Bas checkout button dabayein aur bill generate karein.",
                         "Multi-payment: UPI QR automatically generate hota hai total amount ke saath."
                       ].map(t => (
                         <li key={t} className="flex gap-4 items-start text-slate-300 font-medium leading-relaxed">
                            <span className="text-orange-500 font-black">→</span> {t}
                         </li>
                       ))}
                    </ul>
                    <div className="flex gap-4">
                       <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-white/60">KDS Active</div>
                       <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-white/60">Billing Ready</div>
                    </div>
                 </div>
                 <div className="relative">
                    <div className="bg-white/5 rounded-[3rem] p-10 border border-white/10 backdrop-blur-sm shadow-2xl origin-bottom group-hover:scale-[1.02] transition-transform">
                       <div className="text-center mb-10">
                          <Printer className="mx-auto text-orange-400 mb-4" size={40} />
                          <h4 className="text-2xl font-black">Digital Receipt</h4>
                       </div>
                       <div className="space-y-4 mb-8">
                          <div className="flex justify-between text-xs font-black text-white/40 uppercase tracking-widest">
                             <span>Subtotal</span>
                             <span className="text-white">₹520.00</span>
                          </div>
                          <div className="flex justify-between text-xs font-black text-white/40 uppercase tracking-widest">
                             <span>GST (5%)</span>
                             <span className="text-white">₹26.00</span>
                          </div>
                          <div className="h-[2px] bg-white/10 w-full" />
                          <div className="flex justify-between items-baseline">
                             <span className="text-sm font-black text-white/60">Total Amount</span>
                             <span className="text-3xl font-black text-orange-500">₹546.00</span>
                          </div>
                       </div>
                       <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
                          Ready for Payment 📲
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 4: KOT Tracking */}
           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg font-black italic">4</div>
                 <h2 className="text-5xl font-black text-slate-900 leading-tight">Smart <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">KOT Tracking</span></h2>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed">
                   Ab baar-baar kitchen se puchne ki zaroorat nahi. System automatic track karta hai ki KOT print hua ya nahi.
                 </p>
                 <div className="space-y-4">
                    {[
                      { l: "Indigo Badge", d: "Kitchen cards aur table list mein status icon." },
                      { l: "Auto-Sync", d: "Print hote hi 'KOT PRINTED' ka mark lag jayega." },
                      { l: "Conflict Free", d: "Ek hi order dubara print hone se bachata hai." }
                    ].map((feature, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
                         <div>
                            <p className="font-black text-slate-800 text-sm">{feature.l}</p>
                            <p className="text-xs text-slate-400 font-medium">{feature.d}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="relative group">
                 <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-400 to-rose-400 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                 <div className="relative bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <Printer size={20} className="text-indigo-500" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">KOT Tracking System</span>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900">Order #T2-4A2B</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md text-[9px] font-black border border-indigo-100 flex items-center gap-1">
                                <Printer size={10} /> KOT PRINTED
                            </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             whileInView={{ width: "100%" }}
                             transition={{ duration: 1 }}
                             className="h-full bg-indigo-500"
                           />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold italic text-center">Ticket has been dispatched to kitchen.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* ── FAQ ── */}
        <section className="mt-40 pt-40 border-t border-slate-100">
           <div className="max-w-2xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-black text-slate-900 mb-4">Common Questions</h2>
              <p className="text-slate-500 font-medium">Koi confusion ho to yahan dekhein.</p>
           </div>
           <div className="grid md:grid-cols-2 gap-8">
              {[
                { q: "Naya table kaise add karein?", a: "Tables page par ja kar 'Add Table' button dabayein, naya table turant dashboard par dikhne lagega." },
                { q: "Table Status automatically update hota hai?", a: "Haan, jaise hi aap ya customer order place karte hain, table status grey se transition hoke status ke hisaab se color badal leta hai." },
                { q: "KOT print karna zaroori hai?", a: "Haan, Chef ko physical ticket dene ke liye print karein. System automatic track karega ki print ho gaya hai." },
                { q: "KOT status kahan dikhega?", a: "Main Dashboard, Kitchen cards aur Tracking table mein indigo color ka printer icon nazar aayega." },
                { q: "Kya bill split kar sakte hain?", a: "Billing screen par option aane wala hai, tab tak aap multi-order session se different billing manage kar sakte hain." }
              ].map((faq, i) => (
                <div key={i} className="p-10 bg-slate-50/50 border border-slate-100 rounded-[3rem] hover:bg-white hover:shadow-xl transition-all group">
                   <h4 className="font-black text-slate-800 text-lg mb-4 flex items-start gap-4">
                      <span className="text-orange-600 bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0">?</span>
                      {faq.q}
                   </h4>
                   <p className="text-slate-500 font-medium leading-relaxed pl-12">"{faq.a}"</p>
                </div>
              ))}
           </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <footer className="mt-40 text-center py-24 bg-gradient-to-br from-slate-900 to-black rounded-[4rem] text-white shadow-3xl">
           <div className="max-w-xl mx-auto px-6">
              <Layers className="mx-auto text-orange-400 mb-8" size={32} />
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Staff ko Pro <br/> Banane ka <span className="text-orange-500 italic">Sahi Time.</span></h2>
              <div className="flex flex-wrap justify-center gap-4">
                 <button 
                   onClick={() => router.push("/dashboard/workflow")}
                   className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
                 >
                   Open POS Terminal <ChevronRight size={16} />
                 </button>
                 <button 
                   onClick={() => window.print()}
                   className="bg-white/10 text-white border border-white/10 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-white/20 transition-all"
                 >
                   <Printer size={16} /> Save Guide PDF
                 </button>
              </div>
           </div>
        </footer>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
}

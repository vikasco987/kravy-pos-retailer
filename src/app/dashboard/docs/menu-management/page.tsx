"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  UtensilsCrossed, 
  Plus, 
  Settings, 
  QrCode, 
  Zap, 
  CheckCircle2, 
  Info,
  ArrowRight,
  LayoutGrid,
  ClipboardList,
  Flame,
  Search,
  ChevronRight,
  Printer
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function MenuManagementDocs() {
  const router = useRouter();

  const features = [
    {
      title: "Category Creation",
      desc: "Apne menu ko organize karein (e.g., Pizza, Burgers, Drinks).",
      icon: <LayoutGrid className="text-orange-600" size={24} />,
      gradient: "from-orange-50 to-orange-100"
    },
    {
      title: "Item Additions",
      desc: "Naye items add karein with price and description.",
      icon: <Plus className="text-indigo-600" size={24} />,
      gradient: "from-indigo-50 to-indigo-100"
    },
    {
      title: "Instant Updates",
      desc: "Price ya availability change karein jo turant QR Menu par dikhegi.",
      icon: <Zap className="text-amber-600" size={24} />,
      gradient: "from-amber-50 to-amber-100"
    },
    {
      title: "QR Menu Sync",
      desc: "Aapka digital menu hamesha live aur updated rahega.",
      icon: <QrCode className="text-emerald-600" size={24} />,
      gradient: "from-emerald-50 to-emerald-100"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <UtensilsCrossed size={22} />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-800">Menu <span className="text-orange-600">Master</span></span>
          </div>
          <button 
            onClick={() => router.back()}
            className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl transition-all"
          >
            ← Back
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Header Section */}
        <header className="space-y-6 mb-20 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-100"
          >
            <Flame size={14} fill="white" /> Menu Management Guide
          </motion.div>
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">
              Control Your <span className="text-orange-600">Menu</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed italic">
              Items add karna, price badalna aur categories manage karna ab hai behad asaan.
            </p>
          </div>
        </header>

        {/* Quick Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${f.gradient} p-8 rounded-[2.5rem] border border-white shadow-sm hover:shadow-xl transition-all group`}
            >
              <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Deep Dive Sections */}
        <div className="space-y-32">
          
          {/* Section 1: Categories */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="order-2 lg:order-1">
                <div className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Step One</div>
                <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">Create Beautiful <br/><span className="text-indigo-600">Categories</span></h2>
                <div className="space-y-6">
                   <p className="text-slate-600 font-medium text-lg leading-relaxed">
                     Sabse pehle apne items ko groups mein baantein. Categories banayein jaise:
                   </p>
                   <ul className="space-y-4">
                      {["Main Course (Pizza, Pasta)", "Beverages (Tea, Coffee)", "Desserts (Ice Cream, Cake)"].map(item => (
                        <li key={item} className="flex items-center gap-4 text-slate-700 font-bold">
                           <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                           {item}
                        </li>
                      ))}
                   </ul>
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                      <Info className="text-indigo-600 shrink-0" size={20} />
                      <p className="text-sm text-slate-500 italic">"Achhi categories customer ko jaldi order dene mein help karti hain."</p>
                   </div>
                </div>
             </div>
             <div className="order-1 lg:order-2 bg-indigo-100 rounded-[3rem] p-12 relative overflow-hidden group">
                <div className="bg-white rounded-[2rem] p-8 shadow-2xl relative z-10">
                   <div className="flex items-center justify-between mb-8">
                      <div className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Store Setup</div>
                      <Settings size={18} className="text-slate-300" />
                   </div>
                   <div className="space-y-4">
                      <div className="h-12 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center px-4 font-black text-indigo-600">🍕 Main Course</div>
                      <div className="h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-4 font-bold text-slate-400">🥤 Drinks</div>
                      <div className="h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-4 font-bold text-slate-400">🍰 Desserts</div>
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/20 blur-[60px] rounded-full"></div>
             </div>
          </div>

          {/* Section 2: Adding Items */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="bg-orange-100 rounded-[3rem] p-12 relative overflow-hidden">
                <div className="bg-white rounded-[2rem] p-8 shadow-2xl relative z-10 space-y-6">
                   <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white"><Plus /></div>
                      <h4 className="font-black text-slate-800">Add New Item</h4>
                   </div>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item Name</label>
                         <div className="h-10 bg-slate-50 rounded-xl px-4 flex items-center text-slate-900 font-bold">Paneer Tikka</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Price</label>
                           <div className="h-10 bg-slate-50 rounded-xl px-4 flex items-center text-slate-900 font-bold">₹240</div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">GST %</label>
                           <div className="h-10 bg-slate-50 rounded-xl px-4 flex items-center text-slate-900 font-bold">5%</div>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-400/20 blur-[80px] rounded-full"></div>
             </div>
             <div>
                <div className="inline-block bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Step Two</div>
                <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">Details matter for <br/><span className="text-orange-600">Better Sales</span></h2>
                <div className="space-y-6">
                   <p className="text-slate-600 font-medium text-lg leading-relaxed">
                     Har item ki details accurate fill karein. Isse checkout ke waqt calculation auto-pilot par hogi.
                   </p>
                   <div className="grid grid-cols-1 gap-4">
                      {[
                        "Tax (GST) settings automatic apply hogi.",
                        "Description mein ingredients add karein.",
                        "Images upload karein for digital menu."
                      ].map(pt => (
                        <div key={pt} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                           <CheckCircle2 size={18} className="text-emerald-500" />
                           <span className="text-sm font-bold text-slate-700">{pt}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>

          {/* Section 3: QR Sync */}
          <div className="bg-slate-900 rounded-[3.5rem] p-16 text-white overflow-hidden relative">
             <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                   <div className="inline-block bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-500/20">Live Sync</div>
                   <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Automatic <span className="text-emerald-400">QR Menu</span> <br/> Updated!</h2>
                   <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
                     Jaise hi aap Kravy Dashboard par koi change karte hain, wo turant customer ke QR Menu par update ho jata hai. No reprints needed!
                   </p>
                   <div className="flex gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                         <ClipboardList className="text-emerald-400 mb-3" />
                         <div className="text-xs font-black uppercase tracking-widest">Real-time Sync</div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                         <Zap className="text-amber-400 mb-3" />
                         <div className="text-xs font-black uppercase tracking-widest">Instant Impact</div>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-center">
                   <div className="w-64 h-64 bg-white p-4 rounded-3xl shadow-2xl animate-pulse-slow">
                      <QrCode className="w-full h-full text-slate-900" />
                   </div>
                </div>
             </div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/5 rounded-full z-0"></div>
          </div>
        </div>

        {/* FAQ Area */}
        <section className="mt-32 border-t border-slate-100 pt-32">
           <h2 className="text-3xl font-black text-slate-900 mb-12 text-center">Frequently Asked Questions</h2>
           <div className="grid md:grid-cols-2 gap-8">
              {[
                { q: "Naya Category kaise banayein?", a: "Menu items page par upar 'Manage Categories' button hai, wahan se aap naye groups bana sakte hain." },
                { q: "Item disable kaise karein?", a: "Agar item stock mein nahi hai, to bas edit menu mein ja kar usse 'Out of Stock' mark karein." },
                { q: "QR Code badalne ki zaroorat hai?", a: "Nahi, QR code same rahega. Sirf menu contents online badal jayenge." },
                { q: "Bulk upload possible hai?", a: "Haan, aap Excel sheet se bhi items upload kar sakte hain default settings ke saath." }
              ].map((faq, i) => (
                <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                   <h4 className="font-black text-slate-800 text-lg mb-3 flex items-start gap-3">
                      <span className="text-orange-600 font-black text-2xl leading-none">?</span>
                      {faq.q}
                   </h4>
                   <p className="text-slate-500 font-medium leading-relaxed pl-6 italic">"{faq.a}"</p>
                </div>
              ))}
           </div>
        </section>

        {/* Footer CTA */}
        <footer className="mt-32 text-center py-20 bg-orange-600 rounded-[3.5rem] text-white">
           <div className="max-w-xl mx-auto px-6">
              <h2 className="text-4xl font-black mb-6 leading-tight">Menu Setup Karne Ke <br/> Liye Taiyaar?</h2>
              <p className="text-orange-100 text-lg font-medium mb-12 opactiy-80">
                 Apne business ka digital face ab aapke haath mein hai. Chaliye shuru karte hain!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                 <button 
                   onClick={() => window.print()}
                   className="bg-white text-orange-600 px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                 >
                   <Printer size={16} /> Print Manual
                 </button>
                 <button 
                   onClick={() => router.push("/dashboard/store-catalog")}
                   className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl"
                 >
                   Go to Menu Page <ChevronRight size={16} />
                 </button>
              </div>
           </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

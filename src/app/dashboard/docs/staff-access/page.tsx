"use client";

import React from "react";
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert,
  Zap,
  Layout,
  Server,
  Share2,
  Code,
  Key,
  Eye,
  Activity,
  UserCheck,
  PlusCircle,
  Settings,
  Book,
  HelpCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthContext } from "@/components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StaffAccessDocsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/user/me")
        .then(res => res.json())
        .then(data => {
          if (data.role === "ADMIN" || data.role === "SELLER") {
            setIsAdmin(true);
          } else {
            router.push("/dashboard");
          }
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [user, router]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const sections = [
    {
      title: "1. Staff Create Karna (Simple & Fast)",
      icon: <PlusCircle className="text-indigo-500" size={24} />,
      content: "Naya staff member add karna ab bahut asaan hai. Aapko manually details bharne ki zaroorat nahi.",
      hinglish: "Example: Agar aapne 'Rahul' ko add karna hai, to bas uska naam likhiye aur Email/Password ke liye 'Auto-Generate' par click kijiye. System apne aap ek unique email (rahul.x123@kravypos.com) bana dega.",
      points: [
        "Auto-Generate Email: Bin kisi mehnat ke unique email banayein.",
        "Secure Password: Clerk security ke mutabik strong password automatically set ho jata hai.",
        "One-Click Setup: Bas 'Add Staff' par click karein aur kaam khatam."
      ]
    },
    {
      title: "2. Access Control (Kaun Kya Dekhega?)",
      icon: <Lock className="text-orange-500" size={24} />,
      content: "Aap decide kar sakte hain ki aapka staff dashboard par kya dekh sakta hai aur kya nahi.",
      hinglish: "Example: Agar aapne kisi ko sirf Billing ke liye rakha hai, to unhe 'Store Catalog' ya 'Inventory' dikhane ki koi zaroorat nahi. Aap unhe tick/untick karke control kar sakte hain.",
      points: [
        "Dynamic Sidebar: Jis feature ka access nahi hoga, uska section (heading) bhi gayab ho jayegi.",
        "Instant Update: Permission save karte hi staff ke dashboard par badlaw turant dikhenge.",
        "Simplified View: Staff ko sirf wahi dikhta hai jo unke kaam ka hai, jisse wo confuse nahi hote."
      ]
    },
    {
      title: "3. Shared Data (Ek Team, Ek Data)",
      icon: <Database className="text-emerald-500" size={24} />,
      content: "Staff members apna kaam karte hain, par sara data Owner (Aapke) account mein save hota hai.",
      hinglish: "Example: Rahul ne koi bill banaya ya table order liya, wo data aapke 'Store Dashboard' par real-time mein show hoga. Staff change hone par bhi aapka data hamesha safe rehta hai.",
      points: [
        "Seamless Sync: Staff ko wahi menu aur tables dikhte hain jo aapne set kiye hain.",
        "Visibility Proxy: Staff login apni email se karta hai, par powers aapki use karta hai.",
        "Data Safety: Staff member delete hone par bhi unka banaya hua data (Bills/Orders) delete nahi hota."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Header Section */}
        <header className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200"
          >
            <ShieldCheck size={14} /> Official Staff Guide
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
              Staff Access <span className="text-indigo-600">Guide</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-3xl leading-relaxed italic">
              Kravy POS mein staff ko manage karna aur unhe permissions dena seekhein - Ek dum simple bhasha mein.
            </p>
          </div>
        </header>

        {/* Quick Summary Section */}
        <div className="grid lg:grid-cols-2 gap-10">
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <Users size={120} />
              </div>
              
              <h2 className="text-3xl font-black mb-6 flex items-center gap-4">
                 <Zap className="text-indigo-400" />
                 Smart Management
              </h2>
              
              <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                 Kravy POS ka access control system itna smart hai ki staff member ko login ke baad sirf wahi button dikhte hain jinhe aapne allow kiya hai.
              </p>

              <div className="space-y-6">
                 <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                    <div className="text-xs font-black uppercase text-indigo-400 mb-2">Step-by-Step Process</div>
                    <ol className="space-y-3 text-sm font-bold">
                       <li className="flex gap-3"><span className="text-white/30">01</span> Staff Management page par jaiye.</li>
                       <li className="flex gap-3"><span className="text-white/30">02</span> Staff ka Name likhiye aur email/pass auto-generate karein.</li>
                       <li className="flex gap-3"><span className="text-white/30">03</span> 'Manage Access' button par click karke permissions select karein.</li>
                       <li className="flex gap-3"><span className="text-white/30">04</span> Save karte hi staff ko unka customized dashboard mil jayega.</li>
                    </ol>
                 </div>
                 
                 <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <ShieldAlert className="text-indigo-400 shrink-0" size={20} />
                    <p className="text-[10px] font-bold text-indigo-200">
                      SAFETY TIP: Kabhi bhi apna Owner login staff ko na dein. Unke liye hamesha alag staff account banayein taaki system safe rahe.
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 flex flex-col justify-center shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                <Layout size={150} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-4">
                 <Eye className="text-orange-500" />
                 Visibility Example
              </h2>
              <div className="space-y-6 text-slate-600">
                 <p className="font-bold text-lg leading-relaxed">
                    Sahi se access control karne se aapka dashboard clean aur easy ho jata hai.
                 </p>
                 <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                       <div>
                          <div className="text-[10px] font-black uppercase text-emerald-500 mb-1">Scenario: Waiter Access</div>
                          <div className="text-sm font-black text-slate-900">Sirf 'Table Status' aur 'Menu View' dikhao.</div>
                       </div>
                       <CheckCircle2 className="text-emerald-500" size={20} />
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                       <div>
                          <div className="text-[10px] font-black uppercase text-indigo-500 mb-1">Scenario: Biller Access</div>
                          <div className="text-sm font-black text-slate-900">Sirf 'Billing' aur 'History' dikhao.</div>
                       </div>
                       <CheckCircle2 className="text-indigo-500" size={20} />
                    </div>
                 </div>
                 <p className="text-sm italic font-medium leading-relaxed">
                    "Jis section ka access nahi hota (jaise Marketing), uska name bhi sidebar se gayab ho jata hai - Isse confusion 100% khatam!"
                 </p>
              </div>
           </div>
        </div>

        {/* Detailed Sections Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {sections.map((section, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-2xl transition-all group"
            >
              <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                 {section.icon}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">{section.title}</h3>
              <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
                {section.content}
              </p>
              <div className="p-4 bg-indigo-50/50 rounded-2xl mb-8">
                 <div className="text-[10px] font-black uppercase text-indigo-400 mb-2">Example / Udaharan</div>
                 <p className="text-xs text-indigo-900 font-bold leading-relaxed">{section.hinglish}</p>
              </div>
              <ul className="space-y-4">
                 {section.points.map((pt, j) => (
                    <li key={j} className="flex items-start gap-3 text-[11px] font-black text-slate-700 leading-tight">
                       <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                       {pt}
                    </li>
                 ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Activity & Support */}
        <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-200 flex flex-col md:flex-row items-center gap-12">
           <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Activity size={14} /> Tracking & Transparency
              </div>
              <h2 className="text-4xl font-black text-slate-900 leading-tight">Kaun kya kar raha hai, <span className="text-indigo-600">Pure Control Mein.</span></h2>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Staff member jo bhi bill banata hai ya edit karta hai, uska log hum save karte hain. Business Owner kisi bhi waqt dekh sakta hai ki kis staff ne kya action liya.
              </p>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Activity Logs</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Safe Management</span>
                 </div>
              </div>
           </div>
           <div className="w-full md:w-[400px] aspect-square bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-4">
                 <div className="text-xs font-black text-slate-400">STAFF PERFORMANCE</div>
                 <div className="text-xs font-black text-indigo-600 underline">VIEW ALL</div>
              </div>
              <div className="space-y-4">
                 {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-100"></div>
                       <div className="flex-1 space-y-2">
                          <div className="h-3 bg-slate-100 rounded-full w-3/4"></div>
                          <div className="h-2 bg-slate-50 rounded-full w-1/2"></div>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                 <div className="text-3xl font-black text-slate-900">100%</div>
                 <div className="text-[10px] font-black text-slate-400 text-right">SYSTEM<br/>CONNECTED</div>
              </div>
           </div>
        </div>

        {/* Documentation Footer */}
        <footer className="pt-20 pb-10 flex flex-col items-center text-center space-y-8 border-t border-slate-200">
           <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <ShieldCheck size={32} />
           </div>
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">Samajhne mein koi dikat?</h3>
              <p className="text-slate-500 font-medium">Agar aapko permissions manage karne mein koi help chahiye to hamare support se contact karein.</p>
           </div>
           <div className="flex gap-4">
              <button onClick={() => window.print()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 group flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                <Share2 size={14} className="group-hover:rotate-12 transition-transform" /> Print Guide
              </button>
              <button onClick={() => router.push("/dashboard/help")} className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2">
                <HelpCircle size={14} /> Help Center
              </button>
           </div>
        </footer>

      </div>
    </div>
  );
}

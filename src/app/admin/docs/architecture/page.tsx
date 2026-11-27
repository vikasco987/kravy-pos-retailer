"use client";

import React from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Database, 
  ShieldCheck, 
  Zap, 
  Users, 
  CreditCard, 
  BarChart4, 
  Layers, 
  Lock, 
  Settings,
  ArrowRight,
  Info,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DeepDocsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
           <Link href="/admin/users" className="flex items-center text-sm font-semibold text-[var(--kravy-text-muted)] hover:text-black transition-colors gap-2">
             <ChevronLeft size={18} /> Back to Management
           </Link>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">System Blueprint v2.0</span>
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-12">
        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-4">
            <BookOpen size={14} /> Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#1E293B] leading-tight">
            KravyPOS <span className="text-indigo-600">Enterprise</span> Architecture Deep-Dive
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-3xl leading-relaxed">
            यह गाइड हमारे POS सिस्टम के Core Design और Functional Logic को विस्तार में समझाती है। 
            यहाँ आप Staff Access, Subscription models, Feature Control और Analytics के काम करने का तरीका समझ सकते हैं।
          </p>
        </motion.div>

        {/* 1. HIGH LEVEL ARCHITECTURE */}
        <motion.section 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-16 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Layers size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-800">1. High-Level Architecture</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed font-medium">
                हमारा Architecture "Multi-Tenant SaaS" मॉडल पर आधारित है। इसका मतलब है कि एक ही सर्वर पर हज़ारों रेस्टोरेंट्स बिना एक दूसरे का डेटा मिक्स किये चल सकते हैं।
              </p>
              <div className="flex flex-col gap-3">
                 {[
                   "Owner: Business control और Subscription manage करता है।",
                   "Admin Panel: System settings और Global rules set करने के लिए।",
                   "Subscription: तय करता है कि किस रेस्टोरेंट को कौन से फीचर्स दिखेंगे।",
                   "Staff Roles: रेस्टोरेंट के अंदर किस एम्प्लोयी को क्या एक्सेस मिलेगा।"
                 ].map((text, i) => (
                   <div key={i} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">{i+1}</div>
                      <span className="text-sm text-slate-700 font-semibold">{text}</span>
                   </div>
                 ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-3xl p-6 overflow-hidden relative border-4 border-slate-800">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} color="white" /></div>
               <div className="relative z-10 font-mono text-xs text-indigo-300 space-y-2">
                 <div className="text-green-400">// Unified Flow</div>
                 <div className="flex items-center gap-2">Business Owner <ArrowRight size={10} /> Admin Panel</div>
                 <div className="pl-4 border-l border-slate-700 ml-2 py-2 space-y-2">
                    <div className="flex items-center gap-2">Subscription Control <ArrowRight size={10} /> Active Features</div>
                    <div className="flex items-center gap-2">Staff Permissions <ArrowRight size={10} /> UI Visibility</div>
                 </div>
                 <div className="flex items-center gap-2">POS Dashboard <ArrowRight size={10} /> Operations</div>
                 <div className="mt-4 pt-4 border-t border-slate-700 text-slate-500">
                    Analytics & Activity Logs Always Engaged
                 </div>
               </div>
            </div>
          </div>
        </motion.section>

        {/* 2. DATABASE COLLECTIONS */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2">
              <div className="flex items-center gap-3 mb-6">
                 <Database className="text-orange-500" />
                 <h3 className="text-xl font-black text-slate-800">Core Database Collections</h3>
              </div>
              <div className="space-y-4">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead>
                          <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                             <th className="pb-3 text-left">Collection</th>
                             <th className="pb-3 text-left">Purpose</th>
                             <th className="pb-3 text-left">Key Fields</th>
                          </tr>
                       </thead>
                       <tbody className="text-slate-600">
                          <tr className="border-b border-slate-50">
                             <td className="py-4 font-black text-slate-800">Businesses</td>
                             <td className="py-4">Business profiles</td>
                             <td className="py-4 font-mono text-[10px]">ownerId, planId, expiry</td>
                          </tr>
                          <tr className="border-b border-slate-50">
                             <td className="py-4 font-black text-slate-800">Subscription</td>
                             <td className="py-4">Pricing plans</td>
                             <td className="py-4 font-mono text-[10px]">features[], price_id</td>
                          </tr>
                          <tr className="border-b border-slate-50">
                             <td className="py-4 font-black text-slate-800">Staff Roles</td>
                             <td className="py-4">Role definitions</td>
                             <td className="py-4 font-mono text-[10px]">permissions{}, name</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
           <div className="bg-gradient-to-br from-slate-800 to-black p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <Zap className="absolute -bottom-4 -right-4 text-white/10" size={120} />
              <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-4">Fast Access Rule</h4>
              <p className="text-sm font-medium leading-relaxed opacity-90 mb-4">
                हमारा सिस्टम Redis + MongoDB Aggregation का उसे करता है ताकी Analytics और Reports बिना किसी देरी के लोड हो सकें।
              </p>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                 <div className="text-[10px] font-black uppercase text-indigo-300 mb-2">Performance Tier</div>
                 <div className="flex items-center justify-between text-xs">
                    <span>Query Speed</span>
                    <span className="text-green-400 font-bold">~12ms</span>
                 </div>
              </div>
           </div>
        </div>

        {/* 3. STAFF & FEATURES */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#EEF2FF] rounded-3xl p-8 border border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                 <ShieldCheck className="text-indigo-600" />
                 <h3 className="text-xl font-black text-indigo-950">Staff Access Matrix</h3>
              </div>
              <p className="text-indigo-800/70 text-sm mb-6 font-medium">
                Admin Panel में Roles डिफाइन करते समय, आप हर मॉड्यूल (Billing, Inventory, etc.) के लिए 'View', 'Edit' और 'Delete' ऑप्शन्स चुन सकते हैं।
              </p>
              <div className="space-y-2">
                 {['Manager (All Access)', 'Cashier (Billing Only)', 'Waiter (Order Take Only)'].map((r, i) => (
                   <div key={i} className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between shadow-sm">
                      <span className="text-sm font-bold text-indigo-900">{r}</span>
                      <Lock size={14} className="text-indigo-400" />
                   </div>
                 ))}
              </div>
            </div>

            <div className="bg-[#FFF7ED] rounded-3xl p-8 border border-orange-100">
              <div className="flex items-center gap-3 mb-6">
                 <CreditCard className="text-orange-600" />
                 <h3 className="text-xl font-black text-orange-950">Feature Control System</h3>
              </div>
              <p className="text-orange-800/70 text-sm mb-6 font-medium">
                अगर कोई रेस्टोरेंट "Basic Plan" पर है और "Inventory" फ़ीचर खोलने की कोशिश करता है, तो सिस्टम ऑटो-ब्लॉक कर के Upgrade Popup दिखाता है।
              </p>
              <div className="grid grid-cols-2 gap-2">
                 {['Billing (Basic)', 'QR Orders (Basic)', 'Inventory (Pro)', 'Reports (Pro)'].map((f, i) => (
                   <div key={i} className="bg-white/50 border border-orange-200 p-2 rounded-lg text-[10px] font-black text-orange-900 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${i < 2 ? 'bg-green-500' : 'bg-orange-300'}`}></div> {f}
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. ACTIVITY LOGS & ANALYTICS */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <div>
                <h2 className="text-3xl font-black mb-6">Activity Logs & Analytics</h2>
                <p className="text-slate-400 leading-relaxed mb-8 font-medium">
                   सिस्टम का हर एक्शन (जैसे बिल काटना, आइटम एडिट करना या रिफंड देना) ट्रैक और स्टोर होता है। 
                   Admin Dashboard में आप एम्प्लोयी का नाम, टाइम और एक्शन देख सकते हैं।
                </p>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-all">
                         <BarChart4 size={20} />
                      </div>
                      <div>
                         <div className="text-sm font-bold tracking-tight">Real-time Tracking</div>
                         <div className="text-[11px] text-slate-500 leading-snug">Every button click is logged for security audits.</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                         <Zap size={20} />
                      </div>
                      <div>
                         <div className="text-sm font-bold tracking-tight">Usage Analytics</div>
                         <div className="text-[11px] text-slate-500 leading-snug">Know which features are popular among businesses.</div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="bg-black/50 border border-white/10 rounded-2xl p-6 font-mono text-[10px]">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                   <span className="text-slate-500">LOG_STREAM: active</span>
                   <span className="text-green-400">● LIVE</span>
                </div>
                <div className="space-y-3 opacity-80">
                   <div className="flex gap-2">
                      <span className="text-indigo-400">[14:32:01]</span>
                      <span className="text-slate-100">Staff <span className="text-white font-bold underline">#Rahul</span> created Bill <span className="text-green-400">#INV-9204</span></span>
                   </div>
                   <div className="flex gap-2">
                      <span className="text-indigo-400">[14:35:12]</span>
                      <span className="text-slate-100">Business <span className="text-white font-bold underline">Spicy Hub</span> updated Inventory</span>
                   </div>
                   <div className="flex gap-2">
                      <span className="text-yellow-400">[14:40:55]</span>
                      <span className="text-slate-100 font-bold italic">Alert: Unauthorized access attempt at Payments Page</span>
                   </div>
                </div>
             </div>
          </div>
        </motion.section>

        {/* FINAL NOTE */}
        <div className="mt-16 text-center">
           <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm inline-block max-w-2xl">
              <Info className="mx-auto text-indigo-600 mb-4" size={32} />
              <h3 className="text-xl font-black text-slate-800 mb-2">Important Security Note</h3>
              <p className="text-slate-600 font-medium">
                सिस्टम "No-Delete Policy" पर काम करता है। डेटाबेस से कोई भी रिकॉर्ड डिलीट करने की जगह उसे 'Soft-Delete' (Hide) किया जाता है ताकी ऑडिट के लिए डेटा हमेशा सुरक्षित रहे।
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

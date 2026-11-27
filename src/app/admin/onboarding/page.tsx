"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { 
  Users, Building2, Mail, Lock, 
  FileSpreadsheet, Rocket, CheckCircle2, 
  ArrowLeft, RefreshCw, Smartphone, MapPin
} from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    businessName: "",
    contactPhone: "",
    businessAddress: "",
    businessType: "food",
  });

  const [menuFile, setMenuFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.businessName) {
        return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("businessName", formData.businessName);
      if (menuFile) data.append("menuFile", menuFile);

      const profileData = {
        contactPhone: formData.contactPhone,
        businessAddress: formData.businessAddress,
        businessType: formData.businessType,
      };
      data.append("profileData", JSON.stringify(profileData));

      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        body: data
      });

      const result = await res.json();
      if (res.ok) {
        setSuccess(true);
        toast.success("Merchant onboarded successfully!");
      } else {
        toast.error(result.error || "Onboarding failed");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[48px] p-12 max-w-lg w-full text-center space-y-8 shadow-2xl"
        >
           <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
             <CheckCircle2 size={48} />
           </div>
           <div className="space-y-2">
             <h2 className="text-4xl font-black text-slate-900 leading-tight">Vendor Ready!</h2>
             <p className="text-slate-500 font-medium">Merchant account and menu catalog have been deployed successfully.</p>
           </div>
           <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Login Email</span>
                <span className="text-sm font-bold text-slate-900">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Business</span>
                <span className="text-sm font-bold text-indigo-600">{formData.businessName}</span>
              </div>
           </div>
           <div className="flex flex-col gap-3">
             <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-600/20">Onboard Another</button>
             <Link href="/admin/dashboard" className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Go to Dashboard</Link>
           </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
           <Link href="/admin/dashboard" className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
             <ArrowLeft size={20} />
           </Link>
           <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
                <Rocket size={16} /> Fast-Track Onboarding
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Deploy New Merchant</h1>
           </div>
           <div className="w-12 h-12" /> {/* Spacer */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2">
             <form onSubmit={handleSubmit} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl shadow-slate-200/20 space-y-10">
                
                <div className="space-y-8">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Building2 size={18} className="text-indigo-600" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Business Signature</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Business Name"
                      icon={Building2} 
                      placeholder="e.g. Spice Villa" 
                      value={formData.businessName} 
                      onChange={(v) => setFormData({...formData, businessName: v})} 
                    />
                    <InputField 
                      label="Contact Number" 
                      icon={Smartphone} 
                      placeholder="e.g. 7042852323" 
                      value={formData.contactPhone} 
                      onChange={(v) => setFormData({...formData, contactPhone: v})} 
                    />
                  </div>
                  <InputField 
                    label="Physical Address" 
                    icon={MapPin} 
                    placeholder="Full street address..." 
                    value={formData.businessAddress} 
                    onChange={(v) => setFormData({...formData, businessAddress: v})} 
                  />
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Lock size={18} className="text-indigo-600" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Access Credentials</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField 
                      label="Login Email" 
                      icon={Mail} 
                      placeholder="dealer@example.com" 
                      type="email"
                      value={formData.email} 
                      onChange={(v) => setFormData({...formData, email: v})} 
                    />
                    <InputField 
                      label="Security Password" 
                      icon={Lock} 
                      placeholder="••••••••" 
                      type="password"
                      value={formData.password} 
                      onChange={(v) => setFormData({...formData, password: v})} 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900">
                      <FileSpreadsheet size={18} className="text-indigo-600" />
                      <h3 className="font-black text-sm uppercase tracking-widest">Menu Catalog (Excel)</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Optional</span>
                  </div>

                  <div className="relative group">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={(e) => setMenuFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-10 border-2 border-dashed rounded-[32px] transition-all flex flex-col items-center gap-4 ${menuFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/30'}`}>
                       <div className={`p-4 rounded-2xl ${menuFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600 transition-colors'}`}>
                          <FileSpreadsheet size={32} />
                       </div>
                       <div className="text-center">
                          <p className="font-black text-sm text-slate-900">{menuFile ? menuFile.name : 'Drop MS Excel Menu here'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Supports standard menu structure</p>
                       </div>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-sm tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                >
                   {loading ? <RefreshCw className="animate-spin" /> : <Rocket size={20} />}
                   {loading ? "INITIALIZING NODE..." : "ACTIVATE MERCHANT"}
                </button>
             </form>
           </div>

           <div className="space-y-8">
              <div className="bg-indigo-600 rounded-[40px] p-8 text-white space-y-6 shadow-xl shadow-indigo-600/30">
                 <h3 className="text-xl font-black leading-tight">Fast-Track Node Deployment</h3>
                 <p className="text-indigo-100 text-xs font-medium leading-relaxed">
                   Enter the merchant's core details and upload their menu catalog to instantly activate their POS terminal.
                 </p>
                 <ul className="space-y-4">
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Automated Clerk Auth
                    </li>
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Instant Profile Creation
                    </li>
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Bulky Menu Ingestion
                    </li>
                 </ul>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recently Deployed</h4>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-indigo-600">Z</div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Zeya Dalchini</p>
                        <p className="text-[10px] font-bold text-slate-400">Delhi, India</p>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, icon: Icon, placeholder, type = "text", value, onChange }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
        <input 
          type={type}
          placeholder={placeholder}
          className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all font-black text-xs text-slate-900"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

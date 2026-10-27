"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { 
  Users, Building2, Mail, Lock, 
  FileSpreadsheet, Rocket, CheckCircle2, 
  ArrowLeft, RefreshCw, Smartphone, MapPin,
  ShieldCheck, Sparkles, Check, Code, FileUp
} from "lucide-react";
import Link from "next/link";

const GEMINI_PROMPT = `You are an expert menu data extraction engine.
I will provide a restaurant menu PDF, images, or raw text.
Your task is to extract EVERY SINGLE menu item and convert it into the EXACT JSON structure specified below.

CRITICAL RULES:
1. EXTRACT ALL ITEMS: Do not skip any item. Extract every single item present in the menu.
2. EXTRACT ALL VARIANTS: If an item has multiple sizes, portions, or variants (e.g., Half/Full, Small/Medium/Large), YOU MUST EXTRACT EVERY SINGLE VARIANT. Never skip a variant.
3. FLAT STRUCTURE FOR VARIANTS: DO NOT use nested arrays for variants! Output EACH variant as a SEPARATE item by appending the variant name to the item name (e.g., "Pizza Margherita - Medium").
4. PRICES: Ensure the exact price is attached to the correct item and variant. If no price is specified, use 0.
5. VEG / NON-VEG: Accurately determine if the item is Veg or Non-Veg and set "t" to "Pure Veg", "Non Veg", or "Contains Egg".
6. DESCRIPTIONS: Extract descriptions. If missing, write a concise, appetizing description.
7. NO MARKDOWN: Return ONLY valid JSON. Do not wrap in markdown \`\`\`json fences. Directly parseable JSON only.
8. BUSINESS DETAILS: Extract Restaurant Name, Address, Timings, Phone number, and Email if present.

JSON FORMAT EXPECTED:
{
  "r": "Business Name",
  "a": "Full Address",
  "ti": "Timings (e.g., 11 AM - 11 PM)",
  "ph": "Phone Number",
  "em": "Email Address",
  "m": [
    {
      "c": "Category Name",
      "n": "Item Name (with variant if applicable)",
      "p": 250,
      "t": "Pure Veg",
      "d": "Appetizing description of the item"
    }
  ]
}`;

export default function OnboardingCustomPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [importedItemsCount, setImportedItemsCount] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    businessName: "",
    businessAddress: "",
    businessType: "food",
  });

  const [uploadMethod, setUploadMethod] = useState<'excel' | 'json'>('excel');
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [manualJsonText, setManualJsonText] = useState("");
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const [jsonPreviewCount, setJsonPreviewCount] = useState<number | null>(null);

  // Auto parse details from JSON when pasted
  const handleJsonChange = (text: string) => {
    setManualJsonText(text);
    if (!text.trim()) {
      setJsonPreviewCount(null);
      return;
    }

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        let depth = 0;
        let start = -1;
        for (let i = 0; i < text.length; i++) {
          if (text[i] === "{" || text[i] === "[") {
            if (depth === 0) start = i;
            depth++;
          } else if (text[i] === "}" || text[i] === "]") {
            depth--;
            if (depth === 0 && start !== -1) {
              parsed = JSON.parse(text.substring(start, i + 1));
              break;
            }
          }
        }
      }

      if (parsed) {
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.m)
          ? parsed.m
          : Array.isArray(parsed.menu)
          ? parsed.menu
          : [];

        setJsonPreviewCount(items.length);

        // Auto-fill business details if not yet filled
        const restName = parsed.r || parsed.restaurantName;
        const address = parsed.a || parsed.address;
        const phone = parsed.ph || parsed.phone;
        const email = parsed.em || parsed.email;

        setFormData(prev => ({
          ...prev,
          businessName: prev.businessName || restName || "",
          businessAddress: prev.businessAddress || address || "",
          phone: prev.phone || phone || "",
          email: prev.email || email || (restName ? `${restName.toLowerCase().replace(/[^a-z0-9]/g, "")}@kravy.in` : "")
        }));
      }
    } catch {
      // Ignore intermediate typing errors
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(GEMINI_PROMPT);
    setIsPromptCopied(true);
    toast.success("AI Prompt copied to clipboard!");
    setTimeout(() => setIsPromptCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone || !formData.password || !formData.businessName) {
        return toast.error("Please fill all required fields");
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("email", formData.email);
      data.append("phone", formData.phone);
      data.append("password", formData.password);
      data.append("businessName", formData.businessName);
      
      if (uploadMethod === 'excel' && menuFile) {
        data.append("menuFile", menuFile);
      } else if (uploadMethod === 'json' && manualJsonText.trim()) {
        data.append("manualJson", manualJsonText.trim());
      }

      const profileData = {
        businessAddress: formData.businessAddress,
        businessType: formData.businessType,
      };
      data.append("profileData", JSON.stringify(profileData));

      const res = await fetch("/api/admin/onboard-custom", {
        method: "POST",
        body: data
      });

      const result = await res.json();
      if (res.ok) {
        setSuccess(true);
        setImportedItemsCount(result.itemsImported ?? 0);
        toast.success(`Merchant onboarded with ${result.itemsImported ?? 0} menu items!`);
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
             <p className="text-slate-500 font-medium">Custom merchant account has been deployed successfully.</p>
             {importedItemsCount !== null && importedItemsCount > 0 && (
               <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 font-black text-xs rounded-full border border-emerald-200">
                 ✨ {importedItemsCount} Menu items cataloged
               </span>
             )}
           </div>
           <div className="p-6 bg-slate-50 rounded-3xl text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Login Details</span>
                <span className="text-sm font-bold text-slate-900">{formData.email} / {formData.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Business</span>
                <span className="text-sm font-bold text-indigo-600">{formData.businessName}</span>
              </div>
           </div>
           <div className="flex flex-col gap-3">
             <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-600/20">Onboard Another</button>
             <Link href="/admin/dashboard" className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all text-center">Go to Dashboard</Link>
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
                <ShieldCheck size={16} /> Custom Authentication Onboarding
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Deploy Custom Merchant</h1>
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

                  <div className="grid grid-cols-1 gap-6">
                    <InputField 
                      label="Restaurant Name" 
                      icon={Building2} 
                      placeholder="e.g. Spice Villa" 
                      value={formData.businessName} 
                      onChange={(v) => setFormData({...formData, businessName: v})} 
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
                      label="Login Phone" 
                      icon={Smartphone} 
                      placeholder="e.g. 7042852323" 
                      value={formData.phone} 
                      onChange={(v) => setFormData({...formData, phone: v})} 
                    />
                    <div className="md:col-span-2">
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
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900">
                      <FileSpreadsheet size={18} className="text-indigo-600" />
                      <h3 className="font-black text-sm uppercase tracking-widest">Menu Catalog Ingestion</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Optional</span>
                  </div>

                  {/* Method Switcher Tabs */}
                  <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                    <button
                      type="button"
                      onClick={() => setUploadMethod('excel')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                        uploadMethod === 'excel'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileUp size={15} />
                      Excel File
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMethod('json')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                        uploadMethod === 'json'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles size={15} />
                      AI Gemini JSON
                    </button>
                  </div>

                  {uploadMethod === 'excel' ? (
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Supports standard sheet columns (Name, Price, Category)</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-5 bg-slate-50 rounded-[28px] border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Paste Gemini JSON</span>
                          {jsonPreviewCount !== null && (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                              {jsonPreviewCount} Items Detected
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all active:scale-95 border border-indigo-200/60 shadow-sm"
                        >
                          {isPromptCopied ? <Check size={14} className="text-emerald-600" /> : <Sparkles size={14} />}
                          {isPromptCopied ? "Prompt Copied!" : "Copy Gemini Prompt"}
                        </button>
                      </div>

                      <textarea
                        value={manualJsonText}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        placeholder={`Paste Gemini extracted JSON here...\n{\n  "r": "Spice Villa",\n  "ph": "9876543210",\n  "m": [\n    { "c": "Main Course", "n": "Paneer Butter Masala", "p": 250, "t": "Pure Veg" }\n  ]\n}`}
                        rows={7}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                      />
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        💡 <strong>Workflow:</strong> Click <strong>"Copy Gemini Prompt"</strong> → Send prompt + menu photos/PDF to Gemini/ChatGPT → Paste the output JSON above. Business details & items will be extracted automatically!
                      </p>
                    </div>
                  )}
                </div>

                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-sm tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                >
                   {loading ? <RefreshCw className="animate-spin" /> : <Rocket size={20} />}
                   {loading ? "INITIALIZING CUSTOM NODE..." : "ACTIVATE MERCHANT"}
                </button>
             </form>
           </div>

           <div className="space-y-8">
              <div className="bg-indigo-600 rounded-[40px] p-8 text-white space-y-6 shadow-xl shadow-indigo-600/30">
                 <h3 className="text-xl font-black leading-tight">Custom Auth Deployment</h3>
                 <p className="text-indigo-100 text-xs font-medium leading-relaxed">
                   Create a merchant using Local Custom Authentication (Email/Phone + Password) directly in Prisma without involving Clerk.
                 </p>
                 <ul className="space-y-4">
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Local Database Auth
                    </li>
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Bcrypt Password Hashing
                    </li>
                    <li className="flex gap-3 text-sm font-bold items-start">
                       <CheckCircle2 size={18} className="text-indigo-300 shrink-0" />
                       Bulky Menu Ingestion
                    </li>
                 </ul>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Type</h4>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-indigo-600">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Custom Auth</p>
                        <p className="text-[10px] font-bold text-slate-400">Non-Clerk Dependent</p>
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

interface InputFieldProps {
  label: string;
  icon: any;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}

function InputField({ label, icon: Icon, placeholder, type = "text", value, onChange }: InputFieldProps) {
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

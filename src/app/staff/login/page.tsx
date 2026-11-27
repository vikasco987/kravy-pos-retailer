"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Lock, 
  Mail, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  Phone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function StaffLoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const errorStr = urlParams.get("error");
      if (errorStr === "session_expired") {
        toast.error("Your session has expired. Please login again to continue.");
        // Clean URL without refreshing page
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (errorStr) {
        toast.error(errorStr);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Welcome back, ${data.data.name}!`);
        // Store user info in localStorage for UI purposes (optional)
        localStorage.setItem("staff_user", JSON.stringify(data.data));
        
        // Redirect to their first allowed path, or dashboard if none
        const allowedPaths = data.data.permissions || [];
        // Expand permissions to find a valid dashboard path to redirect to
        const PERMISSION_MAPPING: Record<string, string[]> = {
          "Dashboard Permissions": ["/dashboard"],
          "Order & Billing Permissions": ["/dashboard/billing/checkout", "/dashboard/terminal", "/dashboard/kitchen", "/dashboard/tables"],
          "Invoices & Receipts": ["/dashboard/billing", "/dashboard/billing/deleted"],
          "Customer Permissions": ["/dashboard/parties"],
          "Menu & Items Permissions": ["/dashboard/menu/view", "/dashboard/menu-editor", "/dashboard/menu/addons", "/dashboard/menu/upload", "/dashboard/store-item-upload", "/dashboard/menu/edit", "/dashboard/inventory"],
          "AI Intelligence Tools": ["/dashboard/ai-scraper"],
          "Report Permissions": ["/dashboard/reports/sales/daily", "/dashboard/reports/gst"],
          "Settings Permissions": ["/dashboard/profile", "/dashboard/settings", "/dashboard/settings/tax", "/dashboard/staff", "/dashboard/settings/advanced"]
        };
        
        let expandedPaths: string[] = [...allowedPaths];
        allowedPaths.forEach((p: string) => {
          if (PERMISSION_MAPPING[p]) {
            expandedPaths = [...expandedPaths, ...PERMISSION_MAPPING[p]];
          }
        });

        const dashboardPaths = expandedPaths.filter((p: string) => p.startsWith("/dashboard") && p !== "/dashboard");
        // Always try to redirect to a specific sub-path if they don't have explicit root dashboard access
        const targetPath = allowedPaths.includes("Dashboard Permissions") || allowedPaths.includes("/dashboard") 
            ? "/dashboard" 
            : (dashboardPaths.length > 0 ? dashboardPaths[0] : "/dashboard");

        // Wait a bit for toast and then hard redirect to clear Clerk state
        setTimeout(() => {
            window.location.href = targetPath;
        }, 500);
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch (err) {
      toast.error("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      {/* Background purely aesthetic blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[100px] opacity-60" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white shadow-xl border border-slate-100 text-indigo-600 mb-4">
            <Users size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Terminal</h1>
          <p className="text-slate-500 font-medium mt-2">Enter your credentials to access the POS dashboard.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 md:p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Work Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  required
                  type="email"
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Security Code</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 group h-14"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Connect to Dashboard
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-slate-400 mb-6">
               <div className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-green-500" />
                  <span>Secure Session</span>
               </div>
               <div className="flex items-center gap-1">
                  <Smartphone size={14} className="text-blue-500" />
                  <span>Mobile Compatible</span>
               </div>
            </div>
            
            {/* Support Info */}
            <div className="text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Need Help?</p>
              <div className="flex flex-col gap-2">
                <a href="tel:+919403893991" className="flex items-center justify-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-xs font-bold">
                  <Phone size={14} /> Call Support: +91 9403893991
                </a>
                <a href="https://wa.me/919289507882" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors text-xs font-bold">
                  <MessageSquare size={14} /> WhatsApp: +91 9289507882
                </a>
              </div>
            </div>
          </div>
        </div>

        <button 
            onClick={() => router.push("/")}
            className="w-full mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors group"
        >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
        </button>
      </motion.div>
    </div>
  );
}

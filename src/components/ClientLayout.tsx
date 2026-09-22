"use client";

import { ReactNode, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";

import { OrderNotificationProvider } from "@/components/OrderNotificationProvider";
import { useAuthContext } from "@/components/AuthContext";
import { Lock, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";
import PremiumAlert from "@/components/PremiumAlert";
import IncomingOrderModal from "@/components/IncomingOrderModal";

function SessionExpiredRedirect() {
  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => { window.location.href = "/"; })
      .catch(() => { window.location.href = "/"; });
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="ml-3 text-slate-500 font-medium">Session expired, redirecting...</span>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  const { user: authUser, loading: authLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const isTerminal = pathname === "/dashboard/terminal";
  const isCheckout = pathname === "/dashboard/billing/checkout";
  const isKitchen = pathname === "/dashboard/kitchen" || pathname === "/dashboard/workflow";
  const isUpload = pathname === "/dashboard/menu/upload";
  const isExpenses = pathname.startsWith("/dashboard/expenses");
  const isPOS = isTerminal || isCheckout || isKitchen || isUpload;
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to fetch profile in ClientLayout:", err);
      }
    };

    if (authUser) {
      fetchProfile();
    }
  }, [authUser]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only play if it's a likely interactive element and doesn't already have a manual sound call (best effort)
      if (
        target.closest("button") || 
        target.closest("a") || 
        target.closest("[role='button']") ||
        (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox")
      ) {
        // We allow some double-triggering as kravy.click() is short and layers well
        kravy.click();
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 4. SaaS / Premium Check & Redirect Hook
  /* useEffect(() => {
    if (profile && profile.showPremiumPopup && !profile.isPremium) {
      window.location.href = "https://www.kravy.in/pricing";
    }
  }, [profile]); */

  // 1. Show loader while anything is still loading
  if (!mounted || authLoading) {
    return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );
  }

  // 2. If NOT Clerk User AND NOT Staff User -> Clear cookies and redirect to Home/Login
  if (!authUser) { }

  // 3. SaaS / Premium UI Blocker (Early Return)
  /* if (profile && profile.showPremiumPopup && !profile.isPremium) {
    return (
        <div className="h-screen flex items-center justify-center bg-[#0F172A]">
            <div className="text-center">
                <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={40} />
                <h2 className="text-white font-black tracking-widest uppercase text-sm">Redirecting to Pricing...</h2>
            </div>
        </div>
    );
  } */

  // 6. Frozen Account Check
  if (profile?.isFrozen) {
    return (
        <div className="h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent)] pointer-events-none" />
            
            <PremiumAlert profile={profile} />
            
            <div className="text-center p-12 bg-slate-800/50 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] max-w-md relative z-10 mx-4">
                <div className="w-24 h-24 bg-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-500/30 animate-pulse">
                    <Lock size={48} />
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-4">Subscription Required</h2>
                <p className="text-slate-400 text-base mb-10 leading-relaxed font-medium">
                    Your trial or subscription has expired. Please choose a plan to continue using Kravy POS and resume your business operations.
                </p>
                
                <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 group hover:border-white/20 transition-all">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Priority Support</p>
                        <a href="tel:9289507882" className="text-2xl font-black text-white hover:text-indigo-400 transition-colors">9289507882</a>
                    </div>
                    
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
                    >
                        Check Status Again
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // 5. Staff Authorization Check
  if (authUser && authUser.type === 'STAFF') {
    const permissions = authUser.permissions || [];
    
    if (pathname.startsWith('/dashboard')) {
        const isAllowed = permissions.includes("*") || permissions.some((p: string) => pathname === p || pathname.startsWith(p + '/'));
        
        if (!isAllowed) {
            return (
                <div className="h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-200 max-w-sm">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Access Denied</h2>
                        <p className="text-slate-500 text-sm mt-2 mb-6">
                            You don't have permission to access this module ({pathname}). Contact your manager.
                        </p>
                        <button 
                            onClick={() => {
                                document.cookie = "staff_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                                window.location.href = "/staff/login";
                            }}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
                        >
                            Log out & Try Again
                        </button>
                    </div>
                </div>
            );
        }
    }
  }

  // If either Clerk User or Staff User -> Show Dashboard
  return (
    <>
      {/* 🔔 Real-time order sound + popup notifications */}
      <OrderNotificationProvider />
      <IncomingOrderModal />
      
      {/* 👑 Premium Subscription Modal */}
      <PremiumAlert profile={profile} />

      <div
        className="h-screen flex flex-col overflow-hidden relative"
        style={{ background: "var(--kravy-bg)", transition: "background 0.4s ease" }}
      >
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex flex-1 overflow-hidden relative">
          {!isTerminal && !isKitchen && (
            <div className={`
              ${isMobile ? 'fixed' : 'relative'}
              ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
              transition-transform duration-300 ease-in-out
              z-50 print:hidden
            `}>
              <Sidebar profile={profile} />
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-col flex-1 min-w-0">
            {!isPOS && !isExpenses && (
              <div className="print:hidden">
                <Navbar
                  isMobile={isMobile}
                  onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
                  sidebarOpen={sidebarOpen}
                  profile={profile}
                />
              </div>
            )}

            {/* Floating Mobile Toggle for Navbar-less Pages */}
            {isMobile && isExpenses && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-40 bg-slate-900 dark:bg-white text-white dark:text-black w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
              >
                <Menu size={20} />
              </button>
            )}

            <main
              className={`flex-1 ${(isPOS || isExpenses) ? 'overflow-y-auto' : 'overflow-y-auto'} transition-all duration-400`}
              style={{
                background: "var(--kravy-bg)",
                minHeight: (isPOS || isExpenses) ? "100vh" : "calc(100vh - 72px)",
                transition: "background 0.4s ease"
              }}
            >
              <div
                className={`w-full mx-auto ${isPOS ? 'p-0 h-full' : isExpenses ? 'p-3 sm:p-5 lg:p-6 kravy-page-fade' : 'p-4 sm:p-6 lg:p-8 kravy-page-fade'}`}
                style={{ minHeight: "100%" }}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
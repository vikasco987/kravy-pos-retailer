"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useSidebar } from "@/components/SidebarContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Capacitor } from "@capacitor/core";

import { OrderNotificationProvider } from "@/components/OrderNotificationProvider";
import { useAuthContext } from "@/components/AuthContext";
import { Lock, Loader2, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";
import PremiumAlert from "@/components/PremiumAlert";
import IncomingOrderModal from "@/components/IncomingOrderModal";
import { CurrencyProvider } from "@/lib/currency-context";
import SchemaDebugger from "@/components/SchemaDebugger";
import DeveloperDebugPanel from "@/components/DeveloperDebugPanel";
import { useProfileCache } from "@/hooks/useProfileCache";



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
  const isKitchen = pathname === "/dashboard/kitchen" || pathname === "/dashboard/workflow" || pathname === "/dashboard/kds";
  const isExpenses = pathname.startsWith("/dashboard/expenses");
  const isProfile = pathname.startsWith("/dashboard/profile");
  const isSettings = pathname.startsWith("/dashboard/settings");
  const isMenuView = pathname.startsWith("/dashboard/menu/view");
  const isPOS = isTerminal || isCheckout || isKitchen;
  const [isMobile, setIsMobile] = useState(false);
  const [isApp, setIsApp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { profile, loading: profileLoading, invalidateCache } = useProfileCache();
  
  useEffect(() => {
    setIsApp(Capacitor.isNativePlatform());
  }, []);

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
      const mobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      setIsMobile((prev) => {
        if (!prev && mobile) setSidebarOpen(false);
        return mobile;
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  // 4. SaaS / Premium Check & Redirect Hook
  /* useEffect(() => {
    if (profile && profile.showPremiumPopup && !profile.isPremium) {
      window.location.href = "https://www.kravy.in/pricing";
    }
  }, [profile]); */


  useEffect(() => {
    const handleProfileUpdate = () => {
      invalidateCache();
    };
    const handleToggleSidebar = () => {
      setSidebarOpen((prev) => !prev);
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("kravy-toggle-sidebar", handleToggleSidebar);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("kravy-toggle-sidebar", handleToggleSidebar);
    };
  }, [invalidateCache]);

  // 2. Safe Auto-Recovery: Controlled redirect via useEffect when authentication has finished loading and no user exists
  const redirectInitiatedRef = useRef(false);

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (authUser) return;
    if (redirectInitiatedRef.current) return;

    redirectInitiatedRef.current = true;

    // Call logout endpoint to clear auth session cookies safely
    fetch("/api/auth/logout", { method: "POST" })
      .catch((err) => {
        console.error("Logout request failed:", err);
      })
      .finally(() => {
        try {
          // Clear only auth cookies and auth session markers, not entire application data
          const expiredCookie = "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;";
          document.cookie = `kravy_auth_token${expiredCookie}`;
          document.cookie = `kravy_refresh_token${expiredCookie}`;
          document.cookie = `staff_token${expiredCookie}`;
          document.cookie = `staff_refresh_token${expiredCookie}`;
        } catch (e) {
          console.error("Error clearing auth cookies:", e);
        }
        window.location.replace("/auth/custom?mode=login");
      });
  }, [mounted, authLoading, authUser]);

  // 1. Show loader while anything is still loading
  if (!mounted || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <p className="text-sm font-semibold text-slate-500">Redirecting to login...</p>
      </div>
    );
  }

  const isAdminOrMaster = authUser?.role === 'ADMIN' || authUser?.role === 'MASTER';
  
  // 6. Frozen Account Check
  if (profile?.isFrozen && !isAdminOrMaster) {
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
    const permissions = Array.isArray(authUser.permissions) ? authUser.permissions : [];
    
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
    <CurrencyProvider currencyCode={profile?.currencyCode} currencySymbol={profile?.currencySymbol}>
      {/* 🔔 Real-time order sound + popup notifications */}
      <OrderNotificationProvider />
      <IncomingOrderModal />
      
      {/* 👑 Premium Subscription Modal */}
      {!isAdminOrMaster && <PremiumAlert profile={profile} />}

      <div
        className="h-[100dvh] flex flex-col overflow-hidden relative"
        style={{ background: "var(--kravy-bg)", transition: "background 0.4s ease" }}
      >
        {/* Mobile Sidebar Drawer & Overlay */}
        {isMobile && !isTerminal && (
          <div className="lg:hidden print:hidden">
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                sidebarOpen ? 'opacity-100 pointer-events-auto z-[10000]' : 'opacity-0 pointer-events-none -z-10'
              }`}
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div
              className={`fixed top-0 bottom-0 left-0 z-[10001] shadow-2xl transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              style={{
                width: '280px',
                maxWidth: '85vw',
                height: '100%',
                pointerEvents: sidebarOpen ? 'auto' : 'none',
              }}
            >
              <Sidebar profile={profile} isMobile={true} />
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative">
          {!isMobile && !isTerminal && !isKitchen && (
            <div className="relative translate-x-0 z-50 print:hidden">
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

            {/* App Nav */}
            <MobileBottomNav profile={profile} />

            {/* Floating Mobile Toggle for Navbar-less Pages */}
            {isMobile && (isPOS || isExpenses || isApp) && !isCheckout && pathname !== "/dashboard/kds" && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`fixed top-4 left-4 z-40 bg-slate-900 dark:bg-white text-white dark:text-black w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all print:hidden`}
              >
                <Menu size={20} />
              </button>
            )}

            <main
              className={`flex-1 min-h-0 ${isMenuView ? 'overflow-hidden flex flex-col' : (isPOS || isExpenses) ? 'overflow-y-auto' : 'overflow-y-auto'} transition-all duration-400 pb-[65px] lg:pb-0`}
              style={{
                background: "var(--kravy-bg)",
                minHeight: (isPOS || isExpenses) ? "100dvh" : undefined,
                transition: "background 0.4s ease"
              }}
            >
              <div
                className={`w-full mx-auto ${isPOS || isMenuView ? 'p-0 h-full flex-1 min-h-0 flex flex-col' : (isExpenses || isProfile || isSettings) ? 'p-2 sm:p-4 md:p-6 kravy-page-fade' : 'p-4 sm:p-6 lg:p-8 kravy-page-fade'}`}
                style={{ minHeight: isPOS || isMenuView ? undefined : "100%" }}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
      <DeveloperDebugPanel />
      <SchemaDebugger />
    </CurrencyProvider>
  );
}
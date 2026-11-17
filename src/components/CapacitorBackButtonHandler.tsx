"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";

export default function CapacitorBackButtonHandler() {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const showExitConfirmRef = useRef(false);
  showExitConfirmRef.current = showExitConfirm;

  const appPluginRef = useRef<any>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appPlugin: any;

    const setupBackButton = async () => {
      try {
        const { App } = await import("@capacitor/app");
        appPlugin = App;
        appPluginRef.current = App;

        App.addListener("backButton", (event: { canGoBack?: boolean }) => {
          // 1. If Exit Confirmation dialog is already open, pressing back simply closes the dialog (Cancel)
          if (showExitConfirmRef.current) {
            setShowExitConfirm(false);
            return;
          }

          // 2. Check if any active modal, drawer, or detail screen intercepts the back button
          const customEvent = new CustomEvent("kravy:hardware-back", {
            cancelable: true,
            detail: event,
          });
          const wasIntercepted = !window.dispatchEvent(customEvent);

          if (wasIntercepted) {
            // Handled by an open modal, drawer or view - don't navigate or exit
            return;
          }

          // 3. Normal in-app sub-route navigation
          const path = window.location.pathname;
          const isRootDashboard = path === "/dashboard" || path === "/" || path === "/dashboard/";

          if (!isRootDashboard) {
            router.back();
          } else {
            // 4. On root dashboard: show confirmation dialog before exiting
            setShowExitConfirm(true);
          }
        });
      } catch (err) {
        console.warn("Failed to load Capacitor App plugin", err);
      }
    };

    setupBackButton();

    return () => {
      if (appPlugin) {
        appPlugin.removeAllListeners();
      }
    };
  }, [router]);

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const handleConfirmExit = async () => {
    setShowExitConfirm(false);
    try {
      if (appPluginRef.current) {
        await appPluginRef.current.exitApp();
      } else {
        const { App } = await import("@capacitor/app");
        await App.exitApp();
      }
    } catch (err) {
      console.warn("Failed to exit app:", err);
    }
  };

  // Only render on native Capacitor platform
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <AnimatePresence>
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelExit}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 ring-8 ring-rose-500/5">
                <LogOut size={30} strokeWidth={2.3} className="translate-x-0.5" />
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                Exit Kravy POS?
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-7 leading-relaxed">
                Are you sure you want to exit the app?
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={handleCancelExit}
                  className="flex-1 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExit}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/25 transition-all"
                >
                  Exit App
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

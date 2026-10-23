"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ConfirmContextType {
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Confirm Action");
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, title: string = "Confirm Action") => {
    setMessage(message);
    setTitle(title);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver.current) resolver.current(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver.current) resolver.current(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                  <AlertCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
                  {message}
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 h-12 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/25"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

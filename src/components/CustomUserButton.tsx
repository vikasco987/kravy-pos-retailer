"use client";

import { useState, useRef, useEffect } from "react";
import { User, Shield, LogOut, Settings, ChevronDown, UserCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { kravy } from "@/lib/sounds";

import { performLogout } from "@/lib/logout";

interface CustomUserButtonProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
    imageUrl?: string | null;
  };
}

export default function CustomUserButton({ user }: CustomUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    kravy.close();
    await performLogout("/auth/custom?mode=login");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all group"
      >
        {user.imageUrl ? (
          <img 
            src={user.imageUrl} 
            alt={user.name || "User"} 
            className="w-8 h-8 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
            {user.name?.[0].toUpperCase() || "U"}
          </div>
        )}
        <div className="hidden lg:block text-left">
           <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider truncate max-w-[100px]">
             {user.name || "User"}
           </p>
           <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
             <CheckCircle2 size={8} /> {user.role || "MEMBER"}
           </p>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 mt-3 w-72 bg-white dark:bg-[#0d0f1a] border border-slate-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl z-[1000] overflow-hidden"
          >
            {/* User Info Header */}
            <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-bottom border-slate-200 dark:border-white/10">
               <div className="flex items-center gap-4">
                   {user.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt={user.name || "User"} 
                        className="w-12 h-12 rounded-2xl object-cover shadow-xl"
                      />
                   ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg font-black shadow-xl">
                        {user.name?.[0].toUpperCase() || "U"}
                      </div>
                   )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
                  </div>
               </div>
            </div>

            {/* Menu Items */}
            <div className="p-2 space-y-1">
              <Link
                href="/dashboard/settings/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-emerald-500/5 hover:text-emerald-500 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10">
                  <Settings size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase tracking-widest">Manage account</p>
                </div>
              </Link>

              <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-4" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/5 flex items-center justify-center group-hover:bg-rose-500/10">
                  <LogOut size={16} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Sign out</p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 flex items-center justify-center">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Kravy POS · Verified Account</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

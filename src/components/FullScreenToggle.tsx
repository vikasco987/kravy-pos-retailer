"use client";

import { useSidebar } from "@/components/SidebarContext";
import { kravy } from "@/lib/sounds";
import { Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface FullScreenToggleProps {
  className?: string;
  variant?: "pill" | "icon" | "badge";
  showLabel?: boolean;
}

/**
 * FullScreenToggle:
 * Reusable control for toggling between Full Screen Mode (maximized workspace)
 * and Normal Mode (persistent sidebar).
 */
export default function FullScreenToggle({
  className = "",
  variant = "pill",
  showLabel = true,
}: FullScreenToggleProps) {
  const { isFullScreen, toggleFullScreen, canToggleFullScreen } = useSidebar();

  if (!canToggleFullScreen) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      kravy.click();
    } catch {}
    toggleFullScreen();
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={isFullScreen ? "Restore Sidebar / Exit Full Screen" : "Full Screen Mode"}
        aria-label={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 border ${
          isFullScreen
            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
        } ${className}`}
      >
        {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    );
  }

  // Pill variant with optional text label
  return (
    <button
      type="button"
      onClick={handleClick}
      title={isFullScreen ? "Exit Full Screen & Restore Sidebar" : "Maximize Workspace (Full Screen Mode)"}
      aria-label={isFullScreen ? "Restore Sidebar" : "Full Screen Mode"}
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border shadow-2xs ${
        isFullScreen
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
          : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
      } ${className}`}
    >
      {isFullScreen ? (
        <>
          <PanelLeftOpen size={14} className="text-amber-500 shrink-0" />
          {showLabel && <span className="whitespace-nowrap">Restore Sidebar</span>}
        </>
      ) : (
        <>
          <PanelLeftClose size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          {showLabel && <span className="whitespace-nowrap">Full Screen</span>}
        </>
      )}
    </button>
  );
}

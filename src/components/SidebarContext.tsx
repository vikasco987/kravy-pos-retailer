"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { getRouteLayoutConfig } from "@/config/layout-modes";

const COLLAPSED_STORAGE_KEY = "kravy_sidebar_collapsed";

type SidebarContextType = {
  // Desktop sidebar collapse (rail vs full)
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleBtnRef: React.RefObject<HTMLButtonElement | null>;

  // Full Screen / Distraction-Free Mode
  isFullScreen: boolean;
  toggleFullScreen: () => void;
  setFullScreen: (val: boolean) => void;
  canToggleFullScreen: boolean;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Desktop sidebar collapsed state with localStorage persistence
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return false;
  });

  const setCollapsed: React.Dispatch<React.SetStateAction<boolean>> = useCallback((action) => {
    setCollapsedState((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  // Per-route layout configuration
  const routeConfig = getRouteLayoutConfig(pathname);
  const canToggleFullScreen = routeConfig.allowToggle;

  // Track user overrides per route for the current session: Map<pathname, boolean>
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});

  // Compute effective full screen mode:
  // If user explicitly toggled for this pathname, use user override; otherwise use route default
  const isFullScreen = userOverrides[pathname] !== undefined
    ? userOverrides[pathname]
    : routeConfig.defaultMode === "fullscreen";

  const setFullScreen = useCallback((val: boolean) => {
    setUserOverrides((prev) => ({
      ...prev,
      [pathname]: val,
    }));
  }, [pathname]);

  const toggleFullScreen = useCallback(() => {
    setFullScreen(!isFullScreen);
  }, [isFullScreen, setFullScreen]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggle,
        setCollapsed,
        toggleBtnRef,
        isFullScreen,
        toggleFullScreen,
        setFullScreen,
        canToggleFullScreen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside SidebarProvider");
  }
  return ctx;
}

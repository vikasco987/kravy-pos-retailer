export type LayoutMode = 'normal' | 'fullscreen';

export interface RouteLayoutConfig {
  defaultMode: LayoutMode;
  allowToggle: boolean;
  hideNavbarInFullscreen: boolean;
  hideBottomNavOnMobile?: boolean;
}

/**
 * Route Layout Registry:
 * The 4 dedicated Operational / Full Screen Routes:
 * 1. Quick POS Billing (/dashboard/billing/checkout)
 * 2. Floor Management (/dashboard/terminal)
 * 3. Order Workflow (/dashboard/kitchen)
 * 4. Kitchen Display (KDS) (/dashboard/kds)
 *
 * All other routes are Normal Mode (Persistent Sidebar visible) by default,
 * and provide a top-right Focus Mode toggle button in the Navbar so the user
 * can optionally enter Distraction-Free mode on any page.
 */
export const ROUTE_LAYOUT_CONFIG: Record<string, RouteLayoutConfig> = {
  // THE 4 DEDICATED FULL SCREEN WORKSPACES:
  "/dashboard/billing/checkout": {
    defaultMode: "fullscreen",
    allowToggle: true,
    hideNavbarInFullscreen: true,
  },
  "/dashboard/terminal": {
    defaultMode: "fullscreen",
    allowToggle: true,
    hideNavbarInFullscreen: true,
  },
  "/dashboard/kitchen": {
    defaultMode: "fullscreen",
    allowToggle: true,
    hideNavbarInFullscreen: true,
  },
  "/dashboard/kds": {
    defaultMode: "fullscreen",
    allowToggle: true,
    hideNavbarInFullscreen: true,
    hideBottomNavOnMobile: true,
  },
  "/dashboard/workflow": {
    defaultMode: "fullscreen",
    allowToggle: true,
    hideNavbarInFullscreen: true,
  },

  // ALL OTHER ROUTES -> NORMAL MODE (Persistent Sidebar) BY DEFAULT:
  "/dashboard/tables": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/billing": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/menu": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/parties": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/inventory": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/expenses": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: true,
  },
  "/dashboard/reports": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/settings": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
  "/dashboard/profile": {
    defaultMode: "normal",
    allowToggle: true,
    hideNavbarInFullscreen: false,
  },
};

const DEFAULT_ROUTE_CONFIG: RouteLayoutConfig = {
  defaultMode: "normal",
  allowToggle: true,
  hideNavbarInFullscreen: false,
};

/**
 * Resolves the layout configuration for any pathname.
 * Matches exact path first, then longest matching prefix.
 */
export function getRouteLayoutConfig(pathname: string | null | undefined): RouteLayoutConfig {
  if (!pathname) return DEFAULT_ROUTE_CONFIG;

  // 1. Exact match
  if (ROUTE_LAYOUT_CONFIG[pathname]) {
    return ROUTE_LAYOUT_CONFIG[pathname];
  }

  // 2. Prefix match sorted from longest to shortest
  const matchingPrefix = Object.keys(ROUTE_LAYOUT_CONFIG)
    .filter((route) => route !== "/dashboard" && pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingPrefix) {
    return ROUTE_LAYOUT_CONFIG[matchingPrefix];
  }

  // 3. Root /dashboard match
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard")) {
    return ROUTE_LAYOUT_CONFIG["/dashboard"] || DEFAULT_ROUTE_CONFIG;
  }

  return DEFAULT_ROUTE_CONFIG;
}

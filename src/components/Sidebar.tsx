"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { useTheme } from "./ThemeProvider";

import {
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  QrCode,
  UtensilsCrossed,
  Package,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  TrendingUp,
  ShieldCheck,
  Building,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  History,
  UserCircle,
  Receipt,
  ShoppingCart,
  Home,
  PieChart,
  Database,
  Shield,
  HelpCircle,
  Archive,
  Trash2,
  Edit3,
  Download,
  RefreshCw,
  Filter,
  Search,
  Menu,
  Percent,
  Rocket,
  X,
  Check,
  AlertCircle,
  Target,
  Award,
  Star,
  Heart,
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Tag,
  DollarSign,
  TrendingDown,
  IndianRupee,
  Activity,
  Globe,
  Lock,
  Key,
  Eye,
  EyeOff,
  Copy,
  Share2,
  Printer,
  Save,
  FolderOpen,
  Folder,
  File,
  FilePlus,
  Edit,
  Trash,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  Maximize2,
  Minimize2,
  Fullscreen,
  LogIn,
  UserPlus,
  UserMinus,
  Crown,
  Gem,
  Gift, Banknote,
  Flame,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Server,
  HardDrive,
  Wifi,
  Battery,
  BatteryCharging,
  Power,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Camera,
  Layers,
  Sparkles,
  Zap,
  LayoutDashboard,
  Fuel,
  Smartphone,
  CalendarDays,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { kravy } from "@/lib/sounds";
import { useAuthContext } from "./AuthContext";
import { createPortal } from "react-dom";
import { useTerminalContext } from "@/components/TerminalContext";
const navGroups = [
  {
    group: "OPERATIONS",
    items: [
      { icon: <Home size={18} />, label: "Store Dashboard", href: "/dashboard" },
      { icon: <ShoppingCart size={18} />, label: "Quick POS Billing", href: "/dashboard/billing/checkout" },



      { icon: <Fuel size={18} />, label: "Fuel Billing", href: "/dashboard/fuel", badge: "Fuel", badgeColor: "#FF6B35" },
      { icon: <Receipt size={18} />, label: "Past Bills / History", href: "/dashboard/billing" },
      { icon: <Zap size={18} />, label: "Go to Billing Panel", href: "https://billing.kravy.in", external: true },
    ]
  },
  {
    group: "STORE CATALOG",
    items: [
      { icon: <UtensilsCrossed size={18} />, label: "Browse Products", href: "/dashboard/menu/view" },
      { icon: <Printer size={18} />, label: "PDF Catalog Studio", href: "/dashboard/menu/pdf", badge: "PDF", badgeColor: "#EC4899" },

      { icon: <Sparkles size={18} />, label: "Catalog Editor", href: "/dashboard/menu-editor", badge: "New", badgeColor: "#8B5CF6" },
      { icon: <Layers size={18} />, label: "Add-on clusters", href: "/dashboard/menu/addons", badge: "Setup", badgeColor: "#10B981" },
      { icon: <Zap size={18} />, label: "AI Product Scraper", href: "/dashboard/ai-scraper", badge: "AI", badgeColor: "#F59E0B", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Sparkles size={18} />, label: "Auto Apply Images", href: "/dashboard/auto-apply", badge: "AI OCR", badgeColor: "#8B5CF6", roles: ["ADMIN"] },
      { icon: <PlusCircle size={18} />, label: "Add Single Item", href: "/dashboard/menu/upload" },
      { icon: <Upload size={18} />, label: "Excel Bulk Import", href: "/dashboard/store-item-upload", badge: "Import", badgeColor: "#FF6B35", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Settings size={18} />, label: "Category & Editor", href: "/dashboard/menu/edit" },
    ]
  },
  {
    group: "RESOURCES",
    items: [
      { icon: <Users size={18} />, label: "Customer Parties", href: "/dashboard/parties" },
      { icon: <UserPlus size={18} />, label: "Staff Management", href: "/dashboard/staff", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Package size={18} />, label: "Inventory Stock", href: "/dashboard/inventory", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <IndianRupee size={18} />, label: "Restaurant Expenses", href: "/dashboard/expenses", roles: ["ADMIN", "SELLER", "STAFF"] },
    ]
  },
  {
    group: "MARKETING",
    items: [
      { icon: <Sparkles size={18} />, label: "Marketing Hub", href: "/dashboard/combos", badge: "Live", badgeColor: "#8B5CF6", showHorizontalGroup: true },
    ]
  },
  {
    group: "REPORTS & ANALYTICS",
    items: [
      { icon: <TrendingUp size={18} />, label: "Daily Sales Report", href: "/dashboard/reports/sales/daily", badge: "Live", badgeColor: "#10B981" },
      { icon: <BarChart3 size={18} />, label: "Sales Analytics", href: "/dashboard/reports/sales/drilldown", badge: "BI", badgeColor: "#6366F1" },
      { icon: <AlertCircle size={18} />, label: "Customer Dues / Udhaar", href: "/dashboard/reports/unpaid", badge: "Dues", badgeColor: "#EF4444" },
      { icon: <CreditCard size={18} />, label: "Wallet Deposits", href: "/dashboard/reports/wallet-deposits", badge: "New", badgeColor: "#8B5CF6" },
      { icon: <PieChart size={18} />, label: "GST Reports", href: "/dashboard/reports/gst", badge: "GST", badgeColor: "#F59E0B" },
      { icon: <FileText size={18} />, label: "Manual Invoice", href: "/dashboard/admin/invoice-generator", badge: "PDF", badgeColor: "#8B5CF6", roles: ["ADMIN"] },
    ]
  },
  {
    group: "INSIGHTS",
    items: [
      { icon: <BarChart3 size={18} />, label: "Revenue Analysis", href: "/dashboard/reports/sales/revenue" },
      { icon: <PieChart size={18} />, label: "Mode of Payment", href: "/dashboard/reports/payments" },
      { icon: <TrendingUp size={18} />, label: "Business Growth", href: "/dashboard/reports/performance" },
    ]
  },
  {

    group: "ADMINISTRATION",
    items: [
      { icon: <UserCircle size={18} />, label: "Business Profile", href: "/dashboard/profile", roles: ["ADMIN", "SELLER", "STAFF"] },

      { icon: <Settings size={18} />, label: "POS Settings", href: "/dashboard/settings", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Printer size={18} />, label: "Printing Setup", href: "/dashboard/settings/printing", roles: ["ADMIN", "SELLER", "STAFF"], badge: "New", badgeColor: "#8B5CF6" },
      { icon: <Smartphone size={18} />, label: "App Settings", href: "/dashboard/admin/app-settings", roles: ["ADMIN"] },
      { icon: <Database size={18} />, label: "Backups", href: "/dashboard/admin/backup", roles: ["ADMIN"] },
      { icon: <QrCode size={18} />, label: "Google Review QR", href: "/dashboard/admin/qr-manager", badge: "New", badgeColor: "#8B5CF6", roles: ["ADMIN"] },
      { icon: <Zap size={18} />, label: "Advanced Controls", href: "/dashboard/settings/advanced", roles: ["ADMIN", "SELLER", "STAFF"], badge: "Setup", badgeColor: "#8B5CF6" },
      { icon: <Percent size={18} />, label: "Tax Management", href: "/dashboard/settings/tax", badge: "GST", badgeColor: "#F59E0B", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Lock size={18} />, label: "Access Control", href: "/admin/users", badge: "Roles", badgeColor: "#EF4444", roles: ["ADMIN"] },
      { 
        icon: <Shield size={18} />, 
        label: "Manage Platform", 
        href: "/admin/dashboard", 
        roles: ["ADMIN"],
        subItems: [
          { label: "System Funnel", href: "/admin/dashboard", badge: "Live" },
          { label: "Merchant Data", href: "/admin/merchants", badge: "Report" },
          { label: "Onboard Dealer", href: "/admin/onboarding" },
          { label: "Custom Auth", href: "/admin/onboarding-custom" },
        ]
      },
      { icon: <Shield size={18} />, label: "Security & Backup", href: "/dashboard/backup", roles: ["ADMIN"] },
      { icon: <Archive size={18} />, label: "Archive & Trash", href: "/dashboard/billing/deleted", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <HelpCircle size={18} />, label: "Help & Support", href: "/dashboard/help" },
    ]
  }
];


const hiddenNavGroups = [
  {
    group: "SEARCH RESULTS (HIDDEN PAGES)",
    items: [
      { icon: <Settings size={18} />, label: "Account Setup", href: "/dashboard/settings/account", roles: ["ADMIN"] },
      { icon: <Activity size={18} />, label: "Activity Logs", href: "/dashboard/settings/activity", roles: ["ADMIN"] },
      { icon: <Users size={18} />, label: "Customer Preferences", href: "/dashboard/settings/customer", roles: ["ADMIN", "SELLER"] },
      { icon: <Package size={18} />, label: "Inventory Configuration", href: "/dashboard/settings/inventory", roles: ["ADMIN", "SELLER"] },
      { icon: <Award size={18} />, label: "Loyalty Program Settings", href: "/dashboard/settings/loyalty", roles: ["ADMIN", "SELLER"] },
      { icon: <Flame size={18} />, label: "Notification Preferences", href: "/dashboard/settings/notifications", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <LayoutDashboard size={18} />, label: "POS Terminal Layout", href: "/dashboard/settings/pos", roles: ["ADMIN", "SELLER"] },
      { icon: <Shield size={18} />, label: "Active Login Sessions", href: "/dashboard/settings/sessions", roles: ["ADMIN"] },
      { icon: <Menu size={18} />, label: "Sidebar Navigation Customization", href: "/dashboard/settings/sidebar", roles: ["ADMIN", "SELLER", "STAFF"] },
      
      { icon: <Percent size={18} />, label: "Discount Setup", href: "/dashboard/discounts", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Gift size={18} />, label: "Offers Management", href: "/dashboard/offers", roles: ["ADMIN", "SELLER"] },
      { icon: <Sparkles size={18} />, label: "AI Offers Generator", href: "/dashboard/offers/generator", roles: ["ADMIN", "SELLER"] },
      
      { icon: <PieChart size={18} />, label: "Inventory Reports", href: "/dashboard/inventory/reports", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <PieChart size={18} />, label: "Hotel Room Analytics", href: "/dashboard/rooms/reports", roles: ["ADMIN", "SELLER"] },
      
      { icon: <BarChart3 size={18} />, label: "Advanced Analytics", href: "/dashboard/reports/analytics", roles: ["ADMIN", "SELLER"] },
      { icon: <Receipt size={18} />, label: "Bill Reports", href: "/dashboard/reports/bills", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <ShoppingCart size={18} />, label: "Item-wise Sales", href: "/dashboard/reports/items", roles: ["ADMIN", "SELLER"] },
      { icon: <Banknote size={18} />, label: "Cash Reports", href: "/dashboard/reports/payments/cash", roles: ["ADMIN", "SELLER"] },
      { icon: <Smartphone size={18} />, label: "UPI Reports", href: "/dashboard/reports/payments/upi", roles: ["ADMIN", "SELLER"] },
      
      { icon: <HelpCircle size={18} />, label: "Documentation - GST Billing", href: "/dashboard/docs/gst-billing", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <HelpCircle size={18} />, label: "Documentation - Catalog Management", href: "/dashboard/docs/menu-management", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <HelpCircle size={18} />, label: "Documentation - Staff Access", href: "/dashboard/docs/staff-access", roles: ["ADMIN"] },
      { icon: <HelpCircle size={18} />, label: "Documentation - Workflow", href: "/dashboard/docs/workflow", roles: ["ADMIN", "SELLER", "STAFF"] },
            { icon: <HelpCircle size={18} />, label: "Documentation - Auto Backup", href: "/dashboard/docs/auto-backup", roles: ["ADMIN"] },
      
      { icon: <TrendingUp size={18} />, label: "Profit & Loss (P&L)", href: "/dashboard/expenses/pnl", roles: ["ADMIN", "SELLER"] },
      { icon: <FileText size={18} />, label: "Expense Reports", href: "/dashboard/expenses/reports", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <Users size={18} />, label: "Customer Analytics", href: "/dashboard/reports/customers", roles: ["ADMIN", "SELLER"] },
      { icon: <Activity size={18} />, label: "Performance Analytics", href: "/dashboard/reports/performance", roles: ["ADMIN", "SELLER"] },
      { icon: <CalendarDays size={18} />, label: "Monthly Sales Report", href: "/dashboard/reports/sales/monthly", roles: ["ADMIN", "SELLER"] },
      { icon: <CalendarDays size={18} />, label: "Weekly Sales Report", href: "/dashboard/reports/sales/weekly", roles: ["ADMIN", "SELLER"] },
      { icon: <Hash size={18} />, label: "Token Reports", href: "/dashboard/reports/tokens", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <HelpCircle size={18} />, label: "Documentation - GST Pro", href: "/dashboard/docs/gst-category-pro", roles: ["ADMIN", "SELLER", "STAFF"] },
      { icon: <QrCode size={18} />, label: "Website QR Generator", href: "/dashboard/admin/website-qr", roles: ["ADMIN"] },
      { icon: <CreditCard size={18} />, label: "Payment Wallet Deposits", href: "/dashboard/reports/wallet-deposits", roles: ["ADMIN", "SELLER"] },
      { icon: <Gift size={18} />, label: "Rewards Program", href: "/dashboard/rewards", roles: ["ADMIN", "SELLER"] },

    ]
  }
];

import { Hash } from "lucide-react";
import { Loader2 } from "lucide-react";

function SidebarItem({ item, index, isActive, collapsed, isDark, pathname }: any) {
  const [isOpen, setIsOpen] = useState(isActive);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsPending(false);
  }, [pathname]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="w-full"
    >
      <div
        onClick={() => {
          if (item.subItems) {
            setIsOpen(!isOpen);
            kravy.click();
          }
        }}
      >
        <Link 
          href={item.subItems ? "#" : item.href} 
          style={{ textDecoration: 'none' }} 
          prefetch={false} 
          onClick={(e) => { 
            if(item.subItems) e.preventDefault();
            if(item.href !== '#' && !item.subItems) {
              kravy.click();
              if (item.href !== pathname) setIsPending(true);
            }
          }}
        >
          <motion.div
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: "12px", padding: collapsed ? "13px 0" : "11px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: "14px",
              cursor: item.href === "#" && !item.subItems ? "not-allowed" : (isPending ? "wait" : "pointer"),
              pointerEvents: (item.href === "#" && !item.subItems) || isPending ? "none" : "auto",
              opacity: (item.href === "#" && !item.subItems) ? 0.6 : (isPending ? 0.7 : 1),
              marginBottom: "3px", transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
              background: isActive
                ? "linear-gradient(135deg, rgba(255,107,53,0.22) 0%, rgba(245,158,11,0.08) 100%)"
                : "transparent",
              border: isActive
                ? "1px solid rgba(255,107,53,0.2)"
                : "1px solid transparent",
              position: "relative",
              boxShadow: isActive ? "0 2px 12px rgba(255,107,53,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
            }}
          >
            <motion.span
              animate={{
                color: isActive ? "#FF6B35" : (isDark ? "rgba(255,255,255,0.38)" : "var(--kravy-text-muted)"),
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                filter: isActive ? (isDark ? "drop-shadow(0 0 8px rgba(255,107,53,0.6))" : "none") : "none",
              }}
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : item.icon}
            </motion.span>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                transition={{ delay: 0.1 }}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <motion.span
                  animate={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive
                      ? (isDark ? "#FFFFFF" : "var(--kravy-orange)")
                      : (isDark ? "rgba(255,255,255,0.5)" : "var(--kravy-text-secondary)"),
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ flex: 1, textAlign: "left", fontSize: "0.85rem", letterSpacing: "-0.01em" }}
                >
                  {item.label}
                </motion.span>
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {item.badge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        fontSize: "0.55rem", fontWeight: 900, padding: "2px 8px",
                        borderRadius: "10px", 
                        background: item.badgeColor || (isActive ? "var(--kravy-orange)" : "var(--kravy-bg-active)"),
                        color: "#FFFFFF", textTransform: "uppercase",
                        letterSpacing: "0.5px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        opacity: 0.9
                      }}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                  {item.subItems && (
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown size={14} style={{ opacity: 0.4 }} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
            {isActive && !(item as any).showHorizontalGroup && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  width: "4px", height: "70%", borderRadius: "2px 0 0 2px",
                  background: "linear-gradient(#FF6B35, #F59E0B)",
                  boxShadow: "0 0 12px rgba(255,107,53,0.5)",
                }}
              />
            )}
          </motion.div>
        </Link>
      </div>

      {/* SUB-ITEMS RENDERING */}
      {!collapsed && item.subItems && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: "hidden", marginLeft: "28px", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
            >
              {item.subItems.map((sub: any) => {
                const isSubActive = pathname === sub.href;
                return (
                  <Link key={sub.label} href={sub.href} style={{ textDecoration: 'none' }} onClick={() => kravy.click()}>
                    <motion.div
                      whileHover={{ x: 5 }}
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.78rem",
                        fontWeight: isSubActive ? 800 : 500,
                        color: isSubActive ? "#FF6B35" : (isDark ? "rgba(255,255,255,0.4)" : "var(--kravy-text-muted)"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: "8px",
                        margin: "2px 0",
                        background: isSubActive ? "rgba(255,107,53,0.05)" : "transparent"
                      }}
                    >
                      {sub.label}
                      {sub.badge && (
                        <span style={{ fontSize: '0.5rem', opacity: 0.5, border: '1px solid currentColor', padding: '1px 4px', borderRadius: '4px' }}>{sub.badge}</span>
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {(item as any).showHorizontalGroup && !collapsed && (
        <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px', marginTop: '-4px' }}>
          <Link href="/dashboard/combos" style={{ textDecoration: 'none', flex: 1 }} prefetch={false} onClick={() => { kravy.click(); }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px',
                background: pathname === '/dashboard/combos' ? 'rgba(255,107,53,0.15)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: `1px solid ${pathname === '/dashboard/combos' ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={16} color={pathname === '/dashboard/combos' ? '#FF6B35' : '#64748B'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: pathname === '/dashboard/combos' ? '#FF6B35' : '#64748B' }}>COMBOS</span>
            </motion.div>
          </Link>
          <Link href="/dashboard/offers" style={{ textDecoration: 'none', flex: 1 }} prefetch={false} onClick={() => { kravy.click(); }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px',
                background: pathname.startsWith('/dashboard/offers') ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: `1px solid ${pathname.startsWith('/dashboard/offers') ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Percent size={16} color={pathname.startsWith('/dashboard/offers') ? '#10B981' : '#64748B'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: pathname.startsWith('/dashboard/offers') ? '#10B981' : '#64748B' }}>OFFERS</span>
            </motion.div>
          </Link>

        </div>
      )}
    </motion.div>
  );
}

export default function Sidebar({ profile }: { profile?: any }) {
  const { collapsed, setCollapsed } = useSidebar();
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);
  const { user: authUser, loading: authLoading } = useAuthContext();
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [aiScraperEnabled, setAiScraperEnabled] = useState(false);
  const [excelImportEnabled, setExcelImportEnabled] = useState(false);
  const [fuelBillingEnabled, setFuelBillingEnabled] = useState(false);

  const { tablesList } = useTerminalContext();
  const activeTablesCount = tablesList ? tablesList.filter(t => t.activeCount > 0).length : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);

  // Derive from AuthContext
  const userRole = authUser?.type || "USER";
  const allowedPaths = authUser?.permissions || [];
  const loadingRole = authLoading;

  useEffect(() => {
    setMounted(true);

    // Fetch profile to check tax status & hidden sidebar items
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.taxEnabled || data.perProductTaxEnabled) setTaxEnabled(true);
          if (data.aiScraperEnabled) setAiScraperEnabled(true);
          if (data.excelImportEnabled) setExcelImportEnabled(true);
          setFuelBillingEnabled(!!data.enableFuelBilling);


        }
      })
      .catch(() => {});

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "kravy_hidden_sidebar_items") {
        try {
          const newVal = e.newValue ? JSON.parse(e.newValue) : [];
          setHiddenSidebarItems(newVal);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Update hidden items when authUser changes
  useEffect(() => {
    if (authLoading) return;
    if (authUser && authUser.hiddenSidebarItems) {
      setHiddenSidebarItems(authUser.hiddenSidebarItems);
      localStorage.setItem("kravy_hidden_sidebar_items", JSON.stringify(authUser.hiddenSidebarItems));
    } else {
      try {
        const local = localStorage.getItem("kravy_hidden_sidebar_items");
        if (local) setHiddenSidebarItems(JSON.parse(local));
      } catch (e) {}
    }
  }, [authUser, authLoading]);

  if (!mounted) return null;

  return (
    <div style={{
      width: collapsed ? "72px" : "260px",
      minWidth: collapsed ? "72px" : "260px",
      height: "100vh",
      background: isDark
        ? "linear-gradient(145deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%)"
        : "linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 50%, #E2E8F0 100%)",
      borderRight: isDark
        ? "1px solid rgba(139,92,246,0.15)"
        : "1px solid rgba(139,92,246,0.1)",
      display: "flex",
      flexDirection: "column",
      transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
      boxShadow: isDark
        ? "4px 0 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)"
        : "4px 0 24px rgba(0,0,0,0.04), 0 0 0 1px rgba(139,92,246,0.05)",
      overflow: "hidden",
    }}>

      {/* Animated Gradient Background */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `
          radial-gradient(circle at 20% 50%, rgba(139,92,246,0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(236,72,153,0.1) 0%, transparent 50%),
          linear-gradient(180deg, rgba(139,92,246,0.03) 0%, transparent 100%)
        `,
        pointerEvents: "none",
      }} />

      {/* Floating Particles Effect */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(139,92,246,0.3) 0%, transparent 2px),
          radial-gradient(circle at 75% 75%, rgba(59,130,246,0.3) 0%, transparent 2px),
          radial-gradient(circle at 50% 10%, rgba(236,72,153,0.3) 0%, transparent 2px),
          radial-gradient(circle at 10% 90%, rgba(34,197,94,0.3) 0%, transparent 2px)
        `,
        backgroundSize: "60px 60px, 80px 80px, 100px 100px, 40px 40px",
        backgroundPosition: "0 0, 30px 30px, 60px 10px, 10px 70px",
        pointerEvents: "none",
        opacity: 0.6,
      }} />

      {/* LOGO */}
      <div style={{
        padding: collapsed ? "24px 0" : "24px 24px",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: isDark
          ? "1px solid rgba(139,92,246,0.15)"
          : "1px solid rgba(0,0,0,0.05)",
        minHeight: "80px",
        background: isDark
          ? "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.04))"
          : "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))",
        backdropFilter: "blur(20px)",
        position: "relative",
        zIndex: 10,
      }}>
        {/* Glow Effect Behind Logo */}
        <div style={{
          position: "absolute", top: "50%", left: collapsed ? "50%" : "36px",
          transform: "translate(-50%, -50%)",
          width: collapsed ? "60px" : "80px", height: collapsed ? "60px" : "80px",
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }} />

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, x: 2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative", zIndex: 5, cursor: "pointer" }}
            onClick={() => window.location.href = '/dashboard'}
          >
            <div style={{ position: "relative" }}>
              <div style={{ 
                position: "absolute", inset: -4, borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(37,99,235,0.1))",
                filter: "blur(8px)", zIndex: 0
              }} />
              <div style={{
                  height: "46px", 
                  width: "46px",
                  borderRadius: "14px",
                  boxShadow: isDark ? "0 4px 15px rgba(37,99,235,0.3)" : "0 4px 15px rgba(37,99,235,0.2)",
                  position: "relative", zIndex: 1,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center"
              }}>
                <img 
                  src="/kravylogo.png" 
                  alt="Kravy Logo" 
                  style={{ 
                    width: "100%", 
                    height: "auto",
                    display: "block"
                  }} 
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, ease: "easeOut" }}
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  letterSpacing: "-0.8px",
                  lineHeight: 1,
                  background: isDark ? "linear-gradient(135deg, #FFFFFF, #93C5FD)" : "linear-gradient(135deg, #1E3A8A, #2563EB)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: isDark ? "drop-shadow(0 2px 12px rgba(147,197,253,0.3))" : "drop-shadow(0 2px 10px rgba(37,99,235,0.2))"
                }}
              >
                Kravy
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ease: "easeOut" }}
                style={{ 
                  fontSize: "0.55rem", 
                  color: isDark ? "rgba(147, 197, 253, 0.9)" : "rgba(37, 99, 235, 0.85)", 
                  letterSpacing: "3.5px", 
                  fontWeight: 800, 
                  marginTop: "4px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}
              >
                Billing Software
              </motion.div>
              </div>
          </motion.div>
        )}
        {collapsed && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: "relative",
              zIndex: 5,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <div style={{
                height: "40px", 
                width: "40px",
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center"
            }}>
              <img 
                src="/kravylogo.png" 
                alt="Kravy POS" 
                style={{ 
                  width: "100%",
                  height: "auto",
                  display: "block"
                }} 
              />
            </div>
          </motion.div>
        )}
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.3)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { kravy.toggle(); setCollapsed(!collapsed); }}
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "12px", width: "36px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#8B5CF6", fontSize: "0.75rem",
            flexShrink: 0, transition: "all 0.3s",
            position: "relative", zIndex: 5
          }}
        >
          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.div
                key="expand"
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <ChevronRight size={18} />
              </motion.div>
            ) : (
              <motion.div
                key="collapse"
                initial={{ rotate: 180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -180, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <ChevronLeft size={18} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* OUTLET STATUS */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, ease: "easeOut" }}
          style={{
            margin: "16px 20px",
            background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "16px", padding: "16px 18px",
            display: "flex", alignItems: "center", gap: "14px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Animated Glow Background */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(circle at 20% 50%, rgba(34,197,94,0.2) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />

          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: "12px", height: "12px", borderRadius: "50%",
              background: "linear-gradient(135deg, #22C55E, #10B981)",
              boxShadow: "0 0 20px #22C55E, 0 0 40px rgba(34,197,94,0.5)",
              position: "relative",
              zIndex: 2
            }}
          >
            {/* Inner Pulse */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "6px", height: "6px", borderRadius: "50%",
              background: "rgba(255,255,255,0.8)",
            }} />
          </motion.div>

          <div style={{ position: "relative", zIndex: 2 }}>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, ease: "easeOut" }}
              style={{ fontSize: "0.8rem", fontWeight: 800, color: "#22C55E", textShadow: "0 0 10px rgba(34,197,94,0.5)" }}
            >
              SYSTEM ACTIVE
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* SEARCH INPUT */}
      {!collapsed && (
        <div style={{ padding: "0 20px", marginBottom: "16px" }}>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center"
          }}>
            <Search size={14} style={{ position: "absolute", left: "12px", color: "var(--kravy-text-muted)" }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "10px",
                border: "1px solid var(--kravy-border)",
                background: isDark ? "rgba(255,255,255,0.05)" : "var(--kravy-surface)",
                color: "var(--kravy-text-primary)",
                fontSize: "0.75rem",
                outline: "none",
                fontWeight: 600
              }}
            />
            {searchQuery && (
              <X 
                size={14} 
                onClick={() => setSearchQuery("")} 
                style={{ position: "absolute", right: "12px", color: "var(--kravy-text-muted)", cursor: "pointer" }} 
              />
            )}
          </div>
        </div>
      )}

      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 12px",
      }} className="hide-scrollbar">
                {(() => {
          const allGroups = searchQuery ? [...navGroups, ...hiddenNavGroups] : navGroups;
          return allGroups.map((group, groupIndex) => {
          // Filter items based on access rules
          const visibleItems = group.items.filter((item: any) => {
            // 6. Search query filtering (Applied universally before role checks)
            const matchesSearch = searchQuery 
              ? item.label.toLowerCase().includes(searchQuery.toLowerCase()) 
                || (item.subItems && item.subItems.some((sub: any) => sub.label.toLowerCase().includes(searchQuery.toLowerCase())))
              : true;

            if (!matchesSearch) return false;

            // 0. User custom hidden items check (except critical settings link)
            if (item.href !== "/dashboard/settings" && item.href !== "/dashboard/profile") {
              if (hiddenSidebarItems.includes(item.href) || hiddenSidebarItems.includes(item.label)) {
                return false;
              }
            }

            // 1. Application-wide Feature Flags (Controlled by profile settings)
            if (item.label === "GST Reports" && !taxEnabled) return false;
            if (item.label === "AI Product Scraper" && !aiScraperEnabled) return false;
            if (item.label === "Excel Bulk Import" && !excelImportEnabled) return false;
            if (item.label === "Fuel Billing" && !fuelBillingEnabled) return false;


            // 2. Global Admin Bypass - Show everything else to administrators
            if (userRole === "ADMIN") return true;

            // 3. Explicit Path-based Access (from DB allowedPaths)
            // If the current user has this specific path in their allowed list, grant access
            const baseHref = item.href.split("?")[0];
            const hasLegacyWorkflow = allowedPaths.includes("/dashboard/workflow");
            const isNewPath = baseHref === "/dashboard/terminal" || baseHref === "/dashboard/kitchen";
            const isExpensePath = baseHref === "/dashboard/expenses";
            const isRoomPath = baseHref === "/dashboard/rooms";
            
            if (
              allowedPaths.includes("*") || 
              allowedPaths.includes(item.href) || 
              allowedPaths.includes(baseHref) || 
              (hasLegacyWorkflow && isNewPath) ||
              (isExpensePath && (userRole === "ADMIN" || userRole === "SELLER")) ||
              isRoomPath
            ) return true;

            
            // 4. Permission List Constraint
            // If the user has a populated list of allowedPaths, but this item isn't in it,
            // we must deny access (even if legacy role checks below might pass).
            if (allowedPaths.length > 0) return false;

            // 5. Legacy Role-based Fallback (used when allowedPaths is empty)
            const effectiveRole = userRole === "USER" ? "SELLER" : userRole;
            const hasRoleAccess = allowedPaths.length === 0 && item.roles ? item.roles.includes(effectiveRole) : (allowedPaths.length === 0);
              
            return hasRoleAccess;
          });

          // 2. If no items are allowed in this group, don't show the group at all
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group || `group-${groupIndex}`} style={{ marginBottom: "20px" }}>
              {!collapsed && (
                <div style={{
                  fontSize: "0.58rem", fontWeight: 800,
                  color: isDark ? "rgba(255,255,255,0.25)" : "var(--kravy-text-muted)",
                  letterSpacing: "2px", padding: "12px 10px 6px",
                  textTransform: "uppercase",
                  opacity: isDark ? 1 : 0.7,
                }}>{group.group}</div>
              )}
              {visibleItems.map((item: any, index) => (
                <SidebarItem 
                  key={item.label} 
                  item={item} 
                  index={index} 
                  isActive={pathname === item.href || item.subItems?.some((sub: any) => pathname === sub.href)} 
                  collapsed={collapsed} 
                  isDark={isDark} 
                  pathname={pathname}
                />
              ))}
          </div>
        );
      });
        })()}
    </div>

      {/* USER SECTION AT BOTTOM */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{
          padding: collapsed ? "12px 0" : "16px 14px",
          borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: "12px",
          marginTop: "auto",
          background: "linear-gradient(135deg, rgba(255,107,53,0.02), transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          {authUser?.imageUrl ? (
            <motion.img
              src={authUser.imageUrl}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                border: "2px solid #FF6B35", flexShrink: 0,
                boxShadow: "0 4px 16px rgba(255,107,53,0.3)",
                objectFit: "cover"
              }}
              alt="User Avatar"
              whileHover={{ boxShadow: "0 6px 24px rgba(255,107,53,0.5)" }}
            />
          ) : (
            <motion.div
              whileHover={{ boxShadow: "0 6px 24px rgba(255,107,53,0.5)" }}
              style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: "linear-gradient(135deg, #FF6B35, #F59E0B)",
                display: "flex", alignItems: "center", justifyCenter: "center",
                fontSize: "0.9rem", fontWeight: 800, color: "#fff",
                flexShrink: 0, boxShadow: "0 4px 16px rgba(255,107,53,0.3)",
              }}
            >
              {(authUser?.name?.[0] || 'U').toUpperCase()}
            </motion.div>
          )}
        </motion.div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            style={{ flex: 1, minWidth: 0 }}
          >
            <motion.div
              style={{
                fontSize: "0.82rem", fontWeight: 700,
                color: isDark ? "#E2E8F0" : "#1E293B",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}
              whileHover={{ color: "#FF6B35" }}
            >
              {authUser?.name || "Admin User"}
            </motion.div>
            <motion.div
              style={{
                fontSize: "0.62rem", color: isDark ? "#A0AEC0" : "#4A5568", fontFamily: "monospace",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: userRole === "ADMIN" ? "#10B981" : "#F59E0B", 
                boxShadow: `0 0 8px ${userRole === "ADMIN" ? "#10B981" : "#F59E0B"}`,
              }} />
              <span style={{ 
                fontWeight: 800, 
                color: userRole === "ADMIN" ? "#10B981" : "#F59E0B",
                letterSpacing: "0.5px"
              }}>
                {userRole}
              </span>
              <span style={{ opacity: 0.5 }}>• Authorized</span>
            </motion.div>
          </motion.div>
        )}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 }}
          >
            <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,107,53,0.1)", color: "#FF6B35" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                   kravy.close();
                   // Clear all possible auth cookies
                   document.cookie = "staff_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                   document.cookie = "kravy_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                   // Hard refresh to clear state and go home
                   window.location.href = "/";
                }}
                style={{
                  background: "none", border: "none",
                  color: isDark ? "#6B7280" : "var(--kravy-text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  padding: "6px", borderRadius: "8px", transition: "all 0.3s",
                }}
              >
                <LogOut size={18} />
              </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

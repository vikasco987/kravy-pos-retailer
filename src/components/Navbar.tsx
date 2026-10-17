"use client";
import { useCurrency } from "@/lib/currency-context";
import { useEffect, useState, useRef } from "react";
import { useSidebar } from "./SidebarContext";

import { useAuthContext } from "@/components/AuthContext";
import CustomUserButton from "@/components/CustomUserButton";
import { useSearch } from "@/components/SearchContext";
import { useTheme } from "@/components/ThemeProvider";
import { Search, Bell, MapPin, Menu, X, Sun, Moon, Monitor, Volume2, Package, Receipt, Users, ArrowRight, Loader2, XCircle, LogOut } from "lucide-react";
import { kravy } from "@/lib/sounds";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  isMobile?: boolean;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
  profile?: any;
}

import SubscriptionIndicator from "./SubscriptionIndicator";

export default function Navbar({ isMobile = false, onMenuToggle, sidebarOpen = false, profile }: NavbarProps) {
  const { currencySymbol: sym } = useCurrency();

  const { user, loading: authLoading } = useAuthContext();

  const { query, setQuery } = useSearch();
  const { collapsed } = useSidebar();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const [greeting, setGreeting] = useState("Good Day");
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const [searchResults, setSearchResults] = useState<{ items: any[], bills: any[], parties: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("SEARCH ERROR:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    window.dispatchEvent(
      new CustomEvent("kravy-search", {
        detail: query.trim(),
      })
    );
    setQuery("");
  };

  const isDark = resolvedTheme === "dark";

  const themeOptions = [
    { key: "light", label: "Light", icon: <Sun className="w-full h-full" /> },
    { key: "dark", label: "Dark", icon: <Moon className="w-full h-full" /> },
    { key: "system", label: "System", icon: <Monitor className="w-full h-full" /> },
  ] as const;

  const iconBtnClass = `rounded-xl lg:rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 w-[38px] h-[38px] sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 2xl:w-12 2xl:h-12`;
  const iconClass = "w-[18px] h-[18px] lg:w-5 lg:h-5 xl:w-[22px] xl:h-[22px]";

  return (
    <header className={`py-3 2xl:py-0 2xl:h-[84px] bg-[var(--kravy-navbar-bg)] border-b border-[var(--kravy-border)] backdrop-blur-[20px] flex items-center transition-[background] duration-400 ease-in-out z-40 sticky top-0 px-3 sm:px-4 md:px-6 lg:px-7 xl:px-8 ${isDark ? 'shadow-[0_1px_0_rgba(255,255,255,0.04),_0_4px_24px_rgba(0,0,0,0.3)]' : 'shadow-[0_1px_0_rgba(0,0,0,0.06),_0_4px_16px_rgba(0,0,0,0.08)]'}`}>
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between w-full gap-3 2xl:gap-0 min-w-0">

        {/* Mobile Menu Toggle & Welcome Section */}
        <div className="flex items-center w-full 2xl:w-auto shrink-0 mr-4">
          {isMobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle?.();
              }}
              className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[10px] w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer text-[var(--kravy-text-primary)] mr-2 sm:mr-3 shrink-0"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="font-extrabold text-[var(--kravy-text-primary)] tracking-[-0.4px] flex items-center gap-1 sm:gap-2 leading-[1.2] text-sm sm:text-base md:text-[1.1rem] lg:text-[1.15rem] xl:text-[1.2rem] 2xl:text-[1.25rem] whitespace-nowrap">
              <span className="kravy-live-dot shrink-0" />
              {greeting},{" "}
              <span className="bg-gradient-to-br from-[#FF6B35] to-[#F59E0B] bg-clip-text text-transparent">
                {(user as any)?.name || (user as any)?.firstName || "User"}
              </span>
              <span className="ml-[2px] text-lg sm:text-xl md:text-2xl lg:text-[1.6rem] xl:text-[1.7rem] 2xl:text-[1.8rem]">👋</span>
            </div>
            {!isMobile && (
              <div className="text-[0.6rem] sm:text-[0.65rem] md:text-[0.7rem] lg:text-[0.75rem] xl:text-[0.8rem] 2xl:text-[0.85rem] text-[var(--kravy-text-muted)] font-medium mt-[3px] flex items-center gap-[5px] tracking-[0.1px] whitespace-nowrap">
                <MapPin className="w-3 h-3 md:w-[14px] md:h-[14px] lg:w-[15px] lg:h-[15px]" strokeWidth={2.5} />
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="text-[var(--kravy-border-strong)]">·</span>
                <span className="text-[var(--kravy-text-faint)]">Main Branch</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="flex flex-wrap items-center justify-between 2xl:justify-end w-full flex-1 gap-y-3 gap-x-2 sm:gap-x-3 lg:gap-x-4 2xl:gap-x-5 min-w-0 mt-2 2xl:mt-0">

          {/* Search Bar - Hidden on mobile */}
          {!isMobile && (
            <div className="relative flex-1 min-w-[180px] max-w-full 2xl:max-w-[440px]">
              <form onSubmit={handleSearch} className="relative w-full">
                {isSearching ? (
                  <Loader2 className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 text-[var(--kravy-brand)] w-4 h-4 lg:w-[18px] lg:h-[18px] animate-spin" />
                ) : (
                  <Search className="absolute left-4 lg:left-5 top-1/2 -translate-y-1/2 text-[var(--kravy-text-faint)] w-4 h-4 lg:w-[18px] lg:h-[18px] xl:w-[20px] xl:h-[20px]" />
                )}
                <input
                  type="text"
                  placeholder="Universal Search..."
                  className={`kravy-input !pl-[42px] sm:!pl-[44px] lg:!pl-[48px] xl:!pl-[52px] w-full h-9 md:h-10 lg:h-11 xl:h-12 text-xs md:text-sm lg:text-[0.95rem] xl:text-base border transition-all duration-300 ease-in-out ${searchResults ? 'border-[var(--kravy-brand)]' : 'border-[var(--kravy-border)]'}`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>

              {/* Universal Search Results Dropdown */}
              <AnimatePresence>
                {searchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                    className={`absolute right-0 top-[calc(100%+12px)] w-[320px] md:w-[420px] lg:w-[480px] xl:w-[520px] border border-[var(--kravy-border)] rounded-[20px] lg:rounded-[22px] overflow-hidden z-[1000] backdrop-blur-[20px] ${isDark ? 'bg-[#0A0C14] shadow-[0_24px_60px_rgba(0,0,0,0.6)]' : 'bg-white shadow-[0_12px_40px_rgba(0,0,0,0.1)]'}`}
                  >
                    <div className="p-4 lg:p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      {/* Results Header */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--kravy-border)]">
                        <span className="text-[10px] lg:text-xs font-black uppercase text-[var(--kravy-text-muted)] tracking-[2px]">
                          Universal Matches
                        </span>
                        <button onClick={() => setSearchResults(null)} className="text-[var(--kravy-text-muted)] bg-transparent border-none cursor-pointer">
                          <X className="w-[14px] h-[14px] lg:w-4 lg:h-4" />
                        </button>
                      </div>

                      {/* Items Section */}
                      {searchResults.items.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-[6px] text-[9px] lg:text-[10px] font-extrabold text-[var(--kravy-brand)] mb-2 uppercase">
                            <Package className="w-[10px] h-[10px] lg:w-3 lg:h-3" /> Inventory Assets
                          </div>
                          <div className="flex flex-col gap-1 lg:gap-2">
                            {searchResults.items.map(item => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  router.push("/dashboard/inventory");
                                  window.dispatchEvent(new CustomEvent("kravy-search", { detail: item.name }));
                                  setSearchResults(null);
                                  setQuery("");
                                }}
                                className="flex items-center justify-between py-2 lg:py-3 px-3 lg:px-4 rounded-xl lg:rounded-2xl bg-[var(--kravy-bg-2)] border-none w-full cursor-pointer text-left hover:bg-[var(--kravy-brand)]/5 transition-colors group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs lg:text-sm font-bold text-[var(--kravy-text-primary)]">{item.name}</span>
                                  <span className="text-[9px] lg:text-[10px] text-[var(--kravy-text-muted)]">Stock: {item.currentStock ?? 0} · {sym}{item.price}</span>
                                  {item.code && <span className="text-[9px] lg:text-[10px] text-[var(--kravy-text-faint)] mt-[2px]">Code: {item.code}</span>}
                                </div>
                                <ArrowRight className="w-3 h-3 lg:w-[14px] lg:h-[14px] text-[var(--kravy-text-faint)] group-hover:translate-x-1 group-hover:text-[var(--kravy-brand)] transition-all" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bills Section */}
                      {searchResults.bills.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-[6px] text-[9px] lg:text-[10px] font-extrabold text-[var(--kravy-brand)] mb-2 uppercase">
                            <Receipt className="w-[10px] h-[10px] lg:w-3 lg:h-3" /> Transactions
                          </div>
                          <div className="flex flex-col gap-1 lg:gap-2">
                            {searchResults.bills.map(bill => (
                              <Link
                                key={bill.id}
                                href={`/dashboard/reports/sales/daily`}
                                onClick={() => setSearchResults(null)}
                                className="flex items-center justify-between py-2 lg:py-3 px-3 lg:px-4 rounded-xl lg:rounded-2xl bg-[var(--kravy-bg-2)] no-underline text-inherit hover:bg-[var(--kravy-brand)]/5 transition-colors group"
                              >
                                <div>
                                  <div className="text-xs lg:text-sm font-bold text-[var(--kravy-text-primary)]">{bill.billNumber}</div>
                                  <div className="text-[9px] lg:text-[10px] text-[var(--kravy-text-muted)]">Total: {sym}{bill.total} · {new Date(bill.createdAt).toLocaleDateString()}</div>
                                </div>
                                <ArrowRight className="w-3 h-3 lg:w-[14px] lg:h-[14px] text-[var(--kravy-text-faint)] group-hover:translate-x-1 transition-all" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Parties Section */}
                      {searchResults.parties.length > 0 && (
                        <div>
                          <div className="flex items-center gap-[6px] text-[9px] lg:text-[10px] font-extrabold text-[var(--kravy-brand)] mb-2 uppercase">
                            <Users className="w-[10px] h-[10px] lg:w-3 lg:h-3" /> High-Value Clients
                          </div>
                          <div className="flex flex-col gap-1 lg:gap-2">
                            {searchResults.parties.map(party => (
                              <Link
                                key={party.id}
                                href={`/dashboard/parties`}
                                onClick={() => setSearchResults(null)}
                                className="flex items-center justify-between py-2 lg:py-3 px-3 lg:px-4 rounded-xl lg:rounded-2xl bg-[var(--kravy-bg-2)] no-underline text-inherit hover:bg-[var(--kravy-brand)]/5 transition-colors group"
                              >
                                <div>
                                  <div className="text-xs lg:text-sm font-bold text-[var(--kravy-text-primary)]">{party.name}</div>
                                  <div className="text-[9px] lg:text-[10px] text-[var(--kravy-text-muted)]">Tel: {party.phone}</div>
                                </div>
                                <ArrowRight className="w-3 h-3 lg:w-[14px] lg:h-[14px] text-[var(--kravy-text-faint)] group-hover:translate-x-1 transition-all" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.items.length === 0 && searchResults.bills.length === 0 && searchResults.parties.length === 0 && (
                        <div className="py-8 lg:py-10 px-4 text-center opacity-50">
                          <XCircle className="mx-auto mb-3 w-8 h-8 lg:w-10 lg:h-10 block" />
                          <div className="text-xs lg:text-sm font-extrabold">No Global Matches Found</div>
                          <div className="text-[9px] lg:text-[10px] font-medium">Try generic terms like "Item" or "Bill"</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
            {/* ── Theme Toggle ── */}
            <div className="relative flex items-center">
              <button
                ref={themeBtnRef}
                onClick={() => {
                  if (!themeMenuOpen && themeBtnRef.current) {
                    const rect = themeBtnRef.current.getBoundingClientRect();
                    const menuWidth = 190;
                    let left = rect.right - menuWidth;
                    // Keep at least 12px away from left edge of screen
                    if (left < 12) left = 12;
                    // Also ensure it doesn't overflow right edge
                    if (left + menuWidth > window.innerWidth - 12) {
                      left = Math.max(12, window.innerWidth - menuWidth - 12);
                    }
                    setDropdownCoords({
                      top: rect.bottom + 8,
                      left,
                    });
                    setThemeMenuOpen(true);
                  } else {
                    setThemeMenuOpen(false);
                  }
                }}
                title="Switch theme"
                className={`${iconBtnClass} ${isDark ? 'text-[#F59E0B]' : 'text-[#7C3AED]'}`}
              >
                {isDark ? <Moon className={iconClass} /> : <Sun className={iconClass} />}
              </button>

              {/* Theme dropdown */}
              {themeMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-[10002]"
                    onClick={() => setThemeMenuOpen(false)}
                  />
                  <div
                    style={dropdownCoords ? { top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` } : undefined}
                    className={`fixed border border-[var(--kravy-border)] rounded-[14px] p-2 z-[10005] w-[190px] max-w-[calc(100vw-24px)] ${isDark ? 'bg-[#0D0F1A] shadow-[0_16px_40px_rgba(0,0,0,0.5)]' : 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)]'}`}
                  >
                    <div className="text-[0.62rem] lg:text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-[1px] px-2 pt-1 pb-2 font-mono">
                      Appearance
                    </div>
                    {themeOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setTheme(opt.key); setThemeMenuOpen(false); }}
                        className={`w-full flex items-center gap-[10px] py-[9px] lg:py-[10px] px-3 lg:px-4 rounded-[10px] border-none text-[0.85rem] lg:text-[0.9rem] xl:text-base cursor-pointer transition-all duration-150 text-left ${theme === opt.key ? 'bg-[var(--kravy-accent-purple)20] text-[var(--kravy-accent-purple)] font-bold' : 'bg-transparent text-[var(--kravy-text-secondary)] font-medium hover:bg-[var(--kravy-surface-hover)]'}`}
                      >
                        <span className="w-4 h-4 lg:w-[18px] lg:h-[18px] inline-flex">
                          {opt.icon}
                        </span>
                        {opt.label}
                        {theme === opt.key && (
                          <span className="ml-auto text-[0.7rem] lg:text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Notifications */}
            <div className={`${iconBtnClass} text-[var(--kravy-accent-purple)] relative`}>
              <Bell className={iconClass} />
              <div className="absolute top-[9px] right-[9px] lg:top-[10px] lg:right-[10px] xl:top-[11px] xl:right-[11px] w-[7px] h-[7px] lg:w-2 lg:h-2 rounded-full bg-[#EF4444] border-2 border-[var(--kravy-bg)]" />
            </div>

            {/* Subscription Indicator (Top Bar) */}
            {!isMobile && profile && profile.premiumEndDate && (
              <SubscriptionIndicator profile={profile} />
            )}

            {/* 🔊 Sound Test Button — Click to test audio */}
            <button
              onClick={() => kravy.orderBell()}
              title="Test Sound 🔊"
              className={`${iconBtnClass} text-[#10B981]`}
            >
              <Volume2 className={iconClass} />
            </button>

            {/* User Button */}
            {!isMobile && (
              <div className="pl-2 lg:pl-3 border-l border-[var(--kravy-border)] ml-1 lg:ml-2 flex items-center shrink-0">
                {user ? (
                  <CustomUserButton user={user} />
                ) : (
                  <Link href="/">
                    <button className="bg-[var(--kravy-brand)] text-white border-none py-2 lg:py-[10px] px-4 lg:px-5 rounded-[10px] font-bold text-[0.85rem] lg:text-[0.9rem] cursor-pointer shadow-[0_4px_12px_rgba(255,107,53,0.2)] hover:shadow-lg transition-all">Sign In</button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

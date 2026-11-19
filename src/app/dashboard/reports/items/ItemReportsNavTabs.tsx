"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass } from "lucide-react";

export default function ItemReportsNavTabs({
  currentRange = "1",
  activeCategory = "All",
}: {
  currentRange?: string;
  activeCategory?: string;
}) {
  const pathname = usePathname();
  const isExplorer = pathname.includes("/explorer");

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl w-full sm:w-fit shadow-xs print:hidden mb-1 overflow-x-auto no-scrollbar">
      <Link
        href={`/dashboard/reports/items?range=${currentRange}&category=${activeCategory}`}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
          !isExplorer
            ? "bg-[var(--kravy-brand)] text-white shadow-md shadow-orange-500/20"
            : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"
        }`}
      >
        <LayoutDashboard size={15} className="shrink-0" />
        <span>Overview</span>
      </Link>

      <Link
        href={`/dashboard/reports/items/explorer?range=${currentRange === "1" ? "30" : currentRange}`}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
          isExplorer
            ? "bg-[var(--kravy-brand)] text-white shadow-md shadow-orange-500/20"
            : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg)]"
        }`}
      >
        <Compass size={15} className="shrink-0" />
        <span>All Items</span>
        <span className="text-[9px] bg-amber-400 text-indigo-950 px-1.5 py-0.5 rounded-md font-extrabold uppercase shrink-0">
          Catalog
        </span>
      </Link>
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import DateFilter from "../../components/date-filter";
import { ChevronLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import PrintableTable from "./PrintableTable";
import ItemReportsNavTabs from "./ItemReportsNavTabs";

export const revalidate = 0;

export default async function ItemWiseSalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();

  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam, category: selectedCategory = "All" } = await searchParams;
  const range = Number(rangeParam || 30);

  const endDate = new Date();
  const startDate = new Date();
  
  if (range === 1) {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 2) {
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate.setDate(endDate.getDate() - range);
  }

  const [bills, menuItems, businessProfile] = await Promise.all([
    prisma.billManager.findMany({
      where: {
        clerkUserId: effectiveId,
        isDeleted: false,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.item.findMany({
      where: { clerkId: effectiveId },
      include: { category: true }
    }),
    prisma.businessProfile.findFirst({
      where: { userId: effectiveId },
      select: { businessName: true }
    })
  ]);

  // Create a map of live menu item categories & ID mapping
  const categoryMap: Record<string, string> = {};
  const itemIdMap: Record<string, string> = {};
  const allMenuCategories = new Set<string>();
  
  menuItems.forEach(item => {
    itemIdMap[item.name] = item.id;
    if (item.category?.name) {
      categoryMap[item.name] = item.category.name;
      allMenuCategories.add(item.category.name);
    }
  });

  const itemMap: Record<string, { totalSold: number; totalRevenue: number; categories: Set<string> }> = {};
  
  bills.forEach((bill) => {
    let items: any = bill.items;
    if (typeof items === "string") {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    if (items && !Array.isArray(items) && items.items) items = items.items;

    if (Array.isArray(items)) {
      items.forEach((item: any) => {
        const name = item?.name || "Unknown";
        const quantity = Number(item?.quantity ?? item?.qty ?? 0);
        
        // Robust price detection to match Quick POS logic
        const sPrice = Number(item?.sellingPrice);
        const bPrice = Number(item?.price);
        const rPrice = Number(item?.rate);
        
        const price = !isNaN(sPrice) && item.sellingPrice !== null ? sPrice 
                   : !isNaN(rPrice) && item.rate !== null ? rPrice
                   : !isNaN(bPrice) ? bPrice : 0;
                   
        const revenue = quantity * price;

        if (!itemMap[name]) {
          itemMap[name] = { totalSold: 0, totalRevenue: 0, categories: new Set() };
        }
        
        itemMap[name].totalSold += quantity;
        itemMap[name].totalRevenue += revenue;
        
        // Try to get category from live menu first, then from item JSON
        const liveCategory = categoryMap[name];
        if (liveCategory) {
          itemMap[name].categories.add(liveCategory);
        } else if (item.category?.name) {
          itemMap[name].categories.add(item.category.name);
        }
      });
    }
  });

  const allItems = Object.keys(itemMap)
    .map((name) => ({
      id: itemIdMap[name] || null,
      name,
      totalSold: itemMap[name].totalSold,
      totalRevenue: itemMap[name].totalRevenue,
      category: Array.from(itemMap[name].categories).join(", ") || "General",
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Use categories from both live menu and items found in sales
  const categoriesList = ["All", ...Array.from(allMenuCategories).sort(), "General"];
  const uniqueCategories = Array.from(new Set(categoriesList));

  const filteredItems = selectedCategory === "All" 
    ? allItems 
    : allItems.filter(item => item.category.includes(selectedCategory));

  const grandTotalRevenue = filteredItems.reduce((sum, i) => sum + i.totalRevenue, 0);
  const grandTotalSold = filteredItems.reduce((sum, i) => sum + i.totalSold, 0);

  const format = (num: number) => new Intl.NumberFormat("en-IN").format(Math.round(num));

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const dateRangeStr = `${formatDate(startDate)} TO ${formatDate(endDate)}`;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-20 md:pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link 
            href="/dashboard" 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:border-orange-500 active:scale-95 transition-all shadow-2xs shrink-0"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight truncate">
              Item Reports
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DateFilter />
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <ItemReportsNavTabs currentRange={String(range)} activeCategory={selectedCategory} />

      {/* ── Category Filter ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 print:hidden">
        {uniqueCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = cat === "All" 
            ? allItems.length 
            : allItems.filter(item => item.category.includes(cat)).length;

          return (
            <Link
              key={cat}
              href={`/dashboard/reports/items?range=${range}&category=${cat}`}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white shadow-md shadow-orange-500/25 scale-[1.02]"
                  : "bg-[var(--kravy-surface)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-orange-400"
              }`}
            >
              <span>{cat}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                isSelected ? "bg-white/20 text-white" : "bg-[var(--kravy-bg)] text-[var(--kravy-text-muted)]"
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <PrintableTable 
        filteredItems={filteredItems} 
        grandTotalRevenue={grandTotalRevenue} 
        grandTotalSold={grandTotalSold}
        dateRangeStr={dateRangeStr}
        businessName={businessProfile?.businessName || "Kravy POS"}
      />
      
      {/* ── Help Tip ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 flex items-center gap-2.5 text-orange-600 dark:text-orange-400 print:hidden text-xs font-semibold">
        <TrendingUp size={16} className="shrink-0" />
        <p>
          Tip: Top 3 products contribute to <span className="font-black font-mono">{filteredItems.slice(0, 3).reduce((s, i) => s + (grandTotalRevenue > 0 ? (i.totalRevenue / grandTotalRevenue) * 100 : 0), 0).toFixed(1)}%</span> of total sales revenue.
        </p>
      </div>
    </div>
  );
}

import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, FileText, Calendar, Trash2, CheckCircle, Clock, User, ShieldAlert, BadgeCheck, Search, Download } from "lucide-react";
import Link from "next/link";
import DateFilter from "../../components/date-filter";

export const revalidate = 0;

export default async function BillsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { range: rangeParam, status = "Active" } = await searchParams;
  const range = Number(rangeParam || 30);
  const isDeletedView = status === "Deleted";

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - range);

  const bills = await prisma.billManager.findMany({
    where: {
      clerkUserId: effectiveId,
      isDeleted: isDeletedView,
      createdAt: { gte: startDate, lte: endDate }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalAmount = bills.reduce((s, b) => s + b.total, 0);
  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link 
            href="/dashboard" 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[var(--kravy-surface)] border border-[var(--kravy-border)] flex items-center justify-center text-[var(--kravy-text-primary)] hover:bg-[var(--kravy-bg-2)] transition shrink-0"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight truncate">
              Management Audit
            </h1>
            <p className="text-xs sm:text-sm text-[var(--kravy-text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
              <ShieldAlert size={14} className="text-amber-500 shrink-0" /> 
              <span>Asset Lifecycle & Compliance Tracking</span>
            </p>
          </div>
        </div>
        <div className="self-end sm:self-auto shrink-0 w-full sm:w-auto overflow-x-auto">
          <DateFilter />
        </div>
      </div>

      {/* ── Audit Status Hub ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
        {/* Status Switcher Card */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
          <h4 className="text-[10px] sm:text-xs font-black text-[var(--kravy-text-muted)] uppercase tracking-wider mb-3">Audit Perspective</h4>
          <div className="flex gap-2 bg-[var(--kravy-bg-2)] p-1.5 rounded-xl border border-[var(--kravy-border)]">
            {[
              { label: "Active Pool", val: "Active", icon: <CheckCircle size={15} /> },
              { label: "Archive Pool", val: "Deleted", icon: <Trash2 size={15} /> }
            ].map(s => (
              <Link 
                key={s.val} 
                href={`/dashboard/reports/bills?range=${range}&status=${s.val}`} 
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition ${
                  status === s.val 
                    ? (s.val === "Active" ? "bg-[var(--kravy-brand)] text-white shadow-xs" : "bg-rose-600 text-white shadow-xs") 
                    : "text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)]"
                }`}
              >
                {s.icon} {s.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-[var(--kravy-text-muted)] mt-3">
            {isDeletedView ? "Showing all cancelled or deleted transactions for compliance audit." : "Displaying active verified merchant transactions."}
          </p>
        </div>

        {/* Aggregated Pool Value Card */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-black text-[var(--kravy-text-muted)] uppercase tracking-wider mb-1">
              {isDeletedView ? "Total Cancelled Value" : "Total Active Billing"}
            </div>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-black ${isDeletedView ? "text-rose-500" : "text-emerald-600"}`}>
              {sym}{format(totalAmount)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-[var(--kravy-text-muted)] pt-3 border-t border-[var(--kravy-border)]/60 mt-3">
            <span>{bills.length} total entries</span>
            <span>Range: Last {range} days</span>
          </div>
        </div>
      </div>

      {/* ── Bill Registry ── */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--kravy-border)] flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[var(--kravy-text-primary)]">
            {isDeletedView ? "Archived Transaction Ledger" : "Audited Invoices"}
          </h2>
          <span className="text-xs text-[var(--kravy-text-muted)] font-bold">{bills.length} bills in pool</span>
        </div>

        {bills.length === 0 ? (
          <div className="p-10 text-center text-[var(--kravy-text-muted)]">
            <Search size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">No audited records found matching this pool.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (block md:hidden) */}
            <div className="block md:hidden divide-y divide-[var(--kravy-border)]">
              {bills.map((b) => (
                <div key={b.id} className="p-3.5 space-y-2 hover:bg-[var(--kravy-bg-2)]/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[var(--kravy-text-primary)]">
                          #{b.billNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isDeletedView ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}>
                          {isDeletedView ? "DELETED" : "SECURED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--kravy-text-muted)] mt-1 truncate">
                        <User size={12} className="shrink-0" />
                        <span className="font-bold text-[var(--kravy-text-primary)] truncate">{b.customerName || "Casual Guest"}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[var(--kravy-text-primary)]">
                        {sym}{format(b.total)}
                      </div>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)] uppercase">
                        {b.paymentMode || "CASH"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--kravy-text-muted)] pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isDeletedView && b.deletedAt && (
                    <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1 pt-1 border-t border-[var(--kravy-border)]/50">
                      <BadgeCheck size={11} /> Cancelled at: {new Date(b.deletedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--kravy-border)] bg-[var(--kravy-bg-2)] text-[10px] font-black uppercase tracking-wider text-[var(--kravy-text-muted)]">
                    <th className="px-6 py-4">Identification</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4 text-center">Audit Status</th>
                    <th className="px-6 py-4 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--kravy-border)] text-xs">
                  {bills.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--kravy-bg-2)]/40 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDeletedView ? "bg-rose-100 text-rose-600" : "bg-[var(--kravy-bg-2)] text-[var(--kravy-brand)]"}`}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="font-mono font-black text-sm text-[var(--kravy-text-primary)]">#{b.billNumber}</div>
                            <div className="text-xs text-[var(--kravy-text-muted)] flex items-center gap-1 mt-0.5">
                              <User size={11} /> {b.customerName || "Casual Guest"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--kravy-text-secondary)]">
                          {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-[var(--kravy-text-muted)] mt-0.5">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col gap-1 items-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isDeletedView ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          }`}>
                            {isDeletedView ? "DELETED" : "SECURED"}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase">
                            {b.paymentMode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-base font-black text-[var(--kravy-text-primary)]">
                          {sym}{format(b.total)}
                        </div>
                        {isDeletedView && b.deletedAt && (
                          <div className="text-[10px] text-rose-500 font-bold mt-1 flex items-center justify-end gap-1">
                            <BadgeCheck size={11} /> {new Date(b.deletedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

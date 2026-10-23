"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/ConfirmContext";


type DeletedBill = {
  id: string;
  billId: string;
  createdAt: string;
  type?: string;
  snapshot: {
    billNumber: string;
    total: number;
    paymentMode: string;
    paymentStatus: string;
    status?: string;
    isHeld?: boolean;
    customer?: {
      name?: string;
    };
    tableName?: string;
    items?: any[];
    reason?: string;
  };
};

export default function DeletedBillsPage() {
  const { confirm } = useConfirm();
  const [bills, setBills] = useState<DeletedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/bill-manager/deleted/list") // ✅ FIXED URL
      .then((r) => r.json())
      .then((d) => setBills(d.deleted ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function restore(billId: string) {
    if (!await confirm("Restore this bill?")) return;

    const res = await fetch(
      `/api/bill-manager/deleted/restore/${billId}`,
      {
        method: "POST",
      }
    );

    if (!res.ok) {
      alert("Failed to restore bill");
      return;
    }

    // optional: update UI instantly
    setBills((prev) => prev.filter((b) => b.id !== billId));

    // ✅ AUTO REDIRECT TO BILL MANAGER
    router.push("/dashboard/billing");
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pt-2 sm:pt-4 pb-36 sm:pb-32 mb-12 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--kravy-text-primary)] tracking-tight">🗑️ Deleted & Rejected Records</h1>
          <p className="text-xs text-[var(--kravy-text-muted)] font-medium mt-1">View all deleted bills and rejected orders with full item breakdown and restore options</p>
        </div>
        <Link href="/dashboard/billing" className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] text-[var(--kravy-text-primary)] font-bold text-xs sm:text-sm rounded-xl hover:bg-[var(--kravy-surface-hover)] transition-all whitespace-nowrap">
          ← Back to Bills
        </Link>
      </div>

      {/* TABLE */}
      <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--kravy-bg-2)]/50">
              <tr>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-left">Bill No</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-left">Customer</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-left">Deleted At</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-left">Amount</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-left">Payment</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-center">Status</th>
                <th className="p-3 sm:p-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--kravy-text-muted)] text-right">Actions</th>
              </tr>
            </thead>

          <tbody>
            {bills.map((b) => {
              const snap = b.snapshot;
              return (
                <Fragment key={b.id}>
                  <tr className="border-t border-[var(--kravy-border)] hover:bg-[var(--kravy-bg-2)]/30 transition-colors">
                    <td className="p-4 font-black text-[var(--kravy-text-primary)]">
                      <div className="flex flex-col">
                        <span>{snap.billNumber}</span>
                        <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">{b.type}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--kravy-text-primary)]">{snap.customer?.name ?? "Walk-in"}</span>
                        <span className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest">{snap.tableName}</span>
                        {snap.reason && (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-md px-2 py-0.5 mt-1 max-w-xs">
                            💬 Reason: {snap.reason}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-[var(--kravy-text-muted)] font-medium font-mono text-xs">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>

                    <td className="p-4 font-black text-[var(--kravy-text-primary)]">
                      ₹{Number(snap.total).toFixed(2)}
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {snap.paymentMode}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <DeletedStatusBadge snap={snap} />
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={async () => restore(b.id)}
                        className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                  
                  {/* PURI INFO: ITEMS BREAKDOWN */}
                  {snap.items && snap.items.length > 0 && (
                    <tr className="bg-[var(--kravy-bg-2)]/20">
                      <td colSpan={7} className="p-4">
                        <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border border-[var(--kravy-border)] shadow-inner">
                          <p className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-[0.2em] mb-3">Items in this {b.type}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {snap.items.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/80 dark:bg-white/5 border border-black/5">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-500/10 text-violet-600 flex items-center justify-center text-[10px] font-black">{it.qty || it.quantity}x</span>
                                  <span className="text-xs font-bold text-[var(--kravy-text-primary)]">{it.name}</span>
                                </div>
                                <span className="text-xs font-black text-[var(--kravy-text-muted)]">₹{((it.qty || it.quantity) * (it.rate || it.price)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {bills.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No deleted bills
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- STATUS BADGE ---------- */

function DeletedStatusBadge({
  snap,
}: {
  snap: DeletedBill["snapshot"];
}) {
  if (snap.isHeld) {
    return (
      <span className="px-2.5 py-1 text-[10px] bg-amber-500/10 text-amber-500 rounded-full font-black tracking-widest">
        HELD
      </span>
    );
  }

  if (snap.paymentStatus?.toLowerCase() === "paid") {
    return (
      <span className="px-2.5 py-1 text-[10px] bg-emerald-500/10 text-emerald-500 rounded-full font-black tracking-widest">
        PAID
      </span>
    );
  }

  if (snap.status === "REJECTED" || snap.paymentStatus === "REJECTED") {
    return (
      <span className="px-2.5 py-1 text-[10px] bg-rose-500/10 text-rose-500 rounded-full font-black tracking-widest">
        REJECTED
      </span>
    );
  }

  if (snap.status === "CANCELLED" || snap.paymentStatus === "CANCELLED") {
    return (
      <span className="px-2.5 py-1 text-[10px] bg-rose-500/10 text-rose-500 rounded-full font-black tracking-widest">
        CANCELLED
      </span>
    );
  }

  return (
    <span className="px-2.5 py-1 text-[10px] bg-rose-500/10 text-rose-500 rounded-full font-black tracking-widest">
      PENDING
    </span>
  );
}

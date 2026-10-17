"use client";
import { useCurrency } from '@/lib/currency-context';

import { Receipt, History, User, Banknote, Smartphone, Maximize2, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface Bill {
  id: string;
  billNumber: string;
  customerName?: string | null;
  paymentMode: string;
  total: number;
  createdAt: string;
  items?: any;
  tokenNumber?: number | null;
  tableName?: string | null;
  isOrder?: boolean;
}

interface Props {
  recentBills?: Bill[];
  deletedBills?: Bill[];
  range?: number;
}

export default function RecentBills({
  recentBills = [],
  deletedBills = [],
  range = 30,
}: Props) {
  const { currencySymbol: sym } = useCurrency();
  const router = useRouter();
  const format = (num: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(num));

  const PaymentBadge = ({ mode }: { mode: string }) => {
    const lower = mode?.toLowerCase() || "";
    const isUPI = lower.includes("upi");
    const Icon = isUPI ? Smartphone : Banknote;
    const colorClass = isUPI 
      ? "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" 
      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

    return (
      <span className={`text-[0.6rem] font-extrabold px-2 py-[3px] rounded-full border flex items-center gap-1 ${colorClass}`}>
        <Icon size={10} />
        {mode.toUpperCase()}
      </span>
    );
  };

  const BillCardContainer = ({
    title,
    bills,
    icon,
    accentColor,
    deleted = false,
  }: {
    title: string;
    bills: Bill[];
    icon: React.ReactNode;
    accentColor: string;
    deleted?: boolean;
  }) => (
    <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[24px] p-6 flex flex-col gap-4 shadow-[var(--kravy-card-shadow)] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--kravy-text-primary)]">{title}</h3>
            <div className="text-[0.68rem] text-[var(--kravy-text-muted)] font-bold">
              {bills.length} record{bills.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push(`/dashboard/billing`)}
          className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] cursor-pointer text-[var(--kravy-text-secondary)]"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Bills List */}
      <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
        {bills.length === 0 ? (
          <div className="text-center py-10 text-[var(--kravy-text-muted)] text-[0.82rem]">📭 No records found</div>
        ) : (
          bills.map((bill, idx) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)] rounded-2xl flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="text-[0.85rem] font-black text-indigo-500 font-mono">#{bill.billNumber}</div>
                  {bill.tokenNumber && (
                    <div className="text-[0.65rem] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">T-{String(bill.tokenNumber).padStart(2, '0')}</div>
                  )}
                </div>
                <div className={`text-base font-black ${deleted ? "text-red-500" : "text-[var(--kravy-text-primary)]"}`}>{sym}{format(bill.total)}</div>
              </div>

              {/* Items in Card */}
              <div className="flex flex-wrap gap-1">
                {bill.items?.map((it: any, i: number) => (
                  <span key={i} className="text-[0.6rem] px-1.5 py-0.5 bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded text-[var(--kravy-text-secondary)] font-bold">
                    {it.name} x{it.quantity || it.qty}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-[var(--kravy-border)] pt-2">
                <div className="flex items-center gap-1.5">
                   <div className="text-xs font-extrabold text-[var(--kravy-text-secondary)]">{bill.customerName || "Walk-in"}</div>
                   <PaymentBadge mode={bill.paymentMode} />
                </div>
                <div className="text-[0.65rem] text-[var(--kravy-text-muted)] font-semibold">{new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
      <BillCardContainer
        title="Recent Sales"
        bills={recentBills}
        icon={<Receipt size={20} />}
        accentColor="#6366F1"
      />
      <BillCardContainer
        title="Deleted History"
        bills={deletedBills}
        icon={<History size={20} />}
        accentColor="#EF4444"
        deleted
      />
    </div>
  );
}
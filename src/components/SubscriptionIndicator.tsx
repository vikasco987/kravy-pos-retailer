"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState } from "react";
import {
  Crown,
  ChevronDown,
  CalendarDays,
  CheckCircle2,
  X,
  Sparkles,
  CreditCard
} from "lucide-react";
import "./SubscriptionIndicator.css";
import { createPortal } from "react-dom";

export default function SubscriptionIndicator({ profile, isSidebar = false }: { profile: any; isSidebar?: boolean }) {
  const { currencySymbol: sym } = useCurrency();

  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Parse dates
  const start = profile.trialStartedAt ? new Date(profile.trialStartedAt) : new Date();
  const end = new Date(profile.premiumEndDate);
  const today = new Date();

  // Calculate days
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const remainingDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const daysLeft = Math.max(0, remainingDays);
  const daysUsed = Math.max(0, totalDays - daysLeft);

  const remainingPercent = totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100))) : 0;
  const usedPercent = 100 - remainingPercent;
  const progress = remainingPercent; // from user's snippet logic

  // Formatting dates
  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const startDate = formatDate(start);
  const expiryDate = formatDate(end);

  // Determine plan name based on total days (roughly)
  let planName = "PREMIUM PLAN";
  if (totalDays >= 1800) planName = "5 YEAR PLAN";
  else if (totalDays >= 1050) planName = "3 YEAR PLAN";
  else if (totalDays >= 690) planName = "2 YEAR PLAN";
  else if (totalDays >= 330) planName = "1 YEAR PLAN";
  else if (totalDays >= 170) planName = "6 MONTH PLAN";
  else if (totalDays >= 80) planName = "3 MONTH PLAN";
  else if (totalDays >= 25) planName = "1 MONTH PLAN";

  const price = profile.subscriptionAmountPaid ? Number(profile.subscriptionAmountPaid) : (totalDays > 300 ? 4000 : (totalDays > 150 ? 2500 : 1000));

  return (
    <div className={`subscription-wrapper ${isSidebar ? "subscription-sidebar-mode w-full" : ""}`}>
      {/* Compact Top-Bar / Sidebar Indicator */}
      <button
        className={`subscription-pill ${isSidebar ? "!w-full !min-w-0 !justify-between" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="plan-icon shrink-0">
            <Crown size={15} />
          </span>

          <span className="plan-info">
            <strong>{planName}</strong>
            <span>{daysLeft} days left</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="mini-progress">
            <span style={{ width: `${Math.min(progress, 100)}%` }} />
          </span>

          <ChevronDown
            size={16}
            className={open ? "rotate shrink-0" : "shrink-0"}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="subscription-overlay"
            onClick={() => setOpen(false)}
          />

          <div className={`subscription-dropdown ${isSidebar ? "!left-0 !right-auto !w-full max-w-[calc(100vw-32px)]" : ""}`}>
            <div className="dropdown-header">
              <div>
                <span className="dropdown-label">
                  SUBSCRIPTION PLAN
                </span>

                <h3>{planName}</h3>
              </div>

              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="cursor-pointer"
                aria-label="Close dropdown"
              >
                <X size={17} className="pointer-events-none" />
              </button>
            </div>

            <div className="days-section">
              <div>
                <strong>{daysLeft}</strong>
                <span> DAYS LEFT</span>
              </div>

              <CheckCircle2
                size={20}
                className="active-icon"
              />
            </div>

            <div className="progress-bar">
              <span
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>

            <div className="expiry">
              <CalendarDays size={17} />
              <span>
                Expires <strong>{expiryDate}</strong>
              </span>
            </div>

            <button 
              className="view-plan" 
              onClick={() => {
                setOpen(false);
                setShowDetails(true);
              }}
            >
              View Subscription
            </button>
          </div>
        </>
      )}

      {/* DETAILS MODAL */}
      {showDetails && typeof document !== "undefined" && createPortal(
        <SubscriptionDetails
          profile={profile}
          planName={planName}
          planDays={totalDays}
          daysUsed={daysUsed}
          daysLeft={daysLeft}
          remainingPercent={remainingPercent}
          usedPercent={usedPercent}
          price={price}
          startDate={startDate}
          expiryDate={expiryDate}
          onClose={() => setShowDetails(false)}
        />,
        document.body
      )}
    </div>
  );
}

function SubscriptionDetails({
  profile,
  planName,
  planDays,
  daysUsed,
  daysLeft,
  remainingPercent,
  usedPercent,
  price,
  startDate,
  expiryDate,
  onClose,
}: {
  profile: any;
  planName: string;
  planDays: number;
  daysUsed: number;
  daysLeft: number;
  remainingPercent: number;
  usedPercent: number;
  price: number;
  startDate: string;
  expiryDate: string;
  onClose: () => void;
}) {
  const { currencySymbol: sym } = useCurrency();
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="relative max-h-[92vh] sm:max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl sm:rounded-3xl border border-white/50 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* TOP GRADIENT */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 px-4 sm:px-6 py-5 sm:py-7 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close modal"
            className="absolute right-3 sm:right-5 top-3 sm:top-5 z-20 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20 text-white cursor-pointer transition-all hover:bg-white/30 active:scale-90"
          >
            <X size={18} className="pointer-events-none" />
          </button>

          <div className="relative pr-8 sm:pr-0">
            <div className="mb-2 sm:mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/15">
                <Sparkles size={16} />
              </div>

              <span className="text-[10px] sm:text-xs font-bold tracking-[0.18em] text-white/80">
                KRAVY SUBSCRIPTION
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black">
                  {planName}
                </h2>

                <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
                  {daysLeft > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white">
                      <CheckCircle2 size={13} />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-red-400/20 px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white">
                      EXPIRED
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:text-right mt-1 sm:mt-0">
                <div className="text-2xl sm:text-3xl font-black">
                  {daysLeft}
                </div>
                <div className="text-[10px] sm:text-xs font-medium text-white/70">
                  DAYS LEFT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-4 sm:space-y-5 p-4 sm:p-6">

          {/* Usage Card */}
          <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Plan Usage
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Your subscription journey
                </p>
              </div>

              <span className="text-xs sm:text-sm font-black text-blue-600">
                {remainingPercent}% Remaining
              </span>
            </div>

            {/* Progress */}
            <div className="h-2.5 sm:h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs sm:text-sm">
              <div>
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Used
                </p>
                <p className="font-bold text-slate-700">
                  {daysUsed} Days
                </p>
              </div>

              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Total Plan
                </p>
                <p className="font-bold text-slate-700">
                  {planDays} Days
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-slate-400">
                  Remaining
                </p>
                <p className="font-bold text-blue-600">
                  {daysLeft} Days
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="mb-2 sm:mb-3 text-sm sm:text-base font-bold text-slate-800">
              Subscription Period
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4">
                <div className="mb-1.5 sm:mb-2 flex items-center gap-2 text-slate-400">
                  <CalendarDays size={14} />
                  <span className="text-[11px] sm:text-xs font-medium">
                    Started
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  {startDate}
                </p>
              </div>

              <div className="rounded-xl sm:rounded-2xl border border-slate-100 p-3 sm:p-4">
                <div className="mb-1.5 sm:mb-2 flex items-center gap-2 text-slate-400">
                  <CalendarDays size={14} />
                  <span className="text-[11px] sm:text-xs font-medium">
                    Expires
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  {expiryDate}
                </p>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="mb-2 sm:mb-3 text-sm sm:text-base font-bold text-slate-800">
              Plan & Payment
            </h3>

            <div className="rounded-xl sm:rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 p-3 sm:p-4 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Plan
                </span>
                <span className="font-bold text-slate-800">
                  {planName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 p-3 sm:p-4 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Estimated Pricing
                </span>
                <span className="font-bold text-slate-800">
                  {sym}{price.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 text-xs sm:text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <CreditCard size={15} />
                  Payment Status
                </span>

                <span className="rounded-full bg-emerald-50 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-emerald-600">
                  ✓ PAID
                </span>
              </div>
            </div>
          </div>

          {/* Renewal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-50 to-violet-50 p-3.5 sm:p-4 mt-4 sm:mt-5">
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Want to continue with Kravy?
              </p>

              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-500">
                Renew your subscription before it expires.
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
                  alert("Profile JSON copied to clipboard!");
                }}
                className="rounded-xl bg-slate-200 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-300 active:scale-95"
              >
                Copy JSON
              </button>
              <button className="rounded-xl bg-slate-900 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95">
                Renew Plan
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

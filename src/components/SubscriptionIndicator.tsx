"use client";

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

export default function SubscriptionIndicator({ profile }: { profile: any }) {
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
    <div className="subscription-wrapper">
      {/* Compact Top-Bar Indicator */}
      <button
        className="subscription-pill"
        onClick={() => setOpen(!open)}
      >
        <span className="plan-icon">
          <Crown size={15} />
        </span>

        <span className="plan-info">
          <strong>{planName}</strong>
          <span>{daysLeft} days left</span>
        </span>

        <span className="mini-progress">
          <span style={{ width: `${Math.min(progress, 100)}%` }} />
        </span>

        <ChevronDown
          size={16}
          className={open ? "rotate" : ""}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="subscription-overlay"
            onClick={() => setOpen(false)}
          />

          <div className="subscription-dropdown">
            <div className="dropdown-header">
              <div>
                <span className="dropdown-label">
                  SUBSCRIPTION PLAN
                </span>

                <h3>{planName}</h3>
              </div>

              <button onClick={() => setOpen(false)}>
                <X size={17} />
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
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/50 bg-white shadow-2xl">
        
        {/* TOP GRADIENT */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 px-6 py-7 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full bg-white/15 p-2 transition hover:bg-white/25"
          >
            <X size={18} />
          </button>

          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Sparkles size={18} />
              </div>

              <span className="text-xs font-bold tracking-[0.18em] text-white/80">
                KRAVY SUBSCRIPTION
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {planName}
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  {daysLeft > 0 ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-bold text-white">
                      <CheckCircle2 size={13} />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-red-400/20 px-2.5 py-1 text-xs font-bold text-white">
                      EXPIRED
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-black">
                  {daysLeft}
                </div>
                <div className="text-xs font-medium text-white/70">
                  DAYS LEFT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-5 p-6">

          {/* Usage Card */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">
                  Plan Usage
                </h3>
                <p className="text-xs text-slate-400">
                  Your subscription journey
                </p>
              </div>

              <span className="text-sm font-black text-blue-600">
                {remainingPercent}% Remaining
              </span>
            </div>

            {/* Progress */}
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                style={{ width: `${remainingPercent}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Used
                </p>
                <p className="font-bold text-slate-700">
                  {daysUsed} Days
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Total Plan
                </p>
                <p className="font-bold text-slate-700">
                  {planDays} Days
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">
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
            <h3 className="mb-3 font-bold text-slate-800">
              Subscription Period
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <CalendarDays size={15} />
                  <span className="text-xs font-medium">
                    Started
                  </span>
                </div>

                <p className="font-bold text-slate-800">
                  {startDate}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <CalendarDays size={15} />
                  <span className="text-xs font-medium">
                    Expires
                  </span>
                </div>

                <p className="font-bold text-slate-800">
                  {expiryDate}
                </p>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="mb-3 font-bold text-slate-800">
              Plan & Payment
            </h3>

            <div className="rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <span className="text-sm text-slate-500">
                  Plan
                </span>
                <span className="font-bold text-slate-800">
                  {planName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <span className="text-sm text-slate-500">
                  Estimated Pricing
                </span>
                <span className="font-bold text-slate-800">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between p-4">
                <span className="flex items-center gap-2 text-sm text-slate-500">
                  <CreditCard size={15} />
                  Payment Status
                </span>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  ✓ PAID
                </span>
              </div>
            </div>
          </div>

          {/* Renewal */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-50 to-violet-50 p-4 mt-5">
            <div>
              <p className="font-bold text-slate-800">
                Want to continue with Kravy?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Renew your subscription before it expires.
              </p>
            </div>

            <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800">
              Renew Plan
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";
import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import MobileEditMenuView from "../components/MobileEditMenuView";

function EditMenuItemDirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const asUserId = searchParams ? searchParams.get("asUserId") || undefined : undefined;

  return (
    <MobileEditMenuView
      asUserId={asUserId}
      onSwitchToDesktop={() => {
        const params = searchParams ? searchParams.toString() : "";
        router.push(params ? `/dashboard/menu/view?${params}` : "/dashboard/menu/view");
      }}
    />
  );
}

export default function EditMenuItemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <EditMenuItemDirectContent />
    </Suspense>
  );
}

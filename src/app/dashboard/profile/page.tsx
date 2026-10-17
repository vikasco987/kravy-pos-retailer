"use client";

import { useEffect, useState, useCallback } from "react";
import BusinessProfile from "./BusinessProfile";
import ProfileEmpty from "./empty";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Store, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function Page() {
  const router = useRouter();
  const { updateProfile } = useProfileCache();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [enableMultipleProfiles, setEnableMultipleProfiles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/profiles", {
        cache: "no-store",
      });

      if (!res.ok) {
        setProfiles([]);
        return;
      }

      const data = await res.json();
      
      setProfiles(data.profiles || []);
      setEnableMultipleProfiles(data.enableMultipleProfiles || false);
      
    } catch (err) {
      console.error("Profile fetch error:", err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const toggleMultipleProfiles = async () => {
    const newValue = !enableMultipleProfiles;
    setEnableMultipleProfiles(newValue);
    
    // Save to server
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableMultipleProfiles: newValue })
      });
      updateProfile({ enableMultipleProfiles: newValue }, false);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-20 rounded-2xl bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)]" />
        <div className="h-64 rounded-[40px] bg-[var(--kravy-bg-2)] border border-[var(--kravy-border)]" />
      </div>
    );
  }

  // Edit an existing profile or create a new one
  if (selectedProfileIndex !== null || isCreatingNew) {
    const profileData = isCreatingNew ? {} : profiles[selectedProfileIndex!];
    return (
      <div className="w-full space-y-4">
        {enableMultipleProfiles && (
          <Button variant="outline" onClick={() => { setSelectedProfileIndex(null); setIsCreatingNew(false); }}>
            ← Back to Profiles
          </Button>
        )}
        <BusinessProfile
          data={profileData}
          onProfileUpdated={() => {
            fetchProfiles();
            if (isCreatingNew) setIsCreatingNew(false);
            if (!enableMultipleProfiles) setSelectedProfileIndex(null); // Keep it open if single mode
          }}
          isNew={isCreatingNew}
        />
      </div>
    );
  }

  // Single Profile Mode
  if (!enableMultipleProfiles) {
    if (profiles.length === 0) {
      return (
        <div className="space-y-4 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="Back"
            >
              <ArrowLeft size={18} className="text-slate-600 dark:text-white" />
            </button>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Business Profile</h1>
          </div>
          <Card className="p-6 flex items-center justify-between rounded-3xl bg-[var(--kravy-surface)] border-[var(--kravy-border)]">
            <div>
              <h3 className="font-bold text-lg">Multi-Business Profiles</h3>
              <p className="text-sm text-slate-500">Manage multiple restaurants from a single account.</p>
            </div>
            <Switch checked={enableMultipleProfiles} onCheckedChange={toggleMultipleProfiles} />
          </Card>
          <ProfileEmpty />
        </div>
      );
    }

    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-white" />
          </button>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">Business Profile</h1>
        </div>
        <Card className="p-4 sm:p-6 flex items-center justify-between rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border-[var(--kravy-border)] shadow-sm gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg truncate">Multi-Business Profiles</h3>
            <p className="text-xs sm:text-sm text-slate-500">Manage multiple restaurants from a single account.</p>
          </div>
          <Switch checked={enableMultipleProfiles} onCheckedChange={toggleMultipleProfiles} className="shrink-0" />
        </Card>
        <BusinessProfile
          data={profiles[0]}
          onProfileUpdated={fetchProfiles}
        />
      </div>
    );
  }

  // Multi-Profile List Mode
  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
          title="Back"
        >
          <ArrowLeft size={18} className="text-slate-600 dark:text-white" />
        </button>
        <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">Business Profile</h1>
      </div>
      <Card className="p-4 sm:p-6 flex items-center justify-between rounded-2xl sm:rounded-3xl bg-[var(--kravy-surface)] border-[var(--kravy-border)] shadow-sm gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-base sm:text-lg truncate">Multi-Business Profiles</h3>
          <p className="text-xs sm:text-sm text-slate-500">Manage multiple restaurants from a single account.</p>
        </div>
        <Switch checked={enableMultipleProfiles} onCheckedChange={toggleMultipleProfiles} className="shrink-0" />
      </Card>

      <div>
        <h2 className="text-2xl font-black mb-6">Your Businesses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p, idx) => (
            <Card 
              key={p.id} 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border border-slate-200 rounded-3xl bg-white hover:border-indigo-300"
              onClick={() => setSelectedProfileIndex(idx)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{p.businessName || "Unnamed Business"}</h3>
                  <p className="text-xs text-slate-500">{p.district || p.state || "No Location"}</p>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                <p>Phone: {p.contactPersonPhone || "N/A"}</p>
                <p>GST: {p.gstNumber || "N/A"}</p>
              </div>
            </Card>
          ))}

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all border border-dashed border-slate-300 rounded-3xl bg-slate-50 flex flex-col items-center justify-center min-h-[160px] hover:border-indigo-400 hover:bg-indigo-50"
            onClick={() => setIsCreatingNew(true)}
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <Plus size={24} />
            </div>
            <h3 className="font-bold text-indigo-900">Add New Business</h3>
            <p className="text-xs text-slate-500 text-center mt-1">Create another profile</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

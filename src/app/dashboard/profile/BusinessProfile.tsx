"use client";
// // src/app/profile/page.tsx
// // import React, { useEffect, useState } from "react";
// import BusinessProfileCard from "@/components/profile/BusinessProfileCard";
// import ProfileForm from "@/components/profile/ProfileForm";

// type ProfileType = any;

// export default function ProfilePage() {
//   const [profile, setProfile] = useState<ProfileType | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [editing, setEditing] = useState<boolean>(false);
//   const [notice, setNotice] = useState<string | null>(null);

//   const loadProfile = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetch("/api/profile");
//       if (res.status === 404) {
//         // no profile yet
//         setProfile(null);
//         setLoading(false);
//         return;
//       }
//       if (!res.ok) {
//         const txt = await res.text().catch(() => "");
//         throw new Error(txt || `Failed to fetch (${res.status})`);
//       }
//       const data = await res.json();
//       setProfile(data);
//     } catch (err: any) {
//       console.error("Profile load error:", err);
//       setError(err?.message ?? "Failed to load profile");
//       setProfile(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     void loadProfile();
//   }, []);

//   const handleEditToggle = () => {
//     setEditing((s) => !s);
//   };

//   const handleSaved = async () => {
//     // called by ProfileForm after successful save
//     setNotice("Saved successfully");
//     setEditing(false);
//     // reload profile and show it
//     await loadProfile();
//     window.setTimeout(() => setNotice(null), 2500);
//   };

//   return (
//     <div className="profile-page-wrapper">
//       <div className="profile-page-container">
//         <h1 className="profile-page-title">Business Profile</h1>

//         {notice && (
//           <div className="pp-toast pp-toast--success" role="status">
//             {notice}
//             <button className="pp-toast-close" onClick={() => setNotice(null)}>✕</button>
//           </div>
//         )}

//         <section className="profile-section">
//           {loading ? (
//             <div className="card profile-loading">
//               Loading profile...
//             </div>
//           ) : error ? (
//             <div className="card">
//               <div style={{ color: "#b91c1c", fontWeight: 700 }}>Error</div>
//               <div style={{ marginTop: 8 }}>{error}</div>
//             </div>
//           ) : editing ? (
//             // Edit mode: show the form with initialData (profile may be null for create)
//             <div className="card">
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
//                 <div style={{ fontWeight: 700 }}>Edit Business Profile</div>
//                 <div style={{ display: "flex", gap: 8 }}>
//                   <button className="btn ghost small" onClick={() => setEditing(false)}>Cancel</button>
//                 </div>
//               </div>

//               <ProfileForm initialData={profile} onSaved={handleSaved} />
//             </div>
//           ) : (
//             // View mode: show the saved card OR a prompt to create
//             <>
//               {profile ? (
//                 <div className="card card-body horizontal">
//                   <div style={{ flex: 1 }}>
//                     <BusinessProfileCard profile={profile} />
//                     <div style={{ marginTop: 14 }}>
//                       <div className="action-buttons">
//                         <button className="btn primary small" onClick={() => setEditing(true)}>Edit</button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="card">
//                   <p style={{ margin: 0, fontWeight: 700 }}>No business profile found.</p>
//                   <p style={{ marginTop: 8, color: "#475569" }}>Click below to create one.</p>
//                   <div style={{ marginTop: 14 }}>
//                     <button className="btn primary" onClick={() => setEditing(true)}>Create Profile</button>
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </section>
//       </div>
//     </div>
//   );
// }




import { useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Activity } from "lucide-react";

import BusinessProfileForm from "./_components/BusinessProfileForm";

export default function BusinessProfile({
  data,
  onProfileUpdated,
  isNew = false,
}: {
  data: any;
  onProfileUpdated: () => void;
  isNew?: boolean;
}) {
  const [editMode, setEditMode] = useState(isNew);

  if (editMode) {
    return (
      <BusinessProfileForm
        mode={isNew ? "create" : "edit"}
        defaultValues={{
          businessType: data.businessType,
          businessName: data.businessName,
          businessTagline: data.businessTagLine,

          contactName: data.contactPersonName,
          contactPhone: data.contactPersonPhone,
          contactEmail: data.contactPersonEmail,

          upi: data.upi,
          gstNumber: data.gstNumber,

          businessAddress: data.businessAddress,
          state: data.state,
          district: data.district,
          pinCode: data.pinCode,

          profileImageUrl: data.profileImageUrl,
          logoUrl: data.logoUrl,
          signatureUrl: data.signatureUrl,
          upiQrEnabled: data.upiQrEnabled,
          greetingMessage: data.greetingMessage,
          businessNameSize: data.businessNameSize,
          fssaiNumber: data.fssaiNumber,
          fssaiEnabled: data.fssaiEnabled,
          enableMenuQRInBill: data.enableMenuQRInBill,
          enableClerkAuth: data.enableClerkAuth,
          enableCustomAuth: data.enableCustomAuth,
          tokenNumberSize: data.tokenNumberSize,
          businessAddressSize: data.businessAddressSize,
          userId: data.userId, 
          id: data.id,
        }}
        onCancel={() => setEditMode(false)}
        onSuccess={() => {
          setEditMode(false);
          onProfileUpdated();
        }}
      />
    );
  }
  /* ================= SMALL HELPERS ================= */

  function Info({
    label,
    value,
    fallback = "-",
  }: {
    label: string;
    value?: string | null;
    fallback?: string;
  }) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs sm:text-sm py-1.5 border-b border-[var(--kravy-border)]/40 last:border-b-0">
        <span className="text-[var(--kravy-text-muted)] font-medium shrink-0">{label}</span>
        <span className="font-bold text-left sm:text-right text-[var(--kravy-text-primary)] break-all min-w-0">
          {value || fallback}
        </span>
      </div>
    );
  }

  function BrandBox({
    label,
    url,
  }: {
    label: string;
    url?: string | null;
  }) {
    return (
      <div className="text-center group">
        <div className="relative h-28 sm:h-32 w-full rounded-2xl border border-[var(--kravy-border)] bg-[var(--kravy-bg-2)] overflow-hidden shadow-inner group-hover:border-indigo-500/50 transition-colors">
          <Image
            src={url || "/no-image.png"}
            alt={label}
            fill
            className="object-contain p-4"
          />
        </div>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-semibold">{label}</p>
      </div>
    );
  }


  return (
    <div className="w-full transition-colors duration-300">
      <Card className="rounded-2xl sm:rounded-[32px] lg:rounded-[40px] bg-[var(--kravy-surface)] backdrop-blur-xl shadow-2xl border border-[var(--kravy-border)] overflow-hidden">
        {/* ================= TOP PROFILE ================= */}
        <div className="relative px-4 sm:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          {/* Edit */}
          <Button
            size="sm"
            variant="outline"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full shadow-sm text-xs"
            onClick={() => setEditMode(true)}
          >
            <Pencil size={13} />
            Edit
          </Button>

          {/* Avatar */}
          <div className="mx-auto w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-[var(--kravy-brand)] via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20">
            <div className="relative w-full h-full rounded-full overflow-hidden bg-[var(--kravy-bg-2)] border-4 border-[var(--kravy-surface)]">
              <Image
                src={data.profileImageUrl || data.logoUrl || "/no-image.png"}
                alt="Business Profile"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-[var(--kravy-text-primary)]">
            {data.businessName}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {data.businessTagLine || "—"}
          </p>

          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {data.state && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-[var(--kravy-brand)]/10 text-[var(--kravy-brand)] border border-[var(--kravy-brand)]/20">
                {data.state}
              </span>
            )}
            {data.district && (
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-500/10 text-purple-500 border border-purple-500/20">
                {data.district}
              </span>
            )}
          </div>
        </div>

        {/* ================= DETAILS GRID ================= */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-8 py-6 sm:py-8">
          {/* CONTACT */}
          <div>
            <h3 className="text-xs font-black text-[var(--kravy-text-muted)] mb-3 sm:mb-5 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3 bg-[var(--kravy-brand)] rounded-full shrink-0" />
              Customer Information
            </h3>

            <div className="space-y-2 bg-[var(--kravy-bg-2)] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[var(--kravy-border)]">
              <Info label="Contact Person" value={data.contactPersonName} />
              <Info label="Phone" value={data.contactPersonPhone} />
              <Info label="Email" value={data.contactPersonEmail} />
              <Info label="UPI" value={data.upi} fallback="Not Added" />
            </div>
          </div>

          {/* BUSINESS */}
          <div>
            <h3 className="text-xs font-bold text-[var(--kravy-text-muted)] mb-3 sm:mb-5 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-3 bg-purple-500 rounded-full shrink-0" />
              Business Details
            </h3>

            <div className="space-y-2 bg-[var(--kravy-bg-2)] p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[var(--kravy-border)]">
              <Info label="Business Type" value={data.businessType} />
              <Info label="GST Number" value={data.gstNumber} fallback="Not Registered" />
              <Info label="Address" value={data.businessAddress} />
              <Info label="State" value={data.state} />
              <Info label="District" value={data.district} />
              <Info label="PIN Code" value={data.pinCode} />
              <Info label="FSSAI Number" value={data.fssaiNumber} fallback="Not Added" />
              {data.fssaiNumber && (
                <div className="flex justify-between gap-4 text-xs py-1">
                  <span className="text-[var(--kravy-text-muted)] font-medium italic">Print FSSAI on Bill</span>
                  <span className={`font-bold ${data.fssaiEnabled ? "text-green-500" : "text-red-500"}`}>
                    {data.fssaiEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= BRANDING ================= */}
        <div className="border-t border-[var(--kravy-border)] mx-4 sm:mx-8" />

        <div className="px-4 sm:px-8 py-6 sm:py-8">
          <h3 className="text-xs font-black text-[var(--kravy-text-muted)] mb-3 sm:mb-5 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-3 bg-pink-500 rounded-full shrink-0" />
            Branding
          </h3>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <BrandBox label="Logo" url={data.logoUrl} />
            <BrandBox label="Signature" url={data.signatureUrl} />
          </div>
        </div>
      </Card>
    </div>
  );
}

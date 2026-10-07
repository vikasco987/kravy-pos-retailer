"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Download, FileJson, ClipboardPaste, Info, AlertCircle, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { uploadToCloudinary } from "@/lib/cloudinary-client";
import { INDIA_STATE_DISTRICT } from "@/lib/india-state-district";


/* ---------------- SCHEMA ---------------- */
const schema = z.object({
  id: z.string().optional(),
  businessType: z.string().nullable().optional(),
  businessName: z.string().min(1, "Required"),
  businessTagline: z.string().nullable().optional(),

  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().email().or(z.literal('')).nullable().optional(),

  upi: z.string().nullable().optional(),
  gstNumber: z.string().nullable().optional(),

  businessAddress: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  pinCode: z.string().nullable().optional(),
  
  upiQrEnabled: z.boolean().nullable().optional(),
  menuLinkEnabled: z.boolean().nullable().optional(),
  greetingMessage: z.string().nullable().optional(),
  businessNameSize: z.string().nullable().optional(),
  fssaiNumber: z.string().nullable().optional(),
  fssaiEnabled: z.boolean().nullable().optional(),
  hsnEnabled: z.boolean().nullable().optional(),
  enableMenuQRInBill: z.boolean().nullable().optional(),
  enableClerkAuth: z.boolean().nullable().optional(),
  enableCustomAuth: z.boolean().nullable().optional(),
  tokenNumberSize: z.number().nullable().optional(),
  businessAddressSize: z.number().nullable().optional(),
  phonePrefixType: z.string().nullable().optional(),
  
  qrMenuShowDetails: z.boolean().nullable().optional(),
  qrMenuCuisines: z.string().nullable().optional(),
  qrMenuRating: z.string().nullable().optional(),
  qrMenuDeliveryTime: z.string().nullable().optional(),
  qrMenuCostForTwo: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function BusinessProfileForm({
  mode,
  defaultValues,
  onCancel,
  onSuccess,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<FormValues> & {
    profileImageUrl?: string;
    logoUrl?: string;
    signatureUrl?: string;
    upiQrEnabled?: boolean;
    userId?: string;
    id?: string;
  };
  onCancel?: () => void;
  onSuccess?: () => void;
}) {

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState(defaultValues?.state || "");
  const [pastedJson, setPastedJson] = useState("");
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);


  const [profilePreview, setProfilePreview] = useState<string | null>(
    defaultValues?.profileImageUrl || null
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    defaultValues?.logoUrl || null
  );
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    defaultValues?.signatureUrl || null
  );

  const { register, handleSubmit, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSchemaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => applyJsonToForm(event.target?.result as string);
    reader.readAsText(file);
  };

  const applyJsonToForm = async (jsonStr: string) => {
    try {
      const json = JSON.parse(jsonStr);
      setLoading(true);
      
      // 1. Merge pasted JSON with current payload structure
      // This ensures both 'contactName' and 'contactPersonName' style keys work
      const payload = {
        ...json, // Spread everything from the pasted JSON
        
        // Ensure standard keys exist (API will prioritize these if available)
        businessType: json.businessType ?? defaultValues?.businessType,
        businessName: json.businessName ?? defaultValues?.businessName,
        businessTagline: json.businessTagline ?? json.businessTagLine ?? defaultValues?.businessTagline,

        contactName: json.contactName ?? json.contactPersonName,
        contactPhone: json.contactPhone ?? json.contactPersonPhone,
        contactEmail: json.contactEmail ?? json.contactPersonEmail,

        upi: json.upi ?? defaultValues?.upi,

        profileImage: json.profileImageUrl ?? json.profileImage ?? defaultValues?.profileImageUrl,
        logo: json.logoUrl ?? json.logo ?? defaultValues?.logoUrl,
        signature: json.signatureUrl ?? json.signature ?? defaultValues?.signatureUrl,

        gstNumber: json.gstNumber ?? defaultValues?.gstNumber,
        businessAddress: json.businessAddress ?? defaultValues?.businessAddress,
        state: json.state ?? defaultValues?.state,
        district: json.district ?? defaultValues?.district,
        pinCode: json.pinCode ?? defaultValues?.pinCode,
        
        qrMenuShowDetails: json.qrMenuShowDetails ?? defaultValues?.qrMenuShowDetails,
        qrMenuCuisines: json.qrMenuCuisines ?? defaultValues?.qrMenuCuisines,
        qrMenuRating: json.qrMenuRating ?? defaultValues?.qrMenuRating,
        qrMenuDeliveryTime: json.qrMenuDeliveryTime ?? defaultValues?.qrMenuDeliveryTime,
        qrMenuCostForTwo: json.qrMenuCostForTwo ?? defaultValues?.qrMenuCostForTwo,
      };

      // 2. Direct POST to API
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API Save Failed");

      // 3. UI Update (Success)
      reset(json);
      if (json.profileImageUrl || json.profileImage) setProfilePreview(json.profileImageUrl || json.profileImage);
      if (json.logoUrl || json.logo) setLogoPreview(json.logoUrl || json.logo);
      if (json.signatureUrl || json.signature) setSignaturePreview(json.signatureUrl || json.signature);
      if (json.state) setSelectedState(json.state);
      
      alert("Schema applied and profile updated successfully! 🎉");
      setIsPasteModalOpen(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      alert("Error: Schema format invalid or connection issue.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSchema = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(watchedValues, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "business_profile_schema.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const watchedValues = watch();

  async function onSubmit(values: FormValues) {
    setLoading(true);

    try {
      const getFile = (id: string) =>
        (document.getElementById(id) as HTMLInputElement)?.files?.[0];

      const profileImageUrl = getFile("profileImage")
        ? await uploadToCloudinary(getFile("profileImage")!)
        : defaultValues?.profileImageUrl || null;

      const logoUrl = getFile("logo")
        ? await uploadToCloudinary(getFile("logo")!)
        : defaultValues?.logoUrl || null;

      const signatureUrl = getFile("signature")
        ? await uploadToCloudinary(getFile("signature")!)
        : defaultValues?.signatureUrl || null;

      // ✅ EXPLICIT PAYLOAD (MATCHES API 1:1)
      const payload = {
        id: defaultValues?.id,
        isNewProfile: mode === "create",
        businessType: values.businessType,
        businessName: values.businessName,
        businessTagline: values.businessTagline || null,

        contactName: values.contactName,
        contactPhone: values.contactPhone,
        contactEmail: values.contactEmail,

        upi: values.upi || null,

        profileImage: profileImageUrl,
        logo: logoUrl,
        signature: signatureUrl,

        gstNumber: values.gstNumber || null,
        businessAddress: values.businessAddress || null,
        state: values.state,
        district: values.district,
        pinCode: values.pinCode || null,
        
        upiQrEnabled: values.upiQrEnabled,
        menuLinkEnabled: values.menuLinkEnabled,
        greetingMessage: values.greetingMessage,
        businessNameSize: values.businessNameSize,
        fssaiNumber: values.fssaiNumber || null,
        fssaiEnabled: values.fssaiEnabled || false,
        hsnEnabled: values.hsnEnabled || false,
        enableMenuQRInBill: values.enableMenuQRInBill || false,
        enableClerkAuth: values.enableClerkAuth,
        enableCustomAuth: values.enableCustomAuth,
        tokenNumberSize: values.tokenNumberSize || 22,
        businessAddressSize: values.businessAddressSize || 12,
        phonePrefixType: values.phonePrefixType || "TEXT",
        
        qrMenuShowDetails: values.qrMenuShowDetails !== undefined ? values.qrMenuShowDetails : true,
        qrMenuCuisines: values.qrMenuCuisines || "North Indian, Mughlai, Biryani",
        qrMenuRating: values.qrMenuRating || "4.3 (2.1K)",
        qrMenuDeliveryTime: values.qrMenuDeliveryTime || "20-30 min",
        qrMenuCostForTwo: values.qrMenuCostForTwo || "₹350 for two",
      };

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const status = res.status;
        const text = await res.text().catch(() => "No response text");
        console.error(`Save failed (${status}):`, text);
        
        let errorMsg = "Unknown Server Error";
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.details || errData.error || errorMsg;
        } catch (e) {}

        alert(`Failed to save profile (Status ${status}): ${errorMsg}`);
        return;
      }

      const savedData = await res.json();
      console.log("Profile Saved Successfully:", savedData);
      
      // ✅ SUCCESS
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error("Submit error:", err);
      alert("Something went wrong while saving your profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-[1400px] mx-auto p-6 items-start">
      <form
        onSubmit={handleSubmit(onSubmit, (errors) => {
          console.group("🚫 Validation Errors Details");
          console.error("Full Errors Object:", errors);
          Object.keys(errors).forEach(key => {
            console.error(`Field "${key}":`, errors[key as keyof typeof errors]);
          });
          console.groupEnd();
          toast.error("Please fix the validation errors in the form");
        })}
        className="flex-1 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 transition-colors"
      >
      {/* SCHEMA ACTIONS */}
      <div className="flex flex-col gap-6 bg-[var(--kravy-surface)] p-6 rounded-[32px] border border-[var(--kravy-border)] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileJson size={120} />
        </div>
        
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-black text-[var(--kravy-text-primary)] flex items-center gap-2 tracking-tight">
            <Sparkles className="text-indigo-500" size={20} />
            Schema Management
          </h3>
          <p className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-widest">Bulk Setup via JSON Schema</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-3 px-6 py-3 bg-indigo-500 text-white rounded-2xl cursor-pointer hover:bg-indigo-600 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 group">
            <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            Upload JSON File
            <input type="file" accept=".json" hidden onChange={handleSchemaUpload} />
          </label>

          <Sheet open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
            <SheetTrigger asChild>
              <button 
                type="button"
                className="flex items-center gap-3 px-6 py-3 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-primary)] rounded-2xl hover:border-indigo-500/50 border border-[var(--kravy-border)] transition-all text-[11px] font-black uppercase tracking-widest active:scale-95"
              >
                <ClipboardPaste size={16} />
                Paste Schema Text
              </button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-xl bg-[var(--kravy-surface)] border-[var(--kravy-border)] p-8 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-2xl font-black text-[var(--kravy-text-primary)] tracking-tight">Paste Business Schema</SheetTitle>
                <SheetDescription className="text-sm font-bold text-[var(--kravy-text-muted)]">Paste your business configuration JSON below to auto-fill the form</SheetDescription>
              </SheetHeader>
              <div className="mt-8 space-y-6">
                <Textarea 
                  placeholder='{ "businessName": "My Awesome Store", ... }'
                  className="min-h-[400px] font-mono text-xs bg-[var(--kravy-bg-2)] border-[var(--kravy-border)] rounded-2xl p-6 focus:ring-2 focus:ring-indigo-500/20 transition-all text-[var(--kravy-text-primary)]"
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                />
                <div className="flex flex-col gap-3">
                  <Button className="w-full bg-indigo-500 text-white font-black py-4 rounded-xl" onClick={() => applyJsonToForm(pastedJson)}>Apply Schema Data</Button>
                  <Button variant="ghost" className="w-full" onClick={() => setIsPasteModalOpen(false)}>Close & Reset</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <button 
            type="button"
            onClick={handleDownloadSchema}
            className="flex items-center gap-3 px-6 py-3 bg-[var(--kravy-bg-2)] text-[var(--kravy-text-muted)] rounded-2xl hover:text-indigo-500 transition-all text-[11px] font-black uppercase tracking-widest border border-dashed border-[var(--kravy-border)] hover:border-indigo-500/50 active:scale-95"
          >
            <Download size={16} />
            Format Template
          </button>
        </div>

        {/* GUIDELINES */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-[var(--kravy-border)] border-dashed">
          <div className="space-y-3 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
              <Info size={12} /> Format Guide
            </h4>
            <ul className="text-[10px] font-bold text-[var(--kravy-text-muted)] space-y-1 ml-1">
              <li>• Key: <code className="text-blue-500">businessName</code> (String, REQUIRED)</li>
              <li>• Key: <code className="text-blue-500">state</code> / <code className="text-blue-500">district</code> (Valid Indian names)</li>
              <li>• Key: <code className="text-blue-500">upiQrEnabled</code> (Boolean: true/false)</li>
              <li>• Key: <code className="text-blue-500">pinCode</code> (String, 6 digits)</li>
            </ul>
          </div>
          <div className="space-y-3 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} /> Conditions
            </h4>
            <ul className="text-[10px] font-bold text-[var(--kravy-text-muted)] space-y-1 ml-1">
              <li>• Image URLs must be from <code className="text-amber-500">cloudinary</code> or <code className="text-amber-500">unsplash</code></li>
              <li>• Mandatory fields must not be empty or null</li>
              <li>• Invalid JSON will be rejected to prevent data loss</li>
            </ul>
          </div>
        </div>
      </div>

      {/* BUSINESS */}
      <Section title="Business Information">
        <Field label="Business Type">
          <select {...register("businessType")} className="w-full bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl h-11 px-4 focus:ring-2 focus:ring-[var(--kravy-brand)]/20 transition-all outline-none font-bold">
            <option value="">Select</option>
            <option value="food">Restaurant / Food</option>
            <option value="retail">Retail</option>
            <option value="service">Service</option>
          </select>
        </Field>

        <Field label="Business Name">
          <Input {...register("businessName")} />
        </Field>

        <Field label="Tagline">
          <Input {...register("businessTagline")} />
        </Field>

        <Field label="Store Name Size">
          <select {...register("businessNameSize")} className="w-full bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl h-11 px-4 outline-none font-bold">
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xlarge">Extra Large</option>
          </select>
        </Field>
      </Section>

      {/* FOOTER */}
      <Section title="Receipt Customization">
        <Field label="Greeting Message">
          <Input {...register("greetingMessage")} placeholder="Thank You 🙏 Visit Again!" />
        </Field>

        <Field label={`Token Number Size (${watchedValues.tokenNumberSize || 22}px)`}>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="10" 
              max="48" 
              step="1"
              {...register("tokenNumberSize", { valueAsNumber: true })}
              className="flex-1 accent-[var(--kravy-brand)]"
            />
            <span className="text-xs font-black w-8">{watchedValues.tokenNumberSize || 22}</span>
          </div>
          <p className="text-[10px] text-[var(--kravy-text-muted)] mt-1 italic">Controls token size on Bill & KOT. Default is 22px.</p>
        </Field>

        <Field label={`Address Font Size (${watchedValues.businessAddressSize || 12}px)`}>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="8" 
              max="24" 
              step="1"
              {...register("businessAddressSize", { valueAsNumber: true })}
              className="flex-1 accent-purple-500"
            />
            <span className="text-xs font-black w-8">{watchedValues.businessAddressSize || 12}</span>
          </div>
          <p className="text-[10px] text-[var(--kravy-text-muted)] mt-1 italic">Decrease to fit long addresses. Default is 12px.</p>
        </Field>

        <Field label="Phone Prefix Style">
          <select 
            {...register("phonePrefixType")} 
            className="w-full bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl h-11 px-4 outline-none font-bold"
          >
            <option value="TEXT">Text (Mob: )</option>
            <option value="SYMBOL">Symbol (📞 )</option>
          </select>
          <p className="text-[10px] text-[var(--kravy-text-muted)] mt-1 italic">Choose how the phone number is labeled on the bill.</p>
        </Field>
      </Section>

      {/* CONTACT */}
      <Section title="Contact Details">
        <Input {...register("contactName")} placeholder="Contact Person" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        <Input {...register("contactPhone")} placeholder="Phone" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        <Input {...register("contactEmail")} placeholder="Email" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        
        <div className="flex flex-col gap-4">
          <Input {...register("upi")} placeholder="UPI ID" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("upiQrEnabled")} 
              className="w-5 h-5 rounded min-w-[20px] accent-[var(--kravy-brand)]"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable UPI QR on Bill</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Prints a scannable QR code along with the bill</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("menuLinkEnabled")} 
              className="w-5 h-5 rounded min-w-[20px] accent-[var(--kravy-brand)]"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Share Menu Link in WhatsApp</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Include your online menu link in the invoice message</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("enableMenuQRInBill")} 
              className="w-5 h-5 rounded min-w-[20px] accent-indigo-500"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Print Menu QR on Bill</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Prints a scannable QR for your digital menu on receipts</p>
            </div>
          </label>
        </div>
      </Section>

      {/* ADDRESS */}
      <Section title="Business Address">
        <Input {...register("businessAddress")} placeholder="Full Address" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />

        <select
          {...register("state")}
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl h-11 px-4 outline-none font-bold focus:ring-2 focus:ring-[var(--kravy-brand)]/20"
        >
          <option value="">Select State</option>
          {Object.keys(INDIA_STATE_DISTRICT).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select {...register("district")} className="w-full bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)] rounded-xl h-11 px-4 outline-none font-bold focus:ring-2 focus:ring-[var(--kravy-brand)]/20">
          <option value="">Select District</option>
          {selectedState &&
            INDIA_STATE_DISTRICT[selectedState]?.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
        </select>

        <Input {...register("pinCode")} placeholder="PIN Code" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        <Input {...register("gstNumber")} placeholder="GST Number" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        
        <div className="flex flex-col gap-4">
          <Input {...register("fssaiNumber")} placeholder="FSSAI Number" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("fssaiEnabled")} 
              className="w-5 h-5 rounded min-w-[20px] accent-[var(--kravy-brand)]"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable FSSAI on Bill</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Prints your FSSAI license number on receipts</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("hsnEnabled")} 
              className="w-5 h-5 rounded min-w-[20px] accent-[var(--kravy-brand)]"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable HSN on Bill</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Prints HSN codes for products on receipts</p>
            </div>
          </label>
        </div>
      </Section>


      {/* AUTHENTICATION SETTINGS */}
      <Section title="Authentication Settings">
        <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
          <input 
            type="checkbox" 
            {...register("enableClerkAuth")} 
            className="w-5 h-5 rounded min-w-[20px] accent-blue-500"
          />
          <div>
            <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable Clerk Authentication</p>
            <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Use Clerk for enterprise-grade login and security</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
          <input 
            type="checkbox" 
            {...register("enableCustomAuth")} 
            className="w-5 h-5 rounded min-w-[20px] accent-emerald-500"
          />
          <div>
            <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Enable Custom OTP Authentication</p>
            <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Allow users to sign up using Phone/Email with OTP</p>
          </div>
        </label>
      </Section>

      {/* QR MENU APPEARANCE */}
      <Section title="QR Menu Appearance">
        <div className="md:col-span-2 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer bg-[var(--kravy-bg-2)] p-4 rounded-xl border border-[var(--kravy-border)] hover:border-indigo-500/50 transition-colors">
            <input 
              type="checkbox" 
              {...register("qrMenuShowDetails")} 
              className="w-5 h-5 rounded min-w-[20px] accent-indigo-500"
            />
            <div>
              <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Show Restaurant Details Banner</p>
              <p className="text-xs text-[var(--kravy-text-muted)] mt-0.5">Displays cuisines, rating, delivery time, and cost for two below the logo</p>
            </div>
          </label>
        </div>

        <Field label="Cuisines / Tags">
          <Input {...register("qrMenuCuisines")} placeholder="e.g. North Indian, Mughlai, Biryani" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        </Field>
        <Field label="Rating Text">
          <Input {...register("qrMenuRating")} placeholder="e.g. 4.3 (2.1K)" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        </Field>
        <Field label="Preparation / Delivery Time">
          <Input {...register("qrMenuDeliveryTime")} placeholder="e.g. 20-30 min" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        </Field>
        <Field label="Cost for Two">
          <Input {...register("qrMenuCostForTwo")} placeholder="e.g. ₹350 for two" className="h-11 rounded-xl bg-[var(--kravy-input-bg)] border-[var(--kravy-input-border)] text-[var(--kravy-text-primary)]" />
        </Field>
      </Section>

      {/* MEDIA */}
      <Section title="Branding">
        <DragDrop id="profileImage" label="Profile Image" preview={profilePreview} setPreview={setProfilePreview} />
        <DragDrop id="logo" label="Logo" preview={logoPreview} setPreview={setLogoPreview} />
        <DragDrop id="signature" label="Signature" preview={signaturePreview} setPreview={setSignaturePreview} />
      </Section>

      {/* ACTION */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-[var(--kravy-brand)] text-white font-black px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>

    {/* LIVE BILL PREVIEW */}
    <div className="w-[380px] shrink-0 sticky top-24 hidden xl:block shadow-2xl rounded-[32px] overflow-hidden border border-[var(--kravy-border)] bg-[var(--kravy-surface)] animate-in fade-in slide-in-from-right-8 transition-all">
      <div className="px-6 py-5 border-b border-[var(--kravy-border)] bg-[var(--kravy-bg-2)]/50">
        <h3 className="text-base font-black text-[var(--kravy-text-primary)] tracking-tight">Live Receipt Preview</h3>
        <p className="text-[10px] font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mt-0.5">See how your printed bill looks</p>
      </div>
      <div className="p-8 bg-[#E5E5E5] dark:bg-[#1A1A1A] flex justify-center min-h-[500px]">
        <div 
          className="bg-white text-black p-4 shadow-xl origin-top mx-auto filter hover:brightness-[0.98] transition-all"
          style={{ width: '58mm', minHeight: '100px', transform: 'scale(1.3)', marginBottom: '30px' }}
        >
          <div className="font-mono text-[10px] leading-tight">
            {logoPreview && (
              <div className="flex justify-center mb-1">
                <img src={logoPreview} alt="Logo" className="max-h-[28mm] object-contain" />
              </div>
            )}
            <div 
              className="text-center font-bold"
              style={{ 
                fontSize: watchedValues.businessNameSize === 'medium' ? '12px' : 
                          watchedValues.businessNameSize === 'xlarge' ? '18px' : '15px' 
              }}
            >
              {watchedValues.businessName || "Your Business"}
            </div>
            {(watchedValues.businessAddress || watchedValues.district || selectedState || watchedValues.pinCode || watchedValues.contactPhone) && (
              <div 
                className="text-center mt-0.5 opacity-90 text-[10px]"
                style={{ fontSize: `${(watchedValues.businessAddressSize || 12) * 0.8}px` }} // Scaled for preview
              >
                {watchedValues.businessAddress}
                {watchedValues.district && `, ${watchedValues.district}`}
                {selectedState && `, ${selectedState}`}
                {watchedValues.pinCode && ` - ${watchedValues.pinCode}`}
                {watchedValues.contactPhone && <div className="mt-0.5">{watchedValues.phonePrefixType?.toString().toUpperCase() === 'SYMBOL' ? '📞 ' : 'Mob: '} {watchedValues.contactPhone}</div>}
              </div>
            )}
            {watchedValues.gstNumber && <div className="text-center text-[9px] mt-0.5 opacity-90 text-[10px]">GSTIN: {watchedValues.gstNumber}</div>}
            {(watchedValues.fssaiNumber && watchedValues.fssaiEnabled) && (
              <div className="text-center text-[9px] mt-0.5 opacity-90 text-[10px]">FSSAI: {watchedValues.fssaiNumber}</div>
            )}
            
            <div className="mt-2 border-t border-dashed border-gray-400 pt-1.5 px-1">
              <div className="flex justify-between items-center mb-1">
                <div className="font-black uppercase text-[8px] tracking-tight text-black opacity-80">Bill Summary</div>
                <div className="font-black uppercase text-[7px] border-2 border-black text-black px-1.5 py-0.5 rounded-sm">
                  COUNTER
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div className="text-[9px] space-y-0.5">
                  <div className="font-black text-black">No: SV-SAMPLE</div>
                  <div className="font-black text-[8px] text-black/70">
                    {new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\//g, '|').replace(',', ' -')}
                  </div>
                </div>
                <div className="flex flex-col items-end border-l border-black/20 pl-2 py-0.5">
                  <div className="text-[6px] font-black uppercase tracking-tighter opacity-50">Token</div>
                  <div 
                    className="font-black leading-none pt-0.5 text-black"
                    style={{ fontSize: `${(watchedValues.tokenNumberSize || 22) * 0.7}px` }} 
                  >
                    #123
                  </div>
                </div>
              </div>
            </div>
            
            <div className="my-1.5 border-t border-dashed border-gray-400" />
            
            <div className="flex justify-between font-semibold text-[9px] opacity-90 text-[10px]">
              <span className="flex-1 min-w-0 pr-1">Item</span>
              <span className="w-[7mm] text-center shrink-0">Qty</span>
              <span className="w-[10mm] text-right shrink-0">Rate</span>
              <span className="w-[11mm] text-right shrink-0">Total</span>
            </div>
            
            <div className="border-t border-dashed border-gray-400 my-1" />
            
            <div className="flex justify-between text-[9px] opacity-90 text-[10px] mb-0.5">
              <span className="flex-1 min-w-0 truncate pr-1">Sample Item</span>
              <span className="w-[7mm] text-center shrink-0">1</span>
              <span className="w-[10mm] text-right shrink-0">99.00</span>
              <span className="w-[11mm] text-right shrink-0">99.00</span>
            </div>
            
            <div className="my-1 border-t border-dashed border-gray-400" />
            
            <div className="flex justify-between opacity-90 text-[10px]"><span>Subtotal</span><span>₹99.00</span></div>
            <div className="flex justify-between opacity-90 text-[10px]"><span>GST (5%)</span><span>₹4.95</span></div>
            
            <div className="border-t border-dashed border-gray-400 my-1.5" />
            
            <div className="flex justify-between font-bold text-[11px] text-[12px]"><span>GRAND TOTAL</span><span>₹103.95</span></div>
            
            <div className="border-t border-dashed border-gray-400 my-1.5" />
            
            <div className="text-center text-[9px] opacity-90 text-[10px]">Payment: UPI</div>
            
            {(watchedValues.upi && watchedValues.upiQrEnabled !== false) && (
              <div className="my-2 text-center">
                <div className="text-[8px] font-bold mb-1">SCAN & PAY</div>
                <div className="inline-block border border-gray-300 p-1 rounded-md bg-white">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${watchedValues.upi}&pn=${watchedValues.businessName || "Store"}&am=103.95&cu=INR`)}`} 
                    alt="UPI QR" 
                    className="w-[28mm] h-[28mm] object-contain block mix-blend-multiply" 
                  />
                </div>
                <div className="text-center text-[8px] mt-1.5 opacity-90">UPI: {watchedValues.upi}</div>
              </div>
            )}

            {watchedValues.enableMenuQRInBill && (
              <div className="my-2 text-center border-t border-dashed border-gray-300 pt-2">
                <div className="text-[8px] font-bold mb-1 uppercase tracking-tighter">Scan to View Digital Menu</div>
                <div className="inline-block border border-gray-300 p-1 rounded-md bg-white">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${defaultValues?.userId || 'demo-user'}`)}`} 
                    alt="Menu QR" 
                    className="w-[25mm] h-[25mm] object-contain block mix-blend-multiply" 
                  />
                </div>
              </div>
            )}
            
            {watchedValues.businessTagline && <div className="text-center text-[9px] mt-1.5 opacity-90 text-[10px] italic">{watchedValues.businessTagline}</div>}
            <div className="text-center font-semibold mt-1 opacity-90 text-[10px] whitespace-pre-wrap">{watchedValues.greetingMessage || "Thank you 🙏"}</div>
            
            {/* Added simulated paper cut space */}
            <div className="h-[10mm] border-t border-dashed border-gray-200 mt-2" />
          </div>
        </div>
      </div>
    </div>

  </div>
  );
}

/* ---------------- SMALL UI HELPERS ---------------- */

function Section({ title, children }: any) {
  return (
    <Card className="rounded-[32px] border-[var(--kravy-border)] bg-[var(--kravy-surface)] shadow-2xl overflow-hidden">
      <CardHeader className="border-b border-[var(--kravy-border)] bg-[var(--kravy-bg-2)]/50">
        <CardTitle className="text-lg font-black text-[var(--kravy-text-primary)] tracking-tight uppercase tracking-widest text-[10px] opacity-70">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6 p-8">
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black text-[var(--kravy-text-muted)] uppercase tracking-widest ml-1">{label}</Label>
      {children}
    </div>
  );
}

function DragDrop({ id, label, preview, setPreview }: any) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const input = document.getElementById(id) as HTMLInputElement;
      
      // Update preview
      setPreview(URL.createObjectURL(file));

      // Update the hidden input files so that onSubmit can grab it
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (input) {
        input.files = dataTransfer.files;
      }
    }
  };

  return (
    <label 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
        isDragging 
          ? "bg-indigo-500/10 border-indigo-500" 
          : "border-[var(--kravy-border)] hover:bg-[var(--kravy-surface-hover)] hover:border-indigo-500/50"
      }`}
    >
      <input
        id={id}
        type="file"
        hidden
        onChange={(e) =>
          setPreview(
            e.target.files?.[0]
              ? URL.createObjectURL(e.target.files[0])
              : null
          )
        }
      />
      
      {/* Overlay for Drag State */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl pointer-events-none border-2 border-indigo-500">
          <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse">Drop file here</p>
        </div>
      )}

      {preview ? (
        <div className="relative group">
          <img src={preview} className="h-32 mx-auto rounded-xl object-cover shadow-lg border border-[var(--kravy-border)]" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity">
            <p className="text-white text-xs font-bold">Change Image</p>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--kravy-brand)]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus className="text-[var(--kravy-brand)]" size={24} />
          </div>
          <p className="text-sm font-bold text-[var(--kravy-text-primary)]">Upload {label}</p>
          <p className="text-xs text-[var(--kravy-text-muted)] mt-1">Drag & drop or click to upload (PNG, JPG max 5MB)</p>
        </div>
      )}
    </label>
  );
}

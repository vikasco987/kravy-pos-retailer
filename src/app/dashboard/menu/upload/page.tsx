"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ChevronDown, ChevronUp, Tag, DollarSign, Package, Box, Settings, CheckCircle2, Navigation, LayoutDashboard, Search, ListPlus, X, Image as ImageIcon, Wand2, Loader2, MapPin, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import CategorySelect from "@/app/dashboard/components/uploaditems/CategorySelect";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [isOptionalDrawerOpen, setIsOptionalDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [expiryTrackingEnabled, setExpiryTrackingEnabled] = useState(false);
  const [customUnits, setCustomUnits] = useState<string[]>([]);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    productName: "",
    shortCode: "",
    sellPrice: "",
    itemUnit: "",
    mrp: "",
    purchasePrice: "",
    gst: "",
    otherTax: "",
    brand: "",
    model: "",
    size: "",
    color: "",
    description: "",
    openingStock: "",
    currentStock: "",
    reorderLevel: "",
    displayCategory: "",
    displayColor: "",
    hsnCode: "",
    zones: "",
    expiryDate: "",
  });

  const [isStockCompulsory, setIsStockCompulsory] = useState(false);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setCategories(data);
      } catch (err) {
        console.error("❌ Failed to load categories:", err);
      }
    };
    
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok) {
          setExpiryTrackingEnabled(data.expiryTrackingEnabled || false);
          setIsStockCompulsory(data.isStockCompulsory || false);
          setCustomUnits(data.customUnits || []);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    loadCategories();
    loadProfile();
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUnit = async () => {
    const newUnit = window.prompt("Enter new custom unit name:");
    if (!newUnit || !newUnit.trim()) return;
    const unitName = newUnit.trim();
    if (customUnits.includes(unitName)) {
      toast.error("This unit already exists");
      return;
    }
    const updatedUnits = [...customUnits, unitName];
    setCustomUnits(updatedUnits);
    setFormData((prev) => ({ ...prev, itemUnit: unitName }));
    toast.success(`Unit '${unitName}' added!`);

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customUnits: updatedUnits })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoFetchImage = async () => {
    if (!formData.productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    setIsFetchingImage(true);
    try {
      const SCRAPER_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || "http://localhost:3005";
      const res = await fetch(`${SCRAPER_URL}/api/scrape-image-only`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: formData.productName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch image");
      
      setImage(data.url);
      localStorage.setItem("uploadedImage", data.url);
      toast.success(`Image found via ${data.source === 'database' ? 'Database' : 'AI Scraper'}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not find an image automatically");
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Keep Cloudinary upload for manual drag & drop
  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadToCloudinary(e.dataTransfer.files[0]);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadToCloudinary(e.target.files[0]);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    try {
      toast.loading("Uploading image...", { id: "upload" });
      const fData = new FormData();
      fData.append("file", file);
      fData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: fData }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");
      setImage(data.secure_url);
      toast.success("Image uploaded!", { id: "upload" });
    } catch (err: any) {
      toast.error(err.message || "Image upload failed", { id: "upload" });
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!formRef.current) return;

    const parseFloatOrNull = (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const parseIntOrNull = (v: string) => {
      const n = parseInt(v);
      return isNaN(n) ? null : n;
    };

    const itemData = {
      name: formData.productName || undefined,
      sellingPrice: parseFloatOrNull(formData.sellPrice),
      price: parseFloatOrNull(formData.purchasePrice),
      unit: formData.itemUnit || null,
      categoryId: selectedCategory,
      mrp: parseFloatOrNull(formData.mrp),
      gst: parseFloatOrNull(formData.gst),
      otherTax: parseFloatOrNull(formData.otherTax),
      brand: formData.brand || null,
      model: formData.model || null,
      size: formData.size || null,
      color: formData.color || null,
      description: formData.description || null,
      openingStock: parseIntOrNull(formData.openingStock),
      currentStock: parseIntOrNull(formData.currentStock),
      reorderLevel: parseIntOrNull(formData.reorderLevel),
      displayCategory: formData.displayCategory || null,
      displayColor: formData.displayColor || null,
      shortCode: formData.shortCode || null,
      imageUrl: image || null,
      hsnCode: formData.hsnCode || null,
      zones: formData.zones ? formData.zones.split(',').map((z: string) => z.trim()).filter(Boolean) : [],
      expiryDate: formData.expiryDate || null,
    };

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to save item");
      }

      toast.success("Item saved successfully!");
      formRef.current.reset();
      setFormData({
        productName: "", shortCode: "", sellPrice: "", itemUnit: "",
        mrp: "", purchasePrice: "", gst: "", otherTax: "", brand: "",
        model: "", size: "", color: "", description: "", openingStock: "",
        currentStock: "", reorderLevel: "", displayCategory: "", displayColor: "",
        hsnCode: "", zones: "", expiryDate: "",
      });
      setImage(null);
      setIsOptionalDrawerOpen(false);
      setSelectedCategory("");
    } catch (error: any) {
      console.error("❌ Failed to save item:", error);
      toast.error(`Failed to save item: ${error.message || "Please check the form data."}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Item</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the details below to add a new product to your menu.</p>
          </div>
        </div>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-8">
        
        {/* LEFT COLUMN: FORM */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSave} ref={formRef} className="space-y-6">
            
            {/* Image Upload Block */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center relative overflow-hidden">
              <label
                htmlFor="fileUpload"
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={handleDrop}
                className="flex-1 w-full flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="fileUpload"
                  onChange={handleImageChange}
                />
                <Upload className="w-8 h-8 text-indigo-500 mb-3" />
                <span className="text-sm text-gray-900 font-bold mb-1">Upload Product Image</span>
                <span className="text-xs text-gray-500 text-center">Drag & drop an image here or click to browse</span>
                <span className="text-[10px] text-gray-400 mt-3 font-semibold uppercase tracking-wider">JPG, PNG (Max 5MB)</span>
              </label>
              
              {image ? (
                <div className="w-40 h-40 relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 border border-gray-200 bg-white">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-white text-[10px] font-bold">Preview</span>
                  </div>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl flex flex-col items-center justify-center border border-gray-200 bg-gray-50 flex-shrink-0 text-gray-400">
                   <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                   <span className="text-[10px] font-semibold uppercase">No Image</span>
                </div>
              )}
            </div>

            {/* Main Form Fields */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              
              {/* Item Name */}
              <div className="mb-6 flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Tag className="w-4 h-4 text-purple-600" />
                  </div>
                  <input
                    type="text"
                    name="productName"
                    placeholder="Product/Service Name *"
                    value={formData.productName}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAutoFetchImage}
                  disabled={isFetchingImage || !formData.productName.trim()}
                  className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-5 rounded-2xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isFetchingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  Auto Image
                </button>
              </div>

              {/* Short Code */}
              <div className="mb-6 relative">
                 <input
                   type="text"
                   name="shortCode"
                   placeholder="Item Code / Short Code (Optional)"
                   value={formData.shortCode}
                   onChange={handleChange}
                   className="w-full bg-transparent border-b-2 border-gray-100 px-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                 />
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-pink-600" />
                  </div>
                  <input
                    type="number"
                    name="sellPrice"
                    placeholder="Sell Price *"
                    value={formData.sellPrice}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center pointer-events-none">
                    <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <select
                    name="itemUnit"
                    value={formData.itemUnit}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW") {
                        handleAddUnit();
                      } else {
                        handleChange(e);
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl pl-14 pr-12 py-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all shadow-sm"
                  >
                    <option value="" disabled>Select Unit</option>
                    <option value="Piece">Piece</option>
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Litre">Litre</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    {customUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add Custom Unit</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6 relative z-10">
                 <CategorySelect
                    categories={categories}
                    setCategories={setCategories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                 />
              </div>

              {/* Zones */}
              <div className="mb-8 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                  type="text"
                  name="zones"
                  placeholder="Zones (comma separated e.g. Dining, Takeaway)"
                  value={formData.zones}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              {/* Checkbox trigger for the Optional Drawer */}
              <div className="mt-4 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isOptionalDrawerOpen}
                      onChange={(e) => setIsOptionalDrawerOpen(e.target.checked)}
                      className="peer w-6 h-6 text-indigo-600 rounded-md border-indigo-300 focus:ring-indigo-500 cursor-pointer appearance-none bg-white border-2 checked:bg-indigo-600 checked:border-indigo-600 transition-colors"
                    />
                    <CheckCircle2 className="w-4 h-4 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">Add Optional Details</span>
                    <span className="text-xs text-gray-500">Add GST, Inventory, Pricing, Display info...</span>
                  </div>
                </label>
              </div>

            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                className="px-8 py-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => {
                  formRef.current?.reset();
                  removeImage();
                  setFormData({
                    productName: "", shortCode: "", sellPrice: "", itemUnit: "",
                    mrp: "", purchasePrice: "", gst: "", otherTax: "", brand: "",
                    model: "", size: "", color: "", description: "", openingStock: "",
                    currentStock: "", reorderLevel: "", displayCategory: "", displayColor: "",
                    hsnCode: "", zones: "", expiryDate: "",
                  });
                  setIsOptionalDrawerOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: CONTEXT & NAV */}
        <div className="space-y-6">
          {/* Great Banner */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-500/20">
            <div className="relative z-10">
              <h2 className="text-2xl font-black mb-2">Great!</h2>
              <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-[85%]">
                You're just a few steps away from adding your new item.
              </p>
            </div>
            {/* Decorative Bag */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-80">
               <div className="w-32 h-32 bg-white/10 rounded-full blur-2xl absolute"></div>
               <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/40 transform rotate-12">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" fill="white" fillOpacity="0.2"/>
               </svg>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900">Quick Navigation</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard" className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-sm transition-all group">
                <LayoutDashboard className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800 text-center">Dashboard</span>
              </Link>
              <Link href="/dashboard/menu/view" className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all group">
                <Search className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800 text-center">Browse<br/>Products</span>
              </Link>
              <Link href="/dashboard/billing/checkout" className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all group">
                <DollarSign className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800 text-center">POS Billing</span>
              </Link>
              <Link href="/dashboard/store-item-upload" className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all group">
                <ListPlus className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800 text-center">Bulk Import</span>
              </Link>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <h3 className="font-bold text-gray-900">Quick Tips</h3>
                </div>
                <ChevronUp className="w-5 h-5 text-gray-400" />
             </div>
             <ul className="space-y-4">
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                 <span className="text-sm text-gray-600 font-medium">Use high-quality images for better product visibility.</span>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                 <span className="text-sm text-gray-600 font-medium">Keep item names short and clear.</span>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                 <span className="text-sm text-gray-600 font-medium">Add GST for accurate billing.</span>
               </li>
               <li className="flex items-start gap-3">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                 <span className="text-sm text-gray-600 font-medium">Set the right stock quantity.</span>
               </li>
             </ul>
          </div>

          {/* Promo Banner */}
          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 relative overflow-hidden flex items-center justify-center min-h-[120px]">
             <div className="absolute right-4 top-1/2 -translate-y-1/2 transform rotate-12 opacity-80">
                <div className="w-16 h-20 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center p-2">
                   <div className="w-full h-8 bg-blue-100 rounded flex items-center justify-center mb-1">
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                   </div>
                   <div className="w-full h-1 bg-gray-200 rounded-full mb-1"></div>
                   <div className="w-2/3 h-1 bg-gray-200 rounded-full"></div>
                </div>
             </div>
             <div className="relative z-10 w-full">
                <h3 className="text-emerald-800 font-black text-lg w-2/3 leading-tight transform -rotate-3">
                  Manage your inventory easily!
                </h3>
             </div>
          </div>
        </div>

      </div>
      </div>

      {/* --- RIGHT SLIDE-IN DRAWER FOR OPTIONAL DETAILS --- */}
      <AnimatePresence>
        {isOptionalDrawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOptionalDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[650px] bg-[#F8F9FE] dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Optional Details</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fill what you need.</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsOptionalDrawerOpen(false)} 
                  className="p-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/30 transition-colors"
                >
                  <X size={20} className="dark:text-gray-300" />
                </button>
              </div>

              {/* Content / Fields */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* 1. Pricing Details */}
                <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-2xl border border-green-100 dark:border-green-800/30 shadow-sm">
                  <label className="block text-sm font-bold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2"><Tag size={16} className="text-green-600 dark:text-green-400" /> Pricing Details</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" name="mrp" value={formData.mrp} onChange={handleChange} placeholder="MRP" className="w-full bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none text-gray-900 dark:text-white" />
                    <input type="number" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} placeholder="Purchase Price" className="w-full bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800/50 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                </div>

                {/* 2. Inventory */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30 shadow-sm">
                  <label className="block text-sm font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2"><Box size={16} className="text-blue-600 dark:text-blue-400" /> Inventory</label>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <input type="number" name="openingStock" value={formData.openingStock} onChange={handleChange} placeholder="Opening Stock" className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none text-gray-900 dark:text-white" />
                    <input type="number" name="reorderLevel" value={formData.reorderLevel} onChange={handleChange} placeholder="Reorder Level" className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  {expiryTrackingEnabled && (
                     <div className="mb-3">
                       <label className="block text-xs font-bold text-blue-800/70 dark:text-blue-200/70 mb-1 ml-1">Expiry Date</label>
                       <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none text-gray-900 dark:text-white" />
                     </div>
                  )}
                </div>

                {/* 3. GST and Tax */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-2xl border border-yellow-100 dark:border-yellow-800/30 shadow-sm">
                  <label className="block text-sm font-bold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2"><DollarSign size={16} className="text-yellow-600 dark:text-yellow-500" /> GST and Tax</label>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <input type="number" name="gst" value={formData.gst} onChange={handleChange} placeholder="GST %" className="w-full bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800/50 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none text-gray-900 dark:text-white" />
                    <input type="number" name="otherTax" value={formData.otherTax} onChange={handleChange} placeholder="Other Tax %" className="w-full bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800/50 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <input type="text" name="hsnCode" value={formData.hsnCode} onChange={handleChange} placeholder="HSN Code" className="w-full bg-white dark:bg-slate-800 border border-yellow-200 dark:border-yellow-800/50 rounded-xl px-4 py-3 text-sm focus:border-yellow-500 outline-none text-gray-900 dark:text-white" />
                </div>

                {/* 4. Display & Specifics */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-2xl border border-purple-100 dark:border-purple-800/30 shadow-sm">
                  <label className="block text-sm font-bold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2"><Package size={16} className="text-purple-600 dark:text-purple-400" /> Display & Specifics</label>
                  <input type="text" name="displayCategory" value={formData.displayCategory} onChange={handleChange} placeholder="Display Category" className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none mb-4 text-gray-900 dark:text-white" />
                  
                  <div className="flex items-center gap-4 mb-4 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3">
                     <span className="text-sm text-purple-900 dark:text-purple-100 font-bold">Display Color:</span>
                     <input type="color" name="displayColor" value={formData.displayColor} onChange={handleChange} className="w-12 h-10 border-0 rounded-lg cursor-pointer bg-transparent" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Brand" className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white" />
                    <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="Model/Size" className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Additional notes about the product..." className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none min-h-[100px] text-gray-900 dark:text-white" />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                <button 
                  type="button" 
                  onClick={() => setIsOptionalDrawerOpen(false)} 
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

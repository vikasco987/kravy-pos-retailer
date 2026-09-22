


"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, ChevronDown, ChevronUp, Tag, DollarSign, Package, Box, Settings, CheckCircle2, Navigation, LayoutDashboard, Search, ListPlus, X, Image as ImageIcon } from "lucide-react";
import CategorySelect from "./components/uploaditems/CategorySelect";
import Link from "next/link";

export default function UploadItemPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const formRef = useRef<HTMLFormElement>(null);

  // ✅ Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setCategories(data);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0]);
      setImagePreview(URL.createObjectURL(e.dataTransfer.files[0]));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = formRef.current;
    if (!form) {
      setIsSaving(false);
      return;
    }

    let imageUrl = "";
    if (image) {
      try {
        const formData = new FormData();
        formData.append("file", image);
        formData.append(
          "upload_preset",
          process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string
        );

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );

        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || "Upload failed");
        imageUrl = cloudData.secure_url;
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Image upload failed. Please try again.");
        setIsSaving(false);
        return;
      }
    }

    // ✅ Collect all form data
    const itemData = {
      name: (form.elements.namedItem("productName") as HTMLInputElement).value,
      price: parseFloat(
        (form.elements.namedItem("sellPrice") as HTMLInputElement).value
      ),
      itemUnit: (form.elements.namedItem("itemUnit") as HTMLSelectElement).value,
      categoryId: (form.elements.namedItem("itemCategory") as HTMLSelectElement).value,
      mrp: parseFloat((form.elements.namedItem("mrp") as HTMLInputElement)?.value) || null,
      purchasePrice: parseFloat((form.elements.namedItem("purchasePrice") as HTMLInputElement)?.value) || null,
      gst: parseFloat((form.elements.namedItem("gst") as HTMLInputElement)?.value) || null,
      otherTax: parseFloat((form.elements.namedItem("otherTax") as HTMLInputElement)?.value) || null,
      brand: (form.elements.namedItem("brand") as HTMLInputElement)?.value || null,
      model: (form.elements.namedItem("model") as HTMLInputElement)?.value || null,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement)?.value || null,
      openingStock: parseInt((form.elements.namedItem("openingStock") as HTMLInputElement)?.value) || null,
      reorderLevel: parseInt((form.elements.namedItem("reorderLevel") as HTMLInputElement)?.value) || null,
      displayCategory: (form.elements.namedItem("displayCategory") as HTMLInputElement)?.value || null,
      displayColor: (form.elements.namedItem("displayColor") as HTMLInputElement)?.value || null,
      imageUrl,
    };

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });

      if (res.ok) {
        alert("Item saved successfully!");
        form.reset();
        setImage(null);
        setImagePreview(null);
        setOpenSection(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save item.");
      }
    } catch (error) {
      console.error("Failed to save item:", error);
      alert("Failed to save item. Please check the form data.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Item</h1>
            <p className="text-sm text-gray-500">Fill in the details below to add a new product to your menu.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FORM */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleSave} ref={formRef} className="space-y-6">
            
            {/* Image Upload Block */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center relative overflow-hidden">
              <label
                htmlFor="fileUpload"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 w-full flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                  isDragging ? "border-indigo-500 bg-indigo-50" : "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
                }`}
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
              
              {imagePreview && (
                <div className="w-40 h-40 relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 border border-gray-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
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
              )}
            </div>

            {/* Main Form Fields */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              
              {/* Item Name */}
              <div className="mb-6 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
                <input
                  type="text"
                  name="productName"
                  placeholder="Item Name *"
                  className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                  required
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
                    placeholder="Price *"
                    className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold placeholder-gray-400 focus:border-indigo-500 outline-none transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center pointer-events-none">
                    <Box className="w-4 h-4 text-blue-600" />
                  </div>
                  <select
                    name="itemUnit"
                    className="w-full bg-transparent border-b-2 border-gray-100 pl-16 pr-4 py-4 text-gray-900 font-bold focus:border-indigo-500 outline-none transition-colors appearance-none"
                    required
                  >
                    <option value="">Unit / Piece *</option>
                    <option>Piece</option>
                    <option>Kg</option>
                    <option>Litre</option>
                    <option>Pack</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-2 relative z-10">
                 <CategorySelect
                    categories={categories}
                    setCategories={setCategories}
                    selectedCategory={""}
                    setSelectedCategory={(id) => {
                      const select = document.getElementsByName("itemCategory")[0] as HTMLSelectElement;
                      if (select) {
                        select.value = id;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                 />
              </div>
              <select name="itemCategory" required className="hidden">
                <option value="">Select Category *</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Optional Details Accordion */}
              <div className="mt-8 border border-gray-100 rounded-2xl bg-gray-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("optional")}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Optional Details</h3>
                      <p className="text-xs text-gray-500">Add more information (MRP, GST, Stock, Display...)</p>
                    </div>
                  </div>
                  {openSection === "optional" ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                </button>

                <motion.div 
                  initial={false}
                  animate={{ height: openSection === "optional" ? "auto" : 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">GST and Tax</label>
                      <input type="number" name="gst" placeholder="GST %" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none mb-3 shadow-sm" />
                      <input type="number" name="otherTax" placeholder="Other Tax %" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Pricing</label>
                      <input type="number" name="mrp" placeholder="MRP" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none mb-3 shadow-sm" />
                      <input type="number" name="purchasePrice" placeholder="Purchase Price" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Inventory Details</label>
                      <input type="number" name="openingStock" placeholder="Opening Stock" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none mb-3 shadow-sm" />
                      <input type="number" name="reorderLevel" placeholder="Reorder Level" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">Product Display</label>
                      <input type="text" name="displayCategory" placeholder="Display Category" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none mb-3 shadow-sm" />
                      <div className="flex items-center gap-3">
                         <span className="text-sm text-gray-500 font-bold">Display Color:</span>
                         <input type="color" name="displayColor" className="w-12 h-10 border rounded-lg cursor-pointer bg-white" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-2">Product Details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <input type="text" name="brand" placeholder="Brand" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" />
                        <input type="text" name="model" placeholder="Model/Size" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none shadow-sm" />
                      </div>
                      <textarea name="description" placeholder="Additional notes about the product..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none min-h-[80px] shadow-sm" />
                    </div>
                  </div>
                </motion.div>
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
  );
}v>
  );
 }



// "use client";

// import { useState, useRef, useEffect } from "react";
// import { motion } from "framer-motion";
// import ImageUpload from "@/components/uploaditems/ImageUpload";
// import CategorySelect from "@/components/uploaditems/CategorySelect";
// import GstTaxSection from "@/components/uploaditems/GstTaxSection";
// import ProductDetailsSection from "@/components/uploaditems/ProductDetailsSection";
// import InventorySection from "@/components/uploaditems/InventorySection";
// import DisplaySection from "@/components/uploaditems/DisplaySection";

// export default function Page() {
//   const [image, setImage] = useState<string | null>(null); // Cloudinary URL
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");

//   const formRef = useRef<HTMLFormElement>(null);

//   useEffect(() => {
//     const loadCategories = async () => {
//       try {
//         const res = await fetch("/api/categories");
//         const data = await res.json();
//         if (res.ok) setCategories(data);
//       } catch (err) {
//         console.error("❌ Failed to load categories:", err);
//       }
//     };
//     loadCategories();
//   }, []);

//   const toggleSection = (section: string) => {
//     setOpenSection(openSection === section ? null : section);
//   };

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!image) {
//       alert("Please upload an image before saving.");
//       return;
//     }

//     setIsSaving(true);
//     const form = formRef.current;
//     if (!form) return;

//     const itemData = {
//       name: (form.elements.namedItem("productName") as HTMLInputElement).value,
//       price: parseFloat((form.elements.namedItem("sellPrice") as HTMLInputElement).value),
//       itemUnit: (form.elements.namedItem("itemUnit") as HTMLSelectElement).value,
//       categoryId: selectedCategory,
//       mrp: parseFloat((form.elements.namedItem("mrp") as HTMLInputElement)?.value) || null,
//       purchasePrice: parseFloat((form.elements.namedItem("purchasePrice") as HTMLInputElement)?.value) || null,
//       gst: parseFloat((form.elements.namedItem("gst") as HTMLInputElement)?.value) || null,
//       otherTax: parseFloat((form.elements.namedItem("otherTax") as HTMLInputElement)?.value) || null,
//       brand: (form.elements.namedItem("brand") as HTMLInputElement)?.value || null,
//       model: (form.elements.namedItem("model") as HTMLInputElement)?.value || null,
//       description: (form.elements.namedItem("description") as HTMLTextAreaElement)?.value || null,
//       openingStock: parseInt((form.elements.namedItem("openingStock") as HTMLInputElement)?.value) || null,
//       reorderLevel: parseInt((form.elements.namedItem("reorderLevel") as HTMLInputElement)?.value) || null,
//       displayCategory: (form.elements.namedItem("displayCategory") as HTMLInputElement)?.value || null,
//       displayColor: (form.elements.namedItem("displayColor") as HTMLInputElement)?.value || null,
//       imageUrl: image, // ✅ just use the URL stored in state
//     };

//     try {
//       const res = await fetch("/api/items", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(itemData),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to save item");

//       alert("Item saved successfully!");
//       form.reset();
//       setImage(null);
//       setOpenSection(null);
//       setSelectedCategory("");
//     } catch (error) {
//       console.error("Failed to save item:", error);
//       alert("Failed to save item. Please check the form data.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-6">
//       <motion.div
//         className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-2xl"
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//       >
//         <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">➕ New Item</h1>

//         <form onSubmit={handleSave} ref={formRef}>
//           <ImageUpload image={image} setImage={setImage} />

//           {/* Product Name */}
//           <div className="mb-4">
//             <input
//               type="text"
//               name="productName"
//               placeholder="Product/Service Name *"
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//           </div>

//           {/* Sell Price + Unit */}
//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <input
//               type="number"
//               name="sellPrice"
//               placeholder="Sell Price *"
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//             <select
//               name="itemUnit"
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//             >
//               <option value="">Item Unit</option>
//               <option>Piece</option>
//               <option>Kg</option>
//               <option>Litre</option>
//               <option>Pack</option>
//             </select>
//           </div>

//           {/* Category */}
//           <CategorySelect
//             categories={categories}
//             selectedCategory={selectedCategory}
//             setSelectedCategory={setSelectedCategory}
//             setCategories={setCategories}
//           />

//           {/* Expandable Sections */}
//           <div className="space-y-4 mb-6">
//             <GstTaxSection openSection={openSection} toggleSection={toggleSection} />
//             <ProductDetailsSection openSection={openSection} toggleSection={toggleSection} />
//             <InventorySection openSection={openSection} toggleSection={toggleSection} />
//             <DisplaySection openSection={openSection} toggleSection={toggleSection} />
//           </div>

//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             type="submit"
//             className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-purple-700 transition"
//             disabled={isSaving || !image} // disable until image uploaded
//           >
//             {isSaving ? "Saving..." : "SAVE"}
//           </motion.button>
//         </form>
//       </motion.div>
//     </div>
//   );
// }









// "use client";

// import { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import ImageUpload from "@/components/uploaditems/ImageUpload";
// import CategorySelect from "@/components/uploaditems/CategorySelect";
// import GstTaxSection from "@/components/uploaditems/GstTaxSection";
// import ProductDetailsSection from "@/components/uploaditems/ProductDetailsSection";
// import InventorySection from "@/components/uploaditems/InventorySection";
// import DisplaySection from "@/components/uploaditems/DisplaySection";

// export default function Page() {
//   const [image, setImage] = useState<string | null>(null); // Cloudinary URL
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");

//   // Full form state to keep values even if sections collapse
//   const [formData, setFormData] = useState({
//     productName: "",
//     sellPrice: "",
//     itemUnit: "",
//     mrp: "",
//     purchasePrice: "",
//     gst: "",
//     otherTax: "",
//     brand: "",
//     model: "",
//     description: "",
//     openingStock: "",
//     reorderLevel: "",
//     displayCategory: "",
//     displayColor: "",
//   });

//   useEffect(() => {
//     const loadCategories = async () => {
//       try {
//         const res = await fetch("/api/categories");
//         const data = await res.json();
//         if (res.ok) setCategories(data);
//       } catch (err) {
//         console.error("❌ Failed to load categories:", err);
//       }
//     };
//     loadCategories();
//   }, []);

//   const toggleSection = (section: string) => {
//     setOpenSection(openSection === section ? null : section);
//   };

//   // Update form state on input change
//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!image) {
//       alert("Please upload an image before saving.");
//       return;
//     }

//     if (!selectedCategory) {
//       alert("Please select a category.");
//       return;
//     }

//     setIsSaving(true);

//     const parseFloatOrNull = (v: string) => {
//       const n = parseFloat(v);
//       return isNaN(n) ? null : n;
//     };

//     const parseIntOrNull = (v: string) => {
//       const n = parseInt(v);
//       return isNaN(n) ? null : n;
//     };

//     const itemData = {
//       name: formData.productName || undefined,
//       price: parseFloatOrNull(formData.sellPrice),
//       unit: formData.itemUnit || null,
//       categoryId: selectedCategory,
//       mrp: parseFloatOrNull(formData.mrp),
//       purchasePrice: parseFloatOrNull(formData.purchasePrice),
//       sellingPrice: parseFloatOrNull(formData.sellPrice),
//       gst: parseFloatOrNull(formData.gst),
//       discount: parseFloatOrNull(formData.otherTax),
//       brand: formData.brand || null,
//       model: formData.model || null,
//       description: formData.description || null,
//       stock: parseIntOrNull(formData.openingStock),
//       reorderLevel: parseIntOrNull(formData.reorderLevel),
//       displayCategory: formData.displayCategory || null,
//       displayColor: formData.displayColor || null,
//       imageUrl: image,
//     };

//     try {
//       const res = await fetch("/api/items", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(itemData),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to save item");

//       alert("Item saved successfully!");
//       setFormData({
//         productName: "",
//         sellPrice: "",
//         itemUnit: "",
//         mrp: "",
//         purchasePrice: "",
//         gst: "",
//         otherTax: "",
//         brand: "",
//         model: "",
//         description: "",
//         openingStock: "",
//         reorderLevel: "",
//         displayCategory: "",
//         displayColor: "",
//       });
//       setImage(null);
//       setOpenSection(null);
//       setSelectedCategory("");
//     } catch (error) {
//       console.error("Failed to save item:", error);
//       alert("Failed to save item. Please check the form data.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-6">
//       <motion.div
//         className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-2xl"
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//       >
//         <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">➕ New Item</h1>

//         <form onSubmit={handleSave}>
//           <ImageUpload image={image} setImage={setImage} />

//           {/* Product Name */}
//           <div className="mb-4">
//             <input
//               type="text"
//               name="productName"
//               placeholder="Product/Service Name *"
//               value={formData.productName}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//           </div>

//           {/* Sell Price + Unit */}
//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <input
//               type="number"
//               name="sellPrice"
//               placeholder="Sell Price *"
//               value={formData.sellPrice}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//             <select
//               name="itemUnit"
//               value={formData.itemUnit}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//             >
//               <option value="">Item Unit</option>
//               <option>Piece</option>
//               <option>Kg</option>
//               <option>Litre</option>
//               <option>Pack</option>
//             </select>
//           </div>

//           {/* Category */}
//           <CategorySelect
//             categories={categories}
//             selectedCategory={selectedCategory}
//             setSelectedCategory={setSelectedCategory}
//             setCategories={setCategories}
//           />

//           {/* Expandable Sections */}
//           <div className="space-y-4 mb-6">
//             <GstTaxSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <ProductDetailsSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <InventorySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <DisplaySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//           </div>

//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             type="submit"
//             className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-purple-700 transition"
//             disabled={isSaving || !image}
//           >
//             {isSaving ? "Saving..." : "SAVE"}
//           </motion.button>
//         </form>
//       </motion.div>
//     </div>
//   );
// }















// "use client";

// import { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import ImageUpload from "@/components/uploaditems/ImageUpload";
// import CategorySelect from "@/components/uploaditems/CategorySelect";
// import GstTaxSection from "@/components/uploaditems/GstTaxSection";
// import ProductDetailsSection from "@/components/uploaditems/ProductDetailsSection";
// import InventorySection from "@/components/uploaditems/InventorySection";
// import DisplaySection from "@/components/uploaditems/DisplaySection";

// export default function Page() {
//   const [image, setImage] = useState<string | null>(null);
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");

//   const [formData, setFormData] = useState({
//     productName: "",
//     sellPrice: "",
//     itemUnit: "",
//     mrp: "",
//     purchasePrice: "",
//     gst: "",
//     otherTax: "",
//     brand: "",
//     model: "",
//     description: "",
//     openingStock: "",
//     reorderLevel: "",
//     displayCategory: "",
//     displayColor: "",
//   });

//   useEffect(() => {
//     const loadCategories = async () => {
//       try {
//         const res = await fetch("/api/categories");
//         const data = await res.json();
//         if (res.ok) setCategories(data);
//       } catch (err) {
//         console.error("❌ Failed to load categories:", err);
//       }
//     };
//     loadCategories();
//   }, []);

//   const toggleSection = (section: string) => {
//     setOpenSection(openSection === section ? null : section);
//   };

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!image) return alert("Please upload an image before saving.");
//     if (!selectedCategory) return alert("Please select a category.");

//     setIsSaving(true);

//     const parseFloatOrNull = (v: string) => {
//       const n = parseFloat(v);
//       return isNaN(n) ? null : n;
//     };
//     const parseIntOrNull = (v: string) => {
//       const n = parseInt(v);
//       return isNaN(n) ? null : n;
//     };

//     const itemData = {
//       name: formData.productName || undefined,
//       price: parseFloatOrNull(formData.sellPrice),
//       unit: formData.itemUnit || null,
//       categoryId: selectedCategory,
//       mrp: parseFloatOrNull(formData.mrp),
//       purchasePrice: parseFloatOrNull(formData.purchasePrice),
//       sellingPrice: parseFloatOrNull(formData.sellPrice),
//       gst: parseFloatOrNull(formData.gst),
//       discount: parseFloatOrNull(formData.otherTax),
//       brand: formData.brand || null,
//       model: formData.model || null,
//       description: formData.description || null,
//       stock: parseIntOrNull(formData.openingStock),
//       reorderLevel: parseIntOrNull(formData.reorderLevel),
//       displayCategory: formData.displayCategory || null,
//       displayColor: formData.displayColor || null,
//       imageUrl: image,
//     };

//     try {
//       const res = await fetch("/api/items", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(itemData),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to save item");

//       alert("✅ Item saved successfully!");
//       setFormData({
//         productName: "",
//         sellPrice: "",
//         itemUnit: "",
//         mrp: "",
//         purchasePrice: "",
//         gst: "",
//         otherTax: "",
//         brand: "",
//         model: "",
//         description: "",
//         openingStock: "",
//         reorderLevel: "",
//         displayCategory: "",
//         displayColor: "",
//       });
//       setImage(null);
//       setOpenSection(null);
//       setSelectedCategory("");
//     } catch (error) {
//       console.error("❌ Failed to save item:", error);
//       alert("Failed to save item. Please check the form data.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-6">
//       <motion.div
//         className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-2xl"
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//       >
//         <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">➕ New Item</h1>

//         <form onSubmit={handleSave}>
//           <ImageUpload image={image} setImage={setImage} />

//           <div className="mb-4">
//             <input
//               type="text"
//               name="productName"
//               placeholder="Product/Service Name *"
//               value={formData.productName}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <input
//               type="number"
//               name="sellPrice"
//               placeholder="Sell Price *"
//               value={formData.sellPrice}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//             <select
//               name="itemUnit"
//               value={formData.itemUnit}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//             >
//               <option value="">Item Unit</option>
//               <option>Piece</option>
//               <option>Kg</option>
//               <option>Litre</option>
//               <option>Pack</option>
//             </select>
//           </div>

//           <CategorySelect
//             categories={categories}
//             selectedCategory={selectedCategory}
//             setSelectedCategory={setSelectedCategory}
//             setCategories={setCategories}
//           />

//           <div className="space-y-4 mb-6">
//             <GstTaxSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <ProductDetailsSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <InventorySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <DisplaySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//           </div>

//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             type="submit"
//             className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-purple-700 transition"
//             disabled={isSaving || !image}
//           >
//             {isSaving ? "Saving..." : "SAVE"}
//           </motion.button>
//         </form>
//       </motion.div>
//     </div>
//   );
// }











// "use client";

// import { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import ImageUpload from "@/components/uploaditems/ImageUpload";
// import CategorySelect from "@/components/uploaditems/CategorySelect";
// import GstTaxSection from "@/components/uploaditems/GstTaxSection";
// import ProductDetailsSection from "@/components/uploaditems/ProductDetailsSection";
// import InventorySection from "@/components/uploaditems/InventorySection";
// import DisplaySection from "@/components/uploaditems/DisplaySection";

// export default function Page() {
//   const [image, setImage] = useState<string | null>(null);
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [isSaving, setIsSaving] = useState(false);

//   const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
//   const [selectedCategory, setSelectedCategory] = useState<string>("");

//   const [formData, setFormData] = useState({
//     productName: "",
//     sellPrice: "",
//     itemUnit: "",
//     mrp: "",
//     purchasePrice: "",
//     gst: "",
//     otherTax: "",
//     brand: "",
//     model: "",
//     description: "",
//     openingStock: "",
//     reorderLevel: "",
//     displayCategory: "",
//     displayColor: "#000000",
//   });

//   useEffect(() => {
//     const loadCategories = async () => {
//       try {
//         const res = await fetch("/api/categories");
//         const data = await res.json();
//         if (res.ok) setCategories(data);
//       } catch (err) {
//         console.error("❌ Failed to load categories:", err);
//       }
//     };
//     loadCategories();
//   }, []);

//   const toggleSection = (section: string) => {
//     setOpenSection(openSection === section ? null : section);
//   };

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!image) return alert("Please upload an image before saving.");
//     if (!selectedCategory) return alert("Please select a category.");

//     setIsSaving(true);

//     const parseFloatOrNull = (v: string) => {
//       const n = parseFloat(v);
//       return isNaN(n) ? null : n;
//     };
//     const parseIntOrNull = (v: string) => {
//       const n = parseInt(v);
//       return isNaN(n) ? null : n;
//     };

//     const itemData = {
//       name: formData.productName || undefined,
//       price: parseFloatOrNull(formData.sellPrice),
//       unit: formData.itemUnit || null,
//       categoryId: selectedCategory,
//       mrp: parseFloatOrNull(formData.mrp),
//       purchasePrice: parseFloatOrNull(formData.purchasePrice),
//       sellingPrice: parseFloatOrNull(formData.sellPrice),
//       gst: parseFloatOrNull(formData.gst),
//       discount: parseFloatOrNull(formData.otherTax),
//       brand: formData.brand || null,
//       model: formData.model || null,
//       description: formData.description || null,
//       stock: parseIntOrNull(formData.openingStock),
//       reorderLevel: parseIntOrNull(formData.reorderLevel),
//       displayCategory: formData.displayCategory || null,
//       displayColor: formData.displayColor || null,
//       imageUrl: image,
//     };

//     try {
//       const res = await fetch("/api/items", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(itemData),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to save item");

//       alert("✅ Item saved successfully!");
//       setFormData({
//         productName: "",
//         sellPrice: "",
//         itemUnit: "",
//         mrp: "",
//         purchasePrice: "",
//         gst: "",
//         otherTax: "",
//         brand: "",
//         model: "",
//         description: "",
//         openingStock: "",
//         reorderLevel: "",
//         displayCategory: "",
//         displayColor: "#000000",
//       });
//       setImage(null);
//       setOpenSection(null);
//       setSelectedCategory("");
//     } catch (error) {
//       console.error("❌ Failed to save item:", error);
//       alert("Failed to save item. Please check the form data.");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-6">
//       <motion.div
//         className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-2xl"
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//       >
//         <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">➕ New Item</h1>

//         <form onSubmit={handleSave}>
//           <ImageUpload image={image} setImage={setImage} />

//           <div className="mb-4">
//             <input
//               type="text"
//               name="productName"
//               placeholder="Product/Service Name *"
//               value={formData.productName}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <input
//               type="number"
//               name="sellPrice"
//               placeholder="Sell Price *"
//               value={formData.sellPrice}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//               required
//             />
//             <select
//               name="itemUnit"
//               value={formData.itemUnit}
//               onChange={handleChange}
//               className="w-full border rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-purple-400 outline-none bg-gray-50"
//             >
//               <option value="">Item Unit</option>
//               <option>Piece</option>
//               <option>Kg</option>
//               <option>Litre</option>
//               <option>Pack</option>
//             </select>
//           </div>

//           <CategorySelect
//             categories={categories}
//             selectedCategory={selectedCategory}
//             setSelectedCategory={setSelectedCategory}
//             setCategories={setCategories}
//           />

//           <div className="space-y-4 mb-6">
//             <GstTaxSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <ProductDetailsSection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <InventorySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//             <DisplaySection
//               openSection={openSection}
//               toggleSection={toggleSection}
//               formData={formData}
//               handleChange={handleChange}
//             />
//           </div>

//           <motion.button
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             type="submit"
//             className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl shadow-md hover:bg-purple-700 transition"
//             disabled={isSaving || !image}
//           >
//             {isSaving ? "Saving..." : "SAVE"}
//           </motion.button>
//         </form>
//       </motion.div>
//     </div>
//   );
// }
//
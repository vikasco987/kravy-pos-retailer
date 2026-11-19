"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, X, Search } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

const COUNTRY_DATA: Record<string, { label: string; states: string[] }> = {
  "India": {
    label: "India",
    states: [
      "Andaman and Nicobar Islands",
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chandigarh",
      "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Ladakh",
      "Lakshadweep",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Puducherry",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal"
    ]
  },
  "United Arab Emirates": {
    label: "United Arab Emirates",
    states: [
      "Abu Dhabi",
      "Ajman",
      "Dubai",
      "Fujairah",
      "Ras Al Khaimah",
      "Sharjah",
      "Umm Al Quwain"
    ]
  },
  "United States": {
    label: "United States",
    states: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", 
      "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", 
      "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", 
      "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", 
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
      "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", 
      "Wisconsin", "Wyoming"
    ]
  },
  "United Kingdom": {
    label: "United Kingdom",
    states: [
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland"
    ]
  },
  "Canada": {
    label: "Canada",
    states: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick", 
      "Newfoundland and Labrador", "Nova Scotia", "Ontario", 
      "Prince Edward Island", "Quebec", "Saskatchewan", 
      "Northwest Territories", "Nunavut", "Yukon"
    ]
  },
  "Australia": {
    label: "Australia",
    states: [
      "New South Wales", "Queensland", "South Australia", "Tasmania", 
      "Victoria", "Western Australia", "Australian Capital Territory", "Northern Territory"
    ]
  },
  "Singapore": {
    label: "Singapore",
    states: [
      "Central Region", "East Region", "North Region", "North-East Region", "West Region"
    ]
  },
  "Other": {
    label: "Other",
    states: []
  }
};

const COUNTRIES = Object.keys(COUNTRY_DATA);

/**
 * Mobile Bottom Sheet Modal for selecting State or Country (Matching Reference Image 2)
 */
function SelectionBottomSheet({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  return (
    <div className="fixed inset-0 z-[1000000] flex flex-col justify-end">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Floating circular close button right above sheet (Matching Reference Image 2) */}
      <div className="relative z-10 flex justify-center mb-3">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#1E2538] text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          aria-label="Close"
        >
          <X size={18} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Bottom Sheet Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#0E1322] rounded-t-[28px] max-h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>

          {/* Search box if list is long */}
          {options.length > 8 && (
            <div className="mt-3 relative">
              <input 
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 bg-slate-100 dark:bg-[#161D30] rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600/30"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 font-medium">
              No matching options found
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected = opt.toLowerCase() === selected.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className={`w-full px-6 py-3.5 text-left text-sm transition-colors flex items-center justify-between ${
                    isSelected 
                      ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20" 
                      : "font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">✓</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function AddPartyPage() {
  const router = useRouter();
  const { currencySymbol: sym } = useCurrency();

  // Core Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // Accordion Section States (closed by default)
  const [addressOpen, setAddressOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);

  // Address Fields
  const [addrLine1, setAddrLine1] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("Delhi");
  const [countryVal, setCountryVal] = useState("India");
  const [addressPhone, setAddressPhone] = useState("");

  // Sheet States
  const [stateSheetOpen, setStateSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);

  // Personal Details Fields
  const [dobVal, setDobVal] = useState("");
  const [anniversaryVal, setAnniversaryVal] = useState("");
  const [notesVal, setNotesVal] = useState("");

  // UI / Pin Fetch State
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available states dynamic list based on selected Country
  const currentStatesList = useMemo(() => {
    return COUNTRY_DATA[countryVal]?.states || [];
  }, [countryVal]);

  const handleCountryChange = (newCountry: string) => {
    setCountryVal(newCountry);
    const countryStates = COUNTRY_DATA[newCountry]?.states || [];
    if (countryStates.length > 0) {
      setStateVal(countryStates[0]);
    } else {
      setStateVal("");
    }
  };

  // Auto-fetch city & state from 6-digit Indian PIN code
  useEffect(() => {
    if (countryVal !== "India") return;
    const cleanedPin = pinCode.replace(/\D/g, "");
    if (cleanedPin.length === 6) {
      let isMounted = true;
      setPinLoading(true);
      setPinMessage(null);

      fetch(`https://api.postalpincode.in/pincode/${cleanedPin}`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            const district = po.District || po.Circle || "";
            const fetchedState = po.State || "";
            if (district) setCity(district);
            if (fetchedState) {
              const indianStates = COUNTRY_DATA["India"].states;
              const matchedState = indianStates.find(
                s => s.toLowerCase() === fetchedState.toLowerCase()
              ) || fetchedState;
              setStateVal(matchedState);
            }
            setPinMessage(`✓ ${district}, ${fetchedState}`);
          } else {
            setPinMessage("Invalid PIN Code");
          }
        })
        .catch(() => {
          if (isMounted) setPinMessage("Could not verify PIN");
        })
        .finally(() => {
          if (isMounted) setPinLoading(false);
        });

      return () => { isMounted = false; };
    } else {
      setPinMessage(null);
    }
  }, [pinCode, countryVal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Customer name and phone number are required.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const addressParts = [
      addrLine1.trim(),
      city.trim(),
      stateVal.trim(),
      pinCode.trim() ? `PIN: ${pinCode.trim()}` : "",
      countryVal.trim() && countryVal !== "India" ? countryVal.trim() : "",
      addressPhone.trim() ? `Alt Phone: ${addressPhone.trim()}` : ""
    ].filter(Boolean);

    const fullAddress = addressParts.join(", ");

    let consolidatedRemarks = notesVal.trim();
    if (anniversaryVal) {
      consolidatedRemarks = consolidatedRemarks 
        ? `${consolidatedRemarks} | Anniversary: ${anniversaryVal}`
        : `Anniversary: ${anniversaryVal}`;
    }

    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: fullAddress,
          dob: dobVal || null,
          remarks: consolidatedRemarks || null,
          walletBalance: openingBalance ? parseFloat(openingBalance) || 0 : 0,
          openingBalance: openingBalance ? parseFloat(openingBalance) || 0 : 0
        })
      });

      if (res.ok) {
        router.push("/dashboard/parties");
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || "Failed to save customer");
      }
    } catch {
      setErrorMsg("An error occurred while saving customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#070913] flex flex-col">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#0B0F19] border-b border-slate-200/80 dark:border-white/5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => router.back()} 
              className="p-1 -ml-1 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90"
              aria-label="Back"
            >
              <ArrowLeft size={22} className="stroke-[2.5]" />
            </button>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Add Customer
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-3.5 pb-24">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Core Inputs Card */}
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            
            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <span>Customer Name</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input 
                required
                autoFocus
                type="text"
                placeholder="Enter customer name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <span>Phone Number</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <input 
                required
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Opening Balance
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                  {sym}
                </span>
                <input 
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-3 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Accordion 1: Customer Address */}
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => setAddressOpen(prev => !prev)}
              className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Customer Address
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {addrLine1 || city ? `${city ? city + ", " : ""}${stateVal || "Address filled"}` : "Add Address"}
                </span>
              </div>
              <div className="text-slate-400">
                {addressOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {addressOpen && (
              <div className="px-4 sm:px-5 pt-1 pb-5 border-t border-slate-100 dark:border-white/5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                
                {/* Address Line 1 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Address Line 1
                  </label>
                  <input 
                    type="text"
                    placeholder="Shop/Flat No., Building, Street Area"
                    value={addrLine1}
                    onChange={e => setAddrLine1(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Pin Code & City */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Pin Code
                      </label>
                      {pinLoading && <Loader2 size={12} className="text-indigo-600 animate-spin" />}
                    </div>
                    <input 
                      type="text"
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={pinCode}
                      onChange={e => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                    {pinMessage && (
                      <p className={`text-[10px] font-medium leading-none mt-1 ${pinMessage.startsWith("✓") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {pinMessage}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      City
                    </label>
                    <input 
                      type="text"
                      placeholder="City / District"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* State & Country Dropdowns with SelectionBottomSheet */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      State
                    </label>
                    {currentStatesList.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setStateSheetOpen(true)}
                        className="w-full text-left px-3.5 py-2.5 pr-8 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all flex items-center justify-between"
                      >
                        <span className="truncate">{stateVal || "Select State"}</span>
                        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                      </button>
                    ) : (
                      <input
                        type="text"
                        placeholder="Enter State / Region"
                        value={stateVal}
                        onChange={e => setStateVal(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Country
                    </label>
                    <button
                      type="button"
                      onClick={() => setCountrySheetOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 pr-8 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all flex items-center justify-between"
                    >
                      <span className="truncate">{countryVal || "Select Country"}</span>
                      <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Selection Bottom Sheets */}
                {stateSheetOpen && currentStatesList.length > 0 && (
                  <SelectionBottomSheet
                    title="Select State"
                    options={currentStatesList}
                    selected={stateVal}
                    onSelect={(val) => setStateVal(val)}
                    onClose={() => setStateSheetOpen(false)}
                  />
                )}

                {countrySheetOpen && (
                  <SelectionBottomSheet
                    title="Select Country"
                    options={COUNTRIES}
                    selected={countryVal}
                    onSelect={(val) => handleCountryChange(val)}
                    onClose={() => setCountrySheetOpen(false)}
                  />
                )}

                {/* Alternate Phone No. */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Phone No. (Optional)
                  </label>
                  <input 
                    type="tel"
                    placeholder="Alternate contact number"
                    value={addressPhone}
                    onChange={e => setAddressPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-mono outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Personal Details */}
          <div className="bg-white dark:bg-[#0B0F19] border border-slate-200/90 dark:border-white/5 rounded-2xl overflow-hidden shadow-xs transition-all">
            <button
              type="button"
              onClick={() => setPersonalOpen(prev => !prev)}
              className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Personal Details
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {dobVal || anniversaryVal || notesVal ? "Details added" : "Birthday, Anniversary & More"}
                </span>
              </div>
              <div className="text-slate-400">
                {personalOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {personalOpen && (
              <div className="px-4 sm:px-5 pt-1 pb-5 border-t border-slate-100 dark:border-white/5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                
                {/* Birthday & Anniversary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Birthday
                    </label>
                    <input 
                      type="date"
                      value={dobVal}
                      onChange={e => setDobVal(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Anniversary
                    </label>
                    <input 
                      type="date"
                      value={anniversaryVal}
                      onChange={e => setAnniversaryVal(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Notes
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Add special preferences or notes..."
                    value={notesVal}
                    onChange={e => setNotesVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 dark:bg-[#111625] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/5 z-20">
            <div className="max-w-2xl mx-auto">
              <button 
                disabled={saving} 
                type="submit" 
                className="w-full py-3.5 sm:py-4 bg-[#635BFF] hover:bg-[#5248E5] text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving Customer...</span>
                  </>
                ) : (
                  <span>Save Customer</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

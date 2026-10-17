"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "@/components/AuthContext";
import { toast } from "react-hot-toast";
import { Fuel, Car, IndianRupee, Printer, Save, FileText, Droplet, Settings, X } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useProfileCache } from "@/hooks/useProfileCache";

export default function FuelBillingPage() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const { profile, updateProfile } = useProfileCache();
  const [hasInitProfile, setHasInitProfile] = useState(false);
  
  // Form State
  const [fuelType, setFuelType] = useState<"PETROL" | "DIESEL">("DIESEL");
  const [rate, setRate] = useState<string>("101.20");
  const [saleAmount, setSaleAmount] = useState<string>("500");
  const [volume, setVolume] = useState<string>("4.94");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  
  // Print State
  const [lastBill, setLastBill] = useState<any>(null);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [fuelLogoSize, setFuelLogoSize] = useState<number>(60);
  const [fuelAddressSize, setFuelAddressSize] = useState<number>(24);
  const [fuelTextSize, setFuelTextSize] = useState<number>(20);
  const [fuelTextWeight, setFuelTextWeight] = useState<number>(700);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (profile && !hasInitProfile) {
      if (profile.printSettings) {
        if (profile.printSettings.fuelLogoSize) setFuelLogoSize(profile.printSettings.fuelLogoSize);
        if (profile.printSettings.fuelAddressSize) setFuelAddressSize(profile.printSettings.fuelAddressSize);
        if (profile.printSettings.fuelTextSize) setFuelTextSize(profile.printSettings.fuelTextSize);
        if (profile.printSettings.fuelTextWeight) setFuelTextWeight(profile.printSettings.fuelTextWeight);
      }
      setHasInitProfile(true);
    }
  }, [profile, hasInitProfile]);

  // Auto-calculate volume when sale or rate changes
  useEffect(() => {
    const r = parseFloat(rate);
    const s = parseFloat(saleAmount);
    if (!isNaN(r) && r > 0 && !isNaN(s)) {
      setVolume((s / r).toFixed(2));
    }
  }, [saleAmount, rate]);

  const handleGenerate = async () => {
    if (!rate || !saleAmount || !volume) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fuel-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo,
          fuelType,
          rate,
          saleAmount,
          volume,
        }),
      });

      if (!res.ok) throw new Error("Failed to save bill");
      const billData = await res.json();
      setLastBill(billData);
      
      toast.success("Bill generated successfully!");
      
      // Reset vehicle for next customer
      setVehicleNo("");
      
      // Trigger Print after a tiny delay for state to settle
      setTimeout(() => {
        handlePrint(billData);
      }, 500);

    } catch (error) {
      toast.error("Error generating bill");
    } finally {
      setLoading(false);
    }
  };

  const saveFuelSettings = async () => {
    setSavingSettings(true);
    try {
      const updatedPrintSettings = {
        ...(profile?.printSettings || {}),
        fuelLogoSize,
        fuelAddressSize,
        fuelTextSize,
        fuelTextWeight
      };
      
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: profile?.id,
          printSettings: updatedPrintSettings
        }),
      });
      
      if (res.ok) {
        updateProfile({ printSettings: updatedPrintSettings }, false);
        toast.success("Print settings saved!");
        setShowSettings(false);
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrint = (bill: any) => {
    if (!profile) return;

    const iframe = printIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const dateStr = format(new Date(bill.createdAt), "dd/MM/yyyy");
    const timeStr = format(new Date(bill.createdAt), "HH:mm");
    
    // Hardcoded demo values based on IndianOil receipt
    const fpId = "1";
    const nozzleNo = "2";
    const businessName = profile.businessName || "FILLING POINT";

    const printHTML = `
      <html>
        <head>
          <style>
            @page {
              margin: 0;
              size: 58mm auto;
            }
            body {
              font-family: monospace;
              width: 100%;
              max-width: 58mm;
              margin: 0 auto;
              padding: 0px 2px;
              font-size: ${fuelTextSize}px;
              font-weight: ${fuelTextWeight};
              line-height: 1.2;
              color: black;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .nowrap { white-space: nowrap; }
            .logo-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 25px;
            }
            .logo-circle {
              width: ${fuelLogoSize * 1.83}px;
              height: ${fuelLogoSize * 1.83}px;
              border: 3px solid black;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .logo-text-hi {
              font-size: ${fuelLogoSize * 0.3}px;
              font-weight: 900;
              z-index: 2;
              background: white;
              padding: 0 8px;
            }
            .logo-line {
              position: absolute;
              top: 50%;
              left: 0;
              right: 0;
              border-top: 3px solid black;
              border-bottom: 3px solid black;
              height: 6px;
              transform: translateY(-50%);
              z-index: 1;
            }
            .brand-name {
              font-weight: 900;
              font-size: ${fuelLogoSize * 0.5}px;
              margin-top: 10px;
              font-family: sans-serif;
            }
            .text-left { 
              text-align: left; 
              font-size: ${fuelAddressSize}px;
            }
            .mb { margin-bottom: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 2px 0;
              vertical-align: top;
            }
            .col1 {
              width: 120px;
              white-space: nowrap;
            }
            .col2 {
              width: 20px;
              text-align: center;
            }
            .col3 {
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="logo-container">
            ${profile.logoUrl 
              ? `<img src="${profile.logoUrl}" style="height: ${fuelLogoSize}px; object-fit: contain; filter: contrast(1000%) grayscale(100%) brightness(1.1);" />` 
              : `
              <div class="logo-circle">
                <div class="logo-line"></div>
                <div class="logo-text-hi">इंडियनऑयल</div>
              </div>
              <div class="brand-name">IndianOil</div>
            `}
          </div>
          
          <div class="text-left mb">
            ${businessName}<br>
            ${profile.businessAddress ? profile.businessAddress.replace(/\n/g, '<br>') : '7 0<br>70'}
          </div>
          
          <div class="center" style="margin-top: 15px; margin-bottom: 5px;">
            ORIGINAL
          </div>
          <div class="center" style="letter-spacing: 2px; margin-top: 5px; margin-bottom: 5px;">жжжжжжжжжжжжжжжжжж</div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${format(new Date(bill.createdAt), "dd-MMM-yyyy").toUpperCase()}</span>
            <span>${format(new Date(bill.createdAt), "HH:mm:ss")}</span>
          </div>
          <div style="margin-bottom: 2px;">TXN NO: ${bill.billNumber.replace('FB-', '0001604')}</div>
          <div style="margin-bottom: 2px;">INVOICE NO: ${bill.billNumber.replace('FB-', '152')}</div>
          <div style="margin-bottom: 2px;">VEHICLE NO: ${bill.vehicleNo || "NOT ENTERED"}</div>
          <div style="margin-bottom: 2px;">PRESET: ${parseFloat(bill.saleAmount).toFixed(2)} INR</div>
          <div class="center" style="letter-spacing: 2px; margin-top: 5px; margin-bottom: 5px;">жжжжжжжжжжжжжжжжжж</div>
          
          <div class="nowrap" style="margin-bottom: 2px;">NOZZLE NO : ${nozzleNo}</div>
          <div class="nowrap" style="margin-bottom: 2px;">PRODUCT: ${bill.fuelType.toUpperCase()}</div>
          <div class="nowrap" style="margin-bottom: 2px;">DENSITY: ${bill.fuelType.toLowerCase().includes('petrol') ? '745.0' : '829.5'} kg/m3</div>
          <div class="nowrap" style="margin-bottom: 2px;">RATE&nbsp;&nbsp;&nbsp;&nbsp;: ${parseFloat(bill.rate).toFixed(2)} INR/L</div>
          <div class="nowrap" style="margin-bottom: 2px;">VOLUME: ${parseFloat(bill.volume).toFixed(2)} L</div>
          <div class="nowrap" style="margin-bottom: 2px;">AMOUNT: ${parseFloat(bill.saleAmount).toFixed(2)} INR</div>
          <div class="center" style="letter-spacing: 2px; margin-top: 5px; margin-bottom: 5px;">жжжжжжжжжжжжжжжжжж</div>
          <div class="center nowrap" style="margin-top: 10px; font-size: 1.1em;">Thank You! Visit Again</div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(printHTML);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 kravy-page-fade">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center text-pink-600">
          <Fuel size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--kravy-text-primary)]">Fuel Station Billing</h1>
          <p className="text-sm text-[var(--kravy-text-muted)] font-medium">Generate physical receipts for Petrol/Diesel sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* ENTRY FORM */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-black text-[var(--kravy-text-primary)] flex items-center gap-2 mb-2">
            <FileText size={18} className="text-pink-500" />
            Bill Details
          </h3>

          {/* Fuel Type Toggle */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
            <button
              onClick={() => setFuelType("PETROL")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                fuelType === "PETROL" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <div className="flex justify-center items-center gap-2">
                <Droplet size={16} />
                PETROL
              </div>
            </button>
            <button
              onClick={() => setFuelType("DIESEL")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                fuelType === "DIESEL" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <div className="flex justify-center items-center gap-2">
                <Fuel size={16} />
                DIESEL
              </div>
            </button>
          </div>

          <div className="space-y-4">
            {/* Vehicle Number */}
            <div>
              <label className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mb-2 block">
                Vehicle Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Car size={18} />
                </div>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. MH12AB1234"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-[var(--kravy-text-primary)] font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/50 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rate */}
              <div>
                <label className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mb-2 block">
                  Rate (₹ / L)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-[var(--kravy-text-primary)] font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                  />
                </div>
              </div>

              {/* Volume (Liters) */}
              <div>
                <label className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mb-2 block">
                  Volume (Liters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={volume}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent rounded-xl py-3 px-4 text-slate-500 font-bold opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Sale Amount */}
            <div>
              <label className="text-xs font-bold text-[var(--kravy-text-muted)] uppercase tracking-wider mb-2 block">
                Sale Amount (₹)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500">
                  <IndianRupee size={22} />
                </div>
                <input
                  type="number"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  className="w-full bg-pink-50 dark:bg-pink-900/10 border-2 border-pink-200 dark:border-pink-800 rounded-2xl py-4 pl-12 pr-4 text-3xl text-pink-700 dark:text-pink-400 font-black focus:outline-none focus:ring-4 focus:ring-pink-500/20"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-600/20 active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Printer size={20} />
                GENERATE & PRINT BILL
              </>
            )}
          </button>
        </div>

        {/* RECENT BILLS OR PREVIEW */}
        <div className="bg-[var(--kravy-surface)] border border-[var(--kravy-border)] rounded-[32px] p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-[var(--kravy-text-primary)] flex items-center gap-2">
              <Save size={18} className="text-indigo-500" />
              Last Generated Bill
            </h3>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
              title="Print Settings"
            >
              <Settings size={18} />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {!lastBill ? (
              <div className="text-center text-slate-400 font-medium space-y-3">
                <Printer size={48} className="mx-auto opacity-20" />
                <p>No bill generated yet in this session.</p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[280px] bg-white text-black p-4 shadow-2xl font-mono text-[11px] leading-[1.2] relative overflow-hidden"
              >
                <div className="flex flex-col items-center mb-4 relative z-10">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" style={{ height: (fuelLogoSize / 4) + 'px' }} className="object-contain grayscale contrast-200" />
                  ) : (
                    <>
                      <div className="border-[1.5px] border-black rounded-full flex items-center justify-center relative bg-white" style={{ width: (fuelLogoSize / 4) + 'px', height: (fuelLogoSize / 4) + 'px' }}>
                        <div className="absolute top-1/2 left-0 right-0 border-t-[1.5px] border-b-[1.5px] border-black h-[3px] -translate-y-1/2 z-0"></div>
                        <div className="font-bold z-10 bg-white px-1" style={{ fontSize: (fuelLogoSize / 15) + 'px' }}>इंडियनऑयल</div>
                      </div>
                      <div className="font-bold mt-1 font-sans" style={{ fontSize: (fuelLogoSize / 9) + 'px' }}>IndianOil</div>
                    </>
                  )}
                </div>

                <div className="text-left mb-3" style={{ fontSize: (fuelAddressSize / 2) + 'px' }}>
                  {profile?.businessName || "SARAT FILLING POINT"}<br />
                  {profile?.businessAddress ? (
                    profile.businessAddress.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))
                  ) : (
                    <>7 0<br />70<br /></>
                  )}
                  {profile?.contactPersonPhone || "7894364780"}
                </div>
                
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td colSpan={3}>Bill No:{lastBill.billNumber}-ORGNL</td></tr>
                    <tr><td colSpan={3}>Trns.ID:</td></tr>
                    <tr><td colSpan={3}>Atnd.ID:</td></tr>
                    <tr><td colSpan={3}>Receipt:Physical Receipt</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Vehi.No</td><td className="w-[10px] text-center">:</td><td className="text-left">{lastBill.vehicleNo || ""}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Mob.No</td><td className="w-[10px] text-center">:</td><td className="text-left">NotEntered</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Date</td><td className="w-[10px] text-center">:</td><td className="text-left">{format(new Date(lastBill.createdAt), "dd/MM/yyyy")}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Time</td><td className="w-[10px] text-center">:</td><td className="text-left">{format(new Date(lastBill.createdAt), "HH:mm:ss")}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">FP. ID</td><td className="w-[10px] text-center">:</td><td className="text-left">1</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Nozl No</td><td className="w-[10px] text-center">:</td><td className="text-left">2</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Fuel</td><td className="w-[10px] text-center">:</td><td className="text-left">{lastBill.fuelType}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Preset</td><td className="w-[10px] text-center">:</td><td className="text-left">Rs.{parseFloat(lastBill.saleAmount).toFixed(0)}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Rate</td><td className="w-[10px] text-center">:</td><td className="text-left">Rs.{parseFloat(lastBill.rate).toFixed(2)}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Sale</td><td className="w-[10px] text-center">:</td><td className="text-left">Rs.{parseFloat(lastBill.saleAmount).toFixed(2)}</td></tr>
                    <tr><td className="w-[60px] whitespace-nowrap py-[1px]">Volume</td><td className="w-[10px] text-center">:</td><td className="text-left">{parseFloat(lastBill.volume).toFixed(2)}L</td></tr>
                  </tbody>
                </table>
              </motion.div>
            )}
          </div>
          
          {lastBill && (
             <button
               onClick={() => handlePrint(lastBill)}
               className="mt-4 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all"
             >
               <Printer size={16} />
               REPRINT LAST BILL
             </button>
          )}
        </div>

      </div>
      
      {/* Invisible Iframe for Printing */}
      <iframe ref={printIframeRef} style={{ display: 'none' }} title="Print Receipt" />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-indigo-500" />
                Receipt Customization
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Logo Size</label>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">{fuelLogoSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="200" 
                  value={fuelLogoSize} 
                  onChange={(e) => setFuelLogoSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Address Font Size</label>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">{fuelAddressSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="48" 
                  value={fuelAddressSize} 
                  onChange={(e) => setFuelAddressSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Base Text Size</label>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">{fuelTextSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="40" 
                  value={fuelTextSize} 
                  onChange={(e) => setFuelTextSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Text Boldness (Weight)</label>
                  <span className="text-xs font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">
                    {fuelTextWeight === 400 ? "Normal" : fuelTextWeight >= 700 ? "Bold" : fuelTextWeight <= 300 ? "Light" : "Medium"} ({fuelTextWeight})
                  </span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="900" 
                  step="100"
                  value={fuelTextWeight} 
                  onChange={(e) => setFuelTextWeight(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={saveFuelSettings}
                disabled={savingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {savingSettings ? "SAVING..." : "SAVE SETTINGS"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

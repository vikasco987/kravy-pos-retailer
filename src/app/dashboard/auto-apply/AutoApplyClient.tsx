"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { FileUp, Layers, Play, ScanText, Sheet, LayoutGrid, Image as ImageIcon, ImageOff, X, Search, Globe, XCircle, Sparkles, Store, UserCircle, Rocket, Check, Camera, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AutoApplyClient() {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("Radha@987k");
    const [showPassword, setShowPassword] = useState(false);

    const [restName, setRestName] = useState("");
    const [restAddress, setRestAddress] = useState("");
    const [restTimings, setRestTimings] = useState("");
    const [restPhone, setRestPhone] = useState("");

    const [fileQueue, setFileQueue] = useState<File[]>([]);
    const [extractedItems, setExtractedItems] = useState<any[]>([]);
    const [aiLanguagePref, setAiLanguagePref] = useState("english");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const businessFileInputRef = useRef<HTMLInputElement>(null);
    const [isExtractingBusiness, setIsExtractingBusiness] = useState(false);
    const [globalZone, setGlobalZone] = useState("");

    const [ocrStatus, setOcrStatus] = useState({ text: "Pending", colorClass: "text-gray-500", isLoading: false });
    const [imgStatus, setImgStatus] = useState({ text: "Pending", colorClass: "text-gray-500", isLoading: false });
    
    const [progress, setProgress] = useState({ completed: 0, total: 0 });

    const [isExportReady, setIsExportReady] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Sidebar state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarItemIndex, setSidebarItemIndex] = useState(-1);
    const [sidebarQuery, setSidebarQuery] = useState("");
    const [sidebarImages, setSidebarImages] = useState<any[]>([]);
    const [sidebarIsLoading, setSidebarIsLoading] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [deploying, setDeploying] = useState(false);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) {
            addFilesToQueue(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFilesToQueue(Array.from(e.target.files));
        }
    };

    const addFilesToQueue = (files: File[]) => {
        if (!files || files.length === 0) return;
        setFileQueue(prev => [...prev, ...files]);
    };

    const removeFileFromQueue = (idx: number) => {
        setFileQueue(prev => prev.filter((_, i) => i !== idx));
    };

    const handleBusinessFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtractingBusiness(true);
        try {
            const formData = new FormData();
            formData.append("menuFile", file);
            
            const parseRes = await fetch("/api/menu/upload-ocr?parseOnly=true", {
                method: "POST",
                body: formData
            });
            if (!parseRes.ok) throw new Error("Failed to parse image");
            const parseData = await parseRes.json();
            
            const keyRes = await fetch("/api/menu/get-keys");
            const { apiKey } = await keyRes.json();
            
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
            const geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Extract the following details from this business card, bill, or menu image. Respond strictly with JSON in this format: {\"restaurantName\": \"\", \"address\": \"\", \"phone\": \"\", \"email\": \"\", \"timings\": \"\"}. Leave empty if not found." },
                            ...parseData.partsArray
                        ]
                    }],
                    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
                })
            });
            
            const geminiData = await geminiRes.json();
            const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
                const data = JSON.parse(textResponse);
                if (data.restaurantName) {
                    setRestName(data.restaurantName);
                    if (!email) {
                        let cleanEmailName = data.restaurantName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                        if (cleanEmailName) setEmail(`${cleanEmailName}@kravy.in`);
                    }
                }
                if (data.address) setRestAddress(data.address);
                if (data.phone) {
                    setRestPhone(data.phone);
                    if (!phone) setPhone(data.phone);
                }
                if (data.timings) setRestTimings(data.timings);
                if (data.email && !email) setEmail(data.email);
            }
        } catch (err: any) {
            console.error(err);
            alert("Auto-fill failed: " + err.message);
        } finally {
            setIsExtractingBusiness(false);
            if (businessFileInputRef.current) businessFileInputRef.current.value = "";
        }
    };

    const startProcessingQueue = async () => {
        if (fileQueue.length === 0) return;

        setOcrStatus({ text: "Extracting...", colorClass: "text-orange-500", isLoading: true });
        setProgress({ completed: 0, total: 0 });
        setIsExportReady(false);

        const totalFiles = fileQueue.length;
        let currentFileIdx = 0;
        const filesToProcess = [...fileQueue];
        setFileQueue([]);
        setExtractedItems([]);

        let combinedMenu: any[] = [];
        let lastSuccessData: any = null;

        for (let file of filesToProcess) {
            currentFileIdx++;
            setOcrStatus({ text: `Extracting ${currentFileIdx}/${totalFiles}...`, colorClass: "text-orange-500", isLoading: true });
            
            try {
                const formData = new FormData();
                formData.append("menuFile", file);
                formData.append("languagePref", aiLanguagePref);
                
                // Step 1: Fast Parse (gets prompt and base64/CSV from our server instantly)
                const parseRes = await fetch("/api/menu/upload-ocr?parseOnly=true", {
                    method: "POST",
                    body: formData
                });
                
                if (!parseRes.ok) {
                    const errorText = await parseRes.text();
                    throw new Error(`Server Parsing Error ${parseRes.status}: ${errorText}`);
                }
                const parseData = await parseRes.json();
                if (!parseData.success || !parseData.partsArray) {
                    throw new Error("Failed to parse file for AI processing");
                }

                // Step 2: Get Secure API Key
                const keyRes = await fetch("/api/menu/get-keys");
                if (!keyRes.ok) {
                    const errTxt = await keyRes.text();
                    throw new Error(`Failed to fetch API key: ${errTxt}`);
                }
                const keyDataText = await keyRes.text();
                let keyData: any = {};
                try {
                    keyData = JSON.parse(keyDataText);
                } catch (e) {
                    throw new Error(`Invalid Key Response: ${keyDataText}`);
                }
                const { apiKey } = keyData;
                if (!apiKey) throw new Error("API Key is missing on the server (Ensure GEMINI_API_KEY is set in .env)");

                // Step 3: Direct Client-Side Gemini Call (Bypasses Vercel 60s Timeout)
                setOcrStatus({ text: `Analyzing with AI (Takes 1-3 mins)...`, colorClass: "text-orange-500", isLoading: true });
                const modelsToTry = [
                    "gemini-3.5-flash",
                    "gemini-2.5-flash",
                    "gemini-2.0-flash",
                    "gemini-flash-latest"
                ];

                const apiKeys = apiKey.split(',').map((k: string) => k.trim());
                
                let textResponse = "";
                let lastError: any = null;

                for (const model of modelsToTry) {
                    for (const currentKey of apiKeys) {
                        try {
                            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
                            const geminiRes = await fetch(geminiUrl, {
                                method: "POST",
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: parseData.partsArray }],
                                    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
                                })
                            });

                            const resText = await geminiRes.text();

                            if (!geminiRes.ok) {
                                let errMsg = `HTTP ${geminiRes.status}: ${resText}`;
                                try {
                                    const errorJson = JSON.parse(resText);
                                    errMsg = errorJson.error?.message || errMsg;
                                } catch (e) {}
                                throw new Error(errMsg);
                            }

                            let geminiData: any = {};
                            try {
                                geminiData = JSON.parse(resText);
                            } catch (e) {
                                throw new Error(`Gemini invalid JSON response: ${resText}`);
                            }

                            textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (textResponse) break; // Break API key loop
                        } catch (err) {
                            lastError = err;
                            console.warn(`Model ${model} with key ${currentKey.substring(0, 5)}... failed`, err);
                        }
                    }
                    if (textResponse) break; // Break model loop
                }

                if (!textResponse) {
                    throw new Error(`All AI models failed: ${lastError?.message || "No response"}`);
                }

                // Step 4: Parse AI JSON response and apply the same smart grouping logic
                let parsedMenu;
                try {
                    let cleanText = textResponse.trim();
                    if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
                    if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
                    if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
                    
                    // Replace literal newlines and control chars with space to prevent 'Unterminated string' errors
                    cleanText = cleanText.replace(/[\n\r\t]+/g, ' ');
                    
                    // Remove trailing commas inside objects and arrays (fixes "Expected double-quoted property name")
                    cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                    
                    parsedMenu = JSON.parse(cleanText);
                } catch (parseErr: any) {
                    console.warn("JSON parse failed, attempting auto-repair...", parseErr);
                    let cleanText = textResponse.replace(/[\n\r]+/g, ' ');
                    cleanText = cleanText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                    let repaired = cleanText.replace(/,[^,]*$/, ''); // remove trailing incomplete property
                    
                    const closingOptions = [']', '}]', ']}', ']}]}', '}', '}}', '}]}'];
                    let success = false;
                    
                    for (const closing of closingOptions) {
                        try {
                            parsedMenu = JSON.parse(repaired + closing);
                            success = true;
                            break;
                        } catch(e) {}
                    }
                    
                    if (!success) {
                        // try more aggressive removal of the last two items in case it was deeply truncated
                        repaired = repaired.replace(/,[^,]*$/, '');
                        for (const closing of closingOptions) {
                            try {
                                parsedMenu = JSON.parse(repaired + closing);
                                success = true;
                                break;
                            } catch(e) {}
                        }
                    }
                    
                    if (!success) {
                        // Bulletproof strategy: discard the broken object completely by truncating at the last '}'
                        const lastBrace = textResponse.lastIndexOf('}');
                        if (lastBrace !== -1) {
                            let aggressiveRepair = textResponse.substring(0, lastBrace + 1);
                            for (const closing of closingOptions) {
                                try {
                                    parsedMenu = JSON.parse(aggressiveRepair + closing);
                                    success = true;
                                    break;
                                } catch(e) {}
                            }
                        }
                    }
                    
                    if (!success) {
                        throw new Error(`AI JSON is truncated and cannot be parsed. Try a smaller file. Error: ${parseErr.message}`);
                    }
                }
                
                let menuItems: any[] = parsedMenu.menu || [];
                
                // Send to our backend to run the identical smart merging logic
                // Or just do basic parsing here and let the server handle it?
                // Wait, it's easier to use a quick server API to normalize it or we can just use the raw extracted menu.
                // For simplicity, we just use the raw items as we can't easily duplicate 100 lines of complex grouping logic here.
                // Wait, let's just make a fast API route to post-process the items!
                // Actually, I can just send the raw parsedMenu to another endpoint or process it here.
                // To keep it 100% same, we will create a fast post-process API endpoint.
                
                const processRes = await fetch("/api/menu/post-process", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedMenu)
                });
                
                if (!processRes.ok) throw new Error("Failed to post-process AI data");
                const data = await processRes.json();
                
                const extracted = data.menu || [];
                
                if (data.success && extracted.length > 0) {
                    combinedMenu = combinedMenu.concat(extracted.map((e: any) => ({ ...e, assigned_image: null, img_status: 'waiting' })));
                    lastSuccessData = data;
                } else {
                    throw new Error(data.error || "No items were extracted");
                }
            } catch (err: any) {
                console.error("Error processing file", file.name, err);
                alert(`Upload Failed for ${file.name}:\n\n${err.message}`);
            }
        }

        if (combinedMenu.length > 0) {
            setExtractedItems(combinedMenu);
            
            setOcrStatus({ text: "Success", colorClass: "text-emerald-500", isLoading: false });
            
            // Kick off auto applying images
            autoApplyImages(combinedMenu);
        } else {
            setOcrStatus({ text: "Failed All", colorClass: "text-rose-500", isLoading: false });
        }
    };

    const autoApplyImages = async (items: any[]) => {
        setImgStatus({ text: "Fetching...", colorClass: "text-orange-500", isLoading: true });
        const total = items.length;
        let completed = 0;
        
        let currentItems = [...items];
        
        const chunkSize = 3;
        
        for (let i = 0; i < total; i += chunkSize) {
            const chunk = currentItems.slice(i, i + chunkSize);
            
            const fetchPromises = chunk.map(async (item, chunkIndex) => {
                const actualIndex = i + chunkIndex;
                
                try {
                    const rawName = item.item_name || item.name || "";
                    let cleanName = rawName.replace(/^\(v\)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
                    if (!cleanName) cleanName = rawName.trim();
                    
                    if (!cleanName) throw new Error("Empty name");
                    
                    const res = await fetch(`/api/proxy/image-search?q=${encodeURIComponent(cleanName)}`);
                    if (!res.ok) throw new Error("Search failed");
                    
                    const data = await res.json();
                    const photos = data.data || [];
                    
                    let assignedImg = null;
                    
                    for (const photo of photos) {
                        const imgUrl = photo.image_url || photo.image || photo.url;
                        if (imgUrl) {
                            assignedImg = imgUrl;
                            break;
                        }
                    }
                    
                    currentItems[actualIndex].assigned_image = assignedImg;
                    currentItems[actualIndex].img_status = assignedImg ? 'success' : 'not_found';
                    
                } catch (e) {
                    console.error(`Failed for ${item.name}:`, e);
                    currentItems[actualIndex].img_status = 'error';
                }
                
                completed++;
                setProgress({ completed, total });
                setExtractedItems([...currentItems]);
            });
            
            await Promise.all(fetchPromises);
        }
        
        setImgStatus({ text: "Complete", colorClass: "text-emerald-500", isLoading: false });
        setIsExportReady(true);
    };

    const exportToExcel = () => {
        if (extractedItems.length === 0) return;
        
        const excelData = extractedItems.map(item => ({
            "Category Name": item.category_name || item.category || "",
            "Sub Category Name": item.sub_category_name || item.subcategory || "",
            "Item Name": item.item_name || item.name || "",
            "Price": item.price || item.price_default || "",
            "Description": item.description || "",
            "Food Type (veg/egg/non-veg)": item.food_type || item.type || "",
            "Image URL": item.assigned_image || ""
        }));
        
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auto_Applied_Menu");
        
        XLSX.writeFile(wb, "Kravy_Auto_Applied_Menu.xlsx");
    };

    const deployMerchant = async () => {
        if (!email || !phone || !password || !restName) {
            alert("Please fill in all mandatory fields: Email, Phone, Password, and Restaurant Name.");
            return;
        }

        if (extractedItems.length === 0) {
            alert("Please upload and extract a menu first.");
            return;
        }

        setDeploying(true);

        const onboardMenuItems = extractedItems.map(item => ({
            name: item.item_name || item.name || 'Unnamed Item',
            category: item.category_name || item.category || 'Uncategorized',
            price: item.price || item.price_default || '0',
            imageUrl: item.assigned_image || null,
            variants: item.variants || undefined
        }));

        const payload = {
            email,
            phone,
            password,
            restaurantName: restName,
            address: restAddress,
            timings: restTimings,
            contactPhone: restPhone,
            menu: onboardMenuItems,
            globalZone: globalZone.trim() || undefined
        };

        try {
            const res = await fetch("/api/merchant/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to deploy merchant");
            }

            setShowSuccessModal(true);
        } catch (e: any) {
            console.error(e);
            alert(`Deployment Failed:\n${e.message}`);
        } finally {
            setDeploying(false);
        }
    };

    const copyOnboardCredentials = () => {
        const textToCopy = `*Kravy POS - Merchant Login*\n\nHere are your login credentials:\n*App Link:* https://play.google.com/store/apps/details?id=com.vikas9095.kravy\n*Dashboard Link:* https://billing.kravy.in\n*Email:* ${email}\n*Phone:* ${phone}\n*Password:* ${password}\n\nPlease keep these safe!`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("Copied!");
        });
    };

    // Sidebar Image Search
    const openImageSidebar = (index: number) => {
        const item = extractedItems[index];
        if (!item) return;
        
        setSidebarItemIndex(index);
        
        const rawName = item.item_name || item.name || "";
        let cleanName = rawName.replace(/^\(v\)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
        if (!cleanName) cleanName = rawName.trim();
        
        setSidebarQuery(cleanName);
        setSidebarOpen(true);
        searchSidebarImages(cleanName, false);
    };

    const searchSidebarImages = async (query: string, useGoogle: boolean = false) => {
        if (!query) return;
        setSidebarIsLoading(true);
        setSidebarImages([]);
        
        try {
            let fetchUrl = `/api/proxy/image-search?q=${encodeURIComponent(query)}`;
            if (useGoogle) {
                fetchUrl = `/api/proxy/google-image-search?q=${encodeURIComponent(query)}`;
            }
            
            const res = await fetch(fetchUrl);
            const data = await res.json();
            
            if (data.data) {
                setSidebarImages(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSidebarIsLoading(false);
        }
    };

    const applySidebarImage = (imgUrl: string) => {
        if (sidebarItemIndex === -1) return;
        const newItems = [...extractedItems];
        newItems[sidebarItemIndex].assigned_image = imgUrl;
        newItems[sidebarItemIndex].img_status = 'success';
        setExtractedItems(newItems);
        setSidebarOpen(false);
    };

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{__html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Header */}
            <div className="flex justify-between items-center bg-white dark:bg-[#1A1A2E] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-orange-500" />
                        AI Menu Onboarding
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload Menu {'>'} OCR Extract {'>'} AI Image Search {'>'} Auto Create Merchant</p>
                </div>
                <Link href="/dashboard" className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition-all text-gray-700 dark:text-gray-300">
                    Back to Dashboard
                </Link>
            </div>

            {/* Main Workspace */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Section 1: Authentication */}
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <UserCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Merchant Login</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Credentials for the new account</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Email Address *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. delicious@kravy.in" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Phone Number *</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Password *</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 pr-14 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-[10px] font-bold uppercase">
                                    {showPassword ? "HIDE" : "SHOW"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Restaurant Details */}
                <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Store className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Business Info</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Restaurant details</p>
                            </div>
                        </div>
                        <input type="file" ref={businessFileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleBusinessFileUpload} />
                        <button onClick={() => businessFileInputRef.current?.click()} className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95">
                            {isExtractingBusiness ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            Auto Fill Image
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Restaurant Name *</label>
                            <input type="text" value={restName} onChange={e => setRestName(e.target.value)} placeholder="Restaurant Name" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Business Address</label>
                            <input type="text" value={restAddress} onChange={e => setRestAddress(e.target.value)} placeholder="Full Address" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Timings</label>
                                <input type="text" value={restTimings} onChange={e => setRestTimings(e.target.value)} placeholder="11 AM - 11 PM" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Contact</label>
                                <input type="text" value={restPhone} onChange={e => setRestPhone(e.target.value)} placeholder="Phone" className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Actions */}
                <div className="space-y-4 flex flex-col justify-between">
                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`bg-white dark:bg-[#1A1A2E] p-6 rounded-2xl text-center border-2 border-dashed transition-all cursor-pointer ${isDragOver ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-300 dark:border-gray-700 hover:border-orange-400'}`}>
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3 pointer-events-none">
                            <FileUp className="w-6 h-6" />
                        </div>
                        <div className="pointer-events-none mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Upload Menu File</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Image, PDF, Excel, or Word</p>
                        </div>
                        
                        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={handleFileUpload} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold text-xs rounded-xl transition-all">
                            Select File
                        </button>
                    </div>
                    
                    {fileQueue.length > 0 && (
                        <div className="bg-white dark:bg-[#1A1A2E] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">Queued Files ({fileQueue.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                                {fileQueue.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#0F0F23] rounded-lg border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <ScanText className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                            <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                        </div>
                                        <button onClick={() => removeFileFromQueue(idx)} className="text-red-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-2">
                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1">Translation Language</label>
                                <select
                                    value={aiLanguagePref}
                                    onChange={(e) => setAiLanguagePref(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-xs font-bold outline-none focus:border-blue-500 transition-all mb-2"
                                >
                                    <option value="english">English Only (Default)</option>
                                    <option value="dual">English + Regional (Hindi, etc.)</option>
                                    <option value="arabic">English + Arabian (Arabic)</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1">Assign Menu Zone (Optional)</label>
                                <input
                                    type="text"
                                    value={globalZone}
                                    onChange={(e) => setGlobalZone(e.target.value.toUpperCase())}
                                    placeholder="e.g. MAIN KITCHEN"
                                    className="w-full bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-xs font-bold outline-none focus:border-blue-500 transition-all mb-2 uppercase"
                                />
                            </div>

                            <button onClick={startProcessingQueue} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all">
                                <Play className="w-4 h-4" /> Start Extraction
                            </button>
                        </div>
                    )}
                    
                    <div className="bg-white dark:bg-[#1A1A2E] p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase">Operation Status</h3>
                        
                        <div className={`flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 ${ocrStatus.isLoading ? 'animate-pulse' : ''}`}>
                            <span className="flex items-center gap-2 text-xs"><ScanText className="w-3.5 h-3.5" /> OCR Extractor</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md ${ocrStatus.colorClass}`}>{ocrStatus.text}</span>
                        </div>
                        <div className={`flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 ${imgStatus.isLoading ? 'animate-pulse' : ''}`}>
                            <span className="flex items-center gap-2 text-xs"><ImageIcon className="w-3.5 h-3.5" /> Image Finder</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md ${imgStatus.colorClass}`}>{imgStatus.text}</span>
                        </div>
                        
                        <div className="pt-2">
                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                <span>{progress.completed} / {progress.total} Items</span>
                                <span>{progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%</span>
                            </div>
                        </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-3 transition-all ${isExportReady ? '' : 'opacity-50 pointer-events-none'}`}>
                        <button onClick={exportToExcel} className="col-span-1 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5">
                            <Sheet className="w-3.5 h-3.5" /> EXCEL
                        </button>
                        <button onClick={deployMerchant} disabled={deploying} className="col-span-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5">
                            {deploying ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Rocket className="w-3.5 h-3.5" />} DEPLOY
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Area: Results Grid */}
            <div className="bg-white dark:bg-[#1A1A2E] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-orange-500" />
                        Extracted Menu Database
                    </h2>
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                        {extractedItems.length} Items Loaded
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pb-4">
                    {extractedItems.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 h-64 gap-3">
                            <ImageIcon className="w-10 h-10 opacity-50" />
                            <p className="text-sm font-medium">Upload a menu file to populate this grid.</p>
                        </div>
                    ) : (
                        extractedItems.map((item, index) => (
                            <div key={index} onClick={() => openImageSidebar(index)} className="bg-gray-50 dark:bg-[#0F0F23] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group hover:border-orange-500/50 hover:shadow-md transition-all relative flex flex-col h-48 cursor-pointer">
                                <div className="p-3 bg-white dark:bg-[#1A1A2E] border-b border-gray-100 dark:border-gray-800 z-10 flex-shrink-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={item.name}>{item.name || 'Unnamed Item'}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[80px]">{item.category || 'Uncategorized'}</p>
                                        <p className="text-[11px] text-orange-500 font-bold">₹{item.price || '0'}</p>
                                    </div>
                                </div>
                                <div className="flex-1 bg-gray-100 dark:bg-black/40 flex items-center justify-center relative overflow-hidden">
                                    {item.img_status === 'waiting' && (
                                        <div className="flex flex-col items-center gap-1.5 opacity-50">
                                            <ImageOff className="w-5 h-5" />
                                            <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400">Waiting</span>
                                        </div>
                                    )}
                                    {item.img_status === 'success' && item.assigned_image && (
                                        <img src={item.assigned_image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Menu Item" />
                                    )}
                                    {item.img_status === 'not_found' && (
                                        <div className="flex flex-col items-center gap-1.5 opacity-60 text-red-400">
                                            <ImageOff className="w-5 h-5" />
                                            <span className="text-[9px] uppercase font-bold">Not Found</span>
                                        </div>
                                    )}
                                    {item.img_status === 'error' && (
                                        <div className="flex flex-col items-center gap-1.5 opacity-60 text-red-400">
                                            <XCircle className="w-5 h-5" />
                                            <span className="text-[9px] uppercase font-bold">Error</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Sidebar */}
            {sidebarOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] transition-opacity" onClick={() => setSidebarOpen(false)}></div>
                    <div className="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-white dark:bg-[#0a0a0c] border-l border-gray-200 dark:border-white/10 z-[300] shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">Image Selector</h3>
                                <p className="text-xs text-orange-500 mt-0.5 font-medium truncate w-56">{extractedItems[sidebarItemIndex]?.name}</p>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-red-500/20 text-gray-600 dark:text-white hover:text-red-500 flex items-center justify-center transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-black/20 space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-white/60">Search Database</label>
                            <div className="flex gap-2">
                                <input type="text" value={sidebarQuery} onChange={e => setSidebarQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSidebarImages(sidebarQuery, false)} className="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-xs focus:border-orange-500 focus:outline-none" placeholder="Search..." />
                                <button onClick={() => searchSidebarImages(sidebarQuery, false)} className="px-3 py-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white dark:hover:text-black rounded-xl font-bold transition-colors" title="Search FoodSnap Database">
                                    <Search className="w-4 h-4" />
                                </button>
                                <button onClick={() => searchSidebarImages(sidebarQuery, true)} className="px-3 py-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl font-bold transition-colors" title="Deep Scrape via Google">
                                    <Globe className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
                            {sidebarIsLoading ? (
                                <div className="col-span-2 flex flex-col items-center justify-center py-16 opacity-60">
                                    <div className="w-6 h-6 border-3 mb-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Searching...</span>
                                </div>
                            ) : sidebarImages.length > 0 ? (
                                sidebarImages.map((img, i) => (
                                    <div key={i} onClick={() => applySidebarImage(img.image_url || img.image || img.url)} className="relative group cursor-pointer rounded-xl overflow-hidden aspect-square border border-gray-200 dark:border-white/10 hover:border-orange-500">
                                        <img src={img.image_url || img.image || img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Result" />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-10 text-gray-400 text-xs font-medium">No images found.</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-gray-900/80 dark:bg-black/90 backdrop-blur-sm z-[400] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-[#1A1A2E] max-w-sm w-full rounded-3xl p-8 relative overflow-hidden shadow-2xl border border-gray-200 dark:border-emerald-500/30 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-5">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Onboarding Success!</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Merchant profile has been created.</p>
                        
                        <div className="bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-2xl p-4 mb-6 text-left space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Email</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-white">{email}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Phone</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-white">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Pass</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-white">{password}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowSuccessModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white rounded-xl font-bold text-xs transition-colors">
                                Close
                            </button>
                            <button onClick={copyOnboardCredentials} className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2">
                                Copy Login Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



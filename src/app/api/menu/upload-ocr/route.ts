import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as xlsx from "xlsx";

export const maxDuration = 60; // Set Vercel function timeout to 60 seconds for AI processing


export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("menuFile") as File;

        if (!file) {
            return NextResponse.json({ error: "No menu file uploaded." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY / GOOGLE_API_KEY is not configured in the server's .env file." }, { status: 500 });
        }

        const fileBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);
        const mimeType = file.type;
        const fileName = file.name.toLowerCase();
        const base64Data = buffer.toString("base64");

        console.log(`📡 [Menu AI OCR Engine] Processing uploaded file: Name = ${file.name}, Mime = ${mimeType}, Size = ${fileBuffer.byteLength} bytes`);
        let inlineDataPart = null;
        let excelTextPart = null;

        if (mimeType.includes("spreadsheetml") || mimeType.includes("excel") || mimeType.includes("csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
            console.log("📊 Detected Excel/CSV file! Parsing with xlsx package before sending to Gemini...");
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csvData = xlsx.utils.sheet_to_csv(worksheet);
            excelTextPart = { text: "Here is the parsed spreadsheet content in CSV format:\n" + csvData };
        } else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword") || fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
            console.log("📝 Detected Word document! Parsing with mammoth before sending to Gemini...");
            try {
                const mammoth = await import("mammoth");
                const docxResult = await mammoth.default.extractRawText({ buffer });
                excelTextPart = { text: "Here is the parsed Word document content:\n" + docxResult.value };
            } catch (e) {
                console.error("Mammoth failed to load or parse:", e);
                excelTextPart = { text: "Failed to parse word document." };
            }
        } else {
            let actualMime = mimeType;
            if (!actualMime || actualMime === "application/octet-stream") {
                if (fileName.endsWith(".pdf")) actualMime = "application/pdf";
                else if (fileName.endsWith(".png")) actualMime = "image/png";
                else if (fileName.endsWith(".webp")) actualMime = "image/webp";
                else actualMime = "image/jpeg";
            }
            inlineDataPart = {
                inlineData: {
                    mimeType: actualMime,
                    data: base64Data
                }
            };
        }

        const modelsToTry = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest"
        ];

        const languagePref = formData.get("languagePref") as string || "english";
        let languageRule = `5. TRANSLATE & TRANSLITERATE TO ENGLISH: If the menu contains regional script (Devanagari/Hindi/Marathi, etc.), you MUST translate or transliterate it strictly to standard English alphabet characters (e.g. 'Roti', 'Misal Pav', 'Chai'). Do NOT output non-English regional scripts. Every single word in 'restaurantName', 'category', 'name', and 'description' MUST consist strictly of plain English text, numbers, standard spaces, brackets, and punctuation. Do not use special characters or non-English scripts, as thermal printers fail to print them.`;
        if (languagePref === "dual") {
            languageRule = `5. ENGLISH & NATIVE BILINGUAL NAMES: The menu items must be outputted with their English name followed immediately by the native/regional script name (e.g. Hindi, Marathi, Gujarati, Tamil, etc., whichever is present in the document), separated by a single space. DO NOT USE BRACKETS for the native name! Brackets break the thermal printer. Example: 'Masala Sandwich मसाला सैंडविच' or 'Misal Pav मिसळ पाव'. DO NOT output 'Misal Pav (मिसळ पाव)'. Ensure the spelling is accurate in both languages.`;
        } else if (languagePref === "arabic") {
            languageRule = `5. ENGLISH & ARABIAN BILINGUAL NAMES: The menu items must be outputted with their English name followed immediately by the Arabic script name, separated by a single space. DO NOT USE BRACKETS for the Arabic name! Brackets break the thermal printer. Example: 'Chicken Mandi مندي دجاج' or 'Hummus حمص'. DO NOT output 'Hummus (حمص)'. Ensure the spelling is accurate in both languages.`;
        }

        const prompt = `
You are a highly advanced AI system designed to digitize menus and product catalogs from images, PDFs, and parsed spreadsheet data with elite precision.
Your job is to read this document and extract EVERY single item with 100% precision.

CRITICAL INSTRUCTION: First, determine if this document is a FOOD menu (Restaurant/Cafe) OR a RETAIL/GENERAL product catalog (e.g. Hardware, Grocery, Electronics, Clothing).

Also, please search the top/header/footer of the document to extract the business contact details if present:
- Business/Restaurant Name
- Address
- Timings
- Phone number

Please return a structured JSON response matching the following structure:
{
  "restaurantName": "Name of the business (or 'AI Scraped Business' if not found)",
  "address": "Address if found (or 'Delhi NCR' if not found)",
  "timings": "Timings if found (or '11:00 AM - 11:00 PM' if not found)",
  "phone": "Phone number if found (or '9999999999' if not found)",
  "menu": [
    {
      "category": "Logical Category Name (For Food: Dal, Breads, etc. For Retail: Hardware, Construction, Electronics, etc.)",
      "name": "Formatted Item Name. FOR FOOD ONLY: ALWAYS add the (V) or (NV) badge. DO NOT add (V) or (NV) badges for Retail/Hardware/Non-Food items!",
      "price": 250, // Extract the base price as a number. Set it to the lowest valid variant price if variants exist.
      "type": "Pure Veg", // FOR FOOD ONLY: Veg items MUST be 'Pure Veg'. Meat MUST be 'Non-Veg'. Egg items MUST be 'Non-Veg (Egg)'. FOR RETAIL/HARDWARE/NON-FOOD: ALWAYS use 'General'.
      "description": "", // Leave empty to save tokens, unless a description is explicitly printed on the menu document.
      "variants": [
        // CRUCIAL RULE: See EXTRACTION RULES below for how to populate variants.
        {
          "groupName": "Size",
          "type": "radio",
          "required": true,
          "options": [
            { "name": "Medium", "price": 199 },
            { "name": "Large", "price": 299 }
          ]
        },
        {
          "groupName": "Add-On Flavours",
          "type": "checkbox",
          "required": false,
          "options": [
            { "name": "Vanilla", "price": 40 },
            { "name": "Hazelnut", "price": 40 }
          ]
        }
      ]
    }
  ]
}

### IMPORTANT EXTRACTION RULES FOR PRICES & VARIANTS
1. Never turn an unread/ambiguous price into 0. Preserve the raw detected price, interpret from context, or return a review-friendly structure rather than price=0.
2. Do not hallucinate variant names unless context supports it. For "Pizza 130/210", you may infer "Half" and "Full" if common for the region, or "Small" and "Large". Do not hallucinate variants for a price range (e.g. ₹199 - ₹399).
3. Header context matters: inspect column headers, section titles, and spatial layout (horizontal alignment) to decide what a number means (e.g. if under "Half" and "Full" columns).
4. Separate quantity from price: "250ml", "500g", "6 pcs" are variant labels, not prices. The number following them is the price.
5. Currency is optional: ₹199, Rs 199, 199/-, 199.00 all represent 199. Interpret "/-" as formatting, not a second variant. Do not convert valid decimal prices to 0.
6. Vegetarian/Non-veg markers (like 🌱, 🔴, Veg, Non-Veg) should NOT be interpreted as variants.
7. Separate Products vs Variants: "Plain Dosa 100" and "Masala Dosa 120" are SEPARATE items, not variants of Dosa. Use semantic evidence before grouping "Cheese Burger" and "Regular Burger" as variants.

### TEST CASES / EXAMPLES TO LEARN FROM:
- "Pizza 130/210" -> Variants: Small/Half ₹130, Large/Full ₹210.
- "Pizza Half 130 Full 210" -> Variants: Half ₹130, Full ₹210.
- "Pizza S - 130 M - 170 L - 210" -> Variants: S ₹130, M ₹170, L ₹210.
- "Pizza 130 Small 170 Medium" -> Variants: Small ₹130, Medium ₹170.
- "Pizza (S) 130 (M) 170" -> Variants: S ₹130, M ₹170.
- "Pizza | S 130 | M 170" -> Variants: Small ₹130, Medium ₹170.
- "Pizza 130, 170, 210" -> If context suggests sizes, use Variant 1 ₹130, Variant 2 ₹170, Variant 3 ₹210 (or contextual sizes based on headers).
- Table format (Margherita 130 170 under Small Medium headers) -> Variants mapped to sizes based on headers.
- "Burger ₹199/-" -> Base price 199, variants: [].
- "Chicken 250g ₹180 500g ₹320" -> Variants: 250g ₹180, 500g ₹320.
- "Cold Drink 250ml ₹40 500ml ₹60" -> Variants: 250ml ₹40, 500ml ₹60.
- "Samosa 1 Pc ₹20 Plate ₹80" -> Variants: 1 Pc ₹20, Plate ₹80 (Do not assume Small/Large).
- "Pizza Size: Small 150 Large 250 Crust: Regular 0 Cheese Burst 80" -> Separate variant groups for Size and Crust.
- "Masala Dosa ₹120" -> Base price 120, variants: [].

Strictly follow these rules:
1. Return ONLY the raw JSON object. Do not add any conversational text. The JSON MUST NOT contain literal newlines inside string values. Please do not pretty-print.
2. Group items under correct logical categories.
3. Normalize all spelling and format.
4. Ensure the output is valid JSON. VERY IMPORTANT: You MUST properly escape any double quotes inside string values using a backslash (e.g., "name": "10\\" Pizza") to prevent JSON parsing errors. Never use literal newlines inside strings.
${languageRule}
6. EXTREME IMPORTANCE: DO NOT SKIP ANY ITEMS. YOU MUST EXTRACT EVERY SINGLE ROW, NO MATTER HOW LONG THE DOCUMENT IS. NEVER TRUNCATE OR USE ELLIPSES (...). EXTRACT 100% OF THE ITEMS.
\`;

        const searchParams = req.nextUrl.searchParams;
        const parseOnly = searchParams.get("parseOnly") === "true";

        if (parseOnly) {
            const partsArray: any[] = [{ text: prompt }];
            if (excelTextPart) partsArray.push(excelTextPart);
            if (inlineDataPart) partsArray.push(inlineDataPart);
            
            console.log(`⚡ [Menu AI OCR Engine] Fast parsing complete. Returning payload to frontend for client-side processing.`);
            return NextResponse.json({
                success: true,
                partsArray: partsArray
            });
        }

        let textResponse = "";
        let selectedModel = "";
        let lastError: any = null;

        for (const model of modelsToTry) {
            try {
                console.log(`🤖 [Menu AI OCR Engine] Trying model: ${model}...`);
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const partsArray: any[] = [{ text: prompt }];
                if (excelTextPart) partsArray.push(excelTextPart);
                if (inlineDataPart) partsArray.push(inlineDataPart);

                const response = await axios.post(geminiUrl, {
                    contents: [
                        {
                            parts: partsArray
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textResponse) {
                    selectedModel = model;
                    console.log(`✅ [Menu AI OCR Engine] Successfully retrieved response using model: ${selectedModel}`);
                    break;
                }
            } catch (err: any) {
                const errMsg = err.response?.data?.error?.message || err.message;
                console.warn(`⚠️ [Menu OCR AI Engine] Model ${model} failed: ${errMsg}`);
                lastError = err;
            }
        }

        if (!textResponse) {
            const finalErrorMsg = lastError?.response?.data || lastError?.message || "No response content from any Gemini OCR model.";
            console.error("🚨 [Menu OCR AI Engine] All models failed in fallback chain.");
            throw new Error(`All Gemini OCR models failed or exceeded quota. Last error: ${JSON.stringify(finalErrorMsg)}`);
        }

        // Parse returned JSON from Gemini
        const parsedMenu = JSON.parse(textResponse);
        let menuItems: any[] = parsedMenu.menu || [];

        let finalMenu = menuItems;

        console.log(`✅ [Menu AI OCR Engine] Extracted ${finalMenu.length} items successfully for ${parsedMenu.restaurantName} using model ${selectedModel}!`);
        return NextResponse.json({
            success: true,
            restaurantName: parsedMenu.restaurantName || "AI Scraped Restaurant",
            address: parsedMenu.address || "Delhi NCR",
            timings: parsedMenu.timings || "11:00 AM - 11:00 PM",
            phone: parsedMenu.phone || "9999999999",
            menu: finalMenu
        });

    } catch (e: any) {
        console.error("🚨 [Menu OCR AI Engine] Failed:", e.response?.data || e.message);
        return NextResponse.json({ error: e.message, details: e.response?.data || null }, { status: 500 });
    }
}

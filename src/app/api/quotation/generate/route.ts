import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    
    const todayDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    
    const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const aiPrompt = `
You are an expert sales assistant for Kravy POS Billing Solutions.
Extract the following fields from the user's quotation request into a STRICT JSON format.
Do NOT include any markdown code blocks (like \`\`\`json) or extra text, JUST return raw JSON.

Format Required:
{
  "customerName": "Extracted name (default to 'Customer')",
  "shopName": "Extracted shop or business name (default to '')",
  "phoneNumber": "Extracted phone number (default to '')",
  "date": "Extracted invoice date. If not mentioned, default to '${todayDate}'",
  "validUntil": "Validity date which defaults to '${nextWeekDate}' unless specified otherwise",
  "softwareName": "Kravy Billing Software",
  "subscriptionDuration": "e.g. 12 Months",
  "priceAgreedText": "e.g. Rs. 3,000/-",
  "deviceAccess": "e.g. Mobile App + Desktop/Laptop",
  "hardwareIncluded": "e.g. Thermal Printer",
  "features": ["Fast Billing System", "Inventory & Stock Management", "Daily & Monthly Sales Reports", "Customer & Order Management", "Professional Invoice/Bill Generation", "Cloud Data Sync", "Real-time Monitoring"],
  "totalDescription": "e.g. Kravy Billing Software + Thermal Printer (12 Months)",
  "totalAmountText": "e.g. Rs. 3,000/-",
  "renewalChargesText": "e.g. After completion of 12 months, the annual renewal charge will be Rs. 1,500/- per year."
}

User Request: "${prompt}"
`;

    if (apiKey) {
      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash"
      ];

      for (const model of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const resObj = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
          });

          if (resObj.ok) {
            const data = await resObj.json();
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
            
            const parsedData = JSON.parse(jsonText);
            return NextResponse.json({
              success: true,
              data: {
                customerName: parsedData.customerName || "Customer",
                shopName: parsedData.shopName || "",
                phoneNumber: parsedData.phoneNumber || "",
                date: parsedData.date || todayDate,
                validUntil: parsedData.validUntil || nextWeekDate,
                softwareName: parsedData.softwareName || "Kravy Billing Software",
                subscriptionDuration: parsedData.subscriptionDuration || "12 Months",
                priceAgreedText: parsedData.priceAgreedText || "Rs. 3,000/-",
                deviceAccess: parsedData.deviceAccess || "Mobile App + Desktop/Laptop",
                hardwareIncluded: parsedData.hardwareIncluded || "Thermal Printer",
                features: Array.isArray(parsedData.features) ? parsedData.features : [
                  "Fast Billing System",
                  "Inventory & Stock Management",
                  "Daily & Monthly Sales Reports",
                  "Customer & Order Management",
                  "Professional Invoice/Bill Generation",
                  "Cloud Data Sync",
                  "Real-time Monitoring"
                ],
                totalDescription: parsedData.totalDescription || "Kravy Billing Software + Thermal Printer (12 Months)",
                totalAmountText: parsedData.totalAmountText || "Rs. 3,000/-",
                renewalChargesText: parsedData.renewalChargesText || "After completion of 12 months, annual renewal charge will be Rs. 1,500/- per year."
              }
            });
          }
        } catch (e) {
          console.warn(`Model ${model} failed, trying next...`);
        }
      }
    }

    // Smart Fallback Parser if API key is not configured or fails
    const extractedName = prompt.match(/(?:for|name|to|customer)\s+([A-Za-z\s]+)/i)?.[1]?.split(" ")?.[0] || "Customer";
    const extractedAmount = prompt.match(/(?:rs\.?|inr|₹|\b)\s*(\d+[\d,]*)/i)?.[1] || "3,000";

    return NextResponse.json({
      success: true,
      data: {
        customerName: extractedName,
        shopName: "",
        phoneNumber: "",
        date: todayDate,
        validUntil: nextWeekDate,
        softwareName: "Kravy Billing Software",
        subscriptionDuration: "12 Months",
        priceAgreedText: `Rs. ${extractedAmount}/-`,
        deviceAccess: "Mobile App + Desktop/Laptop, synced on same account",
        hardwareIncluded: "Thermal Printer with Printer Software",
        features: [
          "Fast Billing System",
          "Inventory & Stock Management",
          "Daily, Weekly & Monthly Sales Reports",
          "Customer & Order Management",
          "Professional Invoice/Bill Generation",
          "Cloud Data Access",
          "Real-time Business Monitoring"
        ],
        totalDescription: "Kravy Billing Software + Thermal Printer (12 Months)",
        totalAmountText: `Rs. ${extractedAmount}/-`,
        renewalChargesText: "After completion of 12 months, annual renewal charge will be Rs. 1,500/- per year."
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate quotation" }, { status: 500 });
  }
}

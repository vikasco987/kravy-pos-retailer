import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth-utils";
import * as xlsx from "xlsx";

export async function POST(req: Request) {
  try {
    const adminUser = await getAuthUser();
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const rawEmail = formData.get("email")?.toString();
    const email = rawEmail?.trim().toLowerCase();
    const phone = formData.get("phone")?.toString();
    const password = formData.get("password")?.toString();
    const businessName = formData.get("businessName")?.toString();
    const profileDataStr = formData.get("profileData")?.toString() || "{}";
    const profileData = JSON.parse(profileDataStr);

    if (!email || !password || !businessName || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email or phone already in use" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const clerkId = "custom_" + Math.random().toString(36).substring(2, 11);

    // Create Local Custom User & Profile in a Transaction
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          clerkId: clerkId,
          email: email,
          phone: phone,
          password: hashedPassword,
          name: businessName,
          role: "SELLER", // Standard role for merchant admin
          isVerified: true, // Mark verified directly so they don't get OTP verification block on login
        }
      });

      await tx.businessProfile.create({
        data: {
          userId: clerkId,
          businessName: businessName,
          businessAddress: profileData.businessAddress || "",
          businessType: formData.get("businessType")?.toString() || "food",
          contactPersonPhone: phone,
          taxEnabled: false,
          taxRate: 5.0,
          perProductTaxEnabled: false
        }
      });

      return u;
    });

    // Handle Menu (Excel or JSON)
    const manualJson = formData.get("manualJson")?.toString();
    const menuFile = formData.get("menuFile");
    let itemsCreated = 0;

    // Helper to get or create Category
    const categoriesMap = new Map<string, string>();
    const getCategoryId = async (categoryName: string) => {
      const cleanCat = categoryName.trim() || "General";
      if (!categoriesMap.has(cleanCat)) {
        let cat = await prisma.category.findFirst({
          where: { name: cleanCat, clerkId }
        });
        if (!cat) {
          cat = await prisma.category.create({
            data: { name: cleanCat, clerkId }
          });
        }
        categoriesMap.set(cleanCat, cat.id);
      }
      return categoriesMap.get(cleanCat)!;
    };

    // 1. Process Manual JSON if provided
    if (manualJson && manualJson.trim()) {
      try {
        let parsed: any;
        const text = manualJson.trim();
        try {
          parsed = JSON.parse(text);
        } catch {
          // Extract JSON object or array if surrounded by markdown or extra text
          let depth = 0;
          let start = -1;
          for (let i = 0; i < text.length; i++) {
            if (text[i] === "{" || text[i] === "[") {
              if (depth === 0) start = i;
              depth++;
            } else if (text[i] === "}" || text[i] === "]") {
              depth--;
              if (depth === 0 && start !== -1) {
                try {
                  parsed = JSON.parse(text.substring(start, i + 1));
                  break;
                } catch {}
              }
            }
          }
        }

        const rawList: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.m)
          ? parsed.m
          : Array.isArray(parsed?.menu)
          ? parsed.menu
          : [];

        for (const item of rawList) {
          try {
            const name = (item.n || item.name || "").toString().trim();
            if (!name) continue;

            const categoryName = (item.c || item.category || "General").toString().trim();
            const categoryId = await getCategoryId(categoryName);

            const rawPrice = item.p ?? item.price ?? 0;
            const price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice).replace(/[^\d.-]/g, "")) || 0;

            const rawType = (item.t || item.type || "Pure Veg").toString().toLowerCase();
            const isVeg = !rawType.includes("non") && !rawType.includes("egg");
            const isEgg = rawType.includes("egg");

            const description = (item.d || item.description || "").toString().trim() || null;
            const imageUrl = (item.imageUrl || item.image || item.img || "").toString().trim() || null;

            await prisma.item.create({
              data: {
                name,
                description,
                price,
                sellingPrice: price,
                mrp: price,
                imageUrl,
                categoryId,
                clerkId,
                userId: user.id,
                isActive: true,
                isVeg,
                isEgg,
                zones: []
              }
            });
            itemsCreated++;
          } catch (itemErr) {
            console.error("ONBOARD_CUSTOM: Error importing JSON item:", itemErr);
          }
        }
      } catch (jsonErr) {
        console.error("ONBOARD_CUSTOM: Failed to parse manualJson:", jsonErr);
      }
    }

    // 2. Handle Menu Excel if provided
    if (menuFile && menuFile instanceof File) {
      try {
        const buffer = await menuFile.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use header: 1 to get raw rows for header detection
        const allRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        if (allRows.length > 0) {
          // Find header row (scan first 10 rows)
          let headerIndex = 0;
          const keywords = ["name", "item", "price", "mrp", "rate", "category", "desc", "nam", "किमत", "मूल्य", "dish"];
          
          for (let i = 0; i < Math.min(10, allRows.length); i++) {
            const row = (allRows[i] || []).map(c => String(c || "").toLowerCase());
            const matchCount = row.filter(cell => keywords.some(k => cell.includes(k))).length;
            if (matchCount >= 2) {
              headerIndex = i;
              break;
            }
          }

          const headers = (allRows[headerIndex] || []).map(h => String(h || "").trim());
          const dataRows = allRows.slice(headerIndex + 1);

          // Auto-mapping columns
          const findCol = (regex: RegExp) => headers.findIndex(h => regex.test(h));
          const colMap = {
            name: findCol(/name|dish|item|title|उत्पाद|नाम/i),
            price: findCol(/price|selling|mrp|cost|rate|purchase|मूल्य|कीमत/i),
            category: findCol(/category|group|type|श्रेणी|वर्ग/i),
            description: findCol(/desc|info|detail|composition|विवरण/i),
            imageUrl: findCol(/image|url|photo|img|link|फोटो/i),
            zones: findCol(/zone|area|section|location|स्थान/i)
          };


          for (const row of dataRows) {
            try {
              const itemName = colMap.name !== -1 ? String(row[colMap.name] || "").trim() : "";
              if (!itemName || itemName.toLowerCase() === "item name" || itemName.toLowerCase() === "name") continue;

              // Price parsing
              const rawPrice = colMap.price !== -1 ? String(row[colMap.price] || "0") : "0";
              const itemPrice = parseFloat(rawPrice.replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;

              // Category handling
              let categoryName = colMap.category !== -1 ? String(row[colMap.category] || "General").trim() : "General";
              if (!categoryName) categoryName = "General";

              if (!categoriesMap.has(categoryName)) {
                let cat = await prisma.category.findFirst({
                  where: { name: categoryName, clerkId }
                });
                
                if (!cat) {
                  cat = await prisma.category.create({
                    data: { name: categoryName, clerkId }
                  });
                }
                categoriesMap.set(categoryName, cat.id);
              }

              const categoryId = categoriesMap.get(categoryName)!;

              // Zone handling
              const zoneRaw = colMap.zones !== -1 ? String(row[colMap.zones] || "").trim() : "";
              const zones = zoneRaw ? zoneRaw.split(",").map(z => z.trim().toUpperCase()).filter(Boolean) : [];

              await prisma.item.create({
                data: {
                  name: itemName,
                  description: colMap.description !== -1 ? String(row[colMap.description] || "").trim() : null,
                  price: itemPrice,
                  sellingPrice: itemPrice,
                  imageUrl: colMap.imageUrl !== -1 ? String(row[colMap.imageUrl] || "").trim() : null,
                  categoryId,
                  clerkId,
                  userId: user.id,
                  isActive: true,
                  zones: zones
                }
              });
              itemsCreated++;
            } catch (itemErr) {
              console.error("ONBOARD_CUSTOM: Failed to import item row:", row, itemErr);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse excel:", e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      user,
      itemsImported: itemsCreated
    });

  } catch (error: any) {
    console.error("ONBOARD_CUSTOM_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to onboard merchant" }, { status: 500 });
  }
}

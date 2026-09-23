


import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";


// /* --------------------------------
//    Helper: find or create DB user
// --------------------------------- */
// async function findOrCreateDBUser(clerkId: string) {
//   let user = await prisma.user.findUnique({
//     where: { clerkId },
//     select: { id: true },
//   });

//   if (!user) {
//     // ✅ fetch Clerk user FIRST
//     const clerkUser = await clerkClient.users.getUser(clerkId);

//     user = await prisma.user.create({
//       data: {
//         clerkId,
//         email:
//           clerkUser.emailAddresses[0]?.emailAddress ||
//           `no-email-${clerkId}@example.com`,
//         name: clerkUser.fullName ?? "",
//       },
//       select: { id: true },
//     });
//   }

//   return user;
// }
// /* --------------------------------
//    GET /api/items
// --------------------------------- */
// export async function GET(req: Request) {
//   try {
//     const { userId: clerkId } = auth(req);

//     if (!clerkId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");

//     if (id) {
//       const item = await prisma.item.findFirst({
//         where: { id, clerkId },
//       });

//       if (!item) {
//         return NextResponse.json({ error: "Item not found" }, { status: 404 });
//       }

//       return NextResponse.json(item);
//     }

//     const items = await prisma.item.findMany({
//       where: { clerkId },
//       orderBy: { createdAt: "desc" },
//     });

//     return NextResponse.json(items);
//   } catch (err: any) {
//     console.error("GET /api/items error:", err);
//     return NextResponse.json(
//       { error: "Failed to fetch items" },
//       { status: 500 }
//     );
//   }
// }

// /* --------------------------------
//    POST /api/items
// --------------------------------- */
// export async function POST(req: Request) {
//   try {
//     const { userId: clerkId } = auth(req);

//     if (!clerkId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const dbUser = await findOrCreateDBUser(clerkId);
//     const body = await req.json();


//     if (!body?.name || body.price == null || !body.categoryId) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const item = await prisma.item.create({
//       data: {
//         name: body.name,
//         price: Number(body.price),
//         sellingPrice:
//           body.sellingPrice != null
//             ? Number(body.sellingPrice)
//             : Number(body.price),
//         unit: body.unit || null,
//         imageUrl: body.imageUrl || null,
//         clerkId,
//         category: { connect: { id: String(body.categoryId) } },
//         user: { connect: { id: dbUser.id } },
//       },
//     });

//     return NextResponse.json(item, { status: 201 });
//   } catch (err: any) {
//     console.error("POST /api/items error:", err);
//     return NextResponse.json(
//       { error: "Failed to save item" },
//       { status: 500 }
//     );
//   }
// }

// /* --------------------------------
//    PUT /api/items
// --------------------------------- */
// export async function PUT(req: Request) {
//   try {
//     const { userId: clerkId } = auth(req);

//     if (!clerkId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await req.json();
//     const { id, name, sellingPrice, unit, categoryId, imageUrl } = body;

//     if (!id || !name) {
//       return NextResponse.json(
//         { error: "Item id and name are required" },
//         { status: 400 }
//       );
//     }

//     const existing = await prisma.item.findFirst({
//       where: { id, clerkId },
//       select: { id: true },
//     });

//     if (!existing) {
//       return NextResponse.json(
//         { error: "Item not found" },
//         { status: 404 }
//       );
//     }

//     const updated = await prisma.item.update({
//       where: { id },
//       data: {
//         name,
//         sellingPrice:
//           sellingPrice !== undefined ? Number(sellingPrice) : undefined,
//         unit: unit ?? undefined,
//         imageUrl: imageUrl ?? undefined,
//         categoryId:
//           categoryId === "uncategorised" ? null : categoryId ?? undefined,
//       },
//     });

//     return NextResponse.json(updated);
//   } catch (err: any) {
//     console.error("PUT /api/items error:", err);
//     return NextResponse.json(
//       { error: "Failed to update item" },
//       { status: 500 }
//     );
//   }
// }

// /* --------------------------------
//    DELETE /api/items
// --------------------------------- */
// export async function DELETE(req: Request) {
//   try {
//     const { userId: clerkId } = auth(req);

//     if (!clerkId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     let id: string | null = null;

//     const url = new URL(req.url);
//     id = url.searchParams.get("id");

//     if (!id) {
//       try {
//         const body = await req.json();
//         id = body?.id || null;
//       } catch {}
//     }

//     if (!id) {
//       return NextResponse.json(
//         { error: "Item id required" },
//         { status: 400 }
//       );
//     }

//     const existing = await prisma.item.findFirst({
//       where: { id, clerkId },
//       select: { id: true },
//     });

//     if (!existing) {
//       return NextResponse.json(
//         { error: "Item not found" },
//         { status: 404 }
//       );
//     }

//     await prisma.item.delete({ where: { id } });

//     return NextResponse.json({ success: true });
//   } catch (err: any) {
//     console.error("DELETE /api/items error:", err);
//     return NextResponse.json(
//       { error: "Failed to delete item" },
//       { status: 500 }
//     );
//   }
// }






/* --------------------------------- */
async function findOrCreateDBUser(clerkId: string) {
  const isMongoId = isValidObjectId(clerkId);
  
  let user = await prisma.user.findFirst({
    where: { 
      OR: isMongoId ? [
        { clerkId: clerkId },
        { id: clerkId }
      ] : [
        { clerkId: clerkId }
      ]
    },
    select: { id: true, clerkId: true },
  });

  if (!user) {
    // If it's a custom user, they MUST exist in DB. 
    // If not found, it's a real error, don't try to sync from Clerk.
    throw new Error(`User ${clerkId} not found in database.`);
  }

  return user;
}

// Helper to check if string is a valid MongoDB ObjectId
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

/* --------------------------------
   GET /api/items
--------------------------------- */
export async function GET(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const item = await prisma.item.findFirst({
        where: { id, clerkId: effectiveId },
      });

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json(item);
    }

    const categoryId = url.searchParams.get("categoryId");

    const items = await prisma.item.findMany({
      where: {
        clerkId: effectiveId,
        ...(categoryId ? { categoryId } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        addonGroups: true
      }
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/items error:", err);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

/* --------------------------------
   POST /api/items
--------------------------------- */
export async function POST(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await findOrCreateDBUser(effectiveId);
    const body = await req.json();

    console.log("🚀 [API_ITEMS_POST] Incoming Body:", JSON.stringify(body, null, 2));

    if (!body?.name || (body.price == null && body.sellingPrice == null)) {
      console.log("ITEM CREATE VALIDATION FAILED:", {
        name: !!body?.name,
        price: body?.price != null,
        sellingPrice: body?.sellingPrice != null,
        body: body
      });
      return NextResponse.json(
        { error: "Missing required fields", missing: { name: !body?.name, priceOrSellingPrice: body?.price == null && body?.sellingPrice == null } },
        { status: 400 }
      );
    }

    // ✅ Handle Inventory / Serial Number Logic
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { userId: dbUser.clerkId || dbUser.id },
    });

    let inventoryCode = null;
    let sellingPrice = body.sellingPrice != null ? Number(body.sellingPrice) : (body.price != null ? Number(body.price) : 0);

    if (businessProfile?.enableSerialNumber) {
      // 1. Determine the base number (from recycled pool or counter)
      let baseNumber = 100;
      let isRecycled = false;

      if (businessProfile.recycledCounters && businessProfile.recycledCounters.length > 0) {
        // Take the first available recycled number
        baseNumber = businessProfile.recycledCounters[0];
        isRecycled = true;
      } else {
        baseNumber = businessProfile.serialCounter || 100;
      }

      // 2. Format the code: Purely sequential base number
      inventoryCode = baseNumber.toString();

      // 3. Update the business profile (increment counter or remove from recycled)
      if (isRecycled) {
        await prisma.businessProfile.update({
          where: { id: businessProfile.id },
          data: {
            recycledCounters: {
              set: businessProfile.recycledCounters.slice(1) // Remove the first one
            }
          }
        });
      } else {
        await prisma.businessProfile.update({
          where: { id: businessProfile.id },
          data: {
            serialCounter: baseNumber + 1
          }
        });
      }
    } else {
      // Fallback: Generate a system unique ID if setting is OFF
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const timePart = Date.now().toString().slice(-4);
      inventoryCode = `ITM-${timePart}-${randomStr}`;
    }

    const item = await prisma.item.create({
      data: {
        name: body.name,
        price: body.mrp != null ? Number(body.mrp) : (body.price != null ? Number(body.price) : null),
        mrp: body.mrp != null ? Number(body.mrp) : null,
        purchasingPrice: body.purchasingPrice != null ? Number(body.purchasingPrice) : null,
        sellingPrice: sellingPrice,
        unit: body.unit || null,
        imageUrl: body.imageUrl || null,
        image: body.imageUrl || null,
        description: body.description || null,
        clerkId: effectiveId,
        categoryId: (body.categoryId && isValidObjectId(String(body.categoryId))) 
          ? String(body.categoryId)
          : undefined,
        userId: dbUser.id,
        inventoryCode: inventoryCode, // ✅ Added Inventory Code
        // Enhanced Fields
        isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : true,
        isEgg: body.isEgg !== undefined ? Boolean(body.isEgg) : false,
        isBestseller: Boolean(body.isBestseller),
        isRecommended: Boolean(body.isRecommended),
        isNew: Boolean(body.isNew),
        shortCode: body.shortCode || null,
        spiciness: body.spiciness || null,
        rating: body.rating != null ? Number(body.rating) : 4.5,
        hiName: body.hiName || null,
        mrName: body.mrName || null,
        taName: body.taName || null,
        upsellText: body.upsellText || null,
        hsnCode: body.hsnCode || null,
        taxStatus: body.taxStatus || "Without Tax",
        gst: body.gst !== undefined && body.gst !== null ? Number(body.gst) : null,
        openingStock: body.openingStock != null ? Number(body.openingStock) : 0,
        currentStock: body.currentStock != null ? Number(body.currentStock) : 0,
        reorderLevel: body.reorderLevel != null ? Number(body.reorderLevel) : 0,
        variants: body.variants ? body.variants : undefined,
        addonGroupIds: body.addonGroupIds || [],
        zones: body.zones || [],
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        barcode: body.barcode || null,
      },
      include: {
        category: true,
        addonGroups: true
      }
    });

    console.log("✅ [API_ITEMS_POST] Saved Item:", JSON.stringify(item, null, 2));

    revalidateTag(`menu-${effectiveId}`);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/items error:", err);
    return NextResponse.json(
      { error: "Failed to save item", details: err?.message },
      { status: 500 }
    );
  }
}

/* --------------------------------
   PUT /api/items
--------------------------------- */
export async function PUT(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();
    const headersList = await (await import('next/headers')).headers();
    console.log("🔍 [API_ITEMS_PUT_DEBUG] EffectiveId:", effectiveId, "x-impersonate-id:", headersList.get('x-impersonate-id'), "referer:", headersList.get('referer'));

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("🚀 [API_ITEMS_PUT] Incoming Body:", JSON.stringify(body, null, 2));
    const { id, name, sellingPrice, unit, categoryId, imageUrl, description, price } = body;

    // 🟢 BULK UPDATE SUPPORT
    if (body.ids && Array.isArray(body.ids)) {
      const ids = body.ids;
      await prisma.item.updateMany({
        where: { id: { in: ids }, clerkId: effectiveId },
        data: {
          isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : undefined,
          isEgg: body.isEgg !== undefined ? Boolean(body.isEgg) : undefined,
          isBestseller: body.isBestseller !== undefined ? Boolean(body.isBestseller) : undefined,
          isRecommended: body.isRecommended !== undefined ? Boolean(body.isRecommended) : undefined,
          isNew: body.isNew !== undefined ? Boolean(body.isNew) : undefined,
          isFavorite: body.isFavorite !== undefined ? Boolean(body.isFavorite) : undefined,
          shortCode: body.shortCode !== undefined ? body.shortCode : undefined,
          taxStatus: body.taxStatus !== undefined ? body.taxStatus : undefined,
          gst: body.gst !== undefined ? (body.gst !== null ? Number(body.gst) : null) : undefined,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
          zones: body.zones !== undefined ? body.zones : undefined,
        }
      });
      revalidateTag(`menu-${effectiveId}`);
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Item id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.item.findFirst({
      where: { id, clerkId: effectiveId },
      select: { id: true, inventoryCode: true, sellingPrice: true, currentStock: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    let inventoryCodeToSet: string | null | undefined = undefined;

    // ✅ Recycle inventory code if stock becomes 0
    if (body.currentStock !== undefined && Number(body.currentStock) === 0 && existing.inventoryCode) {
      const code = existing.inventoryCode;
      const sp = existing.sellingPrice?.toString() || "";
      
      const prefix = code.substring(0, 2);
      const remaining = code.substring(2);
      
      let baseCounter: number | null = null;
      
      if (remaining.startsWith(sp)) {
        const suffix = remaining.substring(sp.length);
        const reconstructedBase = parseInt(prefix + suffix, 10);
        if (!isNaN(reconstructedBase)) {
          baseCounter = reconstructedBase;
        }
      }

      if (baseCounter !== null) {
        const dbUser = await findOrCreateDBUser(effectiveId);
        const bp = await prisma.businessProfile.findFirst({
          where: { userId: dbUser.clerkId || dbUser.id }
        });
        
        if (bp && bp.enableSerialNumber) {
          await prisma.businessProfile.update({
            where: { id: bp.id },
            data: {
              recycledCounters: {
                push: baseCounter
              }
            }
          });
          // Free the inventory code on the item
          inventoryCodeToSet = null;
        }
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        name: name ?? undefined,
        price: body.mrp !== undefined ? (body.mrp !== null ? Number(body.mrp) : null) : (price !== undefined ? Number(price) : undefined),
        mrp: body.mrp !== undefined ? (body.mrp !== null ? Number(body.mrp) : null) : undefined,
        purchasingPrice: body.purchasingPrice !== undefined ? (body.purchasingPrice !== null ? Number(body.purchasingPrice) : null) : undefined,
        sellingPrice:
          sellingPrice !== undefined ? Number(sellingPrice) : undefined,
        unit: unit ?? undefined,
        imageUrl: imageUrl === undefined ? undefined : imageUrl,
        image: imageUrl === undefined ? undefined : imageUrl,
        description: description ?? undefined,
        categoryId: (categoryId && isValidObjectId(String(categoryId))) 
          ? String(categoryId)
          : (categoryId === "uncategorised" || categoryId === "__uncategorised__" || categoryId === null) ? null : undefined,
        isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : undefined,
        isEgg: body.isEgg !== undefined ? Boolean(body.isEgg) : undefined,
        isBestseller: body.isBestseller !== undefined ? Boolean(body.isBestseller) : undefined,
        isRecommended: body.isRecommended !== undefined ? Boolean(body.isRecommended) : undefined,
        isNew: body.isNew !== undefined ? Boolean(body.isNew) : undefined,
        isFavorite: body.isFavorite !== undefined ? Boolean(body.isFavorite) : undefined,
        shortCode: body.shortCode !== undefined ? body.shortCode : undefined,
        spiciness: body.spiciness !== undefined ? body.spiciness : undefined,
        rating: body.rating !== undefined ? Number(body.rating) : undefined,
        hiName: body.hiName !== undefined ? body.hiName : undefined,
        mrName: body.mrName !== undefined ? body.mrName : undefined,
        taName: body.taName !== undefined ? body.taName : undefined,
        upsellText: body.upsellText !== undefined ? body.upsellText : undefined,
        hsnCode: body.hsnCode !== undefined ? body.hsnCode : undefined,
        taxStatus: body.taxStatus !== undefined ? body.taxStatus : undefined,
        gst: body.gst !== undefined ? (body.gst !== null ? Number(body.gst) : null) : undefined,
        openingStock: body.openingStock !== undefined ? Number(body.openingStock) : undefined,
        currentStock: body.currentStock !== undefined ? Number(body.currentStock) : undefined,
        reorderLevel: body.reorderLevel !== undefined ? Number(body.reorderLevel) : undefined,
        variants: body.variants !== undefined ? body.variants : undefined,
        addonGroupIds: body.addonGroupIds !== undefined ? body.addonGroupIds : undefined,
        inventoryCode: inventoryCodeToSet !== undefined ? inventoryCodeToSet : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        zones: body.zones !== undefined ? body.zones : undefined,
        expiryDate: body.expiryDate !== undefined ? (body.expiryDate ? new Date(body.expiryDate) : null) : undefined,
        barcode: body.barcode !== undefined ? (body.barcode || null) : undefined,
      },
      include: {
        category: true,
        addonGroups: true
      }
    });

    console.log("✅ [API_ITEMS_PUT] Updated Item:", JSON.stringify(updated, null, 2));

    revalidateTag(`menu-${effectiveId}`);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/items error:", err);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

/* --------------------------------
   DELETE /api/items
--------------------------------- */
export async function DELETE(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();

    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const deleteAll = url.searchParams.get("all") === "true";
    let id = url.searchParams.get("id");

    const zone = url.searchParams.get("zone");

    if (deleteAll) {
      if (zone) {
        // Find items that have this zone
        const items = await prisma.item.findMany({
          where: { clerkId: effectiveId, zones: { has: zone } }
        });
        
        let deletedCount = 0;
        let updatedCount = 0;
        
        for (const item of items) {
          const newZones = (item.zones || []).filter(z => z !== zone);
          if (newZones.length === 0) {
            await prisma.item.delete({ where: { id: item.id } });
            deletedCount++;
          } else {
            await prisma.item.update({ where: { id: item.id }, data: { zones: newZones } });
            updatedCount++;
          }
        }
        revalidateTag(`menu-${effectiveId}`);
        return NextResponse.json({ success: true, deleted: deletedCount, updated: updatedCount });
      } else {
        const result = await prisma.item.deleteMany({
          where: { clerkId: effectiveId }
        });
        revalidateTag(`menu-${effectiveId}`);
        return NextResponse.json({ success: true, count: result.count });
      }
    }

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id || null;
      } catch { }
    }

    if (!id) {
      return NextResponse.json(
        { error: "Item id required" },
        { status: 400 }
      );
    }

    const existing = await prisma.item.findFirst({
      where: { id, clerkId: effectiveId },
      select: { id: true, inventoryCode: true, sellingPrice: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // ✅ Recycle the base counter if inventoryCode exists
    if (existing.inventoryCode) {
      const code = existing.inventoryCode;
      const sp = existing.sellingPrice?.toString() || "";
      
      // Code format: [Prefix: 2 chars] + [SellingPrice] + [Suffix]
      const prefix = code.substring(0, 2);
      const remaining = code.substring(2);
      
      let baseCounter: number | null = null;
      
      if (remaining.startsWith(sp)) {
        const suffix = remaining.substring(sp.length);
        const reconstructedBase = parseInt(prefix + suffix, 10);
        if (!isNaN(reconstructedBase)) {
          baseCounter = reconstructedBase;
        }
      }

      if (baseCounter !== null) {
        // Push to recycledCounters in BusinessProfile
        const dbUser = await findOrCreateDBUser(effectiveId);
        const bp = await prisma.businessProfile.findFirst({
          where: { userId: dbUser.clerkId || dbUser.id }
        });
        
        if (bp) {
          await prisma.businessProfile.update({
            where: { id: bp.id },
            data: {
              recycledCounters: {
                push: baseCounter
              }
            }
          });
        }
      }
    }

    await prisma.item.delete({ where: { id } });

    revalidateTag(`menu-${effectiveId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/items error:", err);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

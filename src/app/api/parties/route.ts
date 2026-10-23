// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// // CREATE a new party
// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { name, phone, address, dob } = body;

//     if (!name || !phone) {
//       return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
//     }

//     const party = await prisma.party.create({
//       data: { name, phone, address, dob: dob ? new Date(dob) : null },
//     });

//     return NextResponse.json(party, { status: 201 });
//   } catch (err) {
//     console.error("Error creating party:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// // GET all parties
// export async function GET() {
//   try {
//     const parties = await prisma.party.findMany({ orderBy: { name: "asc" } });
//     return NextResponse.json(parties);
//   } catch (err) {
//     console.error("Error fetching parties:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }









// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
//  // Clerk server auth

// // CREATE a new party
// export async function POST(req: Request) {
//   try {
//     const userId = await getEffectiveClerkId(); // ✅ Clerk user ID of the logged-in user
//     const body = await req.json();
//     const { name, phone, address, dob } = body;

//     if (!name || !phone) {
//       return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
//     }

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const party = await prisma.party.create({
//       data: {
//         name,
//         phone,
//         address,
//         dob: dob ? new Date(dob) : null,
//         createdBy: userId, // store the creator
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             clerkId: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(party, { status: 201 });
//   } catch (err) {
//     console.error("Error creating party:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// // GET all parties
// export async function GET() {
//   try {
//     const parties = await prisma.party.findMany({
//       orderBy: { name: "asc" },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             clerkId: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(parties);
//   } catch (err) {
//     console.error("Error fetching parties:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }




// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
//  // Clerk server auth

// // CREATE a new party
// export async function POST(req: Request) {
//   try {
//     const userId = await getEffectiveClerkId(); // ✅ Clerk user ID of the logged-in user
//     const body = await req.json();
//     const { name, phone, address, dob } = body;

//     if (!name || !phone) {
//       return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
//     }

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const party = await prisma.party.create({
//       data: {
//         name,
//         phone,
//         address,
//         dob: dob ? new Date(dob) : null,
//         createdBy: userId, // store the creator
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             clerkId: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(party, { status: 201 });
//   } catch (err) {
//     console.error("Error creating party:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }

// // GET all parties created by the logged-in user
// export async function GET(req: Request) {
//   try {
//     const userId = await getEffectiveClerkId();

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const parties = await prisma.party.findMany({
//       where: { createdBy: userId }, // ✅ only parties created by this user
//       orderBy: { name: "asc" },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             clerkId: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(parties);
//   } catch (err) {
//     console.error("Error fetching parties:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }


// src/app/api/parties/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId, getAuthUser } from "@/lib/auth-utils";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, phone, address, dob, remarks, status } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    try {
      const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
      const party = await prisma.party.upsert({
        where: {
          phone_createdBy: {
            phone: cleanPhone,
            createdBy: effectiveId,
          }
        },
        update: {
          name,
          address: address !== undefined ? address : undefined,
          dob: dob ? new Date(dob) : undefined,
          remarks: remarks !== undefined ? remarks : undefined,
          status: status || undefined,
        },
        create: {
          name,
          phone: cleanPhone,
          address,
          dob: dob ? new Date(dob) : null,
          remarks: remarks || null,
          status: status || "ACTIVE",
          createdBy: effectiveId,
        },
      });
      return NextResponse.json(party, { status: 200 });
    } catch (prismaErr: any) {
      console.error("❌ Error creating/updating party (prisma):", prismaErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (err) {
    console.error("❌ Error creating party:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Keep or add GET/DELETE as you need them (your previous handlers can remain)

export async function PUT(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, phone, address, dob, loyaltyPoints, remarks, status } = body;

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const existing = await prisma.party.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.createdBy !== effectiveId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "") : existing.phone;

    const updated = await prisma.party.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        phone: cleanPhone,
        address: address !== undefined ? address : existing.address,
        dob: dob ? new Date(dob) : existing.dob,
        loyaltyPoints: loyaltyPoints !== undefined ? loyaltyPoints : existing.loyaltyPoints,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        status: status || existing.status,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("❌ Error updating party:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const search = searchParams.get("search");

    const whereClause: any = { createdBy: effectiveId };
    
    if (phone) {
      whereClause.phone = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    } else if (search) {
      const cleanSearchPhone = search.replace(/[^\d+]/g, "");
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: cleanSearchPhone.length > 0 ? cleanSearchPhone : search } }
      ];
    }

    const limitStr = searchParams.get("limit");
    let takeVal: number | undefined = search || phone ? 50 : 100;
    if (limitStr === "none") {
      takeVal = undefined;
    } else if (limitStr && !isNaN(Number(limitStr))) {
      takeVal = Number(limitStr);
    }

    const parties = await prisma.party.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      ...(takeVal !== undefined && { take: takeVal })
    });
    
    // Check permission to view customer phone
    let canViewPhone = true;
    if (authUser && authUser.role !== 'ADMIN' && authUser.role !== 'SELLER' && authUser.role !== 'OWNER' && authUser.role !== 'USER') {
      canViewPhone = authUser.permissions?.includes("view-customer-phone") || false;
    }

    const modifiedParties = parties.map(party => {
      if (!canViewPhone) {
        return {
          ...party,
          phone: "" // explicitly removing the phone number from the response
        };
      }
      return party;
    });

    return NextResponse.json(modifiedParties, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching parties:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Optional: DELETE by body if you had earlier fallback code
export async function DELETE(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const id = body?.id;
    if (!id) return NextResponse.json({ error: "Missing id in request body" }, { status: 400 });

    const existing = await prisma.party.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.createdBy !== effectiveId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.party.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Error deleting party (body delete):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import * as xlsx from "xlsx";

const uri = process.env.DATABASE_URL;

export async function GET(req: NextRequest) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { clerkId: effectiveId },
      select: { role: true },
    });

    if (!me || me.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!uri) return NextResponse.json({ error: "DB URI missing" }, { status: 500 });

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const collectionsRaw = await db.listCollections().toArray();
    const collectionNames = collectionsRaw
      .filter(c => !c.name.startsWith('system.'))
      .map(c => c.name);

    const wb = xlsx.utils.book_new();

    for (const colName of collectionNames) {
      const data = await db.collection(colName).find({}).toArray();
      
      // Convert ObjectId and Date to string for Excel
      const processedData = data.map(doc => {
        const newDoc: any = {};
        for (const [key, value] of Object.entries(doc)) {
          if (value && typeof value === 'object' && value.toString().match(/^[0-9a-fA-F]{24}$/)) {
            newDoc[key] = value.toString();
          } else if (value instanceof Date) {
            newDoc[key] = value.toISOString();
          } else if (typeof value === 'object' && value !== null) {
            let jsonStr = JSON.stringify(value);
            if (jsonStr.length > 32000) {
              jsonStr = jsonStr.substring(0, 32000) + "... [TRUNCATED]";
            }
            newDoc[key] = jsonStr;
          } else if (typeof value === 'string' && value.length > 32000) {
            newDoc[key] = value.substring(0, 32000) + "... [TRUNCATED]";
          } else {
            newDoc[key] = value;
          }
        }
        return newDoc;
      });

      let ws;
      if (processedData.length > 0) {
         ws = xlsx.utils.json_to_sheet(processedData);
      } else {
         ws = xlsx.utils.json_to_sheet([{ "Message": "No data in this collection" }]);
      }
      
      // Excel sheet names cannot exceed 31 chars
      const safeName = colName.substring(0, 31);
      xlsx.utils.book_append_sheet(wb, ws, safeName);
    }

    await client.close();

    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Kravy_Full_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("Export Live All Error:", error);
    return NextResponse.json({ error: "Failed to export all data", details: error.message }, { status: 500 });
  }
}

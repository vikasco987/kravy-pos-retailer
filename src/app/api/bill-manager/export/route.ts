import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    const effectiveId = await getEffectiveClerkId();
    if (!effectiveId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || searchParams.get("from");
    const endDate = searchParams.get("endDate") || searchParams.get("to");
    const typeFilter = searchParams.get("type") || "ALL";
    const paymentFilter = searchParams.get("payment") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";
    const searchQuery = searchParams.get("query") || "";

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required for export" }, { status: 400 });
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
    start.setMinutes(start.getMinutes() - 330);

    const [ey, em, ed] = endDate.split('-').map(Number);
    const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
    end.setMinutes(end.getMinutes() - 330);

    // Build where clause
    const whereClause: any = {
      clerkUserId: effectiveId,
      isDeleted: false,
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (typeFilter !== "ALL") {
      if (typeFilter === "POS") whereClause.tableName = { in: ["POS", null, "Counter"] };
      else whereClause.tableName = { contains: typeFilter, mode: 'insensitive' };
    }
    if (paymentFilter !== "ALL") {
      whereClause.paymentMode = { contains: paymentFilter, mode: 'insensitive' };
    }
    if (statusFilter !== "ALL") {
      whereClause.paymentStatus = { equals: statusFilter, mode: 'insensitive' };
    }
    if (searchQuery) {
      whereClause.OR = [
        { billNumber: { contains: searchQuery, mode: 'insensitive' } },
        { customerName: { contains: searchQuery, mode: 'insensitive' } },
        { customerPhone: { contains: searchQuery } }
      ];
    }

    // Fetch all bills for the user within the strict date range
    const bills = await prisma.billManager.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!bills.length) {
      return NextResponse.json({ error: "No bills found to export for selected dates" }, { status: 404 });
    }

    // Transform data for Excel
    const data = bills.map((bill) => {
      let itemsList = "";
      try {
        let parsedItems: any = bill.items;
        if (typeof parsedItems === "string") parsedItems = JSON.parse(parsedItems);
        if (parsedItems && !Array.isArray(parsedItems) && parsedItems.items) parsedItems = parsedItems.items;
        
        if (Array.isArray(parsedItems)) {
          itemsList = parsedItems.map((it: any) => `${it.name || "Unknown"} x${it.quantity || it.qty || 1}`).join(", ");
        }
      } catch (e) {
        itemsList = "Error parsing items";
      }

      return {
        "Bill Number": bill.billNumber,
        "Date": new Date(bill.createdAt).toLocaleString("en-IN"),
        "Customer Name": bill.customerName || "N/A",
        "Customer Phone": bill.customerPhone || "N/A",
        "Items": itemsList,
        "Subtotal": bill.subtotal,
        "Tax": bill.tax || 0,
        "Total": bill.total,
        "Payment Mode": bill.paymentMode,
        "Status": bill.paymentStatus,
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return as file download
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Kravy_Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("EXCEL EXPORT ERROR:", error);
    return NextResponse.json({ error: "Failed to export bills" }, { status: 500 });
  }
}

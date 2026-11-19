import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data");
    const name = searchParams.get("name") || "Menu_Card";
    const table = searchParams.get("table") || "QR";

    if (!data) {
        return new NextResponse("Missing data parameter", { status: 400 });
    }

    try {
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=20&format=png&data=${encodeURIComponent(data)}`;
        const response = await fetch(qrApiUrl);

        if (!response.ok) {
            return new NextResponse("Failed to generate QR image", { status: 502 });
        }

        const buffer = await response.arrayBuffer();
        const safeFileName = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Table_${table.replace(/[^a-zA-Z0-9_-]/g, "_")}_QR.png`;

        return new Response(buffer, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": `attachment; filename="${safeFileName}"`,
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("QR Download Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

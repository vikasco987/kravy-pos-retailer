import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const updateData: any = {};
    if (body.hiddenSidebarItems !== undefined) updateData.hiddenSidebarItems = body.hiddenSidebarItems;
    if (body.sidebarOrder !== undefined) updateData.sidebarOrder = body.sidebarOrder;

    if (authUser.type === 'STAFF') {
      const staff = await prisma.staff.findUnique({ where: { id: authUser.id } });
      if (staff) {
        const currentMeta: any = staff.privateMetadata || {};
        await prisma.staff.update({
          where: { id: authUser.id },
          data: { privateMetadata: { ...currentMeta, ...updateData } }
        });
      }
    } else {
      const user = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (user) {
        const currentMeta: any = user.privateMetadata || {};
        await prisma.user.update({
          where: { id: authUser.id },
          data: { privateMetadata: { ...currentMeta, ...updateData } }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}

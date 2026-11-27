import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import DrilldownClient from "./DrilldownClient";

export const revalidate = 0; // Fetch fresh data on every request

export default async function SalesDrilldownReportPage() {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) redirect("/auth/custom");

  // Fetch business profile settings
  const profile = await prisma.businessProfile.findFirst({
    where: { userId: effectiveId },
    orderBy: { createdAt: "asc" },
  });

  const businessName = profile?.businessName || "Your Business";

  return (
    <DrilldownClient businessName={businessName} />
  );
}

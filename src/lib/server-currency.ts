import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { cache } from "react";

export const getServerCurrency = cache(async () => {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) return { code: "INR", sym: "₹" };
  const profile = await prisma.businessProfile.findFirst({
    where: { userId: effectiveId },
    select: { currencyCode: true, currencySymbol: true }
  });
  return {
    code: profile?.currencyCode || "INR",
    sym: profile?.currencySymbol || "₹"
  };
});

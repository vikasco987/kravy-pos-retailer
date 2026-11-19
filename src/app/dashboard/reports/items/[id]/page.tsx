import { redirect } from "next/navigation";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import ItemDetailAnalyticsView from "./ItemDetailAnalyticsView";

export const revalidate = 0;

export default async function ItemAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) redirect("/auth/custom");

  const { id } = await params;
  return <ItemDetailAnalyticsView itemId={id} />;
}

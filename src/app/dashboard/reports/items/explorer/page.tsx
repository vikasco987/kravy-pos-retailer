import { redirect } from "next/navigation";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import AllItemsExplorerView from "./AllItemsExplorerView";

export const revalidate = 0;

export default async function AllItemsExplorerPage() {
  const effectiveId = await getEffectiveClerkId();
  if (!effectiveId) redirect("/auth/custom");

  return <AllItemsExplorerView />;
}

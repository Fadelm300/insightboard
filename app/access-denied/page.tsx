import { redirect } from "next/navigation";
import PermissionDenied from "@/components/access/PermissionDenied";
import { getCurrentUser } from "@/lib/auth";
import { firstAllowedPage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session-expired");
  return <PermissionDenied home={firstAllowedPage(user)} />;
}

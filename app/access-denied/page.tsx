import { redirect } from "next/navigation";
import AccessErrorScreen from "@/components/access/AccessErrorScreen";
import { getCurrentUser } from "@/lib/auth";
import { firstAllowedPage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session-expired");
  return <AccessErrorScreen restricted home={firstAllowedPage(user) ?? "/"} />;
}

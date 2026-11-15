import { authorizePage } from "@/lib/authorization";
import PermissionDenied from "@/components/access/PermissionDenied";
import { isDemoMode } from "@/lib/demoMode";
import PageClient from "./settings.client";

export default async function Page() {
  const access = await authorizePage("settings.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;
  return <PageClient canEditCompany={access.user.role === "admin" && !isDemoMode()} />;
}

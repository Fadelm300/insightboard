import PermissionDenied from "@/components/access/PermissionDenied";
import { authorizePage } from "@/lib/authorization";
import { isDemoMode } from "@/lib/demoMode";
import { hasPermission } from "@/lib/permissions";
import FinancialArchiveClient from "./financial-archive.client";

export default async function FinancialArchivePage() {
  const access = await authorizePage("financialArchive.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;

  return <FinancialArchiveClient
    canRestore={hasPermission(access.user, "financialArchive.restore") && !isDemoMode()}
  />;
}

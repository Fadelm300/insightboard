import PermissionDenied from "@/components/access/PermissionDenied";
import { authorizePage } from "@/lib/authorization";
import { isDemoMode } from "@/lib/demoMode";
import { hasPermission } from "@/lib/permissions";
import CrmArchiveClient from "./crm-archive.client";

export default async function CrmArchivePage() {
  const access = await authorizePage("crmArchive.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;
  return <CrmArchiveClient
    canRestore={hasPermission(access.user, "crmArchive.restore") && !isDemoMode()}
    canPurge={hasPermission(access.user, "crmArchive.purge") && !isDemoMode()}
  />;
}

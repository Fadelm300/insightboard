import PermissionDenied from "@/components/access/PermissionDenied";
import { authorizePage } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { isDemoMode } from "@/lib/demoMode";
import ArchiveRequestsClient from "./archive-requests.client";

export default async function ArchiveRequestsPage() {
  const access = await authorizePage("archiveRequests.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;
  return <ArchiveRequestsClient
    canReview={hasPermission(access.user, "archiveRequests.review") && !isDemoMode()}
    readOnly={isDemoMode()}
  />;
}

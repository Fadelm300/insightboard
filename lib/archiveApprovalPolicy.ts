import { hasPermission, type Permission, type PermissionSubject } from "@/lib/permissions";

export const ARCHIVE_RESOURCES = ["clients", "deals", "projects", "revenue", "expenses"] as const;
export type ArchiveResource = (typeof ARCHIVE_RESOURCES)[number];
export type ApprovalAccount = PermissionSubject & { id: string; managedBy?: string | null };

export function isArchiveResource(value: unknown): value is ArchiveResource {
  return typeof value === "string" && ARCHIVE_RESOURCES.some((resource) => resource === value);
}

export function canRequestArchive(user: PermissionSubject, resource: ArchiveResource) {
  return hasPermission(user, "archiveRequests.create") &&
    hasPermission(user, `${resource}.read` as Permission);
}

export function canReviewArchive(
  actor: ApprovalAccount,
  requester: ApprovalAccount,
  resource: ArchiveResource,
  assignedManagerId: string | null,
) {
  return actor.id !== requester.id &&
    hasPermission(actor, "archiveRequests.review") &&
    hasPermission(actor, `${resource}.delete` as Permission) &&
    (actor.role === "admin" || (
      actor.role === "manager" && requester.managedBy === actor.id && assignedManagerId === actor.id
    ));
}

export function validateApprovalReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  if (reason.length < 5 || reason.length > 500 || /[<>\x00-\x1f\x7f]/.test(reason)) return null;
  return reason;
}

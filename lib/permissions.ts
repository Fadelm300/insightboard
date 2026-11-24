/** Shared capability names only. The server resolves grants from the current user record. */
export const PERMISSIONS = [
  "dashboard.read",
  "clients.read", "clients.create", "clients.update", "clients.delete",
  "deals.read", "deals.create", "deals.update", "deals.delete", "deals.convert",
  "projects.read", "projects.create", "projects.update", "projects.delete",
  "projects.financial.read", "projects.financial.manage",
  "revenue.read", "revenue.create", "revenue.update", "revenue.delete",
  "expenses.read", "expenses.create", "expenses.update", "expenses.delete",
  "financialArchive.read", "financialArchive.restore", "crmArchive.read", "crmArchive.restore", "crmArchive.purge",
  "finance.read", "reports.read", "reports.print", "reports.export",
  "archiveRequests.read", "archiveRequests.create", "archiveRequests.review",
  "settings.read", "users.read", "users.manage", "system.diagnose",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export const USER_ROLES = [
  "admin", "administration", "manager", "senior", "employee", "viewer",
  "programmer", "demo",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type PermissionSubject = {
  role: string;
  isActive?: boolean;
  allowedPermissions?: readonly string[] | null;
};

const BUSINESS_PERMISSIONS = PERMISSIONS.filter(
  (permission) => !permission.startsWith("archiveRequests.")
    && !permission.startsWith("users.")
    && !permission.startsWith("financialArchive.")
    && !permission.startsWith("crmArchive.")
    && permission !== "system.diagnose",
);
const NON_DELETE_PERMISSIONS = BUSINESS_PERMISSIONS.filter(
  (permission) => !permission.endsWith(".delete"),
);
const READ_PERMISSIONS = BUSINESS_PERMISSIONS.filter(
  (permission) => permission.endsWith(".read"),
);

export function permissionDependencies(permission: Permission): readonly Permission[] {
  if (permission === "archiveRequests.create" || permission === "archiveRequests.review")
    return ["archiveRequests.read"];
  if (permission === "crmArchive.purge") return ["crmArchive.read"];
  if (permission === "crmArchive.restore") return ["crmArchive.read"];
  if (permission === "financialArchive.restore") return ["financialArchive.read"];
  if (permission === "projects.financial.read") return ["projects.read"];
  if (permission === "projects.financial.manage") return ["projects.financial.read"];
  if (permission === "dashboard.read") return ["clients.read", "deals.read", "projects.read", "finance.read"];
  if (permission === "reports.read") return ["clients.read", "deals.read", "projects.read", "revenue.read", "expenses.read", "finance.read"];
  if (permission === "reports.print" || permission === "reports.export") return ["reports.read"];
  if (permission === "deals.convert") return ["deals.read", "deals.update", "projects.read", "projects.create"];
  if (permission === "users.manage") return ["users.read"];
  if (/\.(create|update|delete)$/.test(permission)) {
    return [permission.replace(/\.[^.]+$/, ".read") as Permission];
  }
  return [];
}

export function withPermissionDependencies(permissions: readonly Permission[]): Permission[] {
  const grants = new Set(permissions);
  for (const grant of grants) for (const required of permissionDependencies(grant)) grants.add(required);
  return PERMISSIONS.filter((permission) => grants.has(permission));
}

/** A ceiling prevents user-management grants from creating a hidden superuser. */
export function permissionCeiling(role: string): readonly Permission[] {
  switch (role) {
    case "admin":
      return PERMISSIONS;
    case "manager":
      return [
        ...BUSINESS_PERMISSIONS,
        "archiveRequests.read",
        "archiveRequests.create",
        "archiveRequests.review",
        "users.read",
        "users.manage"
      ];
    case "administration":
      // Provisioning without CRM access requires an invitation / recovery design
      // that does not let the operator choose another person's credentials.
      return ["users.read", "settings.read"];
    case "senior":
    case "employee":
      return [...NON_DELETE_PERMISSIONS, "archiveRequests.read", "archiveRequests.create"];
    case "viewer":
      return READ_PERMISSIONS;
    default:
      // Programmer requires a separate strong-authentication rollout.
      // Demo identities require verified data isolation, not just a role name.
      return [];
  }
}

export function isEnabledRole(role: unknown): role is UserRole {
  return typeof role === "string" && permissionCeiling(role).length > 0;
}

export function isAccountEnabled(subject: PermissionSubject): boolean {
  return (subject.isActive === undefined || subject.isActive === true) && isEnabledRole(subject.role);
}

export function getPermissions(subject: PermissionSubject): Permission[] {
  if (!isAccountEnabled(subject)) return [];
  const ceiling = permissionCeiling(subject.role);

  if (subject.allowedPermissions === undefined || subject.allowedPermissions === null) {
    // Existing admin records keep their behavior without a database migration.
    if (["admin", "manager", "administration"].includes(subject.role)) return [...ceiling];
    return ["settings.read"];
  }

  if (!Array.isArray(subject.allowedPermissions)) return [];
  let grants = ceiling.filter((permission) => subject.allowedPermissions!.includes(permission));
  let previousCount: number;
  do {
    previousCount = grants.length;
    grants = grants.filter((permission) => permissionDependencies(permission).every((required) => grants.includes(required)));
  } while (previousCount !== grants.length);
  return grants;
}

export function hasPermission(subject: PermissionSubject, permission: Permission): boolean {
  return getPermissions(subject).includes(permission);
}

/** Permissions belong to resource/actions, not client-supplied navigation state. */
export const PAGE_PERMISSIONS = {
  "/dashboard": "dashboard.read",
  "/dashboard/clients": "clients.read",
  "/dashboard/deals": "deals.read",
  "/dashboard/projects": "projects.read",
  "/dashboard/revenue": "revenue.read",
  "/dashboard/expenses": "expenses.read",
  "/dashboard/reports": "reports.read",
  "/dashboard/financial-archive": "financialArchive.read",
  "/dashboard/crm-archive": "crmArchive.read",
  "/dashboard/archive-requests": "archiveRequests.read",
  "/dashboard/settings": "settings.read",
  "/dashboard/users": "users.read",
} satisfies Record<string, Permission>;

export function firstAllowedPage(subject: PermissionSubject): string | null {
  for (const [path, permission] of Object.entries(PAGE_PERMISSIONS)) {
    if (hasPermission(subject, permission)) return path;
  }
  return null;
}

export function manageableRoles(actorRole: string): readonly UserRole[] {
  if (actorRole === "admin" || actorRole === "administration") {
    return ["manager", "senior", "employee", "viewer"];
  }
  if (actorRole === "manager") return ["senior", "employee", "viewer"];
  return [];
}

export function canManageUser(actor: PermissionSubject, targetRole: string): boolean {
  return hasPermission(actor, "users.manage") &&
    manageableRoles(actor.role).some((role) => role === targetRole);
}

export function canDelegatePermissions(
  actor: PermissionSubject,
  targetRole: string,
  permissions: readonly unknown[],
): boolean {
  if (!canManageUser(actor, targetRole)) return false;
  const ceiling = permissionCeiling(targetRole);
  return permissions.every((permission) => typeof permission === "string" &&
    ceiling.some((allowed) => allowed === permission) &&
    getPermissions(actor).includes(permission as Permission));
}

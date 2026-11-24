"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Permission } from "@/lib/permissions";

const PermissionContext = createContext<readonly Permission[]>([]);

export default function PermissionProvider({ permissions, children }: {
  permissions: readonly Permission[]; children: ReactNode;
}) {
  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>;
}

export function usePermission(permission: Permission) {
  return useContext(PermissionContext).includes(permission);
}

export function usePermissions() {
  return useContext(PermissionContext);
}

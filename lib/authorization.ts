import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/apiResponse";
import { firstAllowedPage, hasPermission, type Permission } from "@/lib/permissions";
import { isTrustedMutation } from "@/lib/sessionPolicy";

export async function authorizeRequest(req: NextRequest, permission: Permission | readonly Permission[]) {
  if (!isTrustedMutation(req)) {
    return { user: null, response: errorResponse("Forbidden", 403) };
  }
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: errorResponse("Unauthorized", 401) };
  const permissions = typeof permission === "string" ? [permission] : permission;
  if (!permissions.some((required) => hasPermission(user, required))) {
    return { user: null, response: errorResponse("Forbidden", 403) };
  }
  return { user, response: null };
}

export async function authorizePage(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user, allowed: hasPermission(user, permission), home: firstAllowedPage(user) };
}

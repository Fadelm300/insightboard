import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAuthUser, getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/apiResponse";
import { firstAllowedPage, hasPermission, type Permission } from "@/lib/permissions";
import { isTrustedMutation } from "@/lib/sessionPolicy";

function accessFailure(req: NextRequest, status: 401 | 403) {
  // A document navigation receives a page; fetch clients retain JSON errors.
  if (
    req.method === "GET" &&
    req.headers.get("sec-fetch-mode") === "navigate" &&
    req.headers.get("sec-fetch-dest") === "document"
  ) {
    const destination = status === 401 ? "/login?reason=session-expired" : "/access-denied";
    return NextResponse.redirect(new URL(destination, req.url));
  }
  return errorResponse(status === 401 ? "Unauthorized" : "Forbidden", status);
}

export async function authorizeRequest(req: NextRequest, permission: Permission | readonly Permission[]) {
  if (!isTrustedMutation(req)) {
    return { user: null, response: accessFailure(req, 403) };
  }
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: accessFailure(req, 401) };
  const permissions = typeof permission === "string" ? [permission] : permission;
  if (!permissions.some((required) => hasPermission(user, required))) {
    return { user: null, response: accessFailure(req, 403) };
  }
  return { user, response: null };
}

export async function authorizePage(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed = hasPermission(user, permission);
  if (!allowed) redirect("/access-denied");
  return { user, allowed, home: firstAllowedPage(user) };
}

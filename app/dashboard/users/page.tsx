import { authorizePage } from "@/lib/authorization";
import { getPermissions } from "@/lib/permissions";
import PermissionDenied from "@/components/access/PermissionDenied";
import UsersClient from "./users.client";

export default async function UsersPage() {
  const access = await authorizePage("users.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;
  return <UsersClient actorRole={access.user.role} actorPermissions={getPermissions(access.user)} />;
}

import { authorizePage } from "@/lib/authorization";
import PermissionDenied from "@/components/access/PermissionDenied";
import PageClient from "./reports.client";

export default async function Page() {
  const access = await authorizePage("reports.read");
  if (!access.allowed) return <PermissionDenied home={access.home} />;
  return <PageClient />;
}

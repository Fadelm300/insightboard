"use client";

import AccessErrorScreen from "@/components/access/AccessErrorScreen";

export default function PermissionDenied({ home }: { home: string | null }) {
  return <AccessErrorScreen restricted home={home ?? "/"} />;
}

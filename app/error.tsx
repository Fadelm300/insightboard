"use client";

import ServerErrorScreen from "@/components/access/ServerErrorScreen";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry?: () => void }) {
  return <ServerErrorScreen retry={retry} />;
}

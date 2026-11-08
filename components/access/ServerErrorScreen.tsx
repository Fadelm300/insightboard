"use client";

import AccessErrorScreen from "@/components/access/AccessErrorScreen";

export default function ServerErrorScreen({ retry }: { retry?: () => void }) {
  return (
    <AccessErrorScreen
      status={500}
      home="/"
      onRetry={retry ?? (() => window.location.reload())}
    />
  );
}

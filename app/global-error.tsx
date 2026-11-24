"use client";

import ServerErrorScreen from "@/components/access/ServerErrorScreen";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry?: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ServerErrorScreen retry={retry} />
      </body>
    </html>
  );
}

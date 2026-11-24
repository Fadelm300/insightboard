"use client";

import { useEffect } from "react";

export default function PermissionDenied({}: { home: string | null }) {
  useEffect(() => {
    // Denied server entries render no protected view. A document navigation
    // avoids development RSC redirect timing failures and leaves the shell.
    window.location.replace("/access-denied");
  }, []);

  return <p role="status">Access restricted. <a href="/access-denied">Continue to the access page</a></p>;
}

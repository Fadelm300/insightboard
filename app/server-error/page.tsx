import type { Metadata } from "next";
import ServerErrorScreen from "@/components/access/ServerErrorScreen";

export const metadata: Metadata = {
  title: "Server error | InsightBoard",
  robots: { index: false, follow: false },
};

/** Safe recovery-screen preview. Actual exceptions use the error boundaries. */
export default function ServerErrorPage() {
  return <ServerErrorScreen />;
}

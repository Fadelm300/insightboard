import type { Metadata } from "next";
import LegalNotice from "@/components/landing/LegalNotice";

export const metadata: Metadata = {
  title: "Privacy notice | InsightBoard",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return <LegalNotice kind="privacy" />;
}

import type { Metadata } from "next";
import LegalNotice from "@/components/landing/LegalNotice";

export const metadata: Metadata = {
  title: "Terms of use | InsightBoard",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return <LegalNotice kind="terms" />;
}

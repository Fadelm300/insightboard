import LegalNotice, { legalMetadata } from "@/components/landing/LegalNotice";

export function generateMetadata() {
  return legalMetadata("terms");
}

export default function TermsPage() {
  return <LegalNotice kind="terms" />;
}

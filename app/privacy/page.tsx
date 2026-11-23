import LegalNotice, { legalMetadata } from "@/components/landing/LegalNotice";

export function generateMetadata() {
  return legalMetadata("privacy");
}

export default function PrivacyPage() {
  return <LegalNotice kind="privacy" />;
}

import { cookies } from "next/headers";
import CookieConsent from "@/components/landing/CookieConsent";
import PublicPolicyLayout from "@/components/landing/PublicPolicyLayout";

export async function generateMetadata() {
  const preferences = await cookies();
  const arabic = preferences.get("language")?.value === "ar";
  return {
    title: arabic ? "إعدادات الكوكيز | InsightBoard" : "Cookie settings | InsightBoard",
    alternates: { canonical: "/cookie-settings" },
    robots: { index: false, follow: false },
  };
}

export default async function CookieSettingsPage() {
  const preferences = await cookies();
  const arabic = preferences.get("language")?.value === "ar";
  const language = arabic ? "ar" : "en";
  const theme = preferences.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <PublicPolicyLayout language={language} theme={theme} current="/cookie-settings"
      title={arabic ? "إعدادات الكوكيز" : "Cookie settings"}
      summary={arabic
        ? "راجع الكوكيز الضرورية لتشغيل InsightBoard، وتحكّم بخيار تحليلات الزيارات في أي وقت."
        : "Review the cookies InsightBoard needs to work and manage your choice about visit analytics at any time."}>
      <CookieConsent language={language} settings />
    </PublicPolicyLayout>
  );
}

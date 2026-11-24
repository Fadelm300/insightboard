import Link from "next/link";
import { cookies } from "next/headers";
import { links } from "./content";
import { legalContent } from "./legalContent";
import PublicPolicyLayout from "./PublicPolicyLayout";
import styles from "./legalNotice.module.css";

export async function legalMetadata(kind: keyof typeof legalContent) {
  const preferences = await cookies();
  const language = preferences.get("language")?.value === "ar" ? "ar" : "en";
  return {
    title: legalContent[kind][language].title + " | InsightBoard",
    robots: process.env.LEGAL_NOTICE_MODE === "review" ? { index: false, follow: false } : undefined,
  };
}

export default async function LegalNotice({ kind }: { kind: keyof typeof legalContent }) {
  const preferences = await cookies();
  const arabic = preferences.get("language")?.value === "ar";
  const language = arabic ? "ar" : "en";
  const theme = preferences.get("theme")?.value === "dark" ? "dark" : "light";
  const { title, summary, sections } = legalContent[kind][language];
  const review = process.env.LEGAL_NOTICE_MODE === "review";

  return (
    <PublicPolicyLayout
      language={language} theme={theme} current={`/${kind}`} title={title} summary={summary}
      detail={<>
        <time dateTime="2026-11-18">
          {arabic ? "آخر تحديث 18 نوفمبر 2026" : "Last updated 18 November 2026"}
        </time>
        {review && <span>{arabic ? "مسودة للمراجعة" : "Draft for review"}</span>}
      </>}
    >
      <div className={styles.legalBody}>
        <nav className={styles.contents} aria-label={arabic ? "المحتويات" : "Contents"}>
          <p className="ib-eyebrow">{arabic ? "محتويات الصفحة" : "On this page"}</p>
          <ul>{sections.map(([heading], index) => (
            <li key={heading}><a href={`#section-${index + 1}`}>{heading}</a></li>
          ))}</ul>
        </nav>
        <div className={styles.sections}>
          {sections.map(([heading, body], index) => (
            <section key={heading} id={`section-${index + 1}`}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
          <footer>
            <a href={links.contact}>{arabic ? "التواصل مع المشروع" : "Contact the project"}</a>
            <Link href="/cookie-settings">{arabic ? "إعدادات الكوكيز" : "Cookie settings"}</Link>
          </footer>
        </div>
      </div>
    </PublicPolicyLayout>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { landingFontClasses } from "./landingFonts";
import type { Language } from "./content";
import styles from "./legalNotice.module.css";
import "@/app/landing.css";

const navigation = [
  { href: "/privacy", en: "Privacy", ar: "الخصوصية" },
  { href: "/terms", en: "Terms", ar: "الشروط" },
  { href: "/cookie-settings", en: "Cookie settings", ar: "إعدادات الكوكيز" },
] as const;

export default function PublicPolicyLayout({
  language, theme, current, title, summary, detail, children,
}: {
  language: Language;
  theme: "light" | "dark";
  current: (typeof navigation)[number]["href"];
  title: string;
  summary: string;
  detail?: ReactNode;
  children: ReactNode;
}) {
  const rtl = language === "ar";

  return (
    <div className={`ib-landing ${landingFontClasses} ${styles.legal}`}
      data-theme={theme} lang={language} dir={rtl ? "rtl" : "ltr"}>
      <a className="ib-skip" href="#policy-content">
        {rtl ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>
      <header className="ib-header">
        <div className={`ib-container ib-header-row ${styles.legalHeader}`}>
          <Link href="/" className="ib-brand ib-header-brand" dir="ltr">
            <Image src="/images/logo/insightboard-logo3.png" alt="" width={36} height={36} className="ib-brand-logo" />
            InsightBoard
          </Link>
          <nav className={styles.policyNav} aria-label={rtl ? "صفحات الموقع" : "Site policies"}>
            {navigation.map(({ href, ...label }) => (
              <Link key={href} href={href} aria-current={href === current ? "page" : undefined}>
                {label[language]}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="policy-content" tabIndex={-1}>
        <header className={`ib-warm ${styles.hero}`}>
          <div className={`ib-container ${styles.intro}`}>
            <Link href="/" className={styles.homeLink}>
              <span aria-hidden="true">{rtl ? "→" : "←"}</span>
              {rtl ? "الرئيسية" : "Home"}
            </Link>
            <h1>{title}</h1>
            <p className="ib-lead">{summary}</p>
            {detail && <div className={styles.detail}>{detail}</div>}
          </div>
        </header>
        <div className={`ib-container ${styles.notice}`}>{children}</div>
      </main>
    </div>
  );
}

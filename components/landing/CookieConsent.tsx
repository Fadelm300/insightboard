"use client";

import Link from "next/link";
import { Analytics, type BeforeSend } from "@vercel/analytics/next";
import { useEffect, useSyncExternalStore } from "react";
import { getPreference, setPreference } from "@/lib/preferences";
import { ANALYTICS_PREFERENCE, analyticsPageUrl } from "./analyticsConsent";
import type { Language } from "./content";
import styles from "./legalNotice.module.css";

const preferenceChanged = "insightboard-analytics-preference";
const cookieSettingsHash = "#cookie-settings";
const copy = {
  en: {
    title: "Your cookie choices",
    text: "We use cookies for sign-in and to remember your settings. With your permission, Vercel Web Analytics measures visits to this homepage. Analytics does not use cookies and stays off unless you allow it.",
    privacy: "Privacy notice",
    reject: "Necessary only",
    accept: "Allow analytics",
    settings: "Cookie settings",
    close: "Close and use necessary cookies only",
    session: "Necessary cookies",
    sessionText: "Signing in starts a session using a necessary cookie. It does not change your analytics choice.",
    analytics: "Optional web analytics",
    current: "Current choice",
    unset: "Analytics off · No saved choice",
    required: "Always active",
    allowed: "Analytics on",
    necessary: "Analytics off",
    analyticsText: "If you allow it, Vercel Web Analytics measures visits to the public homepage. It does not use cookies.",
  },
  ar: {
    title: "خيارات الكوكيز",
    text: "نستخدم الكوكيز لتسجيل الدخول وحفظ تفضيلاتك. إذا وافقت، تقيس Vercel Web Analytics زيارات هذه الصفحة الرئيسية. التحليلات لا تستخدم كوكيز وتظل متوقفة إلى أن تسمح بها.",
    privacy: "إشعار الخصوصية",
    reject: "الضرورية فقط",
    accept: "السماح بالتحليلات",
    settings: "إعدادات الكوكيز",
    close: "إغلاق واستخدام الكوكيز الضرورية فقط",
    session: "الكوكيز الضرورية",
    sessionText: "عند تسجيل الدخول تُستخدم كوكي ضرورية لتشغيل الجلسة. تسجيل الدخول لا يغيّر اختيارك للتحليلات.",
    analytics: "تحليلات الزيارات الاختيارية",
    current: "اختيارك الحالي",
    unset: "التحليلات متوقفة · ما حفظت اختيارك",
    required: "مفعّلة دائمًا",
    allowed: "التحليلات مفعّلة",
    necessary: "التحليلات متوقفة",
    analyticsText: "إذا سمحت، تقيس Vercel Web Analytics زيارات الصفحة الرئيسية العامة. التحليلات لا تستخدم كوكيز.",
  },
};

function readChoice() {
  const choice = getPreference(ANALYTICS_PREFERENCE);
  return choice === "allowed" || choice === "necessary" ? choice : null;
}

function subscribe(callback: () => void) {
  window.addEventListener(preferenceChanged, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(preferenceChanged, callback);
    window.removeEventListener("focus", callback);
  };
}

const beforeSend: BeforeSend = (event) => {
  if (event.type !== "pageview") return null;
  const url = analyticsPageUrl(readChoice(), window.location.href, event.url);
  return url ? { ...event, url } : null;
};

export default function CookieConsent({
  language,
  settings = false,
  showInitialBanner = false,
}: { language: Language; settings?: boolean; showInitialBanner?: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => undefined);
  const showBanner = choice === undefined ? showInitialBanner : choice === null;
  const t = copy[language];

  useEffect(() => {
    if (!settings && window.location.hash === cookieSettingsHash) {
      window.location.replace("/cookie-settings");
    }
  }, [settings]);

  function save(value: "allowed" | "necessary") {
    setPreference(ANALYTICS_PREFERENCE, value);
    window.dispatchEvent(new Event(preferenceChanged));
    if (!settings) document.getElementById("cookie-settings")?.focus({ preventScroll: true });
  }

  const actions = (
    <div className={styles.cookieActions}>
      <button type="button" aria-pressed={settings ? choice === "necessary" : undefined}
        onClick={() => save("necessary")}>{t.reject}</button>
      <button type="button" aria-pressed={settings ? choice === "allowed" : undefined}
        onClick={() => save("allowed")}>{t.accept}</button>
    </div>
  );

  if (settings) return (
    <div className={styles.cookiePreferences}>
      <section>
        <h2>{t.session}</h2>
        <div className={styles.preferenceBody}>
          <p className={styles.preferenceStatus}>{t.required}</p>
          <p>{t.sessionText}</p>
        </div>
      </section>
      <section>
        <h2>{t.analytics}</h2>
        <div className={styles.preferenceBody}>
          <p className={styles.preferenceStatus} role="status" aria-label={t.current}
            data-enabled={choice === "allowed"}>
            {choice === "allowed" ? t.allowed : choice === "necessary" ? t.necessary : t.unset}
          </p>
          <p>{t.analyticsText} <Link href="/privacy">{t.privacy}</Link></p>
          {actions}
        </div>
      </section>
    </div>
  );

  return <>
    <Link href="/cookie-settings" id="cookie-settings" className={styles.cookieLink}>
      {t.settings}
    </Link>
    {showBanner && (
      <section className={styles.cookieBanner} aria-labelledby="cookie-choice-title">
        <div>
          <strong id="cookie-choice-title">{t.title}</strong>
          <p>{t.text} <Link href="/cookie-settings">{t.settings}</Link></p>
        </div>
        {actions}
        <button type="button" className={styles.cookieDismiss} aria-label={t.close} onClick={() => save("necessary")}>×</button>
      </section>
    )}
    {choice === "allowed" && <Analytics beforeSend={beforeSend} />}
  </>;
}

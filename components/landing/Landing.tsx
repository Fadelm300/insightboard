"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  content,
  dimensions,
  featurePreviews,
  links,
  screenshot,
  technologies,
  type Language,
  type Theme
} from "./content";

const sections = [
  "features",
  "product",
  "technology",
  "developer"
];

function savePreference(name: "theme" | "language", value: string) {
  document.cookie =
    name +
    "=" +
    value +
    "; Path=/; Max-Age=31536000; SameSite=Lax" +
    (location.protocol === "https:" ? "; Secure" : "");
}

export default function Landing({
  initialLanguage,
  initialTheme,
  fontClasses
}: {
  initialLanguage: Language;
  initialTheme: Theme;
  fontClasses: string;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [theme, setTheme] = useState(initialTheme);
  const [menu, setMenu] = useState(false);
  const [feature, setFeature] = useState<number | null>(0);
  const [preview, setPreview] = useState(0);

  const [enlarged, setEnlarged] =
    useState<{ index: number; title: string } | null>(null);

  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const tabStrip = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const t = content[language];
  const rtl = language === "ar";

  useEffect(() => {
    const oldLang = document.documentElement.lang;
    const oldDir = document.documentElement.dir;

    return () => {
      document.documentElement.lang = oldLang;
      document.documentElement.dir = oldDir;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [language, rtl]);

  useEffect(() => {
    if (!menu) return;

    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    }

    document.addEventListener("keydown", escape);

    return () =>
      document.removeEventListener("keydown", escape);
  }, [menu]);

  useEffect(() => {
    if (!enlarged) return;

    const element = dialog.current;

    element?.showModal();

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      element?.close();
      document.body.style.overflow = oldOverflow;
      opener.current?.focus({ preventScroll: true });
    };
  }, [enlarged]);

  useEffect(() => {
    const strip = tabStrip.current;
    const tab = tabs.current[preview];

    if (!strip || !tab) return;

    const a = strip.getBoundingClientRect();
    const b = tab.getBoundingClientRect();

    if (b.left < a.left)
      strip.scrollBy({
        left: b.left - a.left,
        behavior: "instant"
      });

    else if (b.right > a.right)
      strip.scrollBy({
        left: b.right - a.right,
        behavior: "instant"
      });
  }, [preview, language]);

  function changeLanguage() {
    const next = rtl ? "en" : "ar";

    setLanguage(next);
    savePreference("language", next);
  }

  function changeTheme() {
    const next = theme === "light" ? "dark" : "light";

    setTheme(next);
    savePreference("theme", next);
  }

  function openImage(
    index: number,
    title: string,
    trigger: HTMLButtonElement
  ) {
    opener.current = trigger;
    setEnlarged({ index, title });
  }

  function tabKey(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    let next = index;

    if (event.key === "ArrowRight")
      next = (index + (rtl ? 7 : 1)) % 8;

    else if (event.key === "ArrowLeft")
      next = (index + (rtl ? 1 : 7)) % 8;

    else if (event.key === "Home")
      next = 0;

    else if (event.key === "End")
      next = 7;

    else
      return;

    event.preventDefault();

    setPreview(next);
    tabs.current[next]?.focus();
  }

  function productImage(
    index: number,
    title: string,
    priority = false
  ) {
    return <div className="ib-frame">
      <div className="ib-frame-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <i>InsightBoard</i>
      </div>

      <Image
        src={screenshot(index, theme)}
        alt={
          title +
          (rtl ? " — لقطة من النظام" : " — InsightBoard screenshot")
        }
        {...dimensions(index, theme)}
        sizes={
          priority
            ? "(min-width: 1024px) 680px, (min-width: 640px) 90vw, 100vw"
            : "(min-width: 1280px) 1200px, 100vw"
        }
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        className="ib-product-image"
      />

      <button
        type="button"
        className="ib-enlarge"
        onClick={e => openImage(index, title, e.currentTarget)}
      >
        <span aria-hidden="true">⤢</span> {t.enlarge}
      </button>
    </div>;
  }

  const navigation = <>
    {t.nav.map((label, i) =>
      <a
        key={sections[i]}
        href={"#" + sections[i]}
        onClick={() => setMenu(false)}
      >
        {label}
      </a>
    )}
  </>;

  return <div
    className={"ib-landing " + fontClasses}
    data-theme={theme}
    dir={rtl ? "rtl" : "ltr"}
    lang={language}
  >
    <a className="ib-skip" href="#main-content">
      {t.skip}
    </a>

    <header className="ib-header">
      <div className="ib-container ib-header-row">
        <Link
          href="/"
          className="ib-brand ib-header-brand"
          aria-label="InsightBoard"
          dir="ltr"
        >
          <Image
            src="/images/logo/insightboard-logo3.png"
            alt=""
            width={36}
            height={36}
            className="ib-brand-logo"
            style={{ width: 36, height: 36 }}
          />
          <span>InsightBoard</span>
        </Link>

        <nav
          className="ib-desktop-nav"
          aria-label={rtl ? "التنقل الرئيسي" : "Main navigation"}
        >
          {navigation}
        </nav>

        <div className="ib-header-actions">
          <button
            type="button"
            className="ib-language"
            onClick={changeLanguage}
            lang={rtl ? "en" : "ar"}
          >
            {t.language}
          </button>

          <button
            type="button"
            className="ib-icon"
            onClick={changeTheme}
            aria-label={theme === "light" ? t.dark : t.light}
          >
            <span aria-hidden="true">
              {theme === "light" ? "☾" : "☀"}
            </span>
          </button>

          <Link
            href="/login"
            className="ib-button ib-header-login"
          >
            {t.login}
          </Link>

          <button
            ref={menuButton}
            type="button"
            className="ib-icon ib-menu-button"
            aria-label={menu ? t.close : t.menu}
            aria-expanded={menu}
            aria-controls="ib-mobile-menu"
            onClick={() => setMenu(!menu)}
          >
            <span aria-hidden="true">
              {menu ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>

      <nav
        id="ib-mobile-menu"
        className="ib-mobile-menu"
        hidden={!menu}
        aria-label={t.menu}
      >
        <div className="ib-container">
          {navigation}

          <button
            type="button"
            onClick={changeLanguage}
            lang={rtl ? "en" : "ar"}
          >
            {t.language}
          </button>

          <Link
            href="/login"
            className="ib-button"
            onClick={() => setMenu(false)}
          >
            {t.login}
          </Link>
        </div>
      </nav>
    </header>

    <main id="main-content">
      <section
        className="ib-hero"
        aria-labelledby="ib-hero-title"
      >
        <div className="ib-container">
          <div className="ib-hero-grid">
            <div className="ib-hero-copy">
              <p className="ib-eyebrow ib-hero-label">
                {t.label}
              </p>

              <h1 id="ib-hero-title">
                {t.hero}{!rtl && <> <em>{t.business}</em></>}
              </h1>

              <p className="ib-lead">
                {t.description}
              </p>

              <div className="ib-actions">
                <Link href="/login" className="ib-button">
                  {t.demo}
                  <span aria-hidden="true">
                    {rtl ? "←" : "→"}
                  </span>
                </Link>

                <a href="#developer" className="ib-text-link">
                  {t.meet}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="ib-hero-product">
              {productImage(0, t.previews[0][0], true)}
            </div>
          </div>

          <div className="ib-modules">
            <span className="ib-eyebrow">
              01 / {rtl ? "نظرة عامة" : "OVERVIEW"}
            </span>

            <ul>
              {t.modules.map(item =>
                <li key={item}>
                  {item}
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="ib-section ib-warm"
        aria-labelledby="ib-workflow-title"
      >
        <div className="ib-container">
          <p className="ib-eyebrow">
            {t.workflowLabel}
          </p>

          <div className="ib-section-heading">
            <h2 id="ib-workflow-title">
              {t.workflow}
            </h2>

            <p>{t.workflowIntro}</p>
          </div>

          <ol className="ib-workflow">
            {t.stages.map((stage, i) =>
              <li key={stage}>
                <span className="ib-eyebrow">
                  0{i + 1}
                </span>

                <span>{stage}</span>

                {i < 3 &&
                  <span
                    className="ib-flow-arrow"
                    aria-hidden="true"
                  >
                    {rtl ? "←" : "→"}
                  </span>
                }
              </li>
            )}
          </ol>

          <ol className="ib-features">
            {t.features.map(([title, description], i) =>
              <li
                key={i}
                className={feature === i ? "is-active" : ""}
              >
                <h3
                  className="ib-feature-heading"
                  style={{ gridRow: i + 1 }}
                >
                  <button
                    id={"ib-feature-" + i}
                    type="button"
                    aria-expanded={feature === i}
                    aria-controls={"ib-feature-panel-" + i}
                    onClick={() =>
                      setFeature(i === feature ? null : i)
                    }
                  >
                    <span className="ib-number">
                      0{i + 1}
                    </span>

                    <span>{title}</span>

                    <span
                      className="ib-expand-sign"
                      aria-hidden="true"
                    >
                      {feature === i ? "−" : "+"}
                    </span>
                  </button>
                </h3>

                <div
                  className="ib-feature-panel"
                  id={"ib-feature-panel-" + i}
                  role="region"
                  aria-labelledby={"ib-feature-" + i}
                  hidden={feature !== i}
                >
                  {feature === i &&
                    <>
                      {productImage(featurePreviews[i], title)}
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </>
                  }
                </div>
              </li>
            )}
          </ol>
        </div>
      </section>

      <section
        id="product"
        className="ib-section"
        aria-labelledby="ib-product-title"
      >
        <div className="ib-container">
          <p className="ib-eyebrow">
            {t.previewLabel}
          </p>

          <div className="ib-section-heading">
            <h2 id="ib-product-title">
              {t.preview}
            </h2>

            <p>{t.previewIntro}</p>
          </div>

          <div
            className="ib-tabs"
            ref={tabStrip}
            role="tablist"
            aria-label={t.preview}
          >
            {t.tabs.map((title, i) =>
              <button
                key={i}
                ref={element => {
                  tabs.current[i] = element;
                }}
                id={"ib-tab-" + i}
                type="button"
                role="tab"
                aria-selected={preview === i}
                aria-controls="ib-preview-panel"
                tabIndex={preview === i ? 0 : -1}
                onClick={() => setPreview(i)}
                onKeyDown={e => tabKey(e, i)}
              >
                {title}
              </button>
            )}
          </div>

          <div
            id="ib-preview-panel"
            role="tabpanel"
            aria-labelledby={"ib-tab-" + preview}
            tabIndex={0}
          >
            {productImage(preview, t.previews[preview][0])}

            <div className="ib-preview-caption">
              <div
                className="ib-preview-info"
                aria-live="polite"
              >
                <span className="ib-eyebrow" dir="ltr">
                  0{preview + 1} / 08
                </span>

                <div>
                  <h3>{t.previews[preview][0]}</h3>
                  <p>{t.previews[preview][1]}</p>
                </div>
              </div>

              <div className="ib-preview-controls">
                <button
                  type="button"
                  className="ib-icon"
                  aria-label={t.previous}
                  onClick={() => setPreview((preview + 7) % 8)}
                >
                  {rtl ? "→" : "←"}
                </button>

                <button
                  type="button"
                  className="ib-icon"
                  aria-label={t.next}
                  onClick={() => setPreview((preview + 1) % 8)}
                >
                  {rtl ? "←" : "→"}
                </button>
              </div>
            </div>
          </div>

          <p className="ib-sample">
            {t.sample} <Link
              href="/login"
              className="ib-inline-link"
            >
              {t.demo} ↗
            </Link>
          </p>
        </div>
      </section>

      <section
        id="technology"
        className="ib-section ib-warm"
        aria-labelledby="ib-tech-title"
      >
        <div className="ib-container">
          <p className="ib-eyebrow ib-rule-label">
            {t.techLabel}
          </p>

          <div className="ib-tech-grid">
            <div>
              <h2 id="ib-tech-title">
                {t.tech}
              </h2>

              <p className="ib-lead">
                {t.techIntro}
              </p>

              <dl className="ib-tech-list">
                {technologies.map((row, i) =>
                  <div key={i}>
                    <dt className="ib-eyebrow">
                      {t.categories[i]}
                    </dt>

                    <dd>
                      {row.map(name =>
                        <span key={name} dir="ltr">
                          {name}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <aside
              className="ib-approach"
              aria-labelledby="ib-approach-title"
            >
              <h3 id="ib-approach-title">
                {t.approach}
              </h3>

              <ol>
                {t.principles.map(([title, description], i) =>
                  <li key={i}>
                    <span className="ib-eyebrow">
                      0{i + 1}
                    </span>

                    <h4>{title}</h4>
                    <p>{description}</p>
                  </li>
                )}
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <section
        id="developer"
        className="ib-section"
        aria-labelledby="ib-developer-title"
      >
        <div className="ib-container ib-developer-grid">
          <div>
            <p className="ib-eyebrow">
              {t.developerLabel}
            </p>

            <h2 id="ib-developer-title">
              {t.developer}
            </h2>

            <p className="ib-role">
              {t.name}<br />{t.role}
            </p>
          </div>

          <div className="ib-developer-detail">
            <p className="ib-lead">
              {t.bio}
            </p>

            <ul className="ib-areas">
              {t.areas.map(area =>
                <li key={area}>
                  {area}
                  <span aria-hidden="true">↗</span>
                </li>
              )}
            </ul>

            <div className="ib-signature">
              <span
                className="ib-monogram"
                aria-hidden="true"
              >
                FM
              </span>

              <span className="ib-eyebrow">
                {t.name}<br />{t.built}
              </span>
            </div>

            <a
              href={links.contact}
              className="ib-text-link"
              target="_blank"
              rel="noreferrer"
            >
              {t.contactLink} ↗
            </a>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="ib-contact ib-warm"
        aria-labelledby="ib-contact-title"
      >
        <div className="ib-container">
          <p className="ib-eyebrow">
            {t.contactLabel}
          </p>

          <h2 id="ib-contact-title">
            {t.contact}
          </h2>

          <p className="ib-lead">
            {t.contactIntro}
          </p>

          <div className="ib-actions">
            <Link href="/login" className="ib-button">
              {t.demo} ↗
            </Link>

            <a
              href={links.portfolio}
              className="ib-button ib-button-outline"
              target="_blank"
              rel="noreferrer"
            >
              {t.portfolio} ↗
            </a>
          </div>

          <a
            href={"mailto:" + links.email}
            className="ib-email"
            dir="ltr"
          >
            {links.email}
          </a>
        </div>
      </section>
    </main>

    <footer className="ib-footer">
      <div className="ib-container ib-footer-grid">
        <Link href="/" className="ib-brand" dir="ltr">
          InsightBoard
        </Link>

        <nav aria-label={rtl ? "روابط إضافية" : "Footer navigation"}>
          <a
            href={links.portfolio}
            target="_blank"
            rel="noreferrer"
          >
            {rtl ? "البورتفوليو" : "Portfolio"}
          </a>

          <a
            href={links.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>

          <Link href="/login">
            {t.login}
          </Link>
        </nav>

        <p>
          {t.copyright}<br /><span>{t.built}</span>
        </p>
      </div>
    </footer>

    {enlarged &&
      <dialog
        ref={dialog}
        className="ib-dialog"
        aria-labelledby="ib-dialog-title"
        onCancel={event => {
          event.preventDefault();
          setEnlarged(null);
        }}
        onClick={event => {
          if (event.target === event.currentTarget)
            setEnlarged(null);
        }}
      >
        <div className="ib-dialog-toolbar">
          <h2 id="ib-dialog-title">
            {enlarged.title}
          </h2>

          <button
            type="button"
            className="ib-icon"
            autoFocus
            onClick={() => setEnlarged(null)}
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <Image
          src={screenshot(enlarged.index, theme)}
          alt={enlarged.title}
          {...dimensions(enlarged.index, theme)}
          sizes="96vw"
          className="ib-dialog-image"
        />
      </dialog>
    }
  </div>;
}
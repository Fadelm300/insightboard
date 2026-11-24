import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const { legalContent } = await import("../components/landing/legalContent.ts");

function transpile(name) {
  const file = new URL(`../components/landing/${name}.tsx`, import.meta.url);
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}

const noticeSource = transpile("LegalNotice");
const layoutSource = transpile("PublicPolicyLayout");

function load(mode, language) {
  const { jsx } = require("react/jsx-runtime");
  const dependencies = {
    "next/link": { default: (props) => {
      const attributes = { ...props };
      delete attributes.key;
      return jsx("a", attributes);
    } },
    "next/image": { default: () => null },
    "next/headers": { cookies: async () => ({ get: () => ({ value: language }) }) },
    "./content": { links: { contact: "https://example.invalid/contact" } },
    "./legalContent": { legalContent },
    "./landingFonts": { landingFontClasses: "landing-fonts" },
    "./legalNotice.module.css": { default: { notice: "notice" } },
    "@/app/landing.css": {},
  };
  function execute(source) {
    const exports = {};
    Function("exports", "require", "process", source)(
      exports, (name) => dependencies[name] ?? require(name), { env: { LEGAL_NOTICE_MODE: mode } },
    );
    return exports;
  }
  dependencies["./PublicPolicyLayout"] = execute(layoutSource);
  return execute(noticeSource);
}

test("legal notices remain available and review metadata prevents indexing of drafts", async () => {
  for (const mode of [undefined, "production", "REVIEW"]) {
    const { default: Notice, legalMetadata } = load(mode, "en");
    assert.match(renderToStaticMarkup(await Notice({ kind: "privacy" })), /Privacy notice/);
    assert.doesNotMatch(renderToStaticMarkup(await Notice({ kind: "terms" })), /Draft for review/);
    assert.equal((await legalMetadata("terms")).robots, undefined);
  }
  const { legalMetadata } = load("review", "ar");
  const metadata = await legalMetadata("privacy");
  assert.equal(metadata.robots.index, false);
  assert.match(metadata.title, /إشعار الخصوصية/);
});

test("draft notices render labelled English and Arabic content with the correct direction", async () => {
  for (const language of ["en", "ar"]) {
    const { default: Notice } = load("review", language);
    const privacy = renderToStaticMarkup(await Notice({ kind: "privacy" }));
    const terms = renderToStaticMarkup(await Notice({ kind: "terms" }));
    const direction = language === "ar" ? "rtl" : "ltr";
    assert.match(privacy, new RegExp(`lang="${language}" dir="${direction}"`));
    assert.match(privacy, language === "ar" ? /إشعار الخصوصية/ : /Privacy notice/);
    assert.match(terms, language === "ar" ? /شروط الاستخدام/ : /Terms of use/);
    assert.match(terms, language === "ar" ? /مسودة للمراجعة/ : /Draft for review/);
    assert.match(privacy, /href="\/cookie-settings"/);
    assert.match(privacy, /href="\/privacy" aria-current="page"/);
    assert.match(terms, /href="\/terms" aria-current="page"/);
  }
});

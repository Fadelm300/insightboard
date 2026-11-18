import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const file = new URL("../components/landing/LegalNotice.tsx", import.meta.url);
const source = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function load(mode, language) {
  const { jsx } = require("react/jsx-runtime");
  const exports = {};
  const dependencies = {
    "next/link": { default: ({ href, children }) => jsx("a", { href, children }) },
    "next/headers": { cookies: async () => ({ get: () => ({ value: language }) }) },
    "next/navigation": { notFound: () => { throw new Error("not found"); } },
    "./content": { links: { contact: "https://example.invalid/contact" } },
    "./legalNotice.module.css": { default: { notice: "notice" } },
  };
  Function("exports", "require", "process", source)(
    exports, (name) => dependencies[name] ?? require(name),
    { env: { LEGAL_NOTICE_MODE: mode } },
  );
  return exports.default;
}

test("draft pages are unavailable unless legal review mode is explicitly enabled", async () => {
  for (const mode of [undefined, "production", "REVIEW"]) {
    const Notice = load(mode, "en");
    await assert.rejects(Notice({ kind: "privacy" }), /not found/);
    await assert.rejects(Notice({ kind: "terms" }), /not found/);
  }
});

test("draft notices render labelled English and Arabic content with the correct direction", async () => {
  for (const language of ["en", "ar"]) {
    const Notice = load("review", language);
    const privacy = renderToStaticMarkup(await Notice({ kind: "privacy" }));
    const terms = renderToStaticMarkup(await Notice({ kind: "terms" }));
    const direction = language === "ar" ? "rtl" : "ltr";
    assert.match(privacy, new RegExp(`lang="${language}" dir="${direction}"`));
    assert.match(privacy, language === "ar" ? /إشعار الخصوصية/ : /Privacy notice/);
    assert.match(terms, language === "ar" ? /شروط الاستخدام/ : /Terms of use/);
    assert.match(terms, language === "ar" ? /مسودة للمراجعة/ : /Draft for review/);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { analyticsPageUrl } from "../components/landing/analyticsConsent.ts";

const home = "https://example.invalid/";

test("analytics requires an explicit affirmative choice", () => {
  for (const preference of [null, "necessary", "unknown"]) {
    assert.equal(analyticsPageUrl(preference, home, home), null);
  }
});

test("analytics accepts only same-origin homepage events and removes URL parameters", () => {
  assert.equal(analyticsPageUrl("allowed", home, "/?ref=test#demo"), home);
  assert.equal(analyticsPageUrl("allowed", home, "/dashboard"), null);
  assert.equal(analyticsPageUrl("allowed", home + "dashboard", home), null);
  assert.equal(analyticsPageUrl("allowed", home, "https://another.invalid/"), null);
  assert.equal(analyticsPageUrl("allowed", home, "http://["), null);
});

test("the initial and necessary-only views never mount the analytics component", () => {
  const require = createRequire(import.meta.url);
  const { jsx } = require("react/jsx-runtime");
  const actualReact = require("react");
  const file = new URL("../components/landing/CookieConsent.tsx", import.meta.url);
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const dependencies = {
    react: {
      ...actualReact,
      useSyncExternalStore: (_subscribe, getSnapshot, getServerSnapshot) =>
        serverRender ? getServerSnapshot() : getSnapshot(),
    },
    "next/link": { default: ({ href, children }) => jsx("a", { href, children }) },
    "@vercel/analytics/next": { Analytics: () => jsx("span", { "data-analytics-mounted": true }) },
    "@/lib/preferences": { getPreference: () => null },
    "./analyticsConsent": { analyticsPageUrl },
    "./legalNotice.module.css": { default: {} },
  };
  let serverRender = false;
  const render = (choice, showInitialBanner = false) => {
    dependencies["@/lib/preferences"].getPreference = () => choice;
    const exports = {};
    Function("exports", "require", source)(exports, (name) => dependencies[name] ?? require(name));
    return renderToStaticMarkup(jsx(exports.default, { language: "en", showInitialBanner }));
  };
  const initial = render(null);
  assert.match(initial, /Necessary only/);
  assert.match(initial, /Allow analytics/);
  assert.doesNotMatch(initial, /data-analytics-mounted/);
  assert.doesNotMatch(render("necessary"), /data-analytics-mounted/);
  assert.match(render("allowed"), /data-analytics-mounted/);
  assert.match(render("necessary"), /Cookie settings/);
  assert.doesNotMatch(render("necessary"), /Your cookie choices/);
  serverRender = true;
  assert.match(render(null, true), /Your cookie choices/);
  assert.doesNotMatch(render("necessary"), /Your cookie choices/);
  assert.doesNotMatch(render("allowed"), /data-analytics-mounted/);
});

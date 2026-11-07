import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(relative, dependencies = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Buffer, URL, Request,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relative });
  return exports;
}

test("error recovery buttons perform full document navigation to safe destinations", () => {
  const jsx = (type, props) => ({ type, props });
  const screen = load("components/access/AccessErrorScreen.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "@mui/material": {
      Box: "Box", Button: "Button", Typography: "Typography", keyframes: () => "animation",
    },
  });
  function buttons(node) {
    if (!node || typeof node !== "object") return [];
    const children = node.props?.children;
    const nested = (Array.isArray(children) ? children : [children]).flatMap(buttons);
    return node.type === "Button" ? [node, ...nested] : nested;
  }
  for (const restricted of [true, false]) {
    const controls = buttons(screen.default({ restricted, home: "/dashboard/projects" }));
    assert.equal(controls.length, 2);
    assert.deepEqual(Array.from(controls, (node) => node.props.component), ["a", "a"]);
    assert.deepEqual(Array.from(controls, (node) => node.props.href), ["/dashboard/projects", "/"]);
  }
});

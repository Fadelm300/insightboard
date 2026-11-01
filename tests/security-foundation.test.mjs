import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

// Execute the real TypeScript source with isolated external dependencies.
function loadSource(relativePath, dependencies = {}, environment = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  const context = {
    exports,
    Buffer,
    console: dependencies.console ?? console,
    global: {},
    process: { env: environment },
    require(name) {
      if (!(name in dependencies)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }

      return dependencies[name];
    },
  };

  vm.runInNewContext(compiled, context, { filename: relativePath });
  return exports;
}

const environment = loadSource("lib/serverEnv.ts");

test("missing server settings identify the key without exposing values", () => {
  assert.throws(() => environment.getMongoUri({}), /MONGODB_URI/);
});

test("MongoDB setting accepts both supported schemes and rejects invalid ones", () => {
  for (const uri of [
    "mongodb://127.0.0.1:27017/test",
    "mongodb://host1:27017,host2:27017/test?replicaSet=test",
    "mongodb+srv://user:password@example.invalid/test",
  ]) {
    assert.equal(environment.getMongoUri({ MONGODB_URI: uri }), uri);
  }

  const sensitiveValue = "https://private-user:private-password@example.invalid";

  assert.throws(
    () => environment.getMongoUri({ MONGODB_URI: sensitiveValue }),
    (error) => error.message.includes("MONGODB_URI") && !error.message.includes(sensitiveValue)
  );
});

test("a mistyped demo flag fails closed instead of silently enabling writes", () => {
  assert.equal(environment.getDemoMode({ DEMO_MODE: "true" }), true);
  assert.equal(environment.getDemoMode({ DEMO_MODE: "false" }), false);
  assert.equal(environment.getDemoMode({}), false);

  for (const value of ["TRUE", "1", "", "true "]) {
    assert.throws(() => environment.getDemoMode({ DEMO_MODE: value }), /exactly true or false/);
  }
});

function diagnostic({ mode, user = null, failure = false }) {
  const calls = { database: 0, authentication: 0, logs: [] };
  const route = loadSource(
    "app/api/test-db/route.ts",
    {
      "next/server": {
        NextResponse: {
          json: (body, options) => Response.json(body, options),
        },
      },
      "@/lib/auth": {
        getAuthUser: () => {
          calls.authentication += 1;
          return user;
        },
      },
      "@/lib/mongodb": {
        __esModule: true,
        default: async () => {
          calls.database += 1;

          if (failure) {
            throw new Error("mongodb://private-user:private-password@private-host/database");
          }
        },
      },
      "@/lib/serverLogger": {
        logServerError: (event) => calls.logs.push(event),
      },
    },
    { NODE_ENV: mode }
  );

  return { route, calls };
}

test("production and preview builds cannot authenticate or contact the database diagnostic", async () => {
  // Vercel Production and Preview both run Next.js with NODE_ENV=production.
  for (const mode of ["production", "test", undefined]) {
    const { route, calls } = diagnostic({ mode, user: { role: "admin" } });
    const response = await route.GET({});
    assert.equal(response.status, 404);
    assert.equal(calls.database, 0);
    assert.equal(calls.authentication, 0);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("development diagnostics require an authenticated admin", async () => {
  for (const [user, status] of [[null, 401], [{ role: "viewer" }, 403]]) {
    const { route, calls } = diagnostic({ mode: "development", user });
    assert.equal((await route.GET({})).status, status);
    assert.equal(calls.database, 0);
  }
});

test("development diagnostic succeeds for an admin without caching", async () => {
  const { route, calls } = diagnostic({ mode: "development", user: { role: "admin" } });
  const response = await route.GET({});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.database, 1);
});

test("diagnostic failures expose neither credentials nor internal hostnames", async () => {
  const { route, calls } = diagnostic({ mode: "development", user: { role: "admin" }, failure: true });
  const response = await route.GET({});
  const text = await response.text();
  assert.equal(response.status, 503);
  assert.ok(!text.includes("private-"));
  assert.equal(calls.logs[0], "DATABASE_DIAGNOSTIC_ERROR");
});

test("server logger records only the operation label", () => {
  const calls = [];
  const logger = loadSource("lib/serverLogger.ts", {
    console: { error: (...args) => calls.push(args) },
  });

  logger.logServerError("LOGIN_API_ERROR");
  assert.equal(JSON.stringify(calls), '[["[server-error]",{"event":"LOGIN_API_ERROR"}]]');
});

test("a failed database connection is retried and a successful one is reused", async () => {
  let attempts = 0;
  const connection = { connected: true };
  const mongodb = loadSource("lib/mongodb.ts", {
    mongoose: {
      __esModule: true,
      default: {
        connect: async () => {
          attempts += 1;

          if (attempts === 1) {
            throw new Error("Temporary connection failure");
          }

          return connection;
        },
      },
    },
    "@/lib/serverEnv": { getMongoUri: () => "mongodb://127.0.0.1:27017/test" },
  });

  await assert.rejects(mongodb.default(), /Temporary connection failure/);
  assert.equal(await mongodb.default(), connection);
  assert.equal(await mongodb.default(), connection);
  assert.equal(attempts, 2);
});

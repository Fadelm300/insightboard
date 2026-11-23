import { readFile } from "node:fs/promises";
import { validateLocalTestUrl } from "./access-test-plan.mjs";

const missingId = "000000000000000000000001";
const readPaths = [
  "/api/dashboard/overview", "/api/clients", "/api/deals", "/api/projects",
  "/api/revenue", "/api/expenses", "/api/finance/summary", "/api/finance/monthly",
  "/api/finance/project-types", "/api/finance/clients", "/api/finance/projects",
  "/api/company-settings",
];
const blockedActions = [
  ["POST", "/api/clients"], ["PUT", `/api/clients/${missingId}`], ["DELETE", `/api/clients/${missingId}`],
  ["POST", "/api/deals"], ["PUT", `/api/deals/${missingId}`], ["DELETE", `/api/deals/${missingId}`],
  ["POST", `/api/deals/${missingId}/convert-to-project`],
  ["POST", "/api/projects"], ["PUT", `/api/projects/${missingId}`], ["DELETE", `/api/projects/${missingId}`],
  ["POST", "/api/revenue"], ["PUT", `/api/revenue/${missingId}`], ["DELETE", `/api/revenue/${missingId}`],
  ["POST", "/api/expenses"], ["PUT", `/api/expenses/${missingId}`], ["DELETE", `/api/expenses/${missingId}`],
  ["POST", "/api/users"], ["PUT", `/api/users/${missingId}`], ["PUT", "/api/company-settings"],
  ["POST", "/api/archive-requests"], ["POST", `/api/archive-requests/${missingId}/decision`],
  ["POST", `/api/crm-archive/projects/${missingId}/restore`], ["DELETE", `/api/crm-archive/projects/${missingId}`],
  ["POST", `/api/financial-archive/revenue/${missingId}/restore`],
  ["POST", "/api/reports/authorize?action=export"],
];

class CheckFailure extends Error {}

async function main() {
  const [, , url, file] = process.argv;
  const origin = validateLocalTestUrl(url);
  const accounts = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(accounts) || accounts.length !== 11 || accounts.some(({ email, password }) =>
    !/^investor-[a-z]+@insightboard\.test$/.test(email) || !/^[\w-]{32}$/.test(password))) {
    throw new CheckFailure("Expected the private investor demo credential file.");
  }
  let passed = 0;

  async function request(path, status, { method = "GET", cookie, body } = {}) {
    let response;
    try {
      response = await fetch(origin + path, {
        method, redirect: "manual",
        headers: {
          Origin: origin, "x-insightboard-request": "1",
          ...(cookie && { Cookie: cookie }),
          ...(body !== undefined && { "Content-Type": "application/json" }),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      throw new CheckFailure(`${method} ${path}: server unavailable or timed out.`);
    }
    if (response.status !== status) {
      await response.body?.cancel();
      throw new CheckFailure(`${method} ${path}: expected ${status}, received ${response.status}.`);
    }
    passed++;
    console.log(`PASS ${response.status} ${method} ${path}`);
    return response;
  }

  const anonymous = await request("/api/auth/me", 401);
  await anonymous.body?.cancel();
  for (const [index, account] of accounts.entries()) {
    console.log(`Checking investor demo account ${index + 1}/${accounts.length}`);
    const login = await request("/api/auth/login", 200, { method: "POST", body: account });
    const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    await login.body?.cancel();
    if (!cookie) throw new CheckFailure("Login did not set a session cookie.");
    try {
      const identity = await (await request("/api/auth/me", 200, { cookie })).json();
      const user = identity.data?.user;
      if (user?.email !== account.email || !Array.isArray(user.allowedPermissions)
        || !user.allowedPermissions.includes("dashboard.read")
        || user.allowedPermissions.some((permission) => !permission.endsWith(".read"))) {
        throw new CheckFailure("Unexpected identity or non-read permission.");
      }
      for (const path of readPaths) await (await request(path, 200, { cookie })).body?.cancel();
      await (await request("/api/users", user.role === "manager" ? 200 : 403, { cookie })).body?.cancel();
      for (const [method, path] of blockedActions) {
        await (await request(path, 403, { method, cookie, body: method === "DELETE" ? undefined : {} })).body?.cancel();
      }
    } finally {
      await (await request("/api/auth/logout", 200, { method: "POST", cookie })).body?.cancel();
    }
    await (await request("/api/auth/me", 401, { cookie })).body?.cancel();
  }
  console.log(`Investor demo HTTP checks passed: ${passed}.`);
}

main().catch((error) => {
  console.error(error instanceof CheckFailure ? error.message : "Check the loopback URL and the private credential file.");
  process.exitCode = 1;
});

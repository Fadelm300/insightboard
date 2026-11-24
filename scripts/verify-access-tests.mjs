import assert from "node:assert/strict";
import { accessTestPlan, validateLocalTestUrl } from "./access-test-plan.mjs";

export class AccessVerificationError extends Error {}

/** Real HTTP integration checks; only fixture accounts may be changed. No CRM writes. */
export async function verifyAccessTests(url, password, { fetchImpl = fetch, onResult = () => {} } = {}) {
  const origin = validateLocalTestUrl(url);
  const plan = accessTestPlan();
  const clients = new Map();
  const results = [];
  async function call(cookie, path, method = "GET", body) {
    let response;
    try { response = await fetchImpl(origin + path, {
      method, redirect: "manual",
      headers: { Origin: origin, "x-insightboard-request": "1", "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    }); } catch {
      throw new AccessVerificationError(`${method} ${path}: local server could not be reached or timed out. Check npm run dev and its Local port.`);
    }
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, cookie: response.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ") };
  }
  function expect(label, actual, expected) {
    if (actual !== expected) {
      throw new AccessVerificationError(`${label}: expected ${String(expected)}, received ${String(actual)}. No response body or credentials were logged.`);
    }
    results.push({ check: label, result: "PASS" });
    onResult(results.at(-1));
  }
  try {
    for (const account of plan) {
      const login = await call("", "/api/auth/login", "POST", { email: account.email, password });
      expect(`${account.key}: login`, login.status, account.isActive === false ? 401 : 200);
      if (account.isActive === false) continue;
      if (!login.cookie) throw new AccessVerificationError(`${account.key}: login returned no session cookie. Restart the current development application.`);
      clients.set(account.key, login.cookie);
      const me = await call(login.cookie, "/api/auth/me");
      expect(`${account.key}: session identity`, me.data.data?.user?.email, account.email);
      assert.equal("password" in me.data.data.user, false);
    }
    const checks = [
      ["manager", "/api/clients", "GET", 200],
      ["manager", "/api/projects", "GET", 200],
      ["manager", "/api/finance/summary", "GET", 200],
      ["projects", "/api/projects", "GET", 200],
      ["projects", "/api/clients", "GET", 403],
      ["projects", "/api/finance/summary", "GET", 403],
      ["projects", "/api/users", "GET", 403],
      ["projects", "/api/projects/000000000000000000000001", "DELETE", 403],
      ["projects", "/api/reports/authorize?action=export", "POST", 403],
      ["finance", "/api/revenue", "GET", 200],
      ["finance", "/api/expenses", "GET", 200],
      ["finance", "/api/finance/summary", "GET", 200],
      ["finance", "/api/projects", "GET", 403],
      ["viewer", "/api/projects", "GET", 200],
      ["viewer", "/api/projects", "POST", 403],
      ["senior", "/api/clients", "GET", 200],
      ["senior", "/api/clients/000000000000000000000001", "DELETE", 403],
      ["directory", "/api/users", "GET", 200],
      ["directory", "/api/finance/summary", "GET", 403],
      ["directory", "/api/users", "POST", 403],
    ];
    for (const [key, path, method, status] of checks) {
      expect(`${key}: ${method} ${path}`, (await call(clients.get(key), path, method)).status, status);
    }
    const listing = await call(clients.get("manager"), "/api/users");
    expect("manager: list staff", listing.status, 200);
    const staff = listing.data.data.users;
    const otherEmail = plan.find((account) => account.key === "otherTeam").email;
    expect("manager: other team's accounts excluded", staff.some((user) => user.email === otherEmail), false);
    const otherListing = await call(clients.get("otherManager"), "/api/users");
    const other = otherListing.data.data.users.find((user) => user.email === otherEmail);
    assert.ok(other, "Other manager must see their assigned fixture");
    const targetBody = (user, active) => ({ name: user.name, role: user.role, allowedPermissions: user.allowedPermissions, isActive: active, version: user.version });
    expect("manager: cannot update another team's employee", (await call(clients.get("manager"), `/api/users/${other.id}`, "PUT", targetBody(other, true))).status, 404);

    const viewerEmail = plan.find((account) => account.key === "viewer").email;
    const viewer = staff.find((user) => user.email === viewerEmail);
    assert.ok(viewer, "Viewer fixture must be assigned to manager A");
    const disabled = await call(clients.get("manager"), `/api/users/${viewer.id}`, "PUT", targetBody(viewer, false));
    expect("manager: disable own fixture using real transaction", disabled.status, 200);
    try {
      expect("disabled fixture: existing session revoked", (await call(clients.get("viewer"), "/api/auth/me")).status, 401);
      expect("disabled fixture: login denied", (await call("", "/api/auth/login", "POST", { email: viewerEmail, password })).status, 401);
      expect("stale account revision rejected", (await call(clients.get("manager"), `/api/users/${viewer.id}`, "PUT", targetBody(viewer, true))).status, 409);
    } finally {
      const current = disabled.data.data.user;
      const restored = await call(clients.get("manager"), `/api/users/${viewer.id}`, "PUT", { ...targetBody(viewer, true), version: current.version });
      expect("viewer fixture re-enabled", restored.status, 200);
    }
    const refreshed = await call("", "/api/auth/login", "POST", { email: viewerEmail, password });
    expect("viewer: fresh login after re-enable", refreshed.status, 200);
    clients.set("viewer", refreshed.cookie);
    return results;
  } finally {
    await Promise.allSettled([...clients.values()].map((cookie) => call(cookie, "/api/auth/logout", "POST")));
  }
}

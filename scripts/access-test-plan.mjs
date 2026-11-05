export const ACCESS_TEST_BATCH = "access-qa-20261102";

/** Disposable identities for the dedicated development database only. */
export function accessTestPlan() {
  const email = (name) => `${name}-20261102@insightboard.test`;
  return [
    { key: "admin", name: "QA Admin", email: email("qa-admin"), role: "admin" },
    { key: "manager", name: "QA Manager A", email: email("qa-manager-a"), role: "manager" },
    { key: "otherManager", name: "QA Manager B", email: email("qa-manager-b"), role: "manager" },
    { key: "projects", name: "QA Projects Employee", email: email("qa-projects"), role: "employee", manager: "manager", allowedPermissions: ["projects.read", "projects.create", "settings.read"] },
    { key: "finance", name: "QA Accounts Employee", email: email("qa-accounts"), role: "employee", manager: "manager", allowedPermissions: ["revenue.read", "revenue.create", "expenses.read", "expenses.create", "finance.read", "settings.read"] },
    { key: "viewer", name: "QA Project Viewer", email: email("qa-viewer"), role: "viewer", manager: "manager", allowedPermissions: ["projects.read", "settings.read"] },
    { key: "senior", name: "QA Senior Employee", email: email("qa-senior"), role: "senior", manager: "manager", allowedPermissions: ["clients.read", "clients.create", "clients.update", "deals.read", "deals.create", "deals.update", "settings.read"] },
    { key: "otherTeam", name: "QA Other Team Employee", email: email("qa-other-team"), role: "employee", manager: "otherManager", allowedPermissions: ["projects.read", "settings.read"] },
    { key: "directory", name: "QA Administration Directory", email: email("qa-administration"), role: "administration", allowedPermissions: ["users.read", "settings.read"] },
    { key: "programmer", name: "QA Reserved Programmer (disabled)", email: email("qa-programmer"), role: "programmer", isActive: false, allowedPermissions: [] },
  ];
}

export function validateFixturePassword(password) {
  if (typeof password !== "string" || password.length < 16 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Use a temporary test password of 16 characters or more, at most 72 UTF-8 bytes");
  }
}

export function validateLocalTestUrl(value) {
  const target = new URL(value);
  if (target.protocol !== "http:" || target.hostname !== "localhost" || target.username || target.password ||
      target.pathname !== "/" || target.search || target.hash) {
    throw new Error("The browser test target must be an http://localhost:PORT origin");
  }
  return target.origin;
}

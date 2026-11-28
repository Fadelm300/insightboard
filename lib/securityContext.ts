import { isIP } from "node:net";
import type { NextRequest } from "next/server";

export type SecurityContext = {
  ip: string | null;
  country: string | null;
  source: "vercel" | "unavailable";
  userAgent: string;
  method: string;
  path: string;
  capturedAt: Date;
};

function clean(value: string, maximum: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maximum);
}

// Only keep recognised route names. IDs, query strings and arbitrary URL input are not audit data.
const routeNames = new Set([
  "api", "auth", "login", "logout", "register", "renew", "me", "users", "clients", "deals",
  "projects", "revenue", "expenses", "company-settings", "dashboard", "overview", "finance",
  "summary", "monthly", "project-types", "lookups", "reports", "authorize", "test-db",
  "crm-archive", "financial-archive", "archive-requests", "restore", "decision", "convert-to-project",
]);

export function securityRequestContext(req: Pick<NextRequest, "headers" | "method" | "url">): SecurityContext {
  const trusted = process.env.VERCEL === "1";
  const candidate = trusted ? req.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0].trim() : undefined;
  const ip = candidate && candidate.length <= 45 && isIP(candidate) ? candidate : null;
  const country = trusted && ip ? req.headers.get("x-vercel-ip-country") : null;
  let path = "/unknown";
  try {
    path = "/" + new URL(req.url).pathname.split("/").filter(Boolean).slice(0, 8)
      .map((part) => routeNames.has(part) ? part : ":id").join("/");
  } catch { /* Invalid request URLs never enter the log verbatim. */ }
  return {
    ip,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    source: trusted && ip ? "vercel" : "unavailable",
    userAgent: clean(req.headers.get("user-agent") ?? "", 512),
    method: /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(req.method) ? req.method : "OTHER",
    path,
    capturedAt: new Date(),
  };
}

export function securityEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email)
    ? email : undefined;
}

export const SESSION_WARNING_MS = 30_000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

export function sessionIdleMs(environment = process.env) {
  return environment.NODE_ENV === "development" ? 10 * 60 * 1000 : 20 * 60 * 1000;
}

export function sessionCookieName(environment = process.env) {
  return environment.NODE_ENV === "production"
    ? "__Host-insightboard_session"
    : "insightboard_session";
}

export function sessionCookieOptions(environment = process.env) {
  return {
    httpOnly: true,
    secure: environment.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function nextSessionExpiry(now: number, absoluteExpiry: number, idleMs: number) {
  return new Date(Math.min(now + idleMs, absoluteExpiry));
}

export function isSessionExpired(expiresAt: Date, absoluteExpiresAt: Date, now: number) {
  return expiresAt.getTime() <= now || absoluteExpiresAt.getTime() <= now;
}

export function isTrustedMutation(req: { method: string; url: string; headers: Headers }) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
    return true;
  }

  try {
    return (
      req.headers.get("origin") === new URL(req.url).origin &&
      req.headers.get("x-insightboard-request") === "1" &&
      req.headers.get("sec-fetch-site") !== "cross-site"
    );
  } catch {
    return false;
  }
}

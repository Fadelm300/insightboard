export const AUTH_CHANGED_EVENT = "insightboard-auth-changed";

let sessionEndAnnounced = false;

export function notifyAuthChanged(type: "changed" | "logout" | "expired") {
  if (type === "changed") {
    sessionEndAnnounced = false;
  } else {
    if (sessionEndAnnounced) return;
    sessionEndAnnounced = true;
  }
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: type }));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("insightboard-session");
    channel.postMessage(type);
    channel.close();
  }
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-InsightBoard-Request": "1" },
  });

  if (!response.ok) throw new Error("Unable to sign out. Please try again.");
  notifyAuthChanged("logout");
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Never send private CRM cookies or this CSRF header to another origin.
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin) throw new Error("External API requests are not allowed");

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD"].includes((options.method ?? "GET").toUpperCase())) {
    headers.set("X-InsightBoard-Request", "1");
  }

  const response = await fetch(target, { ...options, headers, credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) notifyAuthChanged("expired");
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
}

export const ANALYTICS_PREFERENCE = "ib_analytics_v1";

export function analyticsPageUrl(preference: string | null, currentUrl: string, reportedUrl: string) {
  if (preference !== "allowed") return null;
  try {
    const current = new URL(currentUrl);
    const reported = new URL(reportedUrl, current);
    if (current.pathname !== "/" || reported.pathname !== "/" || reported.origin !== current.origin) {
      return null;
    }
    return new URL("/", current).href;
  } catch {
    return null;
  }
}

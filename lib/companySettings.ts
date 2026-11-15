export type CompanySettings = { name: string; timeZone: string };

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "InsightBoard CRM",
  timeZone: "Asia/Bahrain",
};

export function parseCompanySettings(value: unknown): CompanySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 2 ||
      typeof input.name !== "string" || typeof input.timeZone !== "string") return null;

  const name = input.name.trim();
  const timeZone = input.timeZone.trim();
  if (!name || name.length > 120 || /\p{Cc}/u.test(name)) return null;
  if (timeZone.length > 100 ||
      !/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/.test(timeZone)) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    return null;
  }
  return { name, timeZone };
}

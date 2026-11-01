type ServerErrorEvent =
  | "LOGIN_API_ERROR"
  | "ME_ERROR"
  | "GET_CLIENTS_FINANCE_SUMMARY_ERROR"
  | "GET_MONTHLY_FINANCE_ERROR"
  | "GET_PROJECT_TYPE_FINANCE_SUMMARY_ERROR"
  | "GET_PROJECT_FINANCE_SUMMARY_ERROR"
  | "GET_PROJECTS_FINANCE_SUMMARY_ERROR"
  | "GET_FINANCE_SUMMARY_ERROR"
  | "DATABASE_DIAGNOSTIC_ERROR";

export function logServerError(event: ServerErrorEvent) {
  // Log a known operation name, never raw errors, tokens, credentials or records.
  console.error("[server-error]", { event });
}

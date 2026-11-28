import { randomUUID } from "node:crypto";

type ServerErrorEvent =
  | "SECURITY_AUDIT_ERROR"
  | "USER_MANAGEMENT_ERROR"
  | "LOGIN_API_ERROR"
  | "ME_ERROR"
  | "GET_CLIENTS_FINANCE_SUMMARY_ERROR"
  | "GET_MONTHLY_FINANCE_ERROR"
  | "GET_PROJECT_TYPE_FINANCE_SUMMARY_ERROR"
  | "GET_PROJECT_FINANCE_SUMMARY_ERROR"
  | "GET_PROJECTS_FINANCE_SUMMARY_ERROR"
  | "GET_FINANCE_SUMMARY_ERROR"
  | "DATABASE_DIAGNOSTIC_ERROR"
  | "COMPANY_SETTINGS_ERROR"
  | "DASHBOARD_OVERVIEW_ERROR"
  | `CRM_${"CLIENTS" | "DEALS" | "PROJECTS" | "REVENUE" | "EXPENSES"}_${"GET" | "POST" | "PUT" | "DELETE"}_ERROR`;


type ErrorCategory = "database_unavailable" | "database_validation" | "database_conflict" | "timeout" | "programming_error" | "unexpected";

function errorCategory(error: unknown): ErrorCategory {
  // Only emit a fixed category. Messages, stack traces and arbitrary properties can contain secrets.
  try {
    if (!error || typeof error !== "object") return "unexpected";
    const { name, code } = error as { name?: unknown; code?: unknown };
    if (code === 11000) return "database_conflict";
    if (name === "MongoServerSelectionError" || name === "MongooseServerSelectionError" || name === "MongoNetworkError") return "database_unavailable";
    if (name === "ValidationError" || name === "CastError") return "database_validation";
    if (name === "TimeoutError" || name === "MongoNetworkTimeoutError") return "timeout";
    if (name === "TypeError" || name === "ReferenceError") return "programming_error";
  } catch {
    // An unexpected thrown value must not prevent the generic error response.
  }
  return "unexpected";
}

export function logServerError(event: ServerErrorEvent, error?: unknown): string {
  const requestId = randomUUID();
  console.error("[server-error]", { event, category: errorCategory(error), requestId });
  return requestId;
}

import { errorResponse } from "@/lib/apiResponse";

export const DEMO_MODE_MESSAGE =
  "This demo is view-only. Changes are disabled for security.";

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function blockIfDemoMode() {
  if (!isDemoMode()) {
    return null;
  }

  return errorResponse(DEMO_MODE_MESSAGE, 403);
}
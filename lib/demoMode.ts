import { errorResponse } from "@/lib/apiResponse";
import { getDemoMode } from "@/lib/serverEnv";

export const DEMO_MODE_MESSAGE =
  "This demo is view-only. Changes are disabled for security.";

export function isDemoMode() {
  return getDemoMode();
}

export function blockIfDemoMode() {
  if (!isDemoMode()) {
    return null;
  }

  return errorResponse(DEMO_MODE_MESSAGE, 403);
}
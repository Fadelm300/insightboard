import { readBoundedJsonObject } from "@/lib/boundedJson";
import { NextRequest } from "next/server";

import { renewSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { isTrustedMutation } from "@/lib/sessionPolicy";

export async function POST(req: NextRequest) {
  if (!isTrustedMutation(req)) return errorResponse("Forbidden", 403);

  try {
    const parsed = await readBoundedJsonObject(req, 1024);
    if (!parsed.ok) {
      return errorResponse(
        parsed.status === 413 ? "Request body is too large" :
          parsed.status === 415 ? "Expected application/json" : "Invalid renewal request",
        parsed.status,
      );
    }
    const body = parsed.value;
    if (body?.mode !== "continue" && body?.mode !== "activity") {
      return errorResponse("Invalid renewal request", 400);
    }

    const result = await renewSession(req, body.mode === "continue");
    if (!result) return errorResponse("Session expired. Please sign in again.", 401);
    return successResponse(result);
  } catch {
    return errorResponse("Unable to renew your session", 503);
  }
}

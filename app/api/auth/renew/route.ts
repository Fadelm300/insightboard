import { readBoundedJsonObject } from "@/lib/boundedJson";
import { NextRequest } from "next/server";

import { renewSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { isTrustedMutation } from "@/lib/sessionPolicy";
import { recordSecurityEvent } from "@/lib/securityAudit";

export async function POST(req: NextRequest) {
  if (!isTrustedMutation(req)) {
    await recordSecurityEvent(req, { kind: "request.rejected", reason: "untrusted_origin", status: 403 });
    return errorResponse("Forbidden", 403);
  }

  try {
    const parsed = await readBoundedJsonObject(req, 1024);
    if (!parsed.ok) {
      await recordSecurityEvent(req, { kind: "request.rejected", status: parsed.status,
        reason: parsed.status === 413 ? "body_too_large" : parsed.status === 415 ? "unsupported_media_type" : "invalid_request" });
      return errorResponse(
        parsed.status === 413 ? "Request body is too large" :
          parsed.status === 415 ? "Expected application/json" : "Invalid renewal request",
        parsed.status,
      );
    }
    const body = parsed.value;
    if (body?.mode !== "continue" && body?.mode !== "activity") {
      await recordSecurityEvent(req, { kind: "request.rejected", reason: "invalid_request", status: 400 });
      return errorResponse("Invalid renewal request", 400);
    }

    const result = await renewSession(req, body.mode === "continue");
    if (!result) return errorResponse("Session expired. Please sign in again.", 401);
    return successResponse(result);
  } catch {
    return errorResponse("Unable to renew your session", 503);
  }
}

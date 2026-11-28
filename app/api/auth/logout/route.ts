import { NextRequest } from "next/server";

import { revokeSession } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { isTrustedMutation } from "@/lib/sessionPolicy";
import { recordSecurityEvent } from "@/lib/securityAudit";

export async function POST(req: NextRequest) {
  if (!isTrustedMutation(req)) {
    await recordSecurityEvent(req, { kind: "request.rejected", reason: "untrusted_origin", status: 403 });
    return errorResponse("Forbidden", 403);
  }

  try {
    const response = successResponse({}, "Logout successful");
    await revokeSession(req, response);
    return response;
  } catch {
    return errorResponse("Unable to sign out. Please try again.", 503);
  }
}

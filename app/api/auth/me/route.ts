import { NextRequest } from "next/server";

import { getRequestSession, sessionDetails } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { logServerError } from "@/lib/serverLogger";

export async function GET(req: NextRequest) {
  try {
    const current = await getRequestSession(req);
    if (!current) return errorResponse("Session expired. Please sign in again.", 401);
    return successResponse({ user: current.user, session: sessionDetails(current.session) });
  } catch {
    logServerError("ME_ERROR");
    return errorResponse("Unable to check your session", 503);
  }
}

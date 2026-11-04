import { NextRequest } from "next/server";

import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";

/** Gates the application's print/export commands, not browser screenshots or copying readable data. */
export async function POST(req: NextRequest) {
  const action = new URL(req.url).searchParams.get("action");

  if (action !== "print" && action !== "export")
    return errorResponse("Invalid report action", 400);

  const authorization = await authorizeRequest(
    req,
    action === "print" ? "reports.print" : "reports.export"
  );

  if (authorization.response) return authorization.response;

  return successResponse({ allowed: true });
}
import { errorResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import type { NextRequest } from "next/server";
import { recordSecurityEvent } from "@/lib/securityAudit";

export async function POST(req: NextRequest) {
  // No body is read: public registration is closed, including in the read-only demo.
  await recordSecurityEvent(req, { kind: "registration.blocked", reason: "registration_closed", status: 403 });
  // Provisioning will be limited to authorized owners in the users phase.
  const demoBlock = blockIfDemoMode();
  if (demoBlock) return demoBlock;
  return errorResponse("Public registration is closed. Contact the administrator.", 403);
}

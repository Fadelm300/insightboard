import { errorResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";

export async function POST() {
  // Provisioning will be limited to authorized owners in the users phase.
  const demoBlock = blockIfDemoMode();
  if (demoBlock) return demoBlock;
  return errorResponse("Public registration is closed. Contact the administrator.", 403);
}

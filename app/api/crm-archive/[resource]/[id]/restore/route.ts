import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { isCrmArchiveResource, restoreCrmRecord } from "@/lib/crmArchive";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";

type RouteContext = { params: Promise<{ resource: string; id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeRequest(req, "crmArchive.restore");
    if (auth.response) return auth.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;

    const { resource, id } = await context.params;
    if (!isCrmArchiveResource(resource)) return errorResponse("Not found", 404);
    if (!/^[a-f0-9]{24}$/i.test(id)) return errorResponse("Invalid record ID", 400);

    await connectDB();
    const result = await restoreCrmRecord(resource, id, auth.user!.id);
    if (result === "missing") return errorResponse("Archived record not found", 404);
    if (result === "parent-unavailable") return errorResponse("Linked client or Closed Won deal is unavailable", 409);
    return successResponse({}, "Record restored successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

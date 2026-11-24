import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { blockIfDemoMode } from "@/lib/demoMode";
import { changeFinancialArchive } from "@/lib/financialArchive";
import connectDB from "@/lib/mongodb";

type RouteContext = { params: Promise<{ resource: string; id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeRequest(req, "financialArchive.restore");
    if (auth.response) return auth.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    const { resource, id } = await context.params;
    if (resource !== "revenue" && resource !== "expenses") return errorResponse("Not found", 404);
    if (!/^[a-f0-9]{24}$/i.test(id)) return errorResponse("Invalid record ID", 400);

    await connectDB();
    const result = await changeFinancialArchive(resource, id, auth.user!.id, "restore");
    if (result === "missing") return errorResponse("Archived record not found", 404);
    if (result === "parent-unavailable") return errorResponse("Linked project or client is unavailable", 409);
    return successResponse({}, "Record restored successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

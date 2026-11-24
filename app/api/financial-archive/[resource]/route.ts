import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { listFinancialArchive } from "@/lib/financialArchive";
import connectDB from "@/lib/mongodb";

export async function GET(req: NextRequest, context: { params: Promise<{ resource: string }> }) {
  try {
    const auth = await authorizeRequest(req, "financialArchive.read");
    if (auth.response) return auth.response;
    const { resource } = await context.params;
    if (resource !== "revenue" && resource !== "expenses") return errorResponse("Not found", 404);

    const page = Number(new URL(req.url).searchParams.get("page") ?? "1");
    if (!Number.isInteger(page) || page < 1 || page > 400) {
      return errorResponse("Invalid page", 400);
    }
    await connectDB();
    const records = await listFinancialArchive(resource, page);
    return successResponse({ records: records.slice(0, 25), page, hasMore: records.length > 25 });
  } catch {
    return errorResponse("Server error", 500);
  }
}

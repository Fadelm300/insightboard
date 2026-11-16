import { logServerError } from "@/lib/serverLogger";
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { readFinanceSummary } from "@/lib/dashboardFinance";

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "finance.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    return successResponse(await readFinanceSummary(), "Finance summary fetched successfully");
  } catch {
    logServerError("GET_FINANCE_SUMMARY_ERROR");
    return errorResponse("Server error", 500);
  }
}

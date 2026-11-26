import { logServerError } from "@/lib/serverLogger";
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { readMonthlyFinance } from "@/lib/dashboardFinance";

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "finance.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    return successResponse({ monthly: await readMonthlyFinance() }, "Monthly finance data fetched successfully");
  } catch (error) {
    return errorResponse("Server error", 500, logServerError("GET_MONTHLY_FINANCE_ERROR", error));
  }
}

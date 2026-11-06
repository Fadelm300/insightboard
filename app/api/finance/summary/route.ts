import { logServerError } from "@/lib/serverLogger";
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "finance.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const revenueSummary = await Revenue.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          revenueCount: { $sum: 1 },
        },
      },
    ]);

    const expenseSummary = await Expense.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueSummary[0]?.totalRevenue || 0;
    const revenueCount = revenueSummary[0]?.revenueCount || 0;

    const totalExpenses = expenseSummary[0]?.totalExpenses || 0;
    const expenseCount = expenseSummary[0]?.expenseCount || 0;

    const netProfit = totalRevenue - totalExpenses;

    return successResponse(
      {
        totalRevenue,
        totalExpenses,
        netProfit,
        revenueCount,
        expenseCount,
      },
      "Finance summary fetched successfully"
    );
  } catch {
    logServerError("GET_FINANCE_SUMMARY_ERROR");
    return errorResponse("Server error", 500);
  }
}

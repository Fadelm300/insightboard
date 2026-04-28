import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const revenueSummary = await Revenue.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          revenueCount: { $sum: 1 },
        },
      },
    ]);

    const expenseSummary = await Expense.aggregate([
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
  } catch (error) {
    console.error("GET_FINANCE_SUMMARY_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
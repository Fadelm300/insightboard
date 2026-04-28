import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

type MonthlyFinanceItem = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  revenueCount: number;
  expenseCount: number;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const revenueMonthly = await Revenue.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$paymentDate",
            },
          },
          revenue: { $sum: "$amount" },
          revenueCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const expenseMonthly = await Expense.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$date",
            },
          },
          expenses: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const monthlyMap = new Map<string, MonthlyFinanceItem>();

    for (const item of revenueMonthly) {
      monthlyMap.set(item._id, {
        month: item._id,
        revenue: item.revenue,
        expenses: 0,
        profit: item.revenue,
        revenueCount: item.revenueCount,
        expenseCount: 0,
      });
    }

    for (const item of expenseMonthly) {
      const existing = monthlyMap.get(item._id);

      if (existing) {
        existing.expenses = item.expenses;
        existing.expenseCount = item.expenseCount;
        existing.profit = existing.revenue - item.expenses;
      } else {
        monthlyMap.set(item._id, {
          month: item._id,
          revenue: 0,
          expenses: item.expenses,
          profit: 0 - item.expenses,
          revenueCount: 0,
          expenseCount: item.expenseCount,
        });
      }
    }

    const monthly = Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    return successResponse(
      { monthly },
      "Monthly finance data fetched successfully"
    );
  } catch (error) {
    console.error("GET_MONTHLY_FINANCE_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
import { paymentProgressPercent } from "@/lib/paymentProgress";
import { logServerError } from "@/lib/serverLogger";
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "finance.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const { id } = await context.params;

    const project = await Project.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const revenueSummary = await Revenue.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          projectId: project._id,
        },
      },
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
        $match: {
          isDeleted: { $ne: true },
          projectId: project._id,
        },
      },
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
    const remainingBalance = project.price === null ? null : project.price - totalRevenue;

    const paymentProgress = paymentProgressPercent(totalRevenue, project.price);

    return successResponse(
      {
        project: {
          _id: project._id,
          name: project.name,
          type: project.type,
          price: project.price,
          status: project.status,
          paymentStatus: project.paymentStatus,
        },
        totalRevenue,
        totalExpenses,
        netProfit,
        remainingBalance,
        paymentProgress,
        revenueCount,
        expenseCount,
      },
      "Project finance summary fetched successfully"
    );
  } catch {
    logServerError("GET_PROJECT_FINANCE_SUMMARY_ERROR");
    return errorResponse("Server error", 500);
  }
}

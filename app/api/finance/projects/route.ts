import { paymentProgressPercent, projectPaymentBalance } from "@/lib/paymentProgress";
import { logServerError } from "@/lib/serverLogger";
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "finance.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const projects = await Project.find({
      isDeleted: { $ne: true },
    })
      .select("name type price agreedExtras cost profit status paymentStatus")
      .sort({ createdAt: -1 })
      .lean();

    const projectIds = projects.map((project) => project._id);

    const revenueSummary = await Revenue.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: "$projectId",
          totalRevenue: { $sum: "$amount" },
          revenueCount: { $sum: 1 },
        },
      },
    ]);

    const expenseSummary = await Expense.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          projectId: { $in: projectIds },
        },
      },
      {
        $group: {
          _id: "$projectId",
          totalExpenses: { $sum: "$amount" },
          expenseCount: { $sum: 1 },
        },
      },
    ]);

    const revenueMap = new Map(
      revenueSummary.map((item) => [
        item._id.toString(),
        {
          totalRevenue: item.totalRevenue,
          revenueCount: item.revenueCount,
        },
      ])
    );

    const expenseMap = new Map(
      expenseSummary.map((item) => [
        item._id.toString(),
        {
          totalExpenses: item.totalExpenses,
          expenseCount: item.expenseCount,
        },
      ])
    );

    const projectFinance = projects.map((project) => {
      const projectId = project._id.toString();

      const revenueData = revenueMap.get(projectId);
      const expenseData = expenseMap.get(projectId);

      const totalRevenue = revenueData?.totalRevenue || 0;
      const revenueCount = revenueData?.revenueCount || 0;

      const totalExpenses = expenseData?.totalExpenses || 0;
      const expenseCount = expenseData?.expenseCount || 0;

      const netProfit = totalRevenue - totalExpenses;
      const balance = projectPaymentBalance(totalRevenue, project.price);

      const paymentProgress = paymentProgressPercent(totalRevenue, project.price);

      return {
        project: {
          _id: project._id,
          name: project.name,
          type: project.type,
          price: project.price,
          agreedExtras: project.agreedExtras ?? 0,
          cost: project.cost,
          profit: project.profit,
          status: project.status,
          paymentStatus: project.paymentStatus,
        },
        totalRevenue,
        totalExpenses,
        netProfit,
        ...balance,
        paymentProgress,
        revenueCount,
        expenseCount,
      };
    });

    return successResponse(
      { projects: projectFinance },
      "Projects finance summary fetched successfully"
    );
  } catch {
    logServerError("GET_PROJECTS_FINANCE_SUMMARY_ERROR");
    return errorResponse("Server error", 500);
  }
}

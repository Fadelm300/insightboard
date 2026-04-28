import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const projects = await Project.find({
      isDeleted: { $ne: true },
    })
      .select("name type price cost profit status paymentStatus")
      .sort({ createdAt: -1 })
      .lean();

    const projectIds = projects.map((project) => project._id);

    const revenueSummary = await Revenue.aggregate([
      {
        $match: {
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
      const remainingBalance = Math.max(project.price - totalRevenue, 0);

      const paymentProgress =
        project.price > 0
          ? Math.min(Math.round((totalRevenue / project.price) * 100), 100)
          : 0;

      return {
        project: {
          _id: project._id,
          name: project.name,
          type: project.type,
          price: project.price,
          cost: project.cost,
          profit: project.profit,
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
      };
    });

    return successResponse(
      { projects: projectFinance },
      "Projects finance summary fetched successfully"
    );
  } catch (error) {
    console.error("GET_PROJECTS_FINANCE_SUMMARY_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
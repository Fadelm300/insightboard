import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";
import "@/models/Client";

type ClientFinanceItem = {
  client: {
    _id: unknown;
    companyName: string;
    contactPerson: string;
    email: string;
  };
  totalProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
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

    const projects = await Project.find({
      isDeleted: { $ne: true },
    })
      .select("clientId name price")
      .populate("clientId", "companyName contactPerson email")
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

    const clientMap = new Map<string, ClientFinanceItem>();

    for (const project of projects) {
      if (!project.clientId) continue;

      const projectId = project._id.toString();
      const client = project.clientId as {
        _id: unknown;
        companyName: string;
        contactPerson: string;
        email: string;
      };

      const clientId = String(client._id);

      const revenueData = revenueMap.get(projectId);
      const expenseData = expenseMap.get(projectId);

      const totalRevenue = revenueData?.totalRevenue || 0;
      const totalExpenses = expenseData?.totalExpenses || 0;
      const revenueCount = revenueData?.revenueCount || 0;
      const expenseCount = expenseData?.expenseCount || 0;

      const existing = clientMap.get(clientId);

      if (existing) {
        existing.totalProjects += 1;
        existing.totalRevenue += totalRevenue;
        existing.totalExpenses += totalExpenses;
        existing.netProfit = existing.totalRevenue - existing.totalExpenses;
        existing.revenueCount += revenueCount;
        existing.expenseCount += expenseCount;
      } else {
        clientMap.set(clientId, {
          client: {
            _id: client._id,
            companyName: client.companyName,
            contactPerson: client.contactPerson,
            email: client.email,
          },
          totalProjects: 1,
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          revenueCount,
          expenseCount,
        });
      }
    }

    const clients = Array.from(clientMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    return successResponse(
      { clients },
      "Clients finance summary fetched successfully"
    );
  } catch (error) {
    console.error("GET_CLIENTS_FINANCE_SUMMARY_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
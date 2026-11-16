import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { readFinanceSummary, readMonthlyFinance } from "@/lib/dashboardFinance";
import type { DashboardOverview } from "@/lib/dashboardOverviewTypes";
import connectDB from "@/lib/mongodb";
import { logServerError } from "@/lib/serverLogger";
import Client from "@/models/Client";
import Deal from "@/models/Deal";
import Project from "@/models/Project";

const activeRecords = { isDeleted: { $ne: true } };
type StatusCount = { _id: string | null; count: number };
type RecentDealRow = Omit<DashboardOverview["recentDeals"][number], "_id"> & { _id: unknown };

export async function GET(req: NextRequest) {
  try {
    const access = await authorizeRequest(req, "dashboard.read");
    if (access.response) return access.response;

    await connectDB();
    const [clientCount, dealCounts, projectCounts, recent, summary, monthly] = await Promise.all([
      Client.countDocuments(activeRecords),
      Deal.aggregate<StatusCount>([
        { $match: activeRecords },
        { $group: { _id: { $ifNull: ["$status", "Lead"] }, count: { $sum: 1 } } },
      ]),
      Project.aggregate<StatusCount & { pending: number }>([
        { $match: activeRecords },
        { $group: {
          _id: { $ifNull: ["$status", "Unknown"] },
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 0, 1] } },
        } },
      ]),
      Deal.find(activeRecords)
        .select("title status estimatedBudget finalPrice probability clientId")
        .populate("clientId", "companyName")
        .sort({ expectedCloseDate: 1, createdAt: -1, _id: 1 })
        .limit(5)
        .lean<RecentDealRow[]>(),
      readFinanceSummary(),
      readMonthlyFinance(),
    ]);

    const overview: DashboardOverview = {
      clientCount,
      activeDealsCount: dealCounts.reduce((total, { _id, count }) =>
        _id === "Closed Won" || _id === "Closed Lost" ? total : total + count, 0),
      pendingPaymentsCount: projectCounts.reduce((total, { pending }) => total + pending, 0),
      dealStatusCounts: Object.fromEntries(dealCounts.map(({ _id, count }) => [_id ?? "Lead", count])),
      projectStatusCounts: Object.fromEntries(projectCounts.map(({ _id, count }) => [_id ?? "Unknown", count])),
      recentDeals: recent.map(({ _id, title, status, estimatedBudget, finalPrice, probability, clientId }) => ({
        _id: String(_id), title, status, estimatedBudget, finalPrice, probability,
        clientId: clientId ? { companyName: clientId.companyName } : null,
      })),
      summary,
      monthly,
    };

    return successResponse(overview);
  } catch {
    logServerError("DASHBOARD_OVERVIEW_ERROR");
    return errorResponse("Failed to load dashboard data", 500);
  }
}

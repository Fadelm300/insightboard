import type { MonthlyFinanceItem, readFinanceSummary } from "./dashboardFinance";

export type DashboardOverview = {
  clientCount: number;
  activeDealsCount: number;
  pendingPaymentsCount: number;
  dealStatusCounts: Record<string, number | undefined>;
  projectStatusCounts: Record<string, number | undefined>;
  recentDeals: {
    _id: string;
    title: string;
    status: string;
    estimatedBudget?: number;
    finalPrice?: number;
    probability?: number;
    clientId: { companyName: string } | null;
  }[];
  summary: Awaited<ReturnType<typeof readFinanceSummary>>;
  monthly: MonthlyFinanceItem[];
};

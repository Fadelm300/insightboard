import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

export async function readFinanceSummary() {
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

  return { totalRevenue, totalExpenses, netProfit, revenueCount, expenseCount };
}

export type MonthlyFinanceItem = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  revenueCount: number;
  expenseCount: number;
};

export async function readMonthlyFinance() {
  const revenueMonthly = await Revenue.aggregate([
    { $match: { isDeleted: { $ne: true } } },
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
    { $match: { isDeleted: { $ne: true } } },
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

  return monthly;
}

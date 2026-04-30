export type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
};

export type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount: number;
  expenseCount: number;
};

export type MonthlyFinance = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  revenueCount?: number;
  expenseCount?: number;
};

export type ProjectFinance = {
  project?: {
    _id: string;
    name: string;
    type?: string;
    price?: number;
    status?: string;
    paymentStatus?: string;
  };
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  remainingBalance: number;
  paymentProgress: number;
  revenueCount?: number;
  expenseCount?: number;
};

export type ClientFinance = {
  client?: {
    _id: string;
    companyName: string;
    contactPerson?: string;
    email?: string;
  };
  totalProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount?: number;
  expenseCount?: number;
};

export type ProjectTypeFinance = {
  type: string;
  projectCount: number;
  totalProjectValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount?: number;
  expenseCount?: number;
};

export type Deal = {
  _id: string;
  title: string;
  status: string;
  finalPrice?: number;
  estimatedBudget?: number;
};

export type ClientRecord = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
};

export type ProjectRecord = {
  _id: string;
  name: string;
  type?: string;
  price?: number;
  cost?: number;
  profit?: number;
  status?: string;
  paymentStatus?: string;
  clientId?: ClientRecord | string;
};

export type RevenueRecord = {
  _id: string;
  projectId?: ProjectRecord | string;
  clientId?: ClientRecord | string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  description?: string;
  notes?: string;
};

export type ExpenseRecord = {
  _id: string;
  projectId?: ProjectRecord | string;
  title: string;
  amount: number;
  category?: string;
  date?: string;
  description?: string;
  notes?: string;
};

export type FilteredProjectFinance = {
  project: ProjectRecord;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  remainingBalance: number;
  paymentProgress: number;
  revenueCount: number;
  expenseCount: number;
};

export type FilteredClientFinance = {
  client?: ClientRecord;
  totalProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount: number;
  expenseCount: number;
};

export type FilteredProjectTypeFinance = {
  type: string;
  projectCount: number;
  totalProjectValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount: number;
  expenseCount: number;
};
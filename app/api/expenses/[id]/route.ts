import { changeFinancialArchive } from "@/lib/financialArchive";
import { expenseDTO, parseCrmMoney } from "@/lib/crmData";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import Expense from "@/models/Expense";
import "@/models/Project";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExpenseCategory =
  | "Domain"
  | "Hosting"
  | "Design Assets"
  | "Tools"
  | "Ads"
  | "Freelance Help"
  | "Other";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Domain",
  "Hosting",
  "Design Assets",
  "Tools",
  "Ads",
  "Freelance Help",
  "Other",
];

const UNSAFE_TEXT_PATTERN =
  /<\s*script|<\/\s*script|javascript:|data:|on\w+\s*=|[<>{}\[\]`$|\\]/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanText(value: unknown) {
  return getString(value).replace(/\s+/g, " ");
}

function hasUnsafeText(value: string) {
  return UNSAFE_TEXT_PATTERN.test(value);
}

function isValidDate(value: string) {
  if (!value) return true;

  const parsedDate = new Date(value);

  return !Number.isNaN(parsedDate.getTime());
}

function isFutureDate(value: string) {
  if (!isValidDate(value)) return true;

  const inputDate = new Date(value);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "expenses.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const expense = await Expense.findOne({ _id: id, isDeleted: { $ne: true } }).populate(
      "projectId",
      "name type price cost profit status paymentStatus"
    );

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense: expenseDTO(expense, authorization.user!) }, "Expense record fetched successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "expenses.update");
    if (authorization.response) return authorization.response;
const demoBlock = blockIfDemoMode();
if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const body = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const title = cleanText(body.title);
    const amountValue = body.amount;
    const category = getString(body.category) as ExpenseCategory;
    const date = getString(body.date);
    const description = cleanText(body.description);
    const notes = cleanText(body.notes);

    if (!title) {
      return errorResponse("Title is required", 400);
    }

    if (title.length > 120) {
      return errorResponse("Title cannot exceed 120 characters", 400);
    }

    if (hasUnsafeText(title)) {
      return errorResponse("Title contains invalid characters", 400);
    }

    const amount = parseCrmMoney(amountValue);
    if (amount === null) {
      return errorResponse(
        "Amount must have up to 2 decimals and be within the supported range",
        400
      );
    }

    if (amount <= 0) {
      return errorResponse("Amount must be greater than 0", 400);
    }

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return errorResponse("Invalid expense category", 400);
    }

    if (date && !isValidDate(date)) {
      return errorResponse("Invalid expense date", 400);
    }

    if (date && isFutureDate(date)) {
      return errorResponse("Expense date cannot be in the future", 400);
    }

    if (description.length > 1000) {
      return errorResponse("Description cannot exceed 1000 characters", 400);
    }

    if (description && hasUnsafeText(description)) {
      return errorResponse("Description contains invalid characters", 400);
    }

    if (notes.length > 1000) {
      return errorResponse("Notes cannot exceed 1000 characters", 400);
    }

    if (notes && hasUnsafeText(notes)) {
      return errorResponse("Notes contain invalid characters", 400);
    }

    const updateData = {
      title,
      amount,
      category,
      date: date || new Date(),
      description,
      notes,
    };

    const expense = await Expense.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, updateData, {
      returnDocument: "after",
      runValidators: true,
    }).populate("projectId", "name type price cost profit status paymentStatus");

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense: expenseDTO(expense, authorization.user!) }, "Expense record updated successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "expenses.delete");
    if (authorization.response) return authorization.response;
const demoBlock = blockIfDemoMode();
if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const result = await changeFinancialArchive("expenses", id, authorization.user!.id, "archive");

    if (result !== "changed") {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({}, "Expense record deleted successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

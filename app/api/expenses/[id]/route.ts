import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
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

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

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

function isValidMoney(value: unknown) {
  return MONEY_PATTERN.test(getString(value));
}

function parseMoney(value: unknown) {
  return Number(getString(value));
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
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const expense = await Expense.findById(id).populate(
      "projectId",
      "name type price cost profit status paymentStatus"
    );

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense }, "Expense record fetched successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

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

    if (!isValidMoney(amountValue)) {
      return errorResponse(
        "Amount must be a valid number with up to 2 decimals",
        400
      );
    }

    const amount = parseMoney(amountValue);

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

    const expense = await Expense.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    }).populate("projectId", "name type price cost profit status paymentStatus");

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense }, "Expense record updated successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid expense ID", 400);
    }

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({}, "Expense record deleted successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}
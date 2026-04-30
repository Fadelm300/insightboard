import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Expense from "@/models/Expense";
import Project from "@/models/Project";

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

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const expenses = await Expense.find()
      .populate("projectId", "name type price cost profit status paymentStatus")
      .sort({ date: -1 });

    return successResponse(
      { expenses },
      "Expense records fetched successfully"
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const body = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const projectId = getString(body.projectId);
    const title = cleanText(body.title);
    const amountValue = body.amount;
    const category = getString(body.category) as ExpenseCategory;
    const date = getString(body.date);
    const description = cleanText(body.description);
    const notes = cleanText(body.notes);

    if (!projectId) {
      return errorResponse("Project is required", 400);
    }

    if (!Types.ObjectId.isValid(projectId)) {
      return errorResponse("Invalid project ID", 400);
    }

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

    const project = await Project.findOne({
      _id: projectId,
      isDeleted: { $ne: true },
    });

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const expense = await Expense.create({
      projectId: project._id,
      title,
      amount,
      category,
      date: date || new Date(),
      description,
      notes,
    });

    return successResponse(
      { expense },
      "Expense record created successfully",
      201
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}
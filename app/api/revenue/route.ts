import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Revenue from "@/models/Revenue";
import Project from "@/models/Project";
import "@/models/Client";

type PaymentMethod =
  | "Cash"
  | "BenefitPay"
  | "Bank Transfer"
  | "Card"
  | "Other";

type RevenuePayload = {
  projectId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "BenefitPay",
  "Bank Transfer",
  "Card",
  "Other",
];

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const UNSAFE_TEXT_PATTERN =
  /<\s*script|<\/\s*script|javascript:|data:|on\w+\s*=|[{}[\]`$|\\]/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim();
}

function cleanText(value: unknown) {
  return getString(value).replace(/\s+/g, " ");
}

function hasUnsafeText(value: string) {
  return UNSAFE_TEXT_PATTERN.test(value);
}

function isValidMoney(value: unknown) {
  const stringValue = getString(value);
  return MONEY_PATTERN.test(stringValue);
}

function parseMoney(value: unknown) {
  return Number(getString(value));
}

function isValidDate(value: string) {
  if (!value) return true;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isFutureDate(value: string) {
  const inputDate = new Date(value);

  if (Number.isNaN(inputDate.getTime())) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

function validateRevenuePayload(
  body: unknown
): { data: RevenuePayload } | { error: string } {
  if (!isPlainObject(body)) {
    return { error: "Invalid request body" };
  }

  const projectId = getString(body.projectId);
  const paymentMethod = getString(body.paymentMethod) as PaymentMethod;
  const paymentDate = getString(body.paymentDate);
  const description = cleanText(body.description);
  const notes = cleanText(body.notes);

  if (!projectId) {
    return { error: "Project is required" };
  }

  if (!Types.ObjectId.isValid(projectId)) {
    return { error: "Invalid project ID" };
  }

  if (body.amount === undefined || body.amount === null || body.amount === "") {
    return { error: "Amount is required" };
  }

  if (!isValidMoney(body.amount)) {
    return { error: "Amount must be a valid number with up to 2 decimals" };
  }

  const amount = parseMoney(body.amount);

  if (amount <= 0) {
    return { error: "Amount must be greater than 0" };
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "Invalid payment method" };
  }

  if (paymentDate && !isValidDate(paymentDate)) {
    return { error: "Invalid payment date" };
  }

  if (paymentDate && isFutureDate(paymentDate)) {
    return { error: "Payment date cannot be in the future" };
  }

  if (description.length > 1000) {
    return { error: "Description cannot exceed 1000 characters" };
  }

  if (description && hasUnsafeText(description)) {
    return { error: "Description contains invalid characters" };
  }

  if (notes.length > 1000) {
    return { error: "Notes cannot exceed 1000 characters" };
  }

  if (notes && hasUnsafeText(notes)) {
    return { error: "Notes contain invalid characters" };
  }

  return {
    data: {
      projectId,
      amount,
      paymentDate: paymentDate || undefined,
      paymentMethod,
      description,
      notes,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const revenues = await Revenue.find()
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email")
      .sort({ paymentDate: -1 });

    return successResponse(
      { revenues },
      "Revenue records fetched successfully"
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
    const validation = validateRevenuePayload(body);

    if ("error" in validation) {
      return errorResponse(validation.error, 400);
    }

    const payload = validation.data;

    const project = await Project.findOne({
      _id: payload.projectId,
      isDeleted: { $ne: true },
    });

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const revenue = await Revenue.create({
      projectId: project._id,
      clientId: project.clientId,
      amount: payload.amount,
      paymentDate: payload.paymentDate || new Date(),
      paymentMethod: payload.paymentMethod,
      description: payload.description,
      notes: payload.notes,
    });

    return successResponse(
      { revenue },
      "Revenue record created successfully",
      201
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}
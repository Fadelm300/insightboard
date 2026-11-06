import { revenueDTO, parseCrmMoney } from "@/lib/crmData";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import Revenue from "@/models/Revenue";
import "@/models/Project";
import "@/models/Client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PaymentMethod =
  | "Cash"
  | "BenefitPay"
  | "Bank Transfer"
  | "Card"
  | "Other";

const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "BenefitPay",
  "Bank Transfer",
  "Card",
  "Other",
];

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

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "revenue.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid revenue ID", 400);
    }

    const revenue = await Revenue.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email");

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({ revenue: revenueDTO(revenue, authorization.user!) }, "Revenue record fetched successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "revenue.update");
    if (authorization.response) return authorization.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid revenue ID", 400);
    }

    const body = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const updateData: Record<string, unknown> = {};

    if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
      const amount = parseCrmMoney(body.amount);
      if (amount === null) {
        return errorResponse(
          "Amount must have up to 2 decimals and be within the supported range",
          400
        );
      }

      if (amount <= 0) {
        return errorResponse("Amount must be greater than 0", 400);
      }

      updateData.amount = amount;
    }

    if (body.paymentDate !== undefined && body.paymentDate !== "") {
      const paymentDate = getString(body.paymentDate);

      if (!isValidDate(paymentDate)) {
        return errorResponse("Invalid payment date", 400);
      }

      if (isFutureDate(paymentDate)) {
        return errorResponse("Payment date cannot be in the future", 400);
      }

      updateData.paymentDate = paymentDate;
    }

    if (body.paymentMethod !== undefined) {
      const paymentMethod = getString(body.paymentMethod) as PaymentMethod;

      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return errorResponse("Invalid payment method", 400);
      }

      updateData.paymentMethod = paymentMethod;
    }

    if (body.description !== undefined) {
      const description = cleanText(body.description);

      if (description.length > 1000) {
        return errorResponse(
          "Description cannot exceed 1000 characters",
          400
        );
      }

      if (description && hasUnsafeText(description)) {
        return errorResponse("Description contains invalid characters", 400);
      }

      updateData.description = description;
    }

    if (body.notes !== undefined) {
      const notes = cleanText(body.notes);

      if (notes.length > 1000) {
        return errorResponse("Notes cannot exceed 1000 characters", 400);
      }

      if (notes && hasUnsafeText(notes)) {
        return errorResponse("Notes contain invalid characters", 400);
      }

      updateData.notes = notes;
    }

    const revenue = await Revenue.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email");

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({ revenue: revenueDTO(revenue, authorization.user!) }, "Revenue record updated successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "revenue.delete");
    if (authorization.response) return authorization.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid revenue ID", 400);
    }

    const revenue = await Revenue.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({}, "Revenue record deleted successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

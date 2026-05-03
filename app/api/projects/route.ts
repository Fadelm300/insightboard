import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Client from "@/models/Client";
import Deal from "@/models/Deal";

type ProjectType =
  | "Landing Page"
  | "Business Website"
  | "Portfolio Website"
  | "E-commerce Website"
  | "Redesign"
  | "Maintenance";

type ProjectStatus =
  | "Not Started"
  | "In Progress"
  | "Review"
  | "Completed"
  | "Cancelled";

type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

type ProjectPayload = {
  clientId: string;
  dealId?: string | null;
  name: string;
  type: ProjectType;
  price: number;
  cost: number;
  profit: number;
  deadline?: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  description?: string;
  notes?: string;
};

const PROJECT_TYPES: ProjectType[] = [
  "Landing Page",
  "Business Website",
  "Portfolio Website",
  "E-commerce Website",
  "Redesign",
  "Maintenance",
];

const PROJECT_STATUSES: ProjectStatus[] = [
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "Unpaid",
  "Partially Paid",
  "Paid",
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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: string) {
  if (!DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValidDate ? date : null;
}

function isPastDate(value: string) {
  const inputDate = parseDateInput(value);

  if (!inputDate) {
    return true;
  }

  const today = new Date();

  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return inputDate < today;
}
function validateProjectPayload(body: unknown):
  | { data: ProjectPayload }
  | { error: string } {
  if (!isPlainObject(body)) {
    return { error: "Invalid request body" };
  }

  const clientId = getString(body.clientId);
  const dealId = getString(body.dealId);
  const name = cleanText(body.name);
  const type = getString(body.type) as ProjectType;
  const status = getString(body.status || "Not Started") as ProjectStatus;
  const paymentStatus = getString(
    body.paymentStatus || "Unpaid"
  ) as PaymentStatus;
  const deadline = getString(body.deadline);
  const description = cleanText(body.description);
  const notes = cleanText(body.notes);

  if (!clientId) {
    return { error: "Client is required" };
  }

  if (!Types.ObjectId.isValid(clientId)) {
    return { error: "Invalid client ID" };
  }

  if (dealId && !Types.ObjectId.isValid(dealId)) {
    return { error: "Invalid deal ID" };
  }

  if (!name) {
    return { error: "Project name is required" };
  }

  if (name.length > 120) {
    return { error: "Project name cannot exceed 120 characters" };
  }

  if (hasUnsafeText(name)) {
    return { error: "Project name contains invalid characters" };
  }

  if (!PROJECT_TYPES.includes(type)) {
    return { error: "Invalid project type" };
  }

  if (!isValidMoney(body.price)) {
    return { error: "Price must be a valid number with up to 2 decimals" };
  }

  const price = parseMoney(body.price);

  if (price <= 0) {
    return { error: "Price must be greater than 0" };
  }

  const costValue =
    body.cost === undefined || body.cost === null || body.cost === ""
      ? 0
      : body.cost;

  if (!isValidMoney(costValue)) {
    return { error: "Cost must be a valid number with up to 2 decimals" };
  }

  const cost = parseMoney(costValue);

  if (cost < 0) {
    return { error: "Cost cannot be negative" };
  }

  if (deadline && isPastDate(deadline)) {
    return { error: "Deadline cannot be in the past" };
  }

  if (!PROJECT_STATUSES.includes(status)) {
    return { error: "Invalid project status" };
  }

  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return { error: "Invalid payment status" };
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
      clientId,
      dealId: dealId || null,
      name,
      type,
      price,
      cost,
      profit: price - cost,
      deadline: deadline || undefined,
      status,
      paymentStatus,
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

    const projects = await Project.find({ isDeleted: { $ne: true } })
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice estimatedBudget")
      .sort({ createdAt: -1 });

    return successResponse({ projects }, "Projects fetched successfully");
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
    const validation = validateProjectPayload(body);

    if ("error" in validation) {
      return errorResponse(validation.error, 400);
    }

    const payload = validation.data;

    const client = await Client.findOne({
      _id: payload.clientId,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    if (payload.dealId) {
      const deal = await Deal.findOne({
        _id: payload.dealId,
        isDeleted: { $ne: true },
      });

      if (!deal) {
        return errorResponse("Deal not found", 404);
      }

      if (deal.status !== "Closed Won") {
        return errorResponse(
          "Project can only be linked to a Closed Won deal",
          400
        );
      }

      if (String(deal.clientId) !== payload.clientId) {
        return errorResponse("Selected deal does not belong to this client", 400);
      }
    }

    const project = await Project.create(payload);

    return successResponse({ project }, "Project created successfully", 201);
  } catch {
    return errorResponse("Server error", 500);
  }
}
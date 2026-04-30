import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Client from "@/models/Client";
import Deal from "@/models/Deal";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const UNSAFE_TEXT_PATTERN =
  /<\s*script|<\/\s*script|javascript:|data:|on\w+\s*=|[{}[\]`$|\\]/i;

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
  const stringValue = getString(value);
  return MONEY_PATTERN.test(stringValue);
}

function parseMoney(value: unknown) {
  return Number(getString(value));
}

function isValidDateInput(value: string) {
  if (!DATE_PATTERN.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  return date.toISOString().slice(0, 10) === value;
}

function isPastDate(value: string) {
  if (!isValidDateInput(value)) return true;

  const inputDate = new Date(`${value}T00:00:00`);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate < today;
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
      return errorResponse("Invalid project ID", 400);
    }

    const project = await Project.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice estimatedBudget");

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({ project }, "Project fetched successfully");
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
      return errorResponse("Invalid project ID", 400);
    }

    const existingProject = await Project.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!existingProject) {
      return errorResponse("Project not found", 404);
    }

    const body = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse("Invalid request body", 400);
    }

    const clientId =
      body.clientId === undefined || body.clientId === null
        ? String(existingProject.clientId)
        : getString(body.clientId);

    const hasDealIdField = Object.prototype.hasOwnProperty.call(body, "dealId");
    const hasDeadlineField = Object.prototype.hasOwnProperty.call(
      body,
      "deadline"
    );

    const dealId = hasDealIdField
      ? getString(body.dealId)
      : existingProject.dealId
        ? String(existingProject.dealId)
        : "";

    const name =
      body.name === undefined || body.name === null
        ? cleanText(existingProject.name)
        : cleanText(body.name);

    const type =
      body.type === undefined || body.type === null
        ? (existingProject.type as ProjectType)
        : (getString(body.type) as ProjectType);

    const status =
      body.status === undefined || body.status === null
        ? (existingProject.status as ProjectStatus)
        : (getString(body.status) as ProjectStatus);

    const paymentStatus =
      body.paymentStatus === undefined || body.paymentStatus === null
        ? (existingProject.paymentStatus as PaymentStatus)
        : (getString(body.paymentStatus) as PaymentStatus);

    const description =
      body.description === undefined || body.description === null
        ? cleanText(existingProject.description || "")
        : cleanText(body.description);

    const notes =
      body.notes === undefined || body.notes === null
        ? cleanText(existingProject.notes || "")
        : cleanText(body.notes);

    const deadline = hasDeadlineField
      ? getString(body.deadline)
      : existingProject.deadline
        ? new Date(existingProject.deadline).toISOString().slice(0, 10)
        : "";

    if (!clientId) {
      return errorResponse("Client is required", 400);
    }

    if (!Types.ObjectId.isValid(clientId)) {
      return errorResponse("Invalid client ID", 400);
    }

    if (dealId && !Types.ObjectId.isValid(dealId)) {
      return errorResponse("Invalid deal ID", 400);
    }

    if (!name) {
      return errorResponse("Project name is required", 400);
    }

    if (name.length > 120) {
      return errorResponse("Project name cannot exceed 120 characters", 400);
    }

    if (hasUnsafeText(name)) {
      return errorResponse("Project name contains invalid characters", 400);
    }

    if (!PROJECT_TYPES.includes(type)) {
      return errorResponse("Invalid project type", 400);
    }

    const priceValue =
      body.price === undefined || body.price === null
        ? existingProject.price
        : body.price;

    if (!isValidMoney(priceValue)) {
      return errorResponse(
        "Price must be a valid number with up to 2 decimals",
        400
      );
    }

    const price = parseMoney(priceValue);

    if (price <= 0) {
      return errorResponse("Price must be greater than 0", 400);
    }

    const costValue =
      body.cost === undefined || body.cost === null || body.cost === ""
        ? existingProject.cost || 0
        : body.cost;

    if (!isValidMoney(costValue)) {
      return errorResponse(
        "Cost must be a valid number with up to 2 decimals",
        400
      );
    }

    const cost = parseMoney(costValue);

    if (cost < 0) {
      return errorResponse("Cost cannot be negative", 400);
    }

    if (deadline && isPastDate(deadline)) {
      return errorResponse("Deadline cannot be in the past", 400);
    }

    if (!PROJECT_STATUSES.includes(status)) {
      return errorResponse("Invalid project status", 400);
    }

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return errorResponse("Invalid payment status", 400);
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

    const client = await Client.findOne({
      _id: clientId,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    if (dealId) {
      const deal = await Deal.findOne({
        _id: dealId,
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

      if (String(deal.clientId) !== clientId) {
        return errorResponse("Selected deal does not belong to this client", 400);
      }
    }

    const setPayload = {
      clientId,
      name,
      type,
      price,
      cost,
      profit: price - cost,
      status,
      paymentStatus,
      description,
      notes,
      ...(deadline ? { deadline } : {}),
      ...(dealId ? { dealId } : {}),
    };

    const unsetPayload: Record<string, string> = {};

    if (hasDealIdField && !dealId) {
      unsetPayload.dealId = "";
    }

    if (hasDeadlineField && !deadline) {
      unsetPayload.deadline = "";
    }

    const updatePayload =
      Object.keys(unsetPayload).length > 0
        ? { $set: setPayload, $unset: unsetPayload }
        : { $set: setPayload };

    const project = await Project.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updatePayload,
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice estimatedBudget");

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({ project }, "Project updated successfully");
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
      return errorResponse("Invalid project ID", 400);
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
      },
      { isDeleted: true },
      { returnDocument: "after" }
    );

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({}, "Project deleted successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}
import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Deal from "@/models/Deal";
import Project from "@/models/Project";
import Client from "@/models/Client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DEADLINE_DAYS = 7;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseDateInput(value: string) {
  if (!DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? date : null;
}

function isPastDate(value: string) {
  const inputDate = parseDateInput(value);

  if (!inputDate) return true;

  const today = new Date();
  const todayDateOnly = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );

  return inputDate < todayDateOnly;
}

function getDefaultDeadlineDate() {
  const date = new Date();
  date.setDate(date.getDate() + DEFAULT_DEADLINE_DAYS);

  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid deal id", 400);
    }

    const body = await req.json().catch(() => null);

    const deadlineInput = isPlainObject(body) ? getString(body.deadline) : "";

    if (deadlineInput && !parseDateInput(deadlineInput)) {
      return errorResponse("Invalid deadline format. Use YYYY-MM-DD", 400);
    }

    if (deadlineInput && isPastDate(deadlineInput)) {
      return errorResponse("Deadline cannot be in the past", 400);
    }

    const deadline = deadlineInput
      ? parseDateInput(deadlineInput)
      : getDefaultDeadlineDate();

    if (!deadline) {
      return errorResponse("Invalid deadline", 400);
    }

    const deal = await Deal.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!deal) {
      return errorResponse("Deal not found", 404);
    }

    if (deal.status !== "Closed Won") {
      return errorResponse("Deal must be Closed Won to convert to project", 400);
    }

    const existingProject = await Project.findOne({
      dealId: deal._id,
      isDeleted: { $ne: true },
    });

    if (existingProject) {
      return errorResponse(
        "This deal has already been converted to a project",
        409
      );
    }

    const client = await Client.findOne({
      _id: deal.clientId,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const projectPrice = Number(deal.finalPrice || deal.estimatedBudget || 0);

    if (!Number.isFinite(projectPrice) || projectPrice <= 0) {
      return errorResponse("Deal price must be greater than 0", 400);
    }

    const project = await Project.create({
      clientId: deal.clientId,
      dealId: deal._id,
      name: `${deal.title} Project`,
      type: "Business Website",
      price: projectPrice,
      cost: 0,
      deadline,
      status: "Not Started",
      paymentStatus: "Unpaid",
      notes: "Project created from deal conversion",
      isDeleted: false,
    });

    return successResponse(
      { project },
      "Deal converted to project successfully",
      201
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}
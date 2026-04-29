import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Deal from "@/models/Deal";
import Client from "@/models/Client";

type DealStatus =
  | "Lead"
  | "Contacted"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

type DealPayload = {
  clientId: string;
  title: string;
  estimatedBudget: number;
  finalPrice: number;
  status: DealStatus;
  probability: number;
  expectedCloseDate?: Date;
  description: string;
  notes: string;
  isDeleted: boolean;
};

const DEAL_STATUSES: DealStatus[] = [
  "Lead",
  "Contacted",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

function cleanSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanMultiLineText(value: string) {
  return value.trim().replace(/[ \t]+/g, " ");
}

function hasUnsafeCharacters(value: string) {
  return /[<>{}\[\]`$|\\]/.test(value);
}

function hasUnsafePattern(value: string) {
  return /(javascript:|data:|on\w+\s*=|<\s*script)/i.test(value);
}

function validateSafeText(
  label: string,
  value: string,
  maxLength: number,
  required = false
) {
  const cleanValue = cleanSingleLineText(value);

  if (required && !cleanValue) {
    return `${label} is required`;
  }

  if (cleanValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or less`;
  }

  if (hasUnsafeCharacters(cleanValue) || hasUnsafePattern(cleanValue)) {
    return `${label} contains invalid characters`;
  }

  return "";
}

function validateLongText(label: string, value: string, maxLength: number) {
  const cleanValue = cleanMultiLineText(value);

  if (cleanValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or less`;
  }

  if (
    cleanValue &&
    (hasUnsafeCharacters(cleanValue) || hasUnsafePattern(cleanValue))
  ) {
    return `${label} contains invalid characters`;
  }

  return "";
}

function getStringField(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null) return "";

  if (typeof value !== "string") {
    throw new Error(`${field} must be text`);
  }

  return value;
}

function getNumberField(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null || value === "") return 0;

  if (typeof value !== "number" && typeof value !== "string") {
    throw new Error(`${field} must be a number`);
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${field} must be a valid number`);
  }

  return numberValue;
}

function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function validateExpectedCloseDate(value: string) {
  if (!value) return { date: undefined, error: "" };

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: undefined, error: "Expected close date is invalid" };
  }

  date.setHours(0, 0, 0, 0);

  if (date < getTodayDateOnly()) {
    return {
      date: undefined,
      error: "Expected close date cannot be in the past",
    };
  }

  return { date, error: "" };
}

function validateDealPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      values: null,
      error: "Invalid deal data",
    };
  }

  const data = body as Record<string, unknown>;

  try {
    const clientId = getStringField(data, "clientId");
    const title = cleanSingleLineText(getStringField(data, "title"));
    const estimatedBudget = getNumberField(data, "estimatedBudget");
    const finalPrice = getNumberField(data, "finalPrice");
    const status = (getStringField(data, "status") || "Lead") as DealStatus;
    const probability = getNumberField(data, "probability");
    const expectedCloseDateValue = getStringField(data, "expectedCloseDate");
    const description = cleanMultiLineText(getStringField(data, "description"));
    const notes = cleanMultiLineText(getStringField(data, "notes"));

    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      return { values: null, error: "Client is required" };
    }

    const titleError = validateSafeText("Deal title", title, 120, true);

    if (titleError) {
      return { values: null, error: titleError };
    }

    if (estimatedBudget <= 0) {
      return {
        values: null,
        error: "Estimated budget must be greater than 0",
      };
    }

    if (finalPrice < 0) {
      return {
        values: null,
        error: "Final price cannot be negative",
      };
    }

    if (!DEAL_STATUSES.includes(status)) {
      return { values: null, error: "Invalid deal status" };
    }

    if (probability < 0 || probability > 100) {
      return {
        values: null,
        error: "Probability must be between 0 and 100",
      };
    }

    const { date: expectedCloseDate, error: dateError } =
      validateExpectedCloseDate(expectedCloseDateValue);

    if (dateError) {
      return { values: null, error: dateError };
    }

    const descriptionError = validateLongText(
      "Description",
      description,
      1000
    );

    if (descriptionError) {
      return { values: null, error: descriptionError };
    }

    const notesError = validateLongText("Notes", notes, 1000);

    if (notesError) {
      return { values: null, error: notesError };
    }

    const values: DealPayload = {
      clientId,
      title,
      estimatedBudget,
      finalPrice,
      status,
      probability,
      expectedCloseDate,
      description,
      notes,
      isDeleted: false,
    };

    return { values, error: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid deal data";

    return {
      values: null,
      error: message,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const deals = await Deal.find({ isDeleted: { $ne: true } })
      .populate("clientId", "companyName contactPerson email status")
      .sort({ createdAt: -1 });

    return successResponse({ deals }, "Deals fetched successfully");
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
    const { values, error } = validateDealPayload(body);

    if (!values) {
      return errorResponse(error, 400);
    }

    const client = await Client.findOne({
      _id: values.clientId,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const createdDeal = await Deal.create(values);

    const deal = await Deal.findById(createdDeal._id).populate(
      "clientId",
      "companyName contactPerson email status"
    );

    return successResponse({ deal }, "Deal created successfully", 201);
  } catch {
    return errorResponse("Server error", 500);
  }
}
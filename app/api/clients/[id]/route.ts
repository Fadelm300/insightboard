import { NextRequest } from "next/server";
import { Types } from "mongoose";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Client from "@/models/Client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ClientStatus =
  | "New Lead"
  | "Contacted"
  | "Interested"
  | "Not Interested"
  | "Converted";

type ClientPayload = {
  companyName: string;
  businessType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  location?: string;
  website?: string;
  description?: string;
  notes?: string;
  status?: ClientStatus;
};

const CLIENT_STATUSES: ClientStatus[] = [
  "New Lead",
  "Contacted",
  "Interested",
  "Not Interested",
  "Converted",
];

function cleanSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanMultiLineText(value: string) {
  return value.trim().replace(/[ \t]+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWebsite(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return "";

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function hasUnsafeCharacters(value: string) {
  return /[<>{}\[\]`$|\\]/.test(value);
}

function hasUnsafePattern(value: string) {
  return /(javascript:|data:|on\w+\s*=|<\s*script)/i.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^[0-9+\-\s()]{6,25}$/.test(value);
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function getStringField(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null) return "";

  if (typeof value !== "string") {
    throw new Error(`${field} must be text`);
  }

  return value;
}

function validateClientPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      values: null,
      error: "Invalid client data",
    };
  }

  const data = body as Record<string, unknown>;

  try {
    const values: ClientPayload = {
      companyName: cleanSingleLineText(getStringField(data, "companyName")),
      businessType: cleanSingleLineText(getStringField(data, "businessType")),
      contactPerson: cleanSingleLineText(getStringField(data, "contactPerson")),
      phone: cleanSingleLineText(getStringField(data, "phone")),
      email: normalizeEmail(getStringField(data, "email")),
      location: cleanSingleLineText(getStringField(data, "location")),
      website: normalizeWebsite(getStringField(data, "website")),
      description: cleanMultiLineText(getStringField(data, "description")),
      notes: cleanMultiLineText(getStringField(data, "notes")),
      status: (getStringField(data, "status") || "New Lead") as ClientStatus,
    };

    const companyNameError = validateSafeText(
      "Company name",
      values.companyName,
      120,
      true
    );

    if (companyNameError) return { values: null, error: companyNameError };

    const businessTypeError = validateSafeText(
      "Business type",
      values.businessType || "",
      80
    );

    if (businessTypeError) return { values: null, error: businessTypeError };

    const contactPersonError = validateSafeText(
      "Contact person",
      values.contactPerson || "",
      80
    );

    if (contactPersonError) return { values: null, error: contactPersonError };

    const locationError = validateSafeText(
      "Location",
      values.location || "",
      120
    );

    if (locationError) return { values: null, error: locationError };

    if (values.phone && !isValidPhone(values.phone)) {
      return {
        values: null,
        error: "Phone can only contain numbers, spaces, +, -, and brackets",
      };
    }

    if (values.email && !isValidEmail(values.email)) {
      return { values: null, error: "Enter a valid email address" };
    }

    if (values.website && !isValidWebsite(values.website)) {
      return { values: null, error: "Enter a valid website URL" };
    }

    if (!CLIENT_STATUSES.includes(values.status || "New Lead")) {
      return { values: null, error: "Invalid client status" };
    }

    if ((values.description || "").length > 1000) {
      return {
        values: null,
        error: "Description must be 1000 characters or less",
      };
    }

    if (
      values.description &&
      (hasUnsafeCharacters(values.description) ||
        hasUnsafePattern(values.description))
    ) {
      return {
        values: null,
        error: "Description contains invalid characters",
      };
    }

    if ((values.notes || "").length > 1000) {
      return {
        values: null,
        error: "Notes must be 1000 characters or less",
      };
    }

    if (
      values.notes &&
      (hasUnsafeCharacters(values.notes) || hasUnsafePattern(values.notes))
    ) {
      return {
        values: null,
        error: "Notes contain invalid characters",
      };
    }

    return { values, error: "" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid client data";

    return {
      values: null,
      error: message,
    };
  }
}

async function getClientId(context: RouteContext) {
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  return id;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const id = await getClientId(context);

    if (!id) {
      return errorResponse("Invalid client id", 400);
    }

    const client = await Client.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({ client }, "Client fetched successfully");
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

    const id = await getClientId(context);

    if (!id) {
      return errorResponse("Invalid client id", 400);
    }

    const body = await req.json().catch(() => null);
    const { values, error } = validateClientPayload(body);

    if (!values) {
      return errorResponse(error, 400);
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
      },
      values,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({ client }, "Client updated successfully");
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

    const id = await getClientId(context);

    if (!id) {
      return errorResponse("Invalid client id", 400);
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
      },
      { isDeleted: true },
      { new: true }
    );

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({}, "Client deleted successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}
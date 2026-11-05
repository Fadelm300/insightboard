import { hasPermission } from "@/lib/permissions";
import { projectFinancialInput, canReadProjectFinancials, projectDTO } from "@/lib/crmData";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
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
  price: number | null;
  cost: number | null;
  profit: number | null;
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

  const price = body.price === null ? null : parseMoney(body.price);
  const cost = body.cost === null ? null : parseMoney(body.cost);

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
      profit: price === null || cost === null ? null : price - cost,
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
    const authorization = await authorizeRequest(req, "projects.read");
    if (authorization.response) return authorization.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      50
    );

    const search = searchParams.get("search")?.trim() || "";
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    if (search) {
      const matchingClients = await Client.find({
        isDeleted: { $ne: true },
        $or: [
          { companyName: { $regex: search, $options: "i" } },
          ...(hasPermission(authorization.user!, "clients.read") ? [
            { contactPerson: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ] : []),
        ],
      }).select("_id");

      const matchingDeals = hasPermission(authorization.user!, "deals.read") ? await Deal.find({
        isDeleted: { $ne: true },
        $or: [
          { title: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      }).select("_id") : [];

      const matchingClientIds = matchingClients.map((client) => client._id);
      const matchingDealIds = matchingDeals.map((deal) => deal._id);

      const searchConditions: Record<string, unknown>[] = [
        { name: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        ...(canReadProjectFinancials(authorization.user!) ? [{ paymentStatus: { $regex: search, $options: "i" } }] : []),
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];

      const amount = Number(search);

      if (canReadProjectFinancials(authorization.user!) && Number.isFinite(amount)) {
        searchConditions.push({ price: amount });
        searchConditions.push({ cost: amount });
        searchConditions.push({ profit: amount });
      }

      if (matchingClientIds.length > 0) {
        searchConditions.push({
          clientId: { $in: matchingClientIds },
        });
      }

      if (matchingDealIds.length > 0) {
        searchConditions.push({
          dealId: { $in: matchingDealIds },
        });
      }

      filter.$or = searchConditions;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("clientId", "companyName contactPerson email")
        .populate("dealId", "title status finalPrice estimatedBudget")
        .sort({ deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    return successResponse(
      {
        projects: projects.map((record) => projectDTO(record, authorization.user!)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      "Projects fetched successfully"
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "projects.create");
    if (authorization.response) return authorization.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    await connectDB();

    const body = await req.json().catch(() => null);
    const financial = projectFinancialInput(authorization.user!, body);
    if (financial.error) return errorResponse(financial.error, financial.status);
    const validation = validateProjectPayload({ ...body, ...financial.data });

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

    return successResponse({ project: projectDTO(project, authorization.user!) }, "Project created successfully", 201);
  } catch {
    return errorResponse("Server error", 500);
  }
}

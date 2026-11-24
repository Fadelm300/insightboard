import Revenue from "@/models/Revenue";
import { withCrmWriteTransaction } from "@/lib/crmWriteTransaction";
import { archiveCrmRecord } from "@/lib/crmArchive";
import { ensureProjectDealIndex, isProjectDealConflict, ProjectDealLinkUnavailable } from "@/lib/projectDealLink";
import { canManageProjectFinancials, projectFinancialInput, projectDTO } from "@/lib/crmData";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
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

function getDateInputValue(value?: Date | string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "projects.read");
    if (authorization.response) return authorization.response;

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

    return successResponse({ project: projectDTO(project, authorization.user!) }, "Project fetched successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "projects.update");
    if (authorization.response) return authorization.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid project ID", 400);
    }

    const body = await req.json().catch(() => null);

    await ensureProjectDealIndex();

    return await withCrmWriteTransaction(async (session) => {
      const existingProject = await Project.findOne({
        _id: id,
        isDeleted: { $ne: true },
      }, null, { session });

      if (!existingProject) {
        return errorResponse("Project not found", 404);
      }


      if (!isPlainObject(body)) {
        return errorResponse("Invalid request body", 400);
      }

      const financial = projectFinancialInput(authorization.user!, body, existingProject);
      if (financial.error) return errorResponse(financial.error, financial.status);

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

      const description =
        body.description === undefined || body.description === null
          ? cleanText(existingProject.description || "")
          : cleanText(body.description);

      const notes =
        body.notes === undefined || body.notes === null
          ? cleanText(existingProject.notes || "")
          : cleanText(body.notes);

     const existingDeadlineInput = getDateInputValue(existingProject.deadline);

  const deadline = hasDeadlineField
    ? getString(body.deadline)
    : existingDeadlineInput;

  const deadlineChanged = hasDeadlineField && deadline !== existingDeadlineInput;

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

      if (deadline && deadlineChanged && isPastDate(deadline)) {
    return errorResponse("Deadline cannot be in the past", 400);
  }

      if (!PROJECT_STATUSES.includes(status)) {
        return errorResponse("Invalid project status", 400);
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
      }, null, { session });

      if (!client) {
        return errorResponse("Client not found", 404);
      }

      if (dealId) {
        const deal = await Deal.findOne({
          _id: dealId,
          isDeleted: { $ne: true },
        }, null, { session });

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

      if (String(existingProject.clientId) !== clientId && await Revenue.exists({ projectId: id }).session(session)) {
        return errorResponse("A project with revenue cannot be moved to another client", 409);
      }

      const setPayload = {
        clientId,
        name,
        type,
        ...(canManageProjectFinancials(authorization.user!) && ["price", "agreedExtras", "cost", "paymentStatus"].some((key) => Object.hasOwn(body, key)) ? financial.data : {}),
        status,
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


      const project = await Project.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, updatePayload, { session,
          returnDocument: "after",
          runValidators: true,
        }
      )
        .populate("clientId", "companyName contactPerson email")
        .populate("dealId", "title status finalPrice estimatedBudget");

      if (!project) {
        return errorResponse("Project not found", 404);
      }

      return successResponse({ project: projectDTO(project, authorization.user!) }, "Project updated successfully");
    });
  } catch (error) {
    if (error instanceof ProjectDealLinkUnavailable) return errorResponse("Project linking is temporarily unavailable", 503);
    if (isProjectDealConflict(error)) return errorResponse("This deal already has a project, including archived projects", 409);
    return errorResponse("Server error", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const authorization = await authorizeRequest(req, "projects.delete");
    if (authorization.response) return authorization.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;
    await connectDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid project ID", 400);
    }

    const result = await archiveCrmRecord("projects", id, authorization.user!.id);
    if (result === "missing") return errorResponse("Project not found", 404);
    if (result === "active-dependants") {
      return errorResponse("Archive linked revenue and expenses before archiving this project", 409);
    }

    return successResponse({}, "Project archived successfully");
  } catch {
    return errorResponse("Server error", 500);
  }
}

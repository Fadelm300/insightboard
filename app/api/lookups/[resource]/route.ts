import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { hasPermission, type Permission } from "@/lib/permissions";

import Client from "@/models/Client";
import Deal from "@/models/Deal";
import Project from "@/models/Project";

const LOOKUPS = {
  clients: {
    model: Client,
    fields: "_id companyName",
    permissions: [
      "clients.read",
      "deals.read",
      "deals.create",
      "deals.update",
      "projects.read",
      "projects.create",
      "projects.update"
    ],
  },

  deals: {
    model: Deal,
    fields: "_id title status clientId",
    permissions: [
      "deals.read",
      "projects.read",
      "projects.create",
      "projects.update"
    ],
  },

  projects: {
    model: Project,
    fields: "_id name",
    permissions: [
      "projects.read",
      "deals.read",
      "revenue.read",
      "revenue.create",
      "revenue.update",
      "expenses.read",
      "expenses.create",
      "expenses.update"
    ],
  },
} as const;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await context.params;

    if (!Object.hasOwn(LOOKUPS, resource))
      return errorResponse("Not found", 404);

    const lookup = LOOKUPS[resource as keyof typeof LOOKUPS];

    const authorization = await authorizeRequest(
      req,
      lookup.permissions as readonly Permission[]
    );

    if (authorization.response) return authorization.response;

    await connectDB();

    const fields =
      resource === "deals" &&
      hasPermission(authorization.user!, "deals.read")
        ? lookup.fields + " finalPrice estimatedBudget"
        : resource === "projects" &&
            hasPermission(authorization.user!, "deals.read")
          ? lookup.fields + " dealId"
          : lookup.fields;

    const records = await lookup.model
      .find({ isDeleted: { $ne: true } })
      .select(fields)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({ [resource]: records });
  } catch {
    return errorResponse("Unable to load options", 500);
  }
}
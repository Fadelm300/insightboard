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
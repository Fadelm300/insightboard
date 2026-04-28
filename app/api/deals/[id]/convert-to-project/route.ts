import { NextRequest } from "next/server";

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

    const client = await Client.findOne({
      _id: deal.clientId,
      isDeleted: { $ne: true },
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const project = await Project.create({
      clientId: deal.clientId,
      dealId: deal._id,
      name: deal.title + " Project",
      type: "Business Website",
      price: deal.finalPrice || deal.estimatedBudget,
      cost: 0,
      profit: deal.finalPrice || deal.estimatedBudget,
      status: "Not Started",
      paymentStatus: "Unpaid",
      notes: "Project created from deal conversion",
    });

    return successResponse(
      { project },
      "Deal converted to project successfully",
      201
    );
  } catch (error) {
    console.error("CONVERT_DEAL_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
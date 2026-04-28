import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";
import Client from "@/models/Client";
import Deal from "@/models/Deal";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

const projects = await Project.find({ isDeleted: { $ne: true }})
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice")
      .sort({ createdAt: -1 });

    return successResponse({ projects }, "Projects fetched successfully");
  } catch (error) {
    console.error("GET_PROJECTS_ERROR:", error);
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

    const body = await req.json();

    if (!body.clientId || !body.dealId || !body.name || !body.price) {
      return errorResponse(
        "Client, deal, project name, and price are required",
        400
      );
    }

    const client = await Client.findOne({
      _id: body.clientId,
      isDeleted: { $ne: true }
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const deal = await Deal.findById(body.dealId);

    if (!deal) {
      return errorResponse("Deal not found", 404);
    }
    if (deal.status !== "Closed Won") {
      return errorResponse(
        "Project can only be created if deal status is Closed Won",
        400
      );
    }

    const project = await Project.create(body);

    return successResponse({ project }, "Project created successfully", 201);
  } catch (error) {
    console.error("CREATE_PROJECT_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
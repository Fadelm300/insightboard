import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Deal from "@/models/Deal";
import Client from "@/models/Client";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const deals = await Deal.find()
      .populate("clientId", "companyName contactPerson email status")
      .sort({ createdAt: -1 });

    return successResponse({ deals }, "Deals fetched successfully");
  } catch (error) {
    console.error("GET_DEALS_ERROR:", error);
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

    if (!body.clientId || !body.title || !body.estimatedBudget) {
      return errorResponse(
        "Client, title, and estimated budget are required",
        400
      );
    }

    const client = await Client.findOne({
      _id: body.clientId,
      isDeleted: false,
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    const deal = await Deal.create(body);

    return successResponse({ deal }, "Deal created successfully", 201);
  } catch (error) {
    console.error("CREATE_DEAL_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
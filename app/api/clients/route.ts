import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Client from "@/models/Client";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

const clients = await Client.find({ isDeleted: { $ne: true } })
  .sort({ createdAt: -1 });
    return successResponse({ clients }, "Clients fetched successfully");
  } catch (error) {
    console.error("GET_CLIENTS_ERROR:", error);
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

    if (!body.companyName || !body.contactPerson || !body.email) {
      return errorResponse(
        "Company name, contact person, and email are required",
        400
      );
    }

    const client = await Client.create(body);

    return successResponse({ client }, "Client created successfully", 201);
  } catch (error) {
    console.error("CREATE_CLIENT_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
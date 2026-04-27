import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Client from "@/models/Client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const { id } = await context.params;

    const client = await Client.findById(id);

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({ client }, "Client fetched successfully");
  } catch (error) {
    console.error("GET_CLIENT_ERROR:", error);
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

    const { id } = await context.params;
    const body = await req.json();

    const client = await Client.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({ client }, "Client updated successfully");
  } catch (error) {
    console.error("UPDATE_CLIENT_ERROR:", error);
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

    const { id } = await context.params;

        const client = await Client.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
        );
    if (!client) {
      return errorResponse("Client not found", 404);
    }

    return successResponse({}, "Client deleted successfully");
  } catch (error) {
    console.error("DELETE_CLIENT_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
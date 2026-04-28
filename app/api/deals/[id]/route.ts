import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Deal from "@/models/Deal";

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

    const deal = await Deal.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).populate("clientId", "companyName contactPerson email status");

    if (!deal) {
      return errorResponse("Deal not found", 404);
    }

    return successResponse({ deal }, "Deal fetched successfully");
  } catch (error) {
    console.error("GET_DEAL_ERROR:", error);
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

    const deal = await Deal.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
      },
      body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("clientId", "companyName contactPerson email status");

    if (!deal) {
      return errorResponse("Deal not found", 404);
    }

    return successResponse({ deal }, "Deal updated successfully");
  } catch (error) {
    console.error("UPDATE_DEAL_ERROR:", error);
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

    const deal = await Deal.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
      },
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );

    if (!deal) {
      return errorResponse("Deal not found", 404);
    }

    return successResponse({}, "Deal deleted successfully");
  } catch (error) {
    console.error("DELETE_DEAL_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
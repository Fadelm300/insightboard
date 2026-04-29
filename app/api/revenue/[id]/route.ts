import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Revenue from "@/models/Revenue";
import "@/models/Project";
import "@/models/Client";

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

    const revenue = await Revenue.findById(id)
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email");

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({ revenue }, "Revenue record fetched successfully");
  } catch (error) {
    console.error("GET_REVENUE_BY_ID_ERROR:", error);
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

    if (body.amount !== undefined && body.amount <= 0) {
      return errorResponse("Amount must be greater than 0", 400);
    }

    const updateData = {
      amount: body.amount,
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod,
      description: body.description,
      notes: body.notes,
    };

    const revenue = await Revenue.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email");

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({ revenue }, "Revenue record updated successfully");
  } catch (error) {
    console.error("UPDATE_REVENUE_ERROR:", error);
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

    const revenue = await Revenue.findByIdAndDelete(id);

    if (!revenue) {
      return errorResponse("Revenue record not found", 404);
    }

    return successResponse({}, "Revenue record deleted successfully");
  } catch (error) {
    console.error("DELETE_REVENUE_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Revenue from "@/models/Revenue";
import Project from "@/models/Project";
import "@/models/Client";
export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const revenues = await Revenue.find()
      .populate("projectId", "name type price status paymentStatus")
      .populate("clientId", "companyName contactPerson email")
      .sort({ paymentDate: -1 });

    return successResponse(
      { revenues },
      "Revenue records fetched successfully"
    );
  } catch (error) {
    console.error("GET_REVENUE_ERROR:", error);
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

    if (!body.projectId || !body.amount || !body.paymentMethod) {
      return errorResponse(
        "Project, amount, and payment method are required",
        400
      );
    }

    if (body.amount <= 0) {
      return errorResponse("Amount must be greater than 0", 400);
    }

    const project = await Project.findOne({
      _id: body.projectId,
      isDeleted: { $ne: true },
    });

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    const revenue = await Revenue.create({
      projectId: project._id,
      clientId: project.clientId,
      amount: body.amount,
      paymentDate: body.paymentDate || new Date(),
      paymentMethod: body.paymentMethod,
      description: body.description || "",
      notes: body.notes || "",
    });

    return successResponse(
      { revenue },
      "Revenue record created successfully",
      201
    );
  } catch (error) {
    console.error("CREATE_REVENUE_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Project from "@/models/Project";

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

    const project = await Project.findById(id)
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice");

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({ project }, "Project fetched successfully");
  } catch (error) {
    console.error("GET_PROJECT_ERROR:", error);
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

    if (body.price !== undefined || body.cost !== undefined) {
      const existingProject = await Project.findById(id);

      if (!existingProject) {
        return errorResponse("Project not found", 404);
      }

      const price = body.price ?? existingProject.price;
      const cost = body.cost ?? existingProject.cost;

      body.profit = price - cost;
    }

    const project = await Project.findByIdAndUpdate(id, body, {
      returnDocument: "after" ,
      runValidators: true,
    })
      .populate("clientId", "companyName contactPerson email")
      .populate("dealId", "title status finalPrice");

    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({ project }, "Project updated successfully");
  } catch (error) {
    console.error("UPDATE_PROJECT_ERROR:", error);
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

const project = await Project.findByIdAndUpdate(
  id,
  { isDeleted: true },
  { returnDocument: "after" }
);
    if (!project) {
      return errorResponse("Project not found", 404);
    }

    return successResponse({}, "Project deleted successfully");
  } catch (error) {
    console.error("DELETE_PROJECT_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
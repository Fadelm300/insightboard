import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Expense from "@/models/Expense";
import Project from "@/models/Project";

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);

    if (!authUser) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    const expenses = await Expense.find()
      .populate("projectId", "name type price cost profit status paymentStatus")
      .sort({ date: -1 });

    return successResponse(
      { expenses },
      "Expense records fetched successfully"
    );
  } catch (error) {
    console.error("GET_EXPENSES_ERROR:", error);
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

    if (!body.projectId || !body.title || !body.amount || !body.category) {
      return errorResponse(
        "Project, title, amount, and category are required",
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

    const expense = await Expense.create({
      projectId: project._id,
      title: body.title,
      amount: body.amount,
      category: body.category,
      date: body.date || new Date(),
      description: body.description || "",
      notes: body.notes || "",
    });

    return successResponse(
      { expense },
      "Expense record created successfully",
      201
    );
  } catch (error) {
    console.error("CREATE_EXPENSE_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { getAuthUser } from "@/lib/auth";
import Expense from "@/models/Expense";
import "@/models/Project";

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

    const expense = await Expense.findById(id).populate(
      "projectId",
      "name type price cost profit status paymentStatus"
    );

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense }, "Expense record fetched successfully");
  } catch (error) {
    console.error("GET_EXPENSE_BY_ID_ERROR:", error);
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
      title: body.title,
      amount: body.amount,
      category: body.category,
      date: body.date,
      description: body.description,
      notes: body.notes,
    };

    const expense = await Expense.findByIdAndUpdate(id, updateData, {
      returnDocument: "after" ,
      runValidators: true,
    }).populate("projectId", "name type price cost profit status paymentStatus");

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({ expense }, "Expense record updated successfully");
  } catch (error) {
    console.error("UPDATE_EXPENSE_ERROR:", error);
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

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return errorResponse("Expense record not found", 404);
    }

    return successResponse({}, "Expense record deleted successfully");
  } catch (error) {
    console.error("DELETE_EXPENSE_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
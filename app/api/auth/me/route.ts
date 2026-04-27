import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { verifyToken } from "@/lib/auth";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token) as { id: string } | null;

    if (!decoded) {
      return errorResponse("Invalid or expired token", 401);
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(
      {
        user,
      },
      "User fetched successfully"
    );
  } catch (error) {
    console.error("ME_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
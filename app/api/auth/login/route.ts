import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { signToken } from "@/lib/auth";

import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    return successResponse(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      "Login successful"
    );
  } catch (error) {
    console.error(error);
    return errorResponse("Server error", 500);
  }
}
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";



import connectDB from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return errorResponse("Name, email, and password are required", 400);
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return errorResponse("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return successResponse(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      "User registered successfully",
      201
    );
  } catch (error) {
    console.error("REGISTER_ERROR:", error);
    return errorResponse("Server error", 500);
  }
}
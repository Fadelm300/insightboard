import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { signToken } from "@/lib/auth";
import User from "@/models/User";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // CRM is single-admin only.
    // If any user already exists, block registration completely.
    const existingAnyUser = await User.findOne({});

    if (existingAnyUser) {
      return errorResponse(
        "Registration is closed. Admin account already exists.",
        403
      );
    }

    const body = await req.json().catch(() => null);

    if (!body) {
      return errorResponse("Invalid register request", 400);
    }

    const { name, email, password } = body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return errorResponse("Name, email, and password are required", 400);
    }

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = password;

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return errorResponse("Name, email, and password are required", 400);
    }

    if (cleanName.length < 2) {
      return errorResponse("Name must be at least 2 characters", 400);
    }

    if (cleanName.length > 80) {
      return errorResponse("Name must be 80 characters or less", 400);
    }

    if (!isValidEmail(cleanEmail)) {
      return errorResponse("Enter a valid email address", 400);
    }

    if (cleanPassword.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    if (cleanPassword.length > 128) {
      return errorResponse("Password must be 128 characters or less", 400);
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return errorResponse("This email is already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
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
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return errorResponse("This email is already registered", 409);
    }

    return errorResponse("Server error", 500);
  }
}
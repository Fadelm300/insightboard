import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { signToken } from "@/lib/auth";

import User from "@/models/User";

type LoginFailResponse = {
  success: false;
  message: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function loginFail(message: string) {
  return NextResponse.json<LoginFailResponse>(
    {
      success: false,
      message,
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);

    if (!body) {
      return loginFail("Invalid login request");
    }

    const cleanEmail = normalizeEmail(String(body.email || ""));
    const cleanPassword = String(body.password || "");

    if (!cleanEmail || !cleanPassword) {
      return loginFail("Email and password are required");
    }

    if (!isValidEmail(cleanEmail)) {
      return loginFail("Enter a valid email address");
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return loginFail("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);

    if (!isPasswordValid) {
      return loginFail("Invalid email or password");
    }

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
      "Login successful"
    );
  } catch {
    return errorResponse("Server error", 500);
  }
}
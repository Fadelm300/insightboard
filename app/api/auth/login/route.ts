import { logServerError } from "@/lib/serverLogger";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { createSession } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/sessionPolicy";
import { allowLoginAttempt } from "@/lib/loginRateLimit";
import { getPermissions, isAccountEnabled } from "@/lib/permissions";

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
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isTrustedMutation(req)) return errorResponse("Forbidden", 403);

  try {

    const body = await req.json().catch(() => null);

    if (!body) {
      return loginFail("Invalid login request");
    }

    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return loginFail("Invalid email or password");
    }

    const cleanEmail = normalizeEmail(body.email);
    const cleanPassword = body.password;

    if (cleanEmail.length > 254 || cleanPassword.length > 128) {
      return loginFail("Invalid email or password");
    }

    if (!cleanEmail || !cleanPassword) {
      return loginFail("Email and password are required");
    }

    if (!isValidEmail(cleanEmail)) {
      return loginFail("Enter a valid email address");
    }

    await connectDB();

    if (!(await allowLoginAttempt(req, cleanEmail))) {
      const response = errorResponse("Too many sign-in attempts. Try again later.", 429);
      response.headers.set("Retry-After", "900");
      return response;
    }

    const user = await User.findOne({ email: cleanEmail });

    const passwordHash = user?.password ?? "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const isPasswordValid = await bcrypt.compare(cleanPassword, passwordHash);

    if (!user || !isPasswordValid || !isAccountEnabled(user)) {
      return loginFail("Invalid email or password");
    }

    const response = successResponse(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          allowedPermissions: getPermissions(user),
        },
      },
      "Login successful"
    );
    await createSession(user._id.toString(), req, response, user.authVersion ?? 0);
    return response;
  } catch {
    logServerError("LOGIN_API_ERROR");
    return errorResponse("Server error", 500);
  }
}

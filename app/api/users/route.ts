import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import { manageableRoles } from "@/lib/permissions";
import { logServerError } from "@/lib/serverLogger";
import {
  publicUser,
  readUserInput,
  SAFE_USER_FIELDS,
  saveManagedUser,
  UserManagementError
} from "@/lib/userManagement";

import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "users.read");

    if (authorization.response) return authorization.response;

    const actor = authorization.user!;

    await connectDB();

    const filter =
      actor.role === "manager"
        ? {
            managedBy: actor.id,
            role: { $in: manageableRoles(actor.role) }
          }
        : {
            role: { $in: manageableRoles(actor.role) }
          };

    const requestedPage = Number(
      new URL(req.url).searchParams.get("page") || 1
    );

    const requestedRole = new URL(req.url).searchParams.get("role");

    if (
      requestedRole &&
      !manageableRoles(actor.role).some((role) => role === requestedRole)
    ) {
      return errorResponse("Forbidden", 403);
    }

    if (
      !Number.isSafeInteger(requestedPage) ||
      requestedPage < 1 ||
      requestedPage > 10_000
    ) {
      return errorResponse("Invalid page", 400);
    }

    const limit = 50;

    const records = await User.find({
      ...filter,
      ...(requestedRole ? { role: requestedRole } : {})
    })
      .select(SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((requestedPage - 1) * limit)
      .limit(limit)
      .lean();

    return successResponse({
      users: records.map(publicUser),
      page: requestedPage,
      limit
    });
  } catch {
    logServerError("USER_MANAGEMENT_ERROR");

    return errorResponse("Unable to load users", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeRequest(req, "users.manage");

    if (authorization.response) return authorization.response;

    const demoBlock = blockIfDemoMode();

    if (demoBlock) return demoBlock;

    const input = await readUserInput(req, true);

    await connectDB();

    return successResponse(
      {
        user: await saveManagedUser(authorization.user!, input)
      },
      "User created",
      201
    );
  } catch (error) {
    if (error instanceof UserManagementError)
      return errorResponse(error.message, error.status);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return errorResponse(
        "Unable to create an account with these details",
        409
      );
    }

    logServerError("USER_MANAGEMENT_ERROR");

    return errorResponse("Unable to create user", 500);
  }
}
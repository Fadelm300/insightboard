import { NextRequest } from "next/server";

import connectDB from "@/lib/mongodb";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import { logServerError } from "@/lib/serverLogger";
import {
  readUserInput,
  saveManagedUser,
  UserManagementError
} from "@/lib/userManagement";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await authorizeRequest(req, "users.manage");

    if (authorization.response) return authorization.response;

    const demoBlock = blockIfDemoMode();

    if (demoBlock) return demoBlock;

    const { id } = await context.params;

    if (!/^[a-f0-9]{24}$/i.test(id))
      return errorResponse("Invalid user id", 400);

    const input = await readUserInput(req, false);

    await connectDB();

    return successResponse(
      {
        user: await saveManagedUser(authorization.user!, input, id)
      },
      "User updated"
    );
  } catch (error) {
    if (error instanceof UserManagementError)
      return errorResponse(error.message, error.status);

    logServerError("USER_MANAGEMENT_ERROR");

    return errorResponse("Unable to update user", 500);
  }
}
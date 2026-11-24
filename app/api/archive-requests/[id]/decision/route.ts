import { NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import {
  ArchiveApprovalError,
  decideArchiveRequest,
} from "@/lib/archiveApproval";
import { validateApprovalReason } from "@/lib/archiveApprovalPolicy";
import { readApprovalBody } from "@/lib/archiveApprovalHttp";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeRequest(req, "archiveRequests.read");
    if (auth.response) return auth.response;

    const demo = blockIfDemoMode();
    if (demo) return demo;

    const { id } = await context.params;
    const body = await readApprovalBody(req);
    const reason = validateApprovalReason(body?.reason);

    if (
      !/^[a-f0-9]{24}$/i.test(id) ||
      !body ||
      Object.keys(body).some((key) => !["action", "reason"].includes(key)) ||
      typeof body.action !== "string" ||
      !["approve", "reject", "cancel"].includes(body.action) ||
      !reason
    ) {
      return errorResponse(
        "A valid decision and reason (5-500 characters) are required",
        400
      );
    }

    await connectDB();

    const result = await decideArchiveRequest(
      auth.user!.id,
      id,
      body.action as "approve" | "reject" | "cancel",
      reason
    );

    return successResponse(
      result,
      result.status === "approved"
        ? "Request approved and record archived"
        : `Request ${result.status}`
    );
  } catch (error) {
    return error instanceof ArchiveApprovalError
      ? errorResponse(error.message, error.status)
      : errorResponse("Unable to decide archive request", 500);
  }
}

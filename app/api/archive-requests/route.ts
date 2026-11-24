import { NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";
import {
  ArchiveApprovalError,
  listArchiveRequests,
  requestArchive,
} from "@/lib/archiveApproval";
import {
  isArchiveResource,
  validateApprovalReason,
} from "@/lib/archiveApprovalPolicy";
import { readApprovalBody } from "@/lib/archiveApprovalHttp";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, "archiveRequests.read");
    if (auth.response) return auth.response;

    const params = req.nextUrl.searchParams;
    const page = params.get("page") ?? "1";

    if (
      [...params.keys()].some((key) => key !== "page") ||
      params.getAll("page").length > 1 ||
      !/^[1-9]\d{0,3}$/.test(page) ||
      Number(page) > 1000
    ) {
      return errorResponse("Invalid page", 400);
    }

    await connectDB();

    return successResponse(
      await listArchiveRequests(auth.user!.id, Number(page))
    );
  } catch (error) {
    return error instanceof ArchiveApprovalError
      ? errorResponse(error.message, error.status)
      : errorResponse("Unable to load archive requests", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, "archiveRequests.create");
    if (auth.response) return auth.response;

    const demo = blockIfDemoMode();
    if (demo) return demo;

    const body = await readApprovalBody(req);
    const reason = validateApprovalReason(body?.reason);

    if (
      !body ||
      Object.keys(body).some(
        (key) => !["resource", "recordId", "reason"].includes(key)
      ) ||
      !isArchiveResource(body.resource) ||
      typeof body.recordId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(body.recordId) ||
      !reason
    ) {
      return errorResponse(
        "Valid resource, record ID and reason (5-500 characters) are required",
        400
      );
    }

    await connectDB();

    return successResponse(
      {
        request: await requestArchive(
          auth.user!.id,
          body.resource,
          body.recordId,
          reason
        ),
      },
      "Archive request submitted. The record is still active",
      201
    );
  } catch (error) {
    return error instanceof ArchiveApprovalError
      ? errorResponse(error.message, error.status)
      : errorResponse("Unable to submit archive request", 500);
  }
}

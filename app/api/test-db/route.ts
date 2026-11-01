import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { logServerError } from "@/lib/serverLogger";

export const dynamic = "force-dynamic";

function diagnosticResponse(message: string, status: number) {
  return NextResponse.json(
    { success: status === 200, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(req: NextRequest) {
  // This diagnostic must not run in Production or Vercel Preview builds.
  if (process.env.NODE_ENV !== "development") {
    return diagnosticResponse("Not found", 404);
  }

  try {
    const user = await getAuthUser(req);

    if (!user) {
      return diagnosticResponse("Unauthorized", 401);
    }

    if (user.role !== "admin") {
      return diagnosticResponse("Forbidden", 403);
    }

    await connectDB();

    return diagnosticResponse("Database connection available", 200);
  } catch {
    logServerError("DATABASE_DIAGNOSTIC_ERROR");
    return diagnosticResponse("Database connection unavailable", 503);
  }
}

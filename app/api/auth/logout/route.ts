import { NextRequest } from "next/server";
import { successResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  return successResponse({}, "Logout successful");
}
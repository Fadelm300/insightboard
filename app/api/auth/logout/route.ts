import { successResponse } from "@/lib/apiResponse";

export async function POST() {
  return successResponse({}, "Logout successful");
}
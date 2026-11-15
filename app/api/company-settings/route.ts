import type { NextRequest } from "next/server";
import { authorizeRequest } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { blockIfDemoMode } from "@/lib/demoMode";
import { parseCompanySettings } from "@/lib/companySettings";
import { readCompanySettings, saveCompanySettings } from "@/lib/companySettingsService";
import { logServerError } from "@/lib/serverLogger";

export async function GET(req: NextRequest) {
  const access = await authorizeRequest(req, "settings.read");
  if (access.response) return access.response;

  try {
    return successResponse(await readCompanySettings());
  } catch {
    logServerError("COMPANY_SETTINGS_ERROR");
    return errorResponse("Unable to load company settings");
  }
}

export async function PUT(req: NextRequest) {
  const access = await authorizeRequest(req, "settings.read");
  if (access.response) return access.response;
  if (access.user?.role !== "admin") return errorResponse("Forbidden", 403);

  const demoResponse = blockIfDemoMode();
  if (demoResponse) return demoResponse;

  const settings = parseCompanySettings(await req.json().catch(() => null));
  if (!settings) return errorResponse("Enter a valid company name and time zone", 400);

  try {
    await saveCompanySettings(settings);
    return successResponse(settings, "Company settings saved");
  } catch {
    logServerError("COMPANY_SETTINGS_ERROR");
    return errorResponse("Unable to save company settings");
  }
}

import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { authorizeRequest } from "@/lib/authorization";
import { isCrmArchiveResource } from "@/lib/crmArchive";
import { permanentlyDeleteCrmRecord } from "@/lib/crmPermanentDelete";
import { blockIfDemoMode } from "@/lib/demoMode";
import connectDB from "@/lib/mongodb";

type RouteContext = { params: Promise<{ resource: string; id: string }> };

async function readConfirmation(req: NextRequest): Promise<string | null> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        Object.keys(data).length !== 1 || typeof data.confirmation !== "string" ||
        !data.confirmation.length || data.confirmation.length > 120) return null;
    return data.confirmation;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = await authorizeRequest(req, "crmArchive.purge");
    if (auth.response) return auth.response;
    const demoBlock = blockIfDemoMode();
    if (demoBlock) return demoBlock;

    const { resource, id } = await context.params;
    if (!isCrmArchiveResource(resource)) return errorResponse("Not found", 404);
    if (!/^[a-f0-9]{24}$/i.test(id)) return errorResponse("Invalid record ID", 400);
    const confirmation = await readConfirmation(req);
    if (confirmation === null) return errorResponse("A valid record-name confirmation is required", 400);

    await connectDB();
    const result = await permanentlyDeleteCrmRecord(resource, id, auth.user!.id, confirmation);
    if (result === "missing") return errorResponse("Archived record not found", 404);
    if (result === "confirmation-mismatch") return errorResponse("Record name does not match. Refresh the archive and try again", 400);
    if (result === "has-dependants") return errorResponse("Permanent deletion is blocked by linked records, including archived records", 409);
    return successResponse({}, "Record permanently deleted");
  } catch {
    return errorResponse("Unable to permanently delete the record", 500);
  }
}

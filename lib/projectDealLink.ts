import Project from "@/models/Project";

const INDEX_NAME = "unique_project_deal_link";
let indexReady: Promise<unknown> | undefined;

export class ProjectDealLinkUnavailable extends Error {
  constructor() {
    super("Project linking is temporarily unavailable");
  }
}

/** Verify the database constraint before any write that attaches a deal. Never remove conflicting records. */
export async function ensureProjectDealIndex() {
  if (!indexReady) {
    indexReady = Project.collection.createIndex(
      { dealId: 1 },
      { name: INDEX_NAME, unique: true, partialFilterExpression: { dealId: { $type: "objectId" } } },
    ).catch(() => {
      indexReady = undefined;
      throw new ProjectDealLinkUnavailable();
    });
  }
  await indexReady;
}

export function isProjectDealConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) return false;
  const detail = error as { keyPattern?: Record<string, unknown>; message?: unknown };
  return detail.keyPattern?.dealId === 1 ||
    (typeof detail.message === "string" && detail.message.includes(INDEX_NAME));
}

import Project from "@/models/Project";

const INDEX_NAME = "unique_project_deal_link";
let indexReady: Promise<unknown> | undefined;

export class ProjectDealLinkUnavailable extends Error {
  constructor() {
    super("Project linking is temporarily unavailable");
  }
}

/** Validate the pre-provisioned constraint without running DDL in request paths. */
export async function ensureProjectDealIndex() {
  if (!indexReady) {
    indexReady = Project.collection.listIndexes().toArray().then((indexes) => {
      const index = indexes.find((entry) => entry.name === INDEX_NAME);
      if (!index || index.unique !== true || index.key?.dealId !== 1 ||
          Object.keys(index.key).length !== 1 ||
          JSON.stringify(index.partialFilterExpression) !== JSON.stringify({ dealId: { $type: "objectId" } })) {
        throw new ProjectDealLinkUnavailable();
      }
    }).catch(() => {
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

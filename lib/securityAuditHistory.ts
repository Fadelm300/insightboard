import type { PipelineStage } from "mongoose";

/** MongoDB-only history projection. There is deliberately no HTTP route or dashboard for this data.
 * Expiration is derived from the committed deadline, so no timer, cron, client beacon or TTL callback is needed.
 * Future deadlines are excluded. An expired session cannot renew, so its end time is final once due.
 */
export function securityAuditHistoryPipeline(limit = 200): PipelineStage[] {
  const expiredReason = { $cond: [{ $lte: ["$absoluteExpiresAt", "$expiresAt"] }, "absolute_timeout", "idle_timeout"] };
  const reason = { $ifNull: ["$closeReason", expiredReason] };
  return [
    { $match: { $expr: { $and: [{ $gt: ["$purgeAt", "$$NOW"] }, { $lte: ["$startedAt", "$$NOW"] }] } } },
    { $project: {
      _id: { $concat: ["$_id", ":start"] }, sessionId: "$_id", kind: { $literal: "login.success" },
      occurredAt: "$startedAt", userId: 1, accountName: 1, accountEmail: 1, context: 1,
    } },
    { $unionWith: { coll: "securitysessionaudits", pipeline: [
      { $match: { $expr: { $and: [
        { $gt: ["$purgeAt", "$$NOW"] }, { $lte: [{ $ifNull: ["$closedAt", "$expiresAt"] }, "$$NOW"] },
      ] } } },
      { $project: {
        _id: { $concat: ["$_id", ":end"] }, sessionId: "$_id",
        kind: { $switch: { branches: [
          { case: { $eq: [reason, "logout"] }, then: "session.logout" },
          { case: { $in: [reason, ["idle_timeout", "absolute_timeout"]] }, then: "session.expired" },
          { case: { $eq: [reason, "replaced"] }, then: "session.replaced" },
        ], default: "session.revoked" } },
        reason, occurredAt: { $ifNull: ["$closedAt", "$expiresAt"] },
        userId: 1, accountName: 1, accountEmail: 1, closedBy: 1,
        // For automatic expiry, this is the last observed request, not a request at the expiry time.
        context: { $ifNull: ["$endContext", "$lastContext"] },
      } },
    ] } },
    { $unionWith: { coll: "securityauditevents", pipeline: [
      { $match: { $expr: { $and: [{ $gt: ["$purgeAt", "$$NOW"] }, { $lte: ["$occurredAt", "$$NOW"] }] } } },
      { $project: { _id: 1, kind: 1, reason: 1, status: 1, userId: 1, attemptedEmail: 1, context: 1, occurredAt: 1 } },
    ] } },
    { $sort: { occurredAt: -1, _id: 1 } },
    { $limit: Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 1000)) : 200 },
  ];
}

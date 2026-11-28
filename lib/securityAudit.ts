import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import type { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { logServerError } from "@/lib/serverLogger";
import { securityEmail, securityRequestContext, type SecurityContext } from "@/lib/securityContext";
import SecurityAuditEvent from "@/models/SecurityAuditEvent";
import SecuritySessionAudit from "@/models/SecuritySessionAudit";

export const SECURITY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
type AuditKind = "login.failed" | "login.rate_limited" | "registration.blocked" | "request.rejected" | "access.denied";
type AuditReason = "invalid_credentials" | "invalid_request" | "body_too_large" | "unsupported_media_type" | "untrusted_origin" | "rate_limit" | "registration_closed" | "unauthenticated" | "insufficient_permission";
type AuditRequest = Pick<NextRequest, "headers" | "method" | "url">;
type Closure = "logout" | "replaced" | "account_changed" | "account_invalid";

// Rejected requests stay rejected when audit storage is unavailable. Never log their body, cookies or headers.
export async function recordSecurityEvent(req: AuditRequest, event: {
  kind: AuditKind; reason: AuditReason; status: number; userId?: string; attemptedEmail?: unknown;
}) {
  try {
    const occurredAt = new Date();
    await connectDB();
    await SecurityAuditEvent.create({
      _id: randomUUID(), kind: event.kind, reason: event.reason, status: event.status,
      ...(event.userId ? { userId: event.userId } : {}),
      attemptedEmail: securityEmail(event.attemptedEmail), context: securityRequestContext(req),
      occurredAt, purgeAt: new Date(occurredAt.getTime() + SECURITY_RETENTION_MS),
    });
  } catch (error) {
    logServerError("SECURITY_AUDIT_ERROR", error);
  }
}

export async function withSecurityTransaction<T>(operation: (transaction: ClientSession) => Promise<T>): Promise<T> {
  const db = await connectDB();
  const transaction = await db.startSession();
  try {
    return await transaction.withTransaction(() => operation(transaction), {
      readConcern: { level: "snapshot" }, writeConcern: { w: "majority" },
    });
  } finally {
    await transaction.endSession();
  }
}

export async function startSecuritySession(record: {
  auditId: string; userId: string; account: { name: string; email: string };
  startedAt: Date; expiresAt: Date; absoluteExpiresAt: Date; context: SecurityContext;
}, transaction: ClientSession) {
  await SecuritySessionAudit.create([{
    _id: record.auditId, userId: record.userId,
    accountName: record.account.name, accountEmail: record.account.email,
    startedAt: record.startedAt, lastActiveAt: record.startedAt,
    expiresAt: record.expiresAt, absoluteExpiresAt: record.absoluteExpiresAt,
    context: record.context, lastContext: record.context,
    purgeAt: new Date(record.expiresAt.getTime() + SECURITY_RETENTION_MS),
  }], { session: transaction });
}

export async function renewSecuritySession(auditId: string | undefined, expiresAt: Date, now: Date,
  context: SecurityContext, transaction: ClientSession) {
  if (!auditId) return; // Existing sessions issued before this feature have no audit history.
  const result = await SecuritySessionAudit.updateOne({ _id: auditId, closedAt: null }, {
    $set: { expiresAt, lastActiveAt: now, lastContext: context, purgeAt: new Date(expiresAt.getTime() + SECURITY_RETENTION_MS) },
  }, { session: transaction });
  if (result.matchedCount !== 1) throw new Error("Session audit unavailable");
}

export async function closeSecuritySession(auditId: string | undefined, reason: Closure, now: Date,
  context: SecurityContext | null, transaction: ClientSession) {
  if (!auditId) return;
  // An expired session can never be relabelled as an explicit logout or replacement.
  const result = await SecuritySessionAudit.updateOne({ _id: auditId, closedAt: null }, [{ $set: {
    closedAt: { $min: ["$expiresAt", now] },
    closeReason: { $cond: [{ $lte: ["$expiresAt", now] },
      { $cond: [{ $lte: ["$absoluteExpiresAt", "$expiresAt"] }, "absolute_timeout", "idle_timeout"] }, reason] },
    endContext: { $cond: [{ $lte: ["$expiresAt", now] }, "$lastContext", { $literal: context }] },
    purgeAt: { $add: [{ $min: ["$expiresAt", now] }, SECURITY_RETENTION_MS] },
  } }], { session: transaction, updatePipeline: true });
  if (result.matchedCount !== 1) throw new Error("Session audit unavailable");
}

// Called in the existing account-change transaction before deleting its live sessions.
export async function closeSecuritySessionsForUser(userId: string, actorId: string, transaction: ClientSession) {
  const now = new Date();
  await SecuritySessionAudit.updateMany({ userId, closedAt: null, purgeAt: { $gt: now } }, [{ $set: {
    closedAt: { $min: ["$expiresAt", now] },
    closeReason: { $cond: [{ $lte: ["$expiresAt", now] },
      { $cond: [{ $lte: ["$absoluteExpiresAt", "$expiresAt"] }, "absolute_timeout", "idle_timeout"] }, "account_changed"] },
    closedBy: { $literal: actorId },
    endContext: "$lastContext",
    purgeAt: { $add: [{ $min: ["$expiresAt", now] }, SECURITY_RETENTION_MS] },
  } }], { session: transaction, updatePipeline: true });
}

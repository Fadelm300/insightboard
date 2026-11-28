import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import {
  isSessionExpired,
  isTrustedMutation,
  nextSessionExpiry,
  SESSION_ABSOLUTE_MS,
  SESSION_WARNING_MS,
  sessionCookieName,
  sessionCookieOptions,
  sessionIdleMs,
} from "@/lib/sessionPolicy";
import Session from "@/models/Session";
import User from "@/models/User";
import { getPermissions, isAccountEnabled, type PermissionSubject } from "@/lib/permissions";
import { closeSecuritySession, renewSecuritySession, startSecuritySession, withSecurityTransaction } from "@/lib/securityAudit";
import { securityRequestContext, type SecurityContext } from "@/lib/securityContext";

type SessionRecord = {
  tokenHash: string;
  userId: { toString(): string };
  expiresAt: Date;
  absoluteExpiresAt: Date;
  authVersion?: number;
  auditId?: string;
};

async function endSession(tokenHash: string, reason: "logout" | "replaced" | "account_invalid", context: SecurityContext | null) {
  await withSecurityTransaction(async (transaction) => {
    const session = await Session.findOne({ tokenHash }).session(transaction).lean() as unknown as SessionRecord | null;
    if (!session) return;
    await closeSecuritySession(session.auditId, reason, new Date(), context, transaction);
    await Session.deleteOne({ tokenHash }, { session: transaction });
  });
}

export type AuthUser = PermissionSubject & {
  id: string;
  name: string;
  email: string;
  allowedPermissions: string[];
};

function hashSessionToken(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  return createHash("sha256").update(token).digest("hex");
}

async function lookupSession(token: string | undefined) {
  const tokenHash = hashSessionToken(token);

  if (!tokenHash) return null;

  await connectDB();
  const session = await Session.findOne({ tokenHash }).lean() as unknown as SessionRecord | null;

  if (!session || isSessionExpired(session.expiresAt, session.absoluteExpiresAt, Date.now())) {
    return null;
  }

  const user = await User.findById(session.userId)
    .select("_id name email role isActive allowedPermissions authVersion").lean();

  if (isSessionExpired(session.expiresAt, session.absoluteExpiresAt, Date.now())) return null;
  if (!user) {
    await endSession(tokenHash, "account_invalid", null);
    return null;
  }

  const data = user as unknown as PermissionSubject & {
    _id: { toString(): string }; name: string; email: string; authVersion?: number;
  };
  if (!isAccountEnabled(data) || (data.authVersion ?? 0) !== (session.authVersion ?? 0)) {
    await endSession(tokenHash, "account_invalid", null);
    return null;
  }
  return {
    session,
    user: {
      id: data._id.toString(), name: data.name, email: data.email, role: data.role,
      allowedPermissions: getPermissions(data),
    },
  };
}

export async function getAuthUser(req: NextRequest) {
  if (!isTrustedMutation(req)) return null;

  return (await lookupSession(req.cookies.get(sessionCookieName())?.value))?.user ?? null;
}

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  return (await lookupSession(store.get(sessionCookieName())?.value))?.user ?? null;
});

export async function getRequestSession(req: NextRequest) {
  return lookupSession(req.cookies.get(sessionCookieName())?.value);
}

export function sessionDetails(session: Pick<SessionRecord, "expiresAt" | "absoluteExpiresAt">) {
  return {
    expiresAt: session.expiresAt.toISOString(),
    absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
    serverNow: new Date().toISOString(),
    warningSeconds: SESSION_WARNING_MS / 1000,
  };
}

export async function createSession(userId: string, req: NextRequest, response: NextResponse, authVersion = 0,
  account: { name: string; email: string }) {
  const previousHash = hashSessionToken(req.cookies.get(sessionCookieName())?.value);

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token)!;
  const auditId = randomUUID();
  const now = Date.now();
  const absoluteExpiresAt = new Date(now + SESSION_ABSOLUTE_MS);
  const expiresAt = nextSessionExpiry(now, absoluteExpiresAt.getTime(), sessionIdleMs());

  const context = securityRequestContext(req);
  // Cookie issuance happens only after the credential and durable audit commit together.
  await withSecurityTransaction(async (transaction) => {
    if (previousHash) {
      const previous = await Session.findOne({ tokenHash: previousHash }).session(transaction).lean() as unknown as SessionRecord | null;
      if (previous) {
        await closeSecuritySession(previous.auditId, "replaced", new Date(now), context, transaction);
        await Session.deleteOne({ tokenHash: previousHash }, { session: transaction });
      }
    }
    await startSecuritySession({ auditId, userId, account, startedAt: new Date(now), expiresAt, absoluteExpiresAt, context }, transaction);
    await Session.create([{ tokenHash, userId, auditId, authVersion, lastActiveAt: new Date(now), expiresAt, absoluteExpiresAt }], { session: transaction });
  });
  response.cookies.set(sessionCookieName(), token, { ...sessionCookieOptions(), expires: absoluteExpiresAt });
  response.headers.set("Cache-Control", "no-store");
}

export async function renewSession(req: NextRequest, explicit: boolean) {
  const current = await getRequestSession(req);
  if (!current) return null;

  const now = Date.now();
  const remaining = Math.min(current.session.expiresAt.getTime(), current.session.absoluteExpiresAt.getTime()) - now;

  if (remaining <= 0) return null;

  // Automatic activity cannot dismiss a warning or revive an expired session.
  if (!explicit && remaining <= SESSION_WARNING_MS) {
    return { user: current.user, session: sessionDetails(current.session) };
  }

  const updated = await withSecurityTransaction(async (transaction) => {
    // Retry callbacks must use a fresh clock; an old request timestamp must not revive an expired session.
    const renewedAt = new Date();
    const expiresAt = nextSessionExpiry(renewedAt.getTime(), current.session.absoluteExpiresAt.getTime(), sessionIdleMs());
    const record = await Session.findOneAndUpdate(
      { tokenHash: current.session.tokenHash, expiresAt: { $gt: renewedAt }, absoluteExpiresAt: { $gt: renewedAt } },
      { $max: { expiresAt, lastActiveAt: renewedAt } },
      { returnDocument: "after", session: transaction }
    ).lean() as unknown as SessionRecord | null;
    if (record) await renewSecuritySession(record.auditId, record.expiresAt, renewedAt, securityRequestContext(req), transaction);
    return record;
  });

  if (!updated) return null;
  return { user: current.user, session: sessionDetails(updated) };
}

export async function revokeSession(req: NextRequest, response: NextResponse) {
  const tokenHash = hashSessionToken(req.cookies.get(sessionCookieName())?.value);
  if (tokenHash) {
    await endSession(tokenHash, "logout", securityRequestContext(req));
  }

  response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(), expires: new Date(0), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
}

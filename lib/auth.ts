import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
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

type SessionRecord = {
  tokenHash: string;
  userId: { toString(): string };
  expiresAt: Date;
  absoluteExpiresAt: Date;
};

export type AuthUser = { id: string; name: string; email: string; role: string };

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

  const user = await User.findById(session.userId).select("_id name email role").lean();

  if (!user || isSessionExpired(session.expiresAt, session.absoluteExpiresAt, Date.now())) return null;

  const data = user as unknown as AuthUser & { _id: { toString(): string } };
  return {
    session,
    user: { id: data._id.toString(), name: data.name, email: data.email, role: data.role },
  };
}

export async function getAuthUser(req: NextRequest) {
  if (!isTrustedMutation(req)) return null;

  return (await lookupSession(req.cookies.get(sessionCookieName())?.value))?.user ?? null;
}

export async function getCurrentUser() {
  const store = await cookies();
  return (await lookupSession(store.get(sessionCookieName())?.value))?.user ?? null;
}

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

export async function createSession(userId: string, req: NextRequest, response: NextResponse) {
  await connectDB();
  const previousHash = hashSessionToken(req.cookies.get(sessionCookieName())?.value);
  if (previousHash) await Session.deleteOne({ tokenHash: previousHash });

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token)!;
  const now = Date.now();
  const absoluteExpiresAt = new Date(now + SESSION_ABSOLUTE_MS);
  const expiresAt = nextSessionExpiry(now, absoluteExpiresAt.getTime(), sessionIdleMs());

  await Session.create({ tokenHash, userId, lastActiveAt: new Date(now), expiresAt, absoluteExpiresAt });
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

  const expiresAt = nextSessionExpiry(now, current.session.absoluteExpiresAt.getTime(), sessionIdleMs());
  const updated = await Session.findOneAndUpdate(
    { tokenHash: current.session.tokenHash, expiresAt: { $gt: new Date(now) }, absoluteExpiresAt: { $gt: new Date(now) } },
    { $max: { expiresAt, lastActiveAt: new Date(now) } },
    { new: true }
  ).lean() as unknown as SessionRecord | null;

  if (!updated) return null;
  return { user: current.user, session: sessionDetails(updated) };
}

export async function revokeSession(req: NextRequest, response: NextResponse) {
  const tokenHash = hashSessionToken(req.cookies.get(sessionCookieName())?.value);
  if (tokenHash) {
    await connectDB();
    await Session.deleteOne({ tokenHash });
  }

  response.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(), expires: new Date(0), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
}

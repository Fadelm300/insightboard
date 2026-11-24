import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "@/models/User";
import Session from "@/models/Session";
import UserAuditEvent from "@/models/UserAuditEvent";
import {
  canDelegatePermissions, canManageUser, getPermissions, isAccountEnabled,
  PERMISSIONS, withPermissionDependencies, type Permission,
  type PermissionSubject,
} from "@/lib/permissions";

export const SAFE_USER_FIELDS = "_id name email role isActive allowedPermissions managedBy authVersion createdAt";
type UserRecord = PermissionSubject & {
  _id: { toString(): string }; name: string; email: string;
  managedBy?: { toString(): string } | null; authVersion?: number; createdAt?: Date;
};
export type UserInput = {
  name: string; email?: string; role: string; allowedPermissions: string[];
  isActive: boolean; password?: string;
  managerId?: string | null; version?: number;
};

export class UserManagementError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function publicUser(record: UserRecord) {
  // The management editor needs the configured grants even while sign-in is disabled.
  const allowedPermissions = getPermissions({
    role: record.role,
    allowedPermissions: record.allowedPermissions,
  });
  return {
    id: record._id.toString(), name: record.name, email: record.email, role: record.role,
    isActive: record.isActive !== false, allowedPermissions,
    managedBy: record.managedBy?.toString() ?? null, createdAt: record.createdAt,
    version: record.authVersion ?? 0,
  };
}

export function validateUserInput(body: unknown, creating: boolean): UserInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new UserManagementError(400, "Invalid user data");
  }
  const data = body as Record<string, unknown>;
  const fields = ["name", "role", "allowedPermissions", "isActive", "password", "managerId", ...(creating ? ["email"] : ["version"])];
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new UserManagementError(400, "Unsupported user field");
  }
  if (typeof data.name !== "string" || data.name.trim().length < 2 || data.name.trim().length > 80 || /[<>\x00-\x1f]/.test(data.name)) {
    throw new UserManagementError(400, "Name must be between 2 and 80 characters");
  }
  if (typeof data.role !== "string" || !Array.isArray(data.allowedPermissions) ||
    data.allowedPermissions.length > PERMISSIONS.length || data.allowedPermissions.some((permission) => typeof permission !== "string")) {
    throw new UserManagementError(400, "Invalid role or permissions");
  }
  if (typeof data.isActive !== "boolean") {
    throw new UserManagementError(400, "Invalid account status");
  }
  if (!creating && (!Number.isSafeInteger(data.version) || (data.version as number) < 0)) {
    throw new UserManagementError(400, "An account version is required");
  }
  if (data.managerId !== undefined && data.managerId !== null &&
      (typeof data.managerId !== "string" || !/^[a-f0-9]{24}$/i.test(data.managerId))) {
    throw new UserManagementError(400, "Invalid manager id");
  }
  const knownGrants = (data.allowedPermissions as string[]).filter((grant): grant is Permission =>
    PERMISSIONS.some((permission) => permission === grant),
  );
  const missing = withPermissionDependencies(knownGrants).filter((permission) => !(data.allowedPermissions as string[]).includes(permission));
  if (missing.length) throw new UserManagementError(400, `Required permissions: ${missing.join(", ")}`);
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (creating && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new UserManagementError(400, "Invalid email address");
  }
  if (creating || data.password !== undefined) {
    if (typeof data.password !== "string" || data.password.length < 12 || Buffer.byteLength(data.password, "utf8") > 72) {
      throw new UserManagementError(400, "Password must be at least 12 characters and no more than 72 UTF-8 bytes");
    }
  }
  return {
    name: data.name.trim(), ...(creating ? { email } : {}), role: data.role,
    allowedPermissions: [...new Set(data.allowedPermissions as string[])],
    isActive: data.isActive !== false,
    ...(typeof data.password === "string" ? { password: data.password } : {}),
    ...(data.managerId !== undefined ? { managerId: data.managerId as string | null } : {}),
    ...(!creating ? { version: data.version as number } : {}),
  };
}

/** Bound input before parsing JSON. No environment values or credentials are logged. */
export async function readUserInput(req: Request, creating: boolean) {
  if (!req.body) throw new UserManagementError(400, "Invalid user data");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        throw new UserManagementError(413, "User data is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new UserManagementError(400, "Invalid JSON"); }
  return validateUserInput(body, creating);
}

type Actor = PermissionSubject & { id: string };

function assertDelegation(actor: Actor, input: UserInput) {
  if (!canDelegatePermissions(actor, input.role, input.allowedPermissions)) {
    throw new UserManagementError(403, "Cannot assign this role or permission set");
  }
}

export function isManagedTarget(actor: Actor, target: UserRecord) {
  if (actor.id === target._id.toString() || !canManageUser(actor, target.role)) return false;
  return actor.role !== "manager" || target.managedBy?.toString() === actor.id;
}

/** Each mutation re-reads the actor inside the same transaction as user/session/audit writes. */
export async function saveManagedUser(actor: Actor, input: UserInput, targetId?: string) {
  assertDelegation(actor, input);
  // Hash outside the transaction to keep the database transaction short.
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const actorRecord = await User.findById(actor.id).select(SAFE_USER_FIELDS).session(session).lean() as UserRecord | null;
      if (!actorRecord || !isAccountEnabled(actorRecord)) {
        throw new UserManagementError(403, "Forbidden");
      }
      const currentActor = { ...actorRecord, id: actor.id };
      assertDelegation(currentActor, input);
      let managedBy: string | null | undefined;
      if (currentActor.role === "manager") {
        if (input.managerId !== undefined && input.managerId !== actor.id) {
          throw new UserManagementError(403, "Cannot assign another manager's team");
        }
        managedBy = actor.id;
      } else if (input.managerId !== undefined) {
        if (input.managerId === null) managedBy = null;
        else {
          const manager = await User.findById(input.managerId).select("_id role isActive").session(session).lean() as UserRecord | null;
          if (!manager || manager.role !== "manager" || !isAccountEnabled(manager)) {
            throw new UserManagementError(400, "Select an active manager");
          }
          managedBy = input.managerId;
        }
      }
      let saved;
      if (targetId) {
        const target = await User.findById(targetId).select(SAFE_USER_FIELDS).session(session).lean() as UserRecord | null;
        if (!target || !isManagedTarget(currentActor, target)) {
          throw new UserManagementError(404, "User not found");
        }
        const currentVersion = target.authVersion ?? 0;
        if (input.version !== currentVersion) throw new UserManagementError(409, "Account changed. Reload and try again");
        saved = await User.findOneAndUpdate(
          { _id: targetId, $or: [{ authVersion: currentVersion }, ...(currentVersion === 0 ? [{ authVersion: { $exists: false } }] : [])] },
          {
            $set: {
              name: input.name, role: input.role, allowedPermissions: input.allowedPermissions,
              isActive: input.isActive, ...(passwordHash ? { password: passwordHash } : {}),
              ...(managedBy !== undefined ? { managedBy } : {}),
            },
            $inc: { authVersion: 1 },
          },
          { returnDocument: "after", runValidators: true, session },
        ).select(SAFE_USER_FIELDS).lean() as UserRecord | null;
        if (!saved) throw new UserManagementError(409, "Account changed. Reload and try again");
        await Session.deleteMany({ userId: targetId }).session(session);
      } else {
        if (!passwordHash || !input.email) throw new UserManagementError(400, "Missing account credentials");
        const records = await User.create([{
          name: input.name, email: input.email, password: passwordHash, role: input.role,
          allowedPermissions: input.allowedPermissions, isActive: input.isActive,
          managedBy: managedBy === undefined ? actor.id : managedBy, authVersion: 0,
        }], { session });
        saved = records[0] as unknown as UserRecord;
      }
      await UserAuditEvent.create([{
        actorId: actor.id, targetId: saved._id,
        action: targetId ? "user.updated" : "user.created",
        changedFields: ["name", "role", "allowedPermissions", "isActive", ...(passwordHash ? ["password"] : []), ...(managedBy !== undefined ? ["managedBy"] : [])],
      }], { session });
      return publicUser(saved);
    });
  } finally {
    await session.endSession();
  }
}

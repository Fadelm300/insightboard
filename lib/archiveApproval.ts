import { createHash } from "node:crypto";
import { type ClientSession } from "mongoose";
import User from "@/models/User";
import Client from "@/models/Client";
import Deal from "@/models/Deal";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";
import ArchiveRequest from "@/models/ArchiveRequest";
import ArchiveRequestEvent from "@/models/ArchiveRequestEvent";
import { withCrmWriteTransaction } from "@/lib/crmWriteTransaction";
import { archiveCrmRecord } from "@/lib/crmArchive";
import { changeFinancialArchive } from "@/lib/financialArchive";
import { hasPermission, isAccountEnabled, type Permission } from "@/lib/permissions";
import {
  ARCHIVE_RESOURCES,
  canRequestArchive,
  canReviewArchive,
  type ApprovalAccount,
  type ArchiveResource,
} from "@/lib/archiveApprovalPolicy";

const businessModels = {
  clients: Client,
  deals: Deal,
  projects: Project,
  revenue: Revenue,
  expenses: Expense
};
const ACCOUNT_FIELDS = "_id role isActive allowedPermissions managedBy";

export class ArchiveApprovalError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function account(
  record: {
    _id: { toString(): string };
    role: string;
    managedBy?: { toString(): string } | null
  }
) {
  return {
    ...record,
    id: record._id.toString(),
    managedBy: record.managedBy?.toString() ?? null
  } as ApprovalAccount;
}

async function currentAccount(id: string, session?: ClientSession, requireEnabled = true) {
  // A real version write serializes approval decisions with concurrent account
  // changes; it never changes grants, credentials, or authentication revisions.
  const query = session
    ? User.findOneAndUpdate(
      { _id: id },
      { $inc: { __v: 1 } },
      { session, returnDocument: "after", timestamps: false }
    )
    : User.findById(id);
  const record = await query.select(ACCOUNT_FIELDS).lean();
  if (!record || (requireEnabled && !isAccountEnabled(record)))
    throw new ArchiveApprovalError(403, "Account is unavailable");
  return account(record);
}

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toHexString" in value
    && typeof value.toHexString === "function")
    return value.toHexString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(
      ([key, item]) => [key, canonical(item)]
    ),
  );
  return value;
}

export function archiveRecordVersion(record: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(record))).digest("hex");
}

function publicRequest(record: Record<string, unknown>, actorId: string, names = new Map<string, string>()) {
  return {
    id: String(record._id),
    resource: record.resource,
    recordId: String(record.recordId),
    label: record.label,
    reason: record.reason,
    status: record.status,
    own: String(record.requesterId) === actorId,
    requesterId: String(record.requesterId),
    requesterName: names.get(String(record.requesterId)) ?? "Account",
    decidedByName: record.decidedBy ? names.get(String(record.decidedBy)) ?? "Account" : null,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    decidedAt: record.decidedAt ?? null,
    decisionReason: record.decisionReason ?? null,
  };
}

export async function listArchiveRequests(actorId: string, page: number) {
  const actor = await currentAccount(actorId);
  if (!hasPermission(actor, "archiveRequests.read")) throw new ArchiveApprovalError(403, "Forbidden");
  const readable = ARCHIVE_RESOURCES.filter((resource) => hasPermission(actor, `${resource}.read` as Permission));
  const reviewable = readable.filter((resource) => hasPermission(actor, `${resource}.delete` as Permission));
  const scopes: Record<string, unknown>[] = [{ requesterId: actorId, resource: { $in: readable } }];
  if (hasPermission(actor, "archiveRequests.review") && ["admin", "manager"].includes(actor.role)) {
    scopes.push(
      {
        ...(actor.role === "manager" ? { assignedManagerId: actorId } : {}),
        resource: { $in: reviewable }
      }
    );
  }
  const records = await ArchiveRequest.find({ $or: scopes }).sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * 25).limit(26).lean();
  const visible = records.slice(0, 25);
  const participantIds = [...new Set(visible.flatMap(
    (record: Record<string, unknown>) => [record.requesterId, record.decidedBy].filter(Boolean).map(String)
  ))];
  const participants = participantIds.length
    ? await User.find({ _id: { $in: participantIds } }).select("_id name").lean()
    : [];
  const names = new Map<string, string>(participants.map((user: {
    _id: unknown;
    name: string
  }) => [String(user._id), user.name]));
  return {
    records: visible.map((record: Record<string, unknown>) => publicRequest(record, actorId, names)),
    page,
    hasMore: records.length > 25
  };
}

export async function requestArchive(actorId: string, resource: ArchiveResource, recordId: string, reason: string) {
  return withCrmWriteTransaction(async (session) => {
    const actor = await currentAccount(actorId, session);
    if (!canRequestArchive(actor, resource)) throw new ArchiveApprovalError(403, "Forbidden");
    const record = await businessModels[resource].findOne({ _id: recordId, isDeleted: { $ne: true } }).session(session).lean();
    if (!record) throw new ArchiveApprovalError(404, "Active record not found");
    const existing = await ArchiveRequest.findOne({
      requesterId: actorId,
      resource,
      recordId,
      status: "pending"
    }).session(
      session
    );
    if (existing)
      throw new ArchiveApprovalError(409, "A pending request already exists. Cancel it before creating another");
    const label = String(record.companyName ?? record.title ?? record.name ?? `${resource} ${recordId}`).slice(0, 120);
    const [request] = await ArchiveRequest.create([{
      resource,
      recordId,
      label,
      recordVersion: archiveRecordVersion(record),
      requesterId: actorId,
      assignedManagerId: actor.managedBy,
      reason,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }], { session });
    await ArchiveRequestEvent.create(
      [{
        requestId: request._id,
        actorId,
        action: "requested",
        reason
      }],
      { session }
    );
    return publicRequest(request.toObject(), actorId);
  });
}

export async function decideArchiveRequest(actorId: string, id: string, action: "approve" | "reject" | "cancel", reason: string) {
  return withCrmWriteTransaction(async (session) => {
    const actor = await currentAccount(actorId, session);
    if (!hasPermission(actor, "archiveRequests.read")) throw new ArchiveApprovalError(403, "Forbidden");
    const request = await ArchiveRequest.findById(id).session(session);
    if (!request) throw new ArchiveApprovalError(404, "Request not found");
    const resource = request.resource as ArchiveResource;
    if (!hasPermission(actor, `${resource}.read` as Permission))
      throw new ArchiveApprovalError(403, "Forbidden");
    const own = String(request.requesterId) === actorId;
    if (action === "cancel") {
      if (!own) throw new ArchiveApprovalError(403, "Only the requester can cancel this request");
    } else {
      if (own) throw new ArchiveApprovalError(403, "You cannot review your own request");
      const requester = await currentAccount(String(request.requesterId), session, action === "approve");
      if (!canReviewArchive(actor, requester, resource, request.assignedManagerId?.toString() ?? null)) {
        throw new ArchiveApprovalError(403, "You cannot review this request");
      }
      if (action === "approve" && !canRequestArchive(requester, resource)) {
        throw new ArchiveApprovalError(409, "Requester permissions changed. Reject this request");
      }
    }
    if (request.status !== "pending")
      throw new ArchiveApprovalError(409, "This request has already been decided");
    const now = new Date();
    const expired = request.expiresAt.getTime() <= now.getTime();
    if (action === "approve" && !expired) {
      const record = await businessModels[resource].findOne({ _id: request.recordId, isDeleted: { $ne: true } }).session(
        session
      ).lean();
      if (!record || archiveRecordVersion(record) !== request.recordVersion) {
        throw new ArchiveApprovalError(409, "Record changed or was archived. Reject this request and create a new one");
      }
      const outcome = resource === "revenue" || resource === "expenses"
        ? await changeFinancialArchive(resource, String(request.recordId), actorId, "archive")
        : await archiveCrmRecord(resource, String(request.recordId), actorId);
      if (outcome !== "changed" && outcome !== "archived") {
        throw new ArchiveApprovalError(409, "Archive blocked by current record state or linked active records");
      }
    }
    const status = action === "cancel"
      ? "cancelled"
      : expired ? "expired" : action === "approve" ? "approved" : "rejected";
    const result = await ArchiveRequest.updateOne({ _id: id, status: "pending" }, {
      $set: {
        status,
        decidedBy: actorId,
        decisionReason: reason,
        decidedAt: now
      },
    }, { session });
    if (result.matchedCount !== 1) throw new ArchiveApprovalError(409, "Request state changed");
    await ArchiveRequestEvent.create([{
      requestId: id,
      actorId,
      action: status,
      reason
    }], { session });
    return { status };
  });
}

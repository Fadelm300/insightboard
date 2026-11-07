import mongoose from "mongoose";
import Client from "@/models/Client";
import Deal from "@/models/Deal";
import CrmArchiveEvent from "@/models/CrmArchiveEvent";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";

const models = { clients: Client, deals: Deal, projects: Project };
export type CrmArchiveResource = keyof typeof models;

export function isCrmArchiveResource(value: string): value is CrmArchiveResource {
  return Object.hasOwn(models, value);
}

export async function listCrmArchive(resource: CrmArchiveResource, page: number) {
  const records = await models[resource].find({ isDeleted: true })
    .select("_id companyName title name clientId dealId")
    .sort({ _id: -1 }).skip((page - 1) * 25).limit(26).lean();

  return {
    records: records.slice(0, 25).map((record) => ({
      _id: record._id,
      label: record.companyName ?? record.title ?? record.name,
      clientId: record.clientId,
      dealId: record.dealId,
    })),
    page,
    hasMore: records.length > 25,
  };
}

export async function restoreCrmRecord(resource: CrmArchiveResource, id: string, actorId: string) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const model = models[resource];
      const filter = { _id: id, isDeleted: true };
      const record = await model.findOne(filter).select("clientId dealId").session(session);
      if (!record) return "missing";

      if (resource !== "clients") {
        const client = record.clientId && await Client.exists({
          _id: record.clientId, isDeleted: { $ne: true },
        }).session(session);
        if (!client) return "parent-unavailable";
      }

      if (resource === "projects" && record.dealId) {
        const deal = await Deal.exists({
          _id: record.dealId, clientId: record.clientId, status: "Closed Won", isDeleted: { $ne: true },
        }).session(session);
        if (!deal) return "parent-unavailable";
      }

      const result = await model.updateOne(filter, { $set: { isDeleted: false } }, { session });
      if (result.matchedCount !== 1) return "missing";
      await CrmArchiveEvent.create(
        [{ actorId, recordId: id, resource, action: "restore" }],
        { session },
      );
      return "restored";
    });
  } finally {
    await session.endSession();
  }
}


/** Checks existing active dependants in the same snapshot as the archive write. */
export async function archiveCrmRecord(
  resource: CrmArchiveResource,
  id: string,
  actorId: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const model = models[resource];
      const filter = { _id: id, isDeleted: { $ne: true } };
      const record = await model.findOne(filter).select("_id").session(session);
      if (!record) return "missing";

      const active = { isDeleted: { $ne: true } };
      if (resource === "clients") {
        if (await Deal.exists({ clientId: id, ...active }).session(session)) return "active-dependants";
        if (await Project.exists({ clientId: id, ...active }).session(session)) return "active-dependants";
        if (await Revenue.exists({ clientId: id, ...active }).session(session)) return "active-dependants";
      }
      if (resource === "deals") {
        if (await Project.exists({ dealId: id, ...active }).session(session)) return "active-dependants";
      }
      if (resource === "projects") {
        if (await Revenue.exists({ projectId: id, ...active }).session(session)) return "active-dependants";
        if (await Expense.exists({ projectId: id, ...active }).session(session)) return "active-dependants";
      }

      const result = await model.updateOne(filter, { $set: { isDeleted: true } }, { session });
      if (result.matchedCount !== 1) return "missing";
      await CrmArchiveEvent.create(
        [{ actorId, recordId: id, resource, action: "archive" }],
        { session },
      );
      return "archived";
    });
  } finally {
    await session.endSession();
  }
}

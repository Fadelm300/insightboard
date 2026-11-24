import { withCrmWriteTransaction } from "@/lib/crmWriteTransaction";
import Client from "@/models/Client";
import Expense from "@/models/Expense";
import FinancialArchiveEvent from "@/models/FinancialArchiveEvent";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";

export type FinancialResource = "revenue" | "expenses";

function financialModel(resource: FinancialResource) {
  return resource === "revenue" ? Revenue : Expense;
}

export async function listFinancialArchive(resource: FinancialResource, page: number) {
  return financialModel(resource)
    .find({ isDeleted: true })
    .select("_id projectId amount deletedAt")
    .sort({ deletedAt: -1, _id: -1 })
    .skip((page - 1) * 25)
    .limit(26)
    .lean();
}

export async function changeFinancialArchive(
  resource: FinancialResource,
  recordId: string,
  actorId: string,
  action: "archive" | "restore",
) {
  return withCrmWriteTransaction(async (session) => {
      const model = financialModel(resource);
      const restoring = action === "restore";
      const filter = { _id: recordId, isDeleted: restoring ? true : { $ne: true } };
      if (restoring) {
        const record = await model.findOne(filter).select("projectId clientId").session(session);
        if (!record) return "missing";
        const project = await Project.findOne({
          _id: record.projectId, isDeleted: { $ne: true },
        }).select("clientId").session(session);
        if (!project || (record.clientId && !record.clientId.equals(project.clientId))) {
          return "parent-unavailable";
        }
        const client = await Client.exists({
          _id: project.clientId, isDeleted: { $ne: true },
        }).session(session);
        if (!client) return "parent-unavailable";
      }

      const now = new Date();
      const update = restoring
        ? { $set: { isDeleted: false }, $unset: { deletedAt: 1 } }
        : { $set: { isDeleted: true, deletedAt: now } };
      const result = await model.updateOne(filter, update, { session });
      if (result.matchedCount !== 1) return "missing";
      await FinancialArchiveEvent.create(
        [{ actorId, recordId, resource, action, createdAt: now }],
        { session },
      );
      return "changed";
  });
}

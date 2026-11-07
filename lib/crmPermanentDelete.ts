import mongoose from "mongoose";
import Client from "@/models/Client";
import Deal from "@/models/Deal";
import Project from "@/models/Project";
import Revenue from "@/models/Revenue";
import Expense from "@/models/Expense";
import CrmDeletionEvent from "@/models/CrmDeletionEvent";
import type { CrmArchiveResource } from "@/lib/crmArchive";

const models = { clients: Client, deals: Deal, projects: Project };

/** Only archived leaves may be removed; archived dependants also block deletion. */
export async function permanentlyDeleteCrmRecord(
  resource: CrmArchiveResource,
  id: string,
  actorId: string,
  confirmation: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const model = models[resource];
      const filter = { _id: id, isDeleted: true };
      const record = await model.findOne(filter)
        .select("_id companyName title name").session(session);
      if (!record) return "missing";

      const label = record.companyName ?? record.title ?? record.name;
      const expected = typeof label === "string" && label.length ? label : id;
      if (confirmation !== expected) return "confirmation-mismatch";

      // No isDeleted filter: even archived related data must remain linked.
      if (resource === "clients") {
        if (await Deal.exists({ clientId: id }).session(session)) return "has-dependants";
        if (await Project.exists({ clientId: id }).session(session)) return "has-dependants";
        if (await Revenue.exists({ clientId: id }).session(session)) return "has-dependants";
      }
      if (resource === "deals") {
        if (await Project.exists({ dealId: id }).session(session)) return "has-dependants";
      }
      if (resource === "projects") {
        if (await Revenue.exists({ projectId: id }).session(session)) return "has-dependants";
        if (await Expense.exists({ projectId: id }).session(session)) return "has-dependants";
      }

      const result = await model.deleteOne(filter, { session });
      if (result.deletedCount !== 1) return "missing";
      // Do not retain the deleted name, confirmation text, or record contents.
      await CrmDeletionEvent.create(
        [{ actorId, recordId: id, resource, action: "permanent-delete" }],
        { session },
      );
      return "deleted";
    });
  } finally {
    await session.endSession();
  }
}

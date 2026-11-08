import { AsyncLocalStorage } from "node:async_hooks";
import mongoose, { type ClientSession } from "mongoose";
import CrmWriteLock from "@/models/CrmWriteLock";

const LOCK_ID = "single-company-crm";
const context = new AsyncLocalStorage<ClientSession>();

let lockReady: Promise<unknown> | undefined;

async function ensureLock() {
  if (!lockReady) {
    lockReady = CrmWriteLock.updateOne(
      { _id: LOCK_ID },
      { $setOnInsert: { _id: LOCK_ID } },
      { upsert: true },
    ).catch(async (error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000 &&
        (await CrmWriteLock.exists({ _id: LOCK_ID }))
      ) {
        return;
      }

      lockReady = undefined;
      throw error;
    });
  }

  await lockReady;
}

/** Serialize business writes across instances; acquire before relationship reads. */
export async function withCrmWriteTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const inherited = context.getStore();

  if (inherited) {
    return operation(inherited);
  }

  await ensureLock();

  return mongoose.connection.transaction(
    async (session) => {
      const result = await CrmWriteLock.updateOne(
        { _id: LOCK_ID },
        { $set: { token: new mongoose.Types.ObjectId() } },
        { session },
      );

      if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
        throw new Error("CRM write coordination unavailable");
      }

      return context.run(session, () => operation(session));
    },
    {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    },
  );
}

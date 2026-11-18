import assert from "node:assert/strict";
import test from "node:test";
import { compareInventories, inventory, localDrillBase } from "../scripts/verify-db-restore.mjs";

function database(documents, indexes = [{ name: "_id_", key: { _id: 1 } }]) {
  return {
    listCollections: () => ({ toArray: async () => [{ name: "projects", type: "collection" }] }),
    collection: () => ({
      listIndexes: () => ({ toArray: async () => indexes.slice() }),
      find: () => ({
        sort: ({ _id }) => {
          assert.equal(_id, 1);
          return documents.slice().sort((a, b) => a._id - b._id);
        },
      }),
    }),
  };
}

test("restore drill accepts only a dedicated loopback endpoint", () => {
  assert.equal(localDrillBase("mongodb://127.0.0.1:27110/"), "mongodb://127.0.0.1:27110/");
  for (const uri of [
    "mongodb://127.0.0.1:27110/production",
    "mongodb://127.0.0.1:27110/?replicaSet=rs0",
    "mongodb://user:password@127.0.0.1:27110/",
    "mongodb://example.invalid:27110/",
  ]) assert.throws(() => localDrillBase(uri));
});

test("same records and indexes compare equal; equal counts with different content fail", async () => {
  const original = [{ _id: 2, amount: 100 }, { _id: 1, amount: 80 }];
  const source = await inventory(database(original), JSON.stringify);
  const copy = await inventory(database(original.slice().reverse()), JSON.stringify);
  assert.deepEqual(compareInventories(source, copy), []);

  const changed = await inventory(database([{ _id: 1, amount: 81 }, original[0]]), JSON.stringify);
  assert.deepEqual(compareInventories(source, changed), [{ name: "projects", reason: "record content" }]);
});

test("missing collections, empty sources, and different unique indexes fail verification", async () => {
  const records = [{ _id: 1, dealId: "example" }];
  const index = { name: "unique_project_deal_link", key: { dealId: 1 }, unique: true };
  const source = await inventory(database(records, [index]), JSON.stringify);
  const weak = await inventory(database(records, [{ ...index, unique: false }]), JSON.stringify);
  assert.deepEqual(compareInventories(source, weak), [{ name: "projects", reason: "index definitions" }]);
  assert.deepEqual(compareInventories(source, {}), [{ name: "projects", reason: "collection missing from one side" }]);
  assert.throws(() => compareInventories({}, {}));
  assert.throws(() => compareInventories({ projects: { count: 0 } }, {}));
});

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const sourceName = "insightboard_restore_source";
const targetName = "insightboard_restore_target";

export function localDrillBase(value) {
  const url = new URL(value);
  if (url.protocol !== "mongodb:" || url.hostname !== "127.0.0.1" ||
      !url.port || url.username || url.password || url.pathname !== "/" ||
      url.search || url.hash) {
    throw new Error("Use an isolated local MongoDB at mongodb://127.0.0.1:PORT/");
  }
  return url.href;
}

function sortedNames(items) {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function inventory(db, encode) {
  const result = {};
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name, type } of sortedNames(collections)) {
    if (name.startsWith("system.") || type !== "collection") continue;

    const collection = db.collection(name);
    const indexes = sortedNames(await collection.listIndexes().toArray()).map(
      ({ name, key, unique, sparse, expireAfterSeconds, partialFilterExpression, collation }) =>
        encode({ name, key, unique, sparse, expireAfterSeconds, partialFilterExpression, collation }),
    );
    const digest = createHash("sha256");
    let count = 0;
    for await (const doc of collection.find().sort({ _id: 1 })) {
      digest.update(encode(doc)).update("\n");
      count += 1;
    }
    Object.defineProperty(result, name, {
      value: { count, digest: digest.digest("hex"), indexes }, enumerable: true,
    });
  }
  return result;
}

export function compareInventories(source, restored) {
  const expected = Object.keys(source);
  if (!expected.length || !Object.values(source).some(({ count }) => count > 0)) {
    throw new Error("The source must contain seeded drill records.");
  }
  const names = [...new Set([...expected, ...Object.keys(restored)])].sort();
  return names.flatMap((name) => {
    const before = Object.hasOwn(source, name) ? source[name] : null;
    const after = Object.hasOwn(restored, name) ? restored[name] : null;
    if (!before || !after) return [{ name, reason: "collection missing from one side" }];
    const differences = [];
    if (before.count !== after.count) differences.push("record count");
    if (before.digest !== after.digest) differences.push("record content");
    if (JSON.stringify(before.indexes) !== JSON.stringify(after.indexes)) differences.push("index definitions");
    return differences.length ? [{ name, reason: differences.join(", ") }] : [];
  });
}

async function main() {
  const base = localDrillBase(process.argv[2]);
  const { default: mongoose } = await import("mongoose");
  const { MongoClient, BSON } = mongoose.mongo;
  const client = new MongoClient(base, { serverSelectionTimeoutMS: 3000, directConnection: true });
  const encode = (value) => BSON.EJSON.stringify(value, { relaxed: false });
  try {
    await client.connect();
    const source = await inventory(client.db(sourceName), encode);
    const restored = await inventory(client.db(targetName), encode);
    const differences = compareInventories(source, restored);
    for (const { name, reason } of differences) console.error(JSON.stringify({ name, reason }));
    if (differences.length) throw new Error("Restore verification failed.");
    console.log(`PASS: document counts, content, and indexes match across ${Object.keys(source).length} collections.`);
  } finally {
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("Restore drill verification did not complete. Check the isolated MongoDB and both drill databases.");
    process.exitCode = 1;
  });
}

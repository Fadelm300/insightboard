import { randomBytes } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { buildInvestorDemo } from "./investor-demo-data.mjs";

export function validateInvestorTarget(uri, expectedDatabase) {
  if (typeof expectedDatabase !== "string"
    || !/^[a-zA-Z0-9_-]{1,63}$/.test(expectedDatabase)
    || ["admin", "config", "local"].includes(expectedDatabase.toLowerCase())) {
    throw new Error("Set INVESTOR_DATABASE_NAME to the exact Atlas database selected for the presentation");
  }
  const target = new URL(uri || "about:blank");
  if (!["mongodb:", "mongodb+srv:"].includes(target.protocol)
    || decodeURIComponent(target.pathname.slice(1)) !== expectedDatabase
    || !target.hostname || !target.username || !target.password) {
    throw new Error("Unexpected seed target");
  }
  return expectedDatabase;
}

async function provision(data, uri, passwordFile) {
  const database = validateInvestorTarget(uri, process.env.INVESTOR_DATABASE_NAME);
  if (!passwordFile || !isAbsolute(passwordFile)) {
    throw new Error("Use an absolute password-file path outside the repository");
  }
  const parent = await realpath(dirname(passwordFile));
  const target = join(parent, basename(passwordFile));
  const repository = await realpath(dirname(dirname(fileURLToPath(import.meta.url))));
  const location = relative(repository, target);
  if (!location.startsWith(`..${sep}`) && !isAbsolute(location)) {
    throw new Error("Use an absolute password-file path outside the repository");
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, autoIndex: false, autoCreate: false });
    const connection = mongoose.connection;
    if (connection.name !== database) throw new Error("Unexpected seed target");
    const collections = Object.keys(data);
    const counts = await Promise.all(collections.map((name) => connection.collection(name).countDocuments({})));
    if (counts.some(Boolean)) throw new Error("Demo database is not empty");

    await connection.collection("users").createIndex({ email: 1 }, { unique: true });
    await connection.collection("projects").createIndex(
      { dealId: 1 },
      { name: "unique_project_deal_link", unique: true, partialFilterExpression: { dealId: { $type: "objectId" } } },
    );
    const credentials = [];
    for (const user of data.users) {
      const password = randomBytes(24).toString("base64url");
      user.password = await bcrypt.hash(password, 12);
      credentials.push({ email: user.email, password });
    }

    const file = await open(target, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(credentials, null, 2) + "\n");
      await file.sync();
    } finally {
      await file.close();
    }

    await connection.transaction(async (session) => {
      // The unique marker serializes concurrent initializations without overwriting records.
      await connection.collection("demoProvisioning").insertOne(
        { _id: "investor-initial", createdAt: new Date() }, { session },
      );
      for (const name of collections) {
        const collection = connection.collection(name);
        if (await collection.countDocuments({}, { session })) throw new Error("Demo database is not empty");
        await collection.insertMany(data[name], { session, ordered: true });
      }
    });
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const data = buildInvestorDemo();
  const counts = Object.fromEntries(Object.entries(data).map(([name, records]) => [name, records.length]));
  if (args.length === 0 || (args.length === 1 && args[0] === "--dry-run")) {
    console.log("Investor demo preview. No database connection or passwords created.");
    console.table(counts);
    return;
  }
  if (args.length !== 2 || args[0] !== "--apply") {
    throw new Error("Use --dry-run or --apply followed by a private password-file path");
  }
  await provision(data, process.env.INVESTOR_SEED_MONGODB_URI, args[1]);
  console.log("Investor demo transaction committed. Credentials were written to the private file.");
  console.table(counts);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const safe = [
      "Unexpected seed target",
      "Set INVESTOR_DATABASE_NAME to the exact Atlas database selected for the presentation",
      "Use an absolute password-file path outside the repository",
      "Demo database is not empty",
      "Use --dry-run or --apply followed by a private password-file path",
    ];
    const message = safe.includes(error.message) ? error.message
      : error.code === "EEXIST" ? "The password file already exists."
      : "Provisioning failed. Verify the demo DB permissions and connectivity, transaction status, and private password file before retrying.";
    console.error(message);
    process.exitCode = 1;
  });
}

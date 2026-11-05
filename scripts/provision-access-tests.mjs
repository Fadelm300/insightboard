import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { accessTestPlan, ACCESS_TEST_BATCH, validateFixturePassword, validateLocalTestUrl } from "./access-test-plan.mjs";
import { validateDevelopmentTarget } from "./create-dev-user.mjs";
import { AccessVerificationError, verifyAccessTests } from "./verify-access-tests.mjs";

/** No upsert, updates, resets, environment writes, CRM writes, or credential files. */
export async function provisionAccessTests(db, bcrypt, password, session, ObjectId) {
  validateFixturePassword(password);
  if (db.databaseName !== "insightboard_dev") throw new Error("Unexpected database");
  const plan = accessTestPlan();
  const users = db.collection("users");
  const emails = plan.map((account) => account.email);
  const untouchedFilter = { email: { $nin: emails } };
  const digest = (records) => createHash("sha256").update(JSON.stringify(records)).digest("hex");
  let rows;
  await session.withTransaction(async () => {
    if (await users.countDocuments({ email: { $in: emails } }, { session })) {
      throw new Error("Some test identities already exist; no account was overwritten");
    }
    const before = digest(await users.find(untouchedFilter, { session }).sort({ _id: 1 }).toArray());
    const ids = Object.fromEntries(plan.map((account) => [account.key, new ObjectId()]));
    rows = [];
    // bcrypt generates a distinct random salt for every fixture, even with one temporary test password.
    for (const account of plan) {
      rows.push({
        _id: ids[account.key], name: account.name, email: account.email,
        password: await bcrypt.hash(password, 12), role: account.role,
        isActive: account.isActive !== false,
        ...(account.allowedPermissions ? { allowedPermissions: account.allowedPermissions } : {}),
        managedBy: account.manager ? ids[account.manager] : null,
        authVersion: 0, testBatch: ACCESS_TEST_BATCH,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }
    await users.insertMany(rows, { session });
    const after = digest(await users.find(untouchedFilter, { session }).sort({ _id: 1 }).toArray());
    if (before !== after) throw new Error("Existing account verification failed");
  });
  return rows.map(({ name, email, role, isActive }) => ({ name, email, role, isActive }));
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Disabled in production");
  validateDevelopmentTarget(process.env.MONGODB_URI);
  const verifyIndex = process.argv.indexOf("--verify");
  const verifyUrl = verifyIndex === -1 ? null : validateLocalTestUrl(process.argv[verifyIndex + 1]);
  if (!process.stdin.isTTY) throw new Error("Run interactively in the project terminal");
  const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write("Temporary password for disposable test accounts (hidden, at least 16 characters): ");
  let password;
  try { password = await prompt.question(""); }
  finally { prompt.close(); process.stdout.write("\n"); }
  validateFixturePassword(password);
  const { default: mongoose } = await import("mongoose");
  const { default: bcrypt } = await import("bcryptjs");
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
    const session = await mongoose.startSession();
    try {
      const result = await provisionAccessTests(mongoose.connection.db, bcrypt, password, session, mongoose.Types.ObjectId);
      console.table(result);
      console.log("Created 10 development-only fixtures. Existing accounts unchanged. No password saved or printed.");
      console.log("Programmer is deliberately disabled. Administration is directory-only, not full provisioning.");
      if (verifyUrl) {
        const results = await verifyAccessTests(verifyUrl, password, { onResult: ({ check }) => console.log(`PASS | ${check}`) });
        console.table(results);
        console.log(`Real HTTP access checks passed: ${results.length}. No CRM records were created, updated or deleted.`);
      }
    } finally { await session.endSession(); }
  } finally { password = undefined; await mongoose.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    if (error instanceof AccessVerificationError) {
      console.error(error.message);
      console.error("Fixtures were created. Use check-access-tests.mjs to retry verification; do not rerun provisioning.");
      process.exitCode = 1;
      return;
    }
    const safe = ["Disabled in production", "Run interactively in the project terminal", "Some test identities already exist; no account was overwritten", "Existing account verification failed"];
    console.error(safe.includes(error?.message) ? error.message : "Setup or verification did not complete. Fixtures may already exist if creation succeeded. No existing account was reset. Check configuration and the local application; do not blindly rerun provisioning.");
    process.exitCode = 1;
  });
}

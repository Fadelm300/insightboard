import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";
import { validateDevelopmentTarget } from "./create-dev-user.mjs";
import { validateFixturePassword, validateLocalTestUrl } from "./access-test-plan.mjs";
import { AccessVerificationError, verifyAccessTests } from "./verify-access-tests.mjs";

/** Verification only: never provisions or resets an account, and never opens a DB connection directly. */
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Disabled in production");
  validateDevelopmentTarget(process.env.MONGODB_URI);
  const origin = validateLocalTestUrl(process.argv[2]);
  if (!process.stdin.isTTY) throw new Error("Run interactively");
  const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write("Existing test-account password (hidden; no account will be recreated or reset): ");
  let password;
  try { password = await prompt.question(""); }
  finally { prompt.close(); process.stdout.write("\n"); }
  validateFixturePassword(password);
  try {
    const results = await verifyAccessTests(origin, password, {
      onResult: ({ check }) => console.log(`PASS | ${check}`),
    });
    console.log(`Real HTTP access checks passed: ${results.length}. No CRM writes or original-account changes.`);
  } finally { password = undefined; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof AccessVerificationError ? error.message : "Verification stopped. Check dedicated development settings, the localhost URL and the existing temporary password. No account was recreated or reset.");
    process.exitCode = 1;
  });
}

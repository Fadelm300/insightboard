import { readFile, writeFile, chmod } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { validateDevelopmentTarget } from "./create-dev-user.mjs";

async function main() {
  if (!process.stdin.isTTY) throw new Error("Run interactively in the project terminal");
  const file = new URL("../.env.development.local", import.meta.url);
  const template = await readFile(file, "utf8");
  const match = template.match(/^MONGODB_URI=(.+)$/m);
  if (!match) throw new Error("Development connection template missing");
  validateDevelopmentTarget(match[1]);
  if (!match[1].includes(":REPLACE_WITH_ENCODED_PASSWORD@")) {
    console.log("Development connection is already configured. No changes made.");
    return;
  }

  const output = new Writable({ write(chunk, encoding, callback) { callback(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write("Atlas password for insightboard_dev_app (hidden): ");
  let password;
  try { password = await prompt.question(""); }
  finally { prompt.close(); process.stdout.write("\n"); }
  if (!password) throw new Error("A database password is required");

  const updated = template.replace(":REPLACE_WITH_ENCODED_PASSWORD@", `:${encodeURIComponent(password)}@`);
  await writeFile(file, updated, { encoding: "utf8", mode: 0o600 });
  await chmod(file, 0o600);
  console.log("Development connection saved locally. No password or connection string was printed.");
}

main().catch(() => {
  console.error("Development configuration was not completed. Check the local template and input; existing configured credentials will not be overwritten.");
  process.exitCode = 1;
});

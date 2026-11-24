import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { pathToFileURL } from "node:url";

const DEVELOPMENT_DATABASE = "insightboard_dev";
const DEVELOPMENT_DATABASE_USER = "insightboard_dev_app";

export function validateDevelopmentTarget(uri) {
  if (typeof uri !== "string" || !uri) throw new Error("Configure a development connection first");
  let target;
  try { target = new URL(uri); }
  catch { throw new Error("Invalid development connection"); }

  if (!["mongodb:", "mongodb+srv:"].includes(target.protocol)) {
    throw new Error("Use a MongoDB development connection");
  }
  if (decodeURIComponent(target.pathname.slice(1)) !== DEVELOPMENT_DATABASE) {
    throw new Error("This setup only permits the insightboard_dev database");
  }
  if (decodeURIComponent(target.username) !== DEVELOPMENT_DATABASE_USER) {
    throw new Error("Use the dedicated insightboard_dev_app database user");
  }
  return DEVELOPMENT_DATABASE;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Development setup is disabled in production");
  validateDevelopmentTarget(process.env.MONGODB_URI);
  if (!process.stdin.isTTY) throw new Error("Run this setup interactively in your project terminal");

  let hideInput = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!hideInput) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  let email;
  let password;
  try {
    email = (await prompt.question("Development account email [developer@insightboard.test]: ")).trim().toLowerCase() || "developer@insightboard.test";
    process.stdout.write("Development password (hidden, at least 12 characters): ");
    hideInput = true;
    password = await prompt.question("");
    hideInput = false;
    process.stdout.write("\n");
  } finally {
    hideInput = false;
    prompt.close();
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Enter a valid development email");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Use at least 12 characters and no more than 72 UTF-8 bytes");
  }

  const { default: mongoose } = await import("mongoose");
  const { default: bcrypt } = await import("bcryptjs");
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
    if (mongoose.connection.name !== DEVELOPMENT_DATABASE) throw new Error("Unexpected target database");
    const users = mongoose.connection.collection("users");

    if (await users.countDocuments({}) !== 0) {
      throw new Error("A development account already exists; this script will not overwrite it");
    }

    await users.createIndex({ email: 1 }, { unique: true });
    await users.insertOne({
      name: "Development Admin",
      email,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Development admin created in insightboard_dev. No password was printed.");
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const safeMessages = new Set([
      "Development setup is disabled in production",
      "Configure a development connection first",
      "Invalid development connection",
      "Use a MongoDB development connection",
      "This setup only permits the insightboard_dev database",
      "Use the dedicated insightboard_dev_app database user",
      "Run this setup interactively in your project terminal",
      "Enter a valid development email",
      "Use at least 12 characters and no more than 72 UTF-8 bytes",
      "Unexpected target database",
      "A development account already exists; this script will not overwrite it",
    ]);
    let message = "Development setup failed. Check the dedicated database permissions and try again.";
    if (error instanceof Error && safeMessages.has(error.message)) {
      message = error.message;
    } else if (error?.code === 18) {
      message = "Database authentication failed. Check the dedicated Atlas user's password locally.";
    } else if (error?.code === 13) {
      message = "The database user needs readWrite on insightboard_dev only.";
    } else if (error?.name === "MongoServerSelectionError") {
      message = "Cannot reach Atlas. Check connectivity and the IP access list.";
    } else if (error?.code === 11000) {
      message = "A development account with this email already exists; nothing was overwritten.";
    }
    // Only fixed or explicitly allowlisted messages may reach the terminal.
    console.error(message);
    process.exitCode = 1;
  });
}

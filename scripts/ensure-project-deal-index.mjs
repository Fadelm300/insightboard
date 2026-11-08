import mongoose from "mongoose";
import { validateDevelopmentTarget } from "./create-dev-user.mjs";

try {
  if (process.env.NODE_ENV === "production") throw new Error("Development only");
  validateDevelopmentTarget(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  if (mongoose.connection.name !== "insightboard_dev") throw new Error("Unexpected database");
  await mongoose.connection.collection("projects").createIndex(
    { dealId: 1 },
    { name: "unique_project_deal_link", unique: true, partialFilterExpression: { dealId: { $type: "objectId" } } },
  );
  console.log("Project/deal uniqueness constraint verified in the dedicated development database.");
} catch {
  console.error("Index setup did not complete. No records were removed or repaired automatically.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

import { Schema, model, models } from "mongoose";

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  authVersion: { type: Number, default: 0, min: 0 },
  lastActiveAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  absoluteExpiresAt: { type: Date, required: true },
});

// Cleanup is asynchronous. Every authenticated request also checks both dates.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.Session || model("Session", SessionSchema);

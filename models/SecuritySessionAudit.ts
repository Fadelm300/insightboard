import { Schema, model, models } from "mongoose";
import { SecurityContextSchema } from "@/models/SecurityAuditEvent";

// A durable ledger, never a credential or an authentication source. Expiry remains visible after Session TTL cleanup.
const SecuritySessionAuditSchema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountName: { type: String, maxlength: 80, required: true },
  accountEmail: { type: String, maxlength: 254, required: true },
  startedAt: { type: Date, required: true },
  lastActiveAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  absoluteExpiresAt: { type: Date, required: true },
  context: { type: SecurityContextSchema, required: true },
  lastContext: { type: SecurityContextSchema, required: true },
  closedAt: { type: Date, default: null },
  closeReason: { type: String, enum: ["logout", "replaced", "account_changed", "account_invalid", "idle_timeout", "absolute_timeout"], default: null },
  closedBy: { type: String, maxlength: 24, default: null },
  endContext: { type: SecurityContextSchema, default: null },
  purgeAt: { type: Date, required: true },
}, { versionKey: false, collection: "securitysessionaudits" });

SecuritySessionAuditSchema.index({ userId: 1, startedAt: -1 });
SecuritySessionAuditSchema.index({ "context.ip": 1, startedAt: -1 });
SecuritySessionAuditSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default models.SecuritySessionAudit || model("SecuritySessionAudit", SecuritySessionAuditSchema);

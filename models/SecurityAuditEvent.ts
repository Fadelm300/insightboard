import { Schema, model, models } from "mongoose";

export const SecurityContextSchema = new Schema({
  ip: { type: String, maxlength: 45, default: null },
  country: { type: String, maxlength: 2, default: null },
  source: { type: String, enum: ["vercel", "unavailable"], required: true },
  userAgent: { type: String, maxlength: 512, default: "" },
  method: { type: String, maxlength: 8, required: true },
  path: { type: String, maxlength: 240, required: true },
  capturedAt: { type: Date, required: true },
}, { _id: false });

const SecurityAuditEventSchema = new Schema({
  _id: { type: String, required: true },
  kind: { type: String, enum: ["login.failed", "login.rate_limited", "registration.blocked", "request.rejected", "access.denied"], required: true },
  reason: { type: String, enum: ["invalid_credentials", "invalid_request", "body_too_large", "unsupported_media_type", "untrusted_origin", "rate_limit", "registration_closed", "unauthenticated", "insufficient_permission"], required: true },
  status: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  attemptedEmail: { type: String, maxlength: 254 },
  context: { type: SecurityContextSchema, required: true },
  occurredAt: { type: Date, required: true },
  purgeAt: { type: Date, required: true },
}, { versionKey: false, collection: "securityauditevents" });

SecurityAuditEventSchema.index({ occurredAt: -1 });
SecurityAuditEventSchema.index({ userId: 1, occurredAt: -1 });
SecurityAuditEventSchema.index({ "context.ip": 1, occurredAt: -1 });
SecurityAuditEventSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default models.SecurityAuditEvent || model("SecurityAuditEvent", SecurityAuditEventSchema);

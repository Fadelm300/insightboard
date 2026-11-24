import { Schema, model, models } from "mongoose";

const UserAuditEventSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["user.created", "user.updated"], required: true },
  changedFields: [{ type: String, enum: ["name", "role", "allowedPermissions", "isActive", "password", "managedBy"] }],
  createdAt: { type: Date, default: Date.now, required: true },
});

// Account actions only: never persist names, email addresses, passwords or session IDs here
export default models.UserAuditEvent || model("UserAuditEvent", UserAuditEventSchema);

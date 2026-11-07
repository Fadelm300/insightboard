import { Schema, model, models } from "mongoose";

const crmDeletionEventSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recordId: { type: Schema.Types.ObjectId, required: true },
  resource: { type: String, enum: ["clients", "deals", "projects"], required: true },
  action: { type: String, enum: ["permanent-delete"], required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

export default models.CrmDeletionEvent || model("CrmDeletionEvent", crmDeletionEventSchema);

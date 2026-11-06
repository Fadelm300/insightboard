import { Schema, model, models } from "mongoose";

const financialArchiveEventSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recordId: { type: Schema.Types.ObjectId, required: true },
  resource: { type: String, enum: ["revenue", "expenses"], required: true },
  action: { type: String, enum: ["archive", "restore"], required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

export default models.FinancialArchiveEvent ||
  model("FinancialArchiveEvent", financialArchiveEventSchema);

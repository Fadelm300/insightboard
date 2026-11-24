import { Schema, model, models } from "mongoose";

const ArchiveRequestEventSchema = new Schema({
  requestId: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
  },
  actorId: {
    type: Schema.Types.ObjectId,
    required: true,
    immutable: true,
  },
  action: {
    type: String,
    enum: ["requested", "approved", "rejected", "cancelled", "expired"],
    required: true,
    immutable: true,
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500,
    immutable: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

ArchiveRequestEventSchema.index({ requestId: 1, createdAt: 1 });

export default models.ArchiveRequestEvent ||
  model("ArchiveRequestEvent", ArchiveRequestEventSchema);

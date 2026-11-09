import { Schema, model, models } from "mongoose";
import { ARCHIVE_RESOURCES } from "@/lib/archiveApprovalPolicy";

const ArchiveRequestSchema = new Schema(
  {
    resource: {
      type: String,
      enum: ARCHIVE_RESOURCES,
      required: true,
      immutable: true,
    },
    recordId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    label: {
      type: String,
      required: true,
      maxlength: 120,
      immutable: true,
    },
    recordVersion: {
      type: String,
      required: true,
      immutable: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    assignedManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 500,
      immutable: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "expired"],
      default: "pending",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decisionReason: {
      type: String,
      maxlength: 500,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

ArchiveRequestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
ArchiveRequestSchema.index({ assignedManagerId: 1, status: 1, createdAt: -1 });

export default models.ArchiveRequest ||
  model("ArchiveRequest", ArchiveRequestSchema);

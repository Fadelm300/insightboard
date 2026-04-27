import { Schema, model, models } from "mongoose";

const DealSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    estimatedBudget: {
      type: Number,
      default: 0,
    },

    finalPrice: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "Lead",
        "Contacted",
        "Proposal Sent",
        "Negotiation",
        "Closed Won",
        "Closed Lost",
      ],
      default: "Lead",
    },

    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    expectedCloseDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Deal = models.Deal || model("Deal", DealSchema);

export default Deal;
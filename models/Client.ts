import { Schema, model, models } from "mongoose";

const ClientSchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    location: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "New Lead",
        "Contacted",
        "Interested",
        "Not Interested",
        "Converted",
      ],
      default: "New Lead",
    },
     isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Client = models.Client || model("Client", ClientSchema);

export default Client;
import { Schema, model, models } from "mongoose";

const PROJECT_TYPES = [
  "Landing Page",
  "Business Website",
  "Portfolio Website",
  "E-commerce Website",
  "Redesign",
  "Maintenance",
];

const PROJECT_STATUSES = [
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Cancelled",
];

const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];

const ProjectSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },

    dealId: {
      type: Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },

    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [120, "Project name cannot exceed 120 characters"],
    },

    type: {
      type: String,
      enum: PROJECT_TYPES,
      default: "Business Website",
      required: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
    },

    cost: {
      type: Number,
      default: 0,
      min: [0, "Cost cannot be negative"],
    },

    profit: {
      type: Number,
      default: 0,
    },

    deadline: {
      type: Date,
    },

    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "Not Started",
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Unpaid",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.pre("save", function () {
  const price = typeof this.price === "number" ? this.price : 0;
  const cost = typeof this.cost === "number" ? this.cost : 0;

  this.profit = price - cost;
});

const Project = models.Project || model("Project", ProjectSchema);

export default Project;
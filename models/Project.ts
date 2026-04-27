import { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    dealId: {
      type: Schema.Types.ObjectId,
      ref: "Deal",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Landing Page",
        "Business Website",
        "Portfolio Website",
        "E-commerce Website",
        "Redesign",
        "Maintenance",
      ],
    },

    price: {
      type: Number,
      required: true,
    },

    cost: {
      type: Number,
      default: 0,
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
      enum: [
        "Not Started",
        "In Progress",
        "Review",
        "Completed",
        "Cancelled",
      ],
      default: "Not Started",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
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

/*
 Auto calculate profit
*/

ProjectSchema.pre("save", function () {
  this.profit = this.price - this.cost;

});

const Project = models.Project || model("Project", ProjectSchema);

export default Project;
import { Schema, model, models } from "mongoose";

const ExpenseSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Domain",
        "Hosting",
        "Design Assets",
        "Tools",
        "Ads",
        "Freelance Help",
        "Other",
      ],
      default: "Other",
    },

    date: {
      type: Date,
      default: Date.now,
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

const Expense = models.Expense || model("Expense", ExpenseSchema);

export default Expense;
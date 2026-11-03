import { Schema, model, models } from "mongoose";
import { PERMISSIONS, USER_ROLES } from "@/lib/permissions";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "employee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowedPermissions: {
      type: [{ type: String, enum: PERMISSIONS }],
      default: undefined,
    },
    // Assigned by the provisioning API; managers can manage only their own accounts.
    managedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Existing users and sessions without this field resolve to revision zero.
    authVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model("User", UserSchema);

export default User;

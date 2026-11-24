import { Schema, model, models } from "mongoose";

const LoginAttemptSchema = new Schema({
  _id: { type: String, required: true },
  attempts: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

LoginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.LoginAttempt || model("LoginAttempt", LoginAttemptSchema);

import { Schema, model, models } from "mongoose";

const crmWriteLockSchema = new Schema(
  {
  _id: {
    type: String,
    required: true },

  token: {
    type: Schema.Types.ObjectId },
},
 {
  versionKey: false
 });

export default models.CrmWriteLock || model("CrmWriteLock", crmWriteLockSchema);

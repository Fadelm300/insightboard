import { Schema, model, models, type Model } from "mongoose";
import type { CompanySettings } from "@/lib/companySettings";

type SettingsDocument = CompanySettings & { _id: string };

const schema = new Schema<SettingsDocument>({
  _id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 120 },
  timeZone: { type: String, required: true, maxlength: 100 },
}, { timestamps: true });

const CompanySettingsModel =
  (models.CompanySettings as Model<SettingsDocument> | undefined) ??
  model<SettingsDocument>("CompanySettings", schema);

export default CompanySettingsModel;

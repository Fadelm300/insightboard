import connectDB from "@/lib/mongodb";
import { DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "@/lib/companySettings";
import CompanySettingsModel from "@/models/CompanySettings";

const SETTINGS_ID = "company";

export async function readCompanySettings(): Promise<CompanySettings> {
  await connectDB();
  const row = await CompanySettingsModel.findById(SETTINGS_ID).select("name timeZone").lean();
  return row ? { name: row.name, timeZone: row.timeZone } : DEFAULT_COMPANY_SETTINGS;
}

export async function saveCompanySettings(settings: CompanySettings) {
  await connectDB();
  await CompanySettingsModel.updateOne(
    { _id: SETTINGS_ID },
    { $set: { name: settings.name, timeZone: settings.timeZone } },
    { upsert: true, runValidators: true },
  );
}

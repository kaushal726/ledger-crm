import { BUSINESS_SETTINGS_ID, type BusinessSettings, type DB } from "./types";

/** Used until the business profile is filled in (More → Business profile). */
export const DEFAULT_BUSINESS: BusinessSettings = {
  id: BUSINESS_SETTINGS_ID,
  name: "",
  phone: "",
  address: "",
  updatedAt: 0,
};

export function emptyDB(): DB {
  return { customers: [], contractors: [], items: [], orders: [], payments: [], settings: [] };
}

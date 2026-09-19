import { APP_NAME } from "../app/brand";
import { DEFAULT_BUSINESS } from "./seed";
import type { BusinessSettings, DB } from "./types";

export function businessOf(db: DB): BusinessSettings {
  return db.settings[0] ?? DEFAULT_BUSINESS;
}

/** The business name, or the app name until the business profile is filled in. */
export function displayName(db: DB): string {
  return businessOf(db).name.trim() || APP_NAME;
}

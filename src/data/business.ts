import { DEFAULT_BUSINESS } from "./seed";
import type { BusinessSettings, DB } from "./types";

export function businessOf(db: DB): BusinessSettings {
  return db.settings[0] ?? DEFAULT_BUSINESS;
}

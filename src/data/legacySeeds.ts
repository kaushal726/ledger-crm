/* The first builds put sample items and a sample business name on every new device. This
 * removes any copy nobody has edited (updatedAt 0), so sample data never reaches a real Sheet.
 * Edited copies are real data by now and stay.
 */
import { BUSINESS_SETTINGS_ID, type DB } from "./types";

const SAMPLE_ITEM_IDS = new Set(["starter-cement-bag", "starter-jindal-panther-8mm", "starter-jindal-panther-10mm"]);
const SAMPLE_BUSINESS_NAME = "Anshuman's Book";

export function withoutUntouchedSamples(db: DB): DB {
  const items = db.items.filter((i) => !(SAMPLE_ITEM_IDS.has(i.id) && !i.updatedAt));
  const settings = db.settings.filter((s) => !(s.id === BUSINESS_SETTINGS_ID && !s.updatedAt && s.name === SAMPLE_BUSINESS_NAME));
  return items.length === db.items.length && settings.length === db.settings.length ? db : { ...db, items, settings };
}

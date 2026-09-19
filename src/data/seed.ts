import { BUSINESS_SETTINGS_ID, type BusinessSettings, type DB, type Item } from "./types";

// Fixed ids and updatedAt 0, so every device's starter records are the same rows in the
// shared Sheet and never overwrite edits made elsewhere.
export const STARTER_ITEMS: Item[] = [
  { id: "starter-cement-bag", category: "ACC", name: "Cement Bag", unit: "bag", price: 400, updatedAt: 0 },
  { id: "starter-jindal-panther-8mm", category: "Steel", name: "Jindal Panther 8mm", unit: "pc", price: 520, updatedAt: 0 },
  { id: "starter-jindal-panther-10mm", category: "Steel", name: "Jindal Panther 10mm", unit: "pc", price: 810, updatedAt: 0 },
];

export const DEFAULT_BUSINESS: BusinessSettings = {
  id: BUSINESS_SETTINGS_ID,
  name: "Anshuman's Book",
  phone: "",
  address: "",
  updatedAt: 0,
};

export function emptyDB(): DB {
  return { customers: [], contractors: [], items: [], orders: [], payments: [], settings: [] };
}

export function seededDB(): DB {
  return { ...emptyDB(), items: [...STARTER_ITEMS], settings: [DEFAULT_BUSINESS] };
}

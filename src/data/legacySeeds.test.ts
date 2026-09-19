import { describe, expect, it } from "vitest";
import { withoutUntouchedSamples } from "./legacySeeds";
import { emptyDB } from "./seed";
import type { DB } from "./types";

const sampleItem = { id: "starter-cement-bag", category: "ACC", name: "Cement Bag", unit: "bag", price: 400, updatedAt: 0 };
const ownItem = { id: "i1", category: "General", name: "Widget", unit: "pc", price: 50, updatedAt: 5 };

describe("withoutUntouchedSamples", () => {
  it("drops sample items and the sample business name nobody edited", () => {
    const db: DB = { ...emptyDB(), items: [sampleItem, ownItem], settings: [{ id: "business", name: "Anshuman's Book", phone: "", address: "", updatedAt: 0 }] };
    const cleaned = withoutUntouchedSamples(db);
    expect(cleaned.items).toEqual([ownItem]);
    expect(cleaned.settings).toEqual([]);
  });

  it("keeps samples that were edited, and returns the same DB when there is nothing to clean", () => {
    const edited: DB = { ...emptyDB(), items: [{ ...sampleItem, price: 420, updatedAt: 9 }] };
    expect(withoutUntouchedSamples(edited)).toBe(edited);
  });
});

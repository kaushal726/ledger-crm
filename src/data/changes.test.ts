import { describe, expect, it } from "vitest";
import { stampChanges } from "./changes";
import { emptyDB } from "./seed";
import type { Item } from "./types";

const item = (id: string, price: number): Item => ({ id, category: "General", name: id, unit: "pc", price, updatedAt: 0 });

describe("stampChanges", () => {
  it("stamps only records whose reference changed, and reports deletions", () => {
    const prev = { ...emptyDB(), items: [item("a", 10), item("b", 20), item("c", 30)] };
    const [first, second, third] = prev.items;
    const draft = { ...prev, items: [first, { ...second, price: 999 }] };
    const { next, changes } = stampChanges(prev, draft, 1234);

    expect(changes.items?.upserts.map((r) => [r.id, r.updatedAt])).toEqual([[second.id, 1234]]);
    expect(changes.items?.deletes).toEqual([third.id]);
    expect(next.items[0]).toBe(first);
    expect(next.customers).toBe(prev.customers);
    expect(changes.customers).toBeUndefined();
  });
});

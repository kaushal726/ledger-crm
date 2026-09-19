import { describe, expect, it } from "vitest";
import { emptyDB } from "../../data/seed";
import type { Customer, DB } from "../../data/types";
import { NO_CONTRACTOR, filterCustomers, statusCounts, type CustomerFilters } from "./customerFilters";

const customer = (id: string, name: string, opening: number, contractorId: string | null, createdAt: number): Customer => ({
  id, name, phone: "", address: "", contractorId, openingBalance: opening, createdAt, updatedAt: createdAt,
});

const db: DB = {
  ...emptyDB(),
  customers: [
    customer("a", "Anil", 500, "k1", 1),   // due 500
    customer("b", "Bina", -200, null, 2),  // advance
    customer("c", "Chetan", 0, "k1", 3),   // settled, most recent activity
    customer("d", "Deepa", 1200, null, 4), // due 1200
  ],
  payments: [{ id: "p1", customerId: "c", orderId: null, date: "2026-09-10", amount: 0, method: "cash", note: "", createdAt: 5, updatedAt: 5 }],
};

const run = (f: Partial<CustomerFilters>) => filterCustomers(db, { query: "", status: "all", contractor: "", sort: "name", ...f }).map((c) => c.id);

describe("customer filters", () => {
  it("counts customers by balance status", () => {
    expect(statusCounts(db)).toEqual({ all: 4, due: 2, advance: 1, settled: 1 });
  });

  it("filters by status and by default contractor", () => {
    expect(run({ status: "due" })).toEqual(["a", "d"]);
    expect(run({ contractor: "k1" })).toEqual(["a", "c"]);
    expect(run({ contractor: NO_CONTRACTOR })).toEqual(["b", "d"]);
  });

  it("sorts by highest due, recent activity and newest", () => {
    expect(run({ sort: "due" })).toEqual(["d", "a", "c", "b"]);
    expect(run({ sort: "recent" })[0]).toBe("c");
    expect(run({ sort: "newest" })).toEqual(["d", "c", "b", "a"]);
  });

  it("combines search with filters", () => {
    expect(run({ query: "an", status: "due" })).toEqual(["a"]);
  });
});

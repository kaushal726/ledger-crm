import { describe, expect, it } from "vitest";
import { stableStringify } from "../lib/stableStringify";
import type { Customer, Order, Payment } from "../data/types";
import { fromRow, isDeletedRow, toRow, type SchemaContext } from "./sheetSchema";

const ctx: SchemaContext = {
  customerName: () => "Ramesh Sharma",
  customerPhone: () => "09876543210",
  contractorName: (id) => (id ? "Vikram Builders" : ""),
  orderTotal: () => 8500,
  itemsSummary: () => "Cement Bag × 10",
};

const order: Order = {
  id: "o1", date: "2026-09-20", customerId: "c1", contractorId: null, site: "Sharma residence", note: "=before 10am",
  status: "completed", lineItems: [{ category: "Sand", name: "River Sand", qty: 2.5, unit: "ton", price: 1800 }], createdAt: 1, updatedAt: 2,
};
const customer: Customer = { id: "c1", name: "Ramesh", phone: "09876543210", address: "", contractorId: "k1", openingBalance: -250, createdAt: 1, updatedAt: 2 };
const payment: Payment = { id: "p1", customerId: "c1", orderId: null, date: "2026-09-20", amount: 5000, method: "upi", note: "", createdAt: 1, updatedAt: 2 };

describe("sheet schema", () => {
  it("round-trips every record type", () => {
    expect(stableStringify(fromRow("orders", toRow("orders", order, ctx)))).toBe(stableStringify(order));
    expect(stableStringify(fromRow("customers", toRow("customers", customer, ctx)))).toBe(stableStringify(customer));
    expect(stableStringify(fromRow("payments", toRow("payments", payment, ctx)))).toBe(stableStringify(payment));
  });

  it("writes readable display columns right after the id and date", () => {
    const row = toRow("orders", order, ctx);
    expect(Object.keys(row).slice(0, 7)).toEqual(["id", "date", "customerName", "customerPhone", "contractorName", "items", "total"]);
    expect(row.lineItems).toBe(JSON.stringify(order.lineItems));
  });

  it("reads rows edited by hand in the Sheet", () => {
    const edited = fromRow("customers", { id: "c2", name: "Mohan", phone: 9876543210, address: "", contractorId: "", openingBalance: "1200", createdAt: "", updatedAt: 5, _rev: 9 });
    expect(edited).toEqual({ id: "c2", name: "Mohan", phone: "9876543210", address: "", contractorId: null, openingBalance: 1200, createdAt: 0, updatedAt: 5 });
    expect(fromRow("orders", { id: "o9", lineItems: "not json" })).toMatchObject({ lineItems: [], status: "pending" });
  });

  it("recognises deleted rows", () => {
    expect(isDeletedRow({ id: "x", deleted: true })).toBe(true);
    expect(isDeletedRow({ id: "x", deleted: "TRUE" })).toBe(true);
    expect(isDeletedRow({ id: "x", deleted: "" })).toBe(false);
  });
});

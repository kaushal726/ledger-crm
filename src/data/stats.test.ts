import { describe, expect, it } from "vitest";
import { categoryBreakdown, daySummary, itemBreakdown, sumOrders } from "./stats";
import { emptyDB } from "./seed";
import type { CashEntry, DB, Order, Payment } from "./types";

const TODAY = "2026-09-20";
const OTHER = "2026-09-19";

const order = (id: string, date: string, amount: number, status: Order["status"], extra: Partial<Order> = {}): Order => ({
  id, date, customerId: "c1", contractorId: null, site: "", note: "", status,
  lineItems: [{ category: "Cement", name: "OPC 53", qty: 1, unit: "bag", price: amount }],
  discount: 0, discountType: "amount", createdAt: Number(id.slice(1)), updatedAt: 0, ...extra,
});

const payment = (id: string, date: string, amount: number, orderId: string | null = null): Payment =>
  ({ id, customerId: "c1", orderId, date, amount, method: "cash", note: "", createdAt: 0, updatedAt: 0 });

const cash = (id: string, date: string, amount: number, direction: CashEntry["direction"]): CashEntry =>
  ({ id, date, direction, amount, method: "cash", party: "", note: "", createdAt: 0, updatedAt: 0 });

const db = (parts: Partial<DB>): DB => ({ ...emptyDB(), customers: [{ id: "c1", name: "A", phone: "", address: "", contractorId: null, openingBalance: 0, createdAt: 0, updatedAt: 0 }], ...parts });

describe("day summary", () => {
  it("counts only that day's completed orders as sales", () => {
    const day = daySummary(db({
      orders: [order("o1", TODAY, 1000, "completed"), order("o2", TODAY, 500, "pending"), order("o3", TODAY, 700, "cancelled"), order("o4", OTHER, 900, "completed")],
    }), TODAY);
    expect(day.sales).toBe(1000);
    expect(day.orders).toHaveLength(3);
    expect(day.pendingCount).toBe(1);
    expect(day.completedCount).toBe(1);
  });

  it("adds other money in to the customer payments, and subtracts money out", () => {
    const day = daySummary(db({
      orders: [order("o1", TODAY, 1000, "completed")],
      payments: [payment("p1", TODAY, 400, "o1"), payment("p2", OTHER, 1000)],
      cash: [cash("k1", TODAY, 250, "in"), cash("k2", TODAY, 300, "out"), cash("k3", OTHER, 5000, "out")],
    }), TODAY);
    expect(day.collected).toBe(650);   // 400 from the customer + 250 other income
    expect(day.paidOut).toBe(300);
    expect(day.inHand).toBe(350);
    expect(day.cash).toHaveLength(2);
  });

  it("reports the dues left on that day's completed orders", () => {
    const day = daySummary(db({
      orders: [order("o1", TODAY, 1000, "completed"), order("o2", TODAY, 600, "completed")],
      payments: [payment("p1", TODAY, 1200, "o1")],
    }), TODAY);
    expect(day.due).toBe(400);         // 1000 cleared, 200 overflowed onto o2
    expect(day.collected).toBe(1200);
    expect(day.inHand).toBe(1200);
  });

  it("is all zeros on an empty day", () => {
    const day = daySummary(emptyDB(), TODAY);
    expect([day.sales, day.collected, day.paidOut, day.inHand, day.due]).toEqual([0, 0, 0, 0, 0]);
  });

  it("keeps paise exact across many entries", () => {
    const day = daySummary(db({
      payments: [payment("p1", TODAY, 0.1), payment("p2", TODAY, 0.2)],
      cash: [cash("k1", TODAY, 0.1, "in"), cash("k2", TODAY, 0.05, "out")],
    }), TODAY);
    expect(day.collected).toBe(0.4);
    expect(day.inHand).toBe(0.35);
  });
});

describe("item breakdown", () => {
  const twoItems = (id: string, extra: Partial<Order>): Order => ({
    ...order(id, TODAY, 0, "completed", extra),
    lineItems: [
      { category: "Cement", name: "OPC 53", qty: 2, unit: "bag", price: 400 },
      { category: "Steel", name: "TMT 12mm", qty: 1, unit: "pc", price: 200 },
    ],
  });

  it("adds up quantities and amounts per item", () => {
    const rows = itemBreakdown([twoItems("o1", {}), twoItems("o2", {})]);
    expect(rows.map((r) => [r.name, r.qty, r.amount])).toEqual([["OPC 53", 4, 1600], ["TMT 12mm", 2, 400]]);
  });

  it("spreads an order discount across its items, so the total still matches", () => {
    const orders = [twoItems("o1", { discount: 10, discountType: "percent" }), twoItems("o2", { discount: 100, discountType: "amount" })];
    const rows = itemBreakdown(orders);
    const breakdownTotal = rows.reduce((s, r) => s + r.amount, 0);
    expect(breakdownTotal).toBeCloseTo(sumOrders(orders), 2);
    expect(categoryBreakdown(rows).reduce((s, c) => s + c.amount, 0)).toBeCloseTo(sumOrders(orders), 2);
  });

  it("handles a free order without dividing by zero", () => {
    const free: Order = { ...order("o1", TODAY, 0, "completed"), lineItems: [{ category: "Cement", name: "OPC 53", qty: 1, unit: "bag", price: 0 }] };
    expect(itemBreakdown([free])).toEqual([{ key: "cement|opc 53", category: "Cement", name: "OPC 53", unit: "bag", qty: 1, amount: 0 }]);
  });
});

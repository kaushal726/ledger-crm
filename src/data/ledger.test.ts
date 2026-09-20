import { describe, expect, it } from "vitest";
import { customerLedger, getLedgerIndex, orderDiscount, orderTotal } from "./ledger";
import { emptyDB } from "./seed";
import type { DB, Order, Payment } from "./types";

const order = (id: string, date: string, amount: number, status: Order["status"], createdAt: number): Order => ({
  id, date, customerId: "c1", contractorId: null, site: "", note: "", status, createdAt, updatedAt: createdAt,
  lineItems: [{ category: "ACC", name: "Cement Bag", qty: amount / 100, unit: "bag", price: 100 }],
  discount: 0, discountType: "amount",
});

const payment = (id: string, date: string, amount: number, orderId: string | null, createdAt: number): Payment => ({
  id, customerId: "c1", orderId, date, amount, method: "cash", note: "", createdAt, updatedAt: createdAt,
});

function sampleDB(): DB {
  return {
    ...emptyDB(),
    customers: [{ id: "c1", name: "Ramesh", phone: "", address: "", contractorId: null, openingBalance: 500, createdAt: 0, updatedAt: 0 }],
    orders: [
      order("o1", "2026-09-01", 1000, "completed", 1),
      order("o2", "2026-09-05", 2000, "completed", 5),
      order("o3", "2026-09-06", 800, "pending", 7),
      order("o4", "2026-09-06", 300, "cancelled", 8),
    ],
    payments: [
      payment("p1", "2026-09-03", 1200, null, 3),
      payment("p2", "2026-09-05", 500, "o2", 6),
      payment("p3", "2026-09-06", 300, "o3", 9),
    ],
  };
}

describe("customer account", () => {
  it("balance = opening + completed sales - all payments", () => {
    expect(getLedgerIndex(sampleDB()).accounts.get("c1")).toEqual({ opening: 500, sales: 3000, received: 2000, balance: 1500 });
  });
});

describe("order paid / due allocation", () => {
  const money = getLedgerIndex(sampleDB()).orderMoney;

  it("applies a linked payment to its own order first", () => {
    expect(money.get("o2")).toMatchObject({ total: 2000, paid: 500, due: 1500 });
  });

  it("clears the opening balance, then the oldest order, with general payments", () => {
    expect(money.get("o1")).toMatchObject({ total: 1000, paid: 700, due: 300 });
  });

  it("holds payments against a pending order as its advance", () => {
    expect(money.get("o3")).toMatchObject({ advance: 300, due: 0 });
  });

  it("never shows a due on cancelled orders", () => {
    expect(money.get("o4")?.due).toBe(0);
  });

  it("sends overflow from a linked payment to the oldest dues", () => {
    const db = sampleDB();
    db.payments = [payment("p9", "2026-09-05", 2600, "o2", 6)];
    const m = getLedgerIndex(db).orderMoney;
    expect(m.get("o2")).toMatchObject({ paid: 2000, due: 0 });
    expect(m.get("o1")).toMatchObject({ paid: 100, due: 900 }); // 600 overflow: 500 opening, 100 to o1
  });
});

describe("ledger entries", () => {
  it("lists opening, completed orders and payments with a running balance", () => {
    const rows = customerLedger(sampleDB(), "c1").map((r) => [r.kind, r.amount, r.balance]);
    expect(rows).toEqual([
      ["opening", 500, 500],
      ["order", 1000, 1500],
      ["payment", -1200, 300],
      ["order", 2000, 2300],
      ["payment", -500, 1800],
      ["payment", -300, 1500],
    ]);
  });
});

describe("order discount", () => {
  const withDiscount = (discount: number, discountType: Order["discountType"]): Order =>
    ({ ...order("o1", "2026-09-01", 1000, "completed", 1), discount, discountType });

  it("takes a rupee amount or a percent off the items", () => {
    expect(orderTotal(withDiscount(150, "amount"))).toBe(850);
    expect(orderTotal(withDiscount(10, "percent"))).toBe(900);
    expect(orderDiscount(withDiscount(2.5, "percent"))).toBe(25);
  });

  it("never goes below zero or past the bill", () => {
    expect(orderTotal(withDiscount(5000, "amount"))).toBe(0);
    expect(orderTotal(withDiscount(-200, "amount"))).toBe(1000);
    expect(orderTotal(withDiscount(150, "percent"))).toBe(0);
  });

  it("counts the discounted total in the customer's balance", () => {
    const db: DB = { ...emptyDB(), orders: [withDiscount(200, "amount")] };
    expect(getLedgerIndex(db).accounts.get("c1")?.balance).toBe(800);
  });
});

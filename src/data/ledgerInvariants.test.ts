/* Property tests for the money maths: hundreds of generated shops, each checked against
 * the rules the app promises — nothing is invented, nothing is lost, and a due only
 * survives when there is no money left to clear it.
 */
import { describe, expect, it } from "vitest";
import { EMPTY_ACCOUNT, EMPTY_ORDER_MONEY, getLedgerIndex, orderTotal } from "./ledger";
import { emptyDB } from "./seed";
import type { Customer, DB, DiscountType, Order, OrderStatus, Payment } from "./types";

const CENT = 0.005;
const STATUSES: OrderStatus[] = ["completed", "completed", "completed", "pending", "cancelled"];
const DISCOUNTS: { discount: number; discountType: DiscountType }[] = [
  { discount: 0, discountType: "amount" },
  { discount: 100, discountType: "amount" },
  { discount: 7.5, discountType: "percent" },
  { discount: 100, discountType: "percent" },
  { discount: 999999, discountType: "amount" },
];

/** Deterministic PRNG, so a failure can be replayed from its seed. */
function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const day = (n: number) => `2026-0${1 + (n % 9)}-1${n % 9}`;
const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

function shop(seed: number): DB {
  const rnd = random(seed);
  const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];
  const money = () => Math.round(rnd() * 5000) / (rnd() < 0.3 ? 4 : 1);

  const customers: Customer[] = Array.from({ length: 1 + Math.floor(rnd() * 3) }, (_, i) => ({
    id: `c${i}`, name: `Customer ${i}`, phone: "", address: "", contractorId: null,
    openingBalance: pick([0, 0, 500, 1234.5, -800]), createdAt: i, updatedAt: i,
  }));

  const orders: Order[] = Array.from({ length: Math.floor(rnd() * 6) }, (_, i) => ({
    id: `o${i}`, date: day(i), customerId: pick(customers).id, contractorId: null, site: "", note: "",
    status: pick(STATUSES),
    lineItems: Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({
      category: "Cat", name: "Item", qty: 1 + Math.floor(rnd() * 5), unit: "pc", price: Math.round(rnd() * 900) + 10,
    })),
    ...pick(DISCOUNTS),
    createdAt: i, updatedAt: i,
  }));

  const payments: Payment[] = Array.from({ length: Math.floor(rnd() * 7) }, (_, i) => {
    const order = orders.length && rnd() < 0.6 ? pick(orders) : null;
    return {
      id: `p${i}`,
      customerId: order ? order.customerId : pick(customers).id,
      orderId: order ? order.id : null,
      date: day(i), amount: money(), method: "cash" as const, note: "", createdAt: 100 + i, updatedAt: 100 + i,
    };
  });

  return { ...emptyDB(), customers, orders, payments };
}

describe("ledger invariants", () => {
  const seeds = Array.from({ length: 300 }, (_, i) => i + 1);

  it.each(seeds)("hold for shop %i", (seed) => {
    const db = shop(seed);
    const index = getLedgerIndex(db);

    db.customers.forEach((customer) => {
      const account = index.accounts.get(customer.id) ?? EMPTY_ACCOUNT;
      const orders = db.orders.filter((o) => o.customerId === customer.id);
      const completed = orders.filter((o) => o.status === "completed");
      const payments = db.payments.filter((p) => p.customerId === customer.id);
      const received = sum(payments.map((p) => p.amount));
      const sales = sum(completed.map(orderTotal));
      const opening = customer.openingBalance;

      // The headline numbers are the plain sums.
      expect(account.sales).toBeCloseTo(sales, 2);
      expect(account.received).toBeCloseTo(received, 2);
      expect(account.balance).toBeCloseTo(opening + sales - received, 2);

      const moneyOf = (o: Order) => index.orderMoney.get(o.id) ?? EMPTY_ORDER_MONEY;
      orders.forEach((o) => {
        const m = moneyOf(o);
        expect(m.total).toBeCloseTo(orderTotal(o), 2);
        expect(m.paid).toBeGreaterThanOrEqual(-CENT);
        expect(m.paid).toBeLessThanOrEqual(m.total + CENT);
        expect(m.due).toBeGreaterThanOrEqual(-CENT);
        if (o.status === "completed") expect(m.paid + m.due).toBeCloseTo(m.total, 2);
        else expect(m.due).toBe(0);
        if (o.status !== "pending") expect(m.advance).toBe(0);
      });

      const paid = sum(completed.map((o) => moneyOf(o).paid));
      const advances = sum(orders.filter((o) => o.status === "pending").map((o) => moneyOf(o).advance));
      const carried = Math.max(0, -opening);
      const openingDue = Math.max(0, opening);

      // Money is never invented…
      expect(paid + advances).toBeLessThanOrEqual(received + carried + CENT);
      // …and never idles while an order is still due: anything left can only be sitting
      // against the opening balance.
      const leftover = received + carried - advances - paid;
      if (paid + CENT < sales) expect(leftover).toBeLessThanOrEqual(openingDue + CENT);
      // Fully paid up means no dues at all.
      if (received >= opening + sales + advances) completed.forEach((o) => expect(moneyOf(o).due).toBeCloseTo(0, 2));
    });
  });
});

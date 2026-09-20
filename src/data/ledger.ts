/* Customer ledger maths — pure functions over the DB, memoised per DB snapshot.
 *
 * Balance = opening balance + completed orders − payments (positive = customer owes).
 * Per-order paid/due: a payment taken against a completed order pays that order first;
 * everything else (general payments, overflow) clears the opening balance and then the
 * oldest unpaid orders first. Payments against a pending order are held as its advance.
 */
import { round2 } from "../lib/format";
import type { Contractor, Customer, DB, LineItem, Order, Payment } from "./types";

export interface OrderMoney {
  total: number;
  paid: number;
  due: number;
  /** Payments taken against an order that is still pending. */
  advance: number;
}

export interface CustomerAccount {
  opening: number;
  sales: number;
  received: number;
  balance: number;
}

export interface LedgerIndex {
  customersById: Map<string, Customer>;
  contractorsById: Map<string, Contractor>;
  ordersById: Map<string, Order>;
  ordersByCustomer: Map<string, Order[]>;
  paymentsByCustomer: Map<string, Payment[]>;
  paymentsByOrder: Map<string, Payment[]>;
  accounts: Map<string, CustomerAccount>;
  orderMoney: Map<string, OrderMoney>;
}

export type LedgerEntry =
  | { kind: "opening"; key: string; date: ""; amount: number; balance: number }
  | { kind: "order"; key: string; date: string; amount: number; balance: number; order: Order }
  | { kind: "payment"; key: string; date: string; amount: number; balance: number; payment: Payment };

export function lineAmount(li: LineItem): number {
  return round2((Number(li.qty) || 0) * (Number(li.price) || 0));
}

/** What the items come to, before any discount. */
export function orderSubtotal(order: Order): number {
  return round2(order.lineItems.reduce((sum, li) => sum + lineAmount(li), 0));
}

/** The discount in rupees, never negative and never more than the items come to. */
export function orderDiscount(order: Order): number {
  const subtotal = orderSubtotal(order);
  const entered = Number(order.discount) || 0;
  const amount = order.discountType === "percent" ? (subtotal * entered) / 100 : entered;
  return round2(Math.min(Math.max(amount, 0), subtotal));
}

export function orderTotal(order: Order): number {
  return round2(orderSubtotal(order) - orderDiscount(order));
}

export function itemsSummary(order: Order): string {
  return order.lineItems.map((li) => `${li.name} × ${li.qty}${li.unit ? " " + li.unit : ""}`).join(", ");
}

const byDateThenCreated = <T extends { date: string; createdAt: number }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.createdAt - b.createdAt;

function groupBy<T>(list: T[], key: (t: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  list.forEach((t) => {
    const k = key(t);
    if (k === null) return;
    const bucket = map.get(k);
    if (bucket) bucket.push(t);
    else map.set(k, [t]);
  });
  return map;
}

function allocate(opening: number, orders: Order[], payments: Payment[], index: Pick<LedgerIndex, "ordersById">, out: Map<string, OrderMoney>): void {
  const money = new Map<string, OrderMoney>();
  orders.forEach((o) => money.set(o.id, { total: orderTotal(o), paid: 0, due: 0, advance: 0 }));
  let pool = Math.max(0, -opening);

  payments.forEach((p) => {
    const linked = p.orderId ? index.ordersById.get(p.orderId) : undefined;
    const m = linked ? money.get(linked.id) : undefined;
    if (linked && m && linked.status === "completed") {
      const use = Math.min(p.amount, round2(m.total - m.paid));
      m.paid = round2(m.paid + use);
      pool = round2(pool + p.amount - use);
    } else if (linked && m && linked.status === "pending") {
      m.advance = round2(m.advance + p.amount);
    } else {
      pool = round2(pool + p.amount);
    }
  });

  pool = round2(pool - Math.min(pool, Math.max(0, opening)));
  orders.filter((o) => o.status === "completed").sort(byDateThenCreated).forEach((o) => {
    const m = money.get(o.id)!;
    const use = Math.min(pool, round2(m.total - m.paid));
    m.paid = round2(m.paid + use);
    pool = round2(pool - use);
  });

  orders.forEach((o) => {
    const m = money.get(o.id)!;
    m.due = o.status === "completed" ? round2(m.total - m.paid) : 0;
    out.set(o.id, m);
  });
}

function buildIndex(db: DB): LedgerIndex {
  const index: LedgerIndex = {
    customersById: new Map(db.customers.map((c) => [c.id, c])),
    contractorsById: new Map(db.contractors.map((c) => [c.id, c])),
    ordersById: new Map(db.orders.map((o) => [o.id, o])),
    ordersByCustomer: groupBy(db.orders, (o) => o.customerId),
    paymentsByCustomer: groupBy(db.payments, (p) => p.customerId),
    paymentsByOrder: groupBy(db.payments, (p) => p.orderId),
    accounts: new Map(),
    orderMoney: new Map(),
  };

  const customerIds = new Set([...index.customersById.keys(), ...index.ordersByCustomer.keys(), ...index.paymentsByCustomer.keys()]);
  customerIds.forEach((id) => {
    const opening = index.customersById.get(id)?.openingBalance || 0;
    const orders = index.ordersByCustomer.get(id) ?? [];
    const payments = [...(index.paymentsByCustomer.get(id) ?? [])].sort(byDateThenCreated);
    const sales = round2(orders.filter((o) => o.status === "completed").reduce((s, o) => s + orderTotal(o), 0));
    const received = round2(payments.reduce((s, p) => s + p.amount, 0));
    index.accounts.set(id, { opening, sales, received, balance: round2(opening + sales - received) });
    allocate(opening, orders, payments, index, index.orderMoney);
  });
  return index;
}

const cache = new WeakMap<DB, LedgerIndex>();

export function getLedgerIndex(db: DB): LedgerIndex {
  let index = cache.get(db);
  if (!index) {
    index = buildIndex(db);
    cache.set(db, index);
  }
  return index;
}

export const EMPTY_ACCOUNT: CustomerAccount = { opening: 0, sales: 0, received: 0, balance: 0 };
export const EMPTY_ORDER_MONEY: OrderMoney = { total: 0, paid: 0, due: 0, advance: 0 };

/** Chronological ledger with running balance (oldest first). */
export function customerLedger(db: DB, customerId: string): LedgerEntry[] {
  const index = getLedgerIndex(db);
  const opening = index.customersById.get(customerId)?.openingBalance || 0;
  const rows: LedgerEntry[] = [];
  let balance = 0;
  if (opening) {
    balance = opening;
    rows.push({ kind: "opening", key: "opening", date: "", amount: opening, balance });
  }
  const orders = (index.ordersByCustomer.get(customerId) ?? []).filter((o) => o.status === "completed");
  const payments = index.paymentsByCustomer.get(customerId) ?? [];
  const events = [
    ...orders.map((order) => ({ date: order.date, createdAt: order.createdAt, order })),
    ...payments.map((payment) => ({ date: payment.date, createdAt: payment.createdAt, payment })),
  ].sort(byDateThenCreated);

  events.forEach((e) => {
    if ("order" in e) {
      const amount = orderTotal(e.order);
      balance = round2(balance + amount);
      rows.push({ kind: "order", key: "o-" + e.order.id, date: e.date, amount, balance, order: e.order });
    } else {
      balance = round2(balance - e.payment.amount);
      rows.push({ kind: "payment", key: "p-" + e.payment.id, date: e.date, amount: -e.payment.amount, balance, payment: e.payment });
    }
  });
  return rows;
}

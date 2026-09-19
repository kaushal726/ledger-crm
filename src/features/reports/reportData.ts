/* The numbers behind each report — shared by the export preview and the PDF builders. */
import { isWithin } from "../../lib/dates";
import { round2 } from "../../lib/format";
import { customerLedger, getLedgerIndex, type LedgerEntry } from "../../data/ledger";
import { categoryBreakdown, itemBreakdown, sumOrders, type DateRange } from "../../data/stats";
import type { DB, Order, Payment } from "../../data/types";

export interface StatementData {
  opening: number;
  entries: LedgerEntry[];
  sales: number;
  received: number;
  closing: number;
}

export function statementData(db: DB, customerId: string, range: DateRange): StatementData {
  const all = customerLedger(db, customerId);
  const before = all.filter((e) => e.kind === "opening" || (range.from && e.date < range.from));
  const entries = all.filter((e) => e.kind !== "opening" && isWithin(e.date, range.from, range.to));
  const opening = before.length ? before[before.length - 1].balance : 0;
  const sales = round2(entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0));
  const received = round2(entries.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0));
  return { opening, entries, sales, received, closing: round2(opening + sales - received) };
}

export interface SalesData {
  orders: Order[];
  payments: Payment[];
  sales: number;
  collected: number;
  due: number;
}

export function salesData(db: DB, range: DateRange, options: Record<string, boolean>): SalesData {
  const index = getLedgerIndex(db);
  const allowed = (o: Order) => o.status === "completed" || (o.status === "pending" && options.pending) || (o.status === "cancelled" && options.cancelled);
  const orders = db.orders.filter((o) => isWithin(o.date, range.from, range.to) && allowed(o)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const completed = orders.filter((o) => o.status === "completed");
  const payments = db.payments.filter((p) => isWithin(p.date, range.from, range.to)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  return {
    orders,
    payments,
    sales: sumOrders(completed),
    collected: round2(payments.reduce((s, p) => s + p.amount, 0)),
    due: round2(completed.reduce((s, o) => s + (index.orderMoney.get(o.id)?.due ?? 0), 0)),
  };
}

export function itemSalesData(db: DB, range: DateRange) {
  const orders = db.orders.filter((o) => o.status === "completed" && isWithin(o.date, range.from, range.to));
  const items = itemBreakdown(orders);
  return { orders, items, categories: categoryBreakdown(items), total: sumOrders(orders) };
}


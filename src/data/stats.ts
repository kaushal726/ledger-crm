/* Aggregations for screens and reports — pure functions over the DB. */
import { isWithin, monthKey } from "../lib/dates";
import { round2 } from "../lib/format";
import { getLedgerIndex, lineAmount, orderTotal } from "./ledger";
import type { DB, Order } from "./types";

export interface DateRange {
  from: string;
  to: string;
}

export interface ItemRow {
  key: string;
  category: string;
  name: string;
  unit: string;
  qty: number;
  amount: number;
}

export interface DaySummary {
  orders: Order[];
  pendingCount: number;
  completedCount: number;
  sales: number;
  collected: number;
  due: number;
}

export function completedOrders(db: DB, range: DateRange, filter: (o: Order) => boolean = () => true): Order[] {
  return db.orders.filter((o) => o.status === "completed" && isWithin(o.date, range.from, range.to) && filter(o));
}

export function daySummary(db: DB, date: string): DaySummary {
  const index = getLedgerIndex(db);
  const orders = db.orders.filter((o) => o.date === date).sort((a, b) => b.createdAt - a.createdAt);
  const completed = orders.filter((o) => o.status === "completed");
  return {
    orders,
    pendingCount: orders.filter((o) => o.status === "pending").length,
    completedCount: completed.length,
    sales: round2(completed.reduce((s, o) => s + orderTotal(o), 0)),
    collected: round2(db.payments.filter((p) => p.date === date).reduce((s, p) => s + p.amount, 0)),
    due: round2(completed.reduce((s, o) => s + (index.orderMoney.get(o.id)?.due ?? 0), 0)),
  };
}

export function itemBreakdown(orders: Order[]): ItemRow[] {
  const rows = new Map<string, ItemRow>();
  orders.forEach((o) => o.lineItems.forEach((li) => {
    const key = `${li.category}|${li.name}`.toLowerCase();
    const row = rows.get(key) ?? { key, category: li.category || "Uncategorized", name: li.name, unit: li.unit, qty: 0, amount: 0 };
    row.qty = round2(row.qty + (Number(li.qty) || 0));
    row.amount = round2(row.amount + lineAmount(li));
    rows.set(key, row);
  }));
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

export function categoryBreakdown(items: ItemRow[]): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  items.forEach((i) => totals.set(i.category, round2((totals.get(i.category) ?? 0) + i.amount)));
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function sumOrders(orders: Order[]): number {
  return round2(orders.reduce((s, o) => s + orderTotal(o), 0));
}

export interface ContractorSummary {
  orders: Order[];
  total: number;
  items: ItemRow[];
  sites: { site: string; orders: number; amount: number }[];
  customerIds: string[];
}

export function contractorSummary(db: DB, contractorId: string, range: DateRange): ContractorSummary {
  const orders = completedOrders(db, range, (o) => o.contractorId === contractorId).sort((a, b) => b.date.localeCompare(a.date));
  const sites = new Map<string, { site: string; orders: number; amount: number }>();
  orders.forEach((o) => {
    const site = o.site || "No site noted";
    const row = sites.get(site) ?? { site, orders: 0, amount: 0 };
    row.orders += 1;
    row.amount = round2(row.amount + orderTotal(o));
    sites.set(site, row);
  });
  const linkedCustomers = db.customers.filter((c) => c.contractorId === contractorId).map((c) => c.id);
  return {
    orders,
    total: sumOrders(orders),
    items: itemBreakdown(orders),
    sites: [...sites.values()].sort((a, b) => b.amount - a.amount),
    customerIds: [...new Set([...linkedCustomers, ...orders.map((o) => o.customerId)])],
  };
}

/** Completed sales per contractor, all-time unless a range is given. */
export function contractorTotals(db: DB, range: DateRange = { from: "", to: "" }): Map<string, { total: number; orders: number }> {
  const totals = new Map<string, { total: number; orders: number }>();
  db.orders.forEach((o) => {
    if (o.status !== "completed" || !o.contractorId || !isWithin(o.date, range.from, range.to)) return;
    const t = totals.get(o.contractorId) ?? { total: 0, orders: 0 };
    t.total = round2(t.total + orderTotal(o));
    t.orders += 1;
    totals.set(o.contractorId, t);
  });
  return totals;
}

export interface MonthStats {
  orders: Order[];
  total: number;
  collected: number;
  items: ItemRow[];
  categories: { category: string; amount: number }[];
}

export function monthStats(db: DB, month: string): MonthStats {
  const orders = db.orders.filter((o) => o.status === "completed" && monthKey(o.date) === month);
  const items = itemBreakdown(orders);
  return {
    orders,
    total: sumOrders(orders),
    collected: round2(db.payments.filter((p) => monthKey(p.date) === month).reduce((s, p) => s + p.amount, 0)),
    items,
    categories: categoryBreakdown(items),
  };
}

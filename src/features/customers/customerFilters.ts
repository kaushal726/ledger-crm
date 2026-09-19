/* Filtering and sorting for the customer list — pure, so it can be tested and reused. */
import { EMPTY_ACCOUNT, getLedgerIndex } from "../../data/ledger";
import { matchesNameOrPhone } from "../../data/search";
import type { Customer, DB } from "../../data/types";

export type CustomerStatus = "all" | "due" | "advance" | "settled";
export type CustomerSort = "name" | "due" | "recent" | "newest";

/** "" = any contractor, NO_CONTRACTOR = customers without a default contractor. */
export const NO_CONTRACTOR = "none";

export interface CustomerFilters {
  query: string;
  status: CustomerStatus;
  contractor: string;
  sort: CustomerSort;
}

export const CUSTOMER_STATUSES: CustomerStatus[] = ["all", "due", "advance", "settled"];
export const CUSTOMER_SORTS: { value: CustomerSort; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "due", label: "Highest due" },
  { value: "recent", label: "Recent activity" },
  { value: "newest", label: "Newest" },
];

export function statusOf(balance: number): Exclude<CustomerStatus, "all"> {
  return balance > 0 ? "due" : balance < 0 ? "advance" : "settled";
}

function lastActivity(db: DB): Map<string, string> {
  const latest = new Map<string, string>();
  const bump = (id: string, date: string) => { if (date > (latest.get(id) ?? "")) latest.set(id, date); };
  db.orders.forEach((o) => bump(o.customerId, o.date));
  db.payments.forEach((p) => bump(p.customerId, p.date));
  return latest;
}

export function statusCounts(db: DB): Record<CustomerStatus, number> {
  const index = getLedgerIndex(db);
  const counts: Record<CustomerStatus, number> = { all: db.customers.length, due: 0, advance: 0, settled: 0 };
  db.customers.forEach((c) => { counts[statusOf((index.accounts.get(c.id) ?? EMPTY_ACCOUNT).balance)] += 1; });
  return counts;
}

export function filterCustomers(db: DB, filters: CustomerFilters): Customer[] {
  const index = getLedgerIndex(db);
  const balanceOf = (id: string) => (index.accounts.get(id) ?? EMPTY_ACCOUNT).balance;
  const q = filters.query.trim().toLowerCase();

  const list = db.customers.filter((c) =>
    (!q || matchesNameOrPhone(c, q))
    && (filters.status === "all" || statusOf(balanceOf(c.id)) === filters.status)
    && (!filters.contractor || (filters.contractor === NO_CONTRACTOR ? !c.contractorId : c.contractorId === filters.contractor)));

  const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name);
  switch (filters.sort) {
    case "due":
      return list.sort((a, b) => balanceOf(b.id) - balanceOf(a.id) || byName(a, b));
    case "recent": {
      const latest = lastActivity(db);
      return list.sort((a, b) => (latest.get(b.id) ?? "").localeCompare(latest.get(a.id) ?? "") || byName(a, b));
    }
    case "newest":
      return list.sort((a, b) => b.createdAt - a.createdAt);
    default:
      return list.sort(byName);
  }
}

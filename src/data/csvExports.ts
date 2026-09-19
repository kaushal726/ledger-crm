import { toCSV } from "../lib/files";
import { EMPTY_ACCOUNT, getLedgerIndex, itemsSummary, orderTotal } from "./ledger";
import { contractorTotals } from "./stats";
import type { DB } from "./types";

export type CsvKind = "orders" | "payments" | "customers" | "contractors";

export function buildCsv(db: DB, kind: CsvKind): string {
  const index = getLedgerIndex(db);
  const customerName = (id: string) => index.customersById.get(id)?.name ?? "";
  const contractorName = (id: string | null) => (id && index.contractorsById.get(id)?.name) || "";

  switch (kind) {
    case "orders":
      return toCSV([
        ["Date", "Customer", "Phone", "Contractor", "Site", "Items", "Total", "Status", "Paid", "Due", "Note"],
        ...db.orders.map((o) => {
          const money = index.orderMoney.get(o.id);
          return [o.date, customerName(o.customerId), index.customersById.get(o.customerId)?.phone ?? "", contractorName(o.contractorId),
            o.site, itemsSummary(o), orderTotal(o), o.status, money?.paid ?? 0, money?.due ?? 0, o.note];
        }),
      ]);
    case "payments":
      return toCSV([
        ["Date", "Customer", "Amount", "Method", "Note"],
        ...db.payments.map((p) => [p.date, customerName(p.customerId), p.amount, p.method, p.note]),
      ]);
    case "customers":
      return toCSV([
        ["Name", "Phone", "Address", "Default contractor", "Opening balance", "Total sales", "Received", "Balance"],
        ...db.customers.map((c) => {
          const a = index.accounts.get(c.id) ?? EMPTY_ACCOUNT;
          return [c.name, c.phone, c.address, contractorName(c.contractorId), a.opening, a.sales, a.received, a.balance];
        }),
      ]);
    case "contractors": {
      const totals = contractorTotals(db);
      return toCSV([
        ["Name", "Phone", "Total sales", "Orders"],
        ...db.contractors.map((c) => [c.name, c.phone, totals.get(c.id)?.total ?? 0, totals.get(c.id)?.orders ?? 0]),
      ]);
    }
  }
}

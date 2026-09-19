/* One-line preview of what an export will contain, shown before generating the PDF. */
import { getLedgerIndex, orderTotal } from "../../data/ledger";
import { contractorSummary } from "../../data/stats";
import type { DB } from "../../data/types";
import { formatRange } from "../../lib/dates";
import { formatMoney } from "../../lib/format";
import { itemSalesData, salesData, statementData } from "./reportData";
import { reportDefinition, type ExportRequest } from "./reportTypes";

export interface ExportPreview {
  ready: boolean;
  title: string;
  detail: string;
}

const MISSING: Record<string, string> = { customer: "Choose a customer", order: "Choose an order", contractor: "Choose a contractor" };

export function exportPreview(db: DB, req: ExportRequest): ExportPreview {
  const def = reportDefinition(req.type);
  const index = getLedgerIndex(db);
  const period = formatRange(req.range);

  switch (req.type) {
    case "statement": {
      const customer = req.customerId ? index.customersById.get(req.customerId) : undefined;
      if (!customer) return { ready: false, title: def.label, detail: MISSING.customer };
      const data = statementData(db, customer.id, req.range);
      return { ready: true, title: `Statement · ${customer.name}`, detail: `${data.entries.length} entries · ${data.closing < 0 ? "Advance" : "Due"} ${formatMoney(Math.abs(data.closing))}` };
    }
    case "bill": {
      const order = req.orderId ? index.ordersById.get(req.orderId) : undefined;
      if (!order) return { ready: false, title: def.label, detail: MISSING.order };
      return { ready: true, title: `Bill · ${index.customersById.get(order.customerId)?.name ?? ""}`, detail: `${order.lineItems.length} items · ${formatMoney(orderTotal(order))}` };
    }
    case "daily": {
      const data = salesData(db, req.range, req.options);
      return { ready: true, title: `Sales · ${period}`, detail: `${data.orders.length} orders · Sales ${formatMoney(data.sales)}` };
    }
    case "contractor": {
      const contractor = req.contractorId ? index.contractorsById.get(req.contractorId) : undefined;
      if (!contractor) return { ready: false, title: def.label, detail: MISSING.contractor };
      const summary = contractorSummary(db, contractor.id, req.range);
      return { ready: true, title: `${contractor.name} · ${period}`, detail: `${summary.orders.length} orders · ${formatMoney(summary.total)}` };
    }
    case "items": {
      const data = itemSalesData(db, req.range);
      return { ready: true, title: `Item sales · ${period}`, detail: `${data.items.length} items · ${formatMoney(data.total)}` };
    }
  }
}

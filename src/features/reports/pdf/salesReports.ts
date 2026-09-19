import { businessOf } from "../../../data/business";
import { getLedgerIndex, itemsSummary, orderTotal } from "../../../data/ledger";
import { paymentMethodLabel } from "../../../data/paymentMethods";
import { contractorSummary } from "../../../data/stats";
import type { DB } from "../../../data/types";
import { formatDate, formatRange, rangeSlug } from "../../../lib/dates";
import { formatMoney, formatPhone, formatQty, round2, slugify } from "../../../lib/format";
import { itemSalesData, salesData } from "../reportData";
import type { ExportRequest } from "../reportTypes";
import { generatedOn, type BuiltReport } from "./customerReports";
import { RIGHT, type ReportDoc } from "./ReportDoc";

const STATUS_LABEL = { pending: "Pending", completed: "Completed", cancelled: "Cancelled" } as const;

export function buildSales(pdf: ReportDoc, db: DB, req: ExportRequest): BuiltReport {
  const index = getLedgerIndex(db);
  const data = salesData(db, req.range, req.options);
  const customerName = (id: string) => index.customersById.get(id)?.name ?? "";
  const showStatus = req.options.pending || req.options.cancelled;

  const head = ["Date", "Customer", ...(req.options.items ? ["Items"] : []), ...(showStatus ? ["Status"] : []), "Total", "Due"];
  const rows = data.orders.map((o) => [
    formatDate(o.date),
    customerName(o.customerId),
    ...(req.options.items ? [itemsSummary(o)] : []),
    ...(showStatus ? [STATUS_LABEL[o.status]] : []),
    formatMoney(orderTotal(o)),
    o.status === "completed" ? formatMoney(index.orderMoney.get(o.id)?.due ?? 0) : "",
  ]);
  const money = head.length - 2;

  pdf
    .header(businessOf(db), "Sales report", [formatRange(req.range), generatedOn()])
    .summary([
      { label: "Orders", value: String(data.orders.length) },
      { label: "Sales", value: formatMoney(data.sales) },
      { label: "Collected", value: formatMoney(data.collected), tone: "paid" },
      { label: "Due on these orders", value: formatMoney(data.due), tone: data.due > 0 ? "due" : undefined },
    ])
    .section("Orders")
    .table(head, rows, { columnStyles: { 0: { cellWidth: 64 }, [money]: RIGHT, [money + 1]: RIGHT } });

  if (req.options.payments && data.payments.length) {
    pdf.section("Payments received").table(
      ["Date", "Customer", "Method", "Amount"],
      data.payments.map((p) => [formatDate(p.date), customerName(p.customerId), paymentMethodLabel(p.method), formatMoney(p.amount)]),
      { foot: ["", "Total", "", formatMoney(data.collected)], columnStyles: { 0: { cellWidth: 64 }, 3: RIGHT } },
    );
  }
  return { fileName: `sales-${rangeSlug(req.range)}.pdf`, title: `Sales report · ${formatRange(req.range)}` };
}

export function buildContractor(pdf: ReportDoc, db: DB, req: ExportRequest): BuiltReport {
  const index = getLedgerIndex(db);
  const contractor = index.contractorsById.get(req.contractorId ?? "");
  if (!contractor) throw new Error("Contractor not found");
  const summary = contractorSummary(db, contractor.id, req.range);

  pdf
    .header(businessOf(db), "Contractor report", [formatRange(req.range), generatedOn()])
    .info("Contractor", [contractor.name, contractor.phone && formatPhone(contractor.phone)])
    .summary([
      { label: "Total sales", value: formatMoney(summary.total) },
      { label: "Orders", value: String(summary.orders.length) },
      { label: "Sites", value: String(summary.sites.length) },
      { label: "Customers", value: String(summary.customerIds.length) },
    ]);

  if (req.options.items && summary.items.length) {
    pdf.section("Items").table(["Item", "Category", "Qty", "Amount"], summary.items.map((i) => [i.name, i.category, `${formatQty(i.qty)} ${i.unit}`.trim(), formatMoney(i.amount)]), { columnStyles: { 2: RIGHT, 3: RIGHT } });
  }
  if (req.options.sites && summary.sites.length) {
    pdf.section("Sites").table(["Site", "Orders", "Amount"], summary.sites.map((s) => [s.site, String(s.orders), formatMoney(s.amount)]), { columnStyles: { 1: RIGHT, 2: RIGHT } });
  }
  if (req.options.orders && summary.orders.length) {
    pdf.section("Orders").table(
      ["Date", "Customer", "Site", "Items", "Total"],
      summary.orders.map((o) => [formatDate(o.date), index.customersById.get(o.customerId)?.name ?? "", o.site, itemsSummary(o), formatMoney(orderTotal(o))]),
      { foot: ["", "Total", "", "", formatMoney(summary.total)], columnStyles: { 0: { cellWidth: 64 }, 4: RIGHT } },
    );
  }
  return { fileName: `contractor-${slugify(contractor.name)}-${rangeSlug(req.range)}.pdf`, title: `Contractor report · ${contractor.name}` };
}

export function buildItemSales(pdf: ReportDoc, db: DB, req: ExportRequest): BuiltReport {
  const data = itemSalesData(db, req.range);
  pdf
    .header(businessOf(db), "Item sales", [formatRange(req.range), generatedOn()])
    .summary([
      { label: "Revenue", value: formatMoney(data.total) },
      { label: "Orders", value: String(data.orders.length) },
      { label: "Items sold", value: String(data.items.length) },
    ])
    .section("Items")
    .table(
      ["Item", "Category", "Qty", "Avg rate", "Revenue"],
      data.items.map((i) => [i.name, i.category, `${formatQty(i.qty)} ${i.unit}`.trim(), formatMoney(i.qty ? round2(i.amount / i.qty) : 0), formatMoney(i.amount)]),
      { foot: ["Total", "", "", "", formatMoney(data.total)], columnStyles: { 2: RIGHT, 3: RIGHT, 4: RIGHT } },
    );
  if (req.options.categories && data.categories.length) {
    pdf.section("Categories").table(
      ["Category", "Revenue", "Share"],
      data.categories.map((c) => [c.category, formatMoney(c.amount), data.total ? `${Math.round((c.amount / data.total) * 100)}%` : "0%"]),
      { columnStyles: { 1: RIGHT, 2: RIGHT } },
    );
  }
  return { fileName: `item-sales-${rangeSlug(req.range)}.pdf`, title: `Item sales · ${formatRange(req.range)}` };
}

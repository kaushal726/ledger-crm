import { businessOf } from "../../../data/business";
import { EMPTY_ACCOUNT, getLedgerIndex, itemsSummary, lineAmount, orderDiscount, orderSubtotal, type LedgerEntry } from "../../../data/ledger";
import { paymentMethodLabel } from "../../../data/paymentMethods";
import type { DB } from "../../../data/types";
import { formatDate, formatRange, rangeSlug, todayISO } from "../../../lib/dates";
import { formatMoney, formatPhone, formatQty, round2, slugify } from "../../../lib/format";
import { statementData } from "../reportData";
import type { ExportRequest } from "../reportTypes";
import { RIGHT, type ReportDoc } from "./ReportDoc";

export interface BuiltReport {
  fileName: string;
  title: string;
}

/** Balances as shown in PDFs: advances are marked instead of shown negative. */
function balanceText(n: number): string {
  return n < 0 ? `${formatMoney(-n)} adv` : formatMoney(n);
}

export const generatedOn = () => `Generated ${formatDate(todayISO())}`;

export function buildStatement(pdf: ReportDoc, db: DB, req: ExportRequest): BuiltReport {
  const index = getLedgerIndex(db);
  const customer = index.customersById.get(req.customerId ?? "");
  if (!customer) throw new Error("Customer not found");
  const data = statementData(db, customer.id, req.range);
  const contractor = customer.contractorId ? index.contractorsById.get(customer.contractorId) : undefined;

  const particulars = (e: LedgerEntry): string => {
    if (e.kind === "payment") {
      return [`Payment · ${paymentMethodLabel(e.payment.method)}`, req.options.notes ? e.payment.note : ""].filter(Boolean).join("\n");
    }
    if (e.kind !== "order") return "Opening balance";
    const o = e.order;
    const siteLine = req.options.siteContractor
      ? [o.site && `Site: ${o.site}`, o.contractorId && `Contractor: ${index.contractorsById.get(o.contractorId)?.name ?? ""}`].filter(Boolean).join(" · ")
      : "";
    return ["Order", req.options.items ? itemsSummary(o) : "", siteLine, req.options.notes && o.note ? `Note: ${o.note}` : ""].filter(Boolean).join("\n");
  };

  pdf
    .header(businessOf(db), "Statement of account", [formatRange(req.range), generatedOn()])
    .info("Customer", [customer.name, customer.phone && formatPhone(customer.phone), customer.address, contractor ? `Contractor: ${contractor.name}` : ""])
    .summary([
      { label: "Opening balance", value: balanceText(data.opening) },
      { label: "Sales", value: formatMoney(data.sales) },
      { label: "Received", value: formatMoney(data.received), tone: "paid" },
      { label: data.closing < 0 ? "Advance" : "Balance due", value: formatMoney(Math.abs(data.closing)), tone: data.closing > 0 ? "due" : "paid" },
    ])
    .table(
      ["Date", "Particulars", "Debit", "Credit", "Balance"],
      [
        ["", "Opening balance", "", "", balanceText(data.opening)],
        ...data.entries.map((e) => [
          formatDate(e.date),
          particulars(e),
          e.amount > 0 ? formatMoney(e.amount) : "",
          e.amount < 0 ? formatMoney(-e.amount) : "",
          balanceText(e.balance),
        ]),
      ],
      {
        foot: ["", "Closing balance", formatMoney(data.sales), formatMoney(data.received), balanceText(data.closing)],
        columnStyles: { 0: { cellWidth: 64 }, 2: RIGHT, 3: RIGHT, 4: { ...RIGHT, cellWidth: 78 } },
      },
    );

  return { fileName: `statement-${slugify(customer.name)}-${rangeSlug(req.range)}.pdf`, title: `Statement · ${customer.name}` };
}

export function buildBill(pdf: ReportDoc, db: DB, req: ExportRequest): BuiltReport {
  const index = getLedgerIndex(db);
  const order = index.ordersById.get(req.orderId ?? "");
  if (!order) throw new Error("Order not found");
  const customer = index.customersById.get(order.customerId);
  const contractor = order.contractorId ? index.contractorsById.get(order.contractorId) : undefined;
  const money = index.orderMoney.get(order.id);
  const billNo = order.id.slice(-6).toUpperCase();
  const discount = orderDiscount(order);

  pdf
    .header(businessOf(db), "Bill", [`Bill no. ${billNo}`, `Date ${formatDate(order.date)}`])
    .info("Bill to", [
      customer?.name ?? "",
      customer?.phone ? formatPhone(customer.phone) : "",
      customer?.address ?? "",
      req.options.siteContractor ? [order.site && `Site: ${order.site}`, contractor && `Contractor: ${contractor.name}`].filter(Boolean).join(" · ") : "",
    ])
    .table(
      ["#", "Item", "Qty", "Rate", "Amount"],
      [
        ...order.lineItems.map((li, i) => [String(i + 1), li.name, `${formatQty(li.qty)} ${li.unit}`.trim(), formatMoney(li.price), formatMoney(lineAmount(li))]),
        ...(discount > 0
          ? [
            ["", "Subtotal", "", "", formatMoney(orderSubtotal(order))],
            ["", order.discountType === "percent" ? `Discount (${order.discount}%)` : "Discount", "", "", `− ${formatMoney(discount)}`],
          ]
          : []),
      ],
      { foot: ["", "Total", "", "", formatMoney(money?.total ?? 0)], columnStyles: { 0: { cellWidth: 24 }, 2: RIGHT, 3: RIGHT, 4: RIGHT } },
    );

  if (req.options.payments && money && order.status !== "cancelled") {
    const payments = index.paymentsByOrder.get(order.id) ?? [];
    const account = index.accounts.get(order.customerId) ?? EMPTY_ACCOUNT;
    pdf.summary([
      { label: "Bill total", value: formatMoney(money.total) },
      order.status === "pending" ? { label: "Advance", value: formatMoney(money.advance), tone: "paid" } : { label: "Paid", value: formatMoney(money.paid), tone: "paid" },
      { label: "Due on this bill", value: formatMoney(money.due), tone: money.due > 0 ? "due" : undefined },
      { label: account.balance < 0 ? "Total advance" : "Total balance", value: formatMoney(Math.abs(account.balance)), tone: account.balance > 0 ? "due" : "paid" },
    ]);
    if (payments.length) {
      pdf.section("Payments against this bill").table(["Date", "Method", "Amount"], payments.map((p) => [formatDate(p.date), paymentMethodLabel(p.method), formatMoney(p.amount)]), { columnStyles: { 2: RIGHT } });
    }
    const fromGeneral = round2(money.paid - Math.min(money.total, payments.reduce((s, p) => s + p.amount, 0)));
    if (order.status === "completed" && fromGeneral > 0) {
      pdf.paragraph("Note on payment", `${formatMoney(fromGeneral)} of the paid amount comes from the customer's other payments, applied to their oldest dues first.`);
    }
  }
  if (req.options.notes && order.note) pdf.paragraph("Note", order.note);

  const name = customer?.name ?? "customer";
  return { fileName: `bill-${billNo}-${slugify(name)}.pdf`, title: `Bill ${billNo} · ${name}` };
}


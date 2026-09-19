/* Editable form state for an order, and its conversion to/from the stored order. */
import type { OrderInput } from "../../data/actions";
import type { DB, Item, Order, PaymentMethod } from "../../data/types";
import { todayISO } from "../../lib/dates";
import { parseAmount, round2 } from "../../lib/format";
import { uid } from "../../lib/ids";

export interface DraftLine {
  key: string;
  category: string;
  name: string;
  unit: string;
  price: string;
  qty: string;
}

export interface OrderDraft {
  date: string;
  customerId: string | null;
  contractorId: string | null;
  site: string;
  note: string;
  status: OrderInput["status"];
  lines: DraftLine[];
  payMethod: PaymentMethod | null;
  payAmount: string;
}

export interface DraftErrors {
  customer?: string;
  lines?: string;
  badLines?: Set<string>;
}

export interface OrderPrefill {
  customerId?: string;
  date?: string;
}

export function newDraft(db: DB, prefill: OrderPrefill = {}): OrderDraft {
  const customer = prefill.customerId ? db.customers.find((c) => c.id === prefill.customerId) : undefined;
  return {
    date: prefill.date ?? todayISO(),
    customerId: customer?.id ?? null,
    contractorId: customer?.contractorId ?? null,
    site: "",
    note: "",
    status: "pending",
    lines: [],
    payMethod: null,
    payAmount: "",
  };
}

export function draftFromOrder(order: Order): OrderDraft {
  return {
    date: order.date,
    customerId: order.customerId,
    contractorId: order.contractorId,
    site: order.site,
    note: order.note,
    status: order.status === "completed" ? "completed" : "pending",
    lines: order.lineItems.map((li) => ({ key: uid(), category: li.category, name: li.name, unit: li.unit, price: String(li.price), qty: String(li.qty) })),
    payMethod: null,
    payAmount: "",
  };
}

export function lineFromItem(item: Item): DraftLine {
  return { key: uid(), category: item.category, name: item.name, unit: item.unit, price: String(item.price || ""), qty: "1" };
}

export function lineTotal(line: DraftLine): number {
  return round2(parseAmount(line.qty) * parseAmount(line.price));
}

export function draftTotal(draft: OrderDraft): number {
  return round2(draft.lines.reduce((sum, l) => sum + lineTotal(l), 0));
}

export function validateDraft(draft: OrderDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.customerId) errors.customer = "Choose a customer";
  if (!draft.lines.length) errors.lines = "Add at least one item";
  const badLines = new Set(draft.lines.filter((l) => parseAmount(l.qty) <= 0).map((l) => l.key));
  if (badLines.size) {
    errors.badLines = badLines;
    errors.lines = "Enter a quantity for each item";
  }
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Boolean(errors.customer || errors.lines);
}

export function draftToInput(draft: OrderDraft): OrderInput {
  const amount = parseAmount(draft.payAmount);
  return {
    date: draft.date || todayISO(),
    customerId: draft.customerId!,
    contractorId: draft.contractorId,
    site: draft.site.trim(),
    note: draft.note.trim(),
    status: draft.status,
    lineItems: draft.lines.map((l) => ({ category: l.category, name: l.name, unit: l.unit, qty: parseAmount(l.qty), price: parseAmount(l.price) })),
    payment: draft.payMethod && amount > 0 ? { method: draft.payMethod, amount } : null,
  };
}

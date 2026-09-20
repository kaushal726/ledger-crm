/* Maps app records <-> Google Sheet rows.
 *
 * Rows stay readable: one column per field, line items as JSON, and a few display
 * columns (customer name, items, total…) written for people reading the Sheet.
 * Display columns are ignored when rows are read back, so editing them has no effect.
 */
import type { AnyRecord, Collection, Customer, Order, Payment } from "../data/types";

export type SheetValue = string | number | boolean;
export type SheetRow = Record<string, SheetValue>;

export interface SchemaContext {
  customerName(id: string): string;
  customerPhone(id: string): string;
  contractorName(id: string | null): string;
  orderTotal(order: Order): number;
  itemsSummary(order: Order): string;
}

interface CollectionSpec {
  /** Fields placed right after `id`, so the Sheet reads naturally left to right. */
  leading: string[];
  numbers: string[];
  json: string[];
  nullable: string[];
  defaults: Record<string, string>;
  displayKeys: string[];
  display?: (record: AnyRecord, ctx: SchemaContext) => SheetRow;
}

const META_FIELDS = ["deleted", "_rev"];

const spec = (s: Partial<CollectionSpec>): CollectionSpec => ({
  leading: [], numbers: ["updatedAt"], json: [], nullable: [], defaults: {}, displayKeys: [], ...s,
});

const SPECS: Record<Collection, CollectionSpec> = {
  customers: spec({
    leading: ["name", "phone"],
    numbers: ["openingBalance", "createdAt", "updatedAt"],
    nullable: ["contractorId"],
    displayKeys: ["contractorName"],
    display: (r, ctx) => ({ contractorName: ctx.contractorName((r as Customer).contractorId) }),
  }),
  contractors: spec({ leading: ["name", "phone"], numbers: ["createdAt", "updatedAt"] }),
  items: spec({ leading: ["category", "name"], numbers: ["price", "updatedAt"] }),
  orders: spec({
    leading: ["date"],
    numbers: ["discount", "createdAt", "updatedAt"],
    json: ["lineItems"],
    nullable: ["contractorId"],
    defaults: { status: "pending", discountType: "amount" },
    displayKeys: ["customerName", "customerPhone", "contractorName", "items", "total"],
    display: (r, ctx) => {
      const o = r as Order;
      return {
        customerName: ctx.customerName(o.customerId),
        customerPhone: ctx.customerPhone(o.customerId),
        contractorName: ctx.contractorName(o.contractorId),
        items: ctx.itemsSummary(o),
        total: ctx.orderTotal(o),
      };
    },
  }),
  payments: spec({
    leading: ["date"],
    numbers: ["amount", "createdAt", "updatedAt"],
    nullable: ["orderId"],
    defaults: { method: "cash" },
    displayKeys: ["customerName"],
    display: (r, ctx) => ({ customerName: ctx.customerName((r as Payment).customerId) }),
  }),
  cash: spec({
    leading: ["date", "direction"],
    numbers: ["amount", "createdAt", "updatedAt"],
    defaults: { direction: "in", method: "cash" },
  }),
  settings: spec({}),
};

function toCell(value: unknown): SheetValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  return JSON.stringify(value);
}

export function toRow(collection: Collection, record: AnyRecord, ctx: SchemaContext): SheetRow {
  const s = SPECS[collection];
  const source = record as unknown as Record<string, unknown>;
  const row: SheetRow = { id: record.id };
  s.leading.forEach((k) => { row[k] = toCell(source[k]); });
  Object.assign(row, s.display?.(record, ctx));
  Object.keys(source).forEach((k) => { if (!(k in row)) row[k] = toCell(source[k]); });
  return row;
}

function parseJson(value: SheetValue | undefined): unknown {
  if (typeof value !== "string") return [];
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

export function fromRow<C extends Collection>(collection: C, row: SheetRow): AnyRecord {
  const s = SPECS[collection];
  const record: Record<string, unknown> = {};
  Object.keys(row).forEach((k) => {
    if (META_FIELDS.includes(k) || s.displayKeys.includes(k)) return;
    const v = row[k];
    if (s.json.includes(k)) record[k] = parseJson(v);
    else if (s.numbers.includes(k)) record[k] = Number(v) || 0;
    else if (s.nullable.includes(k)) record[k] = v === "" || v === undefined ? null : String(v);
    else record[k] = v === undefined || v === null ? "" : String(v);
  });
  Object.entries(s.defaults).forEach(([k, v]) => { if (!record[k]) record[k] = v; });
  record.id = String(row.id);
  return record as unknown as AnyRecord;
}

export function isDeletedRow(row: SheetRow): boolean {
  return row.deleted === true || String(row.deleted).toUpperCase() === "TRUE";
}

/* JSON backup export/restore. Restore also accepts backups from the original single-file
 * app (v1), where payment was a Paid/Due flag on each order: paid orders become payment
 * entries, and each customer's most recent contractor becomes their default.
 */
import { round2 } from "../lib/format";
import { COLLECTIONS, type Contractor, type Customer, type DB, type Item, type LineItem, type Order, type OrderStatus, type Payment } from "./types";

const APP_ID = "ledger-crm";
const BACKUP_VERSION = 2;

export interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  data: DB;
}

export class InvalidBackupError extends Error {}

export function createBackup(db: DB): BackupFile {
  return { app: APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: db };
}

type Loose = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v) || 0;
const list = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : []);
const ORDER_STATUSES: OrderStatus[] = ["pending", "completed", "cancelled"];

function toLineItems(v: unknown): LineItem[] {
  return list(v).map((li) => ({ category: str(li.category), name: str(li.name), qty: num(li.qty), unit: str(li.unit), price: num(li.price) }));
}

function fromV1(raw: Loose): DB {
  const orders: Order[] = list(raw.orders).map((o) => ({
    id: str(o.id), date: str(o.date), customerId: str(o.customerId), contractorId: o.contractorId ? str(o.contractorId) : null,
    site: str(o.site), note: str(o.note), status: ORDER_STATUSES.includes(o.status as OrderStatus) ? (o.status as OrderStatus) : "pending",
    lineItems: toLineItems(o.lineItems), createdAt: num(o.createdAt), updatedAt: 0,
  }));

  const payments: Payment[] = list(raw.orders).flatMap((o) => {
    const pay = (o.payment ?? {}) as Loose;
    if (pay.status !== "paid") return [];
    const amount = round2(toLineItems(o.lineItems).reduce((s, li) => s + li.qty * li.price, 0));
    return [{
      id: "pay-" + str(o.id), customerId: str(o.customerId), orderId: str(o.id), date: str(o.date), amount,
      method: pay.method === "upi" ? "upi" : "cash", note: str(pay.note), createdAt: num(o.createdAt), updatedAt: 0,
    } satisfies Payment];
  });

  const latestContractor = new Map<string, string>();
  [...orders].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt).forEach((o) => {
    if (o.contractorId) latestContractor.set(o.customerId, o.contractorId);
  });

  const customers: Customer[] = list(raw.customers).map((c) => ({
    id: str(c.id), name: str(c.name), phone: str(c.phone), address: str(c.address),
    contractorId: latestContractor.get(str(c.id)) ?? null, openingBalance: 0, createdAt: num(c.createdAt), updatedAt: 0,
  }));
  const contractors: Contractor[] = list(raw.contractors).map((c) => ({ id: str(c.id), name: str(c.name), phone: str(c.phone), createdAt: num(c.createdAt), updatedAt: 0 }));
  const items: Item[] = list(raw.items).map((i) => ({ id: str(i.id), category: str(i.category), name: str(i.name), unit: str(i.unit), price: num(i.price), updatedAt: 0 }));

  return { customers, contractors, items, orders, payments, settings: [] };
}

function fromV2(raw: Loose): DB {
  const data = raw.data as Loose;
  return Object.fromEntries(COLLECTIONS.map((c) => [c, list(data[c])])) as unknown as DB;
}

export function parseBackup(text: string): DB {
  let raw: Loose;
  try {
    raw = JSON.parse(text) as Loose;
  } catch {
    throw new InvalidBackupError("Could not read that file");
  }
  if (raw && raw.app === APP_ID && raw.data && typeof raw.data === "object") return fromV2(raw);
  if (raw && Array.isArray(raw.customers) && Array.isArray(raw.orders)) return fromV1(raw);
  throw new InvalidBackupError("That file doesn't look like a valid backup");
}

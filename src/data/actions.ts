/* Every change the UI can make to the data. Each one is a single commit(). */
import { uid } from "../lib/ids";
import { removeById, sameText, upsertById } from "./listOps";
import { emptyDB } from "./seed";
import { commit } from "./store";
import {
  BUSINESS_SETTINGS_ID, type BusinessSettings, type Contractor, type Customer, type DB, type Item,
  type LineItem, type Order, type OrderStatus, type Payment, type PaymentMethod,
} from "./types";

const UNCATEGORIZED = "Uncategorized";

export interface OrderInput {
  date: string;
  customerId: string;
  contractorId: string | null;
  site: string;
  note: string;
  status: Exclude<OrderStatus, "cancelled">;
  lineItems: LineItem[];
  /** Money received while creating the order. */
  payment: { amount: number; method: PaymentMethod } | null;
}

function learnItems(items: Item[], lineItems: LineItem[]): Item[] {
  const unknown = lineItems.filter((li) => !items.some((i) => sameText(i.name, li.name)));
  return unknown.length
    ? [...items, ...unknown.map((li) => ({ id: uid(), category: li.category || UNCATEGORIZED, name: li.name, unit: li.unit, price: li.price, updatedAt: 0 }))]
    : items;
}

export function saveOrder(input: OrderInput, editingId: string | null): string {
  const id = editingId ?? uid();
  commit((db) => {
    const existing = editingId ? db.orders.find((o) => o.id === editingId) : undefined;
    const now = Date.now();
    const order: Order = {
      id, date: input.date, customerId: input.customerId, contractorId: input.contractorId,
      site: input.site, note: input.note, status: input.status, lineItems: input.lineItems,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
    const payments = input.payment && input.payment.amount > 0
      ? [...db.payments, newPayment({ customerId: input.customerId, orderId: id, date: input.date, amount: input.payment.amount, method: input.payment.method, note: "" })]
      : db.payments;
    return { ...db, orders: upsertById(db.orders, order), items: learnItems(db.items, input.lineItems), payments };
  });
  return id;
}

export function setOrderStatus(id: string, status: OrderStatus): void {
  commit((db) => {
    const order = db.orders.find((o) => o.id === id);
    return order && order.status !== status ? { ...db, orders: upsertById(db.orders, { ...order, status }) } : db;
  });
}

export function deleteOrder(id: string): void {
  commit((db) => ({ ...db, orders: removeById(db.orders, id) }));
}

/* ---------- payments ---------- */

export type PaymentInput = Pick<Payment, "customerId" | "orderId" | "date" | "amount" | "method" | "note">;

function newPayment(input: PaymentInput): Payment {
  const now = Date.now();
  return { id: uid(), ...input, createdAt: now, updatedAt: now };
}

export function savePayment(input: PaymentInput, editingId: string | null): void {
  commit((db) => {
    const existing = editingId ? db.payments.find((p) => p.id === editingId) : undefined;
    const payment = existing ? { ...existing, ...input } : newPayment(input);
    return { ...db, payments: upsertById(db.payments, payment) };
  });
}

export function deletePayment(id: string): void {
  commit((db) => ({ ...db, payments: removeById(db.payments, id) }));
}

/* ---------- customers & contractors ---------- */

export type CustomerInput = Pick<Customer, "name" | "phone" | "address" | "contractorId" | "openingBalance">;

export function saveCustomer(input: CustomerInput, editingId: string | null): string {
  const id = editingId ?? uid();
  commit((db) => {
    const existing = db.customers.find((c) => c.id === id);
    const now = Date.now();
    const customer: Customer = { id, ...input, createdAt: existing?.createdAt ?? now, updatedAt: now };
    return { ...db, customers: upsertById(db.customers, customer) };
  });
  return id;
}

export function customerHasActivity(db: DB, customerId: string): boolean {
  return db.orders.some((o) => o.customerId === customerId) || db.payments.some((p) => p.customerId === customerId);
}

export function deleteCustomer(id: string): void {
  commit((db) => (customerHasActivity(db, id) ? db : { ...db, customers: removeById(db.customers, id) }));
}

export type ContractorInput = Pick<Contractor, "name" | "phone">;

export function saveContractor(input: ContractorInput, editingId: string | null): string {
  const id = editingId ?? uid();
  commit((db) => {
    const existing = db.contractors.find((c) => c.id === id);
    const now = Date.now();
    return { ...db, contractors: upsertById(db.contractors, { id, ...input, createdAt: existing?.createdAt ?? now, updatedAt: now }) };
  });
  return id;
}

export function contractorHasActivity(db: DB, contractorId: string): boolean {
  return db.orders.some((o) => o.contractorId === contractorId) || db.customers.some((c) => c.contractorId === contractorId);
}

export function deleteContractor(id: string): void {
  commit((db) => (contractorHasActivity(db, id) ? db : { ...db, contractors: removeById(db.contractors, id) }));
}

/* ---------- items & settings ---------- */

export type ItemInput = Pick<Item, "category" | "name" | "unit" | "price">;

export function saveItem(input: ItemInput, editingId: string | null): Item {
  const item: Item = { id: editingId ?? uid(), ...input, category: input.category || UNCATEGORIZED, updatedAt: Date.now() };
  commit((db) => ({ ...db, items: upsertById(db.items, item) }));
  return item;
}

export function deleteItem(id: string): void {
  commit((db) => ({ ...db, items: removeById(db.items, id) }));
}

export function saveBusiness(input: Pick<BusinessSettings, "name" | "phone" | "address">): void {
  commit((db) => ({ ...db, settings: upsertById(db.settings, { id: BUSINESS_SETTINGS_ID, ...input, updatedAt: Date.now() }) }));
}

/* ---------- whole-database operations ---------- */

/** Restore: replaces everything, but keeps the current business profile if the backup has none. */
export function replaceAllData(data: DB): void {
  commit((db) => ({ ...data, settings: data.settings.length ? data.settings : db.settings }));
}

export function eraseAllData(): void {
  commit(() => emptyDB());
}

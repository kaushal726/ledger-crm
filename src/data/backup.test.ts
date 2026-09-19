import { describe, expect, it } from "vitest";
import { InvalidBackupError, createBackup, parseBackup } from "./backup";
import { seededDB } from "./seed";

const v1Backup = {
  customers: [{ id: "c1", name: "Ramesh", phone: "09876543210", address: "Sector 12", createdAt: 1 }],
  contractors: [{ id: "k1", name: "Vikram Builders", phone: "", createdAt: 1 }],
  items: [{ id: "i1", category: "ACC", name: "Cement Bag", unit: "bag", price: 400 }],
  orders: [
    { id: "o1", date: "2026-09-01", customerId: "c1", contractorId: "k1", site: "", note: "", status: "completed",
      lineItems: [{ category: "ACC", name: "Cement Bag", qty: 10, unit: "bag", price: 400 }], payment: { status: "paid", method: "upi", note: "PhonePe" }, createdAt: 2 },
    { id: "o2", date: "2026-09-02", customerId: "c1", contractorId: null, site: "", note: "", status: "completed",
      lineItems: [{ category: "ACC", name: "Cement Bag", qty: 2, unit: "bag", price: 400 }], payment: { status: "due", method: null, note: "" }, createdAt: 3 },
  ],
  meta: { version: 1 },
};

describe("restore from the original app's backup (v1)", () => {
  const db = parseBackup(JSON.stringify(v1Backup));

  it("turns paid orders into payments and leaves due orders unpaid", () => {
    expect(db.payments).toEqual([
      { id: "pay-o1", customerId: "c1", orderId: "o1", date: "2026-09-01", amount: 4000, method: "upi", note: "PhonePe", createdAt: 2, updatedAt: 0 },
    ]);
    expect(db.orders.map((o) => "payment" in o)).toEqual([false, false]);
  });

  it("uses the customer's latest contractor as their default", () => {
    expect(db.customers[0]).toMatchObject({ contractorId: "k1", openingBalance: 0 });
  });
});

describe("backup files", () => {
  it("restores its own export unchanged", () => {
    const db = seededDB();
    expect(parseBackup(JSON.stringify(createBackup(db)))).toEqual(db);
  });

  it("rejects files that aren't backups", () => {
    expect(() => parseBackup("{}")).toThrow(InvalidBackupError);
    expect(() => parseBackup("not json")).toThrow(InvalidBackupError);
  });
});

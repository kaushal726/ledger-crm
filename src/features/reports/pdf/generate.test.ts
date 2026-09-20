/// <reference types="node" />
// Generates every report type from sample data. Set PDF_OUT=<dir> to also write the files for a visual check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { emptyDB } from "../../../data/seed";
import type { DB } from "../../../data/types";
import { defaultOptions, REPORTS, type ExportRequest } from "../reportTypes";
import { generateReport } from "./generate";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function sampleDB(): DB {
  const db = emptyDB();
  db.settings = [{ id: "business", name: "Demo Traders", phone: "98765 00000", address: "Main Road, Sector 12", updatedAt: 0 }];
  db.contractors = [{ id: "k1", name: "Vikram Builders", phone: "9812345678", createdAt: 1, updatedAt: 1 }];
  db.customers = [{ id: "c1", name: "Ramesh Sharma", phone: "09876543210", address: "Sector 12", contractorId: "k1", openingBalance: 1200, createdAt: 1, updatedAt: 1 }];
  db.orders = [
    { id: "o1", date: "2026-09-02", customerId: "c1", contractorId: "k1", site: "Sharma residence", note: "Deliver before 10am", status: "completed", createdAt: 2, updatedAt: 2, discount: 5, discountType: "percent",
      lineItems: [{ category: "ACC", name: "Cement Bag", qty: 10, unit: "bag", price: 400 }, { category: "Sand", name: "River Sand", qty: 2.5, unit: "ton", price: 1800 }] },
    { id: "o2", date: "2026-09-15", customerId: "c1", contractorId: "k1", site: "Sharma residence", note: "", status: "completed", createdAt: 3, updatedAt: 3, discount: 0, discountType: "amount",
      lineItems: [{ category: "Steel", name: "Jindal Panther 8mm", qty: 12, unit: "pc", price: 520 }] },
  ];
  db.payments = [
    { id: "p1", customerId: "c1", orderId: "o1", date: "2026-09-02", amount: 5000, method: "upi", note: "PhonePe", createdAt: 2, updatedAt: 2 },
    { id: "p2", customerId: "c1", orderId: null, date: "2026-09-10", amount: 3000, method: "cash", note: "", createdAt: 4, updatedAt: 4 },
  ];
  return db;
}

beforeAll(() => {
  vi.stubGlobal("fetch", async (url: string) => new Response(fs.readFileSync(path.join(ROOT, decodeURIComponent(url).split("?")[0]))));
});
afterAll(() => vi.unstubAllGlobals());

describe("PDF reports", () => {
  const db = sampleDB();
  const range = { from: "2026-09-01", to: "2026-09-30" };

  it.each(REPORTS.map((r) => r.type))("builds a %s PDF", async (type) => {
    const request: ExportRequest = { type, customerId: "c1", orderId: "o1", contractorId: "k1", range, options: defaultOptions(type) };
    const report = await generateReport(db, request);
    const bytes = new Uint8Array(await report.blob.arrayBuffer());

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(report.fileName).toMatch(/\.pdf$/);
    if (process.env.PDF_OUT) fs.writeFileSync(path.join(process.env.PDF_OUT, report.fileName), bytes);
  });
});

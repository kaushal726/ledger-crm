// Runs apps-script/Code.gs against the in-memory spreadsheet used by the dev mock.
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeSpreadsheet } from "./fakeSpreadsheet.ts";
import { loadAppsScript, type AppsScript } from "./mockSheetApi.ts";

const CODE_PATH = fileURLToPath(new URL("../apps-script/Code.gs", import.meta.url));

let spreadsheet: FakeSpreadsheet;
let script: AppsScript;

const push = (changes: unknown[]) => JSON.parse(script.doPost({ postData: { contents: JSON.stringify({ action: "push", changes }) } }).text);
const pull = (since = 0) => JSON.parse(script.doGet({ parameter: { action: "pull", since: String(since) } }).text);
const item = (id: string, updatedAt: number, extra: Record<string, unknown> = {}) => ({ collection: "items", row: { id, name: id, price: 10, updatedAt, ...extra } });

beforeEach(() => {
  spreadsheet = new FakeSpreadsheet();
  script = loadAppsScript(CODE_PATH, spreadsheet);
});

describe("Code.gs", () => {
  it("stores pushed rows and returns them on pull", () => {
    expect(push([item("a", 1), item("b", 2)])).toMatchObject({ ok: true, applied: 2 });
    const res = pull();
    expect(res.data.items.map((r: { id: string }) => r.id)).toEqual(["a", "b"]);
    expect(spreadsheet.getSheetByName("Items")!.cells[0].slice(0, 3)).toEqual(["id", "name", "price"]);
  });

  it("keeps the newer copy and only returns rows changed since the cursor", () => {
    push([item("a", 5, { price: 50 })]);
    const { cursor } = pull();
    expect(push([item("a", 4, { price: 40 })]).applied).toBe(0);
    expect(pull(cursor).data.items).toEqual([]);
    push([item("a", 6, { price: 60 })]);
    expect(pull(cursor).data.items).toMatchObject([{ id: "a", price: 60 }]);
  });

  it("marks deletions instead of removing rows", () => {
    push([item("a", 1)]);
    push([{ collection: "items", row: { id: "a", updatedAt: 2, deleted: true } }]);
    expect(pull().data.items).toMatchObject([{ id: "a", deleted: true, name: "a" }]);
  });

  it("doesn't create a tab just to delete rows it never had", () => {
    expect(push([{ collection: "items", row: { id: "x", updatedAt: 3, deleted: true } }])).toMatchObject({ ok: true, applied: 0 });
    expect(spreadsheet.getSheetByName("Items")).toBeNull();
  });

  it("rejects unknown actions", () => {
    expect(JSON.parse(script.doGet({ parameter: { action: "nope" } }).text)).toEqual({ ok: false, error: "Unknown action" });
  });
});

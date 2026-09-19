import { describe, expect, it } from "vitest";
import { parseLocation } from "./parseLocation";

describe("parseLocation", () => {
  it("reads the path under the GitHub Pages base", () => {
    const route = parseLocation("/ledger-crm/customers/abc", "?tab=items", "/ledger-crm/");
    expect(route.path).toEqual(["customers", "abc"]);
    expect(route.query.get("tab")).toBe("items");
  });

  it("treats the base with or without a trailing slash as the home screen", () => {
    expect(parseLocation("/ledger-crm/", "", "/ledger-crm/").path).toEqual([]);
    expect(parseLocation("/ledger-crm", "", "/ledger-crm/").path).toEqual([]);
  });

  it("works at the root base used in development", () => {
    expect(parseLocation("/more/sync", "", "/").path).toEqual(["more", "sync"]);
  });

  it("decodes path segments", () => {
    expect(parseLocation("/customers/a%20b", "", "/").path).toEqual(["customers", "a b"]);
  });
});

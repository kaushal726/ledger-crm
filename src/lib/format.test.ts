import { describe, expect, it } from "vitest";
import { formatBalance, formatMoney, formatPhone, formatQty, parseAmount, plural, round2 } from "./format";

describe("money", () => {
  it("groups the Indian way and keeps up to two paise digits", () => {
    expect(formatMoney(1234567)).toBe("₹12,34,567");
    expect(formatMoney(1234.5)).toBe("₹1,234.5");
    expect(formatMoney(0.005)).toBe("₹0.01");
    expect(formatMoney(0)).toBe("₹0");
  });

  it("puts the minus before the rupee sign", () => {
    expect(formatMoney(-300)).toBe("−₹300");
    expect(formatMoney(-0.5)).toBe("−₹0.5");
  });

  it("reads a balance as a due, an advance or settled", () => {
    expect(formatBalance(500)).toBe("₹500");
    expect(formatBalance(-100)).toBe("₹100 adv");
    expect(formatBalance(0)).toBe("₹0");
  });

  it("rounds to paise, and treats junk as zero", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(Number.NaN)).toBe(0);
    expect(round2("abc" as unknown as number)).toBe(0);
  });

  it("parses typed amounts, commas and all", () => {
    expect(parseAmount("1,200.50")).toBe(1200.5);
    expect(parseAmount(" 90 ")).toBe(90);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });

  it("drops trailing zeros from quantities", () => {
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatQty(3)).toBe("3");
  });
});

describe("text helpers", () => {
  it("spaces Indian mobile numbers and leaves anything else alone", () => {
    expect(formatPhone("9876543210")).toBe("98765 43210");
    expect(formatPhone("09876543210")).toBe("98765 43210");
    expect(formatPhone("+919876543210")).toBe("98765 43210");
    expect(formatPhone("1800 123 4567")).toBe("1800 123 4567");
  });

  it("pluralises counts", () => {
    expect(plural(1, "order")).toBe("1 order");
    expect(plural(0, "order")).toBe("0 orders");
    expect(plural(3, "payment")).toBe("3 payments");
  });
});

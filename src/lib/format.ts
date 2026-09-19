const LOCALE = "en-IN";

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatMoney(n: number): string {
  return "₹" + round2(n).toLocaleString(LOCALE, { maximumFractionDigits: 2 });
}

export function formatQty(n: number): string {
  return round2(n).toLocaleString(LOCALE, { maximumFractionDigits: 2 });
}

export function parseAmount(text: string): number {
  const n = Number(String(text).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Indian mobile numbers as "98765 43210" (drops a leading 0 or +91); anything else as typed. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : phone;
}

/** "1 order", "3 orders" */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}

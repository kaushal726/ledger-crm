const COUNTRY_CODE = "91";

function internationalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return COUNTRY_CODE + digits;
  if (digits.length === 11 && digits.startsWith("0")) return COUNTRY_CODE + digits.slice(1);
  return digits;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/${internationalDigits(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

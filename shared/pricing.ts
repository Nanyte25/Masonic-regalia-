import { productById, type Product } from "./catalog";

export type Currency = "EUR" | "GBP" | "USD";
export type Region = "IE" | "EU" | "UK" | "WORLD";

export const VAT_RATE = 0.23;

// Display/charge rates relative to EUR. Update periodically, or move to Stripe
// Adaptive Pricing. The API uses these same numbers, so the cart and the
// charge always agree.
export const RATES: Record<Currency, number> = { EUR: 1, GBP: 0.86, USD: 1.08 };

export const REGIONS: Record<
  Region,
  { label: string; vat: boolean; shipping: number; freeOver: number; countries: string[]; days: string }
> = {
  IE: { label: "Ireland", vat: true, shipping: 600, freeOver: 10000, countries: ["IE"], days: "1–3 working days" },
  EU: {
    label: "European Union",
    vat: true,
    shipping: 1500,
    freeOver: 25000,
    countries: ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"],
    days: "3–6 working days",
  },
  UK: { label: "United Kingdom incl. Northern Ireland", vat: false, shipping: 1200, freeOver: 25000, countries: ["GB"], days: "2–5 working days" },
  WORLD: {
    label: "Rest of world",
    vat: false,
    shipping: 2800,
    freeOver: 40000,
    countries: ["US", "CA", "AU", "NZ", "ZA", "IN", "SG", "MY", "JM", "TT", "BB", "BS", "GH", "NG", "KE", "AE", "HK", "JP", "NO", "CH", "IS"],
    days: "5–12 working days",
  },
};

export interface CartLine {
  id: string;
  qty: number;
  options?: Record<string, string>;
  personal?: Record<string, string>;
}

export interface PricedLine {
  product: Product;
  qty: number;
  unit: number; // EUR cents inc VAT, before bulk discount
  discountPct: number;
  total: number; // EUR cents inc VAT
  description: string;
  options: Record<string, string>;
  personal: Record<string, string>;
}

/** Lodge bulk pricing on identical items. */
export function bulkDiscount(qty: number): number {
  if (qty >= 10) return 10;
  if (qty >= 5) return 5;
  return 0;
}

export class CartError extends Error {}

export function priceLine(line: CartLine): PricedLine {
  const product = productById.get(line.id);
  if (!product) throw new CartError(`Unknown product ${line.id}`);
  const qty = Math.floor(Number(line.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > 100) throw new CartError(`Quantity for ${product.name} must be 1–100`);

  let unit = product.price;
  const options: Record<string, string> = {};
  const labels: string[] = [];
  for (const opt of product.options ?? []) {
    const chosen = line.options?.[opt.id] ?? opt.values[0].id;
    const value = opt.values.find((v) => v.id === chosen);
    if (!value) throw new CartError(`Choose a valid ${opt.label.toLowerCase()} for ${product.name}`);
    unit += value.priceDelta;
    options[opt.id] = value.id;
    labels.push(`${opt.label}: ${value.label}`);
  }

  const personal: Record<string, string> = {};
  for (const p of product.personalise ?? []) {
    const text = (line.personal?.[p.id] ?? "").trim().slice(0, p.maxLength);
    if (text) {
      personal[p.id] = text;
      unit += p.price;
      labels.push(`${p.label}: “${text}”`);
    }
  }

  const discountPct = bulkDiscount(qty);
  const total = Math.round(unit * qty * (1 - discountPct / 100));
  return { product, qty, unit, discountPct, total, description: labels.join("; "), options, personal };
}

/** Convert an inc-VAT EUR amount to what the customer pays in region+currency. */
export function toCharge(eurIncVat: number, region: Region, currency: Currency): number {
  const net = REGIONS[region].vat ? eurIncVat : eurIncVat / (1 + VAT_RATE);
  return Math.round(net * RATES[currency]);
}

export function priceCart(lines: CartLine[], region: Region, currency: Currency) {
  if (!Array.isArray(lines) || lines.length === 0) throw new CartError("Your basket is empty");
  if (lines.length > 50) throw new CartError("Too many lines in basket");
  if (!REGIONS[region]) throw new CartError("Unknown delivery region");
  if (!RATES[currency]) throw new CartError("Unknown currency");
  const priced = lines.map(priceLine);
  const goodsEur = priced.reduce((s, l) => s + l.total, 0);
  const r = REGIONS[region];
  const shippingEur = goodsEur >= r.freeOver ? 0 : r.shipping;
  const goods = priced.reduce((s, l) => s + toCharge(l.total, region, currency), 0);
  const shipping = toCharge(shippingEur, region, currency);
  const vatIncluded = r.vat ? Math.round((goods + shipping) - (goods + shipping) / (1 + VAT_RATE)) : 0;
  const leadDays = Math.max(0, ...priced.map((l) => l.product.leadTimeDays ?? 0));
  return { lines: priced, goods, shipping, total: goods + shipping, vatIncluded, leadDays, currency, region };
}

export function formatMoney(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "EUR" ? "en-IE" : currency === "GBP" ? "en-GB" : "en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

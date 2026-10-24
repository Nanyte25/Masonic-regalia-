// Client-side state: basket, delivery region, currency, session token.
import { productById } from "../../../shared/catalog";
import { formatMoney, priceCart, REGIONS, toCharge, type CartLine, type Currency, type Region } from "../../../shared/pricing";

const KEY = { cart: "ar.cart", region: "ar.region", currency: "ar.currency", token: "ar.token" };

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable: keep in memory for this page */
  }
}

export const DEFAULT_CURRENCY: Record<Region, Currency> = { IE: "EUR", EU: "EUR", UK: "GBP", WORLD: "USD" };

export function getRegion(): Region {
  return read<Region>(KEY.region, "IE");
}
export function getCurrency(): Currency {
  return read<Currency>(KEY.currency, "EUR");
}
export function setRegion(r: Region) {
  write(KEY.region, r);
  write(KEY.currency, DEFAULT_CURRENCY[r]);
  emit();
}
export function setCurrency(c: Currency) {
  write(KEY.currency, c);
  emit();
}

export function getCart(): CartLine[] {
  return read<CartLine[]>(KEY.cart, []).filter((l) => productById.has(l.id));
}
function sameLine(a: CartLine, b: CartLine) {
  return a.id === b.id && JSON.stringify(a.options ?? {}) === JSON.stringify(b.options ?? {}) && JSON.stringify(a.personal ?? {}) === JSON.stringify(b.personal ?? {});
}
export function addToCart(line: CartLine) {
  const cart = getCart();
  const existing = cart.find((l) => sameLine(l, line));
  if (existing) existing.qty = Math.min(100, existing.qty + line.qty);
  else cart.push(line);
  write(KEY.cart, cart);
  emit();
}
export function updateQty(index: number, qty: number) {
  const cart = getCart();
  if (!cart[index]) return;
  if (qty <= 0) cart.splice(index, 1);
  else cart[index].qty = Math.min(100, qty);
  write(KEY.cart, cart);
  emit();
}
export function clearCart() {
  write(KEY.cart, []);
  emit();
}
export function cartCount(): number {
  return getCart().reduce((s, l) => s + l.qty, 0);
}
export function cartSummary() {
  const lines = getCart();
  if (!lines.length) return null;
  return priceCart(lines, getRegion(), getCurrency());
}

/** Format an inc-VAT EUR amount for the visitor's region and currency. */
export function money(eurIncVat: number): string {
  const region = getRegion();
  const currency = getCurrency();
  return formatMoney(toCharge(eurIncVat, region, currency), currency);
}
export function vatNote(): string {
  return REGIONS[getRegion()].vat ? "incl. VAT" : "VAT-free export price";
}

export function getToken(): string | null {
  return read<string | null>(KEY.token, null);
}
export function setToken(t: string | null) {
  write(KEY.token, t);
  emit();
}

// Re-render all [data-eur] prices on change.
export function renderPrices(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-eur]").forEach((el) => {
    el.textContent = money(Number(el.dataset.eur));
  });
  root.querySelectorAll<HTMLElement>("[data-vat-note]").forEach((el) => (el.textContent = vatNote()));
  root.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((el) => {
    const n = cartCount();
    el.textContent = String(n);
    el.hidden = n === 0;
  });
}

function emit() {
  window.dispatchEvent(new CustomEvent("store:change"));
}
window.addEventListener("storage", () => emit());
window.addEventListener("store:change", () => renderPrices());

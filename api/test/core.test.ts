import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../../shared/catalog";
import { bulkDiscount, priceCart, priceLine, toCharge } from "../../shared/pricing";
import { formEncode, verifyStripeSignature } from "../src/stripe";
import { hashPassword, verifyPassword } from "../src/auth";

describe("catalogue", () => {
  it("has unique ids and positive prices", () => {
    const ids = new Set(PRODUCTS.map((p) => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
    for (const p of PRODUCTS) expect(p.price).toBeGreaterThan(0);
  });
});

describe("pricing", () => {
  it("adds option and personalisation costs", () => {
    const l = priceLine({ id: "ie-craft-officer-jewel", qty: 1, options: { metal: "gilt" } });
    expect(l.unit).toBe(3200 + 1200);
    const a = priceLine({ id: "ie-craft-mm-apron", qty: 1, personal: { lodge: "Lodge 42" } });
    expect(a.unit).toBe(4500 + 2000);
  });

  it("ignores blank personalisation and truncates long text", () => {
    expect(priceLine({ id: "ie-craft-mm-apron", qty: 1, personal: { lodge: "  " } }).unit).toBe(4500);
    expect(priceLine({ id: "ie-craft-mm-apron", qty: 1, personal: { lodge: "x".repeat(99) } }).personal.lodge.length).toBe(40);
  });

  it("rejects bad input", () => {
    expect(() => priceLine({ id: "nope", qty: 1 })).toThrow();
    expect(() => priceLine({ id: "gloves-cotton", qty: 0 })).toThrow();
    expect(() => priceLine({ id: "gloves-cotton", qty: 1, options: { size: "zz" } })).toThrow();
    expect(() => priceCart([], "IE", "EUR")).toThrow();
  });

  it("applies lodge bulk discounts", () => {
    expect(bulkDiscount(4)).toBe(0);
    expect(bulkDiscount(5)).toBe(5);
    expect(bulkDiscount(12)).toBe(10);
    expect(priceLine({ id: "gloves-cotton", qty: 10 }).total).toBe(Math.round(1100 * 10 * 0.9));
  });

  it("removes Irish VAT outside the EU and converts currency", () => {
    expect(toCharge(12300, "IE", "EUR")).toBe(12300);
    expect(toCharge(12300, "UK", "EUR")).toBe(10000);
    expect(toCharge(12300, "UK", "GBP")).toBe(8600);
  });

  it("gives free Irish delivery over the threshold", () => {
    expect(priceCart([{ id: "gloves-cotton", qty: 1 }], "IE", "EUR").shipping).toBe(600);
    expect(priceCart([{ id: "ie-prov-set", qty: 1 }], "IE", "EUR").shipping).toBe(0);
  });
});

describe("stripe helpers", () => {
  it("form-encodes nested params", () => {
    const s = formEncode({ a: { b: [{ c: 1 }, "x"] }, d: undefined }).join("&");
    expect(decodeURIComponent(s)).toBe("a[b][0][c]=1&a[b][1]=x");
  });

  it("verifies webhook signatures", async () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1"}';
    const t = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(await verifyStripeSignature(payload, `t=${t},v1=${hex}`, secret)).toBe(true);
    expect(await verifyStripeSignature(payload + " ", `t=${t},v1=${hex}`, secret)).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${t - 1000},v1=${hex}`, secret)).toBe(false);
  });
});

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong password!", h)).toBe(false);
  });
});

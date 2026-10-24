#!/usr/bin/env node
// Builds shared/overrides.json from:
//   supplier/prices.csv        id,name,price_eur,stock,summary  (blank cells keep the default)
//   web/public/products/<id>.(jpg|jpeg|png|webp|avif)  product photos, matched by file name
// Runs automatically before every build. Run by hand with: node scripts/sync-catalog.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = new Set([...readFileSync(join(root, "shared/catalog.ts"), "utf8").matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]));
const out = {};
const warn = (m) => console.warn(`sync-catalog: ${m}`);

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const csvPath = join(root, "supplier/prices.csv");
if (existsSync(csvPath)) {
  const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8"));
  const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  for (const r of rows) {
    const get = (k) => (col[k] === undefined ? "" : (r[col[k]] ?? "").trim());
    const id = get("id");
    if (!ids.has(id)) { warn(`unknown product id "${id}" in prices.csv, skipped`); continue; }
    const o = {};
    const price = get("price_eur").replace(/[€,\s]/g, "");
    if (price) {
      const cents = Math.round(Number(price) * 100);
      if (Number.isFinite(cents) && cents > 0) o.price = cents;
      else warn(`bad price "${price}" for ${id}`);
    }
    const stock = get("stock");
    if (stock !== "" && Number.isInteger(Number(stock))) o.stock = Number(stock);
    if (get("name")) o.name = get("name");
    if (get("summary")) o.summary = get("summary");
    if (Object.keys(o).length) out[id] = o;
  }
}

const imgDir = join(root, "web/public/products");
if (existsSync(imgDir)) {
  for (const f of readdirSync(imgDir)) {
    const m = f.match(/^(.+)\.(jpe?g|png|webp|avif)$/i);
    if (!m) continue;
    if (!ids.has(m[1])) { warn(`photo ${f} doesn't match a product id`); continue; }
    (out[m[1]] ??= {}).image = `products/${f}`;
  }
}

writeFileSync(join(root, "shared/overrides.json"), JSON.stringify(out, null, 2) + "\n");
const photos = Object.values(out).filter((o) => o.image).length;
console.log(`sync-catalog: ${Object.keys(out).length} products updated (${photos} with photos)`);

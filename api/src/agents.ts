// Integration surface for automation agents (supplier ordering, negotiation,
// fulfilment tracking). Agents authenticate with AGENT_API_KEY. Spending above
// AGENT_PO_LIMIT_EUR (cents) is held for a human to approve in /admin.
import { productById } from "../../shared/catalog";
import { HttpError, id, json, readJson, timingSafeEqual, type Env } from "./util";

export const PO_STATUSES = ["awaiting_approval", "draft", "sent", "confirmed", "shipped", "received", "cancelled"];
export const ORDER_STATUSES = ["paid", "in_production", "shipped", "cancelled", "refunded"];

export async function emit(env: Env, type: string, subjectId: string, data: unknown = {}) {
  await env.DB.prepare("INSERT INTO events (type, subject_id, data) VALUES (?, ?, ?)").bind(type, subjectId, JSON.stringify(data)).run();
}

export function requireAgent(env: Env, req: Request) {
  const key = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (!env.AGENT_API_KEY || !timingSafeEqual(key, env.AGENT_API_KEY)) throw new HttpError(401, "Agent key required");
}

type R = (req: Request, env: Env, p: Record<string, string>) => Promise<Response>;

export const agentRoutes: [string, string, R][] = [
  ["GET", "/agent/events", async (req, env) => {
    requireAgent(env, req);
    const u = new URL(req.url);
    const after = Number(u.searchParams.get("after") ?? 0);
    const type = u.searchParams.get("type");
    const stmt = type
      ? env.DB.prepare("SELECT * FROM events WHERE id > ? AND type = ? ORDER BY id LIMIT 100").bind(after, type)
      : env.DB.prepare("SELECT * FROM events WHERE id > ? ORDER BY id LIMIT 100").bind(after);
    const { results } = await stmt.all<any>();
    return json({ events: results.map((e) => ({ ...e, data: JSON.parse(e.data) })), next: results.at(-1)?.id ?? after });
  }],

  ["GET", "/agent/orders", async (req, env) => {
    requireAgent(env, req);
    const status = new URL(req.url).searchParams.get("status") ?? "paid";
    const { results } = await env.DB.prepare("SELECT id, status, email, region, currency, total, lines, shipping_address, tracking, created_at, paid_at FROM orders WHERE status = ? ORDER BY paid_at LIMIT 200").bind(status).all<any>();
    return json({ orders: results.map((o) => ({ ...o, lines: JSON.parse(o.lines), shipping_address: o.shipping_address ? JSON.parse(o.shipping_address) : null })) });
  }],

  ["PATCH", "/agent/orders/:oid", async (req, env, p) => {
    requireAgent(env, req);
    const b = await readJson<{ status?: string; tracking?: string }>(req);
    if (b.status && !ORDER_STATUSES.includes(b.status)) throw new HttpError(400, "Unknown status");
    if (b.status === "refunded" || b.status === "cancelled") throw new HttpError(403, "Refunds and cancellations need a human in /admin");
    const r = await env.DB.prepare("UPDATE orders SET status = COALESCE(?, status), tracking = COALESCE(?, tracking) WHERE id = ? AND status != 'pending'").bind(b.status ?? null, b.tracking ?? null, p.oid).run();
    if (!r.meta.changes) throw new HttpError(404, "Order not found");
    await emit(env, "order.status_changed", p.oid, { ...b, by: "agent" });
    return json({ ok: true });
  }],

  ["GET", "/agent/suppliers", async (req, env) => {
    requireAgent(env, req);
    const { results: suppliers } = await env.DB.prepare("SELECT * FROM suppliers WHERE active = 1").all<any>();
    const { results: catalogue } = await env.DB.prepare("SELECT * FROM supplier_products").all<any>();
    return json({ suppliers: suppliers.map((s) => ({ ...s, products: catalogue.filter((c) => c.supplier_id === s.id) })) });
  }],

  ["POST", "/agent/suppliers", async (req, env) => {
    requireAgent(env, req);
    const b = await readJson<{ name: string; email?: string; country?: string; lead_days?: number; notes?: string; products?: { product_id: string; sku?: string; unit_cost?: number }[] }>(req);
    if (!b.name) throw new HttpError(400, "Supplier name is required");
    const sid = id("sup");
    const stmts = [
      env.DB.prepare("INSERT INTO suppliers (id, name, email, country, lead_days, notes) VALUES (?, ?, ?, ?, ?, ?)").bind(sid, b.name, b.email ?? null, b.country ?? null, b.lead_days ?? null, b.notes ?? null),
      ...(b.products ?? []).filter((x) => productById.has(x.product_id)).map((x) =>
        env.DB.prepare("INSERT OR REPLACE INTO supplier_products (supplier_id, product_id, sku, unit_cost) VALUES (?, ?, ?, ?)").bind(sid, x.product_id, x.sku ?? null, x.unit_cost ?? null),
      ),
    ];
    await env.DB.batch(stmts);
    return json({ id: sid }, 201);
  }],

  ["GET", "/agent/purchase-orders", async (req, env) => {
    requireAgent(env, req);
    const status = new URL(req.url).searchParams.get("status");
    const stmt = status ? env.DB.prepare("SELECT * FROM purchase_orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status) : env.DB.prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 200");
    const { results } = await stmt.all<any>();
    return json({ purchase_orders: results.map((p) => ({ ...p, lines: JSON.parse(p.lines) })) });
  }],

  ["POST", "/agent/purchase-orders", async (req, env) => {
    requireAgent(env, req);
    const b = await readJson<{ supplier_id: string; order_id?: string; lines: { product_id: string; qty: number; unit_cost: number; personalisation?: string }[]; notes?: string }>(req);
    const sup = await env.DB.prepare("SELECT id FROM suppliers WHERE id = ? AND active = 1").bind(b.supplier_id ?? "").first();
    if (!sup) throw new HttpError(400, "Unknown supplier");
    if (!Array.isArray(b.lines) || !b.lines.length) throw new HttpError(400, "A purchase order needs at least one line");
    for (const l of b.lines) {
      if (!productById.has(l.product_id)) throw new HttpError(400, `Unknown product ${l.product_id}`);
      if (!(l.qty >= 1 && l.qty <= 1000) || !(l.unit_cost >= 0)) throw new HttpError(400, "Each line needs a quantity and a unit cost in cents");
    }
    const total = b.lines.reduce((s, l) => s + Math.round(l.qty * l.unit_cost), 0);
    const limit = Number(env.AGENT_PO_LIMIT_EUR ?? 50000);
    const status = total > limit ? "awaiting_approval" : "draft";
    const pid = id("po");
    await env.DB.prepare("INSERT INTO purchase_orders (id, supplier_id, order_id, status, lines, total_cost, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'agent')")
      .bind(pid, b.supplier_id, b.order_id ?? null, status, JSON.stringify(b.lines), total, b.notes ?? null)
      .run();
    await emit(env, "po.created", pid, { status, total, supplier_id: b.supplier_id, order_id: b.order_id ?? null });
    return json({ id: pid, status, total_cost: total }, 201);
  }],

  ["PATCH", "/agent/purchase-orders/:pid", async (req, env, p) => {
    requireAgent(env, req);
    const b = await readJson<{ status?: string; notes?: string }>(req);
    const po = await env.DB.prepare("SELECT status FROM purchase_orders WHERE id = ?").bind(p.pid).first<{ status: string }>();
    if (!po) throw new HttpError(404, "Purchase order not found");
    if (b.status && !PO_STATUSES.includes(b.status)) throw new HttpError(400, "Unknown status");
    if (po.status === "awaiting_approval" && b.status && b.status !== "cancelled") throw new HttpError(403, "This purchase order is waiting for a human to approve it");
    if (b.status === "awaiting_approval") throw new HttpError(400, "Agents can't set that status");
    await env.DB.prepare("UPDATE purchase_orders SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?").bind(b.status ?? null, b.notes ?? null, p.pid).run();
    await emit(env, "po.updated", p.pid, { ...b, by: "agent" });
    return json({ ok: true });
  }],
];

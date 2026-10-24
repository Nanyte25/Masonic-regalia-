import { PRODUCTS, productById } from "../../shared/catalog";
import { CartError, priceCart, REGIONS, toCharge, type CartLine, type Currency, type Region } from "../../shared/pricing";
import {
  checkPasswordStrength,
  createSession,
  createUser,
  currentUser,
  destroySession,
  enabledProviders,
  hashPassword,
  oauthCallback,
  oauthStart,
  publicUser,
  requireAdmin,
  requireUser,
  safeReturnTo,
  setRequestOrigin,
  verifyPassword,
  type Provider,
  type User,
} from "./auth";
import { stripe, verifyStripeSignature } from "./stripe";
import { agentRoutes, emit, ORDER_STATUSES } from "./agents";
import { cors, EMAIL_RE, HttpError, id, json, randomToken, readJson, sendEmail, sha256, type Env } from "./util";

type Handler = (req: Request, env: Env, params: Record<string, string>, ctx: ExecutionContext) => Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
function route(method: string, path: string, h: Handler) {
  const re = new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$");
  routes.push([method, re, h]);
}

// ---------- catalogue & stock ----------
route("GET", "/health", async () => json({ ok: true }));

async function soldMap(env: Env): Promise<Record<string, number>> {
  const { results } = await env.DB.prepare("SELECT product_id, qty FROM sold").all<{ product_id: string; qty: number }>();
  return Object.fromEntries(results.map((r) => [r.product_id, r.qty]));
}

route("GET", "/stock", async (_req, env) => {
  const sold = await soldMap(env);
  const stock = Object.fromEntries(PRODUCTS.map((p) => [p.id, Math.max(0, p.stock - (sold[p.id] ?? 0))]));
  return json({ stock }, 200, { "Cache-Control": "public, max-age=60" });
});

// ---------- checkout ----------
route("POST", "/checkout", async (req, env) => {
  const body = await readJson<{ lines: CartLine[]; region: Region; currency: Currency; lodge?: string }>(req);
  const user = await currentUser(env, req);
  let cart;
  try {
    cart = priceCart(body.lines, body.region, body.currency);
  } catch (e) {
    if (e instanceof CartError) throw new HttpError(400, e.message);
    throw e;
  }

  // Ready-stock items must be available; made-to-order items are not limited.
  const sold = await soldMap(env);
  for (const l of cart.lines) {
    if (l.product.leadTimeDays) continue;
    const left = l.product.stock - (sold[l.product.id] ?? 0);
    if (l.qty > left) throw new HttpError(409, left > 0 ? `Only ${left} ${l.product.name} left in stock` : `${l.product.name} is out of stock`);
  }

  const cur = cart.currency.toLowerCase();
  const region = REGIONS[cart.region];
  const orderId = id("ord");
  const line_items = cart.lines.map((l) => {
    const amount = l.discountPct
      ? { quantity: 1, unit_amount: toCharge(l.total, cart.region, cart.currency), name: `${l.product.name} × ${l.qty} (${l.discountPct}% lodge discount)` }
      : { quantity: l.qty, unit_amount: toCharge(l.unit, cart.region, cart.currency), name: l.product.name };
    return {
      quantity: amount.quantity,
      price_data: {
        currency: cur,
        unit_amount: amount.unit_amount,
        product_data: { name: amount.name, description: l.description || undefined, metadata: { product_id: l.product.id } },
      },
    };
  });

  const session = await stripe<{ id: string; url: string }>(env, "POST", "/checkout/sessions", {
    mode: "payment",
    client_reference_id: orderId,
    customer_email: user?.email,
    customer_creation: "always",
    line_items,
    shipping_address_collection: { allowed_countries: region.countries },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: cart.shipping === 0 ? `Free tracked delivery (${region.label})` : `Tracked delivery (${region.label})`,
          fixed_amount: { amount: cart.shipping, currency: cur },
          delivery_estimate: cart.leadDays
            ? { minimum: { unit: "business_day", value: Math.ceil(cart.leadDays * 5 / 7) }, maximum: { unit: "business_day", value: Math.ceil(cart.leadDays * 5 / 7) + 7 } }
            : undefined,
        },
      },
    ],
    phone_number_collection: { enabled: true },
    custom_fields: [
      { key: "lodge", label: { type: "custom", custom: "Lodge or chapter (name and number)" }, type: "text", optional: true, text: user?.lodge_number ? { default_value: `${user.lodge_name ?? ""} ${user.lodge_number}`.trim().slice(0, 255) } : undefined },
    ],
    payment_intent_data: { metadata: { order_id: orderId } },
    metadata: { order_id: orderId, user_id: user?.id ?? "", region: cart.region },
    success_url: `${env.SITE_URL}/order/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/basket/`,
  });

  await env.DB.prepare("INSERT INTO orders (id, stripe_session, user_id, email, currency, region, total, lines) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(
      orderId,
      session.id,
      user?.id ?? null,
      user?.email ?? null,
      cart.currency,
      cart.region,
      cart.total,
      JSON.stringify(cart.lines.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, options: l.options, personal: l.personal, description: l.description, totalEurIncVat: l.total, leadTimeDays: l.product.leadTimeDays ?? 0 }))),
    )
    .run();

  return json({ url: session.url, orderId });
});


route("POST", "/webhook", async (req, env) => {
  const payload = await req.text();
  const ok = await verifyStripeSignature(payload, req.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) throw new HttpError(400, "Invalid signature");
  const event = JSON.parse(payload);
  const s = event.data?.object;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (s.payment_status !== "paid") return json({ received: true });
    const order = await env.DB.prepare("SELECT * FROM orders WHERE stripe_session = ?").bind(s.id).first<any>();
    if (!order || order.status !== "pending") return json({ received: true }); // idempotent
    const email = s.customer_details?.email ?? order.email;
    const address = { name: s.collected_information?.shipping_details?.name ?? s.shipping_details?.name ?? s.customer_details?.name, address: s.collected_information?.shipping_details?.address ?? s.shipping_details?.address ?? s.customer_details?.address, phone: s.customer_details?.phone, lodge: s.custom_fields?.find((f: any) => f.key === "lodge")?.text?.value ?? null };
    let userId = order.user_id;
    if (!userId && email) userId = (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first<{ id: string }>())?.id ?? null;

    const lines = JSON.parse(order.lines) as { id: string; qty: number; name: string }[];
    const stmts = [
      env.DB.prepare("UPDATE orders SET status = 'paid', email = ?, user_id = ?, total = ?, shipping_address = ?, paid_at = datetime('now') WHERE id = ?").bind(
        email,
        userId,
        s.amount_total ?? order.total,
        JSON.stringify(address),
        order.id,
      ),
      ...lines.map((l) => env.DB.prepare("INSERT INTO sold (product_id, qty) VALUES (?, ?) ON CONFLICT(product_id) DO UPDATE SET qty = qty + excluded.qty").bind(l.id, l.qty)),
    ];
    await env.DB.batch(stmts);
    await emit(env, "order.paid", order.id, { email, region: order.region, currency: order.currency, total: s.amount_total ?? order.total, lines, address });
    if (env.SHOP_NOTIFY_EMAIL)
      await sendEmail(env, env.SHOP_NOTIFY_EMAIL, `New order ${order.id}`, `${email}\n\n${lines.map((l) => `${l.qty} × ${l.name}`).join("\n")}\n\nLodge: ${address.lodge ?? "-"}`);
  } else if (event.type === "checkout.session.expired") {
    await env.DB.prepare("DELETE FROM orders WHERE stripe_session = ? AND status = 'pending'").bind(s.id).run();
  } else if (event.type === "charge.refunded") {
    const orderId = s.metadata?.order_id;
    if (orderId) {
      await env.DB.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").bind(orderId).run();
      await emit(env, "order.status_changed", orderId, { status: "refunded", by: "stripe" });
    }
  }
  return json({ received: true });
});

route("GET", "/orders/session/:sid", async (_req, env, p) => {
  const o = await env.DB.prepare("SELECT id, status, currency, total, lines, created_at FROM orders WHERE stripe_session = ?").bind(p.sid).first<any>();
  if (!o) throw new HttpError(404, "Order not found");
  return json({ ...o, lines: JSON.parse(o.lines).map((l: any) => ({ name: l.name, qty: l.qty, description: l.description, leadTimeDays: l.leadTimeDays })) });
});

// ---------- lodge quotes ----------
route("POST", "/quotes", async (req, env) => {
  const b = await readJson<{ name: string; email: string; lodge?: string; details: string; website?: string }>(req);
  if (b.website) return json({ ok: true }); // honeypot
  if (!b.name?.trim() || !EMAIL_RE.test(b.email ?? "") || !b.details?.trim()) throw new HttpError(400, "Add your name, a valid email and what your lodge needs");
  const user = await currentUser(env, req);
  const qid = id("qte");
  await env.DB.prepare("INSERT INTO quotes (id, user_id, name, email, lodge, details) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(qid, user?.id ?? null, b.name.slice(0, 120), b.email.slice(0, 200), (b.lodge ?? "").slice(0, 200), b.details.slice(0, 4000))
    .run();
  await emit(env, "quote.created", qid, { name: b.name, email: b.email, lodge: b.lodge ?? "", details: b.details });
  if (env.SHOP_NOTIFY_EMAIL) await sendEmail(env, env.SHOP_NOTIFY_EMAIL, `Lodge quote request from ${b.name}`, `${b.email}\n${b.lodge ?? ""}\n\n${b.details}`);
  return json({ id: qid }, 201);
});

// ---------- auth ----------
route("GET", "/auth/providers", async (_req, env) => json({ providers: enabledProviders(env), passwordReset: !!env.RESEND_API_KEY }));

route("POST", "/auth/register", async (req, env) => {
  const b = await readJson<{ email: string; password: string; name?: string; marketing?: boolean }>(req);
  const email = (b.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address");
  const pw = checkPasswordStrength(b.password);
  const existing = await env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first<any>();
  if (existing) throw new HttpError(409, existing.password_hash ? "An account with that email already exists. Sign in instead." : "That email is linked to Google or Facebook. Sign in with that button.");
  const user = await createUser(env, email, b.name?.trim().slice(0, 120) || null, await hashPassword(pw));
  if (b.marketing) await env.DB.prepare("UPDATE users SET marketing = 1 WHERE id = ?").bind(user.id).run();
  return json({ token: await createSession(env, user.id), user: publicUser(user) }, 201);
});

route("POST", "/auth/login", async (req, env) => {
  const b = await readJson<{ email: string; password: string }>(req);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind((b.email ?? "").trim().toLowerCase()).first<User>();
  const ok = await verifyPassword(b.password ?? "", user?.password_hash);
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");
  return json({ token: await createSession(env, user.id), user: publicUser(user) });
});

route("POST", "/auth/logout", async (req, env) => {
  await destroySession(env, req);
  return json({ ok: true });
});

route("POST", "/auth/password-reset", async (req, env) => {
  const b = await readJson<{ email: string }>(req);
  const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?").bind((b.email ?? "").trim().toLowerCase()).first<User>();
  if (user && env.RESEND_API_KEY) {
    const token = randomToken(32);
    await env.DB.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), user.id, Date.now() + 3600_000).run();
    await sendEmail(env, user.email, "Reset your password", `Use this link within an hour to set a new password:\n\n${env.SITE_URL}/account/reset/#token=${token}\n\nIf you didn't ask for this, ignore this email.`);
  }
  return json({ ok: true }); // same response whether or not the account exists
});

route("POST", "/auth/password-reset/confirm", async (req, env) => {
  const b = await readJson<{ token: string; password: string }>(req);
  const pw = checkPasswordStrength(b.password);
  const row = await env.DB.prepare("SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > ?").bind(await sha256(b.token ?? ""), Date.now()).first<any>();
  if (!row) throw new HttpError(400, "This reset link has expired. Request a new one.");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(pw), row.user_id),
    env.DB.prepare("DELETE FROM password_resets WHERE user_id = ?").bind(row.user_id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id),
  ]);
  return json({ token: await createSession(env, row.user_id) });
});

route("GET", "/auth/oauth/:provider/start", async (req, env, p) => {
  const url = new URL(req.url);
  const location = await oauthStart(env, p.provider as Provider, safeReturnTo(env, url.searchParams.get("return_to")));
  return Response.redirect(location, 302);
});

route("GET", "/auth/oauth/:provider/callback", async (req, env, p) => {
  try {
    const r = await oauthCallback(env, p.provider as Provider, new URL(req.url));
    const next = encodeURIComponent(r.returnTo);
    return Response.redirect(`${env.SITE_URL}/account/callback/#token=${r.token}&new=${r.isNew ? 1 : 0}&next=${next}`, 302);
  } catch (e) {
    const msg = e instanceof HttpError ? e.message : "Sign-in failed. Try again.";
    return Response.redirect(`${env.SITE_URL}/account/signin/#error=${encodeURIComponent(msg)}`, 302);
  }
});

// ---------- member area ----------
route("GET", "/me", async (req, env) => json({ user: publicUser(await requireUser(env, req)) }));

route("PATCH", "/me", async (req, env) => {
  const user = await requireUser(env, req);
  const b = await readJson<Record<string, unknown>>(req);
  const fields = ["name", "lodge_name", "lodge_number", "province", "constitution", "rank", "phone"] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fields)
    if (f in b) {
      sets.push(`${f} = ?`);
      vals.push(b[f] == null ? null : String(b[f]).trim().slice(0, 120) || null);
    }
  if ("marketing" in b) {
    sets.push("marketing = ?");
    vals.push(b.marketing ? 1 : 0);
  }
  if (b.newPassword) {
    if (user.password_hash && !(await verifyPassword(String(b.currentPassword ?? ""), user.password_hash))) throw new HttpError(400, "Current password is incorrect");
    sets.push("password_hash = ?");
    vals.push(await hashPassword(checkPasswordStrength(b.newPassword)));
  }
  if (sets.length) await env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, user.id).run();
  const fresh = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first<User>();
  return json({ user: publicUser(fresh!) });
});

route("DELETE", "/me", async (req, env) => {
  const user = await requireUser(env, req);
  await env.DB.batch([
    env.DB.prepare("UPDATE orders SET user_id = NULL WHERE user_id = ?").bind(user.id), // keep for accounting
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
  ]);
  return json({ ok: true });
});

route("GET", "/me/orders", async (req, env) => {
  const user = await requireUser(env, req);
  const { results } = await env.DB.prepare(
    "SELECT id, status, currency, total, lines, tracking, created_at FROM orders WHERE (user_id = ? OR lower(email) = ?) AND status != 'pending' ORDER BY created_at DESC LIMIT 100",
  )
    .bind(user.id, user.email)
    .all<any>();
  return json({ orders: results.map((o) => ({ ...o, lines: JSON.parse(o.lines) })) });
});

route("GET", "/me/wishlist", async (req, env) => {
  const user = await requireUser(env, req);
  const { results } = await env.DB.prepare("SELECT product_id FROM wishlist WHERE user_id = ?").bind(user.id).all<{ product_id: string }>();
  return json({ items: results.map((r) => r.product_id) });
});

route("PUT", "/me/wishlist/:pid", async (req, env, p) => {
  const user = await requireUser(env, req);
  if (!productById.has(p.pid)) throw new HttpError(404, "Unknown product");
  await env.DB.prepare("INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)").bind(user.id, p.pid).run();
  return json({ ok: true });
});

route("DELETE", "/me/wishlist/:pid", async (req, env, p) => {
  const user = await requireUser(env, req);
  await env.DB.prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?").bind(user.id, p.pid).run();
  return json({ ok: true });
});

route("GET", "/me/quotes", async (req, env) => {
  const user = await requireUser(env, req);
  const { results } = await env.DB.prepare("SELECT id, lodge, details, status, created_at FROM quotes WHERE user_id = ? OR lower(email) = ? ORDER BY created_at DESC").bind(user.id, user.email).all();
  return json({ quotes: results });
});

// ---------- admin ----------

route("GET", "/admin/orders", async (req, env) => {
  await requireAdmin(env, req);
  const status = new URL(req.url).searchParams.get("status");
  const stmt = status
    ? env.DB.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
    : env.DB.prepare("SELECT * FROM orders WHERE status != 'pending' ORDER BY created_at DESC LIMIT 200");
  const { results } = await stmt.all<any>();
  return json({ orders: results.map((o) => ({ ...o, lines: JSON.parse(o.lines), shipping_address: o.shipping_address ? JSON.parse(o.shipping_address) : null })) });
});

route("PATCH", "/admin/orders/:oid", async (req, env, p) => {
  await requireAdmin(env, req);
  const b = await readJson<{ status?: string; tracking?: string }>(req);
  if (b.status && !ORDER_STATUSES.includes(b.status)) throw new HttpError(400, "Unknown status");
  await env.DB.prepare("UPDATE orders SET status = COALESCE(?, status), tracking = COALESCE(?, tracking) WHERE id = ?").bind(b.status ?? null, b.tracking ?? null, p.oid).run();
  await emit(env, "order.status_changed", p.oid, { ...b, by: "admin" });
  const o = await env.DB.prepare("SELECT email, status, tracking FROM orders WHERE id = ?").bind(p.oid).first<any>();
  if (o?.email && b.status === "shipped") await sendEmail(env, o.email, `Your order ${p.oid} has shipped`, `Your regalia is on its way.${o.tracking ? `\n\nTracking: ${o.tracking}` : ""}`);
  return json({ ok: true });
});

route("GET", "/admin/quotes", async (req, env) => {
  await requireAdmin(env, req);
  const { results } = await env.DB.prepare("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 200").all();
  return json({ quotes: results });
});

route("PATCH", "/admin/quotes/:qid", async (req, env, p) => {
  await requireAdmin(env, req);
  const b = await readJson<{ status: string }>(req);
  if (!["new", "replied", "won", "lost"].includes(b.status)) throw new HttpError(400, "Unknown status");
  await env.DB.prepare("UPDATE quotes SET status = ? WHERE id = ?").bind(b.status, p.qid).run();
  return json({ ok: true });
});

route("GET", "/admin/purchase-orders", async (req, env) => {
  await requireAdmin(env, req);
  const { results } = await env.DB.prepare("SELECT po.*, s.name AS supplier FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id ORDER BY po.created_at DESC LIMIT 200").all<any>();
  return json({ purchase_orders: results.map((p) => ({ ...p, lines: JSON.parse(p.lines) })) });
});

route("POST", "/admin/purchase-orders/:pid/:decision", async (req, env, p) => {
  const admin = await requireAdmin(env, req);
  if (!["approve", "reject"].includes(p.decision)) throw new HttpError(404, "Not found");
  const status = p.decision === "approve" ? "draft" : "cancelled";
  const r = await env.DB.prepare("UPDATE purchase_orders SET status = ?, approved_by = ?, updated_at = datetime('now') WHERE id = ? AND status = 'awaiting_approval'").bind(status, admin.id, p.pid).run();
  if (!r.meta.changes) throw new HttpError(409, "This purchase order isn't waiting for approval");
  await emit(env, "po.updated", p.pid, { status, by: "admin" });
  return json({ ok: true, status });
});

route("GET", "/admin/summary", async (req, env) => {
  await requireAdmin(env, req);
  const r = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM orders WHERE status='paid') AS to_make, (SELECT COUNT(*) FROM orders WHERE status='in_production') AS in_production, (SELECT COUNT(*) FROM quotes WHERE status='new') AS new_quotes, (SELECT COUNT(*) FROM users) AS members, (SELECT COUNT(*) FROM purchase_orders WHERE status='awaiting_approval') AS po_approvals",
  ).first();
  return json(r);
});

for (const [m, pth, h] of agentRoutes) route(m, pth, (req, env, p) => h(req, env, p));

// ---------- entry ----------
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const headers = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const reqUrl = new URL(req.url);
    const path = reqUrl.pathname;
    setRequestOrigin(reqUrl.origin);
    try {
      for (const [method, re, h] of routes) {
        if (method !== req.method) continue;
        const m = path.match(re);
        if (m) {
          const res = await h(req, env, (m.groups ?? {}) as Record<string, string>, ctx);
          if (res.status >= 300 && res.status < 400) return res;
          const out = new Response(res.body, res);
          for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
          return out;
        }
      }
      throw new HttpError(404, "Not found");
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return json({ error: e instanceof HttpError ? e.message : "Something went wrong on our side. Try again in a moment." }, status, headers);
    }
  },
};

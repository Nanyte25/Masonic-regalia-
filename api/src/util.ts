export interface Env {
  DB: D1Database;
  SITE_URL: string; // e.g. https://nanyte25.github.io/masonic-regalia
  API_URL?: string; // optional; defaults to the Worker's own origin
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
  FACEBOOK_GRAPH_VERSION?: string;
  ADMIN_EMAILS?: string; // comma separated
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  SHOP_NOTIFY_EMAIL?: string;
  AGENT_API_KEY?: string;
  AGENT_PO_LIMIT_EUR?: string; // cents; POs above this need human approval
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function siteOrigin(env: Env): string {
  return new URL(env.SITE_URL).origin;
}

export function cors(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowed = [siteOrigin(env), "http://localhost:4321"];
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin) ? origin : siteOrigin(env),
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
}

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(text: string): Promise<string> {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function id(prefix: string): string {
  return `${prefix}_${randomToken(12)}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

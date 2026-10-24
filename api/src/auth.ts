import { b64url, HttpError, id, randomToken, sha256, timingSafeEqual, type Env } from "./util";

const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // Workers maximum

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  lodge_name: string | null;
  lodge_number: string | null;
  province: string | null;
  constitution: string | null;
  rank: string | null;
  phone: string | null;
  marketing: number;
  password_hash?: string | null;
  created_at: string;
}

export function publicUser(u: User) {
  const { password_hash, ...rest } = u;
  return { ...rest, hasPassword: !!password_hash, marketing: !!u.marketing };
}

// ---------- passwords ----------
export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(bits)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iter, saltB64, hash] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const salt = Uint8Array.from(atob(saltB64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: Number(iter) }, key, 256);
  return timingSafeEqual(b64url(bits), hash);
}

export function checkPasswordStrength(pw: unknown): string {
  if (typeof pw !== "string" || pw.length < 10) throw new HttpError(400, "Use a password of at least 10 characters");
  if (pw.length > 200) throw new HttpError(400, "Password is too long");
  return pw;
}

// ---------- sessions ----------
export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken(32);
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), userId, expires).run();
  return token;
}

export async function currentUser(env: Env, req: Request): Promise<User | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const hash = await sha256(auth.slice(7));
  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  )
    .bind(hash, Date.now())
    .first<User>();
  return row ?? null;
}

export async function requireUser(env: Env, req: Request): Promise<User> {
  const u = await currentUser(env, req);
  if (!u) throw new HttpError(401, "Sign in to continue");
  return u;
}

export async function requireAdmin(env: Env, req: Request): Promise<User> {
  const u = await requireUser(env, req);
  if (u.role !== "admin") throw new HttpError(403, "Admin access only");
  return u;
}

export async function destroySession(env: Env, req: Request) {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(auth.slice(7))).run();
}

function roleFor(env: Env, email: string): string {
  const admins = (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase()) ? "admin" : "member";
}

export async function createUser(env: Env, email: string, name: string | null, passwordHash: string | null): Promise<User> {
  const uid = id("usr");
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)")
    .bind(uid, email.toLowerCase(), name, passwordHash, roleFor(env, email))
    .run();
  // attach any guest orders placed with this email
  await env.DB.prepare("UPDATE orders SET user_id = ? WHERE user_id IS NULL AND lower(email) = ?").bind(uid, email.toLowerCase()).run();
  return (await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(uid).first<User>())!;
}

// ---------- OAuth ----------
export type Provider = "google" | "facebook";

export function enabledProviders(env: Env): Provider[] {
  const p: Provider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) p.push("google");
  if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) p.push("facebook");
  return p;
}

function callbackUrl(env: Env, provider: Provider) {
  return `${env.API_URL}/auth/oauth/${provider}/callback`;
}

export function safeReturnTo(env: Env, value: string | null): string {
  const fallback = `${env.SITE_URL}/account/`;
  if (!value) return fallback;
  try {
    const u = new URL(value);
    return u.origin === new URL(env.SITE_URL).origin ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}

export async function oauthStart(env: Env, provider: Provider, returnTo: string): Promise<string> {
  if (!enabledProviders(env).includes(provider)) throw new HttpError(404, "That sign-in option is not available");
  const state = randomToken(24);
  const verifier = randomToken(48);
  await env.DB.prepare("INSERT INTO oauth_states (state, provider, verifier, return_to, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(state, provider, verifier, returnTo, Date.now() + 10 * 60_000)
    .run();
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  if (provider === "google") {
    const q = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: callbackUrl(env, provider),
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  const v = env.FACEBOOK_GRAPH_VERSION ?? "v23.0";
  const q = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    redirect_uri: callbackUrl(env, provider),
    response_type: "code",
    scope: "email,public_profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://www.facebook.com/${v}/dialog/oauth?${q}`;
}

interface Profile {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

async function fetchProfile(env: Env, provider: Provider, code: string, verifier: string): Promise<Profile> {
  if (provider === "google") {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl(env, provider),
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    }).then((r) => r.json<any>());
    if (!tok.access_token) throw new HttpError(400, "Google sign-in failed");
    const p = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then((r) => r.json<any>());
    return { subject: p.sub, email: p.email ?? null, emailVerified: !!p.email_verified, name: p.name ?? null };
  }
  const v = env.FACEBOOK_GRAPH_VERSION ?? "v23.0";
  const q = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    client_secret: env.FACEBOOK_APP_SECRET!,
    redirect_uri: callbackUrl(env, provider),
    code,
    code_verifier: verifier,
  });
  const tok = await fetch(`https://graph.facebook.com/${v}/oauth/access_token?${q}`).then((r) => r.json<any>());
  if (!tok.access_token) throw new HttpError(400, "Facebook sign-in failed");
  const p = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name,email&access_token=${encodeURIComponent(tok.access_token)}`).then((r) =>
    r.json<any>(),
  );
  // Facebook only returns an email address the person has confirmed.
  return { subject: p.id, email: p.email ?? null, emailVerified: !!p.email, name: p.name ?? null };
}

export async function oauthCallback(env: Env, provider: Provider, url: URL): Promise<{ token: string; returnTo: string; isNew: boolean }> {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || !code) throw new HttpError(400, "Sign-in was cancelled");
  const row = await env.DB.prepare("SELECT * FROM oauth_states WHERE state = ? AND provider = ?").bind(state, provider).first<any>();
  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ? OR expires_at < ?").bind(state, Date.now()).run();
  if (!row || row.expires_at < Date.now()) throw new HttpError(400, "Sign-in link expired. Try again.");

  const profile = await fetchProfile(env, provider, code, row.verifier);
  let isNew = false;
  let userId = (
    await env.DB.prepare("SELECT user_id FROM identities WHERE provider = ? AND subject = ?").bind(provider, profile.subject).first<{ user_id: string }>()
  )?.user_id;

  if (!userId) {
    if (!profile.email || !profile.emailVerified) throw new HttpError(400, "Your account did not share a verified email address. Register with email instead.");
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(profile.email.toLowerCase()).first<{ id: string }>();
    if (existing) userId = existing.id;
    else {
      userId = (await createUser(env, profile.email, profile.name, null)).id;
      isNew = true;
    }
    await env.DB.prepare("INSERT INTO identities (provider, subject, user_id) VALUES (?, ?, ?)").bind(provider, profile.subject, userId).run();
  }
  return { token: await createSession(env, userId), returnTo: row.return_to, isNew };
}

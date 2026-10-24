import { getToken, setToken } from "./store";

export const API_URL: string = (import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");
export const BASE: string = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export function url(path: string): string {
  return BASE + path.replace(/^\//, "");
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, { ...init, headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the shop right now. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) setToken(null);
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Something went wrong. Try again.");
  return data as T;
}

export function showMessage(el: Element | null, text: string, kind: "error" | "ok" | "" = "error") {
  if (!el) return;
  el.className = `notice ${kind}`;
  el.textContent = text;
}

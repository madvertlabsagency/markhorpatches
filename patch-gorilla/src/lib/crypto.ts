import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error("APP_SECRET is missing or too short");
  return s;
}

export function hmac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Compact signed token: base64url(json).signature — used for upload URLs, guest order links. */
export function signPayload<T extends object>(data: T, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyPayload<T>(token: string | null | undefined): (T & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Guest access to a specific order (emailed links, success page). */
export function orderAccessToken(orderId: string) {
  return hmac(`order:${orderId}`);
}

export function verifyOrderAccessToken(orderId: string, token: string | null | undefined) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(orderAccessToken(orderId));
  return a.length === b.length && timingSafeEqual(a, b);
}

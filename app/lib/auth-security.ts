import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "phm_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SignedSessionPayload = {
  token: string;
  expiresAt: number;
  mustChangePassword: boolean;
};

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function hashRateLimitKey(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function createSignedSessionCookie(payload: SignedSessionPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}
export function verifySessionCookie(value: string | undefined, secret: string, now = Math.floor(Date.now() / 1000)): SignedSessionPayload | null {
  if (!value || !secret) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const encoded = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(createHmac("sha256", secret).update(encoded).digest("base64url"));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SignedSessionPayload>;
    if (typeof payload.token !== "string" || !/^[A-Za-z0-9_-]{40,}$/.test(payload.token) ||
        typeof payload.expiresAt !== "number" || !Number.isSafeInteger(payload.expiresAt) ||
        payload.expiresAt <= now || typeof payload.mustChangePassword !== "boolean") return null;
    return { token: payload.token, expiresAt: payload.expiresAt, mustChangePassword: payload.mustChangePassword };
  } catch { return null; }
}
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

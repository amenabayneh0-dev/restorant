import { createHash, createHmac } from "node:crypto";

// Deterministic per idempotency key, so a retried submission yields the SAME tracking link.
// Unguessable without the server secret.
export function trackingTokenFor(idempotencyKey: string, secret: string): string {
  if (secret.length < 32) throw new Error("TRACKING_TOKEN_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(idempotencyKey).digest("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const isPlausibleToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

import { createHash } from "node:crypto";

function firstForwarded(value: string | null): string | null {
  return value ? value.split(",")[0]!.trim() : null;
}

// Best-effort client IP from the usual proxy headers (Vercel sets
// x-forwarded-for). Falls back to a constant so hashing still works locally.
export function getClientIp(req: Request): string {
  return firstForwarded(req.headers.get("x-forwarded-for")) ?? req.headers.get("x-real-ip") ?? "0.0.0.0";
}

// Stable, non-reversible per-visitor identity for one-vote-per-person on polls.
// Salted so the stored hash isn't a plain IP+UA digest.
export function voterHashFromParts(ip: string, ua: string): string {
  const salt = process.env.POLL_HASH_SALT ?? "qrcode-poll-salt";
  return createHash("sha256").update(`${salt}:${ip}:${ua}`).digest("hex");
}

export function voterHash(req: Request): string {
  return voterHashFromParts(getClientIp(req), req.headers.get("user-agent") ?? "");
}

// Same hash from a Headers object (server components read next/headers()).
export function voterHashFromHeaders(h: Headers): string {
  const ip = firstForwarded(h.get("x-forwarded-for")) ?? h.get("x-real-ip") ?? "0.0.0.0";
  return voterHashFromParts(ip, h.get("user-agent") ?? "");
}

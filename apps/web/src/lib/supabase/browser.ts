"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { DbClient, Database } from "@portfolio/shared";
import { publicSupabaseEnv } from "./env";

let cached: DbClient | null | undefined;

// Singleton browser client (cookie-based session, used for auth + realtime).
// Returns null when Supabase isn't configured so callers degrade gracefully.
export function getBrowserSupabase(): DbClient | null {
  if (cached !== undefined) return cached;
  const env = publicSupabaseEnv();
  cached = env ? createBrowserClient<Database>(env.url, env.anonKey) : null;
  return cached;
}

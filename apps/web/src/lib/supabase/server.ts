import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAnonClient, createServiceClient, type DbClient } from "@portfolio/shared";
import type { Database } from "@portfolio/shared";
import { publicSupabaseEnv } from "./env";

// Auth-aware server client bound to the request cookies. Use for reads/writes
// that should run as the signed-in admin (respects RLS). Returns null when
// Supabase isn't configured.
export async function getServerSupabase(): Promise<DbClient | null> {
  const env = publicSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only; the
          // middleware refreshes the session so this is safe to ignore.
        }
      },
    },
  });
}

// Anon client for PUBLIC reads (no session). RLS returns only visible widgets —
// exactly what the public /qrcode needs. Never returns hidden rows.
export function getPublicServerSupabase(): DbClient | null {
  const env = publicSupabaseEnv();
  if (!env) return null;
  return createAnonClient(env.url, env.anonKey);
}

// Service-role client — bypasses RLS. Reserved for trusted server writes on
// anonymous-facing endpoints (guestbook insert, poll vote). Never exposed to
// the browser. Falls back to null if the key is absent.
export function getServiceSupabase(): DbClient | null {
  const env = publicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;
  return createServiceClient(env.url, serviceKey);
}

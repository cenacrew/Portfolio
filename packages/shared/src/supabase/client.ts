import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Typed Supabase client alias reused across the codebase.
export type DbClient = SupabaseClient<Database>;

// Plain anon client (public reads, mobile app, server-side fallback reads).
// Never carries a user session by itself — auth-aware clients live in the web
// app (@supabase/ssr, cookie-based).
export function createAnonClient(url: string, anonKey: string): DbClient {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Anon client that carries a user's access token (JWT) on every request, so
// PostgREST runs the query AS that authenticated user and RLS applies to them.
// Used server-side to honour a Bearer token sent by the mobile app (which holds
// a Supabase session, not the web's cookies). The token is still verified with
// `auth.getUser()` before trusting it — this only wires it onto the requests.
export function createBearerClient(url: string, anonKey: string, token: string): DbClient {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Service-role client — bypasses RLS. MUST only ever be instantiated in a
// trusted server context (API routes / server actions). Never ship the service
// key to the browser.
export function createServiceClient(url: string, serviceRoleKey: string): DbClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

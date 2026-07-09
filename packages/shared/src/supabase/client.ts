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

// Service-role client — bypasses RLS. MUST only ever be instantiated in a
// trusted server context (API routes / server actions). Never ship the service
// key to the browser.
export function createServiceClient(url: string, serviceRoleKey: string): DbClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

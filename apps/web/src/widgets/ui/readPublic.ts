import "server-only";
import type { DbClient } from "@portfolio/shared";
import { getPublicServerSupabase } from "@/lib/supabase/server";

// Shared "public read with graceful fallback" used by widget server Renderers.
// Returns `fallback` when Supabase isn't configured OR the read throws (e.g. a
// table that doesn't exist yet, pre-migration), so a widget can never break the
// server-rendered /qrcode page. Collapses the repeated
// "default + getPublicServerSupabase + try/catch" idiom into one call.
export async function readPublicOrDefault<T>(
  read: (client: DbClient) => Promise<T>,
  fallback: T,
): Promise<T> {
  const supabase = getPublicServerSupabase();
  if (!supabase) return fallback;
  try {
    return await read(supabase);
  } catch {
    return fallback;
  }
}

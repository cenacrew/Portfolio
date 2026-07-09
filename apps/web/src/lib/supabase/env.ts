// Client-safe Supabase env access. Only the public URL + anon key are read
// here, so this module is safe to import from client components. The service
// role key is read exclusively in server.ts.
//
// The whole point of returning null when unset: /qrcode must keep working with
// the local config fallback when Supabase isn't configured yet (prod stays up).

export interface PublicSupabaseEnv {
  url: string;
  anonKey: string;
}

export function publicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return publicSupabaseEnv() !== null;
}

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@portfolio/shared";

// Anon Supabase client for the mobile admin. The anon key is public; every
// write is authorised by the signed-in user's session and enforced by RLS.
// The service_role key is NEVER shipped to the app.
//
// Session persistence uses AsyncStorage so the user stays logged in across
// launches (auto-login). URL polyfill above is required for supabase-js on RN.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy apps/mobile/.env.example to apps/mobile/.env and fill them in.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const STORAGE_BUCKET = "widget-media";
export const SUPABASE_URL = url;

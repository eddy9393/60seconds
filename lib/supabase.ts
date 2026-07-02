import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "./config";

// Ported from getSupabaseClient() in assets/js/app.js — a cached singleton
// client so every component/page reuses the same auth session.
let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = APP_CONFIG.supabase;
  if (!url || !anonKey) {
    throw new Error("Supabase configuration is missing.");
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

// Convenience export for call sites that used to do `const supabase = ...`
export const supabase = typeof window !== "undefined" ? getSupabaseClient() : (null as unknown as SupabaseClient);

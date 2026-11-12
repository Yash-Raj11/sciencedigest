/**
 * The one place the Supabase client is created.
 *
 * With no NEXT_PUBLIC_SUPABASE_URL set the app runs in DEMO MODE: everything
 * is kept on the device, nothing is sent anywhere, and `supabase()` returns
 * null. That is how the project runs straight after `npm install`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemo = !url || !key;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (isDemo) return null;
  client ??= createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

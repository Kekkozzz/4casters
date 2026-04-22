import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use from "use client" components.
 *
 * Uses the modern "publishable key" naming. Never embed the secret
 * `service_role` key here.
 */
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing. See .env.example.",
    );
  }
  return createBrowserClient(url, key);
}

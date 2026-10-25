import "server-only";
import { createClient } from "@supabase/supabase-js";
import { secretKey, supabaseUrl } from "./env";

// Server-only. Uses the secret key, which must never reach the browser.
export function adminClient() {
  const url = supabaseUrl();
  const key = secretKey();
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

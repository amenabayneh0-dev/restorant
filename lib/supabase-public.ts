import { createClient } from "@supabase/supabase-js";
import { publicKey, supabaseUrl } from "./env";

// Anonymous client. It can only do what the database's row-level security allows visitors to do.
export function publicClient() {
  const url = supabaseUrl();
  const key = publicKey();
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

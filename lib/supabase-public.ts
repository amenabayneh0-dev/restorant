import { createClient } from "@supabase/supabase-js";

// Browser-safe client. It can only do what the database's row-level security allows visitors to do.
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public environment variables are missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicKey, supabaseUrl } from "./env";

// A client that acts AS THE LOGGED-IN STAFF MEMBER (cookie session). Database row-level security decides what
// they may see and change; this code never uses the secret key for staff actions.
export async function staffClient() {
  const url = supabaseUrl();
  const key = publicKey();
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server Components cannot set cookies; middleware refreshes the session instead, so ignore that case.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}

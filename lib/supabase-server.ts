import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Per-request client that acts AS the signed-in staff member, so database rules apply to them.
export async function serverClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only in server components; middleware refreshes */ } },
    },
  });
}

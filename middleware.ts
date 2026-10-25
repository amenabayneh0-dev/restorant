import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicKey, supabaseUrl } from "@/lib/env";

// Keeps the staff login session fresh (access tokens expire hourly). Only runs on /staff pages.
export async function middleware(req: NextRequest) {
  const url = supabaseUrl();
  const key = publicKey();
  if (!url || !key) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  try { await supabase.auth.getUser(); } catch {}
  return res;
}
export const config = { matcher: ["/staff/:path*"] };

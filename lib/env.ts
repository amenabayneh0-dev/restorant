// Central, forgiving environment-variable access.
// Vercel is easy to misconfigure by copy-paste (stray spaces/quotes/newlines, a URL ending in /rest/v1),
// and Supabase has two key naming schemes. This accepts both and cleans values up.
// NOTE: NEXT_PUBLIC_* must be referenced as literals so Next.js can inline them.

const clean = (v: string | undefined) => v?.trim().replace(/^["']+|["']+$/g, "").trim() || undefined;

export function supabaseUrl(): string | undefined {
  const raw = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return raw?.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
export const publicKey = () =>
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const secretKey = () => clean(process.env.SUPABASE_SECRET_KEY) ?? clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const trackingSecret = () => clean(process.env.TRACKING_TOKEN_SECRET);

/** Which settings are present (never the values). Used by /api/health. */
export function envReport() {
  const t = trackingSecret();
  return {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: !!publicKey(),
    SUPABASE_SECRET_KEY: !!secretKey(),
    TRACKING_TOKEN_SECRET: !!t && t.length >= 32,
  };
}
export const envProblems = () => Object.entries(envReport()).filter(([, ok]) => !ok).map(([name]) => name);

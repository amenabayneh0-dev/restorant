/** Public site URL for metadata, sitemap and OG tags. Vercel provides the production host automatically. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

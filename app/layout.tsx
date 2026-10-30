import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "@fontsource-variable/dancing-script";
import "./globals.css";
import { getMenu } from "@/lib/menu";
import { siteUrl } from "@/lib/site";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#120d0a" };

// The page title comes from the restaurant's own settings, so it is never out of date.
export async function generateMetadata(): Promise<Metadata> {
  const base = { metadataBase: new URL(siteUrl()) };
  try {
    const { settings } = await getMenu();
    const description = settings.tagline || settings.description || `Order online from ${settings.name}.`;
    return { ...base, title: { default: `${settings.name} | Order online`, template: `%s | ${settings.name}` }, description,
      openGraph: { title: settings.name, description, type: "website", siteName: settings.name } };
  } catch {
    return { ...base, title: "Order online", description: "Order online." };
  }
}

// Tells CSS that JavaScript is running and animation is allowed, so entrance states never hide content from no-JS
// visitors or from people who prefer reduced motion.
const BOOT = "document.documentElement.dataset.js='1';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='1';";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: BOOT }} /></head>
      <body>{children}</body>
    </html>
  );
}

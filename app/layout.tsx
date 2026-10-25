import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getMenu } from "@/lib/menu";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// The page title comes from the restaurant's own settings, so it is never out of date.
export async function generateMetadata(): Promise<Metadata> {
  try {
    const { settings } = await getMenu();
    return { title: `${settings.name} | Menu`, description: settings.description || `Order online from ${settings.name}.` };
  } catch {
    return { title: "Menu", description: "Order online." };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}

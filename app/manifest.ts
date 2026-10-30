import type { MetadataRoute } from "next";
import { getMenu } from "@/lib/menu";
export const dynamic = "force-dynamic";
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Restaurant";
  try { name = (await getMenu()).settings.name; } catch {}
  return { name, short_name: name.slice(0, 12), start_url: "/", display: "standalone", background_color: "#fbf5ea", theme_color: "#2b1b12",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}

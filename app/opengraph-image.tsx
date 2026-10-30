import { ImageResponse } from "next/og";
import { getMenu } from "@/lib/menu";
export const dynamic = "force-dynamic";
export const alt = "Restaurant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  let name = "Order online", line = "";
  try { const { settings } = await getMenu(); name = settings.name; line = settings.tagline || settings.description; } catch {}
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#2b1b12,#4a2a18)", color: "#fbf0dc" }}>
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#e39a1c" }}>Order direct</div>
      <div style={{ display: "flex", fontSize: 110, fontWeight: 700, lineHeight: 1.02, marginTop: 20 }}>{name}</div>
      <div style={{ display: "flex", fontSize: 36, marginTop: 28, color: "#e8d5b5", maxWidth: 900 }}>{line}</div>
    </div>), size);
}

import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "./supabase-admin";
import { EXT, checkImage, sniffImage } from "./staff-schemas";

export const BUCKET = "menu";

/** Uploads a validated image to the public "menu" bucket. CALLERS MUST VERIFY THE USER IS AN ADMIN FIRST. */
export async function uploadImage(file: File, folder: "items" | "hero"): Promise<{ url: string } | { error: string }> {
  const bad = checkImage(file);
  if (bad) return { error: bad };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const real = sniffImage(bytes);
  if (!real) return { error: "That file isn't a valid JPEG, PNG or WebP image" };
  const path = `${folder}/${randomUUID()}.${EXT[real]}`;
  const admin = adminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: real, cacheControl: "31536000", upsert: false });
  if (error) { console.error("[upload]", error.message); return { error: "Photo upload failed. Please try again." }; }
  return { url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

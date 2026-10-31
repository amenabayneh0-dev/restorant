"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/staff-auth";
import { firstIssue, parseHours, settingsSchema } from "@/lib/staff-schemas";
import { uploadImage } from "@/lib/upload";

const back = (kind: "saved" | "err", msg = "1"): never => redirect(`/staff/settings?${kind}=${encodeURIComponent(msg.slice(0, 200))}`);

export async function saveSettings(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"), tagline: formData.get("tagline") ?? "", description: formData.get("description") ?? "",
    phone: formData.get("phone") ?? "", address: formData.get("address") ?? "",
    currency_code: formData.get("currency_code"), timezone: formData.get("timezone"),
    delivery_enabled: formData.get("delivery_enabled"), delivery_fee: formData.get("delivery_fee") || 0,
    accepting_orders: formData.get("accepting_orders"), enabled_fulfillment: formData.getAll("enabled_fulfillment").map(String),
  });
  if (!parsed.success) return back("err", firstIssue(parsed.error));
  const { hours, error: hErr } = parseHours((k) => formData.get(k));
  if (hErr) return back("err", hErr);

  // Delivery is on exactly when "delivery" is one of the enabled ways to receive orders.
  const patch: Record<string, unknown> = { ...parsed.data, delivery_enabled: parsed.data.enabled_fulfillment.includes("delivery"), opening_hours: hours };
  const file = formData.get("hero");
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(file, "hero");
    if ("error" in up) return back("err", up.error);
    patch.hero_image_url = up.url;
  } else if (formData.get("remove_hero") === "on") patch.hero_image_url = null;

  const { data, error } = await db.from("restaurant_settings").update(patch).eq("id", true).select("id");
  if (error || !data?.length) { console.error("[settings] update:", error?.message); return back("err", "Could not save (are you signed in as admin?)"); }
  revalidatePath("/"); revalidatePath("/staff", "layout");
  return back("saved");
}

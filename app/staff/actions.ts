"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffClient } from "@/lib/supabase-staff";

const uuid = z.string().uuid();
const status = z.enum(["accepted", "rejected", "preparing", "ready", "completed", "cancelled"]);
const fail = (code: string): never => redirect(`/staff?err=${code}`);

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/staff/login?error=1");
  const db = await staffClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) redirect("/staff/login?error=1");
  redirect("/staff");
}

export async function signOut() {
  const db = await staffClient();
  await db.auth.signOut();
  redirect("/staff/login");
}

// Authorization is enforced by the database (change_order_status checks the staff role and the allowed transition).
export async function setStatus(formData: FormData) {
  const id = uuid.safeParse(formData.get("orderId"));
  const to = status.safeParse(formData.get("to"));
  if (!id.success || !to.success) return fail("bad");
  const db = await staffClient();
  const { error } = await db.rpc("change_order_status", { p_order_id: id.data, p_new: to.data });
  if (error) {
    console.error("[staff] change_order_status:", error.message);
    return fail(/FORBIDDEN|NOT_STAFF/.test(error.message) ? "forbidden" : "failed");
  }
  revalidatePath("/staff");
}

export async function setAccepting(formData: FormData) {
  const db = await staffClient();
  const { data, error } = await db.from("restaurant_settings").update({ accepting_orders: formData.get("value") === "true" }).eq("id", true).select("id");
  if (error || !data?.length) return fail("forbidden"); // not an admin (row-level security matched 0 rows)
  revalidatePath("/staff"); revalidatePath("/");
}

export async function setAvailable(formData: FormData) {
  const id = uuid.safeParse(formData.get("itemId"));
  if (!id.success) return fail("bad");
  const db = await staffClient();
  const { data, error } = await db.from("menu_items").update({ is_available: formData.get("value") === "true" }).eq("id", id.data).select("id");
  if (error || !data?.length) return fail("forbidden");
  revalidatePath("/staff"); revalidatePath("/");
}

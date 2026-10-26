"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase-server";
import { friendlyStatusError, isStatus } from "@/lib/transitions";

export async function login(fd: FormData) {
  const sb = await serverClient();
  const { error } = await sb.auth.signInWithPassword({ email: String(fd.get("email") ?? "").trim(), password: String(fd.get("password") ?? "") });
  redirect(error ? "/staff/login?error=1" : "/staff");
}
export async function logout() {
  await (await serverClient()).auth.signOut();
  redirect("/staff/login");
}
export async function changeStatus(fd: FormData) {
  const parsed = z.object({ id: z.string().uuid(), to: z.string().refine(isStatus) }).safeParse({ id: fd.get("id"), to: fd.get("to") });
  if (!parsed.success) redirect("/staff?error=" + encodeURIComponent("Invalid request."));
  const sb = await serverClient();
  const { error } = await sb.rpc("change_order_status", { p_order_id: parsed.data.id, p_new: parsed.data.to });
  revalidatePath("/staff");
  if (error) redirect("/staff?error=" + encodeURIComponent(friendlyStatusError(error.message)));
}

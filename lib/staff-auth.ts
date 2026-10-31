import "server-only";
import { redirect } from "next/navigation";
import { staffClient } from "./supabase-staff";
import type { StaffRole } from "./status";

/** Loads the signed-in staff member or redirects. Pass `roles` to restrict a page/action (the database enforces it too). */
export async function requireStaff(roles?: StaffRole[]) {
  const db = await staffClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect("/staff/login");
  const { data } = await db.rpc("current_staff_role");
  const role = data as StaffRole | null;
  if (!role) redirect("/staff");              // /staff shows the "no access" message
  if (roles && !roles.includes(role)) redirect("/staff?err=forbidden");
  return { db, role, user: auth.user };
}

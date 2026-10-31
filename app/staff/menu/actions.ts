"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/staff-auth";
import { categorySchema, firstIssue, itemSchema, optionSchema, slugify } from "@/lib/staff-schemas";
import { uploadImage } from "@/lib/upload";

const uuid = z.string().uuid();
const back = (path: string, kind: "saved" | "err", msg = "1"): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg.slice(0, 200))}`);
const refresh = () => { revalidatePath("/"); revalidatePath("/staff/menu"); revalidatePath("/staff"); };
const isUnique = (e: { code?: string } | null) => e?.code === "23505";

export async function saveItem(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? uuid.safeParse(rawId) : null;
  if (rawId && !id?.success) return back("/staff/menu", "err", "Invalid item");
  const here = id?.success ? `/staff/menu/${id.data}` : "/staff/menu/new";

  const parsed = itemSchema.safeParse({
    name: formData.get("name"), category_id: formData.get("category_id"), description: formData.get("description") ?? "",
    price: formData.get("price"), tags: formData.getAll("tags").map(String),
    is_featured: formData.get("is_featured"), is_published: formData.get("is_published"), is_available: formData.get("is_available"),
    sort_order: formData.get("sort_order") || 0,
  });
  if (!parsed.success) return back(here, "err", firstIssue(parsed.error));

  const patch: Record<string, unknown> = { ...parsed.data };
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(file, "items");
    if ("error" in up) return back(here, "err", up.error);
    patch.image_url = up.url;
  } else if (formData.get("remove_image") === "on") patch.image_url = null;

  if (id?.success) {
    const { data, error } = await db.from("menu_items").update(patch).eq("id", id.data).select("id");
    if (error || !data?.length) { console.error("[menu] update item:", error?.message); return back(here, "err", "Could not save (are you signed in as admin?)"); }
    refresh(); return back(here, "saved");
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db.from("menu_items").insert({ ...patch, slug: slugify(parsed.data.name) }).select("id").single();
    if (!error && data) { refresh(); return back(`/staff/menu/${data.id}`, "saved", "created"); }
    if (!isUnique(error)) { console.error("[menu] insert item:", error?.message); return back(here, "err", "Could not create the dish"); }
  }
  return back(here, "err", "Could not create the dish, please retry");
}

export async function setItemArchived(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return back("/staff/menu", "err", "Invalid item");
  const archive = formData.get("archive") === "true";
  const { data, error } = await db.from("menu_items").update(archive ? { archived_at: new Date().toISOString(), is_published: false } : { archived_at: null }).eq("id", id.data).select("id");
  if (error || !data?.length) return back("/staff/menu", "err", "Could not update the dish");
  refresh(); return back("/staff/menu", "saved", archive ? "archived" : "restored");
}

export async function addOption(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const parsed = optionSchema.safeParse({ menu_item_id: formData.get("menu_item_id"), group_name: formData.get("group_name"), name: formData.get("name"), extra_price: formData.get("extra_price") || 0 });
  const here = `/staff/menu/${String(formData.get("menu_item_id"))}`;
  if (!parsed.success) return back(uuid.safeParse(formData.get("menu_item_id")).success ? here : "/staff/menu", "err", firstIssue(parsed.error));
  const { count } = await db.from("menu_item_options").select("id", { count: "exact", head: true }).eq("menu_item_id", parsed.data.menu_item_id);
  const { error } = await db.from("menu_item_options").insert({ ...parsed.data, sort_order: count ?? 0 });
  if (error) { console.error("[menu] add option:", error.message); return back(here, "err", "Could not add the option"); }
  refresh(); return back(here, "saved", "option");
}

export async function deleteOption(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id")); const item = uuid.safeParse(formData.get("menu_item_id"));
  if (!id.success || !item.success) return back("/staff/menu", "err", "Invalid option");
  const here = `/staff/menu/${item.data}`;
  const { data, error } = await db.from("menu_item_options").delete().eq("id", id.data).select("id");
  if (error || !data?.length) return back(here, "err", "Could not remove the option");
  refresh(); return back(here, "saved", "option removed");
}

export async function addCategory(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const parsed = categorySchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "" });
  if (!parsed.success) return back("/staff/menu", "err", firstIssue(parsed.error));
  const { data: last } = await db.from("menu_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sort_order = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await db.from("menu_categories").insert({ ...parsed.data, slug: slugify(parsed.data.name), sort_order });
    if (!error) { refresh(); return back("/staff/menu", "saved", "category added"); }
    if (!isUnique(error)) { console.error("[menu] add category:", error.message); break; }
  }
  return back("/staff/menu", "err", "Could not add the category");
}

export async function renameCategory(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id"));
  const parsed = categorySchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "" });
  if (!id.success) return back("/staff/menu", "err", "Invalid category");
  if (!parsed.success) return back("/staff/menu", "err", firstIssue(parsed.error));
  const { data, error } = await db.from("menu_categories").update(parsed.data).eq("id", id.data).select("id");
  if (error || !data?.length) return back("/staff/menu", "err", "Could not rename the category");
  refresh(); return back("/staff/menu", "saved", "category renamed");
}

export async function setCategoryPublished(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return back("/staff/menu", "err", "Invalid category");
  const { data, error } = await db.from("menu_categories").update({ is_published: formData.get("value") === "true" }).eq("id", id.data).select("id");
  if (error || !data?.length) return back("/staff/menu", "err", "Could not update the category");
  refresh(); return back("/staff/menu", "saved", "category updated");
}

/** Swaps a category with its neighbour by renumbering everything 10, 20, 30... */
export async function moveCategory(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id")); const dir = formData.get("dir") === "up" ? -1 : 1;
  if (!id.success) return back("/staff/menu", "err", "Invalid category");
  const { data: cats } = await db.from("menu_categories").select("id,sort_order").is("archived_at", null).order("sort_order").order("name");
  const list = (cats ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex((c) => c.id === id.data); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return back("/staff/menu", "saved", "already there");
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].sort_order === (k + 1) * 10) continue;
    const { error } = await db.from("menu_categories").update({ sort_order: (k + 1) * 10 }).eq("id", list[k].id);
    if (error) return back("/staff/menu", "err", "Could not reorder");
  }
  refresh(); return back("/staff/menu", "saved", "order updated");
}

export async function setCategoryArchived(formData: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return back("/staff/menu", "err", "Invalid category");
  const archive = formData.get("archive") === "true";
  const { data, error } = await db.from("menu_categories").update(archive ? { archived_at: new Date().toISOString(), is_published: false } : { archived_at: null }).eq("id", id.data).select("id");
  if (error || !data?.length) return back("/staff/menu", "err", "Could not update the category");
  refresh(); return back("/staff/menu", "saved", archive ? "category archived" : "category restored");
}

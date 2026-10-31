import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/staff-auth";
import { TAGS } from "@/lib/tags";
import { formatMoney } from "@/lib/money";
import { StaffNav } from "@/components/staff/StaffNav";
import { Flash } from "@/components/staff/Flash";
import { ImageField } from "@/components/staff/ImageField";
import { addOption, deleteOption, saveItem, setItemArchived } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit dish", robots: { index: false, follow: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Opt = { id: string; group_name: string; name: string; extra_price: number; sort_order: number };

export default async function EditItem({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { id } = await params; const { saved, err } = await searchParams;
  const isNew = id === "new";
  if (!isNew && !UUID.test(id)) notFound();
  const { db, role } = await requireStaff(["admin"]);

  const [{ data: cats }, { data: s }, itemRes] = await Promise.all([
    db.from("menu_categories").select("id,name").is("archived_at", null).order("sort_order").order("name"),
    db.from("restaurant_settings").select("currency_code").maybeSingle(),
    isNew ? Promise.resolve({ data: null }) : db.from("menu_items").select("*, menu_item_options(id,group_name,name,extra_price,sort_order)").eq("id", id).maybeSingle(),
  ]);
  const item = itemRes.data as (Record<string, any> & { menu_item_options: Opt[] }) | null;
  if (!isNew && !item) notFound();
  const cur = s?.currency_code ?? "ETB";
  const categories = (cats ?? []) as { id: string; name: string }[];
  const options = [...(item?.menu_item_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const groups = [...new Set(options.map((o) => o.group_name))];

  return (
    <main className="wrap staff">
      <StaffNav role={role} active="menu" />
      <p><Link href="/staff/menu" className="muted">← Back to menu</Link></p>
      <h1>{isNew ? "Add a dish" : item!.name}</h1>
      <Flash saved={saved} err={err} />
      {categories.length === 0 && <p className="notice bad" role="alert">Create a category first, then come back to add a dish.</p>}

      <form action={saveItem} className="panelbox">
        {!isNew && <input type="hidden" name="id" value={id} />}
        <label className="fld">Name<input name="name" required maxLength={120} defaultValue={item?.name ?? ""} /></label>
        <label className="fld">Category
          <select name="category_id" required defaultValue={item?.category_id ?? categories[0]?.id ?? ""}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="fld">Description<textarea name="description" maxLength={600} defaultValue={item?.description ?? ""} /></label>
        <label className="fld">Price ({cur})<input name="price" inputMode="decimal" required defaultValue={item?.price ?? ""} /></label>

        <fieldset className="tagset"><legend>Labels</legend>
          {TAGS.map((t) => (
            <label key={t.id} className="check"><input type="checkbox" name="tags" value={t.id} defaultChecked={item?.tags?.includes(t.id)} /> {t.label}</label>
          ))}
        </fieldset>

        <fieldset className="tagset"><legend>Visibility</legend>
          <label className="check"><input type="checkbox" name="is_published" defaultChecked={item ? item.is_published : true} /> Show on the website</label>
          <label className="check"><input type="checkbox" name="is_available" defaultChecked={item ? item.is_available : true} /> Available to order (untick = sold out)</label>
          <label className="check"><input type="checkbox" name="is_featured" defaultChecked={item?.is_featured ?? false} /> Feature on the home page</label>
        </fieldset>
        <label className="fld">Sort order (smaller shows first)<input name="sort_order" type="number" min={0} max={9999} defaultValue={item?.sort_order ?? 0} /></label>

        <ImageField name="image" removeName="remove_image" current={item?.image_url ?? null} label="Photo" />
        <button className="btn solid block">{isNew ? "Create dish" : "Save changes"}</button>
      </form>

      {!isNew && (
        <>
          <section className="panelbox" aria-labelledby="opts">
            <h2 id="opts">Options &amp; extras</h2>
            <p className="muted small">Things customers can add, like “Size: Large (+20)”. Options with the same group name are shown together.</p>
            {options.length === 0 && <p className="muted">No options yet.</p>}
            {groups.map((g) => (
              <div key={g}><h3 className="sm">{g}</h3>
                {options.filter((o) => o.group_name === g).map((o) => (
                  <form key={o.id} action={deleteOption} className="stock">
                    <span>{o.name} <span className="muted">{Number(o.extra_price) > 0 ? `+${formatMoney(o.extra_price, cur)}` : "no extra cost"}</span></span>
                    <input type="hidden" name="id" value={o.id} /><input type="hidden" name="menu_item_id" value={id} />
                    <button className="btn small" aria-label={`Remove ${o.name} from ${g}`}>Remove</button>
                  </form>
                ))}
              </div>
            ))}
            <form action={addOption} className="optform">
              <input type="hidden" name="menu_item_id" value={id} />
              <label className="fld">Group<input name="group_name" required maxLength={60} placeholder="Size" list="groups" /></label>
              <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
              <label className="fld">Option<input name="name" required maxLength={80} placeholder="Large" /></label>
              <label className="fld">Extra price<input name="extra_price" inputMode="decimal" placeholder="0" /></label>
              <button className="btn small solid">Add option</button>
            </form>
          </section>

          <section className="panelbox">
            <h2>{item!.archived_at ? "Archived" : "Remove from menu"}</h2>
            <p className="muted small">Dishes are archived, not deleted, so past orders keep their history.</p>
            <form action={setItemArchived}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="archive" value={String(!item!.archived_at)} />
              <button className="btn small">{item!.archived_at ? "Restore this dish" : "Archive this dish"}</button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}

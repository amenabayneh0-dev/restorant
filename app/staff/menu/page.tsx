import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/staff-auth";
import { formatMoney } from "@/lib/money";
import { StaffNav } from "@/components/staff/StaffNav";
import { Flash } from "@/components/staff/Flash";
import { addCategory, moveCategory, renameCategory, setCategoryArchived, setCategoryPublished, setItemArchived } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu editor", robots: { index: false, follow: false } };

type Cat = { id: string; name: string; description: string | null; sort_order: number; is_published: boolean; archived_at: string | null };
type It = { id: string; category_id: string; name: string; price: number; image_url: string | null; is_published: boolean; is_available: boolean; archived_at: string | null; sort_order: number };

export default async function MenuAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { saved, err } = await searchParams;
  const { db, role } = await requireStaff(["admin"]);
  const [{ data: c }, { data: i }, { data: s }] = await Promise.all([
    db.from("menu_categories").select("id,name,description,sort_order,is_published,archived_at").order("sort_order").order("name"),
    db.from("menu_items").select("id,category_id,name,price,image_url,is_published,is_available,archived_at,sort_order").order("sort_order").order("name"),
    db.from("restaurant_settings").select("currency_code").maybeSingle(),
  ]);
  const cats = (c ?? []) as Cat[]; const items = (i ?? []) as It[]; const cur = s?.currency_code ?? "ETB";
  const live = cats.filter((x) => !x.archived_at); const gone = cats.filter((x) => x.archived_at);
  const archivedItems = items.filter((x) => x.archived_at);

  return (
    <main className="wrap staff">
      <StaffNav role={role} active="menu" />
      <div className="staff-top"><h1>Menu</h1><Link className="btn solid" href="/staff/menu/new">+ Add a dish</Link></div>
      <Flash saved={saved} err={err} />

      {live.length === 0 && <p className="notice">No categories yet. Add your first category below (for example “Starters” or “Mains”), then add dishes.</p>}

      {live.map((cat, idx) => {
        const list = items.filter((x) => x.category_id === cat.id && !x.archived_at);
        return (
          <section key={cat.id} className="panelbox" aria-labelledby={`cat-${cat.id}`}>
            <div className="cat-head">
              <h2 id={`cat-${cat.id}`}>{cat.name} {!cat.is_published && <span className="badge warn">Hidden</span>}</h2>
              <div className="cat-tools">
                <form action={moveCategory}><input type="hidden" name="id" value={cat.id} /><input type="hidden" name="dir" value="up" />
                  <button className="round sm" aria-label={`Move ${cat.name} up`} disabled={idx === 0}>↑</button></form>
                <form action={moveCategory}><input type="hidden" name="id" value={cat.id} /><input type="hidden" name="dir" value="down" />
                  <button className="round sm" aria-label={`Move ${cat.name} down`} disabled={idx === live.length - 1}>↓</button></form>
              </div>
            </div>
            <ul className="mlist">
              {list.length === 0 && <li className="muted">No dishes in this category yet.</li>}
              {list.map((it) => (
                <li key={it.id}>
                  <Link href={`/staff/menu/${it.id}`} className="mrow">
                    <span className="mthumb">{it.image_url /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={it.image_url} alt="" /> : <span aria-hidden>🍽</span>}</span>
                    <span className="mname"><b>{it.name}</b>
                      <small>{formatMoney(it.price, cur)}</small></span>
                    <span className="mbadges">
                      {!it.is_published && <span className="badge warn">Hidden</span>}
                      {!it.is_available && <span className="badge warn">Sold out</span>}
                      {it.is_published && it.is_available && <span className="badge ok">Live</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <details className="cat-more"><summary>Category settings</summary>
              <form action={renameCategory}>
                <input type="hidden" name="id" value={cat.id} />
                <label className="fld">Name<input name="name" defaultValue={cat.name} required maxLength={80} /></label>
                <label className="fld">Description (optional)<input name="description" defaultValue={cat.description ?? ""} maxLength={300} /></label>
                <button className="btn small solid" style={{ marginTop: 12 }}>Save category</button>
              </form>
              <div className="row-acts">
                <form action={setCategoryPublished}><input type="hidden" name="id" value={cat.id} /><input type="hidden" name="value" value={String(!cat.is_published)} />
                  <button className="btn small">{cat.is_published ? "Hide from customers" : "Show to customers"}</button></form>
                <form action={setCategoryArchived}><input type="hidden" name="id" value={cat.id} /><input type="hidden" name="archive" value="true" />
                  <button className="btn small">Archive category</button></form>
              </div>
            </details>
          </section>
        );
      })}

      <section className="panelbox">
        <h2>Add a category</h2>
        <form action={addCategory} className="inline-form">
          <label className="fld">Name<input name="name" required maxLength={80} placeholder="e.g. Desserts" /></label>
          <button className="btn solid">Add category</button>
        </form>
      </section>

      {(gone.length > 0 || archivedItems.length > 0) && (
        <details className="panel"><summary>Archived ({gone.length + archivedItems.length})</summary>
          <p className="muted small">Archived dishes and categories are hidden from customers but kept so past orders still make sense.</p>
          {gone.map((x) => (
            <form key={x.id} action={setCategoryArchived} className="stock"><span>Category: {x.name}</span>
              <input type="hidden" name="id" value={x.id} /><input type="hidden" name="archive" value="false" /><button className="btn small">Restore</button></form>
          ))}
          {archivedItems.map((x) => (
            <form key={x.id} action={setItemArchived} className="stock"><span>{x.name}</span>
              <input type="hidden" name="id" value={x.id} /><input type="hidden" name="archive" value="false" /><button className="btn small">Restore</button></form>
          ))}
        </details>
      )}
    </main>
  );
}

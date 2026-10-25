import { getMenu } from "@/lib/menu";
import { formatMoney } from "@/lib/money";
import { openStatus } from "@/lib/hours";
import { AddButton } from "@/components/AddButton";
import { CartBar } from "@/components/CartBar";
import type { MenuSnapshot } from "@/lib/cart";

export const dynamic = "force-dynamic";

const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]] as const;

export default async function Home() {
  const { settings: s, categories } = await getMenu();
  const status = openStatus(s.opening_hours, s.timezone);
  const cur = s.currency_code;
  const snapshot: MenuSnapshot = Object.fromEntries(categories.flatMap((c) => c.items).map((it) => [it.id, {
    price: Number(it.price), available: it.is_available,
    options: Object.fromEntries(it.menu_item_options.map((o) => [o.id, { extra: Number(o.extra_price), available: o.is_available }])),
  }]));

  return (
    <>
      <header className="hero">
        <div className="weave" aria-hidden="true" />
        <div className="wrap">
          <p className={status.open && s.accepting_orders ? "pill open" : "pill"}>
            {!s.accepting_orders ? "Not taking orders right now" : status.open ? `Open now, until ${status.closesAt}` : status.next ? `Closed, opens ${status.next}` : Object.keys(s.opening_hours).length ? "Closed today" : "Hours not set"}
          </p>
          <h1>{s.name}</h1>
          <p className="lede">{s.description}</p>
        </div>
      </header>

      <nav className="cats" aria-label="Menu categories">
        <div className="wrap">{categories.map((c) => (<a key={c.id} href={`#${c.slug}`}>{c.name}</a>))}</div>
      </nav>

      <main className="wrap">
        {categories.length === 0 && <p className="notice">The menu is being updated. Please check back soon{s.phone ? <> or call {s.phone}</> : null}.</p>}
        {categories.map((c) => (
          <section key={c.id} id={c.slug} className="cat">
            <h2>{c.name}</h2>
            {c.description && <p className="muted">{c.description}</p>}
            <ul>
              {c.items.map((it) => (
                <li key={it.id} className={it.is_available ? "" : "gone"}>
                  <div className="line">
                    <h3>{it.name}{it.is_featured && <span className="fav">House favorite</span>}</h3>
                    <span className="dots" aria-hidden="true" />
                    <span className="price">{formatMoney(it.price, cur)}</span>
                  </div>
                  <p>{it.description}</p>
                  {!it.is_available && <p className="soldout">Sold out today</p>}
                  {it.menu_item_options.length > 0 && (
                    <p className="opts">Choices: {it.menu_item_options.map((o) => o.name + (o.extra_price > 0 ? ` (+${formatMoney(o.extra_price, cur)})` : "")).join(", ")}</p>
                  )}
                  {it.is_available && s.accepting_orders && <AddButton item={it} currency={cur} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <CartBar menu={snapshot} currency={cur} deliveryFee={Number(s.delivery_fee)} fulfillment={s.enabled_fulfillment.filter((m) => m !== "delivery" || s.delivery_enabled)} open={s.accepting_orders} />

      <footer className="foot">
        <div className="wrap">
          <h2>Visit or call</h2>
          <p>{s.address}{s.address && s.phone && <br />}{s.phone}</p>
          {s.delivery_enabled && <p>Delivery available for {formatMoney(s.delivery_fee, cur)}.</p>}
          <table><tbody>{DAYS.map(([k, label]) => (<tr key={k}><th scope="row">{label}</th><td>{s.opening_hours[k] ? `${s.opening_hours[k]![0]} to ${s.opening_hours[k]![1]}` : "Closed"}</td></tr>))}</tbody></table>
        </div>
      </footer>
    </>
  );
}

import { Fragment } from "react";
import { getMenu } from "@/lib/menu";
import { formatMoney } from "@/lib/money";
import { groupHours, openStatus, todayKey } from "@/lib/hours";
import { MenuProvider } from "@/components/menu/MenuContext";
import { MenuExplorer } from "@/components/menu/MenuExplorer";
import { Gallery, Signature, SpecialCard } from "@/components/menu/Showcase";
import { NavSearch } from "@/components/NavSearch";
import { CartBar } from "@/components/CartBar";
import { PageMotion } from "@/components/PageMotion";
import { HeroPlate } from "@/components/art/HeroPlate";
import { siteUrl } from "@/lib/site";
import type { MenuSnapshot } from "@/lib/cart";

export const dynamic = "force-dynamic";

const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;
const HOW: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };
// The space must sit OUTSIDE the overflow-hidden mask span, otherwise it collapses and words run together.
const Words = ({ text }: { text: string }) => (<>{text.split(" ").map((w, i) => (<Fragment key={i}><span className="w"><span className="wi">{w}</span></span>{" "}</Fragment>))}</>);
const Svg = ({ d, size = 20 }: { d: string; size?: number }) => (<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);
const ICON = {
  leaf: "M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c3-4 6-7 10-9",
  bolt: "M13 3L5 13h6l-1 8 8-10h-6l1-8z",
  wallet: "M4 7h14a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h10M16 14h2",
  pickup: "M6 8h12l-1 12H7L6 8zm3 0a3 3 0 016 0",
  dine_in: "M8 3v7M5 3v4a3 3 0 006 0V3M8 10v11M17 3c-2 2-3 5-3 8h3v10",
  delivery: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  pin: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
} as const;
const Logo = () => (<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="#eaa56b" strokeWidth="2" /><circle cx="20" cy="23" r="9" fill="none" stroke="#eaa56b" strokeWidth="2" /><path d="M16 11c-2 2 2 3 0 6M22 9c-2 2 2 3 0 6" stroke="#eaa56b" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>);

export default async function Home() {
  const { settings: s, categories } = await getMenu();
  const status = openStatus(s.opening_hours, s.timezone);
  const today = todayKey(s.timezone);
  const cur = s.currency_code;
  const canOrder = s.accepting_orders;
  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);
  const daysOpen = Object.keys(s.opening_hours).length;
  const snapshot: MenuSnapshot = Object.fromEntries(categories.flatMap((c) => c.items).map((it) => [it.id, {
    price: Number(it.price), available: it.is_available,
    options: Object.fromEntries(it.menu_item_options.map((o) => [o.id, { extra: Number(o.extra_price), available: o.is_available }])),
  }]));
  const statusText = !canOrder ? "Not taking orders right now"
    : status.open ? `Open now · until ${status.closesAt}`
    : status.next ? `Closed · opens ${status.next}` : daysOpen ? "Closed today" : "Welcome";
  const fulfil = s.enabled_fulfillment.filter((m) => m !== "delivery" || s.delivery_enabled);
  const mapUrl = s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}` : null;
  const headline = s.tagline || s.name;
  const ld = {
    "@context": "https://schema.org", "@type": "Restaurant", name: s.name, description: s.tagline || s.description, url: siteUrl(),
    ...(s.phone ? { telephone: s.phone } : {}), ...(s.address ? { address: s.address } : {}), ...(s.hero_image_url ? { image: s.hero_image_url } : {}),
    openingHoursSpecification: DAYS.filter(([k]) => s.opening_hours[k]).map(([k, label]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: label, opens: s.opening_hours[k]![0], closes: s.opening_hours[k]![1] })),
  };

  return (
    <PageMotion>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <MenuProvider categories={categories} currency={cur} canOrder={canOrder}>
        <div className="shell">
          <header className="navpill clay-s h-anim">
            <a href="#home" className="logo"><Logo /><span><strong>{s.name}</strong></span></a>
            <nav className="navlinks" aria-label="Main"><a href="#home">Home</a><a href="#menu">Menu</a><a href="#about">About</a><a href="#visit">Visit</a></nav>
            <div className="nav-end"><NavSearch /><a href="#menu" className="btn primary small">Order now</a></div>
          </header>

          <section id="home" className="hero clay" aria-labelledby="hero-h">
            {s.hero_image_url && (/* eslint-disable-next-line @next/next/no-img-element */ <img className="hero-bg" src={s.hero_image_url} alt="" fetchPriority="high" />)}
            <div className="hero-shade" aria-hidden="true" />
            <p className="script" aria-hidden="true">Good Food, Better Moments</p>
            <div className="hero-copy">
              <p className={`status h-anim${canOrder && status.open ? " open" : ""}`}><span className="dot" aria-hidden="true" />{statusText}</p>
              <p className="eyebrow h-anim">Order online · {s.name}</p>
              <h1 id="hero-h"><Words text={headline} /></h1>
              <p className="lede h-anim">{s.description || `Fresh food, made to order. Order ahead and pick it up, dine in or get it delivered.`}</p>
              <div className="cta-row h-anim">
                <a href="#menu" className="btn primary cta-magnet">Explore menu <span aria-hidden="true">→</span></a>
                <a href="#order" className="btn">How ordering works</a>
              </div>
              <ul className="trio h-anim">
                <li><i><Svg d={ICON.leaf} /></i><span><strong>Cooked to order</strong><small>Fresh, never reheated</small></span></li>
                <li><i><Svg d={ICON.bolt} /></i><span><strong>Order direct</strong><small>No commission, no app</small></span></li>
                <li><i><Svg d={ICON.wallet} /></i><span><strong>Pay on receipt</strong><small>Cash or card, your choice</small></span></li>
              </ul>
            </div>
            {!s.hero_image_url && <div className="hero-art h-anim"><HeroPlate /></div>}
            <SpecialCard />
          </section>

          <div className="bento">
            <section id="menu" className="clay menu-panel" data-reveal aria-label="Menu">
              {categories.length === 0
                ? <p className="notice">The menu is being updated. Please check back soon{s.phone ? <> or call {s.phone}</> : null}.</p>
                : <MenuExplorer />}
            </section>
            <aside className="side">
              <section id="order" className="clay order-card" data-reveal aria-labelledby="order-h">
                <h2 id="order-h" className="panel-h sm">Order online</h2>
                <p className="muted">Choose your dishes, tell us how you want them, and follow your order live.</p>
                {fulfil.map((m) => (
                  <div key={m} className="orow pressed"><span className="ic"><Svg d={ICON[m as keyof typeof ICON] ?? ICON.pickup} /></span><span>{HOW[m] ?? m}</span>
                    <em>{m === "delivery" ? (Number(s.delivery_fee) > 0 ? formatMoney(s.delivery_fee, cur) : "Free") : "Free"}</em></div>
                ))}
                <div className="orow pressed"><span className="ic"><Svg d={ICON.clock} /></span><span>Today</span><em>{s.opening_hours[today] ? `${s.opening_hours[today]![0]} – ${s.opening_hours[today]![1]}` : "Closed"}</em></div>
                <a href="#menu" className="btn primary block">Start your order <span aria-hidden="true">→</span></a>
              </section>
              <section id="about" className="clay about-card" data-reveal aria-labelledby="about-h">
                <p className="eyebrow">About us</p>
                <h2 id="about-h" className="panel-h sm">More than just a restaurant</h2>
                <p className="muted">{s.description || `${s.name} cooks fresh, seasonal food to order. Everything on the menu is made with care, and ordering direct means more of what you pay goes to the kitchen.`}</p>
                <div className="stats">
                  <div><strong data-count={itemCount}>{itemCount}</strong><span>Dishes</span></div>
                  <div><strong data-count={categories.length}>{categories.length}</strong><span>Categories</span></div>
                  <div><strong data-count={daysOpen}>{daysOpen}</strong><span>Days a week</span></div>
                </div>
              </section>
            </aside>
          </div>

          <div className="bento3">
            <section className="clay panel sig" data-reveal aria-label="Signature dishes"><Signature /></section>
            <section className="clay panel" data-reveal aria-labelledby="gal-h">
              <div className="panel-top"><div><h2 id="gal-h" className="panel-h sm">From the kitchen</h2><p className="muted">A glimpse of what we cook.</p></div><a href="#menu" className="btn small">View all</a></div>
              <Gallery />
            </section>
            <section id="visit" className="clay panel contact" data-reveal aria-labelledby="visit-h">
              <h2 id="visit-h" className="panel-h sm">Get in touch</h2><p className="muted">We&rsquo;d love to hear from you.</p>
              {s.phone && <a className="crow" href={`tel:${s.phone}`}><span className="ic"><Svg d={ICON.phone} /></span><span>{s.phone}</span></a>}
              {s.address && <a className="crow" href={mapUrl ?? "#"} target="_blank" rel="noopener noreferrer"><span className="ic"><Svg d={ICON.pin} /></span><span>{s.address}</span></a>}
              <div className="ghours"><h3>Opening hours</h3>
                {groupHours(s.opening_hours).map((g) => (<div key={g.days} className="gh"><span>{g.days}</span><span>{g.range}</span></div>))}
              </div>
            </section>
          </div>

          <footer className="foot clay-s">
            <a href="#home" className="logo"><Logo /><span><strong>{s.name}</strong></span></a>
            <nav aria-label="Footer"><a href="#home">Home</a><a href="#menu">Menu</a><a href="#about">About</a><a href="#visit">Visit</a><a href="/staff">Staff</a></nav>
            <span className="script sm">Good Food, Better Moments</span>
            <a href="#home" className="round totop" aria-label="Back to top">↑</a>
          </footer>
        </div>
      </MenuProvider>
      <CartBar menu={snapshot} currency={cur} deliveryFee={Number(s.delivery_fee)} fulfillment={fulfil} open={canOrder} />
    </PageMotion>
  );
}

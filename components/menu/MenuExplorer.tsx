"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { Item } from "@/lib/menu";
import { FILTER_TAGS } from "@/lib/tags";
import { formatMoney } from "@/lib/money";
import { Art, EASE, PlusIcon, Tags, optionsOf, quickAdd, useMenu } from "./MenuContext";

function Card({ item, category }: { item: Item; category: string }) {
  const { currency, canOrder, open } = useMenu();
  const sold = !item.is_available;
  const hasOptions = optionsOf(item).length > 0;
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }} transition={{ duration: 0.5, ease: EASE }} className={`mcard${sold ? " sold" : ""}`}>
      <button type="button" className="mcard-main" onClick={() => open(item, category)} aria-label={`${item.name}, ${formatMoney(item.price, currency)}. View details`}>
        <span className="mart"><Art item={item} category={category} />
          <span className="mart-tags"><Tags tags={item.tags.filter((t) => t !== "popular").slice(0, 2)} /></span>
          {sold && <span className="sold-badge">Sold out</span>}</span>
        <span className="mname">{item.name}{item.is_featured && <span className="fav" aria-label="House favourite"> ★</span>}</span>
        <span className="mdesc">{item.description}</span>
      </button>
      <div className="mfoot">
        <span className="price">{formatMoney(item.price, currency)}</span>
        {canOrder && !sold && (
          <motion.button type="button" whileTap={{ scale: 0.84 }} whileHover={{ scale: 1.1, rotate: 90 }} className="fab"
            aria-label={hasOptions ? `Customise ${item.name}` : `Add ${item.name} to order`} onClick={() => (hasOptions ? open(item, category) : quickAdd(item))}>
            <PlusIcon />
          </motion.button>
        )}
      </div>
    </motion.li>
  );
}

export function MenuExplorer() {
  const { categories } = useMenu();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const presentTags = useMemo(() => FILTER_TAGS.filter((t) => categories.some((c) => c.items.some((i) => i.tags.includes(t.id)))), [categories]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return categories.filter((c) => cat === "all" || c.slug === cat).flatMap((c) =>
      c.items.filter((i) => (!needle || `${i.name} ${i.description}`.toLowerCase().includes(needle)) && (!tag || i.tags.includes(tag))).map((i) => ({ i, c: c.name })));
  }, [categories, cat, q, tag]);

  return (
    <>
      <div className="mp-head">
        <div><h2 className="panel-h">Our Menu</h2><p className="muted">Discover our carefully crafted dishes, made with love.</p></div>
        <label className="search"><span className="sr-only">Search the menu</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input id="menu-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" />
        </label>
      </div>
      <LayoutGroup id="tabs">
        <div className="tabs" role="group" aria-label="Menu categories">
          {[{ slug: "all", name: "All" }, ...categories].map((c) => (
            <button key={c.slug} type="button" aria-pressed={cat === c.slug} className={`tab${cat === c.slug ? " on" : ""}`} onClick={() => setCat(c.slug)}>
              {cat === c.slug && <motion.span layoutId="tabpill" className="pill-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="lbl">{c.name}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      {presentTags.length > 0 && (
        <div className="tagbar" role="group" aria-label="Dietary filters">
          {presentTags.map((t) => (<button key={t.id} type="button" aria-pressed={tag === t.id} className={`chip${tag === t.id ? " on" : ""}`} onClick={() => setTag(tag === t.id ? null : t.id)}>{t.label}</button>))}
        </div>
      )}
      {shown.length === 0 ? (
        <div className="empty"><h3>Nothing matches that</h3><p className="muted">Try a different word or clear the filters.</p>
          <button type="button" className="btn" onClick={() => { setQ(""); setTag(null); setCat("all"); }}>Clear filters</button></div>
      ) : (
        <ul className="mgrid"><AnimatePresence mode="popLayout" initial={false}>{shown.map(({ i, c }) => <Card key={i.id} item={i} category={c} />)}</AnimatePresence></ul>
      )}
    </>
  );
}

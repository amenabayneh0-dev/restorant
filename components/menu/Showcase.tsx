"use client";
import { useRef } from "react";
import { motion } from "motion/react";
import { formatMoney } from "@/lib/money";
import { Art, PlusIcon, useMenu } from "./MenuContext";

/** "Our Special" card floating over the hero. */
export function SpecialCard() {
  const { all, currency, open } = useMenu();
  const pick = all.find((e) => e.item.is_featured && e.item.is_available) ?? all.find((e) => e.item.is_available);
  if (!pick) return null;
  return (
    <div className="special-wrap h-anim"><motion.button type="button" className="special clay-s" whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => open(pick.item, pick.category)} aria-label={`Our special: ${pick.item.name}, ${formatMoney(pick.item.price, currency)}`}>
      <span className="sp-art"><Art item={pick.item} category={pick.category} /></span>
      <span className="sp-text"><small>Our Special</small><strong>{pick.item.name}</strong><span className="price">{formatMoney(pick.item.price, currency)}</span></span>
      <span className="fab" aria-hidden="true"><PlusIcon size={18} /></span>
    </motion.button></div>
  );
}

/** Horizontal rail of house favourites with arrow buttons. */
export function Signature() {
  const { all, currency, open } = useMenu();
  const ref = useRef<HTMLDivElement>(null);
  const favs = all.filter((e) => e.item.is_featured && e.item.is_available);
  const list = favs.length ? favs : all.filter((e) => e.item.is_available).slice(0, 6);
  if (!list.length) return null;
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  return (
    <>
      <div className="panel-top">
        <div><h2 className="panel-h sm">Signature Dishes</h2><p className="muted">Handpicked favourites from our chef.</p></div>
        <div className="arrows"><button type="button" className="round" aria-label="Scroll left" onClick={() => by(-1)}>‹</button><button type="button" className="round" aria-label="Scroll right" onClick={() => by(1)}>›</button></div>
      </div>
      <div className="srail" ref={ref} tabIndex={0} aria-label="Signature dishes">
        {list.map(({ item, category }) => (
          <motion.button key={item.id} type="button" className="scard" whileHover={{ y: -6 }} whileTap={{ scale: 0.97 }} onClick={() => open(item, category)}>
            <span className="mart"><Art item={item} category={category} /></span>
            <span className="sname">{item.name}</span><span className="price">{formatMoney(item.price, currency)}</span>
          </motion.button>
        ))}
      </div>
      <a href="#menu" className="btn small sig-cta">Browse the full menu <span aria-hidden="true">→</span></a>
    </>
  );
}

/** Four tiles from the kitchen. Real photos first, illustrations otherwise. */
export function Gallery() {
  const { all, open } = useMenu();
  const list = [...all.filter((e) => e.item.image_url), ...all.filter((e) => !e.item.image_url)].slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="gtiles">
      {list.map(({ item, category }) => (
        <motion.button key={item.id} type="button" className="gtile" whileHover={{ scale: 1.04, rotate: -1 }} whileTap={{ scale: 0.96 }} onClick={() => open(item, category)} aria-label={`View ${item.name}`}>
          <Art item={item} category={category} />
        </motion.button>
      ))}
    </div>
  );
}

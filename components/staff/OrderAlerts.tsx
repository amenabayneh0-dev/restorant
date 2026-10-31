"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "staff-alerts";
/** Chime + tab-title flash + system notification when the number of NEW (pending) orders goes up between refreshes. */
export function OrderAlerts({ pending }: { pending: number }) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const prev = useRef<number | null>(null);
  const baseTitle = useRef("");
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => { setOn(localStorage.getItem(KEY) === "1"); setReady(true); baseTitle.current = document.title.replace(/^\(\d+\) /, ""); }, []);

  useEffect(() => {
    const before = prev.current; prev.current = pending;
    document.title = pending > 0 ? `(${pending}) ${baseTitle.current || "Orders"}` : baseTitle.current || document.title;
    if (!on || before === null || pending <= before) return;
    chime(); flash(pending);
    try { if ("Notification" in window && Notification.permission === "granted") new Notification("New order", { body: `${pending} order${pending === 1 ? "" : "s"} waiting`, tag: "new-order" }); } catch {}
  }, [pending, on]);

  function chime() {
    try {
      const c = ctx.current ?? new AudioContext(); ctx.current = c; void c.resume();
      [880, 1175].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
        const t = c.currentTime + i * 0.18; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.55);
      });
    } catch {}
  }
  function flash(n: number) {
    let k = 0; const t = setInterval(() => { document.title = k++ % 2 ? `(${n}) ${baseTitle.current}` : `🔔 New order!`; if (k > 10) { clearInterval(t); document.title = `(${n}) ${baseTitle.current}`; } }, 700);
  }
  async function enable() {
    try { ctx.current = new AudioContext(); await ctx.current.resume(); } catch {}
    try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch {}
    localStorage.setItem(KEY, "1"); setOn(true); chime();
  }
  function disable() { localStorage.removeItem(KEY); setOn(false); }

  if (!ready) return null;
  return on
    ? <p className="alerts-bar"><span>🔔 Order alerts are on</span> <button type="button" className="btn small" onClick={disable}>Turn off</button></p>
    : <p className="alerts-bar"><span>Get a sound when a new order arrives.</span> <button type="button" className="btn small solid" onClick={enable}>Enable alerts</button></p>;
}

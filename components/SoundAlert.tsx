"use client";
import { useEffect, useRef, useState } from "react";

export function SoundAlert({ pending }: { pending: number }) {
  const [on, setOn] = useState(false);
  const prev = useRef(pending);
  const ctx = useRef<AudioContext | null>(null);
  const beep = () => {
    const c = ctx.current; if (!c) return;
    [0, 0.25].forEach((t) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.2; o.connect(g); g.connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.15); });
  };
  useEffect(() => { if (on && pending > prev.current) beep(); prev.current = pending; }, [pending, on]);
  return (
    <button className="btn" aria-pressed={on} onClick={() => { if (!on) { ctx.current = new AudioContext(); beep(); } setOn(!on); }}>
      {on ? "Sound on" : "Turn on new-order sound"}
    </button>
  );
}

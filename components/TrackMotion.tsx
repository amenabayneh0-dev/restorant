"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

/** Animates the order-progress line filling up and the current step pulsing. */
export function TrackMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".stepper", { "--p": 0, duration: 1.4, ease: "power2.inOut", delay: 0.2 });
      gsap.from(".track-in > *", { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, ease: "power2.out", clearProps: "all" });
      gsap.fromTo(".stepper .now .dot", { boxShadow: "0 0 0 0 rgba(227,154,28,.55)" }, { boxShadow: "0 0 0 12px rgba(227,154,28,0)", duration: 1.6, repeat: -1, ease: "sine.out" });
    });
    return () => mm.revert();
  }, { scope: root });
  return <div ref={root}>{children}</div>;
}

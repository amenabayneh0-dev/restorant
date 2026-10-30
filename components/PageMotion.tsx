"use client";
// GSAP choreography for the home page: hero entrance, platter float + steam, scroll parallax, scroll reveals, magnetic CTA.
// Everything is skipped when the visitor prefers reduced motion (the page is then simply static and fully visible).
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function PageMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(".wi", { y: 0, duration: 0.9, stagger: 0.07, delay: 0.1 })
        .to(".h-anim", { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, "-=0.55")
        .from(".plate-body", { rotation: -28, scale: 0.7, svgOrigin: "200 200", duration: 1.5, ease: "back.out(1.25)" }, 0.15)
        .from(".mound", { scale: 0, transformOrigin: "50% 50%", duration: 0.6, stagger: 0.07, ease: "back.out(2)" }, 0.55);

      gsap.to(".hero-plate", { y: -10, rotation: 1.2, duration: 3.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.fromTo(".steam path", { y: 8, opacity: 0.55 }, { y: -16, opacity: 0, duration: 2.6, stagger: 0.55, repeat: -1, ease: "sine.out" });
      gsap.utils.toArray<SVGElement>(".bit").forEach((b, i) =>
        gsap.to(b, { y: i % 2 ? 12 : -12, x: i % 2 ? -6 : 6, rotation: "+=14", duration: 3 + i * 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" }));

      gsap.to(".hero-art", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } });

      gsap.set("[data-reveal]", { opacity: 0, y: 28 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%", once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.75, stagger: 0.09, ease: "power2.out", overwrite: true }),
      });

      // Stat numbers count up when scrolled into view (the server already rendered the final value).
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count); const o = { v: 0 };
        el.textContent = "0";
        ScrollTrigger.create({ trigger: el, start: "top 94%", once: true,
          onEnter: () => gsap.to(o, { v: end, duration: 1.5, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(o.v)); } }) });
      });

      // Magnetic call-to-action buttons (hover-capable devices only).
      const cleanups: Array<() => void> = [];
      if (window.matchMedia("(hover: hover)").matches) {
        gsap.utils.toArray<HTMLElement>(".cta-magnet").forEach((el) => {
          const x = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
          const y = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
          const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.35); };
          const leave = () => { x(0); y(0); };
          el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
          cleanups.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
        });
      }
      return () => cleanups.forEach((c) => c());
    });
    return () => mm.revert();
  }, { scope: root });

  return <div ref={root}>{children}</div>;
}

// Original, procedurally drawn dish illustrations (no stock photos, no external requests). A real photo, when the
// owner uploads one, replaces these automatically.
const PALETTES = [
  { a: "#b9381a", b: "#e9a21f", c: "#5f8a2d", d: "#6b2410", bg: "#3b271b" },
  { a: "#9c3b12", b: "#f3c04a", c: "#3f7a3a", d: "#4e1d0c", bg: "#33231a" },
  { a: "#a82a2a", b: "#f0b429", c: "#6b8e23", d: "#5a1a1a", bg: "#40281c" },
  { a: "#8a5a14", b: "#d9731a", c: "#7cab2e", d: "#3d230a", bg: "#2f2118" },
  { a: "#9a2f49", b: "#e8b93a", c: "#4f8a4b", d: "#4a1325", bg: "#3a2420" },
];
export type ArtKind = "plate" | "bowl" | "drink" | "dessert" | "wrap";

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function artKind(name: string, category = ""): ArtKind {
  const t = `${name} ${category}`.toLowerCase();
  if (/\b(juice|coffee|buna|tea|spris|soda|water|lemonade|smoothie|drinks?|beer|wine|milk|latte|cola|shake)\b/.test(t)) return "drink";
  if (/\b(cake|baklava|desserts?|ice cream|sweets?|pastry|cookies?|pudding|honey|tiramisu|brownie)\b/.test(t)) return "dessert";
  if (/\b(wraps?|sandwich(es)?|burgers?|shawarma|rolls?|sambusas?|samosas?|pizza|tacos?|kebabs?)\b/.test(t)) return "wrap";
  if (/\b(soups?|stew|wat|tegabino|bowl|curry|rice|salads?|shiro|pasta)\b/.test(t)) return "bowl";
  return "plate";
}

export function DishArt({ name, category = "", decorative = true }: { name: string; category?: string; decorative?: boolean }) {
  const kind = artKind(name, category);
  const h = hash(name);
  const P = PALETTES[h % PALETTES.length];
  const rot = (h % 40) - 20;
  const a11y = decorative ? { "aria-hidden": true as const } : { role: "img" as const, "aria-label": name };
  return (
    <svg viewBox="0 0 120 120" className="dish-art" {...a11y}>
      <rect x="-400" y="-400" width="920" height="920" fill={P.bg} />
      <circle cx="96" cy="24" r="40" fill={P.b} opacity=".24" />
      <circle cx="14" cy="104" r="34" fill={P.a} opacity=".22" />
      {kind === "plate" && (
        <g transform={`rotate(${rot / 4} 60 64)`}>
          <ellipse cx="60" cy="100" rx="40" ry="5" fill="#2b1b12" opacity=".12" />
          <circle cx="60" cy="62" r="44" fill="#fffaf0" stroke="#e5d3b3" strokeWidth="3" />
          <circle cx="60" cy="62" r="34" fill="#e8c186" />
          <circle cx="60" cy="62" r="26" fill="none" stroke="#c99a56" strokeWidth="1" strokeDasharray="2 4" opacity=".6" />
          <ellipse cx="45" cy="55" rx="14" ry="11" fill={P.a} /><ellipse cx="42" cy="51" rx="6" ry="3.5" fill="#fff" opacity=".22" />
          <ellipse cx="73" cy="56" rx="12" ry="10" fill={P.b} /><ellipse cx="70" cy="52" rx="5" ry="3" fill="#fff" opacity=".25" />
          <ellipse cx="58" cy="76" rx="13" ry="9" fill={P.c} /><ellipse cx="55" cy="73" rx="5" ry="3" fill="#fff" opacity=".2" />
          <circle cx="76" cy="75" r="6" fill={P.d} /><circle cx="60" cy="62" r="5" fill="#fffdf6" />
        </g>
      )}
      {kind === "bowl" && (
        <g>
          <path d={`M${44 + (h % 3)} 26c-6 8 6 12 0 20M62 22c-6 9 6 13 0 22M80 26c-6 8 6 12 0 20`} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".7" />
          <path d="M16 58h88a44 44 0 0 1-88 0z" fill="#fffaf0" stroke="#e5d3b3" strokeWidth="3" />
          <path d="M26 82c10 14 58 14 68 0" stroke="#e5d3b3" strokeWidth="3" fill="none" opacity=".8" />
          <ellipse cx="60" cy="58" rx="44" ry="10" fill={P.d} /><ellipse cx="60" cy="58" rx="38" ry="7.5" fill={P.a} />
          <circle cx="48" cy="57" r="6" fill={P.b} /><circle cx="70" cy="59" r="5" fill="#fffdf6" /><circle cx="70" cy="59" r="2.4" fill={P.b} />
          <circle cx="58" cy="60" r="2" fill={P.c} /><circle cx="82" cy="57" r="2" fill={P.c} />
        </g>
      )}
      {kind === "drink" && (
        <g transform={`rotate(${rot / 5} 60 64)`}>
          <rect x="68" y="8" width="6" height="64" rx="3" fill={P.c} transform="rotate(14 71 40)" />
          <path d="M36 26h48l-6 76a6 6 0 0 1-6 5H48a6 6 0 0 1-6-5z" fill="#fff" opacity=".55" stroke="#d9c7a6" strokeWidth="3" />
          <path d="M39 50h42l-4.4 50a4.5 4.5 0 0 1-4.5 4H48a4.5 4.5 0 0 1-4.5-4z" fill={P.b} />
          <path d="M40 66h40l-3 34a4.5 4.5 0 0 1-4.5 4H48a4.5 4.5 0 0 1-4.5-4z" fill={P.a} opacity=".9" />
          <rect x="46" y="46" width="11" height="11" rx="2" fill="#fff" opacity=".4" transform="rotate(12 51 51)" />
          <rect x="62" y="54" width="10" height="10" rx="2" fill="#fff" opacity=".3" transform="rotate(-10 67 59)" />
          <circle cx="84" cy="34" r="13" fill={P.b} stroke="#fff" strokeWidth="2.5" /><path d="M84 34l9-7M84 34l-9-7M84 34v11M84 34l9 7M84 34l-9 7" stroke="#fff" strokeWidth="1.5" opacity=".8" />
        </g>
      )}
      {kind === "dessert" && (
        <g>
          <ellipse cx="60" cy="98" rx="46" ry="8" fill="#fffaf0" stroke="#e5d3b3" strokeWidth="2.5" />
          <path d="M28 58h54v34H28z" fill={P.d} /><path d="M28 70h54v7H28z" fill={P.b} /><path d="M28 82h54v5H28z" fill={P.b} opacity=".85" />
          <path d="M82 58l12-11v34L82 92z" fill={P.d} opacity=".72" />
          <path d="M28 58l12-11h54L82 58z" fill={P.b} />
          <path d="M34 55c8-4 8 2 16-1s8 3 16 0 10 2 16-1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".85" />
          <circle cx="62" cy="43" r="6.5" fill={P.a} /><circle cx="60" cy="41" r="2" fill="#fff" opacity=".5" />
        </g>
      )}
      {kind === "wrap" && (
        <g transform={`rotate(${-18 + (rot > 0 ? 6 : 0)} 60 62)`}>
          <ellipse cx="60" cy="98" rx="42" ry="5" fill="#2b1b12" opacity=".10" />
          <circle cx="99" cy="56" r="7" fill={P.c} /><circle cx="93" cy="50" r="6" fill={P.a} /><circle cx="101" cy="64" r="5" fill={P.b} />
          <rect x="18" y="44" width="80" height="36" rx="18" fill="#f1d7a0" stroke="#d9b97a" strokeWidth="2.5" />
          <path d="M26 52c20 4 44 4 64 0" stroke="#d9b97a" strokeWidth="2" fill="none" opacity=".7" />
          <rect x="18" y="58" width="80" height="22" rx="11" fill="#e2e8f0" opacity=".9" /><path d="M24 66h68M24 72h68" stroke="#cbd5e1" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

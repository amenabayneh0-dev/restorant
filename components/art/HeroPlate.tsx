// Hero artwork: a shared platter, drawn as SVG so GSAP can animate its parts (classes: plate-body, mound, steam, bit).
const MOUNDS = ["#8c2a14", "#d28a1d", "#e0b02a", "#4f7a2c", "#9d2a4a", "#c8791a", "#6a3b1b"];
export function HeroPlate() {
  return (
    <svg viewBox="0 0 400 400" className="hero-plate" aria-hidden="true">
      <defs>
        <radialGradient id="hp-sheen" cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id="hp-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#e39a1c" stopOpacity=".45" /><stop offset="1" stopColor="#e39a1c" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="200" cy="200" r="200" fill="url(#hp-glow)" />
      <ellipse cx="200" cy="372" rx="140" ry="14" fill="#000" opacity=".28" />
      <g className="plate-body">
        <circle cx="200" cy="200" r="172" fill="#f8efe0" stroke="#e3cfae" strokeWidth="6" />
        <circle cx="200" cy="200" r="150" fill="#e2b172" />
        {[128, 106, 84].map((r) => (<circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#c4934e" strokeWidth="2" strokeDasharray="2 9" opacity=".55" />))}
        {MOUNDS.map((c, i) => {
          const ang = (i / MOUNDS.length) * Math.PI * 2 - Math.PI / 2;
          const x = 200 + Math.cos(ang) * 86, y = 200 + Math.sin(ang) * 86;
          return (
            <g key={c + i} className="mound">
              <circle cx={x} cy={y} r="35" fill={c} />
              <circle cx={x} cy={y} r="35" fill="url(#hp-sheen)" />
              <circle cx={x - 9} cy={y - 10} r="5" fill="#fff" opacity=".28" />
            </g>
          );
        })}
        <g className="mound"><circle cx="200" cy="200" r="34" fill="#fff6e6" stroke="#e3cfae" strokeWidth="3" /><circle cx="200" cy="200" r="25" fill="#7a1f10" /><circle cx="193" cy="196" r="8" fill="#fffdf6" /><circle cx="193" cy="196" r="3.4" fill="#e39a1c" /></g>
      </g>
      <g className="steam" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".55">
        <path d="M150 70c-14 18 14 28 0 50" /><path d="M200 52c-14 20 14 30 0 54" /><path d="M250 70c-14 18 14 28 0 50" />
      </g>
      <g className="bits">
        <ellipse className="bit" cx="40" cy="120" rx="11" ry="6" fill="#7cab2e" transform="rotate(-30 40 120)" />
        <ellipse className="bit" cx="364" cy="96" rx="12" ry="6.5" fill="#5f8a2d" transform="rotate(25 364 96)" />
        <circle className="bit" cx="370" cy="290" r="7" fill="#b9381a" />
        <ellipse className="bit" cx="28" cy="276" rx="10" ry="5.5" fill="#e9a21f" transform="rotate(18 28 276)" />
        <circle className="bit" cx="330" cy="352" r="5" fill="#e9a21f" />
      </g>
    </svg>
  );
}

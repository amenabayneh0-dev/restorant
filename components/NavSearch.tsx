"use client";
export function NavSearch() {
  return (
    <button type="button" className="round nav-search" aria-label="Search the menu" onClick={() => {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => document.getElementById("menu-search")?.focus({ preventScroll: true }), 450);
    }}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  );
}

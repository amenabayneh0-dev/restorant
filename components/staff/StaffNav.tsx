import Link from "next/link";
import type { StaffRole } from "@/lib/status";
import { signOut } from "@/app/staff/actions";

const LINKS: { href: string; label: string; key: string; roles: StaffRole[] }[] = [
  { href: "/staff", label: "Orders", key: "orders", roles: ["admin", "counter", "kitchen"] },
  { href: "/staff/menu", label: "Menu", key: "menu", roles: ["admin"] },
  { href: "/staff/settings", label: "Settings", key: "settings", roles: ["admin"] },
  { href: "/staff/report", label: "Report", key: "report", roles: ["admin", "counter"] },
];

export function StaffNav({ role, active }: { role: StaffRole; active: string }) {
  return (
    <nav className="snav" aria-label="Staff">
      <ul>
        {LINKS.filter((l) => l.roles.includes(role)).map((l) => (
          <li key={l.key}><Link href={l.href} aria-current={l.key === active ? "page" : undefined} className={l.key === active ? "on" : ""}>{l.label}</Link></li>
        ))}
      </ul>
      <span className="snav-end"><span className="badge">{role}</span><form action={signOut}><button className="btn small">Sign out</button></form></span>
    </nav>
  );
}

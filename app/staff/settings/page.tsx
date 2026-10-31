import type { Metadata } from "next";
import { requireStaff } from "@/lib/staff-auth";
import { normalizeSettings, type Settings } from "@/lib/menu";
import { DAYS, DAY_LABEL } from "@/lib/staff-schemas";
import { StaffNav } from "@/components/staff/StaffNav";
import { Flash } from "@/components/staff/Flash";
import { ImageField } from "@/components/staff/ImageField";
import { saveSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
const HOW: Record<string, string> = { pickup: "Pickup", dine_in: "Dine in", delivery: "Delivery" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const { saved, err } = await searchParams;
  const { db, role } = await requireStaff(["admin"]);
  const { data } = await db.from("restaurant_settings").select("*").maybeSingle();
  const s: Settings = normalizeSettings(data as Partial<Settings> | null);

  return (
    <main className="wrap staff">
      <StaffNav role={role} active="settings" />
      <h1>Settings</h1>
      <Flash saved={saved} err={err} />
      <form action={saveSettings} className="stack">
        <section className="panelbox"><h2>Restaurant</h2>
          <label className="fld">Name<input name="name" required maxLength={120} defaultValue={s.name} /></label>
          <label className="fld">Tagline<input name="tagline" maxLength={160} defaultValue={s.tagline} /></label>
          <label className="fld">About<textarea name="description" maxLength={1000} defaultValue={s.description} /></label>
          <label className="fld">Phone<input name="phone" type="tel" maxLength={30} defaultValue={s.phone ?? ""} /></label>
          <label className="fld">Address<input name="address" maxLength={200} defaultValue={s.address ?? ""} /></label>
          <div className="two">
            <label className="fld">Currency (3 letters)<input name="currency_code" required maxLength={3} minLength={3} defaultValue={s.currency_code.trim()} /></label>
            <label className="fld">Time zone<input name="timezone" required defaultValue={s.timezone} /></label>
          </div>
          <ImageField name="hero" removeName="remove_hero" current={s.hero_image_url} label="Home page photo" />
        </section>

        <section className="panelbox"><h2>Ordering</h2>
          <label className="check"><input type="checkbox" name="accepting_orders" defaultChecked={s.accepting_orders} /> Accepting online orders</label>
          <fieldset className="tagset"><legend>Ways customers can receive orders</legend>
            {(["pickup", "dine_in", "delivery"] as const).map((m) => (
              <label key={m} className="check"><input type="checkbox" name="enabled_fulfillment" value={m} defaultChecked={s.enabled_fulfillment.includes(m) && (m !== "delivery" || s.delivery_enabled)} /> {HOW[m]}</label>
            ))}
          </fieldset>
          <label className="fld">Delivery fee<input name="delivery_fee" inputMode="decimal" defaultValue={s.delivery_fee} /></label>
        </section>

        <section className="panelbox"><h2>Opening hours</h2>
          <p className="muted small">Times are in the restaurant’s time zone. A closing time earlier than the opening time means the shift runs past midnight.</p>
          <div className="hours">
            {DAYS.map((d) => {
              const h = s.opening_hours[d];
              return (
                <div key={d} className="hrow">
                  <b>{DAY_LABEL[d]}</b>
                  <label className="check"><input type="checkbox" name={`${d}_closed`} defaultChecked={!h} /> Closed</label>
                  <label className="fld sm">Opens<input type="time" name={`${d}_open`} defaultValue={h?.[0] ?? "11:00"} /></label>
                  <label className="fld sm">Closes<input type="time" name={`${d}_close`} defaultValue={h?.[1] ?? "22:00"} /></label>
                </div>
              );
            })}
          </div>
        </section>
        <button className="btn solid block">Save settings</button>
      </form>
    </main>
  );
}

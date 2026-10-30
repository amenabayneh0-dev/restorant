// Runs automatically on Vercel (`vercel-build`) and by hand with `npm run setup:db`.
// Idempotent: safe to run on every deploy. Does four things when the matching variables are present:
//   1. applies new SQL migrations (tracked in public._menuflow_migrations)
//   2. creates the public "menu" image bucket
//   3. creates the first admin login (ADMIN_EMAIL / ADMIN_PASSWORD)
//   4. loads the demo menu if SEED_DEMO_MENU=true
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const log = (...a) => console.log("[setup]", ...a);
const warn = (...a) => console.warn("[setup] WARNING:", ...a);
const clean = (v) => v?.trim().replace(/^["']+|["']+$/g, "").trim() || undefined;

const dbUrl = clean(process.env.SUPABASE_DB_URL) ?? clean(process.env.DATABASE_URL);
const apiUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const secret = clean(process.env.SUPABASE_SECRET_KEY) ?? clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function migrate(connectionString, { seed = false } = {}) {
  const local = /(localhost|127\.0\.0\.1|host=%2F|host=\/)/.test(connectionString);
  const client = new pg.Client({ connectionString, ssl: local ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(`create table if not exists public._menuflow_migrations(name text primary key, applied_at timestamptz not null default now());
                        alter table public._menuflow_migrations enable row level security;`);
    const done = new Set((await client.query("select name from public._menuflow_migrations")).rows.map((r) => r.name));
    const dir = join(root, "supabase", "migrations");
    const files = readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
    // Someone who ran 0001 by hand before this tracker existed: don't run it twice.
    if (done.size === 0 && (await client.query("select to_regclass('public.orders') as t")).rows[0].t) {
      await client.query("insert into public._menuflow_migrations(name) values ($1) on conflict do nothing", [files[0]]);
      done.add(files[0]); log(`existing schema detected, marked ${files[0]} as applied`);
    }
    for (const f of files) {
      if (done.has(f)) { log(`migration ${f}: already applied`); continue; }
      log(`applying migration ${f} ...`);
      await client.query("begin");
      try {
        await client.query(readFileSync(join(dir, f), "utf8"));
        await client.query("insert into public._menuflow_migrations(name) values ($1)", [f]);
        await client.query("commit");
      } catch (e) { await client.query("rollback"); throw new Error(`migration ${f} failed: ${e.message}`); }
    }
    if (seed) {
      log("loading demo menu (SEED_DEMO_MENU=true) ...");
      await client.query("begin");
      try { await client.query(readFileSync(join(root, "supabase", "seed.sql"), "utf8")); await client.query("commit"); }
      catch (e) { await client.query("rollback"); throw new Error(`demo menu failed: ${e.message}`); }
    }
    await client.query("notify pgrst, 'reload schema'"); // make the REST API notice new tables right away
  } finally { await client.end(); }
}

async function ensureBucket(sb) {
  const { error } = await sb.storage.createBucket("menu", { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (error && !/already exists|duplicate/i.test(error.message)) warn(`could not create the "menu" image bucket: ${error.message}`);
  else log(error ? 'image bucket "menu": already exists' : 'created image bucket "menu"');
}

async function ensureAdmin(sb) {
  const email = clean(process.env.ADMIN_EMAIL)?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return log("ADMIN_EMAIL / ADMIN_PASSWORD not set: skipping admin login creation");
  if (password.length < 10) return warn("ADMIN_PASSWORD must be at least 10 characters: admin not created");
  let user = null;
  for (let page = 1; page <= 25 && !user; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`could not list users: ${error.message}`);
    user = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
    if (data.users.length < 200) break;
  }
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`could not create the admin login: ${error.message}`);
    user = data.user; log(`created admin login ${email}`);
  } else log(`admin login ${email} already exists (password left unchanged)`);
  // The REST API can take a few seconds to see freshly created tables, so retry.
  let error;
  for (let i = 0; i < 8; i++) {
    ({ error } = await sb.from("staff_profiles").upsert({ user_id: user.id, display_name: "Owner", role: "admin" }, { onConflict: "user_id" }));
    if (!error) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (error) throw new Error(`could not grant the admin role: ${error.message}`);
  log("admin role confirmed");
}

async function main() {
  if (!dbUrl) { log("SUPABASE_DB_URL not set: skipping automatic database setup (run supabase/migrations/*.sql by hand)"); return; }
  await migrate(dbUrl, { seed: process.env.SEED_DEMO_MENU === "true" });
  if (!apiUrl || !secret) return warn("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing: skipped image bucket and admin login");
  const sb = createClient(apiUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  await ensureBucket(sb);
  try { await ensureAdmin(sb); } catch (e) { warn(e.message); }
  log("done");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("[setup] FAILED:", e.message); process.exit(1); });
}

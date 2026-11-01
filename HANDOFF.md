# HANDOFF: read this first (for the next chat)

Paste this whole file (or upload the zip) into a new chat and say: **"Continue from HANDOFF.md, starting at Phase 6 (push + verify on Vercel)."**

---
## 1. What this project is
A restaurant **online-ordering website + staff app** for an owner in **Addis Ababa (currency ETB, timezone Africa/Addis_Ababa)**.
Stack: **Next.js 15 (App Router, React 19, TypeScript) + Supabase (Postgres, Auth, Storage) + Vercel**, animation with **GSAP** (page choreography) and **Motion** (`motion/react`, UI micro-interactions).
The restaurant's real name/menu are unknown; the database holds them (editable), and a fictional demo menu exists for testing.

## 2. The owner's requirements (their words, condensed)
- "My only job is importing and deploying in Vercel." Everything else must be automatic.
- Expert-level design, proper spacing/colour, **use the Claymorphism reference in `docs/design-reference.png`** (dark brown + copper, puffy clay cards, floating pill nav, bento grid).
- "Deep and proper GSAP and Motion to make the site alive", but accessible (reduced-motion respected).
- Full-stack, tested deeply, screenshots taken and reviewed, fix anything bad. **No half-done work, no unverified claims.**
- Push to GitHub (repo: `amenabayneh0-dev/restorant`, branch `main`).

## 3. Status at a glance
| Phase | What | State |
|---|---|---|
| 0 | Research + plan (`docs/PLAN.md`) | DONE |
| 1 | Zero-touch deploy: migrations 0001-0003, `scripts/bootstrap.mjs`, health check | DONE + tested |
| 2 | Design system + motion foundation (dark clay CSS, fonts, GSAP/Motion) | DONE |
| 3 | Customer site (hero, bento, menu, item sheet, cart, checkout, tracking, SEO) | DONE + browser-tested |
| 4 | Staff product: StaffNav, order alerts, menu editor (categories, dishes, options, archive), photo upload with client-side resize, settings + hours, 7-day sales report | **DONE + tested** (see section 3b) |
| 5 | Final verification: staff E2E, screenshots, a11y on staff pages | DONE for staff + customer pages (phone 390px + desktop 1366px) |
| 6 | Ship: update docs/checklist, push to GitHub, verify on Vercel | **NOT DONE: nothing from phases 1-3 is pushed** |

**GitHub `main` is still commit `19b1949` (the earlier "production hardening" version). All newer work exists only in this zip.**

## 3b. Phase 4 result (verified in the sandbox, local stand-in stack, not real Supabase)
- `npx tsc --noEmit` clean. `npm test`: **85/85** (23 new in `tests/staff.test.ts`: zod schemas, slugify, hours parsing, image signature sniffing, report maths incl. Addis-day bucketing).
- `npm run test:db`: **58 checks** (the old "27" under-counted because checks inside rolled-back transactions weren't logged; `scripts/test-db.sh` now counts a NOTICE per check). New: admin menu/option/settings writes, kitchen/counter blocked, drafts + archived dishes hidden from visitors, counter can read orders for the report.
- `npm run test:e2e`: **31/31** customer site. `npm run test:e2e:staff` (new, `e2e/staff.mjs`): **45/45** (admin on phone + desktop, kitchen + counter role limits, signed-out redirects, add category/move, create dish with a 3200px photo -> resized to <=1600px, options add/remove, publish toggle, archive/restore, settings + hours persist, bad time zone refused, report KPIs, axe WCAG A/AA on every staff page, no horizontal overflow, no console errors).
- Report numbers cross-checked against the database with real `create_order` rows (rejected excluded, avg = revenue/orders).
- Bugs found and fixed while testing: empty price silently saved as 0 (now rejected); `.staff form{display:inline}` collapsed layout forms (now overridden; E2E regression check added).
- **Not verified:** anything on real Supabase/Vercel (sandbox cannot reach them); real Supabase Storage upload of the `menu` bucket (only the fake Storage in `dev/local-stack/proxy.js`); browser notification permission prompts (only the enable-alerts UI is tested, not actual sound/notification output).
- New files: `lib/staff-schemas.ts`, `lib/report.ts`, `lib/staff-auth.ts`, `lib/upload.ts`, `lib/image-resize.ts`, `components/staff/{StaffNav,OrderAlerts,ImageField,Flash}.tsx`, `app/staff/{menu,menu/[id],settings,report}`.
- Design notes: dishes/categories are archived, never deleted (past orders keep names). Category order uses up/down buttons (no drag). Delivery on/off is derived from whether "Delivery" is ticked in Settings. Uploads go through a server action that checks the admin role, validates the real file signature, and stores in the public `menu` bucket.

### 3c. Merge with origin/main commit a8b3f27
`a8b3f27` ("Add staff sign-in, live order board… kitchen view", Oct 26) was a parallel, older take on the staff board built on the hardening base but with it stripped out (no 0002 migration, health route, lockfile, tests). Reviewed file by file: everything it adds (SoundAlert, role transitions, staff client) is already covered here by `OrderAlerts`, `lib/status.ts`, `lib/supabase-staff.ts`. The one idea not yet present, **kitchen only sees accepted/preparing/ready orders (and is alerted when an order is accepted)**, was added (`visibleStatuses`). Merged with `-s ours` so the commit stays in history and `main` can fast-forward, with none of its deletions applied.
Note: the kitchen filter is UI only; RLS still lets kitchen staff read all orders. Tighten in a future migration if that matters.

## 4. Verified results (run in the sandbox before packaging)
- `npx tsc --noEmit`: clean. `npm test`: **62/62** unit + component tests pass.
- `npm run test:db`: **27/27** database checks (pricing, atomic rollback, spam throttle, role matrix, idempotency, migration 0003, seed re-runnable).
- `npm run test:e2e` (headless Chrome, phone 390px + desktop 1366px): **33/33** pass, including: real order placed -> live tracking page, category/search/tag filters, item sheet with extras, cart validation, no horizontal overflow, JSON-LD valid, reduced-motion check, **axe WCAG A/AA: zero violations**, robots/sitemap/manifest/icon/health endpoints.
- `scripts/bootstrap.mjs` verified on an empty database (first deploy), re-run (no-op), legacy database where 0001 was applied by hand (auto-baseline), and a bad DB URL (fails the build with a clear message).
- Screenshots reviewed: desktop hero/menu/bottom row, phone hero/menu. Bugs found by screenshots and fixed: page loading pre-scrolled, art background bands, headline words glued together, "Platter" drawn as a drink, **phone grid blow-out (page wider than screen)**, squeezed nav.

## 5. NOT verified (be honest about these)
- **Never run against a real Supabase project or real Vercel.** All tests used a local Postgres 16 + PostgREST + fake Auth/Storage (`dev/local-stack/`). Real Supabase Auth login, the newer `sb_publishable_`/`sb_secret_` key format, and Storage uploads against the real service are untested.
- The user's **original Vercel build failure was never reproduced** (the original code built fine locally). Root cause unknown; likely env/lockfile/settings. If it fails again, get the red lines from the Vercel build log.
- Screenshots **not yet reviewed** after the latest nav fix: phone screens 3-7 (lower sections), tracking page, item sheet, cart sheet (all captured by `e2e/shots.mjs` / `e2e/run.mjs` into `e2e/shots/`, which is git-ignored).
- Staff pages were restyled by CSS only and **not visually reviewed** in the clay theme.
- No Lighthouse/performance measurement was done.

## 6. REMAINING WORK (in order)
### Phase 4: Staff product (build, test, screenshot, fix each item)
Existing staff code: `/staff` (orders board with role-based status buttons, pause-orders switch, sold-out switches, 10 s auto-refresh), `/staff/login`, `middleware.ts` (session refresh), `app/staff/actions.ts`, `lib/supabase-staff.ts` (cookie client acting AS the logged-in user; RLS enforces everything), `lib/status.ts` (role -> allowed transitions, mirrors the DB function).
Build:
1. **`StaffNav`** (Orders | Menu | Settings | Report), shown on every staff page. Menu/Settings = admin only; Report = admin + counter.
2. **Order alerts** (client component on `/staff`): when pending-order count rises between refreshes -> play a chime (WebAudio), flash `document.title`, show a `Notification` if permitted. Needs an "Enable alerts" button (browsers require a user gesture); remember choice in localStorage.
3. **Menu editor** `/staff/menu` + `/staff/menu/[id]` (and `new`): list by category; item form (name, category, description, price, tags checkboxes from `lib/tags.ts`, featured, published, available, sort order); **option manager** (group name, option name, extra price; delete); **categories** (add/rename/reorder/publish). Items are **archived, never deleted** (`archived_at`; there is no DELETE policy and `order_items` references items). Slug = slugified name + short random suffix (unique).
4. **Photo upload** (items + hero image): client-side resize to <= 1600px and re-encode WebP/JPEG (phone photos are 5-10 MB; `next.config.ts` allows 6 MB server-action bodies), then a server action that **verifies the caller is admin via `staffClient()`**, uploads with `adminClient()` to Storage bucket **`menu`** (public; created by bootstrap), stores the public URL in `menu_items.image_url` / `restaurant_settings.hero_image_url`. Validate type (jpeg/png/webp) and size (<= 5 MB). UI already shows `image_url` when present (`components/menu/*`, hero background in `app/page.tsx`).
5. **Settings editor** `/staff/settings`: name, tagline, description, phone, address, currency (3 letters), timezone (validate with `Intl.DateTimeFormat`), opening hours per day (open/close time, closed checkbox; overnight shifts like 18:00-02:00 are supported by `lib/hours.ts`), delivery on/off + fee, enabled fulfilment methods, accepting-orders switch, hero photo. Zod-validate every action.
6. **Report** `/staff/report`: last 7 days, orders count, revenue (exclude rejected/cancelled), average order, per-day bars, top items (aggregate in JS from `orders` + `order_items`; RLS lets staff read).
7. **Tests**: unit tests for the new zod schemas/slug/aggregation; extend `supabase/tests/order_flow.sql` for admin writes to menu/settings (and that counter/kitchen cannot); extend `e2e/run.mjs` with a staff flow (login -> accept an order -> create an item with a photo -> see it on the home page -> edit settings -> see the name change -> report page) using `STAFF_EMAIL`/`STAFF_PASSWORD`; axe on staff pages; screenshots reviewed on phone + desktop.

### Phase 5: Verification
- Review every captured screenshot (home phone/desktop all sections, item sheet, cart sheet, tracking page, every staff page). Fix spacing/colour/overflow issues.
- Run `tsc`, `npm test`, `npm run test:db`, `npm run test:e2e` (all must be green), `npm run build` with **no** env vars (must succeed).
- Optional: Lighthouse mobile run; image `loading`/`fetchPriority` review.

### Phase 6: Ship
- Update `README.md` + this file; update the go-live checklist artifact (https://claude.ai/artifact/7hxdLTV4Jo1VdPNb3riA5M is **outdated**: it lists 4 env vars and manual SQL; the real flow now needs the 7 variables below).
- Commit and push to GitHub (needs a token, see section 7), then verify on Vercel: `/api/health` must say `"ok": true`, place a test order, process it at `/staff`.

### Backlog / ideas (not requested yet)
Online payment (Telebirr / Chapa for Ethiopia), SMS/WhatsApp/email order notifications, Amharic translation, IP-based rate limiting (WAF), Supabase Realtime instead of polling, kitchen ticket printing, ordering blocked outside opening hours (currently only the pause switch blocks), table reservations (the design reference shows "Book a Table"; deliberately replaced by "Order online" because this is an ordering app), social links, a real photo gallery.

## 7. What the OWNER must provide / do
**In Vercel (Project > Settings > Environment Variables), then Redeploy:**
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://REF.supabase.co` (Supabase > Settings > API; no `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (older projects: anon key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | secret key, mark Sensitive (older: service_role as `SUPABASE_SERVICE_ROLE_KEY`) |
| `TRACKING_TOKEN_SECRET` | 32+ random chars: `openssl rand -base64 48` |
| `SUPABASE_DB_URL` | Supabase dashboard > **Connect** > **Session pooler** URI (IPv4; Vercel builds cannot use the direct IPv6 host). Replace `[YOUR-PASSWORD]` with the DB password |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the owner's staff login (password >= 10 chars; created once, never overwritten) |
| `SEED_DEMO_MENU` | optional: `true` once to load the fictional demo menu, never for the real launch |
Vercel runs `npm run vercel-build` = `node scripts/bootstrap.mjs && next build`, which applies migrations, creates the `menu` bucket and the admin login automatically. If `SUPABASE_DB_URL` is missing it skips setup (then run `supabase/migrations/*.sql` by hand in the SQL editor, in order).
**After deploy:** open `/api/health` (must be `"ok": true`); Supabase > Authentication > URL Configuration > Site URL = the Vercel URL; optionally turn off "Allow new users to sign up" (not required: strangers have no staff role and RLS blocks them).
**Content only the owner has:** real restaurant name, tagline, description, phone, address, opening hours, delivery fee, the real menu (via the staff menu editor once built), real dish photos.
**GitHub:** a token is needed for whoever pushes. A token was pasted in an earlier chat: **it must be revoked** (GitHub > Settings > Developer settings > Personal access tokens). Create a **new fine-grained token limited to this one repo** (Contents: read/write), short expiry, and delete it after the push. Never paste Supabase keys in chat.

## 8. Commands
```bash
npm install
npm run dev                # local dev (needs .env.local, see .env.example)
npm run build              # must succeed even with NO env vars
npm test                   # unit + component tests (62)
npm run test:db            # needs local PostgreSQL (PGHOST/PGUSER set); throwaway DB
npm run test:e2e:staff     # needs the 3 staff logins (see e2e/staff.mjs header)
npm run test:e2e           # BASE_URL=... ; E2E_PLACE_ORDER=1 to place a real order; STAFF_EMAIL/PASSWORD for staff flow
node e2e/shots.mjs phone   # scroll-series screenshots into e2e/shots/ (git-ignored)
npm run setup:db           # run the setup script by hand
```

## 9. Architecture map
- `app/page.tsx` server component: bento home (hero, menu, order/about cards, signature/gallery/contact, footer), JSON-LD. `app/layout.tsx` fonts (self-hosted via `@fontsource`), metadata from DB, motion boot script (`data-motion` only if reduced-motion is off).
- `components/PageMotion.tsx` GSAP (hero timeline, float/steam loops, parallax, scroll reveals `[data-reveal]`, count-up `[data-count]`, magnetic CTA, all inside `gsap.matchMedia` for reduced motion). `components/TrackMotion.tsx` GSAP for tracking.
- `components/menu/*` Motion: `MenuContext` (provider + item sheet), `MenuExplorer` (tabs, search, tag filters, grid), `Showcase` (special card, signature rail, gallery). `components/CartBar.tsx` (cart bar, toast, checkout dialog, idempotent submit).
- `components/art/*` original SVG dish illustrations (`DishArt`) and hero platter (`HeroPlate`).
- `app/actions/place-order.ts` the only way orders are created (server-side, secret key). `app/track/[token]` tracking by hashed token. `app/api/health` setup diagnostics. `app/staff/*` staff area. `middleware.ts` staff session refresh.
- `lib/*` env cleanup (`env.ts`), menu loading + fallbacks, cart logic (sanitize/reconcile with live menu), hours (overnight, next opening, grouping), status/role matrix, tags, validation.
- DB (`supabase/migrations`): 0001 schema + RLS + RPCs; 0002 default settings row, spam throttle (5 orders/phone/10 min), advisory lock for duplicate submits; 0003 tags, sort_order, tagline, hero image, staff read policies. `seed.sql` is idempotent demo data. **Customers never write tables directly**; `create_order` recomputes prices server-side. Staff actions run as the logged-in user; `change_order_status` enforces roles + allowed transitions.

## 10. Local test stack and sandbox gotchas (`dev/local-stack/`)
Recreate in a Linux sandbox: install Postgres 16 (`apt-get update && apt-get install postgresql`), init a cluster on port 5433, load `supabase/tests/stubs.sql` into a DB named `app`, download PostgREST v16.5 static binary from GitHub releases, set role `authenticator` (see `pgrst.conf`), put the JWT secret in `/tmp/prest/secret.txt`, copy `proxy.js`/`mkjwt.js` to `/tmp/prest/`, run `up.sh` then `start-next.sh`. `proxy.js` fakes Supabase Auth (`/auth/v1/*`) and Storage (`/storage/v1/*`) and forwards REST to PostgREST. Test staff logins: admin@x.test/adminpw, counter@x.test/counterpw, kitchen@x.test/kitchenpw (insert matching `auth.users` + `staff_profiles` rows).
Traps learned the hard way:
- Background processes get killed between tool calls; start everything inside the same call that uses it, with `setsid nohup ... &`. A single call is limited to 300 s.
- **Never `pkill -f`/`pgrep -f` a string that appears in your own command**: it kills your own shell. Match with `ps -eo args | grep "^exact"`.
- Test JWTs expire (clock jumps): regenerate `anon.jwt` before starting the app.
- Headless Chrome in the sandbox crashes on `fullPage` screenshots at 2x and on small `/dev/shm`: use viewport screenshots, `--disable-dev-shm-usage`, one browser per viewport.
- CSS grid children need `minmax(0,1fr)` columns or a non-wrapping chip row blows the page wider than the screen.
- Animated words: the space between words must be OUTSIDE the overflow-hidden mask span.
- Keyword matchers need `\b` word boundaries ("Platter" contains "latte").
- `scrollIntoView` also scrolls the page; scroll chip bars with `scrollBy` on the container.
- The sandbox cannot reach supabase.co or image sites: no live Supabase work, no stock-photo downloads (hence illustrations + upload feature).

## 11. Starter prompt for the next chat
> I'm continuing a project. Read HANDOFF.md first, then `docs/PLAN.md`. Phases 0-5 are done; start at **Phase 6 (push to GitHub + verify on Vercel)**. Use the Claymorphism design in `docs/design-reference.png` for every new screen. Build each feature, test it (unit, DB, browser E2E with screenshots on phone + desktop), look at the screenshots, fix problems, and only then move on. Re-run the full suites at the end and report only what you verified. I will give you a fresh GitHub token limited to the repo for the final push. My only job is deploying on Vercel, so keep the zero-touch setup working.

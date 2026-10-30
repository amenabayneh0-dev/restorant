# Build plan

## Refined brief (what "done" means)
A complete, deploy-and-forget restaurant ordering product. The owner's only job is to import the repo in Vercel and add
environment variables. Everything else (database, admin login, image storage) is provisioned automatically on deploy.

**Customers** can browse an attractive, fast, mobile-first menu (search, dietary filters, photos/illustrations), customise
items, order for pickup / dine-in / delivery, and follow the order live.
**Staff** can run the restaurant from a phone: live order board with sound alerts, edit the menu (prices, photos, sold-out,
options), edit hours/settings, and see sales.
**Quality bar:** expert visual design, purposeful GSAP + Motion animation that respects reduced-motion, accessible (axe clean),
every feature covered by automated tests, and verified in a real browser with screenshots reviewed.

## Research findings that drive the plan
| Finding (2025-26 industry sources) | Decision |
|---|---|
| Ordering must be reachable immediately; unclear CTAs cost conversions | "Order now" in hero + sticky cart bar everywhere |
| Most traffic is phones; speed matters | Mobile-first, self-hosted fonts, no external requests, images compressed client-side |
| Menu photos and dietary flags influence orders; owners must edit menus without a developer | Photo upload + tags + full menu editor |
| First-party ordering beats marketplaces | Direct ordering, no commission, pay on receipt |
| "Open now?" and local-search questions | Live open/closed status, JSON-LD Restaurant markup, click-to-call, map link |
| Vercel builds are IPv4-only; Supabase direct DB host is IPv6-only | Setup script uses the Supabase **Session pooler** string |

## Phases
| # | Phase | Deliverables | Exit test |
|---|---|---|---|
| 0 | Research + plan | this file | - |
| 1 | Zero-touch deploy | migrations 0003, `scripts/bootstrap.mjs` (migrate, bucket, admin user, optional demo menu), next.config | bootstrap run against empty DB, then re-run (idempotent); DB tests |
| 2 | Design system + motion foundation | tokens, self-hosted fonts, GSAP/Motion setup, reduced-motion, illustration art | build; unit tests |
| 3 | Customer experience | hero, info strip, featured, menu explorer (search/tags/scrollspy), item sheet, cart + checkout, tracking, SEO | component tests; browser E2E + screenshots |
| 4 | Staff product | order board + alerts, menu editor + photo upload, settings, report | RLS tests; browser E2E |
| 5 | Verification | full browser E2E on phone + desktop, axe accessibility, screenshots reviewed and fixed | all green |
| 6 | Ship | push to GitHub, final docs | remote == local |

## Environment variables (Vercel)
Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `TRACKING_TOKEN_SECRET`,
`SUPABASE_DB_URL` (Session pooler string), `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Optional: `SEED_DEMO_MENU=true`.

# Restaurant ordering site (Next.js + Supabase + Vercel)

Dark claymorphism design, GSAP + Motion animation, direct ordering (pickup / dine-in / delivery, pay on receipt), live order tracking, staff order board. **See `HANDOFF.md` for current status, what is left, and what is needed.**

## Deploy (your only job)
1. Push this repo to GitHub, then Vercel > Add New > Project > import it (Framework: Next.js, Root: repo root).
2. Add the environment variables listed in `.env.example` (7 required; the table with where to find each is in `HANDOFF.md` section 7).
3. Deploy. The build runs `scripts/bootstrap.mjs` which applies the database migrations, creates the image bucket and your admin login automatically.
4. Open `/api/health`: it must say `"ok": true`. Then sign in at `/staff`.

Without `SUPABASE_DB_URL` the automatic setup is skipped; run `supabase/migrations/0001..0003_*.sql` in the Supabase SQL editor instead (skip `seed.sql` on production).

## Test
`npm test` (unit/component), `npm run test:db` (needs local PostgreSQL), `npm run test:e2e` (headless Chrome against `BASE_URL`).

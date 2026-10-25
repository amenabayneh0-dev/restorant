# MenuFlow: Supabase and Vercel setup

## 1. Create the Supabase project (first time)
1. supabase.com > **New project**. Pick a name, a strong database password (save it), and the region nearest your customers.
2. Wait about 2 minutes for provisioning.
3. **SQL Editor > New query**. Paste and **Run** these two files, in this order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_hardening.sql`  (creates a placeholder restaurant row and adds spam protection)
4. (Development projects only) run `supabase/seed.sql` for fictional demo data. **Never run it on production.**
5. Production: edit your real details in **Table Editor > restaurant_settings** (name, phone, address, opening hours, currency), then add categories and items.
6. **Project Settings > API**: copy the Project URL, the publishable key and the secret key.

## 2. Create staff accounts (deliberate, not public)
1. **Authentication > Users > Add user > Create new user** (tick "Auto confirm").
2. Copy the user's UUID and run in the SQL Editor:
   ```sql
   insert into staff_profiles(user_id, display_name, role)
   values ('PASTE-USER-UUID', 'Your Name', 'admin');   -- or 'counter' / 'kitchen'
   ```
3. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up".

Roles: `admin` can do everything and also pause orders and mark items sold out. `counter` accepts/declines, completes and cancels. `kitchen` starts preparing and marks ready.
Staff sign in at **/staff**. The page refreshes itself every 10 seconds.

## 3. Environment variables (Vercel and `.env.local`)
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-REF.supabase.co` (no `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (older projects: the `anon` key, as `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | secret key, mark **Sensitive** (older projects: `service_role`, as `SUPABASE_SERVICE_ROLE_KEY`) |
| `TRACKING_TOKEN_SECRET` | 32+ random characters: `openssl rand -base64 48` |

Never commit `.env.local`, and never paste keys into chats or screenshots.

## 4. Deploy on Vercel
1. Push the repo to GitHub (include `package-lock.json`).
2. vercel.com > **Add New > Project** > import the repo. Framework: Next.js. Root Directory: the repo root.
3. Add the 4 environment variables above, then **Deploy**.
4. Open **`/api/health`** on your site. It must say `"ok": true`. If not, it names what is missing or failing.
5. Supabase **Authentication > URL Configuration**: set Site URL to your Vercel URL.
6. Place a test order, then process it at `/staff`.

## Troubleshooting
- `/api/health` shows a `false` under `env`: that variable is missing or misspelled in Vercel. Redeploy after changing variables.
- `public_read_menu` fails: wrong URL/key, or the migrations were not run.
- `server_secret_key` fails: the secret key is wrong, or `0001_schema.sql` was not run.
- Vercel > your deployment > **Logs** shows lines starting with `[menu]`, `[placeOrder]`, `[staff]` with the exact cause.

## Tests
```bash
npm test          # unit + checkout component tests
npm run typecheck
npm run test:db   # database tests; needs a local PostgreSQL (PGHOST/PGUSER set), uses a throwaway database
```

## How the database protects you
- Customers never write to tables directly. Only the server calls `create_order`, which re-reads prices from the database, validates options, and is atomic (all-or-nothing).
- `idempotency_key` makes a repeated or simultaneous submission return the same order. A phone number can place at most 5 orders per 10 minutes.
- Tracking tokens are stored only as SHA-256 hashes; `get_order_tracking` returns minimal data.
- Staff actions run as the logged-in user. `change_order_status` enforces the role matrix and allowed transitions, so a forged request cannot bypass it.
- Nobody can edit `staff_profiles` through the API, so roles cannot be self-promoted.

## Known limits
- Ordering is not blocked outside opening hours (only by the "accepting orders" switch). Use the pause button at /staff.
- Payment is on receipt; there is no online payment.
- No push or sound alerts for new orders yet; the staff page polls every 10 seconds.

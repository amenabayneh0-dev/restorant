# MenuFlow: Supabase and Vercel setup

## 1. Create the Supabase project (first time)
1. Go to supabase.com, sign up, click **New project**. Pick a name, a strong database password (save it in a password manager), and the region nearest your customers.
2. Wait about 2 minutes for provisioning.
3. Open **SQL Editor > New query**. Paste all of `supabase/migrations/0001_schema.sql`, click **Run**. It should say "Success".
4. (Development only) paste and run `supabase/seed.sql` for fictional demo data. **Never run it on your production project.**
5. **Project Settings > API**: copy the Project URL, the publishable key, and the secret key.

## 2. Create the first administrator (deliberate, not public)
1. **Authentication > Users > Add user > Create new user**. Enter an email and password and tick "Auto confirm".
2. Copy that user's UUID, then in the SQL Editor run:
   ```sql
   insert into staff_profiles(user_id, display_name, role)
   values ('PASTE-USER-UUID', 'Your Name', 'admin');
   ```
3. Add counter and kitchen staff the same way, with role `'counter'` or `'kitchen'`.
4. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up". Even if someone signs up they have no `staff_profiles` row, so they get no access.

## 3. Local run
```bash
cp .env.example .env.local    # then paste your three values
npm install
npm run dev
```
`.env.local` must never be committed (add it to `.gitignore`).

## 4. Deploy on Vercel
1. Push the repo to GitHub.
2. vercel.com > **Add New > Project** > import the repo (Framework: Next.js).
3. Under **Environment Variables**, add the three variables from `.env.example`. Mark `SUPABASE_SECRET_KEY` as sensitive.
4. Click **Deploy**.
5. In Supabase **Authentication > URL Configuration**, set Site URL to your Vercel URL.

## How the database protects you
- Customers never write to tables directly. Only the server calls `create_order`, which re-reads prices from the database, validates options, and is atomic (all-or-nothing).
- `idempotency_key` makes a repeated submission return the same order instead of a duplicate.
- Tracking tokens are stored only as SHA-256 hashes. The server hashes the token from the URL and calls `get_order_tracking`, which returns minimal data.
- Staff status changes go through `change_order_status`, which enforces the role matrix: counter handles accept, reject, complete and cancel. Kitchen handles preparing and ready. Admin can do all of these.
- Nobody can edit `staff_profiles` through the API, so roles can't be self-promoted.

## Status
Built: schema, constraints, RLS, trusted order/tracking/status functions, seed, setup guide.
Not yet verified: nothing in this folder has been run against a live Supabase project. Run the migration and tell me about any error.

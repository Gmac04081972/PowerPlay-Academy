# PowerPlay Academy — web app

Online training + certification portal for the PowerPlay track team. People sign up,
work through the modules for their level, sit the online test, and an assessor signs off
the practical on the floor. Every step is dated and saved. Passing the test **and** getting
the practical signed off certifies a level and unlocks the next rank.

The five levels — **Trainee → Rookie → Rally → WRC → Champion** — and all their modules,
practical criteria and test syllabi come straight from the venue's training decks and live in
`src/content/curriculum.json`.

## Stack
- **Front-end:** React + Vite (`src/`)
- **Back-end:** Supabase (Postgres + Auth) — schema in `supabase/schema.sql`
- **Hosting:** any static host — Vercel or Netlify recommended (auto-deploy from GitHub)

## Run locally
1. `npm install`
2. Create a Supabase project, then in the SQL editor run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL + anon key.
4. Seed the reference data (levels, modules, criteria):
   `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed`
5. Load a test bank into the `test_questions` table (start from `src/content/testbank.sample.json`; see DEVELOPER_BRIEF.md).
6. `npm run dev` → open the local URL.

## Deploy
1. Push to GitHub.
2. Import the repo into **Vercel** (or Netlify). Framework preset: Vite.
3. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's dashboard.
4. Deploy. Add a custom domain (e.g. `academy.powerplay…`) in the host's settings.

## What's done vs. what's left
**Done:** full curriculum content, database schema + security rules, the data layer
(`src/lib/api.js`), and the app UI (`src/App.jsx`).
**To finish before launch:** author the full test banks per level; set staff roles
(`profiles.role = 'assessor' | 'manager'`) so only authorised people can sign off; optional
PDF certificate export. See DEVELOPER_BRIEF.md.

# CrewPulse

Volunteer and crowd coordination for events. Coordinators create an event from a template, volunteers join with a code and add their skills, and **attendees just scan a QR code and pick a name** (no account, no email). The assignment engine matches skills, availability, preferences and fair hours, and re-optimizes in milliseconds when someone drops out.

Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres, Realtime, Storage), Framer Motion, Recharts, SWR, zod + react-hook-form, dnd-kit, qrcode.react, vitest.

## Who uses it

| Role | How they get in | What they see |
|---|---|---|
| **Coordinator** | Creates an account, creates events | Dashboard, assignments, volunteers, tasks, issues, complaints, announcements, setup, QR poster |
| **Volunteer** | Creates an account, enters the event join code (or scans the volunteer QR) | Shifts, check-in/out, hours, alerts, report an issue, own profile and photo |
| **Attendee** | Scans the event QR code, types a display name. **No account, no email.** | Live announcements and alerts, event info and map, one-tap alerts and complaints sent under their chosen name |

Attendee identity is a random token stored on their own device; the server keeps only its hash. The name they choose is what organizers see on their alerts and complaints.

## Run locally

```bash
npm install
cp .env.example .env.local        # fill in the three Supabase values
# In the Supabase SQL editor run supabase/schema.sql once (choose "Run without RLS").
# If you already ran an older version, run the files in supabase/migrations/ in order instead.
npm run dev                       # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Optional: `npm run seed` creates a demo coordinator (`demo.coordinator@crewpulse.app` / `demo1234`) with a 60-volunteer event to try the engine at scale. The app itself ships with no data.

## Deploy to Vercel

1. **Supabase:** create a project. In the SQL editor run `supabase/schema.sql` (fresh project) or the migrations in `supabase/migrations/` (existing project). Choose **Run without RLS**.
2. **Push the repo** to GitHub and **import it in Vercel** (framework: Next.js is detected). `vercel.json` pins functions to the Mumbai region (`bom1`) to sit close to an ap-south Supabase project; change it to match your Supabase region.
3. **Environment variables** (Project Settings, Environment Variables), the same three as `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (the secret key, server only, never prefix with `NEXT_PUBLIC_`)
4. **Deploy.** QR codes and links are built from the live domain automatically, so printed posters work on whatever URL you deploy to. Storage buckets (`avatars`, `covers`) are created on first upload.
5. **Smoke test on the deployed URL:** create a coordinator account, create an event from a template, open the QR poster, scan it with a phone, enter a name, and send an announcement from the dashboard.

Notes for production: Row Level Security is off for the hackathon. Access is enforced in the app and in the API routes (every mutation checks the caller's role in the event), but a production launch should add RLS policies. There is no password reset or email verification yet, and times are IST.

## How the engine works (`src/lib/engine`)

Pure TypeScript, no DB, no clock. Every function takes its inputs (and `now`) as parameters.

- **Hard constraints:** all required skills, availability covers the shift, no overlap (15 min travel buffer only between different zones), max hours, not already in the shift.
- **Soft score:** +15 preferred zone, +8 continuing in the same zone, +5 x reliability, minus 4 per hour above the average target (fairness), minus 12 per scarce skill wasted on a seat that does not need it.
- **Algorithm:** shifts sorted by scarcity, greedy best-score fill, then a swap-based local search to fill remaining gaps.
- **Rebalance:** `suggestReplacements` ranks the top 5 eligible replacements for one seat. Also `computeCoverage`, `suggestMoves`, `routeIssue`, `tickEscalations` and a naive baseline for the benchmark.

## Project layout

```
src/app/            pages: / (landing), /login, /events, /e/[id]/* (coordinator), /v/* (volunteer), /a/* + /join/[code] (attendee), /api/*
src/components/     ui (shadcn), common (kit, visuals, QR, avatars), coord, dashboard, assignments, ops, volunteer, attendee, landing
src/lib/            engine, templates, db (queries), auth, data providers, attendee identity
supabase/           schema.sql and migrations
```

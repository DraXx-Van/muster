# CrewPulse

Event volunteer and crowd coordination platform. It assigns volunteers to roles and shifts using skills, availability, preferences and fair hours, re-optimizes in milliseconds when people drop out, and gives coordinators live visibility of every zone.

Built for a hackathon. Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres + Realtime), Framer Motion, Recharts, SWR, zod + react-hook-form, dnd-kit, vitest.

## Run it

```bash
npm install
cp .env.example .env.local      # fill in the Supabase URL, publishable key and secret key
# run supabase/schema.sql once in the Supabase SQL editor (choose "Run without RLS")
npm run seed                    # wipes and recreates the demo event (use `-- --assigned` to pre-run the engine)
npm run dev                     # http://localhost:3000
```

Checks: `npx tsc --noEmit`, `npm run lint`, `npm test` (engine), `npm run build`.

## Demo script (3 minutes)

1. **Login** (`/login`): pick the organizer. Volunteers get the phone view; open `/login?as=<person id>&to=/me` on a phone to jump straight in.
2. **Wow 1, engine** (`/assignments`): Auto-assign, read the preview (coverage vs naive, hours spread, gaps with reasons), click the info icon on a row for "why", then Apply.
3. **Wow 2, chaos + live**: dashboard on the big screen, phone on `/me`. Press **Chaos** (top right): three volunteers drop, First Aid turns red and pulses, a medical issue appears. On `/assignments` click the open First Aid seat, see ranked replacements and the "re-optimized in x ms" badge, press Assign. The zone goes green and the volunteer's phone shows a toast.
4. **Wow 3, escalation** (`/issues`): raise a critical issue and leave it. The countdown ring drains and it escalates to the head coordinator, then the organizer, live.
5. **Close**: jump the demo clock (top right) to a shift, check in on the phone, watch the hours counter, send an announcement to one zone.

The demo clock (top right) time-travels the whole event; shifts, coverage, check-in windows and hours follow it. `npm run seed` resets everything to 08:45.

## How the engine works (`src/lib/engine`)

Pure TypeScript, no DB, no clock. Every function takes its inputs (and `now`) as parameters.

- **Hard constraints:** all required skills, availability window covers the shift, no overlap (15 min travel buffer only between different zones), max hours, not already in the shift.
- **Soft score:** +15 preferred zone, +8 continuing in the same zone, +5 x reliability, minus 4 per hour above the average target (fairness), minus 12 per scarce skill wasted on a seat that does not need it.
- **Algorithm:** shifts sorted by scarcity (fewest eligible volunteers per seat first), greedy best-score fill, then a swap-based local search to fill remaining gaps (move A to the empty seat, backfill A's old seat with B).
- **Rebalance:** `suggestReplacements` ranks the top 5 eligible replacements for one seat, never re-suggesting the person who dropped.
- **Also:** `computeCoverage` (planned/live), `suggestMoves` (over-staffed to short zones), `routeIssue` and `tickEscalations`, and `naiveAssign` as the benchmark baseline.

On the seeded event (60 volunteers, 104 seats): engine 99% coverage vs 93.3% naive, hours spread about 10% lower, about 13 ms. 500 volunteers run in about half a second.

## Deviations from the PRD

- The "+10 per extra skill" bonus was replaced by a penalty for spending scarce skills (First Aid, AV/Tech) on seats that do not need them; the bonus would have burned those people on ordinary seats.
- The travel buffer applies only between different zones, so a volunteer can work two back-to-back shifts in one zone.
- The demo clock has jump controls (+/- minutes, jump to a time) instead of play/pause/speed.
- For dropped and no-show assignments, `checked_out_at` stores when the change happened.

## Future work

Real authentication and RLS, real SMS/email/push, multi-event tenancy, QR check-in, an ILP solver behind the same engine interface.

The rules for AI assistants working on this repo are in `CLAUDE.md` (copied to `AGENTS.md`, `.cursor/rules` and `.github/copilot-instructions.md`).

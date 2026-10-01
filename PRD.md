# PRD: Muster, Event Volunteer & Crowd Coordination Platform

## 1. One-line pitch
Spreadsheets and WhatsApp groups don't survive a real event. Muster assigns the right volunteer to the right role and shift, **re-optimizes in milliseconds when people drop out**, and gives coordinators **live visibility** of every zone.

## 2. Goals and non-goals
**Goals**
- Fully cover all 6 requirements from the problem statement at a working level.
- Make the core challenge (constraint-based assignment + instant rebalancing) visibly excellent and explainable.
- A 3-minute demo with 3 "wow" moments (see section 10).

**Non-goals** (mention as future work)
- Real SMS/email/push sending, payments, real auth providers, multi-event tenancy, native apps.

## 3. Personas
| Persona | Needs |
|---|---|
| **Organizer** | Define event, zones, shifts, headcount. See overall health. Run auto-assign. |
| **Coordinator** | Live view of their zones, handle issues, broadcast, move people. |
| **Volunteer** (phone) | See my shifts, check in/out, raise issues, read announcements, see my hours. |

Auth = "demo login": pick a persona (and which volunteer) on the login screen; store in localStorage + cookie. Mention real auth as future work.

## 4. Feature spec (mapped to the 6 requirements)

### R1 Event and role setup (`/setup`)
- Create/edit event (name, venue, start/end).
- CRUD zones (name, color, position on the SVG venue map, zone coordinator).
- CRUD shifts: zone, role name, required skills (multi-select), start/end, headcount. "Duplicate shift to all time blocks" button.
- Skills list is a fixed set: First Aid, Crowd Control, Registration, AV/Tech, Parking/Traffic, Hospitality, Security, Logistics, Photography, Multilingual.
- **Accept:** shifts created here immediately appear in dashboard and engine input.

### R2 Skill-based shift assignment (CORE, `/assignments`)
See section 5 for the algorithm. UI:
- **Auto-assign** button -> runs engine -> shows a preview (proposed assignments, gaps, stats) -> **Apply** writes to DB.
- Stats cards: coverage %, unfilled seats, fairness (std dev of hours), compute time (ms).
- **Explainability:** click any assignment -> "why": skill match, preference bonus, fairness penalty, score.
- **Benchmark:** toggle "Naive (first come first served)" vs "Muster engine" side by side -> our headline number.
- **Gaps list:** each unfilled seat with reason ("no First Aid certified volunteer free 12:00 to 15:00").
- **Dropout flow:** on any assignment "Mark dropped/no-show" -> engine returns ranked **replacement suggestions** with reasons -> one click **Assign** (or "Auto-fill all"). Shows "re-optimized in X ms".
- **Chaos button** (`api/simulate`): randomly drops 3 volunteers and raises 1 medical issue, to drive the demo.
- **Accept:** no volunteer is ever double-booked or assigned without required skills (enforced in engine + test).

### R3 Volunteer profiles and check-in (`/volunteers`, `/me`)
- Register volunteer (form): name, phone, email, skills, availability windows, preferred zones, max hours.
- Volunteer list: search, filter by skill/status, hours contributed, reliability.
- Volunteer mobile view `/me`: upcoming shifts (current one highlighted), big **Check in** / **Check out** button (only enabled within shift window +/- 15 min on the demo clock), hours counter, raise issue, announcements feed.
- Coordinator can also check people in (attendance table with toggle). Stretch: QR code per volunteer (`qrcode.react`) + scan.
- Total hours = sum of (checkout - checkin) of completed assignments.

### R4 Live task board (`/tasks`)
- Kanban columns: Open / In progress / Resolved, filtered by zone (tabs or dropdown).
- Create task (title, zone, priority, assignee), drag card between columns (`@dnd-kit`), realtime updates across browsers.
- Volunteers can see tasks of their zone and mark progress from `/me`.

### R5 Announcements and escalations (`/announcements`, `/issues`)
- Broadcast to **all**, a **zone**, or a **role**; mark urgent. Fan-out creates a `notifications` row per target volunteer; volunteers get a live toast and a feed item.
- **Issues:** category (medical, crowd_surge, missing_equipment, security, other), severity, zone, description. Auto-routed to the zone coordinator; medical also notifies First Aid coordinator.
- **Escalation:** each issue has an acknowledge deadline by severity (critical 30 s, high 60 s, medium 120 s; compressed for demo, say so). If not acknowledged, level +1 (zone coordinator -> head coordinator -> organizer), new deadline, notification created. Countdown ring on each open issue. Coordinator pages call `POST /api/escalate/tick` every 5 s.
- **Accept:** raise a critical issue, don't touch it, watch it escalate twice on screen.

### R6 Coordination dashboard (`/dashboard`, the hero screen)
- KPI strip (count-up animated): overall coverage %, checked-in now, attendance rate, open issues, tasks done %.
- **Venue map (custom SVG floor plan):** each zone rectangle colored by live coverage (green/amber/red); red pulses; click a zone opens a side sheet (who is there, gaps, tasks, issues).
- **Coverage heatmap:** zones (rows) x time blocks (columns), cells show filled/required.
- **Staffing suggestions:** "Move Priya from Registration (overstaffed +2) to Parking (short -1). She has Parking/Traffic." One-click **Apply** (reassigns via engine).
- Live feed: check-ins, drops, issues, announcements (animated list).
- **Demo clock control:** play/pause/speed and +15 min buttons. All "now" logic follows it.
- Charts: attendance by hour, hours per volunteer (fairness), issues by category.

## 5. Assignment engine spec (src/lib/engine, pure TypeScript)

**Model:** each shift expands to `headcount` seats. We assign volunteers to seats.

**Hard constraints** (seat ineligible if any fails):
1. Volunteer has **all** `required_skills`.
2. Volunteer's availability windows fully **cover** the shift.
3. **No overlap** with another assigned shift. Shifts in a *different* zone need a 15 min travel buffer; same-zone back-to-back shifts (e.g. 09-12 then 12-15) are allowed with no buffer.
4. Total assigned hours <= `max_hours`.
5. Volunteer not already in this shift.

**Soft score** (higher is better), for each eligible (volunteer, seat):
```
score =  +10 * (skills matched beyond required, capped at 2)
         +15 * (shift zone in preferred_zone_ids)
         -  4 * max(0, volunteerHours - targetHours)      // fairness
         +  5 * reliability                               // 0..1
         +  8 * (same zone as previous shift, continuity)
```
`targetHours` = total seat-hours / number of volunteers.

**Algorithm (constructive + local search):**
1. Compute for every shift its scarcity = eligibleVolunteers / headcount. Sort ascending (hardest first).
2. For each seat in that order pick the best-scoring eligible volunteer; update hours and busy windows.
3. **Improvement pass:** for unfilled seats, try to free a volunteer by swapping: find volunteer A assigned to shift S1 who could also do S2 (unfilled) while another eligible volunteer B can take S1. Accept if total score improves and all constraints hold. Repeat up to N=200 iterations or until no improvement.
4. Return assignments (with score + reason string), gaps (with reason), stats (coverage, fairness std dev, ms).

**Rebalance on dropout:** mark assignment dropped, recompute eligibility for that one seat using current state, return top 5 candidates with reasons ("has First Aid, free, only 2.0 h so far"). Optionally allow a swap chain depth 1 (move someone from an overstaffed seat).

**Staffing suggestions (live):** for each zone and time block: `delta = present - required` (planning mode uses assigned, live mode uses checked_in). For each negative delta, find volunteers in positive-delta zones at the same time who have the needed skills; suggest the move with the highest score.

**Naive baseline:** loop over shifts in order, assign first volunteers with matching skills ignoring fairness/overlap checks except double-booking. Used only for the benchmark toggle.

**Tests (vitest, must pass):** no double-booking; skills always satisfied; dropout replacement respects constraints; coverage with engine >= naive on the seed; fairness std dev with engine < naive.

**Stretch:** swap heuristic for HiGHS/ILP for provable optimality (same interface).

## 6. Data model
See `supabase/schema.sql` and `src/lib/types.ts`. Tables: events, zones, volunteers, shifts, assignments, tasks, issues, announcements, notifications. Realtime enabled on assignments, tasks, issues, announcements, notifications, shifts. RLS intentionally OFF for the hackathon (say "production would add RLS + Supabase Auth").

## 7. Screens and routes
```
/login                      demo persona picker
/dashboard                  coordinator hero screen
/setup                      event, zones, shifts
/volunteers                 list + register + attendance
/assignments                auto-assign, gaps, dropout, benchmark
/tasks                      kanban
/issues                     issues + escalations
/announcements              compose + history
/me                         volunteer mobile home (shifts, check-in, feed)
/me/issue                   volunteer raise issue
```
API routes: `POST /api/assign`, `POST /api/assign/apply`, `POST /api/rebalance`, `POST /api/announce`, `POST /api/escalate/tick`, `POST /api/simulate`, `POST /api/clock`.

## 8. Seed data (make it realistic and a bit tight, so the engine has work to do)
- Event: "TSEC Fest 2026", one day 09:00 to 21:00.
- 8 zones: Entry Gate, Registration Desk, Main Stage, Parking, First Aid, Food Court, Info Desk, Workshop Hall.
- 4 time blocks (09-12, 12-15, 15-18, 18-21) x 8 zones = 32 shifts, about 110 seats.
- 60 volunteers with Indian names, 1 to 3 skills each, varied availability (some only mornings, some only afternoons), 2 to 3 preferred zones.
- **Scarcity on purpose:** only 4 volunteers have First Aid, only 6 have AV/Tech. After auto-assign there should be 1 to 2 gaps left so staffing suggestions and dropout flow are interesting.
- 3 coordinators (Entry/Registration/Parking, Stage/Workshop/Info, First Aid/Food) and 1 organizer.
- Seed script is idempotent: `npm run seed` wipes and recreates. Announce in chat before running.

## 9. UX and animation spec
- Theme: shadcn zinc, dark mode default, one accent (indigo). Font: Geist or Inter.
- Coordinator screens are desktop-first, volunteer screens mobile-first.
- Framer Motion: KPI count-up, AnimatePresence on feeds and cards, `layout` on kanban cards, red-gap pulse on map, confetti-less. A subtle progress bar while the engine runs, then the numbers "tick" into place.
- Toasts (sonner) for every realtime event relevant to the viewer.
- Skeletons for loading, friendly empty states with an action button.

## 10. Demo script (3 minutes)
1. **(20 s) Problem:** spreadsheets, WhatsApp, gaps, double bookings.
2. **(40 s) Wow #1, engine:** `/assignments` -> Auto-assign -> coverage jumps, benchmark vs naive ("96% vs 71% coverage, hours spread down 60%"), click one assignment to show "why".
3. **(60 s) Wow #2, chaos + live:** dashboard on the big screen, phone open on `/me`. Press **Chaos**: 3 volunteers drop, First Aid zone goes red and pulses, medical issue appears. Go to dropout flow -> replacement suggestions -> Auto-fill -> "re-optimized in 14 ms", zone goes green. Volunteer phone shows toast "You've been assigned to First Aid".
4. **(30 s) Wow #3, escalation:** raise a critical issue, leave it, countdown ring expires, it escalates to head coordinator live.
5. **(20 s) Close:** check-in on phone, hours counter, announcements to a zone, tech stack, future work.
Always have a backup screen recording of this exact flow.

## 11. Priorities
**MUST** (demo path): setup + seed, auto-assign with preview/apply, gaps, dropout replacement, dashboard map + KPIs + heatmap, volunteer check-in, issues + escalation, announcements, task board.
**SHOULD:** explainability panel, benchmark toggle, staffing move suggestions, demo clock, chaos button, fairness chart.
**COULD:** QR check-in, CSV import of volunteers, dark/light toggle, PDF export of schedule, ILP solver.

## 12. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Merge conflicts | Strict folder ownership (CLAUDE.md), contract-first types, merge every 30 to 45 min |
| Realtime flakiness | SWR polling fallback every 3 s |
| Supabase/net issue at demo | Backup video, seeded fallback, deploy early |
| Engine bugs | Pure functions + vitest, seed-based test |
| Scope creep | Feature freeze at T+4:00 |

## 13. Judge Q&A cheat sheet
- *Why greedy + local search and not ILP?* Explainable, runs in milliseconds for hundreds of volunteers, easy to re-run on every dropout; ILP is a drop-in upgrade behind the same interface.
- *How do you ensure fairness?* Target hours + penalty for exceeding it; we report std dev of hours vs naive.
- *What if nobody is eligible?* The seat becomes a gap with a reason; the dashboard suggests moving someone from an overstaffed zone.
- *Scale?* Engine is O(seats x volunteers). Run the engine test with 500 synthetic volunteers before the demo so you can quote a real number.
- *Privacy?* Contact details (phone/email) are visible only to coordinators and organizers; volunteers see names and skills only.

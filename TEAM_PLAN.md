# TEAM_PLAN: 4 people, 4.5 hours, one repo

## 0. Roles (each person owns folders, see CLAUDE.md)
| | Role | Builds | Key files |
|---|---|---|---|
| **P1** | Engine | autoAssign, naiveAssign, suggestReplacements, computeCoverage, suggestMoves, tickEscalations + tests, `/api/assign`, `/api/rebalance`, `/api/simulate`, Assignments page | `src/lib/engine/**` |
| **P2** | Dashboard | KPI strip, SVG venue map, heatmap, staffing suggestions, live feed, charts, demo clock UI, animations | `(coord)/dashboard`, `components/dashboard` |
| **P3** | Ops | Setup (zones/shifts), volunteers list + register, attendance table, task kanban, issues + escalation UI, announcements | `(coord)/*` except dashboard/assignments, `components/ops`, `api/announce`, `api/escalate` |
| **P4** | Foundation + Volunteer | Repo scaffold, Supabase, schema, seed, db queries, demo login, layout/nav, volunteer mobile app, deploy, README, demo video | `supabase`, `lib/db`, `lib/seed`, `(auth)`, `(vol)`, `components/volunteer` |

Shared screens: P1 owns the `/assignments` page UI too (it is the engine's face).

## 1. Timeline (4.5 h; add buffer to polish if you have 5 h)
| Time | What happens |
|---|---|
| **0:00-0:25** | **P4:** scaffold + Supabase + push (steps in section 2). **Others meanwhile:** install Claude Code/Cursor, MCP servers, read PRD.md + CLAUDE.md, create mocks for what they need in `src/lib/mock/` using `types.ts`. |
| **0:25-0:45** | Everyone `git pull`, create branch `p1/engine` etc. P4 finishes schema + seed + queries (others keep using mocks). |
| **0:45-1:45** | **Parallel build, phase 1.** P1 engine + tests. P2 dashboard layout + map + KPIs on mock data. P3 setup forms + volunteers + kanban. P4 login, layout, volunteer `/me`, realtime helper, demo clock. |
| **1:45-2:00** | **Integration #1.** Everyone merges to main. Swap mocks for real queries. Fix breakage together. Nothing new starts until main runs. |
| **2:00-3:15** | **Phase 2.** P1 rebalance + explainability + benchmark + chaos. P2 staffing suggestions, heatmap, live feed, clock. P3 issues + escalation + announcements. P4 check-in flow, notifications toasts, deploy to Vercel. |
| **3:15-3:30** | **Integration #2.** Full run-through of demo script on the deployed URL. |
| **3:30-4:00** | **Polish:** loading/empty/error states, animations, mobile check, seed tuning (gaps exist after auto-assign). |
| **4:00** | **FEATURE FREEZE.** Bug fixes only. |
| **4:00-4:30** | P4: README + screenshots + backup demo video. P1: pitch deck (3 to 5 slides max) + judge Q&A. P2/P3: rehearse demo twice, test on the venue wifi/phone hotspot. |

## 2. Setup steps (P4 does this first, 25 min)
```bash
npx create-next-app@latest crewpulse --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd crewpulse
npx shadcn@latest init
npx shadcn@latest add button card input label select badge dialog sheet tabs table dropdown-menu checkbox textarea sonner avatar progress tooltip separator scroll-area popover skeleton switch
npm i @supabase/supabase-js framer-motion recharts lucide-react zod react-hook-form @hookform/resolvers date-fns swr @dnd-kit/core @dnd-kit/sortable qrcode.react
npm i -D vitest tsx dotenv
```
Then:
1. Copy the starter kit files into the repo root (CLAUDE.md, PRD.md, TEAM_PLAN.md, supabase/, src/lib/types.ts, .claude/, .cursor/, .env.example, .mcp.json.example). Copy `CLAUDE.md` to `AGENTS.md`, `.cursor/rules/project.mdc` (already included) and `.github/copilot-instructions.md`.
2. Add scripts to `package.json`: `"seed": "tsx src/lib/seed/seed.ts"`, `"test": "vitest run"`.
3. Create a Supabase project, run `supabase/schema.sql` in the SQL editor, copy URL + anon key + service role key into `.env.local` (see `.env.example`). Share the keys privately (not in git).
4. Create empty folders with a `.gitkeep`: `src/lib/engine`, `src/lib/mock`, `src/lib/db`, `src/lib/seed`, `src/components/{dashboard,ops,volunteer}`.
5. Write `src/lib/db/client.ts` (browser + server clients), `src/lib/clock.ts`, `src/lib/realtime.ts` (`useRealtime`).
6. Commit to `main`, push, everyone clones. Connect the GitHub repo to Vercel and add the env vars (auto preview deploys).

## 3. Git workflow (prevents 90% of pain)
- **One repo, `main` is always runnable.** Nobody force-pushes.
- Branch per person: `p1/engine`, `p2/dashboard`, `p3/ops`, `p4/foundation`.
- **Merge to main every 30 to 45 minutes**, in small pieces:
  ```bash
  git add -A && git commit -m "feat: ..."
  git pull --rebase origin main
  npm run build   # must pass
  git push origin HEAD:main      # or open a PR if you want a second pair of eyes
  ```
- If `pull --rebase` shows a conflict in a file you don't own, keep *their* version (`git checkout --theirs` is confusing in a rebase, so just ask them) and never resolve by deleting their code.
- **Folder ownership = no conflicts.** The only shared files are `types.ts`, `package.json`, `components/ui`, `globals.css`. Changes there: tell the team chat first, commit immediately, everybody pulls.
- New npm package? Ask P4, who installs it, commits `package.json` + lockfile, and announces.
- DB schema change? Ask P4, who edits `schema.sql`, re-runs it, re-seeds and announces ("pull + re-seed").
- Seed resets wipe the shared DB. Announce before running `npm run seed`.
- Use Vercel preview URLs to test on phones.

## 4. Contract-first development (how you work in parallel without waiting)
1. `types.ts` and the engine function signatures are fixed from minute 0.
2. Each person writes quick **mocks** in `src/lib/mock/` that return those shapes, e.g. `mockCoverage.ts` returning `CoverageCell[]`. P2 builds the whole dashboard against mocks while P1 builds the real engine.
3. At Integration #1 you replace `import { mockX }` with the real function. Because the shapes match, nothing else changes.

## 5. AI setup in the repo
Files included in the kit:
- `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex and many tools), `.cursor/rules/project.mdc` (Cursor), `.github/copilot-instructions.md` (Copilot). Same content, so every tool behaves the same.
- `.claude/commands/feature.md` (`/feature <what>`) and `.claude/commands/verify.md` (`/verify`). Custom slash commands for Claude Code.
- `.mcp.json.example`: copy to `.mcp.json` (git-ignored if it contains tokens). Recommended MCP servers: **Context7** (up-to-date docs), **Playwright** (AI tests the UI in a real browser), **GitHub**. Only **P4** should connect the Supabase MCP (it can change the schema).
- Optional: drop Anthropic's `frontend-design` skill (from the public `anthropics/skills` repo) into `.claude/skills/` for more polished UI.

Rules of thumb for prompting:
- Start every session: "Read CLAUDE.md and PRD.md. I am P2 (Dashboard)."
- Ask for a plan, then code. One feature per prompt. Commit after each working slice.
- Paste exact errors. After each feature: `/verify`.
- Do not let the AI touch folders you don't own.

## 6. Prompt starters
**P1 (Engine)**
> Read CLAUDE.md, PRD.md section 5 and src/lib/types.ts. Implement `src/lib/engine/autoAssign.ts` exactly per the spec (hard constraints, scoring, scarcity ordering, swap improvement). Pure TypeScript, no DB. Also implement `naiveAssign`. Write vitest tests: no double-booking, skills satisfied, engine coverage >= naive, lower hours std dev. Use a small fixture of 12 volunteers and 8 shifts. Show me the plan first.

**P2 (Dashboard)**
> Read CLAUDE.md, PRD.md section 4 R6 and types.ts. Build `/dashboard` using mock data from `src/lib/mock`: KPI strip with Framer Motion count-up, a custom SVG venue map where each zone rect is colored by `CoverageStatus` and red zones pulse, a zone x time heatmap, and a staffing suggestions list. Desktop-first, dark theme, shadcn components. Loading, empty and error states included.

**P3 (Ops)**
> Read CLAUDE.md, PRD.md R1, R3 (coordinator parts), R4, R5. Build `/setup` (zones + shifts CRUD with react-hook-form + zod), `/volunteers` (table with search + skill filter + register dialog), `/tasks` (dnd-kit kanban by zone), `/issues` (countdown ring + escalation), `/announcements` (audience all/zone/role with fan-out to notifications). Use `lib/db/queries.ts`; if missing, stub with mocks.

**P4 (Foundation + Volunteer)**
> Read CLAUDE.md and PRD.md. Write `src/lib/db/client.ts`, `queries.ts` (typed functions for every table), `useRealtime`, `clock.ts` (demo clock from events.clock_offset_minutes), and `src/lib/seed/seed.ts` following PRD section 8 (60 volunteers, 8 zones, 32 shifts, scarce First Aid/AV skills). Then build the `/login` persona picker and the mobile `/me` page with check-in/out and notifications toasts.

## 7. Integration checklist (run at T+1:45, T+3:15, T+4:00)
- [ ] `git pull` on main, `npm install`, `npm run build` passes
- [ ] `npm run seed` works, login as each persona
- [ ] Demo script (PRD section 10) works end to end on the deployed URL
- [ ] Phone (volunteer) and laptop (coordinator) stay in sync in realtime
- [ ] No console errors on any page

## 8. Emergency rules
- Stuck for more than 10 minutes: say it in the chat, pair up, or cut the feature.
- A feature is half-done at freeze: hide it behind the nav, don't ship it broken.
- Network dies at the demo: play the backup video, and narrate over it.
- Keep a `seed` of the demo state so you can reset to "clean demo" in 10 seconds.

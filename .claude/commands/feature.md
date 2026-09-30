---
description: Build one feature in thin slices following the project rules
argument-hint: <feature description>
---
Read CLAUDE.md and PRD.md first. Build this feature: $ARGUMENTS

Steps:
1. Tell me which files you will touch and confirm they are in my ownership area. Plan in max 5 bullets.
2. Implement in thin vertical slices (data -> component -> page). Use types from src/lib/types.ts and queries from src/lib/db/queries.ts (or mocks if missing).
3. Include loading, empty and error states.
4. Run `npx tsc --noEmit` and `npm run lint` and fix everything.
5. Summarize what changed and how to test it in the browser in 3 bullets.

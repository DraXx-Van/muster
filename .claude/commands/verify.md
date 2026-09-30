---
description: Check that the current work is shippable
---
Verify the current state of the project:
1. Run `npx tsc --noEmit`, `npm run lint`, and `npm test` if engine files changed. Fix any errors.
2. Run `npm run build` and fix any errors.
3. Check the pages I changed for: loading state, empty state, error state, console errors, mobile width (375px) for (vol) routes.
4. List any file you touched that is outside my ownership area (see CLAUDE.md).
5. Report pass/fail per item, briefly.

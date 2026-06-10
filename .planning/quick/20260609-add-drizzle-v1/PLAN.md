# PLAN: Add drizzle-orm and drizzle-kit v1.x

## Summary
Add `drizzle-orm` and `drizzle-kit` 1.0.0-rc.3 to `apps/web/package.json`. The codebase already imports from both packages but they are missing from dependencies.

## Steps
1. Add `drizzle-orm: "1.0.0-rc.3"` and `drizzle-kit: "1.0.0-rc.3"` to `apps/web/package.json` dependencies (drizzle-orm) and devDependencies (drizzle-kit)
2. Run `npm install` in `apps/web/`
3. Run `npx tsc --noEmit` to verify types
4. Write SUMMARY.md and update STATE.md

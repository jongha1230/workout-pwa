# AGENTS.md

## Project

- Next.js 16 App Router + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- Zustand + Zod
- App name: workout-pwa

## Language Policy

- Use English for agent instructions and code comments.
- Korean is allowed for user-facing copy and dev logs.
- Keep key terms consistent across README, DEVLOG, and code.

## Commands

- npm run dev
- npm run lint
- npm run typecheck
- npm run build

## Package Manager

- Use npm and keep package-lock.json in sync.

## Next App Router Rules

- Prefer Server Components by default; add 'use client' only when necessary.

## Definition Of Done

- npm run lint passes
- npm run typecheck passes
- npm run build passes
- Offline-first behavior is preserved

## Code Conventions

- Prefer small, readable components.
- Keep domain models and schemas in src/entities.
- Avoid any; use Zod for runtime validation at boundaries.
- Do not introduce new libraries without a short rationale.

## Architecture Notes

- Session editing uses draft state and commits to store on save.
- Treat local persistence as the source of truth.
- Add Supabase later as optional sync/backup, not a hard dependency.
- Do not block core workout logging UX on network availability.

## Git Hygiene

- Prefer focused commits with one concern per commit.
- Recommended prefixes: feat, fix, docs, chore, refactor, test.

## Commit Convention

Use Conventional Commits style:

- feat: new feature
- fix: bug fix
- refactor: internal change without behavior change
- chore: tooling/config updates
- docs: documentation updates
- ci: CI workflow updates

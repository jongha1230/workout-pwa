# AGENTS.md

## Project purpose

- Local-first workout tracking PWA focused on reliable session logging, offline recovery, and optional sync via an outbox.

## Important directories

- `src/app`: Next.js App Router pages and route handlers
- `src/components`: UI and page composition
- `src/entities`: domain models, schemas, repositories
- `src/lib`: Dexie DB, sync engine, shared utilities
- `src/store`: Zustand client state
- `tests`: Playwright-based sync tests and browser E2E flows
- `docs`: case study, architecture notes, sync lifecycle, evidence

## Setup command

- `npm ci`

## Dev command

- `npm run dev`

## Lint command

- `npm run lint`

## Typecheck command

- `npm run typecheck`

## Test command

- `npm run test`

## Build command

- `npm run build`

## E2E command

- `npm run test:e2e`

## Code style rules

- Preserve the local-first architecture; local persistence is the source of truth.
- Keep runtime validation in Zod at repository/input boundaries.
- Prefer small repository/store refactors over broad state-management rewrites.
- Keep Korean copy for user-facing UI unless a message is clearly wrong.
- Avoid new dependencies unless they materially improve reliability or testability.

## Testing expectations

- Add deterministic tests for retry policy, Dexie persistence, and cascade-delete sync semantics.
- Use Playwright unit-style specs for sync logic and browser E2E for key user journeys.
- Mock or stub external sync behavior; do not require real Supabase credentials in tests.

## Do-not rules

- Do not block workout logging on network availability.
- Do not modify real `.env` files or print environment variables.
- Do not replace IndexedDB/Dexie or Zustand without a clear reliability reason.
- Do not add server-side workout logging as a prerequisite for core flows.

## Definition of done

- Lint, typecheck, sync tests, and build pass.
- Non-retryable outbox failures do not retry forever.
- User-visible persistence failures are not silently swallowed.
- Docs explain the local-first architecture, sync lifecycle, and trade-offs honestly.

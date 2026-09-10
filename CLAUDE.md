# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                       # dev server on :3000
npm run build                     # next build (output: "standalone")
npm run lint                      # eslint
npm test                          # jest
npm run test:watch
npm run test:ci                   # --ci --coverage
npx jest path/to/file.test.ts     # single file
npx jest -t "test name substring" # single test by name
docker compose -f docker-compose.dev.yml up     # dev in a container, hot reload via bind mount
docker compose up --build                       # production image
```

`RAPIDAPI_KEY` is expected in `.env.local` (see `.env.local.example`) for any feature that calls the RapidAPI news endpoints — not currently wired into any route in this boilerplate state.

## Architecture

This is a Next.js (App Router) + React 19 + TypeScript (strict) + Tailwind v4 boilerplate, currently at the stock `create-next-app` starting point. Four top-level directories define the intended structure, each documented by its own README:

- [app/](app/) — routing and layout configuration only (pages, layouts, route handlers). Business logic should not live here.
- [components/](components/) — reusable design system / UI primitives, not feature-specific.
- [features/](features/) — business logic grouped by domain, meant to scale as feature areas are added.
- [hooks/](hooks/) — global custom React hooks shared across features.

`tsconfig.json` maps `@/*` to the repo root, and `jest.config.ts` mirrors that mapping for tests, so imports should use the `@/` alias rather than relative paths across these directories.

`next.config.ts` sets `output: "standalone"`, and the Dockerfile/docker-compose files build against that standalone output — keep them in sync if this setting changes.

## Testing

Jest is configured via `next/jest` (`jest.config.ts`) with `jest-environment-jsdom` as the default test environment and `@testing-library/jest-dom` matchers loaded in `jest.setup.ts`. Tests are matched under `__tests__/` or as `*.test.ts(x)` anywhere in the tree. A route handler or other server-only test needs a `@jest-environment node` docblock at the top of the file to override the default jsdom environment.

## Gotchas

Two ESLint configs have existed in this repo at different points: `eslint.config.mjs` (Next.js core-web-vitals + TypeScript config) is the one ESLint actually resolves. If an `eslint.config.mts` reappears, confirm it isn't a stray duplicate before editing it — verify with `npx eslint --debug <file>` and check which config file it reports loading.

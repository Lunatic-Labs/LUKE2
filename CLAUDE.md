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

`CAMERA_DIR` (optional) sets where `app/api/photos` saves camera-scene photos; it defaults to `data/camera-pics` relative to the working directory, which is gitignored and mounted as the `camera-pics` volume in `docker-compose.yml`. The camera needs a secure context (https or localhost) for `getUserMedia`.

## Architecture

This is a Next.js (App Router) + React 19 + TypeScript (strict) + Tailwind v4 app hosting **L.U.K.E.** (Lipscomb University Kiosk Experience), ported from the Processing/Java sketch at https://github.com/Lunatic-Labs/Kiosk (`src/luke_java/`). The shell architecture is ported; most individual scenes are registered placeholders awaiting implementation.

The kiosk is one full-screen route that swaps scenes client-side, mirroring the original single-window sketch — not a route per scene. `features/kiosk/KioskShell` is the `DisplayManager.pde` equivalent: it owns the carousel, the idle clock (a scene untouched for 30s advances; a session idle for 60s or one that wraps the whole carousel returns to the attract screen), and per-scene dwell logging.

To implement a scene, replace its component in `features/scenes/<name>/` and drop `placeholder: true` from its entry in `features/kiosk/registry.ts`. Doc comments in each file name the Processing source they came from.

Four top-level directories define the structure, each documented by its own README:

- [app/](app/) — routing and layout configuration only (pages, layouts, route handlers). Business logic should not live here.
- [components/](components/) — reusable design system / UI primitives, not feature-specific.
- [features/](features/) — business logic grouped by domain, meant to scale as feature areas are added.
- [hooks/](hooks/) — global custom React hooks shared across features.

`tsconfig.json` maps `@/*` to the repo root, and `jest.config.ts` mirrors that mapping for tests, so imports should use the `@/` alias rather than relative paths across these directories.

`next.config.ts` sets `output: "standalone"`, and the Dockerfile/docker-compose files build against that standalone output — keep them in sync if this setting changes.

## Testing

Jest is configured via `next/jest` (`jest.config.ts`) with `jest-environment-jsdom` as the default test environment and `@testing-library/jest-dom` matchers loaded in `jest.setup.ts`. Tests are matched under `__tests__/` or as `*.test.ts(x)` anywhere in the tree. A route handler or other server-only test needs a `@jest-environment node` docblock at the top of the file to override the default jsdom environment.

## Gotchas

`react-hooks/refs` is enforced as an error: writing `ref.current` during render fails `npm run lint`. The "latest value" ref pattern must sync inside a `useEffect` — see `hooks/useIdleTimer.ts`.

Two ESLint configs have existed in this repo at different points: `eslint.config.mjs` (Next.js core-web-vitals + TypeScript config) is the one ESLint actually resolves. If an `eslint.config.mts` reappears, confirm it isn't a stray duplicate before editing it — verify with `npx eslint --debug <file>` and check which config file it reports loading.

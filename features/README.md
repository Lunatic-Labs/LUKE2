# Scalable business logic grouped by domain

## `kiosk/`

The shell, ported from the L.U.K.E. Processing sketch's `DisplayManager.pde`:

- `types.ts` — the `Scene` contract (`Scene.pde`), split into a `SceneDefinition`
  the carousel reads and a `SceneComponent` that renders.
- `registry.ts` — carousel registration in upstream's order (`BuildDisplay()`).
- `options.ts` — configuration and the `key=value` parser for `options.txt`.
- `session-log.ts` — per-scene dwell tracking behind a swappable sink
  (`WriteLog()` / `WriteError()`).
- `components/KioskShell.tsx` — carousel state, idle clock, session logging.
- `components/SceneErrorBoundary.tsx` — one broken scene returns to idle rather
  than crashing the kiosk.

## `scenes/`

One folder per screen. `idle/`, `map/` and `camera/` are built; the rest are registered
placeholders that render `<ScenePlaceholder />` and name the Processing source
they should be ported from.

`camera/photo-store.ts` is server-only (it writes to disk for `app/api/photos`);
keep it out of the `camera/index.ts` barrel so client bundles never pull it in.

To implement a scene, replace its component body and drop `placeholder: true`
from its entry in `features/kiosk/registry.ts`.

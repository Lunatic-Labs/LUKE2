# Main menu (temporary change notes)

> Temporary: this file describes the uncommitted main-menu change on branch `L20-17`. Delete it, or fold it into the PR description, before merging.

## What changed

Tapping the welcome (idle) screen now opens a **main menu** instead of dropping the visitor onto the first carousel scene (Video). The menu lists every page with the same pill buttons and order as the header's drop-down `NavMenu`. Picking a page enters the carousel at that page.

Rules the menu follows:

| Rule | How it's enforced |
| --- | --- |
| Shown only after the welcome screen | `beginSession()` in `KioskShell` sets `onMainMenu`; nothing else sets it back to true. |
| No link to itself or to the welcome screen | Its buttons come from `MENU_ITEMS`, which lists carousel scenes only. |
| The navbar can't navigate to it | `main-menu` isn't in `MENU_ITEMS`. The header's chevron is also hidden while the menu is on screen. |
| The carousel never cycles to it | It's held outside `SCENES` (like `IDLE_SCENE`), so the arrows and auto-advance can't reach it. |
| Bottom bar disabled | `BottomBar` gets `disabled`, which greys out both arrows and makes them unclickable. |
| Idle behaviour | The menu never auto-advances after `sceneIdleSeconds` (30s). After `sessionIdleSeconds` (60s) untouched, the session ends and the welcome screen returns. |
| Session log | Time spent on the menu is recorded under the id `main-menu`. |

## Files

### New

- `features/scenes/main-menu/MainMenuScene.tsx`: the menu screen. The heading ("Where to?") is a placeholder.
- `features/scenes/main-menu/index.ts`: barrel export.
- `features/kiosk/menu-items.ts`: `MENU_ITEMS`, moved here from `registry.ts`. The menu scene needs it, and importing it from `registry.ts` would be circular because the registry imports the scene. Both menus read this one list.
- `features/scenes/main-menu/README.md`: this file.

### Modified

- `features/kiosk/registry.ts`: adds `MAIN_MENU_SCENE` beside `IDLE_SCENE` and re-exports `MENU_ITEMS` from `menu-items.ts`, so existing imports still work.
- `features/kiosk/index.ts`: exports `MAIN_MENU_SCENE`.
- `features/kiosk/types.ts`: `SceneHandle` gains `goToScene(sceneId)`, so any scene can jump to a carousel page.
- `features/kiosk/components/KioskShell.tsx`:
  - new `onMainMenu` state, mirrored into a ref for the idle timer
  - `beginSession` turns `onMainMenu` on; `goToScene` and `endSession` turn it off
  - the idle tick skips auto-advance while on the menu
  - the scene on screen is chosen as idle → main menu → carousel
  - the header chevron, `NavMenu` and the bottom bar arrows only work when `inCarousel` is true
  - `goToScene` is passed to scenes through the handle
- `components/BottomBar.tsx`: new optional `disabled` prop, styled with `disabled:opacity-40`.

### Tests

- `features/kiosk/components/KioskShell.test.tsx`: existing tests start sessions through a new `startSession()` helper, which taps the welcome screen and then picks "Video" from the menu. New tests cover:
  - a tap on the welcome screen opens the main menu
  - on the menu, the bottom bar is disabled and the header chevron is hidden
  - picking a page enters the carousel at that page
  - the menu doesn't auto-advance after 30s
  - the menu returns to the welcome screen after 60s untouched
  - wrapping the carousel skips the menu
- `features/scenes/camera/CameraScene.test.tsx` and `features/scenes/gallery/GalleryScene.test.tsx`: their mock `SceneHandle` gains `goToScene: jest.fn()`.

## Verification

- `npx tsc --noEmit`: clean.
- `npm run lint`: clean. One warning already on main, in `FeedbackScene.tsx`.
- Jest: 69/69 tests pass.

`npm test` itself fails on this branch, before and after this change: Jest needs `ts-node` to read `jest.config.ts`, and `ts-node` isn't in `package.json`. The tests were run through a JavaScript copy of the same config instead. `npm i -D ts-node` should fix it.

Not yet checked by hand in a browser.

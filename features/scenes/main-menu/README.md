# Main menu (temporary change notes)

> Temporary: this file describes the main-menu change on branch `L20-17`, first committed as `566bedd`. Delete it, or fold it into the PR description, before merging.

## What changed

Tapping the welcome (idle) screen now opens a **main menu** instead of dropping the visitor onto the first carousel scene (Video). Following the main menu mockup, it shows every page as a 2-column × 4-row grid of rounded buttons over the welcome screen's campus backdrop. The order matches the header's drop-down `NavMenu`: Faculty, Video, Map, Camera, Gallery, Drawing, Quizzes, Feedback. Picking a page enters the carousel at that page. The mockup's icons aren't added yet, so every button has a text label.

Rules the menu follows:

| Rule | How it's enforced |
| --- | --- |
| Shown only after the welcome screen | `beginSession()` in `KioskShell` sets `onMainMenu`; nothing else sets it back to true. |
| No link to itself or to the welcome screen | Its buttons come from `MENU_ITEMS`, which lists carousel scenes only. |
| The navbar can't navigate to it | `main-menu` isn't in `MENU_ITEMS`. The header's menu button is also hidden while the menu is on screen. |
| The carousel never cycles to it | It's held outside `SCENES` (like `IDLE_SCENE`), so the arrows and auto-advance can't reach it. |
| No arrows on the bottom bar | The shell renders the plain purple strip used by the welcome screen instead of `BottomBar`, so there are no arrows on screen. |
| No accidental taps | Its buttons ignore taps for `MENU_INPUT_DELAY_MS` (0.5s) after it appears, so a quick double-tap on the welcome screen can't land on a page. They look the same during the delay. |
| Idle behaviour | The menu never auto-advances after `sceneIdleSeconds` (30s). After `sessionIdleSeconds` (60s) untouched, the session ends and the welcome screen returns. |
| Session log | Time spent on the menu is recorded under the id `main-menu`. |

## Files

### New

- `features/scenes/main-menu/MainMenuScene.tsx`: the menu screen. Labels come from `MENU_ITEMS`, so the navbar and main menu always match.
- `components/CampusBackdrop.tsx`: the tinted campus photo and skyline, moved out of `IdleScene` so the main menu can share it.
- `features/scenes/main-menu/index.ts`: barrel export.
- `features/kiosk/menu-items.ts`: `MENU_ITEMS`, moved here from `registry.ts`. The menu scene needs it, and importing it from `registry.ts` would be circular because the registry imports the scene. Both menus read this one list. The camera page's label changed from "Selfie" to "Camera" here, so both menus say "Camera".
- `features/scenes/main-menu/README.md`: this file.

### Modified

- `features/scenes/idle/IdleScene.tsx`: renders `CampusBackdrop` in place of its inline copy. It looks the same as before.
- `components/README.md`: lists `CampusBackdrop`.
- `CSS.md`: navbar notes updated for the "Camera" label and the move of `MENU_ITEMS` into `menu-items.ts`.
- `components/NavMenu.tsx` and `app/globals.css`: the header drop-down's panel is now off-white (new `--luke-off-white` token, `#faf9fc`). Its buttons got an explicit lavender fill so they stay lavender, and a drop shadow (`0 4px 4px`, black at 25%). The panel now stays mounted and animates open and closed by growing and shrinking its height, so its bottom edge and rounded corner stay visible throughout. Its buttons slide in from the left in a wave that keeps pace with the panel, and ignore taps until the opening animation finishes (`NAV_MENU_ANIMATION_MS`, 400ms); the shell tests check its `data-state` instead of whether it exists.
- `features/kiosk/registry.ts`: adds `MAIN_MENU_SCENE` beside `IDLE_SCENE` and re-exports `MENU_ITEMS` from `menu-items.ts`, so existing imports still work.
- `features/kiosk/index.ts`: exports `MAIN_MENU_SCENE`.
- `features/kiosk/types.ts`: `SceneHandle` gains `goToScene(sceneId)`, so any scene can jump to a carousel page.
- `features/kiosk/components/KioskShell.tsx`:
  - new `onMainMenu` state, mirrored into a ref for the idle timer
  - `beginSession` turns `onMainMenu` on; `goToScene` and `endSession` turn it off
  - the idle tick skips auto-advance while on the menu
  - the scene on screen is chosen as idle → main menu → carousel
  - the header's menu button, `NavMenu` and `BottomBar` only appear when `inCarousel` is true; otherwise the bottom is a plain purple strip
  - `goToScene` is passed to scenes through the handle

### Tests

- `features/kiosk/components/KioskShell.test.tsx`: existing tests start sessions through a new `startSession()` helper, which taps the welcome screen, waits out the menu's input delay (`openMainMenu()`), and then picks "Video" from the menu. New tests cover:
  - a tap on the welcome screen opens the main menu
  - on the menu, there are no bottom bar arrows and the header's menu button is hidden
  - taps on the menu are ignored until its 0.5s input delay has passed
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

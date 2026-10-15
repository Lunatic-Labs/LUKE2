# UI Restyle: Changes and Rationale

This restyle brings the kiosk in line with the design mockup: a purple branded header, a lavender content area with the Nashville skyline along the bottom, rounded lavender navigation buttons, and a photo-backed welcome screen.

## Palette

| Token              | Value     | Used for                                          |
| ------------------ | --------- | ------------------------------------------------- |
| `--luke-purple`    | `#302052` | Header, bottom bar, skyline, text on lavender      |
| `--luke-lavender`  | `#C9C3D5` | Content background, navigation buttons             |
| `--luke-lilac`     | `#8F7EB3` | Header title and menu button, welcome-screen tint  |
| `--luke-gold`      | `#F4AA00` | Unchanged; the shield and map highlights use it   |

The welcome screen's gradients also use `#3E364D`, a dark purple-grey. It appears only in that one gradient, so it is written inline rather than added as a token.

---

## Modified files

### `app/globals.css`

- **Changed** `--luke-purple` from `#331e54` to `#302052` to match the mockup.
- **Added** `--luke-lavender` and `--luke-lilac`.
- **Kept** `--luke-gold`, which `MapScene` still uses.

**Why:** all colors live in one place, so components can use `var(--luke-*)` and a palette change touches only this file. `MapScene` and `ScenePlaceholder` use the purple variable, so they pick up the new shade with no edits.

### `features/kiosk/options.ts`

- **Changed** `BOTTOM_BAR_HEIGHT_RATIO` from `1/9` to `1/6` of screen height. At 1080px tall the bar is now 180px instead of 120px.

**Why:** the navigation buttons were too small to hit comfortably. The buttons already filled most of the bar's height, so they could only grow by making the bar itself taller. The Processing build's `Options.pde` used 1/9; the doc comment records that this is a deliberate change from it. The trade-off is that the scene area is about 6% of the screen shorter.

### `components/BottomBar.tsx`

- **Bar:** stays purple. Layout is now `justify-between` with `px-[20%]`, so each button sits about 20% in from its edge, as in the mockup.
- **Buttons:** the gold-outlined arrow zones (each 1/5 of the bar) are now rounded lavender buttons (`rounded-[22%]`, `aspect-[4/3]`, `h-[85%]` of the bar height) with purple chevrons.
- **Chevrons:** thicker (`strokeWidth` 3 → 7) with rounded joins, to match the bold arrows in the design. They fill 75% of the button (`h-3/4 w-3/4`).
- **Pressed state:** `active:brightness-90` replaces `active:bg-white/10`. The white overlay was made for a purple button and barely shows on lavender.
- **Scene name:** now `sr-only` with `aria-live="polite"`.

**Why:** the mockup shows no scene name in the bar. Hiding it only visually means screen-reader users still hear the scene change, and the existing tests that check the nav contains the scene name still pass. Button sizes are percentages of the bar, and the bar height is derived from screen height (`bottomBarHeight()`), so the buttons scale with the kiosk's resolution.

### `features/kiosk/components/KioskShell.tsx`

- **Background:** the outer container is `bg-[var(--luke-lavender)]` instead of `bg-white`.
- **Header:** `<KioskHeader />` is rendered above `<main>`, with `showMenuToggle` set only while a session is active.
- **Skyline:** an image absolutely positioned at the bottom of `<main>`. It is decorative: `alt=""` and `pointer-events-none`.
- **Scene wrapper:** the scene is wrapped in a `relative h-full` div.
- **Welcome-screen bar:** when no session is active, a plain purple strip the same height as the bottom bar is rendered in its place. It has no buttons and is `aria-hidden`.
- **Menu state:** a `menuOpen` state and a `toggleMenu` callback, passed to the header as `menuOpen` and `onToggleMenu`.
- **Menu panel:** `<NavMenu>` is rendered inside `<main>`, after the scene wrapper, with `open={sessionActive && menuOpen}`. Its items come from `MENU_ITEMS`, and the scene on screen is passed as `currentId`.
- **Choosing from the menu:** a new `goToScene(sceneId)` resets the idle clock, jumps to that scene's carousel index and closes the menu.
- **Closing the menu:** `goNext` and `goPrevious` (the bottom bar's arrows, and a scene's `nextScene`/`previousScene`) close it, and so does `endSession`.

**Why:**
- The skyline sits at the bottom of `<main>`, directly above the bottom bar. Its flat base is the same purple as the bar, so the city appears to rise out of it.
- The wrapper is needed because a positioned element (the skyline) paints over non-positioned siblings. Without it, the skyline would cover scene content.
- `pointer-events-none` lets taps on the skyline reach the scene and the shell's idle-timer handler.
- The header is outside the `sessionActive` check, so the branding also shows on the welcome screen.
- The purple strip keeps the welcome screen's layout identical to the other pages, so nothing jumps when a session starts. It is a plain `div` rather than a `<nav>`, so tests that check the welcome screen has no navigation still hold.
- The shell owns the menu state, not the header, because the shell is what changes scenes and ends sessions, and both need to close the menu.
- The menu can't appear on the welcome screen, for two reasons: `endSession` resets `menuOpen`, and the panel only renders while `sessionActive` is true. The next visitor always starts with it shut.
- **Known behaviour:** the automatic advance after `sceneIdleSeconds` calls `goTo` directly rather than `goNext`, so it does not close the menu. If the menu is left open, the scene changes underneath it.

### `components/SceneFrame.tsx`

- **Removed** `bg-white`.

**Why:** every scene fills the shell. A white frame would have covered the lavender background and the skyline. Scenes that need their own background can still pass one in through `className`.

### `features/scenes/idle/IdleScene.tsx`

Rebuilt to match the welcome-screen mockup. From bottom to top, the layers are:

1. **Photo:** `lipscomb-entrance.png`, filling the scene with `object-cover`.
2. **Tint:** a top-to-bottom gradient, `#8F7EB3` at 87% to `#3E364D` at 100%, at 50% opacity. It washes the photo lilac and darkens it slightly at the bottom.
3. **Heading wash:** a top-to-bottom gradient, `#8F7EB3` at 23% to transparent at 39%, at 25% opacity. It adds lilac behind the heading so the text stays readable against the sky.
4. **Skyline:** its own copy of `nashville-skyline.png`, anchored to the bottom.
5. **Text:** "WELCOME!" (extra-bold, `clamp(2.5rem, 15vw, 7rem)`) and "tap to start" (bold, `clamp(1rem, 5vw, 2.25rem)`) in `--luke-purple`, centred near the top.

The old "Hi, I'm L.U.K.E.!" text and its floating animation are gone, since the mockup doesn't have them. Tapping anywhere still starts a session.

**Why:**
- The gradient colors and stop positions come from the Figma file. The direction and layer opacities weren't visible there, so top-to-bottom, 50% and 25% are estimates that match the mockup's colors. If the Figma values turn up, adjust the `opacity-50` and `opacity-25` classes.
- The shell draws its skyline underneath scenes, so the opaque photo would hide it. Drawing a second copy inside the scene puts it back on top.
- The `luke-float` keyframes in `globals.css` are no longer used by anything. They were left in place in case another scene wants the effect.

### `features/scenes/trivia/TriviaScene.tsx`

- **Background:** the scene's `SceneFrame` now has the trivia mockup's question-mark pattern: `bg-[url('/images/trivia-pattern.svg')]`, repeated, over a `#d9d9d9` grey fallback. `bg-[length:40%_auto]` sizes each tile to 40% of the scene's width. A tile holds two columns of marks, so there are always five columns across, matching the mockup at any screen width.
- **Start screen:** a new `StartScreen` component replaces the old shared `PromptScreen` on the opening screen, following the start-screen mockup:
  - **Heading:** "Think you got what it takes to ace this Lipscomb Trivia?", bold, centred and in `--luke-purple`, sized `clamp(1.25rem, 6.5vw, 3.25rem)`. It sits in the upper part of the scene (`pt-[clamp(2rem,10dvh,7rem)]`) rather than centred vertically, with `px-[12%]` so it wraps onto three lines as in the mockup.
  - **Button:** "Game on!" in a `rounded-full` purple pill, 60% of the scene's width, with bold gold text (`clamp(1.125rem, 5.5vw, 2.75rem)`). It brightens slightly while pressed (`active:brightness-125`), because darkening barely shows on dark purple.
- **Score bar:** hidden on the start screen. `ScoreBar` returns nothing until a round begins, so the score and timer appear only once "Game on!" is tapped.
- **Score card:** on question and result screens, the gold and white strips are replaced by a purple card from the quiz mockup, centred at the top: rounded corners (`clamp(0.75rem, 2dvh, 1.5rem)`), bold gold text (`clamp(0.875rem, 4vw, 2rem)`), "Score: N" above a clock icon and "N seconds" ("1 second" at one). The clock is an inline SVG sized `1em`, so it scales with the text. The end screen keeps the original strips.
- **Question:** bold, centred, `--luke-purple`, the same size as the start screen's heading.
- **Answers:** a 2×2 grid pushed to the lower part of the scene (`mt-auto`). Each answer is a lavender card (`--luke-lavender`) with a thick purple outline (`clamp(3px, 0.8vw, 6px)`), rounded corners, a minimum height of `clamp(4rem, 11dvh, 9rem)`, and purple text at normal weight (`clamp(1rem, 5vw, 2.5rem)`). They replace the original purple and gold checkerboard.
- **Chosen answer:** the tapped card turns a soft yellow, `#e7cb7d`, taken from the mockup, and the other three are disabled. It stays like that for 0.4 seconds (`SELECTION_HOLD_MS`) before the result screen.
- **Result screen:** a new `ResultScreen` replaces `PromptScreen`, which is gone. It follows the correct and incorrect answer mockups:
  - **Right answer:** "Nailed it!" in the shared heading style, then the "Next up" button, with the same large gap as the start screen (`clamp(2rem, 7dvh, 5rem)`).
  - **Wrong answer or timeout:** a larger "Oops!" or "Time's up!" (`clamp(1.75rem, 9vw, 4.5rem)`), with "Correct answer: …" under it in the shared heading style, and a smaller gap before the button (`clamp(0.75rem, 2.5dvh, 2rem)`), as in the mockup.
  - **Button:** "Next up" followed by a right-arrow icon (inline SVG sized `1em`), in the same purple pill as "Game on!".
  - The text block starts in the upper part of the scene (`pt-[clamp(2rem,7dvh,5rem)]`) rather than centred vertically.
- **Shared styles:** `PillButton` (the purple pill with gold text) and `HEADING_TEXT` (bold purple, `clamp(1.25rem, 6.5vw, 3.25rem)`) are shared by the start, question and result screens, so they stay the same everywhere.
- The end screen's own layout is unchanged. Its leaderboard rows now read `TAG score` (e.g. `TST 1135`), because scores are saved with a three-letter tag; see the trivia README.

**Why:**
- The background is opaque, so it also covers the shell's skyline on this page, as in the mockup.
- The chosen answer's yellow is softer than `--luke-gold`, as in the mockup, so purple text on it stays readable. Like the background grey, it's written inline because only this page uses it.
- Upstream jumped straight to the result screen on a tap, so a highlight would never have been seen. The short hold (0.4 seconds) makes it visible. The clock is paused during it and the answer is scored at the tap, so the hold doesn't cost the visitor any points.
- The grey is written inline rather than as a token, like the welcome screen's `#3E364D`, because only this page uses it.

### `features/kiosk/registry.ts`

- **Added** `MENU_ITEMS`: the menu's entries, top to bottom, as `{ sceneId, label }` pairs.

**Why:** the menu follows the mockup's order (Faculty, Video, Map, Selfie, Gallery, Drawing, Quizzes, Feedback), not carousel order, and uses shorter labels than the scene names. Keeping it next to `SCENES` means reordering or renaming a button is a one-line change in the same file that registers the scenes.

| Button   | Scene id    | Scene name           |
| -------- | ----------- | -------------------- |
| Faculty  | `directory` | L.U.K.E. Directory   |
| Video    | `video`     | Video Player         |
| Map      | `map`       | You Are Here         |
| Camera   | `camera`    | Take a Picture!      |
| Gallery  | `gallery`   | Browse the Gallery   |
| Drawing  | `board`     | Draw                 |
| Quizzes  | `trivia`    | Test Your Knowledge  |
| Feedback | `feedback`  | Leave Some Feedback? |

### `features/kiosk/components/KioskShell.test.tsx`

- Two assertions now look for "WELCOME!" instead of "Hi, I'm L.U.K.E.!".
- **Added** five menu tests:
  - the menu button opens and closes the menu, and flips `aria-expanded`;
  - choosing "Map" jumps to that scene and closes the menu;
  - the bottom bar's next and previous arrows close the menu;
  - the scene on screen is marked `aria-current="page"` in the menu;
  - the menu is closed when a new session starts after the previous one timed out.

### `features/kiosk/options.test.ts`

- The `bottomBarHeight` test now expects the 1/6 ratio: 107px at 640px tall, 180px at 1080px tall.

---

## New files

### `components/KioskHeader.tsx`

The purple branding bar at the top of the kiosk:

- **Shield:** the Lipscomb shield via `next/image` with `priority`, because it is above the fold on first paint. Height is `clamp(2.5rem, 8dvh, 6rem)`, so it scales with the screen without getting too small or too large.
- **Menu button:** a lilac three-line hamburger icon under the shield (`clamp(1.5625rem, 5dvh, 3.75rem)` wide). It sits in a strip with equal padding above and below that runs from the shield's bottom to the header's bottom (the header has top padding only), so the icon is centred exactly between the two. While the menu is open the icon turns cream (`--luke-cream`, `#f1e7cf`); it is lilac otherwise. It is a button that opens and closes `NavMenu`. It replaced a down-chevron that flipped while the menu was open; the hamburger stays the same open or closed, with no animation of its own. It carries `aria-expanded` and an "Open menu"/"Close menu" label. Its visibility is controlled by the `showMenuToggle` prop (default `true`), and the shell hides it on the welcome screen to match the mockup. It is hidden with `invisible` rather than removed, so it still takes up its space: the header stays the same height and the title stays in the same place on every screen.
- **Title:** "Lipscomb University Kiosk Experience" in lilac. Its size is `clamp(0.875rem, 4.3vw, 2rem)`, so it fits on one line at the kiosk's width. Bottom padding lines the title up with the shield rather than the shield-plus-menu-button group.

**Why a separate component:** it is layout chrome shared by every scene, like `BottomBar`, so it belongs in `components/` rather than in a feature.

### `components/NavMenu.tsx`

The drop-down scene menu, matching the navbar mockup: an off-white panel (`--luke-off-white`, `#faf9fc`) hanging from the top-left of the scene area, 48% of the width, with a purple border on its right and bottom edges and a rounded bottom-right corner. It sits above the scene (`z-20`).

- **State:** `KioskShell` owns `menuOpen`, passes the toggle to the header, and renders the panel only during a session. Ending a session closes it, so the next visitor starts with it shut.
- **Animation:** the panel stays mounted and grows down from the header when opened, and shrinks back up when closed (`grid-template-rows` 0fr ↔ 1fr, ease-out, off for reduced-motion users). Its height is what animates, so the purple bottom edge and rounded corner stay visible throughout while the buttons are uncovered behind them. At the same time the buttons slide in from the left edge of the screen in a wave, top first, each arriving as the panel's edge reaches it; closing runs the wave bottom first. The panel and the whole wave take `NAV_MENU_ANIMATION_MS` (400ms), each button 200ms of it, and the buttons ignore taps until the opening animation has finished. While closed it is `invisible`, `inert` and `aria-hidden`, so its buttons can't be tapped or focused.
- **Buttons:** one pill per page (`rounded-full`, lavender fill, 2px purple border, bold purple text, drop shadow `0 4px 4px` black at 25%), full panel width. Text size matches the header title (`clamp(0.875rem, 4.3vw, 2rem)`), and gaps and padding scale with screen height. The panel's height comes from its buttons.
- **Order and labels:** set by `MENU_ITEMS` in `features/kiosk/menu-items.ts` (re-exported from `registry.ts`), which follows the mockup's order rather than carousel order. The labels are short versions of the scene names, e.g. "Faculty" for the directory. The camera page was labelled "Selfie" in the navbar mockup and is now "Camera", to match the main menu. A test checks that the menu lists every scene exactly once.
- **Choosing a page:** jumps straight to that scene, resets the idle clock, and closes the menu. The bottom bar's arrows and the end of a session also close it; the automatic scene advance does not. The page on screen is marked with `aria-current="page"`; it has no visual highlight, since the mockup doesn't show one.
- **Generic component:** `NavMenu` takes a list of `{ id, label }` items and an `onSelect` callback and knows nothing about scenes, so it stays in `components/`.
- **Not a `<nav>`:** the bottom bar is the page's only `navigation` landmark, and the shell tests rely on that.

### `features/kiosk/registry.test.ts`

Checks that `MENU_ITEMS` lists every carousel scene exactly once, so adding or removing a scene without updating the menu fails the tests.

### `public/images/lipscomb-shield.png`

The shield logo, cropped to its visible bounds (372×438). The original had transparent padding that would have thrown off sizing and alignment.

### `public/images/nashville-skyline.png`

The skyline, cropped to 482×119. The source image has "NASHVILLE" cut out of its base as transparent letters, so the crop stops just above them. That leaves a solid purple base that blends into the bottom bar. The source is already exactly `#302052`, so it needed no recoloring.

**Known limitation:** at 482px wide it looks slightly jagged on large or high-DPI screens. An SVG version would fix that.

### `features/scenes/trivia/TriviaScene.test.tsx`

The trivia scene's component tests, run against a fixed round with fake timers. They check the start screen (heading and "Game on!", no score), that starting a round shows the score card and timer, that the timer counts down, that a tapped answer is highlighted and scored at the tap before its result appears, that the clock pauses during the highlight, and that only the first answer tapped counts.

### `public/images/trivia-pattern.svg`

One repeating tile of the trivia background, 114×57: a `#D9D9D9` grey square with two bold question marks in lavender-grey `#C4C0D6`, tilted 15°. The second mark sits half a row higher, so neighbouring columns are staggered when the tile repeats.

**Why an SVG rather than the mockup image:** the exported mockup image has a pink line down its left edge, and its edges don't line up, so it would show seams when tiled. A redrawn tile repeats seamlessly and stays sharp at any resolution. The marks use the system's bold Arial, because an SVG used as a CSS background can't load web fonts.

### `public/images/lipscomb-entrance.png`

The campus entrance photo used behind the welcome screen, at 768×432.

**Known limitation:** the kiosk is portrait, so `object-cover` crops the photo's sides heavily and scales it up. It will look soft on large screens; a taller, higher-resolution photo would fix that.

---

## Verification

- `npm run lint` and `tsc --noEmit`: clean.
- **Jest:** all 33 tests pass, including tests for opening, closing and choosing from the menu. They were run through an equivalent JS config, because `npm test` needs `ts-node` to read `jest.config.ts` and it isn't installed. That problem predates these changes; fix it with `npm i -D ts-node`.
- **Screenshots:** the original restyle was screenshotted at 395×688 (the mockup's size) and compared against the mockup. Since then, a manual check in the running app confirmed the buttons look right and the header chevron flips when the menu opens and closes. The welcome-screen redesign has not been visually checked yet.

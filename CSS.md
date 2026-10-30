# UI Restyle: Changes and Rationale

This restyle brings the kiosk in line with the design mockup: a purple branded header, a lavender content area with the Nashville skyline along the bottom, rounded lavender navigation buttons, and a photo-backed welcome screen.

## Palette

| Token              | Value     | Used for                                          |
| ------------------ | --------- | ------------------------------------------------- |
| `--luke-purple`    | `#302052` | Header, bottom bar, skyline, text on lavender      |
| `--luke-lavender`  | `#C9C3D5` | Content background, navigation buttons             |
| `--luke-lilac`     | `#8F7EB3` | Header title and menu button, welcome-screen tint  |
| `--luke-gold`      | `#F4AA00` | Unchanged; the shield and map highlights use it   |
| `--luke-grey`      | `#D9D9D9` | unused                                            |

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
- **Menu panel:** `<NavMenu>` is rendered inside `<main>`, after the scene wrapper, with `open={sessionActive && menuOpen}`, so it works on the main menu as well as on every carousel page. Its items are `NAV_MENU_ITEMS`: "Home" (the main menu) first, then `MENU_ITEMS`. The scene on screen is passed as `currentId`, so on the main menu "Home" is the marked item.
- **Choosing "Home":** goes back to the main menu through `goToMainMenu()`, which keeps the session going and closes the menu. Every other item goes through `goToScene()`.
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

### `components/SceneFrame.tsx`

- **Removed** `bg-white`.

**Why:** every scene fills the shell. A white frame would have covered the lavender background and the skyline. Scenes that need their own background can still pass one in through `className`.

### `features/scenes/idle/IdleScene.tsx`

Rebuilt to match the welcome-screen mockup. From bottom to top, the layers are:

1. **Photo:** `lipscomb-entrance.png`, filling the scene with `object-cover`.
2. **Tint:** a top-to-bottom gradient, `#8F7EB3` at 87% to `#3E364D` at 100%, at 50% opacity. It washes the photo lilac and darkens it slightly at the bottom.
3. **Heading wash:** a top-to-bottom gradient, `#8F7EB3` at 23% to transparent at 39%, at 25% opacity. It adds lilac behind the heading so the text stays readable against the sky.
4. **Skyline:** its own copy of `nashville-skyline-v2.png`, anchored to the bottom.
5. **Text:** "WELCOME!" (extra-bold, `clamp(2.5rem, 15vw, 7rem)`) and "tap to start" (bold, `clamp(1rem, 5vw, 2.25rem)`) in `--luke-purple`, centred near the top.

The old "Hi, I'm L.U.K.E.!" text and its floating animation are gone, since the mockup doesn't have them. Tapping anywhere still starts a session.

**Why:**
- The gradient colors and stop positions come from the Figma file. The direction and layer opacities weren't visible there, so top-to-bottom, 50% and 25% are estimates that match the mockup's colors. If the Figma values turn up, adjust the `opacity-50` and `opacity-25` classes.
- The shell draws its skyline underneath scenes, so the opaque photo would hide it. Drawing a second copy inside the scene puts it back on top.
- The `luke-float` keyframes in `globals.css` are no longer used by anything. They were left in place in case another scene wants the effect.

### `features/scenes/camera/CameraScene.tsx`

Restyled to match the camera mockup, and given two new controls from it: a filters button and a thumbnail of the last photo. The capture button is still the only way to take a picture, and the overlay text, countdown and thank-you line are as before. How the filters and thumbnail work is covered in `features/scenes/camera/README.md`.

- **Background:** the scene is `bg-[var(--luke-purple)]` instead of lavender, with `px-[2%] pt-[2%]` padding.
- **Preview:** a card with rounded corners on all four sides (`rounded-[clamp(0.5rem,1.5dvh,1.25rem)]`). The purple border and bottom-only rounding are gone, since the purple padding now frames it.
- **Capture button:** the colours are swapped. It is now a lavender ring around a lavender disc (`--luke-lavender`), with the purple background showing through the gap between them. Size, the press-to-shrink effect and the dimmed disabled state are unchanged.
- **Controls row:** the capture button now sits in the middle of a three-column grid (`grid-cols-3`, items centred), with two new controls either side, each `clamp(2.5rem, 12vw, 5.5rem)` across, a little smaller than the capture button:
  - **Filters button** (left): a solid lavender circle with a purple three-star sparkles icon (inline SVG, 60% of the button). It dims to 50% opacity while disabled, like the capture button, and darkens slightly while pressed (`active:brightness-90`), like the bottom bar's arrows. The chosen filter is applied to the preview as an inline `style={{ filter }}`, because the value comes from a list at runtime rather than a fixed class.
  - **Last-photo thumbnail** (right): until a photo is taken, a lilac circle (`--luke-lilac`) with a thin lavender ring (`border-[clamp(1.5px,0.5vw,3px)]`) and a purple head-and-shoulders outline icon (inline SVG, 60% of the circle). After that, the photo cropped to a circle (`rounded-full overflow-hidden`, `object-cover`) with no ring, as in the mockup. With a photo it is a button: it darkens slightly while pressed and dims to 50% while disabled, like the filters button.
- **Enlarged photo:** tapping the thumbnail opens the gallery scene's enlarged view, copied class for class: a full-screen `bg-black/60` button holding a `70vh × 70vw` (`max-w-2xl`) white box with an 8px gold border and rounded corners, the photo inside `object-contain`. A tap anywhere closes it. It adds `z-30`, so it also covers `NavMenu` (`z-20`) if that is open.

**Why:**
- In the mockup, the header, the scene and the bottom bar form one continuous purple surface, with the photo as the only light area. A purple scene background gives that look without changing the shell.
- The scene background is opaque, so it covers the shell's skyline on this page. That matches the mockup, which shows no skyline here.
- A lavender button reads clearly on purple and matches the lavender arrow buttons in the bottom bar right below it.
- The enlarged view matches the gallery's so the two pages behave the same. It is copied rather than shared because the gallery uses `next/image` and the thumbnail is a blob URL, which `next/image` can't load. If a third page needs it, it's worth moving into `components/`.
- Equal grid columns keep the capture button exactly centred, whether or not the thumbnail holds a photo, so nothing shifts when the first picture is taken.

### `features/scenes/trivia/TriviaScene.tsx`

- **Sizing (portrait and landscape):** every size on this page scales with the scene itself, not the viewport, so all buttons stay on screen in landscape as well as portrait:
  - The `SceneFrame` is a size container (`[container-type:size]`) and defines two units. `--u` is `min(1cqw, 0.817cqh)`: 1% of the scene's width, unless the scene is too short for that, in which case it follows the height instead. `--v` is `calc(var(--u)*16/9)`.
  - On the 360×640 kiosk screen (a 360×440 scene), `--u` equals `1vw` and `--v` equals `1dvh`, so the page looks exactly as designed. 0.817 is that scene's width-to-height ratio (360 / 440).
  - In landscape, the height limits `--u`, so the same layout is scaled down until it fits. All screens sit in a centred column `calc(var(--u)*100)` wide (the full width in portrait), so percentage widths like the pills' 60% keep their portrait proportions instead of stretching across a wide screen. The column scrolls only as a last resort, for example if a very long question wraps onto more lines than usual.
  - **Reading the sizes below:** they're listed as originally designed in `vw` and `dvh`. In the code, each `N vw` is written `calc(var(--u)*N)` and each `N dvh` is `calc(var(--v)*N)`, with the same upper limits, e.g. `clamp(1.25rem, 6.5vw, 3.25rem)` became `min(3.25rem, calc(var(--u)*6.5))`. The `rem` lower limits were dropped, since none applied at 360×640 and they stopped short landscape screens from fitting. Borders and the letter boxes' inner padding keep their small `px` minimums so they never vanish. `text-[…]` and `border-[…]` values carry a `length:` hint, because Tailwind can't tell a `var()` size from a colour.
  - Checked by screenshot at 360×640 and 768×1024 portrait, and at 1280×720, 1024×600 and 640×360 landscape: every button on every screen (start, initials, question, result, "Don't ghost the quiz!", end, leader board) is fully visible. Before, landscape cut off the lower buttons on most screens, and a 768×1024 tablet cut off the initials screen's "Back".
- **Background:** the scene's `SceneFrame` now has the trivia mockup's question-mark pattern: `bg-[url('/images/trivia-pattern.svg')]`, repeated, over a white fallback (`bg-white`). `bg-[length:40%_auto]` sizes each tile to 40% of the scene's width. A tile holds two columns of marks, so there are always five columns across, matching the mockup at any screen width. The page was first a `#d9d9d9` grey, as in the mockup; it is now white (`#ffffff`), the same shade as the Directory, Feedback and Video scenes (`bg-white`), so it matches the rest of the kiosk. The SVG tile changed with it, since its own square paints over the fallback.
- **Start screen:** a new `StartScreen` component replaces the old shared `PromptScreen` on the opening screen, following the start-screen mockup:
  - **Heading:** "Think you got what it takes to ace this Lipscomb Trivia?", bold, centred and in `--luke-purple`, sized `clamp(1.25rem, 6.5vw, 3.25rem)`. It sits in the upper part of the scene (`pt-[clamp(2rem,10dvh,7rem)]`) rather than centred vertically, with `px-[12%]` so it wraps onto three lines as in the mockup.
  - **Buttons:** "Let's go!" followed by a right-arrow icon (inline SVG sized `1em`), then "Score Board", stacked with even gaps (`clamp(0.75rem, 2.5dvh, 2rem)`) a large gap below the heading (`clamp(2rem, 7dvh, 5rem)`). Each is a `rounded-full` purple pill, 60% of the scene's width, with bold gold text (`clamp(1.125rem, 5.5vw, 2.75rem)`). They brighten slightly while pressed (`active:brightness-125`), because darkening barely shows on dark purple. "Let's go!" replaced the old "Game on!" here, which moved to the initials screen.
- **Initials screen:** new, from the initials mockup, between the start screen and the first question:
  - "Enter your initials" in the shared `HEADING_TEXT` style, near the top (`pt-[clamp(1.5rem,7dvh,5rem)]`).
  - Three letter boxes side by side (`gap-[clamp(0.5rem,3vw,1.5rem)]`). Each is a lavender card (`--luke-lavender`) with the answer cards' thick purple outline (`clamp(3px, 0.8vw, 6px)`), and inside it a thinner purple line (`clamp(1.5px, 0.4vw, 3px)`) set in by a small lavender gap, as in the mockup. The box is `clamp(3.25rem, 18vw, 8rem)` × `clamp(4rem, 22vw, 10rem)`, with the letter centred in purple at medium weight (`clamp(2rem, 11vw, 5.5rem)`).
  - Above and below each box, a gold triangle (`--luke-gold`) with a purple outline and rounded corners, drawn as an inline SVG `clamp(2.5rem, 13vw, 6rem)` wide. It darkens slightly while pressed (`active:brightness-90`), like the bottom bar's arrows, since darkening shows on gold.
  - "Game on!" and "Back" `PillButton`s stacked underneath.
- **Score bar:** hidden on the start and initials screens. `ScoreBar` returns nothing until a round begins, so the score and timer appear only once "Game on!" is tapped.
- **Score card:** on question and result screens, the gold and white strips are replaced by a purple card from the quiz mockup, centred at the top: rounded corners (`clamp(0.75rem, 2dvh, 1.5rem)`), bold gold text (`clamp(0.875rem, 4vw, 2rem)`), "Score: N" above a clock icon and "N seconds" ("1 second" at one). The clock is an inline SVG sized `1em`, so it scales with the text. Result screens and "Don't ghost the quiz!" show the card with the score alone, as in the result mockups, since nothing is timed there any more. It's hidden on the end screen, which shows the score in its text, and on the leader board screen.
- **Question:** bold, centred, `--luke-purple`, the same size as the start screen's heading.
- **Answers:** a 2×2 grid pushed to the lower part of the scene (`mt-auto`). Each answer is a lavender card (`--luke-lavender`) with a thick purple outline (`clamp(3px, 0.8vw, 6px)`), rounded corners, a minimum height of `clamp(4rem, 11dvh, 9rem)`, and purple text at normal weight (`clamp(1rem, 5vw, 2.5rem)`). They replace the original purple and gold checkerboard.
- **Pressed and chosen answer:** a card darkens slightly while pressed (`active:brightness-90`, with `transition-[filter]`), the same pressed effect as the bottom bar's arrows and the camera's buttons. The tapped card stays darkened (`brightness-90`) and the other three are disabled, for 0.4 seconds (`SELECTION_HOLD_MS`) before the result screen. This replaced an earlier soft yellow (`#e7cb7d`) highlight, so a tapped answer now looks like every other pressed button in the kiosk.
- **Result screen:** a new `ResultScreen` replaces `PromptScreen`, which is gone. It follows the correct and incorrect answer mockups:
  - **Right answer:** "Nailed it!" at the shared heading size, then the "Next up" button, with the same large gap as the start screen (`clamp(2rem, 7dvh, 5rem)`).
  - **Wrong answer or timeout:** a larger "Oops!" or "Time's up!" (`clamp(1.75rem, 9vw, 4.5rem)`), with "Correct answer: …" under it at the shared heading size, and a smaller gap before the button (`clamp(0.75rem, 2.5dvh, 2rem)`), as in the mockup.
  - **Button:** "Next up" followed by a right-arrow icon (inline SVG sized `1em`), in the same purple pill as "Let's go!".
  - The text block starts in the upper part of the scene (`pt-[clamp(2rem,7dvh,5rem)]`) rather than centred vertically.
- **"Don't ghost the quiz!" screen:** new, from the ghost mockup, shown when a result screen is left alone for 55 seconds:
  - The score card at the top, with the score only.
  - "Don't ghost the quiz!" in the shared `HEADING_TEXT` style, starting at the same height as the result screen's heading (`pt-[clamp(2rem,7dvh,5rem)]`).
  - A 👻 emoji under it (`clamp(2.5rem, 13vw, 6rem)`, `aria-hidden`), drawn by the system's emoji font, so it looks like the mockup's on Apple devices and slightly different elsewhere.
  - "Keep Going" followed by the right-arrow icon, and "I'm outta here!", as `PillButton`s stacked with even gaps (`clamp(0.75rem, 2.5dvh, 2rem)`).
- **Shared styles:** `PillButton` (the purple pill with gold text) is used for every button outside the answer grid: "Let's go!", "Score Board", "Game on!", "Next up", "Keep Going", "I'm outta here!", the end screen's three buttons and both "Back" buttons. `HEADING_TEXT` (bold purple, `clamp(1.25rem, 6.5vw, 3.25rem)`) is used by the start, initials, question, ghost, end and leader board headings. `ResultScreen` writes the same size out itself, because its "Oops!" heading needs a larger one.
- **End screen:** rebuilt from the end-screen mockup. The old gold and white strips, the `triviaHeader.jpg` banner and the on-screen leaderboard are gone. In their place, top to bottom:
  - "Thank you for playing!" in the shared `HEADING_TEXT` style, near the top (`pt-[clamp(1.5rem,5dvh,4rem)]`).
  - "🦬 That's a wrap, Bison!" and "Your score was: N", centred, bold and purple, a step smaller than the heading (`clamp(1rem, 4.75vw, 2.5rem)`). The bison emoji is `aria-hidden`, so screen readers skip it.
  - Three `PillButton`s stacked down the middle with even gaps (`clamp(0.75rem, 2.5dvh, 2rem)`): "Play again?", "Leader Board" and "Exit". All three look the same.
- **Leader board screen:** new, from the leader board mockups, opened from the start screen's "Score Board" and the end screen's "Leader Board":
  - "Leader Board" at the top, larger and heavier than the shared heading, as in the mockup: `font-black` at `min(11vw, 5rem)`.
  - A box 65% of the scene's width and `min(40dvh, 28rem)` tall, with the answer cards' look: lavender fill (`--luke-lavender`), a thick purple outline (`clamp(3px, 0.8vw, 6px)`) and rounded corners. The scores are listed in it, centred, in extra-bold purple (`font-extrabold`) at `min(6vw, 3rem)`, one per line as `TAG - score`. The loading, empty and error messages use 60% of that size.
  - **Top three:** gold (`--luke-gold`), silver (`#b4b3bd`) and bronze (`#b0773a`) lettering with a purple outline (`-webkit-text-stroke: 0.12em`, with `paint-order: stroke fill` so the outline sits behind the letters instead of thinning them, like the camera's overlay text). The silver and bronze are written inline, like the other one-off colours on this page.
  - **Purple bar:** under the top three, when there are more than three scores, a solid purple line runs across the whole box (`clamp(3px, 0.9vw, 7px)` thick, `bg-[var(--luke-purple)]`). The box has no side padding, so the line reaches both edges. It replaced a dashed line, made to look like the mockup's row of dashes.
  - **Scrolling:** the box lists the top 50 (`LEADERBOARD_SIZE`) and scrolls (`overflow-y-auto`, `overscroll-contain` so a swipe at the end doesn't move the page). The scrollbar is hidden (`[scrollbar-width:none]` for Firefox and current Chrome, `[&::-webkit-scrollbar]:hidden` for older Chrome and Safari); the box still scrolls by swipe, mouse wheel or keyboard, and the cut-off row at the bottom shows there is more. About eight rows show at once on the 360×640 screen.
  - A "Back" `PillButton` pushed to the bottom of the scene (`mt-auto`), as in the mockup.
  - The box has a fixed height, so it doesn't jump when the scores arrive. It went from 45dvh to 40dvh to make room for the bigger heading, keeping "Back" on screen.

**Why:**
- The background is opaque, so it also covers the shell's skyline on this page, as in the mockup.
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
- **Menu button:** a lilac three-line hamburger icon under the shield (`clamp(1.5625rem, 5dvh, 3.75rem)` wide). It sits in a strip with equal padding above and below that runs from the shield's bottom to the header's bottom (the header has top padding only), so the icon is centred exactly between the two. While the menu is open the icon turns cream (`--luke-cream`, `#f1e7cf`); it is lilac otherwise. It is a button that opens and closes `NavMenu`. It replaced a down-chevron that flipped while the menu was open; the hamburger stays the same open or closed, with no animation of its own. It carries `aria-expanded` and an "Open menu"/"Close menu" label. Its visibility is controlled by the `showMenuToggle` prop (default `true`). The shell shows it whenever a session is active, including on the main menu, and hides it on the welcome screen to match the mockup. It is hidden with `invisible` rather than removed, so it still takes up its space: the header stays the same height and the title stays in the same place on every screen.
- **Title:** "Lipscomb University Kiosk Experience" in lilac. Its size is `clamp(0.875rem, 4.3vw, 2rem)`, so it fits on one line at the kiosk's width. Bottom padding lines the title up with the shield rather than the shield-plus-menu-button group.

**Why a separate component:** it is layout chrome shared by every scene, like `BottomBar`, so it belongs in `components/` rather than in a feature.

### `components/NavMenu.tsx`

The drop-down scene menu, matching the navbar mockup: an off-white panel (`--luke-off-white`, `#faf9fc`) hanging from the top-left of the scene area, 48% of the width, with a purple border on its right and bottom edges and a rounded bottom-right corner. It sits above the scene (`z-20`).

- **State:** `KioskShell` owns `menuOpen`, passes the toggle to the header, and renders the panel only during a session. Ending a session closes it, so the next visitor starts with it shut.
- **Animation:** the panel stays mounted and grows down from the header when opened, and shrinks back up when closed (`grid-template-rows` 0fr ↔ 1fr, ease-out, off for reduced-motion users). Its height is what animates, so the purple bottom edge and rounded corner stay visible throughout while the buttons are uncovered behind them. At the same time the buttons slide in from the left edge of the screen in a wave, top first, each arriving as the panel's edge reaches it; closing runs the wave bottom first. The panel and the whole wave take `NAV_MENU_ANIMATION_MS` (400ms), each button 200ms of it, and the buttons ignore taps until the opening animation has finished. While closed it is `invisible`, `inert` and `aria-hidden`, so its buttons can't be tapped or focused.
- **Buttons:** one pill per page (`rounded-full`, lavender fill, 2px purple border, bold purple text, drop shadow `0 4px 4px` black at 25%), full panel width. Text size matches the header title (`clamp(0.875rem, 4.3vw, 2rem)`), and gaps and padding scale with screen height. The panel's height comes from its buttons.
- **Home:** the first button, "Home", returns to the main menu. It's added by the shell (`NAV_MENU_ITEMS` in `KioskShell.tsx`), not to `MENU_ITEMS`, because the main menu draws its grid from `MENU_ITEMS` and shouldn't show a button for itself. With nine buttons, the panel is one button taller.
- **Order and labels:** below "Home", set by `MENU_ITEMS` in `features/kiosk/menu-items.ts` (re-exported from `registry.ts`), which follows the mockup's order rather than carousel order. The labels are short versions of the scene names, e.g. "Faculty" for the directory. The camera page was labelled "Selfie" in the navbar mockup and is now "Camera", to match the main menu. A test checks that the menu lists every scene exactly once.
- **Choosing a page:** jumps straight to that scene, resets the idle clock, and closes the menu. The bottom bar's arrows and the end of a session also close it. The page on screen is marked with `aria-current="page"`; it has no visual highlight, since the mockup doesn't show one.
- **Generic component:** `NavMenu` takes a list of `{ id, label }` items and an `onSelect` callback and knows nothing about scenes, so it stays in `components/`.
- **Not a `<nav>`:** the bottom bar is the page's only `navigation` landmark, and the shell tests rely on that.

### `features/kiosk/registry.test.ts`

Checks that `MENU_ITEMS` lists every carousel scene exactly once, so adding or removing a scene without updating the menu fails the tests.

### `public/images/lipscomb-shield.png`

The shield logo, cropped to its visible bounds (372×438). The original had transparent padding that would have thrown off sizing and alignment.

### `public/images/nashville-skyline-v2.png`

The skyline, 2142×495, with a short solid purple base that blends into the bottom bar, as in the welcome screen mockup. No "NASHVILLE" text shows.

It replaced `nashville-skyline.png`, an earlier 482×119 skyline that looked slightly jagged on large or high-DPI screens. The new source was cleaned up before being added:

- **Recoloured** to exactly `#302052`. The source's purple was close but varied slightly from pixel to pixel (around `#2e194a`–`#301a4f`), which would have left a visible line against the bottom bar.
- **Solid fill:** the source's fill was about 99% opaque (alpha 253–254), so pixels at alpha 240 or above were made fully opaque. The softened edges of the buildings were kept.
- **Letters filled:** the source has "NASHVILLE" cut out of its base as transparent letters. Every transparent pixel that can't be reached from the image's edges is a hole inside the base, i.e. a letter, so those were made solid purple, soft edges included, so no faint outline is left.
- **Cropped** to the outline, removing the source's transparent padding, so the base runs edge to edge.
- **Base shortened (moved down):** only 24px of solid base is kept below the lowest rooftops (the source had 158px), which drops the buildings about 22px lower on the 360px-wide kiosk screen, to match the mockup. This also removes the rows the letters were in.

**Why a new file name:** Next.js 16 caches its resized copies of an image for 4 hours (`images.minimumCacheTTL`), and browsers cache them too. Overwriting `nashville-skyline.png` in place kept serving the old version with the letters. A new name gets a fresh cache entry. If this image is changed again, give it a new name too (or clear `.next/cache/images` and the browser cache).

Both places that draw it (`KioskShell` and `CampusBackdrop`) give `next/image` its size and `sizes="100vw"`, so the browser downloads a copy sized to the screen instead of the full 2142px file.

### `features/scenes/trivia/TriviaScene.test.tsx`

The trivia scene's component tests, run against a fixed round with fake timers. They check the start screen (heading, "Let's go!" and "Score Board", no score), the initials screen (starts at `AAA`, the arrows step and wrap, Back returns to the start, the chosen initials are saved), that result screens show no timer and ask "Don't ghost the quiz!" when left alone, whose buttons and own timeout work, that "Score Board" opens the leader board and its Back returns to the start, that starting a round shows the score card and timer, that the timer counts down, that a tapped answer is highlighted and scored at the tap before its result appears, that the clock pauses during the highlight, and that only the first answer tapped counts.

### `public/images/trivia-pattern.svg`

One repeating tile of the trivia background, 114×57: a white `#FFFFFF` square (originally the mockup's `#D9D9D9` grey, changed to match the other scenes' `bg-white`) with two bold question marks in lavender-grey `#C4C0D6`, tilted 15°. The second mark sits half a row higher, so neighbouring columns are staggered when the tile repeats.

**Why an SVG rather than the mockup image:** the exported mockup image has a pink line down its left edge, and its edges don't line up, so it would show seams when tiled. A redrawn tile repeats seamlessly and stays sharp at any resolution. The marks use the system's bold Arial, because an SVG used as a CSS background can't load web fonts.

### `public/images/lipscomb-entrance.png`

The campus entrance photo used behind the welcome screen, at 768×432.

**Known limitation:** the kiosk is portrait, so `object-cover` crops the photo's sides heavily and scales it up. It will look soft on large screens; a taller, higher-resolution photo would fix that.

---

## Verification

- `npm run lint` and `tsc --noEmit`: clean.
- **Jest:** all 33 tests pass, including tests for opening, closing and choosing from the menu. They were run through an equivalent JS config, because `npm test` needs `ts-node` to read `jest.config.ts` and it isn't installed. That problem predates these changes; fix it with `npm i -D ts-node`.
- **Screenshots:** the original restyle was screenshotted at 395×688 (the mockup's size) and compared against the mockup. Since then, a manual check in the running app confirmed the buttons look right and the header chevron flips when the menu opens and closes. The welcome-screen redesign has not been visually checked yet.

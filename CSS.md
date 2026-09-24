# UI Restyle: Changes and Rationale

This restyle brings the kiosk in line with the design mockup: a purple branded header, a lavender content area with the Nashville skyline along the bottom, and rounded lavender navigation buttons.

## Palette

| Token              | Value     | Used for                                          |
| ------------------ | --------- | ------------------------------------------------- |
| `--luke-purple`    | `#302052` | Header, bottom bar, skyline, text on lavender      |
| `--luke-lavender`  | `#C9C3D5` | Content background, navigation buttons             |
| `--luke-lilac`     | `#8F7EB3` | Header title and chevron                           |
| `--luke-gold`      | `#F4AA00` | Unchanged; the shield and map highlights use it   |

---

## Modified files

### `app/globals.css`

- **Changed** `--luke-purple` from `#331e54` to `#302052` to match the mockup.
- **Added** `--luke-lavender` and `--luke-lilac`.
- **Kept** `--luke-gold`, which `MapScene` still uses.

**Why:** all colors live in one place, so components can use `var(--luke-*)` and a palette change touches only this file. `MapScene` and `ScenePlaceholder` use the purple variable, so they pick up the new shade with no edits.

### `components/BottomBar.tsx`

- **Bar:** stays purple. Layout is now `justify-between` with `px-[20%]`, so each button sits about 20% in from its edge, as in the mockup.
- **Buttons:** the gold-outlined arrow zones (each 1/5 of the bar) are now rounded lavender buttons (`rounded-[22%]`, `aspect-[4/3]`, `h-[72%]` of the bar height) with purple chevrons.
- **Chevrons:** thicker (`strokeWidth` 3 → 7) with rounded joins, to match the bold arrows in the design.
- **Pressed state:** `active:brightness-90` replaces `active:bg-white/10`. The white overlay was made for a purple button and barely shows on lavender.
- **Scene name:** now `sr-only` with `aria-live="polite"`.

**Why:** the mockup shows no scene name in the bar. Hiding it only visually means screen-reader users still hear the scene change, and the existing tests that check the nav contains the scene name still pass. Button sizes are percentages of the bar, and the bar height is derived from screen height (`bottomBarHeight()`), so the buttons scale with the kiosk's resolution.

### `features/kiosk/components/KioskShell.tsx`

- **Background:** the outer container is `bg-[var(--luke-lavender)]` instead of `bg-white`.
- **Header:** `<KioskHeader />` is rendered above `<main>`.
- **Skyline:** an image absolutely positioned at the bottom of `<main>`. It is decorative: `alt=""` and `pointer-events-none`.
- **Scene wrapper:** the scene is wrapped in a `relative h-full` div.

**Why:**
- The skyline sits at the bottom of `<main>`, directly above the bottom bar. Its flat base is the same purple as the bar, so the city appears to rise out of it.
- The wrapper is needed because a positioned element (the skyline) paints over non-positioned siblings. Without it, the skyline would cover scene content.
- `pointer-events-none` lets taps on the skyline reach the scene and the shell's idle-timer handler.
- The header is outside the `sessionActive` check, so the branding also shows on the attract screen.

### `components/SceneFrame.tsx`

- **Removed** `bg-white`.

**Why:** every scene fills the shell. A white frame would have covered the lavender background and the skyline. Scenes that need their own background can still pass one in through `className`.

### `features/scenes/idle/IdleScene.tsx`

- **Removed** `bg-white`.

**Why:** same reason as `SceneFrame`. The attract screen now shows the shared lavender background and skyline.

---

## New files

### `components/KioskHeader.tsx`

The purple branding bar at the top of the kiosk:

- **Shield:** the Lipscomb shield via `next/image` with `priority`, because it is above the fold on first paint. Height is `clamp(2.5rem, 8dvh, 6rem)`, so it scales with the screen without getting too small or too large.
- **Chevron:** a lilac down-chevron under the shield. It is `aria-hidden` and does nothing for now; a comment marks it as the future menu toggle.
- **Title:** "Lipscomb University Kiosk Experience" in lilac. Its size is `clamp(0.875rem, 4.3vw, 2rem)`, so it fits on one line at the kiosk's width. Bottom padding lines it up with the shield rather than the shield-plus-chevron group.

**Why a separate component:** it is layout chrome shared by every scene, like `BottomBar`, so it belongs in `components/` rather than in a feature.

### `public/images/lipscomb-shield.png`

The shield logo, cropped to its visible bounds (372×438). The original had transparent padding that would have thrown off sizing and alignment.

### `public/images/nashville-skyline.png`

The skyline, cropped to 482×119. The source image has "NASHVILLE" cut out of its base as transparent letters, so the crop stops just above them. That leaves a solid purple base that blends into the bottom bar. The source is already exactly `#302052`, so it needed no recoloring.

**Known limitation:** at 482px wide it looks slightly jagged on large or high-DPI screens. An SVG version would fix that.

---

## Verification

- `npm run lint` and `tsc --noEmit`: clean.
- **Jest:** all 27 tests pass. They were run through an equivalent JS config because `npm test` needs `ts-node` to read `jest.config.ts`, and it isn't installed. That problem predates these changes; fix it with `npm i -D ts-node`.
- **Screenshots:** the attract screen and an active session were screenshotted at 395×688 (the mockup's size) and compared against the mockup.

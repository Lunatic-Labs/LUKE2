# UI Restyle: Changes and Rationale

This restyle brings the kiosk in line with the design mockup: a purple branded header, a lavender content area with the Nashville skyline along the bottom, rounded lavender navigation buttons, and a photo-backed welcome screen.

## Palette

| Token              | Value     | Used for                                          |
| ------------------ | --------- | ------------------------------------------------- |
| `--luke-purple`    | `#302052` | Header, bottom bar, skyline, text on lavender      |
| `--luke-lavender`  | `#C9C3D5` | Content background, navigation buttons             |
| `--luke-lilac`     | `#8F7EB3` | Header title and chevron, welcome-screen tint      |
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

**Why:**
- The skyline sits at the bottom of `<main>`, directly above the bottom bar. Its flat base is the same purple as the bar, so the city appears to rise out of it.
- The wrapper is needed because a positioned element (the skyline) paints over non-positioned siblings. Without it, the skyline would cover scene content.
- `pointer-events-none` lets taps on the skyline reach the scene and the shell's idle-timer handler.
- The header is outside the `sessionActive` check, so the branding also shows on the welcome screen.
- The purple strip keeps the welcome screen's layout identical to the other pages, so nothing jumps when a session starts. It is a plain `div` rather than a `<nav>`, so tests that check the welcome screen has no navigation still hold.

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

### `features/kiosk/components/KioskShell.test.tsx`

- Two assertions now look for "WELCOME!" instead of "Hi, I'm L.U.K.E.!".

### `features/kiosk/options.test.ts`

- The `bottomBarHeight` test now expects the 1/6 ratio: 107px at 640px tall, 180px at 1080px tall.

---

## New files

### `components/KioskHeader.tsx`

The purple branding bar at the top of the kiosk:

- **Shield:** the Lipscomb shield via `next/image` with `priority`, because it is above the fold on first paint. Height is `clamp(2.5rem, 8dvh, 6rem)`, so it scales with the screen without getting too small or too large.
- **Chevron:** a lilac down-chevron under the shield. It is `aria-hidden` and does nothing for now; a comment marks it as the future menu toggle. It is controlled by the `showMenuToggle` prop (default `true`), and the shell hides it on the welcome screen to match the mockup.
- **Title:** "Lipscomb University Kiosk Experience" in lilac. Its size is `clamp(0.875rem, 4.3vw, 2rem)`, so it fits on one line at the kiosk's width. When the chevron shows, bottom padding lines the title up with the shield rather than the shield-plus-chevron group. Without the chevron the padding is dropped, so the title centres beside the shield.

**Why a separate component:** it is layout chrome shared by every scene, like `BottomBar`, so it belongs in `components/` rather than in a feature.

### `public/images/lipscomb-shield.png`

The shield logo, cropped to its visible bounds (372×438). The original had transparent padding that would have thrown off sizing and alignment.

### `public/images/nashville-skyline.png`

The skyline, cropped to 482×119. The source image has "NASHVILLE" cut out of its base as transparent letters, so the crop stops just above them. That leaves a solid purple base that blends into the bottom bar. The source is already exactly `#302052`, so it needed no recoloring.

**Known limitation:** at 482px wide it looks slightly jagged on large or high-DPI screens. An SVG version would fix that.

### `public/images/lipscomb-entrance.png`

The campus entrance photo used behind the welcome screen, at 768×432.

**Known limitation:** the kiosk is portrait, so `object-cover` crops the photo's sides heavily and scales it up. It will look soft on large screens; a taller, higher-resolution photo would fix that.

---

## Verification

- `npm run lint` and `tsc --noEmit`: clean.
- **Jest:** the original restyle's 27 tests passed through an equivalent JS config, because `npm test` needs `ts-node` to read `jest.config.ts` and it isn't installed. The tests have not been re-run since the bar height and welcome-screen changes. That problem predates these changes; fix it with `npm i -D ts-node`.
- **Screenshots:** the original restyle was screenshotted at 395×688 (the mockup's size) and compared against the mockup. The welcome-screen redesign and the larger navigation buttons have not been visually checked yet.

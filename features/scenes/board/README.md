# Board scene ("Touch to Draw!")

Port of `src/luke_java/BoardScene.pde` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). A whiteboard
that visitors draw on with a finger. This page covers how the scene works
inside, then how it connects to the rest of the kiosk.

Nothing drawn here is saved. The drawing lives only in the browser's
canvas and is gone as soon as the visitor leaves the page.

## At a glance

| | |
| --- | --- |
| Scene id | `board` (used by the menus and the session log) |
| Name on the bottom bar | "Draw" |
| Label in the menus | "Drawing" |
| Files | [BoardScene.tsx](BoardScene.tsx), [index.ts](index.ts), and the toolbar icons in [`public/images/board/`](../../../public/images/board/) |
| Talks to the server? | No |
| Tests | None yet |

## Files in this folder

### [BoardScene.tsx](BoardScene.tsx)

The whole scene. It renders a `SceneFrame` with a white background
(`bg-white text-black`, the same as the Directory, Feedback and Video
pages), which covers the shell's lavender and is the whiteboard. Inside it:

- a `<canvas>` filling the scene area, sitting on top of the white, which
  holds the ink. The canvas itself is transparent wherever nothing is
  drawn, so the page's white shows through.
- a toolbar of round icon buttons along the top, over the canvas, following
  the drawing mockup: **colour**, **pen** and **eraser** on the left, and a
  **trash can** on the right (see [Toolbar](#toolbar))
- a grey circle that shows the eraser's reach while erasing (see "Eraser
  circle" below)

The old "Touch to Draw!" heading was removed; the mockup doesn't have it,
and it sat where the toolbar now is.

#### Drawing

Drawing is done with the browser's 2D canvas API, driven by pointer events
(they cover touch, mouse and pen alike):

1. **Pointer down** (`handlePointerDown`): starts a stroke and records the
   starting point. The canvas captures the pointer
   (`setPointerCapture`), so the stroke keeps going even if the finger
   slides off the canvas or over a button.
2. **Pointer move** (`handlePointerMove`): draws a straight line from the
   last point to the new one, then makes the new point the last point. Many
   short lines in a row make a smooth stroke.
3. **Pointer up or cancel** (`endStroke`): ends the stroke and forgets the
   last point, so the next stroke doesn't join onto this one. This is
   upstream's `ClickRelease()`.

Only **one finger at a time** draws. While a stroke is in progress, any other
pointer is ignored (`activePointerIdRef`). This stops a second finger from
drawing a line jumping across the board.

The stroke state is kept in refs (`drawingRef`, `lastPointRef`,
`activePointerIdRef`) rather than React state, because it changes on every
pointer move and doesn't need to re-render anything.

The canvas's wrapper has `touch-none`, so dragging a finger on the board
draws instead of scrolling or zooming the page.

#### Pen and eraser

| Mode | What a stroke does | Line width |
| --- | --- | --- |
| Draw (default) | adds ink in the chosen colour (purple by default, see [Colour menu](#colour-menu)) | 2px (`PEN_WIDTH`) |
| Erase | removes ink | 30px (`ERASER_WIDTH`) |

Lines have rounded ends and joins so strokes look smooth.

**How the eraser works.** The eraser draws a stroke like the pen does, but
with the canvas's `globalCompositeOperation` set to `"destination-out"`.
In that mode a stroke doesn't add colour: it deletes whatever is already
on the canvas where it passes, leaving those pixels transparent, so the
white board behind shows through again. The stroke's own colour doesn't
matter. Drawing switches the mode back to `"source-over"` (normal
painting). The mode is set on every move, because the context keeps the
last setting.

**Eraser circle.** While the visitor is erasing (finger down in erase
mode), a grey circle follows the finger to show what the eraser covers:
`#D9D9D9` at 30% opacity, `ERASER_WIDTH` (30px) across, centred on the
finger. That matches the eraser exactly, because a 30px-wide stroke with
round ends sweeps a 30px circle along its path. It's a `<div>` over the
canvas (`eraserCursorRef`) with `pointer-events-none`, so it never blocks
drawing. It isn't drawn on the canvas, so it never ends up in the
picture. `moveEraserCursor` positions it directly through the ref
(`transform`) on every pointer move, rather than through React state, so
following the finger doesn't re-render the scene. It hides when the
stroke ends or is cancelled, when the window is resized, and when the pen
or eraser button is pressed. In pen mode it never appears.

This replaced upstream's eraser, which painted thick white lines over the
drawing. That only works while ink is drawn on plain white. Removing ink
instead means the eraser clears any colour from the colour menu, and it would still work if the board ever got a
background colour or image (set on the box behind the canvas).

The tool in use is the `tool` state (`"pen"` or `"eraser"`, starting on
the pen). `eraseMode` is just `tool === "eraser"`.

#### Toolbar

A row along the top of the board, from the drawing mockup. The colour
button is a `ColourPicker`; the others are `ToolButton`s (both defined at
the bottom of `BoardScene.tsx`).

| Button | Position | What it does |
| --- | --- | --- |
| Colour (a dot of the current ink) | left, first | Opens the colour menu (see [Colour menu](#colour-menu)). |
| Pen (a click pen) | left, second | Selects the pen (`selectTool("pen")`). |
| Eraser (a block eraser) | left, third | Selects the eraser (`selectTool("eraser")`). |
| Trash can | right | Clears the board (`clearCanvas`). |

- **Look:** round, lavender (`--luke-lavender`) with a purple
  (`--luke-purple`) outline and a purple icon. The selected tool, pen or
  eraser, gets a thicker outline, `clamp(3.5px, 1.1vw, 7px)` instead of
  `clamp(2px, 0.6vw, 4px)` (about 4px instead of 2px on the kiosk screen),
  so visitors can see which one they're using. Its colours don't change.
  The mockup doesn't show a selected state, so this was added. (It was
  first shown inverted, purple with a lavender icon, then changed to the
  thicker outline.) The button's size stays the same; the thicker outline
  grows inwards. Buttons darken slightly while pressed
  (`active:brightness-90`), like the bottom bar's arrows.
- **Size:** `clamp(2.5rem, 12vw, 4.5rem)` across (the `--tool` variable) (about 43px on the 360px
  kiosk screen), with an outline of `clamp(2px, 0.6vw, 4px)`. The icons
  fill 60% of the button.
- **Icons:** the pen and eraser are images, `public/images/board/pen.png`
  and `eraser.png` (cropped to the shape and scaled to 256px from the
  supplied 1536×1024 originals). `MaskIcon` uses each one as a CSS mask
  (`mask-image`, `mask-size: contain`) over a block of the text colour
  (`bg-current`), so the icon comes out in the button's `--luke-purple`
  whatever purple the PNG was saved in, and would follow a colour change
  on the button. The trash can is an inline SVG; the colour button shows plain
  coloured dots.
- **Pen and eraser are one choice**, not two toggles: selecting one
  deselects the other. Each has `aria-pressed`, so screen readers announce
  which is on. Every button has an `aria-label`, since it shows only an
  icon.
- **Drawing around the buttons:** the toolbar row is `pointer-events-none`
  and only the buttons themselves take taps, so visitors can still draw in
  the gaps between and beside them. A stroke that starts on the board and
  passes under a button keeps drawing (the canvas has captured the
  pointer).

#### Colour menu

The leftmost toolbar button picks the pen's ink colour (`ColourPicker`,
defined near the bottom of `BoardScene.tsx`). It follows the drawing
mockup closely.

**Colours,** in menu order, top to bottom (`INKS`):

| Colour | Value | Notes |
| --- | --- | --- |
| Red | `#E04C46` | sampled from the mockup |
| Yellow | `#F0CD48` | sampled from the mockup |
| Green | `#71C467` | sampled from the mockup |
| Blue | `#5588F6` | sampled from the mockup |
| Purple | `rgb(51, 30, 84)` (`PURPLE`) | the board's existing ink; **the default** |

**Behaviour:**

- **Closed:** a round button like the others, showing a dot of the current
  ink.
- **Tap it:** it opens. The current ink stays on top, with the other four
  listed below it in the order above, skipping the current one. For
  example, with yellow selected: yellow on top, then red, green, blue,
  purple.
- **Dot sizes:** the current ink's dot is 55% of the button's width; the
  others are 45%, slightly smaller, as in the mockup.
- **Tap a colour:** it becomes the ink, the menu closes, and the pen is
  selected. Picking a colour while the eraser is on switches back to the
  pen, since a visitor picking a colour wants to draw with it.
- **Tap the top dot again:** the menu closes, nothing changes.
- **Start drawing, or press pen or eraser:** the menu closes.
- The trash can doesn't close it or change the colour.

The ink is the `ink` state, used as the stroke colour in
`handlePointerMove`. The menu's open state is `colourMenuOpen`. Both live
in `BoardScene`, and `ColourPicker` only displays them and reports taps.
Like the drawing, the colour resets to purple whenever the scene remounts
(each time the visitor comes back to the page).

**Animation:** the menu grows from the circle into a rounded pill, and the
colours appear one after another as it grows, following the header
drop-down's pattern (`components/NavMenu.tsx`):

- **The pill** is the same width as the button, with the same outline and
  lavender fill, and `rounded-full`, so as its height increases the circle
  stretches into a pill. Its height animates from `var(--tool)` (one
  button) to `var(--tool) × (1 + 4 × COLOUR_SLOT)` (about 3.46 buttons) over
  `COLOUR_MENU_ANIMATION_MS` (300ms), easing out. `COLOUR_SLOT` (0.615 of a
  button) is each colour's row height, measured from the mockup.
- **Each colour** fades in and slides down from half a row above over
  `COLOUR_FADE_MS` (150ms). Their start times are staggered (0, 50, 100,
  150ms) so each one appears as the pill's edge reaches it, and the last
  finishes as the pill does. On closing, the stagger runs bottom to top,
  so colours vanish just before the shrinking pill covers them.
- With the system's "reduce motion" setting, it opens and closes instantly
  (`motion-reduce:transition-none`).

**Layout:** the button keeps a fixed one-button slot in the toolbar
(`relative aspect-square w-[var(--tool)]`), and the pill is absolutely
positioned inside it, growing downwards over the board. So opening it
doesn't move the other buttons. The pill takes taps
(`pointer-events-auto`); hidden colours are `disabled` and out of the tab
order, so they can't be tapped or focused while closed.

**Accessibility:** the top button is labelled with the current ink ("Pen
colour: Purple") and has `aria-expanded`. Each colour button is labelled
with its name.

The button size is the CSS variable `--tool`, set on the toolbar row
(`clamp(2.5rem, 12vw, 4.5rem)`) and used by both `ColourPicker` and
`ToolButton`, so the picker and the round buttons always match.

#### Clear

The trash can (`clearCanvas`) erases the whole canvas at once
(`clearRect`), leaving only the white board behind it. It doesn't change
the selected tool. Upstream had no Clear button; it was added here so
visitors don't have to scrub every stroke away with the eraser.

#### Canvas size

A canvas has two sizes: its size on screen (set by CSS) and the number of
pixels it draws into. The effect at the top of the component keeps them
equal:

- **When the scene appears**, the canvas's pixel size is set to its
  on-screen size. Setting the size empties the canvas, so it starts
  transparent over the white board. This is the "clean board" (upstream's
  `Enable()` did `background(255)`).
- **When the window or visual viewport is resized**, any stroke in progress
  is ended, the current drawing is copied aside, the canvas is resized
  (which empties it), and the copy is drawn back in, stretched to the new size.
  So the drawing survives a resize, though it may be stretched or squashed.
  If the size didn't actually change, nothing happens.

### [index.ts](index.ts)

Re-exports `BoardScene` so the registry can import it from
`@/features/scenes/board`.

## How it connects to the rest of the kiosk

```
features/kiosk/registry.ts ──registers──▶ BoardScene (id "board")
features/kiosk/menu-items.ts ──lists───▶ "Drawing" on the main menu and NavMenu
                                │
features/kiosk/components/KioskShell.tsx
   ├─ renders <BoardScene bounds handle /> inside SceneErrorBoundary
   ├─ resets the idle clock on every pointer down (bubbles up from the canvas)
   ├─ logs time spent under "board" (session-log.ts)
   └─ draws the header, the NavMenu, and the BottomBar around it
                                │
BoardScene ──wraps itself in──▶ components/SceneFrame.tsx
```

### Getting onto the screen

- **[features/kiosk/registry.ts](../../kiosk/registry.ts)** registers the
  scene in `SCENES` as `{ id: "board", name: "Draw", Component: BoardScene }`.
  Its position in that list is its place in the carousel, so the bottom
  bar's arrows reach it between "Browse the Gallery" and "Test Your
  Knowledge". `name` is what the bottom bar announces to screen readers.
- **[features/kiosk/menu-items.ts](../../kiosk/menu-items.ts)** lists it as
  "Drawing". Both the main menu's grid
  ([MainMenuScene.tsx](../main-menu/MainMenuScene.tsx)) and the header's
  drop-down ([components/NavMenu.tsx](../../../components/NavMenu.tsx)) read
  this list, so tapping "Drawing" in either one calls the shell's
  `goToScene("board")`.

### What the shell gives it

**[features/kiosk/components/KioskShell.tsx](../../kiosk/components/KioskShell.tsx)**
renders the scene and passes it two props (defined in
[features/kiosk/types.ts](../../kiosk/types.ts)):

- **`bounds`**: the screen size from the kiosk options
  ([features/kiosk/options.ts](../../kiosk/options.ts), 360×640 by default).
  The board **doesn't use it**. It used to size the old heading from
  `bounds.width`; the toolbar sizes itself with CSS instead.
- **`handle`**: functions for talking back to the shell (`reportActivity`,
  `nextScene`, `goToScene`, …). The board **doesn't use any of them** either.
  It never leaves the page or changes scene by itself; the visitor does that
  with the bottom bar or the menus.

Since it needs neither prop, `BoardScene` takes no parameters. It still
fits the shell's `SceneComponent` type, which allows a component to ignore
its props.

### Things the shell does that affect the board

- **The board is wiped whenever the visitor leaves.** The shell gives the
  scene's error boundary `key={scene.id}`, so switching scenes unmounts the
  board, and coming back mounts a fresh, white one. Going to the main menu
  and back, or using the bottom bar's arrows, clears the drawing.
- **Idle timeout.** The shell's outer `<div>` resets the idle clock on every
  `pointerdown`, and pointer events on the canvas bubble up to it. So each
  new stroke counts as activity, without the board having to call
  `reportActivity`. Moving a finger mid-stroke doesn't count, so a single
  stroke held for longer than `sessionIdleSeconds` (60s) would end the
  session. In practice strokes are far shorter.
- **When the session ends** (60s untouched), the shell switches to the
  welcome screen, so the board unmounts and its drawing is discarded. The
  next visitor always gets a blank board.
- **Session log.** While the board is on screen, the shell records time
  spent under the id `board`
  ([features/kiosk/session-log.ts](../../kiosk/session-log.ts)).
- **Crashes.** If the scene throws while rendering,
  [SceneErrorBoundary.tsx](../../kiosk/components/SceneErrorBoundary.tsx)
  catches it, the shell logs the error and the session ends, instead of the
  whole kiosk breaking.

### Layout around it

- **[components/SceneFrame.tsx](../../../components/SceneFrame.tsx)** is the
  scene's outer box: full width and height of the scene area, as a flex
  column. The board passes it `bg-white text-black`, as the other white
  pages do, so the whole scene is white with the canvas on top.
- The scene area sits between the purple header
  ([components/KioskHeader.tsx](../../../components/KioskHeader.tsx)) and the
  bottom bar ([components/BottomBar.tsx](../../../components/BottomBar.tsx)),
  both drawn by the shell. The board's canvas fills only the space between
  them.
- The shell draws the Nashville skyline underneath every scene. The board's
  white background is opaque, so **the skyline doesn't show on this page**.
  The canvas itself is transparent, so if the `SceneFrame`'s `bg-white` were
  removed, erased and empty areas would show the shell's lavender and
  skyline instead.
- The header's drop-down menu ([components/NavMenu.tsx](../../../components/NavMenu.tsx))
  opens over the top of the board. Taps on the menu don't draw.

## Styling

The board is partway through its redesign:

- **Done:** the white page background, and the toolbar from the drawing
  mockup (see [Toolbar](#toolbar)), which uses the palette's
  `var(--luke-*)` colours and Tailwind classes. It replaced upstream's
  "Erase/Draw" and "Clear" buttons, which were purple rectangles with gold
  text in the bottom-left corner, and the "Touch to Draw!" heading.
- **Done:** the colour menu, from the drawing mockup (see
  [Colour menu](#colour-menu)).
- **Note:** the purple ink (`PURPLE`, `#331e54`) is still upstream's
  purple, slightly different from `--luke-purple` (`#302052`). The canvas
  needs actual colour values rather than CSS variables, so the inks are a
  list of values in this file (`INKS`).
- **Next:** the rest of the toolbar's mockup (the pen and eraser menus).

Record further style changes in the repo's [`CSS.md`](../../../CSS.md), as
the other scenes do.

## Known limitations

- **Slightly blurry lines on high-DPI screens.** The canvas has one pixel
  per CSS pixel and doesn't account for `devicePixelRatio`, so on screens
  with dense pixels the lines are scaled up and look soft.
- **Resizing stretches the drawing** to the new size rather than keeping
  its proportions.
- **No tests.** There's no `BoardScene.test.tsx` yet. The canvas API isn't
  implemented in jsdom, so tests would need to mock `getContext`.

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
- a circle that shows where the pen or eraser will reach (see
  [Tool circle](#tool-circle))

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

| Tool | What a stroke does | Line width |
| --- | --- | --- |
| Pen (default) | adds ink in the chosen colour (purple by default, see [Colour menu](#colour-menu)) | the pen's size: 5, 20 or 40px, **20px by default** |
| Eraser | removes ink | the eraser's size: 10, 20 or 40px, **20px by default** |

The sizes come from `SIZES`, which lists each tool's own (the eraser's
smallest is 10px and the pen's 5px; both started at 2px, which was too
thin), and
each tool remembers its choice (`penSize`
and `eraserSize`, starting at `DEFAULT_SIZE`). See [Size menus](#size-menus)
for how they're picked. The width in use is `lineWidth`. Lines have
rounded ends and joins so strokes look smooth.

The pen used to be fixed at 2px and the eraser at 30px. The default of
20px for both follows the mockup, where the middle size is the one
selected; changing `DEFAULT_SIZE` changes it.

**How the eraser works.** The eraser draws a stroke like the pen does, but
with the canvas's `globalCompositeOperation` set to `"destination-out"`.
In that mode a stroke doesn't add colour: it deletes whatever is already
on the canvas where it passes, leaving those pixels transparent, so the
white board behind shows through again. The stroke's own colour doesn't
matter. Drawing switches the mode back to `"source-over"` (normal
painting). The mode is set on every move, because the context keeps the
last setting.

This replaced upstream's eraser, which painted thick white lines over the
drawing. That only works while ink is drawn on plain white. Removing ink
instead means the eraser clears any colour from the colour menu, and it
would still work if the board ever got a background colour or image (set
on the box behind the canvas).

The tool in use is the `tool` state (`"pen"` or `"eraser"`, starting on
the pen). `eraseMode` is just `tool === "eraser"`.

#### Tool circle

A circle on the board shows where the tool will draw or erase, and how
wide. It's one `<div>` over the canvas (`cursorRef`), always exactly
`lineWidth` across, so it matches the selected size. A stroke with round
ends sweeps a circle that size along its path.

| Tool | Looks like | When it shows |
| --- | --- | --- |
| Pen | the ink colour at 50% opacity | **always while the pen is in use**: it follows the finger while drawing, and a hovering mouse or stylus. When a finger lifts, it stays where the finger was, ready for the next stroke. |
| Eraser | `#D9D9D9` at 30% opacity | **only while erasing** (finger down in erase mode). It disappears when the stroke ends. |

- The pen's circle is half opacity so it reads apart from ink already
  drawn. It changes colour and size straight away when a new colour or
  size is picked.
- **Hidden:** before the board is first touched (there's nowhere to show it
  yet), when the tool changes, when the window is resized, and when a
  mouse leaves the board. Touch doesn't hide it on leaving, because a
  finger "leaves" every time it lifts.
- `moveCursor` positions it directly through the ref (`transform`), rather
  than through React state, so following the finger doesn't re-render the
  scene. It's centred on the point with `translate(-50%, -50%)`, so it
  stays centred whatever its size. Its size and colour do come from React
  state, since they only change when the visitor picks something.
- It has `pointer-events-none`, so it never blocks drawing, and it isn't
  drawn on the canvas, so it never ends up in the picture.
- At the pen's 5px the circle is a small dot, and the eraser's light grey is faint
  over the white board. Both show best over ink.

#### Toolbar

A row along the top of the board, from the drawing mockup.

| Button | Position | What it does |
| --- | --- | --- |
| Colour (a dot of the current ink) | left, first | Opens the colour menu (see [Colour menu](#colour-menu)). |
| Pen (a click pen) | left, second | Selects the pen; once selected, opens and closes its size menu (see [Size menus](#size-menus)). |
| Eraser (a block eraser) | left, third | Selects the eraser; once selected, opens and closes its size menu. |
| Trash can | right | Clears the board (`clearCanvas`). |

The colour, pen and eraser buttons are drop-downs (`ColourPicker` and
`SizePicker`, both built on `PillMenu`). The trash can is a plain
`ToolButton`. All are defined at the bottom of `BoardScene.tsx`.

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
- **Size:** `clamp(2.5rem, 12vw, 4.5rem)` across (about 43px on the 360px
  kiosk screen), with an outline of `clamp(2px, 0.6vw, 4px)`. This is the
  CSS variable `--tool`, set on the toolbar row and used by every button
  and menu, so they always match. The icons fill 60% of the button.
- **Icons:** the pen and eraser are images, `public/images/board/pen.png`
  and `eraser.png` (cropped to the shape and scaled to 256px from the
  supplied 1536×1024 originals). `MaskIcon` uses each one as a CSS mask
  (`mask-image`, `mask-size: contain`) over a block of the text colour
  (`bg-current`), so the icon comes out in the button's `--luke-purple`
  whatever purple the PNG was saved in, and would follow a colour change
  on the button. The trash can is an inline SVG; the colour button and the
  size options are plain circles.
- **Pen and eraser are one choice**, not two toggles: selecting one
  deselects the other. Each has `aria-pressed`, so screen readers announce
  which is on. Every button has an `aria-label`, since it shows only an
  icon.
- **One menu at a time:** the open menu is the `openMenu` state
  (`"colour"`, `"pen"`, `"eraser"` or none). Opening one closes any other.
  Touching the board closes whichever is open.
- **Drawing around the buttons:** the toolbar row is `pointer-events-none`
  and only the buttons themselves take taps, so visitors can still draw in
  the gaps between and beside them. A stroke that starts on the board and
  passes under a button keeps drawing (the canvas has captured the
  pointer).

#### Colour menu

The leftmost toolbar button picks the pen's ink colour (`ColourPicker`).
It follows the drawing mockup closely.

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
- **Start drawing, or open the pen or eraser menu:** the menu closes.
- The trash can doesn't close it or change the colour.

The ink is the `ink` state, used as the stroke colour in
`handlePointerMove` and as the pen circle's colour. Like the drawing, the
colour (and both sizes) reset whenever the scene remounts (each time the
visitor comes back to the page).

**Accessibility:** the top button is labelled with the current ink ("Pen
colour: Purple") and has `aria-expanded`. Each colour button is labelled
with its name.

#### Size menus

The pen and eraser buttons (`SizePicker`) each open a menu of line widths,
following the drawing mockup.

**Pressing the button:**

1. **Tool not selected:** the first press selects it. No menu opens.
2. **Tool selected:** a press opens its size menu.
3. **Menu open:** the next press closes it.

Pressing keeps alternating between 2 and 3 for as long as the tool stays
selected. Switching to the other tool closes any open menu (`pressTool`).

**The menu:** the tool's icon stays on top, and the three sizes are listed
below it, thinnest first, as circles (`SIZES.pen` or `SIZES.eraser`):

| Size | Line width | Circle in the menu |
| --- | --- | --- |
| Small | pen 5px, eraser 10px | 31% of the button |
| Medium | 20px (default) | 46% |
| Large | 40px | 69% |

- Each circle is a purple outline (`clamp(1.5px, 0.5vw, 3px)`) when it isn't
  the size in use, and **filled in purple** when it is. The circle sizes
  are measured from the mockup; they stand for the widths rather than
  drawing them to scale (a real 5px dot would be too small to tap).
- **Tap a size:** it becomes that tool's size, the menu closes, and the
  tool circle on the board changes to match. The pen and eraser keep
  separate sizes.
- The pill keeps the selected tool's thicker outline while open.
- **Accessibility:** the top button keeps its `aria-pressed` (tool in use)
  and adds `aria-expanded`. Each size is labelled, for example "Pen size:
  Large", with `aria-pressed` on the one in use.

#### Drop-down menus (`PillMenu`)

The colour and size menus share one component, `PillMenu`, so they look and
move the same.

- **Closed:** a round button like the others.
- **The pill:** the same width as the button, with the same outline and
  lavender fill, and `rounded-full`, so as its height increases the circle
  stretches into a pill. Its height animates from `var(--tool)` (one
  button) to its open height over `MENU_ANIMATION_MS` (300ms), easing out.
  The open height is one button plus a row per option:
  - **Size menus:** `MENU_OPEN_HEIGHT` (3.46 buttons, measured from the
    mockup), shared by their three rows, so each row is 0.82 of a button.
  - **Colour menu:** laid out from the colour menu reference image. Rows
    are `COLOUR_SLOT` (0.64 of a button) apart, set through `PillMenu`'s
    `slot` prop, so it opens to 1 + 4 × 0.64 = 3.56 buttons. The colours
    are pulled up `COLOUR_LIFT` (0.17 of a button) under the top button
    through the `lift` prop (a negative top margin on the first colour),
    which puts red's centre 1.15 buttons from the top of the pill and
    leaves the same 0.17 margin below blue, as in the reference.
    (History: the colours first sat below a full-height top button, which
    looked too low; the rows were then tightened to 0.55, before the
    reference showed the fix was moving them up, at 0.64 spacing.)
- **The options** each fade in and slide down from half a row above over
  `MENU_FADE_MS` (150ms). Their start times are staggered (for example 0,
  50, 100, 150ms for four options) so each one appears as the pill's edge
  reaches it, and the last finishes as the pill does. On closing, the
  stagger runs bottom to top, so options vanish just before the shrinking
  pill covers them. This follows the header drop-down's pattern
  (`components/NavMenu.tsx`).
- With the system's "reduce motion" setting, menus open and close
  instantly (`motion-reduce:transition-none`).
- **Layout:** the button keeps a fixed one-button slot in the toolbar
  (`relative aspect-square w-[var(--tool)]`), and the pill is absolutely
  positioned inside it, growing downwards over the board, so opening it
  doesn't move the other buttons.
- **Hidden options:** while closed, the options are `disabled`, out of the
  tab order, invisible, and ignore taps (`pointer-events: none`). That
  matters: closed options are tucked half a row up, under the top button,
  and before this the first one caught taps meant for the button (the size
  menus' taller rows reached the button's centre, so the pen and eraser
  menus couldn't be opened). The top button was also briefly layered above
  the options (`relative z-10`, with a lavender background); that was
  removed when the colour menu's `lift` made the first colour overlap the
  button's bottom edge, because the button painted over the top of the red
  dot. While open, a tap on that overlap goes to the first colour.

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
- **Done:** the colour menu and the pen and eraser size menus, from the
  drawing mockup (see [Colour menu](#colour-menu) and
  [Size menus](#size-menus)), and the tool circle (see
  [Tool circle](#tool-circle)).
- **Note:** the purple ink (`PURPLE`, `#331e54`) is still upstream's
  purple, slightly different from `--luke-purple` (`#302052`). The canvas
  needs actual colour values rather than CSS variables, so the inks are a
  list of values in this file (`INKS`).

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

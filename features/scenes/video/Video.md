# Video scene ("Video Player")

Port of `VideoScene.pde` and `readDir.pde` from `src/luke_java/` in the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk) (`VideoPlayerScene.pde`
there was an unused stub). Visitors watch Lipscomb videos one at a time and
flip between them with the arrows or a swipe. This page covers where the
videos come from, how the player behaves, how the layout is built, what each
file does, and how it differs from the original.

## Files

| File | What it does |
| ---- | ------------ |
| `features/scenes/video/VideoScene.tsx` | The scene: loads the playlist and renders the player. |
| `features/scenes/video/videos.ts` | Turns file names into the titles shown on screen. |
| `features/scenes/video/index.ts` | Barrel; exports `VideoScene`. |
| `features/scenes/video/VideoScene.test.tsx` | Component tests (see [Tests](#tests)). |
| `app/api/videos/route.ts` | `GET /api/videos`: the playlist. |
| `features/kiosk/wrapIndex.ts` | Shared helper that steps through the playlist, wrapping at both ends. |
| `public/videos/` | The video files themselves. Not in Git (see [Where the videos live](#where-the-videos-live)). |
| `public/images/video-pattern.png` | The tiled camera background. |

The scene is registered in `features/kiosk/registry.ts` as
`{ id: "video", name: "Video Player" }`, and appears as "Video" in the main
menu and the header's drop-down (`features/kiosk/menu-items.ts`).

## Where the videos live

The videos are files in `public/videos/`, served by Next.js at
`/videos/<file name>`. The folder is listed in `.gitignore`, so the files are
never committed: each machine keeps its own copy, and adding or removing a
video needs no code change.

The current 13 videos (about 620 MB) were copied from
`src/luke_java/data/` in the Processing repo:

| File | Title on screen |
| ---- | --------------- |
| `0_FieldsWalkthrough_Floor2.mp4` | Fields Walkthrough: Floor 2 |
| `2_FieldsWalkthrough_Floor3.mp4` | Fields Walkthrough: Floor 3 |
| `3_FieldsWalkthrough_Floor4.mp4` | Fields Walkthrough: Floor 4 |
| `Alumni_DrMcQueen.mov` | Alumni: Dr. McQueen |
| `CollegeOfEngineering_LabTour.mp4` | College of Engineering Lab Tour |
| `DrMcQueen_OneYear.mp4` | Dr. McQueen: One Year |
| `EducationPartnership_News.mp4` | Education Partnership |
| `HIGHLIGHT_VIDEO.mp4` | Highlights |
| `LookInside_CoELabs.mp4` | A Look Inside the Engineering Labs |
| `People_Helping_People.mp4` | People Helping People |
| `TPW_Graduation_2019_Sixth_Cut.mov` | TPW Graduation 2019 |
| `Trailer_CollegeOfEngineering.mp4` | College of Engineering Trailer |
| `Z_FieldsWalkthrough_Floor1.mp4` | Fields Walkthrough: Floor 1 |

**Adding a video:** drop the file into `public/videos/`. Accepted types are
`.mp4`, `.webm`, `.m4v` and `.mov`. It plays in file-name order (see below),
with a title made from its name. For a nicer title, add it to `TITLES` in
`videos.ts`.

**Play order:** files are sorted by name, character by character, so a short
prefix like `0_` or `Z_` sets a video's place. Digits come before capital
letters, and capitals before lowercase. That is why `Z_FieldsWalkthrough_Floor1`
plays last: upstream's names, kept as they were.

## Route

### `GET /api/videos`

`app/api/videos/route.ts`. Replaces upstream's `readDir.pde`.

- Lists the files in `public/videos/` whose extension is `.mp4`, `.webm`,
  `.m4v` or `.mov` (case-insensitive), sorted by name.
- Responds `{ "files": ["0_FieldsWalkthrough_Floor2.mp4", …] }`.
- `dynamic = "force-dynamic"`, so the folder is read on every request rather
  than once at build time.
- A missing folder (a fresh clone, say) returns `{ "files": [] }`, not an error.

The video files themselves need no route: Next.js serves anything in
`public/` as a static file.

## `videos.ts`

- **`KioskVideo`**: `{ file, title }`. `file` is the name inside
  `public/videos/`; `title` is what's shown on screen.
- **`TITLES`**: friendlier titles for known files, e.g.
  `"HIGHLIGHT_VIDEO.mp4"` → `"Highlights"`.
- **`titleFromFile(file)`**: the fallback for a file not in `TITLES`. It drops
  the extension, drops a one-character ordering prefix (`0_`, `Z_`), turns
  underscores into spaces and splits joined words:
  `5_NewBuilding_Tour2026.mp4` → `New Building Tour 2026`.
- **`toKioskVideo(file)`**: the `KioskVideo` for a file name, using `TITLES`
  first and `titleFromFile` otherwise.

## How the player behaves

### Loading

`VideoScene` fetches `/api/videos` once when it appears. While that's in
flight it shows "Loading videos…". If the list is empty, or the request fails,
it shows "No videos found. Add video files to public/videos." Otherwise it
renders `VideoPlayer` with the list, starting at the first video.

### Playing and pausing

- The current video starts playing by itself (`autoPlay`, `playsInline`).
  Browsers may refuse to autoplay with sound before the first tap; the video
  then simply stays paused.
- **Tap the video** to pause or play it. While it's paused, two gold bars
  (upstream's pause icon) show over it.
- **When a video ends**, the next one starts by itself. With only one video,
  it restarts from the beginning.
- **A video that won't play** (a missing file, or a codec the browser can't
  decode) is replaced by "This video can't be played on this machine
  (file name)." The arrows still work.
- The `<video>` element is keyed by file name, so switching videos remounts it
  and every video starts from the beginning.

### Switching videos

Every switch wraps around at both ends (`wrapIndex`), so "previous" from the
first video goes to the last.

- **Arrows / previews:** tapping the preview on the left goes to the previous
  video; tapping the one on the right goes to the next.
- **Swipe:** a drag that is mostly sideways and at least 40px long
  (`SWIPE_MIN_PX`) switches videos: swipe left for the next, right for the
  previous. It jumps straight there, with no slide animation yet. Shorter or
  mostly vertical drags are ignored. A swipe can start anywhere on the row of
  videos, including on a preview.
- **One swipe, one switch:** a swipe that ends on an arrow or on the video
  doesn't also count as a tap. The browser fires a click after the swipe's
  pointer-up, and `swallowClickAfterSwipe` catches it in the capture phase
  before it reaches the button.

The swipe row has `touch-action: pan-y` (so the browser doesn't claim sideways
drags for scrolling) and `user-select: none`. It also carries
`data-testid="video-swipe-area"` for the tests.

### Idle timeout

The kiosk returns to the welcome screen after 60 seconds without a tap. A
visitor watching a video isn't tapping, so while a video **they chose** is
playing, the player calls `handle.reportActivity()` every 5 seconds
(`KEEP_AWAKE_MS`). While a video is paused, or playing on its own after the
previous one ended, the normal timeout applies. This matches upstream, which
counted idle time only while paused or autoplaying.

Choosing a video (arrow, preview, swipe or tap) also reports activity at once.

## Layout

Built from the video player mockups (portrait and landscape).

```
            1 / 13                ← counter
 ┌──┐  ┌───────────────┐  ┌──┐
 │ ‹│  │     video     │  │› │    ← previous preview · video · next preview
 └──┘  └───────────────┘  └──┘
   Fields Walkthrough: Floor 2    ← title
 next: Fields Walkthrough: Floor 3
previous: Fields Walkthrough: Floor 1
```

### Scaling: `--c`

Every size in the player is a fraction of one CSS variable, `--c`, the video
card's width, so the whole layout scales with the screen. The scene's
`SceneFrame` is a size container (`container-type: size`) and sets:

```
--c: min(68cqw, 60cqh)
```

That's 68% of the scene's width (the portrait mockup's proportion), unless
the scene is too short for that; then it's 60% of the height, which leaves
room for the counter above and three lines of text below.

### Rows: the video never moves

The player is a grid with three rows:

| Row | Height | Holds |
| --- | ------ | ----- |
| 1 | `minmax(0, 1fr)` | The counter, at the bottom of the row. |
| 2 | `auto` | The previews and the video. |
| 3 | `minmax(0, 2.5fr)` | The title and the next/previous titles, at the top of the row. |

Rows 1 and 3 split the space left over by a fixed 1 : 2.5 ratio, and their
`minmax(0, …)` minimum means their text can't push on them. So when a title
wraps onto a second line, or a next/previous name is longer, only that row's
contents change: the video stays exactly where it was. Row 3 gets more
because it holds three lines of text to the counter's one.

### Previews: cropped by the screen

The row of videos is a centred flex row (`justify-center`) inside a grid
column of `minmax(0, 1fr)`, so it can be wider than the screen. When it is,
it overflows equally on both sides and the scene's `overflow: hidden` crops
it. The previews keep a fixed size relative to the video, so:

- on a narrow portrait screen, only a sliver of each preview shows;
- on a wide landscape screen, they show whole;
- anything in between shows part of each.

Each preview's arrow sits at its edge nearest the video, which is always on
screen.

### Sizes

All in multiples of `--c` (written `calc(var(--c)*N)` in the code; `text-[…]`
and `border-[…]` values carry a `length:` hint so Tailwind reads them as
sizes, not colours).

| Element | Size and style |
| ------- | -------------- |
| Video card | `--c` wide, 11 : 10 (`aspect-[11/10]`), corners 0.08, border 0.018 `--luke-purple`, fill `#d6d1e4`. The video is `object-contain` inside. |
| Gap between video and previews | 0.07 |
| Preview | 0.77 square, corners 0.07, border 0.012 `--luke-lilac`, fill `--luke-lavender`. The still is `object-cover` at 45% opacity. |
| Preview arrow | 0.22 tall × 0.11 wide, `--luke-purple`, 0.025 in from the inner edge |
| Pause bars | two bars 0.25 tall × 0.075 wide, 0.06 apart, gold `#AD8C45` |
| Counter | bold `--luke-purple`, 0.075, 0.04 above the video, no border |
| Title | bold `--luke-purple`, 0.1, at most 1.3 wide, 0.04 below the video, `text-balance` |
| Next / previous | semibold `--luke-lilac`, 0.058, 0.015 below the title |

### Preview stills

A preview is a muted `<video>` with `preload="metadata"` and `#t=0.5` on its
URL, so the browser shows the frame at half a second without playing it. This
is upstream's `SetThumbnails()`. No image files are generated.

### Background

`--luke-grey` (`#D9D9D9`) under `public/images/video-pattern.png`, repeated
at `min(80%, 18rem)` wide. The tile is 188×188: exactly one repeat of the
mockup's camera pattern (four cameras across, two staggered rows down), so it
tiles with no seams. It was cropped from the mockup image and measured to the
pattern's real period (47px across, 94px down); a plain crop showed
half-drawn cameras at every tile edge. The background is opaque, so it covers
the shell's skyline on this page, as in the mockup.

## Differences from upstream

| Upstream (`VideoScene.pde`) | Here |
| --------------------------- | ---- |
| Previous video's thumbnail on top, current in the middle, next at the bottom | Previous on the left, current in the middle, next on the right, from the mockup |
| Tap a thumbnail to switch | Tap a preview or swipe |
| Gold pause icon while paused | Same |
| Next video starts when one ends | Same |
| Idle time counted only while paused or autoplaying | Same, by reporting activity while a chosen video plays |
| Playlist read from the `data` folder by `readDir.pde` | Read from `public/videos/` by `GET /api/videos` |
| "Next scene in 30" countdown | Not ported (see L20-24 on carousel auto-scrolling) |

## Tests

`VideoScene.test.tsx` replaces `fetch` with a fake `/api/videos` serving three
file names, so no real video files are needed. It checks that the scene:

- shows the current video's title and the previous and next videos' previews;
- shows the counter ("1 / 3");
- names the next and previous videos under the title, and updates them on a
  switch;
- switches with the next and previous arrows, wrapping at both ends, and
  reports activity;
- switches on a left swipe (next) and a right swipe (previous);
- ignores short drags and mostly vertical ones;
- switches only once when a swipe ends on an arrow;
- says so when the video folder is empty;
- makes readable titles for files not in `TITLES`.

jsdom has no `PointerEvent`, so `fireEvent.pointerDown` would drop
`clientX`/`clientY`. The test file defines a stand-in (a `MouseEvent`
subclass) when it's missing.

The layout itself (sizes, the video not moving, the cropped previews) can't
be tested in jsdom, which doesn't lay pages out. It was checked by screenshot
in Chrome at 360×480 portrait and at 560×250 and 1000×440 landscape, with
titles of one and two lines.

**Running the tests:** `npm test` needs `ts-node` to read `jest.config.ts`,
and it isn't installed. On Node 22.18 or newer it isn't needed. Otherwise run
`NODE_OPTIONS=--experimental-strip-types npx jest features/scenes/video`.

## Known issues

- **Docker image size:** `public/videos/` isn't in `.dockerignore`, so the
  videos are built into the image. They end up in it twice, once from
  `COPY public` and once in the standalone output, because Next.js traces the
  folder `route.ts` reads. The image is about 3 GB and slow to export. The
  fix is to leave the videos out of the image and mount them at runtime, which
  likely also needs a route to serve them, since a production Next.js server
  may only serve `public/` files present at build time.
- **`.mov` files:** the two `.mov` videos play only if they're H.264 inside.
  Chrome can't decode ProRes or HEVC; such a file shows the "can't be played"
  message, and converting it to `.mp4` fixes it.
- **Not yet checked with real playback on a kiosk:** the screenshots were
  taken before the videos had loaded, so stills and playback haven't been
  checked in a browser yet.

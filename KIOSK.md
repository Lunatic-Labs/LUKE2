# L.U.K.E. — Lipscomb University Kiosk Experience

L.U.K.E. is the touchscreen kiosk in Lipscomb University's Fields Engineering
Center. Visitors tap through a short set of pages: campus videos, a "You Are
Here" map with directions, a photo booth and gallery, a drawing board, a trivia
game with a leaderboard, a feedback page, and a directory of the college's
majors, faculty and building.

This repo is a Next.js port of the original Processing/Java kiosk,
[Lunatic-Labs/Kiosk](https://github.com/Lunatic-Labs/Kiosk) (`src/luke_java/`).
Most files' doc comments name the `.pde` file they were ported from.

## Contributors

Built by students in Lunatic Labs:

- Timothy Chirkov
- Aaron Clendenin
- ChristianS-eng
- Evan Hughes
- Ethan Silvera
- Connor O'Brien

Per-student commit, line and PR counts are in [commitStats.md](commitStats.md).

## Bird's-eye view

```
app/          Routing only. page.tsx mounts the kiosk; api/ holds the server routes.
components/   Shared UI with no scene knowledge (header, bottom bar, nav menu, frames).
hooks/        Shared React hooks (idle timer, carousel index).
features/
  kiosk/      The shell: KioskShell, scene registry, options.txt, session logging.
  scenes/     One folder per page (idle, main-menu, video, map, camera, gallery,
              board, trivia, feedback, directory).
public/       Static images, plus each machine's own videos and gallery pictures.
data/         Runtime files (gitignored): options.txt, camera photos, trivia scores.
```

The whole kiosk is **one page** (`app/page.tsx`). `KioskShell` swaps scenes in
place, like the original single-window sketch, and returns to the attract
screen after a minute without a touch. Disk access (photos, scores, videos,
options) happens only on the server, in `app/api/*` routes and the server-only
`*-store.ts` / `options-file.ts` modules.

## Index

### Documentation

| File | What it covers |
| ---- | -------------- |
| [CLAUDE.md](CLAUDE.md) | Commands, environment variables, architecture, testing, lint gotchas. Start here. |
| [README.md](README.md) | Stock Next.js getting-started notes. |
| [CSS.md](CSS.md) | The UI restyle: color palette tokens and why each component changed. |
| [commitStats.md](commitStats.md) | Contribution stats per student (generated; don't edit by hand). |
| [app/README.md](app/README.md) | What lives in `app/`: layout, page, route handlers. |
| [components/README.md](components/README.md) | The shared UI components. |
| [hooks/README.md](hooks/README.md) | The shared hooks. |
| [features/README.md](features/README.md) | The kiosk shell's files and how scenes are organized. |
| [features/scenes/camera/README.md](features/scenes/camera/README.md) | Camera scene and a photo's path from capture to gallery. |
| [features/scenes/board/README.md](features/scenes/board/README.md) | Drawing board scene. |
| [features/scenes/trivia/README.md](features/scenes/trivia/README.md) | Trivia game, engagement and leaderboard. |
| [features/scenes/main-menu/README.md](features/scenes/main-menu/README.md) | Main menu change notes (marked temporary). |
| [features/scenes/map/data/README.md](features/scenes/map/data/README.md) | `places.json`, the campus map's list of places. |
| [public/directory/README.md](public/directory/README.md) | Where directory staff portraits go and how they're named. |

### API routes

All are under `app/api/` and reachable from the kiosk machine only.

| Route | File | Does |
| ----- | ---- | ---- |
| `GET /api/videos` | [app/api/videos/route.ts](app/api/videos/route.ts) | Lists `public/videos/` as the Video Player's playlist. |
| `POST /api/photos` | [app/api/photos/route.ts](app/api/photos/route.ts) | Saves a JPEG from the camera scene (10 MB max). |
| `GET /api/photos/[name]` | [app/api/photos/[name]/route.ts](app/api/photos/[name]/route.ts) | Serves one saved photo. |
| `GET /api/gallery` | [app/api/gallery/route.ts](app/api/gallery/route.ts) | Lists `public/gallery/` plus saved camera photos. |
| `GET /api/scores` | [app/api/scores/route.ts](app/api/scores/route.ts) | Returns the trivia leaderboard. |
| `POST /api/scores` | [app/api/scores/route.ts](app/api/scores/route.ts) | Saves a `{ tag, score }` and returns the updated leaderboard. |

### Key source files

| File | Role |
| ---- | ---- |
| [app/page.tsx](app/page.tsx) | The only page: reads `options.txt` and renders `KioskShell`. |
| [features/kiosk/components/KioskShell.tsx](features/kiosk/components/KioskShell.tsx) | Carousel, idle clock, session logging (`DisplayManager.pde`). |
| [features/kiosk/registry.ts](features/kiosk/registry.ts) | Which scenes exist and their carousel order. |
| [features/kiosk/menu-items.ts](features/kiosk/menu-items.ts) | Main menu and header menu entries. |
| [features/kiosk/types.ts](features/kiosk/types.ts) | The scene contract: `SceneDefinition`, `SceneHandle`. |
| [features/kiosk/options.ts](features/kiosk/options.ts) | Options defaults and the `options.txt` parser. |
| [features/kiosk/options-file.ts](features/kiosk/options-file.ts) | Reads `options.txt` from disk (server-only). |
| [features/kiosk/session-log.ts](features/kiosk/session-log.ts) | Per-scene dwell time tracking. |
| [features/scenes/map/kiosks.ts](features/scenes/map/kiosks.ts) | Physical kiosk locations, picked by `KioskId`. |
| [features/scenes/camera/photo-store.ts](features/scenes/camera/photo-store.ts) | Photo storage on disk (server-only). |
| [features/scenes/trivia/score-store.ts](features/scenes/trivia/score-store.ts) | Leaderboard storage on disk (server-only). |
| [docker-compose.yml](docker-compose.yml), [Dockerfile](Dockerfile) | Production image, volumes, localhost-only port. |

---

# Running a Kiosk

How to set up, configure and look after a machine running L.U.K.E.

Every kiosk runs the same build. What makes one machine different from another
lives in files outside the build: its `options.txt`, its videos and gallery
pictures, and the photos and scores it collects.

## What a visitor sees

1. **Attract screen** ("Touch Anywhere to Begin!"). Any tap starts a session.
2. **Main menu.** Shown once per session. The visitor picks a page.
3. **Pages**, in carousel order: Video Player, You Are Here (map), Take a
   Picture!, Browse the Gallery, Draw, Test Your Knowledge (trivia), Leave Some
   Feedback?, and the L.U.K.E. Directory. The bottom bar's arrows step through
   them, and the header's menu jumps straight to any page or back to Home.

Pages never advance on their own. A session nobody touches for
`SessionIdleSeconds` (60 by default) ends and the attract screen returns.

## Running it

Production, in Docker:

```bash
docker compose up --build
```

Then open <http://localhost:3000> in a full-screen browser on the kiosk.

- The app listens on `127.0.0.1:3000` only. `/api/photos` and `/api/scores`
  have no authentication, so other machines on the network must not be able
  to reach them. Don't change the port mapping to `0.0.0.0`.
- Use `localhost` (or https) in the browser. The camera needs a secure context,
  and on a plain-http address other than localhost the Take a Picture! page
  reports "Camera unavailable".
- The browser will ask for camera permission the first time. Allow it, and make
  it permanent, or the camera page will stop working after a restart.

Without Docker, `npm run build` then run the standalone server from
`.next/standalone`, or use `npm run dev` for development.

## Configuring this machine: `options.txt`

The app reads `data/options.txt` each time the page is served, so edits apply
on the next page load with no rebuild. A missing file is normal and means the
defaults. A file that can't be read logs a warning and also means the defaults.

The format is the Processing build's: one `key=value` per line. Unknown keys and
lines without `=` are ignored, so an old `options.txt` can be dropped in as is.

| Key                  | Default  | Meaning                                                      |
| -------------------- | -------- | ------------------------------------------------------------ |
| `KioskId`            | `fields` | Which kiosk this is. Must be a key of `KIOSKS` (see below).  |
| `SessionIdleSeconds` | `60`     | Seconds without a touch before the session ends.             |
| `ScreenWidth`        | `360`    | Width the pages are laid out for, in pixels.                 |
| `ScreenHeight`       | `640`    | Height the pages are laid out for, in pixels.                |
| `isFullscreen`       | `0`      | `1` for full-viewport mode.                                  |

Example:

```
KioskId=fields
SessionIdleSeconds=60
ScreenWidth=1080
ScreenHeight=1920
isFullscreen=1
```

Set `OPTIONS_FILE` to read the file from somewhere else.

**In Docker**, create the file first, then uncomment this line in
[docker-compose.yml](docker-compose.yml):

```yaml
- ./data/options.txt:/app/data/options.txt:ro
```

Order matters: if the file doesn't exist when the container starts, Docker
creates a folder at that path and the kiosk quietly runs on the defaults.

### Adding a new kiosk location

The map's "You Are Here" marker and walking directions come from the kiosk's
entry in [features/scenes/map/kiosks.ts](features/scenes/map/kiosks.ts). To
install L.U.K.E. somewhere new, add an entry to `KIOSKS` with:

- `placeId`: the building's id in the map's `places.json`.
- `exitEntranceId`: the entrance visitors leave through; directions start there.
- `headingDeg`: the compass direction a visitor faces while looking at the
  screen, or `null` until it's measured.
- `exitHeadingDeg`: the compass direction that entrance faces, or `null`.

Then set `KioskId` to that entry's key in the machine's `options.txt`. An
unknown `KioskId` logs a warning and falls back to `fields`.

## Content each machine supplies

| Folder            | Used by        | Notes                                                                 |
| ----------------- | -------------- | --------------------------------------------------------------------- |
| `public/videos/`  | Video Player   | `.mp4`, `.webm`, `.m4v` or `.mov`. Played in file-name order.         |
| `public/gallery/` | Gallery        | `.jpg`, `.jpeg`, `.png`, `.gif` or `.webp`, shown in file-name order. |
| `public/directory/` | Directory    | Staff portraits; see [public/directory/README.md](public/directory/README.md). |

**Videos** aren't kept in Git, so copy them onto each machine. A one-character
prefix such as `0_` or `Z_` controls play order and is dropped from the title.
Titles for known files are in
[features/scenes/video/videos.ts](features/scenes/video/videos.ts); any other
file gets a title made from its name.

In Docker these folders are copied into the image at build time, so add or
change files **before** `docker compose up --build`, and rebuild after changing
them.

## Data the kiosk collects

| What                   | Default location     | Docker volume   | Override            |
| ---------------------- | -------------------- | --------------- | ------------------- |
| Camera photos          | `data/camera-pics/`  | `camera-pics`   | `CAMERA_DIR`        |
| Trivia leaderboard     | `data/trivia-scores/scores.csv` | `trivia-scores` | `TRIVIA_SCORES_DIR` |

- **Photos** are saved as `screen-<timestamp>-<id>.jpg` and appear in the
  Gallery on the next visit to it. They are kept forever; nothing deletes them
  automatically. Keep an eye on free disk space, and remove photos by hand if
  one needs to come down.
- **Trivia scores** are a CSV of `tag,score` rows, where a tag is three capital
  letters.
- `data/` is gitignored. In Docker, both folders are named volumes, so they
  survive rebuilds and `docker compose down`, but not `docker compose down -v`.
  Back them up before removing volumes.

**Session logs** (how long visitors spent on each page) and scene errors go to
the server console only. With Docker, read them with `docker compose logs web`.
They are not written to disk.

## Troubleshooting

| Symptom                                        | Check                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Camera page says "Camera unavailable"          | Browser is on `localhost`/https; camera permission granted; no other app holds the webcam. |
| Map shows the wrong building                   | `KioskId` in `options.txt`, and in Docker that the file is mounted (not a folder). |
| Options changes have no effect                 | Docker created a folder at `data/options.txt`. Delete it, create the file, restart. |
| Video Player is empty                          | `public/videos/` has supported files; in Docker, rebuild the image.   |
| A page shows an error and drops to the attract screen | One scene failed; the rest keep working. See `docker compose logs web`. |
| Container won't start: port 3000 in use or "access permissions" | A leftover `npm run dev` still holds the port, or on Windows the port sits in an excluded range (`netsh interface ipv4 show excludedportrange protocol=tcp`). |

# Camera scene ("Take a Picture!")

Port of `src/luke_java/CameraScene.pde` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). This page covers
every file involved, in the order a photo passes through them.

## Files in this folder

### [CameraScene.tsx](CameraScene.tsx)

The camera screen itself, the replacement for `CameraScene.pde`.

The screen always shows one of six states:

| State         | What's on screen                                          |
| ------------- | --------------------------------------------------------- |
| `starting`    | Waiting for the browser to open the webcam                |
| `ready`       | Live preview plus "Touch to take a picture!"              |
| `countdown`   | Gold "Ready", then "Set", then "Pose!", one per second    |
| `saving`      | White flash while the photo is captured and sent          |
| `done`        | A thank-you line (or an error message) for 1 second       |
| `unavailable` | "Camera unavailable" with the reason                      |

It has three effects (blocks of code that run on their own timing):

- **Camera on/off:** opens the webcam when the scene appears and stops it when
  the visitor leaves. This is upstream's `video.start()` / `video.stop()`.
- **Countdown:** moves through Ready/Set/Pose! and then takes the picture.
- **Cooldown:** after 1 second in `done`, goes back to `ready`. This is
  upstream's `delay(1000)`.

`handleTap()` starts the countdown, but only from `ready`. That's the job the
old `canTakePicture` flag did.

The camera uses `getUserMedia`, which browsers only allow on `https://` pages
or `localhost`. Opening the kiosk by IP address over plain `http` shows
"Camera unavailable".

### [capture.ts](capture.ts)

The two browser-side steps of taking a picture:

- `captureFrame(video)` draws the current video frame onto a hidden canvas and
  turns it into a JPEG.
- `uploadPhoto(blob)` sends that JPEG to `/api/photos`.

These two together replace Processing's `saveFrame()`. They're in their own
file so the tests can swap them out, since a test has no real camera.

### [photo-store.ts](photo-store.ts)

Writes photos to disk. **Server-only.**

- `cameraDir()` returns where photos go: `CAMERA_DIR` if set, otherwise
  `data/camera-pics` (the old `CameraDir` from `options.txt`).
- `photoFileName()` builds the name, like
  `screen-2026-09-24T20-55-57-190Z.jpg`. Upstream numbered files by frame
  count, which restarted at zero every launch and overwrote earlier photos.
- `isJpeg()` checks the first 3 bytes of the file (`FF D8 FF`), which every
  JPEG starts with.
- `savePhoto()` creates the folder if needed and writes the file. It refuses to
  overwrite an existing file.

Never export this module from [index.ts](index.ts). If it were, the browser
code would pull in Node's file-system code and the build would break.

## Files elsewhere

### [app/api/photos/route.ts](../../../app/api/photos/route.ts)

The server endpoint the photo gets sent to (`POST /api/photos`). It checks the
upload before saving it:

- too big (over 10 MB) → **413**
- empty → **400**
- not a JPEG → **415**
- otherwise it saves the photo and replies **201** with the file name.

It doesn't write files itself; it hands that to `photo-store.ts`. That follows
the rule in `app/README.md` that `app/` handles routing only.

### [features/kiosk/registry.ts](../../kiosk/registry.ts)

The camera entry has no `placeholder: true`, which marks the scene as built.

### [app/globals.css](../../../app/globals.css)

Defines the `luke-flash` animation: the white overlay fades from 90% to
invisible, like a camera flash.

### [Dockerfile](../../../Dockerfile)

The production container runs as a restricted user called `nextjs`, which
can't create folders just anywhere. A build step creates `data/camera-pics`
ahead of time and gives `nextjs` permission to write to it. Without it, saving
photos fails inside Docker.

### [docker-compose.yml](../../../docker-compose.yml)

Mounts the `camera-pics` volume at `/app/data/camera-pics`, so photos are kept
when the container is rebuilt or restarted. The volume shows up in Docker as
`luke2_camera-pics`. On Windows with Docker Desktop, its contents can be viewed
in File Explorer at:

```
\\wsl.localhost\docker-desktop\mnt\docker-desktop-disk\data\docker\volumes\luke2_camera-pics\_data
```

Treat that folder as view-only. To get copies instead, run
`docker compose cp web:/app/data/camera-pics ./photos` from the repo root.

### [.gitignore](../../../.gitignore)

Ignores `/data/`, so photos of visitors never get committed by accident.

### Docs: [CLAUDE.md](../../../CLAUDE.md), [app/README.md](../../../app/README.md), [features/README.md](../../README.md)

- **`CLAUDE.md`:** explains `CAMERA_DIR`, the Docker volume, and the
  `localhost`/`https` requirement.
- **`app/README.md`:** lists the `api/photos` route.
- **`features/README.md`:** marks `camera/` as built and repeats the warning
  about keeping `photo-store.ts` out of `index.ts`.

## Tests

### [CameraScene.test.tsx](CameraScene.test.tsx)

Uses a fake webcam and fake timers to check:

- the prompt appears once the camera opens
- the full countdown → capture → thank-you → back-to-ready flow
- taps are ignored mid-countdown
- a failed save shows an error
- a blocked camera, or a browser with no camera support, shows
  "Camera unavailable"
- the camera is turned off when the visitor leaves the scene

### [photo-store.test.ts](photo-store.test.ts)

Checks file naming, JPEG detection, `CAMERA_DIR` handling, folder creation, and
that overwriting is refused. It uses a temporary folder, so it never touches
real photos.

### [app/api/photos/route.test.ts](../../../app/api/photos/route.test.ts)

Sends fake uploads to the route and checks the result: a valid JPEG gets saved
(201), an empty upload is rejected (400), and a non-JPEG is rejected (415)
without writing anything.

## Differences from the Processing version

- The countdown shows one word per second. The original drew all three words
  at once for about a frame.
- The thank-you lines (`thankYouText[]`) were written but disabled upstream;
  they're shown during the 1-second hold.
- "Touch to take a picture!" appears right away rather than after 10 seconds.
- A generic serif font replaces `ACaslonPro-Regular.otf`, a licensed Adobe font.
- The preview isn't mirrored, same as the original.

# Camera scene ("Take a Picture!")

Port of `src/luke_java/CameraScene.pde` from the
[Processing kiosk](https://github.com/Lunatic-Labs/Kiosk). This page covers
every file involved, in the order a photo passes through them, and then how
the photo ends up in the gallery scene.

## A photo's trip, start to finish

```
CameraScene ──captureFrame──▶ JPEG ──uploadPhoto──▶ POST /api/photos
                                                         │
                                                  photo-store.savePhoto
                                                         │
                                                         ▼
                                              CAMERA_DIR/screen-….jpg
                                                         │
GalleryScene ◀── <Image src="/api/photos/screen-….jpg"> ◀── GET /api/photos/[name]
      ▲                                                  │
      └──── GET /api/gallery (lists public/gallery + CAMERA_DIR)
```

1. The visitor taps the capture button, the countdown runs, and
   `CameraScene` grabs a frame.
2. The frame is sent to `POST /api/photos`, which saves it in `CAMERA_DIR`.
3. The next time anyone opens the gallery scene, it asks `GET /api/gallery`
   for its picture list. That list now includes the new photo.
4. The gallery loads the photo from `GET /api/photos/<file name>`.

Photos are kept forever. Nothing deletes them automatically.

## Files in this folder

### [CameraScene.tsx](CameraScene.tsx)

The camera screen itself, the replacement for `CameraScene.pde`.

The screen always shows one of six states:

| State         | What's on screen                                          |
| ------------- | --------------------------------------------------------- |
| `starting`    | Waiting for the webcam; capture button dimmed             |
| `ready`       | Live preview with "Take A Picture"; capture button active |
| `countdown`   | Gold "Ready.", "Set.", "Pose!" stacking, one per second   |
| `saving`      | White flash while the photo is captured and sent          |
| `done`        | A thank-you line (or an error message) for 1 second       |
| `unavailable` | "Camera unavailable" with the reason                      |

It has three effects (blocks of code that run on their own timing):

- **Camera on/off:** opens the webcam when the scene appears and stops it when
  the visitor leaves. This is upstream's `video.start()` / `video.stop()`.
- **Countdown:** moves through Ready./Set./Pose! and then takes the picture.
- **Cooldown:** after 1 second in `done`, goes back to `ready`. This is
  upstream's `delay(1000)`.

The layout follows the camera mockup. The scene is purple, continuing the
header and bottom bar, and the live preview fills most of it as a card with
rounded corners and a thin purple margin. Below it, just above the bottom bar,
sits the **capture button**: a camera-app style shutter, drawn as a lavender
ring around a lavender disc with a purple gap between them. The disc shrinks slightly while pressed. Its accessible name is
"Take picture".

The text over the preview follows the mockup's frames: heavy sans-serif with a
thick dark purple outline. "Take A Picture" sits at the top while the camera is
ready. The gold countdown starts just below the middle and stacks downward
("Ready.", then "Ready. Set.", then "Ready. Set. Pose!"). The thank-you line,
picked at random from `THANK_YOU_TEXT`, appears lower down, around two thirds
of the way down the preview.

The capture button is the only way to take a picture: tapping the preview
does nothing, so a visitor touching the screen for another reason can't set
off the camera. The button stays on screen at all times but is disabled and
dimmed outside `ready`, so it never jumps around.

`handleTakePicture()` starts the countdown, but only from `ready`. That's the
job the old `canTakePicture` flag did.

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
  `screen-2026-09-24T20-55-57-190Z-<uuid>.jpg`. Upstream numbered files by
  frame count, which restarted at zero every launch and overwrote earlier
  photos. The random UUID keeps two photos saved in the same millisecond from
  getting the same name.
- `isJpeg()` checks the first 3 bytes of the file (`FF D8 FF`), which every
  JPEG starts with.
- `savePhoto()` creates the folder if needed and writes the file. It refuses to
  overwrite an existing file.
- `isPhotoFileName()` accepts only names that `photoFileName()` could have
  made. It also accepts older photos saved before the UUID was added. Anything
  else, like `../package.json` or `notes.txt`, is rejected. This is what keeps
  the serving route from reading files outside the photo folder.
- `listPhotos()` returns the saved photo names, oldest first. It returns an
  empty list if the folder is missing or can't be read.
- `readPhoto()` returns one photo's bytes, or `null` if the name is invalid or
  the file is gone.

`cameraDir()` carries a `/* turbopackIgnore: true */` comment. The folder is
picked when the server runs, not when it's built. Without the comment,
`next build` can't tell which files the call needs, so it copies the whole
repo into `.next/standalone`, including `.env.local` and any photos in
`data/`.

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

The size limit is checked while the upload is still arriving, so an upload
that doesn't say its size up front still gets cut off at 10 MB.

It doesn't write files itself; it hands that to `photo-store.ts`. That follows
the rule in `app/README.md` that `app/` handles routing only.

### [app/api/photos/[name]/route.ts](../../../app/api/photos/[name]/route.ts)

Sends one saved photo back to the browser (`GET /api/photos/<file name>`) as
`image/jpeg`. Photos are kept in `CAMERA_DIR`, outside `public/`, so Next
won't serve them on its own; this route is the only way to view them. Invalid
names and missing files get **404**. A photo never changes after it's saved,
so the browser is told it can cache it for a year.

### [app/api/gallery/route.ts](../../../app/api/gallery/route.ts)

Builds the gallery's picture list (`GET /api/gallery`). It combines:

- the pictures shipped in `public/gallery/`, as `/gallery/<name>` URLs
- every saved camera photo, as `/api/photos/<name>` URLs

The list is built when requested, not when the app is built. That's why a new
photo shows up without a rebuild or restart.

### [features/scenes/gallery/GalleryScene.tsx](../gallery/GalleryScene.tsx)

The gallery scene. It loads the list once each time it appears, shuffles it,
and shows a 3-column grid; tapping a picture enlarges it. It doesn't treat
camera photos differently from the built-in pictures. They're just URLs that
point at `/api/photos/…`.

A photo taken while the gallery is already open won't appear until the
visitor leaves and returns to it.

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

Publishes the app on `127.0.0.1:3000` only (see
[Who can reach the photo routes](#who-can-reach-the-photo-routes)).

Mounts the `camera-pics` volume at `/app/data/camera-pics`, so photos are kept
when the container is rebuilt or restarted. The volume shows up in Docker as
`luke2_camera-pics`. On Windows with Docker Desktop, its contents can be viewed
in File Explorer at:

```
\\wsl.localhost\docker-desktop\mnt\docker-desktop-disk\data\docker\volumes\luke2_camera-pics\_data
```

Treat that folder as view-only. To get copies instead, run
`docker compose cp web:/app/data/camera-pics ./photos` from the repo root.

### [docker-compose.dev.yml](../../../docker-compose.dev.yml) and [package.json](../../../package.json)

`npm run dev` and `npm start` listen on `127.0.0.1` only. Inside the dev
container, the server has to listen on every interface or Docker can't
forward the port. So the dev compose file runs `next dev -H 0.0.0.0` itself
and publishes the port on the host's `127.0.0.1` only.

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

- the capture button is disabled until the camera's first frame arrives,
  then enabled
- tapping the preview doesn't take a picture
- the full countdown → capture → thank-you → back-to-ready flow, with the
  button disabled until it's over
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
without writing anything. It also checks that oversized uploads get 413, both
when the size is sent up front and when it isn't (the route must stop reading
an endless upload).

### [app/api/photos/[name]/route.test.ts](../../../app/api/photos/[name]/route.test.ts)

Checks that a saved photo comes back as a JPEG, that a missing photo is a 404,
and that other files (`notes.txt`, `../package.json`) are never served.

### [app/api/gallery/route.test.ts](../../../app/api/gallery/route.test.ts)

Checks that the list includes the built-in `public/gallery` pictures and,
after a photo is saved, that photo's `/api/photos/…` URL.

### [GalleryScene.test.tsx](../gallery/GalleryScene.test.tsx)

Covers the gallery side: the loading message, one grid cell per picture once
the list arrives, and enlarging a picture on tap and closing it on a second
tap.

## Who can reach the photo routes

`/api/photos` (upload and viewing) and `/api/gallery` have **no login**. They
rely on the server being reachable only from the kiosk machine itself:

- `docker compose up` publishes on `127.0.0.1:3000`.
- `docker compose -f docker-compose.dev.yml up` publishes on `127.0.0.1:3000`.
- `npm run dev` / `npm start` listen on `127.0.0.1`.

If any of these listened on every network interface, anyone on the same
network could download every visitor's photo or keep uploading until the disk
filled. Since photos are never deleted, keeping the server private is the only
thing preventing that. Don't change these bindings to `0.0.0.0` or remove
`127.0.0.1:` from a port mapping unless you add authentication first.

## Differences from the Processing version

- The countdown shows one word per second. The original drew all three words
  at once for about a frame.
- The thank-you lines (`thankYouText[]`) were written but disabled upstream;
  they're shown during the 1-second hold.
- A capture button below the preview replaces upstream's
  tap-anywhere-to-shoot, and the "Touch to take a picture!" prompt became
  "Take A Picture".
- A heavy sans-serif with a purple outline replaces `ACaslonPro-Regular.otf`, a
  licensed Adobe font, following the camera mockup. The countdown words gained
  periods ("Ready.", "Set.") to match it.
- The preview isn't mirrored, same as the original.

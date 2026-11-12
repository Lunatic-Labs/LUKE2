# Routing & layout configuration only

- `layout.tsx` — root layout, fonts, metadata.
- `page.tsx` — mounts `<KioskShell />` from `@/features/kiosk` with this machine's
  options, read from `OPTIONS_FILE` (default `data/options.txt`) on each page load
  rather than at build time. The kiosk is a
  single full-screen surface that swaps scenes client-side, mirroring the
  original Processing sketch's single window, so there is one route rather than
  a route per scene.
- `globals.css` — Tailwind entry plus the L.U.K.E. palette tokens
  (`--luke-purple`, `--luke-gold`) and the idle-prompt keyframes.

- `api/photos/route.ts` — accepts a JPEG from the camera scene and saves it via
  `@/features/scenes/camera/photo-store` into `CAMERA_DIR` (default
  `data/camera-pics`, the Processing build's `CameraDir`). The camera scene
  only uploads when the visitor taps upload on the snapshot preview card. Each
  upload carries the snapshot's key in the `x-photo-id` and `x-photo-taken-at`
  headers (names in `@/features/scenes/camera/snapshot-headers`). A new
  snapshot gets **201**, and a repeat of one already saved gets **200** with
  `duplicate: true`, writing nothing. Sending only one header, or a malformed
  one, is a **400**. An upload with no key is saved every time, as before.
- `api/photos/[name]/route.ts` — serves one saved photo back as a JPEG, since
  `CAMERA_DIR` is outside `public/`. Only names the photo store generates are
  accepted, so it can't read other files.
- `api/gallery/route.ts` — lists `public/gallery` plus the saved camera photos
  for the gallery scene.
- `api/scores/route.ts` — saves a finished trivia round's `{ tag, score }`
  via `@/features/scenes/trivia/score-store` to `scores.csv` in
  `TRIVIA_SCORES_DIR` (default `data/trivia-scores`), and returns the
  leaderboard. `GET` returns the leaderboard alone.

Business logic does not belong here. When scenes need data from disk (video
playlists, gallery contents, professor records), add route handlers under this
directory and keep the parsing in the owning feature.

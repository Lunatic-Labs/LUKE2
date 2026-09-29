# Routing & layout configuration only

- `layout.tsx` — root layout, fonts, metadata.
- `page.tsx` — mounts `<KioskShell />` from `@/features/kiosk`. The kiosk is a
  single full-screen surface that swaps scenes client-side, mirroring the
  original Processing sketch's single window, so there is one route rather than
  a route per scene.
- `globals.css` — Tailwind entry plus the L.U.K.E. palette tokens
  (`--luke-purple`, `--luke-gold`) and the idle-prompt keyframes.

- `api/photos/route.ts` — accepts a JPEG from the camera scene and saves it via
  `@/features/scenes/camera/photo-store` into `CAMERA_DIR` (default
  `data/camera-pics`, the Processing build's `CameraDir`).
- `api/photos/[name]/route.ts` — serves one saved photo back as a JPEG, since
  `CAMERA_DIR` is outside `public/`. Only names the photo store generates are
  accepted, so it can't read other files.
- `api/gallery/route.ts` — lists `public/gallery` plus the saved camera photos
  for the gallery scene.

Business logic does not belong here. When scenes need data from disk (video
playlists, gallery contents, professor records), add route handlers under this
directory and keep the parsing in the owning feature.

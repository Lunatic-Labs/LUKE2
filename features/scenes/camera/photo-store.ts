import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Server-side storage for kiosk photos.
 *
 * Upstream `CameraScene.Draw()` called `saveFrame(dir + "\\screen####.jpg")`,
 * writing straight into `CameraDir` from `options.txt`. A browser cannot write
 * to disk, so the scene uploads each capture to `app/api/photos` and this
 * module does the write. Server-only: never import it from a client component.
 */

/** Matches `CameraDir=data\\camera-pics` in the Processing build's `options.txt`. */
export const DEFAULT_CAMERA_DIR = "data/camera-pics";

/** A webcam JPEG is a few hundred KB; anything near this is not a photo. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Where photos are written. Override with the `CAMERA_DIR` environment variable. */
export function cameraDir(): string {
  return path.resolve(process.env.CAMERA_DIR || DEFAULT_CAMERA_DIR);
}

/**
 * `screen-<timestamp>.jpg`. Upstream numbered files by `frameCount`, which
 * restarted at zero every launch and overwrote the previous run's photos; a
 * timestamp keeps them unique across restarts and still sorts chronologically.
 */
export function photoFileName(takenAt: Date): string {
  return `screen-${takenAt.toISOString().replace(/[:.]/g, "-")}.jpg`;
}

/** JPEG files open with the SOI marker followed by another marker: FF D8 FF. */
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Write a photo and return its file name. Never overwrites an existing file. */
export async function savePhoto(
  bytes: Uint8Array,
  dir: string = cameraDir(),
  takenAt: Date = new Date(),
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const fileName = photoFileName(takenAt);
  await writeFile(path.join(dir, fileName), bytes, { flag: "wx" });
  return fileName;
}

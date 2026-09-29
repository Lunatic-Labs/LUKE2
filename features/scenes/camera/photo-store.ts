import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
  // The folder is chosen at runtime, so there is nothing for the build to
  // trace; without the hint Turbopack copies the whole repo (photos and
  // `.env.local` included) into the standalone output.
  return path.resolve(/* turbopackIgnore: true */ process.env.CAMERA_DIR || DEFAULT_CAMERA_DIR);
}

/**
 * `screen-<timestamp>-<id>.jpg`. Upstream numbered files by `frameCount`, which
 * restarted at zero every launch and overwrote the previous run's photos; a
 * timestamp keeps them unique across restarts and still sorts chronologically.
 * The timestamp is only millisecond-precise, so the random id keeps two uploads
 * in the same millisecond from landing on the same name.
 */
export function photoFileName(takenAt: Date, id: string = randomUUID()): string {
  return `screen-${takenAt.toISOString().replace(/[:.]/g, "-")}-${id}.jpg`;
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
  id: string = randomUUID(),
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const fileName = photoFileName(takenAt, id);
  await writeFile(path.join(dir, fileName), bytes, { flag: "wx" });
  return fileName;
}

/**
 * Only names `photoFileName` produces. The serving route turns a URL segment
 * into a path, so anything else (`..`, separators, other files) is rejected.
 * The id is optional: photos saved before it was added are named
 * `screen-<timestamp>.jpg` and still belong in the gallery.
 */
const PHOTO_NAME = /^screen-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(-[0-9a-f-]+)?\.jpg$/;

export function isPhotoFileName(name: string): boolean {
  return PHOTO_NAME.test(name);
}

/** Saved photo names, oldest first. An unreadable or missing folder is empty. */
export async function listPhotos(dir: string = cameraDir()): Promise<string[]> {
  try {
    return (await readdir(dir)).filter(isPhotoFileName).sort();
  } catch {
    return [];
  }
}

/** A saved photo's bytes, or null if the name is invalid or the file is gone. */
export async function readPhoto(name: string, dir: string = cameraDir()): Promise<Uint8Array | null> {
  if (!isPhotoFileName(name)) return null;
  try {
    return await readFile(path.join(dir, name));
  } catch {
    return null;
  }
}

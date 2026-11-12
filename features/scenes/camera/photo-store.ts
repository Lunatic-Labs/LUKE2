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
 * How the camera scene names a snapshot: a random v4 UUID it makes when the
 * picture is taken (`crypto.randomUUID()`), plus the time it was taken. Sent
 * with every upload of that snapshot, so a retry carries the same pair.
 */
export interface SnapshotKey {
  id: string;
  takenAt: Date;
}

const SNAPSHOT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Checks the id and time a client sent for a snapshot. Returns null unless
 * the id is a lowercase v4 UUID and the time is an exact ISO 8601 UTC string
 * (what `Date.toISOString()` produces) that makes a name `isPhotoFileName`
 * accepts. That last check rules out years outside 0000–9999, whose names
 * would be saved but never listed in the gallery.
 */
export function parseSnapshotKey(id: string | null, takenAt: string | null): SnapshotKey | null {
  if (!id || !takenAt || !SNAPSHOT_ID.test(id)) return null;
  const date = new Date(takenAt);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== takenAt) return null;
  if (!isPhotoFileName(photoFileName(date, id))) return null;
  return { id, takenAt: date };
}

/**
 * Saves a snapshot at most once. The file name comes entirely from the key,
 * so uploading the same snapshot again lands on the same name, and the
 * exclusive write (`wx`) refuses it atomically, even when two copies arrive
 * at the same moment. `created` is false when the snapshot was already saved;
 * the existing file is left as it is.
 */
export async function saveSnapshotOnce(
  bytes: Uint8Array,
  key: SnapshotKey,
  dir: string = cameraDir(),
): Promise<{ fileName: string; created: boolean }> {
  // Outside the try: `mkdir` also fails with EEXIST when `dir` is a file, and
  // that must surface as an error, not pass for "already saved".
  await mkdir(dir, { recursive: true });
  const fileName = photoFileName(key.takenAt, key.id);
  try {
    await writeFile(path.join(dir, fileName), bytes, { flag: "wx" });
    return { fileName, created: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return { fileName, created: false };
  }
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

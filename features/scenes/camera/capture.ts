/**
 * Browser half of taking a picture: grab the current video frame and send it
 * to `app/api/photos`, which stands in for Processing's `saveFrame()`.
 */

import { PHOTO_ID_HEADER, PHOTO_TAKEN_AT_HEADER } from "./snapshot-headers";

const JPEG_QUALITY = 0.9;

/**
 * The largest capture worth asking the camera for: the screen it will be
 * stretched across. getUserMedia treats `ideal` as a soft preference, so the
 * camera delivers its best profile up to this size — the effective resolution
 * is whichever is lower, the camera's or the screen's.
 */
export function idealCaptureSize(): { width: number; height: number } {
  const width = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const height = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  // Some embedded browsers (and jsdom) report a 0x0 screen; fall back to full HD.
  if (!width || !height) return { width: 1920, height: 1080 };
  return { width, height };
}
/**
 * Draw the video's current frame, at the camera's native resolution, to a JPEG.
 * `filter` is a CSS filter string, the same one the preview shows, so the
 * saved photo looks like what the visitor saw.
 */
export function captureFrame(video: HTMLVideoElement, filter = "none"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) {
    return Promise.reject(new Error("Camera has no frame to capture yet"));
  }
  context.filter = filter;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Identifies one snapshot across uploads: made once when the picture is taken
 * and sent with every upload of it, so the server saves it at most once.
 */
export interface SnapshotKey {
  id: string;
  /** ISO 8601 UTC, from `Date.toISOString()`. */
  takenAt: string;
}

/**
 * A new snapshot's key. `crypto.randomUUID()` needs a secure context, which
 * the camera already requires.
 */
export function newSnapshotKey(takenAt: Date = new Date()): SnapshotKey {
  return { id: crypto.randomUUID(), takenAt: takenAt.toISOString() };
}

/**
 * Sends a snapshot to `/api/photos`. Uploading the same snapshot (same `key`)
 * again is safe: the server answers 200 with the photo it already has
 * instead of saving a copy, and this resolves just as it does on 201.
 */
export async function uploadPhoto(photo: Blob, key: SnapshotKey): Promise<void> {
  const response = await fetch("/api/photos", {
    method: "POST",
    headers: {
      "Content-Type": "image/jpeg",
      [PHOTO_ID_HEADER]: key.id,
      [PHOTO_TAKEN_AT_HEADER]: key.takenAt,
    },
    body: photo,
  });
  if (!response.ok) {
    throw new Error(`Photo upload failed with ${response.status}`);
  }
}

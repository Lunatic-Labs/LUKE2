/**
 * Request headers that identify a snapshot on `POST /api/photos`. Shared by
 * the browser (`capture.ts`) and the route, so it holds no server code.
 *
 * The camera scene makes both values when a picture is taken and sends the
 * same pair on every upload of that snapshot. The route builds the file name
 * from them, so a repeat upload maps to the photo already saved instead of
 * creating a copy.
 */

/** A random v4 UUID, from `crypto.randomUUID()`. */
export const PHOTO_ID_HEADER = "x-photo-id";

/** When the snapshot was taken, from `Date.toISOString()`. */
export const PHOTO_TAKEN_AT_HEADER = "x-photo-taken-at";

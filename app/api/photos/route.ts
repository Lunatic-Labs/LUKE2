import { NextResponse } from "next/server";
import {
  isJpeg,
  MAX_PHOTO_BYTES,
  parseSnapshotKey,
  savePhoto,
  saveSnapshotOnce,
} from "@/features/scenes/camera/photo-store";
import { PHOTO_ID_HEADER, PHOTO_TAKEN_AT_HEADER } from "@/features/scenes/camera/snapshot-headers";

/**
 * Reads the request body, giving up as soon as it grows past `limit` bytes.
 * Content-Length can't be trusted (a chunked request doesn't send one), so the
 * body is counted as it streams in rather than buffered whole and checked after.
 * Returns null when the limit is exceeded.
 */
async function readBody(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Receives a JPEG from the camera scene and saves it to the photo directory.
 *
 * With the snapshot headers, a repeat upload of the same snapshot (say, a
 * retry after a response was lost) is not saved again: it gets 200 and the
 * name of the file already saved, instead of 201 and a new copy. Without
 * them, every upload is saved as a new photo, as before. Sending only one
 * header, or a malformed one, is a 400.
 */
export async function POST(request: Request) {
  const rawId = request.headers.get(PHOTO_ID_HEADER);
  const rawTakenAt = request.headers.get(PHOTO_TAKEN_AT_HEADER);
  const key = rawId === null && rawTakenAt === null ? null : parseSnapshotKey(rawId, rawTakenAt);
  if ((rawId !== null || rawTakenAt !== null) && key === null) {
    return NextResponse.json({ error: "Invalid snapshot id or time" }, { status: 400 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo too large" }, { status: 413 });
  }

  const bytes = await readBody(request, MAX_PHOTO_BYTES);
  if (bytes === null) {
    return NextResponse.json({ error: "Photo too large" }, { status: 413 });
  }
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (!isJpeg(bytes)) {
    return NextResponse.json({ error: "Expected a JPEG" }, { status: 415 });
  }

  if (key) {
    const { fileName, created } = await saveSnapshotOnce(bytes, key);
    return NextResponse.json({ fileName, duplicate: !created }, { status: created ? 201 : 200 });
  }
  const fileName = await savePhoto(bytes);
  return NextResponse.json({ fileName }, { status: 201 });
}

import { NextResponse } from "next/server";
import { isJpeg, MAX_PHOTO_BYTES, savePhoto } from "@/features/scenes/camera/photo-store";

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

/** Receives a JPEG from the camera scene and saves it to the photo directory. */
export async function POST(request: Request) {
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

  const fileName = await savePhoto(bytes);
  return NextResponse.json({ fileName }, { status: 201 });
}

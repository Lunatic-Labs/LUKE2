import { NextResponse } from "next/server";
import { isJpeg, MAX_PHOTO_BYTES, savePhoto } from "@/features/scenes/camera/photo-store";

/** Receives a JPEG from the camera scene and saves it to the photo directory. */
export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo too large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo too large" }, { status: 413 });
  }
  if (!isJpeg(bytes)) {
    return NextResponse.json({ error: "Expected a JPEG" }, { status: 415 });
  }

  const fileName = await savePhoto(bytes);
  return NextResponse.json({ fileName }, { status: 201 });
}

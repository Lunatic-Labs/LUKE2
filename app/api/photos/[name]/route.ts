import { NextResponse } from "next/server";
import { readPhoto } from "@/features/scenes/camera/photo-store";

/**
 * Serves one saved camera photo so the gallery can show it. Photos live in
 * `CAMERA_DIR`, outside `public/`, so Next won't serve them as static files.
 * Like `POST /api/photos` this has no auth and relies on the server only being
 * reachable from localhost (see `docker-compose.yml`).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const bytes = await readPhoto(name);
  if (bytes === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "image/jpeg",
      // A photo's name is unique and it is never rewritten.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

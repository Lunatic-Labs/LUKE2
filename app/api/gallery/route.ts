import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { listPhotos } from "@/features/scenes/camera/photo-store";

/**
 * Lists `public/gallery`, the web equivalent of `readDir(Options.galleryFP)`
 * that `GalleryScene.pde` left as a TODO in favor of a hardcoded picture list,
 * plus the photos the camera scene has saved to `CAMERA_DIR` (served by
 * `app/api/photos/[name]`). `GalleryScene` fetches this to build its grid
 * instead of shipping the filenames at build time, so a new photo shows up on
 * the next visit to the gallery.
 */

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");

async function listGalleryImages(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(GALLERY_DIR);
  } catch {
    return [];
  }

  return entries
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => `/gallery/${encodeURIComponent(name)}`);
}

export async function GET() {
  const [gallery, photos] = await Promise.all([listGalleryImages(), listPhotos()]);
  const images = [...gallery, ...photos.map((name) => `/api/photos/${encodeURIComponent(name)}`)];

  return NextResponse.json({ images });
}

import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Lists `public/gallery`, the web equivalent of `readDir(Options.galleryFP)`
 * that `GalleryScene.pde` left as a TODO in favor of a hardcoded picture list.
 * `GalleryScene` fetches this to build its grid instead of shipping the
 * filenames at build time, so dropping a new photo in the folder is enough.
 */

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");

export async function GET() {
  let entries: string[];
  try {
    entries = await readdir(GALLERY_DIR);
  } catch {
    return NextResponse.json({ images: [] });
  }

  const images = entries
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => `/gallery/${name}`);

  return NextResponse.json({ images });
}

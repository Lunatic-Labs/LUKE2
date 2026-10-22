/**
 * GET /api/videos: the Video Player's playlist.
 *
 * Replaces upstream's readDir.pde: lists the video files in public/videos/,
 * sorted by file name, so adding or removing a video needs no code change.
 * Prefixes like "0_" or "Z_" in file names control the play order.
 *
 * public/videos/ is kept out of Git; each machine has its own copy of the files.
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const VIDEO_DIR = path.join(process.cwd(), "public", "videos");
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".m4v", ".mov"]);

// Read the folder on every request, not once at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await readdir(VIDEO_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => entry.name)
      .sort();
    return NextResponse.json({ files });
  } catch {
    // No folder yet (a fresh clone, say): an empty playlist, not an error page.
    return NextResponse.json({ files: [] });
  }
}
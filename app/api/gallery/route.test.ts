/**
 * @jest-environment node
 */
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { savePhoto } from "@/features/scenes/camera/photo-store";
import { GET } from "./route";

async function listImages() {
  const response = await GET();
  return ((await response.json()) as { images: string[] }).images;
}

describe("GET /api/gallery", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-photos-"));
    process.env.CAMERA_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.CAMERA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("lists the image files in public/gallery", async () => {
    const images = await listImages();

    expect(images).toContain("/gallery/bison.png");
    expect(images.every((src) => src.startsWith("/gallery/"))).toBe(true);
  });

  it("includes photos taken by the camera scene", async () => {
    const name = await savePhoto(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), dir);

    const images = await listImages();

    expect(images).toContain("/gallery/bison.png");
    expect(images).toContain(`/api/photos/${name}`);
  });

  it("lists only image files from public/gallery, URL-encoded and sorted", async () => {
    const shipped = (await listImages()).filter((src) => src.startsWith("/gallery/"));

    for (const src of shipped) {
      expect(src).toMatch(/\.(jpe?g|png|gif|webp)$/i);
      expect(src).toBe(`/gallery/${encodeURIComponent(decodeURIComponent(src.slice(9)))}`);
    }
    expect(shipped).toEqual([...shipped].sort());
  });

  it("only lists camera files named the way the camera saves them", async () => {
    const saved = await savePhoto(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), dir);
    await writeFile(path.join(dir, "notes.txt"), "x");
    await writeFile(path.join(dir, "holiday.jpg"), "x");
    await writeFile(path.join(dir, "screen-not-a-date.jpg"), "x");
    await mkdir(path.join(dir, "screen-2026-01-01T00-00-00-000Z.jpg-dir"));

    const photos = (await listImages()).filter((src) => src.startsWith("/api/photos/"));

    expect(photos).toEqual([`/api/photos/${saved}`]);
  });

  it("lists camera photos oldest first, after the shipped pictures", async () => {
    const newer = await savePhoto(new Uint8Array([0xff, 0xd8, 0xff]), dir, new Date("2026-05-02T00:00:00Z"));
    const older = await savePhoto(new Uint8Array([0xff, 0xd8, 0xff]), dir, new Date("2026-05-01T00:00:00Z"));

    const images = await listImages();
    const firstPhoto = images.findIndex((src) => src.startsWith("/api/photos/"));

    expect(images.slice(firstPhoto)).toEqual([`/api/photos/${older}`, `/api/photos/${newer}`]);
    expect(images.slice(0, firstPhoto).every((src) => src.startsWith("/gallery/"))).toBe(true);
  });

  it("still lists the shipped pictures when the camera folder doesn't exist", async () => {
    process.env.CAMERA_DIR = path.join(dir, "missing");

    const images = await listImages();

    expect(images).toContain("/gallery/bison.png");
    expect(images.some((src) => src.startsWith("/api/photos/"))).toBe(false);
  });

  it("drops a deleted photo from the next listing", async () => {
    const name = await savePhoto(new Uint8Array([0xff, 0xd8, 0xff]), dir);
    expect(await listImages()).toContain(`/api/photos/${name}`);

    await unlink(path.join(dir, name));

    expect(await listImages()).not.toContain(`/api/photos/${name}`);
  });
});

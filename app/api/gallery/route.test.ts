/**
 * @jest-environment node
 */
import { mkdtemp, rm } from "node:fs/promises";
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
});

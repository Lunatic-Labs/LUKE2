/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { savePhoto } from "@/features/scenes/camera/photo-store";
import { GET } from "./route";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function get(name: string) {
  return GET(new Request(`http://localhost/api/photos/${encodeURIComponent(name)}`), {
    params: Promise.resolve({ name }),
  });
}

describe("GET /api/photos/[name]", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-photos-"));
    process.env.CAMERA_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.CAMERA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("serves a saved photo as a JPEG", async () => {
    const name = await savePhoto(JPEG, dir);

    const response = await get(name);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG);
  });

  it("404s for a missing photo", async () => {
    expect((await get("screen-2026-09-24T15-30-05-123Z-abc.jpg")).status).toBe(404);
  });

  it("will not serve files that are not photos", async () => {
    await writeFile(path.join(dir, "notes.txt"), "x");

    expect((await get("notes.txt")).status).toBe(404);
    expect((await get("../package.json")).status).toBe(404);
  });
});

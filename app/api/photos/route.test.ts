/**
 * @jest-environment node
 */
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MAX_PHOTO_BYTES } from "@/features/scenes/camera/photo-store";
import { POST } from "./route";

function post(body: BodyInit) {
  return POST(new Request("http://localhost/api/photos", { method: "POST", body }));
}

describe("POST /api/photos", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-photos-"));
    process.env.CAMERA_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.CAMERA_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("saves a JPEG and returns its file name", async () => {
    const response = await post(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]));

    expect(response.status).toBe(201);
    const { fileName } = await response.json();
    expect(await readdir(dir)).toEqual([fileName]);
  });

  it("rejects an empty body", async () => {
    expect((await post(new Uint8Array())).status).toBe(400);
  });

  it("rejects anything that is not a JPEG", async () => {
    expect((await post(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).status).toBe(415);
    expect(await readdir(dir)).toEqual([]);
  });

  it("rejects an oversized declared Content-Length without reading the body", async () => {
    const request = new Request("http://localhost/api/photos", {
      method: "POST",
      headers: { "content-length": String(MAX_PHOTO_BYTES + 1) },
      body: new Uint8Array([0xff, 0xd8, 0xff]),
    });
    expect((await POST(request)).status).toBe(413);
  });

  it("stops reading a chunked body with no Content-Length once it passes the limit", async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(0xff);
    let chunksSent = 0;
    let cancelled = false;
    // An endless stream: the route must cancel it rather than wait for the end.
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksSent++;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://localhost/api/photos", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);

    expect(request.headers.get("content-length")).toBeNull();
    expect((await POST(request)).status).toBe(413);
    expect(cancelled).toBe(true);
    expect(chunksSent * chunk.byteLength).toBeLessThanOrEqual(MAX_PHOTO_BYTES + 2 * chunk.byteLength);
    expect(await readdir(dir)).toEqual([]);
  });
});

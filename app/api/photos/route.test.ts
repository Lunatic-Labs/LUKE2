/**
 * @jest-environment node
 */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { newSnapshotKey, type SnapshotKey } from "@/features/scenes/camera/capture";
import { MAX_PHOTO_BYTES } from "@/features/scenes/camera/photo-store";
import { PHOTO_ID_HEADER, PHOTO_TAKEN_AT_HEADER } from "@/features/scenes/camera/snapshot-headers";
import { POST } from "./route";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]);

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return POST(new Request("http://localhost/api/photos", { method: "POST", body, headers }));
}

/** Uploads the way the camera scene does, with the snapshot's key in the headers. */
function postSnapshot(key: SnapshotKey, body: BodyInit = JPEG) {
  return post(body, { [PHOTO_ID_HEADER]: key.id, [PHOTO_TAKEN_AT_HEADER]: key.takenAt });
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

  describe("duplicate uploads of one snapshot", () => {
    it("saves the first upload and answers a repeat with the same file, unsaved", async () => {
      const key = newSnapshotKey();

      const first = await postSnapshot(key);
      const repeat = await postSnapshot(key);

      expect(first.status).toBe(201);
      expect(repeat.status).toBe(200);
      const saved = await first.json();
      expect(await repeat.json()).toEqual({ fileName: saved.fileName, duplicate: true });
      expect(await readdir(dir)).toEqual([saved.fileName]);
      expect(saved.fileName).toContain(key.id);
    });

    it("keeps the first copy when a repeat carries different bytes", async () => {
      const key = newSnapshotKey();
      await postSnapshot(key);

      await postSnapshot(key, new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 9, 9]));

      const [fileName] = await readdir(dir);
      expect(new Uint8Array(await readFile(path.join(dir, fileName)))).toEqual(JPEG);
    });

    it("saves one copy when the same snapshot is sent several times at once", async () => {
      const key = newSnapshotKey();

      const responses = await Promise.all(Array.from({ length: 5 }, () => postSnapshot(key)));

      expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 200, 200, 201]);
      expect(await readdir(dir)).toHaveLength(1);
    });

    it("saves different snapshots separately", async () => {
      expect((await postSnapshot(newSnapshotKey())).status).toBe(201);
      expect((await postSnapshot(newSnapshotKey())).status).toBe(201);
      expect(await readdir(dir)).toHaveLength(2);
    });

    it.each([
      ["only an id", { [PHOTO_ID_HEADER]: "6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d" }],
      ["only a time", { [PHOTO_TAKEN_AT_HEADER]: "2026-11-12T15:30:05.123Z" }],
      [
        "an id that is not a UUID",
        { [PHOTO_ID_HEADER]: "../../x", [PHOTO_TAKEN_AT_HEADER]: "2026-11-12T15:30:05.123Z" },
      ],
      [
        "a malformed time",
        { [PHOTO_ID_HEADER]: "6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d", [PHOTO_TAKEN_AT_HEADER]: "soon" },
      ],
    ])("rejects %s with 400, saving nothing", async (_, headers) => {
      expect((await post(JPEG, headers)).status).toBe(400);
      expect(await readdir(dir)).toEqual([]);
    });

    it("still saves every upload that has no snapshot key, as before", async () => {
      expect((await post(JPEG)).status).toBe(201);
      expect((await post(JPEG)).status).toBe(201);
      expect(await readdir(dir)).toHaveLength(2);
    });
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

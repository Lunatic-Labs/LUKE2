/**
 * @jest-environment node
 */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cameraDir, isJpeg, photoFileName, savePhoto } from "./photo-store";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

describe("photo-store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-photos-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    delete process.env.CAMERA_DIR;
  });

  it("names files by timestamp and id with no characters Windows rejects", () => {
    expect(photoFileName(new Date("2026-09-24T15:30:05.123Z"), "abc")).toBe("screen-2026-09-24T15-30-05-123Z-abc.jpg");
  });

  it("gives photos taken in the same millisecond different names", () => {
    const takenAt = new Date("2026-09-24T15:30:05.123Z");
    expect(photoFileName(takenAt)).toMatch(/^screen-2026-09-24T15-30-05-123Z-[0-9a-f-]{36}\.jpg$/);
    expect(photoFileName(takenAt)).not.toBe(photoFileName(takenAt));
  });

  it("recognises JPEGs by their SOI marker", () => {
    expect(isJpeg(JPEG)).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });

  it("defaults to data/camera-pics and honours CAMERA_DIR", () => {
    expect(cameraDir()).toBe(path.resolve("data/camera-pics"));
    process.env.CAMERA_DIR = dir;
    expect(cameraDir()).toBe(path.resolve(dir));
  });

  it("writes the photo, creating the directory if needed", async () => {
    const target = path.join(dir, "nested");
    const takenAt = new Date("2026-09-24T15:30:05.123Z");

    const fileName = await savePhoto(JPEG, target, takenAt, "abc");

    expect(fileName).toBe(photoFileName(takenAt, "abc"));
    expect(new Uint8Array(await readFile(path.join(target, fileName)))).toEqual(JPEG);
  });

  it("saves concurrent uploads from the same millisecond as separate files", async () => {
    const takenAt = new Date();
    const names = await Promise.all([savePhoto(JPEG, dir, takenAt), savePhoto(JPEG, dir, takenAt)]);

    expect(names[0]).not.toBe(names[1]);
    expect((await readdir(dir)).sort()).toEqual([...names].sort());
  });

  it("refuses to overwrite an existing photo", async () => {
    const takenAt = new Date();
    await savePhoto(JPEG, dir, takenAt, "abc");

    await expect(savePhoto(JPEG, dir, takenAt, "abc")).rejects.toThrow();
    expect(await readdir(dir)).toHaveLength(1);
  });
});

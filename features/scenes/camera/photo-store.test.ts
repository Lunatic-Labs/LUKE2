/**
 * @jest-environment node
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  cameraDir,
  isJpeg,
  isPhotoFileName,
  listPhotos,
  parseSnapshotKey,
  photoFileName,
  readPhoto,
  savePhoto,
  saveSnapshotOnce,
} from "./photo-store";

// The real writeFile, wrapped so one test can make a single write fail. A
// jest.spyOn on the module object doesn't reach the binding photo-store
// imports, so the mock has to replace the module.
jest.mock("node:fs/promises", () => {
  const actual = jest.requireActual("node:fs/promises");
  return { ...actual, writeFile: jest.fn(actual.writeFile) };
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const ID = "6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d";
const TAKEN_AT = "2026-11-12T15:30:05.123Z";

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

  it("accepts only names photoFileName produces", () => {
    expect(isPhotoFileName(photoFileName(new Date()))).toBe(true);
    expect(isPhotoFileName("screen-2026-09-24T20-59-33-269Z.jpg")).toBe(true);
    expect(isPhotoFileName("../secret.jpg")).toBe(false);
    expect(isPhotoFileName("screen-1-a/../../x.jpg")).toBe(false);
    expect(isPhotoFileName("notes.txt")).toBe(false);
  });

  it("lists saved photos oldest first, ignoring other files", async () => {
    const later = await savePhoto(JPEG, dir, new Date("2026-09-25T00:00:00.000Z"), "b");
    const earlier = await savePhoto(JPEG, dir, new Date("2026-09-24T00:00:00.000Z"), "a");
    await writeFile(path.join(dir, "notes.txt"), "x");

    expect(await listPhotos(dir)).toEqual([earlier, later]);
    expect(await listPhotos(path.join(dir, "missing"))).toEqual([]);
  });

  describe("snapshot keys", () => {
    it("accepts a v4 UUID with an exact ISO UTC time", () => {
      expect(parseSnapshotKey(ID, TAKEN_AT)).toEqual({ id: ID, takenAt: new Date(TAKEN_AT) });
    });

    it.each([
      ["a missing id", null, TAKEN_AT],
      ["a missing time", ID, null],
      ["an id that is not a UUID", "abc", TAKEN_AT],
      ["an uppercase UUID", ID.toUpperCase(), TAKEN_AT],
      ["a UUID that is not v4", "6f1c2b9e-3d4a-1f5b-8c6d-7e8f9a0b1c2d", TAKEN_AT],
      ["a path in the id", "../../package.json", TAKEN_AT],
      ["a time that is not a date", ID, "yesterday"],
      ["a time not in toISOString form", ID, "2026-11-12"],
      ["a time with an offset", ID, "2026-11-12T15:30:05.123+01:00"],
      ["a year past 9999", ID, "+275760-09-13T00:00:00.000Z"],
    ])("rejects %s", (_, id, takenAt) => {
      expect(parseSnapshotKey(id, takenAt)).toBeNull();
    });

    it("saves a snapshot once, and reports a repeat without writing it again", async () => {
      const key = parseSnapshotKey(ID, TAKEN_AT)!;

      const first = await saveSnapshotOnce(JPEG, key, dir);
      const repeat = await saveSnapshotOnce(new Uint8Array([0xff, 0xd8, 0xff, 9]), key, dir);

      expect(first).toEqual({ fileName: photoFileName(key.takenAt, ID), created: true });
      expect(repeat).toEqual({ fileName: first.fileName, created: false });
      expect(await readdir(dir)).toEqual([first.fileName]);
      // The repeat never touches the saved file.
      expect(new Uint8Array(await readFile(path.join(dir, first.fileName)))).toEqual(JPEG);
    });

    it("saves only one copy when the same snapshot arrives twice at once", async () => {
      const key = parseSnapshotKey(ID, TAKEN_AT)!;

      const results = await Promise.all(Array.from({ length: 5 }, () => saveSnapshotOnce(JPEG, key, dir)));

      expect(results.filter((result) => result.created)).toHaveLength(1);
      expect(new Set(results.map((result) => result.fileName)).size).toBe(1);
      expect(await readdir(dir)).toHaveLength(1);
    });

    it("saves different snapshots taken at the same moment separately", async () => {
      const a = await saveSnapshotOnce(JPEG, parseSnapshotKey(ID, TAKEN_AT)!, dir);
      const b = await saveSnapshotOnce(JPEG, parseSnapshotKey("0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d", TAKEN_AT)!, dir);

      expect(a.created && b.created).toBe(true);
      expect(await listPhotos(dir)).toHaveLength(2);
    });

    it("passes on errors other than the file already existing", async () => {
      const file = path.join(dir, "not-a-folder");
      await writeFile(file, "x");

      await expect(saveSnapshotOnce(JPEG, parseSnapshotKey(ID, TAKEN_AT)!, file)).rejects.toThrow();
    });

    it("reports a failed write (e.g. a full disk) as an error, not as already saved", async () => {
      const diskFull = Object.assign(new Error("no space left on device"), { code: "ENOSPC" });
      jest.mocked(writeFile).mockRejectedValueOnce(diskFull);

      await expect(saveSnapshotOnce(JPEG, parseSnapshotKey(ID, TAKEN_AT)!, dir)).rejects.toBe(diskFull);
      expect(await readdir(dir)).toEqual([]);
    });
  });

  it("reads a saved photo and refuses anything else", async () => {
    const name = await savePhoto(JPEG, dir);
    await writeFile(path.join(dir, "notes.txt"), "x");

    expect(new Uint8Array((await readPhoto(name, dir))!)).toEqual(JPEG);
    expect(await readPhoto("notes.txt", dir)).toBeNull();
    expect(await readPhoto(photoFileName(new Date()), dir)).toBeNull();
  });
});

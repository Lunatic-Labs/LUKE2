import { newSnapshotKey, uploadPhoto } from "./capture";
import { PHOTO_ID_HEADER, PHOTO_TAKEN_AT_HEADER } from "./snapshot-headers";

describe("newSnapshotKey", () => {
  it("makes a v4 UUID and an ISO time the server will accept", () => {
    const key = newSnapshotKey(new Date("2026-11-12T15:30:05.123Z"));

    expect(key.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(key.takenAt).toBe("2026-11-12T15:30:05.123Z");
  });

  it("never repeats an id", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newSnapshotKey().id));
    expect(ids.size).toBe(100);
  });
});

describe("uploadPhoto", () => {
  const key = { id: "6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d", takenAt: "2026-11-12T15:30:05.123Z" };
  const photo = new Blob(["jpeg"], { type: "image/jpeg" });
  // jsdom has no fetch or Response; uploadPhoto only reads `ok` and `status`.
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it("sends the photo with its snapshot key in the headers", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201 });

    await uploadPhoto(photo, key);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/photos");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(photo);
    expect(init.headers).toMatchObject({
      "Content-Type": "image/jpeg",
      [PHOTO_ID_HEADER]: key.id,
      [PHOTO_TAKEN_AT_HEADER]: key.takenAt,
    });
  });

  it("treats the server's already-saved answer (200) as success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await expect(uploadPhoto(photo, key)).resolves.toBeUndefined();
  });

  it("rejects when the server refuses the upload", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(uploadPhoto(photo, key)).rejects.toThrow("500");
  });
});

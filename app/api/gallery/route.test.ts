/**
 * @jest-environment node
 */
import { GET } from "./route";

describe("GET /api/gallery", () => {
  it("lists the image files in public/gallery", async () => {
    const response = await GET();
    const body = (await response.json()) as { images: string[] };

    expect(Array.isArray(body.images)).toBe(true);
    expect(body.images.length).toBeGreaterThan(0);
    expect(body.images).toContain("/gallery/bison.png");
    expect(body.images.every((src) => src.startsWith("/gallery/"))).toBe(true);
  });
});

import { wrapIndex } from "./wrapIndex";

describe("wrapIndex", () => {
  // The success criteria from the hypothesis, before any code was written.
  it("moves forward one step", () => {
    expect(wrapIndex(0, 1, 8)).toBe(1);
  });

  it("wraps forward past the end", () => {
    expect(wrapIndex(7, 1, 8)).toBe(0);
  });

  it("wraps backward past the start", () => {
    expect(wrapIndex(0, -1, 8)).toBe(7);
  });

  it("handles a backward leap bigger than the list (the old formula gave -2)", () => {
    expect(wrapIndex(0, -10, 8)).toBe(6);
  });

  it("returns -1 for an empty list instead of NaN or an error", () => {
    expect(wrapIndex(0, 1, 0)).toBe(-1);
  });

  // Extra edge cases.
  it("handles a forward leap bigger than the list", () => {
    expect(wrapIndex(3, 21, 8)).toBe(0);
  });

  it("lands on 0, not -0, for an exact multiple backward", () => {
    expect(Object.is(wrapIndex(0, -16, 8), 0)).toBe(true);
  });

  it("always returns 0 for a one-item list", () => {
    expect(wrapIndex(0, 1, 1)).toBe(0);
    expect(wrapIndex(0, -5, 1)).toBe(0);
  });

  it("returns -1 for a negative count", () => {
    expect(wrapIndex(0, 1, -3)).toBe(-1);
  });
});
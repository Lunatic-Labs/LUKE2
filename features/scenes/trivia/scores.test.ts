import { QUESTION_SECONDS, ROUND_LENGTH, scoreForAnswer } from "./engagement";
import { buildLeaderboard, isValidScore, isValidTag, MAX_SCORE } from "./scores";

describe("isValidTag", () => {
  it("accepts exactly three capital letters", () => {
    expect(isValidTag("TST")).toBe(true);
    expect(isValidTag("ABC")).toBe(true);
    expect(isValidTag("ZZZ")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const tag of ["", "  ", "AB", "ABCD", "A B", "AB1", "AB-", "ÄBC", " AB", "abc", "Tst", "tST", 123, null, undefined]) {
      expect(isValidTag(tag)).toBe(false);
    }
  });
});

describe("isValidScore", () => {
  it("accepts whole numbers from 0 up to a perfect round", () => {
    expect(MAX_SCORE).toBe(ROUND_LENGTH * scoreForAnswer(QUESTION_SECONDS));
    expect(isValidScore(0)).toBe(true);
    expect(isValidScore(100)).toBe(true);
    expect(isValidScore(MAX_SCORE)).toBe(true);
  });

  it("rejects scores no round can produce", () => {
    for (const score of [-1, 1.5, MAX_SCORE + 1, NaN, Infinity, "100", null]) {
      expect(isValidScore(score)).toBe(false);
    }
  });
});

describe("buildLeaderboard", () => {
  const entries = [
    { tag: "AAA", score: 200 },
    { tag: "BBB", score: 500 },
    { tag: "CCC", score: 200 },
    { tag: "DDD", score: 100 },
  ];

  it("lists the top scores, highest first, earlier scores first on a tie", () => {
    expect(buildLeaderboard(entries, 3).scores).toEqual([
      { tag: "BBB", score: 500 },
      { tag: "AAA", score: 200 },
      { tag: "CCC", score: 200 },
    ]);
  });

  it("marks where the score just saved landed, or null if it missed the board", () => {
    expect(buildLeaderboard(entries, 3, 2).yours).toBe(2);
    expect(buildLeaderboard(entries, 3, 3).yours).toBeNull();
    expect(buildLeaderboard(entries, 3).yours).toBeNull();
  });

  it("handles an empty table", () => {
    expect(buildLeaderboard([])).toEqual({ scores: [], yours: null });
  });
});

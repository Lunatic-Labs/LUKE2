/**
 * @jest-environment node
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_SCORES_DIR,
  readScores,
  saveScore,
  saveScoreAndRead,
  SCORES_FILE,
  scoresDir,
} from "./score-store";

describe("score-store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-scores-"));
  });

  afterEach(async () => {
    delete process.env.TRIVIA_SCORES_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a tag,score table, creating the folder and header the first time", async () => {
    const nested = path.join(dir, "not-yet-there");

    await saveScore({ tag: "TST", score: 100 }, nested);
    await saveScore({ tag: "ABC", score: 1135 }, nested);

    expect(await readFile(path.join(nested, SCORES_FILE), "utf8")).toBe("tag,score\nTST,100\nABC,1135\n");
  });

  it("reads scores back in the order saved", async () => {
    await saveScore({ tag: "TST", score: 100 }, dir);
    await saveScore({ tag: "XYZ", score: 300 }, dir);

    expect(await readScores(dir)).toEqual([
      { tag: "TST", score: 100 },
      { tag: "XYZ", score: 300 },
    ]);
  });

  it("saves and reads back with the new score at the returned index, even when saves overlap", async () => {
    const results = await Promise.all([
      saveScoreAndRead({ tag: "AAA", score: 100 }, dir),
      saveScore({ tag: "BBB", score: 200 }, dir),
      saveScoreAndRead({ tag: "CCC", score: 300 }, dir),
    ]);

    expect(results[0]).toEqual({ entries: [{ tag: "AAA", score: 100 }], index: 0 });
    expect(results[2]).toEqual({
      entries: [
        { tag: "AAA", score: 100 },
        { tag: "BBB", score: 200 },
        { tag: "CCC", score: 300 },
      ],
      index: 2,
    });
  });

  it("keeps saving after a refused score", async () => {
    await expect(saveScoreAndRead({ tag: "T1T", score: 100 }, dir)).rejects.toThrow();

    expect(await saveScoreAndRead({ tag: "TST", score: 100 }, dir)).toEqual({
      entries: [{ tag: "TST", score: 100 }],
      index: 0,
    });
  });

  it("refuses an invalid tag or score instead of writing it", async () => {
    await expect(saveScore({ tag: "T1T", score: 100 }, dir)).rejects.toThrow();
    await expect(saveScore({ tag: "TS", score: 100 }, dir)).rejects.toThrow();
    await expect(saveScore({ tag: "tst", score: 100 }, dir)).rejects.toThrow();
    await expect(saveScore({ tag: "TST", score: -1 }, dir)).rejects.toThrow();
    await expect(saveScore({ tag: "TST", score: 1.5 }, dir)).rejects.toThrow();

    expect(await readScores(dir)).toEqual([]);
  });

  it("treats a missing table as empty", async () => {
    expect(await readScores(path.join(dir, "nothing-here"))).toEqual([]);
  });

  it("skips damaged rows but keeps the rest, including old scores above today's maximum", async () => {
    await writeFile(
      path.join(dir, SCORES_FILE),
      "tag,score\r\nTST,100\r\nbroken row\r\nTOOLONG,5\r\nAB,5\r\nlow,5\r\nBIG,999999\r\n\r\n",
    );

    expect(await readScores(dir)).toEqual([
      { tag: "TST", score: 100 },
      { tag: "BIG", score: 999999 },
    ]);
  });

  it("saves to TRIVIA_SCORES_DIR when it's set, data/trivia-scores otherwise", () => {
    expect(scoresDir()).toBe(path.resolve(DEFAULT_SCORES_DIR));
    process.env.TRIVIA_SCORES_DIR = dir;
    expect(scoresDir()).toBe(path.resolve(dir));
  });
});

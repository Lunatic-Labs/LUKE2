/**
 * @jest-environment node
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SCORES_FILE } from "@/features/scenes/trivia/score-store";
import { GET, POST } from "./route";

function post(body: string) {
  return POST(
    new Request("http://localhost/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

describe("/api/scores", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "luke-scores-"));
    process.env.TRIVIA_SCORES_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.TRIVIA_SCORES_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("saves a score to the table and returns the board with it marked", async () => {
    await post(JSON.stringify({ tag: "TST", score: 300 }));
    const response = await post(JSON.stringify({ tag: "TST", score: 100 }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      scores: [
        { tag: "TST", score: 300 },
        { tag: "TST", score: 100 },
      ],
      yours: 1,
    });
    expect(await readFile(path.join(dir, SCORES_FILE), "utf8")).toBe("tag,score\nTST,300\nTST,100\n");
  });

  it("returns the current board on GET, empty before any scores", async () => {
    expect(await (await GET()).json()).toEqual({ scores: [], yours: null });

    await post(JSON.stringify({ tag: "ABC", score: 500 }));
    expect(await (await GET()).json()).toEqual({ scores: [{ tag: "ABC", score: 500 }], yours: null });
  });

  it.each([
    ["a tag with a digit", { tag: "T5T", score: 100 }],
    ["a blank tag", { tag: "   ", score: 100 }],
    ["a two-letter tag", { tag: "TS", score: 100 }],
    ["a lowercase tag", { tag: "tst", score: 100 }],
    ["a mixed-case tag", { tag: "Tst", score: 100 }],
    ["a missing tag", { score: 100 }],
    ["a negative score", { tag: "TST", score: -5 }],
    ["an impossible score", { tag: "TST", score: 1_000_000 }],
    ["a score sent as text", { tag: "TST", score: "100" }],
  ])("rejects %s without saving it", async (_, body) => {
    const response = await post(JSON.stringify(body));

    expect(response.status).toBe(400);
    expect(await (await GET()).json()).toEqual({ scores: [], yours: null });
  });

  it("rejects a body that isn't JSON", async () => {
    expect((await post("tag=TST&score=100")).status).toBe(400);
    expect((await post("null")).status).toBe(400);
  });

  it("rejects an oversized body", async () => {
    expect((await post(JSON.stringify({ tag: "TST", score: 100, padding: "x".repeat(2000) }))).status).toBe(413);
  });
});

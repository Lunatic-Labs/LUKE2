import { NextResponse } from "next/server";
import { readScores, saveScoreAndRead } from "@/features/scenes/trivia/score-store";
import { buildLeaderboard, isValidScore, isValidTag } from "@/features/scenes/trivia/scores";

/** `{"tag":"TST","score":9125}` is about 30 bytes; anything near this isn't a score. */
const MAX_BODY_BYTES = 1024;

/** The current leaderboard. */
export async function GET() {
  return NextResponse.json(buildLeaderboard(await readScores()));
}

/**
 * Saves a finished round's score, sent as `{ tag, score }` JSON, and returns
 * the updated leaderboard with the new score's position marked.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
  }

  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "Body too large" }, { status: 413 });
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  }

  let body: { tag?: unknown; score?: unknown };
  try {
    body = JSON.parse(text) ?? {};
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const { tag, score } = body;
  if (!isValidTag(tag)) {
    return NextResponse.json({ error: "Tag must be exactly three capital letters (A-Z)" }, { status: 400 });
  }
  if (!isValidScore(score)) {
    return NextResponse.json({ error: "Score is not one a round can produce" }, { status: 400 });
  }

  const { entries, index } = await saveScoreAndRead({ tag, score });
  return NextResponse.json(buildLeaderboard(entries, undefined, index), { status: 201 });
}

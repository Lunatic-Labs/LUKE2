import { NextResponse } from "next/server";
import { readScores, saveScore } from "@/features/scenes/trivia/score-store";
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

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Body too large" }, { status: 413 });
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

  await saveScore({ tag, score });
  const entries = await readScores();
  // The score just saved is the table's last row.
  return NextResponse.json(buildLeaderboard(entries, undefined, entries.length - 1), { status: 201 });
}

/**
 * Saved trivia scores: the rules both sides share, and the browser's call to
 * save one.
 *
 * Upstream kept a six-entry leaderboard in memory, seeded with made-up
 * scores, and lost it whenever the sketch closed. Here every finished round is
 * saved through `app/api/scores` to a table on disk (see `score-store.ts`),
 * and the leaderboard is the top of that table. Safe to import on the client;
 * the file access is in `score-store.ts`, which is server-only.
 */

import { QUESTION_SECONDS, ROUND_LENGTH, scoreForAnswer } from "./engagement";

/** A saved score: a three-letter tag and the points scored. */
export interface ScoreEntry {
  tag: string;
  score: number;
}

export interface Leaderboard {
  /** The top scores, highest first. */
  scores: ScoreEntry[];
  /** Where the score just saved sits in `scores`, or null if it didn't make it. */
  yours: number | null;
}

/** Saved with every score until visitors can enter their own tag. */
export const DEFAULT_TAG = "TST";

/** How many scores the end screen shows. */
export const LEADERBOARD_SIZE = 5;

/** Every question answered correctly the instant it appears. */
export const MAX_SCORE = ROUND_LENGTH * scoreForAnswer(QUESTION_SECONDS);

/** Exactly three capital letters, A-Z. */
export function isValidTag(tag: unknown): tag is string {
  return typeof tag === "string" && /^[A-Z]{3}$/.test(tag);
}

/** A whole number a round could actually produce, from 0 to `MAX_SCORE`. */
export function isValidScore(score: unknown): score is number {
  return typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= MAX_SCORE;
}

/**
 * The top `size` scores, highest first. Equal scores keep the order they were
 * saved in, so an earlier score stays above a later one that ties it.
 * `yoursAt` is the index in `entries` of the score just saved, if any.
 */
export function buildLeaderboard(
  entries: ScoreEntry[],
  size: number = LEADERBOARD_SIZE,
  yoursAt?: number,
): Leaderboard {
  const top = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || a.index - b.index)
    .slice(0, size);
  const yours = top.findIndex(({ index }) => index === yoursAt);
  return { scores: top.map(({ entry }) => entry), yours: yours === -1 ? null : yours };
}

/** The current leaderboard, for the leader board screen. */
export async function fetchLeaderboard(): Promise<Leaderboard> {
  const response = await fetch("/api/scores");
  if (!response.ok) {
    throw new Error(`Loading the leaderboard failed with ${response.status}`);
  }
  return response.json();
}

/** Saves a finished round's score and returns the updated leaderboard. */
export async function submitScore(entry: ScoreEntry): Promise<Leaderboard> {
  const response = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error(`Saving the score failed with ${response.status}`);
  }
  return response.json();
}

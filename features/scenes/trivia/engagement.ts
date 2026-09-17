/**
 * Trivia round logic.
 *
 * Ported from `TriviaEngagement.pde`'s `Engagement` class and the round-building
 * and scoring logic embedded in `TriviaScene.pde` (`shuffleEngagements()`,
 * `Enable()`, `moveToNextEngagement()`, `DrawScore()`). `TriviaGameManager.pde`'s
 * `Game` class is dead code upstream — nothing ever constructs one — so it has
 * no counterpart here.
 */

import type { TriviaQuestion } from "./questions";

export interface Engagement {
  prompt: string;
  /** Shuffled response order. */
  responses: string[];
  correctIndex: number;
  correctResponse: string;
}

/** Fisher-Yates, returning a new array so callers can't mutate a shared source. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds one Engagement, response order shuffled the way the `Engagement`
 * constructor did — `responses[0]` in is always the correct answer, but callers
 * never see which slot it landed in without checking `correctIndex`.
 */
export function createEngagement(prompt: string, responses: string[]): Engagement {
  const correctResponse = responses[0];
  const shuffled = shuffle(responses);
  return {
    prompt,
    responses: shuffled,
    correctIndex: shuffled.indexOf(correctResponse),
    correctResponse,
  };
}

/**
 * One round's five questions, in the order they'll be asked.
 *
 * `TriviaScene.Enable()` reshuffled the full bank and always took the first
 * five, rather than sampling — kept here so replays don't repeat a question
 * back to back only by chance.
 */
export function pickRound(bank: TriviaQuestion[], count = 5): Engagement[] {
  return shuffle(bank)
    .slice(0, count)
    .map((question) => createEngagement(question.prompt, question.responses));
}

/**
 * Points for answering with `secondsRemaining` left on the clock.
 * `DrawButtons`/`moveToNextEngagement`: `score += (time * 69) + 100`.
 */
export function scoreForAnswer(secondsRemaining: number): number {
  return secondsRemaining * 69 + 100;
}

export const DEFAULT_LEADERBOARD = [0, 2560, 2580, 3000, 5620, 7500];

/**
 * Slots a finished score into the board and re-sorts it.
 * `moveToNextEngagement()`: `leaderboard[0] = score; Arrays.sort(leaderboard);`
 * — the smallest entry is always the one overwritten, session to session.
 */
export function updateLeaderboard(board: number[], score: number): number[] {
  const next = [...board];
  next[0] = score;
  next.sort((a, b) => a - b);
  return next;
}

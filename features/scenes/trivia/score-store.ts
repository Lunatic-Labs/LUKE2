import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidScore, isValidTag, type ScoreEntry } from "./scores";

/**
 * Server-side storage for trivia scores.
 *
 * Every finished round is one row of a CSV table, `scores.csv`, with a
 * `tag,score` header, in the scores directory. The browser can't write to
 * disk, so the scene posts each score to `app/api/scores` and this module
 * does the write, the same way `camera/photo-store.ts` saves photos.
 * Server-only: never import it from a client component.
 */

/** Next to the camera's `data/camera-pics`, and gitignored with it. */
export const DEFAULT_SCORES_DIR = "data/trivia-scores";

export const SCORES_FILE = "scores.csv";

const HEADER = "tag,score\n";

/** Where scores are saved. Override with the `TRIVIA_SCORES_DIR` environment variable. */
export function scoresDir(): string {
  // Chosen at runtime, so there is nothing for the build to trace; see
  // `cameraDir()` for why the hint matters.
  return path.resolve(/* turbopackIgnore: true */ process.env.TRIVIA_SCORES_DIR || DEFAULT_SCORES_DIR);
}

/**
 * Writes to the table run one at a time, each starting after the last
 * finishes, so a save and the read that follows it can't have another save
 * land between them. One queue for the process is enough: the kiosk runs a
 * single server.
 */
let writes: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const result = writes.then(task, task);
  writes = result.catch(() => {});
  return result;
}

/**
 * Adds a score as the table's last row, creating the folder and the file
 * (with its header) the first time. Throws on an invalid tag or score, so
 * nothing but `tag,score` rows ever reaches the file.
 */
export function saveScore(entry: ScoreEntry, dir: string = scoresDir()): Promise<void> {
  return serialized(() => appendScore(entry, dir));
}

/**
 * Saves a score and reads the table back with no other save in between, so
 * the new score is known to be the last entry, at `index`.
 */
export function saveScoreAndRead(
  entry: ScoreEntry,
  dir: string = scoresDir(),
): Promise<{ entries: ScoreEntry[]; index: number }> {
  return serialized(async () => {
    await appendScore(entry, dir);
    const entries = await readScores(dir);
    return { entries, index: entries.length - 1 };
  });
}

async function appendScore(entry: ScoreEntry, dir: string): Promise<void> {
  if (!isValidTag(entry.tag) || !isValidScore(entry.score)) {
    throw new Error("Invalid score entry");
  }

  await mkdir(dir, { recursive: true });
  const file = path.join(dir, SCORES_FILE);
  try {
    await writeFile(file, HEADER, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  await appendFile(file, `${entry.tag},${entry.score}\n`);
}

/**
 * Every saved score, in the order saved. A missing file is an empty table.
 * Rows that aren't a valid tag and a whole number, such as the header or a
 * line damaged by hand-editing, are skipped. Scores above today's maximum
 * are kept, so changing the timer later doesn't drop old scores.
 */
export async function readScores(dir: string = scoresDir()): Promise<ScoreEntry[]> {
  let text: string;
  try {
    text = await readFile(path.join(dir, SCORES_FILE), "utf8");
  } catch {
    return [];
  }

  const entries: ScoreEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z]{3}),(\d+)$/.exec(line.trim());
    if (match) entries.push({ tag: match[1], score: Number(match[2]) });
  }
  return entries;
}

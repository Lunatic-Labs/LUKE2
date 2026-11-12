import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_OPTIONS, parseOptions, type KioskOptions } from "./options";

/**
 * Reads this machine's `options.txt`, as `Options.pde` did at startup.
 *
 * Every kiosk runs the same build, so what differs between machines (such as
 * `KioskId`) has to come from a file outside it. Server-only: never import it
 * from a client component, which is why it stays out of the `index.ts` barrel.
 */

/** Matches `data/options.txt` in the Processing build. */
export const DEFAULT_OPTIONS_FILE = "data/options.txt";

/** Where the options are read from. Override with the `OPTIONS_FILE` environment variable. */
export function optionsFilePath(): string {
  // The path is chosen at runtime, so there is nothing for the build to trace;
  // without this hint and the one in loadOptions, Turbopack copies the whole repo
  // into the standalone output.
  return path.resolve(/* turbopackIgnore: true */ process.env.OPTIONS_FILE || DEFAULT_OPTIONS_FILE);
}

/**
 * This machine's options. No file is normal and means the defaults. A file that
 * can't be read warns and also means the defaults: a bad options file shouldn't
 * stop the kiosk from starting.
 */
export async function loadOptions(): Promise<KioskOptions> {
  const file = optionsFilePath();
  try {
    return parseOptions(await readFile(/* turbopackIgnore: true */ file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${file}; using the default options.`, error);
    }
    return DEFAULT_OPTIONS;
  }
}

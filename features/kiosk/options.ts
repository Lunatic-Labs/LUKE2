/**
 * Kiosk configuration.
 *
 * Ported from `src/luke_java/Options.pde` + `data/options.txt`, which read a
 * flat `key=value` file at startup and derived a few values from it. The file
 * format is kept so an existing `options.txt` can be dropped in unchanged, but
 * the defaults below are the source of truth when no file is supplied.
 */

export interface KioskOptions {
  /** Full-viewport mode. The Processing build sized a window; the web build sizes to the viewport. */
  isFullscreen: boolean;
  screenWidth: number;
  screenHeight: number;
  /**
   * Seconds a scene may sit untouched before the carousel advances.
   * `DisplayManager.Draw()` used a hard-coded 30.
   */
  sceneIdleSeconds: number;
  /**
   * Seconds before the session is abandoned outright and the idle screen returns.
   * `DisplayManager.Draw()` used a hard-coded 60.
   */
  sessionIdleSeconds: number;
}

export const DEFAULT_OPTIONS: KioskOptions = {
  isFullscreen: false,
  screenWidth: 360,
  screenHeight: 640,
  sceneIdleSeconds: 30,
  sessionIdleSeconds: 60,
};

/**
 * Bottom bar occupies 1/6 of screen height.
 *
 * Options.pde computed this as `height - height * 0.9` (1/9) rather than
 * exposing it as a setting, "to minimize # of required options". Kept as a
 * derived value for the same reason; raised to 1/6 so the redesigned
 * navigation keys are large enough to hit comfortably.
 */
export const BOTTOM_BAR_HEIGHT_RATIO = 1 / 6;

export function bottomBarHeight(screenHeight: number): number {
  return Math.round(screenHeight * BOTTOM_BAR_HEIGHT_RATIO);
}

/**
 * Parse the `key=value` options format used by the Processing build.
 *
 * Splits on the first `=` only (as `Options.pde` did with `split("=", 2)`), so
 * values may contain `=`. Unknown keys are ignored and malformed lines skipped,
 * matching the original's tolerance for comment lines in its data files.
 */
export function parseOptions(source: string): KioskOptions {
  const parsed: Record<string, string> = {};

  for (const line of source.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    parsed[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return {
    isFullscreen: readNumber(parsed.isFullscreen, DEFAULT_OPTIONS.isFullscreen ? 1 : 0) !== 0,
    screenWidth: readNumber(parsed.ScreenWidth, DEFAULT_OPTIONS.screenWidth),
    screenHeight: readNumber(parsed.ScreenHeight, DEFAULT_OPTIONS.screenHeight),
    sceneIdleSeconds: readNumber(parsed.SceneIdleSeconds, DEFAULT_OPTIONS.sceneIdleSeconds),
    sessionIdleSeconds: readNumber(parsed.SessionIdleSeconds, DEFAULT_OPTIONS.sessionIdleSeconds),
  };
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

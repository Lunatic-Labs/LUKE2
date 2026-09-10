/**
 * Session logging.
 *
 * `DisplayManager` tracked per-scene dwell time in a `sceneTimes[]` array and
 * flushed it to `data/logs/log_<date>.txt` on idle, on error, and from a JVM
 * shutdown hook. A browser cannot write to disk, so this collects the same
 * numbers in memory behind a sink interface — swap in a sink that POSTs to a
 * route handler under `app/` when the kiosk needs durable logs.
 */

export interface SessionRecord {
  /** Seconds of *active* use per scene, keyed by scene id. */
  sceneSeconds: Record<string, number>;
  startedAt: Date;
  endedAt: Date;
}

export interface SessionErrorRecord {
  sceneName: string | null;
  error: unknown;
  occurredAt: Date;
}

export interface SessionSink {
  writeSession: (record: SessionRecord) => void;
  writeError: (record: SessionErrorRecord) => void;
}

/** Default sink: mirrors the original's `println` behaviour, nothing more. */
export const consoleSessionSink: SessionSink = {
  writeSession({ sceneSeconds, startedAt, endedAt }) {
    const lines = Object.entries(sceneSeconds)
      .filter(([, seconds]) => seconds > 0)
      .map(([id, seconds]) => `  ${id}: ${seconds}s (== ${Math.floor(seconds / 60)} mins)`);

    if (lines.length === 0) return;

    console.info(
      [
        `Session ${startedAt.toISOString()} - ${endedAt.toISOString()}`,
        ...lines,
        "------",
      ].join("\n"),
    );
  },
  writeError({ sceneName, error, occurredAt }) {
    console.error(
      `[${occurredAt.toISOString()}] error while running scene "${sceneName ?? "unknown"}"`,
      error,
    );
  },
};

/**
 * Accumulates dwell time for one visit.
 *
 * Only counts time the visitor is actually interacting: the Processing version
 * incremented `sceneTimes` only while `idleSceneIndex == -1`, so scenes the
 * carousel drifted through unattended did not inflate the numbers.
 */
export class SessionTracker {
  private sceneSeconds: Record<string, number> = {};
  private startedAt = new Date();
  private active = false;

  constructor(private readonly sink: SessionSink = consoleSessionSink) {}

  begin(): void {
    this.sceneSeconds = {};
    this.startedAt = new Date();
    this.active = true;
  }

  isActive(): boolean {
    return this.active;
  }

  /** Credit `seconds` of attended use to a scene. */
  record(sceneId: string, seconds = 1): void {
    if (!this.active) return;
    this.sceneSeconds[sceneId] = (this.sceneSeconds[sceneId] ?? 0) + seconds;
  }

  recordError(sceneName: string | null, error: unknown): void {
    this.sink.writeError({ sceneName, error, occurredAt: new Date() });
  }

  /** Flush and close the visit. No-op if no visit is open, so it is safe to call twice. */
  end(): void {
    if (!this.active) return;
    this.active = false;
    this.sink.writeSession({
      sceneSeconds: { ...this.sceneSeconds },
      startedAt: this.startedAt,
      endedAt: new Date(),
    });
  }
}

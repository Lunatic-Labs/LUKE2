"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Counts seconds since the last recorded activity.
 *
 * The Processing build derived idle time from Processing's own frame loop
 * (`Update()` incremented a counter every 60 frames). There is no draw loop
 * here, so the timer is an interval, and `reset()` stands in for the clicks
 * `DisplayManager` used to observe directly.
 */
export interface UseIdleTimerOptions {
  /** Fires once per second with the seconds elapsed since the last `reset()`. */
  onTick?: (elapsedSeconds: number) => void;
  /** Suspend counting without discarding elapsed time. Defaults to true. */
  enabled?: boolean;
}

export interface IdleTimer {
  elapsedSeconds: number;
  /** Zero the counter — call on any user interaction. */
  reset: () => void;
}

export function useIdleTimer({ onTick, enabled = true }: UseIdleTimerOptions = {}): IdleTimer {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Held in a ref so a caller passing an inline arrow does not restart the
  // interval every render. Synced in an effect rather than during render, which
  // React forbids.
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setElapsedSeconds((previous) => {
        const next = previous + 1;
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  const reset = useCallback(() => setElapsedSeconds(0), []);

  return { elapsedSeconds, reset };
}

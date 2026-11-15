"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * A seek bar for the playing video: elapsed time, a gold slider, and the total
 * length. Dragging or tapping the slider jumps the video to that point.
 *
 * On every animation frame it reads whichever video element `videoRef`
 * currently points to, so it keeps working when the player swaps videos.
 * It must sit outside the player's tap-to-pause button: a slider inside a
 * button is invalid HTML, and every drag would also toggle playback.
 */

type VideoProgressProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Called whenever the visitor moves the slider. */
  onSeek?: () => void;
};

/** 83.4 seconds becomes "1:23". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Reads the video's position and length right now. */
function readTimes(video: HTMLVideoElement | null) {
  if (!video) return { current: 0, duration: 0 };
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  return { current: video.currentTime || 0, duration };
}

export function VideoProgress({ videoRef, onSeek }: VideoProgressProps) {
  const [times, setTimes] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = readTimes(videoRef.current);
      // Only re-render when something visibly changed (a tenth of a second).
      setTimes((prev) =>
        Math.abs(prev.current - next.current) < 0.1 && prev.duration === next.duration ? prev : next,
      );
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [videoRef]);

  const { current, duration } = times;

  // Nothing to show until the video knows how long it is.
  if (duration <= 0) return null;

  function seek(seconds: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(seconds)) return;
    const clamped = Math.min(Math.max(seconds, 0), duration);
    video.currentTime = clamped;
    setTimes({ current: clamped, duration });
    onSeek?.();
  }

  return (
    <div className="flex flex-none items-center gap-3 bg-black px-4 py-3 text-sm font-medium tabular-nums text-white">
      <span className="w-12 text-right">{formatTime(current)}</span>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={Math.min(current, duration)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Seek video"
        aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
        className="h-2 flex-1 cursor-pointer accent-[#AD8C45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      />
      <span className="w-12">{formatTime(duration)}</span>
    </div>
  );
}
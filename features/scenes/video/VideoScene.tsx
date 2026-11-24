"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { toKioskVideo, type KioskVideo } from "./videos";
import { wrapIndex } from "@/features/kiosk/wrapIndex";

/**
 * L.U.K.E. Video Player
 *
 * Ported from `src/luke_java/VideoScene.pde` (VideoPlayerScene.pde was an
 * unused stub). The playlist comes from /api/videos, which lists the files in
 * public/videos/, replacing upstream's readDir.pde.
 *
 * Laid out from the video player mockup rather than upstream's stacked
 * thumbnails:
 * - the current video in a card in the middle, "3 / 13" above it, and below
 *   it its title and the titles of the next and previous videos
 * - still previews of the previous and next videos either side, cropped by
 *   the screen's edges as it needs; tap one (or its arrow) to switch,
 *   wrapping at the ends
 * - everything scales with the scene, and the video keeps its place when the
 *   text around it changes length
 * - swipe left or right on the videos to switch too; it jumps straight to the
 *   next video, with no slide animation yet
 * - tap the video to pause or play; upstream's gold pause bars show while paused
 * - when a video ends, the next one starts on its own
 *
 * Upstream counted idle time only while paused or autoplaying, so a visitor who
 * picked a video wasn't kicked out mid-video. Here that means reporting activity
 * while a chosen video plays; when paused or autoplaying, the kiosk's normal
 * idle timeout applies. Upstream's "next scene in 30" countdown was not ported
 * (see L20-24 on carousel auto-scrolling).
 */

const PLAYLIST_URL = "/api/videos";

/** How often to tell the kiosk someone is watching, in milliseconds. */
const KEEP_AWAKE_MS = 5000;

/** How far a finger has to travel sideways, in pixels, to count as a swipe. */
export const SWIPE_MIN_PX = 40;

type Handle = SceneComponentProps["handle"];

export function VideoScene({ handle }: SceneComponentProps) {
  // null while the playlist is loading.
  const [videos, setVideos] = useState<KioskVideo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(PLAYLIST_URL)
      .then((response) => (response.ok ? response.json() : { files: [] }))
      .then((data: { files?: string[] }) => {
        if (!cancelled) setVideos((data.files ?? []).map(toKioskVideo));
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // Tiled camera pattern from the mockup, over the mockup's grey. Opaque, so
    // it also covers the shell's skyline here. The tile is exactly one repeat
    // of the pattern (4 cameras across, 2 staggered rows down), so it has no
    // seams; 80% of the width matches the mockup's camera spacing.
    //
    // `--c` is the video card's width, and every size in the player is a
    // fraction of it, so the whole layout scales with the screen. It is 68% of
    // the scene's width (the portrait mockup), unless the scene is too short
    // for that: then 60% of its height, which leaves room for the counter
    // above and, below, a two-line title plus the next and previous titles.
    <SceneFrame className="bg-[var(--luke-grey)] bg-[url('/images/video-pattern.png')] bg-[length:min(80%,18rem)_auto] bg-repeat [container-type:size] [--c:min(68cqw,60cqh)]">
      {videos && videos.length > 0 ? (
        <VideoPlayer videos={videos} handle={handle} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-lg font-semibold text-[var(--luke-purple)]">
          {videos === null ? "Loading videos…" : "No videos found. Add video files to public/videos."}
        </div>
      )}
    </SceneFrame>
  );
}

type VideoPlayerProps = {
  videos: KioskVideo[];
  handle: Handle;
};

function videoSrc(video: KioskVideo) {
  return `/videos/${encodeURIComponent(video.file)}`;
}

function VideoPlayer({ videos, handle }: VideoPlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplaying, setAutoplaying] = useState(true);
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Where the current swipe started, and whether the last one switched videos
  // (so the tap that ends a swipe doesn't also pause or switch again).
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const justSwiped = useRef(false);

  const count = videos.length;
  const current = videos[index];
  const previous = videos[wrapIndex(index, -1, count)];
  const next = videos[wrapIndex(index, 1, count)];
  const failed = failedFile === current.file;

  // Keep the kiosk awake while a visitor watches a video they chose.
  useEffect(() => {
    if (!playing || autoplaying) return;
    const timer = window.setInterval(() => handle.reportActivity(), KEEP_AWAKE_MS);
    return () => window.clearInterval(timer);
  }, [playing, autoplaying, handle]);

  function restartOrAdvance(step: number) {
    if (count === 1) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.play()?.catch(() => setPlaying(false));
      }
    } else {
      setIndex((i) => wrapIndex(i, step, count));
    }
  }

  function changeVideo(step: number) {
    handle.reportActivity();
    setAutoplaying(false);
    setPlaying(false);
    restartOrAdvance(step);
  }

  function handleEnded() {
    setAutoplaying(true);
    setPlaying(false);
    restartOrAdvance(1);
  }

  function togglePlay() {
    handle.reportActivity();
    setAutoplaying(false);
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      // Browsers can refuse to play (for example, before any tap); stay paused if so.
      video.play()?.catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }

  function handlePointerDown(event: ReactPointerEvent) {
    swipeStart.current = { x: event.clientX, y: event.clientY };
    justSwiped.current = false;
  }

  function handlePointerUp(event: ReactPointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Mostly sideways and far enough: swiping left brings in the next video.
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
      justSwiped.current = true;
      changeVideo(dx < 0 ? 1 : -1);
    }
  }

  function swallowClickAfterSwipe(event: ReactMouseEvent) {
    if (!justSwiped.current) return;
    justSwiped.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return (
    // Three rows: the counter, the videos, then the titles. The outer rows
    // split the space left over by a fixed ratio and their text can't push on
    // them, so the video stays put when a title wraps onto another line; only
    // the text's own row changes. The bottom row gets more because it holds
    // three lines of titles to the counter's one.
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_minmax(0,2.5fr)]">
      <p className="row-start-1 self-end justify-self-center mb-[calc(var(--c)*0.04)] text-[length:calc(var(--c)*0.075)] leading-snug font-bold text-[var(--luke-purple)]">
        {index + 1} / {count}
      </p>

      {/* The swipe area: the video centred, a preview either side at a fixed
          size and gap. The screen's edges crop the previews, so a narrow
          portrait screen shows a sliver of each and a wide one shows them
          whole. `touch-action: pan-y` keeps the browser from claiming
          sideways drags. */}
      <div
        data-testid="video-swipe-area"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onClickCapture={swallowClickAfterSwipe}
        className="row-start-2 flex min-w-0 touch-pan-y items-center justify-center gap-[calc(var(--c)*0.07)] select-none"
      >
        <PreviewButton label="Previous" video={previous} onClick={() => changeVideo(-1)} />

        <button
          type="button"
          aria-label={playing ? "Pause video" : "Play video"}
          onClick={togglePlay}
          className="relative aspect-[11/10] w-[var(--c)] shrink-0 overflow-hidden rounded-[calc(var(--c)*0.08)] border-[length:calc(var(--c)*0.018)] border-[var(--luke-purple)] bg-[#d6d1e4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--luke-gold)]"
        >
          {failed ? (
            <span className="flex h-full items-center justify-center px-[calc(var(--c)*0.06)] text-center text-[length:calc(var(--c)*0.06)] text-[var(--luke-purple)]">
              This video can&apos;t be played on this machine ({current.file}).
            </span>
          ) : (
            // The key remounts the element on change, so each video starts from the beginning.
            <video
              key={current.file}
              ref={videoRef}
              src={videoSrc(current)}
              autoPlay
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={handleEnded}
              onError={() => {
                setPlaying(false);
                setFailedFile(current.file);
              }}
              className="pointer-events-none h-full w-full object-contain"
            />
          )}

          {/* Upstream's pause icon: two gold bars while the video is paused. */}
          {!playing && !failed ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center gap-[calc(var(--c)*0.06)]"
            >
              <span className="h-[calc(var(--c)*0.25)] w-[calc(var(--c)*0.075)] rounded-sm bg-[#AD8C45]" />
              <span className="h-[calc(var(--c)*0.25)] w-[calc(var(--c)*0.075)] rounded-sm bg-[#AD8C45]" />
            </span>
          ) : null}
        </button>

        <PreviewButton label="Next" video={next} onClick={() => changeVideo(1)} />
      </div>

      <div className="row-start-3 flex flex-col items-center self-start px-[calc(var(--c)*0.06)] pt-[calc(var(--c)*0.04)] text-center text-balance">
        <h1 className="max-w-[calc(var(--c)*1.3)] text-[length:calc(var(--c)*0.1)] leading-tight font-bold text-[var(--luke-purple)]">
          {current.title}
        </h1>
        {/* Which video each arrow leads to: next is on the right, previous on the left. */}
        <p className="mt-[calc(var(--c)*0.015)] text-[length:calc(var(--c)*0.058)] leading-snug font-semibold text-[var(--luke-lilac)]">
          next: {next.title}
        </p>
        <p className="text-[length:calc(var(--c)*0.058)] leading-snug font-semibold text-[var(--luke-lilac)]">
          previous: {previous.title}
        </p>
      </div>
    </div>
  );
}

type PreviewButtonProps = {
  label: "Previous" | "Next";
  video: KioskVideo;
  onClick: () => void;
};

/**
 * A still of the previous or next video beside the current one; tapping it
 * switches to that video. The screen's edge may crop it, so the arrow sits at
 * the edge nearest the middle, which is always on screen.
 */
function PreviewButton({ label, video, onClick }: PreviewButtonProps) {
  const isNext = label === "Next";
  return (
    <button
      type="button"
      aria-label={`${label} video: ${video.title}`}
      onClick={onClick}
      className="relative aspect-square w-[calc(var(--c)*0.77)] shrink-0 overflow-hidden rounded-[calc(var(--c)*0.07)] border-[length:calc(var(--c)*0.012)] border-[var(--luke-lilac)] bg-[var(--luke-lavender)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--luke-gold)]"
    >
      {/* "#t=0.5" shows the frame at half a second, like upstream's SetThumbnails(). */}
      <video
        key={video.file}
        src={`${videoSrc(video)}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 flex items-center ${isNext ? "left-[calc(var(--c)*0.025)]" : "right-[calc(var(--c)*0.025)]"}`}
      >
        <Chevron direction={isNext ? "right" : "left"} />
      </span>
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 48"
      className="h-[calc(var(--c)*0.22)] w-[calc(var(--c)*0.11)] text-[var(--luke-purple)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M18 6 L6 24 L18 42" : "M6 6 L18 24 L6 42"} />
    </svg>
  );
}

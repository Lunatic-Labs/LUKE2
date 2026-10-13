"use client";

import { useEffect, useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { toKioskVideo, type KioskVideo } from "./videos";

/**
 * L.U.K.E. Video Player
 *
 * Ported from `src/luke_java/VideoScene.pde` (VideoPlayerScene.pde was an
 * unused stub). The playlist comes from /api/videos, which lists the files in
 * public/videos/, replacing upstream's readDir.pde. Keeps upstream's behaviour:
 * - previous video's thumbnail on top, current video in the middle, next on the bottom
 * - tap a thumbnail to switch videos (wrapping at the ends)
 * - tap the video to pause or play; a gold pause icon shows while paused
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
    <SceneFrame className="bg-white text-black">
      {videos && videos.length > 0 ? (
        <VideoPlayer videos={videos} handle={handle} />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-lg text-[#2B0A54]">
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
  return `/videos/${video.file}`;
}

function VideoPlayer({ videos, handle }: VideoPlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplaying, setAutoplaying] = useState(false);
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const count = videos.length;
  const current = videos[index];
  const previous = videos[(index - 1 + count) % count];
  const next = videos[(index + 1) % count];
  const failed = failedFile === current.file;

  // Keep the kiosk awake while a visitor watches a video they chose.
  useEffect(() => {
    if (!playing || autoplaying) return;
    const timer = window.setInterval(() => handle.reportActivity(), KEEP_AWAKE_MS);
    return () => window.clearInterval(timer);
  }, [playing, autoplaying, handle]);

  function changeVideo(step: number) {
    handle.reportActivity();
    setAutoplaying(false);
    setPlaying(false);
    setIndex((i) => (i + step + count) % count);
  }

  function handleEnded() {
    setAutoplaying(true);
    setPlaying(false);
    setIndex((i) => (i + 1) % count);
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

  return (
    <>
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">Video Player</p>
          <h1 className="text-2xl font-semibold text-black">{current.title}</h1>
        </div>
        <span className="rounded-full bg-[#F3F3F3] px-3 py-2 text-sm font-medium text-black">
          {index + 1} / {count}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ThumbnailButton label="Previous" video={previous} direction="up" onClick={() => changeVideo(-1)} />

        <button
          type="button"
          aria-label={playing ? "Pause video" : "Play video"}
          onClick={togglePlay}
          className="relative min-h-0 flex-1 border-y-2 border-[#AD8C45] bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#AD8C45]"
        >
          {failed ? (
            <span className="flex h-full items-center justify-center px-6 text-center text-white/80">
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
              onError={() => setFailedFile(current.file)}
              className="h-full w-full object-contain"
            />
          )}

          {!playing && !failed ? (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center gap-4">
              <span className="h-20 w-6 rounded-sm bg-[#AD8C45]" />
              <span className="h-20 w-6 rounded-sm bg-[#AD8C45]" />
            </span>
          ) : null}
        </button>

        <ThumbnailButton label="Next" video={next} direction="down" onClick={() => changeVideo(1)} />
      </div>
    </>
  );
}

type ThumbnailButtonProps = {
  label: "Previous" | "Next";
  video: KioskVideo;
  direction: "up" | "down";
  onClick: () => void;
};

/** A strip showing a frame from another video; tapping it switches to that video. */
function ThumbnailButton({ label, video, direction, onClick }: ThumbnailButtonProps) {
  return (
    <button
      type="button"
      aria-label={`${label} video: ${video.title}`}
      onClick={onClick}
      className="relative h-[22%] flex-none overflow-hidden bg-[#2B0A54] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#AD8C45]"
    >
      {/* "#t=0.5" shows the frame at half a second, like upstream's SetThumbnails(). */}
      <video
        src={`${videoSrc(video)}#t=0.5`}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <span className="relative flex h-full flex-col items-center justify-center gap-2 px-4 text-white">
        <span
          aria-hidden="true"
          className={`h-4 w-4 border-l-4 border-t-4 border-[#AD8C45] ${direction === "up" ? "rotate-45" : "-rotate-[135deg]"}`}
        />
        <span className="text-sm text-white/80">{label}</span>
        <span className="text-lg font-semibold">{video.title}</span>
      </span>
    </button>
  );
}
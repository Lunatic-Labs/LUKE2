"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";

/**
 * Browse the Gallery
 *
 * Ported from `GalleryScene.pde` / `GalleryCell.pde`: a 3-column grid of
 * `PImage` cells built from `Options.galleryFP`, scrolled a row at a time via
 * tap zones at the top and bottom edge, with a tap on a cell swapping in a
 * bordered enlarged view (`clicked`/`disabled`) that a second tap dismisses.
 * `next/image` replaces `loadImage()`/`image()`, `/api/gallery` (a directory
 * listing route) replaces the upstream TODO to call `readDir()` instead of a
 * hardcoded picture list, and native scrolling replaces the hand-rolled
 * `shiftGrid()` paging — the natural fit for a touchscreen grid.
 */

/** Mirrors upstream's `Collections.shuffle(pictures)` in `setPics()`. */
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** The listing's `images`, or null if the body isn't a list of URL strings. */
function parseListing(data: unknown): string[] | null {
  const images = (data as { images?: unknown } | null)?.images;
  if (!Array.isArray(images) || !images.every((src) => typeof src === "string")) return null;
  // Duplicates would collide as React keys; the API never sends any, but a
  // hand-placed copy shouldn't break the grid.
  return [...new Set(images as string[])];
}

export function GalleryScene({ handle }: SceneComponentProps) {
  const [images, setImages] = useState<string[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  /** Photos whose file failed to load: corrupt, or deleted since the listing. */
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/gallery")
      .then((response) => {
        if (!response.ok) throw new Error(`Gallery listing failed: ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => {
        const listing = parseListing(data);
        if (!listing) throw new Error("Gallery listing is malformed");
        if (!cancelled) setImages(shuffle(listing));
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function openImage(src: string) {
    handle.reportActivity();
    setSelected(src);
  }

  function closeImage() {
    handle.reportActivity();
    setSelected(null);
  }

  /** Drops a photo that won't load from the grid, and closes it if enlarged. */
  function markBroken(src: string) {
    setBroken((previous) => new Set(previous).add(src));
    setSelected((current) => (current === src ? null : current));
  }

  const visible = images?.filter((src) => !broken.has(src)) ?? null;
  const messageClass = "m-auto px-4 text-center text-[clamp(1rem,3vw,1.75rem)] text-zinc-600";

  return (
    // The solid background covers the shell's skyline, which sits underneath
    // every scene.
    <SceneFrame className="relative bg-[var(--luke-grey)]">
      {loadFailed ? (
        <p className={messageClass}>The gallery couldn&rsquo;t be loaded. Please try again later.</p>
      ) : visible === null ? (
        <p className={messageClass}>Loading gallery&hellip;</p>
      ) : visible.length === 0 ? (
        <p className={messageClass}>No photos yet.</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-[var(--gap)] [--gap:clamp(0.5rem,3vw,2rem)]">
          {/* A CSS grid's "auto" rows size off the container's leftover
              height here, not off the cells' own aspect ratio, so square
              cells were collapsing to slivers and their images spilled into
              the rows below. Flex-wrap sizes each row purely from its own
              items, so an `aspect-square` cell stays square regardless of
              how many rows the gallery ends up with. Every size here is
              relative to the viewport so the grid scales with the screen:
              3 cells per row in portrait, 5 in landscape. */}
          <div className="flex flex-wrap gap-[var(--gap)]">
            {visible.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Enlarge gallery photo ${index + 1}`}
                onClick={() => openImage(src)}
                className="relative aspect-square w-[calc((100%-2*var(--gap))/3)] overflow-hidden rounded-[clamp(0.5rem,2.5vw,1.5rem)] border-[clamp(2px,0.6vw,5px)] border-[var(--luke-purple)] bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25)] transition-[filter] active:brightness-90 landscape:w-[calc((100%-4*var(--gap))/5)]"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(orientation: landscape) 20vw, 33vw"
                  className="object-cover"
                  onError={() => markBroken(src)}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        // The X or a tap on the dimmed backdrop closes the view; taps
        // anywhere inside the box (photo or purple border) are swallowed.
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photo"
          onClick={closeImage}
          className="absolute inset-0 flex items-center justify-center bg-black/50 [container-type:size]"
        >
          {/* Fixed 5:6 proportions in either orientation: as large as fits in
              85% of the scene's width and height. Insides are sized in
              container units of the card itself so they scale with it. */}
          <div
            data-testid="enlarged-photo-box"
            onClick={(event) => event.stopPropagation()}
            className="@container flex aspect-[5/6] w-[min(85cqw,calc(85cqh*5/6))] flex-col rounded-[4cqw] border-[1.5cqw] border-[var(--luke-purple)] bg-[var(--luke-purple)] shadow-[0_6px_18px_rgb(0_0_0/0.4)]">
            <span
              data-testid="enlarged-photo"
              className="relative block min-h-0 flex-1 overflow-hidden rounded-[3cqw] bg-white"
            >
              <Image
                src={selected}
                alt=""
                fill
                sizes="85vw"
                className="object-cover"
                onError={() => markBroken(selected)}
              />
            </span>
            <div className="flex h-[16cqw] shrink-0 items-center justify-end pr-[2cqw]">
              <button
                type="button"
                aria-label="Close enlarged photo"
                onClick={closeImage}
                className="flex aspect-square h-[11cqw] items-center justify-center text-[var(--luke-lavender)] transition-[filter] active:brightness-75"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[70%] w-[70%]">
                  <path
                    d="M5 5l14 14M19 5L5 19"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </SceneFrame>
  );
}

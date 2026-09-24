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

export function GalleryScene({ handle }: SceneComponentProps) {
  const [images, setImages] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/gallery")
      .then((response) => response.json())
      .then((data: { images: string[] }) => {
        if (!cancelled) setImages(shuffle(data.images));
      })
      .catch(() => {
        if (!cancelled) setImages([]);
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

  return (
    <SceneFrame>
      {images === null ? (
        <p className="m-auto text-lg text-zinc-500">Loading gallery&hellip;</p>
      ) : images.length === 0 ? (
        <p className="m-auto text-lg text-zinc-500">No photos yet.</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-1">
          {/* A CSS grid's "auto" rows size off the container's leftover
              height here, not off the cells' own aspect ratio, so square
              cells were collapsing to slivers and their images spilled into
              the rows below. Flex-wrap sizes each row purely from its own
              items, so an `aspect-square` cell stays square regardless of
              how many rows the gallery ends up with. */}
          <div className="flex flex-wrap gap-1">
            {images.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => openImage(src)}
                className="relative aspect-square w-[calc((100%-0.5rem)/3)] overflow-hidden"
              >
                <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <button
          type="button"
          aria-label="Close enlarged photo"
          onClick={closeImage}
          className="fixed inset-0 flex items-center justify-center bg-black/60"
        >
          <span className="relative block h-[70vh] w-[70vw] max-w-2xl rounded-lg border-8 border-[var(--luke-gold)] bg-white p-2">
            <Image src={selected} alt="" fill sizes="70vw" className="object-contain" />
          </span>
        </button>
      )}
    </SceneFrame>
  );
}

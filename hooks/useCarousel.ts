"use client";

import { useCallback, useState } from "react";

/**
 * Index carousel with wraparound.
 *
 * Extracted from `DisplayManager.NextScene(Boolean previous)`, which advanced
 * or retreated an index and wrapped at either end. Kept generic — nothing here
 * knows about scenes — so other galleries and slideshows can reuse it.
 */
export interface UseCarouselOptions {
  length: number;
  initialIndex?: number;
}

export interface Carousel {
  index: number;
  next: () => void;
  previous: () => void;
  /** Jump to an absolute index. Out-of-range values are ignored. */
  goTo: (index: number) => void;
}

export function useCarousel({ length, initialIndex = 0 }: UseCarouselOptions): Carousel {
  const [index, setIndex] = useState(initialIndex);

  const next = useCallback(() => {
    setIndex((current) => (length === 0 ? 0 : (current + 1) % length));
  }, [length]);

  const previous = useCallback(() => {
    setIndex((current) => (length === 0 ? 0 : (current - 1 + length) % length));
  }, [length]);

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target >= length) return;
      setIndex(target);
    },
    [length],
  );

  return { index, next, previous, goTo };
}

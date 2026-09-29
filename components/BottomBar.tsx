"use client";

/**
 * Carousel navigation bar.
 *
 * Ported from `src/luke_java/BottomBar.pde`: a purple bar pinned to the bottom
 * of the screen with previous/next controls. The Processing version drew
 * gold-outlined arrow zones and printed the scene name between them; the
 * redesign uses two lavender keys and keeps the scene name for screen readers
 * only. Arrows are SVG so they stay crisp at kiosk resolutions.
 */

export interface BottomBarProps {
  sceneName: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Height in px, derived from screen height by `bottomBarHeight()`. */
  height: number;
}

export function BottomBar({ sceneName, onPrevious, onNext, height }: BottomBarProps) {
  return (
    <nav
      aria-label="Scene navigation"
      className="flex w-full shrink-0 items-center justify-between bg-[var(--luke-purple)] px-[20%] select-none"
      style={{ height }}
    >
      <ArrowButton direction="previous" label="Previous scene" onClick={onPrevious} />
      <span className="sr-only" aria-live="polite">
        {sceneName}
      </span>
      <ArrowButton direction="next" label="Next scene" onClick={onNext} />
    </nav>
  );
}

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex aspect-[4/3] h-[85%] items-center justify-center rounded-[22%] bg-[var(--luke-lavender)] text-[var(--luke-purple)] transition-[filter] active:brightness-90"
    >
      <svg
        viewBox="0 0 40 40"
        className="h-3/4 w-3/4"
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {direction === "previous" ? (
          <polyline points="25,8 13,20 25,32" />
        ) : (
          <polyline points="15,8 27,20 15,32" />
        )}
      </svg>
    </button>
  );
}

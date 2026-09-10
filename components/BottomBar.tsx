"use client";

/**
 * Carousel navigation bar.
 *
 * Ported from `src/luke_java/BottomBar.pde`: a purple bar pinned to the bottom
 * of the screen, gold-outlined arrow zones on the outer 20% at each end, and
 * the active scene's name centred between them. The Processing version drew
 * the arrows with `line()` calls scaled from a 360px-wide reference; here they
 * are SVG so they stay crisp at kiosk resolutions.
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
      className="flex w-full shrink-0 items-stretch bg-[var(--luke-purple)] text-[var(--luke-gold)] select-none"
      style={{ height }}
    >
      <ArrowButton direction="previous" label="Previous scene" onClick={onPrevious} />

      <div className="flex min-w-0 flex-1 items-center justify-center px-2">
        <span
          className="truncate text-center font-semibold"
          style={{ fontSize: "clamp(1rem, 4.5vw, 2.25rem)" }}
        >
          {sceneName}
        </span>
      </div>

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
      className="flex w-1/5 items-center justify-center border border-[var(--luke-gold)] transition-colors active:bg-white/10"
    >
      <svg
        viewBox="0 0 40 40"
        className="h-1/2 w-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        aria-hidden="true"
      >
        {direction === "previous" ? (
          <polyline points="25,6 11,20 25,34" />
        ) : (
          <polyline points="15,6 29,20 15,34" />
        )}
      </svg>
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CREDITS_PAGES } from "./credits";

/**
 * L.U.K.E. Credits, ported from DirectoryCredits.pde (CreditsDisplayScene).
 *
 * Prev/Next cycle through the pages with wraparound. The About page is static;
 * team pages scroll names upward from below the viewport and loop. Changing
 * pages restarts the scroll, like resetScrollPosition() did upstream.
 */

/** Scroll speed for team pages, in pixels per second. */
const SCROLL_SPEED = 60;

const pillButton =
  "rounded-full border border-[var(--luke-purple)] px-4 py-1 text-sm font-medium text-[var(--luke-purple)]";

type CreditsViewProps = {
  onBack: () => void;
  /** Resets the kiosk's idle timer; call on every tap. */
  onActivity: () => void;
};

export function CreditsView({ onBack, onActivity }: CreditsViewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const pageCount = CREDITS_PAGES.length;
  const page = CREDITS_PAGES[pageIndex];

  function goTo(index: number) {
    onActivity();
    setPageIndex((index + pageCount) % pageCount);
  }

  // Scroll the names from just below the viewport until the last one leaves the top, then loop.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = viewport.clientHeight;
    const end = -list.offsetHeight;
    const animation = list.animate(
      [{ transform: `translateY(${start}px)` }, { transform: `translateY(${end}px)` }],
      {
        duration: ((start - end) / SCROLL_SPEED) * 1000,
        iterations: Infinity,
        easing: "linear",
      },
    );

    return () => animation.cancel();
  }, [pageIndex]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            onActivity();
            onBack();
          }}
          className={pillButton}
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => goTo(pageIndex - 1)} className={pillButton}>
            Prev
          </button>
          <p className="text-sm text-zinc-500">
            Page {pageIndex + 1} of {pageCount}
          </p>
          <button type="button" onClick={() => goTo(pageIndex + 1)} className={pillButton}>
            Next
          </button>
        </div>
      </div>

      <div className="mx-4 rounded-lg bg-[var(--luke-purple)] p-4 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-[var(--luke-gold)]">Credits</h1>
        <p className="mt-1 text-lg text-white">{page.title}</p>
      </div>

      {page.kind === "about" ? (
        <p className="mx-auto max-w-prose flex-1 px-4 py-6 leading-7 text-zinc-700">{page.body}</p>
      ) : (
        <div ref={viewportRef} className="relative flex-1 overflow-hidden">
          {/* The key remounts the list on page change so the scroll restarts from the bottom. */}
          <ul key={pageIndex} ref={listRef} className="absolute inset-x-0 top-0 space-y-3 px-4 text-center">
            {page.members.map((member) => (
              <li key={member.name}>
                <p className="font-semibold text-[var(--luke-purple)]">{member.name}</p>
                <p className="text-sm text-zinc-600">{member.role}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { CREDITS_PAGES } from "./credits";

/**
 * L.U.K.E. Credits, ported from DirectoryCredits.pde (CreditsDisplayScene).
 *
 * Styled to match the Directory's other sections (Majors, Building, Faculty).
 * Prev/Next cycle through the pages with wraparound. The About page is static;
 * team pages scroll names upward from below the viewport and loop. Changing
 * pages restarts the scroll, like resetScrollPosition() did upstream.
 */

/** Scroll speed for team pages, in pixels per second. */
const SCROLL_SPEED = 45;

const navButton =
  "rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]";

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

  function shiftPage(step: number) {
    onActivity();
    setPageIndex((i) => (i + step + pageCount) % pageCount);
  }

  // Scroll the names from just below the viewport until the last one leaves the top, then loop.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list || typeof list.animate !== "function") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

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
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">Credits</p>
          <h1 className="text-2xl font-semibold text-black">Directory</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-8 py-7 sm:px-12 sm:py-10">
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
          <h2 className="text-4xl font-semibold leading-tight text-[#2B0A54]">{page.title}</h2>
          <div className="mt-4 h-1 w-full bg-[#AD8C45]" />

          {page.kind === "about" ? (
            <p className="mt-6 font-serif text-base leading-relaxed text-black sm:text-lg">{page.body}</p>
          ) : (
            // Names fade in at the bottom and out at the top as they scroll.
            <div
              ref={viewportRef}
              className="relative mt-6 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
            >
              {/* The key remounts the list on page change so the scroll restarts from the bottom. */}
              <ul key={pageIndex} ref={listRef} className="absolute inset-x-0 top-0 space-y-6 text-center">
                {page.members.map((member) => (
                  <li key={member.name}>
                    <p className="text-2xl font-semibold text-[#2B0A54]">{member.name}</p>
                    <p className="mt-1 text-base text-black/70">{member.role}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="-mx-3 mt-4 grid flex-none grid-cols-[1fr_auto_1fr] items-center pb-1 sm:-mx-7">
          <button
            type="button"
            onClick={() => {
              onActivity();
              onBack();
            }}
            className={`justify-self-start ${navButton}`}
          >
            Back
          </button>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => shiftPage(-1)} className={navButton}>
              Prev
            </button>
            <span
              aria-label={`Page ${pageIndex + 1} of ${pageCount}`}
              className="flex min-w-20 items-center justify-center rounded-full bg-[#F3F3F3] px-3 py-2 text-sm font-medium text-black"
            >
              {pageIndex + 1} / {pageCount}
            </span>
            <button type="button" onClick={() => shiftPage(1)} className={navButton}>
              Next
            </button>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}
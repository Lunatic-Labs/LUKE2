"use client";

import { useState } from "react";
import { MAJORS } from "./majors";

/**
 * L.U.K.E. Majors, ported from DirectoryMajors.pde (MajorsDisplayScene).
 *
 * Shows one major at a time, its name and description, with Prev/Next that
 * wrap around at the ends and Back to return to the Directory. Styled to
 * match the Directory's staff pages.
 */

const navButton =
  "rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]";

type MajorsViewProps = {
  onBack: () => void;
  /** Resets the kiosk's idle timer; call on every tap. */
  onActivity: () => void;
};

export function MajorsView({ onBack, onActivity }: MajorsViewProps) {
  const [index, setIndex] = useState(0);
  const count = MAJORS.length;
  const major = MAJORS[index];

  function shiftMajor(step: number) {
    onActivity();
    setIndex((i) => (i + step + count) % count);
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">Our Majors</p>
          <h1 className="text-2xl font-semibold text-black">Directory</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-8 py-7 sm:px-12 sm:py-10">
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto">
          <h2 className="text-4xl font-semibold leading-tight text-[#2B0A54]">{major.name}</h2>
          <div className="mt-4 h-1 w-full bg-[#AD8C45]" />
          <p className="mt-6 font-serif text-base leading-relaxed text-black sm:text-lg">{major.description}</p>
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
            <button type="button" onClick={() => shiftMajor(-1)} className={navButton}>
              Prev
            </button>
            <span
              aria-label={`Major ${index + 1} of ${count}`}
              className="flex min-w-20 items-center justify-center rounded-full bg-[#F3F3F3] px-3 py-2 text-sm font-medium text-black"
            >
              {index + 1} / {count}
            </span>
            <button type="button" onClick={() => shiftMajor(1)} className={navButton}>
              Next
            </button>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}
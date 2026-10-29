"use client";

import { useState } from "react";
import { BUILDING_NAME, FLOORS, amenitiesFor } from "./building";

/**
 * L.U.K.E. Building, ported from DirectoryMap.pde (BuildingMapDisplayScene)
 * and DirectoryFloor.pde.
 *
 * Floors are stacked top floor first, like a cross-section of the building.
 * Tapping a floor highlights it and shows its description and amenities;
 * tapping it again clears the selection. Back returns to the Directory.
 * Upstream's amenity icons are shown as labeled tags.
 */

const navButton =
  "rounded-md border border-[#2B0A54]/40 bg-white px-5 py-2 text-sm font-medium text-[#2B0A54] transition-colors hover:border-[#AD8C45] hover:bg-[#AD8C45]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45]";

type BuildingViewProps = {
  onBack: () => void;
  /** Resets the kiosk's idle timer; call on every tap. */
  onActivity: () => void;
};

export function BuildingView({ onBack, onActivity }: BuildingViewProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeFloor = activeIndex === null ? null : FLOORS[activeIndex];

  function selectFloor(index: number) {
    onActivity();
    setActiveIndex((current) => (current === index ? null : index));
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-black/15 px-5 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-black">Our Building</p>
          <h1 className="text-2xl font-semibold text-black">Directory</h1>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-8 py-7 sm:px-12 sm:py-10">
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-y-auto">
          <h2 className="text-4xl font-semibold leading-tight text-[#2B0A54]">{BUILDING_NAME}</h2>
          <div className="mt-4 h-1 w-full bg-[#AD8C45]" />

          <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-2" role="group" aria-label="Floors">
            {FLOORS.map((floor, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={floor.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectFloor(index)}
                  className={`rounded-md border px-5 py-4 text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD8C45] ${
                    active
                      ? "border-[#2B0A54] bg-[#2B0A54] text-[#AD8C45]"
                      : "border-[#2B0A54]/40 bg-white text-[#2B0A54] hover:border-[#AD8C45] hover:bg-[#AD8C45]/10"
                  }`}
                >
                  {floor.name}
                </button>
              );
            })}
          </div>

          <section className="mt-8" aria-live="polite">
            {activeFloor ? (
              <>
                <h3 className="text-2xl font-bold text-[#2B0A54]">{activeFloor.name}</h3>
                <p className="mt-3 font-serif text-base leading-relaxed text-black sm:text-lg">
                  {activeFloor.description}
                </p>
                {amenitiesFor(activeFloor).length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Amenities on this floor">
                    {amenitiesFor(activeFloor).map((amenity) => (
                      <li
                        key={amenity}
                        className="rounded-full bg-[#F3F3F3] px-3 py-1 text-sm font-medium text-black"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="text-center text-base text-[#2B0A54]/70">Tap a floor to see what&apos;s on it.</p>
            )}
          </section>
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
          <div />
          <div />
        </div>
      </div>
    </>
  );
}
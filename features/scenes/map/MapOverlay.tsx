"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CAMPUS_PLACES } from "./buildings";
import { kioskLocation } from "./kiosks";

export interface MapOverlayProps {
  /** The selected place's id, or null when nothing is selected. */
  selectedId: string | null;
  /** Which kiosk this is, to place the "You are here" pin. */
  kioskId: string;
}

/**
 * Everything drawn on top of the map image, positioned in 0–1 image
 * coordinates (`left`/`top` percentages of the map box), so it lines up with
 * the image at any size. Must sit inside the box the image fills.
 *
 * Today that's `display_map()` from `MapScene.pde`: the `markerTransparent.png`
 * pin at the kiosk and the magenta selection dot. Track D of the Step 2 plan
 * replaces the dot with the full highlight.
 */
export function MapOverlay({ selectedId, kioskId }: MapOverlayProps) {
  // Memoized so an unknown kiosk id warns once, not on every render.
  const kiosk = useMemo(() => kioskLocation(kioskId), [kioskId]);
  const selected = selectedId ? CAMPUS_PLACES.find((place) => place.id === selectedId) : undefined;

  return (
    <>
      <Image
        src="/map/markerTransparent.png"
        alt="You are here"
        width={30}
        height={30}
        style={{ left: `${kiosk.x * 100}%`, top: `${kiosk.y * 100}%` }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      />

      {selected && (
        <span
          aria-hidden="true"
          // fill(205, 0, 205) in display_map() — the magenta selection dot.
          style={{
            left: `${selected.map.x * 100}%`,
            top: `${selected.map.y * 100}%`,
            background: "rgb(205, 0, 205)",
          }}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        />
      )}
    </>
  );
}

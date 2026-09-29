"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import {
  CAMPUS_BUILDINGS,
  findNearestBuilding,
  fitToAspectRatio,
  KIOSK_LOCATION,
  MAP_ASPECT_RATIO,
  type CampusBuilding,
} from "./buildings";

/**
 * "You Are Here" campus map.
 *
 * Ported from `src/luke_java/MapScene.pde` + `MapButtons.pde`: the real
 * `LUJustMap.jpg` map, tapping selects the nearest building within a combined
 * offset threshold (`findNearestBuilding`, not a precise hit), the
 * `markerTransparent.png` pin fixed at the kiosk's own location (Fields
 * Engineering Center, where the kiosk is physically installed), and a Key
 * toggle that swaps to the legend. See `buildings.ts` for why the building
 * coordinates were re-measured from the image rather than ported from
 * `MapButtons.pde` directly, and why the Key screen is a tappable list here
 * rather than hit-regions over `LUKey.jpg`, as upstream drew it.
 *
 * `MapAIScene.pde` (an AI-directions variant) is dead code upstream — every
 * call site in `MapScene.pde` that would reach it is commented out — so it
 * has no counterpart here, same as `TriviaGameManager.pde`'s `Game` class.
 */
export function MapScene({ handle }: SceneComponentProps) {
  const [selected, setSelected] = useState<CampusBuilding | null>(null);
  const [showKey, setShowKey] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapBox, setMapBox] = useState({ width: 0, height: 0 });

  // The map's own rendered rectangle within the (possibly differently-shaped)
  // scene area — letterboxed to MAP_ASPECT_RATIO rather than stretched.
  // Markers and click detection both use this box, so they can't disagree.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      setMapBox(fitToAspectRatio(rect.width, rect.height, MAP_ASPECT_RATIO));
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    handle.reportActivity();

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    setSelected(findNearestBuilding(CAMPUS_BUILDINGS, x, y));
  }

  function selectFromKey(building: CampusBuilding) {
    // on_key_button_click(): selecting a name on the Key screen chooses that
    // building and switches back to the map with it highlighted.
    handle.reportActivity();
    setSelected(building);
    setShowKey(false);
  }

  return (
    <SceneFrame>
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <p className="text-sm text-zinc-500">
          {showKey ? "Tap a building to find it on the map" : "Touch a building to display"}
        </p>
        <button
          type="button"
          onClick={() => {
            handle.reportActivity();
            setShowKey((current) => !current);
          }}
          className="rounded-full border border-[var(--luke-purple)] px-4 py-1 text-sm font-medium text-[var(--luke-purple)]"
        >
          {showKey ? "Map" : "Key"}
        </button>
      </div>

      {showKey ? (
        <ul className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {CAMPUS_BUILDINGS.map((building) => (
            <li key={building.id}>
              <button
                type="button"
                onClick={() => selectFromKey(building)}
                className="w-full border-b border-zinc-100 py-2 text-left font-medium text-[var(--luke-purple)]"
              >
                {building.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-zinc-50">
          {mapBox.width > 0 && (
            <div
              onClick={handleMapClick}
              role="presentation"
              className="relative mx-auto"
              style={{ width: mapBox.width, height: mapBox.height }}
            >
              <Image
                src="/map/LUJustMap.jpg"
                alt="Lipscomb University campus map"
                fill
                sizes="100vw"
                priority
              />

              <Image
                src="/map/markerTransparent.png"
                alt="You are here"
                width={30}
                height={30}
                style={{ left: `${KIOSK_LOCATION.x * 100}%`, top: `${KIOSK_LOCATION.y * 100}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              />

              {selected && (
                <span
                  aria-hidden="true"
                  // fill(205, 0, 205) in display_map() — the magenta selection dot.
                  style={{
                    left: `${selected.x * 100}%`,
                    top: `${selected.y * 100}%`,
                    background: "rgb(205, 0, 205)",
                  }}
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                />
              )}
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[var(--luke-purple)]/95 p-3 text-center text-white shadow-lg">
            {selected ? (
              <p className="font-semibold text-[var(--luke-gold)]">
                Currently displaying:
                <br />
                {selected.name}
              </p>
            ) : (
              <p className="text-sm">Touch a building to display</p>
            )}
          </div>
        </div>
      )}
    </SceneFrame>
  );
}

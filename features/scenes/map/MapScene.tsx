"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SceneFrame } from "@/components/SceneFrame";
import { useKioskOptions } from "@/features/kiosk/options-context";
import type { SceneComponentProps } from "@/features/kiosk/types";
import {
  CAMPUS_BUILDINGS,
  CAMPUS_PLACES,
  findNearestBuilding,
  fitToAspectRatio,
  MAP_ASPECT_RATIO,
} from "./buildings";
import { DetailCard } from "./DetailCard";
import { FindScreen } from "./FindScreen";
import { MapOverlay } from "./MapOverlay";

/**
 * "You Are Here" campus map.
 *
 * Ported from `src/luke_java/MapScene.pde` + `MapButtons.pde`: the real
 * `LUJustMap.jpg` map, tapping selects the nearest building within a combined
 * offset threshold (`findNearestBuilding`, not a precise hit), the
 * `markerTransparent.png` pin fixed at the active kiosk's location (see
 * `kiosks.ts`), and a Key toggle that swaps to the legend. See `buildings.ts`
 * for why the building coordinates were re-measured from the image rather than
 * ported from `MapButtons.pde` directly, and why the Key screen is a tappable
 * list here rather than hit-regions over `LUKey.jpg`, as upstream drew it.
 *
 * This component only holds which place is selected and which view is showing.
 * The Find screen, what's drawn on the map and the detail card are their own
 * components, so the Step 2 tracks can each work in a separate file.
 *
 * `MapAIScene.pde` (an AI-directions variant) is dead code upstream — every
 * call site in `MapScene.pde` that would reach it is commented out — so it
 * has no counterpart here, same as `TriviaGameManager.pde`'s `Game` class.
 */
export function MapScene({ handle }: SceneComponentProps) {
  const { kioskId } = useKioskOptions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "find">("map");
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapBox, setMapBox] = useState({ width: 0, height: 0 });
  const selected = selectedId ? CAMPUS_PLACES.find((place) => place.id === selectedId) : undefined;

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
  }, [view]);

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    handle.reportActivity();

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    setSelectedId(findNearestBuilding(CAMPUS_BUILDINGS, x, y)?.id ?? null);
  }

  function selectFromFind(placeId: string) {
    // on_key_button_click(): choosing a place switches back to the map with it
    // highlighted.
    handle.reportActivity();
    setSelectedId(placeId);
    setView("map");
  }

  return (
    <SceneFrame>
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <p className="text-sm text-zinc-500">
          {view === "find" ? "Tap a building to find it on the map" : "Touch a building to display"}
        </p>
        <button
          type="button"
          onClick={() => {
            handle.reportActivity();
            setView((current) => (current === "find" ? "map" : "find"));
          }}
          className="rounded-full border border-[var(--luke-purple)] px-4 py-1 text-sm font-medium text-[var(--luke-purple)]"
        >
          {view === "find" ? "Map" : "Key"}
        </button>
      </div>

      {view === "find" ? (
        <FindScreen onSelect={selectFromFind} />
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

              <MapOverlay selectedId={selectedId} kioskId={kioskId} />
            </div>
          )}

          {selected ? (
            <DetailCard
              place={selected}
              onClose={() => setSelectedId(null)}
              onFindAnother={() => setView("find")}
            />
          ) : (
            <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[var(--luke-purple)]/95 p-3 text-center text-white shadow-lg">
              <p className="text-sm">Touch a building to display</p>
            </div>
          )}
        </div>
      )}
    </SceneFrame>
  );
}

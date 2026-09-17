"use client";

import { useRef, useState } from "react";
import { SceneFrame } from "@/components/SceneFrame";
import type { SceneComponentProps } from "@/features/kiosk/types";
import { CAMPUS_BUILDINGS, findNearestBuilding, type CampusBuilding } from "./buildings";

/**
 * "You Are Here" campus map.
 *
 * Ported from `src/luke_java/MapScene.pde`, preserving its two behaviours: a
 * tap selects the nearest marker within a threshold (rather than requiring a
 * precise hit), and a Key toggle swaps the map for its legend.
 *
 * The real `LUJustMap.jpg` / `LUKey.jpg` assets live in the kiosk repo. Drop
 * them into `public/map/` and render them behind the markers; the marker
 * coordinates in `buildings.ts` are already resolution-independent.
 */
export function MapScene({ handle }: SceneComponentProps) {
  const [selected, setSelected] = useState<CampusBuilding | null>(null);
  const [showKey, setShowKey] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    handle.reportActivity();

    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    setSelected(findNearestBuilding(CAMPUS_BUILDINGS, x, y));
  }

  return (
    <SceneFrame>
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <p className="text-sm text-zinc-500">
          {showKey ? "Building key" : "Tap a marker to learn more"}
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
        <ul className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          {CAMPUS_BUILDINGS.map((building) => (
            <li key={building.id} className="border-b border-zinc-100 pb-2">
              <p className="font-semibold text-[var(--luke-purple)]">{building.name}</p>
              <p className="text-sm text-zinc-600">{building.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div
          ref={mapRef}
          onClick={handleMapClick}
          role="presentation"
          className="relative flex-1 bg-[repeating-linear-gradient(45deg,#f4f4f5_0px,#f4f4f5_12px,#fafafa_12px,#fafafa_24px)]"
        >
          {CAMPUS_BUILDINGS.map((building) => (
            <span
              key={building.id}
              aria-hidden="true"
              style={{ left: `${building.x * 100}%`, top: `${building.y * 100}%` }}
              className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                selected?.id === building.id ? "bg-[var(--luke-gold)]" : "bg-[var(--luke-purple)]"
              }`}
            />
          ))}

          {selected && (
            <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[var(--luke-purple)] p-4 text-white shadow-lg">
              <p className="font-semibold text-[var(--luke-gold)]">{selected.name}</p>
              <p className="mt-1 text-sm leading-6">{selected.description}</p>
            </div>
          )}
        </div>
      )}
    </SceneFrame>
  );
}

"use client";

import { CAMPUS_PLACES } from "./buildings";

export interface FindScreenProps {
  /** Called with the chosen place's id. */
  onSelect: (placeId: string) => void;
}

/**
 * The screen for finding a place by name.
 *
 * For now this is the Key list from `MapScene.pde`, where `on_key_button_click()`
 * chose a building and switched back to the map with it highlighted. Track C of
 * the Step 2 plan replaces it with search, the on-screen keyboard and the
 * grouped list, behind the same props.
 */
export function FindScreen({ onSelect }: FindScreenProps) {
  return (
    <ul className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
      {CAMPUS_PLACES.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            className="w-full border-b border-zinc-100 py-2 text-left font-medium text-[var(--luke-purple)]"
          >
            {place.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
